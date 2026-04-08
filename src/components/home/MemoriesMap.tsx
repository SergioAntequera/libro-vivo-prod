"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, {
  AttributionControl,
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  type GeoJSONSource,
  type StyleSpecification,
} from "maplibre-gl";
import type { Feature, FeatureCollection, Geometry, LineString } from "geojson";
import {
  DEFAULT_PLAN_FLOWER_ASSET_BY_FAMILY,
  DEFAULT_PLAN_FLOWER_ASSET,
  resolvePlanFlowerAssetPath,
} from "@/lib/planVisuals";
import {
  type MapLensId,
  type MapMarkerKind,
  type RoutePreview,
} from "@/lib/homeMapExperience";
import type { MapPointItem } from "@/lib/homeMapTypes";
import type { MapRouteRecord, MapZoneRecord } from "@/lib/mapDomainTypes";
import { FLOWER_FAMILY_LABELS } from "@/lib/productDomainContracts";
import {
  getFallbackMapRuntimeConfig,
  getMapPlaceStateCatalogItem,
  isMapCatalogAssetPath,
  resolveMapPlaceKindAssetPath,
  resolveMapPlaceKindGlyph,
  resolveMapPlaceKindLabel,
  resolveMapPlaceStateLabel,
  type MapRuntimeConfig,
} from "@/lib/mapCatalogConfig";

export type MemoryMapItem = MapPointItem;

const DEFAULT_CENTER: [number, number] = [-3.7038, 40.4168];
const DEFAULT_ZOOM = 5;
const FALLBACK_MAP_CONFIG = getFallbackMapRuntimeConfig();
const DESTINATION_ZOOM = 14;
const IMMERSIVE_NAV_TOP_OFFSET = "5.4rem";
const IMMERSIVE_NAV_RIGHT_OFFSET = "0.85rem";
const ROUTE_SOURCE_ID = "lv-route-source";
const ROUTE_LAYER_ID = "lv-route-layer";
const SAVED_ROUTES_SOURCE_ID = "lv-saved-routes-source";
const SAVED_ROUTES_LAYER_ID = "lv-saved-routes-layer";
const ZONES_SOURCE_ID = "lv-zones-source";
const ZONES_FILL_LAYER_ID = "lv-zones-fill-layer";
const ZONES_LINE_LAYER_ID = "lv-zones-line-layer";
const DRAFT_SOURCE_ID = "lv-draft-source";
const DRAFT_LINE_LAYER_ID = "lv-draft-line-layer";
const DRAFT_FILL_LAYER_ID = "lv-draft-fill-layer";
const DRAFT_POINTS_LAYER_ID = "lv-draft-points-layer";
const DRAFT_LABELS_LAYER_ID = "lv-draft-labels-layer";

function glyph(codePoint: number) {
  return String.fromCodePoint(codePoint);
}

function createBaseMapStyle(): StyleSpecification {
  return {
    version: 8,
    name: "Libro Vivo Base Map",
    sources: {
      "lv-raster-tiles": {
        type: "raster",
        tiles: [
          "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
          "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
          "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
          "https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 20,
        attribution: "© OpenStreetMap contributors · © CARTO",
      },
    },
    layers: [
      {
        id: "lv-raster-base",
        type: "raster",
        source: "lv-raster-tiles",
        minzoom: 0,
        maxzoom: 22,
      },
    ],
  };
}

function starsLabel(rating: number | null) {
  const safe = Number.isFinite(rating) ? Math.max(0, Math.min(5, Number(rating))) : 0;
  if (safe <= 0) return "Sin estrellas";
  return "*".repeat(safe);
}

function escapeHtml(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizePreviewText(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isRedundantSubtitle(title: string, subtitle: string) {
  const left = normalizePreviewText(title);
  const right = normalizePreviewText(subtitle);
  if (!left || !right) return false;
  if (left === right || left.includes(right) || right.includes(left)) return true;
  const leftTokens = new Set(left.split(" ").filter(Boolean));
  const rightTokens = new Set(right.split(" ").filter(Boolean));
  let overlap = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) overlap += 1;
  });
  const ratio = overlap / Math.max(leftTokens.size, rightTokens.size, 1);
  return ratio >= 0.6;
}

function markerPalette(kind: MapMarkerKind) {
  switch (kind) {
    case "place":
      return { bg: "#f7faf7", border: "#406c52", fg: "#406c52", glyph: glyph(0x1f4cd) };
    case "favorite":
      return { bg: "#fff0d8", border: "#c27a00", fg: "#9a5a00", glyph: glyph(0x2665) };
    case "wishlist":
      return { bg: "#eff6ff", border: "#2563eb", fg: "#1d4ed8", glyph: glyph(0x25f7) };
    case "visited":
      return { bg: "#ecfdf5", border: "#0f766e", fg: "#0f766e", glyph: glyph(0x2713) };
    case "restaurant":
      return { bg: "#eef6ff", border: "#2563eb", fg: "#1d4ed8", glyph: glyph(0x1f37d) };
    case "route":
      return { bg: "#ecfdf5", border: "#0f766e", fg: "#115e59", glyph: glyph(0x1f97e) };
    case "symbolic":
      return { bg: "#faf5ff", border: "#8b5cf6", fg: "#7c3aed", glyph: glyph(0x2726) };
    case "selected":
      return { bg: "#ffffff", border: "#0f766e", fg: "#0f766e", glyph: glyph(0x25c9) };
    case "destination":
      return { bg: "#ffffff", border: "#be123c", fg: "#be123c", glyph: glyph(0x1f4cd) };
    case "me":
      return { bg: "#dbeafe", border: "#1d4ed8", fg: "#1d4ed8", glyph: glyph(0x25cf) };
    case "memory":
    default:
      return { bg: "#ffffff", border: "#1f2937", fg: "#1f2937", glyph: glyph(0x273f) };
  }
}

