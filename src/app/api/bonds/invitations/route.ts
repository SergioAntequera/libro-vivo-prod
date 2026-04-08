import { NextResponse } from "next/server";
import {
  isInviteCode,
  isLikelyEmail,
  normalizeBondType,
  normalizeEmail,
  normalizeInviteCode,
} from "@/lib/bonds";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import { toErrorMessage } from "@/lib/errorMessage";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import {
  userHasActiveBondType,
  userHasPendingBondInvitation,
} from "@/lib/bondsServerRules";

type CreateInvitationBody = {
  bondType?: unknown;
  gardenTitle?: unknown;
  targetInviteCode?: unknown;
  targetEmail?: unknown;
};

type InvitationRow = {
  id?: unknown;
  bond_type?: unknown;
  status?: unknown;
  expires_at?: unknown;
  created_at?: unknown;
  accepted_at?: unknown;
  garden_title?: unknown;
  invited_email?: unknown;
  invited_user_id?: unknown;
  invited_by_user_id?: unknown;
};

type CreateInvitationRpcRow = {
  invitation_id?: unknown;
  bond_type?: unknown;
  status?: unknown;
  invited_user_id?: unknown;
  invited_email?: unknown;
  expires_at?: unknown;
  garden_title?: unknown;
  target_name?: unknown;
  target_avatar_url?: unknown;
  target_invite_code?: unknown;
};

type ProfileInviteTargetRow = {
  id?: unknown;
};

const INVITATIONS_SELECT_WITH_GARDEN_TITLE =
  "id,bond_type,status,expires_at,created_at,accepted_at,garden_title,invited_email,invited_user_id,invited_by_user_id";
const INVITATIONS_SELECT_FALLBACK =
  "id,bond_type,status,expires_at,created_at,accepted_at,invited_email,invited_user_id,invited_by_user_id";

function isGardenTitleColumnMissing(error: unknown) {
  const message = toErrorMessage(error, "").toLowerCase();
  return (
    message.includes("garden_title") &&
    (message.includes("does not exist") ||
      message.includes("could not find") ||
      message.includes("not found"))
  );
}

function normalizeInvitationRow(raw: InvitationRow) {
  const id = String(raw.id ?? "").trim();
  if (!id) return null;
  return {
    id,
    bondType: String(raw.bond_type ?? "").trim(),
    status: String(raw.status ?? "").trim(),
    expiresAt: String(raw.expires_at ?? "").trim() || null,
    createdAt: String(raw.created_at ?? "").trim() || null,
    acceptedAt: String(raw.accepted_at ?? "").trim() || null,
    gardenTitle: String(raw.garden_title ?? "").trim() || null,
    invitedEmail:
      typeof raw.invited_email === "string" && raw.invited_email.trim().length > 0
        ? raw.invited_email.trim()
        : null,
    invitedUserId:
      typeof raw.invited_user_id === "string" && raw.invited_user_id.trim().length > 0
        ? raw.invited_user_id.trim()
        : null,
    invitedByUserId:
      typeof raw.invited_by_user_id === "string" && raw.invited_by_user_id.trim().length > 0
        ? raw.invited_by_user_id.trim()
        : null,
  };
}

function normalizeCreateResultRow(raw: CreateInvitationRpcRow | null) {
  if (!raw) return null;
  const invitationId = String(raw.invitation_id ?? "").trim();
  if (!invitationId) return null;
  return {
    invitationId,
    bondType: String(raw.bond_type ?? "").trim(),
    status: String(raw.status ?? "").trim(),
    invitedUserId:
      typeof raw.invited_user_id === "string" && raw.invited_user_id.trim().length > 0
        ? raw.invited_user_id.trim()
        : null,
    invitedEmail:
      typeof raw.invited_email === "string" && raw.invited_email.trim().length > 0
        ? raw.invited_email.trim()
        : null,
    expiresAt: String(raw.expires_at ?? "").trim() || null,
    gardenTitle: String(raw.garden_title ?? "").trim() || null,
    targetProfile:
      typeof raw.invited_user_id === "string" && raw.invited_user_id.trim().length > 0
        ? {
            id: raw.invited_user_id.trim(),
            name:
              typeof raw.target_name === "string" && raw.target_name.trim().length > 0
                ? raw.target_name.trim()
                : "Usuario",
            avatarUrl:
              typeof raw.target_avatar_url === "string" &&
              raw.target_avatar_url.trim().length > 0
                ? raw.target_avatar_url.trim()
                : null,
            inviteCode:
              typeof raw.target_invite_code === "string" &&
              raw.target_invite_code.trim().length > 0
                ? raw.target_invite_code.trim()
                : null,
          }
        : null,
  };
}

function normalizeGardenTitle(value: unknown) {
  const title = String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (!title) return "";
  return title.slice(0, 80);
}

