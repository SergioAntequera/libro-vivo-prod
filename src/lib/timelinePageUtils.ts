import type { CatalogItemConfig } from "@/lib/appConfig";
import type { PageVisualState } from "@/lib/pageVisualState";
import type { SeasonCode } from "@/lib/timelineConfig";

export type PageItem = {
  id: string;
  title: string | null;
  date: string;
  element: string;
  rating: number | null;
  mood_state: string;
  thumbnail_url?: string | null;
  cover_photo_url?: string | null;
  visual?: PageVisualState | null;
};

export type TimelineApiLifeEvent = {
  kind?: string | null;
  date?: string | null;
  title?: string | null;
  source?: {
    entity?: string | null;
    id?: string | null;
  } | null;
  element?: string | null;
  rating?: number | null;
  mood?: string | null;
  thumbnailUrl?: string | null;
  coverPhotoUrl?: string | null;
};

export type TimelineLifeEventsResponse = {
  activeGardenId?: string | null;
  events?: TimelineApiLifeEvent[];
  error?: string | null;
};

export function monthKey(date: string) {
  return date.slice(0, 7);
}

export function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1, 1);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

export function isValidYm(value: string) {
  return /^\d{4}-\d{2}$/.test(value);
}

export function clampText(s: string, max = 140) {
  if (s.length <= max) return s;
  return s.slice(0, max - 3) + "...";
}

export function isIsoDay(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function normalizeText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

export function parseTimelinePageItem(event: TimelineApiLifeEvent): PageItem | null {
  if (normalizeText(event.kind).toLowerCase() !== "flower") return null;
  if (normalizeText(event.source?.entity).toLowerCase() !== "page") return null;

  const id = normalizeText(event.source?.id);
  const date = normalizeText(event.date).slice(0, 10);
  if (!id || !isIsoDay(date)) return null;

  const title = normalizeText(event.title) || null;
  const element = normalizeText(event.element) || "other";
  const mood = normalizeText(event.mood) || "normal";
  const rating =
    typeof event.rating === "number" && Number.isFinite(event.rating)
      ? event.rating
      : null;

  return {
    id,
    title,
    date,
    element,
    rating,
    mood_state: mood,
    thumbnail_url: normalizeText(event.thumbnailUrl) || null,
    cover_photo_url: normalizeText(event.coverPhotoUrl) || null,
    visual: null,
  };
}

export { toErrorMessage } from "@/lib/errorMessage";

export function isSeasonCode(value: string): value is SeasonCode {
  return (
    value === "spring" ||
    value === "summer" ||
    value === "autumn" ||
    value === "winter"
  );
}

export function lookupCatalogLabel(
  code: string,
  options: CatalogItemConfig[],
  fallback: string,
) {
  return options.find((x) => x.code === code)?.label ?? fallback;
}

