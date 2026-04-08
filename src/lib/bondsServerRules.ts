import type { SupabaseClient } from "@supabase/supabase-js";
import { toErrorMessage } from "@/lib/errorMessage";

type BondMemberRow = {
  bond_id?: unknown;
};

type BondRow = {
  id?: unknown;
};

type InvitationRow = {
  id?: unknown;
};

function normalizeId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function userHasActiveBondType(
  client: SupabaseClient,
  userId: string,
  bondType: string,
) {
  const normalizedUserId = normalizeId(userId);
  const normalizedBondType = String(bondType ?? "").trim().toLowerCase();
  if (!normalizedUserId || !normalizedBondType) return false;

  const { data: membershipData, error: membershipError } = await client
    .from("bond_members")
    .select("bond_id")
    .eq("user_id", normalizedUserId)
    .is("left_at", null);

  if (membershipError) {
    throw new Error(
      toErrorMessage(membershipError, "No se pudieron validar los vinculos activos."),
    );
  }

  const bondIds = [
    ...new Set(
      ((membershipData as BondMemberRow[] | null) ?? [])
        .map((row) => normalizeId(row.bond_id))
        .filter(Boolean),
    ),
  ];
  if (!bondIds.length) return false;

  const { data: bondData, error: bondError } = await client
    .from("bonds")
    .select("id")
    .in("id", bondIds)
    .eq("type", normalizedBondType)
    .eq("status", "active")
    .limit(1);

  if (bondError) {
    throw new Error(toErrorMessage(bondError, "No se pudieron validar los vinculos activos."));
  }

  return ((bondData as BondRow[] | null) ?? []).length > 0;
}

export async function userHasPendingBondInvitation(
  client: SupabaseClient,
  userId: string,
  bondType: string,
) {
  const normalizedUserId = normalizeId(userId);
  const normalizedBondType = String(bondType ?? "").trim().toLowerCase();
  if (!normalizedUserId || !normalizedBondType) return false;

  const { data, error } = await client
    .from("garden_invitations")
    .select("id")
    .eq("bond_type", normalizedBondType)
    .eq("status", "pending")
    .or(`invited_by_user_id.eq.${normalizedUserId},invited_user_id.eq.${normalizedUserId}`)
    .limit(1);

  if (error) {
    throw new Error(
      toErrorMessage(error, "No se pudieron validar las invitaciones pendientes."),
    );
  }

  return ((data as InvitationRow[] | null) ?? []).length > 0;
}
