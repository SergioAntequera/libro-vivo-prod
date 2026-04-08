"use client";

import { useMemo, useState } from "react";
import type { PathEvent } from "@/components/home/useHomeTrailEvents";
import {
  eventKindLabel,
  parseIsoLocal,
  seasonFromIso,
  sortEventsForDisplay,
  type HomeSeasonTone,
} from "@/lib/homePageUtils";

type MonthCounts = Record<"seed" | "sprout" | "flower" | "tree", number>;
type MonthRow = {
  key: string;
  label: string;
  season: HomeSeasonTone;
  items: PathEvent[];
  counts: MonthCounts;
  featured: PathEvent | null;
};

type SeasonGroup = {
  tone: HomeSeasonTone;
  label: string;
  summary: string;
  count: number;
  months: MonthRow[];
};

const SEASON_ORDER: HomeSeasonTone[] = ["spring", "summer", "autumn", "winter"];

const SEASON_META: Record<
  HomeSeasonTone,
  { label: string; accent: string; surface: string; text: string }
> = {
  spring: {
    label: "Primavera",
    accent: "#99c789",
    surface: "linear-gradient(135deg, rgba(231,244,223,0.94), rgba(250,252,245,0.96))",
    text: "#35543a",
  },
  summer: {
    label: "Verano",
    accent: "#e9bf66",
    surface: "linear-gradient(135deg, rgba(251,239,208,0.96), rgba(253,249,237,0.96))",
    text: "#6e5727",
  },
  autumn: {
    label: "Otoño",
    accent: "#db9f69",
    surface: "linear-gradient(135deg, rgba(248,230,214,0.96), rgba(252,246,239,0.96))",
    text: "#764c2d",
  },
  winter: {
    label: "Invierno",
    accent: "#9fb7d4",
    surface: "linear-gradient(135deg, rgba(232,239,248,0.96), rgba(248,250,253,0.96))",
    text: "#46607b",
  },
};

function monthLabel(iso: string) {
  return parseIsoLocal(iso)
    .toLocaleDateString("es-ES", { month: "long" })
    .replace(/^\w/, (char) => char.toUpperCase());
}

function zeroCounts(): MonthCounts {
  return { seed: 0, sprout: 0, flower: 0, tree: 0 };
}

function describeCounts(counts: MonthCounts) {
  const parts: string[] = [];
  if (counts.seed) parts.push(`${counts.seed} semilla${counts.seed > 1 ? "s" : ""}`);
  if (counts.sprout) parts.push(`${counts.sprout} brote${counts.sprout > 1 ? "s" : ""}`);
  if (counts.flower) parts.push(`${counts.flower} flor${counts.flower > 1 ? "es" : ""}`);
  if (counts.tree) parts.push(`${counts.tree} hito${counts.tree > 1 ? "s" : ""}`);
  if (!parts.length) return "Mes tranquilo";
  return parts.join(" - ");
}

function monthHighlight(month: MonthRow) {
  if (!month.featured) return "Mes tranquilo";
  return `${eventKindLabel(month.featured.kind)} - ${month.featured.title}`;
}

function starsLabel(rating: number | null | undefined) {
  const safe = Number.isFinite(Number(rating)) ? Math.max(0, Math.min(5, Number(rating))) : 0;
  if (safe <= 0) return null;
  return `${"★".repeat(safe)}${safe < 5 ? "☆".repeat(5 - safe) : ""}`;
}

