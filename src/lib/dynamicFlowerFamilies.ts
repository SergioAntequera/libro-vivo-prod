/**
 * Dynamic flower families: extends the built-in 7 flower families with
 * admin-configurable custom families stored in the catalog_config table.
 *
 * Custom families are stored under catalog_key "custom_flower_families".
 * Each item has: code, label, color, emoji, suggested_element.
 *
 * The runtime merges built-in + custom families for display purposes.
 * The FlowerFamily TypeScript type remains the built-in literal union
 * for type safety; custom families use string at runtime.
 */

import { getCatalogItems, type CatalogItemConfig } from "@/lib/appConfig";
import {
  FLOWER_FAMILY_ORDER,
  FLOWER_FAMILY_LABELS,
  type FlowerFamily,
} from "@/lib/productDomainContracts";

export type DynamicFlowerFamily = {
  code: string;
  label: string;
  color: string;
  emoji: string;
  isBuiltIn: boolean;
};

const BUILT_IN_COLORS: Record<FlowerFamily, string> = {
  agua: "#d8ecff",
  fuego: "#ffd8d0",
  tierra: "#f6e7d1",
  aire: "#e7f5ff",
  luz: "#fff5d0",
  luna: "#efe4ff",
  estrella: "#f5e0ff",
};

const BUILT_IN_EMOJIS: Record<FlowerFamily, string> = {
  agua: "\uD83D\uDCA7",
  fuego: "\uD83D\uDD25",
  tierra: "\uD83C\uDF31",
  aire: "\uD83C\uDF2C",
  luz: "\u2728",
  luna: "\uD83C\uDF19",
  estrella: "\u2B50",
};

export function getBuiltInFlowerFamilies(): DynamicFlowerFamily[] {
  return FLOWER_FAMILY_ORDER.map((code) => ({
    code,
    label: FLOWER_FAMILY_LABELS[code],
    color: BUILT_IN_COLORS[code],
    emoji: BUILT_IN_EMOJIS[code],
    isBuiltIn: true,
  }));
}

export async function getCustomFlowerFamilies(): Promise<DynamicFlowerFamily[]> {
  try {
    const items = await getCatalogItems("custom_flower_families");
    return items.map((item: CatalogItemConfig) => ({
      code: String(item.code ?? "").trim().toLowerCase(),
      label: String(item.label ?? item.code ?? "").trim(),
      color: String(item.color ?? "#e0e0e0").trim(),
      emoji: String(item.icon ?? item.metadata?.emoji ?? "\uD83C\uDF3A").trim(),
      isBuiltIn: false,
    })).filter((f) => f.code && f.label);
  } catch {
    return [];
  }
}

export async function getAllFlowerFamilies(): Promise<DynamicFlowerFamily[]> {
  const builtIn = getBuiltInFlowerFamilies();
  const custom = await getCustomFlowerFamilies();
  const builtInCodes = new Set(builtIn.map((f) => f.code));
  const merged = [
    ...builtIn,
    ...custom.filter((f) => !builtInCodes.has(f.code)),
  ];
  return merged;
}

export function resolveDynamicFlowerFamilyLabel(
  code: string,
  customFamilies: DynamicFlowerFamily[],
): string {
  if (code in FLOWER_FAMILY_LABELS) {
    return FLOWER_FAMILY_LABELS[code as FlowerFamily];
  }
  const custom = customFamilies.find((f) => f.code === code);
  return custom?.label ?? code;
}
