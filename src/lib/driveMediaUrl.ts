function normalizePathname(pathname: string) {
  return pathname.replace(/\/+$/, "");
}

export function extractDriveFileIdFromMediaUrl(input: string | null | undefined) {
  const raw = String(input ?? "").trim();
  if (!raw) return null;

  try {
    const url = raw.startsWith("http://") || raw.startsWith("https://")
      ? new URL(raw)
      : new URL(raw, "http://localhost");
    const pathname = normalizePathname(url.pathname);
    const prefix = "/api/media/drive/";
    if (!pathname.startsWith(prefix)) return null;
    const fileId = decodeURIComponent(pathname.slice(prefix.length)).trim();
    return fileId || null;
  } catch {
    return null;
  }
}

export function isDriveProxyMediaUrl(input: string | null | undefined) {
  return extractDriveFileIdFromMediaUrl(input) !== null;
}
