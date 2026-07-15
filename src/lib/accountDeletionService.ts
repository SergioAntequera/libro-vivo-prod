import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export type AccountDeletionRequestRow = {
  id: string;
  user_id: string;
  status: "pending" | "cancelled" | "processing" | "completed" | "failed";
  acknowledgement_version: string;
  requested_at: string;
  scheduled_for: string;
  cancelled_at: string | null;
  processing_started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  failure_code: string | null;
  attempt_count: number;
  storage_manifest: unknown;
  storage_cleaned_at: string | null;
  purged_garden_ids: string[];
};

type StorageManifestEntry = { bucket: string; path: string };

const REQUEST_SELECT =
  "id,user_id,status,acknowledgement_version,requested_at,scheduled_for,cancelled_at,processing_started_at,completed_at,failed_at,failure_code,attempt_count,storage_manifest,storage_cleaned_at,purged_garden_ids";

function asRequestRow(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new Error("ACCOUNT_DELETION_REQUEST_MISSING");
  }
  return value as AccountDeletionRequestRow;
}

function parseStorageManifest(value: unknown): StorageManifestEntry[] {
  if (!Array.isArray(value)) return [];
  const unique = new Map<string, StorageManifestEntry>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const bucket = String(row.bucket ?? "").trim();
    const path = String(row.path ?? "").trim().replace(/^\/+/, "");
    if (!bucket || !path || path.includes("..")) continue;
    unique.set(`${bucket}:${path}`, { bucket, path });
  }
  return [...unique.values()];
}

function publicRequest(row: AccountDeletionRequestRow | null) {
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    requestedAt: row.requested_at,
    scheduledFor: row.scheduled_for,
    cancelledAt: row.cancelled_at,
    completedAt: row.completed_at,
  };
}

export async function getAccountDeletionRequestForUser(input: {
  client: SupabaseClient;
  userId: string;
}) {
  const { data, error } = await input.client
    .from("account_deletion_requests")
    .select(REQUEST_SELECT)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (error) throw error;
  return publicRequest(data ? asRequestRow(data) : null);
}

export async function requestAccountDeletion(input: {
  userId: string;
  acknowledgementVersion: string;
  graceDays: number;
}) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.rpc("request_account_deletion", {
    p_user_id: input.userId,
    p_acknowledgement_version: input.acknowledgementVersion,
    p_grace_days: input.graceDays,
  });
  if (error) throw error;
  return publicRequest(asRequestRow(data));
}

export async function cancelAccountDeletion(userId: string) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.rpc("cancel_account_deletion", {
    p_user_id: userId,
  });
  if (error) throw error;
  return publicRequest(asRequestRow(data));
}

async function removeStorageManifest(
  admin: SupabaseClient,
  manifestValue: unknown,
) {
  const grouped = new Map<string, string[]>();
  for (const entry of parseStorageManifest(manifestValue)) {
    const paths = grouped.get(entry.bucket) ?? [];
    paths.push(entry.path);
    grouped.set(entry.bucket, paths);
  }

  for (const [bucket, paths] of grouped) {
    for (let offset = 0; offset < paths.length; offset += 100) {
      const { error } = await admin.storage.from(bucket).remove(paths.slice(offset, offset + 100));
      if (error) throw new Error("ACCOUNT_DELETION_STORAGE_REMOVE_FAILED");
    }
  }
}

function authUserAlreadyUnavailable(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; message?: unknown; status?: unknown };
  const code = String(candidate.code ?? "").toLowerCase();
  const message = String(candidate.message ?? "").toLowerCase();
  return (
    Number(candidate.status) === 404 ||
    code.includes("user_not_found") ||
    message.includes("user not found")
  );
}

function failureCode(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("STORAGE_REMOVE")) return "storage_remove_failed";
  if (message.includes("AUTH_DELETE")) return "auth_delete_failed";
  if (message.includes("REQUEST_MISSING")) return "request_missing";
  return "prepare_failed";
}

export async function processAccountDeletionRequest(
  request: AccountDeletionRequestRow,
  admin: SupabaseClient = getSupabaseAdminClient(),
) {
  try {
    const { data: authUserData, error: authUserError } =
      await admin.auth.admin.getUserById(request.user_id);
    if (authUserError && !authUserAlreadyUnavailable(authUserError)) {
      throw new Error("ACCOUNT_DELETION_AUTH_DELETE_FAILED");
    }
    const userEmail = authUserData.user?.email?.trim().toLowerCase() || null;

    const { error: prepareError } = await admin.rpc("prepare_account_deletion", {
      p_request_id: request.id,
      p_user_id: request.user_id,
      p_user_email: userEmail,
    });
    if (prepareError) throw prepareError;

    const { data: preparedData, error: preparedError } = await admin
      .from("account_deletion_requests")
      .select(REQUEST_SELECT)
      .eq("id", request.id)
      .single();
    if (preparedError) throw preparedError;
    const prepared = asRequestRow(preparedData);

    await removeStorageManifest(admin, prepared.storage_manifest);

    if (authUserData.user) {
      const { error: deleteError } = await admin.auth.admin.deleteUser(request.user_id, true);
      if (deleteError && !authUserAlreadyUnavailable(deleteError)) {
        throw new Error("ACCOUNT_DELETION_AUTH_DELETE_FAILED");
      }
    }

    const now = new Date().toISOString();
    const { error: completionError } = await admin
      .from("account_deletion_requests")
      .update({
        status: "completed",
        completed_at: now,
        storage_cleaned_at: now,
        failed_at: null,
        failure_code: null,
        updated_at: now,
      })
      .eq("id", request.id);
    if (completionError) throw completionError;

    return { requestId: request.id, userId: request.user_id, status: "completed" as const };
  } catch (error) {
    const now = new Date().toISOString();
    await admin
      .from("account_deletion_requests")
      .update({
        status: "failed",
        failed_at: now,
        failure_code: failureCode(error),
        updated_at: now,
      })
      .eq("id", request.id);
    throw error;
  }
}

export async function processDueAccountDeletions(limit = 20) {
  const admin = getSupabaseAdminClient();
  const safeLimit = Math.min(50, Math.max(1, Math.trunc(limit)));
  const { data, error } = await admin.rpc("claim_due_account_deletions", {
    p_limit: safeLimit,
  });
  if (error) throw error;

  const results: Array<{
    requestId: string;
    userId: string;
    status: "completed" | "failed";
  }> = [];
  for (const value of data ?? []) {
    const request = asRequestRow(value);
    try {
      await processAccountDeletionRequest(request, admin);
      results.push({ requestId: request.id, userId: request.user_id, status: "completed" });
    } catch {
      results.push({ requestId: request.id, userId: request.user_id, status: "failed" });
    }
  }
  return results;
}
