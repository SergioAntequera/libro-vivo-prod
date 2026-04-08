"use client";

import { useCallback, useId, type Dispatch, type SetStateAction } from "react";
import { supabase } from "@/lib/supabase";
import { syncProgressionUnlocks } from "@/lib/progressionUnlocks";
import {
  isSchemaNotReadyError,
  withGardenIdOnInsert,
  withGardenScope,
} from "@/lib/gardens";
import {
  compareIsoDates,
  daysBetweenIsoDates,
  evaluateSeedTransitionGuard,
  resolveSeedTransition,
  todayIsoDate,
  type SeedCalendarConfig,
} from "@/lib/seedCalendarConfig";
import {
  createCustomPlanTypeCode,
  mapGardenPlanTypeRow,
  type PlanTypeCategory,
  type PlanTypeOption,
} from "@/lib/planTypeCatalog";
import { resolveFlowerFamilyFromPlanType } from "@/lib/productDomainContracts";
import {
  PLAN_FLOWER_BUILDER_TEMPLATE,
  PLAN_SEED_BUILDER_TEMPLATE,
} from "@/lib/planVisuals";
import { broadcastFlowerBirthPending } from "@/lib/flowerBirthPending";
import type { SeedItem } from "@/lib/plansTypes";

type UsePlansSeedActionsParams = {
  cfg: SeedCalendarConfig;
  myProfileId: string;
  myRole: string;
  activeGardenId: string | null;
  companionReferenceLabel?: string | null;
  setMsg: Dispatch<SetStateAction<string | null>>;
  refreshAll: (gardenIdOverride?: string | null) => Promise<void>;
  onOpenPage: (pageId: string, options?: { ritual?: "flower_birth" | null }) => void;
};

type CreateSeedInput = {
  title: string;
  notes: string;
  element: string;
  scheduledDate?: string | null;
  mapPlaceId?: string | null;
  mapRouteId?: string | null;
  planTypeId?: string | null;
};

type CreatePlanTypeInput = {
  label: string;
  suggestedElement: string;
  category?: PlanTypeCategory;
};

type WaterSeedInput = {
  seed: SeedItem;
  requiredParticipants: number;
};

type UsePlansSeedActionsResult = {
  createSeed: (input: CreateSeedInput) => Promise<boolean>;
  createPlanType: (input: CreatePlanTypeInput) => Promise<PlanTypeOption | null>;
  updateSeedContext: (
    seed: SeedItem,
    input: { mapPlaceId: string | null; mapRouteId: string | null; planTypeId: string | null },
  ) => Promise<void>;
  scheduleSeed: (seed: SeedItem, date: string) => Promise<void>;
  unscheduleSeed: (seed: SeedItem) => Promise<void>;
  waterSeed: (input: WaterSeedInput) => Promise<void>;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const message = String((error as { message?: unknown }).message ?? "").trim();
    if (message) return message;
  }
  return fallback;
}

function getErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null) return "";
  if ("code" in error) return String((error as { code?: unknown }).code ?? "").trim();
  return "";
}

