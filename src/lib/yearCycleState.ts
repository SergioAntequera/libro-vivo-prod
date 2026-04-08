export type YearCycleStateRow = {
  garden_id: string;
  year: number;
  closed_at: string | null;
  closed_by_user_id: string | null;
  acknowledged_user_ids: string[];
  created_at: string;
  updated_at: string;
};

export function normalizeYearCycleStateRow(
  raw: Partial<YearCycleStateRow> & Record<string, unknown>,
): YearCycleStateRow | null {
  const gardenId = String(raw.garden_id ?? "").trim();
  const year = Number(raw.year);
  if (!gardenId || !Number.isInteger(year)) return null;
  return {
    garden_id: gardenId,
    year,
    closed_at: String(raw.closed_at ?? "").trim() || null,
    closed_by_user_id: String(raw.closed_by_user_id ?? "").trim() || null,
    acknowledged_user_ids: Array.isArray(raw.acknowledged_user_ids)
      ? Array.from(
          new Set(
            raw.acknowledged_user_ids
              .map((value) => String(value ?? "").trim())
              .filter(Boolean),
          ),
        )
      : [],
    created_at: String(raw.created_at ?? "").trim() || new Date(0).toISOString(),
    updated_at: String(raw.updated_at ?? "").trim() || new Date(0).toISOString(),
  };
}

export function hasAcknowledgedYearCycle(
  state: YearCycleStateRow | null,
  userId: string | null | undefined,
) {
  const normalizedUserId = String(userId ?? "").trim();
  if (!state || !normalizedUserId) return false;
  return state.acknowledged_user_ids.includes(normalizedUserId);
}

export function isYearCycleFullySynchronized(
  state: YearCycleStateRow | null,
  requiredParticipants: number,
) {
  if (!state?.closed_at) return false;
  return new Set(state.acknowledged_user_ids).size >= Math.max(1, requiredParticipants);
}
