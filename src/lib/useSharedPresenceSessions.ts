"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  DEFAULT_SHARED_LIVE_FRESH_MS,
  estimateSharedLiveServerClockOffsetMs,
  filterSharedLiveParticipantsAt,
  mapSharedLiveSessionToParticipant,
  mergeSharedLiveParticipants,
  normalizeSharedLiveSessionRow,
  sharedLiveSessionsChannelName,
  type SharedLiveSessionScopeKind,
} from "@/lib/sharedLiveSessions";
import {
  clearSharedLiveSession,
  fetchSharedLiveSessions,
  touchSharedLiveSession,
} from "@/lib/sharedLiveApi";
import type { SharedGardenParticipantPresence } from "@/lib/sharedGardenSessions";

type UseSharedPresenceSessionsOptions = {
  gardenId: string | null | undefined;
  scopeKind: SharedLiveSessionScopeKind;
  scopeKey: string | null | undefined;
  userId: string | null | undefined;
  displayName: string;
  enabled?: boolean;
  freshMs?: number;
  localReady?: boolean;
  localHolding?: boolean;
  localActivityLabel?: string | null;
  localActivityProgress?: number | null;
  localFocusKey?: string | null;
  localFocusLabel?: string | null;
  localCursorOffset?: number | null;
  localPointerX?: number | null;
  localPointerY?: number | null;
  onError?: (error: unknown, phase: "select" | "upsert" | "delete") => void;
};

type UseSharedPresenceSessionsResult = {
  connected: boolean;
  participants: SharedGardenParticipantPresence[];
  serverClockOffsetMs: number | null;
  refresh: () => Promise<void>;
  clear: () => Promise<void>;
};

