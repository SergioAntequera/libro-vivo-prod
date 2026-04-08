import { NextResponse } from "next/server";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import {
  isSchemaNotReadyError,
  resolveActiveGardenIdForUser,
  withGardenIdOnInsert,
} from "@/lib/gardens";
import { getAllowedMapPlaceKinds, getAllowedMapPlaceStates } from "@/lib/mapCatalogServer";
import { toErrorMessage } from "@/lib/errorMessage";

function cleanText(value: unknown, maxLength = 240) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

function cleanNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((entry) => String(entry ?? "").trim()).filter(Boolean).slice(0, 24)
    : [];
}

export async function POST(req: Request) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  try {
    const payload = (await req.json()) as Record<string, unknown>;
    const title = cleanText(payload.title, 160);
    const lat = cleanNumber(payload.lat);
    const lng = cleanNumber(payload.lng);
    const kind = cleanText(payload.kind, 40) ?? "spot";
    const state = cleanText(payload.state, 40) ?? "saved";
    const [allowedKinds, allowedStates] = await Promise.all([
      getAllowedMapPlaceKinds(auth.client),
      getAllowedMapPlaceStates(auth.client),
    ]);

    if (!title) {
      return NextResponse.json({ error: "El lugar necesita un título." }, { status: 400 });
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: "Coordenadas invalidas." }, { status: 400 });
    }
    if (!allowedKinds.has(kind)) {
      return NextResponse.json({ error: "Tipo de lugar no válido." }, { status: 400 });
    }
    if (!allowedStates.has(state)) {
      return NextResponse.json({ error: "Estado de lugar no válido." }, { status: 400 });
    }

    const gardenId = await resolveActiveGardenIdForUser({
      userId: auth.userId,
      client: auth.client,
    });

    if (!gardenId) {
      return NextResponse.json({ error: "No hay jardín activo para guardar este lugar." }, { status: 400 });
    }

    const insertPayload = withGardenIdOnInsert(
      {
        title,
        subtitle: cleanText(payload.subtitle, 180),
        notes: cleanText(payload.notes, 2000),
        address_label: cleanText(payload.addressLabel, 240),
        lat,
        lng,
        kind,
        state,
        rating: cleanNumber(payload.rating),
        icon_code: cleanText(payload.iconCode, 60),
        color_token: cleanText(payload.colorToken, 60),
        tags: cleanStringArray(payload.tags),
        metadata:
          payload.metadata && typeof payload.metadata === "object" && !Array.isArray(payload.metadata)
            ? payload.metadata
            : {},
        source_page_id: cleanText(payload.sourcePageId, 80),
        source_seed_id: cleanText(payload.sourceSeedId, 80),
        created_by_user_id: auth.userId,
        updated_by_user_id: auth.userId,
      },
      gardenId,
    );

    const { data, error } = await auth.client
      .from("map_places")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      if (isSchemaNotReadyError(error)) {
        return NextResponse.json(
          {
            error:
              "Falta aplicar la migración del mapa. Ejecuta 2026-03-15_map_domain_foundation.sql antes de guardar lugares.",
          },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: toErrorMessage(error, "No se pudo guardar el lugar.") },
        { status: 500 },
      );
    }

    return NextResponse.json({ place: data });
  } catch (error) {
    return NextResponse.json(
      { error: toErrorMessage(error, "No se pudo guardar el lugar.") },
      { status: 500 },
    );
  }
}
