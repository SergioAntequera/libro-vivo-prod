import { ritualStatusLabel } from "@/lib/annualTreeRitual";
import type { ResolvedAnnualTreeNarrative } from "@/lib/annualTreeNarrative";

type Props = {
  stage: number;
  activeMonths: number;
  topFlowerFamilyLabel: string;
  narrative: ResolvedAnnualTreeNarrative;
  onOpenRitual?: () => void;
};

export default function AnnualTreeNarrativeCard({
  stage,
  activeMonths,
  topFlowerFamilyLabel,
  narrative,
  onOpenRitual,
}: Props) {
  return (
    <div className="mt-3 space-y-3">
      <div className="lv-card-soft bg-white/72 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
              {narrative.eyebrow}
            </div>
            <h3 className="mt-2 text-lg font-semibold text-[var(--lv-text)]">
              {narrative.title}
            </h3>
          </div>
          <div className="rounded-full border border-[#dce5d6] bg-white px-3 py-1 text-xs font-medium text-[var(--lv-primary-strong)]">
            {stage}/100
          </div>
        </div>

        <p className="mt-3 text-sm leading-6 text-[var(--lv-text)]">{narrative.body}</p>

        <div className="mt-3 text-xs leading-5 text-[var(--lv-text-muted)]">
          El crecimiento {stage}/100 mezcla flores, ritmo del año, favoritas, estrellas e hitos.
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {narrative.ritualStatus ? (
            <span className="rounded-full border border-[#d8e6cf] bg-[#eef6e7] px-3 py-1 text-xs font-medium text-[#2f5637]">
              {ritualStatusLabel(narrative.ritualStatus)}
            </span>
          ) : null}
          {narrative.showRitualAction && onOpenRitual ? (
            <button
              type="button"
              className="lv-btn lv-btn-primary px-3 py-1.5 text-xs"
              onClick={onOpenRitual}
            >
              {narrative.actionLabel ?? "Abrir ritual"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="lv-card-soft bg-white/70 p-3">
          <div className="text-xs text-[var(--lv-text-muted)]">Meses activos</div>
          <div className="mt-1 font-semibold">{activeMonths}</div>
        </div>
        <div className="lv-card-soft bg-white/70 p-3">
          <div className="text-xs text-[var(--lv-text-muted)]">Flor dominante</div>
          <div className="mt-1 font-semibold">{topFlowerFamilyLabel}</div>
        </div>
      </div>
    </div>
  );
}
