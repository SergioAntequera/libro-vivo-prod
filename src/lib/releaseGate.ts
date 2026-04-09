import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

const RELEASE_SETTINGS_ROW_ID = 1;
const CEREMONY_SELECT =
  "release_unlocked_at,release_left_name,release_left_confirmed_at,release_right_name,release_right_confirmed_at";

type ReleaseGateRow = {
  release_unlocked_at: string | null;
  release_left_name: string | null;
  release_left_confirmed_at: string | null;
  release_right_name: string | null;
  release_right_confirmed_at: string | null;
};

export type PublicReleaseGateState = {
  unlocked: boolean;
  unlockedAt: string | null;
};

export type PublicReleaseCeremonyState = PublicReleaseGateState & {
  firstName: string | null;
  firstConfirmedAt: string | null;
  firstReady: boolean;
  secondName: string | null;
  secondConfirmedAt: string | null;
  secondReady: boolean;
};

function normalizeErrorMessage(error: unknown) {
  return String(
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? (error as { message?: unknown }).message
        : error ?? "",
  )
    .trim()
    .toLowerCase();
}

function isMissingReleaseColumnError(error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "").trim()
      : "";
  const message = normalizeErrorMessage(error);
  return code === "PGRST204" || message.includes("release_unlocked_at");
}

function isMissingAdminEnvError(error: unknown) {
  return normalizeErrorMessage(error).includes(
    "falta next_public_supabase_url o supabase_service_role_key",
  );
}

function toCeremonyState(row: ReleaseGateRow | null | undefined): PublicReleaseCeremonyState {
  const unlockedAt = row?.release_unlocked_at ?? null;
  const firstName = row?.release_left_name ?? null;
  const firstConfirmedAt = row?.release_left_confirmed_at ?? null;
  const secondName = row?.release_right_name ?? null;
  const secondConfirmedAt = row?.release_right_confirmed_at ?? null;

  return {
    unlocked: Boolean(unlockedAt),
    unlockedAt,
    firstName,
    firstConfirmedAt,
    firstReady: Boolean(firstConfirmedAt),
    secondName,
    secondConfirmedAt,
    secondReady: Boolean(secondConfirmedAt),
  };
}

async function readReleaseCeremonyRow() {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("settings")
    .select(CEREMONY_SELECT)
    .eq("id", RELEASE_SETTINGS_ROW_ID)
    .maybeSingle<ReleaseGateRow>();

  if (error) throw error;
  return data;
}

async function finalizeReleaseCeremonyIfReady(row?: ReleaseGateRow | null) {
  const current = row ?? (await readReleaseCeremonyRow());
  if (!current) return current;
  if (current.release_unlocked_at) return current;
  if (!current.release_left_confirmed_at || !current.release_right_confirmed_at) {
    return current;
  }

  const admin = getSupabaseAdminClient();
  const unlockedAt = new Date().toISOString();

  const { data, error } = await admin
    .from("settings")
    .update({
      release_unlocked_at: unlockedAt,
      release_left_name: null,
      release_left_confirmed_at: null,
      release_right_name: null,
      release_right_confirmed_at: null,
    })
    .eq("id", RELEASE_SETTINGS_ROW_ID)
    .select(CEREMONY_SELECT)
    .single<ReleaseGateRow>();

  if (error) throw error;
  return data;
}

export async function getPublicReleaseGateState(): Promise<PublicReleaseGateState> {
  try {
    const row = await finalizeReleaseCeremonyIfReady(await readReleaseCeremonyRow());
    return {
      unlocked: Boolean(row?.release_unlocked_at),
      unlockedAt: row?.release_unlocked_at ?? null,
    };
  } catch (error) {
    if (isMissingAdminEnvError(error) || isMissingReleaseColumnError(error)) {
      return { unlocked: true, unlockedAt: null };
    }
    throw error;
  }
}

export async function getPublicReleaseCeremonyState(): Promise<PublicReleaseCeremonyState> {
  try {
    const row = await finalizeReleaseCeremonyIfReady(await readReleaseCeremonyRow());
    return toCeremonyState(row);
  } catch (error) {
    if (isMissingAdminEnvError(error) || isMissingReleaseColumnError(error)) {
      return {
        unlocked: true,
        unlockedAt: null,
        firstName: null,
        firstConfirmedAt: null,
        firstReady: false,
        secondName: null,
        secondConfirmedAt: null,
        secondReady: false,
      };
    }
    throw error;
  }
}

export async function confirmPublicReleaseCeremonyName(nameInput: string) {
  const name = nameInput.trim();
  if (!name) {
    throw new Error("Escribe un nombre antes de dar el si.");
  }

  const admin = getSupabaseAdminClient();
  const current = await readReleaseCeremonyRow();
  const normalizedName = name.toLowerCase();

  if (current?.release_unlocked_at) {
    return getPublicReleaseCeremonyState();
  }

  const firstName = String(current?.release_left_name ?? "").trim();
  const secondName = String(current?.release_right_name ?? "").trim();

  if (firstName && firstName.toLowerCase() === normalizedName) {
    return getPublicReleaseCeremonyState();
  }

  if (secondName && secondName.toLowerCase() === normalizedName) {
    return getPublicReleaseCeremonyState();
  }

  const now = new Date().toISOString();

  const update =
    !current?.release_left_confirmed_at
      ? {
          id: RELEASE_SETTINGS_ROW_ID,
          release_left_name: name,
          release_left_confirmed_at: now,
        }
      : !current?.release_right_confirmed_at
        ? {
            id: RELEASE_SETTINGS_ROW_ID,
            release_right_name: name,
            release_right_confirmed_at: now,
          }
        : null;

  if (!update) {
    return getPublicReleaseCeremonyState();
  }

  const { error } = await admin.from("settings").upsert(update, { onConflict: "id" });
  if (error) throw error;

  return getPublicReleaseCeremonyState();
}
