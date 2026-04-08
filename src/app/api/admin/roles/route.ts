import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { APP_ROLES, isAppRole, roleLabel, type AppRole } from "@/lib/roles";
import { requireSuperadminRoute } from "@/lib/serverRouteAuth";

type ProfileAdminRow = {
  id: string;
  name: string | null;
  role: AppRole;
  avatar_url: string | null;
};

type RawProfileRow = {
  id?: unknown;
  name?: unknown;
  role?: unknown;
  avatar_url?: unknown;
};

type PatchPayload = {
  profileId?: unknown;
  role?: unknown;
};

const POLICY_HINT =
  "Ejecuta supabase/sql/2026-03-10_profiles_superadmin_management.sql y vuelve a intentar.";

function normalizeProfileRow(raw: RawProfileRow): ProfileAdminRow | null {
  const id = String(raw.id ?? "").trim();
  const roleRaw = String(raw.role ?? "").trim();
  if (!id || !isAppRole(roleRaw)) return null;

  return {
    id,
    name:
      typeof raw.name === "string" && raw.name.trim().length > 0
        ? raw.name.trim()
        : null,
    role: roleRaw,
    avatar_url:
      typeof raw.avatar_url === "string" && raw.avatar_url.trim().length > 0
        ? raw.avatar_url.trim()
        : null,
  };
}

async function countSuperadminsById(client: SupabaseClient) {
  const { data, error } = await client
    .from("profiles")
    .select("id")
    .eq("role", "superadmin");

  if (error) throw error;

  const ids = new Set<string>();
  for (const row of ((data as { id?: unknown }[] | null) ?? [])) {
    const id = String(row.id ?? "").trim();
    if (id) ids.add(id);
  }
  return ids;
}

export async function GET(req: Request) {
  const auth = await requireSuperadminRoute(req);
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.client
    .from("profiles")
    .select("id,name,role,avatar_url")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json(
      {
        error: `No se pudo leer perfiles: ${error.message}. ${POLICY_HINT}`,
        profiles: [] as ProfileAdminRow[],
      },
      { status: 500 },
    );
  }

  const profiles = (((data as RawProfileRow[] | null) ?? [])
    .map((row) => normalizeProfileRow(row))
    .filter((row): row is ProfileAdminRow => row !== null)
  ).sort((a, b) => {
    const an = (a.name ?? "").toLowerCase();
    const bn = (b.name ?? "").toLowerCase();
    if (an && bn) return an.localeCompare(bn, "es");
    if (an) return -1;
    if (bn) return 1;
    return a.id.localeCompare(b.id, "es");
  });

  return NextResponse.json({
    profiles,
    roles: APP_ROLES.map((role) => ({ role, label: roleLabel(role) })),
  });
}

export async function PATCH(req: Request) {
  const auth = await requireSuperadminRoute(req);
  if (!auth.ok) return auth.response;

  let body: PatchPayload = {};
  try {
    body = (await req.json()) as PatchPayload;
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const profileId = String(body.profileId ?? "").trim();
  const nextRole = String(body.role ?? "").trim();

  if (!profileId) {
    return NextResponse.json(
      { error: "Falta profileId." },
      { status: 400 },
    );
  }
  if (!isAppRole(nextRole)) {
    return NextResponse.json(
      { error: `Rol invalido. Usa: ${APP_ROLES.join(", ")}` },
      { status: 400 },
    );
  }

  const { data: targetRow, error: targetError } = await auth.client
    .from("profiles")
    .select("id,name,role,avatar_url")
    .eq("id", profileId)
    .maybeSingle();

  if (targetError) {
    return NextResponse.json(
      {
        error: `No se pudo validar el perfil objetivo: ${targetError.message}. ${POLICY_HINT}`,
      },
      { status: 500 },
    );
  }

  const current = normalizeProfileRow((targetRow as RawProfileRow) ?? {});
  if (!current) {
    return NextResponse.json({ error: "Perfil no encontrado." }, { status: 404 });
  }

  if (current.role === nextRole) {
    return NextResponse.json({ profile: current, unchanged: true });
  }

  if (current.role === "superadmin" && nextRole !== "superadmin") {
    try {
      const superadminIds = await countSuperadminsById(auth.client);
      if (superadminIds.size <= 1 && superadminIds.has(current.id)) {
        return NextResponse.json(
          { error: "No puedes quitar el último superadmin del sistema." },
          { status: 400 },
        );
      }
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? `No se pudo validar superadmins: ${error.message}`
              : "No se pudo validar superadmins.",
        },
        { status: 500 },
      );
    }
  }

  const { data: updatedRow, error: updateError } = await auth.client
    .from("profiles")
    .update({ role: nextRole })
    .eq("id", profileId)
    .select("id,name,role,avatar_url")
    .maybeSingle();

  if (updateError) {
    return NextResponse.json(
      {
        error: `No se pudo actualizar el rol: ${updateError.message}. ${POLICY_HINT}`,
      },
      { status: 500 },
    );
  }

  const updated = normalizeProfileRow((updatedRow as RawProfileRow) ?? {});
  if (!updated) {
    return NextResponse.json(
      { error: "Respuesta invalida tras actualizar el rol." },
      { status: 500 },
    );
  }

  return NextResponse.json({ profile: updated });
}
