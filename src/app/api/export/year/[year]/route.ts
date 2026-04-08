import { NextResponse } from "next/server";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import { resolveActiveGardenIdForUser, withGardenScope } from "@/lib/gardens";
import { buildYearPdfBytes } from "@/lib/yearPdfDocumentBuilder";
import { toErrorMessage, type ExportItem } from "@/lib/yearPdfExportHelpers";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ year: string }> },
) {
  try {
    const auth = await requireAuthenticatedRoute(req);
    if (!auth.ok) return auth.response;

    const { year } = await ctx.params;
    const y = Number(year);
    if (!y || y < 1970 || y > 3000) {
      return NextResponse.json({ error: "Year invalido" }, { status: 400 });
    }

    const from = `${y}-01-01`;
    const to = `${y}-12-31`;
    const activeGardenId = await resolveActiveGardenIdForUser({
      userId: auth.userId,
      client: auth.client,
    }).catch(() => null);

    if (!activeGardenId) {
      return NextResponse.json(
        { error: "No hay jardín activo. Selecciona un jardín antes de exportar." },
        { status: 409 },
      );
    }

    const { data: membership, error: membershipError } = await auth.client
      .from("garden_members")
      .select("id")
      .eq("garden_id", activeGardenId)
      .eq("user_id", auth.userId)
      .is("left_at", null)
      .maybeSingle();

    if (membershipError) {
      return NextResponse.json(
        {
          error: `No se pudo validar acceso al jardín activo: ${membershipError.message}`,
        },
        { status: 500 },
      );
    }

    if (!membership) {
      return NextResponse.json(
        { error: "No tienes acceso al jardín activo para exportar." },
        { status: 403 },
      );
    }

    const pagesQuery = withGardenScope(
      auth.client
        .from("pages")
        .select(
          "id,title,date,element,plan_type_id,plan_summary,location_lat,location_lng,location_label,rating,mood_state,thumbnail_url,cover_photo_url,canvas_objects,audio_url,audio_label,is_favorite",
        )
        .gte("date", from)
        .lte("date", to)
        .order("date", { ascending: true }),
      activeGardenId,
    );
    const { data: pages, error } = await pagesQuery;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = (pages ?? []) as ExportItem[];
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const pdfBytes = await buildYearPdfBytes({
      client: auth.client,
      items,
      year: y,
      activeGardenId,
      siteUrl,
    });

    return new NextResponse(pdfBytes.buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="LibroVivo_${y}.pdf"`,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: toErrorMessage(error, "Error exportando PDF") },
      { status: 500 },
    );
  }
}
