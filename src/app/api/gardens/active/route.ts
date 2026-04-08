import { NextResponse } from "next/server";
import {
  isSchemaNotReadyError,
  setActiveGardenIdForUser,
} from "@/lib/gardens";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import { toErrorMessage } from "@/lib/errorMessage";

type SetActiveBody = {
  gardenId?: unknown;
};

type GardenStatusRow = {
  status?: unknown;
};

export async function PATCH(req: Request) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  let body: SetActiveBody = {};
  try {
    body = (await req.json()) as SetActiveBody;
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const gardenId =
    typeof body.gardenId === "string" && body.gardenId.trim().length > 0
      ? body.gardenId.trim()
      : null;

  if (gardenId) {
    const { data: membership, error: membershipError } = await auth.client
      .from("garden_members")
      .select("id")
      .eq("garden_id", gardenId)
      .eq("user_id", auth.userId)
      .is("left_at", null)
      .maybeSingle();

    if (membershipError && !isSchemaNotReadyError(membershipError)) {
      return NextResponse.json(
        {
          error: toErrorMessage(
            membershipError,
            "No se pudo validar la membresia del jardin.",
          ),
        },
        { status: 500 },
      );
    }

    if (!membership) {
      return NextResponse.json(
        { error: "No perteneces a ese jardin." },
        { status: 403 },
      );
    }

    const { data: gardenData, error: gardenError } = await auth.client
      .from("gardens")
      .select("status")
      .eq("id", gardenId)
      .maybeSingle();

    if (gardenError && !isSchemaNotReadyError(gardenError)) {
      return NextResponse.json(
        {
          error: toErrorMessage(
            gardenError,
            "No se pudo validar el estado del jardin.",
          ),
        },
        { status: 500 },
      );
    }

    const gardenStatus = String(
      ((gardenData as GardenStatusRow | null) ?? null)?.status ?? "",
    )
      .trim()
      .toLowerCase();

    if (gardenStatus === "archived") {
      return NextResponse.json(
        { error: "Ese jardin ya esta archivado y no puede quedar activo." },
        { status: 409 },
      );
    }
  }

  const ok = await setActiveGardenIdForUser({
    userId: auth.userId,
    gardenId,
    client: auth.client,
  }).catch((error) => {
    if (isSchemaNotReadyError(error)) return false;
    throw error;
  });

  if (!ok && gardenId) {
    return NextResponse.json(
      { error: "No se pudo actualizar el jardin activo." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, activeGardenId: gardenId });
}
