import { NextResponse } from "next/server";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import {
  isSchemaNotReadyError,
  resolveActiveGardenIdForUser,
  withGardenIdOnInsert,
} from "@/lib/gardens";
import {
  cleanInteger,
  cleanNumber,
  cleanObject,
  cleanStringArray,
  cleanText,
  toErrorMessage,
} from "@/app/api/map/_shared";

const ALLOWED_KINDS = new Set([
  "walk",
  "drive",
  "date_route",
  "trip",
  "ritual",
  "custom",
]);

const ALLOWED_STATUSES = new Set(["draft", "saved", "archived"]);
const ALLOWED_TRAVEL_MODES = new Set(["walking", "driving", "cycling", "transit", "mixed"]);

function cleanCoordinates(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!Array.isArray(entry) || entry.length < 2) return null;
      const lng = Number(entry[0]);
      const lat = Number(entry[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
      return [lng, lat] as [number, number];
    })
    .filter((entry): entry is [number, number] => entry !== null);
}

function cleanWaypoints(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const row = cleanObject(entry);
      const lat = cleanNumber(row.lat);
      const lng = cleanNumber(row.lng);
      if (lat == null || lng == null) return null;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
      return {
        lat,
        lng,
        label: cleanText(row.label, 160),
      };
    })
    .filter((entry): entry is { lat: number; lng: number; label: string | null } => entry !== null);
}

function cleanLineString(value: unknown) {
  const shape = cleanObject(value);
  if (shape.type !== "LineString") {
    return {
      type: "LineString" as const,
      coordinates: [] as Array<[number, number]>,
    };
  }
  return {
    type: "LineString" as const,
    coordinates: cleanCoordinates(shape.coordinates),
  };
}

export async function POST(req: Request) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  try {
    const payload = (await req.json()) as Record<string, unknown>;
    const title = cleanText(payload.title, 160);
    const kind = cleanText(payload.kind, 40) ?? "custom";
    const status = cleanText(payload.status, 40) ?? "saved";
    const travelMode = cleanText(payload.travelMode, 40) ?? "walking";
    const geometry = cleanLineString(payload.geometry);

    if (!title) {
      return NextResponse.json({ error: "La ruta necesita un título." }, { status: 400 });
    }
    if (!ALLOWED_KINDS.has(kind)) {
      return NextResponse.json({ error: "Tipo de ruta no válido." }, { status: 400 });
    }
    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ error: "Estado de ruta no válido." }, { status: 400 });
    }
    if (!ALLOWED_TRAVEL_MODES.has(travelMode)) {
      return NextResponse.json({ error: "Modo de trayecto no válido." }, { status: 400 });
    }

    const gardenId = await resolveActiveGardenIdForUser({
      userId: auth.userId,
      client: auth.client,
    });

    if (!gardenId) {
      return NextResponse.json({ error: "No hay jardín activo para guardar esta ruta." }, { status: 400 });
    }

    const insertPayload = withGardenIdOnInsert(
      {
        title,
        subtitle: cleanText(payload.subtitle, 180),
        notes: cleanText(payload.notes, 2000),
        kind,
        status,
        travel_mode: travelMode,
        origin_label: cleanText(payload.originLabel, 160),
        origin_lat: cleanNumber(payload.originLat),
        origin_lng: cleanNumber(payload.originLng),
        destination_label: cleanText(payload.destinationLabel, 160),
        destination_lat: cleanNumber(payload.destinationLat),
        destination_lng: cleanNumber(payload.destinationLng),
        waypoints: cleanWaypoints(payload.waypoints),
        geometry,
        distance_meters: cleanNumber(payload.distanceMeters),
        duration_seconds: cleanInteger(payload.durationSeconds),
        icon_code: cleanText(payload.iconCode, 60),
        color_token: cleanText(payload.colorToken, 60),
        tags: cleanStringArray(payload.tags),
        metadata: cleanObject(payload.metadata),
        source_page_id: cleanText(payload.sourcePageId, 80),
        source_seed_id: cleanText(payload.sourceSeedId, 80),
        created_by_user_id: auth.userId,
        updated_by_user_id: auth.userId,
      },
      gardenId,
    );

    const { data, error } = await auth.client
      .from("map_routes")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      if (isSchemaNotReadyError(error)) {
        return NextResponse.json(
          {
            error:
              "Falta aplicar la migración del mapa. Ejecuta 2026-03-15_map_domain_foundation.sql antes de guardar rutas.",
          },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: toErrorMessage(error, "No se pudo guardar la ruta.") },
        { status: 500 },
      );
    }

    return NextResponse.json({ route: data });
  } catch (error) {
    return NextResponse.json(
      { error: toErrorMessage(error, "No se pudo guardar la ruta.") },
      { status: 500 },
    );
  }
}
