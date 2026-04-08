import type { SeedItem, SeedPlanTypeOption, SeedPlaceOption } from "@/lib/plansTypes";
import type {
  SeedPreparationBlockId,
  SeedPreparationChecklistItem,
  SeedPreparationCollaborationMode,
  SeedPreparationProfile,
} from "@/lib/seedPreparationTypes";

export const DEFAULT_PREPARATION_SEED_TITLE = "Semilla en preparacion";

export type SeedPreparationStructureCounts = {
  stopCount: number;
  transportCount: number;
  stayCount: number;
  placeLinkCount: number;
  itineraryCount: number;
  reservationCount: number;
  attachmentCount: number;
};

export type SeedPreparationDraftView = {
  seed: SeedItem;
  profile: SeedPreparationProfile | null;
  collaborationMode: SeedPreparationCollaborationMode;
  destinationLabel: string | null;
  planTypeLabel: string | null;
  primaryPlaceLabel: string | null;
  checklistTotal: number;
  checklistDone: number;
  progress: number;
  readyToPlant: boolean;
};

function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function hasTrimmedValue(value: string | null | undefined) {
  return Boolean(String(value ?? "").trim());
}

function normalizeDraftIdentity(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

export function normalizePreparationCollaborationMode(
  value: string | null | undefined,
): SeedPreparationCollaborationMode {
  return value === "shared" ? "shared" : "solo_for_now";
}

export function resolvePreparationCollaborationLabel(
  mode: SeedPreparationCollaborationMode,
) {
  return mode === "shared" ? "En conjunto" : "Lo preparo yo por ahora";
}

export function resolvePreparationCollaborationHint(
  mode: SeedPreparationCollaborationMode,
) {
  return mode === "shared"
    ? "Ambas personas pueden entrar y preparar este plan juntas cuando quieran."
    : "Mientras siga asi, solo te aparece a ti. La otra persona no lo vera hasta que lo pases a En conjunto.";
}

export function isPreparationDraftVisibleToUser(input: {
  seed: Pick<SeedItem, "created_by">;
  collaborationMode: SeedPreparationCollaborationMode;
  currentUserId: string | null | undefined;
}) {
  if (input.collaborationMode === "shared") return true;
  const currentUserId = String(input.currentUserId ?? "").trim();
  const createdBy = String(input.seed.created_by ?? "").trim();
  if (!currentUserId) return false;
  if (!createdBy) return true;
  return createdBy === currentUserId;
}

export function normalizePreparationProgress(value: number | null | undefined) {
  return clampProgress(Number(value ?? 0));
}

export function isPreparationDraftEffectivelyBlank(input: {
  seed: Pick<
    SeedItem,
    "title" | "notes" | "scheduled_date" | "map_place_id" | "map_route_id" | "plan_type_id"
  >;
  profile: Pick<
    SeedPreparationProfile,
    | "summary"
    | "destination_label"
    | "destination_kind"
    | "starts_on"
    | "ends_on"
    | "budget_amount"
    | "budget_notes"
    | "goal_tags"
    | "shared_intention"
    | "why_this_trip"
    | "climate_context"
    | "primary_map_place_id"
    | "primary_map_route_id"
    | "enabled_blocks"
  > | null;
  checklistTotal: number;
  structureCounts?: Partial<SeedPreparationStructureCounts> | null;
}) {
  const counts = {
    stopCount: Number(input.structureCounts?.stopCount ?? 0),
    transportCount: Number(input.structureCounts?.transportCount ?? 0),
    stayCount: Number(input.structureCounts?.stayCount ?? 0),
    placeLinkCount: Number(input.structureCounts?.placeLinkCount ?? 0),
    itineraryCount: Number(input.structureCounts?.itineraryCount ?? 0),
    reservationCount: Number(input.structureCounts?.reservationCount ?? 0),
    attachmentCount: Number(input.structureCounts?.attachmentCount ?? 0),
  } satisfies SeedPreparationStructureCounts;

  const enabledBlocks = input.profile?.enabled_blocks ?? [];
  const hasOnlyDefaultBlocks =
    enabledBlocks.length === 0 ||
    (enabledBlocks.length === 1 && enabledBlocks[0] === "summary");

  return (
    normalizeDraftIdentity(input.seed.title) ===
      normalizeDraftIdentity(DEFAULT_PREPARATION_SEED_TITLE) &&
    !hasTrimmedValue(input.seed.notes) &&
    !hasTrimmedValue(input.seed.scheduled_date) &&
    !hasTrimmedValue(input.seed.map_place_id) &&
    !hasTrimmedValue(input.seed.map_route_id) &&
    !hasTrimmedValue(input.seed.plan_type_id) &&
    !hasTrimmedValue(input.profile?.summary) &&
    !hasTrimmedValue(input.profile?.destination_label) &&
    !hasTrimmedValue(input.profile?.destination_kind) &&
    !hasTrimmedValue(input.profile?.starts_on) &&
    !hasTrimmedValue(input.profile?.ends_on) &&
    typeof input.profile?.budget_amount !== "number" &&
    !hasTrimmedValue(input.profile?.budget_notes) &&
    (input.profile?.goal_tags ?? []).length === 0 &&
    !hasTrimmedValue(input.profile?.shared_intention) &&
    !hasTrimmedValue(input.profile?.why_this_trip) &&
    !hasTrimmedValue(input.profile?.climate_context) &&
    !hasTrimmedValue(input.profile?.primary_map_place_id) &&
    !hasTrimmedValue(input.profile?.primary_map_route_id) &&
    hasOnlyDefaultBlocks &&
    input.checklistTotal === 0 &&
    counts.stopCount === 0 &&
    counts.transportCount === 0 &&
    counts.stayCount === 0 &&
    counts.placeLinkCount === 0 &&
    counts.itineraryCount === 0 &&
    counts.reservationCount === 0 &&
    counts.attachmentCount === 0
  );
}

export function resolvePreparationReadyToPlant(input: {
  seedTitle: string | null | undefined;
  planTypeId: string | null | undefined;
  startsOn?: string | null | undefined;
  scheduledDate?: string | null | undefined;
  dateMode?: string | null | undefined;
}) {
  const hasTitle = Boolean(String(input.seedTitle ?? "").trim());
  const hasPlanType = Boolean(String(input.planTypeId ?? "").trim());
  const hasDateSignal =
    input.dateMode === "flexible" ||
    Boolean(String(input.startsOn ?? "").trim()) ||
    Boolean(String(input.scheduledDate ?? "").trim());
  return hasTitle && hasPlanType && hasDateSignal;
}

export function computePreparationProgress(input: {
  seed: Pick<SeedItem, "title" | "plan_type_id" | "scheduled_date">;
  profile: Pick<
    SeedPreparationProfile,
    | "summary"
    | "destination_label"
    | "starts_on"
    | "date_mode"
    | "budget_amount"
    | "primary_map_place_id"
    | "enabled_blocks"
  > | null;
  checklistItems: Array<Pick<SeedPreparationChecklistItem, "completed_at">>;
}) {
  let score = 0;
  if (String(input.seed.title ?? "").trim()) score += 20;
  if (String(input.seed.plan_type_id ?? "").trim()) score += 15;
  if (
    input.profile?.date_mode === "flexible" ||
    String(input.profile?.starts_on ?? input.seed.scheduled_date ?? "").trim()
  ) {
    score += 20;
  }
  if (String(input.profile?.summary ?? "").trim()) score += 10;
  if (String(input.profile?.destination_label ?? "").trim()) score += 10;
  if (String(input.profile?.primary_map_place_id ?? "").trim()) score += 10;
  if (typeof input.profile?.budget_amount === "number") score += 5;

  const checklistCount = input.checklistItems.length;
  const checklistDone = input.checklistItems.filter((item) => item.completed_at).length;
  if (checklistCount > 0) {
    score += 10;
    if (checklistDone > 0) score += 10;
  }

  return clampProgress(score);
}

export function buildSeedPreparationDraftViews(input: {
  seeds: SeedItem[];
  planTypeOptions: SeedPlanTypeOption[];
  placeOptions: SeedPlaceOption[];
  profiles: SeedPreparationProfile[];
  checklistItems: SeedPreparationChecklistItem[];
}) {
  const planTypeById = new Map(input.planTypeOptions.map((option) => [option.id, option]));
  const placeById = new Map(
    input.placeOptions.map((place) => [
      place.id,
      place.subtitle?.trim() ? `${place.title} - ${place.subtitle}` : place.title,
    ]),
  );
  const profileBySeedId = new Map(input.profiles.map((profile) => [profile.seed_id, profile]));
  const checklistBySeedId = new Map<string, SeedPreparationChecklistItem[]>();
  for (const item of input.checklistItems) {
    const current = checklistBySeedId.get(item.seed_id) ?? [];
    current.push(item);
    checklistBySeedId.set(item.seed_id, current);
  }

  return input.seeds
    .map((seed) => {
      const profile = profileBySeedId.get(seed.id) ?? null;
      const checklist = checklistBySeedId.get(seed.id) ?? [];
      const progress = computePreparationProgress({
        seed,
        profile,
        checklistItems: checklist,
      });
      const collaborationMode = normalizePreparationCollaborationMode(
        profile?.collaboration_mode,
      );
      return {
        seed,
        profile,
        collaborationMode,
        destinationLabel: profile?.destination_label?.trim() || null,
        planTypeLabel: seed.plan_type_id ? planTypeById.get(seed.plan_type_id)?.label ?? null : null,
        primaryPlaceLabel:
          profile?.primary_map_place_id ? placeById.get(profile.primary_map_place_id) ?? null : null,
        checklistTotal: checklist.length,
        checklistDone: checklist.filter((item) => item.completed_at).length,
        progress: normalizePreparationProgress(progress),
        readyToPlant: resolvePreparationReadyToPlant({
          seedTitle: seed.title,
          planTypeId: seed.plan_type_id,
          startsOn: profile?.starts_on,
          scheduledDate: seed.scheduled_date,
          dateMode: profile?.date_mode,
        }),
      } satisfies SeedPreparationDraftView;
    })
    .sort((left, right) => String(right.seed.created_at ?? "").localeCompare(String(left.seed.created_at ?? "")));
}

export function parseGoalTags(raw: string) {
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 8);
}

