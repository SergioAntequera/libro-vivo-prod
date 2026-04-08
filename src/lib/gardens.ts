import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { toErrorMessage } from "@/lib/errorMessage";

type SupabaseLikeClient = Pick<SupabaseClient, "from">;

type DbErrorLike = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
};

type ResolveActiveGardenParams = {
  userId: string;
  client?: SupabaseLikeClient;
  forceRefresh?: boolean;
};

type SetActiveGardenParams = {
  userId: string;
  gardenId: string | null;
  client?: SupabaseLikeClient;
};

export type GardenMembership = {
  gardenId: string;
  memberRole: string;
  joinedAt: string;
};

type GardenStatusRow = {
  id?: unknown;
  status?: unknown;
};

/**
 * In-memory cache for active garden IDs, keyed by userId.
 *
 * NOTE: This cache lives in module scope. In serverless deployments (Vercel,
 * Railway, etc.) each cold start gets a fresh Map, so the cache provides zero
 * benefit there. It DOES help in long-lived dev servers and traditional Node
 * deployments where the process persists across requests. The `forceRefresh`
 * option in `resolveActiveGardenIdForUser` bypasses this cache when needed.
 */
const ACTIVE_GARDEN_CACHE = new Map<string, string | null>();
const LEGACY_SHARED_GARDEN_SYSTEM_KEY = "legacy_shared_garden";

function extractErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null) return "";
  const value = (error as DbErrorLike).code;
  return String(value ?? "").trim().toUpperCase();
}

export function isSchemaNotReadyError(error: unknown) {
  const code = extractErrorCode(error);
  if (code === "PGRST202" || code === "PGRST204" || code === "PGRST205") return true;
  if (code === "42P01" || code === "42703") return true;

  const msg = toErrorMessage(error, "").toLowerCase();
  if (!msg) return false;
  if (msg.includes("could not find the function")) return true;
  if (msg.includes("does not exist")) return true;
  if (msg.includes("could not find the") && msg.includes("column")) return true;
  if (msg.includes("relation") && msg.includes("not found")) return true;
  return false;
}

function normalizeUuidLike(value: unknown) {
  if (typeof value !== "string") return null;
  const next = value.trim();
  return next || null;
}

function normalizeUserId(value: string) {
  return String(value ?? "").trim();
}

function cacheKey(userId: string) {
  return normalizeUserId(userId);
}

function getClient(client?: SupabaseLikeClient) {
  return client ?? supabase;
}

async function readProfileActiveGardenId(
  client: SupabaseLikeClient,
  userId: string,
) {
  const { data, error } = await client
    .from("profiles")
    .select("active_garden_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (isSchemaNotReadyError(error)) return null;
    throw new Error(
      toErrorMessage(error, "No se pudo leer active_garden_id del perfil."),
    );
  }

  const row = (data as { active_garden_id?: unknown } | null) ?? null;
  return normalizeUuidLike(row?.active_garden_id);
}

async function readLegacySharedGardenId(client: SupabaseLikeClient) {
  const { data, error } = await client
    .from("gardens")
    .select("id,status")
    .eq("system_key", LEGACY_SHARED_GARDEN_SYSTEM_KEY)
    .maybeSingle();

  if (error) {
    if (isSchemaNotReadyError(error)) return null;
    throw new Error(
      toErrorMessage(error, "No se pudo leer jardín legado."),
    );
  }

  const row = (data as { id?: unknown; status?: unknown } | null) ?? null;
  if (String(row?.status ?? "").trim().toLowerCase() === "archived") return null;
  return normalizeUuidLike(row?.id);
}

async function readGardenStatuses(
  client: SupabaseLikeClient,
  gardenIds: string[],
) {
  if (!gardenIds.length) return new Map<string, string>();

  const { data, error } = await client
    .from("gardens")
    .select("id,status")
    .in("id", gardenIds);

  if (error) {
    if (isSchemaNotReadyError(error)) return new Map<string, string>();
    throw new Error(toErrorMessage(error, "No se pudo leer el estado de los jardines."));
  }

  const rows = ((data as GardenStatusRow[] | null) ?? []);
  const next = new Map<string, string>();
  for (const row of rows) {
    const id = normalizeUuidLike(row.id);
    if (!id) continue;
    next.set(id, String(row.status ?? "").trim().toLowerCase() || "active");
  }
  return next;
}

async function resolveFirstSelectableGardenId(
  client: SupabaseLikeClient,
  memberships: GardenMembership[],
) {
  const statuses = await readGardenStatuses(
    client,
    memberships.map((membership) => membership.gardenId),
  );

  return (
    memberships.find((membership) => statuses.get(membership.gardenId) !== "archived")
      ?.gardenId ?? null
  );
}

export function clearActiveGardenCache(userId?: string) {
  if (typeof userId === "string" && userId.trim()) {
    ACTIVE_GARDEN_CACHE.delete(cacheKey(userId));
    return;
  }
  ACTIVE_GARDEN_CACHE.clear();
}

