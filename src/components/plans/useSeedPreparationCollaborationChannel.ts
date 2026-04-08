"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { SharedGardenParticipantPresence } from "@/lib/sharedGardenSessions";
import {
  flattenSeedPreparationPresenceState,
  seedPreparationCollaborationChannelName,
  type SeedPreparationSavedEnvelope,
} from "@/lib/seedPreparationCollaboration";
import type { SeedPreparationLiveSnapshot } from "@/lib/seedPreparationRealtime";

type SnapshotEnvelope = {
  clientId: string;
  sentAt: string;
  snapshot: SeedPreparationLiveSnapshot;
  version: string;
};

type UseSeedPreparationCollaborationChannelParams = {
  activityLabel?: string | null;
  cursorOffset?: number | null;
  displayName: string;
  enabled?: boolean;
  focusKey?: string | null;
  focusLabel?: string | null;
  gardenId: string | null | undefined;
  onRemoteSaved?: (payload: SeedPreparationSavedEnvelope) => void;
  onRemoteSnapshot?: (
    snapshot: SeedPreparationLiveSnapshot,
    meta: { sentAt: string; version: string },
  ) => void;
  seedId: string | null | undefined;
  snapshot?: SeedPreparationLiveSnapshot | null;
  snapshotVersion?: string | null;
  userId: string | null | undefined;
};

export function useSeedPreparationCollaborationChannel(
  params: UseSeedPreparationCollaborationChannelParams,
) {
  const {
    activityLabel = null,
    cursorOffset = null,
    displayName,
    enabled = true,
    focusKey = null,
    focusLabel = null,
    gardenId,
    onRemoteSaved,
    onRemoteSnapshot,
    seedId,
    snapshot = null,
    snapshotVersion = null,
    userId,
  } = params;

  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState<SharedGardenParticipantPresence[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onRemoteSavedRef = useRef(onRemoteSaved);
  const onRemoteSnapshotRef = useRef(onRemoteSnapshot);
  const clientIdRef = useRef(crypto.randomUUID());
  const lastAcceptedEnvelopeRef = useRef("");
  const lastBroadcastVersionRef = useRef("");
  const snapshotRef = useRef(snapshot);
  const snapshotVersionRef = useRef(snapshotVersion);
  const snapshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onRemoteSavedRef.current = onRemoteSaved;
  }, [onRemoteSaved]);

  useEffect(() => {
    onRemoteSnapshotRef.current = onRemoteSnapshot;
  }, [onRemoteSnapshot]);

  useEffect(() => {
    snapshotRef.current = snapshot;
    snapshotVersionRef.current = snapshotVersion;
  }, [snapshot, snapshotVersion]);

  const channelName = useMemo(
    () => seedPreparationCollaborationChannelName({ gardenId, seedId }),
    [gardenId, seedId],
  );

  const localPresence = useMemo<SharedGardenParticipantPresence | null>(() => {
    const normalizedUserId = String(userId ?? "").trim();
    if (!normalizedUserId) return null;
    return {
      userId: normalizedUserId,
      name: displayName.trim() || "Sin nombre",
      ready: false,
      holding: false,
      activityLabel:
        typeof activityLabel === "string" && activityLabel.trim() ? activityLabel.trim() : null,
      activityProgress: null,
      focusKey: typeof focusKey === "string" && focusKey.trim() ? focusKey.trim() : "seed_preparation",
      focusLabel:
        typeof focusLabel === "string" && focusLabel.trim() ? focusLabel.trim() : "Dossier en edicion",
      cursorOffset:
        typeof cursorOffset === "number" && Number.isFinite(cursorOffset) ? cursorOffset : null,
      pointerX: null,
      pointerY: null,
      updatedAt: new Date().toISOString(),
    };
  }, [activityLabel, cursorOffset, displayName, focusKey, focusLabel, userId]);
  const shouldConnect = enabled && Boolean(channelName) && Boolean(localPresence);

  useEffect(() => {
    if (!shouldConnect || !channelName || !localPresence) {
      return;
    }

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: true },
        presence: { key: localPresence.userId },
      },
    });
    channelRef.current = channel;

    channel.on("presence", { event: "sync" }, () => {
      setParticipants(
        flattenSeedPreparationPresenceState(
          channel.presenceState<SharedGardenParticipantPresence>(),
        ),
      );
    });

    channel.on("broadcast", { event: "request_snapshot" }, async ({ payload }) => {
      if (!channelRef.current || !snapshotRef.current || !snapshotVersionRef.current) return;
      const requesterId = String((payload as { clientId?: string } | null)?.clientId ?? "").trim();
      if (!requesterId || requesterId === clientIdRef.current) return;
      await channelRef.current.send({
        type: "broadcast",
        event: "snapshot",
        payload: {
          clientId: clientIdRef.current,
          sentAt: new Date().toISOString(),
          snapshot: snapshotRef.current,
          version: snapshotVersionRef.current,
        } satisfies SnapshotEnvelope,
      });
    });

    channel.on("broadcast", { event: "snapshot" }, ({ payload }) => {
      const data = payload as SnapshotEnvelope | null;
      if (!data || data.clientId === clientIdRef.current) return;
      const version = String(data.version ?? "").trim();
      const sentAt = String(data.sentAt ?? "").trim();
      if (!version) return;
      if (version === snapshotVersionRef.current) return;
      const envelopeKey = `${data.clientId}:${sentAt}:${version}`;
      if (envelopeKey === lastAcceptedEnvelopeRef.current) return;
      lastAcceptedEnvelopeRef.current = envelopeKey;
      onRemoteSnapshotRef.current?.(data.snapshot, {
        sentAt,
        version,
      });
    });

    channel.on("broadcast", { event: "saved" }, ({ payload }) => {
      const data = payload as SeedPreparationSavedEnvelope | null;
      if (!data) return;
      if (String(data.actorUserId ?? "").trim() === localPresence.userId) return;
      if (String(data.seedId ?? "").trim() !== String(seedId ?? "").trim()) return;
      onRemoteSavedRef.current?.(data);
    });

    channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;
      setConnected(true);
      await channel.track(localPresence);
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
  }, [channelName, localPresence, seedId, shouldConnect]);

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
    if (snapshotTimerRef.current) {
      clearTimeout(snapshotTimerRef.current);
    }
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
        } satisfies SnapshotEnvelope,
      });
    }, 180);

    return () => {
      if (snapshotTimerRef.current) {
        clearTimeout(snapshotTimerRef.current);
        snapshotTimerRef.current = null;
      }
    };
  }, [connected, snapshot, snapshotVersion]);

  const broadcastSaved = useCallback(async () => {
    if (!channelRef.current || !localPresence) return;
    await channelRef.current.send({
      type: "broadcast",
      event: "saved",
      payload: {
        actorName: localPresence.name,
        actorUserId: localPresence.userId,
        savedAt: new Date().toISOString(),
        seedId: String(seedId ?? "").trim(),
      } satisfies SeedPreparationSavedEnvelope,
    });
  }, [localPresence, seedId]);

  return useMemo(
    () => ({
      broadcastSaved,
      connected: shouldConnect ? connected : false,
      participants: shouldConnect ? participants : [],
    }),
    [broadcastSaved, connected, participants, shouldConnect],
  );
}
