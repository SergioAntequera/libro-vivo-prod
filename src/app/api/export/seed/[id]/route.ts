import { NextResponse } from "next/server";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import { resolveActiveGardenIdForUser } from "@/lib/gardens";
import { toErrorMessage } from "@/lib/errorMessage";
import { loadSeedEventSummaryModel } from "@/lib/seedEventReminderData";
import { buildSeedEventPdfBytes } from "@/lib/seedEventPdfDocumentBuilder";

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
        { error: "No hay jardin activo para exportar esta semilla." },
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

    const pdfBytes = await buildSeedEventPdfBytes(summary);
    const safeName = (summary.seed.title || "semilla")
      .replace(/[^\w\s-]+/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 48);

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="LibroVivo_${safeName || "semilla"}.pdf"`,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: toErrorMessage(error, "No se pudo exportar el PDF de la semilla.") },
      { status: 500 },
    );
  }
}
