"use client";

export type GardenChatAttachmentKind = "image" | "audio" | "video" | "file";

export type GardenChatMessageAttachmentRow = {
  id: string;
  message_id: string;
  garden_id: string;
  uploaded_by_user_id: string | null;
  storage_bucket: string;
  storage_path: string;
  attachment_kind: GardenChatAttachmentKind;
  mime_type: string;
  size_bytes: number;
  duration_ms: number | null;
  waveform_json: unknown;
  preview_text: string | null;
  created_at: string;
};

export type GardenChatUploadedMedia = {
  provider: string;
  fileId: string | null;
  fileName: string;
  folderId: string | null;
  url: string;
  storageBucket: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
};

export function classifyGardenChatAttachmentKind(file: File): GardenChatAttachmentKind {
  const mimeType = String(file.type ?? "").toLowerCase();
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  return "file";
}

export function formatGardenChatAttachmentSize(value: number | null | undefined) {
  const sizeBytes = Number(value ?? 0);
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return "";
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  const units = ["KB", "MB", "GB"];
  let size = sizeBytes / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatGardenChatDurationMs(value: number | null | undefined) {
  const durationMs = Number(value ?? 0);
  if (!Number.isFinite(durationMs) || durationMs <= 0) return "";
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function groupGardenChatAttachmentsByMessage(
  rows: GardenChatMessageAttachmentRow[],
) {
  const grouped = new Map<string, GardenChatMessageAttachmentRow[]>();
  for (const row of rows) {
    const list = grouped.get(row.message_id) ?? [];
    list.push(row);
    grouped.set(row.message_id, list);
  }
  return grouped;
}

export async function readGardenChatMediaDurationMs(file: File) {
  const mimeType = String(file.type ?? "").toLowerCase();
  if (!mimeType.startsWith("audio/") && !mimeType.startsWith("video/")) {
    return null;
  }
  if (typeof window === "undefined") return null;

  const objectUrl = URL.createObjectURL(file);
  try {
    const duration = await new Promise<number | null>((resolve) => {
      const media = document.createElement(
        mimeType.startsWith("audio/") ? "audio" : "video",
      ) as HTMLAudioElement | HTMLVideoElement;

      const cleanup = () => {
        media.pause();
        media.removeAttribute("src");
        media.load();
      };

      const timer = window.setTimeout(() => {
        cleanup();
        resolve(null);
      }, 6000);

      media.preload = "metadata";
      media.onloadedmetadata = () => {
        window.clearTimeout(timer);
        const seconds = Number.isFinite(media.duration) ? media.duration : 0;
        cleanup();
        resolve(seconds > 0 ? Math.round(seconds * 1000) : null);
      };
      media.onerror = () => {
        window.clearTimeout(timer);
        cleanup();
        resolve(null);
      };
      media.src = objectUrl;
      media.load();
    });

    return duration;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
