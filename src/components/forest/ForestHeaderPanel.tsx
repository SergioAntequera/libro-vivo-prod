import ActiveGardenSwitcher from "@/components/shared/ActiveGardenSwitcher";
import type { Season } from "@/lib/forestLogic";
import { getProductSurface } from "@/lib/productSurfaces";

const FOREST_SURFACE = getProductSurface("forest");

type ForestHeaderPanelProps = {
  forestTitle: string;
  forestSubtitle: string;
  hasActiveFilters: boolean;
  yearFilter: "all" | string;
  yearOptions: string[];
  onYearFilterChange: (value: "all" | string) => void;
  seasonFilter: Season | "all";
  onSeasonFilterChange: (value: Season | "all") => void;
  seasonLabel: (season: Season) => string;
  onOpenYearBook: () => void;
  yearBookButtonLabel: string;
  onOpenAchievements: () => void;
  onClearFilters: () => void;
  onBackHome: () => void;
  onGardenChanged: (gardenId: string | null) => void;
  forestVisibleYearRangeLabel: string;
  statsTotal: number;
  forestZoneCount: number;
  annualTreeCount: number;
  nextMilestoneLabel: string;
};

const SEASON_OPTIONS: Array<Season | "all"> = [
  "all",
  "spring",
  "summer",
  "autumn",
  "winter",
];

