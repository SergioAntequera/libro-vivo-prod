type ServerLogLevel = "info" | "warning" | "error";

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]{20,}(?:\.[A-Za-z0-9_-]{10,}){1,2}\b/g;
const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const SECRET_KEY_PATTERN = /(authorization|cookie|password|secret|token|email|phone|credential|api.?key)/i;

function sanitizeText(value: string) {
  return value
    .slice(0, 800)
    .replace(EMAIL_PATTERN, "[redacted-email]")
    .replace(JWT_PATTERN, "[redacted-token]")
    .replace(UUID_PATTERN, "[redacted-id]");
}

export function sanitizeServerTelemetryValue(value: unknown, depth = 0): unknown {
  if (depth >= 5) return "[max-depth]";
  if (value === null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") return sanitizeText(value);
  if (value instanceof Error) {
    return { name: sanitizeText(value.name), message: sanitizeText(value.message) };
  }
  if (Array.isArray(value)) {
    return value.slice(0, 30).map((item) => sanitizeServerTelemetryValue(item, depth + 1));
  }
  if (!value || typeof value !== "object") return sanitizeText(String(value ?? ""));

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 40)
      .map(([key, item]) => [
        key,
        SECRET_KEY_PATTERN.test(key)
          ? "[redacted]"
          : sanitizeServerTelemetryValue(item, depth + 1),
      ]),
  );
}

function normalizeRequestId(value: string | null) {
  const candidate = value?.trim() ?? "";
  return /^[a-zA-Z0-9._-]{8,80}$/.test(candidate) ? candidate : crypto.randomUUID();
}

function sanitizeRequestPath(req: Request) {
  try {
    const url = new URL(req.url);
    return url.pathname.replace(UUID_PATTERN, ":id").slice(0, 240);
  } catch {
    return "/unknown";
  }
}

export type ServerRequestContext = {
  requestId: string;
  area: string;
  operation: string;
  method: string;
  path: string;
  startedAt: number;
};

export function createServerRequestContext(req: Request, area: string, operation: string) {
  return {
    requestId: normalizeRequestId(req.headers.get("x-request-id")),
    area: sanitizeText(area),
    operation: sanitizeText(operation),
    method: req.method.toUpperCase(),
    path: sanitizeRequestPath(req),
    startedAt: Date.now(),
  } satisfies ServerRequestContext;
}

export function reportServerEvent(input: {
  event: string;
  level?: ServerLogLevel;
  context?: ServerRequestContext;
  data?: Record<string, unknown>;
}) {
  const level = input.level ?? "info";
  const payload = sanitizeServerTelemetryValue({
    timestamp: new Date().toISOString(),
    service: "libro-vivo-web",
    event: input.event,
    level,
    requestId: input.context?.requestId,
    area: input.context?.area,
    operation: input.context?.operation,
    method: input.context?.method,
    path: input.context?.path,
    durationMs: input.context ? Math.max(0, Date.now() - input.context.startedAt) : undefined,
    ...input.data,
  });
  const serialized = JSON.stringify(payload);
  if (level === "error") console.error(serialized);
  else if (level === "warning") console.warn(serialized);
  else console.info(serialized);
}

export function withRequestId<T extends Response>(response: T, context: ServerRequestContext): T {
  response.headers.set("X-Request-ID", context.requestId);
  return response;
}
