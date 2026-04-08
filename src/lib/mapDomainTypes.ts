export type MapPlaceKind = string;

export type MapPlaceState = string;

export type MapRouteKind =
  | "walk"
  | "drive"
  | "date_route"
  | "trip"
  | "ritual"
  | "custom";

export type MapRouteStatus = "draft" | "saved" | "archived";

export type MapRouteTravelMode =
  | "walking"
  | "driving"
  | "cycling"
  | "transit"
  | "mixed";

export type MapZoneKind =
  | "symbolic"
  | "favorite_area"
  | "memory_area"
  | "meeting_area"
  | "avoid_area"
  | "custom";

export type MapZoneStatus = "active" | "archived";

export type MapLinkRefs = {
  pageId: string | null;
  seedId: string | null;
};

export type MapPlaceRecord = {
  id: string;
  gardenId: string;
  kind: MapPlaceKind;
  state: MapPlaceState;
  title: string;
  subtitle: string | null;
  notes: string | null;
  addressLabel: string | null;
  lat: number;
  lng: number;
  rating: number | null;
  iconCode: string | null;
  colorToken: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  links: MapLinkRefs;
  createdByUserId: string;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type MapRoutePoint = {
  lat: number;
  lng: number;
  label?: string | null;
};

export type MapRouteGeometry = {
  type: "LineString";
  coordinates: Array<[number, number]>;
};

export type MapRouteRecord = {
  id: string;
  gardenId: string;
  kind: MapRouteKind;
  status: MapRouteStatus;
  travelMode: MapRouteTravelMode;
  title: string;
  subtitle: string | null;
  notes: string | null;
  originLabel: string | null;
  originLat: number | null;
  originLng: number | null;
  destinationLabel: string | null;
  destinationLat: number | null;
  destinationLng: number | null;
  waypoints: MapRoutePoint[];
  geometry: MapRouteGeometry | Record<string, unknown>;
  distanceMeters: number | null;
  durationSeconds: number | null;
  iconCode: string | null;
  colorToken: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  links: MapLinkRefs;
  createdByUserId: string;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type MapZoneGeoJson = {
  type: string;
  coordinates?: unknown;
} & Record<string, unknown>;

export type MapZoneRecord = {
  id: string;
  gardenId: string;
  kind: MapZoneKind;
  status: MapZoneStatus;
  title: string;
  subtitle: string | null;
  description: string | null;
  geojson: MapZoneGeoJson;
  centroidLat: number | null;
  centroidLng: number | null;
  iconCode: string | null;
  colorToken: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  links: MapLinkRefs;
  createdByUserId: string;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

function asString(value: unknown) {
  return typeof value === "string" ? value : String(value ?? "");
}

function asNullableString(value: unknown) {
  const text = asString(value).trim();
  return text || null;
}

function asNumberOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((entry) => asString(entry).trim()).filter(Boolean)
    : [];
}

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizePlaceKind(value: unknown): MapPlaceKind {
  const raw = asString(value).trim().toLowerCase();
  if (raw === "place") return "spot";
  if (raw === "beach" || raw === "lodging") return "trip_place";
  if (raw) return raw;
  return "spot";
}

export function mapPlaceRowToRecord(row: Record<string, unknown>) {
  return {
    id: asString(row.id),
    gardenId: asString(row.garden_id),
    kind: normalizePlaceKind(row.kind),
    state: asString(row.state) as MapPlaceState,
    title: asString(row.title),
    subtitle: asNullableString(row.subtitle),
    notes: asNullableString(row.notes),
    addressLabel: asNullableString(row.address_label),
    lat: Number(row.lat),
    lng: Number(row.lng),
    rating: asNumberOrNull(row.rating),
    iconCode: asNullableString(row.icon_code),
    colorToken: asNullableString(row.color_token),
    tags: asStringArray(row.tags),
    metadata: asObject(row.metadata),
    links: {
      pageId: asNullableString(row.source_page_id),
      seedId: asNullableString(row.source_seed_id),
    },
    createdByUserId: asString(row.created_by_user_id),
    updatedByUserId: asNullableString(row.updated_by_user_id),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
    archivedAt: asNullableString(row.archived_at),
  } satisfies MapPlaceRecord;
}

export function mapRouteRowToRecord(row: Record<string, unknown>) {
  return {
    id: asString(row.id),
    gardenId: asString(row.garden_id),
    kind: asString(row.kind) as MapRouteKind,
    status: asString(row.status) as MapRouteStatus,
    travelMode: asString(row.travel_mode) as MapRouteTravelMode,
    title: asString(row.title),
    subtitle: asNullableString(row.subtitle),
    notes: asNullableString(row.notes),
    originLabel: asNullableString(row.origin_label),
    originLat: asNumberOrNull(row.origin_lat),
    originLng: asNumberOrNull(row.origin_lng),
    destinationLabel: asNullableString(row.destination_label),
    destinationLat: asNumberOrNull(row.destination_lat),
    destinationLng: asNumberOrNull(row.destination_lng),
    waypoints: Array.isArray(row.waypoints) ? (row.waypoints as MapRoutePoint[]) : [],
    geometry: asObject(row.geometry) as MapRouteGeometry | Record<string, unknown>,
    distanceMeters: asNumberOrNull(row.distance_meters),
    durationSeconds: asNumberOrNull(row.duration_seconds),
    iconCode: asNullableString(row.icon_code),
    colorToken: asNullableString(row.color_token),
    tags: asStringArray(row.tags),
    metadata: asObject(row.metadata),
    links: {
      pageId: asNullableString(row.source_page_id),
      seedId: asNullableString(row.source_seed_id),
    },
    createdByUserId: asString(row.created_by_user_id),
    updatedByUserId: asNullableString(row.updated_by_user_id),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
    archivedAt: asNullableString(row.archived_at),
  } satisfies MapRouteRecord;
}

export function mapZoneRowToRecord(row: Record<string, unknown>) {
  return {
    id: asString(row.id),
    gardenId: asString(row.garden_id),
    kind: asString(row.kind) as MapZoneKind,
    status: asString(row.status) as MapZoneStatus,
    title: asString(row.title),
    subtitle: asNullableString(row.subtitle),
    description: asNullableString(row.description),
    geojson: asObject(row.geojson) as MapZoneGeoJson,
    centroidLat: asNumberOrNull(row.centroid_lat),
    centroidLng: asNumberOrNull(row.centroid_lng),
    iconCode: asNullableString(row.icon_code),
    colorToken: asNullableString(row.color_token),
    tags: asStringArray(row.tags),
    metadata: asObject(row.metadata),
    links: {
      pageId: asNullableString(row.source_page_id),
      seedId: asNullableString(row.source_seed_id),
    },
    createdByUserId: asString(row.created_by_user_id),
    updatedByUserId: asNullableString(row.updated_by_user_id),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
    archivedAt: asNullableString(row.archived_at),
  } satisfies MapZoneRecord;
}
