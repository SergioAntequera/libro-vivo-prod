import { NextResponse } from "next/server";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import {
  isSchemaNotReadyError,
  resolveActiveGardenIdForUser,
  withGardenScope,
  withGardenIdOnInsert,
} from "@/lib/gardens";
import { toErrorMessage } from "@/lib/errorMessage";
import {
  computeOpensAtDate,
  isCapsuleReady,
  normalizeCapsuleRow,
  normalizeTimeCapsuleContentBlocks,
  TIME_CAPSULE_WINDOWS,
  type TimeCapsuleRow,
  type TimeCapsuleWindow,
} from "@/lib/timeCapsuleModel";
import { ANNUAL_CAPSULE_MAX_PER_YEAR } from "@/lib/futureMomentsConfig";

export async function GET(req: Request) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  try {
    const gardenId = await resolveActiveGardenIdForUser({
      userId: auth.userId,
      client: auth.client,
    });
    if (!gardenId) {
      return NextResponse.json({ capsules: [] }, { status: 200 });
    }

    const { data, error } = await withGardenScope(
      auth.client
        .from("time_capsules")
        .select("*")
        .order("opens_at", { ascending: true }),
      gardenId,
    );

    if (error) {
      if (isSchemaNotReadyError(error)) {
        return NextResponse.json({ capsules: [] }, { status: 200 });
      }
      return NextResponse.json(
        { error: toErrorMessage(error, "No se pudieron cargar las capsulas.") },
        { status: 500 },
      );
    }

    const capsules = ((data as TimeCapsuleRow[] | null) ?? []).map((row) =>
      normalizeCapsuleRow(row, row.id),
    );

    const readyIds: string[] = [];
    for (const capsule of capsules) {
      if (capsule.status === "sealed" && isCapsuleReady(capsule)) {
        readyIds.push(capsule.id);
        capsule.status = "ready";
      }
    }
    if (readyIds.length > 0) {
      await auth.client.from("time_capsules").update({ status: "ready" }).in("id", readyIds);
    }

    return NextResponse.json({ capsules });
  } catch (error) {
    return NextResponse.json(
      { error: toErrorMessage(error, "No se pudieron cargar las capsulas.") },
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
      return NextResponse.json(
        { error: "No hay jardin activo. Crea o unete a un jardin primero." },
        { status: 400 },
      );
    }

    const capsuleYear = new Date().getUTCFullYear();
    const yearStart = `${capsuleYear}-01-01T00:00:00.000Z`;
    const nextYearStart = `${capsuleYear + 1}-01-01T00:00:00.000Z`;
    const existingCapsuleRes = await withGardenScope(
      auth.client
        .from("time_capsules")
        .select("id,title,sealed_at")
        .gte("sealed_at", yearStart)
        .lt("sealed_at", nextYearStart)
        .limit(1),
      gardenId,
    );

    if (existingCapsuleRes.error && !isSchemaNotReadyError(existingCapsuleRes.error)) {
      return NextResponse.json(
        {
          error: toErrorMessage(
            existingCapsuleRes.error,
            "No se pudo comprobar la capsula anual.",
          ),
        },
        { status: 500 },
      );
    }

    if (
      ((existingCapsuleRes.data as Array<{ id: string }> | null) ?? []).length >=
      ANNUAL_CAPSULE_MAX_PER_YEAR
    ) {
      return NextResponse.json(
        {
          error: `Ya existe una capsula anual para ${capsuleYear}. Solo puede haber una por jardin y por año.`,
        },
        { status: 409 },
      );
    }

    const body = await req.json();
    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : "Capsula del tiempo";
    const windowCode: TimeCapsuleWindow =
      typeof body.windowCode === "string" &&
      TIME_CAPSULE_WINDOWS.some((w) => w.code === body.windowCode)
        ? (body.windowCode as TimeCapsuleWindow)
        : "1y";
    const contentBlocks = normalizeTimeCapsuleContentBlocks(body.contentBlocks).filter((block) => {
      const value = block.value.trim();
      const mediaUrl = String(block.mediaUrl ?? "").trim();
      const hasCanvas = Array.isArray(block.canvasObjects) && block.canvasObjects.length > 0;
      return value.length > 0 || mediaUrl.length > 0 || hasCanvas;
    });
    const flowerFamily = typeof body.flowerFamily === "string" ? body.flowerFamily : null;
    const locationLat =
      typeof body.locationLat === "number" && Number.isFinite(body.locationLat)
        ? body.locationLat
        : null;
    const locationLng =
      typeof body.locationLng === "number" && Number.isFinite(body.locationLng)
        ? body.locationLng
        : null;
    const locationLabel =
      typeof body.locationLabel === "string" && body.locationLabel.trim()
        ? body.locationLabel.trim()
        : null;

    const sealedAt = new Date().toISOString();
    const opensAt = computeOpensAtDate(sealedAt, windowCode);

    const insertPayload = withGardenIdOnInsert(
      {
        title,
        sealed_at: sealedAt,
        opens_at: opensAt,
        status: "sealed",
        window_code: windowCode,
        content_blocks: contentBlocks,
        sealed_by: auth.userId,
        flower_family: flowerFamily,
        location_lat: locationLat,
        location_lng: locationLng,
        location_label: locationLabel,
      },
      gardenId,
    );

    const { data, error } = await auth.client
      .from("time_capsules")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { error: toErrorMessage(error, "No se pudo crear la capsula.") },
        { status: 500 },
      );
    }

    await withGardenScope(
      auth.client.from("time_capsule_drafts").delete().eq("capsule_year", capsuleYear),
      gardenId,
    );

    return NextResponse.json({
      capsule: normalizeCapsuleRow(data as TimeCapsuleRow, (data as TimeCapsuleRow).id),
    });
  } catch (error) {
    return NextResponse.json(
      { error: toErrorMessage(error, "No se pudo crear la capsula.") },
      { status: 500 },
    );
  }
}
