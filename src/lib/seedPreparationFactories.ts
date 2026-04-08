import type {
  SeedPreparationAttachment,
  SeedPreparationChecklistItem,
  SeedPreparationItineraryItem,
  SeedPreparationPlaceLink,
  SeedPreparationReservation,
  SeedPreparationStay,
  SeedPreparationStop,
  SeedPreparationTransportLeg,
} from "@/lib/seedPreparationTypes";

function nowIso() {
  return new Date().toISOString();
}

function nextId() {
  return crypto.randomUUID();
}

export function createEmptyPreparationStop(seedId: string, gardenId: string, orderIndex: number): SeedPreparationStop {
  const timestamp = nowIso();
  return {
    id: nextId(),
    seed_id: seedId,
    garden_id: gardenId,
    order_index: orderIndex,
    title: "",
    base_place_id: null,
    starts_on: null,
    ends_on: null,
    notes: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export function createEmptyPreparationTransportLeg(
  seedId: string,
  gardenId: string,
  orderIndex: number,
): SeedPreparationTransportLeg {
  const timestamp = nowIso();
  return {
    id: nextId(),
    seed_id: seedId,
    garden_id: gardenId,
    order_index: orderIndex,
    title: null,
    from_label: null,
    to_label: null,
    starts_at: null,
    ends_at: null,
    transport_kind: "other",
    provider_name: null,
    booking_url: null,
    reference_code: null,
    map_route_id: null,
    origin_place_id: null,
    destination_place_id: null,
    origin_stop_id: null,
    destination_stop_id: null,
    notes: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export function createEmptyPreparationStay(seedId: string, gardenId: string, orderIndex: number): SeedPreparationStay {
  const timestamp = nowIso();
  return {
    id: nextId(),
    seed_id: seedId,
    garden_id: gardenId,
    order_index: orderIndex,
    stop_id: null,
    stay_kind: "hotel",
    name: "",
    provider_name: null,
    booking_url: null,
    check_in_date: null,
    check_out_date: null,
    address_label: null,
    map_place_id: null,
    confirmation_code: null,
    notes: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export function createEmptyPreparationPlaceLink(
  seedId: string,
  gardenId: string,
  orderIndex: number,
): SeedPreparationPlaceLink {
  const timestamp = nowIso();
  return {
    id: nextId(),
    seed_id: seedId,
    garden_id: gardenId,
    order_index: orderIndex,
    stop_id: null,
    day_date: null,
    map_place_id: null,
    manual_title: null,
    priority: "would_like",
    planning_state: "idea",
    linked_transport_leg_id: null,
    linked_route_id: null,
    notes: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export function createEmptyPreparationItineraryItem(
  seedId: string,
  gardenId: string,
  orderIndex: number,
): SeedPreparationItineraryItem {
  const timestamp = nowIso();
  return {
    id: nextId(),
    seed_id: seedId,
    garden_id: gardenId,
    order_index: orderIndex,
    stop_id: null,
    day_date: null,
    time_label: null,
    duration_minutes: null,
    title: "",
    description: null,
    map_place_id: null,
    map_route_id: null,
    transport_leg_id: null,
    status: "planned",
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export function createEmptyPreparationReservation(
  seedId: string,
  gardenId: string,
  orderIndex: number,
): SeedPreparationReservation {
  const timestamp = nowIso();
  return {
    id: nextId(),
    seed_id: seedId,
    garden_id: gardenId,
    order_index: orderIndex,
    stop_id: null,
    reservation_kind: "other",
    title: "",
    provider_name: null,
    reservation_url: null,
    reference_code: null,
    amount: null,
    currency: "EUR",
    starts_at: null,
    map_place_id: null,
    status: "pending",
    notes: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export function createEmptyPreparationAttachment(
  seedId: string,
  gardenId: string,
  orderIndex: number,
): SeedPreparationAttachment {
  const timestamp = nowIso();
  return {
    id: nextId(),
    seed_id: seedId,
    garden_id: gardenId,
    order_index: orderIndex,
    linked_kind: "seed",
    linked_record_id: null,
    attachment_kind: "other",
    title: "",
    file_name: null,
    mime_type: null,
    storage_provider: null,
    file_url: "",
    notes: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export function createEmptyPreparationChecklistItem(
  seedId: string,
  gardenId: string,
  orderIndex: number,
): SeedPreparationChecklistItem {
  const timestamp = nowIso();
  return {
    id: nextId(),
    seed_id: seedId,
    garden_id: gardenId,
    order_index: orderIndex,
    category: "misc",
    label: "",
    owner: "shared",
    is_required: false,
    completed_at: null,
    completed_by_user_id: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
}
