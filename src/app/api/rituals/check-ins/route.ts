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
  normalizeAnnualTreeCheckInRow,
  type AnnualTreeCheckInRow,
  type AnnualTreeCheckInStatus,
} from "@/lib/annualTreeRitual";

function readStringValue(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumberValue(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
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
      return NextResponse.json({ checkIns: [] }, { status: 200 });
    }

    const { data, error } = await withGardenScope(
      auth.client
        .from("annual_tree_check_ins")
        .select("*")
        .order("milestone_year", { ascending: true }),
      gardenId,
    );

    if (error) {
      if (isSchemaNotReadyError(error)) {
        return NextResponse.json({ checkIns: [] }, { status: 200 });
      }
      return NextResponse.json(
        { error: toErrorMessage(error, "No se pudieron cargar los check-ins del arbol.") },
        { status: 500 },
      );
    }

    const checkIns = ((data as AnnualTreeCheckInRow[] | null) ?? []).map((row) =>
      normalizeAnnualTreeCheckInRow(row, row.id),
    );

    return NextResponse.json({ checkIns });
  } catch (error) {
    return NextResponse.json(
      { error: toErrorMessage(error, "No se pudieron cargar los check-ins del arbol.") },
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
    const ritualId = readStringValue(body, "ritualId");
    const milestoneYear = typeof body.milestoneYear === "number" ? body.milestoneYear : Number(body.milestoneYear);

    if (!ritualId) {
      return NextResponse.json({ error: "Falta ritualId." }, { status: 400 });
    }
    if (![1, 3, 5, 7, 10].includes(milestoneYear)) {
      return NextResponse.json({ error: "milestoneYear no valido." }, { status: 400 });
    }

    const status =
      body.status === "growing" ||
      body.status === "stable" ||
      body.status === "delicate" ||
      body.status === "lost" ||
      body.status === "dead" ||
      body.status === "replanted"
        ? (body.status as AnnualTreeCheckInStatus)
        : "growing";

    const upsertPayload = withGardenIdOnInsert(
      {
        ritual_id: ritualId,
        milestone_year: milestoneYear,
        observed_at: new Date().toISOString(),
        status,
        location_lat: readNumberValue(body, "locationLat"),
        location_lng: readNumberValue(body, "locationLng"),
        location_label: readStringValue(body, "locationLabel"),
        notes: readStringValue(body, "notes"),
        photo_url: readStringValue(body, "photoUrl"),
        created_by: auth.userId,
      },
      gardenId,
    );

    const { data, error } = await auth.client
      .from("annual_tree_check_ins")
      .upsert(upsertPayload, { onConflict: "ritual_id,milestone_year" })
      .select("*")
      .single();

    if (error) {
      if (isSchemaNotReadyError(error)) {
        return NextResponse.json(
          {
            error:
              "Falta la tabla annual_tree_check_ins. Ejecuta la SQL 2026-03-25_annual_tree_check_ins.sql para activar estos seguimientos.",
          },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: toErrorMessage(error, "No se pudo guardar el check-in del arbol.") },
        { status: 500 },
      );
    }

    return NextResponse.json({
      checkIn: normalizeAnnualTreeCheckInRow(data as AnnualTreeCheckInRow, (data as AnnualTreeCheckInRow).id),
    });
  } catch (error) {
    return NextResponse.json(
      { error: toErrorMessage(error, "No se pudo guardar el check-in del arbol.") },
      { status: 500 },
    );
  }
}
