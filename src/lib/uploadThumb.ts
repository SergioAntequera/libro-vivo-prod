import { supabase } from "@/lib/supabase";

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return await res.blob();
}

export async function uploadPageThumbnail(pageId: string, dataUrl: string) {
  const blob = await dataUrlToBlob(dataUrl);

  if (!blob || blob.size === 0) {
    throw new Error("Thumbnail vacío (blob.size === 0)");
  }

  const path = `pages/${pageId}.png`;

  const { error: upErr } = await supabase.storage
    .from("page-thumbs")
    .upload(path, blob, {
      contentType: "image/png",
      upsert: true,
      cacheControl: "3600",
    });

  if (upErr) {
    // 👇 esto te mostrará el error REAL en consola
    console.error("Storage upload error:", upErr);
    throw upErr;
  }

  const { data } = supabase.storage.from("page-thumbs").getPublicUrl(path);
  return data.publicUrl;
}
