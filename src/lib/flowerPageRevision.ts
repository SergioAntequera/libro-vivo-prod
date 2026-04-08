import type { CanvasObject } from "@/lib/canvasTypes";

export type FlowerPagePersistedSnapshot = {
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
  reflectionJson: string;
};

export type FlowerPageRevisionChangeField =
  | "summary"
  | "plan_type"
  | "favorite"
  | "highlight"
  | "rating"
  | "canvas"
  | "location"
  | "audio"
  | "cover"
  | "reflections";

export type FlowerPageRevisionSummary = {
  changedFields: FlowerPageRevisionChangeField[];
  canvasAddedCount: number;
  canvasRemovedCount: number;
};

export type FlowerPageRevisionRow = {
  id: string;
  page_id: string;
  garden_id: string;
  snapshot: FlowerPagePersistedSnapshot;
  summary: FlowerPageRevisionSummary;
  actor_user_id: string | null;
  actor_name: string | null;
  created_at: string;
};

function normalizeText(value: unknown) {
  return String(value ?? "");
}

export function buildFlowerPagePersistedSnapshot(input: {
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
  reflectionJson: string | null | undefined;
}): FlowerPagePersistedSnapshot {
  return {
    planSummary: normalizeText(input.planSummary).trim(),
    planTypeId: normalizeText(input.planTypeId).trim(),
    isFavorite: input.isFavorite === true,
    isYearHighlight: input.isYearHighlight === true,
    rating: Number.isFinite(input.rating) ? Number(input.rating) : 0,
    canvasObjects: Array.isArray(input.canvasObjects) ? input.canvasObjects : [],
    locationLabel: normalizeText(input.locationLabel).trim(),
    locationLat: normalizeText(input.locationLat).trim(),
    locationLng: normalizeText(input.locationLng).trim(),
    audioUrl: normalizeText(input.audioUrl).trim(),
    audioLabel: normalizeText(input.audioLabel).trim(),
    coverPhotoUrl: normalizeText(input.coverPhotoUrl).trim(),
    reflectionJson: normalizeText(input.reflectionJson).trim(),
  };
}

export function serializeFlowerPagePersistedSnapshot(snapshot: FlowerPagePersistedSnapshot) {
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
    reflectionJson: snapshot.reflectionJson,
  });
}

export function buildFlowerPageRevisionSummary(
  previous: FlowerPagePersistedSnapshot | null,
  next: FlowerPagePersistedSnapshot,
): FlowerPageRevisionSummary {
  const changedFields: FlowerPageRevisionChangeField[] = [];
  const previousCanvasCount = previous?.canvasObjects.length ?? 0;
  const nextCanvasCount = next.canvasObjects.length;

  if (!previous || previous.planSummary !== next.planSummary) changedFields.push("summary");
  if (!previous || previous.planTypeId !== next.planTypeId) changedFields.push("plan_type");
  if (!previous || previous.isFavorite !== next.isFavorite) changedFields.push("favorite");
  if (!previous || previous.isYearHighlight !== next.isYearHighlight) changedFields.push("highlight");
  if (!previous || previous.rating !== next.rating) changedFields.push("rating");
  if (!previous || JSON.stringify(previous.canvasObjects) !== JSON.stringify(next.canvasObjects)) {
    changedFields.push("canvas");
  }
  if (
    !previous ||
    previous.locationLabel !== next.locationLabel ||
    previous.locationLat !== next.locationLat ||
    previous.locationLng !== next.locationLng
  ) {
    changedFields.push("location");
  }
  if (
    !previous ||
    previous.audioUrl !== next.audioUrl ||
    previous.audioLabel !== next.audioLabel
  ) {
    changedFields.push("audio");
  }
  if (!previous || previous.coverPhotoUrl !== next.coverPhotoUrl) changedFields.push("cover");
  if (!previous || previous.reflectionJson !== next.reflectionJson) {
    changedFields.push("reflections");
  }

  return {
    changedFields,
    canvasAddedCount: Math.max(0, nextCanvasCount - previousCanvasCount),
    canvasRemovedCount: Math.max(0, previousCanvasCount - nextCanvasCount),
  };
}

export function hasFlowerPageRevisionChanges(summary: FlowerPageRevisionSummary) {
  return summary.changedFields.length > 0;
}

