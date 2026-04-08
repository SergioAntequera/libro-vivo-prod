export const SEED_PLANNING_DRAFT_STATUS = "planning_draft";

export type SeedPreparationCollaborationMode = "solo_for_now" | "shared";

export type SeedPreparationBlockId =
  | "summary"
  | "dates"
  | "budget"
  | "stops"
  | "transport"
  | "stay"
  | "places"
  | "itinerary"
  | "checklist"
  | "reservations"
  | "documents"
  | "climate"
  | "notes";

export type SeedPreparationDestinationKind =
  | "city"
  | "beach"
  | "mountain"
  | "international"
  | "road_trip"
  | "other";

export type SeedPreparationProfile = {
  id: string;
  seed_id: string;
  garden_id: string;
  planner_mode: string;
  collaboration_mode: SeedPreparationCollaborationMode;
  preparation_progress: number;
  enabled_blocks: SeedPreparationBlockId[];
  summary: string | null;
  destination_label: string | null;
  destination_kind: SeedPreparationDestinationKind | null;
  date_mode: "single_day" | "date_range" | "flexible";
  starts_on: string | null;
  ends_on: string | null;
  budget_amount: number | null;
  budget_currency: string | null;
  budget_notes: string | null;
  goal_tags: string[];
  shared_intention: string | null;
  why_this_trip: string | null;
  climate_context: string | null;
  primary_map_place_id: string | null;
  primary_map_route_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SeedPreparationStop = {
  id: string;
  seed_id: string;
  garden_id: string;
  order_index: number;
  title: string;
  base_place_id: string | null;
  starts_on: string | null;
  ends_on: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SeedPreparationTransportKind =
  | "walking"
  | "car"
  | "train"
  | "plane"
  | "bus"
  | "boat"
  | "metro"
  | "mixed"
  | "other";

export type SeedPreparationTransportLeg = {
  id: string;
  seed_id: string;
  garden_id: string;
  order_index: number;
  title: string | null;
  from_label: string | null;
  to_label: string | null;
  starts_at: string | null;
  ends_at: string | null;
  transport_kind: SeedPreparationTransportKind;
  provider_name: string | null;
  booking_url: string | null;
  reference_code: string | null;
  map_route_id: string | null;
  origin_place_id: string | null;
  destination_place_id: string | null;
  origin_stop_id: string | null;
  destination_stop_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SeedPreparationStayKind =
  | "hotel"
  | "hostel"
  | "apartment"
  | "house"
  | "camping"
  | "other";

export type SeedPreparationStay = {
  id: string;
  seed_id: string;
  garden_id: string;
  order_index: number;
  stop_id: string | null;
  stay_kind: SeedPreparationStayKind;
  name: string;
  provider_name: string | null;
  booking_url: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  address_label: string | null;
  map_place_id: string | null;
  confirmation_code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SeedPreparationPlacePriority = "must" | "would_like" | "if_time";
export type SeedPreparationPlacePlanningState = "idea" | "booked" | "visited" | "skipped";

export type SeedPreparationPlaceLink = {
  id: string;
  seed_id: string;
  garden_id: string;
  order_index: number;
  stop_id: string | null;
  day_date: string | null;
  map_place_id: string | null;
  manual_title: string | null;
  priority: SeedPreparationPlacePriority;
  planning_state: SeedPreparationPlacePlanningState;
  linked_transport_leg_id: string | null;
  linked_route_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SeedPreparationItineraryStatus =
  | "planned"
  | "confirmed"
  | "flexible"
  | "done"
  | "dropped";

export type SeedPreparationItineraryItem = {
  id: string;
  seed_id: string;
  garden_id: string;
  order_index: number;
  stop_id: string | null;
  day_date: string | null;
  time_label: string | null;
  duration_minutes: number | null;
  title: string;
  description: string | null;
  map_place_id: string | null;
  map_route_id: string | null;
  transport_leg_id: string | null;
  status: SeedPreparationItineraryStatus;
  created_at: string;
  updated_at: string;
};

export type SeedPreparationChecklistOwner = "me" | "partner" | "shared";

export type SeedPreparationChecklistCategory =
  | "documents"
  | "health"
  | "clothes"
  | "tech"
  | "money"
  | "insurance"
  | "misc";

export type SeedPreparationChecklistItem = {
  id: string;
  seed_id: string;
  garden_id: string;
  order_index: number;
  category: SeedPreparationChecklistCategory;
  label: string;
  owner: SeedPreparationChecklistOwner;
  is_required: boolean;
  completed_at: string | null;
  completed_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SeedPreparationReservationKind =
  | "ticket"
  | "booking"
  | "insurance"
  | "restaurant"
  | "activity"
  | "other";

export type SeedPreparationReservationStatus = "pending" | "confirmed" | "cancelled";

export type SeedPreparationReservation = {
  id: string;
  seed_id: string;
  garden_id: string;
  order_index: number;
  stop_id: string | null;
  reservation_kind: SeedPreparationReservationKind;
  title: string;
  provider_name: string | null;
  reservation_url: string | null;
  reference_code: string | null;
  amount: number | null;
  currency: string | null;
  starts_at: string | null;
  map_place_id: string | null;
  status: SeedPreparationReservationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SeedPreparationAttachmentKind =
  | "passport"
  | "dni"
  | "ticket"
  | "reservation"
  | "insurance"
  | "medical"
  | "other";

export type SeedPreparationAttachmentLinkKind =
  | "seed"
  | "transport_leg"
  | "stay"
  | "reservation"
  | "generic_document";

export type SeedPreparationAttachment = {
  id: string;
  seed_id: string;
  garden_id: string;
  order_index: number;
  linked_kind: SeedPreparationAttachmentLinkKind;
  linked_record_id: string | null;
  attachment_kind: SeedPreparationAttachmentKind;
  title: string;
  file_name: string | null;
  mime_type: string | null;
  storage_provider: string | null;
  file_url: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
