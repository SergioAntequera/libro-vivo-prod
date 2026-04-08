"use client";

import { useCallback, useMemo, useState } from "react";
import type { MapPointItem } from "@/lib/homeMapTypes";
import { seasonFromIso, type HomeSeasonTone } from "@/lib/homePageUtils";
import {
  FLOWER_FAMILY_LABELS,
  type FlowerFamily,
} from "@/lib/productDomainContracts";

type MapScope = "selected_year" | "all_years";

type UseHomeMapMemoriesFiltersParams = {
  mapMemories: MapPointItem[];
  selectedYearValue: string;
};

type UseHomeMapMemoriesFiltersResult = {
  mapScope: MapScope;
  setMapScope: (next: MapScope) => void;
  mapOnlyFavorites: boolean;
  setMapOnlyFavorites: (next: boolean | ((prev: boolean) => boolean)) => void;
  mapSeasonFilter: HomeSeasonTone | "all";
  setMapSeasonFilter: (next: HomeSeasonTone | "all") => void;
  mapFlowerFamilyFilter: FlowerFamily | "all";
  setMapFlowerFamilyFilter: (next: FlowerFamily | "all") => void;
  filteredMapMemories: MapPointItem[];
  mapFlowerFamilyOptions: FlowerFamily[];
  hasActiveMapFilters: boolean;
  resetMapFilters: () => void;
};

export function useHomeMapMemoriesFilters({
  mapMemories,
  selectedYearValue,
}: UseHomeMapMemoriesFiltersParams): UseHomeMapMemoriesFiltersResult {
  const [mapScope, setMapScope] = useState<MapScope>("selected_year");
  const [mapOnlyFavorites, setMapOnlyFavorites] = useState(false);
  const [mapSeasonFilter, setMapSeasonFilter] = useState<HomeSeasonTone | "all">("all");
  const [mapFlowerFamilyFilter, setMapFlowerFamilyFilter] = useState<FlowerFamily | "all">("all");

  const filteredMapMemories = useMemo(() => {
    const yearPrefix = `${selectedYearValue}-`;
    return mapMemories.filter((memory) => {
      if (mapScope === "selected_year" && !memory.date.startsWith(yearPrefix)) return false;
      if (mapOnlyFavorites && !memory.isFavorite) return false;
      if (mapSeasonFilter !== "all" && seasonFromIso(memory.date) !== mapSeasonFilter) return false;
      if (
        mapFlowerFamilyFilter !== "all" &&
        memory.flowerFamily !== mapFlowerFamilyFilter
      ) {
        return false;
      }
      return true;
    });
  }, [
    mapFlowerFamilyFilter,
    mapMemories,
    mapOnlyFavorites,
    mapScope,
    mapSeasonFilter,
    selectedYearValue,
  ]);

  const mapFlowerFamilyOptions = useMemo(() => {
    const set = new Set<FlowerFamily>();
    for (const memory of mapMemories) {
      if (memory.flowerFamily) set.add(memory.flowerFamily);
    }
    return Array.from(set).sort((a, b) =>
      FLOWER_FAMILY_LABELS[a].localeCompare(FLOWER_FAMILY_LABELS[b], "es"),
    );
  }, [mapMemories]);

  const hasActiveMapFilters =
    mapScope !== "selected_year" ||
    mapOnlyFavorites ||
    mapSeasonFilter !== "all" ||
    mapFlowerFamilyFilter !== "all";

  const resetMapFilters = useCallback(() => {
    setMapScope("selected_year");
    setMapOnlyFavorites(false);
    setMapSeasonFilter("all");
    setMapFlowerFamilyFilter("all");
  }, []);

  return {
    mapScope,
    setMapScope,
    mapOnlyFavorites,
    setMapOnlyFavorites,
    mapSeasonFilter,
    setMapSeasonFilter,
    mapFlowerFamilyFilter,
    setMapFlowerFamilyFilter,
    filteredMapMemories,
    mapFlowerFamilyOptions,
    hasActiveMapFilters,
    resetMapFilters,
  };
}