export function normalizeFlowerPagePersistedSnapshot(
  raw: Partial<FlowerPagePersistedSnapshot> & Record<string, unknown>,
): FlowerPagePersistedSnapshot {
  const planSummary =
    typeof raw.planSummary === "string"
      ? raw.planSummary
      : typeof raw.plan_summary === "string"
        ? raw.plan_summary
        : "";
  const planTypeId =
    typeof raw.planTypeId === "string"
      ? raw.planTypeId
      : typeof raw.plan_type_id === "string"
        ? raw.plan_type_id
        : "";
  const isFavorite =
    typeof raw.isFavorite === "boolean"
      ? raw.isFavorite
      : typeof raw.is_favorite === "boolean"
        ? raw.is_favorite
        : false;
  const isYearHighlight =
    typeof raw.isYearHighlight === "boolean"
      ? raw.isYearHighlight
      : typeof raw.is_year_highlight === "boolean"
        ? raw.is_year_highlight
        : false;
  const locationLabel =
    typeof raw.locationLabel === "string"
      ? raw.locationLabel
      : typeof raw.location_label === "string"
        ? raw.location_label
        : "";
  const locationLat =
    typeof raw.locationLat === "string"
      ? raw.locationLat
      : typeof raw.location_lat === "string"
        ? raw.location_lat
        : "";
  const locationLng =
    typeof raw.locationLng === "string"
      ? raw.locationLng
      : typeof raw.location_lng === "string"
        ? raw.location_lng
        : "";
  const audioUrl =
    typeof raw.audioUrl === "string"
      ? raw.audioUrl
      : typeof raw.audio_url === "string"
        ? raw.audio_url
        : "";
  const audioLabel =
    typeof raw.audioLabel === "string"
      ? raw.audioLabel
      : typeof raw.audio_label === "string"
        ? raw.audio_label
        : "";
  const coverPhotoUrl =
    typeof raw.coverPhotoUrl === "string"
      ? raw.coverPhotoUrl
      : typeof raw.cover_photo_url === "string"
        ? raw.cover_photo_url
        : "";
  const reflectionJson =
    typeof raw.reflectionJson === "string"
      ? raw.reflectionJson
      : typeof raw.reflection_json === "string"
        ? raw.reflection_json
        : "";
  const canvasObjects = Array.isArray(raw.canvasObjects)
    ? raw.canvasObjects
    : Array.isArray(raw.canvas_objects)
      ? raw.canvas_objects
      : [];

  return buildFlowerPagePersistedSnapshot({
    planSummary,
    planTypeId,
    isFavorite,
    isYearHighlight,
    rating: raw.rating,
    canvasObjects,
    locationLabel,
    locationLat,
    locationLng,
    audioUrl,
    audioLabel,
    coverPhotoUrl,
    reflectionJson,
  });
}

export function normalizeFlowerPageRevisionSummary(
  raw: Partial<FlowerPageRevisionSummary> & Record<string, unknown>,
): FlowerPageRevisionSummary {
  const changedFields = Array.isArray(raw.changedFields)
    ? raw.changedFields
    : Array.isArray(raw.changed_fields)
      ? raw.changed_fields
      : [];
  return {
    changedFields: changedFields.filter((field): field is FlowerPageRevisionChangeField =>
      field === "summary" ||
      field === "plan_type" ||
      field === "favorite" ||
      field === "highlight" ||
      field === "rating" ||
      field === "canvas" ||
      field === "location" ||
      field === "audio" ||
      field === "cover" ||
      field === "reflections",
    ),
    canvasAddedCount: Number.isFinite(raw.canvasAddedCount)
      ? Number(raw.canvasAddedCount)
      : Number.isFinite(raw.canvas_added_count)
        ? Number(raw.canvas_added_count)
        : 0,
    canvasRemovedCount: Number.isFinite(raw.canvasRemovedCount)
      ? Number(raw.canvasRemovedCount)
      : Number.isFinite(raw.canvas_removed_count)
        ? Number(raw.canvas_removed_count)
        : 0,
  };
}

export function normalizeFlowerPageRevisionRow(
  raw: Partial<FlowerPageRevisionRow> & Record<string, unknown>,
  fallbackId = "",
): FlowerPageRevisionRow {
  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : fallbackId,
    page_id: normalizeText(raw.page_id).trim(),
    garden_id: normalizeText(raw.garden_id).trim(),
    snapshot: normalizeFlowerPagePersistedSnapshot(
      ((raw.snapshot as Record<string, unknown> | null) ?? {}) as Partial<FlowerPagePersistedSnapshot> &
        Record<string, unknown>,
    ),
    summary: normalizeFlowerPageRevisionSummary(
      ((raw.summary as Record<string, unknown> | null) ?? {}) as Partial<FlowerPageRevisionSummary> &
        Record<string, unknown>,
    ),
    actor_user_id: normalizeText(raw.actor_user_id).trim() || null,
    actor_name: normalizeText(raw.actor_name).trim() || null,
    created_at: normalizeText(raw.created_at).trim() || new Date(0).toISOString(),
  };
}
