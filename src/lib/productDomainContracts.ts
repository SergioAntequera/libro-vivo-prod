import type { ElementKind } from "@/lib/canvasTypes";
import { normalizeElementCode } from "@/lib/elementsCatalog";

export const FLOWER_FAMILY_ORDER = [
  "agua",
  "fuego",
  "tierra",
  "aire",
  "luz",
  "luna",
  "estrella",
] as const;

export type FlowerFamily = (typeof FLOWER_FAMILY_ORDER)[number];

export const DEFAULT_FLOWER_FAMILY: FlowerFamily = "estrella";

export const FLOWER_FAMILY_LABELS: Record<FlowerFamily, string> = {
  agua: "Agua",
  fuego: "Fuego",
  tierra: "Tierra",
  aire: "Aire",
  luz: "Luz",
  luna: "Luna",
  estrella: "Estrella",
};

export const FLOWER_FAMILY_CASES: Record<FlowerFamily, string[]> = {
  agua: ["relax", "playa", "spa", "rio", "mar"],
  fuego: ["pasion", "noche", "cita intensa", "concierto"],
  tierra: ["naturaleza", "rutas", "campo", "comida casera"],
  aire: ["improvisado", "viajes", "paseo", "escapada ligera"],
  luz: ["celebraciones", "aniversario", "fechas especiales"],
  luna: ["intimidad", "conversacion", "emociones", "noches tranquilas"],
  estrella: ["suenos", "metas", "primeras veces", "cosas importantes"],
};

export const PLAN_TYPE_CODE_TO_FLOWER_FAMILY: Record<string, FlowerFamily> = {
  salida_general: "aire",
  paseo: "aire",
  parque: "aire",
  terraza: "aire",
  playa: "agua",
  campo: "tierra",
  picnic: "tierra",
  mirador: "aire",
  senderismo: "tierra",
  ruta: "tierra",
  bici: "aire",
  deporte: "aire",
  desayuno: "fuego",
  brunch: "fuego",
  cafe: "fuego",
  vermut: "fuego",
  restaurante: "fuego",
  cena: "fuego",
  noche_casa: "luna",
  cocinar_juntos: "tierra",
  peli: "luna",
  juegos: "luna",
  lectura: "luna",
  cine: "luna",
  concierto: "fuego",
  museo: "estrella",
  feria: "luz",
  escapada: "aire",
  viaje: "aire",
  road_trip: "aire",
  tren: "aire",
  celebracion: "luz",
  aniversario: "luz",
  sorpresa: "estrella",
};

export const FLOWER_FAMILY_TO_ELEMENT_KIND: Record<FlowerFamily, ElementKind> = {
  agua: "water",
  fuego: "fire",
  tierra: "earth",
  aire: "air",
  luz: "fire",
  luna: "water",
  estrella: "aether",
};

export const LEGACY_ELEMENT_TO_FLOWER_FAMILY: Record<ElementKind, FlowerFamily> = {
  water: "agua",
  fire: "fuego",
  earth: "tierra",
  air: "aire",
  aether: "estrella",
};

export const CANONICAL_SEED_STATUS = {
  idea: "seed",
  scheduled: "scheduled",
  bloomed: "bloomed",
} as const;

export type CanonicalSeedStage =
  | "idea"
  | "scheduled"
  | "ready_to_water"
  | "waiting_partner"
  | "bloomed"
  | "desplanted";

export type JointWateringState =
  | "not_ready"
  | "ready_to_water"
  | "waiting_partner"
  | "completed";

export type JointWateringMemberStatus = "pending" | "watered";

export type JointWateringSummary = {
  requiredParticipants: number;
  confirmedParticipants: number;
  remainingParticipants: number;
  state: JointWateringState;
  enabledAtDate: string | null;
  lastConfirmedAt: string | null;
};

export type PageCompletionState =
  | "pending_capture"
  | "captured"
  | "enriched"
  | "complete";

export type ActivityItemKind =
  | "shared_preparation"
  | "flower_birth_pending"
  | "water_seed"
  | "waiting_partner"
  | "complete_bloom_page"
  | "garden_invitation"
  | "garden_change_notice"
  | "milestone_unlocked"
  | "partner_updated_page"
  | "special_annual_tree_ritual"
  | "time_capsule_ready";

export type ActivityItemTone = "pending" | "news" | "special";

