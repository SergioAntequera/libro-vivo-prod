import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isAppRole, type ProfileRow } from "@/lib/roles";
import { toErrorMessage } from "@/lib/errorMessage";

type SupabaseErrorLike = {
  code?: unknown;
  message?: unknown;
};

type ProfileSelectRow = {
  id: string;
  name: string | null;
  last_name: string | null;
  pronoun: string | null;
  role: string | null;
  avatar_url: string | null;
};

function isMissingProfileRowError(error: unknown) {
  const maybe = (error ?? {}) as SupabaseErrorLike;
  const code = String(maybe.code ?? "").trim().toUpperCase();
  const msg = String(maybe.message ?? "").toLowerCase();
  if (code === "PGRST116") return true;
  return msg.includes("no rows") || msg.includes("0 rows");
}

function buildDefaultProfileName(user: User) {
  const metadata =
    user.user_metadata && typeof user.user_metadata === "object"
      ? (user.user_metadata as Record<string, unknown>)
      : {};

  const fullName = String(metadata.full_name ?? metadata.name ?? "").trim();
  if (fullName) return fullName;

  const email = String(user.email ?? "").trim();
  if (email && email.includes("@")) {
    const localPart = email.split("@")[0] ?? "";
    const normalized = localPart.replace(/[._-]+/g, " ").trim();
    if (normalized) return normalized;
  }

  return "Usuario";
}

function toProfileRow(raw: ProfileSelectRow): ProfileRow {
  const roleRaw = String(raw.role ?? "").trim();
  if (!isAppRole(roleRaw)) {
    throw new Error(
      `Rol de perfil invalido: "${roleRaw || "vacio"}". Revisa tabla profiles.`,
    );
  }
  return {
    id: raw.id,
    name: raw.name ?? null,
    last_name: raw.last_name ?? null,
    pronoun: raw.pronoun ?? null,
    role: roleRaw,
    avatar_url: raw.avatar_url ?? null,
  };
}

async function selectProfileRowById(client: SupabaseClient, userId: string) {
  return await client
    .from("profiles")
    .select("id,name,last_name,pronoun,role,avatar_url")
    .eq("id", userId)
    .single();
}

export async function getProfileForUserWithClient(
  client: SupabaseClient,
  userId: string,
): Promise<ProfileRow> {
  const { data, error } = await selectProfileRowById(client, userId);

  if (error) {
    throw new Error(
      toErrorMessage(error, "No se pudo cargar el perfil del usuario."),
    );
  }
  return toProfileRow(data as ProfileSelectRow);
}

export async function ensureProfileForUserWithClient(
  client: SupabaseClient,
  user: User,
): Promise<ProfileRow> {
  const current = await selectProfileRowById(client, user.id);
  if (!current.error && current.data) {
    return toProfileRow(current.data as ProfileSelectRow);
  }

  if (current.error && !isMissingProfileRowError(current.error)) {
    throw new Error(
      toErrorMessage(current.error, "No se pudo validar el perfil del usuario."),
    );
  }

  const { error: insertError } = await client.from("profiles").insert({
    id: user.id,
    name: buildDefaultProfileName(user),
    last_name: null,
    pronoun: null,
    role: "gardener_a",
    avatar_url: null,
  });

  if (insertError) {
    const message = toErrorMessage(
      insertError,
      "No se pudo crear perfil inicial.",
    ).toLowerCase();
    const isRaceDuplicate =
      message.includes("duplicate") || message.includes("already exists");
    if (!isRaceDuplicate) {
      throw new Error(
        toErrorMessage(
          insertError,
          "No se pudo crear perfil inicial del usuario.",
        ),
      );
    }
  }

  const retry = await selectProfileRowById(client, user.id);
  if (retry.error || !retry.data) {
    throw new Error(
      toErrorMessage(
        retry.error,
        "No se pudo recuperar el perfil despues de crearlo.",
      ),
    );
  }
  return toProfileRow(retry.data as ProfileSelectRow);
}
