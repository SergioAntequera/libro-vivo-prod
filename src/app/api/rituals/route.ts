import { NextResponse } from "next/server";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import {
  isSchemaNotReadyError,
  resolveActiveGardenIdForUser,
  withGardenIdOnInsert,
  withGardenScope,
} from "@/lib/gardens";
import { toErrorMessage } from "@/lib/errorMessage";
import {
  normalizeRitualRow,
  type AnnualTreeRitualRow,
  type AnnualTreeRitualStatus,
} from "@/lib/annualTreeRitual";

function readStringValue(
  body: Record<string, unknown>,
  camelKey: string,
  snakeKey: string,
) {
  const preferred = body[camelKey];
  if (typeof preferred === "string" && preferred.trim()) return preferred.trim();
  const legacy = body[snakeKey];
  if (typeof legacy === "string" && legacy.trim()) return legacy.trim();
  return null;
}

function readNumberValue(
  body: Record<string, unknown>,
  camelKey: string,
  snakeKey: string,
) {
  const preferred = body[camelKey];
  if (typeof preferred === "number" && Number.isFinite(preferred)) return preferred;
  const legacy = body[snakeKey];
  if (typeof legacy === "number" && Number.isFinite(legacy)) return legacy;
  return null;
}

export async function GET(req: Request) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  try {
    const gardenId = await resolveActiveGardenIdForUser({
      userId: auth.userId,
      client: auth.client,
    });
    if (!gardenId) {
      return NextResponse.json({ rituals: [] }, { status: 200 });
    }

    const searchParams = new URL(req.url).searchParams;
    const yearParam = Number(searchParams.get("year"));

    let query = withGardenScope(
      auth.client.from("annual_tree_rituals").select("*").order("year", { ascending: false }),
      gardenId,
    );

    if (Number.isInteger(yearParam) && yearParam >= 2000 && yearParam <= 3000) {
      query = query.eq("year", yearParam);
    }

    const { data, error } = await query;
    if (error) {
      if (isSchemaNotReadyError(error)) {
        return NextResponse.json({ rituals: [] }, { status: 200 });
      }
      return NextResponse.json(
        { error: toErrorMessage(error, "No se pudieron cargar los rituales.") },
        { status: 500 },
      );
    }

    const rituals = ((data as AnnualTreeRitualRow[] | null) ?? []).map((row) =>
      normalizeRitualRow(row, row.id),
    );

    return NextResponse.json({ rituals });
  } catch (error) {
    return NextResponse.json(
      { error: toErrorMessage(error, "No se pudieron cargar los rituales.") },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  try {
    const gardenId = await resolveActiveGardenIdForUser({
      userId: auth.userId,
      client: auth.client,
    });
    if (!gardenId) {
      return NextResponse.json({ error: "No hay jardin activo." }, { status: 400 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const currentYear = new Date().getFullYear();
    const yearRaw = typeof body.year === "number" ? body.year : Number(body.year);
    const year =
      Number.isInteger(yearRaw) && yearRaw >= 2000 && yearRaw <= 3000 ? yearRaw : currentYear;
    const locationLabel = readStringValue(body, "locationLabel", "location_label");
    const notes = readStringValue(body, "notes", "notes");
    const photoUrl = readStringValue(body, "photoUrl", "photo_url");
    const mapPlaceId = readStringValue(body, "mapPlaceId", "map_place_id");
    const locationLat = readNumberValue(body, "locationLat", "location_lat");
    const locationLng = readNumberValue(body, "locationLng", "location_lng");
    const nextStatus =
      body.status === "pending" || body.status === "planted" || body.status === "confirmed"
        ? (body.status as AnnualTreeRitualStatus)
        : "planted";

    const existingRes = await withGardenScope(
      auth.client.from("annual_tree_rituals").select("*").eq("year", year),
      gardenId,
    ).maybeSingle();

    if (existingRes.error && !isSchemaNotReadyError(existingRes.error)) {
      return NextResponse.json(
        { error: toErrorMessage(existingRes.error, "No se pudo preparar el ritual.") },
        { status: 500 },
      );
    }

    const existing = existingRes.data
      ? normalizeRitualRow(
          existingRes.data as AnnualTreeRitualRow,
          String((existingRes.data as AnnualTreeRitualRow).id ?? year),
        )
      : null;

    const plantedAt = existing?.planted_at ?? new Date().toISOString();
    const plantedBy = existing?.planted_by ?? auth.userId;
    const effectiveMapPlaceId = mapPlaceId ?? existing?.map_place_id ?? null;

    const upsertPayload = withGardenIdOnInsert(
      {
        year,
        status: nextStatus,
        planted_at: plantedAt,
        planted_by: plantedBy,
        location_lat: locationLat,
        location_lng: locationLng,
        location_label: locationLabel,
        map_place_id: effectiveMapPlaceId,
        notes,
        photo_url: photoUrl ?? existing?.photo_url ?? null,
      },
      gardenId,
    );

    const { data, error } = await auth.client
      .from("annual_tree_rituals")
      .upsert(upsertPayload, { onConflict: "garden_id,year" })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { error: toErrorMessage(error, "No se pudo registrar el ritual.") },
        { status: 500 },
      );
    }

    let ritual = normalizeRitualRow(data as AnnualTreeRitualRow, String((data as AnnualTreeRitualRow).id ?? year));

    if (ritual.map_place_id) {
      const placeUpdatePayload = {
        title: `Arbol de ${year}`,
        subtitle: locationLabel,
        lat: locationLat,
        lng: locationLng,
        notes: notes ?? `Arbol plantado para el año ${year}`,
        state: "active",
      };

      await auth.client.from("map_places").update(placeUpdatePayload).eq("id", ritual.map_place_id);
    } else if (locationLabel || (locationLat != null && locationLng != null)) {
      const placeInsert = await auth.client
        .from("map_places")
        .insert(
          withGardenIdOnInsert(
            {
              kind: "ritual_tree",
              state: "active",
              title: `Arbol de ${year}`,
              subtitle: locationLabel,
              lat: locationLat,
              lng: locationLng,
              notes: notes ?? `Arbol plantado para el año ${year}`,
              created_by: auth.userId,
            },
            gardenId,
          ),
        )
        .select("id")
        .single();

      if (!placeInsert.error && placeInsert.data?.id) {
        const { data: updatedRitual } = await auth.client
          .from("annual_tree_rituals")
          .update({ map_place_id: placeInsert.data.id })
          .eq("id", ritual.id)
          .select("*")
          .single();

        if (updatedRitual) {
          ritual = normalizeRitualRow(updatedRitual as AnnualTreeRitualRow, ritual.id);
        }
      }
    }

    return NextResponse.json({ ritual });
  } catch (error) {
    return NextResponse.json(
      { error: toErrorMessage(error, "No se pudo registrar el ritual.") },
      { status: 500 },
    );
  }
}
