"use client";

import { useState, type PointerEvent as ReactPointerEvent } from "react";
import type { MapPlaceKind, MapRouteRecord } from "@/lib/mapDomainTypes";
import {
  buildDirectionsUrl,
  buildPointSearchLabel,
  formatRouteDistance,
  formatRouteDuration,
  type MapLensId,
  type RoutePreview,
  type SearchEntry,
} from "@/lib/homeMapExperience";
import type {
  MapHighlightedPlace,
  MapHighlightedRoute,
  MapHighlightedZone,
  MapPointItem,
} from "@/lib/homeMapTypes";
import { getSeasonLabel } from "@/lib/narrativeTaxonomy";
import type { HomeSeasonTone } from "@/lib/homePageUtils";
import {
  FLOWER_FAMILY_LABELS,
  type FlowerFamily,
} from "@/lib/productDomainContracts";
import {
  getFallbackMapRuntimeConfig,
  resolveMapPlaceKindLabel,
  resolveMapPlaceStateLabel,
  type MapRuntimeConfig,
} from "@/lib/mapCatalogConfig";

type MapScope = "selected_year" | "all_years";
type SheetMode = "peek" | "half" | "full";
type PlaceSaveMode = "saved" | "favorite" | "wishlist" | "visited";
type SavedCollectionFilter = "all" | "favorites" | "restaurants" | "wishlist" | "visited";

function getPlaceStateLabel(
  state: PlaceSaveMode,
  sourceType: "memory" | "place" | "geocode",
  mapConfig: MapRuntimeConfig,
) {
  if (state === "saved") {
    return sourceType === "place" ? "Normal" : "Guardar";
  }
  return resolveMapPlaceStateLabel(state, mapConfig) ?? "Estado";
}

function formatDraftCoordinate(value: { lat: number; lng: number } | null) {
  if (!value) return "Sin fijar";
  return `${value.lat.toFixed(4)}, ${value.lng.toFixed(4)}`;
}

function getRouteTravelModeLabel(value: MapRouteRecord["travelMode"]) {
  switch (value) {
    case "walking":
      return "A pie";
    case "driving":
      return "Coche";
    case "cycling":
      return "Bici";
    case "transit":
      return "Transporte";
    case "mixed":
      return "Mixto";
    default:
      return value;
  }
}

function getRouteKindLabel(value: MapRouteRecord["kind"]) {
  switch (value) {
    case "walk":
      return "Paseo";
    case "drive":
      return "Ruta en coche";
    case "date_route":
      return "Ruta de cita";
    case "trip":
      return "Escapada";
    case "ritual":
      return "Ritual";
    case "custom":
    default:
      return "Ruta";
  }
}

type RouteEditorDraft = {
  title: string;
  subtitle: string;
  notes: string;
  kind: string;
  status: string;
  travelMode: string;
};

function buildRouteEditorDraft(route: MapHighlightedRoute | null): RouteEditorDraft {
  return {
    title: route?.title ?? "",
    subtitle: route?.subtitle ?? "",
    notes: route?.notes ?? "",
    kind: route?.kind ?? "custom",
    status: route?.status ?? "saved",
    travelMode: route?.travelMode ?? "driving",
  };
}

function getHighlightedPlaceContextKey(place: MapHighlightedPlace | null) {
  if (!place) return null;
  if (place.placeId) return `place:${place.placeId}`;
  return `${place.sourceType}:${place.lat}:${place.lng}`;
}

