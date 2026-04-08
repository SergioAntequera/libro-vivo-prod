import { supabase } from "@/lib/supabase";
import { uploadPageMediaViaApi } from "@/lib/apiMediaUploadWithProgress";
import { isGoogleDriveMediaProviderEnabled } from "@/lib/mediaProvider";
import {
  uploadStorageObjectWithProgress,
  type UploadProgress,
} from "@/lib/storageUploadWithProgress";
import type { UploadPhase } from "@/lib/uploadStatus";
import { toErrorMessage } from "@/lib/errorMessage";

export async function uploadPageAudio(
  pageId: string,
  file: File,
  opts?: {
    onProgress?: (progress: UploadProgress) => void;
    onAbortReady?: (abortFn: (() => void) | null) => void;
    onPhaseChange?: (phase: UploadPhase) => void;
  },
) {
  if (isGoogleDriveMediaProviderEnabled()) {
    return uploadPageMediaViaApi("audio", pageId, file, opts);
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "mp3";
  const name = `audio_${crypto.randomUUID()}.${ext}`;
  const path = `pages/${pageId}/${name}`;

  try {
    await uploadStorageObjectWithProgress({
      bucket: "page-audio",
      path,
      file,
      upsert: false,
      contentType: file.type || "audio/mpeg",
      onProgress: opts?.onProgress,
      onAbortReady: opts?.onAbortReady,
    });
  } catch (error) {
    throw new Error(
      `${toErrorMessage(error, "No se pudo subir audio")} (ejecuta supabase/sql/2026-03-06_page_audio_support.sql y verifica bucket 'page-audio')`,
    );
  }

  const { data } = supabase.storage.from("page-audio").getPublicUrl(path);
  return data.publicUrl;
}
