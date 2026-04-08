"use client";

import { useEffect, useMemo, useState } from "react";
import { getSessionAccessToken } from "@/lib/auth";
import {
  buildActivityFeed,
  type ActivityFlowerBirthPendingCandidate,
  type ActivityNoticeCandidate,
  type ActivityFlowerRevisionCandidate,
  type ActivityInvitationCandidate,
  type ActivityMilestoneCandidate,
} from "@/lib/activityFeed";
import {
  buildActivityUnseenSummary,
  readActivitySeenMap,
  type ActivitySeenMap,
} from "@/lib/activitySeenState";
import { isSchemaNotReadyError, withGardenScope } from "@/lib/gardens";
import type { HomePageRow, HomeProfile, RuleRow, UnlockRow } from "@/lib/homeDataTypes";
import type { SeedPreparationProfile } from "@/lib/seedPreparationTypes";
import {
  getFallbackSeedCalendarConfig,
  getSeedCalendarConfig,
  todayIsoDate,
  type SeedCalendarConfig,
} from "@/lib/seedCalendarConfig";
import type { SeedItem, SeedWateringConfirmation } from "@/lib/plansTypes";
import { supabase } from "@/lib/supabase";

type InvitationPayload = {
  invitations: ActivityInvitationCandidate[];
};

type NoticePayload = {
  notices: ActivityNoticeCandidate[];
};

type HomeActivitySupplementalState = {
  activeMemberCount: number;
  cfg: SeedCalendarConfig;
  flowerRevisions: ActivityFlowerRevisionCandidate[];
  invitations: ActivityInvitationCandidate[];
  notices: ActivityNoticeCandidate[];
  pendingFlowerBirths: ActivityFlowerBirthPendingCandidate[];
  preparationProfiles: SeedPreparationProfile[];
  seeds: SeedItem[];
  wateringConfirmations: SeedWateringConfirmation[];
};

type UseHomeActivityUnseenCountParams = {
  activeGardenId: string | null;
  enabled?: boolean;
  pageRows: HomePageRow[];
  profile: HomeProfile | null;
  rulesById: Record<string, RuleRow>;
  unlocks: UnlockRow[];
};

