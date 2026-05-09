import type { Context, Next } from "hono";
import { getSignedCookie } from "hono/cookie";
import { KeyHash } from "../Services/KeyHash";
import { createHash } from "crypto";
import { orm } from "../Services/Database/orm";
import { sessions, Users } from "../Database/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import { logger } from "../Services/Logger/LoggerService";

const  SESSION_COOKIE_NAME = "CODEBOX_SESSION";

type AuthUser = {
    id: number,
    username: string,
    email: string,
    first_name: string,
    last_name: string,
}

declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser;
    sessionId: string;
  }
}


export class AuthMiddlware {
    public static async getSecrete(c: Context, next: Next) {
        const cookieSecret = Bun.env.APP_KEY;

        if(!cookieSecret) {
            return c.json({ message: "Missing COOKIE_SECRET" }, 500);
        }

        const sessionToken = await getSignedCookie(
            c,
            Bun.env.APP_KEY!,
            "CODEBOX_SESSION"
        )

        if(!sessionToken) {
            return c.json({message: "Unauthorized"}, 401)
        }

        const sessionUser = await this.getUserFromSession(sessionToken);

        if(!sessionUser) {
            return c.json({message: "Unauthorized"}, 401)
        }

        c.set("sessionId", String(sessionUser.sessionId));
        c.set("user", sessionUser.user);

        await next();

    }

    private static async getUserFromSession(sessionToken: string) {
        const Session = await orm
        .select({
            sessionId: sessions.id,
            userId: Users.id,
            username: Users.username,
            email: Users.email,
            first_name: Users.first_name,
            last_name: Users.last_name
        })
        .from(sessions)
        .innerJoin(Users, eq(Users.id, sessions.userId))
        .where(
            and(
                eq(sessions.tokenHash, sessionToken),
                isNull(sessions.revokedAt),
                gt(sessions.expiresAt, new Date())
            ),
        )
        .limit(1)
        const session = Session[0];
        if(!session) {
            return null;
        }
        return {
            sessionId: session.sessionId,
            user: {
                id: session.userId,
                username: session.username,
                email: session.email,
                first_name: session.first_name,
                last_name: session.last_name,
            },
        };
    }   
}