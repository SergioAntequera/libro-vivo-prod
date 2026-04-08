"use client";

import {
  buildPageUpdateAttempts,
  getErrorMessage,
  isMissingAudioColumnsError,
  isMissingCareColumnsError,
  isMissingLocationColumnsError,
  resolveLocationPayload,
} from "@/lib/pageDetailUtils";
import { collectManagedPageMediaUrls } from "@/lib/pageManagedMedia";
import { supabase } from "@/lib/supabase";
import { uploadPageThumbnail } from "@/lib/uploadThumb";
import type { CanvasObject } from "@/lib/canvasTypes";
import {
  normalizeFlowerBirthRitualRatingRow,
  type FlowerBirthRitualRatingRow,
  type FlowerBirthRitualRow,
} from "@/lib/flowerBirthRitual";
import {
  buildFlowerPagePersistedSnapshot,
  type FlowerPagePersistedSnapshot,
} from "@/lib/flowerPageRevision";
import {
  isSchemaNotReadyError,
  withGardenIdOnInsert,
  withGardenScope,
} from "@/lib/gardens";

type CareMood = "wilted" | "healthy" | "shiny";

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

type MemoryReflectionRow = {
  id: string;
  user_id: string;
  favorite_part: string | null;
  remembered_moment: string | null;
  what_i_felt: string | null;
  what_it_meant_to_me: string | null;
  what_i_discovered_about_you: string | null;
  small_promise: string | null;
};

type PageRowLike = {
  id: string;
  plan_summary?: string | null | undefined;
  plan_type_id?: string | null | undefined;
  is_favorite: boolean;
  cover_photo_url?: string | null | undefined;
};

type SavePageDetailParams = {
  activeGardenId: string | null;
  audioFieldsAvailable: boolean;
  audioLabel: string;
  audioUrl: string;
  currentReflectionJson: string;
  exportCanvasPng: () => string | null | undefined;
  flowerBirthRatings: FlowerBirthRitualRatingRow[];
  flowerBirthRatingsAvailable: boolean;
  flowerBirthRitualAvailable: boolean;
  flowerBirthRitualPending: boolean;
  isYearHighlight: boolean;
  localFlowerBirthRating: number;
  locationFieldsAvailable: boolean;
  locationLabel: string;
  locationLat: string;
  locationLng: string;
  moodState: CareMood;
  myProfileId: string;
  myReflectionDraft: PageReflectionDraft;
  objects: CanvasObject[];
  page: PageRowLike | null;
  rating: number;
  reflections: MemoryReflectionRow[];
  recordFlowerRevision: (
    previousSnapshot: FlowerPagePersistedSnapshot | null,
    nextSnapshot: FlowerPagePersistedSnapshot,
  ) => Promise<void>;
  reflectionFieldsAvailable: boolean;
  requiredSharedParticipants: number;
  savedReflectionJson: string;
  savedRevisionSnapshot: FlowerPagePersistedSnapshot | null;
  savedSnapshot: PageSavedSnapshot | null;
  setAudioFieldsAvailable: (value: boolean) => void;
  setContextSection: (value: "location" | "audio" | "video") => void;
  setDetailSection: (value: "canvas" | "reflections" | "context") => void;
  setFlowerBirthRatings: (
    next:
      | FlowerBirthRitualRatingRow[]
      | ((prev: FlowerBirthRitualRatingRow[]) => FlowerBirthRitualRatingRow[]),
  ) => void;
  setFlowerBirthRatingsAvailable: (value: boolean) => void;
  setFlowerBirthRitual: (
    next:
      | FlowerBirthRitualRow
      | null
      | ((prev: FlowerBirthRitualRow | null) => FlowerBirthRitualRow | null),
  ) => void;
  setLocationFieldsAvailable: (value: boolean) => void;
  setMessage: (value: string | null) => void;
  setPageMode: (value: "read" | "edit") => void;
  setRating: (value: number) => void;
  setReflections: (
    next:
      | MemoryReflectionRow[]
      | ((prev: MemoryReflectionRow[]) => MemoryReflectionRow[]),
  ) => void;
  setSavedFlowerBirthRating: (value: number) => void;
  setSavedReflectionJson: (value: string) => void;
  setSavedSnapshot: (
    next:
      | PageSavedSnapshot
      | null
      | ((prev: PageSavedSnapshot | null) => PageSavedSnapshot | null),
  ) => void;
  setSaving: (value: boolean) => void;
};

