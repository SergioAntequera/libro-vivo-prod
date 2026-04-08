import { getSessionAccessToken } from "@/lib/auth";
import type { MapPlaceKind } from "@/lib/mapDomainTypes";

type PlaceSaveMode = "saved" | "favorite" | "wishlist" | "visited";

type SavePlaceInput = {
  label: string;
  subtitle: string;
  lat: number;
  lng: number;
  sourcePageId?: string | null;
  notes?: string | null;
};

type SaveRouteInput = {
  title: string;
  subtitle?: string | null;
  notes?: string | null;
  originLabel?: string | null;
  originLat?: number | null;
  originLng?: number | null;
  destinationLabel?: string | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  geometry: { type: "LineString"; coordinates: Array<[number, number]> };
  distanceMeters?: number | null;
  durationSeconds?: number | null;
  travelMode?: "walking" | "driving" | "cycling" | "transit" | "mixed";
  kind?: "walk" | "drive" | "date_route" | "trip" | "ritual" | "custom";
  sourcePageId?: string | null;
};

type SaveZoneInput = {
  title: string;
  subtitle?: string | null;
  description?: string | null;
  centroidLat?: number | null;
  centroidLng?: number | null;
  geojson: Record<string, unknown>;
  kind?: "symbolic" | "favorite_area" | "memory_area" | "meeting_area" | "avoid_area" | "custom";
  sourcePageId?: string | null;
};

type UpdateRouteInput = {
  title?: string | null;
  subtitle?: string | null;
  notes?: string | null;
  kind?: "walk" | "drive" | "date_route" | "trip" | "ritual" | "custom";
  status?: "draft" | "saved" | "archived";
  travelMode?: "walking" | "driving" | "cycling" | "transit" | "mixed";
  colorToken?: string | null;
  archivedAt?: string | null;
};

type UpdateZoneInput = {
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  kind?: "symbolic" | "favorite_area" | "memory_area" | "meeting_area" | "avoid_area" | "custom";
  status?: "active" | "archived";
  colorToken?: string | null;
  archivedAt?: string | null;
};

function buildAuthHeaders(token: string, hasBody: boolean) {
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);
  if (hasBody) headers.set("Content-Type", "application/json");
  return headers;
}

async function getRequiredToken() {
  const token = await getSessionAccessToken();
  if (!token) {
    throw new Error("Sesión expirada. Vuelve a iniciar sesión.");
  }
  return token;
}

async function readJsonOrThrow<T>(res: Response): Promise<T> {
  const payload = (await res.json().catch(() => null)) as { error?: string } | T | null;
  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && payload !== null && "error" in payload
        ? String((payload as { error?: string }).error ?? "").trim() || `Error HTTP ${res.status}`
        : `Error HTTP ${res.status}`;
    throw new Error(message);
  }
  return payload as T;
}

export async function saveMapPlaceFromSelection(
  input: SavePlaceInput,
  mode: PlaceSaveMode,
  kindOverride?: MapPlaceKind,
) {
  const token = await getRequiredToken();
  const body = {
    title: input.label,
    subtitle: input.subtitle,
    notes: input.notes ?? null,
    addressLabel: input.subtitle,
    lat: input.lat,
    lng: input.lng,
    kind: kindOverride ?? "spot",
    state:
      mode === "favorite"
        ? "favorite"
        : mode === "wishlist"
          ? "wishlist"
          : mode === "visited"
            ? "visited"
            : "saved",
    sourcePageId: input.sourcePageId ?? null,
  };

  const res = await fetch("/api/map/places", {
    method: "POST",
    headers: buildAuthHeaders(token, true),
    credentials: "same-origin",
    body: JSON.stringify(body),
  });

  return readJsonOrThrow<{ place: Record<string, unknown> }>(res);
}

export async function updateMapPlace(placeId: string, mode: PlaceSaveMode) {
  const token = await getRequiredToken();
  const body: Record<string, unknown> =
    mode === "wishlist"
      ? { state: "wishlist" }
      : mode === "visited"
        ? { state: "visited" }
        : mode === "favorite"
          ? { state: "favorite" }
          : { state: "saved" };

  const res = await fetch(`/api/map/places/${encodeURIComponent(placeId)}`, {
    method: "PATCH",
    headers: buildAuthHeaders(token, true),
    credentials: "same-origin",
    body: JSON.stringify(body),
  });

  return readJsonOrThrow<{ place: Record<string, unknown> }>(res);
}

