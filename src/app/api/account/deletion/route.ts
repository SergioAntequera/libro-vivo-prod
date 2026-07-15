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

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function noStoreJson(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
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
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ACCOUNT_DELETION_DISABLED") {
      return noStoreJson({ available: false, request: null });
    }
    const publicError = toAccountDeletionPublicMessage(error);
    return noStoreJson({ error: publicError.error }, publicError.status);
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
    return noStoreJson({ request }, 202);
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("superadmin")) {
      return noStoreJson(
        { error: "La cuenta administradora debe transferirse antes de poder eliminarla." },
        409,
      );
    }
    const publicError = toAccountDeletionPublicMessage(error);
    return noStoreJson({ error: publicError.error }, publicError.status);
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  try {
    resolveAccountDeletionEnvironment();
    const request = await cancelAccountDeletion(auth.userId);
    return noStoreJson({ request });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("not found")) {
      return noStoreJson({ error: "No hay una eliminacion pendiente que cancelar." }, 409);
    }
    const publicError = toAccountDeletionPublicMessage(error);
    return noStoreJson({ error: publicError.error }, publicError.status);
  }
}
