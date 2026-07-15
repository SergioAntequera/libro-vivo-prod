import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../../supabase/sql/2026-07-15_account_deletion_foundation.sql",
  import.meta.url,
);
const serviceUrl = new URL("./accountDeletionService.ts", import.meta.url);

test("migration gates deleted JWTs and every destructive RPC", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /create policy account_status_gate[\s\S]+as restrictive/i);
  assert.match(sql, /create or replace function public\.is_account_access_active/i);
  assert.equal((sql.match(/auth\.role\(\) <> 'service_role'/g) ?? []).length, 4);
  assert.match(sql, /for update skip locked/i);
  assert.match(sql, /attempt_count < 10/i);
});

test("migration separates personal gardens from shared authorship", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /other_member\.user_id <> p_user_id/i);
  assert.match(sql, /delete from public\.gardens where id = any\(solo_garden_ids\)/i);
  assert.match(sql, /delete from public\.garden_members where user_id = p_user_id/i);
  assert.match(sql, /name = 'Cuenta eliminada'/i);
  assert.doesNotMatch(sql, /delete from public\.garden_chat_messages where author_user_id/i);
  assert.doesNotMatch(sql, /delete from public\.pages where created_by/i);
  assert.doesNotMatch(sql, /delete from public\.seeds where created_by/i);
});

test("storage manifest is persisted before cascades and Auth uses soft deletion", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  const manifestPosition = sql.indexOf("set storage_manifest =");
  const gardenDeletePosition = sql.indexOf("delete from public.gardens");
  assert.ok(manifestPosition > 0);
  assert.ok(gardenDeletePosition > manifestPosition);
  assert.match(sql, /from storage\.objects/i);
  assert.match(sql, /target_profile\.account_status = 'deleted'/i);

  const service = await readFile(serviceUrl, "utf8");
  assert.match(service, /deleteUser\(request\.user_id, true\)/);
  assert.match(service, /claim_due_account_deletions/);
  assert.doesNotMatch(service, /deleteUser\(request\.user_id, false\)/);
});
