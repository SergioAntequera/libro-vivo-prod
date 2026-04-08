import type { ProgressionTreeImportance } from "@/lib/progressionGraph";

export type ProgressionTreeRank =
  | "bronze"
  | "silver"
  | "gold"
  | "diamond"
  | "mythic"
  | "celestial"
  | "eternal";

export type ProgressionTreeRarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary"
  | "mythic";

export const PROGRESSION_TREE_RANK_OPTIONS: Array<{
  value: ProgressionTreeRank;
  label: string;
}> = [
  { value: "bronze", label: "Bronce" },
  { value: "silver", label: "Plata" },
  { value: "gold", label: "Oro" },
  { value: "diamond", label: "Diamante" },
  { value: "mythic", label: "M\u00edtico" },
  { value: "celestial", label: "Celestial" },
  { value: "eternal", label: "Eterno" },
];

export const PROGRESSION_TREE_RARITY_OPTIONS: Array<{
  value: ProgressionTreeRarity;
  label: string;
}> = [
  { value: "common", label: "Com\u00fan" },
  { value: "uncommon", label: "Poco com\u00fan" },
  { value: "rare", label: "Raro" },
  { value: "epic", label: "\u00c9pico" },
  { value: "legendary", label: "Legendario" },
  { value: "mythic", label: "M\u00edtico" },
];

export type ProgressionTreeRankPalette = {
  trunk: string;
  trunkShade: string;
  canopy: string;
  canopyShade: string;
  halo: string;
  fruit: string;
  outline: string;
};

const TREE_RANK_PALETTES: Record<ProgressionTreeRank, ProgressionTreeRankPalette> = {
  bronze: {
    trunk: "#8f6b4a",
    trunkShade: "#6f5237",
    canopy: "#d7bb8d",
    canopyShade: "#c79d66",
    halo: "rgba(214, 171, 111, 0.24)",
    fruit: "#f0d39d",
    outline: "#73553c",
  },
  silver: {
    trunk: "#6f7f8f",
    trunkShade: "#52606d",
    canopy: "#d7e3ee",
    canopyShade: "#b7c9db",
    halo: "rgba(186, 209, 234, 0.24)",
    fruit: "#f5fbff",
    outline: "#5b6a79",
  },
  gold: {
    trunk: "#8c6d27",
    trunkShade: "#6e551f",
    canopy: "#f4d571",
    canopyShade: "#e4b94c",
    halo: "rgba(244, 205, 101, 0.28)",
    fruit: "#fff0a7",
    outline: "#7c6124",
  },
  diamond: {
    trunk: "#6f77a3",
    trunkShade: "#555d85",
    canopy: "#d6daf8",
    canopyShade: "#bac3ef",
    halo: "rgba(182, 194, 248, 0.28)",
    fruit: "#f8fbff",
    outline: "#636c93",
  },
  mythic: {
    trunk: "#8755a8",
    trunkShade: "#643f7f",
    canopy: "#e5c9fb",
    canopyShade: "#d2a8f6",
    halo: "rgba(218, 167, 255, 0.32)",
    fruit: "#fff0ff",
    outline: "#7b4b9a",
  },
  celestial: {
    trunk: "#3f6f8d",
    trunkShade: "#2e546d",
    canopy: "#bfeaff",
    canopyShade: "#8fd3fb",
    halo: "rgba(138, 216, 255, 0.34)",
    fruit: "#f7fdff",
    outline: "#477690",
  },
  eternal: {
    trunk: "#48725e",
    trunkShade: "#335444",
    canopy: "#cfe9d8",
    canopyShade: "#9fd1b2",
    halo: "rgba(150, 214, 181, 0.34)",
    fruit: "#f5fff8",
    outline: "#446c59",
  },
};

const TREE_RARITY_CONFIG: Record<
  ProgressionTreeRarity,
  { leafCount: number; fruitCount: number; haloScale: number; sparkleCount: number }
> = {
  common: { leafCount: 8, fruitCount: 0, haloScale: 0.76, sparkleCount: 0 },
  uncommon: { leafCount: 12, fruitCount: 1, haloScale: 0.84, sparkleCount: 0 },
  rare: { leafCount: 16, fruitCount: 2, haloScale: 0.94, sparkleCount: 1 },
  epic: { leafCount: 20, fruitCount: 3, haloScale: 1.04, sparkleCount: 2 },
  legendary: { leafCount: 24, fruitCount: 4, haloScale: 1.14, sparkleCount: 3 },
  mythic: { leafCount: 30, fruitCount: 6, haloScale: 1.24, sparkleCount: 5 },
};

export function normalizeProgressionTreeRank(value: unknown): ProgressionTreeRank {
  const text = String(value ?? "").trim().toLowerCase();
  return PROGRESSION_TREE_RANK_OPTIONS.some((option) => option.value === text)
    ? (text as ProgressionTreeRank)
    : "bronze";
}

export function normalizeProgressionTreeRarity(value: unknown): ProgressionTreeRarity {
  const text = String(value ?? "").trim().toLowerCase();
  return PROGRESSION_TREE_RARITY_OPTIONS.some((option) => option.value === text)
    ? (text as ProgressionTreeRarity)
    : "common";
}

