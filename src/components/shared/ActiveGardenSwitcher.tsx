"use client";

import { useEffect, useState } from "react";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { getSessionAccessToken } from "@/lib/auth";
import { describeGardenSwitcherContext } from "@/lib/bonds";
import { clearActiveGardenCache } from "@/lib/gardens";
import { toErrorMessage } from "@/lib/errorMessage";

type GardenSummary = {
  id: string;
  title: string;
  memberRole: string;
  bondType?: string | null;
  status?: string | null;
  participants?: Array<{
    id: string;
    name: string;
    avatarUrl: string | null;
    role: string;
    isCurrentUser: boolean;
  }>;
};

type GardensPayload = {
  activeGardenId: string | null;
  gardens: GardenSummary[];
};

type SetActiveGardenPayload = {
  ok: boolean;
  activeGardenId: string | null;
};

type ActiveGardenSwitcherProps = {
  className?: string;
  compact?: boolean;
  onChanged?: (gardenId: string | null) => void;
};

function shortenLabel(value: string, maxLength: number) {
  const next = value.trim();
  if (next.length <= maxLength) return next;
  return `${next.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function buildGardenOptionLabel(garden: GardenSummary, compact: boolean) {
  const title = String(garden.title ?? "").trim() || "Jardin sin titulo";
  const context = describeGardenSwitcherContext(garden);

  if (!compact) return `${title} · ${context}`;
  if (context === "solo tu") return shortenLabel(title, 26);

  return `${shortenLabel(title, 18)} · ${context}`;
}

async function callAuthedApi<T>(
  token: string,
  input: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(input, {
    ...init,
    headers,
    credentials: "same-origin",
  });

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await res.json() : null;

  if (!res.ok) {
    const message =
      payload && typeof payload.error === "string"
        ? payload.error
        : `Error HTTP ${res.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export default function ActiveGardenSwitcher({
  className,
  compact = false,
  onChanged,
}: ActiveGardenSwitcherProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gardens, setGardens] = useState<GardenSummary[]>([]);
  const [activeGardenId, setActiveGardenId] = useState<string | null>(null);

  async function withToken<T>(fn: (token: string) => Promise<T>) {
    const token = await getSessionAccessToken();
    if (!token) {
      throw new Error("Sesión expirada. Vuelve a iniciar sesión.");
    }
    return fn(token);
  }

  async function loadGardens() {
    setError(null);
    setLoading(true);
    try {
      const payload = await withToken((token) =>
        callAuthedApi<GardensPayload>(token, "/api/gardens"),
      );
      const nextGardens = (payload.gardens ?? []).filter(
        (garden) => String(garden.status ?? "").trim().toLowerCase() !== "archived",
      );
      setGardens(nextGardens);
      setActiveGardenId(payload.activeGardenId ?? null);
    } catch (nextError) {
      setError(toErrorMessage(nextError, "No se pudieron cargar tus jardines."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadGardens();
  }, []);

  async function handleSwitch(nextGardenId: string) {
    if (!nextGardenId || nextGardenId === activeGardenId) return;
    setError(null);
    setSaving(true);
    try {
      const payload = await withToken((token) =>
        callAuthedApi<SetActiveGardenPayload>(token, "/api/gardens/active", {
          method: "PATCH",
          body: JSON.stringify({ gardenId: nextGardenId }),
        }),
      );
      clearActiveGardenCache();
      setActiveGardenId(payload.activeGardenId ?? null);
      onChanged?.(payload.activeGardenId ?? null);
    } catch (nextError) {
      setError(toErrorMessage(nextError, "No se pudo cambiar el jardín activo."));
    } finally {
      setSaving(false);
    }
  }

  const selectPadding = compact ? "px-3 py-1 text-xs" : "px-3 py-2 text-sm";
  const wrapperClass = className ? `${className} space-y-1` : "space-y-1";

  return (
    <div className={wrapperClass}>
      {!compact ? (
        <div className="text-xs text-[var(--lv-text-muted)]">Jardin activo</div>
      ) : null}
      <select
        className={`lv-select min-w-0 w-full ${compact ? "max-w-[260px]" : "min-w-[220px]"} ${selectPadding}`}
        value={activeGardenId ?? ""}
        onChange={(e) => void handleSwitch(e.target.value)}
        disabled={loading || saving || gardens.length === 0}
      >
        {gardens.length === 0 ? (
          <option value="">{loading ? "Cargando..." : "Sin jardines disponibles"}</option>
        ) : null}
        {gardens.map((garden) => (
          <option key={garden.id} value={garden.id}>
            {buildGardenOptionLabel(garden, compact)}
          </option>
        ))}
      </select>
      {saving ? <div className="text-xs text-[var(--lv-text-muted)]">Actualizando...</div> : null}
      {!saving && error ? (
        <StatusNotice tone="warning" message={error} className="text-xs" />
      ) : null}
    </div>
  );
}
