import type { MapPlaceKind, MapPlaceState } from "@/lib/mapDomainTypes";

function glyph(codePoint: number) {
  return String.fromCodePoint(codePoint);
}

export const DEFAULT_MAP_PLACE_KIND_GLYPH_BY_KIND: Record<MapPlaceKind, string> = {
  spot: glyph(0x1f4cd),
  restaurant: glyph(0x1f37d),
  cafe: glyph(0x2615),
  viewpoint: glyph(0x1f5fb),
  trip_place: glyph(0x1f9f3),
  custom: glyph(0x2726),
};

export const DEFAULT_MAP_PLACE_KIND_LABELS: Record<MapPlaceKind, string> = {
  spot: "Sitio",
  restaurant: "Restaurante",
  cafe: "Cafe",
  viewpoint: "Mirador",
  trip_place: "Escapada",
  custom: "Especial",
};

export const DEFAULT_MAP_PLACE_STATE_LABELS: Record<MapPlaceState, string> = {
  saved: "Guardado",
  visited: "Visitado",
  favorite: "Favorito",
  wishlist: "Por visitar",
  archived: "Archivado",
};

export function getMapPlaceKindGlyph(kind: MapPlaceKind | null | undefined) {
  if (!kind) return glyph(0x273f);
  return DEFAULT_MAP_PLACE_KIND_GLYPH_BY_KIND[kind] ?? glyph(0x273f);
}

export function getMapPlaceKindLabel(kind: MapPlaceKind | null | undefined) {
  if (!kind) return "Lugar";
  return DEFAULT_MAP_PLACE_KIND_LABELS[kind] ?? "Lugar";
}

export function getMapPlaceStateLabel(state: MapPlaceState | null | undefined) {
  if (!state) return null;
  return DEFAULT_MAP_PLACE_STATE_LABELS[state] ?? null;
}

