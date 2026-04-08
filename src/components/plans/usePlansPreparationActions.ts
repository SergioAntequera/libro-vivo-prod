"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import { supabase } from "@/lib/supabase";
import {
  isSchemaNotReadyError,
  withGardenIdOnInsert,
  withGardenScope,
} from "@/lib/gardens";
import {
  resolveSeedTransition,
  type SeedCalendarConfig,
} from "@/lib/seedCalendarConfig";
import { toErrorMessage } from "@/lib/errorMessage";
import type { SeedItem } from "@/lib/plansTypes";
import type {
  SeedPreparationAttachment,
  SeedPreparationBlockId,
  SeedPreparationChecklistCategory,
  SeedPreparationChecklistItem,
  SeedPreparationChecklistOwner,
  SeedPreparationCollaborationMode,
  SeedPreparationItineraryItem,
  SeedPreparationPlaceLink,
  SeedPreparationProfile,
  SeedPreparationReservation,
  SeedPreparationStay,
  SeedPreparationStop,
  SeedPreparationTransportLeg,
} from "@/lib/seedPreparationTypes";
import { SEED_PLANNING_DRAFT_STATUS } from "@/lib/seedPreparationTypes";

type UsePlansPreparationActionsParams = {
  cfg: SeedCalendarConfig;
  myProfileId: string;
  activeGardenId: string | null;
  setMsg: Dispatch<SetStateAction<string | null>>;
  refreshAll: (gardenIdOverride?: string | null) => Promise<void>;
};

type SavePreparationDraftInput = {
  seedId: string;
  title: string;
  notes: string;
  element: string | null;
  planTypeId: string | null;
  collaborationMode: SeedPreparationCollaborationMode;
  summary: string;
  destinationLabel: string;
  destinationKind: string | null;
  dateMode: "single_day" | "date_range" | "flexible";
  startsOn: string | null;
  endsOn: string | null;
  budgetAmount: number | null;
  budgetCurrency: string | null;
  budgetNotes: string;
  goalTags: string[];
  sharedIntention: string;
  whyThisTrip: string;
  climateContext: string;
  primaryMapPlaceId: string | null;
  primaryMapRouteId?: string | null;
  enabledBlocks: SeedPreparationBlockId[];
  preparationProgress: number;
  stops: SeedPreparationStop[];
  transportLegs: SeedPreparationTransportLeg[];
  stays: SeedPreparationStay[];
  placeLinks: SeedPreparationPlaceLink[];
  itineraryItems: SeedPreparationItineraryItem[];
  reservations: SeedPreparationReservation[];
  attachments: SeedPreparationAttachment[];
};

type PlantPreparationDraftInput = {
  seed: SeedItem;
  profile: Pick<SeedPreparationProfile, "date_mode" | "starts_on"> | null;
};

type CreateChecklistItemInput = {
  seedId: string;
  label: string;
  category?: SeedPreparationChecklistCategory;
  owner?: SeedPreparationChecklistOwner;
  isRequired?: boolean;
};

function asSeedItem(row: Record<string, unknown> | null): SeedItem | null {
  if (!row) return null;
  const id = String(row.id ?? "").trim();
  if (!id) return null;
  return {
    id,
    title: String(row.title ?? ""),
    status: String(row.status ?? ""),
    scheduled_date: String(row.scheduled_date ?? "").trim() || null,
    element: String(row.element ?? "").trim() || null,
    notes: String(row.notes ?? "").trim() || null,
    bloomed_page_id: String(row.bloomed_page_id ?? "").trim() || null,
    map_place_id: String(row.map_place_id ?? "").trim() || null,
    map_route_id: String(row.map_route_id ?? "").trim() || null,
    plan_type_id: String(row.plan_type_id ?? "").trim() || null,
    created_by: String(row.created_by ?? "").trim() || null,
    created_at: String(row.created_at ?? "").trim() || new Date(0).toISOString(),
  };
}

function normalizeDate(value: string | null | undefined) {
  const next = String(value ?? "").trim();
  return next || null;
}

function normalizeCollaborationMode(
  value: SeedPreparationCollaborationMode | string | null | undefined,
): SeedPreparationCollaborationMode {
  return value === "shared" ? "shared" : "solo_for_now";
}

