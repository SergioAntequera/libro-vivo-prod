import type { ElementKind } from "@/lib/canvasTypes";
import {
  getFlowerFamilyFromLegacyElement,
  normalizeElementKind,
  normalizeFlowerFamily,
  type FlowerFamily,
} from "@/lib/productDomainContracts";
import {
  getPlanFlowerVariantConfig,
  normalizePlanFlowerComposerConfig,
  type PlanFlowerComposerConfig,
} from "@/lib/planTypeFlowerComposer";
import {
  buildPlanFlowerSvgDataUri,
  buildPlanSeedSvgDataUri,
  normalizePlanTypeCategoryToken,
  PLAN_FLOWER_BUILDER_TEMPLATE,
  PLAN_SEED_BUILDER_TEMPLATE,
} from "@/lib/planTypeVisualBuilder";

export const DEFAULT_PLAN_FLOWER_ASSET_BY_ELEMENT: Record<ElementKind, string> = {
  fire: "/illustrations/flowers/rose.svg",
  water: "/illustrations/flowers/tulip.svg",
  air: "/illustrations/flowers/daisy.svg",
  earth: "/illustrations/flowers/sunflower.svg",
  aether: "/illustrations/flowers/rose.svg",
};

export const DEFAULT_PLAN_FLOWER_ASSET_BY_FAMILY: Record<FlowerFamily, string> = {
  agua: "/illustrations/flowers/tulip.svg",
  fuego: "/illustrations/flowers/rose.svg",
  tierra: "/illustrations/flowers/sunflower.svg",
  aire: "/illustrations/flowers/daisy.svg",
  luz: "/illustrations/flowers/rose.svg",
  luna: "/illustrations/flowers/tulip.svg",
  estrella: "/illustrations/flowers/daisy.svg",
};

export const DEFAULT_PLAN_FLOWER_ASSET = DEFAULT_PLAN_FLOWER_ASSET_BY_ELEMENT.aether;
export const DEFAULT_PLAN_SEED_ASSET = "/stickers/sticker_seed.svg";

function isBuilderSpec(value: string) {
  return value.startsWith("builder://");
}

function resolveBuilderSpec(spec: string) {
  try {
    const url = new URL(spec);
    const target = `${url.hostname}${url.pathname}`.replace(/^\/+/, "");
    if (target === "plan-flower") {
      return buildPlanFlowerSvgDataUri({
        category: url.searchParams.get("category"),
        element: url.searchParams.get("element"),
        flowerFamily: url.searchParams.get("family"),
        rating: Number(url.searchParams.get("rating") ?? "3"),
      });
    }
    if (target === "plan-seed") {
      return buildPlanSeedSvgDataUri({
        category: url.searchParams.get("category"),
        element: url.searchParams.get("element"),
        flowerFamily: url.searchParams.get("family"),
      });
    }
  } catch {
    return null;
  }
  return null;
}

function resolveFallbackFlowerFamily(input: {
  planFlowerFamily?: string | null;
  planSuggestedElement?: string | null;
  element?: string | null;
}) {
  return (
    normalizeFlowerFamily(input.planFlowerFamily) ??
    getFlowerFamilyFromLegacyElement(input.planSuggestedElement ?? input.element ?? "aether")
  );
}

export function resolvePlanFlowerAssetPath(input: {
  planFlowerAssetPath?: string | null;
  planFlowerBuilderConfig?: PlanFlowerComposerConfig | null;
  planCategory?: string | null;
  planFlowerFamily?: string | null;
  planSuggestedElement?: string | null;
  element?: string | null;
  rating?: number | null;
  fallbackFlowerByFamily?: Record<string, string>;
  fallbackFlowerByElement?: Record<string, string>;
  defaultFlowerAssetPath?: string;
}) {
  const safeRating = Number.isFinite(Number(input.rating))
    ? Math.max(1, Math.min(5, Number(input.rating)))
    : 3;
  const resolvedElement = normalizeElementKind(
    input.planSuggestedElement ?? input.element ?? "aether",
  );
  const resolvedCategory = normalizePlanTypeCategoryToken(input.planCategory);
  const resolvedFlowerFamily = resolveFallbackFlowerFamily(input);
  const composerConfig = normalizePlanFlowerComposerConfig(input.planFlowerBuilderConfig);
  const composerVariant = getPlanFlowerVariantConfig({
    config: composerConfig,
    element: resolvedElement,
    rating: safeRating,
  });
  const template = String(input.planFlowerAssetPath ?? "").trim();

  if (Object.keys(composerVariant).length) {
    return buildPlanFlowerSvgDataUri({
      category: resolvedCategory,
      element: resolvedElement,
      flowerFamily: resolvedFlowerFamily,
      rating: safeRating,
      composerVariant,
    });
  }

  if (template) {
    const resolvedTemplate = template
      .replaceAll("{rating}", String(safeRating))
      .replaceAll("{stars}", String(safeRating))
      .replaceAll("{element}", resolvedElement)
      .replaceAll("{flower_family}", resolvedFlowerFamily)
      .replaceAll("{category}", resolvedCategory);
    if (isBuilderSpec(resolvedTemplate)) {
      return resolveBuilderSpec(resolvedTemplate) ?? DEFAULT_PLAN_FLOWER_ASSET;
    }
    return resolvedTemplate;
  }

  return buildPlanFlowerSvgDataUri({
    category: resolvedCategory,
    element: resolvedElement,
    flowerFamily: resolvedFlowerFamily,
    rating: safeRating,
    composerVariant,
  });
}

export function resolvePlanSeedAssetPath(input: {
  planSeedAssetPath?: string | null;
  planCategory?: string | null;
  planFlowerFamily?: string | null;
  planSuggestedElement?: string | null;
  fallbackSeedAssetPath?: string | null;
}) {
  const planSeed = String(input.planSeedAssetPath ?? "").trim();
  if (planSeed) {
    const resolvedSeed = planSeed
      .replaceAll("{category}", normalizePlanTypeCategoryToken(input.planCategory))
      .replaceAll(
        "{element}",
        normalizeElementKind(input.planSuggestedElement ?? "aether"),
      )
      .replaceAll(
        "{flower_family}",
        resolveFallbackFlowerFamily({
          planFlowerFamily: input.planFlowerFamily,
          planSuggestedElement: input.planSuggestedElement,
        }),
      );
    if (isBuilderSpec(resolvedSeed)) {
      return resolveBuilderSpec(resolvedSeed) ?? DEFAULT_PLAN_SEED_ASSET;
    }
    return resolvedSeed;
  }

  const fallbackSeed = String(input.fallbackSeedAssetPath ?? "").trim();
  if (fallbackSeed) return fallbackSeed;

  return buildPlanSeedSvgDataUri({
    category: input.planCategory,
    element: input.planSuggestedElement,
    flowerFamily: input.planFlowerFamily,
  });
}

export { PLAN_FLOWER_BUILDER_TEMPLATE, PLAN_SEED_BUILDER_TEMPLATE };
