export type SharedGardenRitualKind = "capsule" | "flower";

export type SharedGardenParticipantPresence = {
  userId: string;
  name: string;
  ready: boolean;
  holding: boolean;
  activityLabel: string | null;
  activityProgress: number | null;
  focusKey: string | null;
  focusLabel: string | null;
  cursorOffset: number | null;
  pointerX: number | null;
  pointerY: number | null;
  updatedAt: string;
};

export const DEFAULT_SHARED_RITUAL_HOLD_MS = 2400;

export function resolveSharedGardenRequiredParticipants(activeMemberCount: number) {
  if (!Number.isFinite(activeMemberCount) || activeMemberCount <= 1) return 1;
  return 2;
}

export function sharedGardenRitualChannelName(input: {
  ritual: SharedGardenRitualKind;
  gardenId: string | null | undefined;
  entityKey: string;
}) {
  const gardenId = String(input.gardenId ?? "").trim();
  if (!gardenId) return null;
  return `shared:${input.ritual}:${gardenId}:${input.entityKey}`;
}

export function pickSharedGardenLeaderUserId(
  participants: SharedGardenParticipantPresence[],
) {
  return [...participants]
    .sort((a, b) => a.userId.localeCompare(b.userId))[0]
    ?.userId ?? null;
}