export default function ForestHeaderPanel({
  forestTitle,
  forestSubtitle,
  hasActiveFilters,
  yearFilter,
  yearOptions,
  onYearFilterChange,
  seasonFilter,
  onSeasonFilterChange,
  seasonLabel,
  onOpenYearBook,
  yearBookButtonLabel,
  onOpenAchievements,
  onClearFilters,
  onBackHome,
  onGardenChanged,
  forestVisibleYearRangeLabel,
  statsTotal,
  forestZoneCount,
  annualTreeCount,
  nextMilestoneLabel,
}: ForestHeaderPanelProps) {
  const activeYearLabel =
    yearFilter === "all" ? forestVisibleYearRangeLabel : yearFilter;
  const activeSeasonLabel =
    seasonFilter === "all" ? "Todas las estaciones" : seasonLabel(seasonFilter);

  return (
    <section
      className="lv-card p-5"
      style={{
        background:
          "linear-gradient(180deg, var(--lv-surface) 0%, var(--lv-bg-soft) 100%)",
      }}
    >
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="lv-card p-5 bg-white/90">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button className="lv-btn lv-btn-secondary text-sm" onClick={onBackHome}>
              Volver a home
            </button>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                className="lv-btn lv-btn-secondary w-full sm:w-auto"
                onClick={onOpenAchievements}
              >
                Ver hitos
              </button>
              <button
                className="lv-btn lv-btn-primary w-full sm:w-auto"
                onClick={onOpenYearBook}
              >
                {yearBookButtonLabel}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="lv-badge px-3 py-1 text-[11px] uppercase tracking-[0.16em]">
                {FOREST_SURFACE.label}
              </div>
              <h1 className="mt-3 text-3xl font-semibold">{forestTitle}</h1>
              <p className="mt-2 text-sm text-[var(--lv-text-muted)]">
                {forestSubtitle}
              </p>
              <p className="mt-3 max-w-xl text-sm text-[var(--lv-text-muted)]">
                Aquí lees el conjunto de los años como paisaje compartido: menos
                detalle, más patrón y una mejor pista de a qué libro anual conviene
                entrar después.
              </p>
            </div>

            <div className="min-w-[220px] space-y-2">
              <div className="lv-badge bg-white px-3 py-1.5 text-xs">
                {activeYearLabel} · {activeSeasonLabel}
              </div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
                Jardín activo
              </div>
              <ActiveGardenSwitcher compact onChanged={onGardenChanged} />
              <div className="text-[11px] text-[var(--lv-text-muted)]">
                El bosque se recalcula con el jardín activo visible ahora mismo.
              </div>
            </div>
          </div>

          <div className="lv-card-soft mt-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Filtrar lectura</div>
                <div className="mt-1 text-xs text-[var(--lv-text-muted)]">
                  Usa filtros ligeros para enfocar un año o una estación sin perder la
                  sensación de paisaje.
                </div>
              </div>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="lv-btn lv-btn-secondary rounded-full px-3 py-1 text-xs"
                >
                  Quitar filtros
                </button>
              ) : null}
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,220px)_1fr]">
              <label className="block">
                <div className="mb-2 text-xs uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
                  Año
                </div>
                <select
                  className="lv-input w-full"
                  value={yearFilter}
                  onChange={(event) =>
                    onYearFilterChange(event.target.value as "all" | string)
                  }
                >
                  <option value="all">Todos los años</option>
                  {yearOptions.map((year) => (
                    <option key={`forest-year-${year}`} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <div className="mb-2 text-xs uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
                  Estación
                </div>
                <div className="flex flex-wrap gap-2">
                  {SEASON_OPTIONS.map((option) => {
                    const active = seasonFilter === option;
                    const label =
                      option === "all" ? "Todas" : seasonLabel(option as Season);
                    return (
                      <button
                        key={`forest-season-filter-${option}`}
                        type="button"
                        onClick={() => onSeasonFilterChange(option)}
                        className="lv-btn rounded-full border px-3 py-1 text-xs"
                        style={
                          active
                            ? {
                                borderColor: "var(--lv-primary)",
                                backgroundColor: "var(--lv-primary-soft)",
                                color: "var(--lv-primary-strong)",
                              }
                            : {
                                borderColor: "var(--lv-border)",
                                backgroundColor: "var(--lv-surface)",
                                color: "var(--lv-text)",
                              }
                        }
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside
          className="relative overflow-hidden rounded-[var(--lv-radius-lg)] border p-5"
          style={{
            borderColor: "var(--lv-border)",
            background:
              "linear-gradient(180deg, var(--lv-primary-soft) 0%, var(--lv-bg-soft) 100%)",
            boxShadow: "var(--lv-shadow-sm)",
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.52),transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.02))]" />
          <div className="relative space-y-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--lv-primary-strong)]">
                Lectura rápida
              </div>
              <h2 className="mt-2 text-xl font-semibold text-[var(--lv-text)]">
                El bosque está mirando {activeYearLabel}
              </h2>
              <p className="mt-2 text-sm text-[var(--lv-text-muted)]">
                {seasonFilter === "all"
                  ? "Sin una estación aislada, el paisaje enseña la forma general del recorrido."
                  : `Ahora la lectura se concentra en ${activeSeasonLabel.toLowerCase()}.`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="lv-card-soft bg-white/80 p-3">
                <div className="text-xs text-[var(--lv-text-muted)]">Años visibles</div>
                <div className="mt-1 text-2xl font-semibold">{annualTreeCount}</div>
              </div>
              <div className="lv-card-soft bg-white/80 p-3">
                <div className="text-xs text-[var(--lv-text-muted)]">Páginas visibles</div>
                <div className="mt-1 text-2xl font-semibold">{statsTotal}</div>
              </div>
              <div className="lv-card-soft bg-white/80 p-3">
                <div className="text-xs text-[var(--lv-text-muted)]">Zonas del bosque</div>
                <div className="mt-1 text-2xl font-semibold">{forestZoneCount}</div>
              </div>
              <div className="lv-card-soft bg-white/80 p-3">
                <div className="text-xs text-[var(--lv-text-muted)]">Perspectiva</div>
                <div className="mt-1 text-sm font-semibold">
                  {yearFilter === "all" ? "Mapa de años" : `Año ${yearFilter}`}
                </div>
              </div>
            </div>

            <div className="lv-card-soft bg-white/80 p-3">
              <div className="text-xs uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
                Próximo hito
              </div>
              <div className="mt-2 font-medium text-[var(--lv-text)]">
                {nextMilestoneLabel}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
