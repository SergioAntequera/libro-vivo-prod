import { NextResponse } from "next/server";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import {
  isSchemaNotReadyError,
  resolveActiveGardenIdForUser,
  withGardenScope,
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
  if (shape.type !== "LineString") return null;
  return {
    type: "LineString" as const,
    coordinates: cleanCoordinates(shape.coordinates),
  };
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ routeId: string }> },
) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  try {
    const { routeId } = await context.params;
    const cleanRouteId = String(routeId ?? "").trim();
    if (!cleanRouteId) {
      return NextResponse.json({ error: "routeId invalido." }, { status: 400 });
    }

    const payload = (await req.json()) as Record<string, unknown>;
    const hasField = (field: string) => Object.prototype.hasOwnProperty.call(payload, field);
    const nextKind = cleanText(payload.kind, 40);
    const nextStatus = cleanText(payload.status, 40);
    const nextTravelMode = cleanText(payload.travelMode, 40);

    if (nextKind && !ALLOWED_KINDS.has(nextKind)) {
      return NextResponse.json({ error: "Tipo de ruta no válido." }, { status: 400 });
    }
    if (nextStatus && !ALLOWED_STATUSES.has(nextStatus)) {
      return NextResponse.json({ error: "Estado de ruta no válido." }, { status: 400 });
    }
    if (nextTravelMode && !ALLOWED_TRAVEL_MODES.has(nextTravelMode)) {
      return NextResponse.json({ error: "Modo de trayecto no válido." }, { status: 400 });
    }

    const gardenId = await resolveActiveGardenIdForUser({
      userId: auth.userId,
      client: auth.client,
    });

    if (!gardenId) {
      return NextResponse.json({ error: "No hay jardín activo para editar esta ruta." }, { status: 400 });
    }

    const nextGeometry = cleanLineString(payload.geometry);
    const updatePayload = {
      ...(hasField("kind") ? { kind: nextKind } : {}),
      ...(hasField("status") ? { status: nextStatus } : {}),
      ...(hasField("travelMode") ? { travel_mode: nextTravelMode } : {}),
      ...(hasField("title") ? { title: cleanText(payload.title, 160) } : {}),
      ...(hasField("subtitle") ? { subtitle: cleanText(payload.subtitle, 180) } : {}),
      ...(hasField("notes") ? { notes: cleanText(payload.notes, 2000) } : {}),
      ...(hasField("originLabel") ? { origin_label: cleanText(payload.originLabel, 160) } : {}),
      ...(hasField("destinationLabel")
        ? { destination_label: cleanText(payload.destinationLabel, 160) }
        : {}),
      ...(hasField("originLat") ? { origin_lat: cleanNumber(payload.originLat) } : {}),
      ...(hasField("originLng") ? { origin_lng: cleanNumber(payload.originLng) } : {}),
      ...(hasField("destinationLat")
        ? { destination_lat: cleanNumber(payload.destinationLat) }
        : {}),
      ...(hasField("destinationLng")
        ? { destination_lng: cleanNumber(payload.destinationLng) }
        : {}),
      ...(hasField("waypoints") ? { waypoints: cleanWaypoints(payload.waypoints) } : {}),
      ...(hasField("geometry") && nextGeometry ? { geometry: nextGeometry } : {}),
      ...(hasField("distanceMeters")
        ? { distance_meters: cleanNumber(payload.distanceMeters) }
        : {}),
      ...(hasField("durationSeconds")
        ? { duration_seconds: cleanInteger(payload.durationSeconds) }
        : {}),
      ...(hasField("iconCode") ? { icon_code: cleanText(payload.iconCode, 60) } : {}),
      ...(hasField("colorToken")
        ? { color_token: cleanText(payload.colorToken, 60) }
        : {}),
      ...(hasField("tags") ? { tags: cleanStringArray(payload.tags) } : {}),
      ...(hasField("metadata") ? { metadata: cleanObject(payload.metadata) } : {}),
      ...(hasField("archivedAt")
        ? { archived_at: cleanText(payload.archivedAt, 80) }
        : {}),
      updated_by_user_id: auth.userId,
    };

    const { data, error } = await withGardenScope(
      auth.client.from("map_routes"),
      gardenId,
    )
      .update(updatePayload)
      .eq("id", cleanRouteId)
      .is("archived_at", null)
      .select("*")
      .single();

    if (error) {
      if (isSchemaNotReadyError(error)) {
        return NextResponse.json(
          {
            error:
              "Falta aplicar la migración del mapa. Ejecuta 2026-03-15_map_domain_foundation.sql antes de editar rutas.",
          },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: toErrorMessage(error, "No se pudo actualizar la ruta.") },
        { status: 500 },
      );
    }

    return NextResponse.json({ route: data });
  } catch (error) {
    return NextResponse.json(
      { error: toErrorMessage(error, "No se pudo actualizar la ruta.") },
      { status: 500 },
    );
  }
}