function normalizeNullableFinite(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function useSharedPresenceSessions(
  options: UseSharedPresenceSessionsOptions,
): UseSharedPresenceSessionsResult {
  const {
    gardenId,
    scopeKind,
    scopeKey,
    userId,
    displayName,
    enabled = true,
    freshMs = DEFAULT_SHARED_LIVE_FRESH_MS,
    localReady = false,
    localHolding = false,
    localActivityLabel = null,
    localActivityProgress = null,
    localFocusKey = null,
    localFocusLabel = null,
    localCursorOffset = null,
    localPointerX = null,
    localPointerY = null,
    onError,
  } = options;

  const normalizedGardenId = String(gardenId ?? "").trim();
  const normalizedScopeKey = String(scopeKey ?? "").trim();
  const normalizedUserId = String(userId ?? "").trim();
  const shouldConnect =
    enabled &&
    Boolean(normalizedGardenId) &&
    Boolean(normalizedScopeKey) &&
    Boolean(normalizedUserId);

  const [participants, setParticipants] = useState<SharedGardenParticipantPresence[]>([]);
  const [connected, setConnected] = useState(false);
  const [serverClockOffsetMs, setServerClockOffsetMs] = useState<number | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const localParticipant = useMemo<SharedGardenParticipantPresence | null>(() => {
    if (!shouldConnect) return null;
    return {
      userId: normalizedUserId,
      name: displayName.trim() || "Sin nombre",
      ready: localReady,
      holding: localHolding,
      activityLabel:
        typeof localActivityLabel === "string" && localActivityLabel.trim()
          ? localActivityLabel.trim()
          : null,
      activityProgress: normalizeNullableFinite(localActivityProgress),
      focusKey:
        typeof localFocusKey === "string" && localFocusKey.trim() ? localFocusKey.trim() : null,
      focusLabel:
        typeof localFocusLabel === "string" && localFocusLabel.trim()
          ? localFocusLabel.trim()
          : null,
      cursorOffset: normalizeNullableFinite(localCursorOffset),
      pointerX: normalizeNullableFinite(localPointerX),
      pointerY: normalizeNullableFinite(localPointerY),
      updatedAt: new Date().toISOString(),
    };
  }, [
    displayName,
    localActivityLabel,
    localActivityProgress,
    localCursorOffset,
    localFocusKey,
    localFocusLabel,
    localHolding,
    localPointerX,
    localPointerY,
    localReady,
    normalizedUserId,
    shouldConnect,
  ]);

  const mergeWithLocalParticipant = useCallback(
    (input: SharedGardenParticipantPresence[]) => {
      const merged = localParticipant ? [localParticipant, ...input] : input;
      const referenceNowMs =
        typeof serverClockOffsetMs === "number" ? Date.now() + serverClockOffsetMs : null;
      return filterSharedLiveParticipantsAt(
        mergeSharedLiveParticipants(merged),
        referenceNowMs,
        freshMs,
      );
    },
    [freshMs, localParticipant, serverClockOffsetMs],
  );

  const refresh = useCallback(async () => {
    if (!shouldConnect) {
      setParticipants([]);
      setConnected(false);
      setServerClockOffsetMs(null);
      return;
    }

    let payload: Awaited<ReturnType<typeof fetchSharedLiveSessions>>;
    try {
      payload = await fetchSharedLiveSessions({
        gardenId: normalizedGardenId,
        scopeKind,
        scopeKey: normalizedScopeKey,
      });
    } catch (error) {
      setConnected(false);
      onErrorRef.current?.(error, "select");
      return;
    }

    setServerClockOffsetMs(estimateSharedLiveServerClockOffsetMs(payload.serverNow));

    const nextParticipants = payload.rows
      .map((row) => normalizeSharedLiveSessionRow(row))
      .filter((row) => row !== null)
      .map((row) => mapSharedLiveSessionToParticipant(row));
    setParticipants(mergeSharedLiveParticipants(nextParticipants));
    setConnected(true);
  }, [normalizedGardenId, normalizedScopeKey, scopeKind, shouldConnect]);

  const upsertPresence = useCallback(async () => {
    if (!shouldConnect || !localParticipant) return;

    try {
      const result = await touchSharedLiveSession({
        gardenId: normalizedGardenId,
        scopeKind,
        scopeKey: normalizedScopeKey,
        displayName: localParticipant.name,
        ready: localParticipant.ready,
        holding: localParticipant.holding,
        activityLabel: localParticipant.activityLabel,
        activityProgress: localParticipant.activityProgress,
        focusKey: localParticipant.focusKey,
        focusLabel: localParticipant.focusLabel,
        cursorOffset: localParticipant.cursorOffset,
        pointerX: localParticipant.pointerX,
        pointerY: localParticipant.pointerY,
      });
      setServerClockOffsetMs(estimateSharedLiveServerClockOffsetMs(result.serverNow));
    } catch (error) {
      setConnected(false);
      onErrorRef.current?.(error, "upsert");
      return;
    }

    setConnected(true);
  }, [
    localParticipant,
    normalizedGardenId,
    normalizedScopeKey,
    normalizedUserId,
    scopeKind,
    shouldConnect,
  ]);

  const clear = useCallback(async () => {
    if (!normalizedGardenId || !normalizedScopeKey || !normalizedUserId) return;
    try {
      await clearSharedLiveSession({
        gardenId: normalizedGardenId,
        scopeKind,
        scopeKey: normalizedScopeKey,
      });
    } catch (error) {
      onErrorRef.current?.(error, "delete");
      return;
    }

    setParticipants((current) =>
      current.filter((participant) => participant.userId !== normalizedUserId),
    );
  }, [normalizedGardenId, normalizedScopeKey, normalizedUserId, scopeKind]);

  useEffect(() => {
    if (!shouldConnect) {
      setParticipants([]);
      setConnected(false);
      return;
    }

    void upsertPresence();
    void refresh();
  }, [refresh, shouldConnect, upsertPresence]);

  useEffect(() => {
    if (!shouldConnect) return;
    const timer = window.setTimeout(() => {
      void upsertPresence();
    }, 350);
    return () => {
      window.clearTimeout(timer);
    };
  }, [localParticipant, shouldConnect, upsertPresence]);

  useEffect(() => {
    if (!shouldConnect) return;

    const intervalId = window.setInterval(() => {
      void upsertPresence();
      void refresh();
    }, typeof document !== "undefined" && document.visibilityState === "hidden" ? 8_000 : 5_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refresh, shouldConnect, upsertPresence]);

  useEffect(() => {
    if (!shouldConnect) return;

    const handleFocusRefresh = () => {
      void upsertPresence();
      void refresh();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleFocusRefresh();
        return;
      }
      void clear();
    };

    const handlePageHide = () => {
      void clear();
    };

    window.addEventListener("focus", handleFocusRefresh);
    window.addEventListener("online", handleFocusRefresh);
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("focus", handleFocusRefresh);
      window.removeEventListener("online", handleFocusRefresh);
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [clear, refresh, shouldConnect, upsertPresence]);

  useEffect(() => {
    const channelName = sharedLiveSessionsChannelName({
      scopeKind,
      scopeKey: normalizedScopeKey,
    });
    if (!shouldConnect || !channelName) return;

    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "shared_live_sessions",
        filter: `garden_id=eq.${normalizedGardenId}`,
      },
      (payload) => {
        const row = normalizeSharedLiveSessionRow(
          ((payload.new as Record<string, unknown> | null) ??
            (payload.old as Record<string, unknown> | null) ??
            null),
        );
        if (row && (row.scope_kind !== scopeKind || row.scope_key !== normalizedScopeKey)) {
          return;
        }
        void refresh();
      },
    );

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setConnected(true);
        void refresh();
        return;
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        setConnected(false);
      }
    });

    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [normalizedGardenId, normalizedScopeKey, refresh, scopeKind, shouldConnect]);

  useEffect(() => {
    return () => {
      if (!shouldConnect) return;
      void clear();
    };
  }, [clear, shouldConnect]);

  return useMemo(
    () => ({
      clear,
      connected: shouldConnect ? connected : false,
      participants: shouldConnect ? mergeWithLocalParticipant(participants) : [],
      serverClockOffsetMs: shouldConnect ? serverClockOffsetMs : null,
      refresh,
    }),
    [
      clear,
      connected,
      mergeWithLocalParticipant,
      participants,
      refresh,
      serverClockOffsetMs,
      shouldConnect,
    ],
  );
}