function normalizeText(value: string | null | undefined) {
  const next = String(value ?? "").trim();
  return next || null;
}

function normalizeNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function syncPreparationRows<T extends { id: string }>(
  params: {
    table:
      | "seed_preparation_stops"
      | "seed_preparation_transport_legs"
      | "seed_preparation_stays"
      | "seed_preparation_place_links"
      | "seed_preparation_itinerary_items"
      | "seed_preparation_reservations"
      | "seed_preparation_attachments";
    seedId: string;
    gardenId: string;
    rows: T[];
  },
) {
  const { table, seedId, gardenId, rows } = params;
  const { data: existingRows, error: existingError } = await withGardenScope(
    supabase.from(table).select("id").eq("seed_id", seedId),
    gardenId,
  );
  if (existingError) throw existingError;

  const nextIds = new Set(rows.map((row) => row.id));
  const staleIds = ((existingRows as Array<{ id?: string }> | null) ?? [])
    .map((row) => String(row.id ?? "").trim())
    .filter((id) => id && !nextIds.has(id));

  if (staleIds.length) {
    const { error: deleteError } = await withGardenScope(
      supabase.from(table).delete().in("id", staleIds),
      gardenId,
    );
    if (deleteError) throw deleteError;
  }

  if (!rows.length) return;

  const { error: upsertError } = await supabase
    .from(table)
    .upsert(rows.map((row) => withGardenIdOnInsert(row, gardenId)), { onConflict: "id" });

  if (upsertError) throw upsertError;
}

