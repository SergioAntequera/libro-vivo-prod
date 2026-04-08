export const AUTH_ACCESS_TOKEN_COOKIE = "lv_auth_access_token";

const AUTH_COOKIE_PATH = "/";
const AUTH_COOKIE_DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const AUTH_TOKEN_EXP_SKEW_SECONDS = 30;

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  if (typeof atob === "function") {
    return atob(padded);
  }

  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf8");
  }

  throw new Error("No hay decoder disponible para JWT.");
}

function readJwtPayload(token: string) {
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    return JSON.parse(decodeBase64Url(parts[1])) as { exp?: unknown };
  } catch {
    return null;
  }
}

function serializeCookie(input: {
  name: string;
  value: string;
  maxAge?: number;
  expires?: Date;
}) {
  const pieces = [
    `${input.name}=${encodeURIComponent(input.value)}`,
    `Path=${AUTH_COOKIE_PATH}`,
    "SameSite=Lax",
  ];

  if (typeof input.maxAge === "number") {
    pieces.push(`Max-Age=${Math.max(0, Math.floor(input.maxAge))}`);
  }
  if (input.expires) {
    pieces.push(`Expires=${input.expires.toUTCString()}`);
  }
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    pieces.push("Secure");
  }

  return pieces.join("; ");
}

export function getAccessTokenExpiryEpoch(token: string) {
  const payload = readJwtPayload(token);
  const exp = payload?.exp;
  return typeof exp === "number" && Number.isFinite(exp) ? exp : null;
}

export function isFreshAccessToken(token: string | null | undefined) {
  const normalized = String(token ?? "").trim();
  if (!normalized) return false;

  const exp = getAccessTokenExpiryEpoch(normalized);
  if (!exp) return true;

  return exp > Math.floor(Date.now() / 1000) + AUTH_TOKEN_EXP_SKEW_SECONDS;
}

export function writeAuthAccessTokenCookie(token: string | null | undefined) {
  if (typeof document === "undefined") return;

  const normalized = String(token ?? "").trim();
  if (!normalized) {
    document.cookie = serializeCookie({
      name: AUTH_ACCESS_TOKEN_COOKIE,
      value: "",
      maxAge: 0,
      expires: new Date(0),
    });
    return;
  }

  const exp = getAccessTokenExpiryEpoch(normalized);
  const maxAge =
    exp && exp > Math.floor(Date.now() / 1000)
      ? exp - Math.floor(Date.now() / 1000)
      : AUTH_COOKIE_DEFAULT_MAX_AGE_SECONDS;

  document.cookie = serializeCookie({
    name: AUTH_ACCESS_TOKEN_COOKIE,
    value: normalized,
    maxAge,
  });
}

export function readAuthAccessTokenFromCookieHeader(cookieHeader: string | null | undefined) {
  const raw = String(cookieHeader ?? "");
  if (!raw) return null;

  const pairs = raw.split(";");
  for (const pair of pairs) {
    const [name, ...rest] = pair.split("=");
    if (String(name ?? "").trim() !== AUTH_ACCESS_TOKEN_COOKIE) continue;
    const value = rest.join("=").trim();
    return value ? decodeURIComponent(value) : null;
  }

  return null;
}
