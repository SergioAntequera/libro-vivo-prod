import dynamic from "next/dynamic";
import SeasonLegendChips from "@/components/shared/SeasonLegendChips";
import FlowerFamilyLegendChips from "@/components/shared/FlowerFamilyLegendChips";
import { getSeasonLabel } from "@/lib/narrativeTaxonomy";
import type { HomeSeasonTone } from "@/lib/homePageUtils";
import type { MapPlaceRecord, MapRouteRecord, MapZoneRecord } from "@/lib/mapDomainTypes";
import type { MapPointItem } from "@/lib/homeMapTypes";
import HomeImmersiveMemoriesMap from "@/components/home/HomeImmersiveMemoriesMap";
import {
  FLOWER_FAMILY_LABELS,
  type FlowerFamily,
} from "@/lib/productDomainContracts";

const MemoriesMap = dynamic(() => import("@/components/home/MemoriesMap"), {
  ssr: false,
});

type MapScope = "selected_year" | "all_years";

export default function HomeMemoriesMapSection({
  filteredMemories,
  mapPlaces,
  mapRoutes,
  mapZones,
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
  onMapPlacePicked,
  onClose,
  immersive = false,
}: {
  filteredMemories: MapPointItem[];
  mapPlaces: MapPlaceRecord[];
  mapRoutes: MapRouteRecord[];
  mapZones: MapZoneRecord[];
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
  onMapPlacePicked?: (place: MapPlaceRecord) => void;
  onClose?: () => void;
  immersive?: boolean;
}) {
  const scopeSelectedYear = mapScope === "selected_year";

  if (immersive) {
    return (
      <HomeImmersiveMemoriesMap
        memories={filteredMemories}
        places={mapPlaces}
        routes={mapRoutes}
        zones={mapZones}
        totalMemories={totalMemories}
        mapScope={mapScope}
        selectedYearValue={selectedYearValue}
        mapOnlyFavorites={mapOnlyFavorites}
        mapSeasonFilter={mapSeasonFilter}
        mapFlowerFamilyFilter={mapFlowerFamilyFilter}
        mapFlowerFamilyOptions={mapFlowerFamilyOptions}
        hasActiveMapFilters={hasActiveMapFilters}
        onMapScopeChange={onMapScopeChange}
        onToggleOnlyFavorites={onToggleOnlyFavorites}
        onMapSeasonFilterChange={onMapSeasonFilterChange}
        onMapFlowerFamilyFilterChange={onMapFlowerFamilyFilterChange}
        onResetFilters={onResetFilters}
        onMapDataChanged={onMapDataChanged}
        onMapPlaceSaved={onMapPlaceSaved}
        onMapRouteSaved={onMapRouteSaved}
        onMapRouteArchived={onMapRouteArchived}
        onMapZoneSaved={onMapZoneSaved}
        onMapZoneArchived={onMapZoneArchived}
        selectionMode={selectionMode}
        sourcePageId={sourcePageId}
        onPlacePicked={onMapPlacePicked}
        onClose={onClose ?? (() => {})}
      />
    );
  }

  return (
    <section className="lv-card space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Mapa vivo</h2>
          <p className="text-sm text-[var(--lv-text-muted)]">
            Cada recuerdo con lugar real conecta el jardin con el mundo: lugares vividos, guardados y rutas que podeis revivir.
          </p>
        </div>
        <div className="lv-badge">
          {filteredMemories.length} / {totalMemories} lugar(es)
        </div>
      </div>

      <div className="lv-card-soft p-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`lv-btn min-h-0 rounded-full px-3 py-1 text-xs transition ${
                scopeSelectedYear
                  ? "lv-btn-primary"
                  : "lv-btn-secondary"
              }`}
              onClick={() => onMapScopeChange("selected_year")}
            >
              Año {selectedYearValue}
            </button>
            <button
              type="button"
              className={`lv-btn min-h-0 rounded-full px-3 py-1 text-xs transition ${
                !scopeSelectedYear
                  ? "lv-btn-primary"
                  : "lv-btn-secondary"
              }`}
              onClick={() => onMapScopeChange("all_years")}
            >
              Todos los años
            </button>
            <button
              type="button"
              className={`lv-btn min-h-0 rounded-full px-3 py-1 text-xs transition ${
                mapOnlyFavorites
                  ? "border-[var(--lv-warning)] bg-[var(--lv-warning-soft)] text-[var(--lv-warning)]"
                  : "lv-btn-secondary"
              }`}
              onClick={onToggleOnlyFavorites}
            >
              Solo favoritas
            </button>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="lv-select w-auto rounded-full px-3 py-1 text-xs"
              value={mapSeasonFilter}
              onChange={(e) =>
                onMapSeasonFilterChange(e.target.value as HomeSeasonTone | "all")
              }
            >
              <option value="all">Todas las estaciones</option>
              <option value="spring">{getSeasonLabel("spring")}</option>
              <option value="summer">{getSeasonLabel("summer")}</option>
              <option value="autumn">{getSeasonLabel("autumn")}</option>
              <option value="winter">{getSeasonLabel("winter")}</option>
            </select>
            <select
              className="lv-select w-auto rounded-full px-3 py-1 text-xs"
              value={mapFlowerFamilyFilter}
              onChange={(e) =>
                onMapFlowerFamilyFilterChange(e.target.value as FlowerFamily | "all")
              }
            >
              <option value="all">Todas las flores</option>
              {mapFlowerFamilyOptions.map((family) => (
                <option key={family} value={family}>
                  {FLOWER_FAMILY_LABELS[family]}
                </option>
              ))}
            </select>
            {hasActiveMapFilters ? (
              <button
                type="button"
                onClick={onResetFilters}
                className="lv-btn lv-btn-ghost min-h-0 rounded-full px-3 py-1 text-xs"
              >
                Limpiar filtros
              </button>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-[var(--lv-text-muted)]">
          <div className="lv-badge">
            Pin recuerdo
          </div>
          <div className="lv-badge border-[var(--lv-warning)] bg-[var(--lv-warning-soft)] text-[var(--lv-warning)]">
            Pin favorito
          </div>
          <div className="lv-badge">
            {scopeSelectedYear
              ? `Vista ${selectedYearValue}`
              : "Vista histórica completa"}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[11px] uppercase tracking-[0.08em] text-[var(--lv-text-muted)]">
            Estaciones
          </div>
          <SeasonLegendChips />
        </div>
        <div>
          <div className="mb-1 text-[11px] uppercase tracking-[0.08em] text-[var(--lv-text-muted)]">
            Familias de flor
          </div>
          <FlowerFamilyLegendChips />
        </div>
      </div>

      <MemoriesMap memories={filteredMemories} immersive={immersive} />
      {filteredMemories.length === 0 && totalMemories === 0 ? (
        <div className="lv-state-panel lv-tone-info">
          Todavia no hay recuerdos con ubicacion. Cuando anadas uno con GPS, aparecera aqui.
        </div>
      ) : null}
      {filteredMemories.length === 0 && totalMemories > 0 ? (
        <div className="lv-state-panel lv-tone-warning">
          No hay recuerdos con los filtros actuales. Ajusta alcance, estacion, familia de flor
          o favoritas.
        </div>
      ) : null}
    </section>
  );
}
