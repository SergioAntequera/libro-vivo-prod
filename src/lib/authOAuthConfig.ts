export type OAuthProvider = "google" | "apple";
export type AuthRedirectMode = "recover" | "reset";

type OAuthProviderConfig = {
  provider: OAuthProvider;
  label: string;
};

function isPublicFeatureEnabled(value: string | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on"
  );
}

const providers: OAuthProviderConfig[] = [];

if (isPublicFeatureEnabled(process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED)) {
  providers.push({ provider: "google", label: "Continuar con Google" });
}

if (isPublicFeatureEnabled(process.env.NEXT_PUBLIC_AUTH_APPLE_ENABLED)) {
  providers.push({ provider: "apple", label: "Continuar con Apple" });
}

export const configuredOAuthProviders = providers;

export function isOAuthProviderEnabled(provider: OAuthProvider) {
  return configuredOAuthProviders.some((config) => config.provider === provider);
}

function normalizeNextHref(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized.startsWith("/") || normalized.startsWith("//")) return null;
  if (normalized === "/login" || normalized.startsWith("/login?")) return null;
  return normalized;
}

export function getAuthRedirectUrl(mode?: AuthRedirectMode, nextHref?: string | null) {
  const siteUrl =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : String(process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "");

  if (!siteUrl) return undefined;
  const params = new URLSearchParams();
  if (mode) params.set("mode", mode);
  const safeNextHref = normalizeNextHref(nextHref);
  if (safeNextHref) params.set("next", safeNextHref);
  const query = params.toString();
  return query ? `${siteUrl}/login?${query}` : `${siteUrl}/login`;
}
