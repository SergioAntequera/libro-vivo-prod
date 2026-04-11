import { NextResponse } from "next/server";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import { toErrorMessage } from "@/lib/errorMessage";
import {
  isSharedLiveSessionScopeKind,
  SHARED_LIVE_SESSION_SELECT,
} from "@/lib/sharedLiveSessions";
import { withGardenIdOnInsert } from "@/lib/gardens";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function jsonNoStore(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...NO_STORE_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
}

function readNonEmptyString(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
}

function readNullableString(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
}

function readNullableFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readScopeKind(value: unknown) {
  return isSharedLiveSessionScopeKind(value) ? value : null;
}

function readRequestQuery(req: Request) {
  const searchParams = new URL(req.url).searchParams;
  return {
    gardenId: readNonEmptyString(searchParams.get("gardenId")),
    scopeKind: readScopeKind(searchParams.get("scopeKind")),
    scopeKey: readNonEmptyString(searchParams.get("scopeKey")),
  };
}

function readRowUpdatedAt(value: unknown) {
  if (typeof value !== "object" || value === null) return null;
  const updatedAt = (value as { updated_at?: unknown }).updated_at;
  return typeof updatedAt === "string" && updatedAt.trim() ? updatedAt : null;
}

async function readSharedLiveServerNow(client: any) {
  const fallback = new Date().toISOString();
  try {
    const { data, error } = await client.rpc("shared_live_server_now");
    if (error) return fallback;
    return typeof data === "string" && data.trim() ? data : fallback;
  } catch {
    return fallback;
  }
}

export async function GET(req: Request) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  const { gardenId, scopeKind, scopeKey } = readRequestQuery(req);
  if (!gardenId || !scopeKind || !scopeKey) {
    return jsonNoStore({ error: "Faltan gardenId, scopeKind o scopeKey." }, { status: 400 });
  }

  try {
    const { data, error } = await auth.client
      .from("shared_live_sessions")
      .select(SHARED_LIVE_SESSION_SELECT)
      .eq("garden_id", gardenId)
      .eq("scope_kind", scopeKind)
      .eq("scope_key", scopeKey)
      .order("updated_at", { ascending: false });

    if (error) {
      return jsonNoStore(
        { error: toErrorMessage(error, "No se pudo leer la sesion compartida.") },
        { status: 500 },
      );
    }

    const latestRowUpdatedAt = Array.isArray(data) ? readRowUpdatedAt(data[0]) : null;
    const serverNow = latestRowUpdatedAt ?? (await readSharedLiveServerNow(auth.client));

    return jsonNoStore({
      ok: true,
      serverNow,
      rows: Array.isArray(data) ? data : [],
    });
  } catch (error) {
    return jsonNoStore(
      { error: toErrorMessage(error, "No se pudo leer la sesion compartida.") },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonNoStore({ error: "El cuerpo de la peticion no es JSON valido." }, { status: 400 });
  }

  const gardenId = readNonEmptyString(body.gardenId);
  const scopeKind = readScopeKind(body.scopeKind);
  const scopeKey = readNonEmptyString(body.scopeKey);
  const displayName = readNonEmptyString(body.displayName) ?? "Sin nombre";

  if (!gardenId || !scopeKind || !scopeKey) {
    return jsonNoStore({ error: "Faltan gardenId, scopeKind o scopeKey." }, { status: 400 });
  }

  const payload = withGardenIdOnInsert(
    {
      scope_kind: scopeKind,
      scope_key: scopeKey,
      user_id: auth.userId,
      display_name: displayName,
      ready: Boolean(body.ready),
      holding: Boolean(body.holding),
      activity_label: readNullableString(body.activityLabel),
      activity_progress: readNullableFiniteNumber(body.activityProgress),
      focus_key: readNullableString(body.focusKey),
      focus_label: readNullableString(body.focusLabel),
      cursor_offset: readNullableFiniteNumber(body.cursorOffset),
      pointer_x: readNullableFiniteNumber(body.pointerX),
      pointer_y: readNullableFiniteNumber(body.pointerY),
      updated_at: new Date().toISOString(),
    },
    gardenId,
  );

  try {
    const { data, error } = await auth.client
      .from("shared_live_sessions")
      .upsert(payload, { onConflict: "scope_kind,scope_key,user_id" })
      .select(SHARED_LIVE_SESSION_SELECT)
      .single();

    if (error) {
      return jsonNoStore(
        { error: toErrorMessage(error, "No se pudo renovar la sesion compartida.") },
        { status: 500 },
      );
    }

    const serverNow = readRowUpdatedAt(data) ?? (await readSharedLiveServerNow(auth.client));

    return jsonNoStore({
      ok: true,
      serverNow,
      row: data ?? null,
    });
  } catch (error) {
    return jsonNoStore(
      { error: toErrorMessage(error, "No se pudo renovar la sesion compartida.") },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  const { gardenId, scopeKind, scopeKey } = readRequestQuery(req);
  if (!gardenId || !scopeKind || !scopeKey) {
    return jsonNoStore({ error: "Faltan gardenId, scopeKind o scopeKey." }, { status: 400 });
  }

  try {
    const { error } = await auth.client
      .from("shared_live_sessions")
      .delete()
      .eq("garden_id", gardenId)
      .eq("scope_kind", scopeKind)
      .eq("scope_key", scopeKey)
      .eq("user_id", auth.userId);

    if (error) {
      return jsonNoStore(
        { error: toErrorMessage(error, "No se pudo cerrar la sesion compartida.") },
        { status: 500 },
      );
    }

    return jsonNoStore({ ok: true });
  } catch (error) {
    return jsonNoStore(
      { error: toErrorMessage(error, "No se pudo cerrar la sesion compartida.") },
      { status: 500 },
    );
  }
}
