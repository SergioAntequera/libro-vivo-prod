"use client";

import { deleteManagedMediaBatchForPage } from "@/lib/deleteManagedMedia";
import { getErrorMessage } from "@/lib/pageDetailUtils";
import type { CanvasObject } from "@/lib/canvasTypes";
import type { FlowerBirthRitualRatingRow } from "@/lib/flowerBirthRitual";
import type { PageRow } from "@/lib/pageDetailTypes";
import type { PlanFlowerComposerConfig } from "@/lib/planTypeFlowerComposer";

type PageSavedSnapshot = {
  canvasObjectsJson: string;
  rating: number;
  planSummary: string;
  planTypeId: string;
  isFavorite: boolean;
  isYearHighlight: boolean;
  locationLabel: string;
  locationLat: string;
  locationLng: string;
  audioUrl: string;
  audioLabel: string;
  coverPhotoUrl: string;
  managedMediaUrls: string[];
};

type PageReflectionDraft = {
  favoritePart: string;
  rememberedMoment: string;
  whatIFelt: string;
  whatItMeantToMe: string;
  whatIDiscoveredAboutYou: string;
  smallPromise: string;
};

type PageSeedContext = {
  seedTitle: string | null;
  planTypeId: string | null;
  planTypeLabel: string | null;
  planTypeCategory: string | null;
  planTypeFlowerFamily: string | null;
  planTypeFlowerAssetPath: string | null;
  planTypeFlowerBuilderConfig: PlanFlowerComposerConfig | null;
  planTypeSuggestedElement: string | null;
  linkedPlaceLabel: string | null;
  linkedPlaceKind: string | null;
  linkedRouteLabel: string | null;
};

type PlanTypeOptionLike = {
  id: string;
  label: string;
  category: string;
  flowerFamily: string | null;
  flowerAssetPath: string | null;
  flowerBuilderConfig: PlanFlowerComposerConfig;
  suggestedElement: string | null;
};

type CancelPageDetailEditParams = {
  activeGardenId: string | null;
  applyCurrentPageYearHighlight: (value: boolean) => void;
  applyLoadedAudio: (input: {
    audioReady: boolean;
    audioUrl: string;
    audioLabel: string;
  }) => void;
  applyLoadedLocation: (input: {
    label: string;
    lat: string;
    lng: string;
  }) => void;
  audioFieldsAvailable: boolean;
  currentSnapshot: PageSavedSnapshot | null;
  flowerBirthRitualPending: boolean;
  hasUnsavedChanges: boolean;
  locationFieldsAvailable: boolean;
  myProfileId: string;
  onExitEditMode: () => void;
  page: PageRow | null;
  planTypeOptions: PlanTypeOptionLike[];
  savedFlowerBirthRating: number;
  savedReflectionJson: string;
  savedSnapshot: PageSavedSnapshot | null;
  setFlowerBirthRatings: (
    next:
      | FlowerBirthRitualRatingRow[]
      | ((prev: FlowerBirthRitualRatingRow[]) => FlowerBirthRitualRatingRow[]),
  ) => void;
  setMessage: (value: string | null) => void;
  setMyReflectionDraft: (value: PageReflectionDraft) => void;
  setObjects: (value: CanvasObject[]) => void;
  setPage: (
    next:
      | PageRow
      | null
      | ((prev: PageRow | null) => PageRow | null),
  ) => void;
  setRating: (value: number) => void;
  setSeedContext: (
    next:
      | PageSeedContext
      | ((prev: PageSeedContext) => PageSeedContext),
  ) => void;
};

function normalizeReflectionText(value: unknown) {
  return String(value ?? "").trim();
}

function parseSnapshotCanvasObjects(snapshot: PageSavedSnapshot | null) {
  if (!snapshot?.canvasObjectsJson) return [];
  try {
    const parsed = JSON.parse(snapshot.canvasObjectsJson);
    return Array.isArray(parsed) ? (parsed as CanvasObject[]) : [];
  } catch {
    return [];
  }
}

function deserializeReflectionDraft(
  serialized: string | null | undefined,
): PageReflectionDraft {
  const emptyDraft: PageReflectionDraft = {
    favoritePart: "",
    rememberedMoment: "",
    whatIFelt: "",
    whatItMeantToMe: "",
    whatIDiscoveredAboutYou: "",
    smallPromise: "",
  };

  if (!serialized) return { ...emptyDraft };

  try {
    const parsed = JSON.parse(serialized) as Partial<PageReflectionDraft>;
    return {
      favoritePart: normalizeReflectionText(parsed.favoritePart),
      rememberedMoment: normalizeReflectionText(parsed.rememberedMoment),
      whatIFelt: normalizeReflectionText(parsed.whatIFelt),
      whatItMeantToMe: normalizeReflectionText(parsed.whatItMeantToMe),
      whatIDiscoveredAboutYou: normalizeReflectionText(parsed.whatIDiscoveredAboutYou),
      smallPromise: normalizeReflectionText(parsed.smallPromise),
    };
  } catch {
    return { ...emptyDraft };
  }
}

