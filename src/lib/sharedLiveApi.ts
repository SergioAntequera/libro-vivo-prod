import { getSessionAccessToken } from "@/lib/auth";
import { toErrorMessage } from "@/lib/errorMessage";
import type { SharedLiveSessionScopeKind } from "@/lib/sharedLiveSessions";

type SharedLiveTouchInput = {
  gardenId: string;
  scopeKind: SharedLiveSessionScopeKind;
  scopeKey: string;
  displayName: string;
  ready: boolean;
  holding: boolean;
  activityLabel?: string | null;
  activityProgress?: number | null;
  focusKey?: string | null;
  focusLabel?: string | null;
  cursorOffset?: number | null;
  pointerX?: number | null;
  pointerY?: number | null;
};

type SharedLiveRoutePayload = {
  ok?: boolean;
  error?: unknown;
  serverNow?: string | null;
  rows?: Array<Record<string, unknown>>;
  row?: Record<string, unknown> | null;
};

export type SharedLiveFetchResult = {
  rows: Array<Record<string, unknown>>;
  serverNow: string | null;
};

export type SharedLiveTouchResult = {
  row: Record<string, unknown> | null;
  serverNow: string | null;
};

function normalizeRouteError(payload: SharedLiveRoutePayload | null, fallback: string) {
  return toErrorMessage(payload?.error, fallback);
}

async function createSharedLiveHeaders() {
  const accessToken = await getSessionAccessToken();
  if (!accessToken) {
    throw new Error("No hay sesion activa para sincronizar colaboracion en vivo.");
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function fetchSharedLiveSessions(input: {
  gardenId: string;
  scopeKind: SharedLiveSessionScopeKind;
  scopeKey: string;
}): Promise<SharedLiveFetchResult> {
  const headers = await createSharedLiveHeaders();
  const searchParams = new URLSearchParams({
    gardenId: input.gardenId,
    scopeKind: input.scopeKind,
    scopeKey: input.scopeKey,
  });

  const response = await fetch(`/api/shared-live?${searchParams.toString()}`, {
    method: "GET",
    headers,
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as SharedLiveRoutePayload | null;

  if (!response.ok) {
    throw new Error(normalizeRouteError(payload, "No se pudo leer la presencia compartida."));
  }

  return {
    rows: Array.isArray(payload?.rows) ? payload.rows : [],
    serverNow: typeof payload?.serverNow === "string" ? payload.serverNow : null,
  };
}

export async function touchSharedLiveSession(
  input: SharedLiveTouchInput,
): Promise<SharedLiveTouchResult> {
  const headers = await createSharedLiveHeaders();
  const response = await fetch("/api/shared-live", {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    keepalive: true,
    body: JSON.stringify({
      gardenId: input.gardenId,
      scopeKind: input.scopeKind,
      scopeKey: input.scopeKey,
      displayName: input.displayName,
      ready: input.ready,
      holding: input.holding,
      activityLabel: input.activityLabel ?? null,
      activityProgress: input.activityProgress ?? null,
      focusKey: input.focusKey ?? null,
      focusLabel: input.focusLabel ?? null,
      cursorOffset: input.cursorOffset ?? null,
      pointerX: input.pointerX ?? null,
      pointerY: input.pointerY ?? null,
    }),
  });
  const payload = (await response.json().catch(() => null)) as SharedLiveRoutePayload | null;

  if (!response.ok) {
    throw new Error(normalizeRouteError(payload, "No se pudo renovar la sesion compartida."));
  }

  return {
    row: payload?.row ?? null,
    serverNow: typeof payload?.serverNow === "string" ? payload.serverNow : null,
  };
}

export async function clearSharedLiveSession(input: {
  gardenId: string;
  scopeKind: SharedLiveSessionScopeKind;
  scopeKey: string;
}) {
  const headers = await createSharedLiveHeaders();
  const searchParams = new URLSearchParams({
    gardenId: input.gardenId,
    scopeKind: input.scopeKind,
    scopeKey: input.scopeKey,
  });

  const response = await fetch(`/api/shared-live?${searchParams.toString()}`, {
    method: "DELETE",
    headers,
    cache: "no-store",
    keepalive: true,
  });
  const payload = (await response.json().catch(() => null)) as SharedLiveRoutePayload | null;

  if (!response.ok) {
    throw new Error(normalizeRouteError(payload, "No se pudo limpiar la sesion compartida."));
  }
}
