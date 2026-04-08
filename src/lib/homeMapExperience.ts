"use client";

import type { MapPointItem } from "@/lib/homeMapTypes";
import type { MapRouteRecord, MapZoneRecord } from "@/lib/mapDomainTypes";
import { FLOWER_FAMILY_LABELS } from "@/lib/productDomainContracts";

export type MapLensId =
  | "explore"
  | "lived"
  | "saved"
  | "routes"
  | "symbolic"
  | "favorites"
  | "restaurants";

export type MapLensMeta = {
  id: MapLensId;
  label: string;
  icon: string;
  description: string;
};

export type SavedCollectionFilter = "all" | "favorites" | "restaurants" | "wishlist" | "visited";

export type MapMarkerKind =
  | "memory"
  | "place"
  | "favorite"
  | "wishlist"
  | "visited"
  | "restaurant"
  | "route"
  | "symbolic"
  | "selected"
  | "destination"
  | "me";

export type GeocodeSearchResult = {
  id: string;
  label: string;
  fullLabel: string;
  lat: number;
  lng: number;
};

export type RoutePreview = {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  coordinates: Array<{ lat: number; lng: number }>;
  distanceMeters: number;
  durationSeconds: number;
  source: "osrm" | "fallback";
};

export type SearchEntry =
  | {
      id: string;
      kind: "point";
      label: string;
      subtitle: string;
      lat: number;
      lng: number;
      point: MapPointItem;
    }
  | {
      id: string;
      kind: "geocode";
      label: string;
      subtitle: string;
      lat: number;
      lng: number;
    };

export type MapViewportTarget = {
  strategy: "default" | "single" | "cluster" | "bounds";
  center?: [number, number];
  zoom?: number;
  bounds?: [[number, number], [number, number]];
  primaryClusterCount: number;
  outlierCount: number;
};

export type MemoryMapCluster = {
  id: string;
  memories: MapPointItem[];
  center: { lat: number; lng: number };
  latestDateMs: number;
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
};

const DEFAULT_MAP_CENTER: [number, number] = [-3.7038, 40.4168];
const DEFAULT_MAP_ZOOM = 5;
const PRIMARY_CLUSTER_DISTANCE_KM = 120;
const WIDE_SPAN_LAT = 4;
const WIDE_SPAN_LNG = 6;

function emoji(codePoint: number) {
  return String.fromCodePoint(codePoint);
}

export const MAP_LENSES: MapLensMeta[] = [
  {
    id: "explore",
    label: "Explorar",
    icon: emoji(0x1f9ed),
    description: "Busca una direccion, revisa lugares guardados o entra en rutas.",
  },
  {
    id: "saved",
    label: "Guardados",
    icon: emoji(0x1f4cc),
    description: "Lugares que queréis repetir, cuidar o tener siempre a mano.",
  },
  {
    id: "routes",
    label: "Rutas",
    icon: emoji(0x1f97e),
    description: "Paseos y recorridos que forman parte de vuestra historia compartida.",
  },
  {
    id: "favorites",
    label: "Favoritos",
    icon: emoji(0x1f49b),
    description: "Guardados que queréis cuidar como sitios especialmente vuestros.",
  },
  {
    id: "restaurants",
    label: "Restaurantes",
    icon: emoji(0x1f37d),
    description: "Guardados de comida, cafe y cenas que merece la pena repetir.",
  },
  {
    id: "lived",
    label: "Lugares vividos",
    icon: emoji(0x1f33c),
    description: "Lugares ya vividos dentro de vuestra historia compartida.",
  },
  {
    id: "symbolic",
    label: "Zonas simbólicas",
    icon: emoji(0x2728),
    description: "Sitios y zonas con una carga emocional o simbolica clara.",
  },
];

export const MAP_PRIMARY_LENS_IDS: MapLensId[] = [
  "explore",
  "lived",
  "saved",
  "routes",
  "symbolic",
];

export const MAP_SECONDARY_LENS_IDS: MapLensId[] = [
  "favorites",
  "restaurants",
];