export function usePlansSeedActions({
  cfg,
  myProfileId,
  myRole,
  activeGardenId,
  companionReferenceLabel,
  setMsg,
  refreshAll,
  onOpenPage,
}: UsePlansSeedActionsParams): UsePlansSeedActionsResult {
  const otherPersonLabel = String(companionReferenceLabel ?? "").trim() || "la otra persona";
  const flowerBirthPendingClientId = useId().replace(/:/g, "_");
  const validateScheduleDate = useCallback(
    async (seedId: string, date: string) => {
      const rules = cfg.calendarRules;
      const today = todayIsoDate();

      if (!rules.allowPastSchedule && compareIsoDates(date, today) < 0) {
        return "No se permiten fechas pasadas para programar semillas.";
      }

      if (rules.daysAheadLimit > 0) {
        const diff = daysBetweenIsoDates(today, date);
        if (diff > rules.daysAheadLimit) {
          return `La fecha supera el límite de ${rules.daysAheadLimit} dias.`;
        }
      }

      if (rules.maxSeedsPerDay > 0) {
        const query = withGardenScope(
          supabase
            .from("seeds")
            .select("id", { count: "exact", head: true })
            .eq("status", cfg.defaults.scheduledStatus)
            .eq("scheduled_date", date)
            .neq("id", seedId),
          activeGardenId,
        );

        const { count, error } = await query;
        if (error) return error.message;
        if ((count ?? 0) >= rules.maxSeedsPerDay) {
          return `Limite diario alcanzado (${rules.maxSeedsPerDay}).`;
        }
      }

      return null;
    },
    [cfg, activeGardenId],
  );

  const clearWateringConfirmations = useCallback(
    async (seedId: string) => {
      if (!activeGardenId) return;
      const { error } = await withGardenScope(
        supabase.from("seed_watering_confirmations").delete().eq("seed_id", seedId),
        activeGardenId,
      );
      if (error && !isSchemaNotReadyError(error)) {
        throw new Error(error.message);
      }
    },
    [activeGardenId],
  );

  const loadLinkedPlace = useCallback(
    async (seed: SeedItem) => {
      if (!seed.map_place_id || !activeGardenId) return null;
      const placeQuery = withGardenScope(
        supabase
          .from("map_places")
          .select("lat,lng,title,subtitle,address_label")
          .eq("id", seed.map_place_id)
          .maybeSingle(),
        activeGardenId,
      );
      const { data: placeRow } = await placeQuery;
      return (placeRow as {
        lat: number | null;
        lng: number | null;
        title: string | null;
        subtitle: string | null;
        address_label: string | null;
      } | null) ?? null;
    },
    [activeGardenId],
  );

  const getExistingBloomPageId = useCallback(
    async (seedId: string) => {
      if (!activeGardenId) return null;
      const pageQuery = withGardenScope(
        supabase
          .from("pages")
          .select("id")
          .eq("planned_from_seed_id", seedId)
          .maybeSingle(),
        activeGardenId,
      );
      const { data, error } = await pageQuery;
      if (error) {
        if (isSchemaNotReadyError(error)) return null;
        throw new Error(error.message);
      }
      return String((data as { id?: string | null } | null)?.id ?? "").trim() || null;
    },
    [activeGardenId],
  );

  const ensureFlowerBirthRitual = useCallback(
    async (input: { pageId: string; seedId: string | null; activate: boolean }) => {
      if (!input.activate || !activeGardenId) return;

      const payload = withGardenIdOnInsert(
        {
          page_id: input.pageId,
          seed_id: input.seedId,
          completed_at: null,
          completed_by_user_id: null,
        },
        activeGardenId,
      );

      const { error } = await supabase
        .from("flower_birth_rituals")
        .upsert(payload, { onConflict: "page_id", ignoreDuplicates: true });

      if (error && !isSchemaNotReadyError(error)) {
        throw new Error(error.message);
      }
    },
    [activeGardenId],
  );

  const finalizeBloom = useCallback(
    async (
      seed: SeedItem,
      options?: {
        activateFlowerBirthRitual?: boolean;
      },
    ) => {
      if (!activeGardenId) {
        throw new Error("No hay jardín activo para florecer esta semilla.");
      }

      const currentSeedQuery = withGardenScope(
        supabase
          .from("seeds")
          .select("id,status,bloomed_page_id,scheduled_date,plan_type_id,element,map_place_id,title,created_by,created_at")
          .eq("id", seed.id)
          .maybeSingle(),
        activeGardenId,
      );
      const { data: currentSeedRow, error: currentSeedError } = await currentSeedQuery;
      if (currentSeedError) throw new Error(currentSeedError.message);

      const latestSeed = ((currentSeedRow as SeedItem | null) ?? seed);
      if (latestSeed.bloomed_page_id) {
        await ensureFlowerBirthRitual({
          pageId: latestSeed.bloomed_page_id,
          seedId: latestSeed.id,
          activate: options?.activateFlowerBirthRitual === true,
        });
        return latestSeed.bloomed_page_id;
      }

      const existingPageId = await getExistingBloomPageId(seed.id);
      if (existingPageId) {
        const updateExistingSeed = withGardenScope(
          supabase
            .from("seeds")
            .update({
              status: cfg.defaults.bloomedStatus,
              bloomed_page_id: existingPageId,
            })
            .eq("id", seed.id),
          activeGardenId,
        );
        const { error: existingSeedError } = await updateExistingSeed;
        if (existingSeedError) throw new Error(existingSeedError.message);
        await ensureFlowerBirthRitual({
          pageId: existingPageId,
          seedId: latestSeed.id,
          activate: options?.activateFlowerBirthRitual === true,
        });
        return existingPageId;
      }

      const bloomDate = latestSeed.scheduled_date ?? todayIsoDate();
      const linkedPlace = await loadLinkedPlace(latestSeed);

      let createdPageId: string | null = null;
      if (cfg.defaults.createPageOnBloom) {
        const insertPayload = withGardenIdOnInsert(
          {
            title: latestSeed.title,
            date: bloomDate,
            element: latestSeed.element ?? cfg.defaults.fallbackElement,
            plan_type_id: latestSeed.plan_type_id ?? null,
            rating: null,
            mood_state: cfg.defaults.defaultMoodState,
            canvas_objects: cfg.defaults.defaultCanvasObjects,
            created_by: myProfileId,
            planned_from_seed_id: latestSeed.id,
            location_lat: linkedPlace?.lat ?? null,
            location_lng: linkedPlace?.lng ?? null,
            location_label:
              linkedPlace?.address_label ??
              linkedPlace?.subtitle ??
              linkedPlace?.title ??
              null,
          },
          activeGardenId,
        );

        const { data: page, error: pageError } = await supabase
          .from("pages")
          .insert(insertPayload)
          .select("id")
          .single();

        if (pageError) {
          if (getErrorCode(pageError) === "23505") {
            createdPageId = await getExistingBloomPageId(latestSeed.id);
          } else {
            throw new Error(pageError.message);
          }
        } else {
          createdPageId = String((page as { id?: string | null } | null)?.id ?? "").trim() || null;
        }
      }

      const payload: Record<string, unknown> = {
        status: cfg.defaults.bloomedStatus,
        bloomed_page_id: createdPageId,
      };

      const seedUpdateQuery = withGardenScope(
        supabase.from("seeds").update(payload).eq("id", latestSeed.id),
        activeGardenId,
      );
      const { error: seedUpdateError } = await seedUpdateQuery;
      if (seedUpdateError) throw new Error(seedUpdateError.message);

      if (createdPageId) {
        await ensureFlowerBirthRitual({
          pageId: createdPageId,
          seedId: latestSeed.id,
          activate: options?.activateFlowerBirthRitual === true,
        });
      }

      await syncProgressionUnlocks(activeGardenId).catch(() => null);

      return createdPageId;
    },
    [
      activeGardenId,
      cfg.defaults.bloomedStatus,
      cfg.defaults.createPageOnBloom,
      cfg.defaults.defaultCanvasObjects,
      cfg.defaults.defaultMoodState,
      cfg.defaults.fallbackElement,
      ensureFlowerBirthRitual,
      getExistingBloomPageId,
      loadLinkedPlace,
      myProfileId,
    ],
  );

  const createPlanType = useCallback(
    async ({ label, suggestedElement, category = "custom" }: CreatePlanTypeInput) => {
      setMsg(null);
      const normalizedLabel = label.trim();
      if (!normalizedLabel) {
        setMsg("Pon un nombre para el tipo de plan.");
        return null;
      }
      if (!activeGardenId) {
        setMsg("No hay jardín activo para guardar este tipo de plan.");
        return null;
      }

      const code = createCustomPlanTypeCode(normalizedLabel);
      const flowerFamily = resolveFlowerFamilyFromPlanType({
        code,
        suggestedElement,
      });
      const insertPayload = withGardenIdOnInsert(
        {
          code,
          label: normalizedLabel,
          category,
          description: null,
          flower_family: flowerFamily,
          suggested_element: suggestedElement || cfg.defaults.fallbackElement,
          icon_emoji: null,
          flower_asset_path: PLAN_FLOWER_BUILDER_TEMPLATE,
          seed_asset_path: PLAN_SEED_BUILDER_TEMPLATE,
          flower_builder_config: {},
          is_custom: true,
          sort_order: 900,
          created_by_user_id: myProfileId,
        },
        activeGardenId,
      );

      const { data, error } = await supabase
        .from("garden_plan_types")
        .insert(insertPayload)
        .select(
          "id,code,label,category,description,flower_family,suggested_element,icon_emoji,flower_asset_path,seed_asset_path,flower_builder_config,is_custom,sort_order",
        )
        .single();

      if (error) {
        setMsg(error.message);
        return null;
      }

      const next = mapGardenPlanTypeRow((data as Record<string, unknown> | null) ?? {});
      await refreshAll();
      return next;
    },
    [activeGardenId, cfg.defaults.fallbackElement, myProfileId, refreshAll, setMsg],
  );

  const createSeed = useCallback(
    async ({
      title,
      notes,
      element,
      scheduledDate,
      mapPlaceId,
      mapRouteId,
      planTypeId,
    }: CreateSeedInput) => {
      setMsg(null);
      if (!title.trim()) {
        setMsg("Pon un título.");
        return false;
      }
      if (!activeGardenId) {
        setMsg("No hay jardín activo para guardar esta semilla.");
        return false;
      }

      const nextDate = String(scheduledDate ?? "").trim() || null;
      if (nextDate) {
        const dateError = await validateScheduleDate("new-seed", nextDate);
        if (dateError) {
          setMsg(dateError);
          return false;
        }
      }

      const { error } = await supabase.from("seeds").insert(
        withGardenIdOnInsert(
          {
            title: title.trim(),
            notes: notes.trim() || null,
            element: element || cfg.defaults.fallbackElement,
            status: nextDate ? cfg.defaults.scheduledStatus : cfg.defaults.defaultSeedStatus,
            scheduled_date: nextDate,
            map_place_id: mapPlaceId ?? null,
            map_route_id: mapRouteId ?? null,
            plan_type_id: planTypeId ?? null,
            created_by: myProfileId,
          },
          activeGardenId,
        ),
      );

      if (error) {
        setMsg(error.message);
        return false;
      }

      void refreshAll().catch(() => null);
      return true;
    },
    [setMsg, cfg, myProfileId, activeGardenId, refreshAll, validateScheduleDate],
  );

  const scheduleSeed = useCallback(
    async (seed: SeedItem, date: string) => {
      setMsg(null);

      if (seed.status === cfg.defaults.scheduledStatus) {
        const dateError = await validateScheduleDate(seed.id, date);
        if (dateError) {
          setMsg(dateError);
          return;
        }

        const query = withGardenScope(
          supabase.from("seeds").update({ scheduled_date: date }).eq("id", seed.id),
          activeGardenId,
        );
        const { error } = await query;
        if (error) {
          setMsg(error.message);
          return;
        }

        await clearWateringConfirmations(seed.id);
        await refreshAll();
        return;
      }

      const transition = resolveSeedTransition(cfg.flowRules, {
        fromStatus: seed.status,
        toStatus: cfg.defaults.scheduledStatus,
        actionKey: "schedule",
      });

      if (!transition) {
        setMsg(`No existe transicion ${seed.status} -> ${cfg.defaults.scheduledStatus}.`);
        return;
      }

      if (transition.requiresScheduledDate && !date) {
        setMsg("La transicion de programar requiere fecha.");
        return;
      }

      const transitionError = evaluateSeedTransitionGuard(transition, {
        nowDate: todayIsoDate(),
        targetDate: date,
        scheduledDate: seed.scheduled_date,
        seedCreatedAt: seed.created_at,
        userRole: myRole,
      });
      if (transitionError) {
        setMsg(transitionError);
        return;
      }

      const dateError = await validateScheduleDate(seed.id, date);
      if (dateError) {
        setMsg(dateError);
        return;
      }

      const payload: Record<string, unknown> = {
        status: cfg.defaults.scheduledStatus,
        scheduled_date: date,
      };
      if (transition.clearScheduledDate) payload.scheduled_date = null;

      const query = withGardenScope(
        supabase.from("seeds").update(payload).eq("id", seed.id),
        activeGardenId,
      );
      const { error } = await query;
      if (error) {
        setMsg(error.message);
        return;
      }

      await clearWateringConfirmations(seed.id);
      await refreshAll();
    },
    [
      activeGardenId,
      cfg,
      clearWateringConfirmations,
      myRole,
      refreshAll,
      setMsg,
      validateScheduleDate,
    ],
  );

  const unscheduleSeed = useCallback(
    async (seed: SeedItem) => {
      setMsg(null);

      const transition = resolveSeedTransition(cfg.flowRules, {
        fromStatus: seed.status,
        toStatus: cfg.defaults.defaultSeedStatus,
        actionKey: "unschedule",
      });

      if (!transition) {
        setMsg(
          `No existe transicion ${seed.status} -> ${cfg.defaults.defaultSeedStatus}.`,
        );
        return;
      }

      const transitionError = evaluateSeedTransitionGuard(transition, {
        nowDate: todayIsoDate(),
        scheduledDate: seed.scheduled_date,
        seedCreatedAt: seed.created_at,
        userRole: myRole,
      });
      if (transitionError) {
        setMsg(transitionError);
        return;
      }

      const payload: Record<string, unknown> = {
        status: cfg.defaults.defaultSeedStatus,
      };
      if (transition.clearScheduledDate) payload.scheduled_date = null;

      const query = withGardenScope(
        supabase.from("seeds").update(payload).eq("id", seed.id),
        activeGardenId,
      );
      const { error } = await query;
      if (error) {
        setMsg(error.message);
        return;
      }

      await clearWateringConfirmations(seed.id);
      await refreshAll();
    },
    [setMsg, cfg, myRole, activeGardenId, clearWateringConfirmations, refreshAll],
  );

  const updateSeedContext = useCallback(
    async (
      seed: SeedItem,
      input: { mapPlaceId: string | null; mapRouteId: string | null; planTypeId: string | null },
    ) => {
      setMsg(null);
      const canEditPlanTypeFromSeed = !seed.bloomed_page_id;
      const nextPlanTypeId = canEditPlanTypeFromSeed
        ? input.planTypeId
        : (seed.plan_type_id ?? null);

      const query = withGardenScope(
        supabase
          .from("seeds")
          .update({
            map_place_id: input.mapPlaceId,
            map_route_id: input.mapRouteId,
            plan_type_id: nextPlanTypeId,
          })
          .eq("id", seed.id),
        activeGardenId,
      );
      const { error } = await query;
      if (error) {
        setMsg(error.message);
        return;
      }

      if (!canEditPlanTypeFromSeed) {
        setMsg("Lugar y ruta actualizados. El tipo de plan de una flor se edita desde la propia pagina.");
      } else {
        setMsg("Semilla actualizada con su contexto.");
      }
      await refreshAll();
    },
    [activeGardenId, refreshAll, setMsg],
  );

  const waterSeed = useCallback(
    async ({ seed, requiredParticipants }: WaterSeedInput) => {
      setMsg(null);
      if (!activeGardenId) {
        setMsg("No hay jardín activo para regar esta semilla.");
        return;
      }
      if (seed.status === cfg.defaults.bloomedStatus) {
        if (seed.bloomed_page_id) {
          onOpenPage(seed.bloomed_page_id);
          return;
        }
        await refreshAll();
        return;
      }
      if (cfg.calendarRules.bloomOnlyScheduled && seed.status !== cfg.defaults.scheduledStatus) {
        setMsg("Solo se pueden regar semillas programadas.");
        return;
      }
      if (!seed.scheduled_date) {
        setMsg("La semilla necesita una fecha antes de poder regarse.");
        return;
      }

      const transition = resolveSeedTransition(cfg.flowRules, {
        fromStatus: seed.status,
        toStatus: cfg.defaults.bloomedStatus,
        actionKey: "bloom",
      });
      if (!transition) {
        setMsg(`No existe transicion ${seed.status} -> ${cfg.defaults.bloomedStatus}.`);
        return;
      }

      const transitionError = evaluateSeedTransitionGuard(transition, {
        nowDate: todayIsoDate(),
        scheduledDate: seed.scheduled_date,
        seedCreatedAt: seed.created_at,
        userRole: myRole,
      });
      if (transitionError) {
        setMsg(transitionError);
        return;
      }

      const wateringPayload = withGardenIdOnInsert(
        {
          seed_id: seed.id,
          user_id: myProfileId,
          watered_at: new Date().toISOString(),
        },
        activeGardenId,
      );
      const { error: wateringError } = await supabase
        .from("seed_watering_confirmations")
        .upsert(wateringPayload, { onConflict: "seed_id,user_id" });

      if (wateringError) {
        setMsg(wateringError.message);
        return;
      }

      const confirmationsQuery = withGardenScope(
        supabase
          .from("seed_watering_confirmations")
          .select("user_id")
          .eq("seed_id", seed.id),
        activeGardenId,
      );
      const { data: confirmationRows, error: confirmationsError } = await confirmationsQuery;
      if (confirmationsError) {
        setMsg(confirmationsError.message);
        return;
      }

      const confirmedParticipants = new Set(
        ((confirmationRows as Array<{ user_id?: string | null }> | null) ?? [])
          .map((row) => String(row.user_id ?? "").trim())
          .filter(Boolean),
      ).size;

      if (confirmedParticipants < Math.max(1, requiredParticipants)) {
        await refreshAll();
        if (confirmedParticipants <= 1) {
          setMsg(`Riego guardado. Falta ${otherPersonLabel} para que la flor brote.`);
        } else {
          setMsg("Riego guardado. La flor sigue esperando confirmaciones.");
        }
        return;
      }

      const activateFlowerBirthRitual = Math.max(1, requiredParticipants) > 1;

      try {
        const pageId = await finalizeBloom(seed, {
          activateFlowerBirthRitual,
        });
        await refreshAll();
        if (pageId && activateFlowerBirthRitual) {
          try {
            await broadcastFlowerBirthPending({
              actorUserId: myProfileId,
              clientId: flowerBirthPendingClientId,
              gardenId: activeGardenId,
              pageId,
              seedId: seed.id,
            });
          } catch (error) {
            console.warn("[plans/actions] no se pudo emitir flower_birth_pending:", error);
          }
        }
        if (pageId && cfg.defaults.autoOpenCreatedPage) {
          onOpenPage(pageId, {
            ritual: activateFlowerBirthRitual ? "flower_birth" : null,
          });
          return;
        }
        setMsg(
          activateFlowerBirthRitual
            ? `La flor ya puede nacer. Ahora toca entrar al nacimiento compartido con ${otherPersonLabel}.`
            : "La semilla ya ha florecido.",
        );
      } catch (error) {
        setMsg(getErrorMessage(error, "No se pudo completar el florecimiento compartido."));
      }
    },
    [
      activeGardenId,
      cfg.calendarRules.bloomOnlyScheduled,
      cfg.defaults.autoOpenCreatedPage,
      cfg.defaults.bloomedStatus,
      cfg.defaults.scheduledStatus,
      cfg.flowRules,
      finalizeBloom,
      myProfileId,
      myRole,
      onOpenPage,
      otherPersonLabel,
      flowerBirthPendingClientId,
      refreshAll,
      setMsg,
    ],
  );

  return {
    createSeed,
    createPlanType,
    updateSeedContext,
    scheduleSeed,
    unscheduleSeed,
    waterSeed,
  };
}
