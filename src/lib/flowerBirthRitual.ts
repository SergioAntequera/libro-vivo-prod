import type { CanvasObject } from "@/lib/canvasTypes";

export type FlowerBirthRitualRow = {
  page_id: string;
  garden_id: string;
  seed_id: string | null;
  activated_at: string;
  completed_at: string | null;
  completed_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type FlowerBirthRitualRatingRow = {
  page_id: string;
  garden_id: string;
  user_id: string;
  rating: number;
  ready_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FlowerBirthRitualSnapshot = {
  planSummary: string;
  planTypeId: string;
  isFavorite: boolean;
  isYearHighlight: boolean;
  rating: number;
  canvasObjects: CanvasObject[];
  locationLabel: string;
  locationLat: string;
  locationLng: string;
  audioUrl: string;
  audioLabel: string;
  coverPhotoUrl: string;
};

function normalizeText(value: string | null | undefined) {
  return String(value ?? "");
}

export function normalizeFlowerBirthRitualRow(
  raw: Record<string, unknown> | null | undefined,
): FlowerBirthRitualRow | null {
  if (!raw) return null;
  const pageId = String(raw.page_id ?? "").trim();
  const gardenId = String(raw.garden_id ?? "").trim();
  if (!pageId || !gardenId) return null;
  return {
    page_id: pageId,
    garden_id: gardenId,
    seed_id: String(raw.seed_id ?? "").trim() || null,
    activated_at: String(raw.activated_at ?? "").trim() || new Date(0).toISOString(),
    completed_at: String(raw.completed_at ?? "").trim() || null,
    completed_by_user_id: String(raw.completed_by_user_id ?? "").trim() || null,
    created_at: String(raw.created_at ?? "").trim() || new Date(0).toISOString(),
    updated_at: String(raw.updated_at ?? "").trim() || new Date(0).toISOString(),
  };
}

export function normalizeFlowerBirthRitualRatingRow(
  raw: Record<string, unknown> | null | undefined,
): FlowerBirthRitualRatingRow | null {
  if (!raw) return null;
  const pageId = String(raw.page_id ?? "").trim();
  const gardenId = String(raw.garden_id ?? "").trim();
  const userId = String(raw.user_id ?? "").trim();
  const rating = Number(raw.rating);
  if (!pageId || !gardenId || !userId || !Number.isFinite(rating)) return null;
  return {
    page_id: pageId,
    garden_id: gardenId,
    user_id: userId,
    rating,
    ready_at: String(raw.ready_at ?? "").trim() || null,
    created_at: String(raw.created_at ?? "").trim() || new Date(0).toISOString(),
    updated_at: String(raw.updated_at ?? "").trim() || new Date(0).toISOString(),
  };
}

export function buildFlowerBirthRitualSnapshot(input: {
  planSummary: string | null | undefined;
  planTypeId: string | null | undefined;
  isFavorite: boolean | null | undefined;
  isYearHighlight: boolean | null | undefined;
  rating: number | null | undefined;
  canvasObjects: CanvasObject[] | null | undefined;
  locationLabel: string | null | undefined;
  locationLat: string | null | undefined;
  locationLng: string | null | undefined;
  audioUrl: string | null | undefined;
  audioLabel: string | null | undefined;
  coverPhotoUrl: string | null | undefined;
}): FlowerBirthRitualSnapshot {
  return {
    planSummary: normalizeText(input.planSummary),
    planTypeId: normalizeText(input.planTypeId),
    isFavorite: input.isFavorite === true,
    isYearHighlight: input.isYearHighlight === true,
    rating: Number.isFinite(input.rating) ? Number(input.rating) : 0,
    canvasObjects: Array.isArray(input.canvasObjects) ? input.canvasObjects : [],
    locationLabel: normalizeText(input.locationLabel),
    locationLat: normalizeText(input.locationLat),
    locationLng: normalizeText(input.locationLng),
    audioUrl: normalizeText(input.audioUrl),
    audioLabel: normalizeText(input.audioLabel),
    coverPhotoUrl: normalizeText(input.coverPhotoUrl),
  };
}

export function serializeFlowerBirthRitualSnapshot(snapshot: FlowerBirthRitualSnapshot) {
  return JSON.stringify({
    planSummary: snapshot.planSummary,
    planTypeId: snapshot.planTypeId,
    isFavorite: snapshot.isFavorite,
    isYearHighlight: snapshot.isYearHighlight,
    rating: snapshot.rating,
    canvasObjects: snapshot.canvasObjects,
    locationLabel: snapshot.locationLabel,
    locationLat: snapshot.locationLat,
    locationLng: snapshot.locationLng,
    audioUrl: snapshot.audioUrl,
    audioLabel: snapshot.audioLabel,
    coverPhotoUrl: snapshot.coverPhotoUrl,
  });
}
