import { supabase } from "@/lib/supabase";
import { uploadPageMediaViaApi } from "@/lib/apiMediaUploadWithProgress";
import { isGoogleDriveMediaProviderEnabled } from "@/lib/mediaProvider";
import {
  uploadStorageObjectWithProgress,
  type UploadProgress,
} from "@/lib/storageUploadWithProgress";
import type { UploadPhase } from "@/lib/uploadStatus";
import { toErrorMessage } from "@/lib/errorMessage";

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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function extractHttpUrl(value: unknown) {
  const text = String(value ?? "").trim();
  if (/^https?:\/\//i.test(text)) return text;
  return null;
}

function tryExtractExternalUrl(payload: unknown): string | null {
  const root = asRecord(payload);
  if (!root) return null;
  const data = asRecord(root.data);
  const result = asRecord(root.result);

  const candidates = [
    root.url,
    root.publicUrl,
    root.secure_url,
    data?.url,
    data?.publicUrl,
    result?.url,
    result?.publicUrl,
  ];

  for (const value of candidates) {
    const match = extractHttpUrl(value);
    if (match) return match;
  }
  return null;
}

async function uploadPageVideoExternal(
  pageId: string,
  file: File,
  opts?: {
    onProgress?: (progress: UploadProgress) => void;
    onAbortReady?: (abortFn: (() => void) | null) => void;
    onPhaseChange?: (phase: UploadPhase) => void;
  },
) {
  const endpoint = String(
    process.env.NEXT_PUBLIC_EXTERNAL_VIDEO_UPLOAD_URL ?? "",
  ).trim();
  if (!endpoint) {
    opts?.onAbortReady?.(null);
    return null;
  }

  const fieldName = String(
    process.env.NEXT_PUBLIC_EXTERNAL_VIDEO_UPLOAD_FIELD ?? "file",
  ).trim();
  const startedAt = Date.now();

  return await new Promise<string>((resolve, reject) => {
    let settled = false;
    const resolveOnce = (url: string) => {
      if (settled) return;
      settled = true;
      opts?.onAbortReady?.(null);
      resolve(url);
    };
    const rejectOnce = (error: Error) => {
      if (settled) return;
      settled = true;
      opts?.onAbortReady?.(null);
      reject(error);
    };

    const xhr = new XMLHttpRequest();
    opts?.onAbortReady?.(() => {
      if (settled) return;
      try {
        xhr.abort();
      } catch {
        rejectOnce(new Error("UPLOAD_ABORTED"));
      }
    });
    xhr.open("POST", endpoint, true);
    xhr.responseType = "text";

    xhr.upload.onprogress = (event) => {
      if (!opts?.onProgress) return;
      const total = event.total || file.size || 0;
      const loaded = event.loaded || 0;
      opts.onProgress(buildProgressSnapshot(loaded, total, startedAt));
    };

    xhr.onerror = () => {
      rejectOnce(new Error("Error de red subiendo video a storage externo."));
    };
    xhr.onabort = () => {
      rejectOnce(new Error("UPLOAD_ABORTED"));
    };

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        let reason = `Upload externo fallo (${xhr.status})`;
        try {
          const parsed = JSON.parse(xhr.responseText || "{}") as Record<string, unknown>;
          reason = String(parsed.message ?? parsed.error ?? reason);
        } catch {
          if (xhr.responseText) reason = xhr.responseText;
        }
        rejectOnce(new Error(reason));
        return;
      }

      let payload: unknown = null;
      try {
        payload = JSON.parse(xhr.responseText || "{}");
      } catch {
        // ignore
      }
      const url = tryExtractExternalUrl(payload);
      if (!url) {
        rejectOnce(
          new Error(
            "El endpoint externo no devolvio una URL valida. Esperado: { url: \"https://...\" }",
          ),
        );
        return;
      }

      if (opts?.onProgress) {
        opts.onProgress(buildProgressSnapshot(file.size, file.size, startedAt));
      }
      resolveOnce(url);
    };

    const formData = new FormData();
    formData.append(fieldName || "file", file, file.name);
    formData.append("pageId", pageId);
    xhr.send(formData);
  });
}

export async function uploadPageVideo(
  pageId: string,
  file: File,
  opts?: {
    onProgress?: (progress: UploadProgress) => void;
    onAbortReady?: (abortFn: (() => void) | null) => void;
    onPhaseChange?: (phase: UploadPhase) => void;
  },
) {
  if (isGoogleDriveMediaProviderEnabled()) {
    return uploadPageMediaViaApi("video", pageId, file, opts);
  }

  const externalUrl = await uploadPageVideoExternal(pageId, file, opts);
  if (externalUrl) return externalUrl;

  const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
  const name = `video_${crypto.randomUUID()}.${ext}`;
  const path = `pages/${pageId}/${name}`;

  try {
    await uploadStorageObjectWithProgress({
      bucket: "page-videos",
      path,
      file,
      upsert: false,
      contentType: file.type || "video/mp4",
      onProgress: opts?.onProgress,
      onAbortReady: opts?.onAbortReady,
    });
  } catch (error) {
    const raw = toErrorMessage(error, "No se pudo subir el video.");
    const lower = raw.toLowerCase();

    if (lower.includes("bucket") && lower.includes("not found")) {
      throw new Error(
        `${raw} (ejecuta supabase/sql/2026-03-06_page_video_support.sql y verifica bucket 'page-videos')`,
      );
    }
    if (lower.includes("row-level security") || lower.includes("rls")) {
      throw new Error(
        `${raw} (revisa policies de storage para bucket 'page-videos')`,
      );
    }
    if (lower.includes("maximum allowed size") || lower.includes("too large")) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      throw new Error(
        `Maximum size exceeded al subir ${sizeMb}MB. Esto suele venir del límite del proyecto/plan (no solo del bucket). Comprime el video (H.264), recortalo o sube límite/plan en Supabase.`,
      );
    }
    throw new Error(raw || "No se pudo subir el video.");
  }

  const { data } = supabase.storage.from("page-videos").getPublicUrl(path);
  return data.publicUrl;
}
