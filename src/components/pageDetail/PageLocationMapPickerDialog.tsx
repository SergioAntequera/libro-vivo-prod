"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import HomeMemoriesMapSection from "@/components/home/HomeMemoriesMapSection";
import { useHomeBootstrapData } from "@/components/home/useHomeBootstrapData";
import { useHomeMapMemoriesFilters } from "@/components/home/useHomeMapMemoriesFilters";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { getProductSurfaceHref } from "@/lib/productSurfaces";
import type { MapPlaceRecord } from "@/lib/mapDomainTypes";

type PageLocationMapPickerDialogProps = {
  open: boolean;
  pageId: string;
  selectedYearValue: string;
  onClose: () => void;
  onPickPlace: (place: MapPlaceRecord) => void;
};

export function PageLocationMapPickerDialog(props: PageLocationMapPickerDialogProps) {
  const { open, pageId, selectedYearValue, onClose, onPickPlace } = props;
  const router = useRouter();
  const handleRequireLogin = useCallback(() => {
    router.push(getProductSurfaceHref("login"));
  }, [router]);
  const [homeBootstrapReloadTick, setHomeBootstrapReloadTick] = useState(0);
  const {
    loading,
    fetchWarning,
    mapMemories,
    mapPlaces,
    mapRoutes,
    mapZones,
  } = useHomeBootstrapData({
    homeBootstrapReloadTick,
    onRequireLogin: handleRequireLogin,
  });

  const effectiveYearValue = useMemo(() => {
    const trimmed = String(selectedYearValue ?? "").trim();
    return /^\d{4}$/.test(trimmed) ? trimmed : String(new Date().getFullYear());
  }, [selectedYearValue]);

  const {
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
  } = useHomeMapMemoriesFilters({
    mapMemories,
    selectedYearValue: effectiveYearValue,
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[140] backdrop-blur-[3px]"
      style={{ backgroundColor: "var(--lv-overlay-scrim)" }}
    >
      <div
        className="absolute inset-3 overflow-hidden rounded-[30px] border bg-[var(--lv-bg-soft)] sm:inset-6"
        style={{
          borderColor: "var(--lv-border)",
          boxShadow: "var(--lv-shadow-md)",
        }}
      >
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <PageLoadingState message="Cargando mapa vivo..." />
          </div>
        ) : (
          <div className="relative h-full w-full">
            {fetchWarning ? (
              <div className="pointer-events-none absolute inset-x-4 top-4 z-[3950]">
                <StatusNotice message={fetchWarning} />
              </div>
            ) : null}

            <div
              className="pointer-events-none absolute left-4 top-4 z-[3940] max-w-md rounded-[22px] border px-4 py-3 backdrop-blur-md"
              style={{
                borderColor: "var(--lv-map-chrome-border)",
                backgroundColor: "var(--lv-map-chrome-bg)",
                boxShadow: "var(--lv-map-chrome-shadow)",
              }}
            >
              <div
                className="text-sm font-semibold"
                style={{ color: "var(--lv-map-chrome-text)" }}
              >
                Elige el lugar del recuerdo
              </div>
              <p className="mt-1 text-sm text-[var(--lv-text-muted)]">
                Aqui puedes buscar por calle y numero, usar un lugar guardado o marcar un punto nuevo.
              </p>
            </div>

            <HomeMemoriesMapSection
              filteredMemories={filteredMapMemories}
              mapPlaces={mapPlaces}
              mapRoutes={mapRoutes}
              mapZones={mapZones}
              totalMemories={mapMemories.length}
              mapScope={mapScope}
              selectedYearValue={effectiveYearValue}
              mapOnlyFavorites={mapOnlyFavorites}
              mapSeasonFilter={mapSeasonFilter}
              mapFlowerFamilyFilter={mapFlowerFamilyFilter}
              mapFlowerFamilyOptions={mapFlowerFamilyOptions}
              hasActiveMapFilters={hasActiveMapFilters}
              onMapScopeChange={setMapScope}
              onToggleOnlyFavorites={() => setMapOnlyFavorites((prev) => !prev)}
              onMapSeasonFilterChange={setMapSeasonFilter}
              onMapFlowerFamilyFilterChange={setMapFlowerFamilyFilter}
              onResetFilters={resetMapFilters}
              onMapDataChanged={() => setHomeBootstrapReloadTick((prev) => prev + 1)}
              onMapPlaceSaved={() => setHomeBootstrapReloadTick((prev) => prev + 1)}
              selectionMode="seed_place"
              sourcePageId={pageId}
              onMapPlacePicked={(place) => {
                onPickPlace(place);
                onClose();
              }}
              onClose={onClose}
              immersive
            />
          </div>
        )}
      </div>
    </div>
  );
}
