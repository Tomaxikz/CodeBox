import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

function envUrl(value: string | undefined, fallback: string) {
  try {
    return new URL(value ?? fallback);
  } catch {
    return new URL(fallback);
  }
}

function urlPort(url: URL) {
  if (url.port) {
    return Number(url.port);
  }

  return url.protocol === "https:" ? 443 : 80;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const appUrl = envUrl(env.APP_URL, "http://localhost:3000");
  const frontendUrl = envUrl(
    env.FRONTEND_URL,
    `${appUrl.protocol}//${appUrl.hostname}:5173`,
  );
  const frontendPort = urlPort(frontendUrl);

  return {
    plugins: [react(), tailwindcss()],
    appType: "spa",
    resolve: {
      alias: {
        "@": resolve(projectRoot, "Frontend"),
      },
    },
    server: {
      host: frontendUrl.hostname,
      port: frontendPort,
      strictPort: true,
      cors: {
        origin: appUrl.origin,
        credentials: true,
      },
      hmr: {
        host: frontendUrl.hostname,
        port: frontendPort,
        protocol: frontendUrl.protocol === "https:" ? "wss" : "ws",
      },
    },
    preview: {
      host: frontendUrl.hostname,
      port: frontendPort,
      strictPort: true,
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      manifest: true,
      cssCodeSplit: true,
      rolldownOptions: {
        input: resolve(projectRoot, "index.html"),
        output: {
          entryFileNames: "assets/[name]-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]",
          codeSplitting: {
            groups: [
              {
                name: "react",
                test: /node_modules[\\/]react(?:-dom)?[\\/]/,
                priority: 20,
              },
              {
                name: "vendor",
                test: /node_modules[\\/]/,
                priority: 10,
                minSize: 20_000,
                maxSize: 250_000,
              },
            ],
          },
        },
      },
    },
  };
});