export async function listGardenMembershipsForUser(
  userId: string,
  client?: SupabaseLikeClient,
) {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) return [] as GardenMembership[];

  const db = getClient(client);
  const { data, error } = await db
    .from("garden_members")
    .select("garden_id,member_role,joined_at,left_at")
    .eq("user_id", normalizedUserId)
    .is("left_at", null)
    .order("joined_at", { ascending: false });

  if (error) {
    if (isSchemaNotReadyError(error)) return [] as GardenMembership[];
    throw new Error(
      toErrorMessage(error, "No se pudieron cargar membresias de jardín."),
    );
  }

  const rows =
    ((data as Array<{
      garden_id?: unknown;
      member_role?: unknown;
      joined_at?: unknown;
    }> | null) ?? []);

  return rows
    .map((row) => {
      const gardenId = normalizeUuidLike(row.garden_id);
      if (!gardenId) return null;
      return {
        gardenId,
        memberRole: String(row.member_role ?? "editor").trim() || "editor",
        joinedAt: String(row.joined_at ?? "").trim() || new Date(0).toISOString(),
      } satisfies GardenMembership;
    })
    .filter((row): row is GardenMembership => row !== null);
}

export async function setActiveGardenIdForUser(params: SetActiveGardenParams) {
  const normalizedUserId = normalizeUserId(params.userId);
  if (!normalizedUserId) return false;

  const db = getClient(params.client);
  const payload = {
    active_garden_id: normalizeUuidLike(params.gardenId),
  };

  const { error } = await db
    .from("profiles")
    .update(payload)
    .eq("id", normalizedUserId);

  if (error) {
    if (isSchemaNotReadyError(error)) return false;
    throw new Error(
      toErrorMessage(error, "No se pudo actualizar active_garden_id."),
    );
  }

  ACTIVE_GARDEN_CACHE.set(cacheKey(normalizedUserId), payload.active_garden_id);
  return true;
}

export async function resolveActiveGardenIdForUser(
  params: ResolveActiveGardenParams | string,
) {
  const normalizedParams =
    typeof params === "string"
      ? ({ userId: params } satisfies ResolveActiveGardenParams)
      : params;

  const normalizedUserId = normalizeUserId(normalizedParams.userId);
  if (!normalizedUserId) return null;

  const key = cacheKey(normalizedUserId);
  if (!normalizedParams.forceRefresh && ACTIVE_GARDEN_CACHE.has(key)) {
    return ACTIVE_GARDEN_CACHE.get(key) ?? null;
  }

  const db = getClient(normalizedParams.client);
  const memberships = await listGardenMembershipsForUser(normalizedUserId, db);
  const gardenStatuses = await readGardenStatuses(
    db,
    memberships.map((membership) => membership.gardenId),
  );
  const selectableGardenId = await resolveFirstSelectableGardenId(db, memberships);

  const profileActiveGardenId = await readProfileActiveGardenId(
    db,
    normalizedUserId,
  );
  if (profileActiveGardenId && gardenStatuses.get(profileActiveGardenId) !== "archived") {
    ACTIVE_GARDEN_CACHE.set(key, profileActiveGardenId);
    return profileActiveGardenId;
  }

  if (selectableGardenId) {
    const candidate = selectableGardenId;
    ACTIVE_GARDEN_CACHE.set(key, candidate);
    await setActiveGardenIdForUser({
      userId: normalizedUserId,
      gardenId: candidate,
      client: db,
    }).catch(() => {
      // Best effort for compatibility mode.
    });
    return candidate;
  }

  const legacyGardenId = await readLegacySharedGardenId(db);
  if (legacyGardenId) {
    ACTIVE_GARDEN_CACHE.set(key, legacyGardenId);
    await setActiveGardenIdForUser({
      userId: normalizedUserId,
      gardenId: legacyGardenId,
      client: db,
    }).catch(() => {
      // Best effort for compatibility mode.
    });
    return legacyGardenId;
  }

  ACTIVE_GARDEN_CACHE.set(key, null);
  return null;
}

export function withGardenScope<T>(query: T, gardenId: string | null | undefined): T {
  const scopedGardenId = normalizeUuidLike(gardenId);
  if (!scopedGardenId) return query;
  const candidate = query as {
    eq?: (column: string, value: unknown) => unknown;
  };
  if (typeof candidate.eq !== "function") return query;
  return candidate.eq("garden_id", scopedGardenId) as T;
}

export function withGardenIdOnInsert<T extends Record<string, unknown>>(
  payload: T,
  gardenId: string | null | undefined,
) {
  const scopedGardenId = normalizeUuidLike(gardenId);
  if (!scopedGardenId) return { ...payload };
  return {
    ...payload,
    garden_id: scopedGardenId,
  };
}
