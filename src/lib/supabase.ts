import { createClient } from "@supabase/supabase-js";

const supabaseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseAnonKey = String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
const AUTH_PERSISTENCE_KEY = "libro-vivo-auth-persistence";
const SUPABASE_AUTH_STORAGE_KEY = resolveSupabaseAuthStorageKey(supabaseUrl);
const memoryAuthStorage = new Map<string, string>();

type AuthPersistence = "local" | "session";

function resolveSupabaseAuthStorageKey(url: string) {
  try {
    const hostname = new URL(url).hostname;
    const projectRef = hostname.split(".")[0]?.trim();
    return projectRef ? `sb-${projectRef}-auth-token` : "";
  } catch {
    return "";
  }
}

function getAuthPersistence(): AuthPersistence {
  if (typeof window === "undefined") return "local";

  try {
    return window.localStorage.getItem(AUTH_PERSISTENCE_KEY) === "session"
      ? "session"
      : "local";
  } catch {
    return "local";
  }
}

function getSelectedWebStorage() {
  if (typeof window === "undefined") return null;

  try {
    return getAuthPersistence() === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

function removeStoredAuthSession(storage: Storage) {
  if (!SUPABASE_AUTH_STORAGE_KEY) return;
  storage.removeItem(SUPABASE_AUTH_STORAGE_KEY);
}

export function setAuthSessionPersistence(rememberSession: boolean) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      AUTH_PERSISTENCE_KEY,
      rememberSession ? "local" : "session",
    );

    removeStoredAuthSession(rememberSession ? window.sessionStorage : window.localStorage);
  } catch {
    // If storage is blocked, Supabase falls back to the in-memory adapter below.
  }
}

export function getAuthSessionPersistencePreference() {
  return getAuthPersistence() === "local";
}

const authStorage = {
  getItem(key: string) {
    const storage = getSelectedWebStorage();
    return storage?.getItem(key) ?? memoryAuthStorage.get(key) ?? null;
  },
  setItem(key: string, value: string) {
    const storage = getSelectedWebStorage();
    if (storage) {
      try {
        storage.setItem(key, value);
        return;
      } catch {
        // Fall through to in-memory storage.
      }
    }
    memoryAuthStorage.set(key, value);
  },
  removeItem(key: string) {
    const storage = getSelectedWebStorage();
    if (storage) {
      try {
        storage.removeItem(key);
        return;
      } catch {
        // Fall through to in-memory storage.
      }
    }
    memoryAuthStorage.delete(key);
  },
};

if (!supabaseUrl) {
  throw new Error(
    [
      "Falta NEXT_PUBLIC_SUPABASE_URL.",
      "Revisa .env.local o .env.",
      "Si acabas de mover el proyecto a otro PC, seguramente falta copiar ese archivo local de configuraci\u00f3n.",
    ].join(" "),
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    [
      "Falta NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      "Revisa .env.local o .env.",
      "Si acabas de mover el proyecto a otro PC, seguramente falta copiar ese archivo local de configuraci\u00f3n.",
    ].join(" "),
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
    storage: authStorage,
  },
});
