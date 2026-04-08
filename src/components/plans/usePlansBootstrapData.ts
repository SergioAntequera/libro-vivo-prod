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
import { getMyProfile, getSessionUser } from "@/lib/auth";
import {
  isSchemaNotReadyError,
  resolveActiveGardenIdForUser,
  withGardenScope,
} from "@/lib/gardens";
import {
  getCatalogItems,
  getFallbackCatalogItems,
  type CatalogItemConfig,
} from "@/lib/appConfig";
import {
  getFallbackSeedCalendarConfig,
  getSeedCalendarConfig,
  type SeedCalendarConfig,
} from "@/lib/seedCalendarConfig";
import {
  getFallbackPlanTypeOptions,
  mapGardenPlanTypeRow,
  type PlanTypeOption,
} from "@/lib/planTypeCatalog";
import { ensureGardenPlanTypes } from "@/lib/gardenPlanTypes";
import { toErrorMessage } from "@/lib/errorMessage";
import {
  flowerBirthPendingSyncChannelName,
  type FlowerBirthPendingBroadcastEnvelope,
} from "@/lib/flowerBirthPending";
import type {
  SeedPreparationAttachment,
  SeedPreparationChecklistItem,
  SeedPreparationItineraryItem,
  SeedPreparationPlaceLink,
  SeedPreparationProfile,
  SeedPreparationReservation,
  SeedPreparationStay,
  SeedPreparationStop,
  SeedPreparationTransportLeg,
} from "@/lib/seedPreparationTypes";
import type {
  PlansPendingFlowerBirth,
  SeedItem,
  SeedPlaceOption,
  SeedRouteOption,
  SeedWateringConfirmation,
} from "@/lib/plansTypes";

type UsePlansBootstrapDataParams = {
  onRequireLogin: () => void;
};

type RefreshAllOptions = {
  preserveMessage?: boolean;
};

type RefreshAllFn = (
  gardenIdOverride?: string | null,
  options?: RefreshAllOptions,
) => Promise<void>;

type UsePlansBootstrapDataResult = {
  loading: boolean;
  msg: string | null;
  setMsg: Dispatch<SetStateAction<string | null>>;
  myProfileId: string;
  myProfileName: string;
  myRole: string;
  activeGardenId: string | null;
  setActiveGardenId: Dispatch<SetStateAction<string | null>>;
  seeds: SeedItem[];
  placeOptions: SeedPlaceOption[];
  routeOptions: SeedRouteOption[];
  planTypeOptions: PlanTypeOption[];
  cfg: SeedCalendarConfig;
  seedStatusOptions: CatalogItemConfig[];
  activeGardenMemberCount: number;
  wateringConfirmations: SeedWateringConfirmation[];
  pendingFlowerBirths: PlansPendingFlowerBirth[];
  preparationProfiles: SeedPreparationProfile[];
  preparationChecklistItems: SeedPreparationChecklistItem[];
  preparationStops: SeedPreparationStop[];
  preparationTransportLegs: SeedPreparationTransportLeg[];
  preparationStays: SeedPreparationStay[];
  preparationPlaceLinks: SeedPreparationPlaceLink[];
  preparationItineraryItems: SeedPreparationItineraryItem[];
  preparationReservations: SeedPreparationReservation[];
  preparationAttachments: SeedPreparationAttachment[];
  refreshAll: RefreshAllFn;
};

