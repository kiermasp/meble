import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "dist");
const port = Number(process.env.PORT ?? 3000);
const api = (process.env.API_BASE_URL ?? "http://127.0.0.1:3010").replace(/\/$/, "");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const HEALTH =
  '<!DOCTYPE html><html lang="pl"><head><meta charset="utf-8"><title>ok</title></head><body><p>ok</p></body></html>';

function fileFor(pathname) {
  const relative = normalize(decodeURIComponent(pathname)).replace(/^[/\\]+/, "");
  const file = join(root, relative);
  if (file !== root && !file.startsWith(root + sep)) return null;
  return file;
}

createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405).end();
    return;
  }
  if (url.pathname === "/health") {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(request.method === "HEAD" ? undefined : HEALTH);
    return;
  }
  if (url.pathname === "/materials") {
    try {
      const upstream = await fetch(`${api}/materials${url.search}`, { headers: { accept: "application/json" } });
      const body = Buffer.from(await upstream.arrayBuffer());
      response.writeHead(upstream.status, {
        "content-type": upstream.headers.get("content-type") ?? "application/json; charset=utf-8",
      });
      response.end(request.method === "HEAD" ? undefined : body);
    } catch {
      response.writeHead(502, { "content-type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "catalog unavailable" }));
    }
    return;
  }

  let file = fileFor(url.pathname);
  if (!file) {
    response.writeHead(403).end();
    return;
  }
  let info = await stat(file).catch(() => null);
  if (info?.isDirectory()) {
    file = join(file, "index.html");
    info = await stat(file).catch(() => null);
  }
  if (!info && !extname(url.pathname)) {
    file = join(root, "index.html");
    info = await stat(file).catch(() => null);
  }
  if (!info) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
  if (request.method === "HEAD") response.end();
  else createReadStream(file).pipe(response);
}).listen(port);
