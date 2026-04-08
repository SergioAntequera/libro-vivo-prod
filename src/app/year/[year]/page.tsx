"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getSessionAccessToken, getSessionUser } from "@/lib/auth";
import {
  isSchemaNotReadyError,
  resolveActiveGardenIdForUser,
  withGardenIdOnInsert,
  withGardenScope,
} from "@/lib/gardens";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { useGardenCompanionLabel } from "@/components/chat/useGardenCompanionLabel";
import { buildGardenChatYearReference } from "@/lib/gardenChatReferences";
import { sendGardenChatReferenceMessage } from "@/lib/gardenChatMutations";
import YearHeroHeader from "@/components/year/YearHeroHeader";
import YearChaptersSection, {
  type YearChapterView,
  type YearSequenceDensity,
} from "@/components/year/YearChaptersSection";
import { annualTreePhaseLabel } from "@/lib/annualTreeEngine";
import { buildCanonicalAnnualTreeSnapshot } from "@/lib/annualTreeCanonical";
import {
  buildAnnualTreeSnapshotFromState,
  loadGardenYearTreeStates,
  type GardenYearTreeState,
} from "@/lib/annualTreeState";
import {
  DEFAULT_HOME_TRAIL_RUNTIME_CONFIG,
  getHomeTrailRuntimeConfig,
} from "@/lib/homeTrailCatalog";
import {
  DEFAULT_FUTURE_MOMENTS_CONFIG,
  getFutureMomentsConfig,
  type FutureMomentsConfig,
} from "@/lib/futureMomentsConfig";
import { seasonFromDate, type Season } from "@/lib/forestLogic";
import { buildPageVisualSnapshot } from "@/lib/pageVisualSnapshot";
import {
  indexPageVisualStatesByPageId,
  loadPageVisualStates,
} from "@/lib/pageVisualState";
import { mapGardenPlanTypeRow } from "@/lib/planTypeCatalog";
import type { PlanFlowerComposerConfig } from "@/lib/planTypeFlowerComposer";
import {
  FLOWER_FAMILY_LABELS,
  getFlowerFamilyFromLegacyElement,
  normalizeElementKind,
  type FlowerFamily,
} from "@/lib/productDomainContracts";
import {
  getNewPageHref,
  getPageDetailHref,
  getProductSurfaceHref,
  getYearBookHref,
} from "@/lib/productSurfaces";
import {
  isMissingYearHighlightPageIdsError,
  normalizeYearHighlightPageIds,
  resolveExplicitYearHighlights,
} from "@/lib/yearHighlightSelection";
import { resolveSharedGardenRequiredParticipants } from "@/lib/sharedGardenSessions";
import { countClaimedProgressionRewards } from "@/lib/progressionRewardsRuntime";
import {
  buildClaimedProgressionMilestoneVisuals,
  type ClaimedProgressionMilestoneVisual,
} from "@/lib/annualProgressionMilestones";
import {
  type CanonicalProgressionGraphStateRow,
  type CanonicalProgressionTreeRow,
  type CanonicalProgressionTreeUnlockRow,
} from "@/lib/progressionRuntime";
import { ProgressionMilestoneTree } from "@/components/shared/ProgressionMilestoneTree";
import { toErrorMessage } from "@/lib/errorMessage";
import AnnualTreeRitualPopup from "@/components/year/AnnualTreeRitualPopup";
import AnnualTreeMilestoneOverlay from "@/components/year/AnnualTreeMilestoneOverlay";
import { useAnnualTreeMilestoneOverlay } from "@/components/year/useAnnualTreeMilestoneOverlay";
import type { AnnualTreeRitualRow } from "@/lib/annualTreeRitual";
import { resolveAnnualTreeNarrative } from "@/lib/annualTreeNarrative";
import {
  hasAcknowledgedYearCycle,
  isYearCycleFullySynchronized,
  normalizeYearCycleStateRow,
  type YearCycleStateRow,
} from "@/lib/yearCycleState";

type PageItem = {
  id: string;
  title: string | null;
  date: string;
  rating: number | null;
  mood_state: "wilted" | "healthy" | "shiny";
  element: "fire" | "water" | "air" | "earth" | "aether";
  plan_type_id: string | null;
  plan_type_label: string | null;
  plan_category: string | null;
  flower_family: FlowerFamily;
  flower_asset_path: string | null;
  flower_builder_config: PlanFlowerComposerConfig | null;
  suggested_element: "fire" | "water" | "air" | "earth" | "aether";
  cover_photo_url: string | null;
  thumbnail_url: string | null;
  is_favorite: boolean;
};

type PageElementKind = "fire" | "water" | "air" | "earth" | "aether";

const ALL_SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];

function seasonTone(season: Season) {
  if (season === "spring") return { backgroundColor: "#f4fff6", borderColor: "#d7ead8" };
  if (season === "summer") return { backgroundColor: "#fffbe9", borderColor: "#ebe0b8" };
  if (season === "autumn") return { backgroundColor: "#fff3ea", borderColor: "#e7d2c4" };
  return { backgroundColor: "#eef6ff", borderColor: "#d5e0f0" };
}

function phaseTone(stage: number) {
  if (stage <= 8) return { backgroundColor: "#f5efdf", borderColor: "#d8c287", color: "#6f5d31" };
  if (stage <= 22) return { backgroundColor: "#e7f4df", borderColor: "#b4d39d", color: "#365938" };
  if (stage <= 38) return { backgroundColor: "#e0f2e2", borderColor: "#9dc7a6", color: "#2f5a43" };
  if (stage <= 56) return { backgroundColor: "#dff0ea", borderColor: "#94bcae", color: "#25564b" };
  if (stage <= 74) return { backgroundColor: "#e7efe0", borderColor: "#a1b68d", color: "#315136" };
  if (stage <= 90) return { backgroundColor: "#fff0f4", borderColor: "#e4bcc7", color: "#834d62" };
  return { backgroundColor: "#fff5dc", borderColor: "#dfc276", color: "#71501f" };
}

function ratingSummary(rating: number | null) {
  if (rating == null || rating <= 0) return "Sin valorar";
  const safe = Math.max(1, Math.min(5, Math.round(rating)));
  return `${safe}/5 estrellas`;
}

function ratingStars(rating: number | null) {
  if (rating == null || rating <= 0) return null;
  const safe = Math.max(1, Math.min(5, Math.round(rating)));
  return `${"★".repeat(safe)}${"☆".repeat(5 - safe)}`;
}

function shortDate(value: string) {
  return value.slice(0, 10);
}

function normalizePageElement(value: unknown): PageElementKind {
  const normalized = normalizeElementKind(value);
  if (
    normalized === "fire" ||
    normalized === "water" ||
    normalized === "air" ||
    normalized === "earth" ||
    normalized === "aether"
  ) {
    return normalized;
  }
  return "aether";
}

function monthKey(value: string) {
  return String(value ?? "").slice(0, 7);
}

function monthLabel(key: string) {
  if (!/^\d{4}-\d{2}$/.test(key)) return key;
  const year = Number(key.slice(0, 4));
  const monthIndex = Number(key.slice(5, 7)) - 1;
  const date = new Date(year, monthIndex, 1);
  if (Number.isNaN(date.getTime())) return key;
  return date.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

function pagePhoto(item: PageItem) {
  return item.cover_photo_url || item.thumbnail_url || null;
}

function pageFlowerIcon(item: PageItem) {
  return buildPageVisualSnapshot({
    planCategory: item.plan_category,
    planFlowerFamily: item.flower_family,
    planFlowerAssetPath: item.flower_asset_path,
    planFlowerBuilderConfig: item.flower_builder_config,
    planSuggestedElement: item.suggested_element,
    element: item.element,
    rating: item.rating,
    coverPhotoUrl: item.cover_photo_url,
    thumbnailUrl: item.thumbnail_url,
  }).primaryAssetPath;
}

function toFlowerFamilyLabel(item: Pick<PageItem, "flower_family">) {
  return FLOWER_FAMILY_LABELS[item.flower_family] ?? FLOWER_FAMILY_LABELS.estrella;
}

function safeYear(value: unknown) {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 1900 || year > 2200) return null;
  return year;
}

type YearPageStatusTone = "info" | "success" | "warning" | "error";

type YearCycleBroadcastEnvelope = {
  clientId: string;
  gardenId: string;
  year: number;
  actorUserId: string;
  sentAt: string;
};

function formatYearCycleTimestamp(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function uniqueUserIds(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value ?? "").trim())
        .filter(Boolean),
    ),
  );
}

function resolveYearCycleActorLabel(input: {
  userId: string | null | undefined;
  myProfileId: string | null | undefined;
  memberNamesById: Record<string, string>;
  fallback: string;
}) {
  const userId = String(input.userId ?? "").trim();
  if (!userId) return input.fallback;
  if (userId === String(input.myProfileId ?? "").trim()) return "tu parte";
  return input.memberNamesById[userId] ?? input.fallback;
}

