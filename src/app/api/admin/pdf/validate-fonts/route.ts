import { NextResponse } from "next/server";
import { access } from "node:fs/promises";
import path from "node:path";
import { requireSuperadminRoute } from "@/lib/serverRouteAuth";

export const runtime = "nodejs";

type FontCheckStatus =
  | "ok"
  | "missing"
  | "outside_public"
  | "absolute_unchecked"
  | "invalid"
  | "error";

type FontCheck = {
  input: string;
  resolved: string | null;
  status: FontCheckStatus;
  message: string;
};

const DEFAULT_REGULAR = "public/fonts/Lato-Regular.ttf";
const DEFAULT_BOLD = "public/fonts/Lato-Bold.ttf";

function normalizeRawPath(input: string | null, fallback: string) {
  const value = String(input ?? "").trim();
  return value || fallback;
}

function resolveCandidate(rawPath: string): {
  input: string;
  resolved: string | null;
  status: FontCheckStatus;
  message: string;
} {
  const input = String(rawPath ?? "").trim();
  if (!input) {
    return {
      input,
      resolved: null,
      status: "invalid",
      message: "Ruta vacía.",
    };
  }

  if (path.isAbsolute(input)) {
    return {
      input,
      resolved: null,
      status: "absolute_unchecked",
      message: "Ruta absoluta: no se valida por seguridad en este endpoint.",
    };
  }

  const publicRoot = path.resolve(process.cwd(), "public");
  const normalized = input.replace(/[\\/]+/g, path.sep);
  const relativeToPublic = normalized.startsWith(`public${path.sep}`)
    ? normalized.slice(`public${path.sep}`.length)
    : normalized;
  const safeRelative = relativeToPublic.replace(/^[\\/]+/, "");
  const resolved = path.resolve(publicRoot, safeRelative);

  const publicNorm = publicRoot.toLowerCase();
  const resolvedNorm = resolved.toLowerCase();
  if (
    resolvedNorm !== publicNorm &&
    !resolvedNorm.startsWith(`${publicNorm}${path.sep}`)
  ) {
    return {
      input,
      resolved: null,
      status: "outside_public",
      message: "Ruta fuera de /public (bloqueada).",
    };
  }

  return {
    input,
    resolved,
    status: "ok",
    message: "Ruta dentro de /public.",
  };
}

async function checkFontPath(rawPath: string): Promise<FontCheck> {
  const candidate = resolveCandidate(rawPath);
  if (candidate.status !== "ok") return candidate;

  try {
    await access(candidate.resolved as string);
    return {
      ...candidate,
      status: "ok",
      message: "Archivo encontrado.",
    };
  } catch {
    return {
      ...candidate,
      status: "missing",
      message: "Archivo no encontrado.",
    };
  }
}

export async function GET(req: Request) {
  try {
    const auth = await requireSuperadminRoute(req);
    if (!auth.ok) return auth.response;

    const url = new URL(req.url);
    const regularPath = normalizeRawPath(
      url.searchParams.get("regular"),
      DEFAULT_REGULAR,
    );
    const boldPath = normalizeRawPath(url.searchParams.get("bold"), DEFAULT_BOLD);

    const [regular, bold] = await Promise.all([
      checkFontPath(regularPath),
      checkFontPath(boldPath),
    ]);

    return NextResponse.json({ regular, bold });
  } catch (error) {
    return NextResponse.json(
      {
        regular: {
          input: "",
          resolved: null,
          status: "error",
          message: "Error validando fuente regular.",
        } as FontCheck,
        bold: {
          input: "",
          resolved: null,
          status: "error",
          message: "Error validando fuente bold.",
        } as FontCheck,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}
