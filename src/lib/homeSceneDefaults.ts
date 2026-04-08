import type { HomeSeasonTone } from "@/lib/homePageUtils";
import {
  DEFAULT_PLAN_FLOWER_ASSET,
  DEFAULT_PLAN_FLOWER_ASSET_BY_ELEMENT,
  resolvePlanFlowerAssetPath,
} from "@/lib/planVisuals";

export const DEFAULT_LANDSCAPE_ASSET =
  "/illustrations/packs/sunny-kids/landscape.svg";

export type HomeSceneTokens = {
  landscapeAsset: string;
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  hillLeft: string;
  hillRight: string;
  meadow: string;
  meadowShadow: string;
  pathOuter: string;
  pathInner: string;
  cloudLeftAsset: string;
  cloudRightAsset: string;
  decoFlowerLeftAsset: string;
  decoFlowerCenterAsset: string;
  decoFlowerRightAsset: string;
  seedAsset: string;
  sproutAsset: string;
  eventSeedBg: string;
  eventSproutBg: string;
  eventFlowerBg: string;
  eventTreeBg: string;
};

export const DEFAULT_HOME_SCENE: HomeSceneTokens = {
  landscapeAsset: "",
  skyTop: "#d8f2ff",
  skyMid: "#d6f5c7",
  skyBottom: "#bfe59a",
  hillLeft: "#86c95e",
  hillRight: "#70b64f",
  meadow: "#5ca23f",
  meadowShadow: "#6ab04c",
  pathOuter: "#e1c28a",
  pathInner: "#f7e6bc",
  cloudLeftAsset: "/stickers/sticker_cloud.svg",
  cloudRightAsset: "/stickers/sticker_cloud.svg",
  decoFlowerLeftAsset: "/illustrations/flowers/daisy.svg",
  decoFlowerCenterAsset: "/illustrations/flowers/rose.svg",
  decoFlowerRightAsset: "/illustrations/flowers/tulip.svg",
  seedAsset: "/stickers/sticker_seed.svg",
  sproutAsset: "/stickers/sticker_leaf.svg",
  eventSeedBg: "#fff6de",
  eventSproutBg: "#eff8e8",
  eventFlowerBg: "#fff7fb",
  eventTreeBg: "#f3f9ff",
};

export const DEFAULT_FLOWER_ICON_BY_ELEMENT: Record<string, string> =
  DEFAULT_PLAN_FLOWER_ASSET_BY_ELEMENT;

export const DEFAULT_FLOWER_ICON = DEFAULT_PLAN_FLOWER_ASSET;

export function resolveFlowerAssetPathByRating(input: {
  planFlowerAssetPath?: string | null;
  planCategory?: string | null;
  planFlowerFamily?: string | null;
  planSuggestedElement?: string | null;
  element?: string | null;
  rating?: number | null;
}) {
  return resolvePlanFlowerAssetPath({
    planFlowerAssetPath: input.planFlowerAssetPath,
    planCategory: input.planCategory,
    planFlowerFamily: input.planFlowerFamily,
    planSuggestedElement: input.planSuggestedElement,
    element: input.element,
    rating: input.rating,
    fallbackFlowerByElement: DEFAULT_FLOWER_ICON_BY_ELEMENT,
    defaultFlowerAssetPath: DEFAULT_FLOWER_ICON,
  });
}

export const DEFAULT_TREE_ICON_BY_TIER: Record<string, string> = {
  bronze: "/stickers/sticker_tree_bronze.svg",
  silver: "/stickers/sticker_tree_silver.svg",
  gold: "/stickers/sticker_tree_gold.svg",
  diamond: "/stickers/sticker_tree_diamond.svg",
};

export const DEFAULT_TREE_ICON = "/stickers/sticker_tree_bronze.svg";

export const SEASON_THEME: Record<
  HomeSeasonTone,
  {
    label: string;
    tint: string;
    pathGlow: string;
    skyWash: string;
  }
> = {
  spring: {
    label: "Primavera",
    tint: "linear-gradient(to bottom, rgba(232,255,226,0.42), rgba(255,255,255,0))",
    pathGlow: "#8ed59f",
    skyWash: "rgba(190, 245, 207, 0.24)",
  },
  summer: {
    label: "Verano",
    tint: "linear-gradient(to bottom, rgba(255,244,190,0.3), rgba(255,255,255,0))",
    pathGlow: "#f2cf87",
    skyWash: "rgba(255, 239, 179, 0.2)",
  },
  autumn: {
    label: "Otoño",
    tint: "linear-gradient(to bottom, rgba(255,226,198,0.34), rgba(255,255,255,0))",
    pathGlow: "#e8b590",
    skyWash: "rgba(255, 217, 188, 0.2)",
  },
  winter: {
    label: "Invierno",
    tint: "linear-gradient(to bottom, rgba(220,235,255,0.34), rgba(255,255,255,0))",
    pathGlow: "#a9c6ea",
    skyWash: "rgba(209, 226, 248, 0.22)",
  },
};
