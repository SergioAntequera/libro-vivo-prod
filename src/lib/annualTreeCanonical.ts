import {
  annualTreePhaseLabel,
  buildAnnualTreeMetricsFromEvents,
  computeAnnualTreeGrowth,
  type AnnualTreeGrowth,
  type AnnualTreeMetrics,
  type AnnualTreePhase,
} from "@/lib/annualTreeEngine";
import {
  annualTreeInputsFromLifeEvents,
  mapPageRowsToLifeEvents,
  normalizeIsoDate,
  type PageLikeLifeInput,
} from "@/lib/lifeEventModel";

export type CanonicalAnnualTreeSnapshot = {
  year: number;
  metrics: AnnualTreeMetrics;
  growth: AnnualTreeGrowth;
  phaseLabel: string;
  label: string;
  assetPath: string | null;
};

export function buildCanonicalAnnualTreeSnapshot<TPage extends PageLikeLifeInput>(params: {
  year: number;
  pages: TPage[];
  milestonesUnlocked: number;
  annualTreeAssets?: Record<AnnualTreePhase, string | null>;
  idPrefix?: string;
  titleFallback?: string;
}): CanonicalAnnualTreeSnapshot {
  const pageEvents = mapPageRowsToLifeEvents(params.pages, {
    kind: "flower",
    idPrefix: params.idPrefix ?? "annual-tree-page",
    titleFallback: params.titleFallback ?? "Recuerdo del año",
  });
  const metrics = buildAnnualTreeMetricsFromEvents({
    year: params.year,
    milestonesUnlocked: Math.max(0, params.milestonesUnlocked || 0),
    events: annualTreeInputsFromLifeEvents(pageEvents, { isBloomed: true }),
  });
  const growth = computeAnnualTreeGrowth(metrics);
  const phaseLabel = annualTreePhaseLabel(growth.phase);

  return {
    year: params.year,
    metrics,
    growth,
    phaseLabel,
    label: `${phaseLabel} - ${growth.stage}/100`,
    assetPath: params.annualTreeAssets?.[growth.phase] ?? null,
  };
}

export function countAnnualTreeMilestonesForYear<TEntry>(params: {
  year: number;
  entries: TEntry[];
  resolveDate: (entry: TEntry) => unknown;
}): number {
  let count = 0;
  const yearPrefix = `${params.year}-`;

  for (const entry of params.entries ?? []) {
    const date = normalizeIsoDate(params.resolveDate(entry));
    if (date && date.startsWith(yearPrefix)) {
      count += 1;
    }
  }

  return count;
}
