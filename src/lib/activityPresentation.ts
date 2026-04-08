import type {
  ActivityItem,
  ActivityItemKind,
  ActivitySectionKey,
} from "@/lib/productDomainContracts";

export type ActivitySectionDefinition = {
  key: ActivitySectionKey;
  title: string;
  hint: string;
  emptyTitle: string;
  emptyMessage: string;
};

export const ACTIVITY_SECTION_ORDER: ActivitySectionKey[] = ["now", "review", "news"];

export const ACTIVITY_SECTION_DEFINITIONS: Record<
  ActivitySectionKey,
  ActivitySectionDefinition
> = {
  now: {
    key: "now",
    title: "Ahora",
    hint: "Lo que pide una entrada clara o una accion inmediata dentro del jardin.",
    emptyTitle: "No hay nada urgente ahora mismo",
    emptyMessage:
      "Cuando algo os pida entrar, acompanar o resolver un gesto compartido, aparecera aqui primero.",
  },
  review: {
    key: "review",
    title: "Pendiente de revisar",
    hint: "Cosas importantes que conviene mirar, aunque no exijan entrar ahora mismo.",
    emptyTitle: "No hay nada pendiente de revisar",
    emptyMessage:
      "Los cambios relevantes del jardin y las huellas que merecen una mirada calmada apareceran aqui.",
  },
  news: {
    key: "news",
    title: "Novedades",
    hint: "Movimiento util del jardin que suma contexto, pero no mete prisa.",
    emptyTitle: "No hay novedades ahora mismo",
    emptyMessage:
      "La actividad reciente que aporta contexto sin pedir accion inmediata aparecera aqui.",
  },
};

const NOW_KINDS = new Set<ActivityItemKind>([
  "shared_preparation",
  "flower_birth_pending",
  "water_seed",
  "complete_bloom_page",
  "garden_invitation",
  "special_annual_tree_ritual",
  "time_capsule_ready",
]);

const REVIEW_KINDS = new Set<ActivityItemKind>([
  "waiting_partner",
  "milestone_unlocked",
  "partner_updated_page",
]);

export function resolveActivitySectionKey(input: Pick<ActivityItem, "kind" | "tone" | "actionable">) {
  if (NOW_KINDS.has(input.kind)) return "now";
  if (REVIEW_KINDS.has(input.kind)) return "review";
  if (input.tone === "pending") return "now";
  if (input.tone === "special" && input.actionable) return "now";
  if (input.actionable) return "review";
  return "news";
}

export function formatActivityUnseenLabel(count: number, options?: { compact?: boolean }) {
  if (count <= 0) return "Todo al dia";
  if (options?.compact) {
    return count === 1 ? "1 nueva" : `${count} nuevas`;
  }
  return count === 1 ? "1 novedad por ver" : `${count} novedades por ver`;
}
