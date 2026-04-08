"use client";

import type { Season } from "@/lib/forestLogic";
import { ProgressionMilestoneTree } from "@/components/shared/ProgressionMilestoneTree";
import type { ClaimedProgressionMilestoneVisual } from "@/lib/annualProgressionMilestones";

type SeasonStats = {
  total: number;
  avgStars: number;
};

type ForestInsightsSectionProps = {
  showForestInsights: boolean;
  onToggleInsights: () => void;
  statsTotal: number;
  statsAvgStars: number;
  unlockedMilestoneCount: number;
  milestoneCardCount: number;
  tierCount: number;
  maxTierCount: number;
  visibleSeedsBloomed: number;
  nextMilestoneLabel: string;
  nextMilestoneRemaining: number | null;
  activeTierSummary: string;
  dominantFlowerFamilies: Array<{ key: string; label: string; count: number }>;
  claimedMilestoneTrees: ClaimedProgressionMilestoneVisual[];
  seasons: Season[];
  seasonLabel: (season: Season) => string;
  seasonStats: Record<Season, SeasonStats>;
};

export default function ForestInsightsSection(
  props: ForestInsightsSectionProps,
) {
  const {
    showForestInsights,
    onToggleInsights,
    statsTotal,
    statsAvgStars,
    unlockedMilestoneCount,
    milestoneCardCount,
    tierCount,
    maxTierCount,
    visibleSeedsBloomed,
    nextMilestoneLabel,
    nextMilestoneRemaining,
    activeTierSummary,
    dominantFlowerFamilies,
    claimedMilestoneTrees,
    seasons,
    seasonLabel,
    seasonStats,
  } = props;

  return (
    <section className="lv-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Lectura del bosque</h2>
          <p className="mt-1 text-sm text-[var(--lv-text-muted)]">
            Esta capa ya no manda la pantalla. Ábrela solo si quieres una lectura más
            fina del paisaje visible ahora mismo.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleInsights}
          className="lv-btn lv-btn-secondary rounded-full px-3 py-1.5 text-xs"
        >
          {showForestInsights ? "Ocultar lectura fina" : "Ver lectura fina"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="lv-badge px-3 py-1">{statsTotal} páginas</span>
        <span className="lv-badge lv-tone-warning px-3 py-1">
          Media {statsAvgStars.toFixed(1)}/5
        </span>
        <span className="lv-badge lv-tone-info px-3 py-1">
          Hitos {unlockedMilestoneCount}/{milestoneCardCount}
        </span>
        <span className="lv-badge px-3 py-1">
          Tiers {tierCount}/{maxTierCount}
        </span>
      </div>

      {showForestInsights ? (
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="lv-card-soft p-4">
            <div className="text-xs uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
              Resumen visible
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="lv-card-soft bg-white p-3">
                <div className="text-xs opacity-60">Páginas</div>
                <div className="mt-1 text-xl font-semibold">{statsTotal}</div>
              </div>
              <div className="lv-card-soft bg-white p-3">
                <div className="text-xs opacity-60">Semillas florecidas</div>
                <div className="mt-1 text-xl font-semibold">{visibleSeedsBloomed}</div>
              </div>
              <div className="lv-card-soft bg-white p-3">
                <div className="text-xs opacity-60">Media</div>
                <div className="mt-1 text-xl font-semibold">
                  {statsAvgStars.toFixed(1)}
                </div>
              </div>
              <div className="lv-card-soft bg-white p-3">
                <div className="text-xs opacity-60">Tiers</div>
                <div className="mt-1 text-xl font-semibold">
                  {tierCount}/{maxTierCount}
                </div>
              </div>
            </div>
          </div>

          <div className="lv-card-soft p-4">
            <div className="text-xs uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
              Progreso
            </div>
            <div className="lv-card-soft mt-3 bg-white p-3">
              <div className="text-xs opacity-60">Siguiente hito</div>
              <div className="mt-1 font-semibold">{nextMilestoneLabel}</div>
              {nextMilestoneRemaining != null ? (
                <div className="mt-1 text-sm opacity-70">
                  Faltan {Math.max(0, nextMilestoneRemaining)} para alcanzarlo.
                </div>
              ) : null}
            </div>
            <div className="lv-card-soft mt-3 bg-white p-3">
              <div className="text-xs opacity-60">Lectura por tiers</div>
              <div className="mt-1 text-sm font-medium">{activeTierSummary}</div>
            </div>
          </div>

          <div className="lv-card-soft p-4">
            <div className="text-xs uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
              Familias dominantes
            </div>
            <div className="mt-3 space-y-2">
              {dominantFlowerFamilies.length ? (
                dominantFlowerFamilies.map((family) => (
                  <div
                    key={`forest-family-${family.key}`}
                    className="lv-card-soft bg-white p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{family.label}</div>
                      <div className="text-sm opacity-70">{family.count}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="lv-card-soft bg-white p-3 text-sm text-[var(--lv-text-muted)]">
                  Aún no hay suficientes páginas visibles para leer una familia
                  dominante.
                </div>
              )}
            </div>
          </div>

          <div className="lv-card-soft p-4 lg:col-span-3">
            <div className="text-xs uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
              Por estación
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
              {seasons.map((season) => (
                <div
                  key={`forest-insight-season-${season}`}
                  className="lv-card-soft bg-white p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{seasonLabel(season)}</div>
                    <div className="text-sm opacity-70">{seasonStats[season].total}</div>
                  </div>
                  <div className="mt-1 text-xs opacity-70">
                    Media de estrellas {seasonStats[season].avgStars.toFixed(1)}/5
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lv-card-soft p-4 lg:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
                  Hitos reclamados
                </div>
                <div className="mt-1 text-sm text-[var(--lv-text-muted)]">
                  El bosque relee solo los hitos ya asumidos como parte del relato.
                </div>
              </div>
              <div className="lv-badge bg-white px-3 py-1 text-xs">
                {claimedMilestoneTrees.length} visible(s)
              </div>
            </div>
            {claimedMilestoneTrees.length ? (
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {claimedMilestoneTrees.slice(0, 6).map((tree) => (
                  <div
                    key={`forest-claimed-milestone-${tree.id}`}
                    className="lv-card-soft flex items-center gap-3 bg-white p-3"
                  >
                    <div className="flex h-20 w-20 items-center justify-center rounded-[22px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)]">
                      <ProgressionMilestoneTree
                        size={60}
                        rank={tree.rank}
                        importance={tree.importance}
                        rarity={tree.rarity}
                        leafVariant={tree.leafVariant}
                        accentColor={tree.accentColor}
                        claimed
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 font-medium text-[var(--lv-text)]">
                        {tree.title}
                      </div>
                      <div className="mt-1 text-xs text-[var(--lv-text-muted)]">
                        {tree.claimedAt ? tree.claimedAt.slice(0, 10) : "Sin fecha"}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                        <span className="lv-badge bg-[var(--lv-surface-soft)] px-2 py-0.5">
                          {tree.rank}
                        </span>
                        <span className="lv-badge bg-[var(--lv-surface-soft)] px-2 py-0.5">
                          {tree.importance}
                        </span>
                        <span className="lv-badge bg-[var(--lv-surface-soft)] px-2 py-0.5">
                          {tree.rarity}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="lv-card-soft mt-3 bg-white p-3 text-sm text-[var(--lv-text-muted)]">
                Todavía no hay hitos reclamados que formen parte visible del bosque.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
