import {
  buildLegacyCompatibleProgressionRules,
  type CanonicalProgressionGraphStateRow,
  type CanonicalProgressionTreeRow,
  type CanonicalProgressionTreeUnlockRow,
} from "@/lib/progressionRuntime";
import type { ProgressionTreeImportance } from "@/lib/progressionGraph";
import type {
  ProgressionTreeRank,
  ProgressionTreeRarity,
} from "@/lib/progressionTreeVisuals";

export type ClaimedProgressionMilestoneVisual = {
  id: string;
  title: string;
  description: string | null;
  claimedAt: string | null;
  importance: ProgressionTreeImportance;
  rank: ProgressionTreeRank;
  rarity: ProgressionTreeRarity;
  leafVariant: number;
  accentColor: string | null;
};

type BuildClaimedProgressionMilestoneVisualsParams = {
  trees: CanonicalProgressionTreeRow[];
  unlocks: CanonicalProgressionTreeUnlockRow[];
  graphStateRow?: CanonicalProgressionGraphStateRow | null;
  claimedFrom?: string | null;
  claimedToExclusive?: string | null;
};

function isInsideClaimedWindow(params: {
  claimedAt: string | null;
  claimedFrom?: string | null;
  claimedToExclusive?: string | null;
}) {
  const claimedAt = String(params.claimedAt ?? "").trim();
  if (!claimedAt) return false;
  const claimedFrom = String(params.claimedFrom ?? "").trim();
  const claimedToExclusive = String(params.claimedToExclusive ?? "").trim();
  if (claimedFrom && claimedAt < claimedFrom) return false;
  if (claimedToExclusive && claimedAt >= claimedToExclusive) return false;
  return true;
}

export function buildClaimedProgressionMilestoneVisuals(
  params: BuildClaimedProgressionMilestoneVisualsParams,
) {
  const rulesById = buildLegacyCompatibleProgressionRules({
    trees: params.trees,
    graphStateRow: params.graphStateRow ?? null,
  });
  const treeById = new Map(params.trees.map((tree) => [tree.id, tree] as const));

  return params.unlocks
    .filter((unlock) =>
      isInsideClaimedWindow({
        claimedAt: unlock.claimed_at ?? null,
        claimedFrom: params.claimedFrom ?? null,
        claimedToExclusive: params.claimedToExclusive ?? null,
      }),
    )
    .map((unlock) => {
      const treeId = String(unlock.tree_id ?? "").trim();
      const tree = treeById.get(treeId);
      const rule = rulesById[treeId];
      if (!tree || !rule) return null;
      return {
        id: treeId,
        title: rule.title,
        description: String(tree.description ?? "").trim() || null,
        claimedAt: String(unlock.claimed_at ?? "").trim() || null,
        importance: rule.importance,
        rank: rule.rank,
        rarity: rule.rarity,
        leafVariant: rule.leaf_variant,
        accentColor: rule.accent_color,
      } satisfies ClaimedProgressionMilestoneVisual;
    })
    .filter((item): item is ClaimedProgressionMilestoneVisual => Boolean(item))
    .sort((left, right) => String(right.claimedAt ?? "").localeCompare(String(left.claimedAt ?? "")));
}
