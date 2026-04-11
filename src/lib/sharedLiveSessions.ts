import type { SharedGardenParticipantPresence } from "@/lib/sharedGardenSessions";

export type SharedLiveSessionScopeKind =
  | "garden_chat"
  | "flower_birth"
  | "time_capsule"
  | "seed_preparation";

export type SharedLiveSessionRow = {
  scope_kind: SharedLiveSessionScopeKind;
  scope_key: string;
  garden_id: string;
  user_id: string;
  display_name: string;
  ready: boolean;
  holding: boolean;
  activity_label: string | null;
  activity_progress: number | null;
  focus_key: string | null;
  focus_label: string | null;
  cursor_offset: number | null;
  pointer_x: number | null;
  pointer_y: number | null;
  created_at: string;
  updated_at: string;
};

const VALID_SCOPE_KINDS = new Set<SharedLiveSessionScopeKind>([
  "garden_chat",
  "flower_birth",
  "time_capsule",
  "seed_preparation",
]);

export function isSharedLiveSessionScopeKind(
  value: unknown,
): value is SharedLiveSessionScopeKind {
  return typeof value === "string" && VALID_SCOPE_KINDS.has(value as SharedLiveSessionScopeKind);
}

export const SHARED_LIVE_SESSION_SELECT = [
  "scope_kind",
  "scope_key",
  "garden_id",
  "user_id",
  "display_name",
  "ready",
  "holding",
  "activity_label",
  "activity_progress",
  "focus_key",
  "focus_label",
  "cursor_offset",
  "pointer_x",
  "pointer_y",
  "created_at",
  "updated_at",
].join(",");

export const DEFAULT_SHARED_LIVE_FRESH_MS = 25_000;
export const DEFAULT_SHARED_LIVE_FLOWER_PRESENCE_MS = 90_000;
export const DEFAULT_SHARED_LIVE_ACTION_FRESH_MS = 15_000;

function normalizeText(value: unknown) {
  if (typeof value !== "string") return null;
  const next = value.trim();
  return next || null;
}

function normalizeFiniteNumber(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

export function normalizeSharedLiveSessionRow(
  raw: Record<string, unknown> | null | undefined,
): SharedLiveSessionRow | null {
  if (!raw) return null;
  const scopeKind = normalizeText(raw.scope_kind);
  const scopeKey = normalizeText(raw.scope_key);
  const gardenId = normalizeText(raw.garden_id);
  const userId = normalizeText(raw.user_id);
  const updatedAt = normalizeText(raw.updated_at);
  const createdAt = normalizeText(raw.created_at) ?? updatedAt ?? new Date(0).toISOString();
  if (!scopeKind || !VALID_SCOPE_KINDS.has(scopeKind as SharedLiveSessionScopeKind)) return null;
  if (!scopeKey || !gardenId || !userId || !updatedAt) return null;

  return {
    scope_kind: scopeKind as SharedLiveSessionScopeKind,
    scope_key: scopeKey,
    garden_id: gardenId,
    user_id: userId,
    display_name: normalizeText(raw.display_name) ?? "Sin nombre",
    ready: Boolean(raw.ready),
    holding: Boolean(raw.holding),
    activity_label: normalizeText(raw.activity_label),
    activity_progress: normalizeFiniteNumber(raw.activity_progress),
    focus_key: normalizeText(raw.focus_key),
    focus_label: normalizeText(raw.focus_label),
    cursor_offset: normalizeFiniteNumber(raw.cursor_offset),
    pointer_x: normalizeFiniteNumber(raw.pointer_x),
    pointer_y: normalizeFiniteNumber(raw.pointer_y),
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

export function mapSharedLiveSessionToParticipant(
  row: SharedLiveSessionRow,
): SharedGardenParticipantPresence {
  return {
    userId: row.user_id,
    name: row.display_name,
    ready: row.ready,
    holding: row.holding,
    activityLabel: row.activity_label,
    activityProgress: row.activity_progress,
    focusKey: row.focus_key,
    focusLabel: row.focus_label,
    cursorOffset: row.cursor_offset,
    pointerX: row.pointer_x,
    pointerY: row.pointer_y,
    updatedAt: row.updated_at,
  };
}

export function mergeSharedLiveParticipants(input: SharedGardenParticipantPresence[]) {
  const latestByUserId = new Map<string, SharedGardenParticipantPresence>();

  for (const participant of input) {
    const userId = String(participant.userId ?? "").trim();
    if (!userId) continue;
    const existing = latestByUserId.get(userId);
    if (!existing || participant.updatedAt >= existing.updatedAt) {
      latestByUserId.set(userId, participant);
    }
  }

  return [...latestByUserId.values()].sort(
    (left, right) =>
      left.name.localeCompare(right.name, "es") || left.userId.localeCompare(right.userId),
  );
}

export function isSharedLiveParticipantFresh(
  updatedAt: string,
  freshMs = DEFAULT_SHARED_LIVE_FRESH_MS,
) {
  return isSharedLiveParticipantFreshAt(updatedAt, Date.now(), freshMs);
}

export function isSharedLiveParticipantFreshAt(
  updatedAt: string,
  referenceNowMs: number,
  freshMs = DEFAULT_SHARED_LIVE_FRESH_MS,
) {
  const timestamp = Date.parse(updatedAt);
  if (!Number.isFinite(timestamp)) return false;
  return referenceNowMs - timestamp <= freshMs;
}

export function filterSharedLiveParticipants(
  input: SharedGardenParticipantPresence[],
  freshMs = DEFAULT_SHARED_LIVE_FRESH_MS,
) {
  return filterSharedLiveParticipantsAt(input, Date.now(), freshMs);
}

export function filterSharedLiveParticipantsAt(
  input: SharedGardenParticipantPresence[],
  referenceNowMs: number | null,
  freshMs = DEFAULT_SHARED_LIVE_FRESH_MS,
) {
  if (typeof referenceNowMs !== "number" || !Number.isFinite(referenceNowMs)) {
    return mergeSharedLiveParticipants(input);
  }

  return mergeSharedLiveParticipants(
    input.filter((participant) =>
      isSharedLiveParticipantFreshAt(participant.updatedAt, referenceNowMs, freshMs),
    ),
  );
}

export function estimateSharedLiveServerClockOffsetMs(
  serverNow: string | null | undefined,
  clientNowMs = Date.now(),
) {
  const serverNowMs = Date.parse(String(serverNow ?? "").trim());
  if (!Number.isFinite(serverNowMs)) return null;
  return serverNowMs - clientNowMs;
}

export function sharedLiveSessionsChannelName(input: {
  scopeKind: SharedLiveSessionScopeKind;
  scopeKey: string | null | undefined;
}) {
  const scopeKey = String(input.scopeKey ?? "").trim();
  if (!scopeKey) return null;
  return `shared-live:${input.scopeKind}:${scopeKey}`;
}
