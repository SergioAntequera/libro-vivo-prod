import { supabase } from "@/lib/supabase";
import * as tus from "tus-js-client";

export type UploadProgress = {
  loaded: number;
  total: number;
  percent: number;
  elapsedMs: number;
  speedBytesPerSec: number;
  remainingMs: number | null;
};

export const UPLOAD_ABORTED_CODE = "UPLOAD_ABORTED";

type UploadWithProgressInput = {
  bucket: string;
  path: string;
  file: File;
  contentType: string;
  upsert?: boolean;
  onProgress?: (progress: UploadProgress) => void;
  onAbortReady?: (abortFn: (() => void) | null) => void;
};

function encodeStoragePath(path: string) {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

const RESUMABLE_THRESHOLD_BYTES = 45 * 1024 * 1024;

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

async function uploadWithXhr(input: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  accessToken: string;
  bucket: string;
  path: string;
  file: File;
  contentType: string;
  upsert: boolean;
  onProgress?: (progress: UploadProgress) => void;
  onAbortReady?: (abortFn: (() => void) | null) => void;
}) {
  const {
    supabaseUrl,
    supabaseAnonKey,
    accessToken,
    bucket,
    path,
    file,
    contentType,
    upsert,
    onProgress,
    onAbortReady,
  } = input;
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${encodeStoragePath(path)}`;
  const startedAt = Date.now();

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const resolveOnce = () => {
      if (settled) return;
      settled = true;
      onAbortReady?.(null);
      resolve();
    };
    const rejectOnce = (error: Error) => {
      if (settled) return;
      settled = true;
      onAbortReady?.(null);
      reject(error);
    };

    const xhr = new XMLHttpRequest();
    onAbortReady?.(() => {
      if (settled) return;
      try {
        xhr.abort();
      } catch {
        rejectOnce(new Error(UPLOAD_ABORTED_CODE));
      }
    });
    xhr.open("POST", uploadUrl, true);
    xhr.setRequestHeader("apikey", supabaseAnonKey);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("x-upsert", upsert ? "true" : "false");
    xhr.setRequestHeader("content-type", contentType);

    xhr.upload.onprogress = (event) => {
      if (!onProgress) return;
      const total = event.total || file.size || 0;
      const loaded = event.loaded || 0;
      onProgress(buildProgressSnapshot(loaded, total, startedAt));
    };

    xhr.onerror = () => {
      rejectOnce(new Error("Error de red durante la subida."));
    };
    xhr.onabort = () => {
      rejectOnce(new Error(UPLOAD_ABORTED_CODE));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress(buildProgressSnapshot(file.size, file.size, startedAt));
        resolveOnce();
        return;
      }

      let message = `Upload failed (${xhr.status})`;
      try {
        const parsed = JSON.parse(xhr.responseText || "{}") as {
          message?: string;
          error?: string;
          statusCode?: string | number;
        };
        message =
          String(parsed.message || parsed.error || message) +
          (parsed.statusCode ? ` [${parsed.statusCode}]` : "");
      } catch {
        if (xhr.responseText) message = xhr.responseText;
      }
      rejectOnce(new Error(message));
    };

    xhr.send(file);
  });
}

async function uploadWithTus(input: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  accessToken: string;
  bucket: string;
  path: string;
  file: File;
  contentType: string;
  upsert: boolean;
  onProgress?: (progress: UploadProgress) => void;
  onAbortReady?: (abortFn: (() => void) | null) => void;
}) {
  const {
    supabaseUrl,
    supabaseAnonKey,
    accessToken,
    bucket,
    path,
    file,
    contentType,
    upsert,
    onProgress,
    onAbortReady,
  } = input;
  const endpoint = `${supabaseUrl}/storage/v1/upload/resumable`;
  const startedAt = Date.now();

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const resolveOnce = () => {
      if (settled) return;
      settled = true;
      onAbortReady?.(null);
      resolve();
    };
    const rejectOnce = (error: Error) => {
      if (settled) return;
      settled = true;
      onAbortReady?.(null);
      reject(error);
    };

    const upload = new tus.Upload(file, {
      endpoint,
      chunkSize: 6 * 1024 * 1024,
      retryDelays: [0, 1000, 3000, 5000, 10000],
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        "x-upsert": upsert ? "true" : "false",
      },
      metadata: {
        bucketName: bucket,
        objectName: path,
        contentType,
        cacheControl: "3600",
      },
      onError: (error) => {
        rejectOnce(new Error(error?.message || "Error en subida resumible."));
      },
      onProgress: (uploaded, total) => {
        if (!onProgress) return;
        onProgress(buildProgressSnapshot(uploaded, total, startedAt));
      },
      onSuccess: () => {
        if (onProgress) onProgress(buildProgressSnapshot(file.size, file.size, startedAt));
        resolveOnce();
      },
    });
    onAbortReady?.(() => {
      if (settled) return;
      upload
        .abort(true)
        .then(() => rejectOnce(new Error(UPLOAD_ABORTED_CODE)))
        .catch(() => rejectOnce(new Error(UPLOAD_ABORTED_CODE)));
    });

    upload
      .findPreviousUploads()
      .then((previousUploads) => {
        if (previousUploads.length > 0) {
          upload.resumeFromPreviousUpload(previousUploads[0]);
        }
        upload.start();
      })
      .catch(() => upload.start());
  });
}

export async function uploadStorageObjectWithProgress(
  input: UploadWithProgressInput,
) {
  const {
    bucket,
    path,
    file,
    contentType,
    upsert = false,
    onProgress,
    onAbortReady,
  } = input;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Faltan variables NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session?.access_token) {
    throw new Error("Sesión no valida. Inicia sesión de nuevo para subir archivos.");
  }
  if (file.size > RESUMABLE_THRESHOLD_BYTES) {
    await uploadWithTus({
      supabaseUrl,
      supabaseAnonKey,
      accessToken: session.access_token,
      bucket,
      path,
      file,
      contentType,
      upsert,
      onProgress,
      onAbortReady,
    });
    return;
  }

  await uploadWithXhr({
    supabaseUrl,
    supabaseAnonKey,
    accessToken: session.access_token,
    bucket,
    path,
    file,
    contentType,
    upsert,
    onProgress,
    onAbortReady,
  });
}
