import { NextResponse } from "next/server";
import { toErrorMessage } from "@/lib/errorMessage";
import { runSeedEventReminderJob } from "@/lib/seedEventReminderJob";

export const runtime = "nodejs";

function isAuthorizedJobRequest(req: Request) {
  const secret = process.env.SEED_EVENT_REMINDER_CRON_SECRET;
  if (!secret) {
    const url = new URL(req.url);
    const host = url.hostname;
    const isLocalHost = host === "localhost" || host === "127.0.0.1";
    if (process.env.NODE_ENV !== "production" && isLocalHost) {
      return true;
    }

    throw new Error("Falta SEED_EVENT_REMINDER_CRON_SECRET para ejecutar el job.");
  }

  const authHeader = String(req.headers.get("authorization") ?? "").trim();
  const expectedBearer = `Bearer ${secret}`;
  if (authHeader === expectedBearer) return true;

  const cronHeader = String(req.headers.get("x-seed-reminder-secret") ?? "").trim();
  return cronHeader === secret;
}

async function handle(req: Request) {
  if (!isAuthorizedJobRequest(req)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry") === "1";
  const targetSendDate = String(url.searchParams.get("date") ?? "").trim() || undefined;
  const seedId =
    String(url.searchParams.get("seedId") ?? url.searchParams.get("seed") ?? "").trim() ||
    undefined;
  const recipientOverride = String(url.searchParams.get("to") ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  const result = await runSeedEventReminderJob({
    dryRun,
    targetSendDate,
    seedId,
    recipientOverride,
  });

  return NextResponse.json({
    ok: true,
    dryRun,
    seedId: seedId ?? null,
    targetSendDate: targetSendDate ?? null,
    recipientOverride,
    ...result,
  });
}

export async function GET(req: Request) {
  try {
    return await handle(req);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: toErrorMessage(error, "No se pudo ejecutar el job de recordatorios.") },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: toErrorMessage(error, "No se pudo ejecutar el job de recordatorios.") },
      { status: 500 },
    );
  }
}