function normalizeSnapshotText(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function normalizeReflectionText(value: unknown) {
  return String(value ?? "").trim();
}

function buildPageSavedSnapshot(input: {
  objects: CanvasObject[];
  rating: number;
  planSummary: string | null | undefined;
  planTypeId: string | null | undefined;
  isFavorite: boolean | null | undefined;
  isYearHighlight: boolean | null | undefined;
  locationLabel: string;
  locationLat: string;
  locationLng: string;
  audioUrl: string;
  audioLabel: string;
  coverPhotoUrl: string | null | undefined;
}) {
  return {
    canvasObjectsJson: JSON.stringify(input.objects ?? []),
    rating: Number.isFinite(input.rating) ? input.rating : 0,
    planSummary: normalizeSnapshotText(input.planSummary),
    planTypeId: normalizeSnapshotText(input.planTypeId),
    isFavorite: input.isFavorite === true,
    isYearHighlight: input.isYearHighlight === true,
    locationLabel: normalizeSnapshotText(input.locationLabel),
    locationLat: normalizeSnapshotText(input.locationLat),
    locationLng: normalizeSnapshotText(input.locationLng),
    audioUrl: normalizeSnapshotText(input.audioUrl),
    audioLabel: normalizeSnapshotText(input.audioLabel),
    coverPhotoUrl: normalizeSnapshotText(input.coverPhotoUrl),
    managedMediaUrls: collectManagedPageMediaUrls({
      audioUrl: input.audioUrl,
      coverPhotoUrl: input.coverPhotoUrl,
      canvasObjects: input.objects,
    }).sort(),
  } satisfies PageSavedSnapshot;
}

export async function savePageDetail({
  activeGardenId,
  audioFieldsAvailable,
  audioLabel,
  audioUrl,
  currentReflectionJson,
  exportCanvasPng,
  flowerBirthRatings,
  flowerBirthRatingsAvailable,
  flowerBirthRitualAvailable,
  flowerBirthRitualPending,
  isYearHighlight,
  localFlowerBirthRating,
  locationFieldsAvailable,
  locationLabel,
  locationLat,
  locationLng,
  moodState,
  myProfileId,
  myReflectionDraft,
  objects,
  page,
  rating,
  recordFlowerRevision,
  reflectionFieldsAvailable,
  reflections,
  requiredSharedParticipants,
  savedReflectionJson,
  savedRevisionSnapshot,
  savedSnapshot,
  setAudioFieldsAvailable,
  setContextSection,
  setDetailSection,
  setFlowerBirthRatings,
  setFlowerBirthRatingsAvailable,
  setFlowerBirthRitual,
  setLocationFieldsAvailable,
  setMessage,
  setPageMode,
  setRating,
  setReflections,
  setSavedFlowerBirthRating,
  setSavedReflectionJson,
  setSavedSnapshot,
  setSaving,
}: SavePageDetailParams) {
  if (!page) return;

  setSaving(true);
  setMessage(null);
  let ritualCompleted = false;

  const updatePageRow = async (payload: Record<string, unknown>) =>
    await withGardenScope(supabase.from("pages"), activeGardenId)
      .update(payload)
      .eq("id", page.id);

  try {
    let resolvedPageRating = flowerBirthRitualPending ? rating : (savedSnapshot?.rating ?? rating);
    let resolvedLocalFlowerBirthRating = localFlowerBirthRating;
    let ratingVotesForRitual = flowerBirthRatings;
    const previousRevisionSnapshot = savedRevisionSnapshot;

    if (flowerBirthRitualPending && flowerBirthRatingsAvailable && activeGardenId && myProfileId) {
      if (resolvedLocalFlowerBirthRating > 0) {
        const ratingPayload = withGardenIdOnInsert(
          {
            page_id: page.id,
            user_id: myProfileId,
            rating: resolvedLocalFlowerBirthRating,
          },
          activeGardenId,
        );

        const { error: ratingSaveError } = await supabase
          .from("flower_birth_ritual_ratings")
          .upsert(ratingPayload, { onConflict: "page_id,user_id" });

        if (ratingSaveError && !isSchemaNotReadyError(ratingSaveError)) {
          throw ratingSaveError;
        }
      }

      const { data: ratingRows, error: ratingsLoadError } = await withGardenScope(
        supabase
          .from("flower_birth_ritual_ratings")
          .select("page_id,garden_id,user_id,rating,created_at,updated_at")
          .eq("page_id", page.id),
        activeGardenId,
      );

      if (ratingsLoadError) {
        if (isSchemaNotReadyError(ratingsLoadError)) {
          setFlowerBirthRatingsAvailable(false);
          ratingVotesForRitual = [];
        } else {
          throw ratingsLoadError;
        }
      } else {
        ratingVotesForRitual = (
          ((ratingRows as Array<Record<string, unknown>> | null) ?? [])
            .map((row) => normalizeFlowerBirthRitualRatingRow(row))
            .filter((row): row is FlowerBirthRitualRatingRow => row !== null)
        );
        setFlowerBirthRatings(ratingVotesForRitual);
        resolvedLocalFlowerBirthRating =
          ratingVotesForRitual.find((entry) => entry.user_id === myProfileId)?.rating ?? 0;
        setSavedFlowerBirthRating(resolvedLocalFlowerBirthRating);
      }

      if (ratingVotesForRitual.length >= requiredSharedParticipants) {
        const total = ratingVotesForRitual.reduce((sum, entry) => sum + entry.rating, 0);
        resolvedPageRating = Number((total / ratingVotesForRitual.length).toFixed(2));
      }
    }

    const ritualCanBeCompleted =
      flowerBirthRitualPending &&
      (requiredSharedParticipants <= 1 ||
        ratingVotesForRitual.length >= requiredSharedParticipants);

    const nextSavedSnapshot = buildPageSavedSnapshot({
      objects,
      rating: resolvedPageRating,
      planSummary: page.plan_summary ?? "",
      planTypeId: page.plan_type_id ?? null,
      isFavorite: page.is_favorite,
      isYearHighlight,
      locationLabel,
      locationLat,
      locationLng,
      audioUrl,
      audioLabel,
      coverPhotoUrl: page.cover_photo_url ?? null,
    });
    const basePayload = {
      canvas_objects: objects,
      rating: resolvedPageRating === 0 ? null : resolvedPageRating,
      plan_summary: String(page.plan_summary ?? "").trim() || null,
      mood_state: moodState,
    };
    const fullPayload = { ...basePayload };

    const { locationPayload } = resolveLocationPayload({
      locationFieldsAvailable,
      locationLabel,
      locationLat,
      locationLng,
    });
    const audioPayload = audioFieldsAvailable
      ? {
          audio_url: audioUrl.trim() || null,
          audio_label: audioLabel.trim() || null,
        }
      : {};

    const attempts = buildPageUpdateAttempts({
      basePayload,
      fullPayload,
      locationPayload,
      audioPayload,
      locationFieldsAvailable,
      audioFieldsAvailable,
    });

    let lastError: { message: string } | null = null;
    for (const attempt of attempts) {
      const { error } = await updatePageRow(attempt.payload);
      if (!error) {
        lastError = null;
        break;
      }
      lastError = error;
      if (attempt.usesLocation && isMissingLocationColumnsError(error.message)) {
        setLocationFieldsAvailable(false);
        continue;
      }
      if (attempt.usesAudio && isMissingAudioColumnsError(error.message)) {
        setAudioFieldsAvailable(false);
        continue;
      }
      if (attempt.usesCare && isMissingCareColumnsError(error.message)) {
        continue;
      }
      break;
    }

    if (lastError) throw lastError;

    if (reflectionFieldsAvailable && activeGardenId && myProfileId) {
      const reflectionPayload = {
        favorite_part: normalizeReflectionText(myReflectionDraft.favoritePart) || null,
        remembered_moment: normalizeReflectionText(myReflectionDraft.rememberedMoment) || null,
        what_i_felt: normalizeReflectionText(myReflectionDraft.whatIFelt) || null,
        what_it_meant_to_me: normalizeReflectionText(myReflectionDraft.whatItMeantToMe) || null,
        what_i_discovered_about_you:
          normalizeReflectionText(myReflectionDraft.whatIDiscoveredAboutYou) || null,
        small_promise: normalizeReflectionText(myReflectionDraft.smallPromise) || null,
      };

      const hasReflectionContent = Object.values(reflectionPayload).some((value) => Boolean(value));
      const existingReflection = reflections.find((row) => row.user_id === myProfileId) ?? null;

      if (hasReflectionContent) {
        const upsertQuery = withGardenScope(
          supabase
            .from("memory_reflections")
            .upsert(
              {
                garden_id: activeGardenId,
                page_id: page.id,
                user_id: myProfileId,
                ...reflectionPayload,
              },
              { onConflict: "page_id,user_id" },
            )
            .select(
              "id,user_id,favorite_part,remembered_moment,what_i_felt,what_it_meant_to_me,what_i_discovered_about_you,small_promise",
            )
            .single(),
          activeGardenId,
        );
        const { data: savedReflection, error: reflectionSaveError } = await upsertQuery;
        if (reflectionSaveError) throw reflectionSaveError;

        const normalizedReflection = savedReflection as MemoryReflectionRow | null;
        if (normalizedReflection) {
          setReflections((prev) => {
            const filtered = prev.filter((row) => row.user_id !== myProfileId);
            return [...filtered, normalizedReflection];
          });
        }
      } else if (existingReflection?.id) {
        const deleteQuery = withGardenScope(
          supabase
            .from("memory_reflections")
            .delete()
            .eq("id", existingReflection.id),
          activeGardenId,
        );
        const { error: reflectionDeleteError } = await deleteQuery;
        if (reflectionDeleteError) throw reflectionDeleteError;
        setReflections((prev) => prev.filter((row) => row.id !== existingReflection.id));
      }
    }

    const nextRevisionSnapshot = buildFlowerPagePersistedSnapshot({
      planSummary: page.plan_summary ?? "",
      planTypeId: page.plan_type_id ?? null,
      isFavorite: page.is_favorite,
      isYearHighlight,
      rating: resolvedPageRating,
      canvasObjects: objects,
      locationLabel,
      locationLat,
      locationLng,
      audioUrl,
      audioLabel,
      coverPhotoUrl: page.cover_photo_url ?? null,
      reflectionJson: currentReflectionJson,
    });
    await recordFlowerRevision(previousRevisionSnapshot, nextRevisionSnapshot);

    setSavedSnapshot(nextSavedSnapshot);
    setRating(resolvedPageRating);
    setSavedReflectionJson(currentReflectionJson);

    try {
      const png = exportCanvasPng();
      if (png) {
        const url = await uploadPageThumbnail(page.id, png);
        await updatePageRow({ thumbnail_url: url });
      }
    } catch {
      // keep save success even if thumbnail fails
    }

    if (flowerBirthRitualPending && flowerBirthRitualAvailable && activeGardenId) {
      if (ritualCanBeCompleted) {
        const completionTimestamp = new Date().toISOString();
        const { error: ritualCompleteError } = await withGardenScope(
          supabase
            .from("flower_birth_rituals")
            .update({
              completed_at: completionTimestamp,
              completed_by_user_id: myProfileId || null,
            })
            .eq("page_id", page.id),
          activeGardenId,
        );

        if (ritualCompleteError && !isSchemaNotReadyError(ritualCompleteError)) {
          throw ritualCompleteError;
        }

        if (!ritualCompleteError) {
          ritualCompleted = true;
          setFlowerBirthRitual((prev) =>
            prev
              ? {
                  ...prev,
                  completed_at: completionTimestamp,
                  completed_by_user_id: myProfileId || null,
                }
              : prev,
          );
        }
      } else {
        setMessage(
          "Cambios guardados. Para cerrar el nacimiento de la flor, teneis que estar las dos personas dentro y dejar cada una su valoracion.",
        );
      }
    }

    setPageMode(flowerBirthRitualPending && !ritualCanBeCompleted ? "edit" : "read");
    setDetailSection("canvas");
    setContextSection("location");
    if (!flowerBirthRitualPending || ritualCanBeCompleted) {
      setMessage(
        flowerBirthRitualPending
          ? "Flor guardada y nacimiento compartido cerrado."
          : "Guardado OK",
      );
    }
  } catch (error: unknown) {
    setMessage(getErrorMessage(error, "Error guardando"));
    return { ritualCompleted: false };
  } finally {
    setSaving(false);
  }

  return { ritualCompleted: !flowerBirthRitualPending || ritualCompleted };
}
