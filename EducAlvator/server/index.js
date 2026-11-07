// Production server: serves the built website (dist/, from `npm run build`) and
// the API (server/api.js) from one Node process. No dependencies beyond Node.
//
//   npm run build && npm start
//
// Settings come from environment variables (on Render: the service's
// Environment tab). A local .env file is read too, when present.
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createApi, securityHeadersMiddleware } from "./api.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "dist");

if (existsSync(join(root, ".env"))) {
  try {
    process.loadEnvFile(join(root, ".env")); // doesn't override variables already set
  } catch (e) {
    console.warn("[server] couldn't read .env:", e.message);
  }
}
if (!existsSync(join(dist, "index.html"))) {
  console.error("[server] dist/ is missing. Run `npm run build` first.");
  process.exit(1);
}

const env = process.env;
const port = Number(env.PORT) || 3000;
// Hosting platforms (Render, Railway, Fly…) put a proxy in front that handles HTTPS.
const trustProxy = env.TRUST_PROXY ? env.TRUST_PROXY === "true" : Boolean(env.RENDER);

const api = createApi(env, { trustProxy });
const headers = securityHeadersMiddleware(false);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".bcmap": "application/octet-stream",
};

// Resolves a URL path to a file inside dist/, or null. Never leaves dist/.
function fileFor(urlPath) {
  let path;
  try {
    path = decodeURIComponent(urlPath.split("?")[0]);
  } catch {
    return null;
  }
  const full = normalize(join(dist, path));
  if (full !== dist && !full.startsWith(dist + sep)) return null;
  try {
    const st = statSync(full);
    if (st.isFile()) return { full, size: st.size };
    if (st.isDirectory()) {
      const index = join(full, "index.html");
      if (existsSync(index)) return { full: index, size: statSync(index).size };
    }
  } catch {
    /* not found */
  }
  return null;
}

function send(res, req, file, cacheControl) {
  res.statusCode = 200;
  res.setHeader("Content-Type", TYPES[extname(file.full).toLowerCase()] || "application/octet-stream");
  res.setHeader("Content-Length", file.size);
  res.setHeader("Cache-Control", cacheControl);
  if (req.method === "HEAD") return res.end();
  createReadStream(file.full).on("error", () => res.destroy()).pipe(res);
}

function serveStatic(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405;
    return res.end();
  }
  const urlPath = String(req.url || "/");
  const file = fileFor(urlPath);
  if (file) {
    // Vite fingerprints everything in /assets, so those can be cached for good.
    const immutable = urlPath.startsWith("/assets/");
    return send(res, req, file, immutable ? "public, max-age=31536000, immutable" : "no-cache");
  }
  // Paths without a file extension are app routes (/app/chat…): the SPA handles them.
  if (!extname(urlPath.split("?")[0])) {
    return send(res, req, { full: join(dist, "index.html"), size: statSync(join(dist, "index.html")).size }, "no-cache");
  }
  res.statusCode = 404;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("Not found");
}

const server = createServer((req, res) => {
  if (req.url === "/healthz") {
    res.setHeader("Content-Type", "text/plain");
    return res.end("ok");
  }
  headers(req, res, () => api(req, res, () => serveStatic(req, res)));
});

server.listen(port, () => {
  const ai = env.GEMINI_API_KEY || env.GOOGLE_API_KEY ? "AI key set" : "no AI key: set GEMINI_API_KEY";
  console.log(`[server] EducAlvator on http://localhost:${port} (${ai}${trustProxy ? ", behind proxy" : ""})`);
});

// Let the platform restart or redeploy cleanly.
for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => server.close(() => process.exit(0)));
}
