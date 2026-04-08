export const GUEST_ONLY_AUTH_PATHS = ["/login"] as const;
export const AUTH_PUBLIC_PATHS = ["/", "/login", "/offline"] as const;
export const PROTECTED_APP_PREFIXES = [
  "/home",
  "/plans",
  "/chat",
  "/activity",
  "/page",
  "/timeline",
  "/forest",
  "/year",
  "/achievements",
  "/bonds",
  "/capsules",
  "/welcome",
  "/calendar",
  "/seeds",
  "/admin",
] as const;

const STATIC_PUBLIC_FILES = new Set([
  "/manifest.json",
  "/sw.js",
  "/favicon.ico",
]);

export function normalizeAuthNextHref(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized.startsWith("/") || normalized.startsWith("//")) return null;
  if (normalized === "/login") return null;
  if (normalized.startsWith("/login?")) return null;
  return normalized;
}

export function buildLoginHref(nextHref?: string | null) {
  const safeNextHref = normalizeAuthNextHref(nextHref);
  if (!safeNextHref) return "/login";

  const params = new URLSearchParams();
  params.set("next", safeNextHref);
  return `/login?${params.toString()}`;
}

export function isGuestOnlyAuthPath(pathname: string) {
  return GUEST_ONLY_AUTH_PATHS.includes(pathname as (typeof GUEST_ONLY_AUTH_PATHS)[number]);
}

export function isProtectedAppPath(pathname: string) {
  return PROTECTED_APP_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function shouldBypassAuthMiddleware(pathname: string) {
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/fonts")
  ) {
    return true;
  }

  if (STATIC_PUBLIC_FILES.has(pathname)) return true;

  const lastSegment = pathname.split("/").pop() ?? "";
  return /\.[a-z0-9]+$/i.test(lastSegment);
}
