import type {
  SeedPreparationAttachment,
  SeedPreparationCollaborationMode,
  SeedPreparationDestinationKind,
  SeedPreparationItineraryItem,
  SeedPreparationPlaceLink,
  SeedPreparationReservation,
  SeedPreparationStay,
  SeedPreparationStop,
  SeedPreparationTransportLeg,
} from "@/lib/seedPreparationTypes";

export type SeedPreparationLiveSnapshot = {
  title: string;
  notes: string;
  summary: string;
  selectedPlanTypeId: string;
  collaborationMode: SeedPreparationCollaborationMode;
  destinationLabel: string;
  destinationKind: string;
  dateMode: "single_day" | "date_range" | "flexible";
  startsOn: string;
  endsOn: string;
  budgetAmount: string;
  budgetCurrency: string;
  budgetNotes: string;
  goalTagsRaw: string;
  sharedIntention: string;
  whyThisTrip: string;
  climateContext: string;
  primaryMapPlaceId: string;
  primaryMapRouteId: string;
  stops: SeedPreparationStop[];
  transportLegs: SeedPreparationTransportLeg[];
  stays: SeedPreparationStay[];
  placeLinks: SeedPreparationPlaceLink[];
  itineraryItems: SeedPreparationItineraryItem[];
  reservations: SeedPreparationReservation[];
  attachments: SeedPreparationAttachment[];
};

export type SeedPreparationLiveTargetKind =
  | "trip_brief"
  | "stops"
  | "transport"
  | "stays"
  | "places"
  | "itinerary"
  | "reservations"
  | "attachments"
  | "checklist";

export type SeedPreparationLiveTarget = {
  key: string;
  kind: SeedPreparationLiveTargetKind;
  label: string;
  rowId: string | null;
};

function stableCollectionSort<T extends { id: string; order_index: number; updated_at: string }>(
  items: T[],
) {
  return [...items].sort((left, right) => {
    if (left.order_index !== right.order_index) {
      return left.order_index - right.order_index;
    }
    const updatedComparison = String(left.updated_at ?? "").localeCompare(String(right.updated_at ?? ""));
    if (updatedComparison !== 0) return updatedComparison;
    return left.id.localeCompare(right.id);
  });
}

function mergeCollectionById<T extends { id: string; order_index: number; updated_at: string }>(
  localItems: T[],
  remoteItems: T[],
  preserveLocalRowId: string | null,
) {
  const localById = new Map(localItems.map((item) => [item.id, item]));
  const remoteById = new Map(remoteItems.map((item) => [item.id, item]));
  const next = new Map<string, T>();

  for (const remoteItem of remoteItems) {
    if (preserveLocalRowId && remoteItem.id === preserveLocalRowId) {
      const localItem = localById.get(remoteItem.id);
      next.set(remoteItem.id, localItem ?? remoteItem);
      continue;
    }
    next.set(remoteItem.id, remoteItem);
  }

  for (const localItem of localItems) {
    if (!remoteById.has(localItem.id) || localItem.id === preserveLocalRowId) {
      next.set(localItem.id, localItem);
    }
  }

  return stableCollectionSort([...next.values()]);
}

function resolvePreservedRowId(
  activeTarget: SeedPreparationLiveTarget | null,
  expectedKind: SeedPreparationLiveTargetKind,
) {
  if (!activeTarget || activeTarget.kind !== expectedKind) return null;
  return activeTarget.rowId ?? null;
}

function buildTripBriefFingerprint(snapshot: SeedPreparationLiveSnapshot) {
  return JSON.stringify({
    title: snapshot.title,
    notes: snapshot.notes,
    summary: snapshot.summary,
    selectedPlanTypeId: snapshot.selectedPlanTypeId,
    collaborationMode: snapshot.collaborationMode,
    destinationLabel: snapshot.destinationLabel,
    destinationKind: snapshot.destinationKind,
    dateMode: snapshot.dateMode,
    startsOn: snapshot.startsOn,
    endsOn: snapshot.endsOn,
    budgetAmount: snapshot.budgetAmount,
    budgetCurrency: snapshot.budgetCurrency,
    budgetNotes: snapshot.budgetNotes,
    goalTagsRaw: snapshot.goalTagsRaw,
    sharedIntention: snapshot.sharedIntention,
    whyThisTrip: snapshot.whyThisTrip,
    climateContext: snapshot.climateContext,
    primaryMapPlaceId: snapshot.primaryMapPlaceId,
    primaryMapRouteId: snapshot.primaryMapRouteId,
  });
}

