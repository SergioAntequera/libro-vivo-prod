import { NextResponse } from "next/server";
import {
  isSchemaNotReadyError,
  listGardenMembershipsForUser,
  setActiveGardenIdForUser,
} from "@/lib/gardens";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import { toErrorMessage } from "@/lib/errorMessage";

type GardenRow = {
  id?: unknown;
  bond_id?: unknown;
  title?: unknown;
  theme?: unknown;
  status?: unknown;
  created_at?: unknown;
};

type BondRow = {
  id?: unknown;
  type?: unknown;
};

type ProfileRow = {
  active_garden_id?: unknown;
};

type GardenMemberRow = {
  garden_id?: unknown;
  user_id?: unknown;
  member_role?: unknown;
};

type ParticipantProfileRow = {
  id?: unknown;
  name?: unknown;
  avatar_url?: unknown;
};

function normalizeId(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

export async function GET(req: Request) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  const memberships = await listGardenMembershipsForUser(auth.userId, auth.client).catch(
    (error) => {
      if (isSchemaNotReadyError(error)) return [];
      throw error;
    },
  );

  const gardenIds = memberships.map((item) => item.gardenId);
  let gardenRows: GardenRow[] = [];
  if (gardenIds.length) {
    const { data, error } = await auth.client
      .from("gardens")
      .select("id,bond_id,title,theme,status,created_at")
      .in("id", gardenIds);

    if (error && !isSchemaNotReadyError(error)) {
      return NextResponse.json(
        { error: toErrorMessage(error, "No se pudieron cargar jardines.") },
        { status: 500 },
      );
    }
    gardenRows = ((data as GardenRow[] | null) ?? []);
  }

  const bondIds = [
    ...new Set(
      gardenRows
        .map((row) => (typeof row.bond_id === "string" ? row.bond_id.trim() : ""))
        .filter(Boolean),
    ),
  ];
  let bondRows: BondRow[] = [];
  if (bondIds.length) {
    const { data, error } = await auth.client
      .from("bonds")
      .select("id,type")
      .in("id", bondIds);

    if (error && !isSchemaNotReadyError(error)) {
      return NextResponse.json(
        { error: toErrorMessage(error, "No se pudieron cargar vinculos.") },
        { status: 500 },
      );
    }
    bondRows = ((data as BondRow[] | null) ?? []);
  }

  let participantRows: GardenMemberRow[] = [];
  let participantProfiles: ParticipantProfileRow[] = [];
  if (gardenIds.length) {
    try {
      const adminClient = getSupabaseAdminClient();
      const { data: membersData, error: membersError } = await adminClient
        .from("garden_members")
        .select("garden_id,user_id,member_role,left_at")
        .in("garden_id", gardenIds)
        .is("left_at", null);

      if (!membersError) {
        participantRows = ((membersData as GardenMemberRow[] | null) ?? []);
        const profileIds = [
          ...new Set(
            participantRows
              .map((row) => normalizeId(row.user_id))
              .filter(Boolean),
          ),
        ];
        if (profileIds.length) {
          const { data: profileRows, error: participantProfilesError } = await adminClient
            .from("profiles")
            .select("id,name,avatar_url")
            .in("id", profileIds);
          if (!participantProfilesError) {
            participantProfiles = ((profileRows as ParticipantProfileRow[] | null) ?? []);
          }
        }
      }
    } catch {
      // Best effort: participant context is additive UX, gardens still load without it.
    }
  }

  const { data: profileData, error: profileError } = await auth.client
    .from("profiles")
    .select("active_garden_id")
    .eq("id", auth.userId)
    .maybeSingle();

  if (profileError && !isSchemaNotReadyError(profileError)) {
    return NextResponse.json(
      {
        error: toErrorMessage(
          profileError,
          "No se pudo leer jardín activo del perfil.",
        ),
      },
      { status: 500 },
    );
  }

  const gardenById = new Map<string, GardenRow>();
  for (const row of gardenRows) {
    const id = String(row.id ?? "").trim();
    if (id) gardenById.set(id, row);
  }
  const bondTypeById = new Map<string, string>();
  for (const row of bondRows) {
    const id = String(row.id ?? "").trim();
    const type = String(row.type ?? "").trim();
    if (id && type) bondTypeById.set(id, type);
  }
  const profileById = new Map<string, ParticipantProfileRow>();
  for (const row of participantProfiles) {
    const id = normalizeId(row.id);
    if (id) profileById.set(id, row);
  }
  const participantsByGardenId = new Map<
    string,
    Array<{
      id: string;
      name: string;
      avatarUrl: string | null;
      role: string;
      isCurrentUser: boolean;
    }>
  >();
  for (const row of participantRows) {
    const gardenId = normalizeId(row.garden_id);
    const userId = normalizeId(row.user_id);
    if (!gardenId || !userId) continue;
    const profile = profileById.get(userId);
    const current = participantsByGardenId.get(gardenId) ?? [];
    current.push({
      id: userId,
      name: normalizeText(profile?.name) || "Perfil privado",
      avatarUrl: normalizeText(profile?.avatar_url) || null,
      role: normalizeText(row.member_role) || "member",
      isCurrentUser: userId === auth.userId,
    });
    participantsByGardenId.set(gardenId, current);
  }

  const gardens = memberships
    .map((membership) => {
      const row = gardenById.get(membership.gardenId);
      return {
        id: membership.gardenId,
        title:
          typeof row?.title === "string" && row.title.trim().length > 0
            ? row.title.trim()
            : "Jardín sin título",
        theme:
          typeof row?.theme === "string" && row.theme.trim().length > 0
            ? row.theme.trim()
            : null,
        status:
          typeof row?.status === "string" && row.status.trim().length > 0
            ? row.status.trim()
            : "active",
        bondType:
          typeof row?.bond_id === "string" && row.bond_id.trim().length > 0
            ? bondTypeById.get(row.bond_id.trim()) ?? null
            : null,
        createdAt:
          typeof row?.created_at === "string" && row.created_at.trim().length > 0
            ? row.created_at.trim()
            : null,
        memberRole: membership.memberRole,
        joinedAt: membership.joinedAt,
        participants: (participantsByGardenId.get(membership.gardenId) ?? []).sort((left, right) =>
          left.isCurrentUser === right.isCurrentUser
            ? left.name.localeCompare(right.name, "es")
            : left.isCurrentUser
              ? -1
              : 1,
        ),
      };
    })
    .sort((a, b) => String(b.joinedAt).localeCompare(String(a.joinedAt)));

  const selectableGardenIds = new Set(
    gardens.filter((garden) => garden.status !== "archived").map((garden) => garden.id),
  );

  const profile = (profileData as ProfileRow | null) ?? null;
  const rawActiveGardenId =
    typeof profile?.active_garden_id === "string" &&
    profile.active_garden_id.trim().length > 0
      ? profile.active_garden_id.trim()
      : null;
  const normalizedActiveGardenId =
    rawActiveGardenId && selectableGardenIds.has(rawActiveGardenId)
      ? rawActiveGardenId
      : gardens.find((garden) => garden.status !== "archived")?.id ?? null;

  if (normalizedActiveGardenId !== rawActiveGardenId) {
    await setActiveGardenIdForUser({
      userId: auth.userId,
      gardenId: normalizedActiveGardenId,
      client: auth.client,
    }).catch(() => {
      // Best effort; response still returns normalized value for client consistency.
    });
  }

  return NextResponse.json({
    activeGardenId: normalizedActiveGardenId,
    gardens,
  });
}
