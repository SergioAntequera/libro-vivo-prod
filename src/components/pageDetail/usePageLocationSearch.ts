"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlaceSearchResult } from "@/lib/pageDetailTypes";
import { getErrorMessage, isAbortError } from "@/lib/pageDetailUtils";

type UsePageLocationSearchParams = {
  locationFieldsAvailable: boolean;
};

type ApplyLoadedLocationInput = {
  label: string;
  lat: string;
  lng: string;
};

type UsePageLocationSearchResult = {
  locationLabel: string;
  locationLat: string;
  locationLng: string;
  placeQuery: string;
  placeOptions: PlaceSearchResult[];
  searchingPlaces: boolean;
  locationSearchMsg: string | null;
  isPlaceDropdownOpen: boolean;
  setIsPlaceDropdownOpen: (next: boolean) => void;
  handlePlaceQueryInputChange: (next: string) => void;
  selectPlaceById: (optionId: string) => void;
  clearSelectedLocation: () => void;
  applyLoadedLocation: (input: ApplyLoadedLocationInput) => void;
};

export function usePageLocationSearch({
  locationFieldsAvailable,
}: UsePageLocationSearchParams): UsePageLocationSearchResult {
  const [locationLabel, setLocationLabel] = useState("");
  const [locationLat, setLocationLat] = useState("");
  const [locationLng, setLocationLng] = useState("");
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeOptions, setPlaceOptions] = useState<PlaceSearchResult[]>([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [locationSearchMsg, setLocationSearchMsg] = useState<string | null>(null);
  const [isPlaceDropdownOpen, setIsPlaceDropdownOpen] = useState(false);

  useEffect(() => {
    if (!locationFieldsAvailable) return;

    const query = placeQuery.trim();
    const latReady = locationLat.trim().length > 0;
    const lngReady = locationLng.trim().length > 0;
    const hasExactSelectedLocation =
      latReady &&
      lngReady &&
      locationLabel.trim().length > 0 &&
      query.toLowerCase() === locationLabel.trim().toLowerCase();

    if (query.length < 2 || hasExactSelectedLocation) {
      setSearchingPlaces(false);
      setPlaceOptions([]);
      if (query.length === 0) setLocationSearchMsg(null);
      return;
    }

    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setSearchingPlaces(true);
      setLocationSearchMsg(null);
      try {
        const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(query)}`, {
          signal: ctrl.signal,
        });
        const payload = (await res.json()) as {
          results?: PlaceSearchResult[];
          error?: string;
        };

        if (!res.ok) {
          throw new Error(payload.error || "No se pudo buscar ubicaciones.");
        }

        const rows = Array.isArray(payload.results) ? payload.results : [];
        setPlaceOptions(rows);
        setIsPlaceDropdownOpen(true);
        if (!rows.length) {
          setLocationSearchMsg("No se encontraron lugares para esa búsqueda.");
        }
      } catch (error: unknown) {
        if (isAbortError(error)) return;
        setLocationSearchMsg(getErrorMessage(error, "Error buscando ubicaciones."));
        setPlaceOptions([]);
      } finally {
        setSearchingPlaces(false);
      }
    }, 260);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [locationFieldsAvailable, locationLabel, locationLat, locationLng, placeQuery]);

  const handlePlaceQueryInputChange = useCallback(
    (next: string) => {
      setPlaceQuery(next);
      setLocationSearchMsg(null);
      setIsPlaceDropdownOpen(true);
      if (
        locationLabel.trim().length ||
        locationLat.trim().length ||
        locationLng.trim().length
      ) {
        setLocationLabel("");
        setLocationLat("");
        setLocationLng("");
      }
    },
    [locationLabel, locationLat, locationLng],
  );

  const selectPlaceById = useCallback(
    (optionId: string) => {
      const option = placeOptions.find((item) => item.id === optionId);
      if (!option) return;
      setLocationLabel(option.fullLabel);
      setPlaceQuery(option.fullLabel);
      setLocationLat(String(option.lat));
      setLocationLng(String(option.lng));
      setPlaceOptions([]);
      setLocationSearchMsg(null);
      setIsPlaceDropdownOpen(false);
    },
    [placeOptions],
  );

  const clearSelectedLocation = useCallback(() => {
    setLocationLabel("");
    setLocationLat("");
    setLocationLng("");
    setPlaceQuery("");
    setPlaceOptions([]);
    setLocationSearchMsg(null);
    setIsPlaceDropdownOpen(false);
  }, []);

  const applyLoadedLocation = useCallback((input: ApplyLoadedLocationInput) => {
    setLocationLabel(input.label);
    setPlaceQuery(input.label);
    setLocationLat(input.lat);
    setLocationLng(input.lng);
    setPlaceOptions([]);
    setLocationSearchMsg(null);
    setIsPlaceDropdownOpen(false);
  }, []);

  return {
    locationLabel,
    locationLat,
    locationLng,
    placeQuery,
    placeOptions,
    searchingPlaces,
    locationSearchMsg,
    isPlaceDropdownOpen,
    setIsPlaceDropdownOpen,
    handlePlaceQueryInputChange,
    selectPlaceById,
    clearSelectedLocation,
    applyLoadedLocation,
  };
}
