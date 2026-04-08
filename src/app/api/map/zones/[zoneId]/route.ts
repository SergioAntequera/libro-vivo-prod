import { NextResponse } from "next/server";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import {
  isSchemaNotReadyError,
  resolveActiveGardenIdForUser,
  withGardenScope,
} from "@/lib/gardens";
import {
  cleanNumber,
  cleanObject,
  cleanStringArray,
  cleanText,
  toErrorMessage,
} from "@/app/api/map/_shared";

const ALLOWED_KINDS = new Set([
  "symbolic",
  "favorite_area",
  "memory_area",
  "meeting_area",
  "avoid_area",
  "custom",
]);

const ALLOWED_STATUSES = new Set(["active", "archived"]);

function cleanGeoJson(value: unknown) {
  const shape = cleanObject(value);
  if (!shape.type || typeof shape.type !== "string") return null;
  return shape;
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ zoneId: string }> },
) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  try {
    const { zoneId } = await context.params;
    const cleanZoneId = String(zoneId ?? "").trim();
    if (!cleanZoneId) {
      return NextResponse.json({ error: "zoneId invalido." }, { status: 400 });
    }

    const payload = (await req.json()) as Record<string, unknown>;
    const hasField = (field: string) => Object.prototype.hasOwnProperty.call(payload, field);
    const nextKind = cleanText(payload.kind, 40);
    const nextStatus = cleanText(payload.status, 40);

    if (nextKind && !ALLOWED_KINDS.has(nextKind)) {
      return NextResponse.json({ error: "Tipo de zona no válido." }, { status: 400 });
    }
    if (nextStatus && !ALLOWED_STATUSES.has(nextStatus)) {
      return NextResponse.json({ error: "Estado de zona no válido." }, { status: 400 });
    }

    const gardenId = await resolveActiveGardenIdForUser({
      userId: auth.userId,
      client: auth.client,
    });

    if (!gardenId) {
      return NextResponse.json({ error: "No hay jardín activo para editar esta zona." }, { status: 400 });
    }

    const nextGeojson = cleanGeoJson(payload.geojson);
    const updatePayload = {
      ...(hasField("kind") ? { kind: nextKind } : {}),
      ...(hasField("status") ? { status: nextStatus } : {}),
      ...(hasField("title") ? { title: cleanText(payload.title, 160) } : {}),
      ...(hasField("subtitle") ? { subtitle: cleanText(payload.subtitle, 180) } : {}),
      ...(hasField("description")
        ? { description: cleanText(payload.description, 2000) }
        : {}),
      ...(hasField("geojson") && nextGeojson ? { geojson: nextGeojson } : {}),
      ...(hasField("centroidLat")
        ? { centroid_lat: cleanNumber(payload.centroidLat) }
        : {}),
      ...(hasField("centroidLng")
        ? { centroid_lng: cleanNumber(payload.centroidLng) }
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
      auth.client.from("map_zones"),
      gardenId,
    )
      .update(updatePayload)
      .eq("id", cleanZoneId)
      .is("archived_at", null)
      .select("*")
      .single();

    if (error) {
      if (isSchemaNotReadyError(error)) {
        return NextResponse.json(
          {
            error:
              "Falta aplicar la migración del mapa. Ejecuta 2026-03-15_map_domain_foundation.sql antes de editar zonas.",
          },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: toErrorMessage(error, "No se pudo actualizar la zona.") },
        { status: 500 },
      );
    }

    return NextResponse.json({ zone: data });
  } catch (error) {
    return NextResponse.json(
      { error: toErrorMessage(error, "No se pudo actualizar la zona.") },
      { status: 500 },
    );
  }
}
