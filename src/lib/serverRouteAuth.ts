import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { readAuthAccessTokenFromCookieHeader } from "@/lib/authSessionCookie";
import {
  getPrivilegedRoleFallback,
  hasRole,
  isAppRole,
  type AppRole,
} from "@/lib/roles";
import {
  createServerRequestContext,
  reportServerEvent,
  withRequestId,
  type ServerRequestContext,
} from "@/lib/serverTelemetry";

type AuthOk = {
  ok: true;
  client: SupabaseClient;
  userId: string;
  userEmail: string | null;
  role: AppRole | null;
  requestContext: ServerRequestContext;
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
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}

export async function requireAuthenticatedRoute(req: Request): Promise<AuthResult> {
  const requestContext = createServerRequestContext(req, "auth", "route_authentication");
  const accessToken = readRouteAccessToken(req);
  if (!accessToken) {
    reportServerEvent({
      event: "server.auth.rejected",
      level: "warning",
      context: requestContext,
      data: { reason: "missing_session" },
    });
    return {
      ok: false,
      response: withRequestId(
        NextResponse.json(
          { error: "No autenticado: falta una sesión válida." },
          { status: 401 },
        ),
        requestContext,
      ),
    };
  }

  const client = createTokenClient(accessToken);
  if (!client) {
    reportServerEvent({
      event: "server.auth.configuration_failed",
      level: "error",
      context: requestContext,
      data: { reason: "missing_supabase_env" },
    });
    return {
      ok: false,
      response: withRequestId(
        NextResponse.json(
          { error: "Configuración de Supabase no disponible en el servidor." },
          { status: 500 },
        ),
        requestContext,
      ),
    };
  }

  const { data, error } = await client.auth.getUser();
  const userId = data.user?.id ?? null;
  const userEmail = data.user?.email ?? null;
  if (error || !userId) {
    reportServerEvent({
      event: "server.auth.rejected",
      level: "warning",
      context: requestContext,
      data: { reason: "invalid_or_expired_session" },
    });
    return {
      ok: false,
      response: withRequestId(
        NextResponse.json(
          { error: "Token inválido o sesión expirada." },
          { status: 401 },
        ),
        requestContext,
      ),
    };
  }

  return {
    ok: true,
    client,
    userId,
    userEmail,
    role: null,
    requestContext,
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

  if (error) throw new Error(`No se pudo validar el perfil: ${error.code ?? "query_failed"}`);

  const roleRaw = String((profile as { role?: string } | null)?.role ?? "").trim();
  if (!isAppRole(roleRaw)) return getPrivilegedRoleFallback(userEmail);
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
  } catch {
    reportServerEvent({
      event: "server.auth.role_resolution_failed",
      level: "error",
      context: auth.requestContext,
      data: { reason: "profile_role_query_failed" },
    });
    return {
      ok: false,
      response: withRequestId(
        NextResponse.json(
          { error: "No se pudo validar el rol del perfil." },
          { status: 403 },
        ),
        auth.requestContext,
      ),
    };
  }

  if (!hasRole(role, allowedRoles)) {
    reportServerEvent({
      event: "server.auth.role_rejected",
      level: "warning",
      context: auth.requestContext,
      data: { requiredRoles: allowedRoles },
    });
    return {
      ok: false,
      response: withRequestId(
        NextResponse.json(
          { error: `No autorizado: requiere rol ${allowedRoles.join(" o ")}.` },
          { status: 403 },
        ),
        auth.requestContext,
      ),
    };
  }

  return { ...auth, role };
}

export async function requireSuperadminRoute(req: Request): Promise<AuthResult> {
  return requireRoleRoute(req, ["superadmin"]);
}
