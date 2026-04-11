"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useSharedPresenceSessions } from "@/lib/useSharedPresenceSessions";
import {
  DEFAULT_SHARED_LIVE_FLOWER_PRESENCE_MS,
  type SharedLiveSessionScopeKind,
} from "@/lib/sharedLiveSessions";

type SnapshotEnvelope<TSnapshot> = {
  clientId: string;
  sentAt: string;
  snapshot: TSnapshot;
  version: string;
};

type SealedEnvelope = {
  clientId: string;
  sentAt: string;
  title?: string;
};

type SharedRitualChannelOptions<TSnapshot> = {
  channelName: string | null;
  displayName: string;
  enabled?: boolean;
  localActivityLabel?: string | null;
  localActivityProgress?: number | null;
  localCursorOffset?: number | null;
  localFocusKey?: string | null;
  localFocusLabel?: string | null;
  localPointerX?: number | null;
  localPointerY?: number | null;
  onRemoteSealed?: (payload: SealedEnvelope) => void;
  onRemoteSnapshot: (snapshot: TSnapshot, meta: { sentAt: string; version: string }) => void;
  snapshot: TSnapshot | null;
  snapshotVersion: string | null;
  userId: string | null;
};

function resolvePresenceScopeKind(
  channelName: string | null | undefined,
): SharedLiveSessionScopeKind | null {
  const normalized = String(channelName ?? "").trim();
  if (!normalized) return null;
  const parts = normalized.split(":");
  if (parts.length < 4) return null;
  if (parts[1] === "flower") return "flower_birth";
  if (parts[1] === "capsule") return "time_capsule";
  return null;
}

function resolveGardenIdFromChannelName(channelName: string | null | undefined) {
  const normalized = String(channelName ?? "").trim();
  if (!normalized) return null;
  const parts = normalized.split(":");
  return parts.length >= 4 ? parts[2] ?? null : null;
}

function resolveScopeKeyFromChannelName(channelName: string | null | undefined) {
  const normalized = String(channelName ?? "").trim();
  if (!normalized) return null;
  const parts = normalized.split(":");
  if (parts.length < 4) return null;
  const scopeKey = parts.slice(3).join(":").trim();
  return scopeKey || null;
}

