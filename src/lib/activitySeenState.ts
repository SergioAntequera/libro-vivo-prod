import type {
  ActivityItem,
  ActivitySectionKey,
} from "@/lib/productDomainContracts";
import { ACTIVITY_SECTION_ORDER } from "@/lib/activityPresentation";

export type ActivitySeenMap = Record<string, string>;

const ACTIVITY_SEEN_STORAGE_PREFIX = "lv.activity.seen.v1";
const ACTIVITY_SEEN_RETENTION_MS = 120 * 24 * 60 * 60 * 1000;

function parseSeenMap(raw: string | null): ActivitySeenMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => {
        return typeof entry[0] === "string" && typeof entry[1] === "string";
      }),
    );
  } catch {
    return {};
  }
}

function pruneSeenMap(input: ActivitySeenMap, now = Date.now()) {
  return Object.fromEntries(
    Object.entries(input).filter(([, seenAt]) => {
      const parsed = Date.parse(seenAt);
      return Number.isFinite(parsed) && now - parsed <= ACTIVITY_SEEN_RETENTION_MS;
    }),
  );
}

export function getActivitySeenStorageKey(profileId: string | null, gardenId: string | null) {
  if (!profileId || !gardenId) return null;
  return `${ACTIVITY_SEEN_STORAGE_PREFIX}:${profileId}:${gardenId}`;
}

export function readActivitySeenMap(profileId: string | null, gardenId: string | null) {
  if (typeof window === "undefined") return {};
  const key = getActivitySeenStorageKey(profileId, gardenId);
  if (!key) return {};
  return pruneSeenMap(parseSeenMap(window.localStorage.getItem(key)));
}

export function writeActivitySeenMap(
  profileId: string | null,
  gardenId: string | null,
  value: ActivitySeenMap,
) {
  if (typeof window === "undefined") return;
  const key = getActivitySeenStorageKey(profileId, gardenId);
  if (!key) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(pruneSeenMap(value)));
  } catch {
    // ignore localStorage failures
  }
}

export function markActivityItemsSeen(
  current: ActivitySeenMap,
  itemIds: string[],
  seenAt = new Date().toISOString(),
) {
  if (!itemIds.length) return current;
  const next = { ...current };
  for (const itemId of itemIds) {
    if (!itemId) continue;
    next[itemId] = seenAt;
  }
  return pruneSeenMap(next);
}

export function buildActivityUnseenSummary(
  items: ActivityItem[],
  seenMap: ActivitySeenMap,
) {
  const unseenCounts = Object.fromEntries(
    ACTIVITY_SECTION_ORDER.map((key) => [key, 0]),
  ) as Record<ActivitySectionKey, number>;

  const unseenIds: string[] = [];
  for (const item of items) {
    if (seenMap[item.id]) continue;
    unseenIds.push(item.id);
    unseenCounts[item.sectionKey] += 1;
  }

  return {
    unseenIds,
    unseenCount: unseenIds.length,
    unseenCounts,
  };
}
