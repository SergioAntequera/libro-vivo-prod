import type { RefObject } from "react";
import type { Season } from "@/lib/forestLogic";
import { getSeasonLabel } from "@/lib/narrativeTaxonomy";
import {
  FLOWER_FAMILY_LABELS,
  FLOWER_FAMILY_ORDER,
  type FlowerFamily,
} from "@/lib/productDomainContracts";
import SeasonLegendChips from "@/components/shared/SeasonLegendChips";
import FlowerFamilyLegendChips from "@/components/shared/FlowerFamilyLegendChips";

type PageItem = {
  id: string;
  title: string | null;
  date: string;
  rating: number | null;
  mood_state: "wilted" | "healthy" | "shiny";
  element: "fire" | "water" | "air" | "earth" | "aether";
  plan_type_id: string | null;
  plan_type_label: string | null;
  plan_category: string | null;
  flower_family: FlowerFamily;
  flower_asset_path: string | null;
  flower_builder_config: import("@/lib/planTypeFlowerComposer").PlanFlowerComposerConfig | null;
  suggested_element: "fire" | "water" | "air" | "earth" | "aether";
  cover_photo_url: string | null;
  thumbnail_url: string | null;
  is_favorite: boolean;
};

export type YearChapterView = "seasons" | "sequence";
export type YearSequenceDensity = "comfortable" | "compact";

type SeasonSummary = {
  season: Season;
  total: number;
};

type SequenceGroup = {
  key: string;
  label: string;
  items: PageItem[];
};

type YearChaptersSectionProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  loading: boolean;
  items: PageItem[];
  chapterView: YearChapterView;
  onChapterViewChange: (value: YearChapterView) => void;
  sequenceQuery: string;
  onSequenceQueryChange: (value: string) => void;
  sequenceMonthFilter: "all" | string;
  onSequenceMonthFilterChange: (value: string) => void;
  sequenceMonthOptions: string[];
  sequenceFlowerFamilyFilter: "all" | FlowerFamily;
  onSequenceFlowerFamilyFilterChange: (value: "all" | FlowerFamily) => void;
  sequenceOnlyFavorites: boolean;
  onSequenceOnlyFavoritesChange: (value: boolean) => void;
  sequenceDensity: YearSequenceDensity;
  onSequenceDensityChange: (value: YearSequenceDensity) => void;
  filteredSequenceItems: PageItem[];
  hasActiveSequenceFilters: boolean;
  onResetSequenceFilters: () => void;
  sequenceGroups: SequenceGroup[];
  seasonSummaries: SeasonSummary[];
  activeSeason: Season | null;
  onActiveSeasonChange: (value: Season) => void;
  selectedSeasonItems: PageItem[];
  visibleSeasonItems: PageItem[];
  remainingSeasonItems: number;
  showAllSeasonPages: boolean;
  onShowAllSeasonPagesChange: (value: boolean) => void;
  onOpenPage: (pageId: string) => void;
  onOpenCreatePage: () => void;
  onOpenPlans: () => void;
  seasonTone: (season: Season) => { backgroundColor: string; borderColor: string };
  shortDate: (value: string) => string;
  monthLabel: (value: string) => string;
  pageFlowerIcon: (item: PageItem) => string | null;
};

function chipClass(active: boolean) {
  return active
    ? "lv-btn rounded-full border px-3 py-1 text-xs"
    : "lv-btn lv-btn-secondary rounded-full px-3 py-1 text-xs";
}

function activeChipStyle() {
  return {
    borderColor: "var(--lv-primary)",
    backgroundColor: "var(--lv-primary-soft)",
    color: "var(--lv-primary-strong)",
  };
}

function flowerFamilyToken(family: FlowerFamily) {
  if (family === "agua") return "Ag";
  if (family === "fuego") return "Fu";
  if (family === "tierra") return "Ti";
  if (family === "aire") return "Ai";
  if (family === "luz") return "Lz";
  if (family === "luna") return "Ln";
  return "Es";
}

function flowerFamilyLabel(family: FlowerFamily) {
  return FLOWER_FAMILY_LABELS[family] ?? FLOWER_FAMILY_LABELS.estrella;
}

function pageFamilySummary(item: Pick<PageItem, "plan_type_label" | "flower_family">) {
  const familyLabel = flowerFamilyLabel(item.flower_family);
  return item.plan_type_label ? `${item.plan_type_label} / ${familyLabel}` : familyLabel;
}

function ratingSummary(rating: number | null) {
  if (rating == null || rating <= 0) return "Sin valorar";
  const safe = Math.max(1, Math.min(5, Math.round(rating)));
  return `${safe}/5 estrellas`;
}

