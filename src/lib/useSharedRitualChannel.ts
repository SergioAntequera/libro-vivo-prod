"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { SharedGardenParticipantPresence } from "@/lib/sharedGardenSessions";

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

function flattenPresenceState(
  input: Record<string, Array<Partial<SharedGardenParticipantPresence>>>,
) {
  const latestByUserId = new Map<string, SharedGardenParticipantPresence>();

  for (const entries of Object.values(input)) {
    for (const entry of entries) {
      const userId = String(entry.userId ?? "").trim();
      if (!userId) continue;
      const candidate: SharedGardenParticipantPresence = {
        userId,
        name: String(entry.name ?? "Sin nombre").trim() || "Sin nombre",
        ready: Boolean(entry.ready),
        holding: Boolean(entry.holding),
        activityLabel:
          typeof entry.activityLabel === "string" && entry.activityLabel.trim()
            ? entry.activityLabel.trim()
            : null,
        activityProgress:
          typeof entry.activityProgress === "number" && Number.isFinite(entry.activityProgress)
            ? entry.activityProgress
            : null,
        focusKey:
          typeof entry.focusKey === "string" && entry.focusKey.trim() ? entry.focusKey.trim() : null,
        focusLabel:
          typeof entry.focusLabel === "string" && entry.focusLabel.trim()
            ? entry.focusLabel.trim()
            : null,
        cursorOffset:
          typeof entry.cursorOffset === "number" && Number.isFinite(entry.cursorOffset)
            ? entry.cursorOffset
            : null,
        pointerX:
          typeof entry.pointerX === "number" && Number.isFinite(entry.pointerX)
            ? entry.pointerX
            : null,
        pointerY:
          typeof entry.pointerY === "number" && Number.isFinite(entry.pointerY)
            ? entry.pointerY
            : null,
        updatedAt: String(entry.updatedAt ?? new Date(0).toISOString()),
      };
      const existing = latestByUserId.get(userId);
      if (!existing || candidate.updatedAt >= existing.updatedAt) {
        latestByUserId.set(userId, candidate);
      }
    }
  }

  return [...latestByUserId.values()].sort(
    (a, b) => a.name.localeCompare(b.name, "es") || a.userId.localeCompare(b.userId),
  );
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

  const [connected, setConnected] = useState(false);
  const [localReady, setLocalReady] = useState(false);
  const [localHolding, setLocalHolding] = useState(false);
  const [participants, setParticipants] = useState<SharedGardenParticipantPresence[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const clientIdRef = useRef(crypto.randomUUID());
  const lastAcceptedEnvelopeRef = useRef("");
  const lastBroadcastVersionRef = useRef("");
  const snapshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onRemoteSnapshotRef = useRef(onRemoteSnapshot);
  const onRemoteSealedRef = useRef(onRemoteSealed);
  const snapshotRef = useRef(snapshot);
  const snapshotVersionRef = useRef(snapshotVersion);
  const localPresenceRef = useRef<SharedGardenParticipantPresence | null>(null);

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

  const localPresence = useMemo<SharedGardenParticipantPresence | null>(() => {
    const normalizedUserId = String(userId ?? "").trim();
    if (!normalizedUserId) return null;
    return {
      userId: normalizedUserId,
      name: displayName.trim() || "Sin nombre",
      ready: localReady,
      holding: localHolding,
      activityLabel:
        typeof localActivityLabel === "string" && localActivityLabel.trim()
          ? localActivityLabel.trim()
          : null,
      activityProgress:
        typeof localActivityProgress === "number" && Number.isFinite(localActivityProgress)
          ? localActivityProgress
          : null,
      focusKey: typeof localFocusKey === "string" && localFocusKey.trim() ? localFocusKey.trim() : null,
      focusLabel:
        typeof localFocusLabel === "string" && localFocusLabel.trim()
          ? localFocusLabel.trim()
          : null,
      cursorOffset:
        typeof localCursorOffset === "number" && Number.isFinite(localCursorOffset)
          ? localCursorOffset
          : null,
      pointerX:
        typeof localPointerX === "number" && Number.isFinite(localPointerX) ? localPointerX : null,
      pointerY:
        typeof localPointerY === "number" && Number.isFinite(localPointerY) ? localPointerY : null,
      updatedAt: "1970-01-01T00:00:00.000Z",
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
    userId,
  ]);
  const shouldConnect = enabled && Boolean(channelName) && Boolean(userId);

  useEffect(() => {
    localPresenceRef.current = localPresence;
  }, [localPresence]);

  useEffect(() => {
    if (!shouldConnect || !channelName || !userId) {
      return;
    }

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: true },
        presence: { key: userId },
      },
    });
    channelRef.current = channel;

    channel.on("presence", { event: "sync" }, () => {
      setParticipants(
        flattenPresenceState(
          channel.presenceState<SharedGardenParticipantPresence>(),
        ),
      );
    });

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
      if (status !== "SUBSCRIBED") return;
      setConnected(true);
      if (localPresenceRef.current) {
        await channel.track({
          ...localPresenceRef.current,
          updatedAt: new Date().toISOString(),
        });
      }
      await channel.send({
        type: "broadcast",
        event: "request_snapshot",
        payload: {
          clientId: clientIdRef.current,
        },
      });
    });

    return () => {
      setConnected(false);
      setParticipants([]);
      if (snapshotTimerRef.current) {
        clearTimeout(snapshotTimerRef.current);
        snapshotTimerRef.current = null;
      }
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [channelName, shouldConnect, userId]);

  useEffect(() => {
    if (!connected || !channelRef.current || !localPresence) return;
    void channelRef.current.track({
      ...localPresence,
      updatedAt: new Date().toISOString(),
    });
  }, [connected, localPresence]);

  useEffect(() => {
    if (!connected || !channelRef.current || !snapshot || !snapshotVersion) return;
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
  }, [connected, snapshot, snapshotVersion]);

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
      connected: shouldConnect ? connected : false,
      localHolding,
      localReady,
      participants: shouldConnect ? participants : [],
      setLocalHolding,
      setLocalReady,
    }),
    [broadcastSealed, connected, localHolding, localReady, participants, shouldConnect],
  );
}
