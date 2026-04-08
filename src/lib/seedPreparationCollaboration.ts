import type { SharedGardenParticipantPresence } from "@/lib/sharedGardenSessions";

export type SeedPreparationSavedEnvelope = {
  actorName: string;
  actorUserId: string;
  savedAt: string;
  seedId: string;
};

export function seedPreparationCollaborationChannelName(input: {
  gardenId: string | null | undefined;
  seedId: string | null | undefined;
}) {
  const gardenId = String(input.gardenId ?? "").trim();
  const seedId = String(input.seedId ?? "").trim();
  if (!gardenId || !seedId) return null;
  return `seed-preparation:${gardenId}:${seedId}`;
}

export function flattenSeedPreparationPresenceState(
  input: Record<string, Array<Partial<SharedGardenParticipantPresence>>>,
) {
  const latestByUserId = new Map<string, SharedGardenParticipantPresence>();

  for (const entries of Object.values(input)) {
    for (const entry of entries) {
      const userId = String(entry.userId ?? "").trim();
      if (!userId) continue;
      const candidate: SharedGardenParticipantPresence = {
        userId,
        name: String(entry.name ?? "Sin nombre").trim() || "Sin nombre",
        ready: Boolean(entry.ready),
        holding: Boolean(entry.holding),
        activityLabel:
          typeof entry.activityLabel === "string" && entry.activityLabel.trim()
            ? entry.activityLabel.trim()
            : null,
        activityProgress:
          typeof entry.activityProgress === "number" && Number.isFinite(entry.activityProgress)
            ? entry.activityProgress
            : null,
        focusKey:
          typeof entry.focusKey === "string" && entry.focusKey.trim() ? entry.focusKey.trim() : null,
        focusLabel:
          typeof entry.focusLabel === "string" && entry.focusLabel.trim()
            ? entry.focusLabel.trim()
            : null,
        cursorOffset:
          typeof entry.cursorOffset === "number" && Number.isFinite(entry.cursorOffset)
            ? entry.cursorOffset
            : null,
        pointerX:
          typeof entry.pointerX === "number" && Number.isFinite(entry.pointerX)
            ? entry.pointerX
            : null,
        pointerY:
          typeof entry.pointerY === "number" && Number.isFinite(entry.pointerY)
            ? entry.pointerY
            : null,
        updatedAt: String(entry.updatedAt ?? new Date(0).toISOString()),
      };
      const existing = latestByUserId.get(userId);
      if (!existing || candidate.updatedAt >= existing.updatedAt) {
        latestByUserId.set(userId, candidate);
      }
    }
  }

  return [...latestByUserId.values()].sort(
    (left, right) => left.name.localeCompare(right.name, "es") || left.userId.localeCompare(right.userId),
  );
}