const EMPTY_SUPPLEMENTAL_STATE: HomeActivitySupplementalState = {
  activeMemberCount: 1,
  cfg: getFallbackSeedCalendarConfig(),
  flowerRevisions: [],
  invitations: [],
  notices: [],
  pendingFlowerBirths: [],
  preparationProfiles: [],
  seeds: [],
  wateringConfirmations: [],
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

function parseChangedFields(summary: unknown) {
  if (!summary || typeof summary !== "object") return [] as string[];
  const record = summary as Record<string, unknown>;
  const candidate = Array.isArray(record.changedFields)
    ? record.changedFields
    : Array.isArray(record.changed_fields)
      ? record.changed_fields
      : [];
  return candidate.map((field) => String(field ?? "").trim()).filter(Boolean);
}

export function useHomeActivityUnseenCount({
  activeGardenId,
  enabled = true,
  pageRows,
  profile,
  rulesById,
  unlocks,
}: UseHomeActivityUnseenCountParams) {
  const profileId = String(profile?.id ?? "").trim();
  const [supplementalState, setSupplementalState] = useState<HomeActivitySupplementalState>(
    EMPTY_SUPPLEMENTAL_STATE,
  );
  const seenMap = useMemo<ActivitySeenMap>(
    () => readActivitySeenMap(profileId || null, activeGardenId),
    [activeGardenId, profileId],
  );

  useEffect(() => {
    const gardenId = String(activeGardenId ?? "").trim();

    let active = true;

    void (async () => {
      if (!enabled || !profileId || !gardenId) {
        if (active) {
          setSupplementalState(EMPTY_SUPPLEMENTAL_STATE);
        }
        return;
      }

      const fallbackCfg = getFallbackSeedCalendarConfig();
      const [
        cfgRes,
        seedsRes,
        wateringRes,
        flowerBirthPendingRes,
        preparationProfilesRes,
        memberCountRes,
        flowerRevisionRes,
        token,
      ] = await Promise.all([
        getSeedCalendarConfig().catch(() => fallbackCfg),
        withGardenScope(
          supabase
            .from("seeds")
            .select(
              "id,title,status,scheduled_date,element,notes,bloomed_page_id,map_place_id,map_route_id,plan_type_id,created_at,created_by",
            )
            .order("created_at", { ascending: false }),
          gardenId,
        ),
        withGardenScope(
          supabase
            .from("seed_watering_confirmations")
            .select("id,seed_id,user_id,watered_at,created_at,updated_at")
            .order("watered_at", { ascending: false }),
          gardenId,
        ),
        withGardenScope(
          supabase
            .from("flower_birth_rituals")
            .select("page_id,seed_id,activated_at,pages:pages!inner(id,title)")
            .is("completed_at", null)
            .order("activated_at", { ascending: false }),
          gardenId,
        ),
        withGardenScope(
          supabase
            .from("seed_preparation_profiles")
            .select(
              "id,seed_id,garden_id,planner_mode,collaboration_mode,preparation_progress,enabled_blocks,summary,date_mode,starts_on,ends_on,budget_amount,budget_currency,budget_notes,goal_tags,primary_map_place_id,primary_map_route_id,created_at,updated_at",
            )
            .order("updated_at", { ascending: false }),
          gardenId,
        ),
        supabase.rpc("get_active_garden_member_count", {
          target_garden_id: gardenId,
        }),
        withGardenScope(
          supabase
            .from("flower_page_revisions")
            .select("id,page_id,actor_user_id,actor_name,summary,created_at")
            .order("created_at", { ascending: false })
            .limit(30),
          gardenId,
        ),
        getSessionAccessToken().catch(() => null),
      ]);

      if (!active) return;

      let invitations: ActivityInvitationCandidate[] = [];
      let notices: ActivityNoticeCandidate[] = [];
      if (token) {
        try {
          const payload = await callAuthedApi<InvitationPayload>(token, "/api/bonds/invitations");
          if (!active) return;
          invitations = payload.invitations ?? [];
        } catch {
          invitations = [];
        }
        try {
          const payload = await callAuthedApi<NoticePayload>(token, "/api/notices");
          if (!active) return;
          notices = payload.notices ?? [];
        } catch {
          notices = [];
        }
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

      const flowerRevisions = flowerRevisionRes.error
        ? []
        : ((((flowerRevisionRes.data as Array<Record<string, unknown>> | null) ?? [])
            .map((row) => ({
              id: String(row.id ?? "").trim(),
              pageId: String(row.page_id ?? "").trim(),
              pageTitle:
                pageRows.find((page) => page.id === String(row.page_id ?? "").trim())?.title ?? null,
              actorUserId: String(row.actor_user_id ?? "").trim() || null,
              actorName: String(row.actor_name ?? "").trim() || null,
              changedFields: parseChangedFields(row.summary),
              createdAt: String(row.created_at ?? "").trim() || null,
            }))
            .filter((row) => row.id && row.pageId))) as ActivityFlowerRevisionCandidate[];

      const activeMemberCount =
        memberCountRes.error == null &&
        Number.isFinite(Number(memberCountRes.data)) &&
        Number(memberCountRes.data) > 0
          ? Number(memberCountRes.data)
          : 1;

      if (active) {
        setSupplementalState({
          activeMemberCount,
          cfg: cfgRes ?? fallbackCfg,
          flowerRevisions,
          invitations,
          notices,
          pendingFlowerBirths,
          preparationProfiles:
            preparationProfilesRes.error && !isSchemaNotReadyError(preparationProfilesRes.error)
              ? []
              : ((preparationProfilesRes.data as SeedPreparationProfile[] | null) ?? []),
          seeds:
            seedsRes.error && !isSchemaNotReadyError(seedsRes.error)
              ? []
              : ((seedsRes.data as SeedItem[] | null) ?? []),
          wateringConfirmations:
            wateringRes.error && !isSchemaNotReadyError(wateringRes.error)
              ? []
              : ((wateringRes.data as SeedWateringConfirmation[] | null) ?? []),
        });
      }
    })();

    return () => {
      active = false;
    };
  }, [activeGardenId, enabled, pageRows, profileId]);

  const milestones = useMemo<ActivityMilestoneCandidate[]>(
    () =>
      unlocks.map((row) => ({
        id: String(row.id ?? ""),
        title: rulesById[String(row.rule_id ?? "").trim()]?.title || "Hito del recorrido",
        unlockedAt: row.created_at ?? null,
        claimedAt: row.claimed_at ?? null,
      })),
    [rulesById, unlocks],
  );

  const items = useMemo(() => {
    if (!enabled || !profileId || !activeGardenId) return [];

    return buildActivityFeed({
      seeds: supplementalState.seeds,
      planTypeOptions: [],
      placeOptions: [],
      routeOptions: [],
      wateringConfirmations: supplementalState.wateringConfirmations,
      currentUserId: profileId,
      activeMemberCount: supplementalState.activeMemberCount,
      cfg: supplementalState.cfg,
      nowDate: todayIsoDate(),
      invitations: supplementalState.invitations,
      notices: supplementalState.notices,
      milestones,
      pages: pageRows,
      flowerRevisions: supplementalState.flowerRevisions,
      pendingFlowerBirths: supplementalState.pendingFlowerBirths,
      preparationProfiles: supplementalState.preparationProfiles,
    }).items;
  }, [
    activeGardenId,
    enabled,
    milestones,
    pageRows,
    profileId,
    supplementalState.activeMemberCount,
    supplementalState.cfg,
    supplementalState.flowerRevisions,
    supplementalState.invitations,
    supplementalState.notices,
    supplementalState.pendingFlowerBirths,
    supplementalState.preparationProfiles,
    supplementalState.seeds,
    supplementalState.wateringConfirmations,
  ]);

  const unseenSummary = useMemo(() => buildActivityUnseenSummary(items, seenMap), [items, seenMap]);

  return unseenSummary.unseenCount;
}