export default function ImmersiveMapBottomSheet({
  currentYearLabel,
  activeLens,
  authoringMode,
  mapConfig = getFallbackMapRuntimeConfig(),
  draftCoordinatesCount,
  draftTitle,
  draftPlaceSelection,
  draftPlaceLookupLoading,
  hasActiveMapFilters,
  highlightedPlace,
  highlightedRoute,
  highlightedZone,
  lensDescription,
  lensLabel,
  lensMemoriesCount,
  mapFlowerFamilyFilter,
  mapFlowerFamilyOptions,
  mapOnlyFavorites,
  mapScope,
  mapSeasonFilter,
  mergedSearchEntries,
  onDraftTitleChange,
  onStartPlaceDraft,
  onStartRouteDraft,
  routePlacementTarget,
  draftRouteOrigin,
  draftRouteDestination,
  onSelectDraftOrigin,
  onSelectDraftDestination,
  onUseMyLocationAsDraftOrigin,
  onSwapDraftRoute,
  onMapFlowerFamilyFilterChange,
  onSaveDraftEntity,
  onUndoDraftPoint,
  onCancelDraft,
  onLensChange,
  savedCollectionFilter,
  savedCollectionCounts,
  onSavedCollectionFilterChange,
  onMapScopeChange,
  onMapSeasonFilterChange,
  onResetFilters,
  onRequestLocation,
  onSaveCurrentPlace,
  selectionMode,
  onPickCurrentPlace,
  selectedPlaceKind,
  selectedPlaceState,
  onPlaceKindChange,
  onSaveCurrentRoute,
  onCreateSymbolicZone,
  onRouteSuggestionSelect,
  onUpdateCurrentRoute,
  onArchiveCurrentRoute,
  onUpdateCurrentZone,
  onArchiveCurrentZone,
  placeActionError,
  placeActionNotice,
  placeActionSaving,
  onSearchEntrySelect,
  onSheetPointerDown,
  onSheetPointerMove,
  onSheetPointerUp,
  onSheetPointerCancel,
  onToggleOnlyFavorites,
  query,
  routeError,
  routeLoading,
  routePreview,
  searchError,
  searchLoading,
  selectedPoint,
  sheetMode,
  sheetDragOffset = 0,
  isSheetDragging = false,
  suggestionPoints,
  visibleRouteCount,
  visibleZoneCount,
  routeSuggestions,
}: {
  currentYearLabel: string;
  activeLens: MapLensId;
  authoringMode: "none" | "route" | "zone" | "place";
  mapConfig?: MapRuntimeConfig;
  draftCoordinatesCount: number;
  draftTitle: string;
  draftPlaceSelection?: {
    lat: number;
    lng: number;
    label: string;
    subtitle: string | null;
  } | null;
  draftPlaceLookupLoading?: boolean;
  hasActiveMapFilters: boolean;
  highlightedPlace: MapHighlightedPlace | null;
  highlightedRoute: MapHighlightedRoute | null;
  highlightedZone: MapHighlightedZone | null;
  lensDescription: string;
  lensLabel: string;
  lensMemoriesCount: number;
  mapFlowerFamilyFilter: FlowerFamily | "all";
  mapFlowerFamilyOptions: FlowerFamily[];
  mapOnlyFavorites: boolean;
  mapScope: MapScope;
  mapSeasonFilter: HomeSeasonTone | "all";
  mergedSearchEntries: SearchEntry[];
  onDraftTitleChange: (value: string) => void;
  onStartPlaceDraft?: () => void;
  onStartRouteDraft?: () => void;
  routePlacementTarget?: "origin" | "destination";
  draftRouteOrigin?: { lat: number; lng: number } | null;
  draftRouteDestination?: { lat: number; lng: number } | null;
  onSelectDraftOrigin?: () => void;
  onSelectDraftDestination?: () => void;
  onUseMyLocationAsDraftOrigin?: () => void;
  onSwapDraftRoute?: () => void;
  onMapFlowerFamilyFilterChange: (value: FlowerFamily | "all") => void;
  onSaveDraftEntity?: () => void | Promise<void>;
  onUndoDraftPoint?: () => void;
  onCancelDraft?: () => void;
  onLensChange: (lens: MapLensId) => void;
  savedCollectionFilter: SavedCollectionFilter;
  savedCollectionCounts: Record<SavedCollectionFilter, number>;
  onSavedCollectionFilterChange: (value: SavedCollectionFilter) => void;
  onMapScopeChange: (scope: MapScope) => void;
  onMapSeasonFilterChange: (value: HomeSeasonTone | "all") => void;
  onResetFilters: () => void;
  onRequestLocation?: () => void;
  onSaveCurrentPlace?: (mode: PlaceSaveMode) => void;
  selectionMode?: "seed_place" | "ritual_place" | null;
  onPickCurrentPlace?: () => void;
  selectedPlaceKind: MapPlaceKind;
  selectedPlaceState: PlaceSaveMode;
  onPlaceKindChange?: (kind: MapPlaceKind) => void;
  onSaveCurrentRoute?: () => void;
  onCreateSymbolicZone?: () => void;
  onRouteSuggestionSelect?: (routeId: string) => void;
  onUpdateCurrentRoute?: (input: {
    title: string;
    subtitle: string | null;
    notes: string | null;
    kind: string;
    status: string;
    travelMode: string;
  }) => void | Promise<void>;
  onArchiveCurrentRoute?: () => void | Promise<void>;
  onUpdateCurrentZone?: (input: {
    title: string;
    subtitle: string | null;
    description: string | null;
    kind: string;
    status: string;
  }) => void | Promise<void>;
  onArchiveCurrentZone?: () => void | Promise<void>;
  placeActionError?: string | null;
  placeActionNotice?: string | null;
  placeActionSaving?: boolean;
  onSearchEntrySelect: (entry: SearchEntry) => void;
  onSheetPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onSheetPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onSheetPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onSheetPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onToggleOnlyFavorites: () => void;
  query: string;
  routeError: string | null;
  routeLoading: boolean;
  routePreview: RoutePreview | null;
  searchError: string | null;
  searchLoading: boolean;
  selectedPoint: MapPointItem | null;
  sheetMode: SheetMode;
  sheetDragOffset?: number;
  isSheetDragging?: boolean;
  suggestionPoints: MapPointItem[];
  visibleRouteCount: number;
  visibleZoneCount: number;
  routeSuggestions: MapRouteRecord[];
}) {
  const sheetTransform =
    sheetMode === "peek"
      ? "translateY(calc(100% - 96px))"
      : sheetMode === "half"
        ? "translateY(calc(100% - min(300px, 46vh)))"
        : "translateY(0)";

  const showSearchResults = query.trim().length >= 2;
  const placeKindOptions = mapConfig.placeKinds.map((item) => ({
    value: item.code as MapPlaceKind,
    label: item.label,
  }));
  const placeStateOptions = mapConfig.placeStates
    .filter((item) => item.code !== "archived")
    .map((item) => ({
      value: item.code as PlaceSaveMode,
      label: item.code === "saved" ? "Normal" : item.label,
    }));
  const effectivePlaceKind = selectedPlaceKind ?? highlightedPlace?.placeKind ?? "spot";
  const effectivePlaceState = selectedPlaceState ?? highlightedPlace?.placeState ?? "saved";
  const isPlacePicker = selectionMode === "seed_place" || selectionMode === "ritual_place";
  const pickerLabel = selectionMode === "ritual_place" ? "ritual" : "semilla";

  const legacyHeaderCountLabel =
    lensLabel === "Rutas"
      ? `${visibleRouteCount} ruta(s)`
      : lensLabel === "Zonas simbólicas"
        ? `${visibleZoneCount} zona(s)`
        : `${lensMemoriesCount} lugar(es)`;
  const headerCountLabel =
    activeLens === "routes"
      ? `${visibleRouteCount} ruta(s)`
      : activeLens === "symbolic"
        ? `${visibleZoneCount} zona(s)`
        : activeLens === "lived"
          ? `${lensMemoriesCount} recuerdo(s)`
          : activeLens === "saved"
            ? `${lensMemoriesCount} lugar(es)`
            : "Vista mixta";
  const [routeEditorState, setRouteEditorState] = useState<{
    routeId: string | null;
    open: boolean;
    draft: RouteEditorDraft;
  }>({
    routeId: null,
    open: false,
    draft: buildRouteEditorDraft(null),
  });
  const [showMapControlsState, setShowMapControlsState] = useState(false);
  const [showPlaceOrganizerState, setShowPlaceOrganizerState] = useState<{
    contextKey: string | null;
    open: boolean;
  }>({
    contextKey: null,
    open: false,
  });
  const isAuthoring = authoringMode !== "none";
  const isAuthoringRoute = authoringMode === "route";
  const isAuthoringPlace = authoringMode === "place";
  const activeRouteId = highlightedRoute?.id ?? null;
  const routeEditOpen =
    activeRouteId != null &&
    routeEditorState.routeId === activeRouteId &&
    routeEditorState.open;
  const routeDraft =
    activeRouteId != null && routeEditorState.routeId === activeRouteId
      ? routeEditorState.draft
      : buildRouteEditorDraft(highlightedRoute);
  const showMapControls =
    showMapControlsState &&
    !highlightedPlace &&
    !highlightedRoute &&
    !isAuthoring &&
    sheetMode !== "peek";
  const activePlaceOrganizerKey = getHighlightedPlaceContextKey(highlightedPlace);
  const showPlaceOrganizer =
    activePlaceOrganizerKey != null &&
    showPlaceOrganizerState.contextKey === activePlaceOrganizerKey &&
    showPlaceOrganizerState.open;
  const routeProgressLabel = `${Math.min(draftCoordinatesCount, 2)}/2 puntos`;
  const placeProgressLabel = `${Math.min(draftCoordinatesCount, 1)}/1 punto`;
  const routeStepCopy = !draftRouteOrigin
    ? "Toca el mapa para fijar el origen."
    : !draftRouteDestination
      ? "Ahora toca el mapa para fijar el destino."
      : routePlacementTarget === "origin"
        ? "Toca el mapa para recolocar el origen."
        : "Toca el mapa para recolocar el destino.";
  const showDiscoverySection =
    sheetMode === "full" || (!highlightedPlace && !highlightedRoute && authoringMode === "none");
  const legacyEmptySuggestionsCopy =
    activeLens === "routes"
      ? "Todavía no hay rutas guardadas para esta vista."
      : activeLens === "saved"
        ? "Aún no hay lugares guardados para esta combinaci?n de filtros."
        : "No hay lugares que encajen con esta vista todav?a.";
  const legacyPeekCopy =
    activeLens === "routes"
      ? "Desliza hacia arriba para ver rutas guardadas y crear una nueva."
      : activeLens === "saved"
        ? "Desliza hacia arriba para organizar guardados, favoritos, restaurantes y lugares por visitar."
        : "Desliza hacia arriba para buscar, filtrar y guardar lugares de vuestra historia.";
  const highlightedPlaceToneLabel =
    highlightedPlace?.sourceType === "memory"
      ? "Recuerdo vivido"
      : highlightedPlace?.sourceType === "place"
        ? effectivePlaceState === "favorite"
          ? effectivePlaceKind === "restaurant" || effectivePlaceKind === "cafe"
            ? "Restaurante favorito"
            : "Lugar favorito"
          : effectivePlaceState === "wishlist"
            ? "Por visitar"
            : effectivePlaceState === "visited"
              ? "Lugar visitado"
          : effectivePlaceKind === "restaurant" || effectivePlaceKind === "cafe"
            ? "Restaurante guardado"
            : "En guardados"
        : null;
  const placeSubtitle =
    highlightedPlace?.subtitle &&
    highlightedPlace.subtitle.trim() !== highlightedPlace.label.trim()
      ? highlightedPlace.subtitle
      : null;
  const savedCollectionLabel =
    activeLens === "saved" && savedCollectionFilter !== "all"
      ? savedCollectionFilter === "favorites"
        ? "Favoritos"
        : savedCollectionFilter === "restaurants"
          ? "Restaurantes"
          : savedCollectionFilter === "wishlist"
            ? "Por visitar"
            : "Visitados"
      : null;
  const baseScopeLabel =
    mapScope === "selected_year" ? `Año ${currentYearLabel}` : "Toda la historia";
  const refinementSummary = [
    mapScope === "all_years" ? "Toda la historia" : null,
    mapOnlyFavorites ? "Solo favoritos" : null,
    mapSeasonFilter !== "all" ? getSeasonLabel(mapSeasonFilter) : null,
    mapFlowerFamilyFilter !== "all"
      ? FLOWER_FAMILY_LABELS[mapFlowerFamilyFilter]
      : null,
    savedCollectionLabel,
  ].filter(Boolean) as string[];
  const legacyDiscoveryTitle = showSearchResults
    ? "Resultados"
    : isPlacePicker
      ? "Buscar, elegir o marcar"
      : activeLens === "saved"
        ? "Lugares guardados"
        : activeLens === "routes"
          ? "Rutas guardadas"
      : "Buscar y descubrir";
  const legacySavedCollectionDescription =
    savedCollectionFilter === "favorites"
      ? "Tus lugares más queridos y repetibles."
      : savedCollectionFilter === "restaurants"
        ? "Comida, cafés y cenas que queréis repetir."
        : savedCollectionFilter === "wishlist"
          ? "Sitios pendientes para vivir juntos."
          : savedCollectionFilter === "visited"
            ? "Lugares ya visitados que siguen formando parte del mapa."
            : "Todos los lugares que habéis guardado para volver, cuidar o recordar.";
  const emptySuggestionsCopy =
    activeLens === "routes"
      ? "Todavía no hay rutas guardadas para esta vista."
      : activeLens === "saved"
        ? "Aún no hay lugares guardados para esta combinación de filtros."
        : activeLens === "lived"
          ? "Todavía no hay recuerdos con ubicación para esta vista."
          : activeLens === "symbolic"
            ? "Todavía no hay zonas simbólicas para esta vista."
            : "No hay lugares que encajen con esta vista todavía.";
  const peekCopy =
    activeLens === "routes"
      ? "Desliza hacia arriba para ver rutas guardadas y crear una nueva."
      : activeLens === "saved"
        ? "Desliza hacia arriba para organizar lugares guardados, favoritos, pendientes y visitados."
        : activeLens === "lived"
          ? "Desliza hacia arriba para recorrer las flores y recuerdos que ya tienen lugar en el mapa."
          : activeLens === "symbolic"
            ? "Desliza hacia arriba para revisar las zonas simbólicas y el mapa emocional del jardín."
            : "Desliza hacia arriba para mezclar recuerdos vividos, lugares guardados, rutas y zonas.";
  const discoveryTitle = showSearchResults
    ? "Resultados"
    : isPlacePicker
      ? "Buscar, elegir o marcar"
      : activeLens === "saved"
        ? "Lugares guardados"
        : activeLens === "lived"
          ? "Recuerdos en el mapa"
          : activeLens === "routes"
            ? "Rutas guardadas"
            : activeLens === "symbolic"
              ? "Zonas del jardín"
              : "Explorar el mapa";
  const savedCollectionDescription =
    savedCollectionFilter === "favorites"
      ? "Lugares guardados que habéis marcado como especialmente vuestros."
      : savedCollectionFilter === "restaurants"
        ? "Comida, cafés y cenas que merece la pena repetir."
        : savedCollectionFilter === "wishlist"
          ? "Sitios pendientes para vivir cuando toque."
          : savedCollectionFilter === "visited"
            ? "Lugares ya visitados que siguen vivos en el mapa."
            : "Todos los lugares que habéis guardado para volver, cuidar o recordar.";
  const showQuickStartCard =
    !showSearchResults &&
    !isPlacePicker &&
    activeLens === "explore" &&
    !highlightedPlace &&
    !highlightedRoute &&
    !highlightedZone &&
    authoringMode === "none";

  function toggleRouteEditor() {
    if (!highlightedRoute) return;
    setRouteEditorState((current) => {
      const isCurrentRoute = current.routeId === highlightedRoute.id;
      return {
        routeId: highlightedRoute.id,
        open: !(isCurrentRoute && current.open),
        draft: isCurrentRoute ? current.draft : buildRouteEditorDraft(highlightedRoute),
      };
    });
  }

  function updateRouteDraft(
    updater: (currentDraft: RouteEditorDraft) => RouteEditorDraft,
  ) {
    if (!highlightedRoute) return;
    setRouteEditorState((current) => {
      const currentDraft =
        current.routeId === highlightedRoute.id
          ? current.draft
          : buildRouteEditorDraft(highlightedRoute);
      return {
        routeId: highlightedRoute.id,
        open: true,
        draft: updater(currentDraft),
      };
    });
  }

  function closeRouteEditor() {
    if (!highlightedRoute) return;
    setRouteEditorState((current) =>
      current.routeId === highlightedRoute.id ? { ...current, open: false } : current,
    );
  }

  function toggleMapControls() {
    if (highlightedPlace || highlightedRoute || isAuthoring || sheetMode === "peek") {
      return;
    }
    setShowMapControlsState((current) => !current);
  }

  function togglePlaceOrganizer() {
    if (!activePlaceOrganizerKey) return;
    setShowPlaceOrganizerState((current) => ({
      contextKey: activePlaceOrganizerKey,
      open: current.contextKey === activePlaceOrganizerKey ? !current.open : true,
    }));
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[3900] px-3 sm:px-4"
      style={{
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
      }}
    >
      <div
        className={`pointer-events-auto mx-auto flex h-[min(66vh,560px)] max-w-3xl flex-col rounded-t-[28px] rounded-b-[22px] border backdrop-blur-xl will-change-transform ${
          isSheetDragging
            ? "transition-none"
            : "transition-transform duration-150 ease-out"
        }`}
        style={{
          transform: `${sheetTransform} translateY(${sheetDragOffset}px)`,
          borderColor: "var(--lv-border)",
          background: "color-mix(in srgb, var(--lv-surface) 95%, transparent)",
          boxShadow: "0 -12px 40px color-mix(in srgb, var(--lv-map-chrome-shadow) 72%, transparent)",
        }}
      >
        <div
          className="cursor-grab touch-none px-4 pt-3 active:cursor-grabbing"
          onPointerDown={onSheetPointerDown}
          onPointerMove={onSheetPointerMove}
          onPointerUp={onSheetPointerUp}
          onPointerCancel={onSheetPointerCancel}
        >
          <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-[var(--lv-border)]" />
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-[var(--lv-text)]">{lensLabel}</div>
              {sheetMode !== "peek" ? (
                <div className="text-[11px] text-[var(--lv-text-muted)]">{lensDescription}</div>
              ) : null}
            </div>
            <div className="rounded-full border bg-[var(--lv-surface-soft)] px-3 py-1.5 text-xs font-medium text-[var(--lv-text)]">
              {headerCountLabel}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto overscroll-contain px-4 pb-4">
          {sheetMode === "peek" ? (
            <div className="rounded-[20px] border bg-[var(--lv-surface-soft)] px-4 py-3 text-sm text-[var(--lv-text-muted)]">
              {peekCopy}
            </div>
          ) : (
            <div className="space-y-3">
              {authoringMode !== "none" ? (
                <div
                  className={`rounded-[22px] border p-3 ${
                    authoringMode === "zone"
                      ? "bg-[var(--lv-primary-soft)]"
                      : authoringMode === "place"
                        ? "bg-[var(--lv-warning-soft)]"
                        : "bg-[var(--lv-surface-soft)]"
                  }`}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
                    {authoringMode === "route"
                      ? "Nueva ruta"
                      : authoringMode === "zone"
                        ? "Nueva zona"
                        : "Nuevo lugar"}
                  </div>
                  <div className="mt-2 text-sm text-[var(--lv-text-muted)]">
                    {authoringMode === "route"
                      ? "Elige origen o destino y después toca directamente el mapa."
                      : authoringMode === "zone"
                        ? "Mueve o acerca el mapa y añade vértices para dibujar el contorno."
                        : "Toca directamente el mapa para fijar el lugar del plan, aunque no exista todav?a."}
                  </div>
                  {isAuthoringRoute ? (
                    <div className="mt-2 rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2 text-xs text-[var(--lv-text-muted)]">
                      <span className="font-semibold text-[var(--lv-primary-strong)]">
                        {routeStepCopy}
                      </span>
                    </div>
                  ) : null}
                  {isAuthoringRoute ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div
                        className={`rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-3 ${
                          routePlacementTarget === "origin"
                            ? "ring-2 ring-[var(--lv-primary)]"
                            : ""
                        }`}
                      >
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
                          Origen
                        </div>
                        <div className="mt-1 text-sm font-medium text-[var(--lv-text)]">
                          {formatDraftCoordinate(draftRouteOrigin ?? null)}
                        </div>
                      </div>
                      <div
                        className={`rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-3 ${
                          routePlacementTarget === "destination"
                            ? "ring-2 ring-[var(--lv-info)]"
                            : ""
                        }`}
                      >
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
                          Destino
                        </div>
                        <div className="mt-1 text-sm font-medium text-[var(--lv-text)]">
                          {formatDraftCoordinate(draftRouteDestination ?? null)}
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {isAuthoringPlace ? (
                    <div className="mt-3 rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
                            Punto elegido
                          </div>
                          <div className="mt-1 text-sm font-medium text-[var(--lv-text)]">
                            {draftPlaceSelection?.label ?? "Aún no has marcado ningún punto"}
                          </div>
                          <div className="mt-1 text-xs text-[var(--lv-text-muted)]">
                            {draftPlaceSelection?.subtitle ??
                              "Cuando toques el mapa, guardaremos este lugar para usarlo en la semilla."}
                          </div>
                        </div>
                        <div className="rounded-full border border-[var(--lv-warning)] bg-[var(--lv-warning-soft)] px-3 py-2 text-xs text-[var(--lv-warning)]">
                          {placeProgressLabel}
                        </div>
                      </div>
                      {draftPlaceLookupLoading ? (
                        <div className="mt-3 rounded-full border border-[var(--lv-warning)] bg-[var(--lv-warning-soft)] px-3 py-2 text-xs text-[var(--lv-warning)]">
                          Buscando una referencia cercana para nombrar el lugar...
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <input
                        className="lv-input w-full"
                        value={draftTitle}
                        onChange={(event) => onDraftTitleChange(event.target.value)}
                        placeholder={authoringMode === "route" ? "Nombre de la ruta" : "Nombre de la zona"}
                      />
                      <div className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2 text-xs text-[var(--lv-text-muted)]">
                        {isAuthoringRoute ? routeProgressLabel : `${draftCoordinatesCount} punto(s)`}
                      </div>
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {isAuthoringRoute && onSelectDraftOrigin ? (
                      <button
                        type="button"
                        className={`lv-btn ${
                          routePlacementTarget === "origin" ? "lv-btn-primary" : "lv-btn-secondary"
                        }`}
                        onClick={onSelectDraftOrigin}
                      >
                        {draftRouteOrigin ? "Mover origen" : "Elegir origen"}
                      </button>
                    ) : null}
                    {isAuthoringRoute && onSelectDraftDestination ? (
                      <button
                        type="button"
                        className={`lv-btn ${
                          routePlacementTarget === "destination"
                            ? "lv-btn-primary"
                            : "lv-btn-secondary"
                        }`}
                        onClick={onSelectDraftDestination}
                      >
                        {draftRouteDestination ? "Mover destino" : "Elegir destino"}
                      </button>
                    ) : null}
                    {isAuthoringRoute && onUseMyLocationAsDraftOrigin ? (
                      <button
                        type="button"
                        className="lv-btn lv-btn-secondary"
                        onClick={onUseMyLocationAsDraftOrigin}
                      >Usar mi ubicación</button>
                    ) : null}
                    {isAuthoringRoute && onSwapDraftRoute && draftCoordinatesCount >= 2 ? (
                      <button
                        type="button"
                        className="lv-btn lv-btn-secondary"
                        onClick={onSwapDraftRoute}
                      >
                        Intercambiar
                      </button>
                    ) : null}
                    {onUndoDraftPoint ? (
                      <button
                        type="button"
                        className="lv-btn lv-btn-secondary"
                        onClick={onUndoDraftPoint}
                      >
                        Deshacer punto
                      </button>
                    ) : null}
                    {onSaveDraftEntity ? (
                      <button
                        type="button"
                        className="lv-btn lv-btn-primary"
                        onClick={() => void onSaveDraftEntity()}
                        disabled={
                          placeActionSaving ||
                          (authoringMode === "place" && draftCoordinatesCount < 1) ||
                          (authoringMode === "route" && draftCoordinatesCount < 2) ||
                          (authoringMode === "zone" && draftCoordinatesCount < 3)
                        }
                      >
                        {authoringMode === "place"
                          ? "Guardar y usar lugar"
                          : `Guardar ${authoringMode === "route" ? "ruta" : "zona"}`}
                      </button>
                    ) : null}
                    {onCancelDraft ? (
                      <button
                        type="button"
                        className="lv-btn lv-btn-secondary"
                        onClick={onCancelDraft}
                      >
                        Cancelar
                      </button>
                    ) : null}
                  </div>
                  {isAuthoringRoute && routeLoading ? (
                    <div className="mt-3 rounded-[18px] border border-[var(--lv-info)] bg-[var(--lv-info-soft)] px-4 py-3 text-sm text-[var(--lv-info)]">
                      Calculando trayecto...
                    </div>
                  ) : null}
                  {isAuthoringRoute && !routeLoading && routePreview ? (
                    <div className="mt-3 rounded-[18px] border border-[var(--lv-info)] bg-[var(--lv-info-soft)] px-4 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--lv-info)]">
                        Preview de ruta
                      </div>
                      <div className="mt-1 text-sm font-semibold text-[var(--lv-text)]">
                        {formatRouteDistance(routePreview.distanceMeters)}
                        {routePreview.durationSeconds > 0
                          ? ` ? ${formatRouteDuration(routePreview.durationSeconds)}`
                          : ""}
                      </div>
                      <div className="mt-1 text-xs text-[var(--lv-text-muted)]">
                        {routePreview.source === "osrm"
                          ? "Trayecto calculado por carretera."
                          : "Linea aproximada mientras calculamos una ruta mejor."}
                      </div>
                    </div>
                  ) : null}
                  {isAuthoringRoute && !routeLoading && routeError ? (
                    <div className="mt-3 rounded-[18px] border border-[var(--lv-danger)] bg-[var(--lv-danger-soft)] px-4 py-3 text-sm text-[var(--lv-danger)]">
                      {routeError}
                    </div>
                  ) : null}
                  {isAuthoring && placeActionNotice ? (
                    <div className="mt-3 rounded-[18px] border border-[var(--lv-success)] bg-[var(--lv-success-soft)] px-3 py-2 text-xs text-[var(--lv-success)]">
                      {placeActionNotice}
                    </div>
                  ) : null}
                  {isAuthoring && placeActionError ? (
                    <div className="mt-3 rounded-[18px] border border-[var(--lv-danger)] bg-[var(--lv-danger-soft)] px-3 py-2 text-xs text-[var(--lv-danger)]">
                      {placeActionError}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {authoringMode === "none" ? (
                <>
              {isPlacePicker ? (
                <div className="mb-3 rounded-[22px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-3 text-sm text-[var(--lv-text-muted)]">
                  <div>
                    Selecciona un lugar ya existente, busca uno o marca un punto nuevo
                    directamente en el mapa para devolverlo a la semilla.
                  </div>
                  {onStartPlaceDraft ? (
                    <div className="mt-3">
                      <button
                        type="button"
                        className="lv-btn lv-btn-secondary"
                        onClick={onStartPlaceDraft}
                      >
                        Marcar punto nuevo
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {showQuickStartCard ? (
                <div className="rounded-[22px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
                    Empieza aqui
                  </div>
                  <div className="mt-2 text-sm text-[var(--lv-text-muted)]">
                    Busca una dirección arriba o entra directamente en una vista más concreta.
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="lv-btn lv-btn-secondary"
                      onClick={() => onLensChange("saved")}
                    >
                      Abrir guardados
                    </button>
                    <button
                      type="button"
                      className="lv-btn lv-btn-secondary"
                      onClick={() => onLensChange("routes")}
                    >
                      Abrir rutas
                    </button>
                    {onStartPlaceDraft ? (
                      <button
                        type="button"
                        className="lv-btn lv-btn-secondary"
                        onClick={onStartPlaceDraft}
                      >
                        Marcar lugar nuevo
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <div className="rounded-[22px] border bg-[var(--lv-surface-soft)] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
                      Vista actual
                    </div>
                    <div className="mt-2 text-sm text-[var(--lv-text)]">
                      {baseScopeLabel}
                    </div>
                    {refinementSummary.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {refinementSummary.map((item) => (
                          <span
                            key={item}
                            className="rounded-full bg-[var(--lv-surface)] px-3 py-1.5 text-xs text-[var(--lv-text-muted)]"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="rounded-full border bg-[var(--lv-surface)] px-3 py-2 text-xs font-medium text-[var(--lv-text-muted)]"
                    onClick={toggleMapControls}
                    aria-expanded={showMapControls}
                  >
                    {showMapControls ? "Ocultar filtros" : "Refinar vista"}
                  </button>
                </div>
                {showMapControls ? (
                  <>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={`rounded-full px-3 py-2 text-xs font-medium transition ${
                          mapScope === "selected_year"
                            ? "bg-[var(--lv-primary-soft)] text-[var(--lv-primary-strong)]"
                            : "bg-[var(--lv-surface)] text-[var(--lv-text-muted)]"
                        }`}
                        onClick={() => onMapScopeChange("selected_year")}
                      >
                        Año {currentYearLabel}
                      </button>
                      <button
                        type="button"
                        className={`rounded-full px-3 py-2 text-xs font-medium transition ${
                          mapScope === "all_years"
                            ? "bg-[var(--lv-primary-soft)] text-[var(--lv-primary-strong)]"
                            : "bg-[var(--lv-surface)] text-[var(--lv-text-muted)]"
                        }`}
                        onClick={() => onMapScopeChange("all_years")}
                      >
                        Toda la historia
                      </button>
                      <button
                        type="button"
                        className={`rounded-full px-3 py-2 text-xs font-medium transition ${
                          mapOnlyFavorites
                            ? "bg-[var(--lv-warning-soft)] text-[var(--lv-warning)]"
                            : "bg-[var(--lv-surface)] text-[var(--lv-text-muted)]"
                        }`}
                        onClick={onToggleOnlyFavorites}
                      >
                        Solo favoritos
                      </button>
                      {hasActiveMapFilters ? (
                        <button
                          type="button"
                          className="rounded-full bg-[var(--lv-surface)] px-3 py-2 text-xs font-medium text-[var(--lv-text-muted)]"
                          onClick={onResetFilters}
                        >
                          Limpiar
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <select
                        className="lv-select rounded-full px-3 py-2 text-xs"
                        value={mapSeasonFilter}
                        onChange={(event) =>
                          onMapSeasonFilterChange(event.target.value as HomeSeasonTone | "all")
                        }
                      >
                        <option value="all">Todas las estaciones</option>
                        <option value="spring">{getSeasonLabel("spring")}</option>
                        <option value="summer">{getSeasonLabel("summer")}</option>
                        <option value="autumn">{getSeasonLabel("autumn")}</option>
                        <option value="winter">{getSeasonLabel("winter")}</option>
                      </select>
                      <select
                        className="lv-select rounded-full px-3 py-2 text-xs"
                        value={mapFlowerFamilyFilter}
                        onChange={(event) =>
                          onMapFlowerFamilyFilterChange(
                            event.target.value as FlowerFamily | "all",
                          )
                        }
                      >
                        <option value="all">Todas las flores</option>
                        {mapFlowerFamilyOptions.map((family) => (
                          <option key={family} value={family}>
                            {FLOWER_FAMILY_LABELS[family]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : null}
              </div>

              {highlightedPlace && authoringMode === "none" ? (
                <div className="rounded-[22px] border bg-[var(--lv-surface-soft)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
                        Lugar activo
                      </div>
                      <div className="mt-1 text-base font-semibold">{highlightedPlace.label}</div>
                      {placeSubtitle ? (
                        <div className="mt-1 text-sm text-[var(--lv-text-muted)]">{placeSubtitle}</div>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {highlightedPlaceToneLabel ? (
                        <span className="rounded-full border border-[var(--lv-warning)] bg-[var(--lv-warning-soft)] px-3 py-1.5 text-xs text-[var(--lv-warning)]">
                          {highlightedPlaceToneLabel}
                        </span>
                      ) : null}
                      <span className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-1.5 text-xs text-[var(--lv-text)]">
                        {resolveMapPlaceKindLabel(effectivePlaceKind, mapConfig)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {isPlacePicker && onPickCurrentPlace ? (
                      <button
                        type="button"
                        className="lv-btn lv-btn-primary"
                        onClick={() => void onPickCurrentPlace()}
                        disabled={placeActionSaving}
                      >
                        {highlightedPlace.sourceType === "place"
                          ? `Usar este lugar en el ${pickerLabel}`
                          : `Guardar y usar este lugar en el ${pickerLabel}`}
                      </button>
                    ) : null}
                    <a
                      href={buildDirectionsUrl(highlightedPlace.lat, highlightedPlace.lng)}
                      target="_blank"
                      rel="noreferrer"
                      className="lv-btn lv-btn-primary"
                    >
                      Ir con Maps
                    </a>
                    {highlightedPlace.href ? (
                      <a href={highlightedPlace.href} className="lv-btn lv-btn-secondary">
                        {highlightedPlace.sourceType === "memory" ? "Abrir recuerdo" : "Abrir detalle"}
                      </a>
                    ) : null}
                    {onSaveCurrentPlace ? (
                      <button
                        type="button"
                        className="lv-btn lv-btn-secondary"
                        onClick={togglePlaceOrganizer}
                        aria-expanded={showPlaceOrganizer}
                      >
                        {showPlaceOrganizer ? "Ocultar organizacion" : "Organizar"}
                      </button>
                    ) : null}
                  </div>
                  {onSaveCurrentPlace && showPlaceOrganizer ? (
                    <div className="mt-3 grid gap-3 rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-3 sm:grid-cols-[minmax(0,1fr)_180px]">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
                          Estado
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {placeStateOptions.map((option) => {
                            const active = effectivePlaceState === option.value;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                className={`rounded-full border px-2.5 py-1.5 text-[11px] font-medium transition ${
                                  active
                                    ? "border-[var(--lv-primary)] bg-[var(--lv-primary-soft)] text-[var(--lv-primary-strong)]"
                                    : "bg-[var(--lv-surface)] text-[var(--lv-text-muted)]"
                                }`}
                                onClick={() => onSaveCurrentPlace(option.value)}
                                disabled={placeActionSaving}
                                aria-pressed={active}
                              >
                                {getPlaceStateLabel(option.value, highlightedPlace.sourceType, mapConfig)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
                          Tipo
                        </div>
                        <select
                          className="lv-select mt-2 w-full rounded-full px-3 py-2 text-xs"
                          value={effectivePlaceKind}
                          onChange={(event) => onPlaceKindChange?.(event.target.value as MapPlaceKind)}
                          disabled={placeActionSaving}
                        >
                          {placeKindOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : null}
                  {placeActionNotice ? (
                    <div className="mt-3 rounded-2xl border border-[var(--lv-success)] bg-[var(--lv-success-soft)] px-3 py-2 text-xs text-[var(--lv-success)]">
                      {placeActionNotice}
                    </div>
                  ) : null}
                  {placeActionError ? (
                    <div className="mt-3 rounded-2xl border border-[var(--lv-danger)] bg-[var(--lv-danger-soft)] px-3 py-2 text-xs text-[var(--lv-danger)]">
                      {placeActionError}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {highlightedRoute && authoringMode === "none" ? (
                <div className="rounded-[22px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
                    Ruta activa
                  </div>
                  <div className="mt-1 text-base font-semibold text-[var(--lv-text)]">
                    {highlightedRoute.title}
                  </div>
                  {highlightedRoute.subtitle ? (
                    <div className="mt-1 text-sm text-[var(--lv-text-muted)]">
                      {highlightedRoute.subtitle}
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-1.5 text-xs text-[var(--lv-text-muted)]">
                      {getRouteTravelModeLabel(highlightedRoute.travelMode)}
                    </span>
                    <span className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-1.5 text-xs text-[var(--lv-text-muted)]">
                      {getRouteKindLabel(highlightedRoute.kind)}
                    </span>
                    <span className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-1.5 text-xs text-[var(--lv-text-muted)]">
                      {highlightedRoute.status === "draft"
                        ? "Borrador"
                        : highlightedRoute.status === "archived"
                          ? "Archivada"
                          : "Guardada"}
                    </span>
                    {highlightedRoute.distanceMeters != null ? (
                      <span className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-1.5 text-xs text-[var(--lv-text-muted)]">
                        {formatRouteDistance(highlightedRoute.distanceMeters)}
                      </span>
                    ) : null}
                    {highlightedRoute.durationSeconds != null ? (
                      <span className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-1.5 text-xs text-[var(--lv-text-muted)]">
                        {formatRouteDuration(highlightedRoute.durationSeconds)}
                      </span>
                    ) : null}
                  </div>
                  {(highlightedRoute.originLabel || highlightedRoute.destinationLabel) ? (
                    <div className="mt-3 text-sm text-[var(--lv-text-muted)]">
                      {highlightedRoute.originLabel ? `Desde ${highlightedRoute.originLabel}` : null}
                      {highlightedRoute.originLabel && highlightedRoute.destinationLabel ? " ? " : null}
                      {highlightedRoute.destinationLabel
                        ? `Hasta ${highlightedRoute.destinationLabel}`
                        : null}
                    </div>
                  ) : null}
                  {highlightedRoute.notes ? (
                    <div className="mt-3 text-sm text-[var(--lv-text-muted)]">
                      {highlightedRoute.notes}
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {onUpdateCurrentRoute ? (
                      <button
                        type="button"
                        className="lv-btn lv-btn-secondary"
                        onClick={toggleRouteEditor}
                      >
                        {routeEditOpen ? "Cerrar edición" : "Editar ruta"}
                      </button>
                    ) : null}
                    {onArchiveCurrentRoute ? (
                      <button
                        type="button"
                        className="lv-btn lv-btn-secondary"
                        onClick={() => void onArchiveCurrentRoute()}
                        disabled={placeActionSaving}
                      >
                        Archivar ruta
                      </button>
                    ) : null}
                  </div>
                  {routeEditOpen && onUpdateCurrentRoute ? (
                    <div className="mt-4 space-y-3 rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-3">
                      <input
                        className="lv-input w-full"
                        value={routeDraft.title}
                        onChange={(event) =>
                          updateRouteDraft((current) => ({
                            ...current,
                            title: event.target.value,
                          }))
                        }
                        placeholder="Título de la ruta"
                      />
                      <input
                        className="lv-input w-full"
                        value={routeDraft.subtitle}
                        onChange={(event) =>
                          updateRouteDraft((current) => ({
                            ...current,
                            subtitle: event.target.value,
                          }))
                        }
                        placeholder="Subtítulo breve"
                      />
                      <textarea
                        className="lv-textarea min-h-[88px] w-full"
                        value={routeDraft.notes}
                        onChange={(event) =>
                          updateRouteDraft((current) => ({
                            ...current,
                            notes: event.target.value,
                          }))
                        }
                        placeholder="Notas de la ruta"
                      />
                      <div className="grid gap-2 sm:grid-cols-3">
                        <select
                          className="lv-select"
                          value={routeDraft.kind}
                          onChange={(event) =>
                            updateRouteDraft((current) => ({
                              ...current,
                              kind: event.target.value,
                            }))
                          }
                        >
                          <option value="walk">Paseo</option>
                          <option value="drive">Coche</option>
                          <option value="date_route">Ruta de cita</option>
                          <option value="trip">Escapada</option>
                          <option value="ritual">Ritual</option>
                          <option value="custom">Personalizada</option>
                        </select>
                        <select
                          className="lv-select"
                          value={routeDraft.status}
                          onChange={(event) =>
                            updateRouteDraft((current) => ({
                              ...current,
                              status: event.target.value,
                            }))
                          }
                        >
                          <option value="draft">Borrador</option>
                          <option value="saved">Guardada</option>
                          <option value="archived">Archivada</option>
                        </select>
                        <select
                          className="lv-select"
                          value={routeDraft.travelMode}
                          onChange={(event) =>
                            updateRouteDraft((current) => ({
                              ...current,
                              travelMode: event.target.value,
                            }))
                          }
                        >
                          <option value="walking">A pie</option>
                          <option value="driving">Coche</option>
                          <option value="cycling">Bici</option>
                          <option value="transit">Transporte</option>
                          <option value="mixed">Mixto</option>
                        </select>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="lv-btn lv-btn-primary"
                          onClick={() =>
                            void onUpdateCurrentRoute({
                              title: routeDraft.title.trim(),
                              subtitle: routeDraft.subtitle.trim() || null,
                              notes: routeDraft.notes.trim() || null,
                              kind: routeDraft.kind,
                              status: routeDraft.status,
                              travelMode: routeDraft.travelMode,
                            })
                          }
                          disabled={placeActionSaving || !routeDraft.title.trim()}
                        >
                          Guardar cambios
                        </button>
                        <button
                          type="button"
                          className="lv-btn lv-btn-secondary"
                          onClick={closeRouteEditor}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {routeLoading ? (
                <div className="rounded-[22px] border border-[var(--lv-info)] bg-[var(--lv-info-soft)] p-4 text-sm text-[var(--lv-info)]">
                  Calculando trayecto...
                </div>
              ) : null}

              {!routeLoading && routePreview ? (
                <div className="rounded-[22px] border border-[var(--lv-info)] bg-[var(--lv-info-soft)] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--lv-info)]">
                    Trayecto activo
                  </div>
                  <div className="mt-1 text-base font-semibold text-[var(--lv-text)]">
                    {formatRouteDistance(routePreview.distanceMeters)}
                    {routePreview.durationSeconds > 0
                      ? ` - ${formatRouteDuration(routePreview.durationSeconds)}`
                      : ""}
                  </div>
                  <div className="mt-1 text-sm text-[var(--lv-text-muted)]">
                    {routePreview.source === "osrm"
                      ? "Ruta aproximada por carretera"
                      : "Linea aproximada mientras preparamos una ruta mejor"}
                  </div>
                </div>
              ) : null}

              {!routeLoading && routeError ? (
                <div className="rounded-[22px] border border-[var(--lv-danger)] bg-[var(--lv-danger-soft)] p-4 text-sm text-[var(--lv-danger)]">
                  <div>{routeError}</div>
                  {onRequestLocation ? (
                    <button
                      type="button"
                      className="lv-btn lv-btn-secondary mt-3"
                      onClick={onRequestLocation}
                    >
                        Usar mi ubicación
                    </button>
                  ) : null}
                </div>
              ) : null}

              {showDiscoverySection ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-[var(--lv-text)]">
                    {discoveryTitle}
                  </div>
                  {selectedPoint ? (
                    <div className="text-xs text-[var(--lv-text-muted)]">
                      {buildPointSearchLabel(selectedPoint)}
                    </div>
                  ) : null}
                </div>

                {!showSearchResults && isPlacePicker ? (
                  <div className="rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 py-4 text-sm text-[var(--lv-text-muted)]">
                    <div className="font-medium text-[var(--lv-text)]">
                      1. Busca una calle o número exacto
                    </div>
                    <div className="mt-1">
                      2. Elige un lugar ya guardado si ya existe
                    </div>
                    <div className="mt-1">
                      3. O marca un punto nuevo tocando el mapa
                    </div>
                  </div>
                ) : null}

                {!showSearchResults && activeLens === "saved" ? (
                  <div className="rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
                      Dentro de guardados
                    </div>
                    <div className="mt-2 text-sm text-[var(--lv-text-muted)]">
                      {savedCollectionDescription}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {([
                        ["all", "Todo guardado"],
                        ["favorites", "Favoritos"],
                        ["restaurants", "Restaurantes"],
                        ["wishlist", "Por visitar"],
                        ["visited", "Visitados"],
                      ] as const).map(([value, label]) => {
                        const active = savedCollectionFilter === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
                              active
                                ? "border-[var(--lv-primary)] bg-[var(--lv-primary-soft)] text-[var(--lv-primary-strong)]"
                                : "border-[var(--lv-border)] bg-[var(--lv-surface)] text-[var(--lv-text-muted)]"
                            }`}
                            onClick={() => onSavedCollectionFilterChange(value)}
                            aria-pressed={active}
                          >
                            <span className="inline-flex items-center gap-2">
                              <span>{label}</span>
                              <span className="rounded-full bg-[var(--lv-surface-soft)] px-2 py-0.5 text-[10px] text-[var(--lv-text-muted)]">
                                {savedCollectionCounts[value]}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {!showSearchResults && activeLens === "routes" ? (
                  <div className="space-y-2">
                    <div className="rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 py-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
                        Rutas del jardin
                      </div>
                      <div className="mt-2 text-sm text-[var(--lv-text-muted)]">
                        Aquí guardáis paseos, escapadas y recorridos para revivir o reutilizar.
                      </div>
                      {onStartRouteDraft ? (
                        <div className="mt-3">
                          <button
                            type="button"
                            className="lv-btn lv-btn-secondary"
                            onClick={onStartRouteDraft}
                          >
                            Nueva ruta
                          </button>
                        </div>
                      ) : null}
                    </div>
                    {routeSuggestions.length ? (
                    <div className="space-y-2">
                      {routeSuggestions.map((route) => (
                        <button
                          key={route.id}
                          type="button"
                          className="flex w-full items-start justify-between gap-3 rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-3 text-left transition hover:-translate-y-[1px]"
                          onClick={() => onRouteSuggestionSelect?.(route.id)}
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-[var(--lv-text)]">
                              {route.title}
                            </div>
                            <div className="mt-1 text-xs text-[var(--lv-text-muted)]">
                              {route.subtitle ||
                                [route.originLabel, route.destinationLabel]
                                  .filter(Boolean)
                                  .join(" - ") ||
                                "Recorrido guardado"}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="rounded-full bg-[var(--lv-surface-soft)] px-2.5 py-1 text-[11px] text-[var(--lv-text-muted)]">
                                {getRouteKindLabel(route.kind)}
                              </span>
                              <span className="rounded-full bg-[var(--lv-surface-soft)] px-2.5 py-1 text-[11px] text-[var(--lv-text-muted)]">
                                {getRouteTravelModeLabel(route.travelMode)}
                              </span>
                              {route.distanceMeters != null ? (
                                <span className="rounded-full bg-[var(--lv-surface-soft)] px-2.5 py-1 text-[11px] text-[var(--lv-text-muted)]">
                                  {formatRouteDistance(route.distanceMeters)}
                                </span>
                              ) : null}
                              {route.durationSeconds != null ? (
                                <span className="rounded-full bg-[var(--lv-surface-soft)] px-2.5 py-1 text-[11px] text-[var(--lv-text-muted)]">
                                  {formatRouteDuration(route.durationSeconds)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <span className="rounded-full bg-[var(--lv-surface-soft)] px-2.5 py-1 text-[11px] text-[var(--lv-text-muted)]">
                            Abrir
                          </span>
                        </button>
                      ))}
                    </div>
                    ) : (
                      <div className="rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 py-4 text-sm text-[var(--lv-text-muted)]">
                        Todavía no hay rutas guardadas en esta vista.
                      </div>
                    )}
                  </div>
                ) : null}

                {showSearchResults ? (
                  <>
                    {searchLoading ? (
                      <div className="rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 py-4 text-sm text-[var(--lv-text-muted)]">
                        Buscando lugares...
                      </div>
                    ) : null}
                    {!searchLoading && mergedSearchEntries.length === 0 ? (
                      <div className="rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 py-4 text-sm text-[var(--lv-text-muted)]">
                        {searchError ?? "No hay resultados con esa búsqueda todavía."}
                      </div>
                    ) : null}
                    {mergedSearchEntries.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        className="flex w-full items-start justify-between gap-3 rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-3 text-left transition hover:-translate-y-[1px]"
                        onClick={() => onSearchEntrySelect(entry)}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span>
                              {entry.kind === "point"
                                ? entry.point.sourceType === "place"
                                  ? "Guardado"
                                  : "Recuerdo"
                                : "Mapa"}
                            </span>
                            <div className="truncate text-sm font-semibold">{entry.label}</div>
                          </div>
                          <div className="mt-1 text-xs text-[var(--lv-text-muted)]">
                            {entry.subtitle}
                          </div>
                        </div>
                        <span className="rounded-full bg-[var(--lv-surface-soft)] px-2.5 py-1 text-[11px] text-[var(--lv-text-muted)]">
                          {isPlacePicker ? "Elegir" : entry.kind === "point" ? "Abrir" : "Ver"}
                        </span>
                      </button>
                    ))}
                  </>
                ) : activeLens !== "routes" && suggestionPoints.length ? (
                  suggestionPoints.map((point) => (
                    <button
                      key={point.id}
                      type="button"
                      className="flex w-full items-start justify-between gap-3 rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-3 text-left transition hover:-translate-y-[1px]"
                      onClick={() =>
                        onSearchEntrySelect({
                          id: `point-${point.id}`,
                          kind: "point",
                          label: buildPointSearchLabel(point),
                          subtitle: `${point.title}${point.date ? ` - ${point.date}` : ""}`,
                          lat: point.lat,
                          lng: point.lng,
                          point,
                        })
                      }
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span>
                            {activeLens === "saved"
                              ? point.placeState === "favorite" || point.isFavorite
                                ? "Favorito"
                                : point.placeState === "wishlist"
                                  ? "Por visitar"
                                  : point.placeState === "visited"
                                    ? "Visitado"
                                    : "Guardado"
                              : point.isFavorite
                                ? "Favorito"
                                : "Lugar"}
                          </span>
                          <div className="truncate text-sm font-semibold">
                            {buildPointSearchLabel(point)}
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-[var(--lv-text-muted)]">
                          {activeLens === "saved"
                            ? [
                                point.placeKind
                                  ? resolveMapPlaceKindLabel(point.placeKind, mapConfig)
                                  : null,
                                point.addressLabel || point.title,
                              ]
                                .filter(Boolean)
                                .join(" - ")
                            : `${point.title}${point.date ? ` - ${point.date}` : ""}`}
                        </div>
                      </div>
                      <span className="rounded-full bg-[var(--lv-surface-soft)] px-2.5 py-1 text-[11px] text-[var(--lv-text-muted)]">
                        Abrir
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 py-4 text-sm text-[var(--lv-text-muted)]">
                    {emptySuggestionsCopy}
                  </div>
                )}
              </div>
              ) : null}
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


