import { NextResponse } from "next/server";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import { toErrorMessage } from "@/lib/errorMessage";

type MeRow = {
  id?: unknown;
  name?: unknown;
  invite_code?: unknown;
  active_garden_id?: unknown;
};

export async function GET(req: Request) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.client
    .from("profiles")
    .select("id,name,invite_code,active_garden_id")
    .eq("id", auth.userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: toErrorMessage(error, "No se pudo cargar tu código de invitación.") },
      { status: 500 },
    );
  }

  const row = (data as MeRow | null) ?? null;
  if (!row || !row.id) {
    return NextResponse.json(
      { error: "No se encontró perfil para esta sesión." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    me: {
      id: String(row.id),
      name:
        typeof row.name === "string" && row.name.trim().length > 0
          ? row.name.trim()
          : "Usuario",
      inviteCode:
        typeof row.invite_code === "string" && row.invite_code.trim().length > 0
          ? row.invite_code.trim()
          : null,
      activeGardenId:
        typeof row.active_garden_id === "string" && row.active_garden_id.trim().length > 0
          ? row.active_garden_id.trim()
          : null,
    },
  });
}
