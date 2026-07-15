import type { SupabaseClient, User } from "@supabase/supabase-js";

const EXPORT_PAGE_SIZE = 500;
const EXPORT_MAX_ROWS_PER_TABLE = 10_000;

export type AccountExportTableSpec = {
  table: string;
  scope: "user" | "garden";
  filterColumn: string;
  required?: boolean;
  orderBy: readonly string[];
};

export const ACCOUNT_EXPORT_TABLES: readonly AccountExportTableSpec[] = [
  { table: "profiles", scope: "user", filterColumn: "id", required: true, orderBy: ["id"] },
  {
    table: "garden_members",
    scope: "user",
    filterColumn: "user_id",
    required: true,
    orderBy: ["id"],
  },
  { table: "bond_members", scope: "user", filterColumn: "user_id", orderBy: ["user_id"] },
  {
    table: "memory_reflections",
    scope: "user",
    filterColumn: "user_id",
    orderBy: ["id"],
  },
  {
    table: "garden_chat_message_reactions",
    scope: "user",
    filterColumn: "user_id",
    orderBy: ["message_id", "user_id"],
  },
  {
    table: "garden_chat_read_states",
    scope: "user",
    filterColumn: "user_id",
    orderBy: ["room_id", "user_id"],
  },
  {
    table: "garden_audio_session_participants",
    scope: "user",
    filterColumn: "user_id",
    orderBy: ["session_id", "user_id"],
  },
  {
    table: "flower_birth_ritual_ratings",
    scope: "user",
    filterColumn: "user_id",
    orderBy: ["page_id", "user_id"],
  },
  {
    table: "seed_watering_confirmations",
    scope: "user",
    filterColumn: "user_id",
    orderBy: ["id"],
  },
  { table: "user_notices", scope: "user", filterColumn: "user_id", orderBy: ["id"] },
  {
    table: "shared_live_sessions",
    scope: "user",
    filterColumn: "user_id",
    orderBy: ["id"],
  },
  { table: "gardens", scope: "garden", filterColumn: "id", required: true, orderBy: ["id"] },
  { table: "pages", scope: "garden", filterColumn: "garden_id", required: true, orderBy: ["id"] },
  { table: "seeds", scope: "garden", filterColumn: "garden_id", required: true, orderBy: ["id"] },
  { table: "garden_chat_rooms", scope: "garden", filterColumn: "garden_id", orderBy: ["id"] },
  {
    table: "garden_chat_messages",
    scope: "garden",
    filterColumn: "garden_id",
    orderBy: ["id"],
  },
  {
    table: "garden_chat_message_attachments",
    scope: "garden",
    filterColumn: "garden_id",
    orderBy: ["id"],
  },
  { table: "garden_audio_sessions", scope: "garden", filterColumn: "garden_id", orderBy: ["id"] },
  { table: "time_capsules", scope: "garden", filterColumn: "garden_id", orderBy: ["id"] },
  {
    table: "time_capsule_drafts",
    scope: "garden",
    filterColumn: "garden_id",
    orderBy: ["id"],
  },
  {
    table: "time_capsule_draft_revisions",
    scope: "garden",
    filterColumn: "garden_id",
    orderBy: ["id"],
  },
  { table: "map_places", scope: "garden", filterColumn: "garden_id", orderBy: ["id"] },
  { table: "map_routes", scope: "garden", filterColumn: "garden_id", orderBy: ["id"] },
  { table: "map_zones", scope: "garden", filterColumn: "garden_id", orderBy: ["id"] },
  {
    table: "year_notes",
    scope: "garden",
    filterColumn: "garden_id",
    orderBy: ["garden_id", "year"],
  },
  {
    table: "year_cycle_states",
    scope: "garden",
    filterColumn: "garden_id",
    orderBy: ["garden_id", "year"],
  },
  {
    table: "garden_year_tree_states",
    scope: "garden",
    filterColumn: "garden_id",
    orderBy: ["garden_id", "year"],
  },
  {
    table: "annual_tree_rituals",
    scope: "garden",
    filterColumn: "garden_id",
    orderBy: ["id"],
  },
  {
    table: "annual_tree_check_ins",
    scope: "garden",
    filterColumn: "garden_id",
    orderBy: ["id"],
  },
  {
    table: "flower_birth_rituals",
    scope: "garden",
    filterColumn: "garden_id",
    orderBy: ["page_id"],
  },
  {
    table: "flower_page_revisions",
    scope: "garden",
    filterColumn: "garden_id",
    orderBy: ["id"],
  },
  { table: "garden_plan_types", scope: "garden", filterColumn: "garden_id", orderBy: ["id"] },
  {
    table: "seed_preparation_profiles",
    scope: "garden",
    filterColumn: "garden_id",
    orderBy: ["id"],
  },
  {
    table: "seed_preparation_attachments",
    scope: "garden",
    filterColumn: "garden_id",
    orderBy: ["id"],
  },
  {
    table: "seed_preparation_checklist_items",
    scope: "garden",
    filterColumn: "garden_id",
    orderBy: ["id"],
  },
  {
    table: "seed_preparation_itinerary_items",
    scope: "garden",
    filterColumn: "garden_id",
    orderBy: ["id"],
  },
  {
    table: "seed_preparation_place_links",
    scope: "garden",
    filterColumn: "garden_id",
    orderBy: ["id"],
  },
  {
    table: "seed_preparation_reservations",
    scope: "garden",
    filterColumn: "garden_id",
    orderBy: ["id"],
  },
  {
    table: "seed_preparation_stays",
    scope: "garden",
    filterColumn: "garden_id",
    orderBy: ["id"],
  },
  {
    table: "seed_preparation_stops",
    scope: "garden",
    filterColumn: "garden_id",
    orderBy: ["id"],
  },
  {
    table: "seed_preparation_transport_legs",
    scope: "garden",
    filterColumn: "garden_id",
    orderBy: ["id"],
  },
] as const;

