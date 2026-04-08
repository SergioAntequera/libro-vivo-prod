import { supabase } from "@/lib/supabase";
import { isGoogleDriveMediaProviderEnabled } from "@/lib/mediaProvider";
import {
  uploadStorageObjectWithProgress,
  type UploadProgress,
} from "@/lib/storageUploadWithProgress";
import type { UploadPhase } from "@/lib/uploadStatus";
import { toErrorMessage } from "@/lib/errorMessage";

export type CapsuleMediaKind = "photo" | "audio" | "video";

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

function tryExtractUrl(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const value = String(root.url ?? "").trim();
  return value || null;
}

async function uploadCapsuleMediaViaApi(
  kind: CapsuleMediaKind,
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
    throw new Error("Sesion no valida. Inicia sesion de nuevo para subir archivos.");
  }

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
    opts?.onPhaseChange?.("uploading");
    opts?.onAbortReady?.(() => {
      if (settled) return;
      try {
        xhr.abort();
      } catch {
        rejectOnce(new Error("UPLOAD_ABORTED"));
      }
    });

    xhr.open("POST", "/api/capsules/media/upload", true);
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
      rejectOnce(new Error("Error de red subiendo archivo a la capsula."));
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
            toErrorMessage(error, "La respuesta del upload de capsula no es JSON valido."),
          ),
        );
        return;
      }

      const url = tryExtractUrl(payload);
      if (!url) {
        rejectOnce(new Error("El backend de capsulas no devolvio una URL valida."));
        return;
      }

      if (opts?.onProgress) {
        opts.onProgress(buildProgressSnapshot(file.size, file.size, startedAt));
      }
      resolveOnce(url);
    };

    const formData = new FormData();
    formData.append("kind", kind);
    formData.append("file", file, file.name);
    xhr.send(formData);
  });
}

async function uploadCapsuleMedia(
  kind: CapsuleMediaKind,
  file: File,
  opts?: {
    onProgress?: (progress: UploadProgress) => void;
    onAbortReady?: (abortFn: (() => void) | null) => void;
    onPhaseChange?: (phase: UploadPhase) => void;
  },
) {
  if (isGoogleDriveMediaProviderEnabled()) {
    return uploadCapsuleMediaViaApi(kind, file, opts);
  }

  const bucket =
    kind === "photo" ? "page-photos" : kind === "audio" ? "page-audio" : "page-videos";
  const ext =
    file.name.split(".").pop()?.toLowerCase() ||
    (kind === "photo" ? "jpg" : kind === "audio" ? "mp3" : "mp4");
  const fileName =
    kind === "photo"
      ? `${crypto.randomUUID()}.${ext}`
      : `${kind}_${crypto.randomUUID()}.${ext}`;
  const path = `capsules/${new Date().getUTCFullYear()}/${fileName}`;

  try {
    await uploadStorageObjectWithProgress({
      bucket,
      path,
      file,
      upsert: false,
      contentType:
        file.type ||
        (kind === "photo" ? "image/jpeg" : kind === "audio" ? "audio/mpeg" : "video/mp4"),
      onProgress: opts?.onProgress,
      onAbortReady: opts?.onAbortReady,
    });
  } catch (error) {
    throw new Error(
      toErrorMessage(error, `No se pudo subir el ${kind === "photo" ? "archivo visual" : kind}.`),
    );
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export function uploadCapsulePhoto(
  file: File,
  opts?: {
    onProgress?: (progress: UploadProgress) => void;
    onAbortReady?: (abortFn: (() => void) | null) => void;
    onPhaseChange?: (phase: UploadPhase) => void;
  },
) {
  return uploadCapsuleMedia("photo", file, opts);
}

export function uploadCapsuleAudio(
  file: File,
  opts?: {
    onProgress?: (progress: UploadProgress) => void;
    onAbortReady?: (abortFn: (() => void) | null) => void;
    onPhaseChange?: (phase: UploadPhase) => void;
  },
) {
  return uploadCapsuleMedia("audio", file, opts);
}

export function uploadCapsuleVideo(
  file: File,
  opts?: {
    onProgress?: (progress: UploadProgress) => void;
    onAbortReady?: (abortFn: (() => void) | null) => void;
    onPhaseChange?: (phase: UploadPhase) => void;
  },
) {
  return uploadCapsuleMedia("video", file, opts);
}
