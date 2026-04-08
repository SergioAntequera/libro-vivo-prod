import { supabase } from "@/lib/supabase";
import { isSchemaNotReadyError, withGardenScope } from "@/lib/gardens";
import type { ProgressionRewardKind } from "@/lib/progressionBlueprintCatalog";

type SupabaseLikeClient = Pick<typeof supabase, "from">;

type RewardJoin =
  | {
      id?: string | null;
      kind?: ProgressionRewardKind | null;
      title?: string | null;
      description?: string | null;
      reference_key?: string | null;
      payload?: unknown;
      enabled?: boolean | null;
    }
  | Array<{
      id?: string | null;
      kind?: ProgressionRewardKind | null;
      title?: string | null;
      description?: string | null;
      reference_key?: string | null;
      payload?: unknown;
      enabled?: boolean | null;
    }>
  | null;

type RewardUnlockRow = {
  id?: string | null;
  reward_id?: string | null;
  source_tree_id?: string | null;
  unlocked_at?: string | null;
  claimed_at?: string | null;
  reward?: RewardJoin;
};

export type ClaimedProgressionReward = {
  unlockId: string;
  rewardId: string;
  sourceTreeId: string | null;
  kind: ProgressionRewardKind;
  title: string;
  description: string | null;
  referenceKey: string | null;
  payload: Record<string, unknown> | null;
  unlockedAt: string | null;
  claimedAt: string | null;
};

function getClient(client?: SupabaseLikeClient) {
  return client ?? supabase;
}

function firstReward(reward: RewardJoin) {
  if (Array.isArray(reward)) return reward[0] ?? null;
  return reward ?? null;
}

function normalizeText(value: unknown) {
  const next = String(value ?? "").trim();
  return next || null;
}

function normalizePayload(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

export async function listClaimedProgressionRewards(params?: {
  gardenId?: string | null;
  client?: SupabaseLikeClient;
  kinds?: ProgressionRewardKind[];
  unlockedFrom?: string | null;
  unlockedToExclusive?: string | null;
}) {
  const db = getClient(params?.client);
  let query = withGardenScope(
    db
      .from("progression_reward_unlocks")
      .select(
        "id,reward_id,source_tree_id,unlocked_at,claimed_at,reward:progression_rewards(id,kind,title,description,reference_key,payload,enabled)",
      )
      .not("claimed_at", "is", null)
      .order("unlocked_at", { ascending: false }),
    params?.gardenId,
  );

  if (normalizeText(params?.unlockedFrom)) {
    query = query.gte("unlocked_at", normalizeText(params?.unlockedFrom));
  }
  if (normalizeText(params?.unlockedToExclusive)) {
    query = query.lt("unlocked_at", normalizeText(params?.unlockedToExclusive));
  }

  const { data, error } = await query;
  if (error) {
    if (isSchemaNotReadyError(error)) return [] as ClaimedProgressionReward[];
    throw error;
  }

  const kindSet = params?.kinds?.length ? new Set(params.kinds) : null;

  return (((data as RewardUnlockRow[] | null) ?? [])
    .map((row): ClaimedProgressionReward | null => {
      const reward = firstReward(row.reward ?? null);
      if (!reward || reward.enabled === false) return null;
      const unlockId = normalizeText(row.id);
      const rewardId = normalizeText(row.reward_id ?? reward.id);
      const kind = normalizeText(reward.kind) as ProgressionRewardKind | null;
      if (!unlockId || !rewardId || !kind) return null;
      if (kindSet && !kindSet.has(kind)) return null;
      return {
        unlockId,
        rewardId,
        sourceTreeId: normalizeText(row.source_tree_id),
        kind,
        title: normalizeText(reward.title) ?? "Reward",
        description: normalizeText(reward.description),
        referenceKey: normalizeText(reward.reference_key),
        payload: normalizePayload(reward.payload),
        unlockedAt: normalizeText(row.unlocked_at),
        claimedAt: normalizeText(row.claimed_at),
      };
    })
    .filter((row): row is ClaimedProgressionReward => row !== null));
}

export async function countClaimedProgressionRewards(params?: {
  gardenId?: string | null;
  client?: SupabaseLikeClient;
  kinds?: ProgressionRewardKind[];
  unlockedFrom?: string | null;
  unlockedToExclusive?: string | null;
}) {
  const rows = await listClaimedProgressionRewards(params);
  return rows.length;
}

export function progressionStickerTokenToSrc(token: string) {
  const normalized = String(token ?? "").trim().toLowerCase();
  if (!normalized) return "/stickers/sticker_star.svg";
  if (normalized.includes("leaf")) return "/stickers/sticker_leaf.svg";
  if (normalized.includes("seed")) return "/stickers/sticker_seed.svg";
  if (normalized.includes("water")) return "/stickers/sticker_water.svg";
  if (normalized.includes("fire")) return "/stickers/sticker_fire.svg";
  if (normalized.includes("sun")) return "/stickers/sticker_sun.svg";
  if (normalized.includes("moon")) return "/stickers/sticker_moon.svg";
  if (normalized.includes("cloud")) return "/stickers/sticker_cloud.svg";
  if (normalized.includes("calendar") || normalized.includes("year")) {
    return "/stickers/sticker_calendar.svg";
  }
  if (normalized.includes("map") || normalized.includes("route") || normalized.includes("trail")) {
    return "/stickers/sticker_map.svg";
  }
  if (normalized.includes("music") || normalized.includes("voice") || normalized.includes("audio")) {
    return "/stickers/sticker_music.svg";
  }
  if (normalized.includes("qr") || normalized.includes("pdf")) return "/stickers/sticker_qr.svg";
  if (normalized.includes("heart") || normalized.includes("love") || normalized.includes("home")) {
    return "/stickers/sticker_heart.svg";
  }
  if (normalized.includes("trace") || normalized.includes("washi")) return "/stickers/sticker_washi.svg";
  if (normalized.includes("done")) return "/stickers/sticker_stamp_done.svg";
  if (normalized.includes("spark") || normalized.includes("star") || normalized.includes("future")) {
    return "/stickers/sticker_star.svg";
  }
  return "/stickers/sticker_rainbow.svg";
}

export function extractProgressionStickerSources(rewards: ClaimedProgressionReward[]) {
  const out = new Set<string>();
  for (const reward of rewards) {
    if (reward.kind !== "sticker_pack") continue;
    const stickers = Array.isArray(reward.payload?.stickers)
      ? reward.payload?.stickers
      : [];
    for (const item of stickers) {
      if (typeof item !== "string" || !item.trim()) continue;
      out.add(progressionStickerTokenToSrc(item));
    }
  }
  return Array.from(out);
}
