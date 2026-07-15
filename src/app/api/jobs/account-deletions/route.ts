import { NextResponse } from "next/server";

import { resolveAccountDeletionEnvironment } from "@/lib/accountDeletionContracts";
import { processDueAccountDeletions } from "@/lib/accountDeletionService";
import { createServerRequestContext, reportServerEvent, withRequestId } from "@/lib/serverTelemetry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(req: Request) {
  const expected = process.env.ACCOUNT_DELETION_CRON_SECRET?.trim() ?? "";
  if (!expected) return false;
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  const explicit = req.headers.get("x-account-deletion-secret")?.trim() ?? "";
  return bearer === expected || explicit === expected;
}

export async function POST(req: Request) {
  const context = createServerRequestContext(req, "account", "process_deletion_queue");
  if (!isAuthorized(req)) {
    reportServerEvent({
      event: "server.job.account_deletions.rejected",
      level: "warning",
      context,
      data: { reason: "invalid_job_secret" },
    });
    return withRequestId(
      NextResponse.json({ error: "No autorizado." }, { status: 401 }),
      context,
    );
  }

  try {
    resolveAccountDeletionEnvironment();
    const results = await processDueAccountDeletions();
    const completed = results.filter((item) => item.status === "completed").length;
    const failed = results.filter((item) => item.status === "failed").length;
    reportServerEvent({
      event: "server.job.account_deletions.completed",
      level: failed ? "warning" : "info",
      context,
      data: { processed: results.length, completed, failed },
    });
    return withRequestId(NextResponse.json(
      {
        processed: results.length,
        completed,
        failed,
      },
      { headers: { "Cache-Control": "no-store" } },
    ), context);
  } catch {
    reportServerEvent({
      event: "server.job.account_deletions.failed",
      level: "error",
      context,
    });
    return withRequestId(NextResponse.json(
      { error: "No se pudo procesar la cola de eliminacion." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    ), context);
  }
}
