import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getPrivilegedRoleFallback,
  hasRole,
  isAppRole,
  type AppRole,
} from "@/lib/roles";
import { readAuthAccessTokenFromCookieHeader } from "@/lib/authSessionCookie";

type AuthOk = {
  ok: true;
  client: SupabaseClient;
  userId: string;
  userEmail: string | null;
  role: AppRole | null;
};

type AuthFail = {
  ok: false;
  response: NextResponse;
};

type AuthResult = AuthOk | AuthFail;

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

function readBearerToken(req: Request) {
  const raw = req.headers.get("authorization");
  if (!raw) return null;
  const match = /^Bearer\s+(.+)$/i.exec(raw.trim());
  if (!match) return null;
  const token = match[1]?.trim();
  return token || null;
}

function readRouteAccessToken(req: Request) {
  return readBearerToken(req) ?? readAuthAccessTokenFromCookieHeader(req.headers.get("cookie"));
}

function createTokenClient(accessToken: string) {
  const env = getSupabaseEnv();
  if (!env) return null;
  return createClient(env.url, env.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export async function requireAuthenticatedRoute(req: Request): Promise<AuthResult> {
  const accessToken = readRouteAccessToken(req);
  if (!accessToken) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "No autenticado: falta sesion valida." },
        { status: 401 },
      ),
    };
  }

  const client = createTokenClient(accessToken);
  if (!client) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Config de Supabase no disponible en servidor." },
        { status: 500 },
      ),
    };
  }

  const { data, error } = await client.auth.getUser();
  const userId = data.user?.id ?? null;
  const userEmail = data.user?.email ?? null;
  if (error || !userId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Token invalido o sesión expirada." },
        { status: 401 },
      ),
    };
  }

  return {
    ok: true,
    client,
    userId,
    userEmail,
    role: null,
  };
}

async function resolveAuthenticatedRole(
  client: SupabaseClient,
  userId: string,
  userEmail: string | null,
): Promise<AppRole | null> {
  const { data: profile, error } = await client
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo validar perfil: ${error.message}`);
  }

  const roleRaw = String((profile as { role?: string } | null)?.role ?? "").trim();
  if (!isAppRole(roleRaw)) {
    return getPrivilegedRoleFallback(userEmail);
  }
  return roleRaw;
}

export async function requireRoleRoute(
  req: Request,
  allowedRoles: readonly AppRole[],
): Promise<AuthResult> {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth;

  let role: AppRole | null = null;
  try {
    role = await resolveAuthenticatedRole(auth.client, auth.userId, auth.userEmail);
  } catch (error) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "No se pudo validar rol del perfil.",
        },
        { status: 403 },
      ),
    };
  }

  if (!hasRole(role, allowedRoles)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: `No autorizado: requiere rol ${allowedRoles.join(" o ")}.`,
        },
        { status: 403 },
      ),
    };
  }

  return {
    ...auth,
    role,
  };
}

export async function requireSuperadminRoute(req: Request): Promise<AuthResult> {
  return requireRoleRoute(req, ["superadmin"]);
}