export type ActivitySectionKey = "now" | "review" | "news";

export type ActivityEntityKind =
  | "seed"
  | "page"
  | "garden"
  | "notice"
  | "milestone"
  | "year_tree"
  | "time_capsule";

export type ActivityItem = {
  id: string;
  kind: ActivityItemKind;
  tone: ActivityItemTone;
  sectionKey: ActivitySectionKey;
  entityKind: ActivityEntityKind;
  entityId: string | null;
  title: string;
  message: string | null;
  actionable: boolean;
  createdAt: string | null;
  dueDate: string | null;
};

export type TrailTreeGrowthStage =
  | "sprout"
  | "young"
  | "growing"
  | "blooming"
  | "mature";

export type TrailTreeGrowthSnapshot = {
  stage: TrailTreeGrowthStage;
  bloomedPagesCount: number;
  uniqueFlowerFamiliesCount: number;
  milestoneBloomsCount: number;
  specialBloomsCount: number;
  assetPath: string | null;
};

export type MapLinkKind = "place" | "route";

export type PageMapPresenceKind =
  | "memory"
  | "favorite"
  | "route_stop"
  | "time_capsule";

export type PlanTypeVisualContract = {
  flowerFamily: FlowerFamily;
  suggestedElement: ElementKind;
  flowerAssetPath: string | null;
  seedAssetPath: string | null;
};

export function normalizeFlowerFamily(value: unknown): FlowerFamily | null {
  const raw = String(value ?? "").trim().toLowerCase();
  return FLOWER_FAMILY_ORDER.find((item) => item === raw) ?? null;
}

export function normalizeElementKind(value: unknown): ElementKind {
  return normalizeElementCode(value);
}

export function getFlowerFamilyFromLegacyElement(value: unknown): FlowerFamily {
  return (
    LEGACY_ELEMENT_TO_FLOWER_FAMILY[normalizeElementKind(value)] ?? DEFAULT_FLOWER_FAMILY
  );
}

export function getSuggestedElementForFlowerFamily(
  flowerFamily: FlowerFamily | null | undefined,
): ElementKind {
  return FLOWER_FAMILY_TO_ELEMENT_KIND[flowerFamily ?? DEFAULT_FLOWER_FAMILY];
}

export function resolveFlowerFamilyFromPlanType(input: {
  flowerFamily?: unknown;
  code?: unknown;
  suggestedElement?: unknown;
}): FlowerFamily {
  const explicitFamily = normalizeFlowerFamily(input.flowerFamily);
  if (explicitFamily) return explicitFamily;

  const normalizedCode = String(input.code ?? "").trim().toLowerCase();
  if (normalizedCode && PLAN_TYPE_CODE_TO_FLOWER_FAMILY[normalizedCode]) {
    return PLAN_TYPE_CODE_TO_FLOWER_FAMILY[normalizedCode];
  }

  return getFlowerFamilyFromLegacyElement(input.suggestedElement);
}

export function summarizeJointWatering(input: {
  scheduledDate?: string | null;
  nowDate?: string | null;
  requiredParticipants: number;
  confirmedParticipants: number;
  lastConfirmedAt?: string | null;
}): JointWateringSummary {
  const requiredParticipants = Math.max(1, Math.trunc(input.requiredParticipants || 1));
  const confirmedParticipants = Math.max(
    0,
    Math.min(requiredParticipants, Math.trunc(input.confirmedParticipants || 0)),
  );
  const remainingParticipants = Math.max(0, requiredParticipants - confirmedParticipants);
  const scheduledDate = String(input.scheduledDate ?? "").trim() || null;
  const nowDate = String(input.nowDate ?? "").trim() || null;
  const enabledByDate =
    !scheduledDate || !nowDate || scheduledDate <= nowDate;

  let state: JointWateringState = "not_ready";
  if (confirmedParticipants >= requiredParticipants) {
    state = "completed";
  } else if (!enabledByDate) {
    state = "not_ready";
  } else if (confirmedParticipants === 0) {
    state = "ready_to_water";
  } else {
    state = "waiting_partner";
  }

  return {
    requiredParticipants,
    confirmedParticipants,
    remainingParticipants,
    state,
    enabledAtDate: enabledByDate ? scheduledDate : null,
    lastConfirmedAt: String(input.lastConfirmedAt ?? "").trim() || null,
  };
}
