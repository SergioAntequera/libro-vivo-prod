"use client";

import { supabase } from "@/lib/supabase";
import { toErrorMessage } from "@/lib/errorMessage";
import { getClientMediaStorageProvider } from "@/lib/mediaProvider";
import {
  uploadStorageObjectWithProgress,
  type UploadProgress,
} from "@/lib/storageUploadWithProgress";
import type { UploadPhase } from "@/lib/uploadStatus";
import type {
  GardenChatAttachmentKind,
  GardenChatUploadedMedia,
} from "@/lib/gardenChatMedia";

const GARDEN_CHAT_STORAGE_BUCKET = "garden-chat-media";

function buildProgressSnapshot(
  loaded: number,
  total: number,
  startedAt: number,
): UploadProgress {
  const elapsedMs = Math.max(1, Date.now() - startedAt);
  const speedBytesPerSec = loaded / (elapsedMs / 1000);
  const remainingBytes = Math.max(0, total - loaded);
  const remainingMs =
    speedBytesPerSec > 1 ? Math.round((remainingBytes / speedBytesPerSec) * 1000) : null;
  const percent = total > 0 ? Math.min(100, (loaded / total) * 100) : 0;
  return {
    loaded,
    total,
    percent,
    elapsedMs,
    speedBytesPerSec,
    remainingMs,
  };
}

function normalizeUploadPayload(payload: unknown, file: File): GardenChatUploadedMedia | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const url = String(root.url ?? "").trim();
  if (!url) return null;
  const provider = String(root.provider ?? "gdrive").trim() || "gdrive";
  return {
    provider,
    fileId: String(root.fileId ?? "").trim() || null,
    fileName: String(root.fileName ?? file.name).trim() || file.name,
    folderId: String(root.folderId ?? "").trim() || null,
    url,
    storageBucket: provider,
    storagePath: url,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size || 0,
  };
}

function buildGardenChatStoragePath(gardenId: string, roomId: string, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const baseName = file.name
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "media";
  return `${gardenId}/${roomId}/${baseName}-${crypto.randomUUID()}.${ext}`;
}

async function uploadGardenChatMediaViaDriveApi(
  roomId: string,
  attachmentKind: GardenChatAttachmentKind,
  file: File,
  opts?: {
    onProgress?: (progress: UploadProgress) => void;
    onAbortReady?: (abortFn: (() => void) | null) => void;
    onPhaseChange?: (phase: UploadPhase) => void;
  },
) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session?.access_token) {
    throw new Error("Sesion no valida. Inicia sesion de nuevo para subir adjuntos.");
  }

  const startedAt = Date.now();
  return await new Promise<GardenChatUploadedMedia>((resolve, reject) => {
    let settled = false;
    const resolveOnce = (value: GardenChatUploadedMedia) => {
      if (settled) return;
      settled = true;
      opts?.onAbortReady?.(null);
      resolve(value);
    };
    const rejectOnce = (error: Error) => {
      if (settled) return;
      settled = true;
      opts?.onAbortReady?.(null);
      reject(error);
    };

    const xhr = new XMLHttpRequest();
    opts?.onPhaseChange?.("uploading");
    opts?.onAbortReady?.(() => {
      if (settled) return;
      try {
        xhr.abort();
      } catch {
        rejectOnce(new Error("UPLOAD_ABORTED"));
      }
    });

    xhr.open("POST", "/api/chat/media/upload", true);
    xhr.responseType = "text";
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);

    xhr.upload.onprogress = (event) => {
      if (!opts?.onProgress) return;
      const total = event.total || file.size || 0;
      const loaded = event.loaded || 0;
      opts.onProgress(buildProgressSnapshot(loaded, total, startedAt));
    };
    xhr.upload.onload = () => {
      opts?.onPhaseChange?.("processing");
    };

    xhr.onerror = () => {
      rejectOnce(new Error("Error de red subiendo adjunto del chat."));
    };
    xhr.onabort = () => {
      rejectOnce(new Error("UPLOAD_ABORTED"));
    };

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        let reason = `Upload backend fallo (${xhr.status})`;
        try {
          const parsed = JSON.parse(xhr.responseText || "{}") as Record<string, unknown>;
          reason = String(parsed.error ?? parsed.message ?? reason);
        } catch {
          if (xhr.responseText) reason = xhr.responseText;
        }
        rejectOnce(new Error(reason));
        return;
      }

      let payload: unknown = null;
      try {
        payload = JSON.parse(xhr.responseText || "{}");
      } catch (error) {
        rejectOnce(
          new Error(
            toErrorMessage(error, "La respuesta del upload de chat no es JSON valido."),
          ),
        );
        return;
      }

      const normalized = normalizeUploadPayload(payload, file);
      if (!normalized) {
        rejectOnce(new Error("El backend de media del chat no devolvio una URL valida."));
        return;
      }

      if (opts?.onProgress) {
        opts.onProgress(buildProgressSnapshot(file.size, file.size, startedAt));
      }
      resolveOnce(normalized);
    };

    const formData = new FormData();
    formData.append("roomId", roomId);
    formData.append("attachmentKind", attachmentKind);
    formData.append("file", file, file.name);
    xhr.send(formData);
  });
}

async function uploadGardenChatMediaToSupabaseStorage(input: {
  gardenId: string;
  roomId: string;
  file: File;
  opts?: {
    onProgress?: (progress: UploadProgress) => void;
    onAbortReady?: (abortFn: (() => void) | null) => void;
    onPhaseChange?: (phase: UploadPhase) => void;
  };
}) {
  const path = buildGardenChatStoragePath(input.gardenId, input.roomId, input.file);
  input.opts?.onPhaseChange?.("uploading");
  await uploadStorageObjectWithProgress({
    bucket: GARDEN_CHAT_STORAGE_BUCKET,
    path,
    file: input.file,
    upsert: false,
    contentType: input.file.type || "application/octet-stream",
    onProgress: input.opts?.onProgress,
    onAbortReady: input.opts?.onAbortReady,
  });

  input.opts?.onPhaseChange?.("processing");

  return {
    provider: "supabase",
    fileId: null,
    fileName: input.file.name,
    folderId: null,
    url: path,
    storageBucket: GARDEN_CHAT_STORAGE_BUCKET,
    storagePath: path,
    mimeType: input.file.type || "application/octet-stream",
    sizeBytes: input.file.size || 0,
  } satisfies GardenChatUploadedMedia;
}

export async function uploadGardenChatMedia(
  gardenId: string,
  roomId: string,
  attachmentKind: GardenChatAttachmentKind,
  file: File,
  opts?: {
    onProgress?: (progress: UploadProgress) => void;
    onAbortReady?: (abortFn: (() => void) | null) => void;
    onPhaseChange?: (phase: UploadPhase) => void;
  },
) {
  if (getClientMediaStorageProvider() === "gdrive") {
    return uploadGardenChatMediaViaDriveApi(roomId, attachmentKind, file, opts);
  }

  return uploadGardenChatMediaToSupabaseStorage({
    gardenId,
    roomId,
    file,
    opts,
  });
}
