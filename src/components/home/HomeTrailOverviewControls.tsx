"use client";

import YearSelector from "@/components/shared/YearSelector";

export default function HomeTrailOverviewControls({
  focusDateLabel,
  seasonTone,
  seasonLabel,
  seasonBorderColor,
  onCenterToday,
  jumpDate,
  onJumpDateChange,
  onJumpToDate,
  onResetView,
  selectedYearValue,
  availableYears,
  onYearChange,
  viewMode,
  onViewModeChange,
  onOpenHillImmersive,
  showImmersiveButton = false,
  compactMobileHill = false,
}: {
  focusDateLabel: string;
  seasonTone: "spring" | "summer" | "autumn" | "winter";
  seasonLabel: string;
  seasonBorderColor: string;
  onCenterToday: () => void;
  jumpDate: string;
  onJumpDateChange: (value: string) => void;
  onJumpToDate: () => void;
  onResetView: () => void;
  selectedYearValue: string;
  availableYears: number[];
  onYearChange: (year: number) => void;
  viewMode: "hill" | "path";
  onViewModeChange: (mode: "hill" | "path") => void;
  onOpenHillImmersive: () => void;
  showImmersiveButton?: boolean;
  compactMobileHill?: boolean;
}) {
  const isCompactHillView = compactMobileHill && viewMode === "hill";
  const seasonAccent =
    seasonTone === "autumn"
      ? "linear-gradient(135deg, rgba(247,226,204,0.9), rgba(245,238,225,0.78))"
      : seasonTone === "winter"
        ? "linear-gradient(135deg, rgba(227,236,247,0.9), rgba(244,247,250,0.78))"
        : seasonTone === "summer"
          ? "linear-gradient(135deg, rgba(250,239,205,0.9), rgba(247,244,232,0.76))"
          : "linear-gradient(135deg, rgba(229,243,220,0.9), rgba(244,247,238,0.76))";

  return (
    <>
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] text-[var(--lv-text-muted)] sm:text-sm">Nuestra historia</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <div className="text-base font-semibold capitalize leading-tight md:text-xl">
              {focusDateLabel}
            </div>
            <span
              className="rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--lv-text)] shadow-[var(--lv-shadow-sm)] sm:text-[11px]"
              style={{
                borderColor: seasonBorderColor,
                background: seasonAccent,
              }}
            >
              {seasonLabel}
            </span>
          </div>
        </div>

        <div className="flex w-full flex-col items-start gap-1 md:w-auto md:items-end">
          <div className="inline-flex w-full rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)]/95 p-1 shadow-[var(--lv-shadow-sm)] md:w-auto">
            <button
              type="button"
              aria-pressed={viewMode === "hill"}
              className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition md:flex-none ${
                viewMode === "hill"
                  ? "border bg-[var(--lv-primary-soft)] text-[var(--lv-primary-strong)] shadow-[var(--lv-shadow-sm)]"
                  : "border border-transparent text-[var(--lv-text-muted)] hover:bg-[var(--lv-bg-soft)]"
              }`}
              style={viewMode === "hill" ? { borderColor: "color-mix(in srgb, var(--lv-primary) 22%, white)" } : undefined}
              onClick={() => onViewModeChange("hill")}
            >
              <span className="inline-flex items-center gap-2">
                {viewMode === "hill" ? (
                  <span className="h-2 w-2 rounded-full bg-[var(--lv-primary)]" />
                ) : null}
                Colina
              </span>
            </button>
            <button
              type="button"
              aria-pressed={viewMode === "path"}
              className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition md:flex-none ${
                viewMode === "path"
                  ? "border bg-[var(--lv-primary-soft)] text-[var(--lv-primary-strong)] shadow-[var(--lv-shadow-sm)]"
                  : "border border-transparent text-[var(--lv-text-muted)] hover:bg-[var(--lv-bg-soft)]"
              }`}
              style={viewMode === "path" ? { borderColor: "color-mix(in srgb, var(--lv-primary) 22%, white)" } : undefined}
              onClick={() => onViewModeChange("path")}
            >
              <span className="inline-flex items-center gap-2">
                {viewMode === "path" ? (
                  <span className="h-2 w-2 rounded-full bg-[var(--lv-primary)]" />
                ) : null}
                Camino
              </span>
            </button>
          </div>
          <div className="px-1 text-[11px] text-[var(--lv-text-muted)] md:hidden">
            {viewMode === "hill"
              ? "Escena anual inmersiva"
              : "Resumen del año por meses"}
          </div>
          {viewMode === "hill" && showImmersiveButton && !compactMobileHill ? (
            <button className="lv-btn lv-btn-secondary md:hidden" onClick={onOpenHillImmersive}>
              Pantalla completa
            </button>
          ) : null}
        </div>
      </div>

      {isCompactHillView ? null : (
        <div
          className="lv-card-soft mt-3 p-3 sm:p-3.5"
          style={{
            background: seasonAccent,
            borderColor: seasonBorderColor,
          }}
        >
          {viewMode === "path" ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-[var(--lv-text-muted)]">
                Elige el año que quieres revisar en el camino mensual.
              </div>
              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <div className="text-sm text-[var(--lv-text-muted)]">Año del camino</div>
                <YearSelector
                  compact
                  className="shrink-0"
                  value={selectedYearValue}
                  years={availableYears}
                  onChange={(next) => onYearChange(Number(next))}
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
              <div className="flex flex-wrap items-center gap-2">
                <button className="lv-btn lv-btn-secondary" onClick={onCenterToday}>
                  Hoy
                </button>
                <input
                  type="date"
                  className="lv-input min-w-[11rem] flex-[1_1_240px] py-2 text-sm"
                  value={jumpDate}
                  onChange={(e) => onJumpDateChange(e.target.value)}
                />
                <button className="lv-btn lv-btn-secondary" onClick={onJumpToDate}>
                  Ir al dia
                </button>
                <button className="lv-btn lv-btn-ghost" onClick={onResetView}>
                  Reset vista
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <div className="text-sm text-[var(--lv-text-muted)]">Año de la colina</div>
                <YearSelector
                  compact
                  className="shrink-0"
                  value={selectedYearValue}
                  years={availableYears}
                  onChange={(next) => onYearChange(Number(next))}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
