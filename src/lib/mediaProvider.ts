export type MediaStorageProvider = "supabase" | "gdrive";

function normalizeMediaStorageProvider(value: string | null | undefined): MediaStorageProvider {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "gdrive" || raw === "google-drive" || raw === "google_drive") {
    return "gdrive";
  }
  return "supabase";
}

export function getClientMediaStorageProvider(): MediaStorageProvider {
  return normalizeMediaStorageProvider(
    process.env.NEXT_PUBLIC_MEDIA_STORAGE_PROVIDER ??
      process.env.NEXT_PUBLIC_MEDIA_PROVIDER,
  );
}

export function getServerMediaStorageProvider(): MediaStorageProvider {
  return normalizeMediaStorageProvider(
    process.env.MEDIA_STORAGE_PROVIDER ??
      process.env.MEDIA_PROVIDER ??
      process.env.NEXT_PUBLIC_MEDIA_STORAGE_PROVIDER ??
      process.env.NEXT_PUBLIC_MEDIA_PROVIDER,
  );
}

export function isGoogleDriveMediaProviderEnabled() {
  return getClientMediaStorageProvider() === "gdrive";
}

