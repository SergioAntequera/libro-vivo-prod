"use client";

import type { ProgressionTreeImportance } from "@/lib/progressionGraph";
import {
  buildProgressionFruitSet,
  buildProgressionLeafSet,
  buildProgressionSparkleSet,
  importanceScaleForMilestoneTree,
  normalizeProgressionLeafVariant,
  normalizeProgressionTreeRank,
  normalizeProgressionTreeRarity,
  progressionTreeRankPalette,
  progressionTreeRarityConfig,
  type ProgressionTreeRank,
  type ProgressionTreeRarity,
} from "@/lib/progressionTreeVisuals";

export function ProgressionMilestoneTree({
  size,
  rank,
  importance,
  rarity,
  leafVariant,
  accentColor,
  claimed = false,
}: {
  size: number;
  rank: ProgressionTreeRank;
  importance: ProgressionTreeImportance;
  rarity: ProgressionTreeRarity;
  leafVariant: number;
  accentColor?: string | null;
  claimed?: boolean;
}) {
  const safeRank = normalizeProgressionTreeRank(rank);
  const safeRarity = normalizeProgressionTreeRarity(rarity);
  const safeLeafVariant = normalizeProgressionLeafVariant(leafVariant);
  const palette = progressionTreeRankPalette(safeRank);
  const rarityConfig = progressionTreeRarityConfig(safeRarity);
  const scale = importanceScaleForMilestoneTree(importance);
  const canopyFill = accentColor?.trim() || palette.canopy;
  const canopyShade = accentColor?.trim() ? palette.canopyShade : palette.canopyShade;
  const trunkWidth = 7.8 * scale;
  const trunkHeight = 17 * scale;
  const trunkX = 36 - trunkWidth / 2;
  const trunkY = 44 - trunkHeight / 2;
  const canopyRx = 15.5 * scale;
  const canopyRy = 11.8 * scale;
  const haloRx = canopyRx * (1.45 * rarityConfig.haloScale);
  const haloRy = canopyRy * (1.45 * rarityConfig.haloScale);
  const leaves = buildProgressionLeafSet({
    leafVariant: safeLeafVariant,
    rarity: safeRarity,
    importance,
  });
  const fruits = buildProgressionFruitSet({
    leafVariant: safeLeafVariant,
    rarity: safeRarity,
    importance,
  });
  const sparkles = buildProgressionSparkleSet({
    leafVariant: safeLeafVariant,
    rarity: safeRarity,
  });

  return (
    <svg viewBox="0 0 72 72" width={size} height={size} aria-hidden="true">
      <ellipse cx="36" cy="62" rx={11 * scale} ry={4.2 * scale} fill="rgba(44,64,38,0.14)" />
      <ellipse
        cx="36"
        cy={24}
        rx={haloRx}
        ry={haloRy}
        fill={palette.halo}
        opacity={claimed ? 0.9 : 0.7}
      />
      {claimed ? (
        <ellipse
          cx="36"
          cy={24}
          rx={haloRx + 4}
          ry={haloRy + 4}
          fill={palette.halo}
          opacity={0.22}
        />
      ) : null}

      <rect
        x={trunkX}
        y={trunkY}
        width={trunkWidth}
        height={trunkHeight}
        rx={trunkWidth / 2}
        fill={palette.trunk}
      />
      <rect
        x={trunkX + 1.1}
        y={trunkY + 1.5}
        width={Math.max(2.4, trunkWidth * 0.28)}
        height={trunkHeight - 3}
        rx={2}
        fill={palette.trunkShade}
        opacity={0.72}
      />

      <ellipse
        cx="36"
        cy={24}
        rx={canopyRx}
        ry={canopyRy}
        fill={canopyFill}
        stroke={palette.outline}
        strokeWidth={1.4}
      />
      <ellipse
        cx="30.5"
        cy={22.5}
        rx={canopyRx * 0.58}
        ry={canopyRy * 0.58}
        fill={canopyShade}
        opacity={0.72}
      />

      {leaves.map((leaf, index) => (
        <ellipse
          key={`leaf-${index}`}
          cx={leaf.cx}
          cy={leaf.cy}
          rx={leaf.rx}
          ry={leaf.ry}
          fill={leaf.layer === "accent" ? palette.canopyShade : canopyFill}
          opacity={leaf.opacity}
          transform={`rotate(${leaf.rotate} ${leaf.cx} ${leaf.cy})`}
        />
      ))}

      {fruits.map((fruit, index) => (
        <circle
          key={`fruit-${index}`}
          cx={fruit.cx}
          cy={fruit.cy}
          r={fruit.r}
          fill={palette.fruit}
          opacity={claimed ? 1 : 0.82}
          stroke={palette.outline}
          strokeWidth={0.6}
        />
      ))}

      {sparkles.map((sparkle, index) => (
        <g key={`sparkle-${index}`} opacity={claimed ? 0.9 : 0.64}>
          <path
            d={`M ${sparkle.cx} ${sparkle.cy - sparkle.size} L ${sparkle.cx} ${sparkle.cy + sparkle.size}`}
            stroke={palette.fruit}
            strokeWidth={1}
            strokeLinecap="round"
          />
          <path
            d={`M ${sparkle.cx - sparkle.size} ${sparkle.cy} L ${sparkle.cx + sparkle.size} ${sparkle.cy}`}
            stroke={palette.fruit}
            strokeWidth={1}
            strokeLinecap="round"
          />
        </g>
      ))}
    </svg>
  );
}