export async function updateMapPlaceKind(placeId: string, kind: MapPlaceKind) {
  const token = await getRequiredToken();
  const res = await fetch(`/api/map/places/${encodeURIComponent(placeId)}`, {
    method: "PATCH",
    headers: buildAuthHeaders(token, true),
    credentials: "same-origin",
    body: JSON.stringify({ kind }),
  });

  return readJsonOrThrow<{ place: Record<string, unknown> }>(res);
}

export async function reverseGeocodePoint(input: { lat: number; lng: number }) {
  const res = await fetch(
    `/api/geocode/reverse?lat=${encodeURIComponent(String(input.lat))}&lng=${encodeURIComponent(
      String(input.lng),
    )}`,
    {
      credentials: "same-origin",
    },
  );

  return readJsonOrThrow<{ result: { label: string; fullLabel: string } }>(res);
}

export async function saveMapRouteFromPreview(input: SaveRouteInput) {
  const token = await getRequiredToken();
  const res = await fetch("/api/map/routes", {
    method: "POST",
    headers: buildAuthHeaders(token, true),
    credentials: "same-origin",
    body: JSON.stringify({
      title: input.title,
      subtitle: input.subtitle ?? null,
      notes: input.notes ?? null,
      originLabel: input.originLabel ?? null,
      originLat: input.originLat ?? null,
      originLng: input.originLng ?? null,
      destinationLabel: input.destinationLabel ?? null,
      destinationLat: input.destinationLat ?? null,
      destinationLng: input.destinationLng ?? null,
      geometry: input.geometry,
      distanceMeters: input.distanceMeters ?? null,
      durationSeconds: input.durationSeconds ?? null,
      travelMode: input.travelMode ?? "driving",
      kind: input.kind ?? "drive",
      status: "saved",
      sourcePageId: input.sourcePageId ?? null,
    }),
  });

  return readJsonOrThrow<{ route: Record<string, unknown> }>(res);
}

export async function saveMapZone(input: SaveZoneInput) {
  const token = await getRequiredToken();
  const res = await fetch("/api/map/zones", {
    method: "POST",
    headers: buildAuthHeaders(token, true),
    credentials: "same-origin",
    body: JSON.stringify({
      title: input.title,
      subtitle: input.subtitle ?? null,
      description: input.description ?? null,
      centroidLat: input.centroidLat ?? null,
      centroidLng: input.centroidLng ?? null,
      geojson: input.geojson,
      kind: input.kind ?? "symbolic",
      status: "active",
      sourcePageId: input.sourcePageId ?? null,
    }),
  });

  return readJsonOrThrow<{ zone: Record<string, unknown> }>(res);
}

export async function updateMapRoute(routeId: string, input: UpdateRouteInput) {
  const token = await getRequiredToken();
  const res = await fetch(`/api/map/routes/${encodeURIComponent(routeId)}`, {
    method: "PATCH",
    headers: buildAuthHeaders(token, true),
    credentials: "same-origin",
    body: JSON.stringify(input),
  });

  return readJsonOrThrow<{ route: Record<string, unknown> }>(res);
}

export async function archiveMapRoute(routeId: string) {
  return updateMapRoute(routeId, {
    status: "archived",
    archivedAt: new Date().toISOString(),
  });
}

export async function updateMapZone(zoneId: string, input: UpdateZoneInput) {
  const token = await getRequiredToken();
  const res = await fetch(`/api/map/zones/${encodeURIComponent(zoneId)}`, {
    method: "PATCH",
    headers: buildAuthHeaders(token, true),
    credentials: "same-origin",
    body: JSON.stringify(input),
  });

  return readJsonOrThrow<{ zone: Record<string, unknown> }>(res);
}

export async function archiveMapZone(zoneId: string) {
  return updateMapZone(zoneId, {
    status: "archived",
    archivedAt: new Date().toISOString(),
  });
}