export function usePlansPreparationActions({
  cfg,
  myProfileId,
  activeGardenId,
  setMsg,
  refreshAll,
}: UsePlansPreparationActionsParams) {
  const createPreparationDraft = useCallback(async () => {
    setMsg(null);
    if (!activeGardenId) {
      setMsg("No hay jardin activo para preparar esta semilla.");
      return null;
    }

    const seedPayload = withGardenIdOnInsert(
      {
        title: "Semilla en preparacion",
        notes: null,
        element: cfg.defaults.fallbackElement,
        status: SEED_PLANNING_DRAFT_STATUS,
        scheduled_date: null,
        map_place_id: null,
        map_route_id: null,
        plan_type_id: null,
        created_by: myProfileId,
      },
      activeGardenId,
    );

    const { data: seedRow, error: seedError } = await supabase
      .from("seeds")
      .insert(seedPayload)
      .select(
        "id,title,status,scheduled_date,element,notes,bloomed_page_id,map_place_id,map_route_id,plan_type_id,created_by,created_at",
      )
      .single();

    if (seedError) {
      const normalizedMessage = String(seedError.message ?? "").toLowerCase();
      if (
        normalizedMessage.includes("row-level security") ||
        normalizedMessage.includes("violates")
      ) {
        setMsg(
          "No se pudo abrir el borrador de preparacion porque la base todavia no acepta este estado correctamente.",
        );
      } else {
        setMsg(seedError.message);
      }
      return null;
    }

    const seed = asSeedItem((seedRow as Record<string, unknown> | null) ?? null);
    if (!seed) {
      setMsg("No se pudo crear el borrador de preparacion.");
      return null;
    }

    const profilePayload = withGardenIdOnInsert(
      {
        seed_id: seed.id,
        planner_mode: "general",
        collaboration_mode: "solo_for_now",
        preparation_progress: 0,
        enabled_blocks: ["summary"],
        summary: null,
        destination_label: null,
        destination_kind: null,
        date_mode: "single_day",
        starts_on: null,
        ends_on: null,
        budget_amount: null,
        budget_currency: "EUR",
        budget_notes: null,
        goal_tags: [],
        shared_intention: null,
        why_this_trip: null,
        climate_context: null,
        primary_map_place_id: null,
        primary_map_route_id: null,
      },
      activeGardenId,
    );

    const { error: profileError } = await supabase
      .from("seed_preparation_profiles")
      .insert(profilePayload);

    if (profileError) {
      if (!isSchemaNotReadyError(profileError)) {
        await withGardenScope(supabase.from("seeds").delete().eq("id", seed.id), activeGardenId);
      }
      setMsg(
        toErrorMessage(
          profileError,
          "No se pudo abrir el dossier de preparacion para esta semilla.",
        ),
      );
      return null;
    }

    await refreshAll();
    setMsg("Borrador de preparacion creado. Ya puedes darle forma antes de plantarlo.");
    return seed;
  }, [
    activeGardenId,
    cfg.defaults.fallbackElement,
    myProfileId,
    refreshAll,
    setMsg,
  ]);

  const savePreparationDraft = useCallback(
    async (input: SavePreparationDraftInput) => {
      setMsg(null);
      if (!activeGardenId) {
        setMsg("No hay jardin activo para guardar esta preparacion.");
        return false;
      }

      const normalizedTitle = input.title.trim();
      const normalizedNotes = input.notes.trim() || null;
      const normalizedSummary = input.summary.trim() || null;
      const normalizedDestinationLabel = input.destinationLabel.trim() || null;
      const normalizedBudgetNotes = input.budgetNotes.trim() || null;
      const normalizedBudgetCurrency = String(input.budgetCurrency ?? "").trim() || null;
      const normalizedGoalTags = input.goalTags
        .map((tag) => String(tag ?? "").trim())
        .filter(Boolean)
        .slice(0, 8);
      const collaborationMode = normalizeCollaborationMode(input.collaborationMode);
      const normalizedSharedIntention = input.sharedIntention.trim() || null;
      const normalizedWhyThisTrip = input.whyThisTrip.trim() || null;
      const normalizedClimateContext = input.climateContext.trim() || null;

      const seedUpdate = withGardenScope(
        supabase
          .from("seeds")
          .update({
            title: normalizedTitle,
            notes: normalizedNotes,
            element: input.element ?? cfg.defaults.fallbackElement,
            plan_type_id: input.planTypeId,
            map_place_id: input.primaryMapPlaceId,
            map_route_id: input.primaryMapRouteId ?? null,
          })
          .eq("id", input.seedId),
        activeGardenId,
      );
      const { error: seedError } = await seedUpdate;
      if (seedError) {
        setMsg(seedError.message);
        return false;
      }

      const profilePayload = withGardenIdOnInsert(
        {
          seed_id: input.seedId,
          planner_mode: "general",
          collaboration_mode: collaborationMode,
          preparation_progress: input.preparationProgress,
          enabled_blocks: input.enabledBlocks,
          summary: normalizedSummary,
          destination_label: normalizedDestinationLabel,
          destination_kind: normalizeText(input.destinationKind),
          date_mode: input.dateMode,
          starts_on: normalizeDate(input.startsOn),
          ends_on: normalizeDate(input.endsOn),
          budget_amount: input.budgetAmount,
          budget_currency: normalizedBudgetCurrency,
          budget_notes: normalizedBudgetNotes,
          goal_tags: normalizedGoalTags,
          shared_intention: normalizedSharedIntention,
          why_this_trip: normalizedWhyThisTrip,
          climate_context: normalizedClimateContext,
          primary_map_place_id: input.primaryMapPlaceId,
          primary_map_route_id: input.primaryMapRouteId ?? null,
        },
        activeGardenId,
      );

      const { error: profileError } = await supabase
        .from("seed_preparation_profiles")
        .upsert(profilePayload, { onConflict: "seed_id" });

      if (profileError) {
        setMsg(profileError.message);
        return false;
      }

      try {
        await syncPreparationRows({
          table: "seed_preparation_stops",
          seedId: input.seedId,
          gardenId: activeGardenId,
          rows: input.stops
            .filter((item) => item.title.trim())
            .map((item, index) => ({
              ...item,
              order_index: index,
              title: item.title.trim(),
              notes: normalizeText(item.notes),
            })),
        });

        await syncPreparationRows({
          table: "seed_preparation_transport_legs",
          seedId: input.seedId,
          gardenId: activeGardenId,
          rows: input.transportLegs.map((item, index) => ({
            ...item,
            order_index: index,
            title: normalizeText(item.title),
            from_label: normalizeText(item.from_label),
            to_label: normalizeText(item.to_label),
            starts_at: normalizeText(item.starts_at),
            ends_at: normalizeText(item.ends_at),
            provider_name: normalizeText(item.provider_name),
            booking_url: normalizeText(item.booking_url),
            reference_code: normalizeText(item.reference_code),
            notes: normalizeText(item.notes),
          })),
        });

        await syncPreparationRows({
          table: "seed_preparation_stays",
          seedId: input.seedId,
          gardenId: activeGardenId,
          rows: input.stays
            .filter((item) => item.name.trim())
            .map((item, index) => ({
              ...item,
              order_index: index,
              name: item.name.trim(),
              provider_name: normalizeText(item.provider_name),
              booking_url: normalizeText(item.booking_url),
              address_label: normalizeText(item.address_label),
              confirmation_code: normalizeText(item.confirmation_code),
              notes: normalizeText(item.notes),
            })),
        });

        await syncPreparationRows({
          table: "seed_preparation_place_links",
          seedId: input.seedId,
          gardenId: activeGardenId,
          rows: input.placeLinks
            .filter((item) => item.map_place_id || String(item.manual_title ?? "").trim())
            .map((item, index) => ({
              ...item,
              order_index: index,
              manual_title: normalizeText(item.manual_title),
              notes: normalizeText(item.notes),
            })),
        });

        await syncPreparationRows({
          table: "seed_preparation_itinerary_items",
          seedId: input.seedId,
          gardenId: activeGardenId,
          rows: input.itineraryItems
            .filter((item) => item.title.trim())
            .map((item, index) => ({
              ...item,
              order_index: index,
              title: item.title.trim(),
              description: normalizeText(item.description),
              duration_minutes: normalizeNumber(item.duration_minutes),
            })),
        });

        await syncPreparationRows({
          table: "seed_preparation_reservations",
          seedId: input.seedId,
          gardenId: activeGardenId,
          rows: input.reservations
            .filter((item) => item.title.trim())
            .map((item, index) => ({
              ...item,
              order_index: index,
              title: item.title.trim(),
              provider_name: normalizeText(item.provider_name),
              reservation_url: normalizeText(item.reservation_url),
              reference_code: normalizeText(item.reference_code),
              amount: normalizeNumber(item.amount),
              currency: normalizeText(item.currency),
              starts_at: normalizeText(item.starts_at),
              notes: normalizeText(item.notes),
            })),
        });

        await syncPreparationRows({
          table: "seed_preparation_attachments",
          seedId: input.seedId,
          gardenId: activeGardenId,
          rows: input.attachments
            .filter((item) => item.title.trim() && String(item.file_url ?? "").trim())
            .map((item, index) => ({
              ...item,
              order_index: index,
              title: item.title.trim(),
              file_name: normalizeText(item.file_name),
              mime_type: normalizeText(item.mime_type),
              storage_provider: normalizeText(item.storage_provider),
              file_url: String(item.file_url ?? "").trim(),
              notes: normalizeText(item.notes),
            })),
        });
      } catch (error) {
        setMsg(toErrorMessage(error, "No se pudo guardar la estructura del viaje."));
        return false;
      }

      await refreshAll();
      setMsg(
        collaborationMode === "shared"
          ? "Preparacion compartida guardada. Ya puede abrirla la otra persona desde el jardin."
          : "Preparacion guardada solo para ti por ahora. No aparecera al otro lado hasta pasarla a En conjunto.",
      );
      return true;
    },
    [activeGardenId, cfg.defaults.fallbackElement, refreshAll, setMsg],
  );

  const addPreparationChecklistItem = useCallback(
    async ({
      seedId,
      label,
      category = "misc",
      owner = "shared",
      isRequired = false,
    }: CreateChecklistItemInput) => {
      setMsg(null);
      const normalizedLabel = label.trim();
      if (!normalizedLabel) {
        setMsg("Escribe primero lo que quereis preparar.");
        return false;
      }
      if (!activeGardenId) {
        setMsg("No hay jardin activo para guardar este item.");
        return false;
      }

      const { data: currentItems, error: currentItemsError } = await withGardenScope(
        supabase
          .from("seed_preparation_checklist_items")
          .select("id")
          .eq("seed_id", seedId),
        activeGardenId,
      );
      if (currentItemsError && !isSchemaNotReadyError(currentItemsError)) {
        setMsg(currentItemsError.message);
        return false;
      }

      const payload = withGardenIdOnInsert(
        {
          seed_id: seedId,
          order_index: ((currentItems as Array<{ id?: string }> | null) ?? []).length,
          category,
          label: normalizedLabel,
          owner,
          is_required: isRequired,
          completed_at: null,
          completed_by_user_id: null,
        },
        activeGardenId,
      );

      const { error } = await supabase.from("seed_preparation_checklist_items").insert(payload);
      if (error) {
        setMsg(error.message);
        return false;
      }

      await refreshAll();
      setMsg("Preparativo anadido.");
      return true;
    },
    [activeGardenId, refreshAll, setMsg],
  );

  const togglePreparationChecklistItem = useCallback(
    async (item: SeedPreparationChecklistItem, completed: boolean) => {
      setMsg(null);
      if (!activeGardenId) {
        setMsg("No hay jardin activo para actualizar este item.");
        return;
      }

      const { error } = await withGardenScope(
        supabase
          .from("seed_preparation_checklist_items")
          .update({
            completed_at: completed ? new Date().toISOString() : null,
            completed_by_user_id: completed ? myProfileId : null,
          })
          .eq("id", item.id),
        activeGardenId,
      );
      if (error) {
        setMsg(error.message);
        return;
      }

      await refreshAll();
    },
    [activeGardenId, myProfileId, refreshAll, setMsg],
  );

  const deletePreparationChecklistItem = useCallback(
    async (itemId: string) => {
      setMsg(null);
      if (!activeGardenId) {
        setMsg("No hay jardin activo para eliminar este item.");
        return;
      }

      const { error } = await withGardenScope(
        supabase.from("seed_preparation_checklist_items").delete().eq("id", itemId),
        activeGardenId,
      );
      if (error) {
        setMsg(error.message);
        return;
      }

      await refreshAll();
    },
    [activeGardenId, refreshAll, setMsg],
  );

  const plantPreparationDraft = useCallback(
    async ({ seed, profile }: PlantPreparationDraftInput) => {
      setMsg(null);
      if (!activeGardenId) {
        setMsg("No hay jardin activo para plantar esta preparacion.");
        return false;
      }

      const targetDate =
        profile?.date_mode === "flexible" ? null : normalizeDate(profile?.starts_on);
      const nextStatus = targetDate ? cfg.defaults.scheduledStatus : cfg.defaults.defaultSeedStatus;
      const transition = resolveSeedTransition(cfg.flowRules, {
        fromStatus: seed.status,
        toStatus: nextStatus,
        actionKey: targetDate ? "plant_schedule" : "plant",
      });

      if (!transition) {
        setMsg("No existe una transicion valida para plantar este borrador.");
        return false;
      }

      if (transition.requiresScheduledDate && !targetDate) {
        setMsg("Antes de plantar este plan necesitas dejar al menos una fecha de salida.");
        return false;
      }

      const payload: Record<string, unknown> = {
        status: nextStatus,
        scheduled_date: targetDate,
      };
      if (transition.clearScheduledDate) {
        payload.scheduled_date = null;
      }

      const { error } = await withGardenScope(
        supabase.from("seeds").update(payload).eq("id", seed.id),
        activeGardenId,
      );
      if (error) {
        setMsg(error.message);
        return false;
      }

      await refreshAll();
      setMsg(
        targetDate
          ? "Semilla plantada y colocada ya en agenda."
          : "Semilla plantada. Queda como idea hasta que decidas su fecha.",
      );
      return true;
    },
    [
      activeGardenId,
      cfg.defaults.defaultSeedStatus,
      cfg.defaults.scheduledStatus,
      cfg.flowRules,
      refreshAll,
      setMsg,
    ],
  );

  return {
    createPreparationDraft,
    savePreparationDraft,
    addPreparationChecklistItem,
    togglePreparationChecklistItem,
    deletePreparationChecklistItem,
    plantPreparationDraft,
  };
}
