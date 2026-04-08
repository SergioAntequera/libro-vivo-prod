import { supabase } from "@/lib/supabase";

const STICKER_BUCKET = "stickers-assets";

function normalizeKey(raw: string) {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function uploadStickerSvgAsset(options: {
  keyBase: string;
  svgText: string;
  bucket?: string;
}) {
  const keyBase = normalizeKey(options.keyBase || "sticker");
  const bucket = options.bucket || STICKER_BUCKET;
  const fileName = `${Date.now()}-${keyBase || "sticker"}.svg`;
  const path = `stickers/${fileName}`;

  const blob = new Blob([options.svgText], { type: "image/svg+xml" });

  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    upsert: true,
    contentType: "image/svg+xml",
    cacheControl: "3600",
  });

  if (error) {
    throw new Error(
      `${error.message} (ejecuta supabase/sql/2026-03-05_storage_stickers_assets.sql y verifica bucket '${bucket}')`,
    );
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
