"use client";

import { supabase } from "@/lib/supabase";
import type {
  GardenChatMessageKind,
  GardenChatMessageRow,
  GardenChatReactionRow,
  GardenChatRoomRow,
} from "@/lib/gardenChat";
import type {
  GardenChatAttachmentKind,
  GardenChatMessageAttachmentRow,
  GardenChatUploadedMedia,
} from "@/lib/gardenChatMedia";

export const GARDEN_CHAT_ROOM_SELECT =
  "id,garden_id,slug,title,room_kind,sort_order,archived_at,created_by,created_at,updated_at";

export const GARDEN_CHAT_MESSAGE_SELECT =
  "id,room_id,garden_id,author_user_id,client_message_id,kind,body_text,reply_to_message_id,metadata,edited_at,deleted_at,deleted_by_user_id,created_at,updated_at";

export const GARDEN_CHAT_ATTACHMENT_SELECT =
  "id,message_id,garden_id,uploaded_by_user_id,storage_bucket,storage_path,attachment_kind,mime_type,size_bytes,duration_ms,waveform_json,preview_text,created_at";
export const GARDEN_CHAT_REACTION_SELECT =
  "message_id,room_id,garden_id,user_id,emoji,created_at";

function createClientMessageId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function ensureGardenChatMainRoom(input: {
  gardenId: string;
  currentProfileId: string;
}) {
  const gardenId = String(input.gardenId ?? "").trim();
  const currentProfileId = String(input.currentProfileId ?? "").trim();
  if (!gardenId || !currentProfileId) {
    throw new Error("Faltan gardenId o currentProfileId para abrir la sala principal.");
  }

  const roomRes = await supabase
    .from("garden_chat_rooms")
    .select(GARDEN_CHAT_ROOM_SELECT)
    .eq("garden_id", gardenId)
    .eq("slug", "main")
    .is("archived_at", null)
    .maybeSingle();

  if (roomRes.error) {
    throw roomRes.error;
  }

  if (roomRes.data) {
    return roomRes.data as GardenChatRoomRow;
  }

  const createRes = await supabase
    .from("garden_chat_rooms")
    .insert({
      garden_id: gardenId,
      slug: "main",
      title: "Chat",
      room_kind: "main",
      sort_order: 0,
      created_by: currentProfileId,
    })
    .select(GARDEN_CHAT_ROOM_SELECT)
    .single();

  if (createRes.error) {
    const duplicateMainRoom =
      String(createRes.error.code ?? "").trim() === "23505" ||
      String(createRes.error.message ?? "").toLowerCase().includes("duplicate");
    if (!duplicateMainRoom) {
      throw createRes.error;
    }

    const retryRes = await supabase
      .from("garden_chat_rooms")
      .select(GARDEN_CHAT_ROOM_SELECT)
      .eq("garden_id", gardenId)
      .eq("slug", "main")
      .is("archived_at", null)
      .single();

    if (retryRes.error) {
      throw retryRes.error;
    }

    return retryRes.data as GardenChatRoomRow;
  }

  return createRes.data as GardenChatRoomRow;
}

export async function insertGardenChatMessage(input: {
  roomId: string;
  gardenId: string;
  authorUserId: string;
  kind: GardenChatMessageKind;
  bodyText?: string | null;
  metadata?: Record<string, unknown>;
  replyToMessageId?: string | null;
  clientMessageId?: string;
}) {
  const roomId = String(input.roomId ?? "").trim();
  const gardenId = String(input.gardenId ?? "").trim();
  const authorUserId = String(input.authorUserId ?? "").trim();
  if (!roomId || !gardenId || !authorUserId) {
    throw new Error("Faltan datos para insertar el mensaje del chat.");
  }

  const insertRes = await supabase
    .from("garden_chat_messages")
    .insert({
      room_id: roomId,
      garden_id: gardenId,
      author_user_id: authorUserId,
      client_message_id: String(input.clientMessageId ?? createClientMessageId()).trim() || createClientMessageId(),
      kind: input.kind,
      body_text: input.bodyText ?? null,
      metadata: input.metadata ?? {},
      reply_to_message_id: input.replyToMessageId ?? null,
    })
    .select(GARDEN_CHAT_MESSAGE_SELECT)
    .single();

  if (insertRes.error) {
    throw insertRes.error;
  }

  return insertRes.data as GardenChatMessageRow;
}

