import { NextResponse } from "next/server";

import {
  ACCOUNT_DELETION_ACKNOWLEDGEMENT_VERSION,
  assertRecentAccountAccessToken,
  parseAccountDeletionPayload,
  readBearerAccessToken,
  resolveAccountDeletionEnvironment,
  toAccountDeletionPublicMessage,
} from "@/lib/accountDeletionContracts";
import {
  cancelAccountDeletion,
  getAccountDeletionRequestForUser,
  requestAccountDeletion,
} from "@/lib/accountDeletionService";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import { reportServerEvent, withRequestId, type ServerRequestContext } from "@/lib/serverTelemetry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function noStoreJson(value: unknown, status = 200, context?: ServerRequestContext) {
  const response = NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
  return context ? withRequestId(response, context) : response;
}

export async function GET(req: Request) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  try {
    const config = resolveAccountDeletionEnvironment();
    const request = await getAccountDeletionRequestForUser({
      client: auth.client,
      userId: auth.userId,
    });
    return noStoreJson({
      available: true,
      graceDays: config.graceDays,
      acknowledgementVersion: ACCOUNT_DELETION_ACKNOWLEDGEMENT_VERSION,
      request,
    }, 200, auth.requestContext);
  } catch (error) {
    if (error instanceof Error && error.message === "ACCOUNT_DELETION_DISABLED") {
      return noStoreJson({ available: false, request: null }, 200, auth.requestContext);
    }
    const publicError = toAccountDeletionPublicMessage(error);
    reportServerEvent({
      event: "server.account_deletion.status_failed",
      level: "error",
      context: auth.requestContext,
      data: { status: publicError.status },
    });
    return noStoreJson({ error: publicError.error }, publicError.status, auth.requestContext);
  }
}

export async function POST(req: Request) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  try {
    const config = resolveAccountDeletionEnvironment();
    const payload = parseAccountDeletionPayload(await req.json());
    const accessToken = readBearerAccessToken(req);
    if (!accessToken) throw new Error("ACCOUNT_DELETION_REAUTH_REQUIRED");
    assertRecentAccountAccessToken({ accessToken, userId: auth.userId });

    const request = await requestAccountDeletion({
      userId: auth.userId,
      acknowledgementVersion: payload.acknowledgementVersion,
      graceDays: config.graceDays,
    });
    reportServerEvent({
      event: "server.account_deletion.scheduled",
      context: auth.requestContext,
    });
    return noStoreJson({ request }, 202, auth.requestContext);
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("superadmin")) {
      return noStoreJson(
        { error: "La cuenta administradora debe transferirse antes de poder eliminarla." },
        409,
        auth.requestContext,
      );
    }
    const publicError = toAccountDeletionPublicMessage(error);
    reportServerEvent({
      event: "server.account_deletion.schedule_failed",
      level: publicError.status >= 500 ? "error" : "warning",
      context: auth.requestContext,
      data: { status: publicError.status },
    });
    return noStoreJson({ error: publicError.error }, publicError.status, auth.requestContext);
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  try {
    resolveAccountDeletionEnvironment();
    const request = await cancelAccountDeletion(auth.userId);
    reportServerEvent({
      event: "server.account_deletion.cancelled",
      context: auth.requestContext,
    });
    return noStoreJson({ request }, 200, auth.requestContext);
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("not found")) {
      return noStoreJson(
        { error: "No hay una eliminación pendiente que cancelar." },
        409,
        auth.requestContext,
      );
    }
    const publicError = toAccountDeletionPublicMessage(error);
    reportServerEvent({
      event: "server.account_deletion.cancel_failed",
      level: publicError.status >= 500 ? "error" : "warning",
      context: auth.requestContext,
      data: { status: publicError.status },
    });
    return noStoreJson({ error: publicError.error }, publicError.status, auth.requestContext);
  }
}