export async function GET(req: Request) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.client
    .from("garden_invitations")
    .select(INVITATIONS_SELECT_WITH_GARDEN_TITLE)
    .order("created_at", { ascending: false })
    .limit(200);

  let rowsData: unknown = data;
  let rowsError = error;

  if (rowsError && isGardenTitleColumnMissing(rowsError)) {
    const fallback = await auth.client
      .from("garden_invitations")
      .select(INVITATIONS_SELECT_FALLBACK)
      .order("created_at", { ascending: false })
      .limit(200);
    rowsData = fallback.data;
    rowsError = fallback.error;
  }

  if (rowsError) {
    return NextResponse.json(
      {
        error: toErrorMessage(rowsError, "No se pudieron cargar las invitaciones. Revisa RLS y migraciones."),
      },
      { status: 500 },
    );
  }

  const rows =
    ((rowsData as InvitationRow[] | null) ?? [])
      .map((row) => normalizeInvitationRow(row))
      .filter((row): row is NonNullable<ReturnType<typeof normalizeInvitationRow>> => row !== null);

  return NextResponse.json({ invitations: rows });
}

export async function POST(req: Request) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  let body: CreateInvitationBody = {};
  try {
    body = (await req.json()) as CreateInvitationBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const bondType = normalizeBondType(body.bondType);
  if (!bondType) {
    return NextResponse.json({ error: "Tipo de vínculo inválido." }, { status: 400 });
  }

  const targetInviteCode = normalizeInviteCode(body.targetInviteCode);
  const hasTargetCode = isInviteCode(targetInviteCode);
  const targetEmail = normalizeEmail(body.targetEmail);
  const hasTargetEmail = isLikelyEmail(targetEmail);
  const gardenTitle = normalizeGardenTitle(body.gardenTitle);

  if (!hasTargetCode && !hasTargetEmail) {
    return NextResponse.json(
      { error: "Indica un código exacto de 8 caracteres o un email válido." },
      { status: 400 },
    );
  }

  if (gardenTitle) {
    const adminClient = getSupabaseAdminClient();
    const { error: gardenTitleColumnError } = await adminClient
      .from("garden_invitations")
      .select("garden_title")
      .limit(1);

    if (gardenTitleColumnError && isGardenTitleColumnMissing(gardenTitleColumnError)) {
      return NextResponse.json(
        {
          error:
            "Falta aplicar la migracion SQL para guardar el nombre del jardin en las invitaciones.",
        },
        { status: 500 },
      );
    }

    if (gardenTitleColumnError) {
      return NextResponse.json(
        {
          error: toErrorMessage(
            gardenTitleColumnError,
            "No se pudo validar el soporte de nombre de jardin en invitaciones.",
          ),
        },
        { status: 500 },
      );
    }
  }

  if (bondType === "pareja") {
    try {
      const adminClient = getSupabaseAdminClient();
      const targetProfile =
        hasTargetCode
          ? await adminClient
              .from("profiles")
              .select("id")
              .eq("invite_code", targetInviteCode)
              .maybeSingle()
          : null;
      if (targetProfile?.error) {
        throw new Error(
          toErrorMessage(targetProfile.error, "No se pudo validar el codigo de destino."),
        );
      }
      const targetUserId =
        typeof (targetProfile?.data as ProfileInviteTargetRow | null)?.id === "string"
          ? ((targetProfile?.data as ProfileInviteTargetRow).id as string).trim()
          : "";

      const [hasActiveCouple, hasPendingCouple, targetHasActiveCouple] = await Promise.all([
        userHasActiveBondType(adminClient, auth.userId, "pareja"),
        userHasPendingBondInvitation(adminClient, auth.userId, "pareja"),
        targetUserId
          ? userHasActiveBondType(adminClient, targetUserId, "pareja")
          : Promise.resolve(false),
      ]);

      if (hasActiveCouple || targetHasActiveCouple) {
        return NextResponse.json(
          {
            error:
              "El jardin de pareja es unico por persona. Uno de los dos ya tiene una pareja activa.",
          },
          { status: 409 },
        );
      }

      if (hasPendingCouple) {
        return NextResponse.json(
          {
            error:
              "Ya hay una invitacion de pareja pendiente. Cancelala o espera respuesta antes de crear otra.",
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

  const { data, error } = await auth.client.rpc("create_private_garden_invitation", {
    p_bond_type: bondType,
    p_target_invite_code: hasTargetCode ? targetInviteCode : null,
    p_target_email: hasTargetEmail ? targetEmail : null,
  });

  if (error) {
    return NextResponse.json(
      {
        error: toErrorMessage(error, "No se pudo crear la invitación privada."),
      },
      { status: 400 },
    );
  }

  const row = Array.isArray(data) ? (data[0] as CreateInvitationRpcRow | undefined) : null;
  const invitation = normalizeCreateResultRow(row ?? null);
  if (!invitation) {
    return NextResponse.json(
      { error: "No se pudo normalizar la invitación creada." },
      { status: 500 },
    );
  }

  if (gardenTitle) {
    const adminClient = getSupabaseAdminClient();
    const { error: updateError } = await adminClient
      .from("garden_invitations")
      .update({ garden_title: gardenTitle })
      .eq("id", invitation.invitationId)
      .eq("invited_by_user_id", auth.userId);

    if (updateError) {
      return NextResponse.json(
        {
          error: toErrorMessage(
            updateError,
            "No se pudo guardar el nombre del jardin en la invitacion.",
          ),
        },
        { status: 500 },
      );
    }
    invitation.gardenTitle = gardenTitle;
  }

  return NextResponse.json({ invitation });
}