export async function insertGardenChatMessageAttachment(input: {
  messageId: string;
  gardenId: string;
  uploadedByUserId: string;
  storageBucket: string;
  storagePath: string;
  attachmentKind: GardenChatAttachmentKind;
  mimeType: string;
  sizeBytes: number;
  durationMs?: number | null;
  waveformJson?: unknown;
  previewText?: string | null;
}) {
  const messageId = String(input.messageId ?? "").trim();
  const gardenId = String(input.gardenId ?? "").trim();
  const uploadedByUserId = String(input.uploadedByUserId ?? "").trim();
  if (!messageId || !gardenId || !uploadedByUserId) {
    throw new Error("Faltan datos para guardar el adjunto del chat.");
  }

  const insertRes = await supabase
    .from("garden_chat_message_attachments")
    .insert({
      message_id: messageId,
      garden_id: gardenId,
      uploaded_by_user_id: uploadedByUserId,
      storage_bucket: input.storageBucket,
      storage_path: input.storagePath,
      attachment_kind: input.attachmentKind,
      mime_type: input.mimeType,
      size_bytes: Math.max(0, Number(input.sizeBytes ?? 0)),
      duration_ms:
        input.durationMs == null ? null : Math.max(0, Math.round(Number(input.durationMs))),
      waveform_json: input.waveformJson ?? null,
      preview_text: input.previewText ?? null,
    })
    .select(GARDEN_CHAT_ATTACHMENT_SELECT)
    .single();

  if (insertRes.error) {
    throw insertRes.error;
  }

  return insertRes.data as GardenChatMessageAttachmentRow;
}

async function softDeleteGardenChatMessage(messageId: string, currentProfileId: string) {
  const deleteRes = await supabase
    .from("garden_chat_messages")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by_user_id: currentProfileId,
    })
    .eq("id", messageId)
    .eq("author_user_id", currentProfileId)
    .is("deleted_at", null);

  if (deleteRes.error) {
    throw deleteRes.error;
  }
}

export async function updateGardenChatMessageBody(input: {
  messageId: string;
  currentProfileId: string;
  bodyText: string;
}) {
  const messageId = String(input.messageId ?? "").trim();
  const currentProfileId = String(input.currentProfileId ?? "").trim();
  const bodyText = String(input.bodyText ?? "").trim();

  if (!messageId || !currentProfileId || !bodyText) {
    throw new Error("Faltan datos para editar el mensaje del chat.");
  }

  const updateRes = await supabase
    .from("garden_chat_messages")
    .update({
      body_text: bodyText,
      edited_at: new Date().toISOString(),
    })
    .eq("id", messageId)
    .eq("author_user_id", currentProfileId)
    .is("deleted_at", null)
    .select(GARDEN_CHAT_MESSAGE_SELECT)
    .single();

  if (updateRes.error) {
    throw updateRes.error;
  }

  return updateRes.data as GardenChatMessageRow;
}

export async function softDeleteOwnGardenChatMessage(input: {
  messageId: string;
  currentProfileId: string;
}) {
  const messageId = String(input.messageId ?? "").trim();
  const currentProfileId = String(input.currentProfileId ?? "").trim();

  if (!messageId || !currentProfileId) {
    throw new Error("Faltan datos para eliminar el mensaje del chat.");
  }

  await softDeleteGardenChatMessage(messageId, currentProfileId);
}

