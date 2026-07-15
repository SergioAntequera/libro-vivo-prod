export const ACCOUNT_DELETION_CONFIRMATION = "ELIMINAR MI CUENTA";
export const ACCOUNT_DELETION_ACKNOWLEDGEMENT_VERSION = "2026-07-15";
export const DEFAULT_ACCOUNT_DELETION_GRACE_DAYS = 7;
export const MAX_ACCOUNT_DELETION_GRACE_DAYS = 30;
export const ACCOUNT_DELETION_REAUTH_MAX_AGE_SECONDS = 10 * 60;

export type AccountDeletionStatus =
  | "pending"
  | "cancelled"
  | "processing"
  | "completed"
  | "failed";

export type AccountDeletionRequestPayload = {
  confirmation: string;
  acknowledgementVersion: string;
};

export type AccountDeletionEnvironment = {
  enabled: boolean;
  projectRef: string;
  graceDays: number;
};

function normalizeProjectRef(value: string) {
  return value.trim().toLowerCase();
}

export function resolveSupabaseProjectRef(urlValue: string) {
  try {
    const host = new URL(urlValue).hostname.toLowerCase();
    const suffix = ".supabase.co";
    if (!host.endsWith(suffix)) return "";
    return normalizeProjectRef(host.slice(0, -suffix.length));
  } catch {
    return "";
  }
}

export function resolveAccountDeletionEnvironment(
  env: Record<string, string | undefined> = process.env,
): AccountDeletionEnvironment {
  const enabled = env.ACCOUNT_DELETION_ENABLED === "true";
  const actualProjectRef = resolveSupabaseProjectRef(env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  const allowedProjectRef = normalizeProjectRef(
    env.ACCOUNT_DELETION_ALLOWED_PROJECT_REF ?? "",
  );
  const graceDaysRaw = Number.parseInt(env.ACCOUNT_DELETION_GRACE_DAYS ?? "", 10);
  const graceDays = Number.isFinite(graceDaysRaw)
    ? Math.min(MAX_ACCOUNT_DELETION_GRACE_DAYS, Math.max(1, graceDaysRaw))
    : DEFAULT_ACCOUNT_DELETION_GRACE_DAYS;

  if (!enabled) {
    throw new Error("ACCOUNT_DELETION_DISABLED");
  }
  if (!actualProjectRef || !allowedProjectRef || actualProjectRef !== allowedProjectRef) {
    throw new Error("ACCOUNT_DELETION_PROJECT_GUARD");
  }

  return { enabled, projectRef: actualProjectRef, graceDays };
}

export function parseAccountDeletionPayload(value: unknown): AccountDeletionRequestPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("ACCOUNT_DELETION_INVALID_BODY");
  }
  const payload = value as Record<string, unknown>;
  const confirmation = String(payload.confirmation ?? "").trim();
  const acknowledgementVersion = String(payload.acknowledgementVersion ?? "").trim();

  if (confirmation !== ACCOUNT_DELETION_CONFIRMATION) {
    throw new Error("ACCOUNT_DELETION_CONFIRMATION_MISMATCH");
  }
  if (acknowledgementVersion !== ACCOUNT_DELETION_ACKNOWLEDGEMENT_VERSION) {
    throw new Error("ACCOUNT_DELETION_ACKNOWLEDGEMENT_MISMATCH");
  }
  return { confirmation, acknowledgementVersion };
}

function decodeJwtPayload(accessToken: string) {
  const payload = accessToken.split(".")[1];
  if (!payload) throw new Error("ACCOUNT_DELETION_REAUTH_REQUIRED");
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  try {
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    throw new Error("ACCOUNT_DELETION_REAUTH_REQUIRED");
  }
}

export function assertRecentAccountAccessToken(input: {
  accessToken: string;
  userId: string;
  nowSeconds?: number;
  maxAgeSeconds?: number;
}) {
  const payload = decodeJwtPayload(input.accessToken);
  const subject = String(payload.sub ?? "");
  const issuedAt = Number(payload.iat);
  const nowSeconds = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const maxAgeSeconds =
    input.maxAgeSeconds ?? ACCOUNT_DELETION_REAUTH_MAX_AGE_SECONDS;

  if (
    subject !== input.userId ||
    !Number.isFinite(issuedAt) ||
    issuedAt > nowSeconds + 30 ||
    nowSeconds - issuedAt > maxAgeSeconds
  ) {
    throw new Error("ACCOUNT_DELETION_REAUTH_REQUIRED");
  }
}

export function readBearerAccessToken(req: Request) {
  const raw = req.headers.get("authorization")?.trim() ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(raw);
  return match?.[1]?.trim() || null;
}

export function toAccountDeletionPublicMessage(error: unknown) {
  const code = error instanceof Error ? error.message : String(error ?? "");
  if (code === "ACCOUNT_DELETION_DISABLED") {
    return { status: 503, error: "La eliminacion de cuenta aun no esta habilitada en este entorno." };
  }
  if (code === "ACCOUNT_DELETION_PROJECT_GUARD") {
    return { status: 503, error: "La eliminacion de cuenta no esta autorizada para este proyecto." };
  }
  if (code === "ACCOUNT_DELETION_REAUTH_REQUIRED") {
    return { status: 401, error: "Vuelve a confirmar tu identidad antes de eliminar la cuenta." };
  }
  if (code === "ACCOUNT_DELETION_CONFIRMATION_MISMATCH") {
    return { status: 400, error: `Escribe exactamente ${ACCOUNT_DELETION_CONFIRMATION}.` };
  }
  if (
    code === "ACCOUNT_DELETION_INVALID_BODY" ||
    code === "ACCOUNT_DELETION_ACKNOWLEDGEMENT_MISMATCH"
  ) {
    return { status: 400, error: "La confirmacion de eliminacion no es valida." };
  }
  return { status: 500, error: "No se pudo gestionar la eliminacion de la cuenta." };
}