export function normalizeProgressionLeafVariant(value: unknown) {
  const numeric = Math.round(Number(value));
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(99, numeric));
}

export function defaultProgressionTreeRankForImportance(
  importance: ProgressionTreeImportance,
): ProgressionTreeRank {
  if (importance === "paso") return "bronze";
  if (importance === "importante") return "silver";
  if (importance === "mayor") return "gold";
  return "diamond";
}

export function defaultProgressionTreeRarityForIndex(index: number): ProgressionTreeRarity {
  const palette: ProgressionTreeRarity[] = [
    "common",
    "uncommon",
    "rare",
    "epic",
    "legendary",
    "mythic",
  ];
  return palette[Math.abs(index) % palette.length] ?? "common";
}

export function mapProgressionRankToLegacyTier(
  rank: ProgressionTreeRank,
): "bronze" | "silver" | "gold" | "diamond" {
  if (rank === "bronze") return "bronze";
  if (rank === "silver") return "silver";
  if (rank === "gold") return "gold";
  return "diamond";
}

export function mapLegacyTierToProgressionRank(
  tier: unknown,
): ProgressionTreeRank {
  const text = String(tier ?? "").trim().toLowerCase();
  if (text === "silver") return "silver";
  if (text === "gold") return "gold";
  if (text === "diamond") return "diamond";
  return "bronze";
}

export function importanceScaleForMilestoneTree(importance: ProgressionTreeImportance) {
  if (importance === "paso") return 0.9;
  if (importance === "importante") return 1;
  if (importance === "mayor") return 1.16;
  return 1.32;
}

export function progressionTreeRankPalette(rank: ProgressionTreeRank) {
  return TREE_RANK_PALETTES[rank];
}

export function progressionTreeRarityConfig(rarity: ProgressionTreeRarity) {
  return TREE_RARITY_CONFIG[rarity];
}

function seededUnit(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

export type ProgressionLeafSpec = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotate: number;
  opacity: number;
  layer: "base" | "accent";
};

export function buildProgressionLeafSet(params: {
  leafVariant: number;
  rarity: ProgressionTreeRarity;
  importance: ProgressionTreeImportance;
}) {
  const leafVariant = normalizeProgressionLeafVariant(params.leafVariant);
  const rarity = normalizeProgressionTreeRarity(params.rarity);
  const importance = params.importance;
  const rarityCfg = progressionTreeRarityConfig(rarity);
  const scale = importanceScaleForMilestoneTree(importance);
  const canopyRadius = 13.5 * scale;
  const verticalRadius = 10.5 * scale;
  const leaves: ProgressionLeafSpec[] = [];

  for (let index = 0; index < rarityCfg.leafCount; index += 1) {
    const spread = seededUnit(leafVariant * 101 + index * 17);
    const angle = Math.PI * 2 * spread;
    const radial = 0.45 + seededUnit(leafVariant * 47 + index * 31) * 0.55;
    const cx = 36 + Math.cos(angle) * canopyRadius * radial;
    const cy = 24 + Math.sin(angle) * verticalRadius * radial;
    const rx = 2.2 + seededUnit(leafVariant * 83 + index * 13) * 2.1;
    const ry = 3.1 + seededUnit(leafVariant * 59 + index * 19) * 2.8;
    const rotate = angle * (180 / Math.PI) + seededUnit(leafVariant * 71 + index * 7) * 40 - 20;
    const opacity = 0.68 + seededUnit(leafVariant * 97 + index * 11) * 0.28;
    const layer = index % 3 === 0 ? "accent" : "base";
    leaves.push({ cx, cy, rx, ry, rotate, opacity, layer });
  }

  return leaves;
}

export function buildProgressionFruitSet(params: {
  leafVariant: number;
  rarity: ProgressionTreeRarity;
  importance: ProgressionTreeImportance;
}) {
  const rarityCfg = progressionTreeRarityConfig(params.rarity);
  const scale = importanceScaleForMilestoneTree(params.importance);
  return Array.from({ length: rarityCfg.fruitCount }, (_, index) => {
    const unit = seededUnit(params.leafVariant * 131 + index * 41);
    const angle = Math.PI * 2 * unit;
    const radial = 4 + seededUnit(params.leafVariant * 29 + index * 37) * 7.5 * scale;
    return {
      cx: 36 + Math.cos(angle) * radial,
      cy: 25 + Math.sin(angle) * radial * 0.75,
      r: 1.8 + seededUnit(params.leafVariant * 17 + index * 23) * 1.6 * scale,
    };
  });
}

export function buildProgressionSparkleSet(params: {
  leafVariant: number;
  rarity: ProgressionTreeRarity;
}) {
  const count = progressionTreeRarityConfig(params.rarity).sparkleCount;
  return Array.from({ length: count }, (_, index) => {
    const unit = seededUnit(params.leafVariant * 149 + index * 43);
    return {
      cx: 20 + unit * 32,
      cy: 9 + seededUnit(params.leafVariant * 71 + index * 59) * 18,
      size: 1.8 + seededUnit(params.leafVariant * 53 + index * 29) * 2.6,
    };
  });
}