function rowFingerprint(value: unknown) {
  return JSON.stringify(value);
}

function collectionDidChange<T extends { id: string }>(
  localItems: T[],
  remoteItems: T[],
  rowId: string | null,
) {
  if (!rowId) return false;
  const localItem = localItems.find((item) => item.id === rowId) ?? null;
  const remoteItem = remoteItems.find((item) => item.id === rowId) ?? null;
  if (!localItem && !remoteItem) return false;
  if (!localItem || !remoteItem) return true;
  return rowFingerprint(localItem) !== rowFingerprint(remoteItem);
}

export function serializeSeedPreparationLiveSnapshot(snapshot: SeedPreparationLiveSnapshot) {
  return JSON.stringify({
    ...snapshot,
    attachments: stableCollectionSort(snapshot.attachments),
    itineraryItems: stableCollectionSort(snapshot.itineraryItems),
    placeLinks: stableCollectionSort(snapshot.placeLinks),
    reservations: stableCollectionSort(snapshot.reservations),
    stays: stableCollectionSort(snapshot.stays),
    stops: stableCollectionSort(snapshot.stops),
    transportLegs: stableCollectionSort(snapshot.transportLegs),
  });
}

export function didRemoteChangeActivePreparationTarget(
  localSnapshot: SeedPreparationLiveSnapshot,
  remoteSnapshot: SeedPreparationLiveSnapshot,
  activeTarget: SeedPreparationLiveTarget | null,
) {
  if (!activeTarget) return false;

  if (activeTarget.kind === "trip_brief") {
    return buildTripBriefFingerprint(localSnapshot) !== buildTripBriefFingerprint(remoteSnapshot);
  }

  if (activeTarget.kind === "stops") {
    return collectionDidChange(localSnapshot.stops, remoteSnapshot.stops, activeTarget.rowId);
  }
  if (activeTarget.kind === "transport") {
    return collectionDidChange(
      localSnapshot.transportLegs,
      remoteSnapshot.transportLegs,
      activeTarget.rowId,
    );
  }
  if (activeTarget.kind === "stays") {
    return collectionDidChange(localSnapshot.stays, remoteSnapshot.stays, activeTarget.rowId);
  }
  if (activeTarget.kind === "places") {
    return collectionDidChange(
      localSnapshot.placeLinks,
      remoteSnapshot.placeLinks,
      activeTarget.rowId,
    );
  }
  if (activeTarget.kind === "itinerary") {
    return collectionDidChange(
      localSnapshot.itineraryItems,
      remoteSnapshot.itineraryItems,
      activeTarget.rowId,
    );
  }
  if (activeTarget.kind === "reservations") {
    return collectionDidChange(
      localSnapshot.reservations,
      remoteSnapshot.reservations,
      activeTarget.rowId,
    );
  }
  if (activeTarget.kind === "attachments") {
    return collectionDidChange(
      localSnapshot.attachments,
      remoteSnapshot.attachments,
      activeTarget.rowId,
    );
  }

  return false;
}

