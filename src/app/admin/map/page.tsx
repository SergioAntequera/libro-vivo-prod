"use client";

import dynamic from "next/dynamic";
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { ensureSuperadminOrRedirect } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  withGardenIdOnInsert,
  withGardenScope,
} from "@/lib/gardens";
import {
  AdminInlineNote,
  AdminPanel,
  AdminToggleGroup,
} from "@/components/admin/AdminWorkspace";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { StatusNotice } from "@/components/ui/StatusNotice";
import {
  extractPageSnippet,
  isMissingLocationColumnsError,
  toErrorMessage,
} from "@/lib/homePageUtils";
import { mapGardenPlanTypeRow } from "@/lib/planTypeCatalog";
import { getFlowerFamilyFromLegacyElement } from "@/lib/productDomainContracts";
import { mapPlaceRecordToPoint } from "@/lib/homeMapEntities";
import { useMapRuntimeConfig } from "@/components/home/useMapRuntimeConfig";
import type { MapPointItem } from "@/lib/homeMapTypes";
import {
  mapPlaceRowToRecord,
  mapRouteRowToRecord,
  mapZoneRowToRecord,
  type MapPlaceKind,
  type MapPlaceRecord,
  type MapPlaceState,
  type MapRouteKind,
  type MapRouteRecord,
  type MapRouteStatus,
  type MapRouteTravelMode,
  type MapZoneKind,
  type MapZoneRecord,
  type MapZoneStatus,
} from "@/lib/mapDomainTypes";
import {
  MAP_RUNTIME_LENS_IDS,
  getFallbackMapRuntimeConfig,
  isMapCatalogAssetPath,
  type MapLensCatalogItem,
  type MapPlaceKindCatalogItem,
  type MapPlaceStateCatalogItem,
  type MapRuntimeConfig,
  type MapRuntimeLensId,
  resolveMapPlaceKindLabel,
  resolveMapPlaceStateLabel,
} from "@/lib/mapCatalogConfig";
import { reverseGeocodePoint } from "@/lib/homeMapApi";
import { useHomeMapRoutePreview } from "@/components/home/useHomeMapRoutePreview";
import {
  buildAdminMapPreviewScenario,
  type AdminMapPreviewScenarioId,
} from "@/lib/adminMapPreviewScenario";
import {
  buildMapValidationIssues,
  type MapValidationIssue,
} from "@/lib/adminDiagnostics";
import {
  getDefaultValidationRules,
  loadValidationRulesForDomain,
  type ValidationRuleDefinition,
} from "@/lib/adminValidationRules";

const MemoriesMap = dynamic(() => import("@/components/home/MemoriesMap"), {
  ssr: false,
});

type MapAdminMode =
  | "preview"
  | "places"
  | "routes"
  | "visual"
  | "validation"
  | "advanced";

type MemoryScope = "current_year" | "all_years";
type AuthoringMode = "none" | "place" | "route";
type SaveTone = "place" | "route" | "visual" | "advanced" | "semantic";
type MapSemanticScope = "types" | "states" | "lenses";
type MapSemanticCatalogKey = "map_place_kinds" | "map_place_states" | "map_lenses";
type MapPreviewSource = "global_demo" | "garden_runtime";
type OverlayPanelId = "control" | "raw";
type OverlayPanelDrag =
  | {
      panel: OverlayPanelId;
      startClientX: number;
      startClientY: number;
      startOffsetX: number;
      startOffsetY: number;
    }
  | null;

type MapPageRow = {
  id: string;
  title: string | null;
  date: string | null;
  element: string | null;
  plan_type_id: string | null;
  rating: number | null;
  cover_photo_url: string | null;
  thumbnail_url: string | null;
  canvas_objects: unknown;
  location_lat: number | string | null;
  location_lng: number | string | null;
  location_label: string | null;
  is_favorite: boolean | null;
};

type PlaceDraft = {
  title: string;
  subtitle: string;
  notes: string;
  kind: MapPlaceKind;
  state: MapPlaceState;
  iconCode: string;
  colorToken: string;
  tagsText: string;
  metadataText: string;
  lat: string;
  lng: string;
  rating: string;
};

type RouteDraft = {
  title: string;
  subtitle: string;
  notes: string;
  kind: MapRouteKind;
  status: MapRouteStatus;
  travelMode: MapRouteTravelMode;
  colorToken: string;
  iconCode: string;
  tagsText: string;
  metadataText: string;
  originLabel: string;
  destinationLabel: string;
};

type ZoneDraft = {
  title: string;
  subtitle: string;
  description: string;
  kind: MapZoneKind;
  status: MapZoneStatus;
  colorToken: string;
  iconCode: string;
  tagsText: string;
  metadataText: string;
};

type MapSemanticDraft = {
  catalogKey: MapSemanticCatalogKey;
  code: string;
  label: string;
  icon: string;
  color: string;
  description: string;
  enabled: boolean;
  sortOrder: string;
  group: "primary" | "secondary";
};

type MapSemanticCatalogRow = {
  id: string;
  catalog_key: MapSemanticCatalogKey;
  code: string | null;
  label: string | null;
  sort_order: number | null;
  enabled: boolean | null;
  color: string | null;
  icon: string | null;
  metadata: Record<string, unknown> | null;
};

type MapSemanticItem = {
  id: string | null;
  catalogKey: MapSemanticCatalogKey;
  code: string;
  label: string;
  icon: string;
  color: string;
  description: string;
  enabled: boolean;
  sortOrder: number;
  group: "primary" | "secondary";
  source: "catalog" | "fallback";
};

const MODE_OPTIONS: Array<{ key: MapAdminMode; label: string }> = [
  { key: "preview", label: "Preview" },
  { key: "places", label: "Lugares" },
  { key: "routes", label: "Rutas" },
  { key: "visual", label: "Visual" },
  { key: "validation", label: "Validacion" },
  { key: "advanced", label: "Avanzado" },
];

const MAP_SEMANTIC_SCOPE_OPTIONS: Array<{ key: MapSemanticScope; label: string }> = [
  { key: "types", label: "Tipos" },
  { key: "states", label: "Estados" },
  { key: "lenses", label: "Lentes" },
];

const MAP_DEMO_SCENARIO_OPTIONS: Array<{ key: AdminMapPreviewScenarioId; label: string }> = [
  { key: "empty", label: "Lienzo vacío" },
  { key: "pins", label: "Pins" },
  { key: "journey", label: "Ruta demo" },
];

const MAP_SEMANTIC_SCOPE_META: Record<
  MapSemanticScope,
  { label: string; description: string; allowCreate: boolean }
> = {
  types: {
    label: "Tipos de lugar",
    description: "Definen el pin base, el label y el tono visual de cada clase de sitio.",
    allowCreate: true,
  },
  states: {
    label: "Estados del lugar",
    description: "Definen el lenguaje visible de guardado, favorito, visitado y estados nuevos.",
    allowCreate: true,
  },
  lenses: {
    label: "Lentes del mapa",
    description: "Definen la navegación visible del mapa. Aquí se editan, no se inventan comportamientos nuevos.",
    allowCreate: false,
  },
};

const ROUTE_KIND_LABELS: Record<MapRouteKind, string> = {
  walk: "Paseo",
  drive: "Coche",
  date_route: "Ruta cita",
  trip: "Escapada",
  ritual: "Ritual",
  custom: "Especial",
};

const ROUTE_STATUS_LABELS: Record<MapRouteStatus, string> = {
  draft: "Borrador",
  saved: "Guardada",
  archived: "Archivada",
};

const ROUTE_TRAVEL_MODE_LABELS: Record<MapRouteTravelMode, string> = {
  walking: "Andando",
  driving: "Conducir",
  cycling: "Bici",
  transit: "Transporte",
  mixed: "Mixto",
};

const ZONE_KIND_LABELS: Record<MapZoneKind, string> = {
  symbolic: "Simbolica",
  favorite_area: "Zona favorita",
  memory_area: "Zona de memoria",
  meeting_area: "Zona de encuentro",
  avoid_area: "Zona a evitar",
  custom: "Especial",
};

const ZONE_STATUS_LABELS: Record<MapZoneStatus, string> = {
  active: "Activa",
  archived: "Archivada",
};

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function parseTagsText(raw: string) {
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
}

function parseNumberOrNull(raw: string) {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseMetadataText(raw: string) {
  if (!raw.trim()) return { ok: true as const, value: {} as Record<string, unknown> };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        ok: false as const,
        error: "Metadata debe ser un objeto JSON válido.",
      };
    }
    return { ok: true as const, value: parsed as Record<string, unknown> };
  } catch {
    return {
      ok: false as const,
      error: "Metadata debe ser un objeto JSON válido.",
    };
  }
}

function stringifyMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "{}";
  return JSON.stringify(value, null, 2);
}

function buildPlaceDraftFromRecord(place: MapPlaceRecord): PlaceDraft {
  return {
    title: place.title,
    subtitle: place.subtitle ?? place.addressLabel ?? "",
    notes: place.notes ?? "",
    kind: place.kind,
    state: place.state,
    iconCode: place.iconCode ?? "",
    colorToken: place.colorToken ?? "",
    tagsText: place.tags.join(", "),
    metadataText: stringifyMetadata(place.metadata),
    lat: String(place.lat),
    lng: String(place.lng),
    rating: place.rating != null ? String(place.rating) : "",
  };
}

function buildPlaceDraftFromPoint(input: {
  lat: number;
  lng: number;
  title: string;
  subtitle: string;
}): PlaceDraft {
  return {
    title: input.title,
    subtitle: input.subtitle,
    notes: "",
    kind: "spot",
    state: "saved",
    iconCode: "",
    colorToken: "",
    tagsText: "",
    metadataText: "{}",
    lat: String(input.lat),
    lng: String(input.lng),
    rating: "",
  };
}

function buildRouteDraftFromRecord(route: MapRouteRecord): RouteDraft {
  return {
    title: route.title,
    subtitle: route.subtitle ?? "",
    notes: route.notes ?? "",
    kind: route.kind,
    status: route.status,
    travelMode: route.travelMode,
    colorToken: route.colorToken ?? "",
    iconCode: route.iconCode ?? "",
    tagsText: route.tags.join(", "),
    metadataText: stringifyMetadata(route.metadata),
    originLabel: route.originLabel ?? "",
    destinationLabel: route.destinationLabel ?? "",
  };
}

function buildNewRouteDraft(): RouteDraft {
  return {
    title: "",
    subtitle: "",
    notes: "",
    kind: "walk",
    status: "saved",
    travelMode: "walking",
    colorToken: "#2f5f44",
    iconCode: "",
    tagsText: "",
    metadataText: "{}",
    originLabel: "",
    destinationLabel: "",
  };
}

function buildZoneDraftFromRecord(zone: MapZoneRecord): ZoneDraft {
  return {
    title: zone.title,
    subtitle: zone.subtitle ?? "",
    description: zone.description ?? "",
    kind: zone.kind,
    status: zone.status,
    colorToken: zone.colorToken ?? "",
    iconCode: zone.iconCode ?? "",
    tagsText: zone.tags.join(", "),
    metadataText: stringifyMetadata(zone.metadata),
  };
}

function compactDistanceLabel(value: number | null) {
  if (!value || value <= 0) return "Sin distancia";
  if (value < 1000) return `${Math.round(value)} m`;
  return `${(value / 1000).toFixed(1)} km`;
}