export function resolveEnabledPreparationBlocks(input: {
  seedNotes?: string | null | undefined;
  summary?: string | null | undefined;
  destinationLabel?: string | null | undefined;
  startsOn?: string | null | undefined;
  endsOn?: string | null | undefined;
  dateMode?: string | null | undefined;
  budgetAmount?: number | null | undefined;
  primaryMapPlaceId?: string | null | undefined;
  primaryMapRouteId?: string | null | undefined;
  goalTags?: string[] | null | undefined;
  checklistCount?: number | null | undefined;
  stopCount?: number | null | undefined;
  transportCount?: number | null | undefined;
  stayCount?: number | null | undefined;
  placeLinkCount?: number | null | undefined;
  itineraryCount?: number | null | undefined;
  reservationCount?: number | null | undefined;
  attachmentCount?: number | null | undefined;
  climateContext?: string | null | undefined;
}) {
  const blocks = new Set<SeedPreparationBlockId>(["summary"]);

  if (
    input.dateMode === "flexible" ||
    String(input.startsOn ?? "").trim() ||
    String(input.endsOn ?? "").trim()
  ) {
    blocks.add("dates");
  }

  if (typeof input.budgetAmount === "number") {
    blocks.add("budget");
  }

  if (String(input.destinationLabel ?? "").trim()) {
    blocks.add("summary");
  }

  if (String(input.primaryMapPlaceId ?? "").trim() || String(input.primaryMapRouteId ?? "").trim()) {
    blocks.add("places");
  }

  if ((input.goalTags ?? []).length > 0) {
    blocks.add("summary");
  }

  if (Number(input.checklistCount ?? 0) > 0) {
    blocks.add("checklist");
  }

  if (Number(input.stopCount ?? 0) > 0) {
    blocks.add("stops");
  }

  if (Number(input.transportCount ?? 0) > 0) {
    blocks.add("transport");
  }

  if (Number(input.stayCount ?? 0) > 0) {
    blocks.add("stay");
  }

  if (Number(input.placeLinkCount ?? 0) > 0) {
    blocks.add("places");
  }

  if (Number(input.itineraryCount ?? 0) > 0) {
    blocks.add("itinerary");
  }

  if (Number(input.reservationCount ?? 0) > 0) {
    blocks.add("reservations");
  }

  if (Number(input.attachmentCount ?? 0) > 0) {
    blocks.add("documents");
  }

  if (String(input.climateContext ?? "").trim()) {
    blocks.add("climate");
  }

  if (String(input.seedNotes ?? "").trim()) {
    blocks.add("notes");
  }

  return [...blocks];
}
