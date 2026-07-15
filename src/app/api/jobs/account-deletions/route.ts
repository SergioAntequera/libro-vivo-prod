import { NextResponse } from "next/server";

import { resolveAccountDeletionEnvironment } from "@/lib/accountDeletionContracts";
import { processDueAccountDeletions } from "@/lib/accountDeletionService";

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
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    resolveAccountDeletionEnvironment();
    const results = await processDueAccountDeletions();
    return NextResponse.json(
      {
        processed: results.length,
        completed: results.filter((item) => item.status === "completed").length,
        failed: results.filter((item) => item.status === "failed").length,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "No se pudo procesar la cola de eliminacion." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
