import { Bootstrap } from "../Bootstrap/Bootstrap";
import { Router } from "../router/type";
import { getMigrationFolder } from "../Services/Database/Migration";
import { logger } from "../Services/Logger/LoggerService";
import { extname, resolve, sep } from "node:path";

const apiPrefix = "/api";
const frontendDistPath = resolve(process.cwd(), "dist");
const useFrontendDevServer = Bun.env.NODE_ENV !== "production";

function defaultFrontendDevUrl() {
    const appUrl = new URL(Bun.env.APP_URL ?? "http://localhost:3000");

    return `${appUrl.protocol}//${appUrl.hostname}:5173`;
}

function isApiRequest(pathname: string) {
    return pathname === apiPrefix || pathname.startsWith(`${apiPrefix}/`);
}

function backendPort(url: URL) {
    if (url.port) {
        return Number(url.port);
    }

    return url.protocol === "https:" ? 443 : 80;
}

async function proxyToFrontendDevServer(request: Request) {
    const incomingUrl = new URL(request.url);
    const frontendDevUrl = Bun.env.FRONTEND_URL ?? defaultFrontendDevUrl();
    const targetUrl = new URL(incomingUrl.pathname + incomingUrl.search, frontendDevUrl);
    const headers = new Headers(request.headers);

    headers.set("host", targetUrl.host);

    return fetch(targetUrl, {
        method: request.method,
        headers,
        body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
        redirect: "manual",
    });
}

function resolveFrontendFile(pathname: string) {
    let decodedPathname = pathname;

    try {
        decodedPathname = decodeURIComponent(pathname);
    } catch {
        return null;
    }

    const resolvedPath = resolve(frontendDistPath, `.${decodedPathname}`);
    const frontendRoot = `${frontendDistPath}${sep}`;

    if (resolvedPath !== frontendDistPath && !resolvedPath.startsWith(frontendRoot)) {
        return null;
    }

    return resolvedPath;
}

async function serveBuiltFrontend(request: Request) {
    const url = new URL(request.url);
    const requestedPath = url.pathname === "/"
        ? resolve(frontendDistPath, "index.html")
        : resolveFrontendFile(url.pathname);

    if (!requestedPath) {
        return new Response("Not found", { status: 404 });
    }

    const requestedFile = Bun.file(requestedPath);

    if (await requestedFile.exists()) {
        return new Response(requestedFile);
    }

    if (extname(url.pathname)) {
        return new Response("Not found", { status: 404 });
    }

    const indexFile = Bun.file(resolve(frontendDistPath, "index.html"));

    if (await indexFile.exists()) {
        return new Response(indexFile, {
            headers: {
                "content-type": "text/html; charset=utf-8",
            },
        });
    }

    logger.error("Frontend build is missing. Run bun run build:frontend first.");

    return new Response("Frontend build is missing", { status: 500 });
}

async function handleRequest(request: Request) {
    const url = new URL(request.url);

    if (isApiRequest(url.pathname)) {
        return Router.app.fetch(request);
    }

    if (useFrontendDevServer) {
        try {
            return await proxyToFrontendDevServer(request);
        } catch (error) {
            logger.warn(`Frontend dev server is not reachable: ${String(error)}`);
        }
    }

    return serveBuiltFrontend(request);
}

async function main() {
    await Bootstrap.bootstrap();

    const url = new URL(Bun.env.APP_URL ?? "http://localhost:3000");

    const server = Bun.serve({
        port: backendPort(url),
        hostname: url.hostname,
        fetch: handleRequest,
    });

    logger.info(`App started on ${server.url}`)
    getMigrationFolder();
}

await main();


