import type { PlanTypeOption } from "@/lib/planTypeCatalog";
import type {
  FlowerFamily,
  JointWateringSummary,
} from "@/lib/productDomainContracts";

export type SeedItem = {
  id: string;
  title: string;
  status: string;
  scheduled_date: string | null;
  element: string | null;
  notes: string | null;
  bloomed_page_id: string | null;
  map_place_id: string | null;
  map_route_id: string | null;
  plan_type_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type SeedPlaceOption = {
  id: string;
  title: string;
  subtitle: string | null;
  kind: string;
  state: string;
};

export type SeedRouteOption = {
  id: string;
  title: string;
  subtitle: string | null;
  kind: string;
  status: string;
};

export type SeedPlanTypeOption = PlanTypeOption;

export type SeedWateringConfirmation = {
  id: string;
  seed_id: string;
  user_id: string;
  watered_at: string;
  created_at: string | null;
  updated_at: string | null;
};

export type PlansTab = "guide" | "ideas" | "calendar";
export type AgendaFocus =
  | "all"
  | "today"
  | "overdue"
  | "upcoming"
  | "without_date";

export type AgendaSection = {
  key: "today" | "overdue" | "upcoming" | "without_date";
  title: string;
  hint: string;
  bg: string;
  items: SeedItem[];
};

export type PlansAgendaFocus =
  | "all"
  | "action"
  | "waiting"
  | "upcoming"
  | "ideas";

export type PlansSeedStage =
  | "idea"
  | "scheduled"
  | "ready_to_water"
  | "waiting_partner"
  | "bloomed";

export type PlansAgendaBucket = "action" | "waiting" | "upcoming" | "ideas";

export type PlansSeedView = {
  seed: SeedItem;
  stage: PlansSeedStage;
  bucket: PlansAgendaBucket | null;
  stageLabel: string;
  effectiveDate: string | null;
  planType: SeedPlanTypeOption | null;
  planTypeLabel: string | null;
  flowerFamily: FlowerFamily | null;
  linkedPlaceLabel: string | null;
  linkedRouteLabel: string | null;
  currentUserHasWatered: boolean;
  otherParticipantHasWatered: boolean;
  wateringSummary: JointWateringSummary;
  canWaterNow: boolean;
};

export type PlansAgendaSection = {
  key: PlansAgendaBucket;
  title: string;
  hint: string;
  items: PlansSeedView[];
};

export type PlansPendingFlowerBirth = {
  pageId: string;
  seedId: string | null;
  title: string | null;
  activatedAt: string;
};