export function mergeSeedPreparationLiveSnapshot(
  localSnapshot: SeedPreparationLiveSnapshot,
  remoteSnapshot: SeedPreparationLiveSnapshot,
  activeTarget: SeedPreparationLiveTarget | null,
): SeedPreparationLiveSnapshot {
  const preserveTripBrief = activeTarget?.kind === "trip_brief";

  return {
    title: preserveTripBrief ? localSnapshot.title : remoteSnapshot.title,
    notes: preserveTripBrief ? localSnapshot.notes : remoteSnapshot.notes,
    summary: preserveTripBrief ? localSnapshot.summary : remoteSnapshot.summary,
    selectedPlanTypeId: preserveTripBrief
      ? localSnapshot.selectedPlanTypeId
      : remoteSnapshot.selectedPlanTypeId,
    collaborationMode: preserveTripBrief
      ? localSnapshot.collaborationMode
      : remoteSnapshot.collaborationMode,
    destinationLabel: preserveTripBrief
      ? localSnapshot.destinationLabel
      : remoteSnapshot.destinationLabel,
    destinationKind: preserveTripBrief
      ? localSnapshot.destinationKind
      : remoteSnapshot.destinationKind,
    dateMode: preserveTripBrief ? localSnapshot.dateMode : remoteSnapshot.dateMode,
    startsOn: preserveTripBrief ? localSnapshot.startsOn : remoteSnapshot.startsOn,
    endsOn: preserveTripBrief ? localSnapshot.endsOn : remoteSnapshot.endsOn,
    budgetAmount: preserveTripBrief ? localSnapshot.budgetAmount : remoteSnapshot.budgetAmount,
    budgetCurrency: preserveTripBrief
      ? localSnapshot.budgetCurrency
      : remoteSnapshot.budgetCurrency,
    budgetNotes: preserveTripBrief ? localSnapshot.budgetNotes : remoteSnapshot.budgetNotes,
    goalTagsRaw: preserveTripBrief ? localSnapshot.goalTagsRaw : remoteSnapshot.goalTagsRaw,
    sharedIntention: preserveTripBrief
      ? localSnapshot.sharedIntention
      : remoteSnapshot.sharedIntention,
    whyThisTrip: preserveTripBrief ? localSnapshot.whyThisTrip : remoteSnapshot.whyThisTrip,
    climateContext: preserveTripBrief
      ? localSnapshot.climateContext
      : remoteSnapshot.climateContext,
    primaryMapPlaceId: preserveTripBrief
      ? localSnapshot.primaryMapPlaceId
      : remoteSnapshot.primaryMapPlaceId,
    primaryMapRouteId: preserveTripBrief
      ? localSnapshot.primaryMapRouteId
      : remoteSnapshot.primaryMapRouteId,
    stops: mergeCollectionById(
      localSnapshot.stops,
      remoteSnapshot.stops,
      resolvePreservedRowId(activeTarget, "stops"),
    ),
    transportLegs: mergeCollectionById(
      localSnapshot.transportLegs,
      remoteSnapshot.transportLegs,
      resolvePreservedRowId(activeTarget, "transport"),
    ),
    stays: mergeCollectionById(
      localSnapshot.stays,
      remoteSnapshot.stays,
      resolvePreservedRowId(activeTarget, "stays"),
    ),
    placeLinks: mergeCollectionById(
      localSnapshot.placeLinks,
      remoteSnapshot.placeLinks,
      resolvePreservedRowId(activeTarget, "places"),
    ),
    itineraryItems: mergeCollectionById(
      localSnapshot.itineraryItems,
      remoteSnapshot.itineraryItems,
      resolvePreservedRowId(activeTarget, "itinerary"),
    ),
    reservations: mergeCollectionById(
      localSnapshot.reservations,
      remoteSnapshot.reservations,
      resolvePreservedRowId(activeTarget, "reservations"),
    ),
    attachments: mergeCollectionById(
      localSnapshot.attachments,
      remoteSnapshot.attachments,
      resolvePreservedRowId(activeTarget, "attachments"),
    ),
  };
}

export function buildSeedPreparationFocusLabel(
  kind: SeedPreparationLiveTargetKind,
  input?: {
    index?: number | null;
    title?: string | null;
  },
) {
  if (kind === "trip_brief") return "Base del viaje";
  if (kind === "checklist") return "Checklist";

  const trimmedTitle = String(input?.title ?? "").trim();
  const numericIndex = Number(input?.index ?? 0);
  const ordinal = Number.isFinite(numericIndex) && numericIndex > 0 ? numericIndex : null;

  if (kind === "stops") return trimmedTitle || `Etapa ${ordinal ?? ""}`.trim();
  if (kind === "transport") return trimmedTitle || `Trayecto ${ordinal ?? ""}`.trim();
  if (kind === "stays") return trimmedTitle || `Alojamiento ${ordinal ?? ""}`.trim();
  if (kind === "places") return trimmedTitle || `Lugar ${ordinal ?? ""}`.trim();
  if (kind === "itinerary") return trimmedTitle || `Actividad ${ordinal ?? ""}`.trim();
  if (kind === "reservations") return trimmedTitle || `Reserva ${ordinal ?? ""}`.trim();
  if (kind === "attachments") return trimmedTitle || `Documento ${ordinal ?? ""}`.trim();
  return "Dossier compartido";
}
