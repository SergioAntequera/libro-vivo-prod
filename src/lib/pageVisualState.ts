import type { SupabaseClient } from "@supabase/supabase-js";
import { buildPageVisualSnapshot, type PageVisualSnapshot } from "@/lib/pageVisualSnapshot";
import {
  normalizePlanFlowerComposerConfig,
  type PlanFlowerComposerConfig,
} from "@/lib/planTypeFlowerComposer";
import {
  normalizeElementKind,
  normalizeFlowerFamily,
  type FlowerFamily,
} from "@/lib/productDomainContracts";
import { isSchemaNotReadyError, withGardenScope } from "@/lib/gardens";
import { toErrorMessage } from "@/lib/errorMessage";

type SupabaseLikeClient = Pick<SupabaseClient, "from">;

export type PageVisualStateRow = {
  page_id?: unknown;
  garden_id?: unknown;
  plan_type_id?: unknown;
  plan_type_code?: unknown;
  plan_type_label?: unknown;
  plan_category?: unknown;
  flower_family?: unknown;
  flower_asset_path?: unknown;
  flower_builder_config?: unknown;
  suggested_element?: unknown;
  page_element?: unknown;
  rating?: unknown;
  cover_photo_url?: unknown;
  thumbnail_url?: unknown;
  secondary_photo_url?: unknown;
  has_secondary_photo?: unknown;
  generated_at?: unknown;
  updated_at?: unknown;
};

export type PageVisualState = {
  pageId: string;
  gardenId: string;
  planTypeId: string | null;
  planTypeCode: string | null;
  planTypeLabel: string | null;
  planCategory: string | null;
  planFlowerFamily: FlowerFamily | null;
  planFlowerAssetPath: string | null;
  planFlowerBuilderConfig: PlanFlowerComposerConfig | null;
  planSuggestedElement: string | null;
  pageElement: string | null;
  rating: number | null;
  coverPhotoUrl: string | null;
  thumbnailUrl: string | null;
  secondaryPhotoUrl: string | null;
  hasSecondaryPhoto: boolean;
  generatedAt: string | null;
  updatedAt: string | null;
};

export type LoadPageVisualStatesResult = {
  states: PageVisualState[];
  errorMessage: string | null;
  schemaMissing: boolean;
};

function normalizeText(value: unknown) {
  if (typeof value !== "string") return null;
  const next = value.trim();
  return next || null;
}

function toFiniteNumber(value: unknown) {
  const num =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(num) ? num : null;
}

function toBoolean(value: unknown) {
  return value === true;
}

function toIsoTimestamp(value: unknown) {
  if (typeof value !== "string") return null;
  const next = value.trim();
  return next || null;
}

export function mapPageVisualStateRow(
  row: PageVisualStateRow | null | undefined,
): PageVisualState | null {
  if (!row) return null;

  const pageId = normalizeText(row.page_id);
  const gardenId = normalizeText(row.garden_id);
  if (!pageId || !gardenId) return null;

  return {
    pageId,
    gardenId,
    planTypeId: normalizeText(row.plan_type_id),
    planTypeCode: normalizeText(row.plan_type_code),
    planTypeLabel: normalizeText(row.plan_type_label),
    planCategory: normalizeText(row.plan_category),
    planFlowerFamily: normalizeFlowerFamily(row.flower_family),
    planFlowerAssetPath: normalizeText(row.flower_asset_path),
    planFlowerBuilderConfig: normalizePlanFlowerComposerConfig(row.flower_builder_config ?? null),
    planSuggestedElement: normalizeText(row.suggested_element),
    pageElement: normalizeElementKind(row.page_element),
    rating: toFiniteNumber(row.rating),
    coverPhotoUrl: normalizeText(row.cover_photo_url),
    thumbnailUrl: normalizeText(row.thumbnail_url),
    secondaryPhotoUrl: normalizeText(row.secondary_photo_url),
    hasSecondaryPhoto: toBoolean(row.has_secondary_photo),
    generatedAt: toIsoTimestamp(row.generated_at),
    updatedAt: toIsoTimestamp(row.updated_at),
  };
}

export function indexPageVisualStatesByPageId(states: PageVisualState[]) {
  return new Map(states.map((state) => [state.pageId, state] as const));
}

export function buildPageVisualSnapshotFromState(
  state: Pick<
    PageVisualState,
    | "planCategory"
    | "planFlowerFamily"
    | "planFlowerAssetPath"
    | "planFlowerBuilderConfig"
    | "planSuggestedElement"
    | "pageElement"
    | "rating"
    | "coverPhotoUrl"
    | "thumbnailUrl"
  >,
): PageVisualSnapshot {
  return buildPageVisualSnapshot({
    planCategory: state.planCategory,
    planFlowerFamily: state.planFlowerFamily,
    planFlowerAssetPath: state.planFlowerAssetPath,
    planFlowerBuilderConfig: state.planFlowerBuilderConfig,
    planSuggestedElement: state.planSuggestedElement,
    element: state.pageElement,
    rating: state.rating,
    coverPhotoUrl: state.coverPhotoUrl,
    thumbnailUrl: state.thumbnailUrl,
  });
}

export async function loadPageVisualStates(
  client: SupabaseLikeClient,
  params: {
    gardenId: string | null | undefined;
    pageIds?: string[];
  },
): Promise<LoadPageVisualStatesResult> {
  const gardenId = typeof params.gardenId === "string" ? params.gardenId.trim() : "";
  if (!gardenId) {
    return {
      states: [],
      errorMessage: null,
      schemaMissing: false,
    };
  }

  const pageIds = Array.from(
    new Set(
      (params.pageIds ?? [])
        .map((pageId) => String(pageId ?? "").trim())
        .filter(Boolean),
    ),
  );

  function createBaseQuery() {
    return withGardenScope(
      client
        .from("page_visual_states")
        .select(
          "page_id,garden_id,plan_type_id,plan_type_code,plan_type_label,plan_category,flower_family,flower_asset_path,flower_builder_config,suggested_element,page_element,rating,cover_photo_url,thumbnail_url,secondary_photo_url,has_secondary_photo,generated_at,updated_at",
        )
        .order("page_id", { ascending: true }),
      gardenId,
    );
  }

  const PAGE_SIZE = 1000;
  const rows: PageVisualStateRow[] = [];
  let from = 0;

  while (true) {
    let pageQuery: any = createBaseQuery();
    if (pageIds.length > 0 && typeof pageQuery?.in === "function") {
      pageQuery = pageQuery.in("page_id", pageIds);
    }
    if (typeof pageQuery?.range === "function") {
      pageQuery = pageQuery.range(from, from + PAGE_SIZE - 1);
    }

    const { data, error } = await pageQuery;
    if (error) {
      return {
        states: [],
        errorMessage: toErrorMessage(error, "No se pudo leer el estado visual de las paginas."),
        schemaMissing: isSchemaNotReadyError(error),
      };
    }

    const batch = (data as PageVisualStateRow[] | null) ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return {
    states: rows
      .map((row) => mapPageVisualStateRow(row))
      .filter((row): row is PageVisualState => row !== null),
    errorMessage: null,
    schemaMissing: false,
  };
}
