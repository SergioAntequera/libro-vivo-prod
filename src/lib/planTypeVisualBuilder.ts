import { normalizeElementKind, normalizeFlowerFamily } from "@/lib/productDomainContracts";
import { getElementColor, isKnownElementKind } from "@/lib/elementsCatalog";
import {
  normalizePlanFlowerSlotConfig,
  type PlanFlowerSlotConfig,
  type PlanFlowerVariantConfig,
} from "@/lib/planTypeFlowerComposer";

const CATEGORY_TOKENS = [
  "salida",
  "comida",
  "naturaleza",
  "movimiento",
  "casa",
  "cultura",
  "escapada",
  "celebracion",
  "custom",
] as const;

type CategoryToken = (typeof CATEGORY_TOKENS)[number];

type ElementPalette = {
  petal: string;
  petalInner: string;
  center: string;
  stem: string;
  leaf: string;
  aura: string;
};

type CategoryArchitecture = {
  petalCount: number;
  outerRadius: number;
  innerRadius: number;
  petalWidth: number;
  petalHeight: number;
  petalRotationOffset: number;
  centerRadius: number;
  stemWidth: number;
  leafWidth: number;
  leafHeight: number;
};

const ELEMENT_PALETTES: Record<string, ElementPalette> = {
  fire: {
    petal: "#ffb16d",
    petalInner: "#e45f3d",
    center: "#6f2a19",
    stem: "#2b7d50",
    leaf: "#63a866",
    aura: "rgba(255, 140, 84, 0.26)",
  },
  water: {
    petal: "#8fd4ff",
    petalInner: "#4e8de7",
    center: "#275188",
    stem: "#2b6f66",
    leaf: "#74bea8",
    aura: "rgba(96, 171, 255, 0.24)",
  },
  air: {
    petal: "#e6f2ff",
    petalInner: "#8cc8e8",
    center: "#3d5b75",
    stem: "#4c8d73",
    leaf: "#8ed8ba",
    aura: "rgba(167, 217, 255, 0.24)",
  },
  earth: {
    petal: "#f0d48f",
    petalInner: "#b27a45",
    center: "#69452b",
    stem: "#477940",
    leaf: "#88b36a",
    aura: "rgba(173, 123, 77, 0.20)",
  },
  aether: {
    petal: "#efe7ff",
    petalInner: "#a894e8",
    center: "#5d4379",
    stem: "#4a7c67",
    leaf: "#95c7a7",
    aura: "rgba(175, 153, 255, 0.24)",
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHex(input: { r: number; g: number; b: number }) {
  const toHex = (value: number) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(input.r)}${toHex(input.g)}${toHex(input.b)}`;
}

function mixHex(base: string, target: string, ratio: number) {
  const left = hexToRgb(base);
  const right = hexToRgb(target);
  if (!left || !right) return base;
  return rgbToHex({
    r: left.r + (right.r - left.r) * ratio,
    g: left.g + (right.g - left.g) * ratio,
    b: left.b + (right.b - left.b) * ratio,
  });
}

function buildDynamicPalette(element: string): ElementPalette {
  const baseColor = getElementColor(element, "#b9c8f5");
  return {
    petal: mixHex(baseColor, "#ffffff", 0.42),
    petalInner: mixHex(baseColor, "#3b2f58", 0.28),
    center: mixHex(baseColor, "#2d2442", 0.52),
    stem: mixHex(baseColor, "#2b7d50", 0.52),
    leaf: mixHex(baseColor, "#8ecb9d", 0.46),
    aura: `${baseColor}30`,
  };
}

function paletteForElement(element: string): ElementPalette {
  if (isKnownElementKind(element)) {
    return ELEMENT_PALETTES[element] ?? ELEMENT_PALETTES.aether;
  }
  return buildDynamicPalette(element);
}

const CATEGORY_ARCHITECTURE: Record<CategoryToken, CategoryArchitecture> = {
  salida: {
    petalCount: 5,
    outerRadius: 56,
    innerRadius: 22,
    petalWidth: 22,
    petalHeight: 54,
    petalRotationOffset: 8,
    centerRadius: 15,
    stemWidth: 10,
    leafWidth: 18,
    leafHeight: 28,
  },
  comida: {
    petalCount: 7,
    outerRadius: 50,
    innerRadius: 24,
    petalWidth: 19,
    petalHeight: 46,
    petalRotationOffset: 0,
    centerRadius: 16,
    stemWidth: 10,
    leafWidth: 16,
    leafHeight: 24,
  },
  naturaleza: {
    petalCount: 6,
    outerRadius: 58,
    innerRadius: 20,
    petalWidth: 20,
    petalHeight: 58,
    petalRotationOffset: 4,
    centerRadius: 14,
    stemWidth: 11,
    leafWidth: 19,
    leafHeight: 30,
  },
  movimiento: {
    petalCount: 7,
    outerRadius: 60,
    innerRadius: 24,
    petalWidth: 18,
    petalHeight: 60,
    petalRotationOffset: 18,
    centerRadius: 13,
    stemWidth: 9,
    leafWidth: 16,
    leafHeight: 24,
  },
  casa: {
    petalCount: 6,
    outerRadius: 46,
    innerRadius: 22,
    petalWidth: 22,
    petalHeight: 40,
    petalRotationOffset: 12,
    centerRadius: 17,
    stemWidth: 11,
    leafWidth: 18,
    leafHeight: 22,
  },
  cultura: {
    petalCount: 8,
    outerRadius: 52,
    innerRadius: 26,
    petalWidth: 17,
    petalHeight: 44,
    petalRotationOffset: 0,
    centerRadius: 12,
    stemWidth: 8,
    leafWidth: 15,
    leafHeight: 22,
  },
  escapada: {
    petalCount: 5,
    outerRadius: 64,
    innerRadius: 26,
    petalWidth: 18,
    petalHeight: 66,
    petalRotationOffset: 22,
    centerRadius: 12,
    stemWidth: 8,
    leafWidth: 15,
    leafHeight: 26,
  },
  celebracion: {
    petalCount: 9,
    outerRadius: 58,
    innerRadius: 28,
    petalWidth: 18,
    petalHeight: 48,
    petalRotationOffset: 0,
    centerRadius: 14,
    stemWidth: 10,
    leafWidth: 17,
    leafHeight: 24,
  },
  custom: {
    petalCount: 6,
    outerRadius: 52,
    innerRadius: 24,
    petalWidth: 19,
    petalHeight: 48,
    petalRotationOffset: 10,
    centerRadius: 14,
    stemWidth: 9,
    leafWidth: 16,
    leafHeight: 24,
  },
};

export const PLAN_FLOWER_BUILDER_TEMPLATE =
  "builder://plan-flower?category={category}&element={element}&family={flower_family}&rating={rating}";
export const PLAN_SEED_BUILDER_TEMPLATE =
  "builder://plan-seed?category={category}&element={element}&family={flower_family}";

function svgToDataUri(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function escapeXmlAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function buildSlotTransform(config: PlanFlowerSlotConfig) {
  return [
    `translate(${config.offsetX} ${config.offsetY})`,
    `rotate(${config.rotation} 100 102)`,
    `translate(100 102)`,
    `scale(${config.scale})`,
    `translate(-100 -102)`,
  ].join(" ");
}

function renderPlanFlowerSlot(input: {
  defaultMarkup: string;
  slotConfig: PlanFlowerSlotConfig | null;
}) {
  const config = normalizePlanFlowerSlotConfig(input.slotConfig);
  if (config && config.enabled === false) return "";
  const resolved = config ?? {
    enabled: true,
    assetPath: "",
    opacity: 1,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
  };
  const transform = buildSlotTransform(resolved);
  if (resolved.assetPath) {
    return `
      <g opacity="${resolved.opacity}" transform="${transform}">
        <image
          href="${escapeXmlAttribute(resolved.assetPath)}"
          x="0"
          y="0"
          width="200"
          height="200"
          preserveAspectRatio="xMidYMid meet"
        />
      </g>
    `;
  }
  return `
    <g opacity="${resolved.opacity}" transform="${transform}">
      ${input.defaultMarkup}
    </g>
  `;
}

function familyAccentColor(family: string, palette: ElementPalette) {
  if (family === "agua") return "#3a87c7";
  if (family === "fuego") return "#a63d1d";
  if (family === "tierra") return "#6d5f2f";
  if (family === "aire") return "#7bbccf";
  if (family === "luz") return "#f2c14e";
  if (family === "luna") return "#6d73c9";
  return palette.center;
}

function familyHaloOpacity(family: string) {
  if (family === "luz") return 0.38;
  if (family === "estrella") return 0.3;
  if (family === "luna") return 0.24;
  return 0.18;
}

function petalCountForRating(base: number, rating: number) {
  if (rating <= 1) return Math.max(4, base - 2);
  if (rating === 2) return Math.max(5, base - 1);
  if (rating === 3) return base;
  if (rating === 4) return base + 1;
  return base + 2;
}

export function normalizePlanTypeCategoryToken(value: unknown): CategoryToken {
  const raw = String(value ?? "").trim().toLowerCase();
  return CATEGORY_TOKENS.find((item) => item === raw) ?? "custom";
}

function buildFamilyMotif(input: {
  family: string;
  accentColor: string;
  palette: ElementPalette;
  rating: number;
}) {
  const count = 2 + input.rating;
  const orbitRadius = 26 + input.rating * 4;
  if (input.family === "agua") {
    return Array.from({ length: count }, (_, index) => {
      const angle = (Math.PI * 2 * index) / count;
      const x = 100 + Math.cos(angle) * orbitRadius;
      const y = 98 + Math.sin(angle) * orbitRadius;
      return `<path d="M ${x} ${y - 6} C ${x + 5} ${y - 1}, ${x + 3} ${y + 6}, ${x} ${y + 10} C ${x - 3} ${y + 6}, ${x - 5} ${y - 1}, ${x} ${y - 6} Z" fill="${input.accentColor}" opacity="0.58" />`;
    }).join("");
  }
  if (input.family === "fuego") {
    return Array.from({ length: count }, (_, index) => {
      const angle = (-Math.PI / 2) + (Math.PI * 2 * index) / count;
      const x = 100 + Math.cos(angle) * orbitRadius;
      const y = 98 + Math.sin(angle) * orbitRadius;
      return `<path d="M ${x} ${y + 10} C ${x + 6} ${y + 4}, ${x + 7} ${y - 7}, ${x} ${y - 14} C ${x - 7} ${y - 7}, ${x - 6} ${y + 4}, ${x} ${y + 10} Z" fill="${input.accentColor}" opacity="0.55" />`;
    }).join("");
  }
  if (input.family === "tierra") {
    return `<path d="M 62 150 C 78 132, 92 124, 100 120 C 108 124, 122 132, 138 150" fill="none" stroke="${input.accentColor}" stroke-width="4" stroke-linecap="round" opacity="0.55" />
    <ellipse cx="78" cy="142" rx="11" ry="6" transform="rotate(-28 78 142)" fill="${input.accentColor}" opacity="0.42" />
    <ellipse cx="122" cy="142" rx="11" ry="6" transform="rotate(28 122 142)" fill="${input.accentColor}" opacity="0.42" />`;
  }
  if (input.family === "aire") {
    return `<path d="M 58 90 C 74 70, 92 68, 110 82" fill="none" stroke="${input.accentColor}" stroke-width="3" stroke-linecap="round" opacity="0.45" />
    <path d="M 92 66 C 114 54, 136 62, 146 82" fill="none" stroke="${input.accentColor}" stroke-width="3" stroke-linecap="round" opacity="0.38" />
    <circle cx="70" cy="84" r="2.8" fill="${input.accentColor}" opacity="0.62" />
    <circle cx="142" cy="86" r="2.8" fill="${input.accentColor}" opacity="0.62" />`;
  }
  if (input.family === "luz") {
    return `<circle cx="100" cy="98" r="${34 + input.rating * 3}" fill="none" stroke="${input.accentColor}" stroke-width="5" stroke-opacity="0.28" />
    <circle cx="100" cy="98" r="${44 + input.rating * 2}" fill="none" stroke="${input.palette.petal}" stroke-width="2.5" stroke-opacity="0.22" />`;
  }
  if (input.family === "luna") {
    return `<path d="M 124 54 C 112 50, 101 53, 94 61 C 110 62, 121 74, 123 89 C 131 82, 136 71, 136 60 C 136 58, 136 56, 135 54 C 132 54, 128 54, 124 54 Z" fill="${input.accentColor}" opacity="0.42" />`;
  }
  return Array.from({ length: count }, (_, index) => {
    const angle = (-Math.PI / 2) + (Math.PI * 2 * index) / count;
    const x = 100 + Math.cos(angle) * (orbitRadius + 6);
    const y = 96 + Math.sin(angle) * (orbitRadius + 6);
    return `<path d="M ${x} ${y - 8} L ${x + 3} ${y - 1} L ${x + 10} ${y} L ${x + 4} ${y + 4} L ${x + 6} ${y + 12} L ${x} ${y + 7} L ${x - 6} ${y + 12} L ${x - 4} ${y + 4} L ${x - 10} ${y} L ${x - 3} ${y - 1} Z" fill="${input.accentColor}" opacity="0.46" />`;
  }).join("");
}

export function buildPlanFlowerSvgDataUri(input: {
  category?: string | null;
  element?: string | null;
  flowerFamily?: string | null;
  rating?: number | null;
  composerVariant?: PlanFlowerVariantConfig | null;
}) {
  const category = normalizePlanTypeCategoryToken(input.category);
  const element = normalizeElementKind(input.element);
  const family = normalizeFlowerFamily(input.flowerFamily) ?? normalizeFlowerFamily(element) ?? "estrella";
  const rating = Number.isFinite(Number(input.rating))
    ? Math.max(1, Math.min(5, Number(input.rating)))
    : 3;
  const architecture = CATEGORY_ARCHITECTURE[category];
  const palette = paletteForElement(element);
  const accentColor = familyAccentColor(family, palette);
  const petalCount = petalCountForRating(architecture.petalCount, rating);
  const petalScale = 0.84 + rating * 0.08;
  const centerRadius = architecture.centerRadius + (rating >= 4 ? 2 : 0);
  const outerPetals = Array.from({ length: petalCount }, (_, index) => {
    const angle = (360 / petalCount) * index + architecture.petalRotationOffset;
    const outerY = 102 - architecture.outerRadius * petalScale;
    return `
      <g transform="rotate(${angle} 100 102)">
        <ellipse cx="100" cy="${outerY}" rx="${architecture.petalWidth * petalScale}" ry="${architecture.petalHeight * petalScale}" fill="${palette.petal}" opacity="${0.86 + rating * 0.02}" />
      </g>
    `;
  }).join("");
  const innerPetals = Array.from({ length: petalCount }, (_, index) => {
    const angle = (360 / petalCount) * index + architecture.petalRotationOffset;
    const outerY = 102 - architecture.outerRadius * petalScale;
    return `
      <g transform="rotate(${angle} 100 102)">
        <ellipse cx="100" cy="${outerY + 8}" rx="${architecture.petalWidth * 0.56 * petalScale}" ry="${architecture.petalHeight * 0.56 * petalScale}" fill="${palette.petalInner}" opacity="0.72" />
      </g>
    `;
  }).join("");
  const innerRing =
    rating >= 3
      ? Array.from({ length: Math.max(4, petalCount - 2) }, (_, index) => {
          const angle = (360 / Math.max(4, petalCount - 2)) * index;
          const outerY = 102 - architecture.innerRadius * petalScale;
          return `
            <g transform="rotate(${angle} 100 102)">
              <ellipse cx="100" cy="${outerY}" rx="${architecture.petalWidth * 0.58}" ry="${architecture.petalHeight * 0.5}" fill="${palette.petalInner}" opacity="0.35" />
            </g>
          `;
        }).join("")
      : "";
  const extraLeaves = Array.from({ length: Math.max(2, rating) }, (_, index) => {
    const direction = index % 2 === 0 ? -1 : 1;
    const offset = 12 + Math.floor(index / 2) * 8;
    return `<ellipse cx="${100 + direction * (architecture.leafWidth + offset)}" cy="${164 + Math.floor(index / 2) * 9}" rx="${architecture.leafWidth}" ry="${architecture.leafHeight}" transform="rotate(${direction * 32} ${100 + direction * (architecture.leafWidth + offset)} ${164 + Math.floor(index / 2) * 9})" fill="${palette.leaf}" opacity="${0.38 + rating * 0.08}" />`;
  }).join("");
  const composerVariant = input.composerVariant ?? {};
  const auraMarkup = `<ellipse cx="100" cy="104" rx="${46 + rating * 6}" ry="${42 + rating * 5}" fill="${palette.aura}" opacity="${familyHaloOpacity(family)}" filter="url(#softGlow)" />`;
  const familyMarkup = buildFamilyMotif({ family, accentColor, palette, rating });
  const stemMarkup = `<rect x="${100 - architecture.stemWidth / 2}" y="118" width="${architecture.stemWidth}" height="82" rx="${architecture.stemWidth / 2}" fill="url(#stemGradient)" />`;
  const centerMarkup = `
    <circle cx="100" cy="102" r="${centerRadius}" fill="${palette.center}" />
    <circle cx="100" cy="102" r="${Math.max(4, centerRadius - 7)}" fill="${accentColor}" opacity="0.62" />
  `;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="-44 -70 288 324" fill="none">
      <defs>
        <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <linearGradient id="stemGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="${palette.stem}" />
          <stop offset="100%" stop-color="${palette.leaf}" />
        </linearGradient>
      </defs>
      ${renderPlanFlowerSlot({ defaultMarkup: auraMarkup, slotConfig: composerVariant.aura ?? null })}
      ${renderPlanFlowerSlot({ defaultMarkup: familyMarkup, slotConfig: composerVariant.family_ornament ?? null })}
      ${renderPlanFlowerSlot({ defaultMarkup: stemMarkup, slotConfig: composerVariant.stem ?? null })}
      ${renderPlanFlowerSlot({ defaultMarkup: extraLeaves, slotConfig: composerVariant.leaves ?? null })}
      ${renderPlanFlowerSlot({ defaultMarkup: outerPetals, slotConfig: composerVariant.petal_outer ?? null })}
      ${renderPlanFlowerSlot({ defaultMarkup: `${innerPetals}${innerRing}`, slotConfig: composerVariant.petal_inner ?? null })}
      ${renderPlanFlowerSlot({ defaultMarkup: centerMarkup, slotConfig: composerVariant.center ?? null })}
    </svg>
  `;
  return svgToDataUri(svg);
}

function buildSeedShellPath(category: CategoryToken) {
  if (category === "movimiento") {
    return "M 72 80 C 96 46, 146 44, 144 88 C 142 126, 104 156, 74 144 C 44 132, 46 100, 72 80 Z";
  }
  if (category === "celebracion") {
    return "M 100 44 C 126 44, 150 66, 150 98 C 150 130, 124 158, 100 164 C 76 158, 50 130, 50 98 C 50 66, 74 44, 100 44 Z";
  }
  if (category === "casa") {
    return "M 62 70 C 76 50, 124 50, 138 70 C 150 88, 150 128, 130 146 C 112 164, 88 164, 70 146 C 50 128, 50 88, 62 70 Z";
  }
  if (category === "escapada") {
    return "M 70 54 C 98 34, 148 46, 148 92 C 148 132, 112 166, 80 156 C 54 148, 42 122, 46 98 C 50 74, 56 64, 70 54 Z";
  }
  return "M 74 56 C 98 40, 136 52, 144 86 C 152 118, 126 160, 94 162 C 66 164, 42 136, 42 104 C 42 82, 54 68, 74 56 Z";
}

export function buildPlanSeedSvgDataUri(input: {
  category?: string | null;
  element?: string | null;
  flowerFamily?: string | null;
}) {
  const category = normalizePlanTypeCategoryToken(input.category);
  const element = normalizeElementKind(input.element);
  const family = normalizeFlowerFamily(input.flowerFamily) ?? "estrella";
  const palette = paletteForElement(element);
  const accentColor = familyAccentColor(family, palette);
  const familyMark =
    family === "agua"
      ? `<path d="M 112 92 C 118 100, 116 110, 110 118 C 100 116, 95 108, 96 98 C 101 92, 106 88, 112 92 Z" fill="${accentColor}" opacity="0.46" />`
      : family === "fuego"
        ? `<path d="M 106 86 C 116 94, 116 106, 106 118 C 96 108, 94 96, 106 86 Z" fill="${accentColor}" opacity="0.48" />`
        : family === "tierra"
          ? `<ellipse cx="102" cy="104" rx="14" ry="10" fill="${accentColor}" opacity="0.34" />`
          : family === "aire"
            ? `<path d="M 80 100 C 94 88, 112 88, 124 102" fill="none" stroke="${accentColor}" stroke-width="4" stroke-linecap="round" opacity="0.42" />`
            : family === "luz"
              ? `<circle cx="100" cy="100" r="28" fill="none" stroke="${accentColor}" stroke-width="5" stroke-opacity="0.28" />`
              : family === "luna"
                ? `<path d="M 122 76 C 108 74, 96 84, 94 98 C 104 92, 118 98, 124 110 C 130 102, 132 90, 130 82 C 128 80, 126 78, 122 76 Z" fill="${accentColor}" opacity="0.34" />`
                : `<path d="M 100 72 L 106 86 L 122 88 L 110 98 L 114 112 L 100 104 L 86 112 L 90 98 L 78 88 L 94 86 Z" fill="${accentColor}" opacity="0.36" />`;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 200 200" fill="none">
      <defs>
        <radialGradient id="seedGlow" cx="0.5" cy="0.45" r="0.7">
          <stop offset="0%" stop-color="${palette.aura}" stop-opacity="0.72" />
          <stop offset="100%" stop-color="${palette.aura}" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="seedFill" x1="0.2" x2="0.85" y1="0.1" y2="0.95">
          <stop offset="0%" stop-color="${palette.petal}" />
          <stop offset="100%" stop-color="${palette.petalInner}" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="76" fill="url(#seedGlow)" />
      <path d="${buildSeedShellPath(category)}" fill="url(#seedFill)" stroke="${palette.center}" stroke-width="5" />
      ${familyMark}
      <path d="M 66 92 C 78 74, 116 72, 126 84" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" opacity="0.26" />
      <circle cx="116" cy="82" r="7" fill="#ffffff" opacity="0.22" />
    </svg>
  `;
  return svgToDataUri(svg);
}