type ExportWarning = {
  table: string;
  code: string;
};

function normalizeErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return "query_failed";
  const value = (error as { code?: unknown }).code;
  return typeof value === "string" && value.trim() ? value.trim() : "query_failed";
}

function isExportTooLargeError(error: unknown) {
  return error instanceof Error && error.message.startsWith("ACCOUNT_EXPORT_TOO_LARGE:");
}

function sanitizeExportMetadata(value: unknown, depth = 0): unknown {
  if (depth >= 8) return "[max-depth]";
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeExportMetadata(item, depth + 1));
  }
  if (!value || typeof value !== "object") return String(value ?? "");

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      /(token|secret|password|authorization|api[_-]?key|credential)/i.test(key)
        ? "[redacted]"
        : sanitizeExportMetadata(item, depth + 1),
    ]),
  );
}

export function serializeAccountSubject(user: User) {
  return {
    id: user.id,
    email: user.email ?? null,
    phone: user.phone ?? null,
    createdAt: user.created_at,
    updatedAt: user.updated_at ?? null,
    lastSignInAt: user.last_sign_in_at ?? null,
    providers: Array.isArray(user.app_metadata?.providers)
      ? user.app_metadata.providers.filter((value): value is string => typeof value === "string")
      : [],
    userMetadata: sanitizeExportMetadata(user.user_metadata),
    identities: (user.identities ?? []).map((identity) => ({
      id: identity.id,
      provider: identity.provider,
      createdAt: identity.created_at ?? null,
      updatedAt: identity.updated_at ?? null,
      identityData: sanitizeExportMetadata(identity.identity_data),
    })),
  };
}

async function fetchRows(input: {
  client: SupabaseClient;
  spec: AccountExportTableSpec;
  filterValues: readonly string[];
}) {
  const rows: unknown[] = [];

  for (let offset = 0; offset < EXPORT_MAX_ROWS_PER_TABLE; offset += EXPORT_PAGE_SIZE) {
    let query = input.client.from(input.spec.table).select("*");
    query =
      input.filterValues.length === 1
        ? query.eq(input.spec.filterColumn, input.filterValues[0])
        : query.in(input.spec.filterColumn, [...input.filterValues]);
    for (const column of input.spec.orderBy) {
      query = query.order(column, { ascending: true });
    }

    const { data, error } = await query.range(offset, offset + EXPORT_PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data as unknown[] | null) ?? [];
    rows.push(...page);
    if (page.length < EXPORT_PAGE_SIZE) return rows;
  }

  let overflowQuery = input.client.from(input.spec.table).select(input.spec.filterColumn);
  overflowQuery =
    input.filterValues.length === 1
      ? overflowQuery.eq(input.spec.filterColumn, input.filterValues[0])
      : overflowQuery.in(input.spec.filterColumn, [...input.filterValues]);
  const { data: overflow, error: overflowError } = await overflowQuery.range(
    EXPORT_MAX_ROWS_PER_TABLE,
    EXPORT_MAX_ROWS_PER_TABLE,
  );
  if (overflowError) throw overflowError;
  if (overflow?.length) {
    throw new Error(`ACCOUNT_EXPORT_TOO_LARGE:${input.spec.table}`);
  }

  return rows;
}

export async function buildAccountDataExport(input: {
  client: SupabaseClient;
  user: User;
}) {
  const datasets: Record<string, unknown[]> = {};
  const warnings: ExportWarning[] = [];
  let gardenIds: string[] = [];

  for (const spec of ACCOUNT_EXPORT_TABLES.filter((item) => item.scope === "user")) {
    try {
      const rows = await fetchRows({
        client: input.client,
        spec,
        filterValues: [input.user.id],
      });
      datasets[spec.table] = rows;
      if (spec.table === "garden_members") {
        gardenIds = rows
          .map((row) =>
            row && typeof row === "object" && typeof (row as { garden_id?: unknown }).garden_id === "string"
              ? String((row as { garden_id: string }).garden_id).trim()
              : "",
          )
          .filter(Boolean);
      }
    } catch (error) {
      if (isExportTooLargeError(error)) throw error;
      if (spec.required) throw error;
      warnings.push({ table: spec.table, code: normalizeErrorCode(error) });
    }
  }

  const uniqueGardenIds = [...new Set(gardenIds)];
  if (uniqueGardenIds.length) {
    for (const spec of ACCOUNT_EXPORT_TABLES.filter((item) => item.scope === "garden")) {
      try {
        datasets[spec.table] = await fetchRows({
          client: input.client,
          spec,
          filterValues: uniqueGardenIds,
        });
      } catch (error) {
        if (isExportTooLargeError(error)) throw error;
        if (spec.required) throw error;
        warnings.push({ table: spec.table, code: normalizeErrorCode(error) });
      }
    }
  } else {
    for (const spec of ACCOUNT_EXPORT_TABLES.filter((item) => item.scope === "garden")) {
      datasets[spec.table] = [];
    }
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    subject: serializeAccountSubject(input.user),
    scope: {
      gardenIds: uniqueGardenIds,
      sharedGardenContentIncluded: true,
      binaryFilesIncluded: false,
    },
    datasets,
    warnings,
  };
}
