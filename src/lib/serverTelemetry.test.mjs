import assert from "node:assert/strict";
import test from "node:test";

import {
  createServerRequestContext,
  sanitizeServerTelemetryValue,
  withRequestId,
} from "./serverTelemetry.ts";

test("server telemetry redacts credentials and direct identifiers", () => {
  const value = sanitizeServerTelemetryValue({
    email: "persona@example.com",
    authorization: "Bearer secret",
    message: "user 018dbe2c-8f85-7d3d-9a70-0cf0eb052991 persona@example.com",
    nested: { accessToken: "eyJaaaaaaaaaaaaaaaaaaaaaaaa.aaaaaaaaaa.bbbbbbbbbb" },
  });
  assert.deepEqual(value, {
    email: "[redacted]",
    authorization: "[redacted]",
    message: "user [redacted-id] [redacted-email]",
    nested: { accessToken: "[redacted]" },
  });
});

test("request context removes queries, ids and rejects unsafe request ids", () => {
  const request = new Request(
    "https://www.libro-vivo.es/api/gardens/018dbe2c-8f85-7d3d-9a70-0cf0eb052991?token=secret",
    { headers: { "x-request-id": "unsafe id" } },
  );
  const context = createServerRequestContext(request, "garden", "read");
  assert.equal(context.path, "/api/gardens/:id");
  assert.notEqual(context.requestId, "unsafe id");
  assert.match(context.requestId, /^[a-f0-9-]{36}$/i);

  const response = withRequestId(new Response(null, { status: 204 }), context);
  assert.equal(response.headers.get("x-request-id"), context.requestId);
});
