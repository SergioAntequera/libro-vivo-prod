"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import {
  isSchemaNotReadyError,
  resolveActiveGardenIdForUser,
  withGardenScope,
} from "@/lib/gardens";
import {
  getFallbackForestViewConfig,
  getForestViewConfig,
  type ForestViewConfig,
} from "@/lib/forestConfig";
import { mapGardenPlanTypeRow } from "@/lib/planTypeCatalog";
import {
  DEFAULT_HOME_TRAIL_RUNTIME_CONFIG,
  getHomeTrailRuntimeConfig,
  type HomeTrailRuntimeConfig,
} from "@/lib/homeTrailCatalog";
import {
  loadGardenYearTreeStates,
  type GardenYearTreeState,
} from "@/lib/annualTreeState";
import {
  buildLegacyCompatibleProgressionRules,
  type CanonicalProgressionGraphStateRow,
  type CanonicalProgressionTreeRow,
  type CanonicalProgressionTreeUnlockRow,
} from "@/lib/progressionRuntime";
import {
  buildClaimedProgressionMilestoneVisuals,
  type ClaimedProgressionMilestoneVisual,
} from "@/lib/annualProgressionMilestones";
import {
  indexPageVisualStatesByPageId,
  loadPageVisualStates,
} from "@/lib/pageVisualState";
import { toErrorMessage } from "@/lib/forestPageUtils";
import type { AchievementRule, ForestItem, UnlockEntry } from "@/lib/forestDataTypes";

type Tier = "bronze" | "silver" | "gold" | "diamond";

type UseForestBootstrapDataParams = {
  gardenReloadTick: number;
  onRequireLogin: () => void;
};

type ForestBootstrapState = {
  forestConfig: ForestViewConfig;
  items: ForestItem[];
  loading: boolean;
  tiers: Tier[];
  rules: AchievementRule[];
  unlockedRuleIds: string[];
  unlockedEntries: UnlockEntry[];
  claimedMilestoneTrees: ClaimedProgressionMilestoneVisual[];
  annualTreeStates: GardenYearTreeState[];
  seedsBloomed: number;
  fetchWarning: string | null;
  homeTrailConfig: HomeTrailRuntimeConfig;
};

const INITIAL_STATE: ForestBootstrapState = {
  forestConfig: getFallbackForestViewConfig(),
  items: [],
  loading: true,
  tiers: [],
  rules: [],
  unlockedRuleIds: [],
  unlockedEntries: [],
  claimedMilestoneTrees: [],
  annualTreeStates: [],
  seedsBloomed: 0,
  fetchWarning: null,
  homeTrailConfig: DEFAULT_HOME_TRAIL_RUNTIME_CONFIG,
};

