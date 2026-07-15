import { NextResponse } from "next/server";

import { buildAccountDataExport } from "@/lib/accountDataExport";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  const { data, error: userError } = await auth.client.auth.getUser();
  if (userError || !data.user) {
    return NextResponse.json({ error: "Sesion invalida o expirada." }, { status: 401 });
  }

  try {
    const payload = await buildAccountDataExport({ client: auth.client, user: data.user });
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(`${JSON.stringify(payload, null, 2)}\n`, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="LibroVivo_Datos_${date}.json"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const tooLarge = message.includes("ACCOUNT_EXPORT_TOO_LARGE:");
    return NextResponse.json(
      {
        error: tooLarge
          ? "La exportacion supera el limite automatico. Contacta con soporte para recibirla completa."
          : "No se pudo preparar la exportacion de tu cuenta.",
      },
      {
        status: tooLarge ? 413 : 500,
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      },
    );
  }
}
