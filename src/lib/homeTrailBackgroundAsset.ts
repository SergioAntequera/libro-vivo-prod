import { isDriveProxyMediaUrl } from "@/lib/driveMediaUrl";
import { isGoogleDriveMediaProviderEnabled } from "@/lib/mediaProvider";

export const HOME_TRAIL_MANAGED_ASSET_PREFIX = "home-trail-background-";
export const HOME_TRAIL_MANAGED_ASSET_PUBLIC_PREFIX = "/assets/";

function normalizePathname(pathname: string) {
  return pathname.replace(/\/+$/, "");
}

export function buildManagedHomeTrailAssetUrl(filename: string) {
  return `${HOME_TRAIL_MANAGED_ASSET_PUBLIC_PREFIX}${filename}`;
}

export function extractManagedHomeTrailAssetFilename(input: string | null | undefined) {
  const raw = String(input ?? "").trim();
  if (!raw) return null;

  try {
    const url =
      raw.startsWith("http://") || raw.startsWith("https://")
        ? new URL(raw)
        : new URL(raw, "http://localhost");
    const pathname = normalizePathname(url.pathname);
    if (!pathname.startsWith(HOME_TRAIL_MANAGED_ASSET_PUBLIC_PREFIX)) return null;

    const filename = pathname.slice(HOME_TRAIL_MANAGED_ASSET_PUBLIC_PREFIX.length).trim();
    if (!filename.startsWith(HOME_TRAIL_MANAGED_ASSET_PREFIX)) return null;
    if (filename.includes("/") || filename.includes("\\")) return null;
    return filename || null;
  } catch {
    return null;
  }
}

export function isManagedHomeTrailProjectAssetUrl(input: string | null | undefined) {
  return extractManagedHomeTrailAssetFilename(input) !== null;
}

export function isManagedHomeTrailBackgroundUrl(input: string | null | undefined) {
  return (
    isManagedHomeTrailProjectAssetUrl(input) ||
    isDriveProxyMediaUrl(input)
  );
}

export function normalizeAccessibleHomeTrailBackgroundAssetUrl(
  input: string | null | undefined,
) {
  const value = String(input ?? "").trim();
  if (!value) return "";

  if (isDriveProxyMediaUrl(value) && !isGoogleDriveMediaProviderEnabled()) {
    return "";
  }

  return value;
}
