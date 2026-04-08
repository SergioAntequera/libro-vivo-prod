import { NextResponse } from "next/server";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import { resolveActiveGardenIdForUser } from "@/lib/gardens";
import { toErrorMessage } from "@/lib/errorMessage";
import { loadSeedEventSummaryModel } from "@/lib/seedEventReminderData";
import { buildSeedEventReminderEmailModel } from "@/lib/seedEventReminderCopy";
import { renderSeedEventReminderHtml } from "@/lib/seedEventReminderMailer";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuthenticatedRoute(req);
    if (!auth.ok) return auth.response;

    const { id } = await ctx.params;
    const seedId = String(id ?? "").trim();
    if (!seedId) {
      return NextResponse.json({ error: "Falta id de semilla." }, { status: 400 });
    }

    const activeGardenId = await resolveActiveGardenIdForUser({
      userId: auth.userId,
      client: auth.client,
    }).catch(() => null);

    if (!activeGardenId) {
      return NextResponse.json(
        { error: "No hay jardin activo para previsualizar esta semilla." },
        { status: 409 },
      );
    }

    const summary = await loadSeedEventSummaryModel({
      client: auth.client,
      seedId,
      gardenId: activeGardenId,
    });

    if (!summary) {
      return NextResponse.json({ error: "Semilla no encontrada." }, { status: 404 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const emailModel = buildSeedEventReminderEmailModel(summary, { siteUrl });
    const html = renderSeedEventReminderHtml(emailModel);

    return new NextResponse(
      `<!doctype html><html lang="es"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${emailModel.subject}</title></head><body style="margin:0;background:#f5f7f2;">${html}</body></html>`,
      {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      },
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: toErrorMessage(error, "No se pudo generar la preview del email de semilla.") },
      { status: 500 },
    );
  }
}
