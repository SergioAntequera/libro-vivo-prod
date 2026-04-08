import { NextResponse } from "next/server";
import { access } from "node:fs/promises";
import path from "node:path";
import { requireSuperadminRoute } from "@/lib/serverRouteAuth";

export const runtime = "nodejs";

type AssetStatus = "ok" | "invalid" | "outside_public" | "missing" | "unreachable" | "error";

type AssetCheck = {
  path: string;
  status: AssetStatus;
  message: string;
};

type ValidatePayload = {
  paths?: unknown;
};

const MAX_PATHS = 200;
const IMAGE_EXT_RE = /\.(svg|png|jpe?g|webp|gif|avif)$/i;

function normalizeInputPath(raw: string) {
  return String(raw ?? "").trim();
}

function isRemotePath(input: string) {
  return /^https?:\/\//i.test(input);
}

function isLocalPath(input: string) {
  return input.startsWith("/");
}

function normalizeLocalPathToPublic(input: string) {
  const withoutQuery = input.split("?")[0]?.split("#")[0] ?? input;
  const safeRelative = withoutQuery.replace(/^\/+/, "").replace(/[\\/]+/g, path.sep);
  const publicRoot = path.resolve(process.cwd(), "public");
  const resolved = path.resolve(publicRoot, safeRelative);
  return { publicRoot, resolved };
}

function isInsidePublic(publicRoot: string, resolved: string) {
  const root = publicRoot.toLowerCase();
  const target = resolved.toLowerCase();
  return target === root || target.startsWith(`${root}${path.sep}`);
}

async function checkLocalAsset(input: string): Promise<AssetCheck> {
  if (!IMAGE_EXT_RE.test(input)) {
    return {
      path: input,
      status: "invalid",
      message: "Ruta local sin extension de imagen valida.",
    };
  }

  const { publicRoot, resolved } = normalizeLocalPathToPublic(input);
  if (!isInsidePublic(publicRoot, resolved)) {
    return {
      path: input,
      status: "outside_public",
      message: "Ruta fuera de /public (bloqueada).",
    };
  }

  try {
    await access(resolved);
    return {
      path: input,
      status: "ok",
      message: "Asset local encontrado.",
    };
  } catch {
    return {
      path: input,
      status: "missing",
      message: "Asset local no encontrado en /public.",
    };
  }
}

async function fetchWithTimeout(url: string, method: "HEAD" | "GET", timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

async function checkRemoteAsset(input: string): Promise<AssetCheck> {
  try {
    if (!IMAGE_EXT_RE.test(input)) {
      return {
        path: input,
        status: "invalid",
        message: "URL remota sin extension de imagen valida.",
      };
    }

    let response = await fetchWithTimeout(input, "HEAD", 5000);
    if (response.status === 405 || response.status === 501) {
      response = await fetchWithTimeout(input, "GET", 7000);
    }

    if (response.ok) {
      return {
        path: input,
        status: "ok",
        message: "Asset remoto accesible.",
      };
    }

    return {
      path: input,
      status: "unreachable",
      message: `Asset remoto devolvio ${response.status}.`,
    };
  } catch (error) {
    return {
      path: input,
      status: "error",
      message: error instanceof Error ? error.message : "Error validando URL remota.",
    };
  }
}

async function checkAssetPath(rawPath: string): Promise<AssetCheck> {
  const input = normalizeInputPath(rawPath);
  if (!input) {
    return {
      path: input,
      status: "invalid",
      message: "Ruta vacía.",
    };
  }

  if (isLocalPath(input)) return checkLocalAsset(input);
  if (isRemotePath(input)) return checkRemoteAsset(input);

  return {
    path: input,
    status: "invalid",
    message: "Formato de ruta invalido (usa /ruta o https://...).",
  };
}

export async function POST(req: Request) {
  try {
    const auth = await requireSuperadminRoute(req);
    if (!auth.ok) return auth.response;

    const body = (await req.json()) as ValidatePayload;
    const rawPaths = Array.isArray(body.paths) ? body.paths : [];
    const unique = Array.from(
      new Set(rawPaths.map((value) => String(value ?? "").trim()).filter(Boolean)),
    ).slice(0, MAX_PATHS);

    const results = await Promise.all(unique.map((assetPath) => checkAssetPath(assetPath)));
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error validando assets.",
        results: [] as AssetCheck[],
      },
      { status: 500 },
    );
  }
}
