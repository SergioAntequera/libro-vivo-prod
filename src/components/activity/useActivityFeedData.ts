"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { supabase } from "@/lib/supabase";
import { getMyProfile, getSessionAccessToken, getSessionUser } from "@/lib/auth";
import {
  isSchemaNotReadyError,
  resolveActiveGardenIdForUser,
  withGardenScope,
} from "@/lib/gardens";
import { buildLegacyCompatibleProgressionRules } from "@/lib/progressionRuntime";
import { syncProgressionUnlocks } from "@/lib/progressionUnlocks";
import {
  buildActivityFeed,
  type ActivityFeedSection,
  type ActivityFlowerRevisionCandidate,
  type ActivityInvitationCandidate,
  type ActivityMilestoneCandidate,
  type ActivityNoticeCandidate,
  type ActivityPageCandidate,
  type ActivityFlowerBirthPendingCandidate,
} from "@/lib/activityFeed";
import {
  buildActivityUnseenSummary,
  markActivityItemsSeen,
  readActivitySeenMap,
  writeActivitySeenMap,
  type ActivitySeenMap,
} from "@/lib/activitySeenState";
import {
  getFallbackPlanTypeOptions,
  mapGardenPlanTypeRow,
  type PlanTypeOption,
} from "@/lib/planTypeCatalog";
import {
  getFallbackSeedCalendarConfig,
  getSeedCalendarConfig,
  todayIsoDate,
  type SeedCalendarConfig,
} from "@/lib/seedCalendarConfig";
import type { SeedPreparationProfile } from "@/lib/seedPreparationTypes";
import type {
  ActivityItem,
  ActivitySectionKey,
} from "@/lib/productDomainContracts";
import { toErrorMessage } from "@/lib/errorMessage";
import type {
  SeedItem,
  SeedPlaceOption,
  SeedWateringConfirmation,
} from "@/lib/plansTypes";

type UseActivityFeedDataParams = {
  gardenReloadTick?: number;
  onRequireLogin: () => void;
};

type UseActivityFeedDataResult = {
  loading: boolean;
  msg: string | null;
  setMsg: Dispatch<SetStateAction<string | null>>;
  myProfileId: string;
  activeGardenId: string | null;
  setActiveGardenId: Dispatch<SetStateAction<string | null>>;
  items: ActivityItem[];
  sections: ActivityFeedSection[];
  unseenCount: number;
  counts: Record<ActivitySectionKey, number>;
  unseenCounts: Record<ActivitySectionKey, number>;
  isItemSeen: (itemId: string) => boolean;
  markItemsSeen: (itemIds: string[]) => void;
  markAllSeen: () => void;
  refreshActivity: (gardenIdOverride?: string | null) => Promise<void>;
};

type InvitationPayload = {
  invitations: ActivityInvitationCandidate[];
};

type NoticePayload = {
  notices: ActivityNoticeCandidate[];
};

