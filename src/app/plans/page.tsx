"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { withGardenScope } from "@/lib/gardens";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { StatusNotice } from "@/components/ui/StatusNotice";
import ActiveGardenSwitcher from "@/components/shared/ActiveGardenSwitcher";
import PlansComposerPanel from "@/components/plans/PlansComposerPanel";
import PlansAgendaPanel from "@/components/plans/PlansAgendaPanel";
import PlansPendingFlowerBirthPanel from "@/components/plans/PlansPendingFlowerBirthPanel";
import PlansPreparationPanel from "@/components/plans/PlansPreparationPanel";
import PlansFirstWalkthrough from "@/components/plans/PlansFirstWalkthrough";
import {
  SeedPreparationEditorModal,
  type SeedPreparationEditorSubmitPayload,
} from "@/components/plans/SeedPreparationEditorModal";
import { SeedPlantingModeModal } from "@/components/plans/SeedPlantingModeModal";
import { useGardenCompanionLabel } from "@/components/chat/useGardenCompanionLabel";
import { sendGardenChatReferenceMessage } from "@/lib/gardenChatMutations";
import { buildGardenChatPlanReference } from "@/lib/gardenChatReferences";
import { usePlansBootstrapData } from "@/components/plans/usePlansBootstrapData";
import { usePlansSeedActions } from "@/components/plans/usePlansSeedActions";
import { usePlansPreparationActions } from "@/components/plans/usePlansPreparationActions";
import { buildPlansAgendaSections, buildPlansSeedViews } from "@/lib/plansViewModel";
import {
  buildSeedPreparationDraftViews,
  isPreparationDraftVisibleToUser,
  isPreparationDraftEffectivelyBlank,
} from "@/lib/seedPreparation";
import {
  getPageDetailHref,
  getProductSurface,
  getProductSurfaceHref,
} from "@/lib/productSurfaces";
import { todayIsoDate } from "@/lib/seedCalendarConfig";
import { SEED_PLANNING_DRAFT_STATUS } from "@/lib/seedPreparationTypes";
import type { PlansAgendaFocus, PlansSeedView, SeedItem } from "@/lib/plansTypes";
import type { SurfaceSpotlightWalkthroughStep } from "@/components/ui/SurfaceSpotlightWalkthrough";

const PLANS_SURFACE = getProductSurface("plans");
const PLANS_AGENDA_FOCUS_VALUES = new Set<PlansAgendaFocus>([
  "all",
  "action",
  "waiting",
  "upcoming",
  "ideas",
]);

const PLANS_FIRST_WALK_BASE_STEPS: SurfaceSpotlightWalkthroughStep[] = [
  {
    targetId: "new-seed",
    title: "Desde aqui nace una semilla",
    description:
      "Este boton abre la puerta principal de planes. Desde el modal eliges si plantarla ya o prepararla antes.",
  },
  {
    targetId: "agenda-filters",
    title: "Filtrar la agenda viva",
    description:
      "Aqui cambias el foco entre ideas, programadas y acciones para encontrar antes lo importante.",
  },
  {
    targetId: "agenda-panel",
    title: "Lo que ya esta en marcha",
    description:
      "Aqui viven las semillas activas: se programan, se riegan y terminan empujando el nacimiento compartido de la flor.",
  },
];

const PLANS_FIRST_WALK_PREPARATION_STEP: SurfaceSpotlightWalkthroughStep = {
  targetId: "preparation-panel",
  title: "Preparar antes de plantar",
  description:
    "Cuando un plan necesita mas contexto, el dossier previo aparece aqui antes de entrar en la agenda viva.",
};