export function useForestBootstrapData({
  gardenReloadTick,
  onRequireLogin,
}: UseForestBootstrapDataParams) {
  const [state, setState] = useState<ForestBootstrapState>(INITIAL_STATE);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const user = await getSessionUser();
        if (!user) {
          onRequireLogin();
          return;
        }
        const resolvedGardenId = await resolveActiveGardenIdForUser({
          userId: user.id,
          forceRefresh: true,
        }).catch(() => null);

        if (!active) return;
        setState((prev) => ({
          ...prev,
          loading: true,
          fetchWarning: null,
        }));

        const [
          pagesRes,
          planTypesRes,
          progressionTreesRes,
          progressionUnlocksRes,
          progressionGraphRes,
          annualTreeStatesRes,
          pageVisualStatesRes,
          seedsRes,
          forestCfg,
          homeTrailConfig,
        ] =
          await Promise.all([
            withGardenScope(
              supabase
                .from("pages")
                .select(
                  "id,title,date,element,plan_type_id,rating,mood_state,planned_from_seed_id,is_favorite,cover_photo_url,thumbnail_url",
                )
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
            supabase
              .from("progression_tree_nodes")
              .select("*"),
            withGardenScope(
              supabase
                .from("progression_tree_unlocks")
                .select("id,tree_id,unlocked_at,claimed_at")
                .order("unlocked_at", { ascending: true }),
              resolvedGardenId,
            ),
            supabase
              .from("progression_graph_state")
              .select("tree_settings")
              .eq("key", "default")
              .maybeSingle(),
            loadGardenYearTreeStates(supabase, { gardenId: resolvedGardenId }),
            loadPageVisualStates(supabase, { gardenId: resolvedGardenId }),
            withGardenScope(
              supabase
                .from("seeds")
                .select("*", { count: "exact", head: true })
                .eq("status", "bloomed"),
              resolvedGardenId,
            ),
            getForestViewConfig(),
            getHomeTrailRuntimeConfig(),
          ]);

        if (!active) return;

        const next: ForestBootstrapState = {
          ...INITIAL_STATE,
          loading: false,
          forestConfig: forestCfg,
          homeTrailConfig,
          annualTreeStates: annualTreeStatesRes.states,
        };

        const planTypeById = new Map<string, ReturnType<typeof mapGardenPlanTypeRow>>();
        if (!planTypesRes.error) {
          for (const row of ((planTypesRes.data as Record<string, unknown>[] | null) ?? [])) {
            const mapped = mapGardenPlanTypeRow(row);
            planTypeById.set(mapped.id, mapped);
          }
        }

        const pageVisualStateById = indexPageVisualStatesByPageId(pageVisualStatesRes.states);
        if (pageVisualStatesRes.errorMessage && !pageVisualStatesRes.schemaMissing && !next.fetchWarning) {
          next.fetchWarning = pageVisualStatesRes.errorMessage;
        }

        const pageRows =
          ((pagesRes.data as Array<Record<string, unknown>> | null) ?? []).map((row) => {
            const pageId = String(row.id ?? "");
            const pageVisualState = pageVisualStateById.get(pageId) ?? null;
            const planTypeId = String(row.plan_type_id ?? "").trim() || null;
            const planType = planTypeId ? planTypeById.get(planTypeId) ?? null : null;
            return {
              id: pageId,
              title: typeof row.title === "string" ? row.title : null,
              date: String(row.date ?? ""),
              element: pageVisualState?.pageElement ?? String(row.element ?? ""),
              plan_type_id: pageVisualState?.planTypeId ?? planTypeId,
              plan_type_label: pageVisualState?.planTypeLabel ?? planType?.label ?? null,
              plan_category: pageVisualState?.planCategory ?? planType?.category ?? null,
              flower_family: pageVisualState?.planFlowerFamily ?? planType?.flowerFamily ?? null,
              flower_asset_path:
                pageVisualState?.planFlowerAssetPath ?? planType?.flowerAssetPath ?? null,
              flower_builder_config:
                pageVisualState?.planFlowerBuilderConfig ??
                planType?.flowerBuilderConfig ??
                null,
              suggested_element:
                pageVisualState?.planSuggestedElement ?? planType?.suggestedElement ?? null,
              rating:
                pageVisualState?.rating ??
                (typeof row.rating === "number"
                  ? row.rating
                  : row.rating == null
                    ? null
                    : Number(row.rating)),
              mood_state:
                row.mood_state === "shiny" || row.mood_state === "healthy" || row.mood_state === "wilted"
                  ? row.mood_state
                  : "healthy",
              planned_from_seed_id: typeof row.planned_from_seed_id === "string" ? row.planned_from_seed_id : null,
              is_favorite: Boolean(row.is_favorite),
              cover_photo_url:
                pageVisualState?.coverPhotoUrl ??
                (typeof row.cover_photo_url === "string" ? row.cover_photo_url : null),
              thumbnail_url:
                pageVisualState?.thumbnailUrl ??
                (typeof row.thumbnail_url === "string" ? row.thumbnail_url : null),
            } satisfies ForestItem;
          }) ?? [];

        if (pagesRes.error) {
          next.fetchWarning = `No se pudieron cargar páginas: ${pagesRes.error.message}`;
        } else {
          next.items = pageRows;
        }

        const progressionErrors = [
          progressionTreesRes.error,
          progressionUnlocksRes.error,
          progressionGraphRes.error,
        ].filter(Boolean);
        const progressionBlocking = progressionErrors.find((error) => !isSchemaNotReadyError(error));
        const progressionTrees =
          !progressionBlocking && progressionErrors.length === 0
            ? (((progressionTreesRes.data as CanonicalProgressionTreeRow[] | null) ?? []).filter(
                (row) => row.enabled !== false,
              ))
            : [];

        if (progressionBlocking) {
          next.fetchWarning =
            next.fetchWarning ??
            `No se pudieron cargar hitos canónicos: ${toErrorMessage(progressionBlocking, "Error de progression.")}`;
        }

        if (annualTreeStatesRes.errorMessage && !annualTreeStatesRes.schemaMissing && !next.fetchWarning) {
          next.fetchWarning = annualTreeStatesRes.errorMessage;
        }

        const rulesById = buildLegacyCompatibleProgressionRules({
          trees: progressionTrees,
          graphStateRow: (progressionGraphRes.data as CanonicalProgressionGraphStateRow | null) ?? null,
        });
        const claimedMilestoneTrees = buildClaimedProgressionMilestoneVisuals({
          trees: progressionTrees,
          unlocks:
            ((progressionUnlocksRes.data as CanonicalProgressionTreeUnlockRow[] | null) ?? []),
          graphStateRow:
            (progressionGraphRes.data as CanonicalProgressionGraphStateRow | null) ?? null,
        });
        const treeById = new Map(progressionTrees.map((tree) => [tree.id, tree] as const));
        next.rules = Object.values(rulesById).map((rule) => ({
          id: rule.id,
          kind: "progression_tree",
          threshold: 1,
          tier: rule.tier,
          title: rule.title,
          description: treeById.get(rule.id)?.description ?? null,
          default_reward_id: rule.default_reward_id,
        }));
        next.claimedMilestoneTrees = claimedMilestoneTrees;
        next.unlockedEntries = claimedMilestoneTrees.map((row) => ({
          rule_id: row.id,
          created_at: row.claimedAt,
        }));
        next.unlockedRuleIds = next.unlockedEntries.map((row) => row.rule_id);
        next.tiers = Array.from(
          new Set(
            next.rules
              .filter((rule) => next.unlockedRuleIds.includes(rule.id))
              .map((rule) => rule.tier),
          ),
        );

        const pageFallbackBloomed = pageRows.filter(
          (it) => it.planned_from_seed_id,
        ).length;

        if (seedsRes.error) {
          next.seedsBloomed = pageFallbackBloomed;
        } else {
          next.seedsBloomed = seedsRes.count ?? pageFallbackBloomed;
        }

        setState(next);
      } catch (error) {
        if (!active) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          fetchWarning: `Aviso: ${toErrorMessage(error, "No se pudo cargar el bosque.")}`,
        }));
      }
    })();

    return () => {
      active = false;
    };
  }, [gardenReloadTick, onRequireLogin]);

  return state;
}
