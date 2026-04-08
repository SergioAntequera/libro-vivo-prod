import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import { toErrorMessage } from "@/lib/errorMessage";

type UpdateInvitationBody = {
  action?: unknown;
};

type InvitationRow = {
  id?: unknown;
  status?: unknown;
  invited_user_id?: unknown;
  invited_email?: unknown;
  invited_by_user_id?: unknown;
};

type SessionUserRow = {
  email?: string | null;
};

function normalizeAction(value: unknown) {
  const next = String(value ?? "").trim().toLowerCase();
  if (next === "reject") return "reject";
  if (next === "cancel") return "cancel";
  return null;
}

function normalizeInvitationRow(row: InvitationRow | null) {
  if (!row) return null;
  const id = String(row.id ?? "").trim();
  if (!id) return null;
  return {
    id,
    status: String(row.status ?? "").trim(),
    invitedUserId:
      typeof row.invited_user_id === "string" && row.invited_user_id.trim().length > 0
        ? row.invited_user_id.trim()
        : null,
    invitedEmail:
      typeof row.invited_email === "string" && row.invited_email.trim().length > 0
        ? row.invited_email.trim().toLowerCase()
        : null,
    invitedByUserId:
      typeof row.invited_by_user_id === "string" && row.invited_by_user_id.trim().length > 0
        ? row.invited_by_user_id.trim()
        : null,
  };
}

async function resolveSessionEmail(client: SupabaseClient) {
  const { data } = await client.auth.getUser();
  return String((data.user as SessionUserRow | null)?.email ?? "")
    .trim()
    .toLowerCase();
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const invitationId = String(id ?? "").trim();
  if (!invitationId) {
    return NextResponse.json({ error: "Falta id de invitación." }, { status: 400 });
  }

  let body: UpdateInvitationBody = {};
  try {
    body = (await req.json()) as UpdateInvitationBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const action = normalizeAction(body.action);
  if (!action) {
    return NextResponse.json(
      { error: "Acción inválida. Usa: reject | cancel." },
      { status: 400 },
    );
  }

  const { data: invitationRaw, error: invitationError } = await auth.client
    .from("garden_invitations")
    .select("id,status,invited_user_id,invited_email,invited_by_user_id")
    .eq("id", invitationId)
    .maybeSingle();

  if (invitationError) {
    return NextResponse.json(
      {
        error: toErrorMessage(invitationError, "No se pudo leer la invitación."),
      },
      { status: 500 },
    );
  }

  const invitation = normalizeInvitationRow((invitationRaw as InvitationRow | null) ?? null);
  if (!invitation) {
    return NextResponse.json({ error: "Invitación no encontrada." }, { status: 404 });
  }

  if (invitation.status !== "pending") {
    return NextResponse.json(
      { error: "La invitación ya no está pendiente." },
      { status: 400 },
    );
  }

  const actorId = auth.userId;
  const actorEmail = await resolveSessionEmail(auth.client).catch(() => "");

  if (action === "reject") {
    const allowedByUserId = invitation.invitedUserId !== null && invitation.invitedUserId === actorId;
    const allowedByEmail =
      invitation.invitedUserId === null &&
      invitation.invitedEmail !== null &&
      invitation.invitedEmail === actorEmail;

    if (!allowedByUserId && !allowedByEmail) {
      return NextResponse.json(
        { error: "No autorizado para rechazar esta invitación." },
        { status: 403 },
      );
    }

    const { error } = await auth.client
      .from("garden_invitations")
      .update({ status: "rejected" })
      .eq("id", invitation.id)
      .eq("status", "pending");

    if (error) {
      return NextResponse.json(
        { error: toErrorMessage(error, "No se pudo rechazar la invitación.") },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, status: "rejected" });
  }

  const isOwner = invitation.invitedByUserId === actorId;
  if (!isOwner) {
    return NextResponse.json(
      { error: "Solo quien envía puede cancelar la invitación." },
      { status: 403 },
    );
  }

  const { error } = await auth.client
    .from("garden_invitations")
    .update({ status: "revoked" })
    .eq("id", invitation.id)
    .eq("status", "pending");

  if (error) {
    return NextResponse.json(
      { error: toErrorMessage(error, "No se pudo cancelar la invitación.") },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, status: "revoked" });
}
