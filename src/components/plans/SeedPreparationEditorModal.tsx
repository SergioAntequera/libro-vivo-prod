"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  computePreparationProgress,
  normalizePreparationCollaborationMode,
  parseGoalTags,
  resolveEnabledPreparationBlocks,
  resolvePreparationReadyToPlant,
  type SeedPreparationDraftView,
} from "@/lib/seedPreparation";
import type { SeedPlaceOption, SeedPlanTypeOption, SeedRouteOption } from "@/lib/plansTypes";
import type {
  SeedPreparationAttachment,
  SeedPreparationBlockId,
  SeedPreparationChecklistCategory,
  SeedPreparationChecklistItem,
  SeedPreparationChecklistOwner,
  SeedPreparationCollaborationMode,
  SeedPreparationDestinationKind,
  SeedPreparationItineraryItem,
  SeedPreparationPlaceLink,
  SeedPreparationReservation,
  SeedPreparationStay,
  SeedPreparationStop,
  SeedPreparationTransportLeg,
} from "@/lib/seedPreparationTypes";
import {
  createEmptyPreparationAttachment,
  createEmptyPreparationItineraryItem,
  createEmptyPreparationPlaceLink,
  createEmptyPreparationReservation,
  createEmptyPreparationStay,
  createEmptyPreparationStop,
  createEmptyPreparationTransportLeg,
} from "@/lib/seedPreparationFactories";
import {
  buildSeedPreparationFocusLabel,
  didRemoteChangeActivePreparationTarget,
  mergeSeedPreparationLiveSnapshot,
  serializeSeedPreparationLiveSnapshot,
  type SeedPreparationLiveSnapshot,
  type SeedPreparationLiveTarget,
} from "@/lib/seedPreparationRealtime";
import { uploadSeedPreparationAttachment } from "@/lib/uploadSeedPreparationAttachment";
import { SeedPreparationAttachmentsSection } from "@/components/plans/preparation/SeedPreparationAttachmentsSection";
import { SeedPreparationChecklistSection } from "@/components/plans/preparation/SeedPreparationChecklistSection";
import { SeedPreparationCollaborationPanel } from "@/components/plans/SeedPreparationCollaborationPanel";
import { SeedPreparationItinerarySection } from "@/components/plans/preparation/SeedPreparationItinerarySection";
import { SeedPreparationPlacesSection } from "@/components/plans/preparation/SeedPreparationPlacesSection";
import { SeedPreparationReservationsSection } from "@/components/plans/preparation/SeedPreparationReservationsSection";
import { SeedPreparationStopsSection } from "@/components/plans/preparation/SeedPreparationStopsSection";
import { SeedPreparationStaysSection } from "@/components/plans/preparation/SeedPreparationStaysSection";
import { SeedPreparationTransportSection } from "@/components/plans/preparation/SeedPreparationTransportSection";
import { SeedPreparationTripBriefSection } from "@/components/plans/preparation/SeedPreparationTripBriefSection";
import { useSeedPreparationCollaborationChannel } from "@/components/plans/useSeedPreparationCollaborationChannel";

