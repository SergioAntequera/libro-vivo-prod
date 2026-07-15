import assert from "node:assert/strict";
import test from "node:test";

import {
  ACCOUNT_EXPORT_TABLES,
  buildAccountDataExport,
  serializeAccountSubject,
} from "./accountDataExport.ts";

test("account export table contract is unique and has deterministic ordering", () => {
  const names = ACCOUNT_EXPORT_TABLES.map((item) => item.table);
  assert.equal(new Set(names).size, names.length);
  assert.ok(ACCOUNT_EXPORT_TABLES.every((item) => item.orderBy.length > 0));
  assert.ok(ACCOUNT_EXPORT_TABLES.some((item) => item.table === "profiles" && item.required));
  assert.ok(ACCOUNT_EXPORT_TABLES.some((item) => item.table === "gardens" && item.required));
});

test("serialized auth subject exposes user data but not credentials or tokens", () => {
  const subject = serializeAccountSubject({
    id: "user-id",
    aud: "authenticated",
    role: "authenticated",
    email: "persona@example.com",
    phone: "+34000000000",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    last_sign_in_at: "2026-01-03T00:00:00.000Z",
    app_metadata: { providers: ["email"] },
    user_metadata: {
      name: "Persona",
      nested: { access_token: "must-not-leak", preference: "garden" },
    },
    identities: [
      {
        id: "identity-id",
        provider: "email",
        identity_data: { email: "persona@example.com", provider_token: "must-not-leak" },
      },
    ],
  });

  assert.equal(subject.email, "persona@example.com");
  assert.deepEqual(subject.providers, ["email"]);
  assert.equal("accessToken" in subject, false);
  assert.equal("refreshToken" in subject, false);
  assert.equal("password" in subject, false);
  assert.equal(subject.userMetadata.nested.access_token, "[redacted]");
  assert.equal(subject.userMetadata.nested.preference, "garden");
  assert.equal(subject.identities[0].identityData.provider_token, "[redacted]");
});

test("account export derives garden scope from the authenticated user's memberships", async () => {
  const rowsByTable = {
    profiles: [{ id: "user-id", name: "Persona" }],
    garden_members: [{ id: "membership-id", user_id: "user-id", garden_id: "garden-a" }],
    gardens: [{ id: "garden-a", title: "Jardín" }],
    pages: [{ id: "page-a", garden_id: "garden-a" }],
    seeds: [{ id: "seed-a", garden_id: "garden-a" }],
  };
  const queries = [];
  const client = {
    from(table) {
      const state = { table, filterColumn: null, filterValues: [] };
      const builder = {
        select() {
          return builder;
        },
        eq(column, value) {
          state.filterColumn = column;
          state.filterValues = [value];
          return builder;
        },
        in(column, values) {
          state.filterColumn = column;
          state.filterValues = values;
          return builder;
        },
        order() {
          return builder;
        },
        async range(from, to) {
          queries.push({ ...state });
          const rows = rowsByTable[table] ?? [];
          return { data: rows.slice(from, to + 1), error: null };
        },
      };
      return builder;
    },
  };

  const payload = await buildAccountDataExport({
    client,
    user: {
      id: "user-id",
      created_at: "2026-01-01T00:00:00.000Z",
      app_metadata: { providers: ["email"] },
      user_metadata: {},
      identities: [],
    },
  });

  assert.deepEqual(payload.scope.gardenIds, ["garden-a"]);
  assert.equal(payload.datasets.pages.length, 1);
  assert.ok(
    queries.some(
      (query) =>
        query.table === "pages" &&
        query.filterColumn === "garden_id" &&
        query.filterValues.join(",") === "garden-a",
    ),
  );
});
