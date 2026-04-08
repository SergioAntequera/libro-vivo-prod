import { NextResponse } from "next/server";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import { getServerMediaStorageProvider } from "@/lib/mediaProvider";
import {
  assertGoogleDriveConfigured,
  describeGoogleDriveConfigError,
  uploadGardenChatMediaToGoogleDrive,
  type DriveChatMediaKind,
} from "@/lib/googleDriveServer";

export const runtime = "nodejs";

type ChatRoomLookup = {
  id: string;
  garden_id: string;
};

function isDriveChatMediaKind(value: string): value is DriveChatMediaKind {
  return value === "image" || value === "audio" || value === "video" || value === "file";
}

function validateChatFileKind(kind: DriveChatMediaKind, file: File) {
  if (kind === "image" && file.type.startsWith("image/")) return true;
  if (kind === "audio" && file.type.startsWith("audio/")) return true;
  if (kind === "video" && file.type.startsWith("video/")) return true;
  if (kind === "file") return true;
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

    const form = await req.formData();
    const roomId = String(form.get("roomId") ?? "").trim();
    const attachmentKindRaw = String(form.get("attachmentKind") ?? "").trim().toLowerCase();
    const fileValue = form.get("file");

    if (!roomId) {
      return NextResponse.json(
        { error: "Falta roomId en la subida del chat." },
        { status: 400 },
      );
    }
    if (!isDriveChatMediaKind(attachmentKindRaw)) {
      return NextResponse.json(
        { error: "Tipo de adjunto invalido. Usa image, audio, video o file." },
        { status: 400 },
      );
    }
    if (!(fileValue instanceof File)) {
      return NextResponse.json(
        { error: "Falta el archivo a subir." },
        { status: 400 },
      );
    }
    if (!validateChatFileKind(attachmentKindRaw, fileValue)) {
      return NextResponse.json(
        { error: `El archivo no coincide con el tipo '${attachmentKindRaw}'.` },
        { status: 400 },
      );
    }

    const roomRes = await auth.client
      .from("garden_chat_rooms")
      .select("id,garden_id")
      .eq("id", roomId)
      .is("archived_at", null)
      .maybeSingle();

    if (roomRes.error) {
      return NextResponse.json({ error: roomRes.error.message }, { status: 400 });
    }

    const room = (roomRes.data as ChatRoomLookup | null) ?? null;
    if (!room?.id || !room.garden_id) {
      return NextResponse.json(
        { error: "La sala del chat no existe o no esta accesible para esta sesion." },
        { status: 404 },
      );
    }

    const uploaded = await uploadGardenChatMediaToGoogleDrive({
      userId: auth.userId,
      gardenId: room.garden_id,
      roomId: room.id,
      kind: attachmentKindRaw,
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
