"use client";

type SeedPlantingModeModalProps = {
  open: boolean;
  busy?: boolean;
  onQuick: () => void;
  onPrepare: () => void;
  onCancel: () => void;
};

export function SeedPlantingModeModal({
  open,
  busy = false,
  onQuick,
  onPrepare,
  onCancel,
}: SeedPlantingModeModalProps) {
  if (!open) return null;

  return (
    <div
      data-testid="seed-planting-mode-modal"
      className="lv-modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div className="lv-modal max-w-2xl">
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
            Nueva semilla
          </div>
          <h2 className="text-xl font-semibold text-[var(--lv-text)]">
            Quieres plantarla ya o prepararla antes?
          </h2>
          <p className="text-sm leading-6 text-[var(--lv-text-muted)]">
            Manten el camino rapido para lo sencillo y abre un dossier previo cuando este plan
            necesite fechas, presupuesto, lugares o una lista compartida antes de plantarlo.
          </p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <button
            type="button"
            data-testid="seed-planting-mode-quick"
            className="rounded-[24px] border border-[var(--lv-border)] bg-white p-5 text-left shadow-[var(--lv-shadow-sm)] transition hover:border-[#86b49d] hover:bg-[#f7fbf6]"
            onClick={onQuick}
            disabled={busy}
          >
            <div className="text-base font-semibold text-[var(--lv-text)]">Plantarla ya</div>
            <div className="mt-2 text-sm leading-6 text-[var(--lv-text-muted)]">
              Usa la semilla rapida de siempre para una idea sencilla o algo que ya esta claro.
            </div>
          </button>

          <button
            type="button"
            data-testid="seed-planting-mode-prepare"
            className="rounded-[24px] border border-[#cfe4d4] bg-[linear-gradient(135deg,#f8fcf7_0%,#eef7f0_100%)] p-5 text-left shadow-[var(--lv-shadow-sm)] transition hover:border-[#86b49d] hover:bg-[#f2faf3]"
            onClick={onPrepare}
            disabled={busy}
          >
            <div className="text-base font-semibold text-[var(--lv-text)]">
              Prepararla antes
            </div>
            <div className="mt-2 text-sm leading-6 text-[var(--lv-text-muted)]">
              Crea un borrador de preparacion para ordenar destino, fechas, checklist y contexto
              antes de plantar la semilla real.
            </div>
          </button>
        </div>

        <div className="lv-modal-actions">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="lv-btn lv-btn-secondary disabled:opacity-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