export async function cancelPageDetailEdit({
  activeGardenId,
  applyCurrentPageYearHighlight,
  applyLoadedAudio,
  applyLoadedLocation,
  audioFieldsAvailable,
  currentSnapshot,
  flowerBirthRitualPending,
  hasUnsavedChanges,
  locationFieldsAvailable,
  myProfileId,
  onExitEditMode,
  page,
  planTypeOptions,
  savedFlowerBirthRating,
  savedReflectionJson,
  savedSnapshot,
  setFlowerBirthRatings,
  setMessage,
  setMyReflectionDraft,
  setObjects,
  setPage,
  setRating,
  setSeedContext,
}: CancelPageDetailEditParams) {
  if (!page || !hasUnsavedChanges) {
    onExitEditMode();
    return;
  }

  try {
    const currentManagedMediaUrls = currentSnapshot?.managedMediaUrls ?? [];
    const savedManagedMediaUrls = new Set(savedSnapshot?.managedMediaUrls ?? []);
    const unsavedManagedMediaUrls = currentManagedMediaUrls.filter(
      (url) => !savedManagedMediaUrls.has(url),
    );

    if (unsavedManagedMediaUrls.length) {
      const cleanup = await deleteManagedMediaBatchForPage(page.id, unsavedManagedMediaUrls);
      if (cleanup.failed.length) {
        throw new Error(
          `No se pudieron descartar ${cleanup.failed.length} archivo(s) temporal(es) de la flor.`,
        );
      }
    }

    if (savedSnapshot) {
      setObjects(parseSnapshotCanvasObjects(savedSnapshot));
      setRating(savedSnapshot.rating);
      setPage((prev) =>
        prev
          ? {
              ...prev,
              plan_summary: savedSnapshot.planSummary || null,
              plan_type_id: savedSnapshot.planTypeId || null,
              is_favorite: savedSnapshot.isFavorite,
              cover_photo_url: savedSnapshot.coverPhotoUrl || null,
            }
          : prev,
      );
      applyCurrentPageYearHighlight(savedSnapshot.isYearHighlight);
      const restoredPlanType =
        planTypeOptions.find((item) => item.id === savedSnapshot.planTypeId) ?? null;
      setSeedContext((prev) => ({
        ...prev,
        planTypeId: savedSnapshot.planTypeId || null,
        planTypeLabel: restoredPlanType?.label ?? null,
        planTypeCategory: restoredPlanType?.category ?? null,
        planTypeFlowerFamily: restoredPlanType?.flowerFamily ?? null,
        planTypeFlowerAssetPath: restoredPlanType?.flowerAssetPath ?? null,
        planTypeFlowerBuilderConfig: restoredPlanType?.flowerBuilderConfig ?? null,
        planTypeSuggestedElement: restoredPlanType?.suggestedElement ?? null,
      }));
      applyLoadedLocation({
        label: locationFieldsAvailable ? savedSnapshot.locationLabel : "",
        lat: locationFieldsAvailable ? savedSnapshot.locationLat : "",
        lng: locationFieldsAvailable ? savedSnapshot.locationLng : "",
      });
      applyLoadedAudio({
        audioReady: audioFieldsAvailable,
        audioUrl: audioFieldsAvailable ? savedSnapshot.audioUrl : "",
        audioLabel: audioFieldsAvailable ? savedSnapshot.audioLabel : "",
      });
    }

    if (flowerBirthRitualPending && myProfileId) {
      setFlowerBirthRatings((prev) => {
        const others = prev.filter((entry) => entry.user_id !== myProfileId);
        if (savedFlowerBirthRating <= 0 || !activeGardenId) return others;
        return [
          ...others,
          {
            page_id: page.id,
            garden_id: activeGardenId,
            user_id: myProfileId,
            rating: savedFlowerBirthRating,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
      });
    }

    setMyReflectionDraft(deserializeReflectionDraft(savedReflectionJson));
    setMessage(null);
    onExitEditMode();
  } catch (error: unknown) {
    setMessage(getErrorMessage(error, "No se pudieron descartar los cambios de esta flor."));
  }
}
