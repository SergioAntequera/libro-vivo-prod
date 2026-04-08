import type { PlanFlowerComposerConfig } from "@/lib/planTypeFlowerComposer";
import { resolvePlanFlowerAssetPath } from "@/lib/planVisuals";

export type PageVisualSnapshot = {
  primaryVisualKind: "flower";
  primaryAssetPath: string;
  flowerAssetPath: string;
  coverPhotoUrl: string | null;
  thumbnailUrl: string | null;
  secondaryPhotoUrl: string | null;
  hasSecondaryPhoto: boolean;
};

export type PageVisualSnapshotInput = {
  element?: string | null;
  rating?: number | null;
  coverPhotoUrl?: string | null;
  thumbnailUrl?: string | null;
  planCategory?: string | null;
  planFlowerFamily?: string | null;
  planFlowerAssetPath?: string | null;
  planFlowerBuilderConfig?: PlanFlowerComposerConfig | null;
  planSuggestedElement?: string | null;
};

function normalizeText(value: string | null | undefined) {
  const next = String(value ?? "").trim();
  return next || null;
}

export function buildPageVisualSnapshot(
  input: PageVisualSnapshotInput,
): PageVisualSnapshot {
  const coverPhotoUrl = normalizeText(input.coverPhotoUrl);
  const thumbnailUrl = normalizeText(input.thumbnailUrl);
  const secondaryPhotoUrl = coverPhotoUrl ?? thumbnailUrl ?? null;
  const flowerAssetPath = resolvePlanFlowerAssetPath({
    planCategory: input.planCategory ?? null,
    planFlowerFamily: input.planFlowerFamily ?? null,
    planFlowerAssetPath: input.planFlowerAssetPath ?? null,
    planFlowerBuilderConfig: input.planFlowerBuilderConfig ?? null,
    planSuggestedElement: input.planSuggestedElement ?? null,
    element: input.element ?? null,
    rating: input.rating ?? null,
  });

  return {
    primaryVisualKind: "flower",
    primaryAssetPath: flowerAssetPath,
    flowerAssetPath,
    coverPhotoUrl,
    thumbnailUrl,
    secondaryPhotoUrl,
    hasSecondaryPhoto: Boolean(secondaryPhotoUrl),
  };
}