function renderSeasonGroup(
  season: SeasonGroup,
  openMonthKey: string | null,
  onToggleMonth: (monthKey: string) => void,
  onEventClick: (event: PathEvent) => void,
) {
  const meta = SEASON_META[season.tone];

  return (
    <section
      key={season.tone}
      className="rounded-[24px] border p-3 sm:p-4"
      style={{
        borderColor: meta.accent,
        background: meta.surface,
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div
            className="inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
            style={{
              borderColor: meta.accent,
              color: meta.text,
              background: "color-mix(in srgb, var(--lv-surface) 78%, transparent)",
            }}
          >
            {meta.label}
          </div>
          <div className="mt-2 text-sm text-[var(--lv-text-muted)]">{season.summary}</div>
        </div>
        <div className="rounded-full border bg-[var(--lv-surface)] px-3 py-1.5 text-sm font-medium text-[var(--lv-text)]">
          {season.months.length} mes{season.months.length > 1 ? "es" : ""}
        </div>
      </div>

      {season.months.length ? (
        <div className="mt-3 space-y-2">
          {season.months.map((month) => {
            const isOpen = openMonthKey === month.key;
            return (
              <div key={month.key} className="rounded-[20px] border bg-[var(--lv-surface)] p-3 shadow-[var(--lv-shadow-sm)]">
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-3 text-left"
                  onClick={() => onToggleMonth(month.key)}
                  aria-expanded={isOpen}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-semibold">{month.label}</div>
                      <span className="lv-badge">
                        {month.items.length} momento{month.items.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-[var(--lv-text-muted)]">{describeCounts(month.counts)}</div>
                    <div className="mt-2 text-sm font-medium text-[var(--lv-text)]">
                      {monthHighlight(month)}
                    </div>
                    {month.featured ? (
                      <div className="mt-3 rounded-[16px] border bg-[var(--lv-surface-soft)] p-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[14px] border bg-[var(--lv-surface)]">
                            <img
                              src={month.featured.iconSrc}
                              alt=""
                              className="h-10 w-10 object-contain"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="lv-badge bg-[var(--lv-surface)]">
                                {parseIsoLocal(month.featured.date).toLocaleDateString("es-ES")}
                              </span>
                              <span className="lv-badge bg-[var(--lv-surface)]">
                                {eventKindLabel(month.featured.kind)}
                              </span>
                              {month.featured.isFavorite ? (
                                <span className="lv-badge bg-[var(--lv-warning-soft)] text-[var(--lv-warning)]">Favorita</span>
                              ) : null}
                            </div>
                            {month.featured.previewSnippet ? (
                              <div className="mt-2 line-clamp-2 text-sm text-[var(--lv-text-muted)]">
                                {month.featured.previewSnippet}
                              </div>
                            ) : null}
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--lv-text-muted)]">
                              {month.featured.locationLabel ? (
                                <span>{month.featured.locationLabel}</span>
                              ) : null}
                              {starsLabel(month.featured.rating) ? (
                                <span>{starsLabel(month.featured.rating)}</span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <span className="rounded-full border bg-[var(--lv-surface)] px-3 py-1.5 text-xs font-medium text-[var(--lv-text)]">
                    {isOpen ? "Ocultar" : "Ver"}
                  </span>
                </button>

                {isOpen ? (
                  <div className="mt-3 space-y-2 border-t pt-3">
                    {month.items.slice(0, 4).map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        className="flex w-full items-start justify-between gap-3 rounded-[16px] border bg-[var(--lv-surface-soft)] px-3 py-3 text-left transition hover:-translate-y-[1px]"
                        onClick={() => onEventClick(event)}
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[12px] border bg-[var(--lv-surface)]">
                            <img src={event.iconSrc} alt="" className="h-8 w-8 object-contain" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{event.title}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--lv-text-muted)]">
                              <span>{parseIsoLocal(event.date).toLocaleDateString("es-ES")}</span>
                              {event.locationLabel ? <span>{event.locationLabel}</span> : null}
                            </div>
                            {event.previewSnippet ? (
                              <div className="mt-1 line-clamp-2 text-xs text-[var(--lv-text-muted)]">
                                {event.previewSnippet}
                              </div>
                            ) : null}
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--lv-text-muted)]">
                              {event.isFavorite ? (
                                <span className="lv-badge bg-[var(--lv-warning-soft)] text-[var(--lv-warning)]">Favorita</span>
                              ) : null}
                              {starsLabel(event.rating) ? <span>{starsLabel(event.rating)}</span> : null}
                            </div>
                          </div>
                        </div>
                        <span className="lv-badge shrink-0">{eventKindLabel(event.kind)}</span>
                      </button>
                    ))}
                    {month.items.length > 4 ? (
                      <div className="px-1 text-xs text-[var(--lv-text-muted)]">
                        +{month.items.length - 4} momento(s) mas en {month.label.toLowerCase()}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 rounded-[18px] border bg-[var(--lv-surface)] px-4 py-4 text-sm text-[var(--lv-text-muted)]">
          Esta estacion esta tranquila por ahora.
        </div>
      )}
    </section>
  );
}

type SeasonFilter = "all" | HomeSeasonTone;

const FILTER_OPTIONS: { value: SeasonFilter; label: string }[] = [
  { value: "all", label: "Todo" },
  { value: "spring", label: "Primavera" },
  { value: "summer", label: "Verano" },
  { value: "autumn", label: "Otoño" },
  { value: "winter", label: "Invierno" },
];

export default function HomePathSummaryView({
  events,
  selectedYearValue,
  activeSeason,
  onEventClick,
}: {
  events: PathEvent[];
  selectedYearValue: string;
  activeSeason: HomeSeasonTone;
  onEventClick: (event: PathEvent) => void;
}) {
  const viewContextKey = `${selectedYearValue}:${activeSeason}`;
  const [openMonthKeyState, setOpenMonthKeyState] = useState<{
    contextKey: string;
    value: string | null;
  }>({
    contextKey: viewContextKey,
    value: null,
  });
  const [seasonFilterState, setSeasonFilterState] = useState<{
    contextKey: string;
    value: SeasonFilter;
  }>({
    contextKey: viewContextKey,
    value: "all",
  });
  const openMonthKey =
    openMonthKeyState.contextKey === viewContextKey ? openMonthKeyState.value : null;
  const seasonFilter =
    seasonFilterState.contextKey === viewContextKey ? seasonFilterState.value : "all";

  const { totalCounts, seasonGroups, strongestSeason, annualSummary } = useMemo(() => {
    const monthMap = new Map<string, MonthRow>();
    const seasonCountMap: Record<HomeSeasonTone, number> = {
      spring: 0,
      summer: 0,
      autumn: 0,
      winter: 0,
    };
    const total = zeroCounts();

    for (const event of [...events].sort((left, right) => left.date.localeCompare(right.date))) {
      const key = event.date.slice(0, 7);
      const season = seasonFromIso(event.date);
      const current = monthMap.get(key) ?? {
        key,
        label: monthLabel(event.date),
        season,
        items: [],
        counts: zeroCounts(),
        featured: null,
      };

      current.items.push(event);
      current.counts[event.kind] += 1;
      monthMap.set(key, current);
      seasonCountMap[season] += 1;
      total[event.kind] += 1;
    }

    const seasonGroupsInternal: Record<HomeSeasonTone, SeasonGroup> = {
      spring: { tone: "spring", label: "Primavera", summary: "", count: 0, months: [] },
      summer: { tone: "summer", label: "Verano", summary: "", count: 0, months: [] },
      autumn: { tone: "autumn", label: "Otoño", summary: "", count: 0, months: [] },
      winter: { tone: "winter", label: "Invierno", summary: "", count: 0, months: [] },
    };

    for (const month of monthMap.values()) {
      month.featured = sortEventsForDisplay(month.items)[0] ?? null;
      seasonGroupsInternal[month.season].months.push(month);
      seasonGroupsInternal[month.season].count += month.items.length;
    }

    const groups = SEASON_ORDER.map((tone) => {
      const group = seasonGroupsInternal[tone];
      group.months.sort((left, right) => left.key.localeCompare(right.key));
      group.summary = group.count
        ? `${group.count} momento${group.count > 1 ? "s" : ""} en ${group.months.length} mes${group.months.length > 1 ? "es" : ""}`
        : "Sin movimiento";
      return group;
    });

    const strongest = SEASON_ORDER.reduce<HomeSeasonTone>((best, tone) => {
      return seasonCountMap[tone] > seasonCountMap[best] ? tone : best;
    }, "spring");

    const summaryParts: string[] = [];
    if (total.flower) summaryParts.push(`${total.flower} flor${total.flower > 1 ? "es" : ""}`);
    if (total.sprout) summaryParts.push(`${total.sprout} brote${total.sprout > 1 ? "s" : ""}`);
    if (total.seed) summaryParts.push(`${total.seed} semilla${total.seed > 1 ? "s" : ""}`);
    if (total.tree) summaryParts.push(`${total.tree} hito${total.tree > 1 ? "s" : ""}`);

    return {
      totalCounts: total,
      seasonGroups: groups,
      strongestSeason: strongest,
      annualSummary: summaryParts.length ? summaryParts.join(" - ") : "Año tranquilo por ahora",
    };
  }, [events]);

  const seasonGroupsByTone = useMemo(() => {
    const map = new Map<HomeSeasonTone, SeasonGroup>();
    seasonGroups.forEach((group) => map.set(group.tone, group));
    return map;
  }, [seasonGroups]);

  function toggleMonth(monthKey: string) {
    setOpenMonthKeyState((current) => {
      const currentValue = current.contextKey === viewContextKey ? current.value : null;
      return {
        contextKey: viewContextKey,
        value: currentValue === monthKey ? null : monthKey,
      };
    });
  }

  return (
    <section className="lv-card p-4 sm:p-5">
      <div className="rounded-[24px] border bg-[var(--lv-surface-soft)] p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
          Camino de {selectedYearValue}
        </div>
        <div className="mt-1 text-lg font-semibold">Así se movió vuestro año</div>
        <p className="mt-1 text-sm text-[var(--lv-text-muted)]">
          {annualSummary}. Estación más viva: {SEASON_META[strongestSeason].label.toLowerCase()}.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-[18px] border bg-[var(--lv-surface)] px-3 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
              Total
            </div>
            <div className="mt-1 text-lg font-semibold">{events.length}</div>
          </div>
          <div className="rounded-[18px] border bg-[var(--lv-surface)] px-3 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
              Flores
            </div>
            <div className="mt-1 text-lg font-semibold">{totalCounts.flower}</div>
          </div>
          <div className="rounded-[18px] border bg-[var(--lv-surface)] px-3 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
              Brotes
            </div>
            <div className="mt-1 text-lg font-semibold">{totalCounts.sprout}</div>
          </div>
          <div className="rounded-[18px] border bg-[var(--lv-surface)] px-3 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
              Hitos
            </div>
            <div className="mt-1 text-lg font-semibold">{totalCounts.tree}</div>
          </div>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="mt-4 rounded-[20px] border bg-[var(--lv-surface-soft)] px-4 py-4 text-sm text-[var(--lv-text-muted)]">
          Aun no hay eventos para este año.
        </div>
      ) : (
        <>
          <div className="sticky top-0 z-10 -mx-4 bg-[var(--lv-surface)] px-4 pb-2 pt-3 sm:-mx-5 sm:px-5">
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {FILTER_OPTIONS.map((option) => {
                const isActive = seasonFilter === option.value;
                const meta = option.value !== "all" ? SEASON_META[option.value] : null;
                const count =
                  option.value === "all"
                    ? events.length
                    : seasonGroupsByTone.get(option.value)?.count ?? 0;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                      isActive
                        ? "shadow-[var(--lv-shadow-sm)]"
                        : "bg-[var(--lv-surface)] text-[var(--lv-text-muted)]"
                    }`}
                    style={{
                      borderColor: isActive
                        ? meta?.accent ?? "var(--lv-primary)"
                        : "var(--lv-border)",
                      background: isActive
                        ? meta?.surface ?? "var(--lv-primary)"
                        : "var(--lv-surface)",
                      color: isActive
                        ? meta?.text ?? "#fff"
                        : "var(--lv-text-muted)",
                    }}
                    onClick={() => {
                      setSeasonFilterState({
                        contextKey: viewContextKey,
                        value: option.value,
                      });
                      setOpenMonthKeyState({
                        contextKey: viewContextKey,
                        value: null,
                      });
                    }}
                    aria-pressed={isActive}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {isActive && meta ? (
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: meta.accent }}
                        />
                      ) : null}
                      {option.label}
                      {count > 0 ? (
                        <span className="rounded-full bg-[var(--lv-surface)] px-1.5 py-0.5 text-[11px] leading-none text-[var(--lv-text-muted)]">
                          {count}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-2 space-y-4">
            {seasonGroups
              .filter(
                (season) =>
                  season.count > 0 &&
                  (seasonFilter === "all" || season.tone === seasonFilter),
              )
              .map((season) =>
                renderSeasonGroup(season, openMonthKey, toggleMonth, onEventClick),
              )}
          </div>
        </>
      )}
    </section>
  );
}
