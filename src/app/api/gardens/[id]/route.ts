import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isSchemaNotReadyError,
  resolveActiveGardenIdForUser,
  setActiveGardenIdForUser,
} from "@/lib/gardens";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import { toErrorMessage } from "@/lib/errorMessage";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

type GardenMembershipRow = {
  user_id?: unknown;
  member_role?: unknown;
};

type GardenRow = {
  id?: unknown;
  bond_id?: unknown;
  title?: unknown;
  system_key?: unknown;
  status?: unknown;
};

type BondRow = {
  id?: unknown;
  type?: unknown;
  status?: unknown;
};

type ProfileActiveGardenRow = {
  id?: unknown;
  active_garden_id?: unknown;
};

type ArchiveBody = {
  action?: unknown;
};

function normalizeId(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

async function deleteRowsByGardenId(
  table: string,
  gardenId: string,
  adminClient: ReturnType<typeof getSupabaseAdminClient>,
) {
  const { error } = await adminClient.from(table).delete().eq("garden_id", gardenId);
  if (error && !isSchemaNotReadyError(error)) {
    throw error;
  }
}

async function loadGardenContext(
  gardenId: string,
  adminClient: ReturnType<typeof getSupabaseAdminClient>,
) {
  const { data: gardenRaw, error: gardenError } = await adminClient
    .from("gardens")
    .select("id,bond_id,title,system_key,status")
    .eq("id", gardenId)
    .maybeSingle();

  if (gardenError) {
    throw new Error(
      toErrorMessage(gardenError, "No se pudo leer el jardin antes de procesarlo."),
    );
  }

  const garden = (gardenRaw as GardenRow | null) ?? null;
  const bondId = normalizeId(garden?.bond_id);
  if (!garden || !bondId) {
    return null;
  }

  const { data: bondRaw, error: bondError } = await adminClient
    .from("bonds")
    .select("id,type,status")
    .eq("id", bondId)
    .maybeSingle();

  if (bondError) {
    throw new Error(
      toErrorMessage(bondError, "No se pudo leer el vinculo del jardin."),
    );
  }

  const bond = (bondRaw as BondRow | null) ?? null;

  return {
    gardenId,
    bondId,
    title: normalizeText(garden.title) ?? "Jardin",
    systemKey: normalizeText(garden.system_key),
    gardenStatus: normalizeText(garden.status) ?? "active",
    bondType: normalizeText(bond?.type),
    bondStatus: normalizeText(bond?.status) ?? "active",
  };
}

async function requireOwnerMembership(
  gardenId: string,
  userId: string,
  authedClient: SupabaseClient,
) {
  const { data: membershipRaw, error: membershipError } = await authedClient
    .from("garden_members")
    .select("user_id,member_role")
    .eq("garden_id", gardenId)
    .eq("user_id", userId)
    .is("left_at", null)
    .maybeSingle();

  if (membershipError) {
    throw new Error(
      toErrorMessage(membershipError, "No se pudo validar tu acceso al jardin."),
    );
  }

  const membership = (membershipRaw as GardenMembershipRow | null) ?? null;
  const memberRole = normalizeText(membership?.member_role);
  if (!memberRole) {
    throw new Error("FORBIDDEN_NOT_MEMBER");
  }
  if (memberRole !== "owner") {
    throw new Error("FORBIDDEN_NOT_OWNER");
  }
}

async function readAffectedUsers(
  gardenId: string,
  adminClient: ReturnType<typeof getSupabaseAdminClient>,
) {
  const { data: affectedMembersRaw, error: affectedMembersError } = await adminClient
    .from("garden_members")
    .select("user_id")
    .eq("garden_id", gardenId)
    .is("left_at", null);

  if (affectedMembersError) {
    throw new Error(
      toErrorMessage(
        affectedMembersError,
        "No se pudieron preparar los perfiles afectados por la accion.",
      ),
    );
  }

  const affectedUserIds = [
    ...new Set(
      ((affectedMembersRaw as GardenMembershipRow[] | null) ?? [])
        .map((row) => normalizeId(row.user_id))
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  const profileRows =
    affectedUserIds.length > 0
      ? await adminClient
          .from("profiles")
          .select("id,active_garden_id")
          .in("id", affectedUserIds)
      : { data: [], error: null };

  if (profileRows.error) {
    throw new Error(
      toErrorMessage(
        profileRows.error,
        "No se pudo leer el jardin activo de los perfiles afectados.",
      ),
    );
  }

  const activeGardenByUser = new Map<string, string | null>();
  for (const row of (profileRows.data as ProfileActiveGardenRow[] | null) ?? []) {
    const userId = normalizeId(row.id);
    if (!userId) continue;
    activeGardenByUser.set(userId, normalizeId(row.active_garden_id));
  }

  return {
    affectedUserIds,
    activeGardenByUser,
  };
}

async function resolveNextActiveGardensForUsers(input: {
  affectedUserIds: string[];
  activeGardenByUser: Map<string, string | null>;
  archivedOrDeletedGardenId: string;
  adminClient: ReturnType<typeof getSupabaseAdminClient>;
}) {
  const nextActiveGardenByUser = new Map<string, string | null>();

  for (const userId of input.affectedUserIds) {
    const previousActiveGardenId = input.activeGardenByUser.get(userId) ?? null;
    if (previousActiveGardenId !== input.archivedOrDeletedGardenId) {
      nextActiveGardenByUser.set(userId, previousActiveGardenId);
      continue;
    }

    try {
      const nextActiveGardenId = await resolveActiveGardenIdForUser({
        userId,
        client: input.adminClient,
        forceRefresh: true,
      });
      await setActiveGardenIdForUser({
        userId,
        gardenId: nextActiveGardenId,
        client: input.adminClient,
      });
      nextActiveGardenByUser.set(userId, nextActiveGardenId);
    } catch {
      nextActiveGardenByUser.set(userId, null);
    }
  }

  return nextActiveGardenByUser;
}

async function createArchiveNotices(input: {
  actorUserId: string;
  affectedUserIds: string[];
  gardenId: string;
  gardenTitle: string;
  bondType: string | null;
  adminClient: ReturnType<typeof getSupabaseAdminClient>;
}) {
  const targetUserIds = input.affectedUserIds.filter(
    (userId) => userId !== input.actorUserId,
  );
  if (!targetUserIds.length) return;

  const bondLabel =
    input.bondType === "pareja"
      ? "de pareja"
      : input.bondType === "amistad"
        ? "de amistad"
        : input.bondType === "familia"
          ? "de familia"
          : "compartido";

  const rows = targetUserIds.map((userId) => ({
    user_id: userId,
    kind: "shared_garden_archived",
    garden_id: input.gardenId,
    title: `Se ha cerrado "${input.gardenTitle}"`,
    message: `El jardin ${bondLabel} ya no esta activo. Puedes revisarlo desde Jardines y vinculos si necesitas contexto.`,
    metadata: {
      gardenTitle: input.gardenTitle,
      bondType: input.bondType,
    },
  }));

  const { error } = await input.adminClient.from("user_notices").insert(rows);
  if (error && !isSchemaNotReadyError(error)) {
    throw new Error(toErrorMessage(error, "No se pudieron crear los avisos del cierre."));
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const gardenId = normalizeId(id);
  if (!gardenId) {
    return NextResponse.json({ error: "Falta id de jardin." }, { status: 400 });
  }

  let body: ArchiveBody = {};
  try {
    body = (await req.json()) as ArchiveBody;
  } catch {
    // Body opcional.
  }

  const action = String(body.action ?? "").trim().toLowerCase();
  if (action !== "archive") {
    return NextResponse.json(
      { error: "Accion invalida. Usa action=archive." },
      { status: 400 },
    );
  }

  try {
    await requireOwnerMembership(gardenId, auth.userId, auth.client);
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN_NOT_MEMBER") {
      return NextResponse.json({ error: "No perteneces a este jardin." }, { status: 403 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN_NOT_OWNER") {
      return NextResponse.json(
        { error: "Solo quien tiene rol propietario puede cerrar este jardin." },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: toErrorMessage(error, "No se pudo validar tu acceso al jardin.") },
      { status: 500 },
    );
  }

  try {
    const adminClient = getSupabaseAdminClient();
    const contextRow = await loadGardenContext(gardenId, adminClient);
    if (!contextRow) {
      return NextResponse.json({ error: "Jardin no encontrado." }, { status: 404 });
    }

    if (contextRow.systemKey) {
      return NextResponse.json(
        {
          error:
            "Este jardin esta protegido por el sistema y no se puede cerrar desde aqui.",
        },
        { status: 409 },
      );
    }

    if (contextRow.bondType === "personal") {
      return NextResponse.json(
        {
          error:
            "Los jardines personales se borran. Usa la accion de borrar en lugar de cerrar.",
        },
        { status: 409 },
      );
    }

    if (contextRow.gardenStatus === "archived") {
      return NextResponse.json({
        ok: true,
        archivedGardenId: gardenId,
        archivedGardenTitle: contextRow.title,
        activeGardenId: null,
      });
    }

    const affected = await readAffectedUsers(gardenId, adminClient);

    const { error: archiveGardenError } = await adminClient
      .from("gardens")
      .update({ status: "archived" })
      .eq("id", gardenId)
      .neq("status", "archived");

    if (archiveGardenError) {
      return NextResponse.json(
        {
          error: toErrorMessage(
            archiveGardenError,
            "No se pudo cerrar el jardin compartido.",
          ),
        },
        { status: 500 },
      );
    }

    const { error: archiveBondError } = await adminClient
      .from("bonds")
      .update({ status: "archived" })
      .eq("id", contextRow.bondId)
      .neq("status", "archived");

    if (archiveBondError) {
      return NextResponse.json(
        {
          error: toErrorMessage(
            archiveBondError,
            "No se pudo cerrar el vinculo compartido.",
          ),
        },
        { status: 500 },
      );
    }

    await createArchiveNotices({
      actorUserId: auth.userId,
      affectedUserIds: affected.affectedUserIds,
      gardenId,
      gardenTitle: contextRow.title,
      bondType: contextRow.bondType,
      adminClient,
    });

    const nextActiveGardenByUser = await resolveNextActiveGardensForUsers({
      affectedUserIds: affected.affectedUserIds,
      activeGardenByUser: affected.activeGardenByUser,
      archivedOrDeletedGardenId: gardenId,
      adminClient,
    });

    return NextResponse.json({
      ok: true,
      archivedGardenId: gardenId,
      archivedGardenTitle: contextRow.title,
      activeGardenId: nextActiveGardenByUser.get(auth.userId) ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: toErrorMessage(error, "No se pudo cerrar el jardin compartido.") },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const gardenId = normalizeId(id);
  if (!gardenId) {
    return NextResponse.json({ error: "Falta id de jardin." }, { status: 400 });
  }

  try {
    await requireOwnerMembership(gardenId, auth.userId, auth.client);
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN_NOT_MEMBER") {
      return NextResponse.json({ error: "No perteneces a este jardin." }, { status: 403 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN_NOT_OWNER") {
      return NextResponse.json(
        { error: "Solo quien tiene rol propietario puede borrar este jardin." },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: toErrorMessage(error, "No se pudo validar tu acceso al jardin.") },
      { status: 500 },
    );
  }

  try {
    const adminClient = getSupabaseAdminClient();
    const contextRow = await loadGardenContext(gardenId, adminClient);
    if (!contextRow) {
      return NextResponse.json({ error: "Jardin no encontrado." }, { status: 404 });
    }

    if (contextRow.systemKey) {
      return NextResponse.json(
        {
          error:
            "Este jardin esta protegido por el sistema y no se puede borrar desde aqui.",
        },
        { status: 409 },
      );
    }

    if (contextRow.bondType !== "personal") {
      return NextResponse.json(
        {
          error:
            "Los jardines compartidos se cierran primero. Usa la accion de cerrar en lugar de borrar.",
        },
        { status: 409 },
      );
    }

    const { count: gardensInBondCount, error: gardensInBondError } = await adminClient
      .from("gardens")
      .select("id", { count: "exact", head: true })
      .eq("bond_id", contextRow.bondId);

    if (gardensInBondError) {
      return NextResponse.json(
        {
          error: toErrorMessage(
            gardensInBondError,
            "No se pudo comprobar cuantos jardines tiene este vinculo.",
          ),
        },
        { status: 500 },
      );
    }

    if ((gardensInBondCount ?? 0) > 1) {
      return NextResponse.json(
        {
          error:
            "Este vinculo ya tiene varios jardines. El borrado desde la app todavia no esta habilitado para ese caso.",
        },
        { status: 409 },
      );
    }

    const affected = await readAffectedUsers(gardenId, adminClient);

    await deleteRowsByGardenId("achievements_unlocked", gardenId, adminClient);
    await deleteRowsByGardenId("season_notes", gardenId, adminClient);
    await deleteRowsByGardenId("year_notes", gardenId, adminClient);
    await deleteRowsByGardenId("pages", gardenId, adminClient);
    await deleteRowsByGardenId("seeds", gardenId, adminClient);

    const { error: deleteBondError } = await adminClient
      .from("bonds")
      .delete()
      .eq("id", contextRow.bondId);

    if (deleteBondError) {
      return NextResponse.json(
        {
          error: toErrorMessage(
            deleteBondError,
            "No se pudo borrar el jardin. Vuelve a intentarlo.",
          ),
        },
        { status: 500 },
      );
    }

    const nextActiveGardenByUser = await resolveNextActiveGardensForUsers({
      affectedUserIds: affected.affectedUserIds,
      activeGardenByUser: affected.activeGardenByUser,
      archivedOrDeletedGardenId: gardenId,
      adminClient,
    });

    return NextResponse.json({
      ok: true,
      deletedGardenId: gardenId,
      deletedGardenTitle: contextRow.title,
      deletedBondId: contextRow.bondId,
      activeGardenId: nextActiveGardenByUser.get(auth.userId) ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: toErrorMessage(error, "No se pudo borrar el jardin.") },
      { status: 500 },
    );
  }
}
