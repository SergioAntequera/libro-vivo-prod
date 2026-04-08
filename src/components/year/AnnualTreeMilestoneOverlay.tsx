import { AnnualTreeVisual } from "@/components/shared/AnnualTreeVisual";
import type { ResolvedAnnualTreeNarrative } from "@/lib/annualTreeNarrative";
import type { AnnualTreePhase } from "@/lib/annualTreeEngine";

type Props = {
  year: number;
  stage: number;
  phaseLabel: string;
  narrative: ResolvedAnnualTreeNarrative;
  assetsByPhase: Record<AnnualTreePhase, string | null>;
  onDismiss: () => void;
  onOpenRitual?: () => void;
};

export default function AnnualTreeMilestoneOverlay({
  year,
  stage,
  phaseLabel,
  narrative,
  assetsByPhase,
  onDismiss,
  onOpenRitual,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[32px] border border-[var(--lv-border)] bg-[linear-gradient(180deg,#fffdf8_0%,#f7fbf4_100%)] p-6 shadow-[0_26px_70px_rgba(22,34,24,0.28)]">
        <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div className="rounded-[28px] border border-white/55 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.42),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.2),rgba(255,255,255,0.05)),linear-gradient(180deg,#dfead4_0%,#d6e5c7_42%,#bad59c_74%,#88ac65_100%)] p-5">
            <div className="mx-auto flex h-[230px] w-full max-w-[240px] items-center justify-center overflow-hidden rounded-[26px]">
              <AnnualTreeVisual
                stage={stage}
                seed={year * 29 + stage}
                size={190}
                assetsByPhase={assetsByPhase}
              />
            </div>
            <div className="mt-3 text-center text-xs uppercase tracking-[0.18em] text-[var(--lv-primary-strong)]">
              Arbol del año {year}
            </div>
            <div className="mt-2 text-center text-sm font-medium text-[var(--lv-text)]">
              Fase {stage}/100 · {phaseLabel}
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--lv-text-muted)]">
              {narrative.eyebrow}
            </div>
            <h2 className="text-3xl font-semibold text-[var(--lv-text)]">{narrative.title}</h2>
            <p className="text-sm leading-7 text-[var(--lv-text-muted)]">{narrative.body}</p>
            <div className="rounded-[24px] border border-[#dce5d6] bg-white/90 p-4 text-sm leading-6 text-[var(--lv-text-muted)]">
              Este momento no vive en `activity` como aviso mas. Se queda en el propio año para darle sentido al arbol y a su ritmo.
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className="lv-btn lv-btn-secondary" onClick={onDismiss}>
                Cerrar
              </button>
              {narrative.showRitualAction && onOpenRitual ? (
                <button type="button" className="lv-btn lv-btn-primary" onClick={onOpenRitual}>
                  {narrative.actionLabel ?? "Abrir ritual"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
