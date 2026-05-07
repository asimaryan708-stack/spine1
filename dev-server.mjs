import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

const mimeTypes = {
  ".css": "text/css; charset=UTF-8",
  ".gif": "image/gif",
  ".htm": "text/html; charset=UTF-8",
  ".html": "text/html; charset=UTF-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".map": "application/json; charset=UTF-8",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=UTF-8",
  ".wasm": "application/wasm",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function getPort(args) {
  const raw = args[0] ?? process.env.PORT ?? "8080";
  const port = Number.parseInt(String(raw), 10);
  return Number.isFinite(port) && port > 0 ? port : 8080;
}

function urlToFsPath(urlPathname) {
  // Normalize to a relative path rooted at the project folder.
  const noLeadingSlashes = urlPathname.replace(/^\/+/, "");
  const safe = path.normalize(noLeadingSlashes).replace(/^(\.\.(\/|\\|$))+/, "");
  return path.resolve(rootDir, safe);
}

async function resolveFilePath(urlPathname) {
  let pathname = urlPathname;
  if (pathname.endsWith("/")) pathname += "index.html";
  if (pathname === "") pathname = "index.html";

  let filePath = urlToFsPath(pathname);
  let stat = null;

  try {
    stat = await fs.promises.stat(filePath);
  } catch {
    // If the path is extensionless (e.g. /about), try /about.html for Vercel-like clean URLs.
    if (!path.extname(filePath)) {
      const withHtml = `${filePath}.html`;
      try {
        stat = await fs.promises.stat(withHtml);
        filePath = withHtml;
      } catch {
        stat = null;
      }
    }
  }

  if (!stat) return null;
  if (stat.isDirectory()) {
    const indexPath = path.join(filePath, "index.html");
    try {
      await fs.promises.access(indexPath, fs.constants.R_OK);
      return indexPath;
    } catch {
      return null;
    }
  }

  // Reject traversal by ensuring the resolved path stays within rootDir.
  const rel = path.relative(rootDir, filePath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;

  return filePath;
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=UTF-8" });
    res.end("Bad Request");
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { "Content-Type": "text/plain; charset=UTF-8" });
    res.end("Method Not Allowed");
    return;
  }

  let urlPathname;
  try {
    urlPathname = new URL(req.url, "http://localhost").pathname;
  } catch {
    res.writeHead(400, { "Content-Type": "text/plain; charset=UTF-8" });
    res.end("Bad Request");
    return;
  }

  const filePath = await resolveFilePath(urlPathname);
  if (!filePath) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=UTF-8" });
    res.end("Not Found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] ?? "application/octet-stream";

  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "no-cache");

  if (req.method === "HEAD") {
    res.statusCode = 200;
    res.end();
    return;
  }

  const stream = fs.createReadStream(filePath);
  stream.on("error", () => {
    if (!res.headersSent) res.writeHead(500, { "Content-Type": "text/plain; charset=UTF-8" });
    res.end("Server Error");
  });
  stream.pipe(res);
});

const port = getPort(process.argv.slice(2));
server.listen(port, "127.0.0.1", () => {
  console.log(`Static dev server running at http://127.0.0.1:${port}/`);
  console.log("Press Ctrl+C to stop.");
});