function ratingStars(rating: number | null) {
  if (rating == null || rating <= 0) return null;
  const safe = Math.max(1, Math.min(5, Math.round(rating)));
  return `${"★".repeat(safe)}${"☆".repeat(5 - safe)}`;
}

export default function YearChaptersSection({
  containerRef,
  loading,
  items,
  chapterView,
  onChapterViewChange,
  sequenceQuery,
  onSequenceQueryChange,
  sequenceMonthFilter,
  onSequenceMonthFilterChange,
  sequenceMonthOptions,
  sequenceFlowerFamilyFilter,
  onSequenceFlowerFamilyFilterChange,
  sequenceOnlyFavorites,
  onSequenceOnlyFavoritesChange,
  sequenceDensity,
  onSequenceDensityChange,
  filteredSequenceItems,
  hasActiveSequenceFilters,
  onResetSequenceFilters,
  sequenceGroups,
  seasonSummaries,
  activeSeason,
  onActiveSeasonChange,
  selectedSeasonItems,
  visibleSeasonItems,
  remainingSeasonItems,
  showAllSeasonPages,
  onShowAllSeasonPagesChange,
  onOpenPage,
  onOpenCreatePage,
  onOpenPlans,
  seasonTone,
  shortDate,
  monthLabel,
  pageFlowerIcon,
}: YearChaptersSectionProps) {
  return (
    <section ref={containerRef} className="lv-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Capítulos del año</h2>
          <p className="mt-1 text-sm text-[var(--lv-text-muted)]">
            Recorre el año por estaciones o en secuencia, con una lectura más editorial y menos
            ruidosa.
          </p>
        </div>
        <div className="text-sm text-[var(--lv-text-muted)]">{items.length} páginas</div>
      </div>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={chipClass(chapterView === "seasons")}
            style={chapterView === "seasons" ? activeChipStyle() : undefined}
            onClick={() => onChapterViewChange("seasons")}
          >
            Por estaciones
          </button>
          <button
            type="button"
            className={chipClass(chapterView === "sequence")}
            style={chapterView === "sequence" ? activeChipStyle() : undefined}
            onClick={() => onChapterViewChange("sequence")}
          >
            Recorrido
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SeasonLegendChips className="justify-start" />
          <FlowerFamilyLegendChips className="justify-start" />
        </div>
      </div>

      {chapterView === "sequence" ? (
        <div className="lv-card-soft mt-4 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="lv-input min-w-[220px] flex-1 text-sm"
              placeholder="Buscar por título, mes, tipo o flor..."
              value={sequenceQuery}
              onChange={(event) => onSequenceQueryChange(event.target.value)}
            />
            <select
              className="lv-select min-w-[180px] text-sm"
              value={sequenceMonthFilter}
              onChange={(event) => onSequenceMonthFilterChange(event.target.value)}
            >
              <option value="all">Todos los meses</option>
              {sequenceMonthOptions.map((month) => (
                <option key={month} value={month}>
                  {monthLabel(month)}
                </option>
              ))}
            </select>
            <select
              className="lv-select min-w-[190px] text-sm"
              value={sequenceFlowerFamilyFilter}
              onChange={(event) =>
                onSequenceFlowerFamilyFilterChange(
                  event.target.value as "all" | FlowerFamily,
                )
              }
            >
              <option value="all">Todas las flores</option>
              {FLOWER_FAMILY_ORDER.map((family) => (
                <option key={`year-sequence-family-${family}`} value={family}>
                  {flowerFamilyLabel(family)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="lv-btn lv-btn-secondary px-3 py-2 text-sm"
              style={
                sequenceOnlyFavorites
                  ? {
                      borderColor: "var(--lv-warning)",
                      backgroundColor: "var(--lv-warning-soft)",
                      color: "var(--lv-warning)",
                    }
                  : undefined
              }
              onClick={() => onSequenceOnlyFavoritesChange(!sequenceOnlyFavorites)}
            >
              Solo favoritas
            </button>
            <div className="inline-flex items-center gap-1 rounded-full border border-[var(--lv-border)] bg-white p-1">
              <button
                type="button"
                className={chipClass(sequenceDensity === "comfortable")}
                style={sequenceDensity === "comfortable" ? activeChipStyle() : undefined}
                onClick={() => onSequenceDensityChange("comfortable")}
              >
                Detallada
              </button>
              <button
                type="button"
                className={chipClass(sequenceDensity === "compact")}
                style={sequenceDensity === "compact" ? activeChipStyle() : undefined}
                onClick={() => onSequenceDensityChange("compact")}
              >
                Compacta
              </button>
            </div>
            <span className="lv-badge bg-white px-3 py-1 text-xs">
              {filteredSequenceItems.length} resultado(s)
            </span>
            {hasActiveSequenceFilters ? (
              <button
                type="button"
                className="lv-btn lv-btn-secondary rounded-full px-3 py-1 text-xs"
                onClick={onResetSequenceFilters}
              >
                Limpiar filtros
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-4 text-sm text-[var(--lv-text-muted)]">Cargando capítulos...</div>
      ) : items.length === 0 ? (
        <div className="lv-card-soft mt-4 space-y-3 p-4 text-sm text-[var(--lv-text-muted)]">
          <div>Este año todavía no tiene páginas.</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="lv-btn lv-btn-secondary text-xs"
              onClick={onOpenCreatePage}
            >
              Escribir la primera página
            </button>
            <button
              type="button"
              className="lv-btn lv-btn-secondary text-xs"
              onClick={onOpenPlans}
            >
              Abrir planes
            </button>
          </div>
        </div>
      ) : chapterView === "sequence" ? (
        <div className="mt-4 space-y-3">
          {!filteredSequenceItems.length ? (
            <div className="lv-card-soft mt-4 space-y-3 p-4 text-sm text-[var(--lv-text-muted)]">
              <div>No hay páginas con los filtros actuales.</div>
              {hasActiveSequenceFilters ? (
                <button
                  type="button"
                  className="lv-btn lv-btn-secondary text-xs"
                  onClick={onResetSequenceFilters}
                >
                  Limpiar filtros del recorrido
                </button>
              ) : null}
            </div>
          ) : (
            <div className="relative space-y-3 pl-4 sm:pl-6">
              <div className="pointer-events-none absolute bottom-0 left-2 top-0 w-px bg-[var(--lv-border)] sm:left-3" />
              {sequenceGroups.map((group) => (
                <div
                  key={`sequence-group-${group.key}`}
                  id={`sequence-month-${group.key}`}
                  className="lv-card-soft relative p-4"
                >
                  <div className="pointer-events-none absolute -left-[0.7rem] top-6 h-3 w-3 rounded-full border bg-[var(--lv-primary-soft)] sm:-left-[0.83rem]" />
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="font-semibold capitalize">{group.label}</div>
                    <div className="text-xs text-[var(--lv-text-muted)]">
                      {group.items.length} páginas
                    </div>
                  </div>
                  <div className={sequenceDensity === "compact" ? "space-y-1.5" : "space-y-2"}>
                    {group.items.map((item) => (
                      <button
                        key={`sequence-item-${item.id}`}
                        type="button"
                        onClick={() => onOpenPage(item.id)}
                        className={`lv-card w-full bg-white text-left transition hover:shadow-md ${
                          sequenceDensity === "compact" ? "p-2.5" : "p-3"
                        }`}
                      >
                        <div className="flex flex-wrap items-start gap-3 sm:flex-nowrap">
                          {pageFlowerIcon(item) ? (
                            <div
                              className={`flex flex-none items-center justify-center rounded-xl border bg-[var(--lv-bg-soft)] ${
                                sequenceDensity === "compact" ? "h-14 w-14 p-2" : "h-16 w-16 p-2.5"
                              }`}
                            >
                              <img
                                src={pageFlowerIcon(item) ?? undefined}
                                alt=""
                                className="h-full w-full object-contain"
                              />
                            </div>
                          ) : (
                            <div
                              className={`flex flex-none items-center justify-center rounded-xl border bg-[var(--lv-bg-soft)] font-semibold ${
                                sequenceDensity === "compact"
                                  ? "h-14 w-14 text-base"
                                  : "h-16 w-16 text-lg"
                              }`}
                            >
                              {flowerFamilyToken(item.flower_family)}
                            </div>
                          )}
                          <div className="min-w-[220px] flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div
                                className={
                                  sequenceDensity === "compact"
                                    ? "text-sm font-medium"
                                    : "font-medium"
                                }
                              >
                                {item.title ?? "Página sin título"}
                              </div>
                              {item.is_favorite ? (
                                <span
                                  className="lv-badge px-2 py-0.5 text-[11px]"
                                  style={{
                                    borderColor: "var(--lv-warning)",
                                    backgroundColor: "var(--lv-warning-soft)",
                                    color: "var(--lv-warning)",
                                  }}
                                >
                                  Favorita
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-1 text-xs text-[var(--lv-text-muted)]">
                              {shortDate(item.date)} / {pageFamilySummary(item)}
                            </div>
                            {item.rating != null ? (
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--lv-text-muted)]">
                                <span aria-hidden="true" className="tracking-[0.08em] text-[#7a6320]">
                                  {ratingStars(item.rating)}
                                </span>
                                <span>{ratingSummary(item.rating)}</span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {seasonSummaries.map((summary) => (
              <button
                key={`season-summary-${summary.season}`}
                type="button"
                onClick={() => {
                  onActiveSeasonChange(summary.season);
                  onShowAllSeasonPagesChange(false);
                }}
                className="lv-card p-4 text-left transition hover:brightness-[0.99]"
                style={
                  activeSeason === summary.season
                    ? {
                        ...seasonTone(summary.season),
                        boxShadow: "0 10px 22px rgba(52, 76, 40, 0.08)",
                      }
                    : {
                        backgroundColor: "var(--lv-surface)",
                        borderColor: "var(--lv-border)",
                      }
                }
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="lv-badge bg-white/88 px-2.5 py-1 text-xs font-medium">
                    {getSeasonLabel(summary.season)}
                  </div>
                  <div className="text-sm font-medium text-[var(--lv-text-muted)]">
                    {summary.total} páginas
                  </div>
                </div>
                <div className="mt-4 text-sm text-[var(--lv-text-muted)]">
                  {summary.total === 0
                    ? "Sin páginas todavía"
                    : activeSeason === summary.season
                      ? "Estación abierta"
                      : "Abrir estación"}
                </div>
              </button>
            ))}
          </div>

          {activeSeason ? (
            <div className="lv-card mt-5 p-4" style={seasonTone(activeSeason)}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.12em] opacity-60">
                    Estación activa
                  </div>
                  <h3 className="mt-1 text-lg font-semibold">{getSeasonLabel(activeSeason)}</h3>
                  <div className="mt-1 text-sm text-[var(--lv-text-muted)]">
                    Selección inicial de las páginas de esta estación.
                  </div>
                </div>
                <div className="text-sm text-[var(--lv-text-muted)]">
                  {selectedSeasonItems.length} páginas
                </div>
              </div>

              {selectedSeasonItems.length === 0 ? (
                <div className="lv-card-soft mt-4 bg-white/80 p-4 text-sm text-[var(--lv-text-muted)]">
                  No hay páginas en esta estación.
                </div>
              ) : (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                    {visibleSeasonItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => onOpenPage(item.id)}
                        className="lv-card overflow-hidden bg-white text-left transition hover:shadow-md"
                        title="Abrir pagina"
                      >
                        {pageFlowerIcon(item) ? (
                          <div
                            className="flex h-24 w-full items-center justify-center"
                            style={{
                              background:
                                "radial-gradient(circle at 20% 18%, rgba(255,255,255,0.38), transparent 28%), linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.02)), linear-gradient(180deg, #eef4e7 0%, #dfead2 100%)",
                            }}
                          >
                            <img
                              src={pageFlowerIcon(item) ?? undefined}
                              alt=""
                              className="h-16 w-16 object-contain"
                            />
                          </div>
                        ) : (
                          <div
                            className="flex h-24 w-full items-center justify-center"
                            style={{
                              background:
                                "radial-gradient(circle at 20% 18%, rgba(255,255,255,0.38), transparent 28%), linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.02)), linear-gradient(180deg, #eef4e7 0%, #dfead2 100%)",
                            }}
                          >
                            <div className="rounded-full border bg-white px-3 py-1 text-xs font-medium">
                              {pageFamilySummary(item)}
                            </div>
                          </div>
                        )}
                        <div className="p-4">
                          <div className="line-clamp-2 font-semibold">
                            {item.title ?? "Página sin título"}
                          </div>
                          <div className="mt-1 text-sm text-[var(--lv-text-muted)]">
                            {shortDate(item.date)}
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                            <span className="lv-badge bg-[var(--lv-surface-soft)] px-2.5 py-1">
                              {pageFamilySummary(item)}
                            </span>
                            {item.rating != null ? (
                              <span className="lv-badge flex items-center gap-2 bg-[var(--lv-surface-soft)] px-2.5 py-1">
                                <span aria-hidden="true" className="tracking-[0.08em] text-[#7a6320]">
                                  {ratingStars(item.rating)}
                                </span>
                                <span>{ratingSummary(item.rating)}</span>
                              </span>
                            ) : null}
                            {item.is_favorite ? (
                              <span
                                className="lv-badge px-2.5 py-1"
                                style={{
                                  borderColor: "var(--lv-warning)",
                                  backgroundColor: "var(--lv-warning-soft)",
                                  color: "var(--lv-warning)",
                                }}
                              >
                                Favorita
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {remainingSeasonItems > 0 && !showAllSeasonPages ? (
                    <div className="lv-card-soft mt-4 flex flex-wrap items-center justify-between gap-3 bg-white/80 p-4 text-sm">
                      <div className="text-[var(--lv-text-muted)]">
                        Quedan {remainingSeasonItems} páginas más en{" "}
                        {getSeasonLabel(activeSeason)}.
                      </div>
                      <button
                        type="button"
                        className="lv-btn lv-btn-secondary"
                        onClick={() => onShowAllSeasonPagesChange(true)}
                      >
                        Ver todas
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
