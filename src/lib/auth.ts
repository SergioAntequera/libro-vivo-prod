import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { isSuperadminRole, type ProfileRow } from "@/lib/roles";
import { toErrorMessage } from "@/lib/errorMessage";
import { getProfileForUserWithClient } from "@/lib/profileBootstrap";

type RouterLike = {
  push: (href: string) => void;
  replace?: (href: string) => void;
};

type SessionWithProfile = {
  user: User;
  profile: ProfileRow;
};

export async function getSessionUser() {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function getSessionAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function redirectWithRouter(router: RouterLike, href: string) {
  if (typeof router.replace === "function") {
    router.replace(href);
    return;
  }
  router.push(href);
}

export async function getMyProfile(userId: string): Promise<ProfileRow> {
  return getProfileForUserWithClient(supabase, userId);
}

export async function ensureProfileForUser(user: User): Promise<ProfileRow> {
  const accessToken = await getSessionAccessToken();
  if (!accessToken) {
    throw new Error("No se pudo preparar el perfil: falta token de sesion.");
  }

  const response = await fetch("/api/auth/profile", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const payload = (await response.json().catch(() => null)) as {
    profile?: ProfileRow;
    error?: unknown;
  } | null;

  if (!response.ok || !payload?.profile) {
    throw new Error(
      typeof payload?.error === "string"
        ? payload.error
        : "No se pudo preparar el perfil de usuario.",
    );
  }

  if (payload.profile.id !== user.id) {
    throw new Error("El perfil preparado no corresponde a la sesion actual.");
  }

  return payload.profile;
}

export async function getSessionWithProfile(): Promise<SessionWithProfile | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const profile = await ensureProfileForUser(user);
  return { user, profile };
}

export async function ensureSuperadminOrRedirect(
  router: RouterLike,
): Promise<SessionWithProfile | null> {
  try {
    const session = await getSessionWithProfile();
    if (!session) {
      redirectWithRouter(router, "/login");
      return null;
    }
    if (!isSuperadminRole(session.profile.role)) {
      redirectWithRouter(router, "/home");
      return null;
    }
    return session;
  } catch (error) {
    console.error(
      "[ensureSuperadminOrRedirect] fallo validando sesion/perfil:",
      toErrorMessage(error, "error desconocido"),
    );
    redirectWithRouter(router, "/login");
    return null;
  }
}

/** Row shape returned by the `settings` table (id = 1). */
export type AppSettings = {
  id: number;
  garden_name: string | null;
  primary_color: string | null;
  ui_theme: string | null;
  welcome_text: string | null;
  narrator_tone: string | null;
  season_mode: string | null;
  [key: string]: unknown;
};

export async function getSettings(): Promise<AppSettings> {
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    throw new Error(
      toErrorMessage(error, "No se pudo cargar la configuracion."),
    );
  }
  return data as AppSettings;
}