export type SeedPreparationEditorSubmitPayload = {
  title: string;
  notes: string;
  planTypeId: string | null;
  collaborationMode: SeedPreparationCollaborationMode;
  summary: string;
  destinationLabel: string;
  destinationKind: SeedPreparationDestinationKind | null;
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
  primaryMapRouteId: string | null;
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

type SeedPreparationEditorModalProps = {
  open: boolean;
  activeGardenId: string | null;
  draftView: SeedPreparationDraftView | null;
  checklistItems: SeedPreparationChecklistItem[];
  stops: SeedPreparationStop[];
  transportLegs: SeedPreparationTransportLeg[];
  stays: SeedPreparationStay[];
  placeLinks: SeedPreparationPlaceLink[];
  itineraryItems: SeedPreparationItineraryItem[];
  reservations: SeedPreparationReservation[];
  attachments: SeedPreparationAttachment[];
  planTypeOptions: SeedPlanTypeOption[];
  placeOptions: SeedPlaceOption[];
  routeOptions: SeedRouteOption[];
  busy?: boolean;
  planting?: boolean;
  myProfileId?: string | null;
  myProfileName?: string | null;
  onClose: () => void;
  onSave: (payload: SeedPreparationEditorSubmitPayload) => Promise<boolean>;
  onSaveAndPlant: (payload: SeedPreparationEditorSubmitPayload) => Promise<void>;
  onReloadRemoteChanges?: (() => Promise<void>) | null;
  onAddChecklistItem: (input: {
    label: string;
    category: SeedPreparationChecklistCategory;
    owner: SeedPreparationChecklistOwner;
    isRequired: boolean;
  }) => void;
  onToggleChecklistItem: (item: SeedPreparationChecklistItem, completed: boolean) => void;
  onDeleteChecklistItem: (itemId: string) => void;
};

function parseBudgetAmount(value: string) {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function cloneItems<T extends { order_index: number }>(items: T[]) {
  return [...items].sort((left, right) => left.order_index - right.order_index).map((item) => ({
    ...item,
  }));
}

function buildHydrationFingerprint(input: {
  draftView: SeedPreparationDraftView;
  attachments: SeedPreparationAttachment[];
  itineraryItems: SeedPreparationItineraryItem[];
  placeLinks: SeedPreparationPlaceLink[];
  reservations: SeedPreparationReservation[];
  stays: SeedPreparationStay[];
  stops: SeedPreparationStop[];
  transportLegs: SeedPreparationTransportLeg[];
}) {
  return JSON.stringify({
    seedId: input.draftView.seed.id,
    seedUpdatedAt: input.draftView.seed.created_at,
    profileUpdatedAt: input.draftView.profile?.updated_at ?? null,
    stops: input.stops.map((item) => [item.id, item.updated_at]),
    transportLegs: input.transportLegs.map((item) => [item.id, item.updated_at]),
    stays: input.stays.map((item) => [item.id, item.updated_at]),
    placeLinks: input.placeLinks.map((item) => [item.id, item.updated_at]),
    itineraryItems: input.itineraryItems.map((item) => [item.id, item.updated_at]),
    reservations: input.reservations.map((item) => [item.id, item.updated_at]),
    attachments: input.attachments.map((item) => [item.id, item.updated_at, item.file_url]),
  });
}

function updateCollectionItem<T extends { id: string }>(
  items: T[],
  itemId: string,
  patch: Partial<T>,
) {
  return items.map((item) => (item.id === itemId ? { ...item, ...patch } : item));
}

function removeCollectionItem<T extends { id: string }>(items: T[], itemId: string) {
  return items.filter((item) => item.id !== itemId);
}

function detachLinkedAttachments(
  items: SeedPreparationAttachment[],
  linkedKind: SeedPreparationAttachment["linked_kind"],
  linkedRecordId: string,
): SeedPreparationAttachment[] {
  return items.map((item) =>
    item.linked_kind === linkedKind && item.linked_record_id === linkedRecordId
      ? {
          ...item,
          linked_kind: "generic_document" as const,
          linked_record_id: null,
        }
      : item,
  );
}

function resolveAttachmentTitleFromFile(file: File) {
  return file.name.replace(/\.[^.]+$/, "");
}

function resolveReservationAttachmentKind(kind: SeedPreparationReservation["reservation_kind"]) {
  if (kind === "insurance") return "insurance";
  if (kind === "ticket") return "ticket";
  return "reservation";
}

export function SeedPreparationEditorModal({
  open,
  activeGardenId,
  draftView,
  checklistItems,
  stops,
  transportLegs,
  stays,
  placeLinks,
  itineraryItems,
  reservations,
  attachments,
  planTypeOptions,
  placeOptions,
  routeOptions,
  busy = false,
  planting = false,
  myProfileId = null,
  myProfileName = null,
  onClose,
  onSave,
  onSaveAndPlant,
  onReloadRemoteChanges = null,
  onAddChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
}: SeedPreparationEditorModalProps) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [summary, setSummary] = useState("");
  const [selectedPlanTypeId, setSelectedPlanTypeId] = useState("");
  const [collaborationMode, setCollaborationMode] =
    useState<SeedPreparationCollaborationMode>("solo_for_now");
  const [destinationLabel, setDestinationLabel] = useState("");
  const [destinationKind, setDestinationKind] = useState("");
  const [dateMode, setDateMode] = useState<"single_day" | "date_range" | "flexible">("single_day");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetCurrency, setBudgetCurrency] = useState("EUR");
  const [budgetNotes, setBudgetNotes] = useState("");
  const [goalTagsRaw, setGoalTagsRaw] = useState("");
  const [sharedIntention, setSharedIntention] = useState("");
  const [whyThisTrip, setWhyThisTrip] = useState("");
  const [climateContext, setClimateContext] = useState("");
  const [primaryMapPlaceId, setPrimaryMapPlaceId] = useState("");
  const [primaryMapRouteId, setPrimaryMapRouteId] = useState("");
  const [stopItems, setStopItems] = useState<SeedPreparationStop[]>([]);
  const [transportItems, setTransportItems] = useState<SeedPreparationTransportLeg[]>([]);
  const [stayItems, setStayItems] = useState<SeedPreparationStay[]>([]);
  const [placeLinkItems, setPlaceLinkItems] = useState<SeedPreparationPlaceLink[]>([]);
  const [itineraryEntryItems, setItineraryEntryItems] = useState<SeedPreparationItineraryItem[]>(
    [],
  );
  const [reservationItems, setReservationItems] = useState<SeedPreparationReservation[]>([]);
  const [attachmentItems, setAttachmentItems] = useState<SeedPreparationAttachment[]>([]);
  const [attachmentMessage, setAttachmentMessage] = useState<string | null>(null);
  const [collaborationNotice, setCollaborationNotice] = useState<string | null>(null);
  const [uploadingAttachmentIds, setUploadingAttachmentIds] = useState<string[]>([]);
  const [remoteSaveNotice, setRemoteSaveNotice] = useState<{
    actorName: string;
    savedAt: string;
  } | null>(null);
  const [reloadingRemoteChanges, setReloadingRemoteChanges] = useState(false);
  const [activeEditTarget, setActiveEditTarget] = useState<SeedPreparationLiveTarget | null>(null);
  const [sharedConflictTargetKey, setSharedConflictTargetKey] = useState<string | null>(null);
  const [hasDeferredRemoteSnapshot, setHasDeferredRemoteSnapshot] = useState(false);
  const hydratedDraftFingerprintRef = useRef<string | null>(null);
  const activeEditTargetRef = useRef<SeedPreparationLiveTarget | null>(null);
  const liveSnapshotRef = useRef<SeedPreparationLiveSnapshot | null>(null);

  const effectiveGardenId = draftView?.profile?.garden_id ?? activeGardenId ?? "";

  const applyLiveSnapshot = useCallback((snapshot: SeedPreparationLiveSnapshot) => {
    setTitle(snapshot.title);
    setNotes(snapshot.notes);
    setSummary(snapshot.summary);
    setSelectedPlanTypeId(snapshot.selectedPlanTypeId);
    setCollaborationMode(snapshot.collaborationMode);
    setDestinationLabel(snapshot.destinationLabel);
    setDestinationKind(snapshot.destinationKind);
    setDateMode(snapshot.dateMode);
    setStartsOn(snapshot.startsOn);
    setEndsOn(snapshot.endsOn);
    setBudgetAmount(snapshot.budgetAmount);
    setBudgetCurrency(snapshot.budgetCurrency);
    setBudgetNotes(snapshot.budgetNotes);
    setGoalTagsRaw(snapshot.goalTagsRaw);
    setSharedIntention(snapshot.sharedIntention);
    setWhyThisTrip(snapshot.whyThisTrip);
    setClimateContext(snapshot.climateContext);
    setPrimaryMapPlaceId(snapshot.primaryMapPlaceId);
    setPrimaryMapRouteId(snapshot.primaryMapRouteId);
    setStopItems(cloneItems(snapshot.stops));
    setTransportItems(cloneItems(snapshot.transportLegs));
    setStayItems(cloneItems(snapshot.stays));
    setPlaceLinkItems(cloneItems(snapshot.placeLinks));
    setItineraryEntryItems(cloneItems(snapshot.itineraryItems));
    setReservationItems(cloneItems(snapshot.reservations));
    setAttachmentItems(cloneItems(snapshot.attachments));
  }, []);

  const liveSnapshot = useMemo<SeedPreparationLiveSnapshot>(
    () => ({
      title,
      notes,
      summary,
      selectedPlanTypeId,
      collaborationMode,
      destinationLabel,
      destinationKind,
      dateMode,
      startsOn,
      endsOn,
      budgetAmount,
      budgetCurrency,
      budgetNotes,
      goalTagsRaw,
      sharedIntention,
      whyThisTrip,
      climateContext,
      primaryMapPlaceId,
      primaryMapRouteId,
      stops: stopItems,
      transportLegs: transportItems,
      stays: stayItems,
      placeLinks: placeLinkItems,
      itineraryItems: itineraryEntryItems,
      reservations: reservationItems,
      attachments: attachmentItems,
    }),
    [
      attachmentItems,
      budgetAmount,
      budgetCurrency,
      budgetNotes,
      climateContext,
      collaborationMode,
      dateMode,
      destinationKind,
      destinationLabel,
      endsOn,
      goalTagsRaw,
      itineraryEntryItems,
      notes,
      placeLinkItems,
      primaryMapPlaceId,
      primaryMapRouteId,
      reservationItems,
      selectedPlanTypeId,
      sharedIntention,
      startsOn,
      stayItems,
      stopItems,
      summary,
      title,
      transportItems,
      whyThisTrip,
    ],
  );

  const liveSnapshotVersion = useMemo(
    () => serializeSeedPreparationLiveSnapshot(liveSnapshot),
    [liveSnapshot],
  );

  useEffect(() => {
    liveSnapshotRef.current = liveSnapshot;
  }, [liveSnapshot]);

  const setFocusedSection = useCallback(
    (kind: SeedPreparationLiveTarget["kind"], label?: string) => {
      const nextLabel = label?.trim() || buildSeedPreparationFocusLabel(kind);
      setSharedConflictTargetKey((current) =>
        current === `${kind}:section` ? current : null,
      );
      setActiveEditTarget({
        key: `${kind}:section`,
        kind,
        label: nextLabel,
        rowId: null,
      });
    },
    [],
  );

  const setFocusedRow = useCallback(
    (kind: SeedPreparationLiveTarget["kind"], itemId: string, label: string) => {
      setSharedConflictTargetKey((current) =>
        current === `${kind}:${itemId}` ? current : null,
      );
      setActiveEditTarget({
        key: `${kind}:${itemId}`,
        kind,
        label,
        rowId: itemId,
      });
    },
    [],
  );

  const clearFocusedTarget = useCallback((targetKey?: string) => {
    setActiveEditTarget((current) => {
      if (!current) return null;
      if (targetKey && current.key !== targetKey) return current;
      return null;
    });
    if (targetKey) {
      setSharedConflictTargetKey((current) => (current === targetKey ? null : current));
    } else {
      setSharedConflictTargetKey(null);
    }
  }, []);

  const handleCollaborationModeChange = useCallback(
    (value: SeedPreparationCollaborationMode) => {
      flushSync(() => {
        setCollaborationMode(value);
      });
    },
    [],
  );

  useEffect(() => {
    activeEditTargetRef.current = activeEditTarget;
  }, [activeEditTarget]);

  useEffect(() => {
    if (!open || !draftView) {
      hydratedDraftFingerprintRef.current = null;
      setRemoteSaveNotice(null);
      setReloadingRemoteChanges(false);
      setSharedConflictTargetKey(null);
      setHasDeferredRemoteSnapshot(false);
      setActiveEditTarget(null);
      return;
    }
    const hydrationFingerprint = buildHydrationFingerprint({
      draftView,
      attachments,
      itineraryItems,
      placeLinks,
      reservations,
      stays,
      stops,
      transportLegs,
    });
    if (hydratedDraftFingerprintRef.current === hydrationFingerprint) return;
    hydratedDraftFingerprintRef.current = hydrationFingerprint;
    applyLiveSnapshot({
      title: draftView.seed.title ?? "",
      notes: draftView.seed.notes ?? "",
      summary: draftView.profile?.summary ?? "",
      selectedPlanTypeId: draftView.seed.plan_type_id ?? "",
      collaborationMode: normalizePreparationCollaborationMode(
        draftView.profile?.collaboration_mode,
      ),
      destinationLabel: draftView.profile?.destination_label ?? draftView.destinationLabel ?? "",
      destinationKind: draftView.profile?.destination_kind ?? "",
      dateMode:
        (draftView.profile?.date_mode as "single_day" | "date_range" | "flexible" | undefined) ??
        "single_day",
      startsOn: draftView.profile?.starts_on ?? "",
      endsOn: draftView.profile?.ends_on ?? "",
      budgetAmount:
        typeof draftView.profile?.budget_amount === "number"
          ? String(draftView.profile.budget_amount)
          : "",
      budgetCurrency: draftView.profile?.budget_currency ?? "EUR",
      budgetNotes: draftView.profile?.budget_notes ?? "",
      goalTagsRaw: (draftView.profile?.goal_tags ?? []).join(", "),
      sharedIntention: draftView.profile?.shared_intention ?? "",
      whyThisTrip: draftView.profile?.why_this_trip ?? "",
      climateContext: draftView.profile?.climate_context ?? "",
      primaryMapPlaceId:
        draftView.profile?.primary_map_place_id ?? draftView.seed.map_place_id ?? "",
      primaryMapRouteId:
        draftView.profile?.primary_map_route_id ?? draftView.seed.map_route_id ?? "",
      stops: cloneItems(stops),
      transportLegs: cloneItems(transportLegs),
      stays: cloneItems(stays),
      placeLinks: cloneItems(placeLinks),
      itineraryItems: cloneItems(itineraryItems),
      reservations: cloneItems(reservations),
      attachments: cloneItems(attachments),
    });
    setAttachmentMessage(null);
    setUploadingAttachmentIds([]);
    setRemoteSaveNotice(null);
    setReloadingRemoteChanges(false);
    setSharedConflictTargetKey(null);
    setHasDeferredRemoteSnapshot(false);
  }, [
    applyLiveSnapshot,
    attachments,
    draftView,
    itineraryItems,
    open,
    placeLinks,
    reservations,
    stays,
    stops,
    transportLegs,
  ]);

  const normalizedPayload = useMemo<SeedPreparationEditorSubmitPayload>(() => {
    const goalTags = parseGoalTags(goalTagsRaw);
    const parsedBudgetAmount = parseBudgetAmount(budgetAmount);
    const enabledBlocks = resolveEnabledPreparationBlocks({
      seedNotes: notes,
      summary,
      destinationLabel,
      startsOn,
      endsOn,
      dateMode,
      budgetAmount: parsedBudgetAmount,
      primaryMapPlaceId,
      primaryMapRouteId,
      goalTags,
      checklistCount: checklistItems.length,
      stopCount: stopItems.filter((item) => item.title.trim()).length,
      transportCount: transportItems.filter((item) => item.from_label || item.to_label || item.title).length,
      stayCount: stayItems.filter((item) => item.name.trim()).length,
      placeLinkCount: placeLinkItems.filter(
        (item) => item.map_place_id || String(item.manual_title ?? "").trim(),
      ).length,
      itineraryCount: itineraryEntryItems.filter((item) => item.title.trim()).length,
      reservationCount: reservationItems.filter((item) => item.title.trim()).length,
      attachmentCount: attachmentItems.filter(
        (item) => item.title.trim() && String(item.file_url ?? "").trim(),
      ).length,
      climateContext,
    });
    const preparationProgress = computePreparationProgress({
      seed: {
        title,
        plan_type_id: selectedPlanTypeId || null,
        scheduled_date: null,
      },
      profile: {
        summary,
        destination_label: destinationLabel,
        starts_on: startsOn,
        date_mode: dateMode,
        budget_amount: parsedBudgetAmount,
        primary_map_place_id: primaryMapPlaceId,
        enabled_blocks: enabledBlocks,
      },
      checklistItems,
    });

    return {
      title,
      notes,
      planTypeId: selectedPlanTypeId || null,
      collaborationMode,
      summary,
      destinationLabel,
      destinationKind: (destinationKind || null) as SeedPreparationDestinationKind | null,
      dateMode,
      startsOn: startsOn || null,
      endsOn: endsOn || null,
      budgetAmount: parsedBudgetAmount,
      budgetCurrency: budgetCurrency || null,
      budgetNotes,
      goalTags,
      sharedIntention,
      whyThisTrip,
      climateContext,
      primaryMapPlaceId: primaryMapPlaceId || null,
      primaryMapRouteId: primaryMapRouteId || null,
      enabledBlocks,
      preparationProgress,
      stops: stopItems,
      transportLegs: transportItems,
      stays: stayItems,
      placeLinks: placeLinkItems,
      itineraryItems: itineraryEntryItems,
      reservations: reservationItems,
      attachments: attachmentItems,
    };
  }, [
    attachmentItems,
    budgetAmount,
    budgetCurrency,
    budgetNotes,
    checklistItems,
    climateContext,
    collaborationMode,
    dateMode,
    destinationKind,
    destinationLabel,
    endsOn,
    goalTagsRaw,
    itineraryEntryItems,
    notes,
    placeLinkItems,
    primaryMapPlaceId,
    primaryMapRouteId,
    reservationItems,
    selectedPlanTypeId,
    sharedIntention,
    startsOn,
    stayItems,
    stopItems,
    summary,
    title,
    transportItems,
    whyThisTrip,
  ]);

  const sharedPreparationChannel = useSeedPreparationCollaborationChannel({
    activityLabel:
      activeEditTarget?.label?.trim() ? `Editando ${activeEditTarget.label.toLowerCase()}` : "Dentro del dossier",
    displayName: myProfileName || "Usuario",
    enabled: Boolean(
      open &&
        draftView &&
        activeGardenId &&
        myProfileId &&
        collaborationMode === "shared",
    ),
    focusKey: activeEditTarget?.key ?? null,
    focusLabel: activeEditTarget?.label ?? null,
    gardenId: activeGardenId,
    onRemoteSaved: ({ actorName, savedAt, seedId }) => {
      if (seedId !== draftView?.seed.id) return;
      setRemoteSaveNotice({ actorName, savedAt });
    },
    onRemoteSnapshot: (snapshot) => {
      const activeTarget = activeEditTargetRef.current;
      const currentSnapshot = liveSnapshotRef.current ?? liveSnapshot;
      const changedActiveTarget = didRemoteChangeActivePreparationTarget(
        currentSnapshot,
        snapshot,
        activeTarget,
      );
      const mergedSnapshot = mergeSeedPreparationLiveSnapshot(
        currentSnapshot,
        snapshot,
        activeTarget,
      );
      applyLiveSnapshot(mergedSnapshot);

      if (activeTarget && changedActiveTarget) {
        setSharedConflictTargetKey(activeTarget.key);
        setHasDeferredRemoteSnapshot(true);
        setCollaborationNotice(
          `Hay cambios compartidos esperando en ${activeTarget.label.toLowerCase()}. Tu version local sigue delante mientras mantienes el foco.`,
        );
      } else {
        setSharedConflictTargetKey(null);
        setHasDeferredRemoteSnapshot(false);
        setCollaborationNotice(null);
      }
    },
    seedId: draftView?.seed.id ?? null,
    snapshot: collaborationMode === "shared" ? liveSnapshot : null,
    snapshotVersion: collaborationMode === "shared" ? liveSnapshotVersion : null,
    userId: myProfileId || null,
  });

  const readyToPlant = useMemo(
    () =>
      resolvePreparationReadyToPlant({
        seedTitle: normalizedPayload.title,
        planTypeId: normalizedPayload.planTypeId,
        startsOn: normalizedPayload.startsOn,
        dateMode: normalizedPayload.dateMode,
      }),
    [normalizedPayload],
  );

  const handleReloadRemoteChanges = useCallback(async () => {
    if (!onReloadRemoteChanges) return;
    setReloadingRemoteChanges(true);
    try {
      await onReloadRemoteChanges();
      setRemoteSaveNotice(null);
      setSharedConflictTargetKey(null);
      setHasDeferredRemoteSnapshot(false);
      setCollaborationNotice(null);
    } finally {
      setReloadingRemoteChanges(false);
    }
  }, [onReloadRemoteChanges]);

  const handleSaveClick = useCallback(async () => {
    const saved = await onSave(normalizedPayload);
    if (!saved) return;
    if (normalizedPayload.collaborationMode === "shared") {
      await sharedPreparationChannel.broadcastSaved();
    }
    setRemoteSaveNotice(null);
    setCollaborationNotice(null);
    setSharedConflictTargetKey(null);
    setHasDeferredRemoteSnapshot(false);
  }, [normalizedPayload, onSave, sharedPreparationChannel]);

  const handleSaveAndPlantClick = useCallback(async () => {
    await onSaveAndPlant(normalizedPayload);
  }, [normalizedPayload, onSaveAndPlant]);

  async function handleUploadAttachment(itemId: string, file: File) {
    if (!draftView) return;
    setAttachmentMessage(null);
    setUploadingAttachmentIds((current) => [...current, itemId]);
    try {
      const uploaded = await uploadSeedPreparationAttachment({
        seedId: draftView.seed.id,
        file,
      });
      setAttachmentItems((current) =>
        updateCollectionItem(current, itemId, {
          title:
            current.find((item) => item.id === itemId)?.title.trim() ||
            file.name.replace(/\.[^.]+$/, ""),
          file_name: uploaded.fileName,
          mime_type: uploaded.mimeType,
          storage_provider: uploaded.provider,
          file_url: uploaded.url,
        }),
      );
      setAttachmentMessage(`"${uploaded.fileName}" ya esta adjunto al borrador.`);
    } catch (error) {
      setAttachmentMessage(error instanceof Error ? error.message : "No se pudo subir el documento.");
    } finally {
      setUploadingAttachmentIds((current) => current.filter((value) => value !== itemId));
    }
  }

  async function handleCreateAndUploadAttachment(input: {
    linkedKind: SeedPreparationAttachment["linked_kind"];
    linkedRecordId: string;
    file: File;
    attachmentKind: SeedPreparationAttachment["attachment_kind"];
    title?: string | null;
  }) {
    if (!effectiveGardenId || !draftView) return;
    const draftItem = {
      ...createEmptyPreparationAttachment(
        draftView.seed.id,
        effectiveGardenId,
        attachmentItems.length,
      ),
      linked_kind: input.linkedKind,
      linked_record_id: input.linkedRecordId,
      attachment_kind: input.attachmentKind,
      title: String(input.title ?? "").trim() || resolveAttachmentTitleFromFile(input.file),
    } satisfies SeedPreparationAttachment;

    setAttachmentItems((current) => [...current, draftItem]);
    await handleUploadAttachment(draftItem.id, input.file);
  }

  if (!open || !draftView) return null;

  return (
    <div
      data-testid="seed-preparation-editor-modal"
      className="fixed inset-0 z-[130] flex items-start justify-center overflow-x-hidden overflow-y-auto bg-[rgba(20,28,23,0.38)] px-4 py-6 backdrop-blur-[2px] sm:px-6 sm:py-10"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy && !planting) onClose();
      }}
    >
      <div className="w-full min-w-0 max-w-[min(1240px,calc(100vw-2rem))] overflow-x-hidden rounded-[32px] border border-white/80 bg-[#f9fbf8] p-4 shadow-[0_28px_80px_rgba(15,23,42,0.18)] sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
              Preparar antes de plantar
            </div>
            <h2 className="break-words text-2xl font-semibold text-[var(--lv-text)]">
              {draftView.seed.title.trim() || "Plan por preparar"}
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-[var(--lv-text-muted)]">
              Este borrador todavia no vive en la agenda. Aqui ordenais el viaje como un cuaderno modular: destino, etapas, trayectos, reservas, documentos y preparativos antes de plantar la semilla real.
            </p>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="lv-badge bg-white">{normalizedPayload.preparationProgress}%</span>
            {readyToPlant ? (
              <span className="lv-badge bg-[#eef6ea] text-[#2f5137]">Lista para plantar</span>
            ) : (
              <span className="lv-badge bg-white text-[#6a746a]">Todavia le falta forma</span>
            )}
            <a
              href="/home?immersive=map"
              target="_blank"
              rel="noreferrer"
              className="lv-btn lv-btn-secondary"
            >
              Abrir mapa
            </a>
            <button
              type="button"
              className="lv-btn lv-btn-secondary"
              onClick={onClose}
              disabled={busy || planting}
            >
              Cerrar
            </button>
          </div>
        </div>

        {attachmentMessage ? (
          <div className="mt-4 rounded-[18px] border border-[var(--lv-border)] bg-white px-4 py-3 text-sm text-[var(--lv-text-muted)]">
            {attachmentMessage}
          </div>
        ) : null}

        {collaborationNotice ? (
          <div className="mt-4 rounded-[18px] border border-[#eadfca] bg-[#fffaf4] px-4 py-3 text-sm text-[#8a5a3d]">
            {collaborationNotice}
          </div>
        ) : null}

        <div className="mt-5 min-w-0 space-y-5">
          {collaborationMode === "shared" ? (
            <SeedPreparationCollaborationPanel
              connected={sharedPreparationChannel.connected}
              myProfileId={myProfileId}
              participants={sharedPreparationChannel.participants}
              remoteSaveNotice={remoteSaveNotice}
              reloading={reloadingRemoteChanges}
              onReloadRemoteChanges={onReloadRemoteChanges ? handleReloadRemoteChanges : null}
            />
          ) : null}

          <SeedPreparationTripBriefSection
            title={title}
            notes={notes}
            summary={summary}
            selectedPlanTypeId={selectedPlanTypeId}
            collaborationMode={collaborationMode}
            dateMode={dateMode}
            startsOn={startsOn}
            endsOn={endsOn}
            budgetAmount={budgetAmount}
            budgetCurrency={budgetCurrency}
            budgetNotes={budgetNotes}
            goalTagsRaw={goalTagsRaw}
            destinationLabel={destinationLabel}
            destinationKind={destinationKind}
            sharedIntention={sharedIntention}
            whyThisTrip={whyThisTrip}
            climateContext={climateContext}
            primaryMapPlaceId={primaryMapPlaceId}
            primaryMapRouteId={primaryMapRouteId}
            planTypeOptions={planTypeOptions}
            placeOptions={placeOptions}
            routeOptions={routeOptions}
            onBlurSection={() => clearFocusedTarget("trip_brief:section")}
            onTitleChange={setTitle}
            onNotesChange={setNotes}
            onSummaryChange={setSummary}
            onSelectedPlanTypeIdChange={setSelectedPlanTypeId}
            onCollaborationModeChange={handleCollaborationModeChange}
            onDateModeChange={setDateMode}
            onStartsOnChange={setStartsOn}
            onEndsOnChange={setEndsOn}
            onBudgetAmountChange={setBudgetAmount}
            onBudgetCurrencyChange={setBudgetCurrency}
            onBudgetNotesChange={setBudgetNotes}
            onGoalTagsRawChange={setGoalTagsRaw}
            onDestinationLabelChange={setDestinationLabel}
            onDestinationKindChange={setDestinationKind}
            onSharedIntentionChange={setSharedIntention}
            onWhyThisTripChange={setWhyThisTrip}
            onClimateContextChange={setClimateContext}
            onPrimaryMapPlaceIdChange={setPrimaryMapPlaceId}
            onPrimaryMapRouteIdChange={setPrimaryMapRouteId}
            onFocusSection={() => setFocusedSection("trip_brief", "Base del viaje")}
          />

          <div className="grid min-w-0 gap-5 xl:grid-cols-2">
            <SeedPreparationStopsSection
              items={stopItems}
              placeOptions={placeOptions}
              onAdd={() => {
                if (!effectiveGardenId) return;
                setStopItems((current) => [
                  ...current,
                  createEmptyPreparationStop(draftView.seed.id, effectiveGardenId, current.length),
                ]);
              }}
              onChange={(itemId, patch) =>
                setStopItems((current) => updateCollectionItem(current, itemId, patch))
              }
              onFocusItem={({ itemId, label }) => setFocusedRow("stops", itemId, label)}
              onBlurItem={(itemId) => clearFocusedTarget(`stops:${itemId}`)}
              onRemove={(itemId) =>
                setStopItems((current) => removeCollectionItem(current, itemId))
              }
            />

            <SeedPreparationTransportSection
              items={transportItems}
              attachmentItems={attachmentItems}
              placeOptions={placeOptions}
              routeOptions={routeOptions}
              stopOptions={stopItems}
              busy={busy}
              uploadingAttachmentIds={uploadingAttachmentIds}
              onAdd={() => {
                if (!effectiveGardenId) return;
                setTransportItems((current) => [
                  ...current,
                  createEmptyPreparationTransportLeg(
                    draftView.seed.id,
                    effectiveGardenId,
                    current.length,
                  ),
                ]);
              }}
              onChange={(itemId, patch) =>
                setTransportItems((current) => updateCollectionItem(current, itemId, patch))
              }
              onFocusItem={({ itemId, label }) => setFocusedRow("transport", itemId, label)}
              onBlurItem={(itemId) => clearFocusedTarget(`transport:${itemId}`)}
              onRemove={(itemId) =>
                {
                  setTransportItems((current) => removeCollectionItem(current, itemId));
                  setAttachmentItems((current) =>
                    detachLinkedAttachments(current, "transport_leg", itemId),
                  );
                }}
              onAttachDocument={async (itemId, file) =>
                handleCreateAndUploadAttachment({
                  linkedKind: "transport_leg",
                  linkedRecordId: itemId,
                  file,
                  attachmentKind: "ticket",
                })
              }
              onRemoveAttachment={(itemId) =>
                setAttachmentItems((current) => removeCollectionItem(current, itemId))
              }
            />
          </div>

          <div className="grid min-w-0 gap-5 xl:grid-cols-2">
            <SeedPreparationStaysSection
              items={stayItems}
              attachmentItems={attachmentItems}
              placeOptions={placeOptions}
              stopOptions={stopItems}
              busy={busy}
              uploadingAttachmentIds={uploadingAttachmentIds}
              onAdd={() => {
                if (!effectiveGardenId) return;
                setStayItems((current) => [
                  ...current,
                  createEmptyPreparationStay(draftView.seed.id, effectiveGardenId, current.length),
                ]);
              }}
              onChange={(itemId, patch) =>
                setStayItems((current) => updateCollectionItem(current, itemId, patch))
              }
              onFocusItem={({ itemId, label }) => setFocusedRow("stays", itemId, label)}
              onBlurItem={(itemId) => clearFocusedTarget(`stays:${itemId}`)}
              onRemove={(itemId) => {
                setStayItems((current) => removeCollectionItem(current, itemId));
                setAttachmentItems((current) => detachLinkedAttachments(current, "stay", itemId));
              }}
              onAttachDocument={async (itemId, file) =>
                handleCreateAndUploadAttachment({
                  linkedKind: "stay",
                  linkedRecordId: itemId,
                  file,
                  attachmentKind: "reservation",
                })
              }
              onRemoveAttachment={(itemId) =>
                setAttachmentItems((current) => removeCollectionItem(current, itemId))
              }
            />

            <SeedPreparationPlacesSection
              items={placeLinkItems}
              placeOptions={placeOptions}
              routeOptions={routeOptions}
              stopOptions={stopItems}
              transportLegs={transportItems}
              onAdd={() => {
                if (!effectiveGardenId) return;
                setPlaceLinkItems((current) => [
                  ...current,
                  createEmptyPreparationPlaceLink(
                    draftView.seed.id,
                    effectiveGardenId,
                    current.length,
                  ),
                ]);
              }}
              onChange={(itemId, patch) =>
                setPlaceLinkItems((current) => updateCollectionItem(current, itemId, patch))
              }
              onFocusItem={({ itemId, label }) => setFocusedRow("places", itemId, label)}
              onBlurItem={(itemId) => clearFocusedTarget(`places:${itemId}`)}
              onRemove={(itemId) =>
                setPlaceLinkItems((current) => removeCollectionItem(current, itemId))
              }
            />
          </div>

          <div className="grid min-w-0 gap-5 xl:grid-cols-2">
            <SeedPreparationItinerarySection
              items={itineraryEntryItems}
              placeOptions={placeOptions}
              routeOptions={routeOptions}
              stopOptions={stopItems}
              transportLegs={transportItems}
              onAdd={() => {
                if (!effectiveGardenId) return;
                setItineraryEntryItems((current) => [
                  ...current,
                  createEmptyPreparationItineraryItem(
                    draftView.seed.id,
                    effectiveGardenId,
                    current.length,
                  ),
                ]);
              }}
              onChange={(itemId, patch) =>
                setItineraryEntryItems((current) => updateCollectionItem(current, itemId, patch))
              }
              onFocusItem={({ itemId, label }) => setFocusedRow("itinerary", itemId, label)}
              onBlurItem={(itemId) => clearFocusedTarget(`itinerary:${itemId}`)}
              onRemove={(itemId) =>
                setItineraryEntryItems((current) => removeCollectionItem(current, itemId))
              }
            />

            <SeedPreparationReservationsSection
              items={reservationItems}
              attachmentItems={attachmentItems}
              placeOptions={placeOptions}
              stopOptions={stopItems}
              busy={busy}
              uploadingAttachmentIds={uploadingAttachmentIds}
              onAdd={() => {
                if (!effectiveGardenId) return;
                setReservationItems((current) => [
                  ...current,
                  createEmptyPreparationReservation(
                    draftView.seed.id,
                    effectiveGardenId,
                    current.length,
                  ),
                ]);
              }}
              onChange={(itemId, patch) =>
                setReservationItems((current) => updateCollectionItem(current, itemId, patch))
              }
              onFocusItem={({ itemId, label }) => setFocusedRow("reservations", itemId, label)}
              onBlurItem={(itemId) => clearFocusedTarget(`reservations:${itemId}`)}
              onRemove={(itemId) =>
                {
                  setReservationItems((current) => removeCollectionItem(current, itemId));
                  setAttachmentItems((current) =>
                    detachLinkedAttachments(current, "reservation", itemId),
                  );
                }}
              onAttachDocument={async (itemId, file) => {
                const reservation = reservationItems.find((item) => item.id === itemId);
                await handleCreateAndUploadAttachment({
                  linkedKind: "reservation",
                  linkedRecordId: itemId,
                  file,
                  attachmentKind: resolveReservationAttachmentKind(
                    reservation?.reservation_kind ?? "other",
                  ),
                  title: reservation?.title,
                });
              }}
              onRemoveAttachment={(itemId) =>
                setAttachmentItems((current) => removeCollectionItem(current, itemId))
              }
            />
          </div>

          <div className="grid min-w-0 gap-5 xl:grid-cols-2">
            <SeedPreparationAttachmentsSection
              items={attachmentItems}
              busy={busy}
              uploadingIds={uploadingAttachmentIds}
              onAdd={() => {
                if (!effectiveGardenId) return;
                setAttachmentItems((current) => [
                  ...current,
                  {
                    ...createEmptyPreparationAttachment(
                      draftView.seed.id,
                      effectiveGardenId,
                      current.length,
                    ),
                    linked_kind: "generic_document" as const,
                  },
                ]);
              }}
              onChange={(itemId, patch) =>
                setAttachmentItems((current) => updateCollectionItem(current, itemId, patch))
              }
              onFocusItem={({ itemId, label }) => setFocusedRow("attachments", itemId, label)}
              onBlurItem={(itemId) => clearFocusedTarget(`attachments:${itemId}`)}
              onRemove={(itemId) =>
                setAttachmentItems((current) => removeCollectionItem(current, itemId))
              }
              onUpload={handleUploadAttachment}
            />

            <SeedPreparationChecklistSection
              items={checklistItems}
              busy={busy}
              planting={planting}
              onFocusSection={() => setFocusedSection("checklist", "Checklist")}
              onBlurSection={() => clearFocusedTarget("checklist:section")}
              onAddItem={onAddChecklistItem}
              onToggleItem={onToggleChecklistItem}
              onDeleteItem={onDeleteChecklistItem}
            />
          </div>
        </div>

        <div className="lv-modal-actions mt-6">
          <button
            type="button"
            className="lv-btn lv-btn-secondary"
            onClick={onClose}
            disabled={busy || planting}
          >
            Cerrar
          </button>
          <button
            type="button"
            data-testid="seed-preparation-save"
            className="lv-btn lv-btn-secondary"
            onClick={() => {
              void handleSaveClick();
            }}
            disabled={busy || planting}
          >
            {busy ? "Guardando..." : "Guardar preparacion"}
          </button>
          <button
            type="button"
            data-testid="seed-preparation-save-and-plant"
            className="lv-btn lv-btn-primary"
            onClick={() => {
              void handleSaveAndPlantClick();
            }}
            disabled={busy || planting || !readyToPlant}
          >
            {planting ? "Plantando..." : "Plantar esta semilla"}
          </button>
        </div>
      </div>
    </div>
  );
}