function compactDurationLabel(value: number | null) {
  if (!value || value <= 0) return "Sin duracion";
  if (value < 3600) return `${Math.max(1, Math.round(value / 60))} min`;
  const hours = Math.floor(value / 3600);
  const minutes = Math.round((value % 3600) / 60);
  return `${hours} h ${minutes} min`;
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function geometryCoordinates(
  geometry: MapRouteRecord["geometry"] | MapZoneRecord["geojson"] | null | undefined,
) {
  if (!geometry || typeof geometry !== "object" || !("type" in geometry)) return [];
  const output: Array<[number, number]> = [];
  const shape = geometry as Record<string, unknown>;
  const type = String(shape.type ?? "");
  const coordinates = shape.coordinates;

  const pushCoordinate = (entry: unknown) => {
    if (
      Array.isArray(entry) &&
      entry.length >= 2 &&
      Number.isFinite(entry[0]) &&
      Number.isFinite(entry[1])
    ) {
      output.push([Number(entry[0]), Number(entry[1])]);
    }
  };

  if (type === "LineString" || type === "MultiPoint") {
    if (Array.isArray(coordinates)) coordinates.forEach(pushCoordinate);
    return output;
  }
  if (type === "Polygon" || type === "MultiLineString") {
    if (Array.isArray(coordinates)) {
      coordinates.forEach((line) => {
        if (Array.isArray(line)) line.forEach(pushCoordinate);
      });
    }
    return output;
  }
  if (type === "MultiPolygon") {
    if (Array.isArray(coordinates)) {
      coordinates.forEach((polygon) => {
        if (!Array.isArray(polygon)) return;
        polygon.forEach((line) => {
          if (Array.isArray(line)) line.forEach(pushCoordinate);
        });
      });
    }
    return output;
  }
  return output;
}

function routeFocusTarget(route: MapRouteRecord) {
  const geometry = geometryCoordinates(route.geometry);
  if (geometry.length) return { lat: geometry[0][1], lng: geometry[0][0], zoom: 12 };
  if (route.originLat != null && route.originLng != null) {
    return { lat: route.originLat, lng: route.originLng, zoom: 12 };
  }
  if (route.destinationLat != null && route.destinationLng != null) {
    return { lat: route.destinationLat, lng: route.destinationLng, zoom: 12 };
  }
  return null;
}

function zoneFocusTarget(zone: MapZoneRecord) {
  if (zone.centroidLat != null && zone.centroidLng != null) {
    return { lat: zone.centroidLat, lng: zone.centroidLng, zoom: 11 };
  }
  const geometry = geometryCoordinates(zone.geojson);
  if (geometry.length) return { lat: geometry[0][1], lng: geometry[0][0], zoom: 11 };
  return null;
}

function SummaryChip(props: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[#d9e4d3] bg-[#fbfcfa] px-3 py-2">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[#61755c]">{props.label}</div>
      <div className="mt-1 text-sm font-medium text-slate-950">{props.value}</div>
    </div>
  );
}

function ControlLabel(props: { title: string; hint?: string }) {
  return (
    <label className="space-y-1">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[#61755c]">{props.title}</div>
      {props.hint ? <div className="text-xs leading-5 text-slate-500">{props.hint}</div> : null}
    </label>
  );
}

function ImmersiveOverlayCard(props: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  style?: CSSProperties;
  onHeaderPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      style={props.style}
      className={`pointer-events-auto absolute z-20 flex flex-col overflow-hidden rounded-[28px] border border-[#e4ecdf] bg-[rgba(255,255,255,0.98)] p-5 shadow-[0_18px_44px_rgba(24,36,26,0.14)] ${props.className ?? ""}`}
    >
      {props.title || props.description || props.actions ? (
        <div
          className={`mb-4 shrink-0 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between ${
            props.onHeaderPointerDown ? "cursor-grab active:cursor-grabbing" : ""
          }`}
          onPointerDown={props.onHeaderPointerDown}
        >
          <div className="space-y-1">
            {props.title ? <h2 className="text-lg font-semibold text-slate-950">{props.title}</h2> : null}
            {props.description ? (
              <p className="text-sm leading-6 text-slate-600">{props.description}</p>
            ) : null}
          </div>
          {props.actions ? <div className="flex flex-wrap gap-2">{props.actions}</div> : null}
        </div>
      ) : null}
      <div className={`min-h-0 min-w-0 ${props.contentClassName ?? ""}`}>{props.children}</div>
    </div>
  );
}

function modeDescription(mode: MapAdminMode, previewSource: MapPreviewSource) {
  if (mode === "preview") {
    return previewSource === "global_demo"
      ? "Prueba el lenguaje global del mapa con escenas demo antes de publicar cambios."
      : "Entiende el sistema espacial real y selecciona contexto sin salir del admin.";
  }
  if (mode === "places") {
    return previewSource === "global_demo"
      ? "Anade, recoloca y compara pins demo dentro de la escena global."
      : "Gestiona lugares guardados desde el propio mapa, no desde una lista larga.";
  }
  if (mode === "routes") return "Dibuja y ajusta trayectos viendo el trazado dentro del preview.";
  if (mode === "visual") return "Gobierna tipos, estados y lentes del mapa con preview real y edición contextual.";
  if (mode === "validation") return "Revisa conflictos y salta directamente al problema.";
  return "Abre solo la capa técnica y el raw de la entidad seleccionada.";
}

function mapSemanticScopeToCatalogKey(scope: MapSemanticScope): MapSemanticCatalogKey {
  if (scope === "types") return "map_place_kinds";
  if (scope === "states") return "map_place_states";
  return "map_lenses";
}

function metadataText(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  return String(value ?? "").trim();
}

function semanticSort(left: MapSemanticItem, right: MapSemanticItem) {
  return left.sortOrder - right.sortOrder || left.label.localeCompare(right.label);
}

function buildSemanticItemFromCatalogRow(row: MapSemanticCatalogRow): MapSemanticItem | null {
  const code = normalizeText(row.code).toLowerCase();
  const label = normalizeText(row.label);
  if (!code || !label) return null;
  return {
    id: row.id,
    catalogKey: row.catalog_key,
    code,
    label,
    icon: normalizeText(row.icon),
    color: normalizeText(row.color),
    description: metadataText(row.metadata, "description"),
    enabled: row.enabled !== false,
    sortOrder: Number.isFinite(row.sort_order) ? Number(row.sort_order) : 999,
    group: metadataText(row.metadata, "group") === "secondary" ? "secondary" : "primary",
    source: "catalog",
  };
}

function buildSemanticItemFromPlaceKindConfig(item: MapPlaceKindCatalogItem): MapSemanticItem {
  return {
    id: null,
    catalogKey: "map_place_kinds",
    code: item.code,
    label: item.label,
    icon: item.assetPath || item.icon || item.glyph,
    color: item.color ?? "",
    description: item.description ?? "",
    enabled: item.enabled,
    sortOrder: item.sortOrder,
    group: "primary",
    source: "fallback",
  };
}

function buildSemanticItemFromPlaceStateConfig(item: MapPlaceStateCatalogItem): MapSemanticItem {
  return {
    id: null,
    catalogKey: "map_place_states",
    code: item.code,
    label: item.label,
    icon: item.icon ?? "",
    color: item.color ?? "",
    description: item.description ?? "",
    enabled: item.enabled,
    sortOrder: item.sortOrder,
    group: "primary",
    source: "fallback",
  };
}

function buildSemanticItemFromLensConfig(item: MapLensCatalogItem): MapSemanticItem {
  return {
    id: null,
    catalogKey: "map_lenses",
    code: item.id,
    label: item.label,
    icon: item.icon,
    color: item.color ?? "",
    description: item.description,
    enabled: item.enabled,
    sortOrder: item.sortOrder,
    group: item.group,
    source: "fallback",
  };
}

function buildSemanticItemsForScope(
  scope: MapSemanticScope,
  rows: MapSemanticCatalogRow[],
  config: MapRuntimeConfig,
) {
  const catalogKey = mapSemanticScopeToCatalogKey(scope);
  const catalogItems = rows
    .filter((row) => row.catalog_key === catalogKey)
    .map(buildSemanticItemFromCatalogRow)
    .filter(Boolean) as MapSemanticItem[];

  if (catalogItems.length) return catalogItems.sort(semanticSort);

  if (scope === "types") return config.placeKinds.map(buildSemanticItemFromPlaceKindConfig).sort(semanticSort);
  if (scope === "states") return config.placeStates.map(buildSemanticItemFromPlaceStateConfig).sort(semanticSort);
  return config.lenses.map(buildSemanticItemFromLensConfig).sort(semanticSort);
}

function buildMapSemanticDraftFromItem(item: MapSemanticItem): MapSemanticDraft {
  return {
    catalogKey: item.catalogKey,
    code: item.code,
    label: item.label,
    icon: item.icon,
    color: item.color,
    description: item.description,
    enabled: item.enabled,
    sortOrder: String(item.sortOrder),
    group: item.group,
  };
}

function normalizeMapSemanticCode(raw: string) {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
}

function nextSemanticCode(base: string, existingCodes: string[]) {
  const normalizedBase = normalizeMapSemanticCode(base) || "nuevo_item";
  let candidate = normalizedBase;
  let index = 2;
  const used = new Set(existingCodes);
  while (used.has(candidate)) {
    candidate = `${normalizedBase}_${index}`;
    index += 1;
  }
  return candidate;
}

function buildEmptyMapSemanticDraft(
  scope: MapSemanticScope,
  existingItems: MapSemanticItem[],
): MapSemanticDraft {
  const baseCode =
    scope === "types" ? "nuevo_tipo" : scope === "states" ? "nuevo_estado" : "explore";
  return {
    catalogKey: mapSemanticScopeToCatalogKey(scope),
    code: nextSemanticCode(
      baseCode,
      existingItems.map((item) => item.code),
    ),
    label: scope === "types" ? "Nuevo tipo" : scope === "states" ? "Nuevo estado" : "Mapa",
    icon: scope === "types" ? "📍" : scope === "states" ? "○" : "🧭",
    color: "",
    description: "",
    enabled: true,
    sortOrder: String((existingItems.length + 1) * 10 || 10),
    group: scope === "lenses" ? "primary" : "primary",
  };
}

function buildPreviewMapRuntimeConfig(
  baseConfig: MapRuntimeConfig,
  scope: MapSemanticScope,
  draft: MapSemanticDraft | null,
) {
  if (!draft) return baseConfig;

  const sortOrder = Number.parseInt(draft.sortOrder, 10);
  const normalizedIcon = normalizeText(draft.icon);
  const normalizedColor = normalizeText(draft.color) || null;
  const normalizedLabel = normalizeText(draft.label) || "Sin label";
  const normalizedCode = normalizeMapSemanticCode(draft.code) || draft.code;
  const normalizedDescription = normalizeText(draft.description) || null;

  if (scope === "types") {
    const assetPath = isMapCatalogAssetPath(normalizedIcon) ? normalizedIcon : null;
    const nextItem: MapPlaceKindCatalogItem = {
      code: normalizedCode,
      label: normalizedLabel,
      icon: normalizedIcon || assetPath || "✿",
      glyph: assetPath ? "✿" : normalizedIcon || "✿",
      assetPath,
      color: normalizedColor,
      description: normalizedDescription,
      enabled: draft.enabled,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 999,
    };
    const next = [...baseConfig.placeKinds.filter((item) => item.code !== normalizedCode)];
    if (draft.enabled) next.push(nextItem);
    return { ...baseConfig, placeKinds: next.sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label)) };
  }

  if (scope === "states") {
    const nextItem: MapPlaceStateCatalogItem = {
      code: normalizedCode,
      label: normalizedLabel,
      icon: normalizedIcon || null,
      color: normalizedColor,
      description: normalizedDescription,
      enabled: draft.enabled,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 999,
    };
    const next = [...baseConfig.placeStates.filter((item) => item.code !== normalizedCode)];
    if (draft.enabled) next.push(nextItem);
    return { ...baseConfig, placeStates: next.sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label)) };
  }

  if (!MAP_RUNTIME_LENS_IDS.includes(normalizedCode as MapRuntimeLensId)) {
    return baseConfig;
  }

  const nextItem: MapLensCatalogItem = {
    id: normalizedCode as MapRuntimeLensId,
    label: normalizedLabel,
    icon: normalizedIcon || "✨",
    description: normalizedDescription || "Vista del mapa.",
    color: normalizedColor,
    enabled: draft.enabled,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 999,
    group: draft.group,
  };
  const next = [...baseConfig.lenses.filter((item) => item.id !== nextItem.id)];
  if (draft.enabled) next.push(nextItem);
  return { ...baseConfig, lenses: next.sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label)) };
}

function renderSemanticIconPreview(icon: string, label: string) {
  if (isMapCatalogAssetPath(icon)) {
    return (
      <img
        src={icon}
        alt={label}
        className="h-5 w-5 object-contain"
      />
    );
  }
  return <span className="text-base leading-none">{icon || "✿"}</span>;
}

function buildDemoPreviewPlaceRecord(input: {
  id: string;
  kind: MapPlaceKind;
  state: MapPlaceState;
  title: string;
  subtitle: string | null;
  notes: string | null;
  lat: number;
  lng: number;
  rating: number | null;
  iconCode: string | null;
  colorToken: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
}) {
  return {
    id: input.id,
    gardenId: "__global_demo__",
    kind: input.kind,
    state: input.state,
    title: input.title,
    subtitle: input.subtitle,
    notes: input.notes,
    addressLabel: input.subtitle,
    lat: input.lat,
    lng: input.lng,
    rating: input.rating,
    iconCode: input.iconCode,
    colorToken: input.colorToken,
    tags: input.tags,
    metadata: input.metadata,
    links: {
      pageId: null,
      seedId: null,
    },
    createdByUserId: "__superadmin_demo__",
    updatedByUserId: "__superadmin_demo__",
    createdAt: "2026-03-20T12:00:00.000Z",
    updatedAt: "2026-03-20T12:00:00.000Z",
    archivedAt: null,
  } satisfies MapPlaceRecord;
}

