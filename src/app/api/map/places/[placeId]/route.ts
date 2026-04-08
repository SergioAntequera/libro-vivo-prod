import { NextResponse } from "next/server";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import {
  isSchemaNotReadyError,
  resolveActiveGardenIdForUser,
  withGardenScope,
} from "@/lib/gardens";
import { getAllowedMapPlaceKinds, getAllowedMapPlaceStates } from "@/lib/mapCatalogServer";
import { toErrorMessage } from "@/lib/errorMessage";

function cleanText(value: unknown, maxLength = 240) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ placeId: string }> },
) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  try {
    const { placeId } = await context.params;
    const cleanPlaceId = String(placeId ?? "").trim();
    if (!cleanPlaceId) {
      return NextResponse.json({ error: "placeId invalido." }, { status: 400 });
    }

    const payload = (await req.json()) as Record<string, unknown>;
    const nextKind = cleanText(payload.kind, 40);
    const nextState = cleanText(payload.state, 40);
    const [allowedKinds, allowedStates] = await Promise.all([
      getAllowedMapPlaceKinds(auth.client),
      getAllowedMapPlaceStates(auth.client),
    ]);

    if (nextKind && !allowedKinds.has(nextKind)) {
      return NextResponse.json({ error: "Tipo de lugar no válido." }, { status: 400 });
    }
    if (nextState && !allowedStates.has(nextState)) {
      return NextResponse.json({ error: "Estado de lugar no válido." }, { status: 400 });
    }

    const gardenId = await resolveActiveGardenIdForUser({
      userId: auth.userId,
      client: auth.client,
    });

    if (!gardenId) {
      return NextResponse.json({ error: "No hay jardín activo para editar este lugar." }, { status: 400 });
    }

    const updatePayload = {
      ...(nextKind ? { kind: nextKind } : {}),
      ...(nextState ? { state: nextState } : {}),
      ...(cleanText(payload.title, 160) ? { title: cleanText(payload.title, 160) } : {}),
      ...(cleanText(payload.subtitle, 180) ? { subtitle: cleanText(payload.subtitle, 180) } : {}),
      ...(cleanText(payload.notes, 2000) ? { notes: cleanText(payload.notes, 2000) } : {}),
      updated_by_user_id: auth.userId,
    };

    const { data, error } = await withGardenScope(
      auth.client.from("map_places"),
      gardenId,
    )
      .update(updatePayload)
      .eq("id", cleanPlaceId)
      .is("archived_at", null)
      .select("*")
      .single();

    if (error) {
      if (isSchemaNotReadyError(error)) {
        return NextResponse.json(
          {
            error:
              "Falta aplicar la migración del mapa. Ejecuta 2026-03-15_map_domain_foundation.sql antes de editar lugares.",
          },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: toErrorMessage(error, "No se pudo actualizar el lugar.") },
        { status: 500 },
      );
    }

    return NextResponse.json({ place: data });
  } catch (error) {
    return NextResponse.json(
      { error: toErrorMessage(error, "No se pudo actualizar el lugar.") },
      { status: 500 },
    );
  }
}