export default function YearPage() {
  const router = useRouter();
  const params = useParams();
  const parsedYear = safeYear(params?.year);
  const year = parsedYear ?? new Date().getFullYear();
  const currentYear = new Date().getFullYear();

  const [items, setItems] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [highlightPageIds, setHighlightPageIds] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [fetchWarning, setFetchWarning] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<YearPageStatusTone>("info");
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [myProfileId, setMyProfileId] = useState("");
  const [memberNamesById, setMemberNamesById] = useState<Record<string, string>>({});
  const [yearMilestones, setYearMilestones] = useState(0);
  const [yearTreeState, setYearTreeState] = useState<GardenYearTreeState | null>(null);
  const [yearMilestoneTrees, setYearMilestoneTrees] = useState<ClaimedProgressionMilestoneVisual[]>([]);
  const [yearEditorialUnlocks, setYearEditorialUnlocks] = useState(0);
  const [chapterView, setChapterView] = useState<YearChapterView>("seasons");
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [showAllSeasonPages, setShowAllSeasonPages] = useState(false);
  const [sequenceMonthFilter, setSequenceMonthFilter] = useState<"all" | string>("all");
  const [sequenceFlowerFamilyFilter, setSequenceFlowerFamilyFilter] = useState<"all" | FlowerFamily>("all");
  const [sequenceOnlyFavorites, setSequenceOnlyFavorites] = useState(false);
  const [sequenceQuery, setSequenceQuery] = useState("");
  const [sequenceDensity, setSequenceDensity] = useState<YearSequenceDensity>("comfortable");
  const [activeGardenId, setActiveGardenId] = useState<string | null>(null);
  const [activeGardenMemberCount, setActiveGardenMemberCount] = useState(1);
  const [gardenReloadTick, setGardenReloadTick] = useState(0);
  const [homeTrailConfig, setHomeTrailConfig] = useState(DEFAULT_HOME_TRAIL_RUNTIME_CONFIG);
  const [futureMomentsConfig, setFutureMomentsConfig] = useState<FutureMomentsConfig>(
    DEFAULT_FUTURE_MOMENTS_CONFIG,
  );
  const [ritual, setRitual] = useState<AnnualTreeRitualRow | null>(null);
  const [showRitualPopup, setShowRitualPopup] = useState(false);
  const [yearCycleStateAvailable, setYearCycleStateAvailable] = useState(true);
  const [yearCycleState, setYearCycleState] = useState<YearCycleStateRow | null>(null);
  const [previousYearCycleState, setPreviousYearCycleState] = useState<YearCycleStateRow | null>(null);
  const [yearCycleSaving, setYearCycleSaving] = useState(false);
  const [sharingToChat, setSharingToChat] = useState(false);
  const chaptersRef = useRef<HTMLDivElement | null>(null);
  const yearCycleStateRef = useRef<YearCycleStateRow | null>(null);
  const previousYearCycleStateRef = useRef<YearCycleStateRow | null>(null);
  const yearCycleChannelRef = useRef<RealtimeChannel | null>(null);
  const yearCycleClientIdRef = useRef(
    `year-cycle-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  );

  const chatShareRecipientLabel = useMemo(() => {
    const currentProfileId = String(myProfileId ?? "").trim();
    for (const [userId, name] of Object.entries(memberNamesById)) {
      if (userId === currentProfileId) continue;
      const normalizedName = String(name ?? "").trim();
      if (normalizedName) return normalizedName.split(/\s+/)[0] || normalizedName;
    }
    return "la otra persona";
  }, [memberNamesById, myProfileId]);
  const { companionReference } = useGardenCompanionLabel(activeGardenId, myProfileId || null);

  useEffect(() => {
    yearCycleStateRef.current = yearCycleState;
  }, [yearCycleState]);

  useEffect(() => {
    previousYearCycleStateRef.current = previousYearCycleState;
  }, [previousYearCycleState]);

  const showStatusNotice = useCallback((message: string | null, tone: YearPageStatusTone = "info") => {
    setStatusMsg(message);
    setStatusTone(tone);
  }, []);

  useEffect(() => {
    if (parsedYear == null) {
      router.push(getYearBookHref(currentYear));
    }
  }, [currentYear, parsedYear, router]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const user = await getSessionUser();
        if (!user) {
          router.push(getProductSurfaceHref("login"));
          return;
        }
        setMyProfileId(user.id);
        const resolvedGardenId = await resolveActiveGardenIdForUser({
          userId: user.id,
          forceRefresh: true,
        }).catch(() => null);
        if (!active) return;
        setActiveGardenId(resolvedGardenId);

        if (!active) return;
        setLoading(true);
        setExportError(null);
        setFetchWarning(null);
        showStatusNotice(null);
        setEditing(false);

        const from = `${year}-01-01`;
        const nextYearFrom = `${year + 1}-01-01`;
        const to = `${year}-12-31`;

        const loadYearNoteRecord = async () => {
          const preferred = await withGardenScope(
            supabase
              .from("year_notes")
              .select("year,note,cover_url,highlight_page_ids")
              .eq("year", year),
            resolvedGardenId,
          ).maybeSingle();

          if (
            preferred.error &&
            isMissingYearHighlightPageIdsError(preferred.error.message)
          ) {
            return withGardenScope(
              supabase
                .from("year_notes")
                .select("year,note,cover_url")
                .eq("year", year),
              resolvedGardenId,
            ).maybeSingle();
          }

          return preferred;
        };

        const loadYearMilestonesRecord = async () => {
          const canonical = await withGardenScope(
            supabase
              .from("progression_tree_unlocks")
              .select("*", { count: "exact", head: true })
              .not("claimed_at", "is", null)
              .gte("claimed_at", from)
              .lt("claimed_at", nextYearFrom),
            resolvedGardenId,
          );
          if (!canonical.error) {
            return { count: canonical.count ?? 0, error: null as string | null };
          }
          if (!isSchemaNotReadyError(canonical.error)) {
            return { count: 0, error: canonical.error.message };
          }
          return { count: 0, error: null as string | null };
        };

        const loadYearEditorialUnlocksRecord = async () => {
          try {
            const count = await countClaimedProgressionRewards({
              gardenId: resolvedGardenId,
              kinds: ["year_chapter", "pdf_detail"],
              unlockedFrom: from,
              unlockedToExclusive: nextYearFrom,
            });
            return { count, error: null as string | null };
          } catch (error) {
            return { count: 0, error: toErrorMessage(error, "No se pudieron cargar desbloqueos editoriales.") };
          }
        };

        const [
          pagesRes,
          planTypesRes,
          yearNoteRes,
          allDatesRes,
          milestonesRes,
          editorialUnlocksRes,
          resolvedHomeTrailConfig,
          resolvedFutureMomentsConfig,
          progressionTreesRes,
          progressionUnlocksRes,
          progressionGraphRes,
          yearTreeStateRes,
          pageVisualStatesRes,
        ] = await Promise.all([
          withGardenScope(
            supabase
            .from("pages")
            .select(
              "id,title,date,rating,mood_state,element,plan_type_id,cover_photo_url,thumbnail_url,is_favorite",
            )
            .gte("date", from)
            .lte("date", to)
            .order("date", { ascending: true }),
            resolvedGardenId,
          ),
          withGardenScope(
            supabase
              .from("garden_plan_types")
              .select(
                "id,code,label,category,description,suggested_element,flower_family,icon_emoji,flower_asset_path,seed_asset_path,flower_builder_config,is_custom,sort_order,archived_at",
              )
              .is("archived_at", null),
            resolvedGardenId,
          ),
          loadYearNoteRecord(),
          withGardenScope(
            supabase
            .from("pages")
            .select("date")
            .order("date", { ascending: false }),
            resolvedGardenId,
          ),
          loadYearMilestonesRecord(),
          loadYearEditorialUnlocksRecord(),
          getHomeTrailRuntimeConfig(),
          getFutureMomentsConfig(),
          supabase
            .from("progression_tree_nodes")
            .select("id,title,description,accent_color,rank,rarity,leaf_variant,enabled"),
          withGardenScope(
            supabase
              .from("progression_tree_unlocks")
              .select("id,tree_id,unlocked_at,claimed_at")
              .not("claimed_at", "is", null)
              .gte("claimed_at", from)
              .lt("claimed_at", nextYearFrom)
              .order("claimed_at", { ascending: false }),
            resolvedGardenId,
          ),
          supabase
            .from("progression_graph_state")
            .select("tree_settings")
            .eq("key", "default")
            .maybeSingle(),
          loadGardenYearTreeStates(supabase, { gardenId: resolvedGardenId, years: [year] }),
          loadPageVisualStates(supabase, { gardenId: resolvedGardenId }),
        ]);

        if (!active) return;
        setYearTreeState(yearTreeStateRes.states[0] ?? null);
        if (yearTreeStateRes.errorMessage && !yearTreeStateRes.schemaMissing) {
          setFetchWarning((prev) => prev ?? `Aviso: ${yearTreeStateRes.errorMessage}`);
        }
        if (pageVisualStatesRes.errorMessage && !pageVisualStatesRes.schemaMissing) {
          setFetchWarning((prev) => prev ?? `Aviso: ${pageVisualStatesRes.errorMessage}`);
        }

        setHomeTrailConfig(resolvedHomeTrailConfig);
        setFutureMomentsConfig(resolvedFutureMomentsConfig);

        const planTypeById = new Map<string, ReturnType<typeof mapGardenPlanTypeRow>>();
        if (!planTypesRes.error) {
          for (const row of ((planTypesRes.data as Record<string, unknown>[] | null) ?? [])) {
            const mapped = mapGardenPlanTypeRow(row);
            planTypeById.set(mapped.id, mapped);
          }
        }

        if (!pagesRes.error) {
          const pageVisualStateById = indexPageVisualStatesByPageId(pageVisualStatesRes.states);
          const mappedItems =
            (((pagesRes.data as Array<Record<string, unknown>> | null) ?? []).map((row) => {
              const pageId = String(row.id ?? "");
              const pageVisualState = pageVisualStateById.get(pageId) ?? null;
              const planTypeId = String(row.plan_type_id ?? "").trim() || null;
              const planType = planTypeId ? planTypeById.get(planTypeId) ?? null : null;
              const legacyElement = normalizePageElement(row.element);

              return {
                id: pageId,
                title: typeof row.title === "string" ? row.title : null,
                date: String(row.date ?? ""),
                rating:
                  pageVisualState?.rating ??
                  (typeof row.rating === "number"
                    ? row.rating
                    : row.rating == null
                      ? null
                      : Number(row.rating)),
                mood_state:
                  row.mood_state === "wilted" || row.mood_state === "healthy" || row.mood_state === "shiny"
                    ? row.mood_state
                    : "healthy",
                element: normalizePageElement(pageVisualState?.pageElement ?? legacyElement),
                plan_type_id: pageVisualState?.planTypeId ?? planTypeId,
                plan_type_label: pageVisualState?.planTypeLabel ?? planType?.label ?? null,
                plan_category: pageVisualState?.planCategory ?? planType?.category ?? null,
                flower_family:
                  pageVisualState?.planFlowerFamily ??
                  planType?.flowerFamily ??
                  getFlowerFamilyFromLegacyElement(legacyElement),
                flower_asset_path:
                  pageVisualState?.planFlowerAssetPath ?? planType?.flowerAssetPath ?? null,
                flower_builder_config:
                  pageVisualState?.planFlowerBuilderConfig ??
                  planType?.flowerBuilderConfig ??
                  null,
                suggested_element: normalizePageElement(
                  pageVisualState?.planSuggestedElement ??
                    planType?.suggestedElement ??
                    legacyElement,
                ),
                cover_photo_url:
                  pageVisualState?.coverPhotoUrl ??
                  (typeof row.cover_photo_url === "string" ? row.cover_photo_url : null),
                thumbnail_url:
                  pageVisualState?.thumbnailUrl ??
                  (typeof row.thumbnail_url === "string" ? row.thumbnail_url : null),
                is_favorite: Boolean(row.is_favorite),
              } satisfies PageItem;
            })) ?? [];
          setItems(mappedItems);
        } else {
          setItems([]);
          setFetchWarning(
            `Aviso: no se pudieron cargar páginas del año (${pagesRes.error.message}).`,
          );
        }

        if (yearNoteRes.error) {
          setFetchWarning((prev) =>
            prev ??
            `Aviso: no se pudo cargar la memoria anual (${yearNoteRes.error.message}).`,
          );
          setNote("");
          setCoverUrl(null);
          setHighlightPageIds([]);
        } else {
          setNote(yearNoteRes.data?.note ?? "");
          setCoverUrl(yearNoteRes.data?.cover_url ?? null);
          setHighlightPageIds(
            normalizeYearHighlightPageIds(
              (yearNoteRes.data as { highlight_page_ids?: unknown } | null)?.highlight_page_ids,
            ),
          );
        }

        const progressionErrors = [
          progressionTreesRes.error,
          progressionUnlocksRes.error,
          progressionGraphRes.error,
        ].filter(Boolean);
        const progressionBlocking = progressionErrors.find((error) => !isSchemaNotReadyError(error));
        if (!progressionBlocking && progressionErrors.length === 0) {
          const canonicalMilestones = buildClaimedProgressionMilestoneVisuals({
            trees: ((progressionTreesRes.data as CanonicalProgressionTreeRow[] | null) ?? []).filter(
              (tree) => tree.enabled !== false,
            ),
            unlocks: (progressionUnlocksRes.data as CanonicalProgressionTreeUnlockRow[] | null) ?? [],
            graphStateRow: (progressionGraphRes.data as CanonicalProgressionGraphStateRow | null) ?? null,
            claimedFrom: from,
            claimedToExclusive: nextYearFrom,
          });
          setYearMilestoneTrees(canonicalMilestones);
          setYearMilestones(canonicalMilestones.length);
        } else if (milestonesRes.error) {
          setFetchWarning((prev) =>
            prev ??
            `Aviso: no se pudieron cargar hitos del año (${milestonesRes.error}).`,
          );
          setYearMilestones(0);
          setYearMilestoneTrees([]);
        } else {
          setYearMilestones(milestonesRes.count ?? 0);
          setYearMilestoneTrees([]);
          if (progressionBlocking) {
            setFetchWarning((prev) =>
              prev ??
              `Aviso: no se pudo leer la semántica canónica de hitos (${progressionBlocking.message}).`,
            );
          }
        }

        if (editorialUnlocksRes.error) {
          setFetchWarning((prev) => prev ?? `Aviso: ${editorialUnlocksRes.error}`);
          setYearEditorialUnlocks(0);
        } else {
          setYearEditorialUnlocks(editorialUnlocksRes.count ?? 0);
        }

        const yearSet = new Set<number>([year, currentYear]);
        if (allDatesRes.error) {
          setFetchWarning((prev) =>
            prev ??
            `Aviso: no se pudo cargar la navegación de años (${allDatesRes.error.message}).`,
          );
        } else {
          for (const row of (allDatesRes.data as Array<{ date: string }> | null) ?? []) {
            const itemYear = safeYear(String(row.date).slice(0, 4));
            if (itemYear != null) yearSet.add(itemYear);
          }
        }
        setAvailableYears(Array.from(yearSet).sort((a, b) => b - a));
      } catch (error) {
        if (!active) return;
        setItems([]);
        setYearTreeState(null);
        setFetchWarning(`Aviso: ${toErrorMessage(error, "No se pudo cargar el libro anual.")}`);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [currentYear, gardenReloadTick, router, year]);

  useEffect(() => {
    if (!activeGardenId) {
      setActiveGardenMemberCount(1);
      setYearCycleStateAvailable(true);
      setYearCycleState(null);
      setPreviousYearCycleState(null);
      return;
    }

    let active = true;
    (async () => {
      const [memberCountRes, currentYearCycleRes, previousYearCycleRes] = await Promise.all([
        supabase.rpc("get_active_garden_member_count", {
          target_garden_id: activeGardenId,
        }),
        withGardenScope(
          supabase
            .from("year_cycle_states")
            .select("*")
            .eq("year", year)
            .maybeSingle(),
          activeGardenId,
        ),
        year === currentYear
          ? withGardenScope(
              supabase
                .from("year_cycle_states")
                .select("*")
                .eq("year", year - 1)
                .maybeSingle(),
              activeGardenId,
            )
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (!active) return;

      if (memberCountRes.error == null && Number(memberCountRes.data) > 0) {
        setActiveGardenMemberCount(Number(memberCountRes.data));
      } else {
        setActiveGardenMemberCount(1);
      }

      if (currentYearCycleRes.error) {
        if (isSchemaNotReadyError(currentYearCycleRes.error)) {
          setYearCycleStateAvailable(false);
          setYearCycleState(null);
        } else {
          console.warn("[year/page] no se pudo cargar year_cycle_states:", currentYearCycleRes.error);
        }
      } else {
        setYearCycleStateAvailable(true);
        setYearCycleState(
          normalizeYearCycleStateRow(
            (currentYearCycleRes.data as Record<string, unknown> | null) ?? {},
          ),
        );
      }

      if (previousYearCycleRes.error) {
        if (isSchemaNotReadyError(previousYearCycleRes.error)) {
          setPreviousYearCycleState(null);
        } else {
          console.warn("[year/page] no se pudo cargar year_cycle_states del año anterior:", previousYearCycleRes.error);
        }
      } else {
        setPreviousYearCycleState(
          normalizeYearCycleStateRow(
            (previousYearCycleRes.data as Record<string, unknown> | null) ?? {},
          ),
        );
      }
    })();

    return () => {
      active = false;
    };
  }, [activeGardenId, currentYear, year]);

  useEffect(() => {
    if (!activeGardenId) {
      setMemberNamesById({});
      return;
    }

    let active = true;
    (async () => {
      const { data: memberRows, error: memberError } = await withGardenScope(
        supabase
          .from("garden_members")
          .select("user_id")
          .is("left_at", null),
        activeGardenId,
      );

      if (!active || memberError) return;

      const userIds = uniqueUserIds(
        (((memberRows as Array<{ user_id?: string | null }> | null) ?? []).map((row) => row.user_id)),
      );
      if (!userIds.length) {
        if (active) setMemberNamesById({});
        return;
      }

      const { data: profileRows, error: profileError } = await supabase
        .from("profiles")
        .select("id,name")
        .in("id", userIds);

      if (!active || profileError) return;

      setMemberNamesById(
        (((profileRows as Array<{ id?: string | null; name?: string | null }> | null) ?? [])).reduce<
          Record<string, string>
        >((acc, row) => {
          const userId = String(row.id ?? "").trim();
          if (!userId) return acc;
          acc[userId] = String(row.name ?? "").trim() || "Persona del jardín";
          return acc;
        }, {}),
      );
    })();

    return () => {
      active = false;
    };
  }, [activeGardenId]);

  // Fetch annual tree ritual for this year
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token = await getSessionAccessToken();
        if (!token) return;
        const res = await fetch(`/api/rituals?year=${year}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { rituals?: AnnualTreeRitualRow[] };
        if (!active) return;
        const rows = Array.isArray(data?.rituals) ? data.rituals : [];
        setRitual(rows.length > 0 ? rows[0] : null);
      } catch {
        // silently ignore  ritual is optional
      }
    })();
    return () => { active = false; };
  }, [year, gardenReloadTick]);

  async function handlePlantRitual(data: {
    locationLabel: string;
    locationLat: number | null;
    locationLng: number | null;
    notes: string;
  }) {
    const token = await getSessionAccessToken();
    if (!token) throw new Error("No autenticado");
    const res = await fetch("/api/rituals", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        year,
        locationLabel: data.locationLabel,
        locationLat: data.locationLat,
        locationLng: data.locationLng,
        notes: data.notes,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? "No se pudo registrar el ritual.");
    }
    const body = (await res.json()) as { ritual?: AnnualTreeRitualRow };
    const created = body?.ritual ?? null;
    if (!created) {
      throw new Error("La API no devolvió el ritual guardado.");
    }
    setRitual(created);
    setShowRitualPopup(false);
    showStatusNotice("Ritual del árbol registrado.", "success");
  }

  function handleOpenTreeRitual() {
    setShowRitualPopup(true);
  }

  function handleOpenTreeRitualFromMilestone() {
    dismissMilestoneOverlay();
    setShowRitualPopup(true);
  }

  const stats = useMemo(() => {
    const total = items.length;
    const avgStars =
      total === 0
        ? 0
        : items.reduce((acc, item) => acc + (item.rating ?? 0), 0) / total;
    const shinyCount = items.filter((item) => item.mood_state === "shiny").length;
    const favoriteCount = items.filter((item) => item.is_favorite).length;
    const activeMonths = new Set(items.map((item) => item.date.slice(0, 7))).size;

    const byFlowerFamily: Record<string, number> = {};
    for (const item of items) {
      byFlowerFamily[item.flower_family] = (byFlowerFamily[item.flower_family] ?? 0) + 1;
    }
    const topFlowerFamily =
      Object.entries(byFlowerFamily).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      total,
      avgStars,
      shinyCount,
      favoriteCount,
      activeMonths,
      topFlowerFamily,
    };
  }, [items]);

  const annualTreeSnapshot = useMemo(() => {
    if (yearTreeState) {
      return buildAnnualTreeSnapshotFromState(
        yearTreeState,
        homeTrailConfig.annualTreeAssets,
      );
    }
    return buildCanonicalAnnualTreeSnapshot({
      year,
      pages: items,
      milestonesUnlocked: yearMilestones,
      annualTreeAssets: homeTrailConfig.annualTreeAssets,
      idPrefix: "year-page",
      titleFallback: "Recuerdo del año",
    });
  }, [homeTrailConfig.annualTreeAssets, items, year, yearMilestones, yearTreeState]);
  const growth = annualTreeSnapshot.growth;

  const treeNarrative = useMemo(
    () =>
      resolveAnnualTreeNarrative({
        year,
        stage: growth.stage,
        ritual,
        entries: futureMomentsConfig.tree.narratives,
      }),
    [futureMomentsConfig.tree.narratives, growth.stage, ritual, year],
  );

  const { showMilestoneOverlay, dismissMilestoneOverlay } = useAnnualTreeMilestoneOverlay({
    profileId: myProfileId,
    gardenId: activeGardenId,
    year,
    milestoneStage: treeNarrative.milestoneStage,
  });

  const bestMoments = useMemo(() => {
    const explicitHighlights = resolveExplicitYearHighlights(items, highlightPageIds);
    if (explicitHighlights.length) return explicitHighlights;

    const favoriteMoments = items.filter((item) => item.is_favorite);
    const favoriteSorted = [...favoriteMoments].sort((a, b) => {
      if ((b.rating ?? 0) !== (a.rating ?? 0)) return (b.rating ?? 0) - (a.rating ?? 0);
      return String(b.date).localeCompare(String(a.date));
    });

    const rest = items.filter((item) => !item.is_favorite);
    const restSorted = [...rest].sort((a, b) => {
      if ((b.rating ?? 0) !== (a.rating ?? 0)) return (b.rating ?? 0) - (a.rating ?? 0);
      return String(b.date).localeCompare(String(a.date));
    });

    return [...favoriteSorted, ...restSorted].slice(0, 3);
  }, [highlightPageIds, items]);

  const autoCover = useMemo(() => {
    const favoriteWithImage =
      items.find((item) => item.is_favorite && pagePhoto(item)) ??
      items.find((item) => pagePhoto(item));
    return favoriteWithImage ? pagePhoto(favoriteWithImage) : null;
  }, [items]);

  const coverSuggestions = useMemo(() => {
    const seen = new Set<string>();
    return items
      .filter((item) => pagePhoto(item))
      .sort((a, b) => {
        if (Number(b.is_favorite) !== Number(a.is_favorite)) {
          return Number(b.is_favorite) - Number(a.is_favorite);
        }
        if ((b.rating ?? 0) !== (a.rating ?? 0)) return (b.rating ?? 0) - (a.rating ?? 0);
        return String(b.date).localeCompare(String(a.date));
      })
      .filter((item) => {
        const image = pagePhoto(item);
        if (!image || seen.has(image)) return false;
        seen.add(image);
        return true;
      })
      .slice(0, 6);
  }, [items]);

  const shownCover = coverUrl || autoCover;

  const pagesBySeason = useMemo(() => {
    return {
      spring: items.filter((item) => seasonFromDate(item.date) === "spring"),
      summer: items.filter((item) => seasonFromDate(item.date) === "summer"),
      autumn: items.filter((item) => seasonFromDate(item.date) === "autumn"),
      winter: items.filter((item) => seasonFromDate(item.date) === "winter"),
    } satisfies Record<Season, PageItem[]>;
  }, [items]);

  useEffect(() => {
    const firstSeasonWithPages = ALL_SEASONS.find((season) => pagesBySeason[season].length > 0) ?? null;
    setActiveSeason(firstSeasonWithPages);
    setShowAllSeasonPages(false);
  }, [pagesBySeason, year]);

  useEffect(() => {
    setSequenceMonthFilter("all");
    setSequenceFlowerFamilyFilter("all");
    setSequenceOnlyFavorites(false);
    setSequenceQuery("");
    setSequenceDensity("comfortable");
  }, [year, activeGardenId]);

  const seasonSummaries = useMemo(() => {
    return ALL_SEASONS.map((season) => {
      const list = pagesBySeason[season];
      return {
        season,
        total: list.length,
      };
    });
  }, [pagesBySeason]);

  const selectedSeasonItems = activeSeason ? pagesBySeason[activeSeason] : [];
  const visibleSeasonItems = showAllSeasonPages
    ? selectedSeasonItems
    : selectedSeasonItems.slice(0, 8);
  const remainingSeasonItems = Math.max(0, selectedSeasonItems.length - visibleSeasonItems.length);

  const sequenceMonthOptions = useMemo(() => {
    const keys = new Set<string>();
    for (const item of items) {
      const key = monthKey(item.date);
      if (key) keys.add(key);
    }
    return Array.from(keys).sort((a, b) => b.localeCompare(a));
  }, [items]);

  const normalizedSequenceQuery = useMemo(
    () => sequenceQuery.trim().toLowerCase(),
    [sequenceQuery],
  );

  const sequenceBaseFilteredItems = useMemo(() => {
    return items.filter((item) => {
      if (
        sequenceFlowerFamilyFilter !== "all" &&
        item.flower_family !== sequenceFlowerFamilyFilter
      ) {
        return false;
      }
      if (sequenceOnlyFavorites && !item.is_favorite) return false;
      if (!normalizedSequenceQuery) return true;
      const haystack = [
        item.title ?? "",
        shortDate(item.date),
        item.plan_type_label ?? "",
        FLOWER_FAMILY_LABELS[item.flower_family] ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSequenceQuery);
    });
  }, [items, normalizedSequenceQuery, sequenceFlowerFamilyFilter, sequenceOnlyFavorites]);

  const sequenceMonthCounts = useMemo(() => {
    const out = new Map<string, number>();
    for (const item of sequenceBaseFilteredItems) {
      const key = monthKey(item.date);
      if (!key) continue;
      out.set(key, (out.get(key) ?? 0) + 1);
    }
    return out;
  }, [sequenceBaseFilteredItems]);

  const filteredSequenceItems = useMemo(() => {
    const sorted = [...sequenceBaseFilteredItems].sort((a, b) => {
      const dateCmp = String(b.date).localeCompare(String(a.date));
      if (dateCmp !== 0) return dateCmp;
      return String(b.id).localeCompare(String(a.id));
    });

    return sorted.filter((item) => {
      if (sequenceMonthFilter !== "all" && monthKey(item.date) !== sequenceMonthFilter) return false;
      return true;
    });
  }, [
    sequenceBaseFilteredItems,
    sequenceMonthFilter,
  ]);

  const sequenceGroups = useMemo(() => {
    const map = new Map<string, PageItem[]>();
    for (const item of filteredSequenceItems) {
      const key = monthKey(item.date) || `${year}-00`;
      const bucket = map.get(key);
      if (bucket) {
        bucket.push(item);
      } else {
        map.set(key, [item]);
      }
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, groupItems]) => ({
        key,
        label: monthLabel(key),
        items: groupItems,
      }));
  }, [filteredSequenceItems, year]);

  const hasActiveSequenceFilters =
    sequenceMonthFilter !== "all" ||
    sequenceFlowerFamilyFilter !== "all" ||
    sequenceOnlyFavorites ||
    normalizedSequenceQuery.length > 0;

  const availableYearsForSelector = useMemo(() => {
    const set = new Set<number>([...availableYears, year, currentYear]);
    return Array.from(set).sort((a, b) => b - a);
  }, [availableYears, currentYear, year]);

  const yearIndex = availableYearsForSelector.indexOf(year);
  const newerYear = yearIndex > 0 ? availableYearsForSelector[yearIndex - 1] : null;
  const olderYear =
    yearIndex >= 0 && yearIndex < availableYearsForSelector.length - 1
      ? availableYearsForSelector[yearIndex + 1]
      : null;
  const requiredYearParticipants = useMemo(
    () => resolveSharedGardenRequiredParticipants(activeGardenMemberCount),
    [activeGardenMemberCount],
  );
  const canCloseViewedYear = year < currentYear;
  const yearCycleActionReady = Boolean(activeGardenId && myProfileId);
  const hasAcknowledgedViewedYear = useMemo(
    () => hasAcknowledgedYearCycle(yearCycleState, myProfileId),
    [myProfileId, yearCycleState],
  );
  const viewedYearFullySynchronized = useMemo(
    () => isYearCycleFullySynchronized(yearCycleState, requiredYearParticipants),
    [requiredYearParticipants, yearCycleState],
  );
  const previousYearNeedsSync = useMemo(
    () =>
      yearCycleStateAvailable &&
      year === currentYear &&
      !isYearCycleFullySynchronized(previousYearCycleState, requiredYearParticipants),
    [currentYear, previousYearCycleState, requiredYearParticipants, year, yearCycleStateAvailable],
  );
  const viewedYearAcknowledgedCount = yearCycleState?.acknowledged_user_ids.length ?? 0;
  const viewedYearPendingCount = Math.max(0, requiredYearParticipants - viewedYearAcknowledgedCount);
  const viewedYearClosedAtLabel = formatYearCycleTimestamp(yearCycleState?.closed_at);
  const viewedYearClosedByLabel = resolveYearCycleActorLabel({
    userId: yearCycleState?.closed_by_user_id,
    myProfileId,
    memberNamesById,
    fallback: "la otra persona",
  });
  const previousYearClosedByLabel = resolveYearCycleActorLabel({
    userId: previousYearCycleState?.closed_by_user_id,
    myProfileId,
    memberNamesById,
    fallback: "la otra persona",
  });
  const viewedYearSyncHeadline = useMemo(() => {
    if (!yearCycleStateAvailable) return "Falta la tabla canónica para sincronizar el cierre anual.";
    if (!yearCycleState?.closed_at) {
      return `El año ${year} sigue abierto. Cuando lo cierres, ${companionReference} lo verá y podrá acompañarlo después.`;
    }
    if (viewedYearFullySynchronized) {
      return `El año ${year} ya quedó cerrado y acompasado entre las dos personas.`;
    }
    if (hasAcknowledgedViewedYear) {
      return viewedYearPendingCount <= 1
        ? `Tu parte ya quedó registrada. Falta una persona para dejar ${year} sincronizado.`
        : `Tu parte ya quedó registrada. Faltan ${viewedYearPendingCount} personas para sincronizar ${year}.`;
    }
    return `${
      yearCycleState.closed_by_user_id === myProfileId ? "Tu cierre" : `${viewedYearClosedByLabel} ya cerró ${year}`
    }. Puedes acompañarlo cuando quieras para dejar este capítulo acompasado.`;
  }, [
    companionReference,
    hasAcknowledgedViewedYear,
    myProfileId,
    viewedYearClosedByLabel,
    viewedYearFullySynchronized,
    viewedYearPendingCount,
    year,
    yearCycleState,
    yearCycleStateAvailable,
  ]);
  const viewedYearSyncDetail = useMemo(() => {
    if (!yearCycleStateAvailable) {
      return "La navegación anual sigue funcionando, pero falta aplicar la base persistida para dejar señal clara entre miembros.";
    }
    if (!yearCycleState?.closed_at) {
      return "Este cierre no exige simultaneidad. Basta con que una parte lo cierre y la otra lo acompañe cuando entre de nuevo.";
    }
    if (viewedYearFullySynchronized) {
      return viewedYearClosedAtLabel
        ? `Cierre registrado el ${viewedYearClosedAtLabel}. Ya no queda ninguna parte pendiente.`
        : "El cierre ya quedó registrado y acompasado.";
    }
    if (hasAcknowledgedViewedYear) {
      return viewedYearClosedAtLabel
        ? `El cierre original se guardó el ${viewedYearClosedAtLabel}. Ahora ${companionReference} verá este estado al entrar.`
        : `${companionReference} recibirá este estado cuando vuelva a entrar en el libro anual.`;
    }
    return viewedYearClosedAtLabel
      ? `${viewedYearClosedByLabel} dejó el cierre el ${viewedYearClosedAtLabel}. No hace falta coincidir: solo entrar y acompañarlo.`
      : `${viewedYearClosedByLabel} ya dejó constancia del cierre. Tu acompañamiento puede llegar después.`;
  }, [
    companionReference,
    hasAcknowledgedViewedYear,
    viewedYearClosedAtLabel,
    viewedYearClosedByLabel,
    viewedYearFullySynchronized,
    yearCycleState,
    yearCycleStateAvailable,
  ]);
  const viewedYearButtonLabel = useMemo(() => {
    if (!yearCycleState?.closed_at) return "Cerrar este año";
    if (hasAcknowledgedViewedYear) return "Cierre ya registrado";
    return "Acompañar cierre";
  }, [hasAcknowledgedViewedYear, yearCycleState?.closed_at]);
  const previousYearSyncDetail = useMemo(() => {
    if (!previousYearNeedsSync) return null;
    if (previousYearCycleState?.closed_at) {
      const closedAtLabel = formatYearCycleTimestamp(previousYearCycleState.closed_at);
      return closedAtLabel
        ? `${previousYearClosedByLabel} lo cerró el ${closedAtLabel}. Todavía falta acompasarlo del todo.`
        : `${previousYearClosedByLabel} ya cerró ese capítulo, pero aún falta acompasarlo.`;
    }
    return `El año ${year - 1} sigue abierto. Puedes volver cuando quieras: este año no se bloquea por eso.`;
  }, [
    previousYearClosedByLabel,
    previousYearCycleState,
    previousYearNeedsSync,
    year,
  ]);

  const announceRemoteYearCycleChange = useCallback((input: {
    nextState: YearCycleStateRow | null;
    previousState: YearCycleStateRow | null;
    targetYear: number;
  }) => {
    const { nextState, previousState, targetYear } = input;
    if (!nextState?.closed_at || !myProfileId) return;

    const closedNowByOther =
      !previousState?.closed_at &&
      Boolean(nextState.closed_by_user_id) &&
      nextState.closed_by_user_id !== myProfileId;
    if (closedNowByOther) {
      const actor = resolveYearCycleActorLabel({
        userId: nextState.closed_by_user_id,
        myProfileId,
        memberNamesById,
        fallback: "La otra persona",
      });
      showStatusNotice(
        `${actor} acaba de cerrar ${targetYear}. Puedes acompañarlo cuando quieras; no hace falta entrar a la vez.`,
        "info",
      );
      return;
    }

    const previousAckIds = new Set(previousState?.acknowledged_user_ids ?? []);
    const remoteAddedAckIds = nextState.acknowledged_user_ids.filter(
      (userId) => !previousAckIds.has(userId) && userId !== myProfileId,
    );
    if (!remoteAddedAckIds.length) return;

    const actorLabels = remoteAddedAckIds.map((userId) =>
      resolveYearCycleActorLabel({
        userId,
        myProfileId,
        memberNamesById,
        fallback: "La otra persona",
      }),
    );
    const actors = actorLabels.join(", ");
    const becameSynchronized =
      !isYearCycleFullySynchronized(previousState, requiredYearParticipants) &&
      isYearCycleFullySynchronized(nextState, requiredYearParticipants);

    showStatusNotice(
      becameSynchronized
        ? `${actors} ya acompañó el cierre de ${targetYear}. El año queda sincronizado.`
        : `${actors} ha dejado su acompañamiento en ${targetYear}.`,
      becameSynchronized ? "success" : "info",
    );
  }, [
    memberNamesById,
    myProfileId,
    requiredYearParticipants,
    showStatusNotice,
  ]);

  const applyObservedYearCycleState = useCallback((input: {
    nextState: YearCycleStateRow | null;
    targetYear: number;
  }) => {
    const { nextState, targetYear } = input;

    if (targetYear === year) {
      const previousState = yearCycleStateRef.current;
      yearCycleStateRef.current = nextState;
      setYearCycleStateAvailable(true);
      setYearCycleState(nextState);
      if (nextState) {
        announceRemoteYearCycleChange({
          nextState,
          previousState,
          targetYear,
        });
      }
      return;
    }

    if (targetYear === year - 1 && year === currentYear) {
      const previousState = previousYearCycleStateRef.current;
      previousYearCycleStateRef.current = nextState;
      setPreviousYearCycleState(nextState);
      if (nextState) {
        announceRemoteYearCycleChange({
          nextState,
          previousState,
          targetYear,
        });
      }
    }
  }, [announceRemoteYearCycleChange, currentYear, year]);

  const reloadObservedYearCycleState = useCallback(async (targetYear: number) => {
    if (!activeGardenId) return;

    const { data, error } = await withGardenScope(
      supabase
        .from("year_cycle_states")
        .select("*")
        .eq("year", targetYear)
        .maybeSingle(),
      activeGardenId,
    );

    if (error) {
      if (isSchemaNotReadyError(error) && targetYear === year) {
        setYearCycleStateAvailable(false);
        return;
      }
      console.warn("[year/page] no se pudo recargar year_cycle_states:", error);
      return;
    }

    applyObservedYearCycleState({
      nextState: normalizeYearCycleStateRow((data as Record<string, unknown> | null) ?? {}),
      targetYear,
    });
  }, [activeGardenId, applyObservedYearCycleState, year]);

  const broadcastYearCycleChange = useCallback(async (targetYear: number) => {
    if (!activeGardenId || !myProfileId || !yearCycleChannelRef.current) return;

    try {
      await yearCycleChannelRef.current.send({
        type: "broadcast",
        event: "changed",
        payload: {
          actorUserId: myProfileId,
          clientId: yearCycleClientIdRef.current,
          gardenId: activeGardenId,
          sentAt: new Date().toISOString(),
          year: targetYear,
        } satisfies YearCycleBroadcastEnvelope,
      });
    } catch (error) {
      console.warn("[year/page] no se pudo emitir el aviso realtime del cierre anual:", error);
    }
  }, [activeGardenId, myProfileId]);

  useEffect(() => {
    if (!activeGardenId) return;

    const listenedYears = new Set<number>([year]);
    if (year === currentYear) listenedYears.add(year - 1);

    const channel = supabase.channel(`year-cycle-sync:${activeGardenId}`, {
      config: {
        broadcast: { self: false },
      },
    });
    yearCycleChannelRef.current = channel;

    channel.on("broadcast", { event: "changed" }, ({ payload }) => {
      const data = payload as YearCycleBroadcastEnvelope | null;
      const targetYear = Number(data?.year);
      if (
        !data ||
        data.clientId === yearCycleClientIdRef.current ||
        data.gardenId !== activeGardenId ||
        data.actorUserId === myProfileId ||
        !Number.isInteger(targetYear) ||
        !listenedYears.has(targetYear)
      ) {
        return;
      }

      void reloadObservedYearCycleState(targetYear);
    });

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "year_cycle_states",
      },
      (payload) => {
        const raw =
          payload.eventType === "DELETE"
            ? ((payload.old as Record<string, unknown> | null) ?? {})
            : ((payload.new as Record<string, unknown> | null) ?? {});
        const normalized = normalizeYearCycleStateRow(raw);
        if (!normalized || normalized.garden_id !== activeGardenId || !listenedYears.has(normalized.year)) {
          return;
        }

        applyObservedYearCycleState({
          nextState: payload.eventType === "DELETE" ? null : normalized,
          targetYear: normalized.year,
        });
      },
    );

    channel.subscribe();

    return () => {
      yearCycleChannelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [
    activeGardenId,
    applyObservedYearCycleState,
    currentYear,
    myProfileId,
    reloadObservedYearCycleState,
    year,
  ]);

  useEffect(() => {
    if (!activeGardenId || !yearCycleStateAvailable || yearCycleState?.closed_at) return;

    const intervalId = window.setInterval(() => {
      void reloadObservedYearCycleState(year);
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    activeGardenId,
    reloadObservedYearCycleState,
    year,
    yearCycleState?.closed_at,
    yearCycleStateAvailable,
  ]);

  function resetSequenceFilters() {
    setSequenceMonthFilter("all");
    setSequenceFlowerFamilyFilter("all");
    setSequenceOnlyFavorites(false);
    setSequenceQuery("");
  }

  function openSequenceFromItem(item: PageItem) {
    setChapterView("sequence");
    setSequenceMonthFilter(monthKey(item.date) || "all");
    setSequenceFlowerFamilyFilter("all");
    setSequenceOnlyFavorites(false);
    setSequenceQuery(item.title ?? shortDate(item.date));
    requestAnimationFrame(() => {
      chaptersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function closeOrAcknowledgeYear() {
    if (!activeGardenId || !myProfileId) return;
    setYearCycleSaving(true);
    showStatusNotice(null);

    try {
      const { data: latestData, error: latestError } = await withGardenScope(
        supabase
          .from("year_cycle_states")
          .select("*")
          .eq("year", year)
          .maybeSingle(),
        activeGardenId,
      );

      if (latestError) {
        if (isSchemaNotReadyError(latestError)) {
          setYearCycleStateAvailable(false);
          showStatusNotice(
            "Falta aplicar la migracion 2026-03-25_year_cycle_states.sql para sincronizar el cierre anual.",
            "warning",
          );
          return;
        }
        throw latestError;
      }

      const latestState = normalizeYearCycleStateRow(
        (latestData as Record<string, unknown> | null) ?? {},
      );
      const nextAcknowledgedUserIds = uniqueUserIds([
        ...(latestState?.acknowledged_user_ids ?? []),
        myProfileId,
      ]);
      const closingNow = !latestState?.closed_at;
      const payload = withGardenIdOnInsert(
        {
          year,
          closed_at: latestState?.closed_at ?? new Date().toISOString(),
          closed_by_user_id: latestState?.closed_by_user_id ?? myProfileId,
          acknowledged_user_ids: nextAcknowledgedUserIds,
        },
        activeGardenId,
      );

      const { data, error } = await supabase
        .from("year_cycle_states")
        .upsert(payload, { onConflict: "garden_id,year" })
        .select("*")
        .maybeSingle();

      if (error) {
        if (isSchemaNotReadyError(error)) {
          setYearCycleStateAvailable(false);
          showStatusNotice(
            "Falta aplicar la migracion 2026-03-25_year_cycle_states.sql para sincronizar el cierre anual.",
            "warning",
          );
          return;
        }
        throw error;
      }

      const normalized = normalizeYearCycleStateRow(
        (data as Record<string, unknown> | null) ?? {},
      );
      setYearCycleState(normalized);
      yearCycleStateRef.current = normalized;
      setYearCycleStateAvailable(true);
      showStatusNotice(
        closingNow
          ? `Año cerrado. ${companionReference} podrá acompañarlo cuando entre.`
          : "Cierre anual acompasado. El año queda sincronizado entre las dos personas.",
        closingNow ? "info" : "success",
      );
      await broadcastYearCycleChange(year);
    } catch (error) {
      showStatusNotice(toErrorMessage(error, "No se pudo sincronizar el cierre anual."), "error");
    } finally {
      setYearCycleSaving(false);
    }
  }

  async function saveYearNote() {
    showStatusNotice(null);

    let highlightColumnAvailable = true;
    let updateRes = await withGardenScope(
      supabase
        .from("year_notes")
        .update({
          note,
          cover_url: coverUrl,
          highlight_page_ids: highlightPageIds,
        })
        .eq("year", year)
        .select("year")
        .limit(1),
      activeGardenId,
    );

    if (updateRes.error && isMissingYearHighlightPageIdsError(updateRes.error.message)) {
      highlightColumnAvailable = false;
      updateRes = await withGardenScope(
        supabase
          .from("year_notes")
          .update({
            note,
            cover_url: coverUrl,
          })
          .eq("year", year)
          .select("year")
          .limit(1),
        activeGardenId,
      );
    }

    if (updateRes.error) {
      showStatusNotice(`No se pudo guardar la memoria anual: ${updateRes.error.message}`, "error");
      return;
    }

    const hasUpdatedRow = ((updateRes.data as Array<{ year: number }> | null) ?? []).length > 0;
    if (!hasUpdatedRow) {
      let insertRes = await supabase.from("year_notes").insert(
        withGardenIdOnInsert(
          {
            year,
            note,
            cover_url: coverUrl,
            ...(highlightColumnAvailable ? { highlight_page_ids: highlightPageIds } : {}),
          },
          activeGardenId,
        ),
      );

      if (insertRes.error && isMissingYearHighlightPageIdsError(insertRes.error.message)) {
        highlightColumnAvailable = false;
        insertRes = await supabase.from("year_notes").insert(
          withGardenIdOnInsert(
            {
              year,
              note,
              cover_url: coverUrl,
            },
            activeGardenId,
          ),
        );
      }

      if (insertRes.error) {
        showStatusNotice(`No se pudo guardar la memoria anual: ${insertRes.error.message}`, "error");
        return;
      }
    }

    setEditing(false);
    showStatusNotice(
      highlightColumnAvailable
        ? "Memoria anual guardada."
        : "Memoria anual guardada. Los destacados editoriales se activarán cuando apliques la migración nueva.",
      highlightColumnAvailable ? "success" : "warning",
    );
  }

  async function downloadYearPdf() {
    setExportError(null);
    showStatusNotice(null);
    setExportingPdf(true);

    try {
      const accessToken = await getSessionAccessToken();
      if (!accessToken) {
        router.push(getProductSurfaceHref("login"));
        return;
      }

      const res = await fetch(`/api/export/year/${year}`, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        let message = `No se pudo exportar (HTTP ${res.status})`;
        try {
          const body = await res.json();
          if (body?.error) message = body.error;
        } catch {
          try {
            const txt = await res.text();
            if (txt?.trim()) message = `${message}: ${txt.slice(0, 140)}`;
          } catch {}
        }
        throw new Error(message);
      }

      const blob = await res.blob();
      if (!blob || blob.size === 0) {
        throw new Error("El PDF llego vacio");
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `LibroVivo_${year}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showStatusNotice("PDF generado y descargado.", "success");
    } catch (error: unknown) {
      setExportError(error instanceof Error ? error.message : "Error descargando PDF");
    } finally {
      setExportingPdf(false);
    }
  }

  async function shareYearToChat() {
    const gardenId = String(activeGardenId ?? "").trim();
    const profileId = String(myProfileId ?? "").trim();
    if (!gardenId || !profileId) {
      showStatusNotice("Necesitamos jardín activo y sesión válida para compartir este año.", "warning");
      return;
    }

    setSharingToChat(true);
    try {
      await sendGardenChatReferenceMessage({
        gardenId,
        authorUserId: profileId,
        reference: buildGardenChatYearReference({
          year,
          note,
          flowerCount: stats.total,
          shownCover,
        }),
      });
      showStatusNotice(`El libro del ${year} ya esta compartido en el chat.`, "success");
    } catch (error) {
      showStatusNotice(
        error instanceof Error ? error.message : "No se pudo compartir este año en el chat.",
        "error",
      );
    } finally {
      setSharingToChat(false);
    }
  }

  function goYear(nextYear: number) {
    const safe = safeYear(nextYear);
    if (safe == null) return;
    router.push(getYearBookHref(safe));
  }

  return (
    <div className="lv-page p-4 sm:p-6">
      <div className="lv-shell max-w-6xl space-y-4">
        <YearHeroHeader
          year={year}
          currentYear={currentYear}
          loading={loading}
          stats={{
            total: stats.total,
            avgStars: stats.avgStars,
            favoriteCount: stats.favoriteCount,
            activeMonths: stats.activeMonths,
          }}
          yearMilestones={yearMilestones}
          yearEditorialUnlocks={yearEditorialUnlocks}
          availableYearsForSelector={availableYearsForSelector}
          olderYear={olderYear}
          newerYear={newerYear}
          onGoYear={goYear}
          onOpenHome={() => router.push(getProductSurfaceHref("home"))}
          sharingToChat={sharingToChat}
          onShareToChat={() => void shareYearToChat()}
          shareRecipientLabel={chatShareRecipientLabel}
          exportingPdf={exportingPdf}
          onDownloadPdf={downloadYearPdf}
          shownCover={shownCover}
          growthStage={growth.stage}
          growthPhaseLabel={annualTreePhaseLabel(growth.phase)}
          growthPhaseTone={phaseTone(growth.stage)}
          annualTreeAssets={homeTrailConfig.annualTreeAssets}
          topFlowerFamilyLabel={
            stats.topFlowerFamily && FLOWER_FAMILY_LABELS[stats.topFlowerFamily as FlowerFamily]
              ? FLOWER_FAMILY_LABELS[stats.topFlowerFamily as FlowerFamily]
              : "-"
          }
          treeNarrative={treeNarrative}
          onOpenTreeRitual={treeNarrative.showRitualAction ? handleOpenTreeRitual : undefined}
          note={note}
          onGardenChanged={(gardenId) => {
            setActiveGardenId(gardenId);
            setGardenReloadTick((prev) => prev + 1);
          }}
        />

        {year === currentYear && previousYearNeedsSync ? (
          <section className="lv-card space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
                  Cierre pendiente del año anterior
                </div>
                <div className="mt-1 text-base font-semibold text-[var(--lv-text)]">
                  {previousYearSyncDetail}
                </div>
              </div>
              <button
                type="button"
                className="lv-btn lv-btn-secondary"
                onClick={() => goYear(year - 1)}
              >
                Ir a {year - 1}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-[var(--lv-text-muted)]">
              {previousYearCycleState?.closed_by_user_id ? (
                <span className="rounded-full bg-[var(--lv-surface-soft)] px-3 py-1">
                  Cerrado por: {previousYearClosedByLabel}
                </span>
              ) : null}
            </div>
          </section>
        ) : null}

        {canCloseViewedYear ? (
          <section className="lv-card space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
                  Cierre anual
                </div>
                <div className="mt-1 text-base font-semibold text-[var(--lv-text)]">
                  {viewedYearSyncHeadline}
                </div>
                <p className="mt-2 max-w-3xl text-sm text-[var(--lv-text-muted)]">
                  {viewedYearSyncDetail}
                </p>
              </div>
              {yearCycleStateAvailable ? (
                <button
                  type="button"
                  className="lv-btn lv-btn-primary disabled:opacity-50"
                  onClick={() => void closeOrAcknowledgeYear()}
                  disabled={!yearCycleActionReady || yearCycleSaving || viewedYearFullySynchronized}
                >
                  {yearCycleSaving ? "Sincronizando..." : viewedYearButtonLabel}
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-[var(--lv-text-muted)]">
              <span className="rounded-full bg-[var(--lv-surface-soft)] px-3 py-1">
                Participacion esperada: {requiredYearParticipants}
              </span>
              <span className="rounded-full bg-[var(--lv-surface-soft)] px-3 py-1">
                Acompañamientos: {viewedYearAcknowledgedCount}
              </span>
              {yearCycleState?.closed_at ? (
                <span className="rounded-full bg-[var(--lv-surface-soft)] px-3 py-1">
                  Pendientes: {viewedYearPendingCount}
                </span>
              ) : null}
              {yearCycleState?.closed_by_user_id ? (
                <span className="rounded-full bg-[var(--lv-surface-soft)] px-3 py-1">
                  Cerrado por: {viewedYearClosedByLabel}
                </span>
              ) : null}
              {viewedYearClosedAtLabel ? (
                <span className="rounded-full bg-[var(--lv-surface-soft)] px-3 py-1">
                  Registrado: {viewedYearClosedAtLabel}
                </span>
              ) : null}
            </div>
          </section>
        ) : null}

        {fetchWarning ? <StatusNotice message={fetchWarning} tone="warning" /> : null}
        {statusMsg ? <StatusNotice message={statusMsg} tone={statusTone} /> : null}
        {exportError ? <StatusNotice message={exportError} tone="error" /> : null}

        <div className="space-y-4">
          <div className="lv-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Memoria del año</h2>
                <p className="mt-1 text-sm text-[var(--lv-text-muted)]">
                  Frase y portada que resumen el capítulo.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="lv-badge px-3 py-1.5 text-xs">
                  {shownCover ? "Con portada" : "Sin portada"}
                </div>
                <button
                  type="button"
                  className="lv-btn lv-btn-secondary text-sm"
                  onClick={() => setEditing((value) => !value)}
                >
                  {editing ? "Cerrar edición" : "Editar memoria anual"}
                </button>
              </div>
            </div>

            {editing ? (
              <div className="mt-4 space-y-3">
                <textarea
                  className="lv-textarea lv-text-safe whitespace-pre-wrap"
                  rows={5}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Escribid la frase o el pequeño texto que mejor cuenta este capítulo del año..."
                />
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium">Portada del capítulo</div>
                    <div className="mt-1 text-sm text-[var(--lv-text-muted)]">
                      Elige una imagen del propio año o deja que se seleccione sola.
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="lv-btn lv-btn-secondary text-xs"
                      onClick={() => setCoverUrl(null)}
                      style={
                        coverUrl == null
                          ? {
                              borderColor: "var(--lv-primary)",
                              backgroundColor: "var(--lv-primary-soft)",
                              color: "var(--lv-primary-strong)",
                            }
                          : undefined
                      }
                    >
                      Usar portada automática
                    </button>
                  </div>
                  {coverSuggestions.length ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {coverSuggestions.map((item) => {
                        const image = pagePhoto(item);
                        const selected = image != null && coverUrl === image;
                        return (
                          <button
                            key={`year-cover-${item.id}`}
                            type="button"
                            onClick={() => setCoverUrl(image)}
                            className="rounded-[20px] border bg-white p-2 text-left transition hover:shadow-md"
                            style={
                              selected
                                ? {
                                    borderColor: "var(--lv-primary)",
                                    boxShadow: "0 0 0 2px rgba(76, 116, 71, 0.14)",
                                  }
                                : undefined
                            }
                          >
                            <img
                              src={image ?? undefined}
                              alt={item.title ?? "portada"}
                              className="h-28 w-full rounded-[16px] border object-cover"
                            />
                            <div className="mt-2 line-clamp-1 text-sm font-medium">
                              {item.title ?? "Página sin título"}
                            </div>
                            <div className="text-xs text-[var(--lv-text-muted)]">
                              {shortDate(item.date)} / {toFlowerFamilyLabel(item)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="lv-card-soft p-3 text-sm text-[var(--lv-text-muted)]">
                      Todavía no hay imágenes en este año. Si no eliges una, se intentará usar la
                      primera que aparezca cuando exista.
                    </div>
                  )}
                  <input
                    className="lv-input"
                    value={coverUrl ?? ""}
                    onChange={(event) => setCoverUrl(event.target.value || null)}
                    placeholder="Opcional: usar una imagen externa manual"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="lv-btn lv-btn-primary" onClick={saveYearNote}>
                    Guardar
                  </button>
                  <button
                    className="lv-btn lv-btn-secondary"
                    onClick={() => setEditing(false)}
                  >
                    Cancelar
                  </button>
                </div>
                <div className="text-xs opacity-60">
                  Si no pones portada, se intentará usar una imagen destacada del año.
                </div>
              </div>
            ) : (
              <div className="lv-card-soft mt-4 p-4 text-sm text-[var(--lv-text-muted)]">
                <p className="lv-text-safe whitespace-pre-wrap">
                  {note
                    ? note
                    : "Aún no hay frase para este año. Pulsa editar memoria para escribirla."}
                </p>
              </div>
            )}
          </div>

          <div className="lv-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Momentos destacados</h2>
                <p className="mt-1 text-sm text-[var(--lv-text-muted)]">
                  {highlightPageIds.length
                    ? "Seleccionados de forma editorial desde las páginas del capítulo."
                    : "De momento se derivan desde favoritas y valoración."}
                </p>
              </div>
              <div className="text-sm text-[var(--lv-text-muted)]">
                {highlightPageIds.length ? `${bestMoments.length}/3 seleccionados` : "Top 3"}
              </div>
            </div>

            {loading ? (
              <div className="mt-4 text-sm text-[var(--lv-text-muted)]">Cargando momentos...</div>
            ) : bestMoments.length === 0 ? (
              <div className="lv-card-soft mt-4 space-y-3 p-4 text-sm text-[var(--lv-text-muted)]">
                <div>Todavía no hay páginas en este año.</div>
                <button
                  type="button"
                  className="lv-btn lv-btn-secondary text-xs"
                  onClick={() => router.push(getNewPageHref())}
                >
                  Crear primera página del año
                </button>
              </div>
            ) : (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {bestMoments.map((item, index) => {
                  const cover = pageFlowerIcon(item);
                  return (
                    <div
                      key={item.id}
                      className="lv-card-soft flex h-full flex-col p-3 text-left transition hover:shadow-md"
                    >
                      <button
                        type="button"
                        className="flex h-full w-full flex-col text-left"
                        onClick={() => router.push(getPageDetailHref(item.id))}
                      >
                        {cover ? (
                          <img
                            src={cover}
                            alt="momento"
                            className="aspect-[16/10] w-full rounded-2xl border bg-white object-cover"
                          />
                        ) : (
                          <div
                            className="flex aspect-[16/10] w-full items-center justify-center rounded-2xl border bg-[linear-gradient(180deg,#f6f8f2_0%,#e8efdf_100%)]"
                            style={{ borderColor: "#dce5d6" }}
                          >
                            <div className="rounded-full border bg-white px-3 py-1 text-xs font-medium">
                              {item.plan_type_label
                                ? `${item.plan_type_label} / ${toFlowerFamilyLabel(item)}`
                                : toFlowerFamilyLabel(item)}
                            </div>
                          </div>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                          <span className="lv-badge bg-white px-2.5 py-1">
                            Destacado {index + 1}
                          </span>
                          <span className="lv-badge bg-[#f7fbf4] px-2.5 py-1 text-[var(--lv-primary-strong)]">
                            {highlightPageIds.length ? "Editorial" : "Derivado"}
                          </span>
                          {item.rating != null ? (
                            <span className="lv-badge flex items-center gap-2 bg-[#fff9e6] px-2.5 py-1 text-[#755b12]">
                              <span aria-hidden="true" className="tracking-[0.08em]">
                                {ratingStars(item.rating)}
                              </span>
                              <span>{ratingSummary(item.rating)}</span>
                            </span>
                          ) : null}
                          {item.is_favorite ? (
                            <span
                              className="lv-badge px-2.5 py-1"
                              style={{
                                borderColor: "var(--lv-warning)",
                                backgroundColor: "var(--lv-warning-soft)",
                                color: "var(--lv-warning)",
                              }}
                            >
                              Favorita
                            </span>
                          ) : null}
                        </div>
                        <div className="lv-text-safe mt-3 text-base font-semibold">
                          {item.title ?? "Página sin título"}
                        </div>
                        <div className="mt-2 text-sm opacity-70">
                          {item.plan_type_label
                            ? `${item.plan_type_label} / ${toFlowerFamilyLabel(item)}`
                            : toFlowerFamilyLabel(item)}
                        </div>
                        <div className="mt-1 text-sm opacity-70">{shortDate(item.date)}</div>
                      </button>
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => openSequenceFromItem(item)}
                          className="lv-btn lv-btn-secondary px-3 py-1 text-xs"
                        >
                          Abrir en recorrido
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lv-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Hitos del año</h2>
                <p className="mt-1 text-sm text-[var(--lv-text-muted)]">
                  Solo aparecen aquí cuando ya fueron reclamados y forman parte visible del relato anual.
                </p>
              </div>
              <div className="text-sm text-[var(--lv-text-muted)]">{yearMilestones} logrado(s)</div>
            </div>

            {loading ? (
              <div className="mt-4 text-sm text-[var(--lv-text-muted)]">Cargando hitos...</div>
            ) : yearMilestoneTrees.length === 0 ? (
              <div className="lv-card-soft mt-4 p-4 text-sm text-[var(--lv-text-muted)]">
                Todavía no hay hitos reclamados visibles en este año.
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {yearMilestoneTrees.slice(0, 6).map((tree) => (
                  <div
                    key={`year-milestone-${tree.id}`}
                    className="lv-card-soft flex items-center gap-3 bg-white p-3"
                  >
                    <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)]">
                      <ProgressionMilestoneTree
                        size={62}
                        rank={tree.rank}
                        importance={tree.importance}
                        rarity={tree.rarity}
                        leafVariant={tree.leafVariant}
                        accentColor={tree.accentColor}
                        claimed
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 font-semibold">{tree.title}</div>
                      <div className="mt-1 text-xs text-[var(--lv-text-muted)]">
                        {tree.claimedAt ? shortDate(tree.claimedAt) : "Sin fecha"}
                      </div>
                      {tree.description ? (
                        <div className="mt-1 line-clamp-2 text-sm text-[var(--lv-text-muted)]">
                          {tree.description}
                        </div>
                      ) : null}
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
            )}
          </div>
        </div>

        <YearChaptersSection
          containerRef={chaptersRef}
          loading={loading}
          items={items}
          chapterView={chapterView}
          onChapterViewChange={setChapterView}
          sequenceQuery={sequenceQuery}
          onSequenceQueryChange={setSequenceQuery}
          sequenceMonthFilter={sequenceMonthFilter}
          onSequenceMonthFilterChange={setSequenceMonthFilter}
          sequenceMonthOptions={sequenceMonthOptions}
          sequenceFlowerFamilyFilter={sequenceFlowerFamilyFilter}
          onSequenceFlowerFamilyFilterChange={setSequenceFlowerFamilyFilter}
          sequenceOnlyFavorites={sequenceOnlyFavorites}
          onSequenceOnlyFavoritesChange={setSequenceOnlyFavorites}
          sequenceDensity={sequenceDensity}
          onSequenceDensityChange={setSequenceDensity}
          filteredSequenceItems={filteredSequenceItems}
          hasActiveSequenceFilters={hasActiveSequenceFilters}
          onResetSequenceFilters={resetSequenceFilters}
          sequenceGroups={sequenceGroups}
          seasonSummaries={seasonSummaries}
          activeSeason={activeSeason}
          onActiveSeasonChange={setActiveSeason}
          selectedSeasonItems={selectedSeasonItems}
          visibleSeasonItems={visibleSeasonItems}
          remainingSeasonItems={remainingSeasonItems}
          showAllSeasonPages={showAllSeasonPages}
          onShowAllSeasonPagesChange={setShowAllSeasonPages}
          onOpenPage={(pageId) => router.push(getPageDetailHref(pageId))}
          onOpenCreatePage={() => router.push(getNewPageHref())}
          onOpenPlans={() => router.push(getProductSurfaceHref("plans"))}
          seasonTone={seasonTone}
          shortDate={shortDate}
          monthLabel={monthLabel}
          pageFlowerIcon={pageFlowerIcon}
        />

        {showMilestoneOverlay && !showRitualPopup ? (
          <AnnualTreeMilestoneOverlay
            year={year}
            stage={growth.stage}
            phaseLabel={annualTreePhaseLabel(growth.phase)}
            narrative={treeNarrative}
            assetsByPhase={homeTrailConfig.annualTreeAssets}
            onDismiss={dismissMilestoneOverlay}
            onOpenRitual={
              treeNarrative.showRitualAction ? handleOpenTreeRitualFromMilestone : undefined
            }
          />
        ) : null}

        {showRitualPopup ? (
          <AnnualTreeRitualPopup
            year={year}
            treeStage={growth.stage}
            ritual={ritual}
            onPlant={handlePlantRitual}
            onDismiss={() => setShowRitualPopup(false)}
            config={futureMomentsConfig.tree}
          />
        ) : null}
      </div>
    </div>
  );
}