export function getMapLensMeta(lensId: MapLensId) {
  return MAP_LENSES.find((lens) => lens.id === lensId) ?? MAP_LENSES[0];
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function tokenizeSearch(value: string | null | undefined) {
  return normalizeText(value)
    .split(/[\s,;/\-]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function pointHaystack(point: MapPointItem) {
  return normalizeText(
    [
      point.title,
      point.locationLabel,
      point.snippet,
      point.addressLabel,
      point.notes,
      point.element,
      point.planTypeLabel,
      point.flowerFamily ? FLOWER_FAMILY_LABELS[point.flowerFamily] : "",
      ...point.tags,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function matchesAnyKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function pointDateMs(point: MapPointItem) {
  const parsed = Date.parse(point.date);
  return Number.isFinite(parsed) ? parsed : 0;
}

function computeBounds(points: MapPointItem[]) {
  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}

function boundsToMapLibreTuple(bounds: MemoryMapCluster["bounds"]) {
  return [
    [bounds.minLng, bounds.minLat],
    [bounds.maxLng, bounds.maxLat],
  ] as [[number, number], [number, number]];
}

function centerOfPoints(points: MapPointItem[]) {
  const lat = points.reduce((sum, point) => sum + point.lat, 0) / Math.max(points.length, 1);
  const lng = points.reduce((sum, point) => sum + point.lng, 0) / Math.max(points.length, 1);
  return { lat, lng };
}

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function haversineKm(
  left: { lat: number; lng: number },
  right: { lat: number; lng: number },
) {
  const earthRadiusKm = 6371;
  const dLat = toRad(right.lat - left.lat);
  const dLng = toRad(right.lng - left.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(left.lat)) *
      Math.cos(toRad(right.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function buildMemoryClusters(points: MapPointItem[]) {
  const sorted = [...points].sort((left, right) => pointDateMs(right) - pointDateMs(left));
  const clusters: MemoryMapCluster[] = [];

  for (const point of sorted) {
    const candidate = clusters.find((cluster) => {
      if (haversineKm(cluster.center, { lat: point.lat, lng: point.lng }) <= PRIMARY_CLUSTER_DISTANCE_KM) {
        return true;
      }
      return cluster.memories.some(
        (member) =>
          haversineKm(
            { lat: member.lat, lng: member.lng },
            { lat: point.lat, lng: point.lng },
          ) <= PRIMARY_CLUSTER_DISTANCE_KM,
      );
    });

    if (!candidate) {
      clusters.push({
        id: `cluster-${clusters.length + 1}`,
        memories: [point],
        center: { lat: point.lat, lng: point.lng },
        latestDateMs: pointDateMs(point),
        bounds: {
          minLat: point.lat,
          maxLat: point.lat,
          minLng: point.lng,
          maxLng: point.lng,
        },
      });
      continue;
    }

    candidate.memories.push(point);
    candidate.latestDateMs = Math.max(candidate.latestDateMs, pointDateMs(point));
    candidate.center = centerOfPoints(candidate.memories);
    candidate.bounds = computeBounds(candidate.memories);
  }

  return clusters.sort((left, right) => {
    if (left.memories.length !== right.memories.length) {
      return right.memories.length - left.memories.length;
    }
    return right.latestDateMs - left.latestDateMs;
  });
}

export function resolveInitialViewport(points: MapPointItem[]): MapViewportTarget {
  if (!points.length) {
    return {
      strategy: "default",
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
      primaryClusterCount: 0,
      outlierCount: 0,
    };
  }

  if (points.length === 1) {
      return {
        strategy: "single",
        center: [points[0].lng, points[0].lat],
        zoom: 13,
        primaryClusterCount: 1,
        outlierCount: 0,
    };
  }

  const allBounds = computeBounds(points);
  const latSpan = allBounds.maxLat - allBounds.minLat;
  const lngSpan = allBounds.maxLng - allBounds.minLng;
  const clusters = buildMemoryClusters(points);
  const primaryCluster = clusters[0] ?? null;

  if (!primaryCluster) {
    return {
      strategy: "bounds",
      bounds: boundsToMapLibreTuple(allBounds),
      primaryClusterCount: points.length,
      outlierCount: 0,
    };
  }

  const outlierCount = Math.max(0, points.length - primaryCluster.memories.length);
  const spansWide = latSpan > WIDE_SPAN_LAT || lngSpan > WIDE_SPAN_LNG;

  if (primaryCluster.memories.length === 1 && spansWide) {
    const latestPoint = [...points].sort((left, right) => pointDateMs(right) - pointDateMs(left))[0];
      return {
        strategy: "single",
        center: [latestPoint.lng, latestPoint.lat],
        zoom: 8,
        primaryClusterCount: 1,
        outlierCount: points.length - 1,
    };
  }

  if (spansWide || outlierCount > 0) {
    if (primaryCluster.memories.length === 1) {
      return {
        strategy: "single",
        center: [primaryCluster.center.lng, primaryCluster.center.lat],
        zoom: 8,
        primaryClusterCount: 1,
        outlierCount,
      };
    }
    return {
      strategy: "cluster",
      bounds: boundsToMapLibreTuple(primaryCluster.bounds),
      primaryClusterCount: primaryCluster.memories.length,
      outlierCount,
    };
  }

  return {
    strategy: "bounds",
    bounds: boundsToMapLibreTuple(allBounds),
    primaryClusterCount: points.length,
    outlierCount: 0,
  };
}

export function isRestaurantPoint(point: MapPointItem) {
  if (point.placeKind === "restaurant" || point.placeKind === "cafe") return true;
  const text = pointHaystack(point);
  return matchesAnyKeyword(text, [
    "restaurant",
    "restaurante",
    "bar",
    "cafe",
    "cafeteria",
    "brunch",
    "pizza",
    "hamburguesa",
    "taperia",
    "helado",
    "sushi",
    "comida",
    "cena",
    "almuerzo",
  ]);
}

export function isRoutePoint(point: MapPointItem) {
  const text = pointHaystack(point);
  return matchesAnyKeyword(text, [
    "ruta",
    "camino",
    "sendero",
    "paseo",
    "excursion",
    "roadtrip",
    "viaje",
    "trayecto",
    "etapa",
    "travesia",
    "mirador",
  ]);
}

export function isSymbolicPoint(point: MapPointItem) {
  const text = pointHaystack(point);
  const rating = Number.isFinite(point.rating) ? Number(point.rating) : 0;
  return (
    point.isFavorite ||
    rating >= 4 ||
    point.tags.includes("symbolic") ||
    matchesAnyKeyword(text, [
      "promesa",
      "primera vez",
      "aniversario",
      "especial",
      "simbolic",
      "simbolico",
      "importante",
      "nuestro",
      "favorit",
    ])
  );
}

export function isSavedPoint(point: MapPointItem) {
  return point.sourceType === "place";
}

export function isLivedPoint(point: MapPointItem) {
  return point.sourceType === "memory";
}

export function filterPointsByLens(points: MapPointItem[], lens: MapLensId) {
  switch (lens) {
    case "saved":
      return points.filter(isSavedPoint);
    case "restaurants":
      return points.filter(isRestaurantPoint);
    case "routes":
      return points.filter(isRoutePoint);
    case "lived":
      return points.filter(isLivedPoint);
    case "favorites":
      return points.filter((point) => point.isFavorite || point.placeState === "favorite");
    case "symbolic":
      return points.filter(isSymbolicPoint);
    case "explore":
    default:
      return points;
  }
}

export function buildLensCounts({
  points,
  routes,
  zones,
}: {
  points: MapPointItem[];
  routes?: MapRouteRecord[];
  zones?: MapZoneRecord[];
}) {
  return Object.fromEntries(
    MAP_LENSES.map((lens) => {
      if (lens.id === "explore") {
        return [lens.id, 0];
      }
      if (lens.id === "routes") {
        return [lens.id, routes?.length ?? 0];
      }
      if (lens.id === "symbolic") {
        return [lens.id, zones?.length ?? 0];
      }
      return [lens.id, filterPointsByLens(points, lens.id).length];
    }),
  ) as Record<MapLensId, number>;
}

export function inferMarkerKind(point: MapPointItem, lens: MapLensId): MapMarkerKind {
  if (lens === "routes" || isRoutePoint(point)) return "route";
  if (lens === "symbolic" || isSymbolicPoint(point)) return "symbolic";
  if (point.sourceType === "memory") return "memory";
  if (isRestaurantPoint(point) && lens === "restaurants") return "restaurant";
  if ((point.isFavorite || point.placeState === "favorite") && lens === "favorites") return "favorite";
  if (point.placeState === "wishlist" && lens === "saved") return "wishlist";
  if (point.placeState === "visited" && lens === "saved") return "visited";
  if (point.sourceType === "place") return "place";
  return "memory";
}

export function buildDirectionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

export function buildPointSearchLabel(point: MapPointItem) {
  return point.locationLabel || point.title;
}

export function formatRouteDistance(distanceMeters: number) {
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) return "";
  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(distanceMeters >= 10000 ? 0 : 1)} km`;
  }
  return `${Math.round(distanceMeters)} m`;
}

export function formatRouteDuration(durationSeconds: number) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return "";
  const totalMinutes = Math.round(durationSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!minutes) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

export function buildSearchEntries(
  points: MapPointItem[],
  query: string,
  remoteResults: GeocodeSearchResult[],
) {
  const clean = normalizeText(query);
  const tokens = tokenizeSearch(query);
  const localEntries: SearchEntry[] =
    clean.length < 2
      ? []
      : points
          .filter((point) => {
            const haystack = pointHaystack(point);
            if (haystack.includes(clean)) return true;
            return tokens.every((token) => haystack.includes(token));
          })
          .sort((left, right) => {
            const leftLabel = normalizeText(buildPointSearchLabel(left));
            const rightLabel = normalizeText(buildPointSearchLabel(right));
            const leftExact = Number(leftLabel.startsWith(clean) || pointHaystack(left).includes(clean));
            const rightExact = Number(rightLabel.startsWith(clean) || pointHaystack(right).includes(clean));
            if (leftExact !== rightExact) return rightExact - leftExact;
            if (left.isFavorite !== right.isFavorite) return left.isFavorite ? -1 : 1;
            return pointDateMs(right) - pointDateMs(left);
          })
          .slice(0, 6)
          .map((point) => ({
            id: `point-${point.id}`,
            kind: "point" as const,
            label: buildPointSearchLabel(point),
            subtitle: `${point.title}${point.date ? ` - ${point.date}` : ""}`,
            lat: point.lat,
            lng: point.lng,
            point,
          }));

  const remoteEntries: SearchEntry[] = remoteResults.map((result) => ({
    id: `geocode-${result.id}`,
    kind: "geocode",
    label: result.label,
    subtitle: result.fullLabel,
    lat: result.lat,
    lng: result.lng,
  }));

  return [...localEntries, ...remoteEntries].slice(0, 10);
}



