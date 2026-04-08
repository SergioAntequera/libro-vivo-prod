import { normalizeElementCode } from "@/lib/elementsCatalog";

export const PLAN_FLOWER_SLOT_KEYS = [
  "aura",
  "stem",
  "leaves",
  "petal_outer",
  "petal_inner",
  "center",
  "family_ornament",
] as const;

export type PlanFlowerSlotKey = (typeof PLAN_FLOWER_SLOT_KEYS)[number];
export type PlanFlowerRatingKey = "1" | "2" | "3" | "4" | "5";

export type PlanFlowerSlotConfig = {
  enabled: boolean;
  assetPath: string;
  opacity: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
};

export type PlanFlowerVariantConfig = Partial<Record<PlanFlowerSlotKey, PlanFlowerSlotConfig>>;
export type PlanFlowerElementComposerConfig = Partial<
  Record<PlanFlowerRatingKey, PlanFlowerVariantConfig>
>;
export type PlanFlowerComposerConfig = Record<string, PlanFlowerElementComposerConfig>;

export const PLAN_FLOWER_RATING_KEYS: PlanFlowerRatingKey[] = ["1", "2", "3", "4", "5"];

export const PLAN_FLOWER_SLOT_LABELS: Record<PlanFlowerSlotKey, string> = {
  aura: "Aura",
  stem: "Tallo",
  leaves: "Hojas",
  petal_outer: "Petalo exterior",
  petal_inner: "Petalo interior",
  center: "Centro",
  family_ornament: "Ornamento de familia",
};

const DEFAULT_SLOT_CONFIG: PlanFlowerSlotConfig = {
  enabled: true,
  assetPath: "",
  opacity: 1,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toFiniteNumber(value: unknown, fallback: number) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

export function createDefaultPlanFlowerSlotConfig(): PlanFlowerSlotConfig {
  return { ...DEFAULT_SLOT_CONFIG };
}

export function createEmptyPlanFlowerComposerConfig(): PlanFlowerComposerConfig {
  return {};
}

export function normalizePlanFlowerRatingKey(value: unknown): PlanFlowerRatingKey {
  const raw = String(value ?? "").trim();
  if (PLAN_FLOWER_RATING_KEYS.includes(raw as PlanFlowerRatingKey)) {
    return raw as PlanFlowerRatingKey;
  }
  const numeric = Math.round(Number(raw));
  if (Number.isFinite(numeric)) {
    return String(clamp(numeric, 1, 5)) as PlanFlowerRatingKey;
  }
  return "3";
}

export function normalizePlanFlowerSlotConfig(
  value: unknown,
): PlanFlowerSlotConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  return {
    enabled: row.enabled === false ? false : true,
    assetPath: String(row.assetPath ?? "").trim(),
    opacity: clamp(toFiniteNumber(row.opacity, DEFAULT_SLOT_CONFIG.opacity), 0, 1),
    scale: clamp(toFiniteNumber(row.scale, DEFAULT_SLOT_CONFIG.scale), 0.2, 4),
    offsetX: clamp(toFiniteNumber(row.offsetX, DEFAULT_SLOT_CONFIG.offsetX), -200, 200),
    offsetY: clamp(toFiniteNumber(row.offsetY, DEFAULT_SLOT_CONFIG.offsetY), -200, 200),
    rotation: clamp(toFiniteNumber(row.rotation, DEFAULT_SLOT_CONFIG.rotation), -180, 180),
  };
}

function normalizeVariantConfig(value: unknown): PlanFlowerVariantConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  return PLAN_FLOWER_SLOT_KEYS.reduce<PlanFlowerVariantConfig>((acc, slot) => {
    const normalized = normalizePlanFlowerSlotConfig(record[slot]);
    if (normalized) acc[slot] = normalized;
    return acc;
  }, {});
}

function normalizeElementConfig(value: unknown): PlanFlowerElementComposerConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  return PLAN_FLOWER_RATING_KEYS.reduce<PlanFlowerElementComposerConfig>((acc, rating) => {
    const variant = normalizeVariantConfig(record[rating]);
    if (Object.keys(variant).length) acc[rating] = variant;
    return acc;
  }, {});
}

export function normalizePlanFlowerComposerConfig(value: unknown): PlanFlowerComposerConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  return Object.entries(record).reduce<PlanFlowerComposerConfig>((acc, [element, config]) => {
    const code = normalizeElementCode(element);
    if (!code) return acc;
    const normalized = normalizeElementConfig(config);
    if (Object.keys(normalized).length) acc[code] = normalized;
    return acc;
  }, {});
}

export function getPlanFlowerVariantConfig(input: {
  config: PlanFlowerComposerConfig | null | undefined;
  element: string | null | undefined;
  rating: number | string | null | undefined;
}) {
  const element = normalizeElementCode(input.element);
  if (!element || !input.config) return {};
  const rating = normalizePlanFlowerRatingKey(input.rating);
  return input.config[element]?.[rating] ?? {};
}

export function upsertPlanFlowerVariantSlotConfig(input: {
  config: PlanFlowerComposerConfig | null | undefined;
  element: string | null | undefined;
  rating: number | string | null | undefined;
  slot: PlanFlowerSlotKey;
  patch: Partial<PlanFlowerSlotConfig>;
}) {
  const element = normalizeElementCode(input.element);
  if (!element) return normalizePlanFlowerComposerConfig(input.config);
  const rating = normalizePlanFlowerRatingKey(input.rating);
  const config = normalizePlanFlowerComposerConfig(input.config);
  const nextSlot = {
    ...createDefaultPlanFlowerSlotConfig(),
    ...config[element]?.[rating]?.[input.slot],
    ...input.patch,
  };
  return {
    ...config,
    [element]: {
      ...(config[element] ?? {}),
      [rating]: {
        ...(config[element]?.[rating] ?? {}),
        [input.slot]: nextSlot,
      },
    },
  } satisfies PlanFlowerComposerConfig;
}