export default function AdminMapPage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const showContextPanel = false;
  const setShowContextPanel = (_value: boolean | ((current: boolean) => boolean)) => {};
  const [myProfileId, setMyProfileId] = useState("");
  const [activeGardenId, setActiveGardenId] = useState<string | null>(null);
  const [activeGardenTitle, setActiveGardenTitle] = useState<string | null>(null);
  const [mode, setMode] = useState<MapAdminMode>("places");
  const [showControlPanel, setShowControlPanel] = useState(true);
  const [demoScenario, setDemoScenario] = useState<AdminMapPreviewScenarioId>("pins");
  const [memoryScope, setMemoryScope] = useState<MemoryScope>("current_year");
  const [showRuntimeMemories, setShowRuntimeMemories] = useState(true);
  const [mapMemories, setMapMemories] = useState<MapPointItem[]>([]);
  const [mapPlaces, setMapPlaces] = useState<MapPlaceRecord[]>([]);
  const [mapRoutes, setMapRoutes] = useState<MapRouteRecord[]>([]);
  const [mapZones, setMapZones] = useState<MapZoneRecord[]>([]);
  const [demoPreviewPlaces, setDemoPreviewPlaces] = useState<MapPlaceRecord[]>([]);
  const [demoHiddenPlaceIds, setDemoHiddenPlaceIds] = useState<string[]>([]);
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [authoringMode, setAuthoringMode] = useState<AuthoringMode>("none");
  const [draftCoordinates, setDraftCoordinates] = useState<Array<{ lat: number; lng: number }>>([]);
  const [placeDraft, setPlaceDraft] = useState<PlaceDraft | null>(null);
  const [placeForm, setPlaceForm] = useState<PlaceDraft | null>(null);
  const [routeForm, setRouteForm] = useState<RouteDraft | null>(null);
  const [zoneForm, setZoneForm] = useState<ZoneDraft | null>(null);
  const [creatingRoute, setCreatingRoute] = useState(false);
  const [routeSearch, setRouteSearch] = useState("");
  const [placeSearch, setPlaceSearch] = useState("");
  const [savingTone, setSavingTone] = useState<SaveTone | null>(null);
  const [draftLookupLoading, setDraftLookupLoading] = useState(false);
  const [mapSemanticRows, setMapSemanticRows] = useState<MapSemanticCatalogRow[]>([]);
  const [semanticScope, setSemanticScope] = useState<MapSemanticScope>("types");
  const [selectedSemanticCode, setSelectedSemanticCode] = useState<string | null>(null);
  const [semanticDraft, setSemanticDraft] = useState<MapSemanticDraft | null>(null);
  const [overlayPanelDrag, setOverlayPanelDrag] = useState<OverlayPanelDrag>(null);
  const [overlayOffsets, setOverlayOffsets] = useState<Record<OverlayPanelId, { x: number; y: number }>>({
    control: { x: 0, y: 0 },
    raw: { x: 0, y: 0 },
  });
  const [validationRules, setValidationRules] = useState<ValidationRuleDefinition[]>(
    () => getDefaultValidationRules("map"),
  );
  const { config: mapRuntimeConfig, refresh: refreshMapRuntimeConfig } = useMapRuntimeConfig();
  const previewSource: MapPreviewSource = "global_demo";
  const isGlobalPreview = true;
  const baseDemoPreviewScenario = useMemo(
    () => buildAdminMapPreviewScenario(demoScenario, mapRuntimeConfig, []),
    [demoScenario, mapRuntimeConfig],
  );
  const demoPreviewScenario = useMemo(() => {
    const nextScenario = buildAdminMapPreviewScenario(
      demoScenario,
      mapRuntimeConfig,
      demoPreviewPlaces,
    );
    if (!demoHiddenPlaceIds.length) return nextScenario;
    const hiddenIds = new Set(demoHiddenPlaceIds);
    return {
      ...nextScenario,
      points: nextScenario.points.filter(
        (point) => point.sourceType !== "place" || !hiddenIds.has(point.id),
      ),
      places: nextScenario.places.filter((place) => !hiddenIds.has(place.id)),
    };
  }, [demoHiddenPlaceIds, demoPreviewPlaces, demoScenario, mapRuntimeConfig]);
  const effectiveMemories = isGlobalPreview ? demoPreviewScenario.points : mapMemories;
  const effectiveMapPlaces = isGlobalPreview ? demoPreviewScenario.places : mapPlaces;
  const effectiveMapRoutes = isGlobalPreview ? demoPreviewScenario.routes : mapRoutes;
  const effectiveMapZones = isGlobalPreview ? demoPreviewScenario.zones : mapZones;

  const selectedPlace = useMemo(
    () => effectiveMapPlaces.find((entry) => entry.id === selectedPlaceId) ?? null,
    [effectiveMapPlaces, selectedPlaceId],
  );
  const selectedRoute = useMemo(
    () => effectiveMapRoutes.find((entry) => entry.id === selectedRouteId) ?? null,
    [effectiveMapRoutes, selectedRouteId],
  );
  const selectedZone = useMemo(
    () => effectiveMapZones.find((entry) => entry.id === selectedZoneId) ?? null,
    [effectiveMapZones, selectedZoneId],
  );
  const selectedMemory = useMemo(
    () => effectiveMemories.find((entry) => entry.id === selectedMemoryId) ?? null,
    [effectiveMemories, selectedMemoryId],
  );

  useEffect(() => {
    if (!selectedPlace) {
      setPlaceForm(null);
      return;
    }
    setPlaceForm(buildPlaceDraftFromRecord(selectedPlace));
  }, [selectedPlace]);

  useEffect(() => {
    if (!selectedRoute) {
      setRouteForm(null);
      return;
    }
    setRouteForm(buildRouteDraftFromRecord(selectedRoute));
  }, [selectedRoute]);

  useEffect(() => {
    if (!selectedZone) {
      setZoneForm(null);
      return;
    }
    setZoneForm(buildZoneDraftFromRecord(selectedZone));
  }, [selectedZone]);

  useEffect(() => {
    if (isGlobalPreview && mode === "routes") {
      setMode("preview");
    }
  }, [isGlobalPreview, mode]);

  useEffect(() => {
    if (mode === "places") return;
    if (authoringMode === "place") {
      setAuthoringMode("none");
      setDraftCoordinates([]);
      setPlaceDraft(null);
    }
  }, [authoringMode, mode]);

  useEffect(() => {
    if (mode === "routes") return;
    if (authoringMode === "route" || creatingRoute) {
      setAuthoringMode("none");
      setDraftCoordinates([]);
      setCreatingRoute(false);
      setRouteForm((current) => (current && current.title ? current : null));
    }
  }, [authoringMode, creatingRoute, mode]);

  const routePreview = useHomeMapRoutePreview({
    enabled: authoringMode === "route" && draftCoordinates.length >= 2,
    origin: draftCoordinates[0] ?? null,
    destination: draftCoordinates[1] ?? null,
  });

  const loadMapSemantics = useCallback(async () => {
    const { data, error } = await supabase
      .from("catalog_items")
      .select("id,catalog_key,code,label,sort_order,enabled,color,icon,metadata")
      .in("catalog_key", ["map_place_kinds", "map_place_states", "map_lenses"])
      .order("catalog_key", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("code", { ascending: true });

    if (error) throw error;

    setMapSemanticRows(((data as MapSemanticCatalogRow[] | null) ?? []).filter(
      (row) =>
        row.catalog_key === "map_place_kinds" ||
        row.catalog_key === "map_place_states" ||
        row.catalog_key === "map_lenses",
    ));
  }, []);

  const loadRuntimeMapDomain = useCallback(
    async (gardenId: string | null, profileId: string, silent = false) => {
      if (!profileId) return;
      if (silent) setRefreshing(true);
      else setLoading(true);
      setMsg(null);

      try {
        const [gardenRes, planTypesRes, pagesRes, placesRes, routesRes, zonesRes] =
          await Promise.all([
            gardenId
              ? supabase.from("gardens").select("title").eq("id", gardenId).maybeSingle()
              : Promise.resolve({ data: null, error: null }),
            withGardenScope(
              supabase
                .from("garden_plan_types")
                .select(
                  "id,code,label,category,description,suggested_element,icon_emoji,flower_asset_path,seed_asset_path,flower_builder_config,is_custom,sort_order,archived_at",
                )
                .is("archived_at", null),
              gardenId,
            ),
            withGardenScope(
              supabase
                .from("pages")
                .select(
                  "id,title,date,element,plan_type_id,rating,cover_photo_url,thumbnail_url,canvas_objects,location_lat,location_lng,location_label,is_favorite",
                )
                .not("location_lat", "is", null)
                .not("location_lng", "is", null)
                .order("date", { ascending: false }),
              gardenId,
            ),
            withGardenScope(
              supabase
                .from("map_places")
                .select("*")
                .is("archived_at", null)
                .order("created_at", { ascending: false }),
              gardenId,
            ),
            withGardenScope(
              supabase
                .from("map_routes")
                .select("*")
                .is("archived_at", null)
                .order("created_at", { ascending: false }),
              gardenId,
            ),
            withGardenScope(
              supabase
                .from("map_zones")
                .select("*")
                .eq("status", "active")
                .order("created_at", { ascending: false }),
              gardenId,
            ),
          ]);

        const planTypeById = new Map<string, ReturnType<typeof mapGardenPlanTypeRow>>();
        if (!planTypesRes.error) {
          for (const row of ((planTypesRes.data as Record<string, unknown>[] | null) ?? [])) {
            const mapped = mapGardenPlanTypeRow(row);
            planTypeById.set(mapped.id, mapped);
          }
        }

        const nextMemories: MapPointItem[] = [];
        if (pagesRes.error) {
          if (!isMissingLocationColumnsError(pagesRes.error.message ?? "")) {
            setMsg(
              `Aviso: no se pudieron cargar las flores geolocalizadas (${pagesRes.error.message}).`,
            );
          }
        } else {
          for (const row of ((pagesRes.data as MapPageRow[] | null) ?? [])) {
            const lat = Number(row.location_lat);
            const lng = Number(row.location_lng);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
            if (!row.id) continue;
            const planType =
              row.plan_type_id ? planTypeById.get(row.plan_type_id) ?? null : null;
            const legacyElement = normalizeText(row.element) || null;
            nextMemories.push({
              id: row.id,
              sourceType: "memory",
              sourceId: row.id,
              title: normalizeText(row.title) || "Flor sin título",
              date: normalizeText(row.date).slice(0, 10),
              element: legacyElement,
              flowerFamily:
                planType?.flowerFamily ?? getFlowerFamilyFromLegacyElement(legacyElement),
              planTypeLabel: planType?.label ?? null,
              rating: row.rating ?? null,
              lat,
              lng,
              href: `/page/${row.id}`,
              linkedPageId: row.id,
              linkedSeedId: null,
              locationLabel:
                normalizeText(row.location_label) ||
                normalizeText(row.title) ||
                "Flor con lugar",
              photoUrl: row.cover_photo_url ?? row.thumbnail_url ?? null,
              snippet: extractPageSnippet(row.canvas_objects),
              isFavorite: Boolean(row.is_favorite),
              placeKind: null,
              placeState: null,
              iconCode: null,
              colorToken: null,
              addressLabel: normalizeText(row.location_label) || null,
              notes: null,
              tags: [],
            });
          }
        }

        const nextPlaces = ((placesRes.data as Record<string, unknown>[] | null) ?? []).map(
          (row) => mapPlaceRowToRecord(row),
        );
        const nextRoutes = ((routesRes.data as Record<string, unknown>[] | null) ?? []).map(
          (row) => mapRouteRowToRecord(row),
        );
        const nextZones = ((zonesRes.data as Record<string, unknown>[] | null) ?? []).map((row) =>
          mapZoneRowToRecord(row),
        );

        setActiveGardenTitle(normalizeText((gardenRes.data as { title?: unknown } | null)?.title));
        setMapMemories(nextMemories);
        setMapPlaces(nextPlaces);
        setMapRoutes(nextRoutes);
        setMapZones(nextZones);
        setSelectedPlaceId((current) =>
          current && nextPlaces.some((entry) => entry.id === current) ? current : null,
        );
        setSelectedRouteId((current) =>
          current && nextRoutes.some((entry) => entry.id === current) ? current : null,
        );
        setSelectedZoneId((current) =>
          current && nextZones.some((entry) => entry.id === current) ? current : null,
        );
        setSelectedMemoryId((current) =>
          current && nextMemories.some((entry) => entry.id === current) ? current : null,
        );
      } finally {
        if (silent) setRefreshing(false);
        else setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    (async () => {
      const session = await ensureSuperadminOrRedirect(router);
      if (!session) {
        setLoading(false);
        return;
      }

      setMyProfileId(session.profile.id);
      try {
        const [loadedRules] = await Promise.all([
          loadValidationRulesForDomain("map"),
          loadMapSemantics(),
        ]);
        setValidationRules(loadedRules);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadMapSemantics, router]);

  const handleGardenChanged = useCallback(
    (gardenId: string | null) => {
      setActiveGardenId(gardenId);
      setSelectedMemoryId(null);
      setSelectedPlaceId(null);
      setSelectedRouteId(null);
      setSelectedZoneId(null);
      setFocusTarget(null);
      setPlaceDraft(null);
      setDraftCoordinates([]);
      setAuthoringMode("none");
      setCreatingRoute(false);
    },
    [],
  );

  const runtimeVisibleMemories = useMemo(() => {
    if (!showRuntimeMemories) return [] as MapPointItem[];
    return mapMemories.filter((entry) => {
      if (memoryScope === "all_years") return true;
      return entry.date.startsWith(`${currentYear}-`);
    });
  }, [currentYear, mapMemories, memoryScope, showRuntimeMemories]);

  const previewPoints = useMemo(
    () => (isGlobalPreview ? effectiveMemories : [...runtimeVisibleMemories, ...mapPlaces.map((entry) => mapPlaceRecordToPoint(entry))]),
    [effectiveMemories, isGlobalPreview, mapPlaces, runtimeVisibleMemories],
  );

  const selectedPointVisualId = selectedPlaceId ? `place-${selectedPlaceId}` : selectedMemoryId;

  const previewLens = useMemo(() => {
    if (mode === "routes" || selectedRouteId) return "routes" as const;
    if (selectedZoneId) return "symbolic" as const;
    if (mode === "places" || selectedPlaceId) return "saved" as const;
    if (mode === "visual" && selectedPlaceId) return "saved" as const;
    if (mode === "visual" && selectedRouteId) return "routes" as const;
    if (mode === "visual" && selectedZoneId) return "symbolic" as const;
    return !isGlobalPreview && showRuntimeMemories ? ("explore" as const) : ("saved" as const);
  }, [isGlobalPreview, mode, selectedPlaceId, selectedRouteId, selectedZoneId, showRuntimeMemories]);

  const validationIssues = useMemo(
    () =>
      buildMapValidationIssues({
        places: effectiveMapPlaces,
        routes: effectiveMapRoutes,
        zones: effectiveMapZones,
      }, validationRules),
    [effectiveMapPlaces, effectiveMapRoutes, effectiveMapZones, validationRules],
  );

  const visibleValidationIssues = useMemo(
    () => validationIssues.slice(0, 7),
    [validationIssues],
  );

  const semanticItems = useMemo(
    () => buildSemanticItemsForScope(semanticScope, mapSemanticRows, mapRuntimeConfig),
    [mapRuntimeConfig, mapSemanticRows, semanticScope],
  );

  const selectedSemanticItem = useMemo(
    () => semanticItems.find((item) => item.code === selectedSemanticCode) ?? null,
    [selectedSemanticCode, semanticItems],
  );

  const effectivePreviewMapConfig = useMemo(
    () => buildPreviewMapRuntimeConfig(mapRuntimeConfig, semanticScope, semanticDraft),
    [mapRuntimeConfig, semanticDraft, semanticScope],
  );

  useEffect(() => {
    if (!semanticItems.length) {
      setSelectedSemanticCode(null);
      setSemanticDraft(buildEmptyMapSemanticDraft(semanticScope, []));
      return;
    }
    if (!selectedSemanticCode || !semanticItems.some((item) => item.code === selectedSemanticCode)) {
      const first = semanticItems[0];
      setSelectedSemanticCode(first.code);
      setSemanticDraft(buildMapSemanticDraftFromItem(first));
    }
  }, [selectedSemanticCode, semanticItems, semanticScope]);

  const placeKindOptions = useMemo(() => {
    const options = mapRuntimeConfig.placeKinds.map((item) => ({
      value: item.code,
      label: item.label,
    }));
    const known = new Set(options.map((item) => item.value));
    const maybeAppend = [placeDraft?.kind, placeForm?.kind]
      .filter((value): value is string => Boolean(value))
      .filter((value) => !known.has(value));
    for (const value of maybeAppend) {
      options.push({ value, label: value });
      known.add(value);
    }
    return options;
  }, [mapRuntimeConfig.placeKinds, placeDraft?.kind, placeForm?.kind]);

  const placeStateOptions = useMemo(() => {
    const options = mapRuntimeConfig.placeStates.map((item) => ({
      value: item.code,
      label: item.label,
    }));
    const known = new Set(options.map((item) => item.value));
    const maybeAppend = [placeDraft?.state, placeForm?.state]
      .filter((value): value is string => Boolean(value))
      .filter((value) => !known.has(value));
    for (const value of maybeAppend) {
      options.push({ value, label: value });
      known.add(value);
    }
    return options;
  }, [mapRuntimeConfig.placeStates, placeDraft?.state, placeForm?.state]);

  const matchingPlaces = useMemo(() => {
    const query = normalizeSearchText(placeSearch);
    if (!query) return effectiveMapPlaces;
    return effectiveMapPlaces.filter((entry) =>
      normalizeSearchText(
        [entry.title, entry.subtitle, entry.addressLabel, entry.notes, entry.tags.join(" ")]
          .filter(Boolean)
          .join(" "),
      ).includes(query),
    );
  }, [effectiveMapPlaces, placeSearch]);

  const matchingRoutes = useMemo(() => {
    const query = normalizeSearchText(routeSearch);
    if (!query) return effectiveMapRoutes;
    return effectiveMapRoutes.filter((entry) =>
      normalizeSearchText(
        [
          entry.title,
          entry.subtitle,
          entry.notes,
          entry.originLabel,
          entry.destinationLabel,
          entry.tags.join(" "),
        ]
          .filter(Boolean)
          .join(" "),
      ).includes(query),
    );
  }, [effectiveMapRoutes, routeSearch]);

  const routeInstruction = useMemo(() => {
    if (authoringMode !== "route") {
      return "Selecciona una ruta o pulsa en el mapa para crear un trazado nuevo.";
    }
    if (draftCoordinates.length === 0) {
      return "Haz click en el mapa para marcar el origen.";
    }
    if (draftCoordinates.length === 1) {
      return "Haz un segundo click para marcar el destino.";
    }
    if (routePreview.loading) {
      return "Calculando trayecto real...";
    }
    if (routePreview.error) {
      return "No se pudo calcular la ruta real. Se puede guardar el segmento directo si quieres.";
    }
    if (routePreview.route) {
      return `Trayecto listo: ${compactDistanceLabel(routePreview.route.distanceMeters)} · ${compactDurationLabel(
        routePreview.route.durationSeconds,
      )}.`;
    }
    return "El trazado ya esta listo para guardarse.";
  }, [
    authoringMode,
    draftCoordinates.length,
    routePreview.error,
    routePreview.loading,
    routePreview.route,
  ]);

  const replacePlaceRecord = useCallback((record: MapPlaceRecord) => {
    setMapPlaces((current) => [record, ...current.filter((entry) => entry.id !== record.id)]);
  }, []);

  const replaceRouteRecord = useCallback((record: MapRouteRecord) => {
    setMapRoutes((current) => [record, ...current.filter((entry) => entry.id !== record.id)]);
  }, []);

  const replaceZoneRecord = useCallback((record: MapZoneRecord) => {
    setMapZones((current) => [record, ...current.filter((entry) => entry.id !== record.id)]);
  }, []);

  async function hydrateDraftPlaceFromCoordinate(coordinate: { lat: number; lng: number }) {
    setDraftLookupLoading(true);
    let title = "Nuevo lugar";
    let subtitle = `${coordinate.lat.toFixed(4)}, ${coordinate.lng.toFixed(4)}`;

    try {
      const payload = await reverseGeocodePoint(coordinate);
      title = normalizeText(payload.result.label) || title;
      subtitle = normalizeText(payload.result.fullLabel) || subtitle;
    } catch {
      // Best effort only.
    } finally {
      setDraftLookupLoading(false);
    }

    setDraftCoordinates([coordinate]);
    setPlaceDraft(
      buildPlaceDraftFromPoint({
        lat: coordinate.lat,
        lng: coordinate.lng,
        title,
        subtitle,
      }),
    );
  }

  function clearSelection() {
    setSelectedMemoryId(null);
    setSelectedPlaceId(null);
    setSelectedRouteId(null);
    setSelectedZoneId(null);
    setFocusTarget(null);
  }

  function handleMarkerSelect(point: MapPointItem) {
    setFocusTarget({ lat: point.lat, lng: point.lng, zoom: 13 });
    setSelectedRouteId(null);
    setSelectedZoneId(null);
    if (point.sourceType === "place") {
      setSelectedPlaceId(point.sourceId);
      setSelectedMemoryId(null);
      if (isGlobalPreview) {
        if (mode === "preview" || mode === "validation") {
          openModePanel("places");
        }
        return;
      }
      if (mode === "preview" || mode === "validation") {
        openModePanel("places");
      }
      return;
    }
    setSelectedPlaceId(null);
    setSelectedMemoryId(point.id);
    if (isGlobalPreview && (mode === "preview" || mode === "validation")) {
      openModePanel("visual");
      return;
    }
    if (mode === "validation") {
      openModePanel("preview");
    }
  }

  function handleRouteSelect(route: MapRouteRecord) {
    setSelectedMemoryId(null);
    setSelectedPlaceId(null);
    setSelectedZoneId(null);
    setSelectedRouteId(route.id);
    setFocusTarget(routeFocusTarget(route));
    if (isGlobalPreview) {
      if (mode === "preview" || mode === "validation") {
        openModePanel("visual");
      }
      return;
    }
    if (mode === "preview" || mode === "validation") {
      openModePanel("routes");
    }
  }

  function handleZoneSelect(zone: MapZoneRecord) {
    setSelectedMemoryId(null);
    setSelectedPlaceId(null);
    setSelectedRouteId(null);
    setSelectedZoneId(zone.id);
    setFocusTarget(zoneFocusTarget(zone));
    if (isGlobalPreview) {
      if (mode === "preview" || mode === "validation") {
        openModePanel("visual");
      }
      return;
    }
    if (mode === "preview" || mode === "validation") {
      openModePanel("advanced");
    }
  }

  function beginPlaceAuthoring() {
    openModePanel("places");
    setSelectedPlaceId(null);
    setSelectedRouteId(null);
    setSelectedZoneId(null);
    setAuthoringMode("place");
    setDraftCoordinates([]);
    setPlaceDraft(null);
    setMsg("Haz click en el mapa para crear un lugar nuevo.");
  }

  function cancelPlaceAuthoring() {
    setAuthoringMode("none");
    setDraftCoordinates([]);
    setPlaceDraft(null);
    setDraftLookupLoading(false);
  }

  function restoreSelectedDemoPlace() {
    if (!selectedPlace || selectedPlace.gardenId !== "__global_demo__") {
      setMsg("Selecciona un pin demo para restaurarlo.");
      return;
    }

    const basePlace =
      baseDemoPreviewScenario.places.find((entry) => entry.id === selectedPlace.id) ?? null;

    setAuthoringMode("none");
    setDraftCoordinates([]);
    setDraftLookupLoading(false);

    if (basePlace) {
      setDemoPreviewPlaces((current) => current.filter((entry) => entry.id !== basePlace.id));
      setDemoHiddenPlaceIds((current) => current.filter((entry) => entry !== basePlace.id));
      setSelectedPlaceId(basePlace.id);
      setPlaceForm(buildPlaceDraftFromRecord(basePlace));
      setFocusTarget({ lat: basePlace.lat, lng: basePlace.lng, zoom: 13 });
      setMsg("Pin demo restaurado a la escena base.");
      return;
    }

    setDemoPreviewPlaces((current) => current.filter((entry) => entry.id !== selectedPlace.id));
    setDemoHiddenPlaceIds((current) => current.filter((entry) => entry !== selectedPlace.id));
    setSelectedPlaceId(null);
    setPlaceForm(null);
    setMsg("El pin demo añadido se ha retirado del preview.");
  }

  function removeSelectedDemoPlace() {
    if (!selectedPlace || selectedPlace.gardenId !== "__global_demo__") {
      setMsg("Selecciona un pin demo para quitarlo del preview.");
      return;
    }

    setAuthoringMode("none");
    setDraftCoordinates([]);
    setDraftLookupLoading(false);
    setDemoPreviewPlaces((current) => current.filter((entry) => entry.id !== selectedPlace.id));
    setDemoHiddenPlaceIds((current) =>
      current.includes(selectedPlace.id) ? current : [...current, selectedPlace.id],
    );
    setSelectedPlaceId(null);
    setPlaceForm(null);
    setFocusTarget(demoPreviewScenario.focus);
    setMsg("Pin demo quitado del preview.");
  }

  function beginRouteAuthoring() {
    if (isGlobalPreview) {
      openModePanel("preview");
      setMsg("En preview global las rutas vienen del escenario demo. Ajusta su lenguaje desde Visual.");
      return;
    }
    openModePanel("routes");
    setSelectedPlaceId(null);
    setSelectedRouteId(null);
    setSelectedZoneId(null);
    setAuthoringMode("route");
    setCreatingRoute(true);
    setDraftCoordinates([]);
    setRouteForm(buildNewRouteDraft());
    setMsg("Marca origen y destino directamente en el mapa.");
  }

  function redrawSelectedRoute() {
    if (!selectedRoute) return;
    const geometry = geometryCoordinates(selectedRoute.geometry);
    const origin =
      geometry[0] ??
      (selectedRoute.originLng != null && selectedRoute.originLat != null
        ? ([selectedRoute.originLng, selectedRoute.originLat] as [number, number])
        : null);
    const destination =
      geometry[geometry.length - 1] ??
      (selectedRoute.destinationLng != null && selectedRoute.destinationLat != null
        ? ([selectedRoute.destinationLng, selectedRoute.destinationLat] as [number, number])
        : null);

    openModePanel("routes");
    setCreatingRoute(false);
    setAuthoringMode("route");
    setDraftCoordinates(
      origin && destination
        ? [
            { lat: origin[1], lng: origin[0] },
            { lat: destination[1], lng: destination[0] },
          ]
        : [],
    );
    setFocusTarget(routeFocusTarget(selectedRoute));
    setMsg("Vuelve a marcar origen y destino para rehacer el trazado.");
  }

  function cancelRouteAuthoring() {
    setAuthoringMode("none");
    setDraftCoordinates([]);
    setCreatingRoute(false);
    if (selectedRoute) {
      setRouteForm(buildRouteDraftFromRecord(selectedRoute));
    } else {
      setRouteForm(null);
    }
  }

  function useSelectedMemoryAsPlace() {
    if (!selectedMemory) {
      setMsg("Selecciona una flor del mapa para convertirla en lugar.");
      return;
    }
    openModePanel("places");
    setAuthoringMode("place");
    setSelectedPlaceId(null);
    setSelectedRouteId(null);
    setSelectedZoneId(null);
    setDraftCoordinates([{ lat: selectedMemory.lat, lng: selectedMemory.lng }]);
    setPlaceDraft(
      buildPlaceDraftFromPoint({
        lat: selectedMemory.lat,
        lng: selectedMemory.lng,
        title: selectedMemory.locationLabel || selectedMemory.title,
        subtitle: selectedMemory.addressLabel || selectedMemory.locationLabel || "",
      }),
    );
  }

  function handleMapCoordinateAdd(coordinate: { lat: number; lng: number }) {
    if (authoringMode === "place") {
      void hydrateDraftPlaceFromCoordinate(coordinate);
      return;
    }
    if (authoringMode !== "route") return;

    setDraftCoordinates((current) => {
      if (current.length === 0) {
        setRouteForm((draft) => {
          const base = draft ?? buildNewRouteDraft();
          return {
            ...base,
            originLabel:
              normalizeText(base.originLabel) ||
              `${coordinate.lat.toFixed(4)}, ${coordinate.lng.toFixed(4)}`,
          };
        });
        return [coordinate];
      }
      const next = [current[0], coordinate];
      setRouteForm((draft) => {
        const base = draft ?? buildNewRouteDraft();
        const originLabel =
          normalizeText(base.originLabel) ||
          `${current[0].lat.toFixed(4)}, ${current[0].lng.toFixed(4)}`;
        const destinationLabel =
          normalizeText(base.destinationLabel) ||
          `${coordinate.lat.toFixed(4)}, ${coordinate.lng.toFixed(4)}`;
        return {
          ...base,
          originLabel,
          destinationLabel,
          title:
            normalizeText(base.title) ||
            `${originLabel.slice(0, 24)} -> ${destinationLabel.slice(0, 24)}`,
        };
      });
      return next;
    });
  }

  async function savePlaceDraft() {
    if (!placeDraft) {
      setMsg("Marca primero un punto en el mapa.");
      return;
    }
    if (!myProfileId) {
      setMsg("Sesión aún no preparada para guardar.");
      return;
    }

    const title = normalizeText(placeDraft.title);
    if (!title) {
      setMsg("El lugar necesita un título.");
      return;
    }

    const lat = parseNumberOrNull(placeDraft.lat);
    const lng = parseNumberOrNull(placeDraft.lng);
    if (lat == null || lng == null) {
      setMsg("Las coordenadas del lugar no son validas.");
      return;
    }

    const metadata = parseMetadataText(placeDraft.metadataText);
    if (!metadata.ok) {
      setMsg(metadata.error);
      return;
    }

    setSavingTone("place");
    setMsg(null);

    try {
      if (isGlobalPreview) {
        const nextRecord = buildDemoPreviewPlaceRecord({
          id: `demo-custom-${Date.now()}`,
          kind: placeDraft.kind,
          state: placeDraft.state,
          title,
          subtitle: normalizeText(placeDraft.subtitle) || null,
          notes: normalizeText(placeDraft.notes) || null,
          lat,
          lng,
          rating: parseNumberOrNull(placeDraft.rating),
          iconCode: normalizeText(placeDraft.iconCode) || null,
          colorToken:
            normalizeText(placeDraft.colorToken) ||
            mapRuntimeConfig.placeKinds.find((item) => item.code === placeDraft.kind)?.color ||
            null,
          tags: parseTagsText(placeDraft.tagsText),
          metadata: {
            ...metadata.value,
            demo: true,
          },
        });
        setDemoPreviewPlaces((current) => [
          nextRecord,
          ...current.filter((entry) => entry.id !== nextRecord.id),
        ]);
        setSelectedPlaceId(nextRecord.id);
        setSelectedMemoryId(null);
        setAuthoringMode("none");
        setDraftCoordinates([]);
        setPlaceDraft(null);
        setFocusTarget({ lat: nextRecord.lat, lng: nextRecord.lng, zoom: 13 });
        openModePanel("visual");
        setMsg("Pin demo añadido al preview global.");
        return;
      }

      const sourcePageId =
        selectedMemory && selectedMemory.sourceType === "memory"
          ? selectedMemory.linkedPageId ?? selectedMemory.sourceId
          : null;
      const { data, error } = await supabase
        .from("map_places")
        .insert(
          withGardenIdOnInsert(
            {
              kind: placeDraft.kind,
              state: placeDraft.state,
              title,
              subtitle: normalizeText(placeDraft.subtitle) || null,
              notes: normalizeText(placeDraft.notes) || null,
              address_label: normalizeText(placeDraft.subtitle) || null,
              lat,
              lng,
              rating: parseNumberOrNull(placeDraft.rating),
              icon_code: normalizeText(placeDraft.iconCode) || null,
              color_token: normalizeText(placeDraft.colorToken) || null,
              tags: parseTagsText(placeDraft.tagsText),
              metadata: metadata.value,
              source_page_id: sourcePageId,
              source_seed_id: null,
              created_by_user_id: myProfileId,
              updated_by_user_id: null,
            },
            activeGardenId,
          ),
        )
        .select("*")
        .single();

      if (error) throw error;

      const nextRecord = mapPlaceRowToRecord(data as Record<string, unknown>);
      replacePlaceRecord(nextRecord);
      setSelectedPlaceId(nextRecord.id);
      setSelectedMemoryId(null);
      setAuthoringMode("none");
      setDraftCoordinates([]);
      setPlaceDraft(null);
      setFocusTarget({ lat: nextRecord.lat, lng: nextRecord.lng, zoom: 13 });
      openModePanel("places");
      setMsg("Lugar creado y visible en el preview.");
    } catch (errorValue) {
      setMsg(toErrorMessage(errorValue, "No se pudo crear el lugar."));
    } finally {
      setSavingTone(null);
    }
  }

  async function saveSelectedPlace() {
    if (!selectedPlace || !placeForm || !myProfileId) return;

    const title = normalizeText(placeForm.title);
    if (!title) {
      setMsg("El lugar necesita un título.");
      return;
    }

    const lat = parseNumberOrNull(placeForm.lat);
    const lng = parseNumberOrNull(placeForm.lng);
    if (lat == null || lng == null) {
      setMsg("Las coordenadas del lugar no son validas.");
      return;
    }

    const metadata = parseMetadataText(placeForm.metadataText);
    if (!metadata.ok) {
      setMsg(metadata.error);
      return;
    }

    setSavingTone(mode === "visual" ? "visual" : mode === "advanced" ? "advanced" : "place");
    setMsg(null);

    try {
      if (selectedPlace.gardenId === "__global_demo__") {
        const nextRecord = buildDemoPreviewPlaceRecord({
          id: selectedPlace.id,
          kind: placeForm.kind,
          state: placeForm.state,
          title,
          subtitle: normalizeText(placeForm.subtitle) || null,
          notes: normalizeText(placeForm.notes) || null,
          lat,
          lng,
          rating: parseNumberOrNull(placeForm.rating),
          iconCode: normalizeText(placeForm.iconCode) || null,
          colorToken: normalizeText(placeForm.colorToken) || null,
          tags: parseTagsText(placeForm.tagsText),
          metadata: metadata.value,
        });
        setDemoPreviewPlaces((current) => [
          nextRecord,
          ...current.filter((entry) => entry.id !== nextRecord.id),
        ]);
        setDemoHiddenPlaceIds((current) => current.filter((entry) => entry !== nextRecord.id));
        setSelectedPlaceId(nextRecord.id);
        setFocusTarget({ lat: nextRecord.lat, lng: nextRecord.lng, zoom: 13 });
        setMsg("Pin demo actualizado dentro del preview global.");
        return;
      }

      const { data, error } = await withGardenScope(
        supabase
          .from("map_places")
          .update({
            kind: placeForm.kind,
            state: placeForm.state,
            title,
            subtitle: normalizeText(placeForm.subtitle) || null,
            notes: normalizeText(placeForm.notes) || null,
            address_label: normalizeText(placeForm.subtitle) || null,
            lat,
            lng,
            rating: parseNumberOrNull(placeForm.rating),
            icon_code: normalizeText(placeForm.iconCode) || null,
            color_token: normalizeText(placeForm.colorToken) || null,
            tags: parseTagsText(placeForm.tagsText),
            metadata: metadata.value,
            source_page_id: selectedPlace.links.pageId,
            source_seed_id: selectedPlace.links.seedId,
            updated_by_user_id: myProfileId,
          })
          .eq("id", selectedPlace.id),
        activeGardenId,
      )
        .select("*")
        .single();

      if (error) throw error;

      const nextRecord = mapPlaceRowToRecord(data as Record<string, unknown>);
      replacePlaceRecord(nextRecord);
      setSelectedPlaceId(nextRecord.id);
      setFocusTarget({ lat: nextRecord.lat, lng: nextRecord.lng, zoom: 13 });
      setMsg(
        mode === "visual"
          ? "Visual del lugar guardado en el mapa."
          : "Lugar actualizado sin salir del admin.",
      );
    } catch (errorValue) {
      setMsg(toErrorMessage(errorValue, "No se pudo actualizar el lugar."));
    } finally {
      setSavingTone(null);
    }
  }

  async function saveNewRoute() {
    if (isGlobalPreview) {
      setMsg("Las rutas no se guardan desde preview global. Usa Jardín real para editar runtime.");
      return;
    }
    if (!routeForm || !myProfileId) return;
    if (draftCoordinates.length < 2) {
      setMsg("La ruta necesita origen y destino.");
      return;
    }

    const title = normalizeText(routeForm.title) || "Ruta nueva";
    const metadata = parseMetadataText(routeForm.metadataText);
    if (!metadata.ok) {
      setMsg(metadata.error);
      return;
    }

    const origin = draftCoordinates[0];
    const destination = draftCoordinates[1];
    const previewCoordinates =
      routePreview.route?.coordinates.length
        ? routePreview.route.coordinates.map((entry) => [entry.lng, entry.lat] as [number, number])
        : [
            [origin.lng, origin.lat] as [number, number],
            [destination.lng, destination.lat] as [number, number],
          ];

    setSavingTone("route");
    setMsg(null);

    try {
      const { data, error } = await supabase
        .from("map_routes")
        .insert(
          withGardenIdOnInsert(
            {
              kind: routeForm.kind,
              status: routeForm.status,
              travel_mode: routeForm.travelMode,
              title,
              subtitle: normalizeText(routeForm.subtitle) || null,
              notes: normalizeText(routeForm.notes) || null,
              origin_label:
                normalizeText(routeForm.originLabel) ||
                `${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}`,
              origin_lat: origin.lat,
              origin_lng: origin.lng,
              destination_label:
                normalizeText(routeForm.destinationLabel) ||
                `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}`,
              destination_lat: destination.lat,
              destination_lng: destination.lng,
              waypoints: [],
              geometry: {
                type: "LineString",
                coordinates: previewCoordinates,
              },
              distance_meters: routePreview.route?.distanceMeters ?? null,
              duration_seconds: routePreview.route?.durationSeconds ?? null,
              color_token: normalizeText(routeForm.colorToken) || null,
              icon_code: normalizeText(routeForm.iconCode) || null,
              tags: parseTagsText(routeForm.tagsText),
              metadata: metadata.value,
              source_page_id: null,
              source_seed_id: null,
              created_by_user_id: myProfileId,
              updated_by_user_id: null,
            },
            activeGardenId,
          ),
        )
        .select("*")
        .single();

      if (error) throw error;

      const nextRecord = mapRouteRowToRecord(data as Record<string, unknown>);
      replaceRouteRecord(nextRecord);
      setSelectedRouteId(nextRecord.id);
      setSelectedPlaceId(null);
      setSelectedMemoryId(null);
      setCreatingRoute(false);
      setAuthoringMode("none");
      setDraftCoordinates([]);
      setFocusTarget(routeFocusTarget(nextRecord));
      setMsg("Ruta guardada y visible sobre el mapa.");
    } catch (errorValue) {
      setMsg(toErrorMessage(errorValue, "No se pudo crear la ruta."));
    } finally {
      setSavingTone(null);
    }
  }

  async function saveSelectedRoute() {
    if (isGlobalPreview) {
      setMsg("Las rutas demo se usan para validar lenguaje visual, no para persistir cambios.");
      return;
    }
    if (!selectedRoute || !routeForm || !myProfileId) return;

    const metadata = parseMetadataText(routeForm.metadataText);
    if (!metadata.ok) {
      setMsg(metadata.error);
      return;
    }

    const usingDraft = authoringMode === "route" && draftCoordinates.length >= 2;
    const origin = usingDraft
      ? draftCoordinates[0]
      : selectedRoute.originLat != null && selectedRoute.originLng != null
        ? { lat: selectedRoute.originLat, lng: selectedRoute.originLng }
        : null;
    const destination = usingDraft
      ? draftCoordinates[1]
      : selectedRoute.destinationLat != null && selectedRoute.destinationLng != null
        ? { lat: selectedRoute.destinationLat, lng: selectedRoute.destinationLng }
        : null;
    const updatedCoordinates =
      usingDraft && origin && destination
        ? routePreview.route?.coordinates.length
          ? routePreview.route.coordinates.map((entry) => [entry.lng, entry.lat] as [number, number])
          : [
              [origin.lng, origin.lat] as [number, number],
              [destination.lng, destination.lat] as [number, number],
            ]
        : geometryCoordinates(selectedRoute.geometry);

    setSavingTone(mode === "visual" ? "visual" : mode === "advanced" ? "advanced" : "route");
    setMsg(null);

    try {
      const { data, error } = await withGardenScope(
        supabase
          .from("map_routes")
          .update({
            kind: routeForm.kind,
            status: routeForm.status,
            travel_mode: routeForm.travelMode,
            title: normalizeText(routeForm.title) || "Ruta sin título",
            subtitle: normalizeText(routeForm.subtitle) || null,
            notes: normalizeText(routeForm.notes) || null,
            origin_label:
              normalizeText(routeForm.originLabel) ||
              (origin ? `${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}` : null),
            origin_lat: origin?.lat ?? null,
            origin_lng: origin?.lng ?? null,
            destination_label:
              normalizeText(routeForm.destinationLabel) ||
              (destination
                ? `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}`
                : null),
            destination_lat: destination?.lat ?? null,
            destination_lng: destination?.lng ?? null,
            geometry:
              updatedCoordinates.length >= 2
                ? {
                    type: "LineString",
                    coordinates: updatedCoordinates,
                  }
                : selectedRoute.geometry,
            distance_meters:
              usingDraft && routePreview.route
                ? routePreview.route.distanceMeters
                : selectedRoute.distanceMeters,
            duration_seconds:
              usingDraft && routePreview.route
                ? routePreview.route.durationSeconds
                : selectedRoute.durationSeconds,
            color_token: normalizeText(routeForm.colorToken) || null,
            icon_code: normalizeText(routeForm.iconCode) || null,
            tags: parseTagsText(routeForm.tagsText),
            metadata: metadata.value,
            source_page_id: selectedRoute.links.pageId,
            source_seed_id: selectedRoute.links.seedId,
            updated_by_user_id: myProfileId,
          })
          .eq("id", selectedRoute.id),
        activeGardenId,
      )
        .select("*")
        .single();

      if (error) throw error;

      const nextRecord = mapRouteRowToRecord(data as Record<string, unknown>);
      replaceRouteRecord(nextRecord);
      setSelectedRouteId(nextRecord.id);
      setFocusTarget(routeFocusTarget(nextRecord));
      setAuthoringMode("none");
      setDraftCoordinates([]);
      setCreatingRoute(false);
      setMsg(
        usingDraft
          ? "Ruta actualizada con el nuevo trazado."
          : mode === "visual"
            ? "Visual de la ruta guardado."
            : "Ruta actualizada dentro del admin.",
      );
    } catch (errorValue) {
      setMsg(toErrorMessage(errorValue, "No se pudo actualizar la ruta."));
    } finally {
      setSavingTone(null);
    }
  }

  async function saveSelectedZone() {
    if (!selectedZone || !zoneForm || !myProfileId) return;

    const metadata = parseMetadataText(zoneForm.metadataText);
    if (!metadata.ok) {
      setMsg(metadata.error);
      return;
    }

    setSavingTone(mode === "visual" ? "visual" : "advanced");
    setMsg(null);

    try {
      const { data, error } = await withGardenScope(
        supabase
          .from("map_zones")
          .update({
            title: normalizeText(zoneForm.title) || "Zona sin título",
            subtitle: normalizeText(zoneForm.subtitle) || null,
            description: normalizeText(zoneForm.description) || null,
            kind: zoneForm.kind,
            status: zoneForm.status,
            color_token: normalizeText(zoneForm.colorToken) || null,
            icon_code: normalizeText(zoneForm.iconCode) || null,
            tags: parseTagsText(zoneForm.tagsText),
            metadata: metadata.value,
            source_page_id: selectedZone.links.pageId,
            source_seed_id: selectedZone.links.seedId,
            updated_by_user_id: myProfileId,
          })
          .eq("id", selectedZone.id),
        activeGardenId,
      )
        .select("*")
        .single();

      if (error) throw error;

      const nextRecord = mapZoneRowToRecord(data as Record<string, unknown>);
      replaceZoneRecord(nextRecord);
      setSelectedZoneId(nextRecord.id);
      setFocusTarget(zoneFocusTarget(nextRecord));
      setMsg(
        mode === "visual"
          ? "Visual de la zona guardado."
          : "Zona actualizada desde la capa avanzada.",
      );
    } catch (errorValue) {
      setMsg(toErrorMessage(errorValue, "No se pudo actualizar la zona."));
    } finally {
      setSavingTone(null);
    }
  }

  function openIssue(issue: MapValidationIssue) {
    openModePanel(
      isGlobalPreview
        ? issue.targetMode === "visual" || issue.targetMode === "validation"
          ? issue.targetMode
          : "places"
        : issue.targetMode,
    );
    setFocusTarget(issue.focus);
    if (issue.targetKind === "place" && issue.targetId) {
      setSelectedPlaceId(issue.targetId);
      setSelectedMemoryId(null);
      setSelectedRouteId(null);
      setSelectedZoneId(null);
      return;
    }
    if (issue.targetKind === "route" && issue.targetId) {
      setSelectedRouteId(issue.targetId);
      setSelectedMemoryId(null);
      setSelectedPlaceId(null);
      setSelectedZoneId(null);
      return;
    }
    if (issue.targetKind === "zone" && issue.targetId) {
      setSelectedZoneId(issue.targetId);
      setSelectedMemoryId(null);
      setSelectedPlaceId(null);
      setSelectedRouteId(null);
      return;
    }
    clearSelection();
  }

  function handleSemanticScopeChange(nextScope: MapSemanticScope) {
    setSemanticScope(nextScope);
    setSelectedSemanticCode(null);
    setSemanticDraft(null);
  }

  function handleSemanticItemSelect(item: MapSemanticItem) {
    setSelectedSemanticCode(item.code);
    setSemanticDraft(buildMapSemanticDraftFromItem(item));
  }

  function beginNewSemanticDraft() {
    const scopeMeta = MAP_SEMANTIC_SCOPE_META[semanticScope];
    if (!scopeMeta.allowCreate) return;
    setSelectedSemanticCode(null);
    setSemanticDraft(buildEmptyMapSemanticDraft(semanticScope, semanticItems));
  }

  async function saveSemanticDraft() {
    if (!semanticDraft) return;
    const catalogKey = semanticDraft.catalogKey;
    const code = normalizeMapSemanticCode(semanticDraft.code);
    const label = normalizeText(semanticDraft.label);
    const scopeMeta = MAP_SEMANTIC_SCOPE_META[semanticScope];
    if (!code || !label) {
      setMsg("Code y label son obligatorios para guardar esta semantica.");
      return;
    }
    if (catalogKey === "map_lenses" && !MAP_RUNTIME_LENS_IDS.includes(code as MapRuntimeLensId)) {
      setMsg("Las lentes editables son las que ya existen en runtime. Cambia label, icono, color u orden, pero no inventes un id nuevo aquí.");
      return;
    }

    const sortOrder = Number.parseInt(semanticDraft.sortOrder, 10);
    const icon = normalizeText(semanticDraft.icon);
    const color = normalizeText(semanticDraft.color) || null;
    const description = normalizeText(semanticDraft.description);
    const metadata: Record<string, unknown> = {};
    if (description) metadata.description = description;
    if (catalogKey === "map_lenses") {
      metadata.group = semanticDraft.group;
    }
    if (catalogKey === "map_place_kinds" && isMapCatalogAssetPath(icon)) {
      metadata.asset_path = icon;
    } else if (catalogKey === "map_place_kinds" && icon) {
      metadata.glyph = icon;
    }

    setSavingTone("semantic");
    setMsg(null);
    try {
      const catalogLabel =
        catalogKey === "map_place_kinds"
          ? "Tipos de lugar"
          : catalogKey === "map_place_states"
            ? "Estados del lugar"
            : "Lentes del mapa";
      const catalogDescription =
        catalogKey === "map_place_kinds"
          ? "Semantica editable de pins y tipos de lugar del mapa."
          : catalogKey === "map_place_states"
            ? "Semantica editable de estados visibles del mapa."
            : "Semantica editable de las lentes visibles del mapa.";

      const { error: catalogError } = await supabase.from("catalogs").upsert({
        key: catalogKey,
        label: catalogLabel,
        description: catalogDescription,
        is_active: true,
      });
      if (catalogError) throw catalogError;

      const { error } = await supabase.from("catalog_items").upsert(
        {
          catalog_key: catalogKey,
          code,
          label,
          sort_order: Number.isFinite(sortOrder) ? sortOrder : 100,
          enabled: semanticDraft.enabled,
          icon: icon || null,
          color,
          metadata,
        },
        { onConflict: "catalog_key,code" },
      );

      if (error) throw error;

      await Promise.all([
        loadMapSemantics(),
        refreshMapRuntimeConfig(),
      ]);

      const nextDraft: MapSemanticDraft = {
        ...semanticDraft,
        catalogKey,
        code,
        label,
        icon,
        color: color ?? "",
        description,
        sortOrder: String(Number.isFinite(sortOrder) ? sortOrder : 100),
      };
      setSelectedSemanticCode(code);
      setSemanticDraft(nextDraft);
      setMsg(
        semanticScope === "types"
          ? "Tipo de lugar guardado."
          : semanticScope === "states"
            ? "Estado del lugar guardado."
            : "Lente del mapa guardada.",
      );
    } catch (errorValue) {
      setMsg(toErrorMessage(errorValue, `No se pudo guardar ${scopeMeta.label.toLowerCase()}.`));
    } finally {
      setSavingTone(null);
    }
  }

  async function deleteSelectedSemanticItem() {
    if (!selectedSemanticItem) {
      setMsg("Selecciona un item del sistema para borrarlo.");
      return;
    }
    if (selectedSemanticItem.source !== "catalog") {
      setMsg("Los items base del sistema no se borran desde aquí. Puedes ocultarlos o sobrescribirlos.");
      return;
    }

    setSavingTone("semantic");
    setMsg(null);
    try {
      const { error } = await supabase
        .from("catalog_items")
        .delete()
        .eq("catalog_key", selectedSemanticItem.catalogKey)
        .eq("code", selectedSemanticItem.code);

      if (error) throw error;

      setSelectedSemanticCode(null);
      setSemanticDraft(null);
      await Promise.all([loadMapSemantics(), refreshMapRuntimeConfig()]);
      setMsg("Item del sistema borrado.");
    } catch (errorValue) {
      setMsg(toErrorMessage(errorValue, "No se pudo borrar este item del sistema."));
    } finally {
      setSavingTone(null);
    }
  }

  useEffect(() => {
    clearSelection();
    setAuthoringMode("none");
    setDraftCoordinates([]);
    setPlaceDraft(null);
    setCreatingRoute(false);
    setRouteForm((current) => (current && !isGlobalPreview ? current : null));
    setFocusTarget(isGlobalPreview ? demoPreviewScenario.focus : null);
  }, [demoPreviewScenario.focus, isGlobalPreview, previewSource, demoScenario]);

  const semanticUsageCount = selectedSemanticItem
    ? semanticScope === "types"
      ? effectiveMapPlaces.filter((place) => place.kind === selectedSemanticItem.code).length
      : semanticScope === "states"
        ? effectiveMapPlaces.filter((place) => place.state === selectedSemanticItem.code).length
        : 0
    : 0;

  const selectedContextTitle = selectedPlace
    ? `${isGlobalPreview ? "Pin demo" : "Lugar"}: ${selectedPlace.title}`
    : selectedRoute
      ? `Ruta: ${selectedRoute.title}`
      : selectedZone
        ? `Zona: ${selectedZone.title}`
        : selectedMemory
          ? `Flor: ${selectedMemory.title}`
          : mode === "visual" && semanticDraft
            ? `${MAP_SEMANTIC_SCOPE_META[semanticScope].label}: ${semanticDraft.label || normalizeMapSemanticCode(semanticDraft.code) || "sin selección"}`
          : "Sin selección";

  const inputClassName =
    "w-full rounded-[18px] border border-[#d9e4d3] bg-[#fbfcfa] px-3 py-2.5 text-sm text-slate-900";
  const textareaClassName =
    "min-h-[112px] w-full rounded-[20px] border border-[#d9e4d3] bg-[#fbfcfa] px-3 py-3 text-sm text-slate-900";
  const heroStats = isGlobalPreview
    ? [
        { label: "Fuente", value: "Preview global" },
        { label: "Escenario", value: demoPreviewScenario.label },
        { label: "Tipos", value: String(mapRuntimeConfig.placeKinds.length) },
        { label: "Estados", value: String(mapRuntimeConfig.placeStates.length) },
        { label: "Lentes", value: String(mapRuntimeConfig.lenses.length) },
      ]
    : [
        { label: "Jardín", value: activeGardenTitle || "sin jardín" },
        { label: "Flores GPS", value: String(runtimeVisibleMemories.length) },
        { label: "Lugares", value: String(mapPlaces.length) },
        { label: "Rutas", value: String(mapRoutes.length) },
        { label: "Zonas", value: String(mapZones.length) },
      ];
  const previewFocusTarget = focusTarget ?? (isGlobalPreview ? demoPreviewScenario.focus : null);
  const visibleModeOptions = useMemo<Array<{ key: MapAdminMode; label: string }>>(
    () => [
      { key: "preview", label: "Escena" },
      { key: "visual", label: "Sistema" },
      { key: "validation", label: "Chequeos" },
    ],
    [],
  );
  const previewInstruction =
    isGlobalPreview && authoringMode === "none"
      ? "Selecciona un pin demo o toca el mapa para añadir uno nuevo sin tocar ningún jardín real."
      : authoringMode === "place"
        ? draftLookupLoading
          ? "Buscando una dirección base para el nuevo lugar..."
          : "Modo lugar activo. Haz click en el mapa para colocar o recolocar el pin."
        : authoringMode === "route"
          ? routeInstruction
          : "Seleccionar aquí abre el control contextual sin salir del admin.";
  const isDemoModeTabOpen =
    showControlPanel && (mode === "preview" || mode === "places");
  const controlPanelTitle =
    mode === "visual"
      ? "Sistema"
      : mode === "validation"
        ? "Validacion"
        : mode === "advanced"
          ? "Avanzado"
          : mode === "places"
            ? isGlobalPreview
              ? "Demo"
              : "Lugares"
          : mode === "routes"
              ? "Rutas"
              : "Demo";

  function openModePanel(nextMode: MapAdminMode) {
    setMode(nextMode);
    setShowControlPanel(true);
  }

  function toggleModePanel(nextMode: MapAdminMode) {
    if (showControlPanel && mode === nextMode) {
      setShowControlPanel(false);
      return;
    }
    setMode(nextMode);
    setShowControlPanel(true);
  }

  function toggleDemoModePanel() {
    if (isDemoModeTabOpen) {
      setShowControlPanel(false);
      return;
    }

    const nextMode = mode === "preview" || mode === "places" ? mode : "places";
    setMode(nextMode);
    setShowControlPanel(true);
  }

  useEffect(() => {
    if (!overlayPanelDrag) return;
    const activeDrag = overlayPanelDrag;

    function handlePointerMove(event: PointerEvent) {
      setOverlayOffsets((current) => ({
        ...current,
        [activeDrag.panel]: {
          x: activeDrag.startOffsetX + (event.clientX - activeDrag.startClientX),
          y: activeDrag.startOffsetY + (event.clientY - activeDrag.startClientY),
        },
      }));
    }

    function handlePointerUp() {
      setOverlayPanelDrag(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [overlayPanelDrag]);

  function startOverlayPanelDrag(panel: OverlayPanelId, event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    setOverlayPanelDrag({
      panel,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: overlayOffsets[panel].x,
      startOffsetY: overlayOffsets[panel].y,
    });
  }

  if (loading) {
    return <PageLoadingState message="Cargando dominio de mapa..." />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#edf2ea] text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#ffffff_0%,#edf2ea_48%,#e5ede2_100%)]" />

      <div className="absolute inset-0 overflow-hidden">
        <MemoriesMap
          immersive
          memories={previewPoints}
          mapConfig={effectivePreviewMapConfig}
          selectedMemoryId={selectedPointVisualId}
          selectedRouteId={selectedRouteId}
          selectedZoneId={selectedZoneId}
          onMarkerSelect={handleMarkerSelect}
          onSavedRouteSelect={handleRouteSelect}
          onZoneSelect={handleZoneSelect}
          authoringMode={authoringMode}
          draftCoordinates={draftCoordinates}
          draftRoutePreview={routePreview.route}
          onMapCoordinateAdd={handleMapCoordinateAdd}
          onMapInteract={() => setFocusTarget(null)}
          focusTarget={previewFocusTarget}
          savedRoutes={effectiveMapRoutes}
          savedZones={effectiveMapZones}
          activeLens={previewLens}
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.42),rgba(255,255,255,0.06)_32%,rgba(255,255,255,0.16)_100%)]" />
      </div>

      <div className="pointer-events-none absolute inset-0">
        <div className="pointer-events-auto absolute left-1/2 top-4 z-30 -translate-x-1/2">
          <div className="inline-flex w-max max-w-[calc(100vw-2rem)] items-center justify-center gap-2 overflow-x-auto rounded-full border border-[#e4ecdf] bg-[rgba(255,255,255,0.98)] px-3 py-3 shadow-[0_18px_44px_rgba(24,36,26,0.14)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              className="shrink-0 rounded-full border border-[#d9e4d3] bg-white px-4 py-2 text-sm text-slate-800 transition hover:bg-[#f7faf4]"
              onClick={() => router.push("/admin")}
            >
              Volver
            </button>
            <button
              type="button"
              className={`shrink-0 rounded-full border px-4 py-2 text-sm transition ${
                isDemoModeTabOpen
                  ? "border-[#94b38c] bg-[#eef8e8] text-[#496445]"
                  : "border-[#d9e4d3] bg-white text-slate-700"
              }`}
              onClick={toggleDemoModePanel}
            >
              Demo
            </button>
            <button
              type="button"
              className={`shrink-0 rounded-full border px-4 py-2 text-sm transition ${
                showControlPanel && mode === "visual"
                  ? "border-[#94b38c] bg-[#eef8e8] text-[#496445]"
                  : "border-[#d9e4d3] bg-white text-slate-700"
              }`}
              onClick={() => toggleModePanel("visual")}
            >
              Sistema
            </button>
            <button
              type="button"
              className={`shrink-0 rounded-full border px-4 py-2 text-sm transition ${
                showControlPanel && mode === "validation"
                  ? "border-[#94b38c] bg-[#eef8e8] text-[#496445]"
                  : "border-[#d9e4d3] bg-white text-slate-700"
              }`}
              onClick={() => toggleModePanel("validation")}
            >
              Validacion
            </button>
            <button
              type="button"
              className={`shrink-0 rounded-full border px-4 py-2 text-sm transition ${
                showControlPanel && mode === "advanced"
                  ? "border-[#94b38c] bg-[#eef8e8] text-[#496445]"
                  : "border-[#d9e4d3] bg-white text-slate-700"
              }`}
              onClick={() => toggleModePanel("advanced")}
            >
              Avanzado
            </button>
            <button
              type="button"
              className="shrink-0 rounded-full border border-[#d9e4d3] bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-[#f7faf4]"
              onClick={clearSelection}
            >
              Limpiar seleccion
            </button>
            {!isGlobalPreview && mode === "routes" ? (
              <button
                type="button"
                className="shrink-0 rounded-full bg-[#1f3c2f] px-4 py-2 text-sm text-white transition hover:bg-[#294c3b]"
                onClick={beginRouteAuthoring}
              >
                Nueva ruta
              </button>
            ) : null}
            {!isGlobalPreview ? (
              <button
                type="button"
                className="shrink-0 rounded-full border border-[#d9e4d3] bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-[#f7faf4] disabled:opacity-60"
                disabled={refreshing || !myProfileId}
                onClick={() => {
                  if (!myProfileId) return;
                  void loadRuntimeMapDomain(activeGardenId, myProfileId, true);
                }}
              >
                {refreshing ? "Recargando..." : "Recargar runtime"}
              </button>
            ) : null}
          </div>
        </div>

        {msg ? (
          <StatusNotice
            message={msg}
            className="absolute left-1/2 top-24 z-30 w-[min(560px,calc(100%-2rem))] -translate-x-1/2"
          />
        ) : null}

        {showContextPanel ? (
          <ImmersiveOverlayCard
            title="Demo"
            description="Aquí preparas la escena demo del mapa: anades pins, los restauras y validas sin tocar jardines reales."
            actions={
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full border border-[#d9e4d3] bg-white px-3 py-1.5 text-xs text-slate-600 transition hover:bg-[#f7faf4]"
                  onClick={beginPlaceAuthoring}
                >
                  Anadir pin demo
                </button>
                <button
                  type="button"
                  className="rounded-full border border-[#d9e4d3] bg-white px-3 py-1.5 text-xs text-slate-600 transition hover:bg-[#f7faf4]"
                  onClick={() => setShowContextPanel(false)}
                >
                  Ocultar
                </button>
              </div>
            }
            className="left-4 top-24 w-[360px] max-h-[calc(100dvh-144px)]"
            contentClassName="max-h-[calc(100dvh-236px)] space-y-4 overflow-auto pr-1"
          >
          <div className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[#61755c]">
                  Escenario demo
                </div>
                <AdminToggleGroup
                  value={demoScenario}
                  onChange={(value) => setDemoScenario(value as AdminMapPreviewScenarioId)}
                  options={MAP_DEMO_SCENARIO_OPTIONS}
                />
              </div>

              {!isGlobalPreview ? (
                <div className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[#61755c]">
                    Espacio de trabajo
                  </div>
                  <AdminToggleGroup
                    value={mode}
                    onChange={(value) => openModePanel(value)}
                    options={visibleModeOptions}
                  />
                </div>
              ) : null}

              <AdminInlineNote>
                <span className="font-medium text-slate-900">Admin global del mapa</span>
                {" / "}
                {selectedContextTitle}
                {" · "}
                {modeDescription(mode, previewSource)}
              </AdminInlineNote>
              <div className="grid gap-2 sm:grid-cols-2">
                {heroStats.map((stat) => (
                  <SummaryChip key={stat.label} label={stat.label} value={stat.value} />
                ))}
              </div>
            </div>

              <div className="rounded-[22px] border border-[#d9e4d3] bg-[#fbfcfa] p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[#61755c]">
                  Escena activa
                </div>
                <div className="mt-2 text-sm font-medium text-slate-950">
                  {demoPreviewScenario.label}
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-600">
                  {demoPreviewScenario.description}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-[16px] border border-[#d9e4d3] bg-white px-3 py-2 text-sm text-slate-700"
                    onClick={() => {
                      clearSelection();
                      setDemoPreviewPlaces([]);
                      setDemoHiddenPlaceIds([]);
                    }}
                  >
                    Restaurar escena demo
                  </button>
                  <button
                    type="button"
                    className="rounded-[16px] border border-[#d9e4d3] bg-white px-3 py-2 text-sm text-slate-700"
                    onClick={() => openModePanel("validation")}
                  >
                    Ir a validacion
                  </button>
                </div>
                <div className="mt-3 text-xs leading-5 text-[#496445]">
                  {validationIssues.length} incidencias visibles en esta escena demo.
                </div>
              </div>
            </div>
        </ImmersiveOverlayCard>
        ) : null}

        <div className="pointer-events-auto absolute bottom-4 left-4 z-20 flex max-w-[calc(100%-2rem)] flex-wrap gap-2">
          <div className="rounded-full border border-[#e4ecdf] bg-[rgba(255,255,255,0.98)] px-4 py-2 text-sm text-slate-700 shadow-[0_12px_30px_rgba(24,36,26,0.12)]">
            {selectedContextTitle}
          </div>
          {authoringMode !== "none" ? (
            <div className="rounded-full border border-[#e4ecdf] bg-[rgba(255,255,255,0.98)] px-4 py-2 text-sm text-slate-700 shadow-[0_12px_30px_rgba(24,36,26,0.12)]">
              {previewInstruction}
            </div>
          ) : null}
        </div>

        {showControlPanel ? (
        <ImmersiveOverlayCard
          title={controlPanelTitle}
          description={modeDescription(mode, previewSource)}
          className={`right-4 top-[140px] max-h-[calc(100dvh-200px)] ${
            mode === "visual"
              ? "w-[min(360px,calc(100vw-2rem))]"
              : "w-[min(340px,calc(100vw-2rem))]"
          }`}
          contentClassName="max-h-[calc(100dvh-296px)] overflow-auto pr-1"
          style={{ transform: `translate(${overlayOffsets.control.x}px, ${overlayOffsets.control.y}px)` }}
          onHeaderPointerDown={(event) => startOverlayPanelDrag("control", event)}
        >
              {mode === "preview" ? (
                <div className="space-y-3">
                  <AdminInlineNote>
                    {isGlobalPreview
                      ? "Aquí no editas jardines reales. Preparas escenas demo para decidir el lenguaje global del mapa."
                      : "Esta capa sirve para entender el sistema y abrir la decision correcta, no para llenar formularios."}
                  </AdminInlineNote>
                  <button
                    type="button"
                    className="w-full rounded-[18px] border border-[#d9e4d3] bg-[#fbfcfa] p-4 text-left"
                    onClick={beginPlaceAuthoring}
                  >
                    <div className="text-sm font-medium text-slate-950">
                      {isGlobalPreview ? "Añadir pin demo" : "Crear lugar desde el mapa"}
                    </div>
                    <div className="mt-1 text-sm leading-6 text-slate-600">
                      {isGlobalPreview
                        ? "Coloca un ejemplo rápido para validar asset, color, tipo y estado."
                        : "Coloca un pin nuevo sin abrir otra pantalla."}
                    </div>
                  </button>
                  {isGlobalPreview ? (
                    <button
                      type="button"
                      className="w-full rounded-[18px] border border-[#d9e4d3] bg-[#fbfcfa] p-4 text-left"
                      onClick={() => openModePanel("visual")}
                    >
                      <div className="text-sm font-medium text-slate-950">
                        Abrir lenguaje visual del mapa
                      </div>
                      <div className="mt-1 text-sm leading-6 text-slate-600">
                        Ajusta tipos, estados y lentes viendo el cambio sobre la escena demo.
                      </div>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="w-full rounded-[18px] border border-[#d9e4d3] bg-[#fbfcfa] p-4 text-left"
                      onClick={beginRouteAuthoring}
                    >
                      <div className="text-sm font-medium text-slate-950">Crear ruta desde el preview</div>
                      <div className="mt-1 text-sm leading-6 text-slate-600">
                        Marca origen y destino y deja el trazado ya visible sobre el mapa.
                      </div>
                    </button>
                  )}
                  {selectedMemory ? (
                    <button
                      type="button"
                      className="w-full rounded-[18px] border border-[#d9e4d3] bg-[#fbfcfa] p-4 text-left"
                      onClick={useSelectedMemoryAsPlace}
                    >
                      <div className="text-sm font-medium text-slate-950">
                        Convertir esta flor en lugar guardado
                      </div>
                      <div className="mt-1 text-sm leading-6 text-slate-600">
                        Usa la ubicacion ya existente de la flor seleccionada.
                      </div>
                    </button>
                  ) : null}
                  {isGlobalPreview && demoPreviewPlaces.length ? (
                    <button
                      type="button"
                      className="w-full rounded-[18px] border border-dashed border-[#d9e4d3] bg-white p-4 text-left"
                      onClick={() => {
                        clearSelection();
                        setDemoPreviewPlaces([]);
                        setDemoHiddenPlaceIds([]);
                      }}
                    >
                      <div className="text-sm font-medium text-slate-950">Reiniciar escena demo</div>
                      <div className="mt-1 text-sm leading-6 text-slate-600">
                        Elimina los pins manuales anadidos y vuelve a la escena base.
                      </div>
                    </button>
                  ) : null}
                </div>
              ) : null}

              {mode === "places" ? (
                <div className="space-y-3">
                  {isGlobalPreview ? (
                    <>
                      <div className="space-y-2">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-[#61755c]">
                          Escenario demo
                        </div>
                        <AdminToggleGroup
                          value={demoScenario}
                          onChange={(value) => setDemoScenario(value as AdminMapPreviewScenarioId)}
                          options={MAP_DEMO_SCENARIO_OPTIONS}
                        />
                      </div>
                      <AdminInlineNote>
                        <span className="font-medium text-slate-900">{demoPreviewScenario.label}</span>
                        {" / "}
                        {demoPreviewScenario.description}
                      </AdminInlineNote>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <SummaryChip label="Pins preview" value={String(effectiveMapPlaces.length)} />
                        <SummaryChip label="Pins anadidos" value={String(demoPreviewPlaces.length)} />
                      </div>
                    </>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-[16px] bg-[#1f3c2f] px-3 py-2 text-sm text-white"
                      onClick={beginPlaceAuthoring}
                    >
                      {isGlobalPreview ? "Crear pin demo" : "Crear lugar"}
                    </button>
                    {selectedMemory ? (
                      <button
                        type="button"
                        className="rounded-[16px] border border-[#d9e4d3] bg-white px-3 py-2 text-sm"
                        onClick={useSelectedMemoryAsPlace}
                      >
                        Usar flor seleccionada
                      </button>
                    ) : null}
                    {isGlobalPreview ? (
                      <button
                        type="button"
                        className="rounded-[16px] border border-[#d9e4d3] bg-white px-3 py-2 text-sm"
                        onClick={() => {
                          clearSelection();
                          setDemoPreviewPlaces([]);
                          setDemoHiddenPlaceIds([]);
                        }}
                      >
                        Restaurar escena demo
                      </button>
                    ) : null}
                  </div>

                  {placeDraft ? (
                    <>
                      <input
                        className={inputClassName}
                        value={placeDraft.title}
                        onChange={(event) =>
                          setPlaceDraft((current) =>
                            current ? { ...current, title: event.target.value } : current,
                          )
                        }
                        placeholder="Título"
                      />
                      <input
                        className={inputClassName}
                        value={placeDraft.subtitle}
                        onChange={(event) =>
                          setPlaceDraft((current) =>
                            current ? { ...current, subtitle: event.target.value } : current,
                          )
                        }
                        placeholder="Subtítulo"
                      />
                      <textarea
                        className={textareaClassName}
                        value={placeDraft.notes}
                        onChange={(event) =>
                          setPlaceDraft((current) =>
                            current ? { ...current, notes: event.target.value } : current,
                          )
                        }
                        placeholder="Notas"
                      />
                      <div className="grid gap-3 md:grid-cols-2">
                        <select
                          className={inputClassName}
                          value={placeDraft.kind}
                          onChange={(event) =>
                            setPlaceDraft((current) =>
                              current
                                ? { ...current, kind: event.target.value as MapPlaceKind }
                                : current,
                            )
                          }
                        >
                          {placeKindOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <select
                          className={inputClassName}
                          value={placeDraft.state}
                          onChange={(event) =>
                            setPlaceDraft((current) =>
                              current
                                ? { ...current, state: event.target.value as MapPlaceState }
                                : current,
                            )
                          }
                        >
                          {placeStateOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-[18px] bg-[#1f3c2f] px-4 py-2 text-sm text-white disabled:opacity-60"
                          disabled={savingTone === "place"}
                          onClick={() => void savePlaceDraft()}
                        >
                          {savingTone === "place" ? "Guardando..." : "Guardar lugar"}
                        </button>
                        <button
                          type="button"
                          className="rounded-[18px] border border-[#d9e4d3] bg-white px-4 py-2 text-sm"
                          onClick={cancelPlaceAuthoring}
                        >
                          Cancelar
                        </button>
                      </div>
                    </>
                  ) : selectedPlace && placeForm ? (
                    <>
                      <input
                        className={inputClassName}
                        value={placeForm.title}
                        onChange={(event) =>
                          setPlaceForm((current) =>
                            current ? { ...current, title: event.target.value } : current,
                          )
                        }
                      />
                      <input
                        className={inputClassName}
                        value={placeForm.subtitle}
                        onChange={(event) =>
                          setPlaceForm((current) =>
                            current ? { ...current, subtitle: event.target.value } : current,
                          )
                        }
                      />
                      <textarea
                        className={textareaClassName}
                        value={placeForm.notes}
                        onChange={(event) =>
                          setPlaceForm((current) =>
                            current ? { ...current, notes: event.target.value } : current,
                          )
                        }
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-[18px] bg-[#1f3c2f] px-4 py-2 text-sm text-white disabled:opacity-60"
                          disabled={savingTone === "place"}
                          onClick={() => void saveSelectedPlace()}
                        >
                          {savingTone === "place" ? "Guardando..." : "Guardar lugar"}
                        </button>
                        {isGlobalPreview && selectedPlace.gardenId === "__global_demo__" ? (
                          <>
                            <button
                              type="button"
                              className="rounded-[18px] border border-[#d9e4d3] bg-white px-4 py-2 text-sm"
                              onClick={restoreSelectedDemoPlace}
                            >
                              Restaurar pin
                            </button>
                            <button
                              type="button"
                              className="rounded-[18px] border border-[#e7c8c4] bg-[#fff5f4] px-4 py-2 text-sm text-[#7a3e36]"
                              onClick={removeSelectedDemoPlace}
                            >
                              Quitar del demo
                            </button>
                          </>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <AdminInlineNote>
                      {isGlobalPreview
                        ? "Selecciona un pin demo del preview o añade uno nuevo."
                        : "Selecciona un pin del mapa o crea uno nuevo."}
                    </AdminInlineNote>
                  )}

                  <input
                    className={inputClassName}
                    value={placeSearch}
                    onChange={(event) => setPlaceSearch(event.target.value)}
                    placeholder="Buscar lugar"
                  />
                  <div className="space-y-2">
                    {matchingPlaces.slice(0, 6).map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        className={`w-full rounded-[18px] border p-3 text-left ${
                          selectedPlaceId === entry.id
                            ? "border-[#9bb990] bg-[#eef8e8]"
                            : "border-[#d9e4d3] bg-[#fbfcfa]"
                        }`}
                        onClick={() => handleMarkerSelect(mapPlaceRecordToPoint(entry))}
                      >
                        <div className="text-sm font-medium text-slate-950">{entry.title}</div>
                        <div className="mt-1 text-sm leading-6 text-slate-600">
                          {entry.subtitle || entry.addressLabel || "Sin subtítulo"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {mode === "routes" ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-[16px] bg-[#1f3c2f] px-3 py-2 text-sm text-white"
                      onClick={beginRouteAuthoring}
                    >
                      Crear ruta
                    </button>
                    {selectedRoute ? (
                      <button
                        type="button"
                        className="rounded-[16px] border border-[#d9e4d3] bg-white px-3 py-2 text-sm"
                        onClick={redrawSelectedRoute}
                      >
                        Redibujar ruta
                      </button>
                    ) : null}
                  </div>

                  {(creatingRoute || authoringMode === "route") && routeForm ? (
                    <>
                      <AdminInlineNote tone="success">{routeInstruction}</AdminInlineNote>
                      <input
                        className={inputClassName}
                        value={routeForm.title}
                        onChange={(event) =>
                          setRouteForm((current) =>
                            current ? { ...current, title: event.target.value } : current,
                          )
                        }
                        placeholder="Título de la ruta"
                      />
                      <div className="grid gap-3 md:grid-cols-2">
                        <input
                          className={inputClassName}
                          value={routeForm.originLabel}
                          onChange={(event) =>
                            setRouteForm((current) =>
                              current ? { ...current, originLabel: event.target.value } : current,
                            )
                          }
                          placeholder="Origen"
                        />
                        <input
                          className={inputClassName}
                          value={routeForm.destinationLabel}
                          onChange={(event) =>
                            setRouteForm((current) =>
                              current
                                ? { ...current, destinationLabel: event.target.value }
                                : current,
                            )
                          }
                          placeholder="Destino"
                        />
                      </div>
                      <textarea
                        className={textareaClassName}
                        value={routeForm.notes}
                        onChange={(event) =>
                          setRouteForm((current) =>
                            current ? { ...current, notes: event.target.value } : current,
                          )
                        }
                        placeholder="Notas"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-[18px] bg-[#1f3c2f] px-4 py-2 text-sm text-white disabled:opacity-60"
                          disabled={
                            savingTone === "route" ||
                            savingTone === "advanced" ||
                            savingTone === "visual"
                          }
                          onClick={() => void (creatingRoute ? saveNewRoute() : saveSelectedRoute())}
                        >
                          {savingTone === "route" || savingTone === "advanced" || savingTone === "visual"
                            ? "Guardando..."
                            : creatingRoute
                              ? "Guardar ruta"
                              : "Guardar cambios"}
                        </button>
                        <button
                          type="button"
                          className="rounded-[18px] border border-[#d9e4d3] bg-white px-4 py-2 text-sm"
                          onClick={cancelRouteAuthoring}
                        >
                          Cancelar trazado
                        </button>
                      </div>
                    </>
                  ) : selectedRoute && routeForm ? (
                    <>
                      <input
                        className={inputClassName}
                        value={routeForm.title}
                        onChange={(event) =>
                          setRouteForm((current) =>
                            current ? { ...current, title: event.target.value } : current,
                          )
                        }
                      />
                      <button
                        type="button"
                        className="rounded-[18px] bg-[#1f3c2f] px-4 py-2 text-sm text-white disabled:opacity-60"
                        disabled={savingTone === "route"}
                        onClick={() => void saveSelectedRoute()}
                      >
                        {savingTone === "route" ? "Guardando..." : "Guardar ruta"}
                      </button>
                    </>
                  ) : (
                    <AdminInlineNote>
                      Selecciona una ruta desde el mapa o crea una nueva.
                    </AdminInlineNote>
                  )}

                  <input
                    className={inputClassName}
                    value={routeSearch}
                    onChange={(event) => setRouteSearch(event.target.value)}
                    placeholder="Buscar ruta"
                  />
                  <div className="space-y-2">
                    {matchingRoutes.slice(0, 6).map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        className={`w-full rounded-[18px] border p-3 text-left ${
                          selectedRouteId === entry.id
                            ? "border-[#9bb990] bg-[#eef8e8]"
                            : "border-[#d9e4d3] bg-[#fbfcfa]"
                        }`}
                        onClick={() => handleRouteSelect(entry)}
                      >
                        <div className="text-sm font-medium text-slate-950">{entry.title}</div>
                        <div className="mt-1 text-sm leading-6 text-slate-600">
                          {entry.originLabel || "Sin origen"} {"->"}{" "}
                          {entry.destinationLabel || "Sin destino"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {mode === "visual" ? (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <AdminToggleGroup
                      value={semanticScope}
                      onChange={handleSemanticScopeChange}
                      options={MAP_SEMANTIC_SCOPE_OPTIONS}
                    />

                    <AdminInlineNote>
                      {MAP_SEMANTIC_SCOPE_META[semanticScope].description}
                    </AdminInlineNote>

                    {semanticDraft ? (
                      <div className="rounded-[22px] border border-[#d9e4d3] bg-[#fbfcfa] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-11 w-11 items-center justify-center rounded-full border bg-white"
                              style={{
                                borderColor: semanticDraft.color || "#d9e4d3",
                                color: semanticDraft.color || "#1f2937",
                              }}
                            >
                              {renderSemanticIconPreview(
                                semanticDraft.icon,
                                semanticDraft.label || "Preview",
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-slate-950">
                                {semanticDraft.label || "Sin label"}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {normalizeMapSemanticCode(semanticDraft.code) || "sin_code"}
                                {" · "}
                                {semanticDraft.enabled ? "visible" : "oculto"}
                                {semanticScope !== "lenses"
                                  ? ` · ${semanticUsageCount} uso(s)`
                                  : ""}
                              </div>
                            </div>
                          </div>
                          {MAP_SEMANTIC_SCOPE_META[semanticScope].allowCreate ? (
                            <button
                              type="button"
                              className="rounded-[16px] border border-[#d9e4d3] bg-white px-3 py-2 text-sm"
                              onClick={beginNewSemanticDraft}
                            >
                              Nuevo
                            </button>
                          ) : null}
                        </div>

                        <div className="mt-4 grid gap-2">
                          {semanticItems.map((item) => {
                            const active = selectedSemanticCode === item.code;
                            return (
                              <button
                                key={`${item.catalogKey}-${item.code}`}
                                type="button"
                                className={`flex items-center justify-between gap-3 rounded-[18px] border px-3 py-3 text-left ${
                                  active
                                    ? "border-[#9bb990] bg-[#eef8e8]"
                                    : "border-[#d9e4d3] bg-white"
                                }`}
                                onClick={() => handleSemanticItemSelect(item)}
                              >
                                <div className="flex min-w-0 items-center gap-3">
                                  <div
                                    className="flex h-9 w-9 items-center justify-center rounded-full border bg-white"
                                    style={{
                                      borderColor: item.color || "#d9e4d3",
                                      color: item.color || "#1f2937",
                                    }}
                                  >
                                    {renderSemanticIconPreview(item.icon, item.label)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-medium text-slate-950">
                                      {item.label}
                                    </div>
                                    <div className="truncate text-xs text-slate-500">
                                      {item.code}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-xs text-slate-500">
                                  {item.enabled ? "on" : "off"}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        <div className="mt-4 space-y-3">
                          <div className="grid gap-3 md:grid-cols-2">
                            <input
                              className={inputClassName}
                              value={semanticDraft.code}
                              onChange={(event) =>
                                setSemanticDraft((current) =>
                                  current ? { ...current, code: event.target.value } : current,
                                )
                              }
                              placeholder="code"
                              disabled={semanticScope === "lenses"}
                            />
                            <input
                              className={inputClassName}
                              value={semanticDraft.label}
                              onChange={(event) =>
                                setSemanticDraft((current) =>
                                  current ? { ...current, label: event.target.value } : current,
                                )
                              }
                              placeholder="Label visible"
                            />
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <input
                              className={inputClassName}
                              value={semanticDraft.icon}
                              onChange={(event) =>
                                setSemanticDraft((current) =>
                                  current ? { ...current, icon: event.target.value } : current,
                                )
                              }
                              placeholder={
                                semanticScope === "types"
                                  ? "Emoji, glifo o /asset.svg"
                                  : "Emoji o glifo"
                              }
                            />
                            <input
                              className={inputClassName}
                              value={semanticDraft.color}
                              onChange={(event) =>
                                setSemanticDraft((current) =>
                                  current ? { ...current, color: event.target.value } : current,
                                )
                              }
                              placeholder="#2f5f44"
                            />
                          </div>
                          <textarea
                            className={textareaClassName}
                            value={semanticDraft.description}
                            onChange={(event) =>
                              setSemanticDraft((current) =>
                                current ? { ...current, description: event.target.value } : current,
                              )
                            }
                            placeholder="Descripción editorial o funcional"
                          />
                          <div className="grid gap-3 md:grid-cols-2">
                            <input
                              className={inputClassName}
                              value={semanticDraft.sortOrder}
                              onChange={(event) =>
                                setSemanticDraft((current) =>
                                  current ? { ...current, sortOrder: event.target.value } : current,
                                )
                              }
                              placeholder="Orden"
                            />
                            {semanticScope === "lenses" ? (
                              <select
                                className={inputClassName}
                                value={semanticDraft.group}
                                onChange={(event) =>
                                  setSemanticDraft((current) =>
                                    current
                                      ? {
                                          ...current,
                                          group:
                                            event.target.value === "secondary"
                                              ? "secondary"
                                              : "primary",
                                        }
                                      : current,
                                  )
                                }
                              >
                                <option value="primary">Primary</option>
                                <option value="secondary">Secondary</option>
                              </select>
                            ) : (
                              <label className="flex items-center gap-3 rounded-[18px] border border-[#d9e4d3] bg-[#fbfcfa] px-3 py-2.5 text-sm text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={semanticDraft.enabled}
                                  onChange={(event) =>
                                    setSemanticDraft((current) =>
                                      current ? { ...current, enabled: event.target.checked } : current,
                                    )
                                  }
                                />
                                Visible en runtime
                              </label>
                            )}
                          </div>
                          {semanticScope === "lenses" ? (
                            <label className="flex items-center gap-3 rounded-[18px] border border-[#d9e4d3] bg-[#fbfcfa] px-3 py-2.5 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                checked={semanticDraft.enabled}
                                onChange={(event) =>
                                  setSemanticDraft((current) =>
                                    current ? { ...current, enabled: event.target.checked } : current,
                                  )
                                }
                              />
                              Visible en runtime
                            </label>
                          ) : null}
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="rounded-[18px] bg-[#1f3c2f] px-4 py-2 text-sm text-white disabled:opacity-60"
                              disabled={savingTone === "semantic"}
                              onClick={() => void saveSemanticDraft()}
                            >
                              {savingTone === "semantic" ? "Guardando..." : "Guardar sistema"}
                            </button>
                            <button
                              type="button"
                              className="rounded-[18px] border border-[#e7c8c4] bg-[#fff5f4] px-4 py-2 text-sm text-[#7a3e36] disabled:opacity-60"
                              disabled={savingTone === "semantic" || selectedSemanticItem?.source !== "catalog"}
                              onClick={() => void deleteSelectedSemanticItem()}
                            >
                              Borrar item
                            </button>
                            <div className="rounded-[18px] border border-[#d9e4d3] bg-white px-3 py-2 text-xs text-slate-500">
                              {semanticScope === "types"
                                ? "El mapa ya admite glifo o asset de pin por tipo."
                                : semanticScope === "states"
                                  ? "Los estados nuevos pasan a ser validos también para los lugares."
                                  : "Las lentes editan presentación, orden y visibilidad del mapa real."}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <AdminInlineNote>
                        Cargando la semantica visual del mapa...
                      </AdminInlineNote>
                    )}
                  </div>

                  <div className="space-y-3 rounded-[22px] border border-[#d9e4d3] bg-[#fbfcfa] p-4">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-[#61755c]">
                        Regla del admin global
                      </div>
                      <div className="mt-1 text-sm leading-6 text-slate-600">
                        Esta pantalla publica semantica global. No sirve para guardar excepciones por jardin, ruta o lugar concreto.
                      </div>
                    </div>

                    <AdminInlineNote>
                      {selectedPlace || selectedRoute || selectedZone
                        ? "La selección actual solo sirve para comparar el preview. Lo que se pública de verdad se guarda arriba, en la capa de sistema."
                        : "Selecciona un pin, una ruta o una zona si quieres comparar como responde el sistema global en la escena demo."}
                    </AdminInlineNote>
                  </div>
                </div>
              ) : null}

              {mode === "validation" ? (
                <div className="space-y-3">
                  <AdminInlineNote>
                    Las incidencias se abren directamente sobre el problema.
                  </AdminInlineNote>
                  {visibleValidationIssues.map((issue) => (
                    <button
                      key={issue.id}
                      type="button"
                      className={`w-full rounded-[18px] border p-4 text-left ${
                        issue.tone === "error"
                          ? "border-[#e7c8c4] bg-[#fff5f4]"
                          : issue.tone === "warning"
                            ? "border-[#eadfc1] bg-[#fffaf0]"
                            : "border-[#d9e4d3] bg-[#fbfcfa]"
                      }`}
                      onClick={() => openIssue(issue)}
                    >
                      <div className="text-sm font-medium text-slate-950">{issue.title}</div>
                      <div className="mt-1 text-sm leading-6 text-slate-600">{issue.detail}</div>
                    </button>
                  ))}
                </div>
              ) : null}

              {mode === "advanced" ? (
                <div className="space-y-3">
                  <AdminInlineNote tone="warning">
                    Lo tecnico vive aqui; lo frecuente ya deberia resolverse en la capa principal.
                  </AdminInlineNote>
                  {selectedPlace && placeForm ? (
                    <>
                      <input
                        className={inputClassName}
                        value={placeForm.tagsText}
                        onChange={(event) =>
                          setPlaceForm((current) =>
                            current ? { ...current, tagsText: event.target.value } : current,
                          )
                        }
                        placeholder="Tags"
                      />
                      <textarea
                        className={textareaClassName}
                        value={placeForm.metadataText}
                        onChange={(event) =>
                          setPlaceForm((current) =>
                            current ? { ...current, metadataText: event.target.value } : current,
                          )
                        }
                        placeholder="Metadata JSON"
                      />
                      <button
                        type="button"
                        className="rounded-[18px] bg-[#1f3c2f] px-4 py-2 text-sm text-white"
                        onClick={() => void saveSelectedPlace()}
                      >
                        Guardar avanzado
                      </button>
                    </>
                  ) : null}
                  {selectedRoute && routeForm ? (
                    <>
                      <input
                        className={inputClassName}
                        value={routeForm.tagsText}
                        onChange={(event) =>
                          setRouteForm((current) =>
                            current ? { ...current, tagsText: event.target.value } : current,
                          )
                        }
                        placeholder="Tags"
                      />
                      <textarea
                        className={textareaClassName}
                        value={routeForm.metadataText}
                        onChange={(event) =>
                          setRouteForm((current) =>
                            current ? { ...current, metadataText: event.target.value } : current,
                          )
                        }
                        placeholder="Metadata JSON"
                      />
                      <button
                        type="button"
                        className="rounded-[18px] bg-[#1f3c2f] px-4 py-2 text-sm text-white"
                        onClick={() => void saveSelectedRoute()}
                      >
                        Guardar avanzado
                      </button>
                    </>
                  ) : null}
                  {selectedZone && zoneForm ? (
                    <>
                      <input
                        className={inputClassName}
                        value={zoneForm.title}
                        onChange={(event) =>
                          setZoneForm((current) =>
                            current ? { ...current, title: event.target.value } : current,
                          )
                        }
                        placeholder="Título de zona"
                      />
                      <textarea
                        className={textareaClassName}
                        value={zoneForm.metadataText}
                        onChange={(event) =>
                          setZoneForm((current) =>
                            current ? { ...current, metadataText: event.target.value } : current,
                          )
                        }
                        placeholder="Metadata JSON"
                      />
                      <button
                        type="button"
                        className="rounded-[18px] bg-[#1f3c2f] px-4 py-2 text-sm text-white"
                        onClick={() => void saveSelectedZone()}
                      >
                        Guardar zona
                      </button>
                    </>
                  ) : (
                    <div className="space-y-2">
                      {mapZones.slice(0, 5).map((zone) => (
                        <button
                          key={zone.id}
                          type="button"
                          className="w-full rounded-[18px] border border-[#d9e4d3] bg-[#fbfcfa] p-3 text-left"
                          onClick={() => handleZoneSelect(zone)}
                        >
                          <div className="text-sm font-medium text-slate-950">{zone.title}</div>
                          <div className="mt-1 text-sm leading-6 text-slate-600">
                            {zone.subtitle || zone.description || "Zona simbólica"}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
        </ImmersiveOverlayCard>
        ) : null}

        {showControlPanel && mode === "advanced" ? (
          <ImmersiveOverlayCard
            title="Raw actual"
            description="Lectura técnica de la selección activa sin convertirla en flujo principal."
            className="bottom-6 right-6 w-[min(360px,calc(100vw-2rem))] max-h-[calc(100dvh-248px)]"
            contentClassName="max-h-[calc(100dvh-340px)] overflow-auto pr-1"
            style={{ transform: `translate(${overlayOffsets.raw.x}px, ${overlayOffsets.raw.y}px)` }}
            onHeaderPointerDown={(event) => startOverlayPanelDrag("raw", event)}
          >
                <div className="space-y-3 text-sm leading-6 text-slate-600">
                  {selectedPlace ? (
                    <AdminInlineNote>
                      source_page_id: {selectedPlace.links.pageId ?? "null"} · source_seed_id:{" "}
                      {selectedPlace.links.seedId ?? "null"} · updated_at: {selectedPlace.updatedAt}
                    </AdminInlineNote>
                  ) : null}
                  {selectedRoute ? (
                    <AdminInlineNote>
                      Distancia: {compactDistanceLabel(selectedRoute.distanceMeters)} · Duracion:{" "}
                      {compactDurationLabel(selectedRoute.durationSeconds)} · updated_at:{" "}
                      {selectedRoute.updatedAt}
                    </AdminInlineNote>
                  ) : null}
                  {selectedZone ? (
                    <AdminInlineNote>
                      Centro:{" "}
                      {selectedZone.centroidLat != null && selectedZone.centroidLng != null
                        ? `${selectedZone.centroidLat.toFixed(4)}, ${selectedZone.centroidLng.toFixed(4)}`
                        : "sin centro"}{" "}
                      · updated_at: {selectedZone.updatedAt}
                    </AdminInlineNote>
                  ) : null}
                </div>
          </ImmersiveOverlayCard>
        ) : null}
      </div>
    </div>
  );
}
