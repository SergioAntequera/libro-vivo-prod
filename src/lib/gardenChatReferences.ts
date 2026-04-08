import type { TimeCapsuleRow } from "@/lib/timeCapsuleModel";
import type { PageRow } from "@/lib/pageDetailTypes";
import type { PlansSeedView } from "@/lib/plansTypes";
import { capsuleStatusLabel, capsuleWindowLabel } from "@/lib/timeCapsuleModel";
import {
  getCapsuleDetailHref,
  getPageDetailHref,
  getPlansSeedHref,
  getYearBookHref,
} from "@/lib/productSurfaces";

export type GardenChatReferenceEntityKind = "page" | "capsule" | "year" | "plan";

export type GardenChatReferenceMetadata = {
  entity_kind: GardenChatReferenceEntityKind;
  entity_id: string;
  title: string;
  snippet: string;
  href: string;
  cover_url: string | null;
  meta_label: string | null;
};

function trimToLength(value: string, maxLength: number) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function fallbackPageTitle(page: Pick<PageRow, "title" | "date">) {
  const title = String(page.title ?? "").trim();
  if (title) return title;
  return `Flor del ${String(page.date ?? "").slice(0, 10) || "jardin"}`;
}

function pageSnippet(page: Pick<PageRow, "plan_summary" | "date" | "location_label">) {
  const summary = trimToLength(String(page.plan_summary ?? ""), 180);
  if (summary) return summary;
  const location = String(page.location_label ?? "").trim();
  if (location) return `Recuerdo guardado el ${String(page.date ?? "").slice(0, 10)} en ${location}.`;
  return `Recuerdo compartido del ${String(page.date ?? "").slice(0, 10)}.`;
}

export function buildGardenChatPageReference(input: {
  page: PageRow;
  planTypeLabel?: string | null;
}) {
  const title = fallbackPageTitle(input.page);
  const planTypeLabel = String(input.planTypeLabel ?? "").trim();
  return {
    entity_kind: "page",
    entity_id: input.page.id,
    title,
    snippet: pageSnippet(input.page),
    href: getPageDetailHref(input.page.id),
    cover_url: input.page.cover_photo_url ?? null,
    meta_label: planTypeLabel || String(input.page.date ?? "").slice(0, 10) || null,
  } satisfies GardenChatReferenceMetadata;
}

export function buildGardenChatYearReference(input: {
  year: number;
  note: string;
  flowerCount: number;
  shownCover?: string | null;
}) {
  const flowerCount = Number.isFinite(input.flowerCount) ? Math.max(0, Math.round(input.flowerCount)) : 0;
  const note = trimToLength(String(input.note ?? ""), 180);
  return {
    entity_kind: "year",
    entity_id: String(input.year),
    title: `Libro del ${input.year}`,
    snippet: note || `Capitulo anual con ${flowerCount} flor(es) visibles en este jardin.`,
    href: getYearBookHref(input.year),
    cover_url: input.shownCover ?? null,
    meta_label: flowerCount > 0 ? `${flowerCount} flor(es)` : "Memoria anual",
  } satisfies GardenChatReferenceMetadata;
}

export function buildGardenChatPlanReference(item: PlansSeedView) {
  const notes = trimToLength(String(item.seed.notes ?? ""), 180);
  const metaPieces = [item.planTypeLabel, item.effectiveDate, item.linkedPlaceLabel]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  return {
    entity_kind: "plan",
    entity_id: item.seed.id,
    title: String(item.seed.title ?? "").trim() || "Plan del jardin",
    snippet: notes || `Estado actual: ${item.stageLabel.toLowerCase()}.`,
    href: getPlansSeedHref(item.seed.id),
    cover_url: null,
    meta_label: metaPieces[0] ?? item.stageLabel,
  } satisfies GardenChatReferenceMetadata;
}

export function buildGardenChatCapsuleReference(capsule: TimeCapsuleRow) {
  const windowLabel = capsuleWindowLabel(capsule.window_code);
  const statusLabel = capsuleStatusLabel(capsule.status);
  return {
    entity_kind: "capsule",
    entity_id: capsule.id,
    title: String(capsule.title ?? "").trim() || "Capsula del tiempo",
    snippet:
      capsule.status === "opened"
        ? `Abierta el ${String(capsule.opened_at ?? "").slice(0, 10)} tras una ventana de ${windowLabel.toLowerCase()}.`
        : `Sellada el ${String(capsule.sealed_at ?? "").slice(0, 10)} y prevista para abrirse el ${String(capsule.opens_at ?? "").slice(0, 10)}.`,
    href: getCapsuleDetailHref(capsule.id),
    cover_url: null,
    meta_label: statusLabel,
  } satisfies GardenChatReferenceMetadata;
}

function isEntityKind(value: string): value is GardenChatReferenceEntityKind {
  return value === "page" || value === "capsule" || value === "year" || value === "plan";
}

export function normalizeGardenChatReferenceMetadata(
  raw: Record<string, unknown> | null | undefined,
): GardenChatReferenceMetadata | null {
  const entityKind = String(raw?.entity_kind ?? "").trim();
  const entityId = String(raw?.entity_id ?? "").trim();
  const title = String(raw?.title ?? "").trim();
  const snippet = String(raw?.snippet ?? "").trim();
  const href = String(raw?.href ?? "").trim();
  const coverUrl = typeof raw?.cover_url === "string" && raw.cover_url.trim()
    ? raw.cover_url.trim()
    : null;
  const metaLabel = typeof raw?.meta_label === "string" && raw.meta_label.trim()
    ? raw.meta_label.trim()
    : null;

  if (!isEntityKind(entityKind) || !entityId || !title || !snippet || !href.startsWith("/")) {
    return null;
  }

  return {
    entity_kind: entityKind,
    entity_id: entityId,
    title,
    snippet,
    href,
    cover_url: coverUrl,
    meta_label: metaLabel,
  };
}

export function gardenChatReferenceEntityLabel(entityKind: GardenChatReferenceEntityKind) {
  if (entityKind === "page") return "Flor";
  if (entityKind === "capsule") return "Capsula";
  if (entityKind === "year") return "Año";
  return "Plan";
}
