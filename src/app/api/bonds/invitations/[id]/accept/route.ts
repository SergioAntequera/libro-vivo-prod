import { NextResponse } from "next/server";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import { toErrorMessage } from "@/lib/errorMessage";
import { setActiveGardenIdForUser } from "@/lib/gardens";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { userHasActiveBondType } from "@/lib/bondsServerRules";

type AcceptBody = {
  gardenTitle?: unknown;
  gardenTheme?: unknown;
};

type AcceptResultRow = {
  invitation_id?: unknown;
  bond_id?: unknown;
  garden_id?: unknown;
  bond_type?: unknown;
  garden_title?: unknown;
  out_invitation_id?: unknown;
  out_bond_id?: unknown;
  out_garden_id?: unknown;
  out_bond_type?: unknown;
  out_garden_title?: unknown;
};

type InvitationForAcceptRow = {
  bond_type?: unknown;
  garden_title?: unknown;
  invited_by_user_id?: unknown;
};

function isAmbiguousColumnError(error: unknown, columnName: string) {
  const message = toErrorMessage(error, "").toLowerCase();
  return (
    message.includes("is ambiguous") &&
    message.includes("column reference") &&
    message.includes(columnName.toLowerCase())
  );
}

function isGardenTitleColumnMissing(error: unknown) {
  const message = toErrorMessage(error, "").toLowerCase();
  return (
    message.includes("garden_title") &&
    (message.includes("does not exist") ||
      message.includes("could not find") ||
      message.includes("not found"))
  );
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const invitationId = String(id ?? "").trim();
  if (!invitationId) {
    return NextResponse.json({ error: "Falta id de invitación." }, { status: 400 });
  }

  let body: AcceptBody = {};
  try {
    body = (await req.json()) as AcceptBody;
  } catch {
    // Body opcional.
  }

  const gardenTitle = typeof body.gardenTitle === "string" ? body.gardenTitle.trim() : "";
  const gardenTheme = typeof body.gardenTheme === "string" ? body.gardenTheme.trim() : "";
  const adminClient = getSupabaseAdminClient();

  const { data: invitationDataWithTitle, error: invitationErrorWithTitle } = await adminClient
    .from("garden_invitations")
    .select("bond_type,garden_title,invited_by_user_id")
    .eq("id", invitationId)
    .maybeSingle();

  let invitationData: unknown = invitationDataWithTitle;
  let invitationError = invitationErrorWithTitle;

  if (invitationError && isGardenTitleColumnMissing(invitationError)) {
    const fallback = await adminClient
      .from("garden_invitations")
      .select("bond_type,invited_by_user_id")
      .eq("id", invitationId)
      .maybeSingle();
    invitationData = fallback.data;
    invitationError = fallback.error;
  }

  if (invitationError) {
    return NextResponse.json(
      {
        error: toErrorMessage(
          invitationError,
          "No se pudo validar la invitacion antes de aceptarla.",
        ),
      },
      { status: 500 },
    );
  }

  const invitationForAccept = (invitationData as InvitationForAcceptRow | null) ?? null;
  const inviterUserId =
    typeof invitationForAccept?.invited_by_user_id === "string"
      ? invitationForAccept.invited_by_user_id.trim()
      : "";
  const storedGardenTitle =
    typeof invitationForAccept?.garden_title === "string"
      ? invitationForAccept.garden_title.trim()
      : "";

  if (String(invitationForAccept?.bond_type ?? "").trim() === "pareja" && inviterUserId) {
    try {
      const [actorHasCouple, inviterHasCouple] = await Promise.all([
        userHasActiveBondType(adminClient, auth.userId, "pareja"),
        userHasActiveBondType(adminClient, inviterUserId, "pareja"),
      ]);

      if (actorHasCouple || inviterHasCouple) {
        return NextResponse.json(
          {
            error:
              "No se puede aceptar esta invitacion porque el jardin de pareja es unico por persona.",
          },
          { status: 409 },
        );
      }
    } catch (error) {
      return NextResponse.json(
        {
          error: toErrorMessage(
            error,
            "No se pudo validar si ya existe un jardin de pareja.",
          ),
        },
        { status: 500 },
      );
    }
  }

  const { data, error } = await auth.client.rpc("accept_private_garden_invitation", {
    p_invitation_id: invitationId,
    p_garden_title: gardenTitle || storedGardenTitle || null,
    p_garden_theme: gardenTheme || null,
  });

  if (error) {
    if (isAmbiguousColumnError(error, "bond_id") || isAmbiguousColumnError(error, "garden_id")) {
      const dbMessage = toErrorMessage(error, "column reference bond_id/garden_id is ambiguous");
      return NextResponse.json(
        {
          error: `Falta aplicar la migración SQL de hotfix para vínculos privados (ambiguous bond_id/garden_id). Detalle DB: ${dbMessage}`,
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      {
        error: toErrorMessage(error, "No se pudo aceptar la invitación."),
      },
      { status: 400 },
    );
  }

  const row = Array.isArray(data) ? (data[0] as AcceptResultRow | undefined) : null;
  if (!row) {
    return NextResponse.json(
      { error: "No se recibió resultado de aceptación." },
      { status: 500 },
    );
  }

  const gardenId = String(row.garden_id ?? row.out_garden_id ?? "").trim();
  if (!gardenId) {
    return NextResponse.json(
      { error: "No se recibio garden_id al aceptar la invitacion." },
      { status: 500 },
    );
  }

  try {
    await setActiveGardenIdForUser({
      userId: auth.userId,
      gardenId,
      client: adminClient,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: toErrorMessage(
          error,
          "Se acepto la invitacion, pero no se pudo fijar el jardin activo.",
        ),
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    accepted: {
      invitationId: String(row.invitation_id ?? row.out_invitation_id ?? "").trim(),
      bondId: String(row.bond_id ?? row.out_bond_id ?? "").trim(),
      gardenId,
      bondType: String(row.bond_type ?? row.out_bond_type ?? "").trim(),
      gardenTitle: String(row.garden_title ?? row.out_garden_title ?? "").trim() || null,
    },
  });
}
