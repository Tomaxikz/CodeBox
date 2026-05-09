import type { Context } from "hono";
import { getConnInfo } from "hono/bun";
import { getSignedCookie, setSignedCookie } from "hono/cookie";
import { randomBytes, createHash } from "node:crypto";

const DEVICE_COOKIE_NAME = "CODEBOX_DEVICE";

export async function getOrCreateDeviceId(c: Context) {
  const appKey = Bun.env.APP_KEY;

  if (!appKey) {
    throw new Error("Missing APP_KEY");
  }

  let deviceId = await getSignedCookie(c, appKey, DEVICE_COOKIE_NAME);

  if (!deviceId) {
    deviceId = randomBytes(32).toString("base64url");

    await setSignedCookie(c, DEVICE_COOKIE_NAME, deviceId, appKey, {
      httpOnly: true,
      secure: Bun.env.NODE_ENV === "production",
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return deviceId;
}

export function hashDeviceId(deviceId: string) {
  return createHash("sha256").update(deviceId).digest("hex");
}

export function getRequestIp(c: Context) {
  const connInfo = getConnInfo(c);

  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") ||
    c.req.header("cf-connecting-ip") ||
    connInfo.remote.address ||
    "unknown"
  );
}