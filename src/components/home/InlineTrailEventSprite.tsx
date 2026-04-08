import { ProgressionMilestoneTree } from "@/components/shared/ProgressionMilestoneTree";
import type { ProgressionTreeImportance } from "@/lib/progressionGraph";
import {
  mapLegacyTierToProgressionRank,
  type ProgressionTreeRank,
  type ProgressionTreeRarity,
} from "@/lib/progressionTreeVisuals";

export type TrailEventKind = "seed" | "sprout" | "flower" | "tree";
export type TrailRuleTier = "bronze" | "silver" | "gold" | "diamond";

type BloomElementPalette = {
  petal: string;
  petalShade: string;
  stem: string;
  leaf: string;
  center: string;
  glow: string;
};

const BLOOM_ELEMENT_PALETTE: Record<string, BloomElementPalette> = {
  fire: {
    petal: "#f48d78",
    petalShade: "#dd6d5b",
    stem: "#5d8c3b",
    leaf: "#76ac4f",
    center: "#ffd27d",
    glow: "rgba(251, 199, 164, 0.42)",
  },
  water: {
    petal: "#7fc9de",
    petalShade: "#5ea7bd",
    stem: "#5c8a47",
    leaf: "#77b56a",
    center: "#ffe59c",
    glow: "rgba(165, 220, 241, 0.42)",
  },
  air: {
    petal: "#d6bfdc",
    petalShade: "#bea3c5",
    stem: "#5e8851",
    leaf: "#85b379",
    center: "#fff0b2",
    glow: "rgba(230, 216, 243, 0.4)",
  },
  earth: {
    petal: "#f2c668",
    petalShade: "#d8a947",
    stem: "#5d7f36",
    leaf: "#7ea955",
    center: "#fff4b6",
    glow: "rgba(250, 223, 157, 0.42)",
  },
  aether: {
    petal: "#e8c7ef",
    petalShade: "#d5a8de",
    stem: "#60855a",
    leaf: "#86b08c",
    center: "#fff3c4",
    glow: "rgba(241, 223, 252, 0.44)",
  },
  default: {
    petal: "#efbfd2",
    petalShade: "#da9fb6",
    stem: "#628a44",
    leaf: "#7db168",
    center: "#ffe6a2",
    glow: "rgba(246, 214, 225, 0.42)",
  },
};

export function getBloomPaletteForElement(element: string | null | undefined) {
  if (!element) return BLOOM_ELEMENT_PALETTE.default;
  return BLOOM_ELEMENT_PALETTE[element] ?? BLOOM_ELEMENT_PALETTE.default;
}

