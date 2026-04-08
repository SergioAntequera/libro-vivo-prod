import { NextResponse } from "next/server";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import { toErrorMessage } from "@/lib/errorMessage";
import { normalizeCapsuleRow, type TimeCapsuleRow } from "@/lib/timeCapsuleModel";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "ID de capsula no valido." }, { status: 400 });
    }

    const { data: capsule, error: fetchError } = await auth.client
      .from("time_capsules")
      .select("id,status,opens_at")
      .eq("id", id)
      .single();

    if (fetchError || !capsule) {
      return NextResponse.json({ error: "Capsula no encontrada." }, { status: 404 });
    }

    if (capsule.status === "opened") {
      return NextResponse.json(
        { error: "Esta capsula ya fue abierta." },
        { status: 400 },
      );
    }

    if (capsule.status === "sealed" && new Date(capsule.opens_at) > new Date()) {
      return NextResponse.json(
        { error: "Esta capsula aun no esta lista para abrir." },
        { status: 400 },
      );
    }

    const { data, error } = await auth.client
      .from("time_capsules")
      .update({
        status: "opened",
        opened_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { error: toErrorMessage(error, "No se pudo abrir la capsula.") },
        { status: 500 },
      );
    }

    return NextResponse.json({
      capsule: normalizeCapsuleRow(data as TimeCapsuleRow, (data as TimeCapsuleRow).id),
    });
  } catch (error) {
    return NextResponse.json(
      { error: toErrorMessage(error, "No se pudo abrir la capsula.") },
      { status: 500 },
    );
  }
}
