import { supabase } from "@/lib/supabase";
import { uploadPageMediaViaApi } from "@/lib/apiMediaUploadWithProgress";
import { isGoogleDriveMediaProviderEnabled } from "@/lib/mediaProvider";
import {
  uploadStorageObjectWithProgress,
  type UploadProgress,
} from "@/lib/storageUploadWithProgress";
import type { UploadPhase } from "@/lib/uploadStatus";

export async function uploadPagePhoto(
  pageId: string,
  file: File,
  opts?: {
    onProgress?: (progress: UploadProgress) => void;
    onAbortReady?: (abortFn: (() => void) | null) => void;
    onPhaseChange?: (phase: UploadPhase) => void;
  },
) {
  if (isGoogleDriveMediaProviderEnabled()) {
    return uploadPageMediaViaApi("photo", pageId, file, opts);
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const name = `${crypto.randomUUID()}.${ext}`;
  const path = `pages/${pageId}/${name}`;

  await uploadStorageObjectWithProgress({
    bucket: "page-photos",
    path,
    file,
    upsert: false,
    contentType: file.type || "image/jpeg",
    onProgress: opts?.onProgress,
    onAbortReady: opts?.onAbortReady,
  });

  const { data } = supabase.storage.from("page-photos").getPublicUrl(path);
  return data.publicUrl;
}
