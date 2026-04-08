import { NextResponse } from "next/server";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import {
  isSchemaNotReadyError,
  resolveActiveGardenIdForUser,
  withGardenIdOnInsert,
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

export async function POST(req: Request) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  try {
    const payload = (await req.json()) as Record<string, unknown>;
    const title = cleanText(payload.title, 160);
    const kind = cleanText(payload.kind, 40) ?? "symbolic";
    const status = cleanText(payload.status, 40) ?? "active";
    const geojson = cleanGeoJson(payload.geojson);

    if (!title) {
      return NextResponse.json({ error: "La zona necesita un título." }, { status: 400 });
    }
    if (!geojson) {
      return NextResponse.json({ error: "La zona necesita una geometria valida." }, { status: 400 });
    }
    if (!ALLOWED_KINDS.has(kind)) {
      return NextResponse.json({ error: "Tipo de zona no válido." }, { status: 400 });
    }
    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ error: "Estado de zona no válido." }, { status: 400 });
    }

    const gardenId = await resolveActiveGardenIdForUser({
      userId: auth.userId,
      client: auth.client,
    });

    if (!gardenId) {
      return NextResponse.json({ error: "No hay jardín activo para guardar esta zona." }, { status: 400 });
    }

    const insertPayload = withGardenIdOnInsert(
      {
        title,
        subtitle: cleanText(payload.subtitle, 180),
        description: cleanText(payload.description, 2000),
        kind,
        status,
        geojson,
        centroid_lat: cleanNumber(payload.centroidLat),
        centroid_lng: cleanNumber(payload.centroidLng),
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
      .from("map_zones")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      if (isSchemaNotReadyError(error)) {
        return NextResponse.json(
          {
            error:
              "Falta aplicar la migración del mapa. Ejecuta 2026-03-15_map_domain_foundation.sql antes de guardar zonas.",
          },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: toErrorMessage(error, "No se pudo guardar la zona.") },
        { status: 500 },
      );
    }

    return NextResponse.json({ zone: data });
  } catch (error) {
    return NextResponse.json(
      { error: toErrorMessage(error, "No se pudo guardar la zona.") },
      { status: 500 },
    );
  }
}
