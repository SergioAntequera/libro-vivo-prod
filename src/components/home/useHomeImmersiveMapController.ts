"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MapRouteRecord, MapZoneRecord } from "@/lib/mapDomainTypes";
import {
  MAP_LENSES,
  buildLensCounts,
  buildPointSearchLabel,
  buildSearchEntries,
  filterPointsByLens,
  inferMarkerKind,
  type GeocodeSearchResult,
  type MapLensId,
  type SavedCollectionFilter,
  type SearchEntry,
} from "@/lib/homeMapExperience";
import type {
  MapHighlightedPlace,
  MapHighlightedRoute,
  MapHighlightedZone,
  MapPointItem,
} from "@/lib/homeMapTypes";

export function useHomeImmersiveMapController({
  memories,
  places,
  routes,
  zones,
  savedCollectionFilter = "all",
  autoLocate = false,
}: {
  memories: MapPointItem[];
  places: MapPointItem[];
  routes: MapRouteRecord[];
  zones: MapZoneRecord[];
  savedCollectionFilter?: SavedCollectionFilter;
  autoLocate?: boolean;
}) {
  const [activeLens, setActiveLens] = useState<MapLensId>("explore");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodeSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [destination, setDestination] = useState<GeocodeSearchResult | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
    heading: number | null;
    accuracy: number | null;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationPermission, setLocationPermission] = useState<
    "unknown" | "granted" | "prompt" | "denied" | "unsupported"
  >("unknown");
  const [focusTarget, setFocusTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const locationWatchIdRef = useRef<number | null>(null);
  const centeredOnAutoLocationRef = useRef(false);
  const attemptedAutoLocateRef = useRef(false);

  const lensMeta = useMemo(
    () => MAP_LENSES.find((lens) => lens.id === activeLens) ?? MAP_LENSES[0],
    [activeLens],
  );

  const placesForLens = useMemo(() => {
    if (activeLens !== "saved") return places;

    return places.filter((point) => {
      switch (savedCollectionFilter) {
        case "favorites":
          return point.placeState === "favorite" || point.isFavorite;
        case "restaurants":
          return point.placeKind === "restaurant" || point.placeKind === "cafe";
        case "wishlist":
          return point.placeState === "wishlist";
        case "visited":
          return point.placeState === "visited";
        case "all":
        default:
          return true;
      }
    });
  }, [activeLens, places, savedCollectionFilter]);

  const allPoints = useMemo(
    () => [...memories, ...placesForLens],
    [memories, placesForLens],
  );

  const lensPoints = useMemo(
    () => filterPointsByLens(allPoints, activeLens),
    [activeLens, allPoints],
  );

  const lensCounts = useMemo(
    () => buildLensCounts({ points: allPoints, routes, zones }),
    [allPoints, routes, zones],
  );

  const markerKindById = useMemo(() => {
    const entries = lensPoints.map((point) => [point.id, inferMarkerKind(point, activeLens)] as const);
    return Object.fromEntries(entries);
  }, [activeLens, lensPoints]);

  const selectedPoint = useMemo(
    () => lensPoints.find((point) => point.id === selectedPointId) ?? null,
    [lensPoints, selectedPointId],
  );
  const selectedRoute = useMemo(
    () => routes.find((route) => route.id === selectedRouteId) ?? null,
    [routes, selectedRouteId],
  );
  const selectedZone = useMemo(
    () => zones.find((zone) => zone.id === selectedZoneId) ?? null,
    [zones, selectedZoneId],
  );

  useEffect(() => {
    if (selectedPointId && !lensPoints.some((point) => point.id === selectedPointId)) {
      setSelectedPointId(null);
    }
  }, [lensPoints, selectedPointId]);

  useEffect(() => {
    if (selectedRouteId && !routes.some((route) => route.id === selectedRouteId)) {
      setSelectedRouteId(null);
    }
  }, [routes, selectedRouteId]);

  useEffect(() => {
    if (selectedZoneId && !zones.some((zone) => zone.id === selectedZoneId)) {
      setSelectedZoneId(null);
    }
  }, [zones, selectedZoneId]);

  useEffect(() => {
    setDestination(null);
    setSelectedPointId(null);
    setSelectedRouteId(null);
    setSelectedZoneId(null);
    setFocusTarget(null);
  }, [activeLens]);

  const stopLocationWatch = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    if (locationWatchIdRef.current != null) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current);
      locationWatchIdRef.current = null;
    }
  }, []);

  const startLocationWatch = useCallback(
    (options?: { centerOnFirstFix?: boolean }) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setLocationPermission("unsupported");
        return;
      }

      stopLocationWatch();
      setLocating(true);

      locationWatchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const heading = Number.isFinite(position.coords.heading)
            ? Number(position.coords.heading)
            : null;
          const accuracy = Number.isFinite(position.coords.accuracy)
            ? Number(position.coords.accuracy)
            : null;
          const next = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            heading,
            accuracy,
          };
          setUserLocation(next);
          setLocationPermission("granted");
          setLocating(false);

          if (options?.centerOnFirstFix && !centeredOnAutoLocationRef.current) {
            centeredOnAutoLocationRef.current = true;
            setFocusTarget({ lat: next.lat, lng: next.lng, zoom: 15 });
          }
        },
        (error) => {
          setLocating(false);
          if (error.code === error.PERMISSION_DENIED) {
            setLocationPermission("denied");
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 5000,
        },
      );
    },
    [stopLocationWatch],
  );

  useEffect(() => {
    if (!autoLocate || typeof window === "undefined") return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationPermission("unsupported");
      return;
    }

    let cancelled = false;
    const permissionsApi = navigator.permissions;
    const queryPermission = async () => {
      if (!permissionsApi?.query) {
        if (!attemptedAutoLocateRef.current) {
          attemptedAutoLocateRef.current = true;
          startLocationWatch();
        }
        return;
      }

      try {
        const status = await permissionsApi.query({ name: "geolocation" as PermissionName });
        if (cancelled) return;
        const nextState =
          status.state === "granted" || status.state === "prompt" || status.state === "denied"
            ? status.state
            : "unknown";
        setLocationPermission(nextState);

        if (status.state === "granted") {
          startLocationWatch();
          return;
        }
        if (status.state === "prompt" && !attemptedAutoLocateRef.current) {
          attemptedAutoLocateRef.current = true;
          startLocationWatch();
        }

        status.onchange = () => {
          const changedState =
            status.state === "granted" || status.state === "prompt" || status.state === "denied"
              ? status.state
              : "unknown";
          setLocationPermission(changedState);
          if (status.state === "granted") {
            startLocationWatch();
          }
        };
      } catch {
        if (!attemptedAutoLocateRef.current) {
          attemptedAutoLocateRef.current = true;
          startLocationWatch();
        }
      }
    };

    void queryPermission();

    return () => {
      cancelled = true;
      stopLocationWatch();
    };
  }, [autoLocate, startLocationWatch, stopLocationWatch]);

  useEffect(() => {
    const clean = query.trim();
    if (clean.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setSearchLoading(true);
        setSearchError(null);
        const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(clean)}`, {
          signal: controller.signal,
        });
        const payload = (await res.json()) as {
          results?: GeocodeSearchResult[];
          error?: string;
        };
        if (!res.ok) {
          setSearchResults([]);
          setSearchError(payload.error ?? "No se pudo buscar ubicaciones.");
          return;
        }
        setSearchResults(payload.results ?? []);
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") return;
        setSearchResults([]);
        setSearchError("No se pudo buscar ubicaciones.");
      } finally {
        setSearchLoading(false);
      }
    }, 240);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const mergedSearchEntries = useMemo(
    () => buildSearchEntries(lensPoints, query, searchResults),
    [lensPoints, query, searchResults],
  );

  const suggestionPoints = useMemo(() => {
    if (query.trim().length >= 2) return [] as MapPointItem[];
    return [...lensPoints]
      .sort((left, right) => {
        if (left.isFavorite !== right.isFavorite) return left.isFavorite ? -1 : 1;
        return right.date.localeCompare(left.date);
      })
      .slice(0, 6);
  }, [lensPoints, query]);

  const highlightedPlace: MapHighlightedPlace | null = selectedPoint
    ? {
        label: buildPointSearchLabel(selectedPoint),
        subtitle:
          selectedPoint.addressLabel ||
          selectedPoint.title ||
          selectedPoint.notes ||
          "Lugar seleccionado",
        lat: selectedPoint.lat,
        lng: selectedPoint.lng,
        href: selectedPoint.href,
        sourceType: selectedPoint.sourceType,
        placeId: selectedPoint.sourceType === "place" ? selectedPoint.sourceId : null,
        placeKind: selectedPoint.placeKind,
        placeState: selectedPoint.placeState,
        isFavorite: selectedPoint.isFavorite,
      }
    : destination
      ? {
          label: destination.label,
          subtitle: destination.fullLabel,
          lat: destination.lat,
          lng: destination.lng,
          href: null,
          sourceType: "geocode",
          placeId: null,
          placeKind: null,
          placeState: null,
          isFavorite: false,
        }
      : null;

  const highlightedRoute: MapHighlightedRoute | null = selectedRoute
    ? {
        id: selectedRoute.id,
        title: selectedRoute.title,
        subtitle: selectedRoute.subtitle,
        notes: selectedRoute.notes,
        kind: selectedRoute.kind,
        status: selectedRoute.status,
        travelMode: selectedRoute.travelMode,
        distanceMeters: selectedRoute.distanceMeters,
        durationSeconds: selectedRoute.durationSeconds,
        originLabel: selectedRoute.originLabel,
        destinationLabel: selectedRoute.destinationLabel,
        colorToken: selectedRoute.colorToken,
      }
    : null;

  const highlightedZone: MapHighlightedZone | null = selectedZone
    ? {
        id: selectedZone.id,
        title: selectedZone.title,
        subtitle: selectedZone.subtitle,
        description: selectedZone.description,
        kind: selectedZone.kind,
        status: selectedZone.status,
        colorToken: selectedZone.colorToken,
      }
    : null;

  function selectLens(nextLens: MapLensId) {
    setActiveLens(nextLens);
  }

  function clearSearch() {
    setQuery("");
    setSearchResults([]);
    setSearchError(null);
  }

  function handlePointSelect(point: MapPointItem) {
    setSelectedPointId(point.id);
    setSelectedRouteId(null);
    setSelectedZoneId(null);
    setDestination(null);
    setFocusTarget({ lat: point.lat, lng: point.lng, zoom: 15 });
  }

  function handleRouteSelect(route: MapRouteRecord) {
    setSelectedPointId(null);
    setSelectedRouteId(route.id);
    setSelectedZoneId(null);
    setDestination(null);
    setFocusTarget(null);
  }

  function handleZoneSelect(zone: MapZoneRecord) {
    setSelectedPointId(null);
    setSelectedRouteId(null);
    setSelectedZoneId(zone.id);
    setDestination(null);
    setFocusTarget(
      zone.centroidLat != null && zone.centroidLng != null
        ? { lat: zone.centroidLat, lng: zone.centroidLng, zoom: 13 }
        : null,
    );
  }

  function handleSearchEntrySelect(entry: SearchEntry) {
    if (entry.kind === "point") {
      handlePointSelect(entry.point);
      return;
    }

    setSelectedPointId(null);
    setSelectedRouteId(null);
    setSelectedZoneId(null);
    setDestination({
      id: entry.id,
      label: entry.label,
      fullLabel: entry.subtitle,
      lat: entry.lat,
      lng: entry.lng,
    });
    setFocusTarget({ lat: entry.lat, lng: entry.lng, zoom: 14 });
  }

  function recenterToMemories() {
    setDestination(null);
    setSelectedPointId(null);
    setSelectedRouteId(null);
    setSelectedZoneId(null);
    setFocusTarget(null);
  }

  function locateMe() {
    if (userLocation) {
      centeredOnAutoLocationRef.current = true;
      setFocusTarget({ lat: userLocation.lat, lng: userLocation.lng, zoom: 14 });
      startLocationWatch();
      return;
    }

    centeredOnAutoLocationRef.current = false;
    startLocationWatch({ centerOnFirstFix: true });
  }

  return {
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
    locationPermission,
    lensMeta,
    locating,
    locateMe,
    markerKindById,
    mergedSearchEntries,
    query,
    recenterToMemories,
    searchError,
    searchLoading,
    selectLens,
    selectedPoint,
    selectedPointId,
    selectedRoute,
    selectedRouteId,
    selectedZone,
    selectedZoneId,
    setFocusTarget,
    setQuery,
    suggestionPoints,
    userLocation,
  };
}
