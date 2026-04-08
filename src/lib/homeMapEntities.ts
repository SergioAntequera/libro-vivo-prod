import type { HomeSeasonTone } from "@/lib/homePageUtils";
import { getPageDetailHref } from "@/lib/productSurfaces";
import { seasonFromIso } from "@/lib/homePageUtils";
import type { MapPlaceRecord } from "@/lib/mapDomainTypes";
import type { MapPointItem } from "@/lib/homeMapTypes";
import type { FlowerFamily } from "@/lib/productDomainContracts";
import {
  getFlowerFamilyFromLegacyElement,
  normalizeFlowerFamily,
} from "@/lib/productDomainContracts";

type HomeMapFilterOptions = {
  selectedYearValue: string;
  mapScope: "selected_year" | "all_years";
  mapOnlyFavorites: boolean;
  mapSeasonFilter: HomeSeasonTone | "all";
  mapFlowerFamilyFilter: FlowerFamily | "all";
};

function normalizeDate(dateLike: string | null | undefined) {
  const raw = String(dateLike ?? "").trim();
  if (!raw) return "";
  return raw.slice(0, 10);
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeNullableText(value: unknown) {
  const text = normalizeText(value);
  return text || null;
}

function normalizeTags(value: unknown) {
  return Array.isArray(value)
    ? value.map((entry) => normalizeText(entry)).filter(Boolean)
    : [];
}

function readMetadataText(place: MapPlaceRecord, key: string) {
  const value = place.metadata?.[key];
  return normalizeNullableText(value);
}

function derivePlaceElement(place: MapPlaceRecord) {
  const direct = readMetadataText(place, "element");
  if (direct) return direct;
  const tag = place.tags.find((entry) => entry.startsWith("element:"));
  return tag ? tag.slice("element:".length).trim() || null : null;
}

function derivePlaceFlowerFamily(place: MapPlaceRecord) {
  const direct = normalizeFlowerFamily(readMetadataText(place, "flower_family"));
  if (direct) return direct;
  return getFlowerFamilyFromLegacyElement(derivePlaceElement(place));
}

function derivePlacePhotoUrl(place: MapPlaceRecord) {
  return (
    readMetadataText(place, "photoUrl") ||
    readMetadataText(place, "photo_url") ||
    readMetadataText(place, "imageUrl") ||
    readMetadataText(place, "image_url")
  );
}

export function mapPlaceRecordToPoint(place: MapPlaceRecord): MapPointItem {
  return mapPlaceRecordToPointWithLinkedMemory(place, null);
}

export function mapPlaceRecordToPointWithLinkedMemory(
  place: MapPlaceRecord,
  linkedMemory: Pick<
    MapPointItem,
    "href" | "photoUrl" | "flowerFamily" | "planTypeLabel" | "linkedPageId"
  > | null,
): MapPointItem {
  const date = normalizeDate(place.createdAt);
  const subtitle = place.subtitle || place.addressLabel || place.notes || "";
  return {
    id: `place-${place.id}`,
    sourceType: "place",
    sourceId: place.id,
    title: subtitle || place.title,
    date,
    element: derivePlaceElement(place),
    flowerFamily: linkedMemory?.flowerFamily ?? derivePlaceFlowerFamily(place),
    planTypeLabel: linkedMemory?.planTypeLabel ?? null,
    rating: place.rating,
    lat: place.lat,
    lng: place.lng,
    href:
      linkedMemory?.href ??
      (place.links.pageId ? getPageDetailHref(place.links.pageId) : null),
    linkedPageId: linkedMemory?.linkedPageId ?? place.links.pageId,
    linkedSeedId: place.links.seedId,
    locationLabel: place.title,
    photoUrl: linkedMemory?.photoUrl ?? derivePlacePhotoUrl(place),
    snippet: place.notes || place.subtitle,
    isFavorite: place.state === "favorite" || place.tags.includes("favorite"),
    placeKind: place.kind,
    placeState: place.state,
    iconCode: place.iconCode,
    colorToken: place.colorToken,
    addressLabel: place.addressLabel,
    notes: place.notes,
    tags: normalizeTags(place.tags),
  };
}

function pointMatchesYear(point: MapPointItem, selectedYearValue: string) {
  return point.date.startsWith(`${selectedYearValue}-`);
}

function pointMatchesSeason(point: MapPointItem, season: HomeSeasonTone | "all") {
  if (season === "all") return true;
  if (!point.date) return false;
  return seasonFromIso(point.date) === season;
}

function pointMatchesFlowerFamily(point: MapPointItem, family: FlowerFamily | "all") {
  if (family === "all") return true;
  return point.flowerFamily === family;
}

export function filterMapPointsForHome(
  points: MapPointItem[],
  options: HomeMapFilterOptions,
) {
  return points.filter((point) => {
    if (options.mapScope === "selected_year" && !pointMatchesYear(point, options.selectedYearValue)) {
      return false;
    }
    if (options.mapOnlyFavorites && !point.isFavorite) return false;
    if (!pointMatchesSeason(point, options.mapSeasonFilter)) return false;
    if (!pointMatchesFlowerFamily(point, options.mapFlowerFamilyFilter)) return false;
    return true;
  });
}

export function buildPlacePointsForHome(
  places: MapPlaceRecord[],
  options: HomeMapFilterOptions,
  linkedMemoryByPageId?: Map<
    string,
    Pick<MapPointItem, "href" | "photoUrl" | "flowerFamily" | "planTypeLabel" | "linkedPageId">
  >,
) {
  return filterMapPointsForHome(
    places
      .map((place) =>
        mapPlaceRecordToPointWithLinkedMemory(
          place,
          place.links.pageId ? linkedMemoryByPageId?.get(place.links.pageId) ?? null : null,
        ),
      )
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)),
    options,
  );
}
