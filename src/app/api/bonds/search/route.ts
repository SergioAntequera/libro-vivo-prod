import { NextResponse } from "next/server";
import { normalizeInviteCode } from "@/lib/bonds";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import { toErrorMessage } from "@/lib/errorMessage";

type SearchBody = {
  inviteCode?: unknown;
};

type SearchRow = {
  id?: unknown;
  name?: unknown;
  avatar_url?: unknown;
  invite_code?: unknown;
};

function normalizeSearchRow(raw: SearchRow | null) {
  if (!raw) return null;
  const id = String(raw.id ?? "").trim();
  const inviteCode = String(raw.invite_code ?? "").trim();
  if (!id || !inviteCode) return null;
  return {
    id,
    name:
      typeof raw.name === "string" && raw.name.trim().length > 0
        ? raw.name.trim()
        : "Usuario",
    avatarUrl:
      typeof raw.avatar_url === "string" && raw.avatar_url.trim().length > 0
        ? raw.avatar_url.trim()
        : null,
    inviteCode,
  };
}

export async function POST(req: Request) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  let body: SearchBody = {};
  try {
    body = (await req.json()) as SearchBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const inviteCode = normalizeInviteCode(body.inviteCode);
  if (!/^[A-Z0-9]{8}$/.test(inviteCode)) {
    return NextResponse.json(
      { error: "Código inválido. Debe tener 8 caracteres alfanuméricos." },
      { status: 400 },
    );
  }

  const { data, error } = await auth.client.rpc("find_profile_by_invite_code", {
    p_invite_code: inviteCode,
  });

  if (error) {
    return NextResponse.json(
      {
        error: toErrorMessage(error, "No se pudo buscar el perfil por código. Revisa migraciones SQL."),
      },
      { status: 500 },
    );
  }

  const row = Array.isArray(data) ? (data[0] as SearchRow | undefined) : null;
  const profile = normalizeSearchRow(row ?? null);
  return NextResponse.json({ profile });
}
