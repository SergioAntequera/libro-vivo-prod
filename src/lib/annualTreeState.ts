import type { SupabaseClient } from "@supabase/supabase-js";
import {
  annualTreePhaseFromStage,
  annualTreePhaseLabel,
  type AnnualTreeGrowth,
  type AnnualTreeMetrics,
  type AnnualTreePhase,
} from "@/lib/annualTreeEngine";
import type { CanonicalAnnualTreeSnapshot } from "@/lib/annualTreeCanonical";
import { isSchemaNotReadyError, withGardenScope } from "@/lib/gardens";
import { toErrorMessage } from "@/lib/errorMessage";

type SupabaseLikeClient = Pick<SupabaseClient, "from">;

export type GardenYearTreeStateRow = {
  garden_id?: unknown;
  year?: unknown;
  total_events?: unknown;
  active_days?: unknown;
  bloomed_events?: unknown;
  shiny_events?: unknown;
  favorite_events?: unknown;
  avg_rating?: unknown;
  milestones_unlocked?: unknown;
  growth_score?: unknown;
  stage?: unknown;
  phase?: unknown;
  generated_at?: unknown;
  updated_at?: unknown;
};

export type GardenYearTreeState = {
  gardenId: string;
  year: number;
  metrics: AnnualTreeMetrics;
  growth: AnnualTreeGrowth;
  phaseLabel: string;
  generatedAt: string | null;
  updatedAt: string | null;
};

export type LoadGardenYearTreeStatesResult = {
  states: GardenYearTreeState[];
  errorMessage: string | null;
  schemaMissing: boolean;
};

function toFiniteNumber(value: unknown) {
  const num =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(num) ? num : null;
}

function toNonNegativeInt(value: unknown) {
  const num = toFiniteNumber(value);
  if (num == null) return 0;
  return Math.max(0, Math.round(num));
}

function toIsoTimestamp(value: unknown) {
  if (typeof value !== "string") return null;
  const next = value.trim();
  return next || null;
}

function isAnnualTreePhase(value: unknown): value is AnnualTreePhase {
  return (
    value === "seed" ||
    value === "germination" ||
    value === "sprout" ||
    value === "sapling" ||
    value === "young" ||
    value === "mature" ||
    value === "blooming" ||
    value === "legacy"
  );
}

export function mapGardenYearTreeStateRow(
  row: GardenYearTreeStateRow | null | undefined,
): GardenYearTreeState | null {
  if (!row) return null;

  const gardenId = typeof row.garden_id === "string" ? row.garden_id.trim() : "";
  const year = toFiniteNumber(row.year);
  if (!gardenId || year == null || !Number.isInteger(year)) return null;

  const stage = Math.max(0, Math.min(100, toNonNegativeInt(row.stage)));
  const phase = isAnnualTreePhase(row.phase)
    ? row.phase
    : annualTreePhaseFromStage(stage);
  const growthScore = toFiniteNumber(row.growth_score) ?? stage;
  const metrics: AnnualTreeMetrics = {
    year,
    totalEvents: toNonNegativeInt(row.total_events),
    activeDays: toNonNegativeInt(row.active_days),
    bloomedEvents: toNonNegativeInt(row.bloomed_events),
    shinyEvents: toNonNegativeInt(row.shiny_events),
    favoriteEvents: toNonNegativeInt(row.favorite_events),
    avgRating: Math.max(0, toFiniteNumber(row.avg_rating) ?? 0),
    milestonesUnlocked: toNonNegativeInt(row.milestones_unlocked),
  };

  return {
    gardenId,
    year,
    metrics,
    growth: {
      score: growthScore,
      stage,
      progress: stage / 100,
      phase,
      breakdown: [],
    },
    phaseLabel: annualTreePhaseLabel(phase),
    generatedAt: toIsoTimestamp(row.generated_at),
    updatedAt: toIsoTimestamp(row.updated_at),
  };
}

export function buildAnnualTreeSnapshotFromState(
  state: GardenYearTreeState,
  annualTreeAssets?: Record<AnnualTreePhase, string | null>,
): CanonicalAnnualTreeSnapshot {
  return {
    year: state.year,
    metrics: state.metrics,
    growth: state.growth,
    phaseLabel: state.phaseLabel,
    label: `${state.phaseLabel} - ${state.growth.stage}/100`,
    assetPath: annualTreeAssets?.[state.growth.phase] ?? null,
  };
}

export function indexGardenYearTreeStatesByYear(states: GardenYearTreeState[]) {
  return new Map(states.map((state) => [state.year, state] as const));
}

export async function loadGardenYearTreeStates(
  client: SupabaseLikeClient,
  params: {
    gardenId: string | null | undefined;
    years?: number[];
  },
): Promise<LoadGardenYearTreeStatesResult> {
  const gardenId = typeof params.gardenId === "string" ? params.gardenId.trim() : "";
  if (!gardenId) {
    return {
      states: [],
      errorMessage: null,
      schemaMissing: false,
    };
  }

  let query: any = withGardenScope(
    client
      .from("garden_year_tree_states")
      .select(
        "garden_id,year,total_events,active_days,bloomed_events,shiny_events,favorite_events,avg_rating,milestones_unlocked,growth_score,stage,phase,generated_at,updated_at",
      )
      .order("year", { ascending: true }),
    gardenId,
  );

  const validYears = (params.years ?? []).filter((year) => Number.isInteger(year));
  if (validYears.length > 0 && typeof query?.in === "function") {
    query = query.in("year", validYears);
  }

  const { data, error } = await query;
  if (error) {
    return {
      states: [],
      errorMessage: toErrorMessage(error, "No se pudo leer el estado anual del arbol."),
      schemaMissing: isSchemaNotReadyError(error),
    };
  }

  return {
    states: ((data as GardenYearTreeStateRow[] | null) ?? [])
      .map((row) => mapGardenYearTreeStateRow(row))
      .filter((row): row is GardenYearTreeState => row !== null),
    errorMessage: null,
    schemaMissing: false,
  };
}