export function useSharedRitualChannel<TSnapshot>(
  options: SharedRitualChannelOptions<TSnapshot>,
) {
  const {
    channelName,
    displayName,
    enabled = true,
    localActivityLabel = null,
    localActivityProgress = null,
    localCursorOffset = null,
    localFocusKey = null,
    localFocusLabel = null,
    localPointerX = null,
    localPointerY = null,
    onRemoteSealed,
    onRemoteSnapshot,
    snapshot,
    snapshotVersion,
    userId,
  } = options;

  const [broadcastConnected, setBroadcastConnected] = useState(false);
  const [localReady, setLocalReady] = useState(false);
  const [localHolding, setLocalHolding] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const clientIdRef = useRef(crypto.randomUUID());
  const lastAcceptedEnvelopeRef = useRef("");
  const lastBroadcastVersionRef = useRef("");
  const snapshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onRemoteSnapshotRef = useRef(onRemoteSnapshot);
  const onRemoteSealedRef = useRef(onRemoteSealed);
  const snapshotRef = useRef(snapshot);
  const snapshotVersionRef = useRef(snapshotVersion);

  useEffect(() => {
    onRemoteSnapshotRef.current = onRemoteSnapshot;
  }, [onRemoteSnapshot]);

  useEffect(() => {
    onRemoteSealedRef.current = onRemoteSealed;
  }, [onRemoteSealed]);

  useEffect(() => {
    snapshotRef.current = snapshot;
    snapshotVersionRef.current = snapshotVersion;
  }, [snapshot, snapshotVersion]);

  const shouldConnect = enabled && Boolean(channelName) && Boolean(userId);
  const presenceScopeKind = useMemo(
    () => resolvePresenceScopeKind(channelName),
    [channelName],
  );
  const presenceGardenId = useMemo(
    () => resolveGardenIdFromChannelName(channelName),
    [channelName],
  );
  const presenceScopeKey = useMemo(
    () => resolveScopeKeyFromChannelName(channelName),
    [channelName],
  );

  const presenceSync = useSharedPresenceSessions({
    displayName,
    enabled: shouldConnect && Boolean(presenceScopeKind),
    freshMs:
      presenceScopeKind === "flower_birth"
        ? DEFAULT_SHARED_LIVE_FLOWER_PRESENCE_MS
        : undefined,
    gardenId: presenceGardenId,
    localActivityLabel,
    localActivityProgress,
    localCursorOffset,
    localFocusKey,
    localFocusLabel,
    localHolding,
    localPointerX,
    localPointerY,
    localReady,
    scopeKey: presenceScopeKey,
    scopeKind: presenceScopeKind ?? "flower_birth",
    userId,
  });

  useEffect(() => {
    if (!shouldConnect || !channelName || !userId) {
      return;
    }

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: true },
      },
    });
    channelRef.current = channel;

    channel.on("broadcast", { event: "request_snapshot" }, async ({ payload }) => {
      if (!channelRef.current || !snapshotRef.current || !snapshotVersionRef.current) return;
      const requesterId = String((payload as { clientId?: string } | null)?.clientId ?? "");
      if (!requesterId || requesterId === clientIdRef.current) return;
      await channelRef.current.send({
        type: "broadcast",
        event: "snapshot",
        payload: {
          clientId: clientIdRef.current,
          sentAt: new Date().toISOString(),
          snapshot: snapshotRef.current,
          version: snapshotVersionRef.current,
        } satisfies SnapshotEnvelope<TSnapshot>,
      });
    });

    channel.on("broadcast", { event: "snapshot" }, ({ payload }) => {
      const data = payload as SnapshotEnvelope<TSnapshot> | null;
      if (!data || data.clientId === clientIdRef.current) return;
      const version = String(data.version ?? "").trim();
      const sentAt = String(data.sentAt ?? "").trim();
      if (!version) return;
      if (version === snapshotVersionRef.current) return;
      const envelopeKey = `${data.clientId}:${sentAt}:${version}`;
      if (envelopeKey === lastAcceptedEnvelopeRef.current) return;
      lastAcceptedEnvelopeRef.current = envelopeKey;
      onRemoteSnapshotRef.current(data.snapshot, {
        sentAt,
        version,
      });
    });

    channel.on("broadcast", { event: "sealed" }, ({ payload }) => {
      const data = payload as SealedEnvelope | null;
      if (!data || data.clientId === clientIdRef.current) return;
      onRemoteSealedRef.current?.(data);
    });

    channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setBroadcastConnected(false);
        }
        return;
      }
      setBroadcastConnected(true);
      await channel.send({
        type: "broadcast",
        event: "request_snapshot",
        payload: {
          clientId: clientIdRef.current,
        },
      });
    });

    return () => {
      setBroadcastConnected(false);
      if (snapshotTimerRef.current) {
        clearTimeout(snapshotTimerRef.current);
        snapshotTimerRef.current = null;
      }
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [channelName, shouldConnect, userId]);

  useEffect(() => {
    if (!broadcastConnected || !channelRef.current || !snapshot || !snapshotVersion) return;
    if (snapshotVersion === lastBroadcastVersionRef.current) return;
    if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    snapshotTimerRef.current = setTimeout(() => {
      if (!channelRef.current) return;
      lastBroadcastVersionRef.current = snapshotVersion;
      void channelRef.current.send({
        type: "broadcast",
        event: "snapshot",
        payload: {
          clientId: clientIdRef.current,
          sentAt: new Date().toISOString(),
          snapshot,
          version: snapshotVersion,
        } satisfies SnapshotEnvelope<TSnapshot>,
      });
    }, 180);

    return () => {
      if (snapshotTimerRef.current) {
        clearTimeout(snapshotTimerRef.current);
        snapshotTimerRef.current = null;
      }
    };
  }, [broadcastConnected, snapshot, snapshotVersion]);

  const broadcastSealed = useCallback(async (title?: string) => {
    if (!channelRef.current) return;
    await channelRef.current.send({
      type: "broadcast",
      event: "sealed",
      payload: {
        clientId: clientIdRef.current,
        sentAt: new Date().toISOString(),
        ...(title ? { title } : {}),
      } satisfies SealedEnvelope,
    });
  }, []);

  return useMemo(
    () => ({
      broadcastSealed,
      connected: shouldConnect ? presenceSync.connected : false,
      localHolding,
      localReady,
      participants: shouldConnect ? presenceSync.participants : [],
      refreshPresence: presenceSync.refresh,
      serverClockOffsetMs: shouldConnect ? presenceSync.serverClockOffsetMs : null,
      setLocalHolding,
      setLocalReady,
    }),
    [
      broadcastSealed,
      localHolding,
      localReady,
      presenceSync.connected,
      presenceSync.participants,
      presenceSync.refresh,
      presenceSync.serverClockOffsetMs,
      shouldConnect,
    ],
  );
}