async function callAuthedApi<T>(token: string, input: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(input, {
    ...init,
    headers,
    credentials: "same-origin",
  });

  const payload = (await res.json().catch(() => null)) as { error?: string } | T | null;
  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && payload !== null && "error" in payload
        ? String((payload as { error?: string }).error ?? "").trim() || `Error HTTP ${res.status}`
        : `Error HTTP ${res.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export function useActivityFeedData({
  gardenReloadTick = 0,
  onRequireLogin,
}: UseActivityFeedDataParams): UseActivityFeedDataResult {
  const fallbackCfg = useMemo(() => getFallbackSeedCalendarConfig(), []);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [myProfileId, setMyProfileId] = useState("");
  const [activeGardenId, setActiveGardenId] = useState<string | null>(null);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [sections, setSections] = useState<ActivityFeedSection[]>([]);
  const [counts, setCounts] = useState<Record<ActivitySectionKey, number>>({
    now: 0,
    review: 0,
    news: 0,
  });
  const [seenMap, setSeenMap] = useState<ActivitySeenMap>({});
  const activeGardenIdRef = useRef<string | null>(null);
  const myProfileIdRef = useRef("");

  useEffect(() => {
    activeGardenIdRef.current = activeGardenId;
  }, [activeGardenId]);

  useEffect(() => {
    myProfileIdRef.current = myProfileId;
  }, [myProfileId]);

  useEffect(() => {
    setSeenMap(readActivitySeenMap(myProfileId, activeGardenId));
  }, [activeGardenId, myProfileId]);

  const unseenSummary = useMemo(
    () => buildActivityUnseenSummary(items, seenMap),
    [items, seenMap],
  );

  const markItemsSeen = useCallback(
    (itemIds: string[]) => {
      if (!itemIds.length) return;
      setSeenMap((current) => {
        const next = markActivityItemsSeen(current, itemIds);
        writeActivitySeenMap(myProfileIdRef.current, activeGardenIdRef.current, next);
        return next;
      });
    },
    [],
  );

  const markAllSeen = useCallback(() => {
    markItemsSeen(items.map((item) => item.id));
  }, [items, markItemsSeen]);

  const isItemSeen = useCallback(
    (itemId: string) => Boolean(seenMap[itemId]),
    [seenMap],
  );

  const refreshActivity = useCallback(async (gardenIdOverride?: string | null) => {
    const scopedGardenId = gardenIdOverride ?? activeGardenIdRef.current;
    const profileId = myProfileIdRef.current;
    await syncProgressionUnlocks(scopedGardenId).catch(() => null);

    const [
      cfgRes,
      seedsRes,
      placesRes,
      planTypesRes,
      wateringRes,
      flowerBirthPendingRes,
      preparationProfilesRes,
      memberCountRes,
      pagesRes,
      flowerRevisionRes,
      progressionUnlockRes,
      progressionTreeRes,
      progressionGraphRes,
      token,
    ] = await Promise.all([
      getSeedCalendarConfig(),
      withGardenScope(
        supabase
          .from("seeds")
          .select(
            "id,title,status,scheduled_date,element,notes,bloomed_page_id,map_place_id,map_route_id,plan_type_id,created_at",
          )
          .order("created_at", { ascending: false }),
        scopedGardenId,
      ),
      withGardenScope(
        supabase
          .from("map_places")
          .select("id,title,subtitle,kind,state")
          .neq("state", "archived")
          .order("updated_at", { ascending: false }),
        scopedGardenId,
      ),
      withGardenScope(
        supabase
          .from("garden_plan_types")
          .select(
            "id,code,label,category,description,flower_family,suggested_element,icon_emoji,flower_asset_path,seed_asset_path,flower_builder_config,is_custom,sort_order,archived_at",
          )
          .is("archived_at", null)
          .order("sort_order", { ascending: true }),
        scopedGardenId,
      ),
      withGardenScope(
        supabase
          .from("seed_watering_confirmations")
          .select("id,seed_id,user_id,watered_at,created_at,updated_at")
          .order("watered_at", { ascending: false }),
        scopedGardenId,
      ),
      withGardenScope(
        supabase
          .from("flower_birth_rituals")
          .select("page_id,seed_id,activated_at,pages:pages!inner(id,title)")
          .is("completed_at", null)
          .order("activated_at", { ascending: false }),
        scopedGardenId,
      ),
      withGardenScope(
        supabase
          .from("seed_preparation_profiles")
          .select(
            "id,seed_id,garden_id,planner_mode,collaboration_mode,preparation_progress,enabled_blocks,summary,date_mode,starts_on,ends_on,budget_amount,budget_currency,budget_notes,goal_tags,primary_map_place_id,primary_map_route_id,created_at,updated_at",
          )
          .order("updated_at", { ascending: false }),
        scopedGardenId,
      ),
      scopedGardenId
        ? supabase.rpc("get_active_garden_member_count", {
            target_garden_id: scopedGardenId,
          })
        : Promise.resolve({ data: 1, error: null }),
      withGardenScope(
        supabase
          .from("pages")
          .select(
            "id,title,date,planned_from_seed_id,cover_photo_url,thumbnail_url,canvas_objects,rating,location_label,mood_state,is_favorite",
          )
          .order("date", { ascending: false }),
        scopedGardenId,
      ),
      withGardenScope(
        supabase
          .from("flower_page_revisions")
          .select("id,page_id,actor_user_id,actor_name,summary,created_at")
          .order("created_at", { ascending: false })
          .limit(30),
        scopedGardenId,
      ),
      withGardenScope(
        supabase
          .from("progression_tree_unlocks")
          .select("id,tree_id,unlocked_at,claimed_at")
          .order("unlocked_at", { ascending: false }),
        scopedGardenId,
      ),
      supabase
        .from("progression_tree_nodes")
        .select("id,title,enabled")
        .order("code", { ascending: true }),
      supabase
        .from("progression_graph_state")
        .select("tree_settings")
        .eq("key", "default")
        .maybeSingle(),
      getSessionAccessToken().catch(() => null),
    ]);

    const nextWarnings: string[] = [];
    const cfg = cfgRes ?? fallbackCfg;

    const seeds = seedsRes.error
      ? []
      : (((seedsRes.data as SeedItem[] | null) ?? []) as SeedItem[]);
    if (seedsRes.error) {
      nextWarnings.push(seedsRes.error.message);
    }

    const placeOptions = placesRes.error
      ? []
      : (((placesRes.data as SeedPlaceOption[] | null) ?? []) as SeedPlaceOption[]);
    if (placesRes.error && !isSchemaNotReadyError(placesRes.error)) {
      nextWarnings.push(placesRes.error.message);
    }

    let planTypeOptions: PlanTypeOption[] = getFallbackPlanTypeOptions();
    if (planTypesRes.error) {
      if (!isSchemaNotReadyError(planTypesRes.error)) {
        nextWarnings.push(planTypesRes.error.message);
      }
    } else {
      const rows = ((planTypesRes.data as Record<string, unknown>[] | null) ?? []).map(
        mapGardenPlanTypeRow,
      );
      if (rows.length) planTypeOptions = rows;
    }

    const wateringConfirmations = wateringRes.error
      ? []
      : (((wateringRes.data as SeedWateringConfirmation[] | null) ?? []) as SeedWateringConfirmation[]);
    if (wateringRes.error && !isSchemaNotReadyError(wateringRes.error)) {
      nextWarnings.push(wateringRes.error.message);
    }

    const pendingFlowerBirths = flowerBirthPendingRes.error
      ? []
      : ((((flowerBirthPendingRes.data as Array<{
            page_id?: string | null;
            seed_id?: string | null;
            activated_at?: string | null;
            pages?:
              | { id?: string | null; title?: string | null }
              | Array<{ id?: string | null; title?: string | null }>
              | null;
          }> | null) ?? [])
          .map((row) => {
            const page = Array.isArray(row.pages) ? row.pages[0] ?? null : row.pages ?? null;
            const pageId = String(row.page_id ?? page?.id ?? "").trim();
            return {
              pageId,
              pageTitle: String(page?.title ?? "").trim() || null,
              seedId: String(row.seed_id ?? "").trim() || null,
              activatedAt: String(row.activated_at ?? "").trim() || null,
            } satisfies ActivityFlowerBirthPendingCandidate;
          })
          .filter((row) => row.pageId))) as ActivityFlowerBirthPendingCandidate[];
    if (flowerBirthPendingRes.error && !isSchemaNotReadyError(flowerBirthPendingRes.error)) {
      nextWarnings.push(flowerBirthPendingRes.error.message);
    }

    const preparationProfiles = preparationProfilesRes.error
      ? []
      : (((preparationProfilesRes.data as SeedPreparationProfile[] | null) ?? []) as SeedPreparationProfile[]);
    if (preparationProfilesRes.error && !isSchemaNotReadyError(preparationProfilesRes.error)) {
      nextWarnings.push(preparationProfilesRes.error.message);
    }

    const activeMemberCount =
      memberCountRes.error == null &&
      Number.isFinite(Number(memberCountRes.data)) &&
      Number(memberCountRes.data) > 0
        ? Number(memberCountRes.data)
        : 1;
    if (memberCountRes.error && !isSchemaNotReadyError(memberCountRes.error)) {
      nextWarnings.push(memberCountRes.error.message);
    }

    const pages = pagesRes.error
      ? []
      : (((pagesRes.data as ActivityPageCandidate[] | null) ?? []) as ActivityPageCandidate[]);
    if (pagesRes.error) {
      nextWarnings.push(pagesRes.error.message);
    }
    const pageTitleById = new Map(
      pages.map((page) => [String(page.id ?? "").trim(), page.title ?? null] as const).filter(([id]) => id),
    );

    const flowerRevisions = flowerRevisionRes.error
      ? []
      : ((((flowerRevisionRes.data as Array<Record<string, unknown>> | null) ?? [])
          .map((row) => {
            const pageId = String(row.page_id ?? "").trim();
            const summary = ((row.summary as Record<string, unknown> | null) ?? {});
            const changedFields = Array.isArray(summary.changedFields)
              ? summary.changedFields
              : Array.isArray(summary.changed_fields)
                ? summary.changed_fields
                : [];

            return {
              id: String(row.id ?? "").trim(),
              pageId,
              pageTitle: pageTitleById.get(pageId) ?? null,
              actorUserId: String(row.actor_user_id ?? "").trim() || null,
              actorName: String(row.actor_name ?? "").trim() || null,
              changedFields: changedFields.map((field) => String(field ?? "").trim()).filter(Boolean),
              createdAt: String(row.created_at ?? "").trim() || null,
            } satisfies ActivityFlowerRevisionCandidate;
          })
          .filter((row) => row.id && row.pageId))) as ActivityFlowerRevisionCandidate[];
    if (flowerRevisionRes.error && !isSchemaNotReadyError(flowerRevisionRes.error)) {
      nextWarnings.push(flowerRevisionRes.error.message);
    }

    const canonicalRulesById = progressionTreeRes.error
      ? {}
      : buildLegacyCompatibleProgressionRules({
          trees:
            ((progressionTreeRes.data as Array<{
              id: string;
              title: string;
              enabled?: boolean | null;
            }> | null) ?? []),
          graphStateRow:
            ((progressionGraphRes.data as { tree_settings?: unknown } | null) ?? null),
        });

    const canonicalMilestones = progressionUnlockRes.error
      ? []
      : (((progressionUnlockRes.data as Array<{
          id: string | null;
          tree_id: string;
          unlocked_at: string | null;
          claimed_at: string | null;
        }> | null) ?? []).map((row) => ({
          id: String(row.id ?? ""),
          title:
            canonicalRulesById[String(row.tree_id ?? "").trim()]?.title || "Hito del recorrido",
          unlockedAt: String(row.unlocked_at ?? "").trim() || null,
          claimedAt: String(row.claimed_at ?? "").trim() || null,
        }))) as ActivityMilestoneCandidate[];

    const milestones = canonicalMilestones;

    if (
      progressionUnlockRes.error &&
      !isSchemaNotReadyError(progressionUnlockRes.error)
    ) {
      nextWarnings.push(progressionUnlockRes.error.message);
    }

    let invitations: ActivityInvitationCandidate[] = [];
    let notices: ActivityNoticeCandidate[] = [];
    if (token) {
      try {
        const payload = await callAuthedApi<InvitationPayload>(token, "/api/bonds/invitations");
        invitations = payload.invitations ?? [];
      } catch (error) {
        nextWarnings.push(
          toErrorMessage(error, "No se pudo cargar la bandeja de invitaciones."),
        );
      }
      try {
        const payload = await callAuthedApi<NoticePayload>(token, "/api/notices");
        notices = payload.notices ?? [];
      } catch (error) {
        nextWarnings.push(
          toErrorMessage(error, "No se pudieron cargar los avisos del jardin."),
        );
      }
    }

    const feed = buildActivityFeed({
      seeds,
      planTypeOptions,
      placeOptions,
      wateringConfirmations,
      currentUserId: profileId,
      activeMemberCount,
      cfg,
      nowDate: todayIsoDate(),
      invitations,
      notices,
      milestones,
      pages,
      flowerRevisions,
      pendingFlowerBirths,
      preparationProfiles,
    });

    setItems(feed.items);
    setSections(feed.sections);
    setCounts(feed.counts);
    setMsg(nextWarnings.length ? `Aviso: ${nextWarnings[0]}` : null);
  }, [fallbackCfg]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const user = await getSessionUser();
        if (!user) {
          onRequireLogin();
          return;
        }

        const profile = await getMyProfile(user.id);
        if (!active) return;
        setMyProfileId(profile.id);
        myProfileIdRef.current = profile.id;

        const resolvedGardenId = await resolveActiveGardenIdForUser({
          userId: profile.id,
          forceRefresh: true,
        }).catch(() => null);
        if (!active) return;
        setActiveGardenId(resolvedGardenId);
        activeGardenIdRef.current = resolvedGardenId;

        await refreshActivity(resolvedGardenId);
      } catch (error) {
        if (!active) return;
        setMsg(toErrorMessage(error, "No se pudo cargar la bandeja de actividad."));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [gardenReloadTick, onRequireLogin, refreshActivity]);

  return {
    loading,
    msg,
    setMsg,
    myProfileId,
    activeGardenId,
    setActiveGardenId,
    items,
    sections,
    unseenCount: unseenSummary.unseenCount,
    counts,
    unseenCounts: unseenSummary.unseenCounts,
    isItemSeen,
    markItemsSeen,
    markAllSeen,
    refreshActivity,
  };
}
