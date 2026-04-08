import { NextResponse } from "next/server";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import {
  assertGoogleDriveConfigured,
  deletePageMediaFromGoogleDrive,
  describeGoogleDriveConfigError,
  extractDriveFileIdFromProxyUrl,
} from "@/lib/googleDriveServer";

export const runtime = "nodejs";

export async function DELETE(req: Request) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  try {
    assertGoogleDriveConfigured();

    const payload = (await req.json().catch(() => null)) as
      | { pageId?: unknown; url?: unknown }
      | null;

    const pageId = String(payload?.pageId ?? "").trim();
    const url = String(payload?.url ?? "").trim();

    if (!pageId) {
      return NextResponse.json({ error: "Falta pageId." }, { status: 400 });
    }
    if (!url) {
      return NextResponse.json({ error: "Falta la URL del media." }, { status: 400 });
    }

    const fileId = extractDriveFileIdFromProxyUrl(url);
    if (!fileId) {
      return NextResponse.json(
        { error: "La URL no corresponde a un archivo gestionado por Drive." },
        { status: 400 },
      );
    }

    await deletePageMediaFromGoogleDrive({
      client: auth.client,
      pageId,
      fileId,
    });

    return NextResponse.json({ ok: true, provider: "gdrive", fileId });
  } catch (error) {
    return NextResponse.json(
      { error: describeGoogleDriveConfigError(error) },
      { status: 500 },
    );
  }
}
