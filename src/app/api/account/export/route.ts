import { NextResponse } from "next/server";

import { buildAccountDataExport } from "@/lib/accountDataExport";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import { reportServerEvent, withRequestId } from "@/lib/serverTelemetry";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  const { data, error: userError } = await auth.client.auth.getUser();
  if (userError || !data.user) {
    reportServerEvent({
      event: "server.account_export.rejected",
      level: "warning",
      context: auth.requestContext,
      data: { reason: "session_expired_after_auth" },
    });
    return withRequestId(
      NextResponse.json({ error: "Sesión inválida o expirada." }, { status: 401 }),
      auth.requestContext,
    );
  }

  try {
    const payload = await buildAccountDataExport({ client: auth.client, user: data.user });
    const date = new Date().toISOString().slice(0, 10);
    reportServerEvent({
      event: "server.account_export.completed",
      context: auth.requestContext,
      data: {
        datasetCount: Object.keys(payload.datasets).length,
        warningCount: payload.warnings.length,
      },
    });

    return withRequestId(new NextResponse(`${JSON.stringify(payload, null, 2)}\n`, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="LibroVivo_Datos_${date}.json"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    }), auth.requestContext);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const tooLarge = message.includes("ACCOUNT_EXPORT_TOO_LARGE:");
    reportServerEvent({
      event: "server.account_export.failed",
      level: tooLarge ? "warning" : "error",
      context: auth.requestContext,
      data: { reason: tooLarge ? "export_too_large" : "export_failed" },
    });
    return withRequestId(NextResponse.json(
      {
        error: tooLarge
          ? "La exportacion supera el limite automatico. Contacta con soporte para recibirla completa."
          : "No se pudo preparar la exportacion de tu cuenta.",
      },
      {
        status: tooLarge ? 413 : 500,
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      },
    ), auth.requestContext);
  }
}
