"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  mapPlaceRowToRecord,
  mapRouteRowToRecord,
  mapZoneRowToRecord,
  type MapPlaceKind,
  type MapPlaceRecord,
  type MapRouteRecord,
  type MapZoneRecord,
} from "@/lib/mapDomainTypes";
import ImmersiveMapBottomSheet from "@/components/home/map/ImmersiveMapBottomSheet";
import ImmersiveMapTopChrome from "@/components/home/map/ImmersiveMapTopChrome";
import { useHomeImmersiveMapController } from "@/components/home/useHomeImmersiveMapController";
import { useHomeMapRoutePreview } from "@/components/home/useHomeMapRoutePreview";
import { useMapRuntimeConfig } from "@/components/home/useMapRuntimeConfig";
import { buildPlacePointsForHome } from "@/lib/homeMapEntities";
import type { SavedCollectionFilter } from "@/lib/homeMapExperience";
import {
  archiveMapRoute,
  archiveMapZone,
  reverseGeocodePoint,
  saveMapPlaceFromSelection,
  saveMapRouteFromPreview,
  saveMapZone,
  updateMapRoute,
  updateMapZone,
  updateMapPlace,
  updateMapPlaceKind,
} from "@/lib/homeMapApi";
import type { HomeSeasonTone } from "@/lib/homePageUtils";
import type { MapPointItem } from "@/lib/homeMapTypes";
import type { FlowerFamily } from "@/lib/productDomainContracts";
import { resolveMapLensMeta, resolveMapPlaceKindLabel } from "@/lib/mapCatalogConfig";
import { MapPin } from "lucide-react";

const MemoriesMap = dynamic(() => import("@/components/home/MemoriesMap"), {
  ssr: false,
});

type MapScope = "selected_year" | "all_years";
type SheetMode = "peek" | "half" | "full";
function moveSheetMode(mode: SheetMode, direction: "up" | "down"): SheetMode {
  if (direction === "up") {
    if (mode === "peek") return "half";
    if (mode === "half") return "full";
    return "full";
  }
  if (mode === "full") return "half";
  if (mode === "half") return "peek";
  return "peek";
}

function buildCircleZoneGeoJson(lat: number, lng: number, radiusMeters = 180, steps = 20) {
  const latRadius = radiusMeters / 111320;
  const lngRadius = radiusMeters / (111320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.2));
  const ring: Array<[number, number]> = [];
  for (let index = 0; index <= steps; index += 1) {
    const angle = (index / steps) * Math.PI * 2;
    ring.push([
      lng + Math.cos(angle) * lngRadius,
      lat + Math.sin(angle) * latRadius,
    ]);
  }
  return {
    type: "Polygon",
    coordinates: [ring],
  } as const;
}

