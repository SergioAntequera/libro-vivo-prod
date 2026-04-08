import { NextResponse } from "next/server";
import {
  createDriveDownloadResponse,
  verifyDriveProxyToken,
} from "@/lib/googleDriveServer";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await ctx.params;
  const resolvedFileId = String(fileId ?? "").trim();
  if (!resolvedFileId) {
    return NextResponse.json(
      { error: "Falta fileId." },
      { status: 400 },
    );
  }

  const token = new URL(req.url).searchParams.get("token");
  if (!verifyDriveProxyToken(resolvedFileId, token)) {
    return NextResponse.json(
      { error: "Token de media invalido." },
      { status: 403 },
    );
  }

  return createDriveDownloadResponse(
    resolvedFileId,
    req.headers.get("range"),
  );
}

