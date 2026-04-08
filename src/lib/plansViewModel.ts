import type { SeedCalendarConfig } from "@/lib/seedCalendarConfig";
import { summarizeJointWatering } from "@/lib/productDomainContracts";
import type {
  PlansAgendaSection,
  PlansSeedStage,
  PlansSeedView,
  SeedItem,
  SeedPlanTypeOption,
  SeedPlaceOption,
  SeedRouteOption,
  SeedWateringConfirmation,
} from "@/lib/plansTypes";

type BuildPlansSeedViewsInput = {
  seeds: SeedItem[];
  planTypeOptions: SeedPlanTypeOption[];
  placeOptions: SeedPlaceOption[];
  routeOptions: SeedRouteOption[];
  wateringConfirmations: SeedWateringConfirmation[];
  currentUserId: string;
  activeMemberCount: number;
  cfg: SeedCalendarConfig;
  nowDate: string;
  query?: string;
};

function normalizeText(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function matchesQuery(input: {
  seed: SeedItem;
  planTypeLabel: string | null;
  linkedPlaceLabel: string | null;
  linkedRouteLabel: string | null;
  query: string;
}) {
  const q = normalizeText(input.query);
  if (!q) return true;
  const haystack = normalizeText(
    [
      input.seed.title,
      input.seed.notes,
      input.seed.scheduled_date,
      input.seed.element,
      input.planTypeLabel,
      input.linkedPlaceLabel,
      input.linkedRouteLabel,
    ]
      .filter(Boolean)
      .join(" "),
  );
  return haystack.includes(q);
}

function resolveStageLabel(input: {
  stage: PlansSeedStage;
  currentUserHasWatered: boolean;
  otherParticipantHasWatered: boolean;
}) {
  if (input.stage === "idea") return "Idea sin fecha";
  if (input.stage === "scheduled") return "Programada";
  if (input.stage === "waiting_partner") return "Esperando a la otra persona";
  if (input.stage === "bloomed") return "Flor abierta";
  if (input.otherParticipantHasWatered && !input.currentUserHasWatered) {
    return "Tu pareja ya la rego";
  }
  return "Lista para brotar";
}

function resolveSeedStage(input: {
  seed: SeedItem;
  cfg: SeedCalendarConfig;
  nowDate: string;
  currentUserHasWatered: boolean;
  otherParticipantHasWatered: boolean;
  confirmedParticipants: number;
  activeMemberCount: number;
}) {
  if (input.seed.status === input.cfg.defaults.bloomedStatus) return "bloomed" as const;

  const isScheduled =
    input.seed.status === input.cfg.defaults.scheduledStatus &&
    Boolean(input.seed.scheduled_date);
  if (!isScheduled) return "idea" as const;

  const wateringSummary = summarizeJointWatering({
    scheduledDate: input.seed.scheduled_date,
    nowDate: input.nowDate,
    requiredParticipants: input.activeMemberCount,
    confirmedParticipants: input.confirmedParticipants,
  });

  if (wateringSummary.state === "not_ready") return "scheduled" as const;
  if (wateringSummary.state === "waiting_partner" && input.currentUserHasWatered) {
    return "waiting_partner" as const;
  }
  return "ready_to_water" as const;
}

export function buildPlansSeedViews(input: BuildPlansSeedViewsInput): PlansSeedView[] {
  const planTypeById = new Map(input.planTypeOptions.map((option) => [option.id, option]));
  const placeLabelById = new Map(
    input.placeOptions.map((place) => [
      place.id,
      place.subtitle?.trim() ? `${place.title} - ${place.subtitle}` : place.title,
    ]),
  );
  const routeLabelById = new Map(
    input.routeOptions.map((route) => [
      route.id,
      route.subtitle?.trim() ? `${route.title} - ${route.subtitle}` : route.title,
    ]),
  );
  const confirmationsBySeedId = new Map<string, SeedWateringConfirmation[]>();
  for (const row of input.wateringConfirmations) {
    const current = confirmationsBySeedId.get(row.seed_id) ?? [];
    current.push(row);
    confirmationsBySeedId.set(row.seed_id, current);
  }

  return input.seeds
    .map((seed) => {
      const planType = seed.plan_type_id ? planTypeById.get(seed.plan_type_id) ?? null : null;
      const linkedPlaceLabel = seed.map_place_id
        ? placeLabelById.get(seed.map_place_id) ?? null
        : null;
      const linkedRouteLabel = seed.map_route_id
        ? routeLabelById.get(seed.map_route_id) ?? null
        : null;

      if (
        !matchesQuery({
          seed,
          planTypeLabel: planType?.label ?? null,
          linkedPlaceLabel,
          linkedRouteLabel,
          query: input.query ?? "",
        })
      ) {
        return null;
      }

      const confirmationRows = confirmationsBySeedId.get(seed.id) ?? [];
      const uniqueUsers = new Set(confirmationRows.map((row) => row.user_id));
      const currentUserHasWatered = uniqueUsers.has(input.currentUserId);
      const otherParticipantHasWatered =
        uniqueUsers.size > 0 && (uniqueUsers.size > 1 || !currentUserHasWatered);
      const confirmedParticipants = uniqueUsers.size;
      const wateringSummary = summarizeJointWatering({
        scheduledDate: seed.scheduled_date,
        nowDate: input.nowDate,
        requiredParticipants: input.activeMemberCount,
        confirmedParticipants,
        lastConfirmedAt:
          [...confirmationRows]
            .sort((a, b) => String(b.watered_at).localeCompare(String(a.watered_at)))[0]
            ?.watered_at ?? null,
      });

      const stage = resolveSeedStage({
        seed,
        cfg: input.cfg,
        nowDate: input.nowDate,
        currentUserHasWatered,
        otherParticipantHasWatered,
        confirmedParticipants,
        activeMemberCount: input.activeMemberCount,
      });

      const bucket =
        stage === "idea"
          ? "ideas"
          : stage === "scheduled"
            ? "upcoming"
            : stage === "waiting_partner"
              ? "waiting"
              : stage === "ready_to_water"
                ? "action"
                : null;

      return {
        seed,
        stage,
        bucket,
        stageLabel: resolveStageLabel({
          stage,
          currentUserHasWatered,
          otherParticipantHasWatered,
        }),
        effectiveDate:
          seed.scheduled_date ?? (String(seed.created_at ?? "").slice(0, 10) || null),
        planType,
        planTypeLabel: planType?.label ?? null,
        flowerFamily: planType?.flowerFamily ?? null,
        linkedPlaceLabel,
        linkedRouteLabel,
        currentUserHasWatered,
        otherParticipantHasWatered,
        wateringSummary,
        canWaterNow: stage === "ready_to_water",
      } satisfies PlansSeedView;
    })
    .filter((item): item is PlansSeedView => item !== null)
    .sort((a, b) =>
      String(a.effectiveDate ?? "9999-12-31").localeCompare(
        String(b.effectiveDate ?? "9999-12-31"),
      ),
    );
}

export function buildPlansAgendaSections(seedViews: PlansSeedView[]): PlansAgendaSection[] {
  const byBucket = {
    action: [] as PlansSeedView[],
    waiting: [] as PlansSeedView[],
    upcoming: [] as PlansSeedView[],
    ideas: [] as PlansSeedView[],
  };

  for (const item of seedViews) {
    if (!item.bucket) continue;
    byBucket[item.bucket].push(item);
  }

  return [
    {
      key: "action",
      title: "Toca hoy",
      hint: "Semillas cuya fecha ha llegado y ya pueden empezar el nacimiento compartido de la flor.",
      items: byBucket.action,
    },
    {
      key: "waiting",
      title: "Tu parte ya esta hecha",
      hint: "Falta la otra persona para que la flor brote y se abra la página.",
      items: byBucket.waiting,
    },
    {
      key: "upcoming",
      title: "Mas adelante",
      hint: "Planes ya programados que todavía no piden acción.",
      items: byBucket.upcoming,
    },
    {
      key: "ideas",
      title: "Sin fecha",
      hint: "Semillas que todavía solo son una idea y aún no tienen dia.",
      items: byBucket.ideas,
    },
  ];
}
