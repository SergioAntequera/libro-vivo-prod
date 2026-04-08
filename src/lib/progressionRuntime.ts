import {
  makeProgressionGraphNodeKey,
  normalizeProgressionGraphDraft,
  type ProgressionTreeImportance,
  type ProgressionTreeSettings,
} from "@/lib/progressionGraph";
import {
  mapProgressionRankToLegacyTier,
  normalizeProgressionLeafVariant,
  normalizeProgressionTreeRank,
  normalizeProgressionTreeRarity,
  type ProgressionTreeRank,
  type ProgressionTreeRarity,
} from "@/lib/progressionTreeVisuals";

export type CanonicalProgressionTreeRow = {
  id: string;
  title: string;
  description?: string | null;
  accent_color?: string | null;
  rank?: ProgressionTreeRank | null;
  rarity?: ProgressionTreeRarity | null;
  leaf_variant?: number | null;
  enabled?: boolean | null;
};

export type CanonicalProgressionTreeUnlockRow = {
  id: string | null;
  tree_id: string;
  unlocked_at: string | null;
  claimed_at: string | null;
};

export type CanonicalProgressionGraphStateRow = {
  tree_settings?: unknown;
};

export type LegacyCompatibleProgressionRule = {
  id: string;
  title: string;
  tier: "bronze" | "silver" | "gold" | "diamond";
  default_reward_id: string | null;
  preferred_region_id: string | null;
  importance: ProgressionTreeImportance;
  rank: ProgressionTreeRank;
  rarity: ProgressionTreeRarity;
  leaf_variant: number;
  accent_color: string | null;
};

export type LegacyCompatibleProgressionUnlock = {
  id: string | null;
  rule_id: string;
  created_at: string | null;
  claimed_at: string | null;
};

function normalizeImportance(value: unknown): ProgressionTreeImportance {
  const text = String(value ?? "").trim().toLowerCase();
  if (text === "paso" || text === "importante" || text === "mayor" || text === "anual") {
    return text;
  }
  return "importante";
}

export function mapProgressionImportanceToTier(
  importance: ProgressionTreeImportance,
): LegacyCompatibleProgressionRule["tier"] {
  if (importance === "paso") return "bronze";
  if (importance === "importante") return "silver";
  if (importance === "mayor") return "gold";
  return "diamond";
}

export function normalizeProgressionTreeSettingsRecord(raw: unknown) {
  const draft = normalizeProgressionGraphDraft({
    treeSettings: raw,
  });
  return draft.treeSettings;
}

export function buildLegacyCompatibleProgressionRules(params: {
  trees: CanonicalProgressionTreeRow[];
  graphStateRow?: CanonicalProgressionGraphStateRow | null;
}) {
  const treeSettings = normalizeProgressionTreeSettingsRecord(
    params.graphStateRow?.tree_settings ?? null,
  );
  const rulesById: Record<string, LegacyCompatibleProgressionRule> = {};

  for (const tree of params.trees) {
    const nodeKey = makeProgressionGraphNodeKey("tree", tree.id);
    const settings: ProgressionTreeSettings | undefined = treeSettings[nodeKey];
    const importance = normalizeImportance(settings?.importance);
    const rank = normalizeProgressionTreeRank(tree.rank);
    const rarity = normalizeProgressionTreeRarity(tree.rarity);
    rulesById[tree.id] = {
      id: tree.id,
      title: String(tree.title ?? "").trim() || "\u00c1rbol de hito",
      tier: mapProgressionRankToLegacyTier(rank) ?? mapProgressionImportanceToTier(importance),
      default_reward_id: null,
      preferred_region_id: String(settings?.regionId ?? "").trim() || null,
      importance,
      rank,
      rarity,
      leaf_variant: normalizeProgressionLeafVariant(tree.leaf_variant),
      accent_color: String(tree.accent_color ?? "").trim() || null,
    };
  }

  return rulesById;
}

export function buildLegacyCompatibleProgressionUnlocks(
  unlocks: CanonicalProgressionTreeUnlockRow[],
): LegacyCompatibleProgressionUnlock[] {
  return unlocks
    .map((unlock) => ({
      id: unlock.id ?? null,
      rule_id: String(unlock.tree_id ?? "").trim(),
      created_at: String(unlock.unlocked_at ?? "").trim() || null,
      claimed_at: String(unlock.claimed_at ?? "").trim() || null,
    }))
    .filter((unlock) => Boolean(unlock.rule_id));
}
