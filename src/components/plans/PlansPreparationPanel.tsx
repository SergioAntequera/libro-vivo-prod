"use client";

import {
  resolvePreparationCollaborationHint,
  resolvePreparationCollaborationLabel,
  type SeedPreparationDraftView,
} from "@/lib/seedPreparation";

type PlansPreparationPanelProps = {
  items: SeedPreparationDraftView[];
  openingSeedId?: string | null;
  plantingSeedId?: string | null;
  deletingSeedId?: string | null;
  onOpen: (seedId: string) => void;
  onPlant: (seedId: string) => void;
  onDelete: (seedId: string) => void;
};

function formatDateRange(view: SeedPreparationDraftView) {
  const startsOn = String(view.profile?.starts_on ?? "").trim();
  const endsOn = String(view.profile?.ends_on ?? "").trim();
  const dateMode = String(view.profile?.date_mode ?? "").trim();

  if (dateMode === "flexible") return "Flexible";
  if (startsOn && endsOn && endsOn !== startsOn) return `${startsOn} -> ${endsOn}`;
  if (startsOn) return startsOn;
  return "Sin fechas todavia";
}

export default function PlansPreparationPanel({
  items,
  openingSeedId = null,
  plantingSeedId = null,
  deletingSeedId = null,
  onOpen,
  onPlant,
  onDelete,
}: PlansPreparationPanelProps) {
  if (!items.length) return null;

  return (
    <section
      data-testid="plans-preparation-panel"
      data-plans-tour="preparation-panel"
      className="min-w-0 rounded-[28px] border border-[#d7e1d5] bg-[linear-gradient(135deg,#fbfdf9_0%,#f0f6ef_100%)] p-4 shadow-[0_14px_36px_rgba(36,56,42,0.08)] sm:p-5"
    >
      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-[0.18em] text-[#5c6f5f]">Preparando</div>
        <h2 className="text-lg font-semibold text-[#243228]">
          Borradores que todavia no han sido plantados.
        </h2>
        <p className="text-sm leading-6 text-[#5d6f61]">
          Aqui viven los planes que necesitan preparacion previa. Cuando esten listos, podras
          plantarlos y llevarlos a la agenda viva sin perder contexto.
        </p>
      </div>

      <div className="mt-4 grid gap-3">
        {items.map((view) => (
          <article
            key={view.seed.id}
            id={`preparation-seed-${view.seed.id}`}
            data-testid="plans-preparation-card"
            data-seed-id={view.seed.id}
            className="min-w-0 rounded-[22px] border border-[#d8e2d6] bg-white/90 p-4 shadow-[0_10px_24px_rgba(23,37,28,0.06)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="min-w-0 break-words text-base font-semibold text-[#223128]">
                    {view.seed.title.trim() || "Plan por preparar"}
                  </h3>
                  <span className="lv-badge bg-white">{view.progress}%</span>
                  {view.readyToPlant ? (
                    <span className="lv-badge bg-[#eef6ea] text-[#2f5137]">Lista para plantar</span>
                  ) : (
                    <span className="lv-badge bg-white text-[#6a746a]">Aun en preparacion</span>
                  )}
                  <span
                    className={`lv-badge ${
                      view.collaborationMode === "shared"
                        ? "bg-[#eef3ff] text-[#36538c]"
                        : "bg-white text-[#6a746a]"
                    }`}
                  >
                    {resolvePreparationCollaborationLabel(view.collaborationMode)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  {view.planTypeLabel ? <span className="lv-badge">Plan: {view.planTypeLabel}</span> : null}
                  {view.destinationLabel ? (
                    <span className="lv-badge">Destino: {view.destinationLabel}</span>
                  ) : null}
                  <span className="lv-badge">Fechas: {formatDateRange(view)}</span>
                  {view.primaryPlaceLabel ? (
                    <span className="lv-badge">Lugar: {view.primaryPlaceLabel}</span>
                  ) : null}
                  <span className="lv-badge">
                    Checklist: {view.checklistDone}/{view.checklistTotal}
                  </span>
                </div>

                {view.profile?.summary?.trim() ? (
                  <p className="text-sm leading-6 text-[#5d6f61]">{view.profile.summary.trim()}</p>
                ) : (
                  <p className="text-sm leading-6 text-[#7c887d]">
                    Todavia no hay un resumen. Puedes abrirlo para definir la idea, ordenar
                    fechas y repartir preparativos.
                  </p>
                )}
                <p className="text-xs leading-5 text-[#6a746a]">
                  {resolvePreparationCollaborationHint(view.collaborationMode)}
                </p>
              </div>

              <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
                <button
                  type="button"
                  data-testid="plans-preparation-open"
                  className="lv-btn lv-btn-secondary w-full sm:w-auto"
                  disabled={openingSeedId === view.seed.id}
                  onClick={() => onOpen(view.seed.id)}
                >
                  {openingSeedId === view.seed.id ? "Abriendo..." : "Abrir dossier"}
                </button>
                <button
                  type="button"
                  data-testid="plans-preparation-plant"
                  className="lv-btn lv-btn-primary w-full sm:w-auto"
                  disabled={!view.readyToPlant || plantingSeedId === view.seed.id}
                  onClick={() => onPlant(view.seed.id)}
                >
                  {plantingSeedId === view.seed.id ? "Plantando..." : "Plantar esta semilla"}
                </button>
                <button
                  type="button"
                  data-testid="plans-preparation-delete"
                  className="lv-btn lv-btn-danger w-full sm:w-auto"
                  disabled={deletingSeedId === view.seed.id}
                  onClick={() => onDelete(view.seed.id)}
                >
                  {deletingSeedId === view.seed.id ? "Desplantando..." : "Descartar"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