export default function HomeImmersiveMemoriesMap({
  memories,
  places,
  routes,
  zones,
  totalMemories,
  mapScope,
  selectedYearValue,
  mapOnlyFavorites,
  mapSeasonFilter,
  mapFlowerFamilyFilter,
  mapFlowerFamilyOptions,
  hasActiveMapFilters,
  onMapScopeChange,
  onToggleOnlyFavorites,
  onMapSeasonFilterChange,
  onMapFlowerFamilyFilterChange,
  onResetFilters,
  onMapDataChanged,
  onMapPlaceSaved,
  onMapRouteSaved,
  onMapRouteArchived,
  onMapZoneSaved,
  onMapZoneArchived,
  selectionMode = null,
  sourcePageId = null,
  onPlacePicked,
  onClose,
}: {
  memories: MapPointItem[];
  places: MapPlaceRecord[];
  routes: MapRouteRecord[];
  zones: MapZoneRecord[];
  totalMemories: number;
  mapScope: MapScope;
  selectedYearValue: string;
  mapOnlyFavorites: boolean;
  mapSeasonFilter: HomeSeasonTone | "all";
  mapFlowerFamilyFilter: FlowerFamily | "all";
  mapFlowerFamilyOptions: FlowerFamily[];
  hasActiveMapFilters: boolean;
  onMapScopeChange: (scope: MapScope) => void;
  onToggleOnlyFavorites: () => void;
  onMapSeasonFilterChange: (value: HomeSeasonTone | "all") => void;
  onMapFlowerFamilyFilterChange: (value: FlowerFamily | "all") => void;
  onResetFilters: () => void;
  onMapDataChanged?: () => void;
  onMapPlaceSaved?: (place: MapPlaceRecord) => void;
  onMapRouteSaved?: (route: MapRouteRecord) => void;
  onMapRouteArchived?: (routeId: string) => void;
  onMapZoneSaved?: (zone: MapZoneRecord) => void;
  onMapZoneArchived?: (zoneId: string) => void;
  selectionMode?: "seed_place" | "ritual_place" | null;
  sourcePageId?: string | null;
  onPlacePicked?: (place: MapPlaceRecord) => void;
  onClose: () => void;
}) {
  const [sheetMode, setSheetMode] = useState<SheetMode>(selectionMode ? "full" : "peek");
  const [placeActionSaving, setPlaceActionSaving] = useState(false);
  const [placeActionNotice, setPlaceActionNotice] = useState<string | null>(null);
  const [placeActionError, setPlaceActionError] = useState<string | null>(null);
  const [selectedPlaceKind, setSelectedPlaceKind] = useState<MapPlaceKind>("spot");
  const [selectedPlaceState, setSelectedPlaceState] = useState<
    "saved" | "favorite" | "wishlist" | "visited"
  >("saved");
  const [authoringMode, setAuthoringMode] = useState<"none" | "route" | "zone" | "place">("none");
  const [draftCoordinates, setDraftCoordinates] = useState<Array<{ lat: number; lng: number }>>([]);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftPlaceSelection, setDraftPlaceSelection] = useState<{
    lat: number;
    lng: number;
    label: string;
    subtitle: string | null;
  } | null>(null);
  const [draftPlaceLookupLoading, setDraftPlaceLookupLoading] = useState(false);
  const [routePlacementTarget, setRoutePlacementTarget] = useState<"origin" | "destination">("origin");
  const [savedCollectionFilter, setSavedCollectionFilter] =
    useState<SavedCollectionFilter>("all");
  const [optimisticRoutes, setOptimisticRoutes] = useState<MapRouteRecord[]>([]);
  const [pendingRouteSelectionId, setPendingRouteSelectionId] = useState<string | null>(null);
  const [sheetDragOffset, setSheetDragOffset] = useState(0);
  const [isSheetDragging, setIsSheetDragging] = useState(false);
  const dragStartRef = useRef<{ y: number; mode: SheetMode } | null>(null);
  const backgroundRefreshTimerRef = useRef<number | null>(null);
  const draftPlaceLookupTokenRef = useRef(0);

  const effectiveRoutes = useMemo(() => {
    const byId = new Map<string, MapRouteRecord>();
    routes.forEach((route) => byId.set(route.id, route));
    optimisticRoutes.forEach((route) => byId.set(route.id, route));
    return Array.from(byId.values());
  }, [optimisticRoutes, routes]);

  const baseFilteredPlaces = useMemo(
    () =>
      {
        const linkedMemoryByPageId = new Map(
          memories
            .filter((memory) => Boolean(memory.linkedPageId))
            .map((memory) => [memory.linkedPageId as string, memory] as const),
        );
        return buildPlacePointsForHome(places, {
          selectedYearValue,
          mapScope,
          mapOnlyFavorites,
          mapSeasonFilter,
          mapFlowerFamilyFilter,
        }, linkedMemoryByPageId);
      },
    [mapFlowerFamilyFilter, mapOnlyFavorites, mapScope, mapSeasonFilter, memories, places, selectedYearValue],
  );

  const savedCollectionCounts = useMemo(
    () => ({
      all: baseFilteredPlaces.filter((point) => point.sourceType === "place").length,
      favorites: baseFilteredPlaces.filter(
        (point) =>
          point.sourceType === "place" &&
          (point.placeState === "favorite" || point.isFavorite),
      ).length,
      restaurants: baseFilteredPlaces.filter(
        (point) =>
          point.sourceType === "place" &&
          (point.placeKind === "restaurant" || point.placeKind === "cafe"),
      ).length,
      wishlist: baseFilteredPlaces.filter(
        (point) => point.sourceType === "place" && point.placeState === "wishlist",
      ).length,
      visited: baseFilteredPlaces.filter(
        (point) => point.sourceType === "place" && point.placeState === "visited",
      ).length,
    }),
    [baseFilteredPlaces],
  );
  const { config: mapRuntimeConfig } = useMapRuntimeConfig();

  const {
    activeLens,
    clearSearch,
    destination,
    focusTarget,
    handlePointSelect,
    handleRouteSelect,
    handleZoneSelect,
    handleSearchEntrySelect,
    highlightedPlace,
    highlightedRoute,
    highlightedZone,
    lensCounts,
    lensPoints,

    locateMe,
    markerKindById,
    mergedSearchEntries,
    query,

    searchError,
    searchLoading,
    selectLens,
    selectedPoint,
    selectedPointId,
    selectedRouteId,
    selectedZoneId,
    setFocusTarget,
    setQuery,
    suggestionPoints,
    userLocation,
  } = useHomeImmersiveMapController({
    memories,
    places: baseFilteredPlaces,
    routes: effectiveRoutes,
    zones,
    savedCollectionFilter,
    autoLocate: true,
  });
  const runtimeLensMeta = useMemo(
    () => resolveMapLensMeta(activeLens, mapRuntimeConfig),
    [activeLens, mapRuntimeConfig],
  );

  useEffect(() => {
    if (!pendingRouteSelectionId || activeLens !== "routes") return;
    const route = effectiveRoutes.find((entry) => entry.id === pendingRouteSelectionId);
    if (!route) return;
    handleRouteSelect(route);
    setSheetMode("half");
    setPendingRouteSelectionId(null);
  }, [activeLens, effectiveRoutes, handleRouteSelect, pendingRouteSelectionId]);

  useEffect(() => {
    return () => {
      if (backgroundRefreshTimerRef.current != null) {
        window.clearTimeout(backgroundRefreshTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setSelectedPlaceKind(highlightedPlace?.placeKind ?? "spot");
    if (
      highlightedPlace?.placeState === "favorite" ||
      highlightedPlace?.placeState === "wishlist" ||
      highlightedPlace?.placeState === "visited"
    ) {
      setSelectedPlaceState(highlightedPlace.placeState);
      return;
    }
    setSelectedPlaceState("saved");
  }, [
    highlightedPlace?.placeId,
    highlightedPlace?.sourceType,
    highlightedPlace?.lat,
    highlightedPlace?.lng,
    highlightedPlace?.placeKind,
    highlightedPlace?.placeState,
  ]);

  useEffect(() => {
    if (selectionMode) {
      setSheetMode("full");
    }
  }, [selectionMode]);

  function triggerBackgroundMapRefresh() {
    if (!onMapDataChanged) return;
    if (backgroundRefreshTimerRef.current != null) {
      window.clearTimeout(backgroundRefreshTimerRef.current);
    }
    backgroundRefreshTimerRef.current = window.setTimeout(() => {
      backgroundRefreshTimerRef.current = null;
      onMapDataChanged();
    }, 450);
  }

  const visibleRoutes = useMemo(
    () =>
      activeLens === "routes" || activeLens === "explore"
        ? effectiveRoutes.filter((route) => {
            const geometry = route.geometry;
            return (
              geometry &&
              geometry.type === "LineString" &&
              Array.isArray(geometry.coordinates) &&
              geometry.coordinates.length > 0
            );
          })
        : [],
    [activeLens, effectiveRoutes],
  );
  const visibleZones = useMemo(
    () =>
      activeLens === "symbolic" || activeLens === "explore"
        ? zones.filter((zone) => zone.geojson && typeof zone.geojson === "object")
        : [],
    [activeLens, zones],
  );
  const hasVisibleRouteGeometry =
    visibleRoutes.length > 0;
  const hasVisibleZoneGeometry = visibleZones.length > 0;
  const {
    route: draftRoute,
    loading: draftRouteLoading,
    error: draftRouteError,
  } = useHomeMapRoutePreview({
    enabled: authoringMode === "route" && draftCoordinates.length >= 2,
    origin: draftCoordinates[0] ?? null,
    destination: draftCoordinates.length >= 2 ? draftCoordinates[draftCoordinates.length - 1] : null,
  });

  function openSearchSheet() {
    setSheetMode("full");
  }

  function startRouteDraft() {
    setAuthoringMode("route");
    setDraftCoordinates([]);
    setDraftTitle("Nueva ruta");
    setDraftPlaceSelection(null);
    setDraftPlaceLookupLoading(false);
    setRoutePlacementTarget("origin");
    setPlaceActionError(null);
    setPlaceActionNotice(null);
    setSheetMode("half");
    selectLens("routes");
  }

  function startPlaceDraft() {
    draftPlaceLookupTokenRef.current += 1;
    setAuthoringMode("place");
    setDraftCoordinates([]);
    setDraftTitle("");
    setDraftPlaceSelection(null);
    setDraftPlaceLookupLoading(false);
    setPlaceActionError(null);
    setPlaceActionNotice(null);
    setSheetMode("half");
  }

  function cancelDraft() {
    draftPlaceLookupTokenRef.current += 1;
    setAuthoringMode("none");
    setDraftCoordinates([]);
    setDraftTitle("");
    setDraftPlaceSelection(null);
    setDraftPlaceLookupLoading(false);
    setRoutePlacementTarget("origin");
  }

  function undoDraftPoint() {
    setDraftCoordinates((prev) => {
      const next = prev.slice(0, -1);
      if (authoringMode === "route") {
        setRoutePlacementTarget(next.length === 0 ? "origin" : "destination");
      } else if (authoringMode === "place" && next.length === 0) {
        draftPlaceLookupTokenRef.current += 1;
        setDraftPlaceSelection(null);
        setDraftPlaceLookupLoading(false);
      }
      return next;
    });
  }

  async function resolveDraftPlaceSelection(coordinate: { lat: number; lng: number }) {
    const lookupToken = draftPlaceLookupTokenRef.current + 1;
    draftPlaceLookupTokenRef.current = lookupToken;
    setDraftPlaceLookupLoading(true);
    setDraftPlaceSelection({
      lat: coordinate.lat,
      lng: coordinate.lng,
      label: "Lugar marcado en el mapa",
      subtitle: "Buscando una referencia cercana...",
    });

    try {
      const { result } = await reverseGeocodePoint(coordinate);
      if (draftPlaceLookupTokenRef.current !== lookupToken) return;
      const label = String(result.label ?? "").trim() || "Lugar marcado en el mapa";
      const fullLabel = String(result.fullLabel ?? "").trim();
      setDraftPlaceSelection({
        lat: coordinate.lat,
        lng: coordinate.lng,
        label,
        subtitle: fullLabel && fullLabel !== label ? fullLabel : null,
      });
    } catch {
      if (draftPlaceLookupTokenRef.current !== lookupToken) return;
      setDraftPlaceSelection({
        lat: coordinate.lat,
        lng: coordinate.lng,
        label: "Lugar marcado en el mapa",
        subtitle: "Podrás usarlo igualmente en la semilla.",
      });
    } finally {
      if (draftPlaceLookupTokenRef.current === lookupToken) {
        setDraftPlaceLookupLoading(false);
      }
    }
  }

  function handleMapCoordinateAdd(coordinate: { lat: number; lng: number }) {
    if (authoringMode === "none") return;
    setDraftCoordinates((prev) => {
      if (authoringMode === "route") {
        if (routePlacementTarget === "origin") {
          const next = prev.length >= 2 ? [coordinate, prev[prev.length - 1]] : [coordinate];
          setRoutePlacementTarget("destination");
          return next;
        }
        if (prev.length === 0) return [coordinate];
        return [prev[0], coordinate];
      }
      if (authoringMode === "place") {
        return [coordinate];
      }
      return [...prev, coordinate];
    });
    if (authoringMode === "place") {
      setFocusTarget({ lat: coordinate.lat, lng: coordinate.lng, zoom: 15 });
      void resolveDraftPlaceSelection(coordinate);
    }
  }

  function setDraftRouteOrigin(coordinate: { lat: number; lng: number }) {
    setDraftCoordinates((prev) => {
      if (prev.length >= 2) return [coordinate, prev[prev.length - 1]];
      return [coordinate];
    });
  }

  function setDraftRouteDestination(coordinate: { lat: number; lng: number }) {
    setDraftCoordinates((prev) => {
      if (prev.length === 0) return [coordinate];
      return [prev[0], coordinate];
    });
  }

  function handleUseMyLocationAsDraftOrigin() {
    if (!userLocation || authoringMode !== "route") return;
    setDraftRouteOrigin(userLocation);
    setRoutePlacementTarget("destination");
  }

  function handleSwapDraftRoute() {
    setDraftCoordinates((prev) => {
      if (prev.length < 2) return prev;
      return [prev[1], prev[0]];
    });
  }

  function handleSheetPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    dragStartRef.current = { y: event.clientY, mode: sheetMode };
    setIsSheetDragging(true);
    setSheetDragOffset(0);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleSheetPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragStartRef.current) return;
    const deltaY = event.clientY - dragStartRef.current.y;
    const upwardLimit = dragStartRef.current.mode === "full" ? 72 : 220;
    const downwardLimit = dragStartRef.current.mode === "peek" ? 72 : 220;
    const clamped = Math.max(-upwardLimit, Math.min(deltaY, downwardLimit));
    setSheetDragOffset(clamped);
  }

  function handleSheetPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragStartRef.current) return;
    const deltaY = sheetDragOffset || event.clientY - dragStartRef.current.y;
    const threshold = 18;
    if (deltaY <= -threshold) {
      setSheetMode((prev) => moveSheetMode(prev, "up"));
    } else if (deltaY >= threshold) {
      setSheetMode((prev) => moveSheetMode(prev, "down"));
    }
    dragStartRef.current = null;
    setIsSheetDragging(false);
    setSheetDragOffset(0);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleSheetPointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    dragStartRef.current = null;
    setIsSheetDragging(false);
    setSheetDragOffset(0);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  async function handleSaveCurrentPlace(
    mode: "saved" | "favorite" | "wishlist" | "visited",
  ) {
    if (!highlightedPlace || placeActionSaving) return;
    setPlaceActionError(null);
    setPlaceActionNotice(null);
    setSelectedPlaceState(mode);
    setPlaceActionSaving(true);

    try {
      const result =
        highlightedPlace.sourceType === "place" && highlightedPlace.placeId
          ? await updateMapPlace(highlightedPlace.placeId, mode)
          : await saveMapPlaceFromSelection(
              {
                label: highlightedPlace.label,
                subtitle: highlightedPlace.subtitle,
                lat: highlightedPlace.lat,
                lng: highlightedPlace.lng,
                sourcePageId:
                  selectedPoint?.sourceType === "memory" ? selectedPoint.sourceId : null,
                notes: selectedPoint?.snippet ?? selectedPoint?.notes ?? null,
              },
              mode,
              selectedPlaceKind,
            );

      if (result?.place) {
        const savedPlace = mapPlaceRowToRecord(result.place as Record<string, unknown>);
        setSelectedPlaceKind(savedPlace.kind);
        if (
          savedPlace.state === "favorite" ||
          savedPlace.state === "wishlist" ||
          savedPlace.state === "visited"
        ) {
          setSelectedPlaceState(savedPlace.state);
        } else {
          setSelectedPlaceState("saved");
        }
        onMapPlaceSaved?.(savedPlace);
        if (!onMapPlaceSaved) {
          triggerBackgroundMapRefresh();
        }
      } else {
        setSelectedPlaceState(mode);
        triggerBackgroundMapRefresh();
      }

      setPlaceActionNotice(
        mode === "wishlist"
            ? "Lugar marcado para visitar."
            : mode === "visited"
              ? "Lugar marcado como visitado."
              : mode === "favorite"
            ? "Lugar marcado como favorito."
            : "Lugar guardado en vuestro mapa.",
      );
    } catch (error) {
      setPlaceActionError(error instanceof Error ? error.message : "No se pudo guardar el lugar.");
    } finally {
      setPlaceActionSaving(false);
    }
  }

  async function handlePickCurrentPlace() {
    if (!highlightedPlace || placeActionSaving) return;
    setPlaceActionError(null);
    setPlaceActionNotice(null);
    setPlaceActionSaving(true);

    try {
      let pickedPlace: MapPlaceRecord | null =
        highlightedPlace.sourceType === "place" && highlightedPlace.placeId
          ? places.find((place) => place.id === highlightedPlace.placeId) ?? null
          : null;

      if (!pickedPlace) {
        const result = await saveMapPlaceFromSelection(
          {
            label: highlightedPlace.label,
            subtitle: highlightedPlace.subtitle,
            lat: highlightedPlace.lat,
            lng: highlightedPlace.lng,
            sourcePageId:
              sourcePageId ?? (selectedPoint?.sourceType === "memory" ? selectedPoint.sourceId : null),
            notes: selectedPoint?.snippet ?? selectedPoint?.notes ?? null,
          },
          "saved",
          selectedPlaceKind,
        );

        if (!result?.place) {
          throw new Error("No se pudo guardar el lugar elegido desde el mapa.");
        }

        pickedPlace = mapPlaceRowToRecord(result.place as Record<string, unknown>);
        onMapPlaceSaved?.(pickedPlace);
      }

      onPlacePicked?.(pickedPlace);
    } catch (error) {
      setPlaceActionError(
        error instanceof Error ? error.message : "No se pudo usar este lugar en la semilla.",
      );
    } finally {
      setPlaceActionSaving(false);
    }
  }

  async function handleCurrentPlaceKindChange(kind: MapPlaceKind) {
    if (!highlightedPlace || placeActionSaving || kind === selectedPlaceKind) return;
    setPlaceActionError(null);
    setPlaceActionNotice(null);
    setSelectedPlaceKind(kind);

    if (highlightedPlace.sourceType !== "place" || !highlightedPlace.placeId) {
      return;
    }

    setPlaceActionSaving(true);
    try {
      const result = await updateMapPlaceKind(highlightedPlace.placeId, kind);
      const savedPlace = mapPlaceRowToRecord(result.place as Record<string, unknown>);
      setSelectedPlaceKind(savedPlace.kind);
      onMapPlaceSaved?.(savedPlace);
      if (!onMapPlaceSaved) {
        triggerBackgroundMapRefresh();
      }
      const kindLabel = resolveMapPlaceKindLabel(kind, mapRuntimeConfig).toLowerCase();
      setPlaceActionNotice(`Tipo actualizado: ${kindLabel}.`);
    } catch (error) {
      setPlaceActionError(
        error instanceof Error ? error.message : "No se pudo actualizar el tipo del lugar.",
      );
    } finally {
      setPlaceActionSaving(false);
    }
  }

  async function handleCreateSymbolicZone() {
    if (!highlightedPlace || placeActionSaving) return;
    setPlaceActionError(null);
    setPlaceActionNotice(null);
    setPlaceActionSaving(true);

    try {
      const result = await saveMapZone({
        title: `Zona simbólica · ${highlightedPlace.label}`,
        subtitle:
          highlightedPlace.subtitle && highlightedPlace.subtitle !== highlightedPlace.label
            ? highlightedPlace.subtitle
            : null,
        description:
          selectedPoint?.snippet ??
          selectedPoint?.notes ??
          `Zona simbólica creada desde el mapa alrededor de ${highlightedPlace.label}.`,
        centroidLat: highlightedPlace.lat,
        centroidLng: highlightedPlace.lng,
        geojson: buildCircleZoneGeoJson(highlightedPlace.lat, highlightedPlace.lng),
        kind: "symbolic",
        sourcePageId: selectedPoint?.sourceType === "memory" ? selectedPoint.sourceId : null,
      });
      const savedZone = mapZoneRowToRecord(result.zone as Record<string, unknown>);

      setPlaceActionNotice("Zona simbólica guardada en vuestro mapa.");
      selectLens("symbolic");
      setSheetMode("half");
      onMapZoneSaved?.(savedZone);
      if (!onMapZoneSaved) {
        triggerBackgroundMapRefresh();
      }
    } catch (error) {
      setPlaceActionError(error instanceof Error ? error.message : "No se pudo guardar la zona.");
    } finally {
      setPlaceActionSaving(false);
    }
  }

  async function handleSaveDraftEntity() {
    if (authoringMode === "none" || placeActionSaving) return;
    setPlaceActionError(null);
    setPlaceActionNotice(null);

    if (authoringMode === "place" && draftCoordinates.length < 1) {
      setPlaceActionError("Marca un lugar en el mapa antes de guardarlo.");
      return;
    }
    if (authoringMode === "route" && draftCoordinates.length < 2) {
      setPlaceActionError("Una ruta necesita al menos dos puntos.");
      return;
    }
    if (authoringMode === "zone" && draftCoordinates.length < 3) {
      setPlaceActionError("Una zona necesita al menos tres puntos.");
      return;
    }

    setPlaceActionSaving(true);
    try {
      if (authoringMode === "place") {
        const coordinate = draftCoordinates[0];
        const result = await saveMapPlaceFromSelection(
          {
            label: draftPlaceSelection?.label ?? "Lugar marcado en el mapa",
            subtitle:
              draftPlaceSelection?.subtitle ??
              "Lugar guardado desde el mapa para un plan compartido",
            lat: coordinate.lat,
            lng: coordinate.lng,
            sourcePageId,
          },
          "saved",
          selectedPlaceKind,
        );

        if (!result?.place) {
          throw new Error("No se pudo guardar el lugar nuevo.");
        }

        const savedPlace = mapPlaceRowToRecord(result.place as Record<string, unknown>);
        onMapPlaceSaved?.(savedPlace);
        setPlaceActionNotice("Lugar guardado en el mapa.");
        if (selectionMode) {
          onPlacePicked?.(savedPlace);
          return;
        }
        selectLens("saved");
        setFocusTarget({ lat: savedPlace.lat, lng: savedPlace.lng, zoom: 15 });
      } else if (authoringMode === "route") {
        const result = await saveMapRouteFromPreview({
          title: draftTitle.trim() || "Nueva ruta",
          geometry: {
            type: "LineString",
            coordinates: (draftRoute?.coordinates.length
              ? draftRoute.coordinates
              : draftCoordinates
            ).map((point) => [point.lng, point.lat]),
          },
          originLat: draftCoordinates[0]?.lat ?? null,
          originLng: draftCoordinates[0]?.lng ?? null,
          destinationLat: draftCoordinates[draftCoordinates.length - 1]?.lat ?? null,
          destinationLng: draftCoordinates[draftCoordinates.length - 1]?.lng ?? null,
          distanceMeters: draftRoute?.distanceMeters ?? null,
          durationSeconds: draftRoute?.durationSeconds ?? null,
          kind: draftRoute?.source === "osrm" ? "drive" : "custom",
          travelMode: draftRoute?.source === "osrm" ? "driving" : "mixed",
        });
        const savedRoute = mapRouteRowToRecord(result.route as Record<string, unknown>);
        setOptimisticRoutes((prev) => {
          const next = new Map(prev.map((entry) => [entry.id, entry]));
          next.set(savedRoute.id, savedRoute);
          return Array.from(next.values());
        });
        setPlaceActionNotice("Ruta creada en vuestro mapa.");
        selectLens("routes");
        setPendingRouteSelectionId(savedRoute.id);
        onMapRouteSaved?.(savedRoute);
      } else {
        const ring = draftCoordinates.map((point) => [point.lng, point.lat] as [number, number]);
        ring.push([draftCoordinates[0].lng, draftCoordinates[0].lat]);
        const centroid = draftCoordinates.reduce(
          (acc, point) => ({ lat: acc.lat + point.lat, lng: acc.lng + point.lng }),
          { lat: 0, lng: 0 },
        );
        const result = await saveMapZone({
          title: draftTitle.trim() || "Nueva zona simbólica",
          centroidLat: centroid.lat / draftCoordinates.length,
          centroidLng: centroid.lng / draftCoordinates.length,
          geojson: {
            type: "Polygon",
            coordinates: [ring],
          },
          kind: "symbolic",
        });
        setPlaceActionNotice("Zona simbólica creada en vuestro mapa.");
        selectLens("symbolic");
      }
      cancelDraft();
      setSheetMode("half");
    } catch (error) {
      setPlaceActionError(
        error instanceof Error
          ? error.message
          : authoringMode === "route"
            ? "No se pudo crear la ruta."
            : authoringMode === "zone"
              ? "No se pudo crear la zona."
              : "No se pudo guardar el lugar.",
      );
    } finally {
      setPlaceActionSaving(false);
    }
  }

  async function handleUpdateCurrentRoute(input: {
    title: string;
    subtitle: string | null;
    notes: string | null;
    kind: string;
    status: string;
    travelMode: string;
  }) {
    if (!highlightedRoute || placeActionSaving) return;
    setPlaceActionError(null);
    setPlaceActionNotice(null);
    setPlaceActionSaving(true);

    try {
      const result = await updateMapRoute(highlightedRoute.id, {
        title: input.title,
        subtitle: input.subtitle,
        notes: input.notes,
        kind: input.kind as
          | "walk"
          | "drive"
          | "date_route"
          | "trip"
          | "ritual"
          | "custom",
        status: input.status as "draft" | "saved" | "archived",
        travelMode: input.travelMode as
          | "walking"
          | "driving"
          | "cycling"
          | "transit"
          | "mixed",
      });
      const savedRoute = mapRouteRowToRecord(result.route as Record<string, unknown>);
      setOptimisticRoutes((prev) => {
        const next = new Map(prev.map((entry) => [entry.id, entry]));
        next.set(savedRoute.id, savedRoute);
        return Array.from(next.values());
      });
      setPlaceActionNotice("Ruta actualizada.");
      onMapRouteSaved?.(savedRoute);
      if (!onMapRouteSaved) {
        triggerBackgroundMapRefresh();
      }
    } catch (error) {
      setPlaceActionError(
        error instanceof Error ? error.message : "No se pudo actualizar la ruta.",
      );
    } finally {
      setPlaceActionSaving(false);
    }
  }

  async function handleArchiveCurrentRoute() {
    if (!highlightedRoute || placeActionSaving) return;
    setPlaceActionError(null);
    setPlaceActionNotice(null);
    setPlaceActionSaving(true);

    try {
      await archiveMapRoute(highlightedRoute.id);
      setOptimisticRoutes((prev) => prev.filter((route) => route.id !== highlightedRoute.id));
      setPlaceActionNotice("Ruta archivada.");
      selectLens("explore");
      setSheetMode("half");
      onMapRouteArchived?.(highlightedRoute.id);
      if (!onMapRouteArchived) {
        triggerBackgroundMapRefresh();
      }
    } catch (error) {
      setPlaceActionError(
        error instanceof Error ? error.message : "No se pudo archivar la ruta.",
      );
    } finally {
      setPlaceActionSaving(false);
    }
  }

  async function handleUpdateCurrentZone(input: {
    title: string;
    subtitle: string | null;
    description: string | null;
    kind: string;
    status: string;
  }) {
    if (!highlightedZone || placeActionSaving) return;
    setPlaceActionError(null);
    setPlaceActionNotice(null);
    setPlaceActionSaving(true);

    try {
      const result = await updateMapZone(highlightedZone.id, {
        title: input.title,
        subtitle: input.subtitle,
        description: input.description,
        kind: input.kind as
          | "symbolic"
          | "favorite_area"
          | "memory_area"
          | "meeting_area"
          | "avoid_area"
          | "custom",
        status: input.status as "active" | "archived",
      });
      const savedZone = mapZoneRowToRecord(result.zone as Record<string, unknown>);
      setPlaceActionNotice("Zona actualizada.");
      onMapZoneSaved?.(savedZone);
      if (!onMapZoneSaved) {
        triggerBackgroundMapRefresh();
      }
    } catch (error) {
      setPlaceActionError(
        error instanceof Error ? error.message : "No se pudo actualizar la zona.",
      );
    } finally {
      setPlaceActionSaving(false);
    }
  }

  async function handleArchiveCurrentZone() {
    if (!highlightedZone || placeActionSaving) return;
    setPlaceActionError(null);
    setPlaceActionNotice(null);
    setPlaceActionSaving(true);

    try {
      await archiveMapZone(highlightedZone.id);
      setPlaceActionNotice("Zona archivada.");
      selectLens("explore");
      setSheetMode("half");
      onMapZoneArchived?.(highlightedZone.id);
      if (!onMapZoneArchived) {
        triggerBackgroundMapRefresh();
      }
    } catch (error) {
      setPlaceActionError(
        error instanceof Error ? error.message : "No se pudo archivar la zona.",
      );
    } finally {
      setPlaceActionSaving(false);
    }
  }

  const emptyMapTitle = "Empieza aquí";
  const emptyMapCopy =
    "Tu mapa está vacío. Guarda recuerdos, lugares y rincones especiales para volver a ellos cuando quieras.";
  const emptyLensCopy =
    activeLens === "routes"
      ? "Aún no hay rutas guardadas. Crea una desde Nueva ruta."
      : "No hay lugares para esta combinación de vista y filtros todavía.";

  return (
    <section className="relative h-full w-full overflow-hidden bg-[var(--lv-bg)]">
      <div className="absolute inset-0">
        <MemoriesMap
          memories={lensPoints}
          mapConfig={mapRuntimeConfig}
          immersive
          activeLens={activeLens}
          authoringMode={authoringMode}
          markerKindById={markerKindById}
          selectedMemoryId={selectedPointId}
          selectedRouteId={selectedRouteId}
          selectedZoneId={selectedZoneId}
          onMarkerSelect={(point) => {
            handlePointSelect(point);
            setSheetMode("half");
          }}
          onSavedRouteSelect={(route) => {
            handleRouteSelect(route);
            setSheetMode("half");
          }}
          onZoneSelect={(zone) => {
            handleZoneSelect(zone);
            setSheetMode("half");
          }}
          draftCoordinates={draftCoordinates}
          draftRoutePreview={authoringMode === "route" ? draftRoute : null}
          onMapCoordinateAdd={handleMapCoordinateAdd}
          focusTarget={focusTarget}
          userLocation={userLocation}
          destination={
            destination
              ? { lat: destination.lat, lng: destination.lng, label: destination.label }
              : null
          }
          savedRoutes={visibleRoutes}
          savedZones={visibleZones}
        />
      </div>

      <ImmersiveMapTopChrome
        activeLens={activeLens}
        authoringMode={authoringMode}
        lensCounts={lensCounts}
        lensOptions={mapRuntimeConfig.lenses}
        onLensChange={(lens) => {
          if (authoringMode !== "none") cancelDraft();
          selectLens(lens);
          if (lens !== "saved") setSavedCollectionFilter("all");
          setSheetMode("half");
        }}
        onOpenSearch={() => setSheetMode("full")}
        onQueryChange={setQuery}
        query={query}
        onClearQuery={clearSearch}
        onClose={onClose}
        selectionMode={selectionMode}
      />

      <ImmersiveMapBottomSheet
        currentYearLabel={selectedYearValue}
        activeLens={activeLens}
        authoringMode={authoringMode}
        mapConfig={mapRuntimeConfig}
        draftCoordinatesCount={draftCoordinates.length}
        draftTitle={draftTitle}
        draftPlaceSelection={draftPlaceSelection}
        draftPlaceLookupLoading={draftPlaceLookupLoading}
        hasActiveMapFilters={hasActiveMapFilters}
        highlightedPlace={highlightedPlace}
        highlightedRoute={highlightedRoute}
        highlightedZone={highlightedZone}
        lensDescription={runtimeLensMeta.description}
        lensLabel={runtimeLensMeta.label}
        lensMemoriesCount={lensPoints.length}
        mapFlowerFamilyFilter={mapFlowerFamilyFilter}
        mapFlowerFamilyOptions={mapFlowerFamilyOptions}
        mapOnlyFavorites={mapOnlyFavorites}
        mapScope={mapScope}
        mapSeasonFilter={mapSeasonFilter}
        mergedSearchEntries={mergedSearchEntries}
        onMapFlowerFamilyFilterChange={onMapFlowerFamilyFilterChange}
        onDraftTitleChange={setDraftTitle}
        onStartPlaceDraft={selectionMode ? startPlaceDraft : undefined}
        onStartRouteDraft={activeLens === "routes" ? startRouteDraft : undefined}
        routePlacementTarget={authoringMode === "route" ? routePlacementTarget : undefined}
        draftRouteOrigin={authoringMode === "route" ? draftCoordinates[0] ?? null : null}
        draftRouteDestination={
          authoringMode === "route" && draftCoordinates.length >= 2
            ? draftCoordinates[draftCoordinates.length - 1]
            : null
        }
        onSelectDraftOrigin={
          authoringMode === "route" ? () => setRoutePlacementTarget("origin") : undefined
        }
        onSelectDraftDestination={
          authoringMode === "route" ? () => setRoutePlacementTarget("destination") : undefined
        }
        onUseMyLocationAsDraftOrigin={
          authoringMode === "route" && userLocation ? handleUseMyLocationAsDraftOrigin : undefined
        }
        onSwapDraftRoute={authoringMode === "route" ? handleSwapDraftRoute : undefined}
        onSaveDraftEntity={authoringMode !== "none" ? handleSaveDraftEntity : undefined}
        onUndoDraftPoint={draftCoordinates.length ? undoDraftPoint : undefined}
        onCancelDraft={authoringMode !== "none" ? cancelDraft : undefined}
        onLensChange={(lens) => {
          if (authoringMode !== "none") cancelDraft();
          selectLens(lens);
          if (lens !== "saved") setSavedCollectionFilter("all");
          setSheetMode("half");
        }}
        savedCollectionFilter={savedCollectionFilter}
        savedCollectionCounts={savedCollectionCounts}
        onSavedCollectionFilterChange={setSavedCollectionFilter}
        onMapScopeChange={onMapScopeChange}
        onMapSeasonFilterChange={onMapSeasonFilterChange}
        onResetFilters={onResetFilters}
        onRequestLocation={locateMe}
        onSaveCurrentPlace={handleSaveCurrentPlace}
        selectionMode={selectionMode}
        onPickCurrentPlace={selectionMode ? handlePickCurrentPlace : undefined}
        selectedPlaceKind={selectedPlaceKind}
        selectedPlaceState={selectedPlaceState}
        onPlaceKindChange={handleCurrentPlaceKindChange}
        onSaveCurrentRoute={undefined}
        onCreateSymbolicZone={undefined}
        onRouteSuggestionSelect={(routeId) => {
          const route = visibleRoutes.find((entry) => entry.id === routeId);
          if (!route) return;
          handleRouteSelect(route);
          setSheetMode("half");
        }}
        onUpdateCurrentRoute={highlightedRoute ? handleUpdateCurrentRoute : undefined}
        onArchiveCurrentRoute={highlightedRoute ? handleArchiveCurrentRoute : undefined}
        onUpdateCurrentZone={undefined}
        onArchiveCurrentZone={undefined}
        placeActionError={placeActionError}
        placeActionNotice={placeActionNotice}
        placeActionSaving={placeActionSaving}
        onSearchEntrySelect={(entry) => {
          handleSearchEntrySelect(entry);
          setSheetMode("half");
        }}
        onSheetPointerDown={handleSheetPointerDown}
        onSheetPointerMove={handleSheetPointerMove}
        onSheetPointerUp={handleSheetPointerUp}
        onSheetPointerCancel={handleSheetPointerCancel}
        sheetDragOffset={sheetDragOffset}
        isSheetDragging={isSheetDragging}
        onToggleOnlyFavorites={onToggleOnlyFavorites}
        query={query}
        routeError={authoringMode === "route" ? draftRouteError : null}
        routeLoading={authoringMode === "route" ? draftRouteLoading : false}
        routePreview={authoringMode === "route" ? draftRoute : null}
        searchError={searchError}
        searchLoading={searchLoading}
        selectedPoint={selectedPoint}
        sheetMode={sheetMode}
        suggestionPoints={suggestionPoints}
        visibleRouteCount={visibleRoutes.length}
        visibleZoneCount={visibleZones.length}
        routeSuggestions={visibleRoutes.slice(0, 6)}
      />

      {authoringMode === "none" &&
      sheetMode === "peek" &&
      lensPoints.length === 0 &&
      !hasVisibleRouteGeometry &&
      !hasVisibleZoneGeometry ? (
        places.length === 0 && memories.length === 0 && totalMemories === 0 ? (
          <div
            className="pointer-events-none fixed inset-x-3 bottom-[max(8rem,env(safe-area-inset-bottom)+7rem)] z-[3920] mx-auto max-w-lg rounded-[20px] border p-4 backdrop-blur-md"
            style={{
              borderColor: "var(--lv-map-chrome-border)",
              background: "var(--lv-map-chrome-bg)",
              boxShadow: "var(--lv-map-chrome-shadow)",
            }}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--lv-primary-soft)]">
                <MapPin className="h-5 w-5 text-[var(--lv-primary)]" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-semibold text-[var(--lv-text)]">
                  {emptyMapTitle}
                </div>
                <div className="text-xs leading-relaxed text-[var(--lv-text-muted)]">
                  {emptyMapCopy}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="pointer-events-none fixed inset-x-3 bottom-[max(8rem,env(safe-area-inset-bottom)+7rem)] z-[3920] mx-auto max-w-lg rounded-[20px] border p-3 text-sm text-[var(--lv-text-muted)] backdrop-blur-md"
            style={{
              borderColor: "var(--lv-map-chrome-border)",
              background: "var(--lv-map-chrome-bg)",
              boxShadow: "var(--lv-map-chrome-shadow)",
            }}
          >
            {emptyLensCopy}
          </div>
        )
      ) : null}
    </section>
  );
}
