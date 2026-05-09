import type { Context } from "hono";
import { z } from "zod";
import { KeyHash } from "../../Services/KeyHash";
import { orm } from "../../Services/Database/orm";
import { sessions, Users } from "../../Database/schema";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { logger } from "../../Services/Logger/LoggerService";
import { randomBytes } from "node:crypto";
import { getOrCreateDeviceId, getRequestIp } from "../../Helpers/getDeviceId";
import { getCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import { passwordResetTokens } from "../../Models/ForgotPassword";
import { MailService } from "../../Services/Mail/MailService";

const usernameSchema = z.string().min(3).max(32);
const emailSchema = z.email();
const passwordSchema = z.string().min(8);
const nameSchema = z.string().min(1);

const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  first_name: nameSchema,
  last_name: nameSchema,
});

const loginSchema = z.object({
  login: z.union([usernameSchema, emailSchema]),
  password: passwordSchema,
});

const forgotPasswordSchema = z.object({
  email: emailSchema,
});
const resetPasswordSchema = z.object({
    email: emailSchema,
    newPassword: passwordSchema
})

function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export class AuthController {

    public static async Register(c: Context) {
        const body = await c.req.json();
        const result = registerSchema.safeParse(body);

        if (!result.success) {
            return c.json(
                {
                    message: "Invalid request body",
                    errors: result.error.flatten(),
                },
                422,
            );
            logger.error(``)
        }

        const payload = result.data;
        const passwordHashed = await KeyHash.hashPassword(payload.password)

        const [user] = await orm
        .insert(Users)
        .values({
            username: payload.username,
            email: payload.email,
            first_name: payload.first_name,
            last_name: payload.last_name,
            password: passwordHashed
        })
        .returning({
            id: Users.id,
            username: Users.username,
            email: Users.email,
            first_name: Users.first_name,
            last_name: Users.last_name
        });

        logger.info(`User ${user?.username} has registered using this email: ${user?.email}`)

        return c.json(
            {
                message: "User registered succesfully",
                user,
            },
            201,
        )
    }
    public static async login(c: Context) {
        const body = await c.req.json();
        const result = loginSchema.safeParse(body); 
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        if (!result.success) {
            return c.json(
                {
                    message: "Invalid request body",
                    errors: result.error.flatten(),
                },
                422,
            );
        }

        const payload = result.data;

        const [user] = await orm
        .select()
        .from(Users)
        .where(
            or(
                eq(Users.username, payload.login),
                eq(Users.email, payload.login),
            ),
        )
        .limit(1);
            
        if(!user) {
            return c.json({message: "Invalid credentials"}, 401)
        }

        const passwordCheck = await KeyHash.verifyPassword(
            payload.password,
            user.password
        )

        if (!passwordCheck) {
            return c.json({ message: "Invalid credentials" }, 401);
        }

        const deviceId = await getOrCreateDeviceId(c);
        const deviceIdHash = KeyHash.sign(deviceId);

        const sessionToken = createSessionToken();
        const encryptSessionToken = KeyHash.encrypt({
            randomKey: sessionToken,
            username: user.username,
            email: user.email,
            createdAt: Date.now()
        })
        await orm
        .update(sessions)
        .set({
            revokedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(
            and(
                eq(sessions.userId, user.id),
                eq(sessions.deviceIdHash, deviceIdHash),
                isNull(sessions.revokedAt)
            ),
        );

        await orm.insert(sessions).values({
            userId: user.id,
            deviceIdHash,
            tokenHash: encryptSessionToken,
            userAgent: c.req.header("user-agent") ?? null,
            ipAddress: getRequestIp(c),
            expiresAt,
        });
        const  SESSION_COOKIE_NAME = "CODEBOX_SESSION";
        const appKey = Bun.env.APP_KEY;

        if (!appKey) {
            logger.error("APP_KEY is missing. Cannot sign session cookie.");
            return c.json({ message: "Server auth configuration is missing" }, 500);
        }

        await setSignedCookie(c, SESSION_COOKIE_NAME, encryptSessionToken, appKey, {
            httpOnly: true,
            secure: Bun.env.NODE_ENV === "production",
            sameSite: "Lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7
        });

        logger.info(`User ${user.username} logged in`);

        return c.json({
                message: "Logged in successfully",
                user: {
                id: user.id,
                username: user.username,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
            },
        });
    }
    public static async user(c: Context) {
        const sessionCookie = getCookie(c, "CODEBOX_SESSION");

        if (!sessionCookie) {
            logger.error(`IP ${getRequestIp(c)} was marked as unathorized. ERRROR 401`)
            return c.json({ message: "Unauthorized", error: 401 }, 401);
        }

        const [sessionUser] = await orm
            .select({
                sessionId: sessions.id,
                userId: Users.id,
                username: Users.username,
                email: Users.email,
                first_name: Users.first_name,
                last_name: Users.last_name,
            })
            .from(sessions)
            .innerJoin(Users, eq(Users.id, sessions.userId))
            .where(
                and(
                    eq(sessions.tokenHash, sessionCookie),
                    isNull(sessions.revokedAt),
                    gt(sessions.expiresAt, new Date()),
                ),
            )
            .limit(1);

            if (!sessionUser) {
                logger.error(`IP ${getRequestIp(c)} was marked as unathorized. ERRROR 401`)
                return c.json({ message: "Unauthorized", error: 401 }, 401);
            }

            return c.json({
            user: {
                id: sessionUser.userId,
                username: sessionUser.username,
                email: sessionUser.email,
                first_name: sessionUser.first_name,
                last_name: sessionUser.last_name,
            },
        });
    }
    public static async ForgotPasword(c: Context) {
        const body = await c.req.json();
        const result = forgotPasswordSchema.safeParse(body);

        if(!result.success) {
            return c.json(
                {
                    message: "Invalid request body",
                    errors: result.error.flatten
                },
                422,
            )
        }
        const { email } = result.data;
        const [user] = await orm
        .select()
        .from(Users)
        .where(eq(Users.email, email))
        .limit(1)

        if (!user) {
            return c.json("Response")
        }

        const token = createSessionToken();
        const tokenHash = KeyHash.sign(token)

        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 30);

        const resetToken: typeof passwordResetTokens.$inferInsert = {
            userId: user.id,
            tokenHash,
            expiresAt,
        };

        await orm.insert(passwordResetTokens).values(resetToken);

        const frontendUrl = Bun.env.FRONTEND_URL ?? "http://localhost:5173";
        const resetUrl = `${frontendUrl}/reset-password/${token}`;
        await MailService.sendPasswordResetEmail(user.email, resetUrl);
        logger.info(`Password reset link for ${user.email}: ${resetUrl}`);

        return c.json("Password reset link was sent");
    }
    public static async ResetPasswrod(c: Context) {
        const body = await c.req.json();
        const result = resetPasswordSchema.safeParse(body)
        const token = c.req.param("token")

        if (!result.success) {
            return c.json(
                {
                message: "Invalid request body",
                errors: result.error.flatten(),
                },
                422,
            );
        
        }

        if (!token) {
            return c.json({ message: "Missing reset token" }, 400);
        }

        const tokenHash = KeyHash.sign(token);

        const [resetToken] = await orm
        .select()
        .from(passwordResetTokens)
        .where(
            and(
                eq(passwordResetTokens.tokenHash, tokenHash),
                isNull(passwordResetTokens.usedAt),
                gt(passwordResetTokens.expiresAt, new Date()),
            )
        )
        .limit(1)

        if (!resetToken) {
            return c.json({message: "Invalid token"}, 400)
        }   
        const payload = result.data;
        const passwordHash = await KeyHash.hashPassword(payload.newPassword);

        await orm
            .update(Users)
            .set({
                password: passwordHash,
                updated_at: new Date(),
            })
            .where(eq(Users.id, resetToken.userId))

        await orm
        .update(sessions)
        .set({
            revokedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(passwordResetTokens.tokenHash, resetToken.tokenHash))

        return c.json({
            message: "Password reset succesfull",
        })
    }
}
