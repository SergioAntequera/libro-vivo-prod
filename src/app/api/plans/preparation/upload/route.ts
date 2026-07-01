import { NextResponse } from "next/server";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import { getServerMediaStorageProvider } from "@/lib/mediaProvider";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import {
  assertGoogleDriveConfigured,
  describeGoogleDriveConfigError,
  uploadSeedPreparationAttachmentToGoogleDrive,
} from "@/lib/googleDriveServer";

export const runtime = "nodejs";

function resolveSupabasePreparationBucket(file: File) {
  if (file.type.startsWith("audio/")) return "page-audio";
  if (file.type.startsWith("video/")) return "page-videos";
  return "page-photos";
}

function normalizeStorageFileName(fileName: string, fallbackExt: string) {
  const trimmed = fileName.trim();
  const sanitizedBase = trimmed
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (sanitizedBase) return sanitizedBase;
  return `seed-preparation-${crypto.randomUUID()}.${fallbackExt}`;
}

function buildSupabasePreparationPath(seedId: string, userId: string, file: File) {
  const ext = file.name.split(".").pop()?.trim().toLowerCase() || "bin";
  const safeFileName = normalizeStorageFileName(file.name, ext);
  return `pages/${seedId}/preparation/${userId}-${crypto.randomUUID()}-${safeFileName}`;
}

export async function POST(req: Request) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;
  const provider = getServerMediaStorageProvider();

  try {
    const form = await req.formData();
    const seedId = String(form.get("seedId") ?? "").trim();
    const fileValue = form.get("file");

    if (!seedId) {
      return NextResponse.json({ error: "Falta seedId en la subida." }, { status: 400 });
    }
    if (!(fileValue instanceof File)) {
      return NextResponse.json({ error: "Falta el documento a subir." }, { status: 400 });
    }

    if (provider === "gdrive") {
      assertGoogleDriveConfigured();

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
    }

    const bucket = resolveSupabasePreparationBucket(fileValue);
    const path = buildSupabasePreparationPath(seedId, auth.userId, fileValue);
    const adminClient = getSupabaseAdminClient();
    const uploadResult = await adminClient.storage.from(bucket).upload(path, fileValue, {
      contentType: fileValue.type || undefined,
      upsert: false,
    });

    if (uploadResult.error) {
      return NextResponse.json(
        { error: `No se pudo subir el documento de preparacion: ${uploadResult.error.message}` },
        { status: 500 },
      );
    }

    const { data: publicUrlData } = adminClient.storage.from(bucket).getPublicUrl(path);

    return NextResponse.json({
      ok: true,
      provider: "supabase",
      fileId: path,
      fileName: fileValue.name,
      folderId: bucket,
      url: publicUrlData.publicUrl,
      mimeType: fileValue.type || "application/octet-stream",
    });
  } catch (error) {
    const message =
      provider === "gdrive"
        ? describeGoogleDriveConfigError(error)
        : error instanceof Error
          ? error.message
          : "No se pudo subir el documento de preparacion.";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
