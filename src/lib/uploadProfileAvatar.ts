import { supabase } from "@/lib/supabase";
import { uploadStorageObjectWithProgress } from "@/lib/storageUploadWithProgress";
import { toErrorMessage } from "@/lib/errorMessage";

export async function uploadProfileAvatar(profileId: string, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `profiles/${profileId}/avatar_${crypto.randomUUID()}.${ext}`;

  try {
    await uploadStorageObjectWithProgress({
      bucket: "page-photos",
      path,
      file,
      upsert: false,
      contentType: file.type || "image/jpeg",
    });
  } catch (error) {
    throw new Error(toErrorMessage(error, "No se pudo subir la foto de perfil."));
  }

  const { data } = supabase.storage.from("page-photos").getPublicUrl(path);
  return data.publicUrl;
}
