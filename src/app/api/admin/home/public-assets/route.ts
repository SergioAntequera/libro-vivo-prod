import { NextResponse } from "next/server";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { requireSuperadminRoute } from "@/lib/serverRouteAuth";

export const runtime = "nodejs";

const IMAGE_EXT_RE = /\.(png|jpe?g|svg|webp|gif|avif)$/i;

export async function GET(req: Request) {
  try {
    const auth = await requireSuperadminRoute(req);
    if (!auth.ok) return auth.response;

    const assetsDir = path.resolve(process.cwd(), "public", "assets");
    const entries = await readdir(assetsDir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && IMAGE_EXT_RE.test(entry.name))
      .map((entry) => `/assets/${entry.name}`)
      .sort((a, b) => a.localeCompare(b, "es"));

    return NextResponse.json({ assets: files });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No se pudo listar /public/assets.",
        assets: [] as string[],
      },
      { status: 500 },
    );
  }
}
