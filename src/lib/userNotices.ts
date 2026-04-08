export type UserNoticeKind = "shared_garden_archived";

export type UserNotice = {
  id: string;
  userId: string;
  kind: UserNoticeKind;
  gardenId: string | null;
  title: string;
  message: string;
  createdAt: string | null;
  readAt: string | null;
  metadata: Record<string, unknown>;
};

type UserNoticeRow = {
  id?: unknown;
  user_id?: unknown;
  kind?: unknown;
  garden_id?: unknown;
  title?: unknown;
  message?: unknown;
  created_at?: unknown;
  read_at?: unknown;
  metadata?: unknown;
};

function normalizeId(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeKind(value: unknown): UserNoticeKind | null {
  const next = normalizeText(value);
  if (next === "shared_garden_archived") return next;
  return null;
}

export function normalizeUserNoticeRow(row: UserNoticeRow | null) {
  if (!row) return null;
  const id = normalizeId(row.id);
  const userId = normalizeId(row.user_id);
  const kind = normalizeKind(row.kind);
  const title = normalizeText(row.title);
  const message = normalizeText(row.message);
  if (!id || !userId || !kind || !title || !message) return null;

  const metadata =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};

  return {
    id,
    userId,
    kind,
    gardenId: normalizeId(row.garden_id),
    title,
    message,
    createdAt: normalizeText(row.created_at),
    readAt: normalizeText(row.read_at),
    metadata,
  } satisfies UserNotice;
}
