import { formatActivityUnseenLabel } from "@/lib/activityPresentation";

export default function HomeHillMobileTeaser({
  selectedYearValue,
  seasonLabel,
  focusDayLabel,
  focusKindLabel,
  annualTreeLabel,
  todaySummary,
  focusSnippet,
  focusLocation,
  activityUnseenCount,
  focusActionLabel,
  onOpenFocus,
  onOpenPathSummary,
  onOpenHill,
}: {
  selectedYearValue: string;
  seasonLabel: string;
  focusDayLabel: string;
  focusKindLabel: string;
  annualTreeLabel: string;
  todaySummary: string;
  focusSnippet: string | null;
  focusLocation: string | null;
  activityUnseenCount: number;
  focusActionLabel?: string;
  onOpenFocus?: () => void;
  onOpenPathSummary: () => void;
  onOpenHill: () => void;
}) {
  return (
    <section data-home-tour="daily-focus" className="lv-card p-4 md:hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
            Hoy en vuestro jardin
          </div>
          <p className="mt-1 text-sm text-[var(--lv-text-muted)]">
            Desde aqui decides si hoy toca abrir la flor, recorrer el sendero o subir a la colina.
          </p>
        </div>
        <span
          className="rounded-full border px-3 py-1 text-xs font-semibold text-[var(--lv-text)]"
          style={{ borderColor: "var(--lv-border)", background: "var(--lv-bg-soft)" }}
        >
          {formatActivityUnseenLabel(activityUnseenCount, { compact: true })}
        </span>
      </div>

      <div className="mt-3 grid gap-2">
        <div
          className="border px-3 py-3"
          style={{
            borderRadius: "var(--lv-radius-md)",
            borderColor: "var(--lv-border)",
            background: "var(--lv-bg-soft)",
          }}
        >
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--lv-text-muted)]">
            <span className="lv-badge bg-[var(--lv-surface)]">{focusDayLabel}</span>
            <span className="lv-badge bg-[var(--lv-surface)]">{seasonLabel}</span>
            <span className="lv-badge bg-[var(--lv-surface)]">Año {selectedYearValue}</span>
            <span className="lv-badge bg-[var(--lv-warning-soft)] text-[var(--lv-warning)]">
              {focusKindLabel}
            </span>
          </div>
          <div className="mt-3 text-lg font-semibold leading-tight text-[var(--lv-text)]">
            {todaySummary}
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--lv-text-muted)]">
            {focusSnippet?.trim() ||
              "Este es el momento principal del dia dentro de vuestra historia compartida."}
          </p>
          {focusLocation ? (
            <div className="mt-2 text-xs uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
              {focusLocation}
            </div>
          ) : null}

          <div className="mt-4 flex flex-col gap-2">
            {onOpenFocus ? (
              <button className="lv-btn lv-btn-primary w-full justify-center" onClick={onOpenFocus}>
                {focusActionLabel ?? "Abrir momento del dia"}
              </button>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <button
                className="lv-btn lv-btn-secondary w-full justify-center"
                onClick={onOpenPathSummary}
              >
                Abrir sendero
              </button>
              <button className="lv-btn lv-btn-secondary w-full justify-center" onClick={onOpenHill}>
                Abrir colina
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div
            className="border px-3 py-3"
            style={{
              borderRadius: "var(--lv-radius-md)",
              borderColor: "var(--lv-border)",
              background: "var(--lv-bg-soft)",
            }}
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
              Arbol anual
            </div>
            <div className="mt-1 text-sm font-semibold leading-snug">{annualTreeLabel}</div>
          </div>
          <div
            className="border px-3 py-3"
            style={{
              borderRadius: "var(--lv-radius-md)",
              borderColor: "var(--lv-border)",
              background: "var(--lv-bg-soft)",
            }}
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
              Actividad
            </div>
            <div className="mt-1 text-sm font-semibold leading-snug">
              {formatActivityUnseenLabel(activityUnseenCount, { compact: true })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