export async function sendGardenChatUploadedMediaMessage(input: {
  roomId: string;
  gardenId: string;
  authorUserId: string;
  messageKind: Extract<GardenChatMessageKind, "voice_note" | "attachment">;
  attachmentKind: GardenChatAttachmentKind;
  upload: GardenChatUploadedMedia;
  bodyText?: string | null;
  previewText?: string | null;
  durationMs?: number | null;
  waveformJson?: unknown;
  clientMessageId?: string;
}) {
  const message = await insertGardenChatMessage({
    roomId: input.roomId,
    gardenId: input.gardenId,
    authorUserId: input.authorUserId,
    clientMessageId: input.clientMessageId,
    kind: input.messageKind,
    bodyText: input.bodyText ?? null,
    metadata: {
      attachment_kind: input.attachmentKind,
      provider: input.upload.provider,
      file_id: input.upload.fileId,
      file_name: input.upload.fileName,
      duration_ms: input.durationMs ?? null,
    },
  });

  try {
    const attachment = await insertGardenChatMessageAttachment({
      messageId: message.id,
      gardenId: input.gardenId,
      uploadedByUserId: input.authorUserId,
      storageBucket: input.upload.storageBucket,
      storagePath: input.upload.storagePath,
      attachmentKind: input.attachmentKind,
      mimeType: input.upload.mimeType,
      sizeBytes: input.upload.sizeBytes,
      durationMs: input.durationMs ?? null,
      waveformJson: input.waveformJson,
      previewText: input.previewText ?? input.upload.fileName,
    });

    return { message, attachment };
  } catch (error) {
    await softDeleteGardenChatMessage(message.id, input.authorUserId).catch(() => null);
    throw error;
  }
}

export async function sendGardenChatReferenceMessage(input: {
  gardenId: string;
  authorUserId: string;
  reference: Record<string, unknown>;
}) {
  const room = await ensureGardenChatMainRoom({
    gardenId: input.gardenId,
    currentProfileId: input.authorUserId,
  });

  return insertGardenChatMessage({
    roomId: room.id,
    gardenId: input.gardenId,
    authorUserId: input.authorUserId,
    kind: "reference",
    metadata: input.reference,
  });
}

export async function addGardenChatMessageReaction(input: {
  messageId: string;
  roomId: string;
  gardenId: string;
  userId: string;
  emoji: string;
}) {
  const messageId = String(input.messageId ?? "").trim();
  const roomId = String(input.roomId ?? "").trim();
  const gardenId = String(input.gardenId ?? "").trim();
  const userId = String(input.userId ?? "").trim();
  const emoji = String(input.emoji ?? "").trim();

  if (!messageId || !roomId || !gardenId || !userId || !emoji) {
    throw new Error("Faltan datos para guardar la reaccion del chat.");
  }

  const insertRes = await supabase
    .from("garden_chat_message_reactions")
    .insert({
      message_id: messageId,
      room_id: roomId,
      garden_id: gardenId,
      user_id: userId,
      emoji,
    })
    .select(GARDEN_CHAT_REACTION_SELECT)
    .single();

  if (insertRes.error) {
    throw insertRes.error;
  }

  return insertRes.data as GardenChatReactionRow;
}

export async function removeGardenChatMessageReaction(input: {
  messageId: string;
  userId: string;
  emoji: string;
}) {
  const messageId = String(input.messageId ?? "").trim();
  const userId = String(input.userId ?? "").trim();
  const emoji = String(input.emoji ?? "").trim();

  if (!messageId || !userId || !emoji) {
    throw new Error("Faltan datos para eliminar la reaccion del chat.");
  }

  const deleteRes = await supabase
    .from("garden_chat_message_reactions")
    .delete()
    .eq("message_id", messageId)
    .eq("user_id", userId)
    .eq("emoji", emoji);

  if (deleteRes.error) {
    throw deleteRes.error;
  }
}
