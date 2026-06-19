import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

const MOBILE_PUBLIC_ROOT = path.join(process.cwd(), "public", "mobile");

const CONTENT_TYPES = new Map<string, string>([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".ttf", "font/ttf"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

function normalizeSegments(segments: string[]) {
  return segments
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment))
    .flatMap((segment) => segment.split("/"))
    .filter(Boolean);
}

function getRequestSegments(req: Request) {
  const pathname = new URL(req.url).pathname;
  const mobilePath = pathname === "/mobile" ? "" : pathname.replace(/^\/mobile\/?/, "");
  return mobilePath ? mobilePath.split("/") : [];
}

function resolveRequestedFile(req: Request) {
  const segments = normalizeSegments(getRequestSegments(req));
  const relativePath = segments.length ? path.join(...segments) : "index.html";
  const candidate = path.resolve(MOBILE_PUBLIC_ROOT, relativePath);
  const safeRoot = `${MOBILE_PUBLIC_ROOT}${path.sep}`;
  if (candidate !== MOBILE_PUBLIC_ROOT && !candidate.startsWith(safeRoot)) {
    return null;
  }
  return candidate;
}

async function readIfFile(filePath: string | null) {
  if (!filePath) return null;
  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) return null;
    return {
      filePath,
      buffer: await fs.readFile(filePath),
    };
  } catch {
    return null;
  }
}

function getCacheControl(filePath: string) {
  if (filePath.endsWith("index.html")) {
    return "no-cache, no-store, must-revalidate";
  }
  if (filePath.endsWith("manifest.json")) {
    return "public, max-age=0, must-revalidate";
  }
  return "public, max-age=31536000, immutable";
}

function getContentType(filePath: string) {
  return CONTENT_TYPES.get(path.extname(filePath).toLowerCase()) ?? "application/octet-stream";
}

async function serveMobileAsset(req: Request, includeBody: boolean) {
  const requestedFile = await readIfFile(resolveRequestedFile(req));
  const fallbackFile = requestedFile ?? (await readIfFile(path.join(MOBILE_PUBLIC_ROOT, "index.html")));

  if (!fallbackFile) {
    return NextResponse.json(
      { error: "Mobile PWA bundle missing. Run the mobile export and sync first." },
      { status: 503 },
    );
  }

  return new NextResponse(includeBody ? fallbackFile.buffer : null, {
    headers: {
      "Cache-Control": getCacheControl(fallbackFile.filePath),
      "Content-Length": String(fallbackFile.buffer.byteLength),
      "Content-Type": getContentType(fallbackFile.filePath),
    },
  });
}

export async function GET(req: Request) {
  return serveMobileAsset(req, true);
}

export async function HEAD(req: Request) {
  return serveMobileAsset(req, false);
}
