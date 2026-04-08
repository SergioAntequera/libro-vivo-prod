import { supabase } from "@/lib/supabase";

export const PLAN_TYPE_ASSET_BUCKET = "plan-type-assets";

function normalizeKey(raw: string) {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function uploadPlanTypeAsset(options: {
  keyBase: string;
  file: File;
  bucket?: string;
}) {
  const keyBase = normalizeKey(options.keyBase || "plan-flower");
  const bucket = options.bucket || PLAN_TYPE_ASSET_BUCKET;
  const extension = options.file.name.includes(".")
    ? options.file.name.split(".").pop()?.toLowerCase() || "png"
    : "png";
  const fileName = `${Date.now()}-${keyBase || "plan-flower"}.${extension}`;
  const path = `flowers/${fileName}`;

  const { error } = await supabase.storage.from(bucket).upload(path, options.file, {
    upsert: true,
    contentType: options.file.type || undefined,
    cacheControl: "3600",
  });

  if (error) {
    throw new Error(
      `${error.message} (ejecuta supabase/sql/2026-03-23_storage_plan_type_assets.sql y verifica bucket '${bucket}')`,
    );
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return {
    publicUrl: data.publicUrl,
    storagePath: path,
    bucket,
  };
}
