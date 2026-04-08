import { NextResponse } from "next/server";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import { getServerMediaStorageProvider } from "@/lib/mediaProvider";
import {
  assertGoogleDriveConfigured,
  describeGoogleDriveConfigError,
  uploadSeedPreparationAttachmentToGoogleDrive,
} from "@/lib/googleDriveServer";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  if (getServerMediaStorageProvider() !== "gdrive") {
    return NextResponse.json(
      { error: "El proveedor de media activo no es Google Drive." },
      { status: 409 },
    );
  }

  try {
    assertGoogleDriveConfigured();

    const form = await req.formData();
    const seedId = String(form.get("seedId") ?? "").trim();
    const fileValue = form.get("file");

    if (!seedId) {
      return NextResponse.json({ error: "Falta seedId en la subida." }, { status: 400 });
    }
    if (!(fileValue instanceof File)) {
      return NextResponse.json({ error: "Falta el documento a subir." }, { status: 400 });
    }

    const uploaded = await uploadSeedPreparationAttachmentToGoogleDrive({
      client: auth.client,
      userId: auth.userId,
      seedId,
      file: fileValue,
    });

    return NextResponse.json({
      ok: true,
      provider: "gdrive",
      fileId: uploaded.fileId,
      fileName: uploaded.fileName,
      folderId: uploaded.folderId,
      url: uploaded.url,
      mimeType: fileValue.type || "application/octet-stream",
    });
  } catch (error) {
    return NextResponse.json(
      { error: describeGoogleDriveConfigError(error) },
      { status: 500 },
    );
  }
}
