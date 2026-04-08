import type { CanvasObject, ElementKind } from "@/lib/canvasTypes";
import { normalizeElementKind } from "@/lib/productDomainContracts";

// care system deprecated — mood_state retained as simple page metadata
export type CareMood = "wilted" | "healthy" | "shiny";

export type PageRow = {
  id: string;
  title: string | null;
  plan_summary?: string | null;
  date: string;
  element: ElementKind;
  canvas_objects: CanvasObject[];
  rating: number | null;
  mood_state: CareMood;
  /** @deprecated care system removed */
  care_score?: number | null;
  /** @deprecated care system removed */
  care_needs?: unknown;
  /** @deprecated care system removed */
  care_log?: unknown[];
  created_by: string | null;
  planned_from_seed_id?: string | null;
  plan_type_id?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  location_label?: string | null;
  audio_url?: string | null;
  audio_label?: string | null;
  cover_photo_url?: string | null;
  is_favorite: boolean;
};

export type PlaceSearchResult = {
  id: string;
  label: string;
  fullLabel: string;
  lat: number;
  lng: number;
};

type PageRowCandidate = Partial<PageRow> & Record<string, unknown>;

export function normalizePageRow(
  row: PageRowCandidate,
  fallbackId: string,
): PageRow {
  const fallbackDate = new Date().toISOString().slice(0, 10);
  const ratingRaw = Number(row.rating);
  const careScoreRaw = Number(row.care_score);
  const locationLatRaw = Number(row.location_lat);
  const locationLngRaw = Number(row.location_lng);

  return {
    id: typeof row.id === "string" && row.id.trim() ? row.id : fallbackId,
    title: typeof row.title === "string" ? row.title : null,
    plan_summary: typeof row.plan_summary === "string" ? row.plan_summary : null,
    date: typeof row.date === "string" && row.date.trim() ? row.date : fallbackDate,
    element: normalizeElementKind(row.element),
    canvas_objects: Array.isArray(row.canvas_objects)
      ? (row.canvas_objects as CanvasObject[])
      : [],
    rating: Number.isFinite(ratingRaw) ? ratingRaw : null,
    mood_state:
      row.mood_state === "wilted" ||
      row.mood_state === "healthy" ||
      row.mood_state === "shiny"
        ? row.mood_state
        : "healthy",
    care_score: Number.isFinite(careScoreRaw) ? careScoreRaw : null,
    care_needs: row.care_needs ?? null,
    care_log: Array.isArray(row.care_log) ? row.care_log : [],
    created_by: typeof row.created_by === "string" ? row.created_by : null,
    planned_from_seed_id:
      typeof row.planned_from_seed_id === "string" ? row.planned_from_seed_id : null,
    plan_type_id:
      typeof row.plan_type_id === "string" ? row.plan_type_id : null,
    location_lat: Number.isFinite(locationLatRaw) ? locationLatRaw : null,
    location_lng: Number.isFinite(locationLngRaw) ? locationLngRaw : null,
    location_label: typeof row.location_label === "string" ? row.location_label : null,
    audio_url: typeof row.audio_url === "string" ? row.audio_url : null,
    audio_label: typeof row.audio_label === "string" ? row.audio_label : null,
    cover_photo_url:
      typeof row.cover_photo_url === "string" ? row.cover_photo_url : null,
    is_favorite: Boolean(row.is_favorite),
  };
}
