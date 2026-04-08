import { NextResponse } from "next/server";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import { toErrorMessage } from "@/lib/errorMessage";
import { setActiveGardenIdForUser } from "@/lib/gardens";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

type CreatePersonalBody = {
  title?: unknown;
  theme?: unknown;
};

type CreatePersonalRow = {
  bond_id?: unknown;
  garden_id?: unknown;
  garden_title?: unknown;
  out_bond_id?: unknown;
  out_garden_id?: unknown;
  out_garden_title?: unknown;
};

function isAmbiguousColumnError(error: unknown, columnName: string) {
  const message = toErrorMessage(error, "").toLowerCase();
  return (
    message.includes("is ambiguous") &&
    message.includes("column reference") &&
    message.includes(columnName.toLowerCase())
  );
}

export async function POST(req: Request) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  let body: CreatePersonalBody = {};
  try {
    body = (await req.json()) as CreatePersonalBody;
  } catch {
    // Body opcional.
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const theme = typeof body.theme === "string" ? body.theme.trim() : "";

  const { data, error } = await auth.client.rpc("create_private_personal_garden", {
    p_garden_title: title || null,
    p_garden_theme: theme || null,
  });

  if (error) {
    if (isAmbiguousColumnError(error, "bond_id")) {
      const dbMessage = toErrorMessage(error, "column reference bond_id is ambiguous");
      return NextResponse.json(
        {
          error: `Falta aplicar la migración SQL de hotfix para vínculos privados (ambiguous bond_id). Detalle DB: ${dbMessage}`,
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: toErrorMessage(error, "No se pudo crear el jardín personal.") },
      { status: 400 },
    );
  }

  const row = Array.isArray(data) ? (data[0] as CreatePersonalRow | undefined) : null;
  if (!row) {
    return NextResponse.json(
      { error: "No se recibió resultado al crear el jardín personal." },
      { status: 500 },
    );
  }

  const gardenId = String(row.garden_id ?? row.out_garden_id ?? "").trim();
  if (!gardenId) {
    return NextResponse.json(
      { error: "No se recibio garden_id al crear el jardin personal." },
      { status: 500 },
    );
  }

  try {
    await setActiveGardenIdForUser({
      userId: auth.userId,
      gardenId,
      client: getSupabaseAdminClient(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: toErrorMessage(
          error,
          "Se creo el jardin, pero no se pudo fijar como jardin activo.",
        ),
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    personalGarden: {
      bondId: String(row.bond_id ?? row.out_bond_id ?? "").trim(),
      gardenId,
      title: String(row.garden_title ?? row.out_garden_title ?? "").trim() || "Jardín personal",
    },
  });
}