function hexToRgba(value: string, alpha: number) {
  const raw = value.trim();
  const hex = raw.startsWith("#") ? raw.slice(1) : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function makeMarkerElement(
  kind: MapMarkerKind,
  point?: Pick<
    MapPointItem,
    "sourceType" | "placeKind" | "placeState" | "isFavorite" | "iconCode" | "colorToken"
  >,
  mapConfig?: MapRuntimeConfig,
) {
  const effectiveMapConfig = mapConfig ?? getFallbackMapRuntimeConfig();
  const palette = { ...markerPalette(kind) };
  if (
    point?.sourceType === "place" &&
    kind !== "selected" &&
    kind !== "destination" &&
    kind !== "me"
  ) {
    const accent = String(point.colorToken ?? "").trim();
    if (accent) {
      palette.border = accent;
      palette.fg = accent;
      palette.bg = hexToRgba(accent, 0.14) ?? "#ffffff";
    }
  }
  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";
  wrapper.style.alignItems = "center";
  wrapper.style.transform = "translateY(-1px)";
  wrapper.style.cursor = "pointer";

  const ring = document.createElement("div");
  ring.style.width = "22px";
  ring.style.height = "22px";
  ring.style.borderRadius = "999px";
  ring.style.border = `1px solid ${palette.border}`;
  ring.style.background = palette.bg;
  ring.style.display = "flex";
  ring.style.alignItems = "center";
  ring.style.justifyContent = "center";
  ring.style.color = palette.fg;
  ring.style.fontSize = kind === "me" ? "11px" : "12px";
  ring.style.lineHeight = "1";
  ring.style.boxShadow =
    kind === "selected" || kind === "destination"
      ? "0 0 0 5px rgba(15,118,110,0.12), 0 10px 18px rgba(15,23,42,0.18)"
      : "0 4px 10px rgba(15,23,42,0.18)";
  const customIcon = String(point?.iconCode ?? "").trim();
  const placeKindAssetPath =
    point?.sourceType === "place" && kind !== "selected"
      ? resolveMapPlaceKindAssetPath(point.placeKind, effectiveMapConfig)
      : null;
  const customIconIsAsset = isMapCatalogAssetPath(customIcon);

  if (customIconIsAsset || placeKindAssetPath) {
    const image = document.createElement("img");
    image.src = customIconIsAsset ? customIcon : (placeKindAssetPath as string);
    image.alt = point?.placeKind ? resolveMapPlaceKindLabel(point.placeKind, effectiveMapConfig) : "Pin";
    image.style.display = "block";
    image.style.width = "14px";
    image.style.height = "14px";
    image.style.objectFit = "contain";
    ring.appendChild(image);
  } else {
    const primaryGlyph = customIcon
      ? customIcon.slice(0, 2)
      : point?.sourceType === "place" && kind !== "selected"
        ? resolveMapPlaceKindGlyph(point.placeKind, effectiveMapConfig)
        : palette.glyph;
    ring.textContent = primaryGlyph;
  }

  const stem = document.createElement("div");
  stem.style.width = "2px";
  stem.style.height = "8px";
  stem.style.borderRadius = "2px";
  stem.style.marginTop = "-1px";
  stem.style.background = palette.border;

  const secondaryState =
    point?.placeState === "favorite" || point?.isFavorite
      ? "favorite"
      : point?.placeState === "wishlist"
        ? "wishlist"
        : point?.placeState === "visited"
          ? "visited"
          : null;

  if (secondaryState && kind !== "selected") {
    const accent = document.createElement("div");
    accent.style.position = "absolute";
    accent.style.right = "-3px";
    accent.style.top = "-3px";
    accent.style.width = "11px";
    accent.style.height = "11px";
    accent.style.borderRadius = "999px";
    accent.style.border = "1px solid white";
    accent.style.boxShadow = "0 4px 10px rgba(15,23,42,0.18)";
    accent.style.background =
      getMapPlaceStateCatalogItem(secondaryState, effectiveMapConfig)?.color ??
      (secondaryState === "favorite"
        ? "#c27a00"
        : secondaryState === "wishlist"
          ? "#2563eb"
          : "#0f766e");
    ring.style.position = "relative";
    ring.appendChild(accent);
  }

  wrapper.appendChild(ring);
  wrapper.appendChild(stem);
  return wrapper;
}

function makeUserLocationMarkerElement(heading: number | null) {
  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";
  wrapper.style.width = "30px";
  wrapper.style.height = "30px";
  wrapper.style.pointerEvents = "none";

  const halo = document.createElement("div");
  halo.style.position = "absolute";
  halo.style.inset = "0";
  halo.style.borderRadius = "999px";
  halo.style.background = "rgba(37, 99, 235, 0.14)";
  halo.style.border = "1px solid rgba(37, 99, 235, 0.18)";

  const dot = document.createElement("div");
  dot.style.position = "absolute";
  dot.style.left = "50%";
  dot.style.top = "50%";
  dot.style.width = "14px";
  dot.style.height = "14px";
  dot.style.transform = "translate(-50%, -50%)";
  dot.style.borderRadius = "999px";
  dot.style.background = "#2563eb";
  dot.style.border = "2px solid white";
  dot.style.boxShadow = "0 8px 18px rgba(15,23,42,0.18)";

  wrapper.appendChild(halo);
  wrapper.appendChild(dot);

  if (heading != null) {
    const arrow = document.createElement("div");
    arrow.style.position = "absolute";
    arrow.style.left = "50%";
    arrow.style.top = "50%";
    arrow.style.width = "0";
    arrow.style.height = "0";
    arrow.style.borderLeft = "5px solid transparent";
    arrow.style.borderRight = "5px solid transparent";
    arrow.style.borderBottom = "11px solid #1d4ed8";
    arrow.style.transform = `translate(-50%, -17px) rotate(${heading}deg)`;
    arrow.style.transformOrigin = "50% 17px";
    arrow.style.filter = "drop-shadow(0 3px 6px rgba(15,23,42,0.16))";
    wrapper.appendChild(arrow);
  }

  return wrapper;
}

function buildMemoryPopupHtml(point: MemoryMapItem, mapConfig?: MapRuntimeConfig) {
  const effectiveMapConfig = mapConfig ?? getFallbackMapRuntimeConfig();
  const safePhotoUrl = /^https?:\/\//i.test(point.photoUrl ?? "") ? point.photoUrl : null;
  const hasLinkedFlower = point.sourceType === "memory" || Boolean(point.linkedPageId);
  const ratingLabel =
    Number.isFinite(point.rating) && Number(point.rating) > 0 ? starsLabel(point.rating) : null;
  const safeFlowerAsset =
    hasLinkedFlower && point.flowerFamily != null
      ? resolvePlanFlowerAssetPath({
          planFlowerFamily: point.flowerFamily,
          fallbackFlowerByFamily: DEFAULT_PLAN_FLOWER_ASSET_BY_FAMILY,
          defaultFlowerAssetPath: DEFAULT_PLAN_FLOWER_ASSET,
        })
      : null;
  const titleLine = point.locationLabel || point.title;
  const rawSubtitleLine =
    point.sourceType === "place" && !hasLinkedFlower
      ? point.addressLabel || point.title || "Lugar guardado"
      : null;
  const subtitleLine =
    rawSubtitleLine && !isRedundantSubtitle(titleLine, rawSubtitleLine) ? rawSubtitleLine : null;
  const metaBits = [
    point.sourceType === "memory" ? point.date || null : null,
    ratingLabel,
    hasLinkedFlower ? point.planTypeLabel || null : null,
    hasLinkedFlower && point.flowerFamily ? FLOWER_FAMILY_LABELS[point.flowerFamily] : null,
    point.isFavorite || point.placeState === "favorite" ? "Favorito" : null,
    point.placeKind ? resolveMapPlaceKindLabel(point.placeKind, effectiveMapConfig) : null,
    resolveMapPlaceStateLabel(point.placeState, effectiveMapConfig),
  ].filter(Boolean);
  const detailText =
    [point.snippet, point.notes, point.sourceType === "memory" ? point.title : null]
      .map((item) => String(item ?? "").trim())
      .find((item) => item && item !== rawSubtitleLine && item !== titleLine) ||
    (point.sourceType === "place"
      ? "Lugar guardado en el mapa para volver, recordar o reutilizar."
      : "Recuerdo vivido con ubicación dentro de vuestra historia.");
  const flowerBadge = safeFlowerAsset
    ? `<div style="position:absolute;top:0;right:0;display:flex;height:38px;width:38px;align-items:center;justify-content:center;border-radius:12px;border:1px solid #d7e0d3;background:#f9fafb;overflow:hidden;box-shadow:0 6px 14px rgba(15,23,42,0.08);"><img src="${escapeHtml(safeFlowerAsset)}" alt="${escapeHtml(point.flowerFamily ? FLOWER_FAMILY_LABELS[point.flowerFamily] : "Flor")}" style="display:block;max-height:28px;max-width:28px;object-fit:contain;" /></div>`
    : "";
  const coverBlock = safePhotoUrl
    ? `<div style="width:100%;max-width:100%;overflow:hidden;border-radius:12px;border:1px solid #d7e0d3;background:#f9fafb;"><img src="${escapeHtml(safePhotoUrl)}" alt="${escapeHtml(point.locationLabel || point.title)}" style="display:block;height:108px;width:100%;max-width:100%;object-fit:cover;" /></div>`
    : "";

  return `
    <div style="position:relative;display:grid;gap:8px;min-width:0;max-width:100%;color:#27362f;box-sizing:border-box;overflow:hidden;">
      ${flowerBadge}
      <div style="display:grid;gap:4px;min-width:0;max-width:100%;padding-right:${safeFlowerAsset ? "48px" : "0"};">
          <div style="font-size:14px;font-weight:700;line-height:1.35;overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(titleLine)}</div>
          ${subtitleLine ? `<div style="font-size:12px;opacity:.75;line-height:1.45;overflow-wrap:anywhere;">${escapeHtml(subtitleLine)}</div>` : ""}
          <div style="font-size:12px;opacity:.75;line-height:1.45;overflow-wrap:anywhere;word-break:break-word;">${metaBits.map((bit) => escapeHtml(bit)).join(" - ")}</div>
      </div>
      ${coverBlock}
      <div style="font-size:12px;line-height:1.5;opacity:.85;overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(detailText)}</div>
      ${
        point.href
          ? `<a href="${escapeHtml(point.href)}" style="display:inline-flex;width:max-content;max-width:100%;border:1px solid #cfd9cb;border-radius:10px;padding:6px 10px;font-size:12px;text-decoration:none;color:#27362f;">${
              point.linkedPageId || point.sourceType === "memory" ? "Abrir flor" : "Abrir página"
            }</a>`
          : ""
      }
    </div>
  `;
}

function buildRouteFeature(routePreview: RoutePreview | null): FeatureCollection<LineString> {
  if (!routePreview?.coordinates.length) {
    return { type: "FeatureCollection", features: [] };
  }

  const feature: Feature<LineString> = {
    type: "Feature",
    properties: {
      source: routePreview.source,
    },
    geometry: {
      type: "LineString",
      coordinates: routePreview.coordinates.map((point) => [point.lng, point.lat]),
    },
  };

  return {
    type: "FeatureCollection",
    features: [feature],
  };
}

function buildDraftFeatureCollection(
  authoringMode: "none" | "route" | "zone" | "place",
  draftCoordinates: Array<{ lat: number; lng: number }>,
  draftRoutePreview: RoutePreview | null,
) {
  const features: Array<Feature<Geometry>> =
    authoringMode === "route"
      ? []
      : draftCoordinates.map((point, index) => ({
          type: "Feature",
          properties: {
            kind: "point",
            index,
            role: "vertex",
            label: String(index + 1),
          },
          geometry: {
            type: "Point",
            coordinates: [point.lng, point.lat],
          },
        }));

  if (draftCoordinates.length >= 2) {
    const routeLineCoordinates =
      authoringMode === "route" && draftRoutePreview?.coordinates.length
        ? draftRoutePreview.coordinates.map((point) => [point.lng, point.lat])
        : draftCoordinates.map((point) => [point.lng, point.lat]);
    features.push({
      type: "Feature",
      properties: {
        kind: authoringMode === "zone" ? "boundary" : "line",
      },
      geometry: {
        type: "LineString",
        coordinates: routeLineCoordinates,
      },
    });
  }

  if (authoringMode === "zone" && draftCoordinates.length >= 3) {
    const ring = draftCoordinates.map((point) => [point.lng, point.lat] as [number, number]);
    ring.push([draftCoordinates[0].lng, draftCoordinates[0].lat]);
    features.push({
      type: "Feature",
      properties: {
        kind: "fill",
      },
      geometry: {
        type: "Polygon",
        coordinates: [ring],
      },
    });
  }

  return {
    type: "FeatureCollection" as const,
    features,
  };
}

function buildSavedRoutesFeatureCollection(routes: MapRouteRecord[], selectedRouteId: string | null) {
  const features: Array<Feature<LineString>> = [];
  for (const route of routes) {
    const geometry = route.geometry;
    if (!geometry || geometry.type !== "LineString" || !Array.isArray(geometry.coordinates)) continue;
    const coordinates = geometry.coordinates.filter(
      (entry): entry is [number, number] =>
        Array.isArray(entry) &&
        entry.length >= 2 &&
        Number.isFinite(entry[0]) &&
        Number.isFinite(entry[1]),
    );
    if (!coordinates.length) continue;
    features.push({
      type: "Feature",
      properties: {
        id: route.id,
        title: route.title,
        color: route.colorToken || "#2f5f44",
        selected: route.id === selectedRouteId,
      },
      geometry: {
        type: "LineString",
        coordinates,
      },
    });
  }
  return {
    type: "FeatureCollection" as const,
    features,
  };
}

function buildZonesFeatureCollection(zones: MapZoneRecord[], selectedZoneId: string | null) {
  const features: Array<Feature<Geometry>> = [];
  for (const zone of zones) {
    const geometry = zone.geojson as Geometry | null;
    if (!geometry || typeof geometry !== "object" || !("type" in geometry)) continue;
    features.push({
      type: "Feature",
      properties: {
        id: zone.id,
        title: zone.title,
        color: zone.colorToken || "#8b5cf6",
        selected: zone.id === selectedZoneId,
      },
      geometry,
    });
  }
  return {
    type: "FeatureCollection" as const,
    features,
  };
}

function extendBoundsWithCoordinate(bounds: LngLatBounds, coordinate: [number, number]) {
  if (!Number.isFinite(coordinate[0]) || !Number.isFinite(coordinate[1])) return;
  bounds.extend(coordinate);
}

function appendGeometryCoordinates(
  geometry: Geometry | null | undefined,
  output: Array<[number, number]>,
) {
  if (!geometry) return;

  switch (geometry.type) {
    case "Point":
      if (
        Array.isArray(geometry.coordinates) &&
        geometry.coordinates.length >= 2 &&
        Number.isFinite(geometry.coordinates[0]) &&
        Number.isFinite(geometry.coordinates[1])
      ) {
        output.push([geometry.coordinates[0], geometry.coordinates[1]]);
      }
      return;
    case "MultiPoint":
    case "LineString":
      if (!Array.isArray(geometry.coordinates)) return;
      geometry.coordinates.forEach((coordinate) => {
        if (
          Array.isArray(coordinate) &&
          coordinate.length >= 2 &&
          Number.isFinite(coordinate[0]) &&
          Number.isFinite(coordinate[1])
        ) {
          output.push([coordinate[0], coordinate[1]]);
        }
      });
      return;
    case "MultiLineString":
    case "Polygon":
      if (!Array.isArray(geometry.coordinates)) return;
      geometry.coordinates.forEach((line) => {
        if (!Array.isArray(line)) return;
        line.forEach((coordinate) => {
          if (
            Array.isArray(coordinate) &&
            coordinate.length >= 2 &&
            Number.isFinite(coordinate[0]) &&
            Number.isFinite(coordinate[1])
          ) {
            output.push([coordinate[0], coordinate[1]]);
          }
        });
      });
      return;
    case "MultiPolygon":
      if (!Array.isArray(geometry.coordinates)) return;
      geometry.coordinates.forEach((polygon) => {
        if (!Array.isArray(polygon)) return;
        polygon.forEach((line) => {
          if (!Array.isArray(line)) return;
          line.forEach((coordinate) => {
            if (
              Array.isArray(coordinate) &&
              coordinate.length >= 2 &&
              Number.isFinite(coordinate[0]) &&
              Number.isFinite(coordinate[1])
            ) {
              output.push([coordinate[0], coordinate[1]]);
            }
          });
        });
      });
      return;
    case "GeometryCollection":
      geometry.geometries.forEach((entry) => appendGeometryCoordinates(entry, output));
      return;
    default:
      return;
  }
}

function collectVisibleCoordinates({
  points,
  savedRoutes,
  savedZones,
  activeLens,
  routePreview,
  destination,
  userLocation,
}: {
  points: MemoryMapItem[];
  savedRoutes: MapRouteRecord[];
  savedZones: MapZoneRecord[];
  activeLens: MapLensId;
  routePreview: RoutePreview | null;
  destination: { lat: number; lng: number; label: string } | null;
  userLocation: { lat: number; lng: number } | null;
}) {
  const coordinates: Array<[number, number]> = [];

  points.forEach((point) => {
    coordinates.push([point.lng, point.lat]);
  });

  if ((activeLens === "routes" || activeLens === "explore") && savedRoutes.length) {
    savedRoutes.forEach((route) => {
      const geometry = route.geometry;
      if (!geometry || geometry.type !== "LineString" || !Array.isArray(geometry.coordinates)) return;
      geometry.coordinates.forEach((coordinate) => {
        if (
          Array.isArray(coordinate) &&
          coordinate.length >= 2 &&
          Number.isFinite(coordinate[0]) &&
          Number.isFinite(coordinate[1])
        ) {
          coordinates.push([coordinate[0], coordinate[1]]);
        }
      });
    });
  }

  if ((activeLens === "symbolic" || activeLens === "explore") && savedZones.length) {
    savedZones.forEach((zone) => appendGeometryCoordinates(zone.geojson as Geometry, coordinates));
  }

  if (routePreview?.coordinates.length) {
    routePreview.coordinates.forEach((point) => {
      coordinates.push([point.lng, point.lat]);
    });
  }

  if (destination) coordinates.push([destination.lng, destination.lat]);
  if (userLocation) coordinates.push([userLocation.lng, userLocation.lat]);

  return coordinates;
}

function collectSelectedGeometryCoordinates({
  savedRoutes,
  savedZones,
  selectedRouteId,
  selectedZoneId,
}: {
  savedRoutes: MapRouteRecord[];
  savedZones: MapZoneRecord[];
  selectedRouteId: string | null;
  selectedZoneId: string | null;
}) {
  const coordinates: Array<[number, number]> = [];

  if (selectedRouteId) {
    const route = savedRoutes.find((entry) => entry.id === selectedRouteId);
    const geometry = route?.geometry;
    if (geometry?.type === "LineString" && Array.isArray(geometry.coordinates)) {
      geometry.coordinates.forEach((coordinate) => {
        if (
          Array.isArray(coordinate) &&
          coordinate.length >= 2 &&
          Number.isFinite(coordinate[0]) &&
          Number.isFinite(coordinate[1])
        ) {
          coordinates.push([coordinate[0], coordinate[1]]);
        }
      });
    }
  }

  if (selectedZoneId) {
    const zone = savedZones.find((entry) => entry.id === selectedZoneId);
    if (zone) appendGeometryCoordinates(zone.geojson as Geometry, coordinates);
  }

  return coordinates;
}

function syncRouteLayer(map: MapLibreMap, routePreview: RoutePreview | null) {
  const source = map.getSource(ROUTE_SOURCE_ID) as GeoJSONSource | undefined;
  const data = buildRouteFeature(routePreview);

  if (!source) {
    map.addSource(ROUTE_SOURCE_ID, {
      type: "geojson",
      data,
    });
    map.addLayer({
      id: ROUTE_LAYER_ID,
      type: "line",
      source: ROUTE_SOURCE_ID,
      paint: {
        "line-color": [
          "case",
          ["==", ["get", "source"], "fallback"],
          "#5c8df6",
          "#2b6ef2",
        ],
        "line-width": 5,
        "line-opacity": 0.9,
        "line-dasharray": [
          "case",
          ["==", ["get", "source"], "fallback"],
          ["literal", [2, 2]],
          ["literal", [1, 0]],
        ],
      },
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
    });
    return;
  }

  source.setData(data);
}

function syncSavedRoutesLayer(
  map: MapLibreMap,
  routes: MapRouteRecord[],
  selectedRouteId: string | null,
) {
  const source = map.getSource(SAVED_ROUTES_SOURCE_ID) as GeoJSONSource | undefined;
  const data = buildSavedRoutesFeatureCollection(routes, selectedRouteId);

  if (!source) {
    map.addSource(SAVED_ROUTES_SOURCE_ID, {
      type: "geojson",
      data,
    });
    map.addLayer({
      id: SAVED_ROUTES_LAYER_ID,
      type: "line",
      source: SAVED_ROUTES_SOURCE_ID,
      paint: {
        "line-color": ["coalesce", ["get", "color"], "#2f5f44"],
        "line-width": [
          "case",
          ["boolean", ["get", "selected"], false],
          6,
          4,
        ],
        "line-opacity": [
          "case",
          ["boolean", ["get", "selected"], false],
          0.95,
          0.78,
        ],
      },
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
    });
    return;
  }

  source.setData(data);
}

function syncZonesLayer(
  map: MapLibreMap,
  zones: MapZoneRecord[],
  selectedZoneId: string | null,
) {
  const source = map.getSource(ZONES_SOURCE_ID) as GeoJSONSource | undefined;
  const data = buildZonesFeatureCollection(zones, selectedZoneId);

  if (!source) {
    map.addSource(ZONES_SOURCE_ID, {
      type: "geojson",
      data,
    });
    map.addLayer({
      id: ZONES_FILL_LAYER_ID,
      type: "fill",
      source: ZONES_SOURCE_ID,
      paint: {
        "fill-color": ["coalesce", ["get", "color"], "#8b5cf6"],
        "fill-opacity": [
          "case",
          ["boolean", ["get", "selected"], false],
          0.2,
          0.12,
        ],
      },
      filter: ["any", ["==", ["geometry-type"], "Polygon"], ["==", ["geometry-type"], "MultiPolygon"]],
    });
    map.addLayer({
      id: ZONES_LINE_LAYER_ID,
      type: "line",
      source: ZONES_SOURCE_ID,
      paint: {
        "line-color": ["coalesce", ["get", "color"], "#7c3aed"],
        "line-width": [
          "case",
          ["boolean", ["get", "selected"], false],
          3,
          2,
        ],
        "line-opacity": [
          "case",
          ["boolean", ["get", "selected"], false],
          0.9,
          0.65,
        ],
      },
      filter: ["any", ["==", ["geometry-type"], "Polygon"], ["==", ["geometry-type"], "MultiPolygon"]],
    });
    return;
  }

  source.setData(data);
}

function syncDraftLayer(
  map: MapLibreMap,
  authoringMode: "none" | "route" | "zone" | "place",
  draftCoordinates: Array<{ lat: number; lng: number }>,
  draftRoutePreview: RoutePreview | null,
) {
  const source = map.getSource(DRAFT_SOURCE_ID) as GeoJSONSource | undefined;
  const data = buildDraftFeatureCollection(authoringMode, draftCoordinates, draftRoutePreview);

  if (!source) {
    map.addSource(DRAFT_SOURCE_ID, {
      type: "geojson",
      data,
    });
    map.addLayer({
      id: DRAFT_FILL_LAYER_ID,
      type: "fill",
      source: DRAFT_SOURCE_ID,
      filter: ["==", ["get", "kind"], "fill"],
      paint: {
        "fill-color": "#7c3aed",
        "fill-opacity": 0.12,
      },
    });
    map.addLayer({
      id: DRAFT_LINE_LAYER_ID,
      type: "line",
      source: DRAFT_SOURCE_ID,
      filter: ["any", ["==", ["get", "kind"], "line"], ["==", ["get", "kind"], "boundary"]],
      paint: {
        "line-color": [
          "case",
          ["==", ["get", "kind"], "boundary"],
          "#7c3aed",
          "#0f766e",
        ],
        "line-width": 3,
        "line-dasharray": ["literal", [2, 1.5]],
      },
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
    });
    map.addLayer({
      id: DRAFT_POINTS_LAYER_ID,
      type: "circle",
      source: DRAFT_SOURCE_ID,
      filter: ["==", ["get", "kind"], "point"],
      paint: {
        "circle-radius": [
          "case",
          ["==", ["get", "role"], "vertex"],
          7,
          0,
        ],
        "circle-color": [
          "case",
          ["==", ["get", "role"], "vertex"],
          "#ede9fe",
          "#ede9fe",
        ],
        "circle-stroke-width": [
          "case",
          ["==", ["get", "role"], "vertex"],
          2,
          0,
        ],
        "circle-stroke-color": [
          "case",
          ["==", ["get", "role"], "vertex"],
          "#7c3aed",
          "#7c3aed",
        ],
        "circle-opacity": 0.98,
      },
    });
    map.addLayer({
      id: DRAFT_LABELS_LAYER_ID,
      type: "symbol",
      source: DRAFT_SOURCE_ID,
      filter: ["==", ["get", "kind"], "point"],
      layout: {
        "text-field": ["get", "label"],
        "text-size": 11,
        "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
        "text-offset": [0, 0],
        "text-allow-overlap": true,
      },
      paint: {
        "text-color": "#1f2937",
      },
    });
    return;
  }

  source.setData(data);
  if (map.getLayer(DRAFT_POINTS_LAYER_ID)) {
    map.setPaintProperty(
      DRAFT_POINTS_LAYER_ID,
      "circle-stroke-color",
      "#7c3aed",
    );
    map.setPaintProperty(
      DRAFT_POINTS_LAYER_ID,
      "circle-color",
      "#ede9fe",
    );
  }
}

function makeDraftRouteMarkerElement(role: "origin" | "destination") {
  const isOrigin = role === "origin";
  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";
  wrapper.style.alignItems = "center";
  wrapper.style.transform = "translateY(-2px)";
  wrapper.style.pointerEvents = "none";

  const bubble = document.createElement("div");
  bubble.style.width = "28px";
  bubble.style.height = "28px";
  bubble.style.borderRadius = "999px";
  bubble.style.display = "flex";
  bubble.style.alignItems = "center";
  bubble.style.justifyContent = "center";
  bubble.style.background = isOrigin ? "#dcfce7" : "#fee2e2";
  bubble.style.border = `2px solid ${isOrigin ? "#0f766e" : "#be123c"}`;
  bubble.style.color = isOrigin ? "#14532d" : "#7f1d1d";
  bubble.style.fontSize = "12px";
  bubble.style.fontWeight = "700";
  bubble.style.boxShadow = "0 8px 18px rgba(15,23,42,0.18)";
  bubble.textContent = isOrigin ? "A" : "B";

  const stem = document.createElement("div");
  stem.style.width = "2px";
  stem.style.height = "10px";
  stem.style.borderRadius = "999px";
  stem.style.marginTop = "-1px";
  stem.style.background = isOrigin ? "#0f766e" : "#be123c";

  wrapper.appendChild(bubble);
  wrapper.appendChild(stem);
  return wrapper;
}

export default function MemoriesMap({
  memories,
  immersive = false,
  markerKindById,
  selectedMemoryId = null,
  selectedRouteId = null,
  selectedZoneId = null,
  onMarkerSelect,
  onSavedRouteSelect,
  onZoneSelect,
  authoringMode = "none",
  draftCoordinates = [],
  draftRoutePreview = null,
  onMapCoordinateAdd,
  onMapCenterChange,
  onMapInteract,
  focusTarget = null,
  userLocation = null,
  destination = null,
  routePreview = null,
  savedRoutes = [],
  savedZones = [],
  activeLens = "explore",
  mapConfig = FALLBACK_MAP_CONFIG,
}: {
  memories: MemoryMapItem[];
  immersive?: boolean;
  markerKindById?: Record<string, MapMarkerKind>;
  selectedMemoryId?: string | null;
  selectedRouteId?: string | null;
  selectedZoneId?: string | null;
  onMarkerSelect?: (memory: MemoryMapItem) => void;
  onSavedRouteSelect?: (route: MapRouteRecord) => void;
  onZoneSelect?: (zone: MapZoneRecord) => void;
  authoringMode?: "none" | "route" | "zone" | "place";
  draftCoordinates?: Array<{ lat: number; lng: number }>;
  draftRoutePreview?: RoutePreview | null;
  onMapCoordinateAdd?: (coordinate: { lat: number; lng: number }) => void;
  onMapCenterChange?: (center: { lat: number; lng: number }) => void;
  onMapInteract?: () => void;
  focusTarget?: { lat: number; lng: number; zoom?: number } | null;
  userLocation?: { lat: number; lng: number; heading: number | null; accuracy: number | null } | null;
  destination?: { lat: number; lng: number; label: string } | null;
  routePreview?: RoutePreview | null;
  savedRoutes?: MapRouteRecord[];
  savedZones?: MapZoneRecord[];
  activeLens?: MapLensId;
  mapConfig?: MapRuntimeConfig;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRefs = useRef<Marker[]>([]);
  const draftMarkerRefs = useRef<Marker[]>([]);
  const mapReadyRef = useRef(false);
  const authoringPointerStartRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const sorted = useMemo(
    () =>
      [...memories].sort((left, right) => {
        if (left.sourceType !== right.sourceType) {
          return left.sourceType === "place" ? -1 : 1;
        }
        const da = Date.parse(left.date);
        const db = Date.parse(right.date);
        if (Number.isFinite(da) && Number.isFinite(db)) return db - da;
        return right.date.localeCompare(left.date);
      }),
    [memories],
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const container = containerRef.current;
    let initErrorFrame: number | null = null;

    if (!container.isConnected) return;

    let map: MapLibreMap;
    try {
      map = new maplibregl.Map({
        container,
        style: createBaseMapStyle(),
        center: { lng: DEFAULT_CENTER[0], lat: DEFAULT_CENTER[1] },
        zoom: DEFAULT_ZOOM,
        attributionControl: false,
        dragRotate: false,
        touchPitch: false,
        pitchWithRotate: false,
        maxCanvasSize: [4096, 4096],
      });
    } catch (error) {
      console.error("No se pudo inicializar MapLibre", error);
      const errorMessage = error instanceof Error ? error.message : "No se pudo abrir el mapa.";
      initErrorFrame = window.requestAnimationFrame(() => {
        setInitError(errorMessage);
      });
      return () => {
        if (initErrorFrame !== null) {
          window.cancelAnimationFrame(initErrorFrame);
        }
      };
    }

    initErrorFrame = window.requestAnimationFrame(() => {
      setInitError(null);
    });

    map.setRenderWorldCopies(false);
    map.setMaxZoom(18);
    map.setMinZoom(immersive ? 4 : 3);

    map.addControl(new AttributionControl({ compact: true }), "bottom-right");
    map.addControl(
      new NavigationControl({ showCompass: false, visualizePitch: false }),
      "top-right",
    );
    if (immersive) {
      const topRightControls = container.querySelector(".maplibregl-ctrl-top-right") as HTMLElement | null;
      if (topRightControls) {
        topRightControls.style.top = IMMERSIVE_NAV_TOP_OFFSET;
        topRightControls.style.right = IMMERSIVE_NAV_RIGHT_OFFSET;
      }
    }

    map.once("load", () => {
      mapReadyRef.current = true;
      setMapReady(true);
      const center = map.getCenter();
      onMapCenterChange?.({ lat: center.lat, lng: center.lng });
    });

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            window.requestAnimationFrame(() => map.resize());
          })
        : null;
    observer?.observe(containerRef.current);

    mapRef.current = map;

    return () => {
      if (initErrorFrame !== null) {
        window.cancelAnimationFrame(initErrorFrame);
      }
      observer?.disconnect();
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      draftMarkerRefs.current.forEach((marker) => marker.remove());
      draftMarkerRefs.current = [];
      map.remove();
      mapRef.current = null;
      mapReadyRef.current = false;
      setMapReady(false);
    };
  }, [immersive, onMapCenterChange]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const resize = () => map.resize();
    const rafA = window.requestAnimationFrame(resize);
    const rafB = window.requestAnimationFrame(resize);
    window.addEventListener("resize", resize);
    return () => {
      window.cancelAnimationFrame(rafA);
      window.cancelAnimationFrame(rafB);
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (focusTarget) {
      map.flyTo({
        center: [focusTarget.lng, focusTarget.lat],
        zoom: focusTarget.zoom ?? DESTINATION_ZOOM,
        duration: 850,
        essential: true,
      });
      return;
    }

    if (authoringMode !== "none") {
      return;
    }

    if (!immersive) {
      const visibleCoordinates = collectVisibleCoordinates({
        points: sorted,
        savedRoutes,
        savedZones,
        activeLens,
        routePreview,
        destination,
        userLocation,
      });

      if (!visibleCoordinates.length) {
        map.easeTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM, duration: 0 });
        return;
      }
      if (visibleCoordinates.length === 1) {
        map.easeTo({ center: visibleCoordinates[0], zoom: 12, duration: 0 });
        return;
      }
      const bounds = new LngLatBounds();
      visibleCoordinates.forEach((coordinate) => extendBoundsWithCoordinate(bounds, coordinate));
      map.fitBounds(bounds, { padding: 48, duration: 0 });
      return;
    }

    const selectedGeometryCoordinates = collectSelectedGeometryCoordinates({
      savedRoutes,
      savedZones,
      selectedRouteId,
      selectedZoneId,
    });

    if (selectedGeometryCoordinates.length === 1) {
      map.easeTo({
        center: selectedGeometryCoordinates[0],
        zoom: 12.5,
        duration: 0,
      });
      return;
    }

    if (selectedGeometryCoordinates.length > 1) {
      const bounds = new LngLatBounds();
      selectedGeometryCoordinates.forEach((coordinate) => extendBoundsWithCoordinate(bounds, coordinate));
      map.fitBounds(bounds, {
        padding: { top: 112, right: 24, bottom: 196, left: 24 },
        duration: 0,
      });
      return;
    }

    const transientCoordinates = collectVisibleCoordinates({
      points: [],
      savedRoutes: [],
      savedZones: [],
      activeLens,
      routePreview,
      destination,
      userLocation: null,
    });

    if (transientCoordinates.length === 1) {
      map.easeTo({
        center: transientCoordinates[0],
        zoom: routePreview ? 13 : DESTINATION_ZOOM,
        duration: 0,
      });
      return;
    }

    if (transientCoordinates.length > 1) {
      const bounds = new LngLatBounds();
      transientCoordinates.forEach((coordinate) => extendBoundsWithCoordinate(bounds, coordinate));
      map.fitBounds(bounds, {
        padding: { top: 112, right: 24, bottom: 196, left: 24 },
        duration: 0,
      });
      return;
    }

    map.easeTo({
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      duration: 0,
    });
  }, [
    mapReady,
    focusTarget,
    immersive,
    sorted,
    savedRoutes,
    savedZones,
    activeLens,
    routePreview,
    destination,
    userLocation,
    authoringMode,
    selectedRouteId,
    selectedZoneId,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    syncRouteLayer(map, routePreview);
  }, [mapReady, routePreview]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    syncSavedRoutesLayer(
      map,
      activeLens === "routes" || activeLens === "explore" ? savedRoutes : [],
      selectedRouteId,
    );
  }, [mapReady, activeLens, savedRoutes, selectedRouteId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    syncZonesLayer(
      map,
      activeLens === "symbolic" || activeLens === "explore" ? savedZones : [],
      selectedZoneId,
    );
  }, [mapReady, activeLens, savedZones, selectedZoneId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    syncDraftLayer(map, authoringMode, draftCoordinates, draftRoutePreview);
  }, [mapReady, authoringMode, draftCoordinates, draftRoutePreview]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    draftMarkerRefs.current.forEach((marker) => marker.remove());
    draftMarkerRefs.current = [];

    if (authoringMode !== "route") return;

    draftCoordinates.slice(0, 2).forEach((point, index) => {
      const role = index === 0 ? "origin" : "destination";
      const marker = new Marker({
        element: makeDraftRouteMarkerElement(role),
        anchor: "bottom",
      })
        .setLngLat([point.lng, point.lat])
        .addTo(map);
      draftMarkerRefs.current.push(marker);
    });

    return () => {
      draftMarkerRefs.current.forEach((marker) => marker.remove());
      draftMarkerRefs.current = [];
    };
  }, [mapReady, authoringMode, draftCoordinates]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.getCanvas().style.cursor = authoringMode === "none" ? "" : "crosshair";

    return () => {
      map.getCanvas().style.cursor = "";
    };
  }, [authoringMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !onMapCoordinateAdd || authoringMode === "none") {
      return;
    }
    const interactionTarget = map.getCanvasContainer();

    const maxTapDistance = 8;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      authoringPointerStartRef.current = {
        x: event.clientX,
        y: event.clientY,
        pointerId: event.pointerId,
      };
    };

    const handlePointerUp = (event: PointerEvent) => {
      const start = authoringPointerStartRef.current;
      authoringPointerStartRef.current = null;
      if (!start || start.pointerId !== event.pointerId) return;

      const deltaX = event.clientX - start.x;
      const deltaY = event.clientY - start.y;
      const moved = Math.hypot(deltaX, deltaY);
      if (moved > maxTapDistance) return;

      const rect = interactionTarget.getBoundingClientRect();
      const point = [event.clientX - rect.left, event.clientY - rect.top] as [number, number];
      const lngLat = map.unproject(point);
      onMapCoordinateAdd({
        lat: lngLat.lat,
        lng: lngLat.lng,
      });
    };

    const handlePointerCancel = () => {
      authoringPointerStartRef.current = null;
    };

    interactionTarget.addEventListener("pointerdown", handlePointerDown, true);
    interactionTarget.addEventListener("pointerup", handlePointerUp, true);
    interactionTarget.addEventListener("pointercancel", handlePointerCancel, true);

    return () => {
      interactionTarget.removeEventListener("pointerdown", handlePointerDown, true);
      interactionTarget.removeEventListener("pointerup", handlePointerUp, true);
      interactionTarget.removeEventListener("pointercancel", handlePointerCancel, true);
      authoringPointerStartRef.current = null;
    };
  }, [mapReady, authoringMode, onMapCoordinateAdd]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !onMapInteract || authoringMode !== "none") return;

    const handleMapPointerDown = (event: maplibregl.MapMouseEvent | maplibregl.MapTouchEvent) => {
      const target = event.originalEvent?.target;
      if (!(target instanceof HTMLElement)) {
        onMapInteract();
        return;
      }

      if (
        target.closest(".maplibregl-marker") ||
        target.closest(".maplibregl-popup") ||
        target.closest(".maplibregl-ctrl")
      ) {
        return;
      }

      onMapInteract();
    };

    map.on("mousedown", handleMapPointerDown);
    map.on("touchstart", handleMapPointerDown);

    return () => {
      map.off("mousedown", handleMapPointerDown);
      map.off("touchstart", handleMapPointerDown);
    };
  }, [authoringMode, mapReady, onMapInteract]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !onMapCenterChange) return;

    const emitCenter = () => {
      const center = map.getCenter();
      onMapCenterChange({ lat: center.lat, lng: center.lng });
    };

    emitCenter();
    map.on("move", emitCenter);
    return () => {
      map.off("move", emitCenter);
    };
  }, [mapReady, onMapCenterChange]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (authoringMode !== "none") return;

    const routeById = new Map(savedRoutes.map((route) => [route.id, route]));
    const zoneById = new Map(savedZones.map((zone) => [zone.id, zone]));

    const handleRouteClick = (event: maplibregl.MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const id =
        feature && feature.properties && typeof feature.properties.id === "string"
          ? feature.properties.id
          : null;
      if (!id) return;
      const route = routeById.get(id);
      if (route) onSavedRouteSelect?.(route);
    };

    const handleZoneClick = (event: maplibregl.MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const id =
        feature && feature.properties && typeof feature.properties.id === "string"
          ? feature.properties.id
          : null;
      if (!id) return;
      const zone = zoneById.get(id);
      if (zone) onZoneSelect?.(zone);
    };

    const handlePointerEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };

    const handlePointerLeave = () => {
      map.getCanvas().style.cursor = "";
    };

    if (map.getLayer(SAVED_ROUTES_LAYER_ID)) {
      map.on("click", SAVED_ROUTES_LAYER_ID, handleRouteClick);
      map.on("mouseenter", SAVED_ROUTES_LAYER_ID, handlePointerEnter);
      map.on("mouseleave", SAVED_ROUTES_LAYER_ID, handlePointerLeave);
    }
    if (map.getLayer(ZONES_FILL_LAYER_ID)) {
      map.on("click", ZONES_FILL_LAYER_ID, handleZoneClick);
      map.on("mouseenter", ZONES_FILL_LAYER_ID, handlePointerEnter);
      map.on("mouseleave", ZONES_FILL_LAYER_ID, handlePointerLeave);
    }
    if (map.getLayer(ZONES_LINE_LAYER_ID)) {
      map.on("click", ZONES_LINE_LAYER_ID, handleZoneClick);
      map.on("mouseenter", ZONES_LINE_LAYER_ID, handlePointerEnter);
      map.on("mouseleave", ZONES_LINE_LAYER_ID, handlePointerLeave);
    }

    return () => {
      const cleanupMap = mapRef.current;
      if (!cleanupMap) return;

      if (cleanupMap.getLayer(SAVED_ROUTES_LAYER_ID)) {
        cleanupMap.off("click", SAVED_ROUTES_LAYER_ID, handleRouteClick);
        cleanupMap.off("mouseenter", SAVED_ROUTES_LAYER_ID, handlePointerEnter);
        cleanupMap.off("mouseleave", SAVED_ROUTES_LAYER_ID, handlePointerLeave);
      }
      if (cleanupMap.getLayer(ZONES_FILL_LAYER_ID)) {
        cleanupMap.off("click", ZONES_FILL_LAYER_ID, handleZoneClick);
        cleanupMap.off("mouseenter", ZONES_FILL_LAYER_ID, handlePointerEnter);
        cleanupMap.off("mouseleave", ZONES_FILL_LAYER_ID, handlePointerLeave);
      }
      if (cleanupMap.getLayer(ZONES_LINE_LAYER_ID)) {
        cleanupMap.off("click", ZONES_LINE_LAYER_ID, handleZoneClick);
        cleanupMap.off("mouseenter", ZONES_LINE_LAYER_ID, handlePointerEnter);
        cleanupMap.off("mouseleave", ZONES_LINE_LAYER_ID, handlePointerLeave);
      }
      cleanupMap.getCanvas().style.cursor = "";
    };
  }, [mapReady, activeLens, authoringMode, onSavedRouteSelect, onZoneSelect, savedRoutes, savedZones]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;

    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];

    for (const point of sorted) {
      const markerKind =
        selectedMemoryId === point.id
          ? "selected"
          : markerKindById?.[point.id] ?? (point.isFavorite ? "favorite" : "memory");
      const markerElement = makeMarkerElement(markerKind, point, mapConfig);
      markerElement.style.pointerEvents = authoringMode === "none" ? "auto" : "none";
      const popup = new Popup({
        offset: 18,
        maxWidth: "292px",
        closeButton: false,
        closeOnClick: false,
        className: "lv-map-popup",
      }).setHTML(buildMemoryPopupHtml(point, mapConfig));

      markerElement.addEventListener("click", () => {
        onMarkerSelect?.(point);
      });

      const marker = new Marker({
        element: markerElement,
        anchor: "bottom",
      })
        .setLngLat([point.lng, point.lat])
        .setPopup(popup)
        .addTo(map);

      marker.getElement().addEventListener("mouseenter", () => marker.togglePopup());
      marker.getElement().addEventListener("mouseleave", () => {
        if (selectedMemoryId !== point.id) {
          marker.getPopup()?.remove();
        }
      });

      markerRefs.current.push(marker);
    }

    if (destination) {
      const element = makeMarkerElement("destination");
      element.style.pointerEvents = authoringMode === "none" ? "auto" : "none";
      const marker = new Marker({
        element,
        anchor: "bottom",
      })
        .setLngLat([destination.lng, destination.lat])
        .setPopup(
          new Popup({ offset: 18, closeButton: false }).setHTML(
            `<div style="display:grid;gap:4px;color:#27362f">
              <div style="font-size:14px;font-weight:700;">${escapeHtml(destination.label)}</div>
              <div style="font-size:12px;opacity:.7;">Destino seleccionado</div>
            </div>`,
          ),
        )
        .addTo(map);
      markerRefs.current.push(marker);
    }

    if (userLocation) {
      const element = makeUserLocationMarkerElement(userLocation.heading ?? null);
      element.style.pointerEvents = authoringMode === "none" ? "auto" : "none";
      const marker = new Marker({
        element,
        anchor: "center",
      })
        .setLngLat([userLocation.lng, userLocation.lat])
        .setPopup(
          new Popup({ offset: 12, closeButton: false }).setHTML(
            `<div style="font-size:12px;color:#27362f">Tu ubicación actual${
              userLocation.accuracy != null
                ? ` · ±${Math.round(userLocation.accuracy)} m`
                : ""
            }</div>`,
          ),
        )
        .addTo(map);
      markerRefs.current.push(marker);
    }

    return () => {
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
    };
  }, [authoringMode, destination, mapConfig, markerKindById, onMarkerSelect, selectedMemoryId, sorted, userLocation]);

  return (
    <div className={immersive ? "relative h-full w-full overflow-hidden" : "space-y-3"}>
      <div
        className={`relative overflow-hidden rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] ${
          immersive ? "h-full rounded-none border-0" : "h-[420px] sm:h-[460px]"
        }`}
      >
        <div ref={containerRef} className="h-full w-full" />
        {initError ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[color-mix(in_srgb,var(--lv-surface)_88%,transparent)] p-4 text-center backdrop-blur-sm">
            <div className="max-w-sm rounded-2xl border border-[var(--lv-danger)] bg-[var(--lv-danger-soft)] p-4 text-sm text-[var(--lv-danger)] shadow-[var(--lv-shadow-md)]">
              No se pudo abrir el mapa ahora mismo.
              <div className="mt-2 text-xs opacity-80">{initError}</div>
            </div>
          </div>
        ) : null}
      </div>

      {!sorted.length && !immersive ? (
        <div className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-3 text-sm text-[var(--lv-text-muted)]">
          Aún no hay recuerdos con GPS. Cuando guardes ubicaciones, aparecerán pines aquí.
        </div>
      ) : null}
    </div>
  );
}




