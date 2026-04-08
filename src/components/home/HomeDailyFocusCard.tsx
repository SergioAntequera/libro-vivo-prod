import { formatActivityUnseenLabel } from "@/lib/activityPresentation";

type HomeDailyFocusCardProps = {
  selectedYearValue: string;
  focusDateLabel: string;
  seasonLabel: string;
  annualTreeLabel: string;
  focusTitle: string;
  focusKindLabel: string;
  focusSnippet: string | null;
  focusLocation: string | null;
  activityUnseenCount: number;
  focusActionLabel?: string;
  onOpenFocus?: () => void;
  onOpenPathSummary: () => void;
  onOpenHill: () => void;
};

export default function HomeDailyFocusCard(props: HomeDailyFocusCardProps) {
  const {
    selectedYearValue,
    focusDateLabel,
    seasonLabel,
    annualTreeLabel,
    focusTitle,
    focusKindLabel,
    focusSnippet,
    focusLocation,
    activityUnseenCount,
    focusActionLabel,
    onOpenFocus,
    onOpenPathSummary,
    onOpenHill,
  } = props;

  return (
    <section data-home-tour="daily-focus" className="lv-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--lv-text-muted)]">
            Hoy en vuestro jardin
          </div>
          <p className="mt-1 text-sm text-[var(--lv-text-muted)]">
            Esta portada solo deja a la vista lo que importa hoy. La exploracion profunda vive en
            la colina y en el mapa.
          </p>
        </div>
        <button className="lv-btn lv-btn-secondary" onClick={onOpenHill}>
          Abrir colina
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
        <div
          className="border px-4 py-4"
          style={{
            borderRadius: "var(--lv-radius-lg)",
            borderColor: "var(--lv-border)",
            background: "var(--lv-bg-soft)",
          }}
        >
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--lv-text-muted)]">
            <span className="lv-badge bg-[var(--lv-surface)]">{focusDateLabel}</span>
            <span className="lv-badge bg-[var(--lv-surface)]">{seasonLabel}</span>
            <span className="lv-badge bg-[var(--lv-surface)]">Año {selectedYearValue}</span>
            <span className="lv-badge bg-[var(--lv-warning-soft)] text-[var(--lv-warning)]">
              {focusKindLabel}
            </span>
          </div>

          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--lv-text)]">
            {focusTitle}
          </h2>

          <p className="mt-3 text-sm leading-6 text-[var(--lv-text-muted)]">
            {focusSnippet?.trim() ||
              "Este es el foco principal del dia dentro de vuestra historia compartida."}
          </p>

          {focusLocation ? (
            <div className="mt-3 text-xs uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
              {focusLocation}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {onOpenFocus ? (
              <button className="lv-btn lv-btn-primary" onClick={onOpenFocus}>
                {focusActionLabel ?? "Abrir momento del dia"}
              </button>
            ) : null}
            <button className="lv-btn lv-btn-secondary" onClick={onOpenPathSummary}>
              Abrir sendero
            </button>
          </div>
        </div>

        <div className="grid gap-3">
          <div
            className="border px-4 py-4"
            style={{
              borderRadius: "var(--lv-radius-lg)",
              borderColor: "var(--lv-border)",
              background: "var(--lv-bg-soft)",
            }}
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--lv-text-muted)]">
              Arbol anual
            </div>
            <div className="mt-2 text-lg font-semibold text-[var(--lv-text)]">
              {annualTreeLabel}
            </div>
            <p className="mt-2 text-sm text-[var(--lv-text-muted)]">
              La colina y el arbol siguen creciendo con cada flor que realmente florece.
            </p>
          </div>

          <div
            className="border px-4 py-4"
            style={{
              borderRadius: "var(--lv-radius-lg)",
              borderColor: "var(--lv-border)",
              background: "var(--lv-bg-soft)",
            }}
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--lv-text-muted)]">
              Actividad
            </div>
            <div className="mt-2 text-lg font-semibold text-[var(--lv-text)]">
              {formatActivityUnseenLabel(activityUnseenCount)}
            </div>
            <p className="mt-2 text-sm text-[var(--lv-text-muted)]">
              Esta bandeja distingue lo que pide entrar ahora, lo que merece revision y lo que
              solo suma contexto.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