function normalizePlanFilterText(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function countRowsBySeedId<T extends { seed_id: string }>(items: T[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const seedId = String(item.seed_id ?? "").trim();
    if (!seedId) continue;
    counts.set(seedId, (counts.get(seedId) ?? 0) + 1);
  }
  return counts;
}

function FilterPill({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
        active
          ? "border-[#86b49d] bg-[#eef6ea] text-[#2f5137]"
          : "border-[var(--lv-border)] bg-white text-[var(--lv-text)]"
      }`}
    >
      {children}
    </button>
  );
}

function resolveAgendaFocusFromSearchParams(
  searchParams: URLSearchParams | ReturnType<typeof useSearchParams> | null,
) {
  const explicitFocus = String(searchParams?.get("focus") ?? "").trim().toLowerCase();
  if (PLANS_AGENDA_FOCUS_VALUES.has(explicitFocus as PlansAgendaFocus)) {
    return explicitFocus as PlansAgendaFocus;
  }

  const legacyTab = String(searchParams?.get("tab") ?? "").trim().toLowerCase();
  if (legacyTab === "ideas") return "ideas" as const;
  if (legacyTab === "calendar") return "all" as const;
  return null;
}

function PlansPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
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
  } = usePlansBootstrapData({
    onRequireLogin: () => {
      router.push(getProductSurfaceHref("login"));
    },
  });

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [selectedPlanTypeId, setSelectedPlanTypeId] = useState("");
  const [selectedPlaceId, setSelectedPlaceId] = useState("");
  const requestedAgendaFocus = useMemo(
    () => resolveAgendaFocusFromSearchParams(searchParams),
    [searchParams],
  );
  const requestedSeedId = String(searchParams?.get("seed") ?? "").trim();
  const pickedPlaceIdFromSearch = String(searchParams?.get("picked_place_id") ?? "").trim();
  const composerRequestedFromSearch = String(searchParams?.get("composer") ?? "").trim() === "1";
  const plantingRequestedFromSearch = String(searchParams?.get("planting") ?? "").trim() === "1";
  const preparationRequestedFromSearch =
    String(searchParams?.get("preparation") ?? "").trim() === "1";
  const plansTourRequestedFromSearch = String(searchParams?.get("tour") ?? "").trim() === "1";
  const [agendaFocus, setAgendaFocus] = useState<PlansAgendaFocus>(
    requestedAgendaFocus ?? "all",
  );
  const [showComposer, setShowComposer] = useState(false);
  const [showPlantingModeModal, setShowPlantingModeModal] = useState(false);
  const [showPlansWalkthrough, setShowPlansWalkthrough] = useState(false);
  const [creatingPreparationDraft, setCreatingPreparationDraft] = useState(false);
  const [savingPreparation, setSavingPreparation] = useState(false);
  const [openingPreparationSeedId, setOpeningPreparationSeedId] = useState<string | null>(null);
  const [editingPreparationSeedId, setEditingPreparationSeedId] = useState<string | null>(null);
  const [plantingPreparationSeedId, setPlantingPreparationSeedId] = useState<string | null>(null);
  const [sharingSeedId, setSharingSeedId] = useState<string | null>(null);
  const [planQuery, setPlanQuery] = useState("");
  const [ideasPlanTypeFilterId, setIdeasPlanTypeFilterId] = useState("__all__");
  const [ideasPlanTypeFilterQuery, setIdeasPlanTypeFilterQuery] = useState("");
  const [ideasPlanTypeFilterOpen, setIdeasPlanTypeFilterOpen] = useState(false);
  const [scheduleDrafts, setScheduleDrafts] = useState<Record<string, string>>({});
  const [deletingSeedId, setDeletingSeedId] = useState<string | null>(null);
  const [pendingDeleteSeed, setPendingDeleteSeed] = useState<SeedItem | null>(null);
  const [creatingSeed, setCreatingSeed] = useState(false);
  const plansTourHandledRef = useRef(false);
  const today = useMemo(() => todayIsoDate(), []);
  const { companionLabel, companionReference } = useGardenCompanionLabel(
    activeGardenId,
    myProfileId || null,
  );

  // Restore composer draft saved before navigating to the map picker
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("seed_composer_draft");
      if (!raw) return;
      sessionStorage.removeItem("seed_composer_draft");
      const draft = JSON.parse(raw) as {
        title?: string;
        notes?: string;
        scheduledDate?: string;
        selectedPlanTypeId?: string;
      };
      if (draft.title) setTitle(draft.title);
      if (draft.notes) setNotes(draft.notes);
      if (draft.scheduledDate) setScheduledDate(draft.scheduledDate);
      if (draft.selectedPlanTypeId) setSelectedPlanTypeId(draft.selectedPlanTypeId);
    } catch {
      /* corrupted or unavailable – ignore */
    }
  }, []);

  const placeLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of placeOptions) {
      const subtitle = row.subtitle?.trim();
      map.set(row.id, subtitle ? `${row.title} - ${subtitle}` : row.title);
    }
    return map;
  }, [placeOptions]);

  const draftSeeds = useMemo(
    () => seeds.filter((seed) => seed.status === SEED_PLANNING_DRAFT_STATUS),
    [seeds],
  );

  const visibleSeeds = useMemo(
    () =>
      seeds.filter(
        (seed) =>
          seed.status !== cfg.defaults.bloomedStatus &&
          seed.status !== SEED_PLANNING_DRAFT_STATUS,
      ),
    [cfg.defaults.bloomedStatus, seeds],
  );

  const allDraftViews = useMemo(
    () =>
      buildSeedPreparationDraftViews({
        seeds: draftSeeds,
        planTypeOptions,
        placeOptions,
        profiles: preparationProfiles,
        checklistItems: preparationChecklistItems,
      }),
    [draftSeeds, placeOptions, planTypeOptions, preparationChecklistItems, preparationProfiles],
  );

  const draftViews = useMemo(
    () =>
      allDraftViews.filter((view) =>
        isPreparationDraftVisibleToUser({
          seed: view.seed,
          collaborationMode: view.collaborationMode,
          currentUserId: myProfileId,
        }),
      ),
    [allDraftViews, myProfileId],
  );

  const preparationStructureCountsBySeedId = useMemo(() => {
    const stopCounts = countRowsBySeedId(preparationStops);
    const transportCounts = countRowsBySeedId(preparationTransportLegs);
    const stayCounts = countRowsBySeedId(preparationStays);
    const placeLinkCounts = countRowsBySeedId(preparationPlaceLinks);
    const itineraryCounts = countRowsBySeedId(preparationItineraryItems);
    const reservationCounts = countRowsBySeedId(preparationReservations);
    const attachmentCounts = countRowsBySeedId(preparationAttachments);
    const counts = new Map<
      string,
      {
        stopCount: number;
        transportCount: number;
        stayCount: number;
        placeLinkCount: number;
        itineraryCount: number;
        reservationCount: number;
        attachmentCount: number;
      }
    >();

    for (const seed of draftSeeds) {
      counts.set(seed.id, {
        stopCount: stopCounts.get(seed.id) ?? 0,
        transportCount: transportCounts.get(seed.id) ?? 0,
        stayCount: stayCounts.get(seed.id) ?? 0,
        placeLinkCount: placeLinkCounts.get(seed.id) ?? 0,
        itineraryCount: itineraryCounts.get(seed.id) ?? 0,
        reservationCount: reservationCounts.get(seed.id) ?? 0,
        attachmentCount: attachmentCounts.get(seed.id) ?? 0,
      });
    }

    return counts;
  }, [
    draftSeeds,
    preparationAttachments,
    preparationItineraryItems,
    preparationPlaceLinks,
    preparationReservations,
    preparationStops,
    preparationStays,
    preparationTransportLegs,
  ]);

  const blankPreparationDraftIds = useMemo(() => {
    const ids = new Set<string>();
    for (const view of draftViews) {
      if (
        isPreparationDraftEffectivelyBlank({
          seed: view.seed,
          profile: view.profile,
          checklistTotal: view.checklistTotal,
          structureCounts: preparationStructureCountsBySeedId.get(view.seed.id),
        })
      ) {
        ids.add(view.seed.id);
      }
    }
    return ids;
  }, [draftViews, preparationStructureCountsBySeedId]);

  const reusableEmptyPreparationDraftView = useMemo(
    () => draftViews.find((view) => blankPreparationDraftIds.has(view.seed.id)) ?? null,
    [blankPreparationDraftIds, draftViews],
  );

  const visibleDraftViews = useMemo(() => {
    const nonBlankDrafts = draftViews.filter((view) => !blankPreparationDraftIds.has(view.seed.id));
    if (nonBlankDrafts.length) return nonBlankDrafts;
    if (
      reusableEmptyPreparationDraftView &&
      reusableEmptyPreparationDraftView.collaborationMode === "shared"
    ) {
      return [reusableEmptyPreparationDraftView];
    }
    return [];
  }, [blankPreparationDraftIds, draftViews, reusableEmptyPreparationDraftView]);

  const plansFirstWalkStorageKey = useMemo(() => {
    if (!myProfileId || !activeGardenId) return null;
    return `lv-plans-first-walk:v1:${myProfileId}:${activeGardenId}`;
  }, [activeGardenId, myProfileId]);

  const plansFirstWalkSteps = useMemo(
    () =>
      visibleDraftViews.length
        ? [...PLANS_FIRST_WALK_BASE_STEPS, PLANS_FIRST_WALK_PREPARATION_STEP]
        : [...PLANS_FIRST_WALK_BASE_STEPS],
    [visibleDraftViews.length],
  );

  const closePlansWalkthrough = useCallback(() => {
    if (plansFirstWalkStorageKey && typeof window !== "undefined") {
      window.localStorage.setItem(plansFirstWalkStorageKey, "1");
    }
    setShowPlansWalkthrough(false);
  }, [plansFirstWalkStorageKey]);

  useEffect(() => {
    if (loading || !activeGardenId || !myProfileId) return;
    if (showComposer || showPlantingModeModal || editingPreparationSeedId) return;

    const modalRequested =
      composerRequestedFromSearch ||
      plantingRequestedFromSearch ||
      preparationRequestedFromSearch ||
      Boolean(requestedSeedId);
    if (modalRequested) return;

    const shouldAutoOpen =
      !plansTourRequestedFromSearch &&
      visibleSeeds.length === 0 &&
      visibleDraftViews.length === 0 &&
      pendingFlowerBirths.length === 0 &&
      plansFirstWalkStorageKey &&
      typeof window !== "undefined" &&
      window.localStorage.getItem(plansFirstWalkStorageKey) !== "1";

    if (!plansTourRequestedFromSearch && !shouldAutoOpen) return;
    if (plansTourHandledRef.current) return;

    plansTourHandledRef.current = true;
    setShowPlansWalkthrough(true);

    if (!plansTourRequestedFromSearch) return;

    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("tour");
    const nextQuery = params.toString();
    router.replace(
      nextQuery ? `${getProductSurfaceHref("plans")}?${nextQuery}` : getProductSurfaceHref("plans"),
      { scroll: false },
    );
  }, [
    activeGardenId,
    composerRequestedFromSearch,
    editingPreparationSeedId,
    loading,
    myProfileId,
    pendingFlowerBirths.length,
    plansFirstWalkStorageKey,
    plansTourRequestedFromSearch,
    plantingRequestedFromSearch,
    preparationRequestedFromSearch,
    requestedSeedId,
    router,
    searchParams,
    showComposer,
    showPlantingModeModal,
    visibleDraftViews.length,
    visibleSeeds.length,
  ]);

  const draftViewBySeedId = useMemo(
    () => new Map(draftViews.map((view) => [view.seed.id, view])),
    [draftViews],
  );

  const seedViews = useMemo(
    () =>
      buildPlansSeedViews({
        seeds: visibleSeeds,
        planTypeOptions,
        placeOptions,
        routeOptions,
        wateringConfirmations,
        currentUserId: myProfileId,
        activeMemberCount: activeGardenMemberCount,
        cfg,
        nowDate: today,
        query: planQuery,
      }),
    [
      activeGardenMemberCount,
      cfg,
      myProfileId,
      placeOptions,
      planQuery,
      planTypeOptions,
      routeOptions,
      today,
      visibleSeeds,
      wateringConfirmations,
    ],
  );

  const ideaPlanTypeFilterOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of seedViews) {
      const key = item.seed.plan_type_id?.trim() || "__none__";
      const label = item.planTypeLabel ?? "Sin tipo";
      if (!seen.has(key)) seen.set(key, label);
    }
    return [...seen.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [seedViews]);
  const filteredIdeaPlanTypeOptions = useMemo(() => {
    const query = normalizePlanFilterText(ideasPlanTypeFilterQuery);
    if (!query) return ideaPlanTypeFilterOptions;
    return ideaPlanTypeFilterOptions.filter((option) =>
      normalizePlanFilterText(option.label).includes(query),
    );
  }, [ideaPlanTypeFilterOptions, ideasPlanTypeFilterQuery]);
  const selectedIdeaPlanTypeFilterLabel = useMemo(() => {
    if (ideasPlanTypeFilterId === "__all__") return "Todos los tipos";
    return (
      ideaPlanTypeFilterOptions.find((option) => option.value === ideasPlanTypeFilterId)?.label ??
      "Todos los tipos"
    );
  }, [ideasPlanTypeFilterId, ideaPlanTypeFilterOptions]);
  const filteredSeedViews = useMemo(() => {
    if (ideasPlanTypeFilterId === "__all__") return seedViews;
    return seedViews.filter((item) => {
      const currentPlanTypeId = item.seed.plan_type_id?.trim() || "__none__";
      return currentPlanTypeId === ideasPlanTypeFilterId;
    });
  }, [ideasPlanTypeFilterId, seedViews]);
  const agendaSections = useMemo(
    () => buildPlansAgendaSections(filteredSeedViews),
    [filteredSeedViews],
  );
  const activeAgendaChip = agendaFocus === "waiting" ? "action" : agendaFocus;
  const visibleAgendaSections = useMemo(() => {
    return agendaFocus === "all"
      ? agendaSections
      : agendaFocus === "action" || agendaFocus === "waiting"
        ? agendaSections.filter(
            (section) => section.key === "action" || section.key === "waiting",
          )
        : agendaSections.filter((section) => section.key === agendaFocus);
  }, [agendaFocus, agendaSections]);

  useEffect(() => {
    if (ideasPlanTypeFilterId === "__all__") return;
    const stillExists = ideaPlanTypeFilterOptions.some(
      (option) => option.value === ideasPlanTypeFilterId,
    );
    if (!stillExists) {
      setIdeasPlanTypeFilterId("__all__");
    }
  }, [ideasPlanTypeFilterId, ideaPlanTypeFilterOptions]);
  const agendaCounts = useMemo(
    () => ({
      all: agendaSections.reduce((sum, section) => sum + section.items.length, 0),
      action:
        (agendaSections.find((section) => section.key === "action")?.items.length ?? 0) +
        (agendaSections.find((section) => section.key === "waiting")?.items.length ?? 0),
      upcoming: agendaSections.find((section) => section.key === "upcoming")?.items.length ?? 0,
      ideas: agendaSections.find((section) => section.key === "ideas")?.items.length ?? 0,
    }),
    [agendaSections],
  );
  const agendaFocusNote = useMemo(() => {
    if (agendaFocus === "waiting") {
      return `Estas viendo directamente lo que ya regaste y sigue pendiente de ${companionReference}.`;
    }
    if (activeAgendaChip === "action") {
      return "Aquí se junta lo que ya podéis regar hoy y lo que sigue esperando al otro lado.";
    }
    if (activeAgendaChip === "upcoming") {
      return "Aquí solo queda lo ya colocado más adelante.";
    }
    if (activeAgendaChip === "ideas") {
      return "Aquí solo aparecen las semillas que aún no han entrado en agenda.";
    }
    return null;
  }, [activeAgendaChip, agendaFocus, companionReference]);

  useEffect(() => {
    setScheduleDrafts((prev) => {
      const next: Record<string, string> = {};
      for (const seed of visibleSeeds) {
        next[seed.id] = prev[seed.id] ?? seed.scheduled_date ?? today;
      }
      return next;
    });
  }, [today, visibleSeeds]);

  useEffect(() => {
    if (!requestedAgendaFocus) return;
    setAgendaFocus(requestedAgendaFocus);
  }, [requestedAgendaFocus]);

  useEffect(() => {
    if (!requestedSeedId) return;
    setIdeasPlanTypeFilterId("__all__");
    const target = seedViews.find((item) => item.seed.id === requestedSeedId);
    if (!target?.bucket) return;
    setAgendaFocus(target.bucket);
  }, [requestedSeedId, seedViews]);

  useEffect(() => {
    if (!requestedSeedId) return;
    const targetVisible = visibleAgendaSections.some((section) =>
      section.items.some((item) => item.seed.id === requestedSeedId),
    );
    if (!targetVisible) return;
    const timer = window.setTimeout(() => {
      document.getElementById(`plan-seed-${requestedSeedId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 140);
    return () => window.clearTimeout(timer);
  }, [requestedSeedId, visibleAgendaSections]);

  useEffect(() => {
    if (!requestedSeedId) return;
    const targetDraftVisible = visibleDraftViews.some((view) => view.seed.id === requestedSeedId);
    if (!targetDraftVisible) return;
    const timer = window.setTimeout(() => {
      document.getElementById(`preparation-seed-${requestedSeedId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 140);
    return () => window.clearTimeout(timer);
  }, [requestedSeedId, visibleDraftViews]);

  useEffect(() => {
    if (
      loading ||
      (!pickedPlaceIdFromSearch &&
        !composerRequestedFromSearch &&
        !plantingRequestedFromSearch &&
        !preparationRequestedFromSearch)
    ) {
      return;
    }

    const placeExists = placeOptions.some((place) => place.id === pickedPlaceIdFromSearch);
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("picked_place_id");
    params.delete("composer");
    params.delete("planting");
    params.delete("preparation");
    const nextQuery = params.toString();

    if (preparationRequestedFromSearch && requestedSeedId && draftViewBySeedId.has(requestedSeedId)) {
      setShowComposer(false);
      setShowPlantingModeModal(false);
      setEditingPreparationSeedId(requestedSeedId);
    } else if (plantingRequestedFromSearch) {
      setShowComposer(false);
      setShowPlantingModeModal(true);
    } else {
      setShowComposer(true);
    }

    if (pickedPlaceIdFromSearch && placeExists) {
      setSelectedPlaceId(pickedPlaceIdFromSearch);
      setMsg("Lugar vinculado desde el mapa.");
    } else if (pickedPlaceIdFromSearch) {
      setMsg("No se pudo recuperar el lugar elegido desde el mapa.");
    }

    router.replace(
      nextQuery ? `${getProductSurfaceHref("plans")}?${nextQuery}` : getProductSurfaceHref("plans"),
      { scroll: false },
    );
  }, [
    composerRequestedFromSearch,
    draftViewBySeedId,
    loading,
    pickedPlaceIdFromSearch,
    placeOptions,
    preparationRequestedFromSearch,
    plantingRequestedFromSearch,
    router,
    requestedSeedId,
    searchParams,
    setMsg,
  ]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!showComposer && !showPlantingModeModal && !editingPreparationSeedId) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [editingPreparationSeedId, showComposer, showPlantingModeModal]);

  const selectedPlanType = useMemo(
    () => planTypeOptions.find((option) => option.id === selectedPlanTypeId) ?? null,
    [planTypeOptions, selectedPlanTypeId],
  );

  useEffect(() => {
    if (!editingPreparationSeedId) return;
    if (draftViewBySeedId.has(editingPreparationSeedId)) return;
    setEditingPreparationSeedId(null);
  }, [draftViewBySeedId, editingPreparationSeedId]);

  const { createSeed, scheduleSeed, unscheduleSeed, waterSeed } = usePlansSeedActions({
    cfg,
    myProfileId,
    myRole,
    activeGardenId,
    companionReferenceLabel: companionReference,
    setMsg,
    refreshAll,
    onOpenPage: (pageId, options) => {
      const href = getPageDetailHref(pageId);
      if (options?.ritual === "flower_birth") {
        router.push(`${href}?ritual=flower_birth`);
        return;
      }
      router.push(href);
    },
  });

  const {
    createPreparationDraft,
    savePreparationDraft,
    addPreparationChecklistItem,
    togglePreparationChecklistItem,
    deletePreparationChecklistItem,
    plantPreparationDraft,
  } = usePlansPreparationActions({
    cfg,
    myProfileId,
    activeGardenId,
    setMsg,
    refreshAll,
  });

  const activePreparationView = editingPreparationSeedId
    ? draftViewBySeedId.get(editingPreparationSeedId) ?? null
    : null;
  const activePreparationChecklistItems = useMemo(
    () =>
      editingPreparationSeedId
        ? preparationChecklistItems.filter((item) => item.seed_id === editingPreparationSeedId)
        : [],
    [editingPreparationSeedId, preparationChecklistItems],
  );
  const activePreparationStops = useMemo(
    () =>
      editingPreparationSeedId
        ? preparationStops.filter((item) => item.seed_id === editingPreparationSeedId)
        : [],
    [editingPreparationSeedId, preparationStops],
  );
  const activePreparationTransportLegs = useMemo(
    () =>
      editingPreparationSeedId
        ? preparationTransportLegs.filter((item) => item.seed_id === editingPreparationSeedId)
        : [],
    [editingPreparationSeedId, preparationTransportLegs],
  );
  const activePreparationStays = useMemo(
    () =>
      editingPreparationSeedId
        ? preparationStays.filter((item) => item.seed_id === editingPreparationSeedId)
        : [],
    [editingPreparationSeedId, preparationStays],
  );
  const activePreparationPlaceLinks = useMemo(
    () =>
      editingPreparationSeedId
        ? preparationPlaceLinks.filter((item) => item.seed_id === editingPreparationSeedId)
        : [],
    [editingPreparationSeedId, preparationPlaceLinks],
  );
  const activePreparationItineraryItems = useMemo(
    () =>
      editingPreparationSeedId
        ? preparationItineraryItems.filter((item) => item.seed_id === editingPreparationSeedId)
        : [],
    [editingPreparationSeedId, preparationItineraryItems],
  );
  const activePreparationReservations = useMemo(
    () =>
      editingPreparationSeedId
        ? preparationReservations.filter((item) => item.seed_id === editingPreparationSeedId)
        : [],
    [editingPreparationSeedId, preparationReservations],
  );
  const activePreparationAttachments = useMemo(
    () =>
      editingPreparationSeedId
        ? preparationAttachments.filter((item) => item.seed_id === editingPreparationSeedId)
        : [],
    [editingPreparationSeedId, preparationAttachments],
  );

  function openPendingFlowerBirth(pageId: string) {
    router.push(`${getPageDetailHref(pageId)}?ritual=flower_birth`);
  }

  async function handleCreateSeed() {
    setMsg(null);

    setCreatingSeed(true);
    try {
      const ok = await createSeed({
        title,
        notes,
        element: selectedPlanType?.suggestedElement ?? cfg.defaults.fallbackElement,
        scheduledDate: scheduledDate || null,
        planTypeId: selectedPlanType?.id ?? null,
        mapPlaceId: selectedPlaceId || null,
        mapRouteId: null,
      });
      if (!ok) return;
      try { sessionStorage.removeItem("seed_composer_draft"); } catch { /* ignore */ }
      setTitle("");
      setNotes("");
      setScheduledDate("");
      setSelectedPlanTypeId("");
      setSelectedPlaceId("");
      setShowComposer(false);
      setAgendaFocus(scheduledDate ? "upcoming" : "ideas");
    } finally {
      setCreatingSeed(false);
    }
  }

  async function handleCreatePreparationSeed() {
    setCreatingPreparationDraft(true);
    try {
      if (reusableEmptyPreparationDraftView) {
        setShowPlantingModeModal(false);
        setEditingPreparationSeedId(reusableEmptyPreparationDraftView.seed.id);
        setMsg("Ya habia un borrador vacio. Seguimos en ese para no duplicarlo.");
        return;
      }

      const seed = await createPreparationDraft();
      if (!seed) return;
      setShowPlantingModeModal(false);
      setEditingPreparationSeedId(seed.id);
    } finally {
      setCreatingPreparationDraft(false);
    }
  }

  function openPreparationDraft(seedId: string) {
    setOpeningPreparationSeedId(seedId);
    setEditingPreparationSeedId(seedId);
    window.setTimeout(() => {
      setOpeningPreparationSeedId((current) => (current === seedId ? null : current));
    }, 0);
  }

  async function handleReloadPreparationRemoteChanges() {
    if (!editingPreparationSeedId) return;
    try {
      await refreshAll();
      setMsg("Ya tienes cargada la version mas reciente del dossier compartido.");
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "No se pudieron recargar los cambios remotos.");
    }
  }

  async function handleSavePreparation(payload: SeedPreparationEditorSubmitPayload) {
    if (!activePreparationView) return false;
    const selectedPlanTypeForDraft = payload.planTypeId
      ? planTypeOptions.find((option) => option.id === payload.planTypeId) ?? null
      : null;

    setSavingPreparation(true);
    try {
      const saved = await savePreparationDraft({
        seedId: activePreparationView.seed.id,
        title: payload.title,
        notes: payload.notes,
        element:
          selectedPlanTypeForDraft?.suggestedElement ??
          activePreparationView.seed.element ??
          cfg.defaults.fallbackElement,
        planTypeId: payload.planTypeId,
        collaborationMode: payload.collaborationMode,
        summary: payload.summary,
        destinationLabel: payload.destinationLabel,
        destinationKind: payload.destinationKind,
        dateMode: payload.dateMode,
        startsOn: payload.startsOn,
        endsOn: payload.endsOn,
        budgetAmount: payload.budgetAmount,
        budgetCurrency: payload.budgetCurrency,
        budgetNotes: payload.budgetNotes,
        goalTags: payload.goalTags,
        sharedIntention: payload.sharedIntention,
        whyThisTrip: payload.whyThisTrip,
        climateContext: payload.climateContext,
        primaryMapPlaceId: payload.primaryMapPlaceId,
        primaryMapRouteId: payload.primaryMapRouteId,
        enabledBlocks: payload.enabledBlocks,
        preparationProgress: payload.preparationProgress,
        stops: payload.stops,
        transportLegs: payload.transportLegs,
        stays: payload.stays,
        placeLinks: payload.placeLinks,
        itineraryItems: payload.itineraryItems,
        reservations: payload.reservations,
        attachments: payload.attachments,
      });
      return saved;
    } finally {
      setSavingPreparation(false);
    }
  }

  async function handleSaveAndPlantPreparation(payload: SeedPreparationEditorSubmitPayload) {
    if (!activePreparationView) return;

    const saved = await handleSavePreparation(payload);
    if (!saved) return;

    setPlantingPreparationSeedId(activePreparationView.seed.id);
    try {
      const planted = await plantPreparationDraft({
        seed: activePreparationView.seed,
        profile: {
          date_mode: payload.dateMode,
          starts_on: payload.startsOn,
        },
      });
      if (!planted) return;
      setEditingPreparationSeedId(null);
      setAgendaFocus(payload.startsOn ? "upcoming" : "ideas");
    } finally {
      setPlantingPreparationSeedId((current) =>
        current === activePreparationView.seed.id ? null : current,
      );
    }
  }

  async function handlePlantPreparationFromPanel(seedId: string) {
    const view = draftViewBySeedId.get(seedId);
    if (!view) return;

    setPlantingPreparationSeedId(seedId);
    try {
      const planted = await plantPreparationDraft({
        seed: view.seed,
        profile: view.profile
          ? {
              date_mode: view.profile.date_mode,
              starts_on: view.profile.starts_on,
            }
          : null,
      });
      if (!planted) return;
      setAgendaFocus(view.profile?.starts_on ? "upcoming" : "ideas");
      if (editingPreparationSeedId === seedId) {
        setEditingPreparationSeedId(null);
      }
    } finally {
      setPlantingPreparationSeedId((current) => (current === seedId ? null : current));
    }
  }

  async function handleAddPreparationChecklistItem(input: {
    label: string;
    category: "documents" | "health" | "clothes" | "tech" | "money" | "insurance" | "misc";
    owner: "me" | "partner" | "shared";
    isRequired: boolean;
  }) {
    if (!activePreparationView) return;
    await addPreparationChecklistItem({
      seedId: activePreparationView.seed.id,
      label: input.label,
      category: input.category,
      owner: input.owner,
      isRequired: input.isRequired,
    });
  }

  function handleAgendaChipChange(nextFocus: PlansAgendaFocus) {
    const normalizedFocus = nextFocus === "waiting" ? "action" : nextFocus;
    setAgendaFocus(normalizedFocus);
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("tab");
    params.delete("composer");
    params.delete("picked_place_id");
    if (normalizedFocus === "all") {
      params.delete("focus");
    } else {
      params.set("focus", normalizedFocus);
    }
    const nextQuery = params.toString();
    router.replace(
      nextQuery ? `${getProductSurfaceHref("plans")}?${nextQuery}` : getProductSurfaceHref("plans"),
      { scroll: false },
    );
  }

  function openDeleteSeedModal(item: PlansSeedView) {
    setMsg(null);
    setPendingDeleteSeed(item.seed);
  }

  async function confirmDeleteSeed() {
    const seed = pendingDeleteSeed;
    if (!seed) return;

    setPendingDeleteSeed(null);
    setMsg(null);
    setDeletingSeedId(seed.id);

    try {
      if (seed.bloomed_page_id) {
        const pageQuery = withGardenScope(
          supabase
            .from("pages")
            .update({ planned_from_seed_id: null })
            .eq("id", seed.bloomed_page_id)
            .eq("planned_from_seed_id", seed.id),
          activeGardenId,
        );
        await pageQuery;
      }

      const deleteQuery = withGardenScope(
        supabase.from("seeds").delete().eq("id", seed.id),
        activeGardenId,
      );
      const { error } = await deleteQuery;
      if (error) throw error;

      setMsg("Semilla desplantada.");
      await refreshAll();
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "No se pudo desplantar la semilla.");
    } finally {
      setDeletingSeedId((current) => (current === seed.id ? null : current));
    }
  }

  async function handleSaveSeedDate(item: PlansSeedView, nextDateOverride?: string) {
    const nextDate = String(nextDateOverride ?? scheduleDrafts[item.seed.id] ?? "").trim();
    if (!nextDate) {
      setMsg("Selecciona una fecha antes de guardarla en agenda.");
      return;
    }
    await scheduleSeed(item.seed, nextDate);
  }

  async function handleShareSeedToChat(item: PlansSeedView) {
    const gardenId = String(activeGardenId ?? "").trim();
    const profileId = String(myProfileId ?? "").trim();
    if (!gardenId || !profileId) {
      setMsg("Necesitamos jardin activo y sesion valida para compartir este plan en el chat.");
      return;
    }

    setSharingSeedId(item.seed.id);
    setMsg(null);
    try {
      await sendGardenChatReferenceMessage({
        gardenId,
        authorUserId: profileId,
        reference: buildGardenChatPlanReference(item),
      });
      setMsg(`"${item.seed.title}" ya esta compartido en el chat.`);
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "No se pudo compartir el plan en el chat.");
    } finally {
      setSharingSeedId((current) => (current === item.seed.id ? null : current));
    }
  }

  if (loading) {
    return <PageLoadingState message="Cargando agenda viva..." />;
  }

  return (
    <div className="lv-page p-6">
      <div className="lv-shell max-w-5xl space-y-5">
        <section className="lv-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">Planes</h1>
              <p className="text-sm text-[var(--lv-text-muted)]">{PLANS_SURFACE.summary}</p>
              <p className="text-sm text-[var(--lv-text-muted)]">
                La fecha solo prepara la semilla. La flor nace cuando ambas personas la riegan.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <ActiveGardenSwitcher
                compact
                onChanged={(gardenId) => {
                  setActiveGardenId(gardenId);
                  void refreshAll(gardenId);
                }}
              />
              <button
                type="button"
                className="lv-btn lv-btn-secondary"
                onClick={() => router.push(getProductSurfaceHref("home"))}
              >
                Volver
              </button>
            </div>
          </div>

          {msg ? <StatusNotice message={msg} className="mt-4" /> : null}
        </section>

        <section className="lv-card p-5">
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Agenda viva</h2>
                <p className="text-sm text-[var(--lv-text-muted)]">
                  Crea semillas, colócalas en agenda y riega juntas lo que ya habéis vivido.
                </p>
              </div>

              <button
                type="button"
                data-testid="plans-new-seed"
                data-plans-tour="new-seed"
                className="lv-btn lv-btn-secondary"
                onClick={() => setShowPlantingModeModal(true)}
              >
                Nueva semilla
              </button>
            </div>

            <div className="space-y-3">
              <input
                className="lv-input"
                placeholder="Buscar semilla por título, nota, tipo, lugar o fecha"
                value={planQuery}
                onChange={(event) => setPlanQuery(event.target.value)}
              />

              <div className="rounded-[22px] border border-[var(--lv-border)] bg-white/80 p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-sm text-[var(--lv-text-muted)]">
                    Filtra toda la agenda por tipo de plan para localizar antes una semilla concreta.
                  </div>
                  <div className="relative ml-auto w-full min-w-[260px] flex-1 sm:max-w-[360px]">
                    <button
                      type="button"
                      className="lv-btn lv-btn-secondary w-full justify-between"
                      onClick={() => setIdeasPlanTypeFilterOpen((current) => !current)}
                      aria-expanded={ideasPlanTypeFilterOpen}
                    >
                      <span className="truncate">{selectedIdeaPlanTypeFilterLabel}</span>
                      <span className="text-xs text-[var(--lv-text-muted)]">
                        {ideaPlanTypeFilterOptions.length}
                      </span>
                    </button>

                    {ideasPlanTypeFilterOpen ? (
                      <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-full rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-3 shadow-[var(--lv-shadow-md)]">
                        <input
                          className="lv-input"
                          placeholder="Buscar tipo de plan"
                          value={ideasPlanTypeFilterQuery}
                          onChange={(event) => setIdeasPlanTypeFilterQuery(event.target.value)}
                        />
                        <div className="mt-3 flex flex-wrap gap-2">
                          <FilterPill
                            active={ideasPlanTypeFilterId === "__all__"}
                            onClick={() => {
                              setIdeasPlanTypeFilterId("__all__");
                              setIdeasPlanTypeFilterOpen(false);
                              setIdeasPlanTypeFilterQuery("");
                            }}
                          >
                            Todos los tipos
                          </FilterPill>
                        </div>
                        <div className="mt-3 max-h-[280px] space-y-2 overflow-auto pr-1">
                          {filteredIdeaPlanTypeOptions.length ? (
                            filteredIdeaPlanTypeOptions.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                className={`w-full rounded-[18px] border px-3 py-2 text-left text-sm transition ${
                                  ideasPlanTypeFilterId === option.value
                                    ? "border-[#86b49d] bg-[#eef6ea] text-[#2f5137]"
                                    : "border-[var(--lv-border)] bg-white text-[var(--lv-text)]"
                                }`}
                                onClick={() => {
                                  setIdeasPlanTypeFilterId(option.value);
                                  setIdeasPlanTypeFilterOpen(false);
                                  setIdeasPlanTypeFilterQuery("");
                                }}
                              >
                                {option.label}
                              </button>
                            ))
                          ) : (
                            <div className="rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-3 py-3 text-sm text-[var(--lv-text-muted)]">
                              No hay tipos que coincidan con esa busqueda.
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div data-plans-tour="agenda-filters" className="flex flex-wrap gap-2">
                {([
                  ["all", "Todo", agendaCounts.all],
                  ["action", "Ahora", agendaCounts.action],
                  ["upcoming", "Programadas", agendaCounts.upcoming],
                  ["ideas", "Ideas", agendaCounts.ideas],
                ] as const).map(([value, label, count]) => {
                  const active = activeAgendaChip === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                        active
                          ? "border-[#86b49d] bg-[#eef6ea] text-[#2f5137]"
                          : "bg-white text-[#5b6758]"
                      }`}
                      onClick={() => handleAgendaChipChange(value)}
                      aria-pressed={active}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span>{label}</span>
                        <span className="rounded-full bg-[#edf3ea] px-2 py-0.5 text-[11px] text-[#47604b]">
                          {count}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

            </div>

            <PlansPendingFlowerBirthPanel
              entries={pendingFlowerBirths}
              onOpenPage={openPendingFlowerBirth}
            />

            <PlansPreparationPanel
              items={visibleDraftViews}
              openingSeedId={openingPreparationSeedId}
              plantingSeedId={plantingPreparationSeedId}
              deletingSeedId={deletingSeedId}
              onOpen={openPreparationDraft}
              onPlant={(seedId) => {
                void handlePlantPreparationFromPanel(seedId);
              }}
              onDelete={(seedId) => {
                const seed = draftViewBySeedId.get(seedId)?.seed ?? null;
                if (!seed) return;
                setPendingDeleteSeed(seed);
              }}
            />

            <PlansAgendaPanel
              visibleSections={visibleAgendaSections}
              scheduleDrafts={scheduleDrafts}
              deletingSeedId={deletingSeedId}
              sharingSeedId={sharingSeedId}
              highlightedSeedId={requestedSeedId || null}
              shareRecipientLabel={companionLabel}
              companionReferenceLabel={companionReference}
              emptyMessage="No hay semillas en este bloque. Ajusta la búsqueda o cambia de vista."
              focusNote={agendaFocusNote}
              onScheduleDraftChange={(seedId, value) =>
                setScheduleDrafts((prev) => ({
                  ...prev,
                  [seedId]: value,
                }))
              }
              onSaveDate={(item, nextDate) => {
                void handleSaveSeedDate(item, nextDate);
              }}
              onUnscheduleSeed={(item) => {
                void unscheduleSeed(item.seed);
              }}
              onWaterSeed={(item) => {
                void waterSeed({
                  seed: item.seed,
                  requiredParticipants: item.wateringSummary.requiredParticipants,
                });
              }}
              onDeleteSeed={openDeleteSeedModal}
              onShareSeedToChat={handleShareSeedToChat}
            />
          </div>
        </section>
      </div>

      <ConfirmModal
        open={pendingDeleteSeed !== null}
        title="Desplantar semilla"
        description="Esta acción eliminará la semilla del jardín. Si ya tenía una flor enlazada, esa página se conservará aparte."
        confirmLabel="Si, desplantar"
        tone="danger"
        busy={Boolean(deletingSeedId)}
        onConfirm={() => void confirmDeleteSeed()}
        onCancel={() => {
          if (deletingSeedId) return;
          setPendingDeleteSeed(null);
        }}
      />

      <SeedPlantingModeModal
        open={showPlantingModeModal}
        busy={creatingPreparationDraft}
        onCancel={() => setShowPlantingModeModal(false)}
        onQuick={() => {
          setShowPlantingModeModal(false);
          setShowComposer(true);
        }}
        onPrepare={() => {
          void handleCreatePreparationSeed();
        }}
      />

      <SeedPreparationEditorModal
        open={editingPreparationSeedId !== null && activePreparationView !== null}
        activeGardenId={activeGardenId}
        draftView={activePreparationView}
        myProfileId={myProfileId || null}
        myProfileName={myProfileName || null}
        checklistItems={activePreparationChecklistItems}
        stops={activePreparationStops}
        transportLegs={activePreparationTransportLegs}
        stays={activePreparationStays}
        placeLinks={activePreparationPlaceLinks}
        itineraryItems={activePreparationItineraryItems}
        reservations={activePreparationReservations}
        attachments={activePreparationAttachments}
        planTypeOptions={planTypeOptions}
        placeOptions={placeOptions}
        routeOptions={routeOptions}
        busy={savingPreparation}
        planting={Boolean(
          activePreparationView && plantingPreparationSeedId === activePreparationView.seed.id,
        )}
        onClose={() => {
          setEditingPreparationSeedId(null);
        }}
        onReloadRemoteChanges={handleReloadPreparationRemoteChanges}
        onSave={handleSavePreparation}
        onSaveAndPlant={handleSaveAndPlantPreparation}
        onAddChecklistItem={(input) => {
          void handleAddPreparationChecklistItem(input);
        }}
        onToggleChecklistItem={(item, completed) => {
          void togglePreparationChecklistItem(item, completed);
        }}
        onDeleteChecklistItem={(itemId) => {
          void deletePreparationChecklistItem(itemId);
        }}
      />

      <PlansFirstWalkthrough
        open={showPlansWalkthrough}
        steps={plansFirstWalkSteps}
        onDismiss={closePlansWalkthrough}
        onComplete={closePlansWalkthrough}
      />

      {showComposer ? (
        <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-[rgba(20,28,23,0.34)] px-4 py-6 backdrop-blur-[2px] sm:px-6 sm:py-10">
          <div className="w-full max-w-[1120px] rounded-[30px] border border-white/84 bg-[#f8fbf7] p-3 shadow-[0_24px_60px_rgba(15,23,42,0.18)] sm:p-5">
            <div className="flex flex-wrap items-start justify-end gap-3">
              <button
                type="button"
                className="lv-btn lv-btn-secondary"
                onClick={() => setShowComposer(false)}
                disabled={creatingSeed}
              >
                Cerrar
              </button>
            </div>

            {msg ? <StatusNotice message={msg} className="mt-4" /> : null}

            <div className="mt-2">
              <PlansComposerPanel
                title={title}
                notes={notes}
                scheduledDate={scheduledDate}
                selectedPlanTypeId={selectedPlanTypeId}
                selectedPlaceId={selectedPlaceId}
                selectedPlaceLabel={selectedPlaceId ? placeLabel.get(selectedPlaceId) ?? null : null}
                planTypeOptions={planTypeOptions}
                placeOptions={placeOptions}
                creating={creatingSeed}
                onTitleChange={setTitle}
                onNotesChange={setNotes}
                onScheduledDateChange={setScheduledDate}
                onSelectedPlanTypeIdChange={setSelectedPlanTypeId}
                onClearSelectedPlace={() => setSelectedPlaceId("")}
                onOpenMap={() => {
                  try {
                    sessionStorage.setItem(
                      "seed_composer_draft",
                      JSON.stringify({ title, notes, scheduledDate, selectedPlanTypeId }),
                    );
                  } catch {
                    /* storage full or unavailable – proceed anyway */
                  }
                  const returnParams = new URLSearchParams();
                  if (activeAgendaChip !== "all") returnParams.set("focus", activeAgendaChip);
                  returnParams.set("composer", "1");
                  const returnTo = returnParams.toString()
                    ? `${getProductSurfaceHref("plans")}?${returnParams.toString()}`
                    : getProductSurfaceHref("plans");
                  router.push(
                    `${getProductSurfaceHref("home")}?immersive=map&pick=seed_place&return_to=${encodeURIComponent(
                      returnTo,
                    )}`,
                  );
                }}
                onCreateSeed={() => void handleCreateSeed()}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function PlansPage() {
  return (
    <Suspense fallback={<PageLoadingState message="Cargando agenda viva..." />}>
      <PlansPageContent />
    </Suspense>
  );
}