export function usePlansBootstrapData({
  onRequireLogin,
}: UsePlansBootstrapDataParams): UsePlansBootstrapDataResult {
  const fallbackCfg = useMemo(() => getFallbackSeedCalendarConfig(), []);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [myProfileId, setMyProfileId] = useState("");
  const [myProfileName, setMyProfileName] = useState("");
  const [myRole, setMyRole] = useState("");
  const [activeGardenId, setActiveGardenId] = useState<string | null>(null);
  const [seeds, setSeeds] = useState<SeedItem[]>([]);
  const [placeOptions, setPlaceOptions] = useState<SeedPlaceOption[]>([]);
  const [routeOptions, setRouteOptions] = useState<SeedRouteOption[]>([]);
  const [planTypeOptions, setPlanTypeOptions] = useState<PlanTypeOption[]>(
    getFallbackPlanTypeOptions(),
  );
  const [cfg, setCfg] = useState<SeedCalendarConfig>(fallbackCfg);
  const [seedStatusOptions, setSeedStatusOptions] = useState<CatalogItemConfig[]>(
    getFallbackCatalogItems("seed_statuses"),
  );
  const [activeGardenMemberCount, setActiveGardenMemberCount] = useState(1);
  const [wateringConfirmations, setWateringConfirmations] = useState<SeedWateringConfirmation[]>(
    [],
  );
  const [pendingFlowerBirths, setPendingFlowerBirths] = useState<PlansPendingFlowerBirth[]>([]);
  const [preparationProfiles, setPreparationProfiles] = useState<SeedPreparationProfile[]>([]);
  const [preparationChecklistItems, setPreparationChecklistItems] = useState<
    SeedPreparationChecklistItem[]
  >([]);
  const [preparationStops, setPreparationStops] = useState<SeedPreparationStop[]>([]);
  const [preparationTransportLegs, setPreparationTransportLegs] = useState<
    SeedPreparationTransportLeg[]
  >([]);
  const [preparationStays, setPreparationStays] = useState<SeedPreparationStay[]>([]);
  const [preparationPlaceLinks, setPreparationPlaceLinks] = useState<SeedPreparationPlaceLink[]>([]);
  const [preparationItineraryItems, setPreparationItineraryItems] = useState<
    SeedPreparationItineraryItem[]
  >([]);
  const [preparationReservations, setPreparationReservations] = useState<
    SeedPreparationReservation[]
  >([]);
  const [preparationAttachments, setPreparationAttachments] = useState<
    SeedPreparationAttachment[]
  >([]);
  const activeGardenIdRef = useRef<string | null>(null);
  const myProfileIdRef = useRef("");
  const realtimeRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    activeGardenIdRef.current = activeGardenId;
  }, [activeGardenId]);

  useEffect(() => {
    myProfileIdRef.current = myProfileId;
  }, [myProfileId]);

  const refreshAll = useCallback<RefreshAllFn>(async (gardenIdOverride?: string | null, options?: RefreshAllOptions) => {
    if (!options?.preserveMessage) {
      setMsg(null);
    }
    const scopedGardenId = gardenIdOverride ?? activeGardenIdRef.current;

    const [
      cfgRes,
      statuses,
      seedsRes,
      placesRes,
      routesRes,
      planTypesRes,
      wateringRes,
      pendingBirthsRes,
      preparationProfilesRes,
      preparationChecklistRes,
      preparationStopsRes,
      preparationTransportRes,
      preparationStaysRes,
      preparationPlacesRes,
      preparationItineraryRes,
      preparationReservationsRes,
      preparationAttachmentsRes,
      memberCountRes,
    ] = await Promise.all([
      getSeedCalendarConfig(),
      getCatalogItems("seed_statuses"),
      withGardenScope(
        supabase
          .from("seeds")
          .select(
            "id,title,status,scheduled_date,element,notes,bloomed_page_id,map_place_id,map_route_id,plan_type_id,created_by,created_at",
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
          .from("map_routes")
          .select("id,title,subtitle,kind,status")
          .neq("status", "archived")
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
          .select("page_id,seed_id,activated_at,completed_at,pages:pages!inner(id,title)")
          .is("completed_at", null)
          .order("activated_at", { ascending: false }),
        scopedGardenId,
      ),
      withGardenScope(
        supabase
          .from("seed_preparation_profiles")
          .select(
            "id,seed_id,garden_id,planner_mode,collaboration_mode,preparation_progress,enabled_blocks,summary,destination_label,destination_kind,date_mode,starts_on,ends_on,budget_amount,budget_currency,budget_notes,goal_tags,shared_intention,why_this_trip,climate_context,primary_map_place_id,primary_map_route_id,created_at,updated_at",
          )
          .order("updated_at", { ascending: false }),
        scopedGardenId,
      ),
      withGardenScope(
        supabase
          .from("seed_preparation_checklist_items")
          .select(
            "id,seed_id,garden_id,order_index,category,label,owner,is_required,completed_at,completed_by_user_id,created_at,updated_at",
          )
          .order("order_index", { ascending: true }),
        scopedGardenId,
      ),
      withGardenScope(
        supabase
          .from("seed_preparation_stops")
          .select(
            "id,seed_id,garden_id,order_index,title,base_place_id,starts_on,ends_on,notes,created_at,updated_at",
          )
          .order("order_index", { ascending: true }),
        scopedGardenId,
      ),
      withGardenScope(
        supabase
          .from("seed_preparation_transport_legs")
          .select(
            "id,seed_id,garden_id,order_index,title,from_label,to_label,starts_at,ends_at,transport_kind,provider_name,booking_url,reference_code,map_route_id,origin_place_id,destination_place_id,origin_stop_id,destination_stop_id,notes,created_at,updated_at",
          )
          .order("order_index", { ascending: true }),
        scopedGardenId,
      ),
      withGardenScope(
        supabase
          .from("seed_preparation_stays")
          .select(
            "id,seed_id,garden_id,order_index,stop_id,stay_kind,name,provider_name,booking_url,check_in_date,check_out_date,address_label,map_place_id,confirmation_code,notes,created_at,updated_at",
          )
          .order("order_index", { ascending: true }),
        scopedGardenId,
      ),
      withGardenScope(
        supabase
          .from("seed_preparation_place_links")
          .select(
            "id,seed_id,garden_id,order_index,stop_id,day_date,map_place_id,manual_title,priority,planning_state,linked_transport_leg_id,linked_route_id,notes,created_at,updated_at",
          )
          .order("order_index", { ascending: true }),
        scopedGardenId,
      ),
      withGardenScope(
        supabase
          .from("seed_preparation_itinerary_items")
          .select(
            "id,seed_id,garden_id,order_index,stop_id,day_date,time_label,duration_minutes,title,description,map_place_id,map_route_id,transport_leg_id,status,created_at,updated_at",
          )
          .order("order_index", { ascending: true }),
        scopedGardenId,
      ),
      withGardenScope(
        supabase
          .from("seed_preparation_reservations")
          .select(
            "id,seed_id,garden_id,order_index,stop_id,reservation_kind,title,provider_name,reservation_url,reference_code,amount,currency,starts_at,map_place_id,status,notes,created_at,updated_at",
          )
          .order("order_index", { ascending: true }),
        scopedGardenId,
      ),
      withGardenScope(
        supabase
          .from("seed_preparation_attachments")
          .select(
            "id,seed_id,garden_id,order_index,linked_kind,linked_record_id,attachment_kind,title,file_name,mime_type,storage_provider,file_url,notes,created_at,updated_at",
          )
          .order("order_index", { ascending: true }),
        scopedGardenId,
      ),
      scopedGardenId
        ? supabase.rpc("get_active_garden_member_count", {
            target_garden_id: scopedGardenId,
          })
        : Promise.resolve({ data: 1, error: null }),
    ]);

    setCfg(cfgRes);
    setSeedStatusOptions(statuses);
    if (memberCountRes.error && !isSchemaNotReadyError(memberCountRes.error)) {
      setMsg(memberCountRes.error.message);
    }
    setActiveGardenMemberCount(
      Number.isFinite(Number(memberCountRes.data)) && Number(memberCountRes.data) > 0
        ? Number(memberCountRes.data)
        : 1,
    );

    if (seedsRes.error) {
      setMsg(seedsRes.error.message);
      setSeeds([]);
      setPlaceOptions([]);
      setRouteOptions([]);
      setPlanTypeOptions(getFallbackPlanTypeOptions());
      setWateringConfirmations([]);
      setPendingFlowerBirths([]);
      setPreparationProfiles([]);
      setPreparationChecklistItems([]);
      setPreparationStops([]);
      setPreparationTransportLegs([]);
      setPreparationStays([]);
      setPreparationPlaceLinks([]);
      setPreparationItineraryItems([]);
      setPreparationReservations([]);
      setPreparationAttachments([]);
      return;
    }

    if (planTypesRes.error) {
      if (isSchemaNotReadyError(planTypesRes.error)) {
        setPlanTypeOptions(getFallbackPlanTypeOptions());
      } else {
        setMsg(planTypesRes.error.message);
      }
    } else {
      const rows = ((planTypesRes.data as Record<string, unknown>[] | null) ?? []).map(mapGardenPlanTypeRow);
      if (!rows.length && scopedGardenId && myProfileIdRef.current) {
        try {
          await ensureGardenPlanTypes({
            gardenId: scopedGardenId,
            profileId: myProfileIdRef.current,
          });
          const retry = await withGardenScope(
            supabase
              .from("garden_plan_types")
              .select(
                "id,code,label,category,description,flower_family,suggested_element,icon_emoji,flower_asset_path,seed_asset_path,flower_builder_config,is_custom,sort_order,archived_at",
              )
              .is("archived_at", null)
              .order("sort_order", { ascending: true }),
            scopedGardenId,
          );
          if (retry.error) throw retry.error;
          const retryRows = ((retry.data as Record<string, unknown>[] | null) ?? []).map(mapGardenPlanTypeRow);
          setPlanTypeOptions(retryRows.length ? retryRows : getFallbackPlanTypeOptions());
        } catch (error) {
          setPlanTypeOptions(getFallbackPlanTypeOptions());
          setMsg(toErrorMessage(error, "No se pudo cargar la biblioteca de tipos de plan."));
        }
      } else {
        setPlanTypeOptions(rows.length ? rows : getFallbackPlanTypeOptions());
      }
    }

    if (wateringRes.error) {
      if (isSchemaNotReadyError(wateringRes.error)) {
        setWateringConfirmations([]);
      } else {
        setMsg(wateringRes.error.message);
      }
    } else {
      setWateringConfirmations((wateringRes.data as SeedWateringConfirmation[] | null) ?? []);
    }

    if (pendingBirthsRes.error) {
      if (isSchemaNotReadyError(pendingBirthsRes.error)) {
        setPendingFlowerBirths([]);
      } else {
        setMsg(pendingBirthsRes.error.message);
      }
    } else {
      const nextPendingBirths = (
        (pendingBirthsRes.data as Array<{
          activated_at?: string | null;
          page_id?: string | null;
          seed_id?: string | null;
          pages?: { id?: string | null; title?: string | null } | Array<{ id?: string | null; title?: string | null }> | null;
        }> | null) ?? []
      )
        .map((row) => {
          const pageRow = Array.isArray(row.pages) ? row.pages[0] ?? null : row.pages ?? null;
          const pageId = String(row.page_id ?? pageRow?.id ?? "").trim();
          if (!pageId) return null;
          return {
            activatedAt: String(row.activated_at ?? "").trim() || new Date(0).toISOString(),
            pageId,
            seedId: String(row.seed_id ?? "").trim() || null,
            title: String(pageRow?.title ?? "").trim() || null,
          } satisfies PlansPendingFlowerBirth;
        })
        .filter((entry): entry is PlansPendingFlowerBirth => entry !== null);

      setPendingFlowerBirths(nextPendingBirths);
    }

    if (preparationProfilesRes.error) {
      if (isSchemaNotReadyError(preparationProfilesRes.error)) {
        setPreparationProfiles([]);
      } else {
        setMsg(preparationProfilesRes.error.message);
      }
    } else {
      setPreparationProfiles(
        (preparationProfilesRes.data as SeedPreparationProfile[] | null) ?? [],
      );
    }

    if (preparationChecklistRes.error) {
      if (isSchemaNotReadyError(preparationChecklistRes.error)) {
        setPreparationChecklistItems([]);
      } else {
        setMsg(preparationChecklistRes.error.message);
      }
    } else {
      setPreparationChecklistItems(
        (preparationChecklistRes.data as SeedPreparationChecklistItem[] | null) ?? [],
      );
    }

    if (preparationStopsRes.error) {
      if (isSchemaNotReadyError(preparationStopsRes.error)) {
        setPreparationStops([]);
      } else {
        setMsg(preparationStopsRes.error.message);
      }
    } else {
      setPreparationStops((preparationStopsRes.data as SeedPreparationStop[] | null) ?? []);
    }

    if (preparationTransportRes.error) {
      if (isSchemaNotReadyError(preparationTransportRes.error)) {
        setPreparationTransportLegs([]);
      } else {
        setMsg(preparationTransportRes.error.message);
      }
    } else {
      setPreparationTransportLegs(
        (preparationTransportRes.data as SeedPreparationTransportLeg[] | null) ?? [],
      );
    }

    if (preparationStaysRes.error) {
      if (isSchemaNotReadyError(preparationStaysRes.error)) {
        setPreparationStays([]);
      } else {
        setMsg(preparationStaysRes.error.message);
      }
    } else {
      setPreparationStays((preparationStaysRes.data as SeedPreparationStay[] | null) ?? []);
    }

    if (preparationPlacesRes.error) {
      if (isSchemaNotReadyError(preparationPlacesRes.error)) {
        setPreparationPlaceLinks([]);
      } else {
        setMsg(preparationPlacesRes.error.message);
      }
    } else {
      setPreparationPlaceLinks(
        (preparationPlacesRes.data as SeedPreparationPlaceLink[] | null) ?? [],
      );
    }

    if (preparationItineraryRes.error) {
      if (isSchemaNotReadyError(preparationItineraryRes.error)) {
        setPreparationItineraryItems([]);
      } else {
        setMsg(preparationItineraryRes.error.message);
      }
    } else {
      setPreparationItineraryItems(
        (preparationItineraryRes.data as SeedPreparationItineraryItem[] | null) ?? [],
      );
    }

    if (preparationReservationsRes.error) {
      if (isSchemaNotReadyError(preparationReservationsRes.error)) {
        setPreparationReservations([]);
      } else {
        setMsg(preparationReservationsRes.error.message);
      }
    } else {
      setPreparationReservations(
        (preparationReservationsRes.data as SeedPreparationReservation[] | null) ?? [],
      );
    }

    if (preparationAttachmentsRes.error) {
      if (isSchemaNotReadyError(preparationAttachmentsRes.error)) {
        setPreparationAttachments([]);
      } else {
        setMsg(preparationAttachmentsRes.error.message);
      }
    } else {
      setPreparationAttachments(
        (preparationAttachmentsRes.data as SeedPreparationAttachment[] | null) ?? [],
      );
    }

    setSeeds((seedsRes.data as SeedItem[] | null) ?? []);
    setPlaceOptions((placesRes.data as SeedPlaceOption[] | null) ?? []);
    setRouteOptions((routesRes.data as SeedRouteOption[] | null) ?? []);
  }, []);

  const scheduleRealtimeRefresh = useCallback(
    (gardenIdOverride?: string | null) => {
      const scopedGardenId = gardenIdOverride ?? activeGardenIdRef.current;
      if (!scopedGardenId) return;

      if (realtimeRefreshTimeoutRef.current) {
        clearTimeout(realtimeRefreshTimeoutRef.current);
      }

      realtimeRefreshTimeoutRef.current = setTimeout(() => {
        realtimeRefreshTimeoutRef.current = null;
        void refreshAll(scopedGardenId, { preserveMessage: true });
      }, 220);
    },
    [refreshAll],
  );

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
        setMyProfileName(
          [profile.name, profile.last_name].filter((value) => String(value ?? "").trim()).join(" ").trim() ||
            "Usuario",
        );
        setMyRole(profile.role);
        myProfileIdRef.current = profile.id;

        const resolvedGardenId = await resolveActiveGardenIdForUser({
          userId: profile.id,
          forceRefresh: true,
        }).catch(() => null);
        if (!active) return;
        setActiveGardenId(resolvedGardenId);
        activeGardenIdRef.current = resolvedGardenId;

        await refreshAll(resolvedGardenId);
      } catch (error) {
        if (!active) return;
        setMsg(toErrorMessage(error, "No se pudo cargar la vista de planes."));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [onRequireLogin, refreshAll]);

  useEffect(() => {
    return () => {
      if (realtimeRefreshTimeoutRef.current) {
        clearTimeout(realtimeRefreshTimeoutRef.current);
        realtimeRefreshTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!activeGardenId) return;

    const channel = supabase.channel(`plans-realtime-${activeGardenId}`);
    const filter = `garden_id=eq.${activeGardenId}`;
    const tables = [
      "seeds",
      "seed_watering_confirmations",
      "seed_preparation_profiles",
      "seed_preparation_checklist_items",
      "seed_preparation_stops",
      "seed_preparation_transport_legs",
      "seed_preparation_stays",
      "seed_preparation_place_links",
      "seed_preparation_itinerary_items",
      "seed_preparation_reservations",
      "seed_preparation_attachments",
    ] as const;

    for (const table of tables) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter,
        },
        () => {
          scheduleRealtimeRefresh(activeGardenId);
        },
      );
    }

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeGardenId, scheduleRealtimeRefresh]);

  useEffect(() => {
    if (!activeGardenId) return;

    const channelName = flowerBirthPendingSyncChannelName(activeGardenId);
    if (!channelName) return;

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
      },
    });

    channel.on("broadcast", { event: "pending" }, ({ payload }) => {
      const data = payload as FlowerBirthPendingBroadcastEnvelope | null;
      if (!data || data.gardenId !== activeGardenId) return;

      void (async () => {
        await refreshAll(activeGardenId);
        setMsg((current) =>
          current ?? "La flor ya puede nacer. Entra al nacimiento compartido cuando quieras.",
        );
      })();
    });

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeGardenId, refreshAll]);

  return {
    loading,
    msg,
    setMsg,
    myProfileId,
    myProfileName,
    myRole,
    activeGardenId,
    setActiveGardenId,
    seeds,
    placeOptions,
    routeOptions,
    planTypeOptions,
    cfg,
    seedStatusOptions,
    activeGardenMemberCount,
    wateringConfirmations,
    pendingFlowerBirths,
    preparationProfiles,
    preparationChecklistItems,
    preparationStops,
    preparationTransportLegs,
    preparationStays,
    preparationPlaceLinks,
    preparationItineraryItems,
    preparationReservations,
    preparationAttachments,
    refreshAll,
  };
}
