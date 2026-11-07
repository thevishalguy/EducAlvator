import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { createApi, securityHeadersMiddleware } from "./server/api.js";

// Serves the API (server/api.js) inside the Vite dev and preview servers, so
// `npm run dev` works with no separate backend. Production uses server/index.js.
function educalvatorApi(env) {
  return {
    name: "educalvator-api",
    configurePreviewServer(server) {
      server.middlewares.use(securityHeadersMiddleware(false));
      server.middlewares.use(createApi(env));
    },
    configureServer(server) {
      server.middlewares.use(securityHeadersMiddleware(true));
      server.middlewares.use(createApi(env));
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load all env vars (prefix "") for server-side use. Vite only exposes
  // VITE_-prefixed vars to the client, so NVIDIA_API_KEY stays server-only.
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss(), educalvatorApi(env)],
    // Only treat the app's root index.html as an entry. This stops Vite from
    // crawling the standalone game exports (english/, maths/, science/,
    // framerexporter/, public/games/) as app entry points.
    optimizeDeps: {
      entries: ["index.html"],
    },
    server: {
      port: 5173,
      fs: {
        // Only src/ and public/ are the website: everything else in the project
        // (secrets, server code, archives, tooling) must not be fetchable by URL.
        deny: [
          ".env", ".env.*", "*.env", "*.env.txt", "*.{crt,pem}",
          "**/.git/**", "**/.claude/**", "**/server/**", "**/data/**", "**/scripts/**", "**/archive/**", "**/tools/**", "**/docs/**", "**/ask-gemini-extension/**",
          "vite.config.js", "package.json", "package-lock.json", "README.md",
        ],
      },
      watch: {
        // Don't watch the heavy source PDF/export folders — they aren't part of
        // the app build (served copies live in /public), and a locked PDF there
        // can crash the dev watcher (EBUSY).
        ignored: [
          "**/archive/**",
          "**/tools/**",
          "**/public/resources/**",
        ],
      },
    },
  };
});
