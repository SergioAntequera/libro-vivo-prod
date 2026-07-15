import assert from "node:assert/strict";
import test from "node:test";

import {
  ACCOUNT_DELETION_ACKNOWLEDGEMENT_VERSION,
  ACCOUNT_DELETION_CONFIRMATION,
  assertRecentAccountAccessToken,
  parseAccountDeletionPayload,
  resolveAccountDeletionEnvironment,
  resolveSupabaseProjectRef,
} from "./accountDeletionContracts.ts";

function token(payload) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.signature`;
}

test("extracts only a valid Supabase project ref", () => {
  assert.equal(
    resolveSupabaseProjectRef("https://stagingref.supabase.co"),
    "stagingref",
  );
  assert.equal(resolveSupabaseProjectRef("https://example.com"), "");
  assert.equal(resolveSupabaseProjectRef("not-a-url"), "");
});

test("requires an explicit feature flag and matching project guard", () => {
  assert.deepEqual(
    resolveAccountDeletionEnvironment({
      ACCOUNT_DELETION_ENABLED: "true",
      ACCOUNT_DELETION_ALLOWED_PROJECT_REF: "stagingref",
      ACCOUNT_DELETION_GRACE_DAYS: "9",
      NEXT_PUBLIC_SUPABASE_URL: "https://stagingref.supabase.co",
    }),
    { enabled: true, projectRef: "stagingref", graceDays: 9 },
  );

  assert.throws(
    () =>
      resolveAccountDeletionEnvironment({
        ACCOUNT_DELETION_ENABLED: "true",
        ACCOUNT_DELETION_ALLOWED_PROJECT_REF: "productionref",
        NEXT_PUBLIC_SUPABASE_URL: "https://stagingref.supabase.co",
      }),
    /ACCOUNT_DELETION_PROJECT_GUARD/,
  );
  assert.throws(
    () =>
      resolveAccountDeletionEnvironment({
        ACCOUNT_DELETION_ENABLED: "false",
        ACCOUNT_DELETION_ALLOWED_PROJECT_REF: "stagingref",
        NEXT_PUBLIC_SUPABASE_URL: "https://stagingref.supabase.co",
      }),
    /ACCOUNT_DELETION_DISABLED/,
  );
});

test("validates the exact destructive confirmation contract", () => {
  assert.deepEqual(
    parseAccountDeletionPayload({
      confirmation: ACCOUNT_DELETION_CONFIRMATION,
      acknowledgementVersion: ACCOUNT_DELETION_ACKNOWLEDGEMENT_VERSION,
    }),
    {
      confirmation: ACCOUNT_DELETION_CONFIRMATION,
      acknowledgementVersion: ACCOUNT_DELETION_ACKNOWLEDGEMENT_VERSION,
    },
  );
  assert.throws(
    () =>
      parseAccountDeletionPayload({
        confirmation: "eliminar",
        acknowledgementVersion: ACCOUNT_DELETION_ACKNOWLEDGEMENT_VERSION,
      }),
    /ACCOUNT_DELETION_CONFIRMATION_MISMATCH/,
  );
});

test("accepts only a recent token for the same account", () => {
  const nowSeconds = 1_800_000_000;
  const recent = token({ sub: "user-1", iat: nowSeconds - 120 });
  assert.doesNotThrow(() =>
    assertRecentAccountAccessToken({
      accessToken: recent,
      userId: "user-1",
      nowSeconds,
    }),
  );
  assert.throws(
    () =>
      assertRecentAccountAccessToken({
        accessToken: token({ sub: "user-1", iat: nowSeconds - 900 }),
        userId: "user-1",
        nowSeconds,
      }),
    /ACCOUNT_DELETION_REAUTH_REQUIRED/,
  );
  assert.throws(
    () =>
      assertRecentAccountAccessToken({
        accessToken: recent,
        userId: "user-2",
        nowSeconds,
      }),
    /ACCOUNT_DELETION_REAUTH_REQUIRED/,
  );
});
