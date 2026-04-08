import type {
  SeedPreparationAttachmentKind,
  SeedPreparationChecklistCategory,
  SeedPreparationChecklistOwner,
  SeedPreparationCollaborationMode,
  SeedPreparationDestinationKind,
  SeedPreparationItineraryStatus,
  SeedPreparationPlacePlanningState,
  SeedPreparationPlacePriority,
  SeedPreparationReservationKind,
  SeedPreparationReservationStatus,
  SeedPreparationStayKind,
  SeedPreparationTransportKind,
} from "@/lib/seedPreparationTypes";

export type SeedEventReminderStatus = "pending" | "sent" | "skipped" | "failed";

export type SeedEventReminderDelivery = {
  id: string;
  seed_id: string;
  garden_id: string;
  reminder_kind: string;
  delivery_window_key: string;
  scheduled_for: string;
  sent_at: string | null;
  status: SeedEventReminderStatus;
  provider_message_id: string | null;
  recipient_emails: string[];
  seed_snapshot_hash: string | null;
  calendar_uid: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type SeedEventReminderRecipient = {
  userId: string;
  email: string;
  name: string | null;
};

export type SeedEventSummarySeed = {
  id: string;
  gardenId: string;
  title: string;
  status: string;
  scheduledDate: string | null;
  element: string | null;
  notes: string | null;
  mapPlaceId: string | null;
  mapRouteId: string | null;
  planTypeId: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type SeedEventSummaryPlaceRef = {
  id: string;
  label: string;
};

export type SeedEventSummaryRouteRef = {
  id: string;
  label: string;
};

export type SeedEventSummaryTripBrief = {
  collaborationMode: SeedPreparationCollaborationMode;
  summary: string | null;
  destinationLabel: string | null;
  destinationKind: SeedPreparationDestinationKind | null;
  dateMode: "single_day" | "date_range" | "flexible";
  startsOn: string | null;
  endsOn: string | null;
  budgetAmount: number | null;
  budgetCurrency: string | null;
  budgetNotes: string | null;
  goalTags: string[];
  sharedIntention: string | null;
  whyThisTrip: string | null;
  climateContext: string | null;
  primaryPlace: SeedEventSummaryPlaceRef | null;
  primaryRoute: SeedEventSummaryRouteRef | null;
};

export type SeedEventSummaryStop = {
  id: string;
  title: string;
  startsOn: string | null;
  endsOn: string | null;
  notes: string | null;
  basePlace: SeedEventSummaryPlaceRef | null;
};

export type SeedEventSummaryTransportLeg = {
  id: string;
  title: string | null;
  fromLabel: string | null;
  toLabel: string | null;
  startsAt: string | null;
  endsAt: string | null;
  transportKind: SeedPreparationTransportKind;
  providerName: string | null;
  bookingUrl: string | null;
  referenceCode: string | null;
  referenceCodeMasked: string | null;
  route: SeedEventSummaryRouteRef | null;
  originPlace: SeedEventSummaryPlaceRef | null;
  destinationPlace: SeedEventSummaryPlaceRef | null;
  originStopTitle: string | null;
  destinationStopTitle: string | null;
  notes: string | null;
};

export type SeedEventSummaryStay = {
  id: string;
  stayKind: SeedPreparationStayKind;
  name: string;
  providerName: string | null;
  bookingUrl: string | null;
  checkInDate: string | null;
  checkOutDate: string | null;
  addressLabel: string | null;
  place: SeedEventSummaryPlaceRef | null;
  confirmationCode: string | null;
  confirmationCodeMasked: string | null;
  stopTitle: string | null;
  notes: string | null;
};

export type SeedEventSummaryPlaceLink = {
  id: string;
  dayDate: string | null;
  title: string;
  priority: SeedPreparationPlacePriority;
  planningState: SeedPreparationPlacePlanningState;
  stopTitle: string | null;
  place: SeedEventSummaryPlaceRef | null;
  route: SeedEventSummaryRouteRef | null;
  linkedTransportTitle: string | null;
  notes: string | null;
};

export type SeedEventSummaryItineraryItem = {
  id: string;
  dayDate: string | null;
  timeLabel: string | null;
  durationMinutes: number | null;
  title: string;
  description: string | null;
  status: SeedPreparationItineraryStatus;
  stopTitle: string | null;
  place: SeedEventSummaryPlaceRef | null;
  route: SeedEventSummaryRouteRef | null;
  transportTitle: string | null;
};

export type SeedEventSummaryReservation = {
  id: string;
  reservationKind: SeedPreparationReservationKind;
  title: string;
  providerName: string | null;
  reservationUrl: string | null;
  referenceCode: string | null;
  referenceCodeMasked: string | null;
  amount: number | null;
  currency: string | null;
  startsAt: string | null;
  status: SeedPreparationReservationStatus;
  stopTitle: string | null;
  place: SeedEventSummaryPlaceRef | null;
  notes: string | null;
};

export type SeedEventSummaryChecklistItem = {
  id: string;
  category: SeedPreparationChecklistCategory;
  label: string;
  owner: SeedPreparationChecklistOwner;
  isRequired: boolean;
  completedAt: string | null;
};

export type SeedEventSummaryAttachment = {
  id: string;
  kind: SeedPreparationAttachmentKind;
  title: string;
  titleMasked: string;
  fileName: string | null;
  linkedKind: string;
  linkedRecordId: string | null;
  notes: string | null;
};

export type SeedEventSummaryModel = {
  seed: SeedEventSummarySeed;
  planTypeLabel: string | null;
  linkedPlace: SeedEventSummaryPlaceRef | null;
  linkedRoute: SeedEventSummaryRouteRef | null;
  isTripPreparation: boolean;
  tripBrief: SeedEventSummaryTripBrief | null;
  stops: SeedEventSummaryStop[];
  transportLegs: SeedEventSummaryTransportLeg[];
  stays: SeedEventSummaryStay[];
  placeLinks: SeedEventSummaryPlaceLink[];
  itineraryItems: SeedEventSummaryItineraryItem[];
  reservations: SeedEventSummaryReservation[];
  checklistItems: SeedEventSummaryChecklistItem[];
  attachments: SeedEventSummaryAttachment[];
};

export type SeedEventReminderWindow = {
  key: string;
  offsetDays: number;
};

export type SeedEventReminderEmailModel = {
  subject: string;
  previewText: string;
  introLine: string;
  closingLine: string;
  ctaUrl: string;
  ctaLabel: string;
  sections: Array<{
    title: string;
    lines: string[];
  }>;
};
