import { NextResponse } from "next/server";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import { resolveActiveGardenIdForUser } from "@/lib/gardens";
import { getServerMediaStorageProvider } from "@/lib/mediaProvider";
import {
  assertGoogleDriveConfigured,
  describeGoogleDriveConfigError,
  uploadCapsuleMediaToGoogleDrive,
  type DriveMediaKind,
} from "@/lib/googleDriveServer";

export const runtime = "nodejs";

function isDriveMediaKind(value: string): value is DriveMediaKind {
  return value === "photo" || value === "audio" || value === "video";
}

function validateFileKind(kind: DriveMediaKind, file: File) {
  if (kind === "photo" && file.type.startsWith("image/")) return true;
  if (kind === "audio" && file.type.startsWith("audio/")) return true;
  if (kind === "video" && file.type.startsWith("video/")) return true;
  return false;
}

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

    const gardenId = await resolveActiveGardenIdForUser({
      userId: auth.userId,
      client: auth.client,
    });
    if (!gardenId) {
      return NextResponse.json(
        { error: "No hay jardin activo. Crea o unete a un jardin primero." },
        { status: 400 },
      );
    }

    const form = await req.formData();
    const kindRaw = String(form.get("kind") ?? "").trim().toLowerCase();
    const fileValue = form.get("file");

    if (!isDriveMediaKind(kindRaw)) {
      return NextResponse.json(
        { error: "Tipo de media invalido. Usa photo, audio o video." },
        { status: 400 },
      );
    }
    if (!(fileValue instanceof File)) {
      return NextResponse.json(
        { error: "Falta el archivo a subir." },
        { status: 400 },
      );
    }
    if (!validateFileKind(kindRaw, fileValue)) {
      return NextResponse.json(
        { error: `El archivo no coincide con el tipo '${kindRaw}'.` },
        { status: 400 },
      );
    }

    const uploaded = await uploadCapsuleMediaToGoogleDrive({
      userId: auth.userId,
      gardenId,
      kind: kindRaw,
      file: fileValue,
    });

    return NextResponse.json({
      ok: true,
      provider: "gdrive",
      fileId: uploaded.fileId,
      fileName: uploaded.fileName,
      folderId: uploaded.folderId,
      url: uploaded.url,
    });
  } catch (error) {
    return NextResponse.json(
      { error: describeGoogleDriveConfigError(error) },
      { status: 500 },
    );
  }
}