export default function InlineTrailEventSprite({
  kind,
  element,
  rating,
  isFavorite,
  claimed,
  tier,
  importance,
  rank,
  rarity,
  leafVariant,
  accentColor,
  size,
}: {
  kind: TrailEventKind;
  element?: string | null;
  rating?: number | null;
  isFavorite?: boolean;
  claimed?: boolean;
  tier?: TrailRuleTier | null;
  importance?: ProgressionTreeImportance | null;
  rank?: ProgressionTreeRank | null;
  rarity?: ProgressionTreeRarity | null;
  leafVariant?: number | null;
  accentColor?: string | null;
  size: number;
}) {
  const palette = getBloomPaletteForElement(element);
  const safeRating =
    kind === "flower"
      ? Math.max(1, Math.min(5, Number.isFinite(rating) ? Number(rating) : 3))
      : 0;
  const petalProfile =
    element === "fire"
      ? { rx: 2.2, ry: 7.3, tilt: 12 }
      : element === "water"
        ? { rx: 3.7, ry: 5.6, tilt: 0 }
        : element === "air"
          ? { rx: 2.4, ry: 7.6, tilt: 16 }
          : element === "earth"
            ? { rx: 4.1, ry: 5.2, tilt: -4 }
            : element === "aether"
              ? { rx: 2.8, ry: 6.8, tilt: 8 }
              : { rx: 3.1, ry: 6.3, tilt: 4 };

  if (kind === "seed") {
    return (
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
        <ellipse cx="32" cy="54" rx="11" ry="3.8" fill="rgba(44, 64, 38, 0.14)" />
        <path
          d="M24 46 C18 42, 18 31, 24 24 C30 18, 40 19, 43 28 C46 36, 39 45, 30 47 C27 48, 25 48, 24 46 Z"
          fill="#8f6837"
        />
        <path
          d="M31 24 C34 28, 34 36, 31 43"
          fill="none"
          stroke="#cfa16a"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.72"
        />
      </svg>
    );
  }

  if (kind === "sprout") {
    return (
      <svg viewBox="0 0 72 72" width={size} height={size} aria-hidden="true">
        <ellipse cx="36" cy="60" rx="12" ry="4.2" fill="rgba(44, 64, 38, 0.14)" />
        <path
          d="M36 56 L36 34"
          fill="none"
          stroke={palette.stem}
          strokeWidth="3.8"
          strokeLinecap="round"
        />
        <path
          d="M36 41 C30 29, 18 28, 13 35 C20 43, 29 46, 36 41 Z"
          fill={palette.leaf}
        />
        <path
          d="M36 37 C42 27, 54 25, 60 32 C54 41, 45 43, 36 37 Z"
          fill={palette.leaf}
          opacity="0.94"
        />
        <circle cx="36" cy="31" r="4.8" fill={palette.petal} opacity="0.92" />
      </svg>
    );
  }

  if (kind === "tree") {
    return (
      <ProgressionMilestoneTree
        size={size}
        rank={rank ?? mapLegacyTierToProgressionRank(tier)}
        importance={importance ?? "importante"}
        rarity={rarity ?? (tier === "diamond" ? "legendary" : tier === "gold" ? "epic" : tier === "silver" ? "rare" : "common")}
        leafVariant={leafVariant ?? 0}
        accentColor={accentColor ?? null}
        claimed={claimed}
      />
    );
  }

  const stemBottomY = 60;
  const stemHeight = 16 + safeRating * 3.7 + (isFavorite ? 2 : 0);
  const blossomY = stemBottomY - stemHeight;
  const centerRadius = 2.8 + safeRating * 0.42 + (isFavorite ? 0.5 : 0);
  const outerPetalCount =
    safeRating <= 1 ? 4 : safeRating === 2 ? 5 : safeRating === 3 ? 7 : safeRating === 4 ? 8 : 10;
  const outerRadius = 8 + safeRating * 1.4;
  const innerRadius = safeRating >= 4 ? outerRadius * 0.62 : outerRadius * 0.48;
  const glowRadius = outerRadius + (isFavorite ? 10 : safeRating >= 4 ? 6 : 4);
  const usesDoubleLayer = safeRating >= 4;
  const isBud = safeRating <= 2;
  const petals = Array.from({ length: outerPetalCount }, (_, index) => {
    const angle = (Math.PI * 2 * index) / outerPetalCount;
    const cx = 36 + Math.cos(angle) * outerRadius;
    const cy = blossomY + Math.sin(angle) * outerRadius;
    const rotate = (angle * 180) / Math.PI;
    return (
      <ellipse
        key={`petal-${index}`}
        cx={cx}
        cy={cy}
        rx={petalProfile.rx + (safeRating >= 4 ? 0.3 : 0)}
        ry={petalProfile.ry + safeRating * 0.2}
        fill={index % 2 === 0 ? palette.petal : palette.petalShade}
        opacity={0.95}
        transform={`rotate(${rotate + petalProfile.tilt} ${cx} ${cy})`}
      />
    );
  });
  const innerPetals = Array.from({ length: outerPetalCount }, (_, index) => {
    const angle = (Math.PI * 2 * index) / outerPetalCount + Math.PI / outerPetalCount;
    const cx = 36 + Math.cos(angle) * innerRadius;
    const cy = blossomY + Math.sin(angle) * innerRadius;
    const rotate = (angle * 180) / Math.PI;
    return (
      <ellipse
        key={`inner-petal-${index}`}
        cx={cx}
        cy={cy}
        rx={petalProfile.rx * 0.9}
        ry={petalProfile.ry * 0.76}
        fill={palette.petal}
        opacity={0.84}
        transform={`rotate(${rotate - petalProfile.tilt * 0.5} ${cx} ${cy})`}
      />
    );
  });

  return (
    <svg viewBox="0 0 72 72" width={size} height={size} aria-hidden="true">
      <ellipse cx="36" cy="63" rx="12.5" ry="3.8" fill="rgba(44, 64, 38, 0.15)" />
      <path
        d={`M36 60 L36 ${blossomY + 7}`}
        fill="none"
        stroke={palette.stem}
        strokeWidth={3.4 + safeRating * 0.16}
        strokeLinecap="round"
      />
      <path
        d={`M35 48 C28 47, 23 41, 25 35 C32 36, 36 41, 35 48 Z`}
        fill={palette.leaf}
        opacity="0.94"
      />
      <path
        d={`M37 44 C45 43, 50 37, 48 31 C40 32, 36 37, 37 44 Z`}
        fill={palette.leaf}
      />
      <circle cx="36" cy={blossomY} r={glowRadius} fill={palette.glow} opacity={isFavorite ? 0.9 : 0.55} />
      {isFavorite && (
        <circle cx="36" cy={blossomY} r={glowRadius + 4} fill={palette.glow} opacity="0.26" />
      )}
      {isBud ? (
        <g>
          <path
            d={`M36 ${blossomY + 10} C30 ${blossomY + 8}, 27 ${blossomY + 1}, 31 ${blossomY - 6} C33 ${blossomY - 10}, 39 ${blossomY - 10}, 41 ${blossomY - 6} C45 ${blossomY + 1}, 42 ${blossomY + 8}, 36 ${blossomY + 10} Z`}
            fill={palette.petal}
          />
          <path
            d={`M36 ${blossomY + 10} C34 ${blossomY + 4}, 34 ${blossomY - 2}, 36 ${blossomY - 6} C38 ${blossomY - 2}, 38 ${blossomY + 4}, 36 ${blossomY + 10} Z`}
            fill={palette.petalShade}
            opacity="0.9"
          />
        </g>
      ) : (
        <>
          {petals}
          {usesDoubleLayer ? innerPetals : null}
        </>
      )}
      {safeRating >= 4 && !isBud && (
        <g opacity="0.8">
          <circle cx="28" cy={blossomY + 2} r="1.2" fill="#ffffff" />
          <circle cx="44" cy={blossomY - 1} r="1" fill="#ffffff" />
        </g>
      )}
      <circle cx="36" cy={blossomY} r={centerRadius} fill={isFavorite ? "#ffe08a" : palette.center} />
      {isFavorite && (
        <g opacity="0.88">
          <circle cx="48" cy={blossomY - 11} r="1.3" fill="#fff6cf" />
          <circle cx="52" cy={blossomY - 7} r="0.9" fill="#fff6cf" />
          <circle cx="22" cy={blossomY - 7} r="1" fill="#fff6cf" />
        </g>
      )}
    </svg>
  );
}
