import { NextResponse } from "next/server";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { ensureProfileForUserWithClient } from "@/lib/profileBootstrap";
import { toErrorMessage } from "@/lib/errorMessage";

export async function POST(req: Request) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  const { data: userData, error: userError } = await auth.client.auth.getUser();
  const user = userData.user ?? null;
  if (userError || !user) {
    return NextResponse.json(
      { error: "Sesion invalida o expirada." },
      { status: 401 },
    );
  }

  let profileClient;
  try {
    profileClient = getSupabaseAdminClient();
  } catch (error) {
    return NextResponse.json(
      {
        error: toErrorMessage(
          error,
          "Falta configurar el cliente admin para preparar perfiles.",
        ),
      },
      { status: 500 },
    );
  }

  try {
    const profile = await ensureProfileForUserWithClient(profileClient, user);
    return NextResponse.json({
      ok: true,
      profile,
      bootstrapMode: "admin",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: toErrorMessage(
          error,
          "No se pudo preparar el perfil de la sesion.",
        ),
      },
      { status: 500 },
    );
  }
}
