"use client";

import { getProductSurface } from "@/lib/productSurfaces";

type PlansGuideTabProps = {
  dueTodayCount: number;
  unscheduledIdeasCount: number;
  onOpenCalendar: () => void;
  onOpenIdeas: () => void;
  onOpenPathSummary: () => void;
  onOpenForest: () => void;
};

const FOREST_SURFACE = getProductSurface("forest");

export default function PlansGuideTab(props: PlansGuideTabProps) {
  const {
    dueTodayCount,
    unscheduledIdeasCount,
    onOpenCalendar,
    onOpenIdeas,
    onOpenPathSummary,
    onOpenForest,
  } = props;

  return (
    <div className="space-y-3">
      <div className="lv-card-soft p-4">
        <div className="font-semibold">1. Plantar idea</div>
        <div className="mt-1 text-sm text-[var(--lv-text-muted)]">
          Crea semilla con titulo, nota y elemento.
        </div>
      </div>
      <div className="lv-card-soft p-4">
        <div className="font-semibold">2. Programar fecha</div>
        <div className="mt-1 text-sm text-[var(--lv-text-muted)]">
          Asigna un dia real para vivirla.
        </div>
      </div>
      <div className="lv-card-soft p-4">
        <div className="font-semibold">3. Florecer</div>
        <div className="mt-1 text-sm text-[var(--lv-text-muted)]">
          Cuando ocurra, se convierte en pagina del diario.
        </div>
      </div>
      <div className="lv-card-soft p-4">
        {dueTodayCount > 0 ? (
          <div className="space-y-2">
            <div className="font-semibold">Hoy teneis plan pendiente</div>
            <div className="text-sm text-[var(--lv-text-muted)]">
              Hay {dueTodayCount} semilla(s) para hoy. Podeis florecerlas desde Agenda.
            </div>
            <button
              className="lv-btn lv-btn-primary"
              onClick={onOpenCalendar}
            >
              Ir a Agenda de hoy
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="font-semibold">Siguiente paso recomendado</div>
            <div className="text-sm text-[var(--lv-text-muted)]">
              {unscheduledIdeasCount > 0
                ? "Programa una fecha para una idea activa."
                : "Crea una nueva idea para empezar el siguiente recuerdo."}
            </div>
            <button
              className="lv-btn lv-btn-primary"
              onClick={onOpenIdeas}
            >
              Empezar ahora
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <button className="lv-btn lv-btn-secondary" onClick={onOpenPathSummary}>
          Ver sendero
        </button>
        <button className="lv-btn lv-btn-secondary" onClick={onOpenForest}>
          Ver {FOREST_SURFACE.label.toLowerCase()}
        </button>
      </div>
    </div>
  );
}
