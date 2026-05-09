import { csrf } from "hono/csrf";
import type { Context, Next } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { randomBytes } from "node:crypto";

import { KeyHash } from "../Services/KeyHash";

const appUrl = new URL(Bun.env.APP_URL ?? "http://localhost:3000");
const CSRF_COOKIE_NAME = "CODEBOX_CSRF";
const CSRF_HEADER_NAME = "x-csrf-token";
const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

function createCsrfToken() {
  const token = randomBytes(32).toString("base64url");
  const signature = KeyHash.sign(token);

  return `${token}.${signature}`;
}

function verifyCsrfToken(payload: string) {
  const separatorIndex = payload.lastIndexOf(".");

  if (separatorIndex === -1) {
    return false;
  }

  const token = payload.slice(0, separatorIndex);
  const signature = payload.slice(separatorIndex + 1);

  if (!token || !signature) {
    return false;
  }

  return KeyHash.verify(token, signature);
}

function setCsrfCookie(c: Context, token: string) {
  setCookie(c, CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: Bun.env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

export class CsrfMiddleware {
  private static originProtection = csrf({
    origin: appUrl.origin,
    secFetchSite: ["same-origin", "same-site"],
  });

  public static async handle(c: Context, next: Next) {
    const csrfCookie = getCookie(c, CSRF_COOKIE_NAME);

    if (safeMethods.has(c.req.method)) {
      if (!csrfCookie || !verifyCsrfToken(csrfCookie)) {
        setCsrfCookie(c, createCsrfToken());
      }

      return this.originProtection(c, next);
    }

    if (!csrfCookie || !verifyCsrfToken(csrfCookie)) {
      return c.json({ message: "Invalid CSRF cookie" }, 403);
    }

    const csrfHeader = c.req.header(CSRF_HEADER_NAME);

    if (!csrfHeader || csrfHeader !== csrfCookie) {
      return c.json({ message: "Invalid CSRF token" }, 403);
    }

    return this.originProtection(c, next);
  }
}
