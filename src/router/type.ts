import { Hono } from "hono";
import type { Handler, MiddlewareHandler } from "hono";

type HonoHandler = Handler | MiddlewareHandler;

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

function normalizePath(path: string) {
  const normalized = path.replace(/\/+/g, "/");

  if (normalized === "/") {
    return normalized;
  }

  return normalized.replace(/\/$/, "");
}

export class Router {
  private static hono = new Hono();
  private static prefixStack: string[] = [];

  static get app() {
    return this.hono;
  }

  static group(prefix: string, routes: () => void) {
    this.prefixStack.push(prefix);

    try {
      routes();
    } finally {
      this.prefixStack.pop();
    }

    return this;
  }

  private static fullPath(path: string) {
    return normalizePath(["", ...this.prefixStack, path].join("/"));
  }

  private static add(method: HttpMethod, path: string, handlers: HonoHandler[]) {
    const fullPath = this.fullPath(path);

    // Small cast because Hono's internal route method types are very generic.
    (this.hono as any)[method](fullPath, ...handlers);

    return this;
  }

  static get(path: string, ...handlers: HonoHandler[]) {
    return this.add("get", path, handlers);
  }

  static post(path: string, ...handlers: HonoHandler[]) {
    return this.add("post", path, handlers);
  }

  static put(path: string, ...handlers: HonoHandler[]) {
    return this.add("put", path, handlers);
  }

  static patch(path: string, ...handlers: HonoHandler[]) {
    return this.add("patch", path, handlers);
  }

  static delete(path: string, ...handlers: HonoHandler[]) {
    return this.add("delete", path, handlers);
  }
  static use(path: string, ...handlers: MiddlewareHandler[]) {
    const fullPath = this.fullPath(path);
    this.hono.use(fullPath, ...handlers);
    return this;
  }
}
