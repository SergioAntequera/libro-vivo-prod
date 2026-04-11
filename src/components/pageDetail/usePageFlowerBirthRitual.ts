"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_SHARED_RITUAL_HOLD_MS,
  pickSharedGardenLeaderUserId,
  type SharedGardenParticipantPresence,
} from "@/lib/sharedGardenSessions";
import {
  type FlowerBirthRitualRow,
  type FlowerBirthRitualSnapshot,
  serializeFlowerBirthRitualSnapshot,
} from "@/lib/flowerBirthRitual";
import { useSharedRitualChannel } from "@/lib/useSharedRitualChannel";
import { getErrorMessage } from "@/lib/pageDetailUtils";
import type { CanvasObject } from "@/lib/canvasTypes";

type LocalCanvasPointer = { x: number; y: number } | null;

type RemotePointer = {
  userId: string;
  name: string;
  x: number;
  y: number;
  color: string;
};

type SealSummaryItem = {
  id: string;
  label: string;
  value: string;
  ready: boolean;
};

type SealStepItem = {
  id: string;
  label: string;
  detail: string;
  done: boolean;
  active: boolean;
};

type UsePageFlowerBirthRitualParams = {
  activeSharedTarget: string | null;
  audioLabel: string;
  audioUrl: string;
  companionReference: string;
  flowerBirthChannelName: string | null;
  flowerBirthRitual: FlowerBirthRitualRow | null;
  flowerBirthRitualPending: boolean;
  flowerBirthSnapshot: FlowerBirthRitualSnapshot;
  flowerBirthSnapshotVersion: string;
  hasLocalFlowerBirthRating: boolean;
  localFlowerBirthRating: number;
  localSharedActivityLabel: string | null;
  localSharedFocusLabel: string | null;
  locationLabel: string;
  myProfileId: string | null;
  myProfileName: string;
  objects: CanvasObject[];
  onApplySnapshot: (snapshot: FlowerBirthRitualSnapshot) => void;
  onBeforeFinalizeSeal: () => Promise<{ ritualCompleted: boolean } | undefined>;
  onPersistLocalReady?: (ready: boolean) => void;
  onRemoteSeal: (payload: { sentAt: string; title?: string }) => void;
  onSetMessage: (message: string | null) => void;
  pagePlanSummary: string | null | undefined;
  pageRating: number;
  pageTitle: string | null | undefined;
  readyUserIds: ReadonlySet<string>;
  ratingsByUserId: ReadonlyMap<string, number>;
  requiredSharedParticipants: number;
  saving: boolean;
};

function isSameFlowerBirthSnapshot(
  a: FlowerBirthRitualSnapshot | null,
  b: FlowerBirthRitualSnapshot | null,
) {
  if (a === b) return true;
  if (!a || !b) return false;
  return serializeFlowerBirthRitualSnapshot(a) === serializeFlowerBirthRitualSnapshot(b);
}

function mergeRemoteFlowerBirthSnapshot(
  local: FlowerBirthRitualSnapshot,
  remote: FlowerBirthRitualSnapshot,
  activeTarget: string | null,
) {
  if (!activeTarget) return remote;

  const next: FlowerBirthRitualSnapshot = { ...remote };

  if (activeTarget === "summary") {
    next.planSummary = local.planSummary;
  } else if (activeTarget === "plan_type") {
    next.planTypeId = local.planTypeId;
  } else if (activeTarget === "favorite") {
    next.isFavorite = local.isFavorite;
  } else if (activeTarget === "highlight") {
    next.isYearHighlight = local.isYearHighlight;
  } else if (activeTarget === "rating") {
    next.rating = local.rating;
  } else if (activeTarget === "canvas") {
    next.canvasObjects = local.canvasObjects;
  } else if (activeTarget === "location") {
    next.locationLabel = local.locationLabel;
    next.locationLat = local.locationLat;
    next.locationLng = local.locationLng;
  } else if (activeTarget === "audio") {
    next.audioUrl = local.audioUrl;
    next.audioLabel = local.audioLabel;
  } else if (activeTarget === "cover") {
    next.coverPhotoUrl = local.coverPhotoUrl;
  }

  return next;
}

function didRemoteChangeActiveFlowerTarget(
  local: FlowerBirthRitualSnapshot,
  remote: FlowerBirthRitualSnapshot,
  activeTarget: string | null,
) {
  if (!activeTarget) return false;
  if (activeTarget === "summary") return local.planSummary !== remote.planSummary;
  if (activeTarget === "plan_type") return local.planTypeId !== remote.planTypeId;
  if (activeTarget === "favorite") return local.isFavorite !== remote.isFavorite;
  if (activeTarget === "highlight") return local.isYearHighlight !== remote.isYearHighlight;
  if (activeTarget === "rating") return local.rating !== remote.rating;
  if (activeTarget === "canvas") {
    return JSON.stringify(local.canvasObjects) !== JSON.stringify(remote.canvasObjects);
  }
  if (activeTarget === "location") {
    return (
      local.locationLabel !== remote.locationLabel ||
      local.locationLat !== remote.locationLat ||
      local.locationLng !== remote.locationLng
    );
  }
  if (activeTarget === "audio") {
    return local.audioUrl !== remote.audioUrl || local.audioLabel !== remote.audioLabel;
  }
  if (activeTarget === "cover") return local.coverPhotoUrl !== remote.coverPhotoUrl;
  return false;
}

function isSharedParticipantFresh(updatedAt: string) {
  const timestamp = Date.parse(updatedAt);
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp < 8000;
}

function joinParticipantNames(input: Array<string | null | undefined>) {
  const names = input
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  if (!names.length) return null;
  if (names.length === 1) return names[0] ?? null;
  if (names.length === 2) return `${names[0]} y ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

function resolveParticipantColor(userId: string) {
  const palette = ["#d97706", "#0f766e", "#7c3aed", "#dc2626", "#2563eb", "#15803d"];
  let hash = 0;
  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash * 31 + userId.charCodeAt(index)) >>> 0;
  }
  return palette[hash % palette.length] ?? "#0f766e";
}

export function usePageFlowerBirthRitual({
  activeSharedTarget,
  audioLabel,
  audioUrl,
  companionReference,
  flowerBirthChannelName,
  flowerBirthRitual,
  flowerBirthRitualPending,
  flowerBirthSnapshot,
  flowerBirthSnapshotVersion,
  hasLocalFlowerBirthRating,
  localFlowerBirthRating,
  localSharedActivityLabel,
  localSharedFocusLabel,
  locationLabel,
  myProfileId,
  myProfileName,
  objects,
  onApplySnapshot,
  onBeforeFinalizeSeal,
  onPersistLocalReady,
  onRemoteSeal,
  onSetMessage,
  pagePlanSummary,
  pageRating,
  pageTitle,
  readyUserIds,
  ratingsByUserId,
  requiredSharedParticipants,
  saving,
}: UsePageFlowerBirthRitualParams) {
  const [hasDeferredSharedFlowerSnapshot, setHasDeferredSharedFlowerSnapshot] = useState(false);
  const [flowerBirthHoldProgress, setFlowerBirthHoldProgress] = useState(0);
  const [flowerBirthHasEnteredLive, setFlowerBirthHasEnteredLive] = useState(false);
  const [flowerBirthRitualNotice, setFlowerBirthRitualNotice] = useState<string | null>(null);
  const [localCanvasPointer, setLocalCanvasPointer] = useState<LocalCanvasPointer>(null);

  const deferredSharedFlowerSnapshotRef = useRef<FlowerBirthRitualSnapshot | null>(null);
  const flowerBirthHoldStartRef = useRef<number | null>(null);
  const flowerBirthSealTriggeredRef = useRef(false);
  const previousFlowerBirthReadyIdsRef = useRef<string[]>([]);
  const previousFlowerBirthSnapshotVersionRef = useRef<string | null>(null);
  const previousFlowerBirthLockRef = useRef(false);

  const flowerBirthSharedChannel = useSharedRitualChannel<FlowerBirthRitualSnapshot>({
    channelName: flowerBirthChannelName,
    displayName: myProfileName.trim() || "Tu lado",
    enabled: flowerBirthRitualPending,
    localActivityLabel: localSharedActivityLabel,
    localFocusKey: activeSharedTarget,
    localFocusLabel: localSharedFocusLabel,
    localPointerX: localCanvasPointer?.x ?? null,
    localPointerY: localCanvasPointer?.y ?? null,
    onRemoteSnapshot: (snapshot, meta) => {
      if (meta.version === previousFlowerBirthSnapshotVersionRef.current) return;
      previousFlowerBirthSnapshotVersionRef.current = meta.version;

      const changedActiveTarget = didRemoteChangeActiveFlowerTarget(
        flowerBirthSnapshot,
        snapshot,
        activeSharedTarget,
      );
      const mergedSnapshot = mergeRemoteFlowerBirthSnapshot(
        flowerBirthSnapshot,
        snapshot,
        activeSharedTarget,
      );

      if (activeSharedTarget && changedActiveTarget) {
        deferredSharedFlowerSnapshotRef.current = snapshot;
        setHasDeferredSharedFlowerSnapshot(true);
        setFlowerBirthRitualNotice(
          localSharedFocusLabel
            ? `${companionReference} tambien ha cambiado ${localSharedFocusLabel.toLowerCase()}. Se aplicara al salir de esa zona.`
            : `${companionReference} tambien ha tocado esta zona. Se aplicara al salir.`,
        );
        return;
      }

      deferredSharedFlowerSnapshotRef.current = null;
      setHasDeferredSharedFlowerSnapshot(false);
      if (!isSameFlowerBirthSnapshot(flowerBirthSnapshot, mergedSnapshot)) {
        onApplySnapshot(mergedSnapshot);
      }
      setFlowerBirthRitualNotice(
        activeSharedTarget
          ? `Han llegado cambios compartidos sin tocar ${localSharedFocusLabel?.toLowerCase() ?? "tu zona activa"}.`
          : "La otra persona acaba de actualizar la flor en directo.",
      );
    },
    onRemoteSealed: (payload) => {
      if (flowerBirthSharedChannel.localHolding) {
        flowerBirthSharedChannel.setLocalHolding(false);
      }
      if (flowerBirthSharedChannel.localReady) {
        flowerBirthSharedChannel.setLocalReady(false);
      }
      setFlowerBirthHoldProgress(0);
      flowerBirthHoldStartRef.current = null;
      flowerBirthSealTriggeredRef.current = false;
      setFlowerBirthRitualNotice(
        payload.title
          ? `"${payload.title}" ya ha quedado guardada.`
          : "La flor ya ha quedado guardada.",
      );
      onRemoteSeal({
        sentAt: payload.sentAt,
        ...(payload.title ? { title: payload.title } : {}),
      });
    },
    snapshot: flowerBirthRitualPending ? flowerBirthSnapshot : null,
    snapshotVersion: flowerBirthRitualPending ? flowerBirthSnapshotVersion : null,
    userId: myProfileId,
  });

  const flowerBirthRitualParticipants = useMemo(() => {
    const localUserId = String(myProfileId ?? "").trim();
    const localParticipant: SharedGardenParticipantPresence = {
      activityLabel: localSharedActivityLabel,
      activityProgress: null,
      cursorOffset: null,
      focusKey: activeSharedTarget,
      focusLabel: localSharedFocusLabel,
      holding: flowerBirthSharedChannel.localHolding,
      name: myProfileName.trim() || "Tu lado",
      pointerX: localCanvasPointer?.x ?? null,
      pointerY: localCanvasPointer?.y ?? null,
      ready: flowerBirthSharedChannel.localReady,
      updatedAt: new Date().toISOString(),
      userId: localUserId || "local",
    };

    if (requiredSharedParticipants <= 1) return [localParticipant];
    if (!localUserId) return flowerBirthSharedChannel.participants;
    if (!flowerBirthSharedChannel.participants.length) return [localParticipant];
    if (
      flowerBirthSharedChannel.participants.some(
        (participant) => participant.userId === localParticipant.userId,
      )
    ) {
      return flowerBirthSharedChannel.participants;
    }
    return [localParticipant, ...flowerBirthSharedChannel.participants];
  }, [
    activeSharedTarget,
    flowerBirthSharedChannel.localHolding,
    flowerBirthSharedChannel.localReady,
    flowerBirthSharedChannel.participants,
    localCanvasPointer,
    localSharedActivityLabel,
    localSharedFocusLabel,
    myProfileId,
    myProfileName,
    requiredSharedParticipants,
  ]);

  const flowerBirthConnected = flowerBirthSharedChannel.connected;
  const enoughFlowerBirthParticipantsPresent =
    requiredSharedParticipants <= 1 ||
    flowerBirthRitualParticipants.length >= requiredSharedParticipants;
  const flowerBirthEntryLive =
    flowerBirthHasEnteredLive || enoughFlowerBirthParticipantsPresent;
  const flowerBirthPendingEntry =
    flowerBirthRitualPending && !flowerBirthEntryLive;
  const flowerBirthEditingLocked =
    flowerBirthRitualPending &&
    flowerBirthHasEnteredLive &&
    !enoughFlowerBirthParticipantsPresent;
  const flowerBirthReadyUserIds = useMemo(() => {
    const next = new Set<string>();
    for (const userId of readyUserIds) {
      const normalized = String(userId ?? "").trim();
      if (normalized) next.add(normalized);
    }
    for (const participant of flowerBirthRitualParticipants) {
      if (participant.ready && participant.userId) next.add(participant.userId);
    }
    return next;
  }, [flowerBirthRitualParticipants, readyUserIds]);
  const readyFlowerBirthParticipantsCount =
    requiredSharedParticipants === 1
      ? flowerBirthSharedChannel.localReady
        ? 1
        : 0
      : flowerBirthReadyUserIds.size;
  const holdingFlowerBirthParticipantsCount =
    requiredSharedParticipants === 1
      ? flowerBirthSharedChannel.localHolding
        ? 1
        : 0
      : flowerBirthRitualParticipants.filter((participant) => participant.holding).length;
  const hasFlowerBirthRatingsForAllParticipants =
    ratingsByUserId.size >= requiredSharedParticipants;
  const displayRating = flowerBirthRitualPending ? localFlowerBirthRating : pageRating;
  const flowerBirthRatingLocked = Boolean(flowerBirthRitual && !flowerBirthRitualPending);

  const remoteFlowerBirthEditors = useMemo(
    () =>
      flowerBirthSharedChannel.participants.filter(
        (participant) =>
          participant.userId !== myProfileId &&
          Boolean(participant.focusKey) &&
          isSharedParticipantFresh(participant.updatedAt),
      ),
    [flowerBirthSharedChannel.participants, myProfileId],
  );

  const editorsForFlowerTarget = useCallback(
    (targetKey: string | null) => {
      if (!targetKey) return [];
      return remoteFlowerBirthEditors.filter(
        (participant) => participant.focusKey === targetKey,
      );
    },
    [remoteFlowerBirthEditors],
  );

  const currentSharedEditorsLabel = useMemo(
    () =>
      joinParticipantNames(
        editorsForFlowerTarget(activeSharedTarget).map((participant) => participant.name),
      ),
    [activeSharedTarget, editorsForFlowerTarget],
  );
  const summaryEditorsLabel = useMemo(
    () =>
      joinParticipantNames(
        editorsForFlowerTarget("summary").map((participant) => participant.name),
      ),
    [editorsForFlowerTarget],
  );
  const locationEditorsLabel = useMemo(
    () =>
      joinParticipantNames(
        editorsForFlowerTarget("location").map((participant) => participant.name),
      ),
    [editorsForFlowerTarget],
  );
  const planTypeEditorsLabel = useMemo(
    () =>
      joinParticipantNames(
        editorsForFlowerTarget("plan_type").map((participant) => participant.name),
      ),
    [editorsForFlowerTarget],
  );
  const audioEditorsLabel = useMemo(
    () =>
      joinParticipantNames(
        editorsForFlowerTarget("audio").map((participant) => participant.name),
      ),
    [editorsForFlowerTarget],
  );
  const coverEditorsLabel = useMemo(
    () =>
      joinParticipantNames(
        editorsForFlowerTarget("cover").map((participant) => participant.name),
      ),
    [editorsForFlowerTarget],
  );
  const remoteCanvasPointers = useMemo(
    () =>
      remoteFlowerBirthEditors
        .filter(
          (participant) =>
            participant.focusKey === "canvas" &&
            typeof participant.pointerX === "number" &&
            typeof participant.pointerY === "number",
        )
        .map((participant) => ({
          userId: participant.userId,
          name: participant.name,
          x: participant.pointerX as number,
          y: participant.pointerY as number,
          color: resolveParticipantColor(participant.userId),
        })),
    [remoteFlowerBirthEditors],
  );

  const flowerBirthLeaderUserId =
    pickSharedGardenLeaderUserId(flowerBirthRitualParticipants) ?? myProfileId ?? null;
  const otherFlowerBirthParticipant = useMemo(
    () =>
      flowerBirthRitualParticipants.find(
        (participant) => participant.userId !== myProfileId,
      ) ?? null,
    [flowerBirthRitualParticipants, myProfileId],
  );
  const canEnterFlowerBirthSealStage =
    flowerBirthRitualPending &&
    flowerBirthEntryLive &&
    enoughFlowerBirthParticipantsPresent &&
    hasFlowerBirthRatingsForAllParticipants &&
    readyFlowerBirthParticipantsCount >= requiredSharedParticipants;
  const canArmFlowerBirthHold =
    canEnterFlowerBirthSealStage &&
    flowerBirthSharedChannel.localReady &&
    !flowerBirthEditingLocked;
  const flowerBirthHoldCanProgress =
    canArmFlowerBirthHold &&
    holdingFlowerBirthParticipantsCount >= requiredSharedParticipants &&
    flowerBirthSharedChannel.localHolding;
  const flowerBirthHoldProgressPercent = Math.round(flowerBirthHoldProgress * 100);

  const flowerBirthHoldStatusLabel = useMemo(() => {
    if (saving) return "Guardando la flor...";
    if (flowerBirthEditingLocked) {
      return otherFlowerBirthParticipant
        ? `Esperando a ${otherFlowerBirthParticipant.name}.`
        : `Esperando a ${companionReference}.`;
    }
    if (!hasLocalFlowerBirthRating) {
      return "Pon primero tu valoracion personal.";
    }
    if (!flowerBirthSharedChannel.localReady) {
      return "Marca primero que ya la ves a punto.";
    }
    if (!enoughFlowerBirthParticipantsPresent) {
      return otherFlowerBirthParticipant
        ? `Esperando a ${otherFlowerBirthParticipant.name}.`
        : `Esperando a ${companionReference}.`;
    }
    if (!hasFlowerBirthRatingsForAllParticipants) {
      return otherFlowerBirthParticipant
        ? `Falta la valoracion de ${otherFlowerBirthParticipant.name}.`
        : `Falta la valoracion de ${companionReference}.`;
    }
    if (readyFlowerBirthParticipantsCount < requiredSharedParticipants) {
      return otherFlowerBirthParticipant
        ? `${otherFlowerBirthParticipant.name} aun esta preparando la flor.`
        : `Falta que ${companionReference} la deje a punto.`;
    }
    if (flowerBirthHoldProgress >= 1 && flowerBirthLeaderUserId !== myProfileId) {
      return "Confirmando el guardado compartido...";
    }
    if (flowerBirthHoldProgress > 0) {
      return requiredSharedParticipants > 1
        ? "Seguid sosteniendo la flor."
        : "Sigue sosteniendo la flor.";
    }
    if (
      requiredSharedParticipants > 1 &&
      holdingFlowerBirthParticipantsCount === 1 &&
      !flowerBirthSharedChannel.localHolding
    ) {
      return otherFlowerBirthParticipant
        ? `${otherFlowerBirthParticipant.name} ya esta sosteniendo la flor.`
        : `${companionReference} ya esta sosteniendo la flor.`;
    }
    return requiredSharedParticipants > 1
      ? "Mantened ambas la flor para guardarla."
      : "Manten la flor para guardarla.";
  }, [
    companionReference,
    enoughFlowerBirthParticipantsPresent,
    flowerBirthEditingLocked,
    flowerBirthHoldProgress,
    flowerBirthLeaderUserId,
    flowerBirthSharedChannel.localHolding,
    flowerBirthSharedChannel.localReady,
    hasFlowerBirthRatingsForAllParticipants,
    hasLocalFlowerBirthRating,
    holdingFlowerBirthParticipantsCount,
    myProfileId,
    otherFlowerBirthParticipant,
    readyFlowerBirthParticipantsCount,
    requiredSharedParticipants,
    saving,
  ]);

  const flowerBirthSealSummaryItems = useMemo<SealSummaryItem[]>(
    () => [
      {
        id: "summary",
        label: "Texto",
        value: String(pagePlanSummary ?? "").trim() || "Pendiente de texto",
        ready: Boolean(String(pagePlanSummary ?? "").trim()),
      },
      {
        id: "canvas",
        label: "Lienzo",
        value: objects.length ? `${objects.length} pieza(s) en el lienzo` : "Pendiente de lienzo",
        ready: objects.length > 0,
      },
      {
        id: "location",
        label: "Lugar",
        value: locationLabel || "Sin lugar asociado",
        ready: Boolean(locationLabel.trim()),
      },
      {
        id: "audio",
        label: "Audio",
        value: audioLabel.trim() || (audioUrl.trim() ? "Audio listo" : "Sin audio"),
        ready: Boolean(audioUrl.trim()),
      },
    ],
    [audioLabel, audioUrl, locationLabel, objects.length, pagePlanSummary],
  );

  const flowerBirthSealStepItems = useMemo<SealStepItem[]>(
    () => [
      {
        id: "presence",
        label: "Presencia",
        detail: enoughFlowerBirthParticipantsPresent
          ? "Las dos personas ya estais dentro."
          : `Esperando a ${otherFlowerBirthParticipant?.name ?? companionReference}.`,
        done: enoughFlowerBirthParticipantsPresent,
        active: !enoughFlowerBirthParticipantsPresent,
      },
      {
        id: "ready",
        label: "A punto",
        detail:
          readyFlowerBirthParticipantsCount >= requiredSharedParticipants
            ? "La flor ya esta lista para el gesto final."
            : `Listas/os ${readyFlowerBirthParticipantsCount}/${requiredSharedParticipants}.`,
        done: readyFlowerBirthParticipantsCount >= requiredSharedParticipants,
        active:
          enoughFlowerBirthParticipantsPresent &&
          readyFlowerBirthParticipantsCount < requiredSharedParticipants,
      },
      {
        id: "hold",
        label: "Sostener",
        detail: flowerBirthHoldStatusLabel,
        done: flowerBirthHoldProgress >= 1,
        active:
          readyFlowerBirthParticipantsCount >= requiredSharedParticipants &&
          flowerBirthHoldProgress < 1,
      },
    ],
    [
      companionReference,
      enoughFlowerBirthParticipantsPresent,
      flowerBirthHoldProgress,
      flowerBirthHoldStatusLabel,
      otherFlowerBirthParticipant,
      readyFlowerBirthParticipantsCount,
      requiredSharedParticipants,
    ],
  );

  const finalizeFlowerBirthSeal = useCallback(async () => {
    const saveResult = await onBeforeFinalizeSeal();
    if (saveResult?.ritualCompleted) {
      await flowerBirthSharedChannel.broadcastSealed(pageTitle ?? undefined);
    }
  }, [flowerBirthSharedChannel, onBeforeFinalizeSeal, pageTitle]);

  const toggleFlowerBirthReady = useCallback(() => {
    if (flowerBirthEditingLocked) {
      onSetMessage(
        `${companionReference} no esta dentro ahora mismo. La flor queda en pausa hasta que vuelva.`,
      );
      return;
    }
    if (!hasLocalFlowerBirthRating) {
      onSetMessage("Primero deja tu valoracion para poder marcar que ya esta a punto.");
      return;
    }

    const nextReady = !flowerBirthSharedChannel.localReady;
    setFlowerBirthRitualNotice(null);
    if (!nextReady) {
      setFlowerBirthHoldProgress(0);
      flowerBirthHoldStartRef.current = null;
      flowerBirthSealTriggeredRef.current = false;
      if (flowerBirthSharedChannel.localHolding) {
        flowerBirthSharedChannel.setLocalHolding(false);
      }
    }
    flowerBirthSharedChannel.setLocalReady(nextReady);
    onPersistLocalReady?.(nextReady);
  }, [
    companionReference,
    flowerBirthEditingLocked,
    flowerBirthSharedChannel,
    hasLocalFlowerBirthRating,
    onPersistLocalReady,
    onSetMessage,
  ]);

  const returnToFlowerBirthDraftStage = useCallback(() => {
    setFlowerBirthHoldProgress(0);
    flowerBirthHoldStartRef.current = null;
    flowerBirthSealTriggeredRef.current = false;
    if (flowerBirthSharedChannel.localHolding) {
      flowerBirthSharedChannel.setLocalHolding(false);
    }
    if (flowerBirthSharedChannel.localReady) {
      flowerBirthSharedChannel.setLocalReady(false);
      onPersistLocalReady?.(false);
    }
    setFlowerBirthRitualNotice("Has vuelto a seguir preparando la flor.");
  }, [flowerBirthSharedChannel, onPersistLocalReady]);

  const handleFlowerBirthHoldStart = useCallback(() => {
    if (!canArmFlowerBirthHold || saving) return;
    flowerBirthSharedChannel.setLocalHolding(true);
  }, [canArmFlowerBirthHold, flowerBirthSharedChannel, saving]);

  const handleFlowerBirthHoldEnd = useCallback(() => {
    flowerBirthSharedChannel.setLocalHolding(false);
  }, [flowerBirthSharedChannel]);

  const handleLocalCanvasPointerChange = useCallback((pointer: LocalCanvasPointer) => {
    setLocalCanvasPointer(pointer);
  }, []);

  useEffect(() => {
    if (!flowerBirthRitualPending) {
      deferredSharedFlowerSnapshotRef.current = null;
      previousFlowerBirthReadyIdsRef.current = [];
      previousFlowerBirthSnapshotVersionRef.current = null;
      previousFlowerBirthLockRef.current = false;
      flowerBirthHoldStartRef.current = null;
      flowerBirthSealTriggeredRef.current = false;
      if (flowerBirthSharedChannel.localHolding) {
        flowerBirthSharedChannel.setLocalHolding(false);
      }
      if (flowerBirthSharedChannel.localReady) {
        flowerBirthSharedChannel.setLocalReady(false);
      }
      const frameId = window.requestAnimationFrame(() => {
        setFlowerBirthHasEnteredLive(false);
        setFlowerBirthRitualNotice(null);
        setHasDeferredSharedFlowerSnapshot(false);
        setLocalCanvasPointer(null);
        setFlowerBirthHoldProgress(0);
      });
      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }

    if (!enoughFlowerBirthParticipantsPresent || flowerBirthHasEnteredLive) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setFlowerBirthHasEnteredLive(true);
      setFlowerBirthRitualNotice("Ya estais las dos personas dentro. La flor se abre en directo.");
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [
    enoughFlowerBirthParticipantsPresent,
    flowerBirthHasEnteredLive,
    flowerBirthRitualPending,
    flowerBirthSharedChannel,
  ]);

  useEffect(() => {
    if (!flowerBirthRitualPending) return;
    const previousLock = previousFlowerBirthLockRef.current;
    if (flowerBirthEditingLocked && !previousLock) {
      const frameId = window.requestAnimationFrame(() => {
        setFlowerBirthRitualNotice(
          `${companionReference} ha salido. La flor queda en pausa hasta que vuelva.`,
        );
      });
      previousFlowerBirthLockRef.current = flowerBirthEditingLocked;
      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }
    if (!flowerBirthEditingLocked && previousLock && flowerBirthHasEnteredLive) {
      const frameId = window.requestAnimationFrame(() => {
        setFlowerBirthRitualNotice(
          `${companionReference} ha vuelto. Ya podeis seguir dando forma a la flor.`,
        );
      });
      previousFlowerBirthLockRef.current = flowerBirthEditingLocked;
      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }
    previousFlowerBirthLockRef.current = flowerBirthEditingLocked;
  }, [
    companionReference,
    flowerBirthEditingLocked,
    flowerBirthHasEnteredLive,
    flowerBirthRitualPending,
  ]);

  useEffect(() => {
    if (!flowerBirthRitualPending || activeSharedTarget) return;
    const deferredSnapshot = deferredSharedFlowerSnapshotRef.current;
    if (!deferredSnapshot) return;
    onApplySnapshot(deferredSnapshot);
    deferredSharedFlowerSnapshotRef.current = null;
    const frameId = window.requestAnimationFrame(() => {
      setHasDeferredSharedFlowerSnapshot(false);
      setFlowerBirthRitualNotice("Se han aplicado los cambios remotos pendientes.");
    });
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [activeSharedTarget, flowerBirthRitualPending, onApplySnapshot]);

  useEffect(() => {
    if (!flowerBirthRitualPending) return;
    const otherReadyIds = flowerBirthRitualParticipants
      .filter((participant) => participant.userId !== myProfileId && participant.ready)
      .map((participant) => participant.userId)
      .sort();
    const previousIds = previousFlowerBirthReadyIdsRef.current;
    const justBecameReadyId = otherReadyIds.find((entryId) => !previousIds.includes(entryId));
    previousFlowerBirthReadyIdsRef.current = otherReadyIds;
    if (!justBecameReadyId) return;
    const participant = flowerBirthRitualParticipants.find(
      (entry) => entry.userId === justBecameReadyId,
    );
    if (!participant) return;
    setFlowerBirthRitualNotice(`${participant.name} ya la ve a punto.`);
  }, [flowerBirthRitualParticipants, flowerBirthRitualPending, myProfileId]);

  useEffect(() => {
    if (!flowerBirthHoldCanProgress || saving) {
      flowerBirthHoldStartRef.current = null;
      flowerBirthSealTriggeredRef.current = false;
      const frameId = window.requestAnimationFrame(() => {
        setFlowerBirthHoldProgress(0);
      });
      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }

    let frameId = 0;
    const tick = () => {
      if (flowerBirthHoldStartRef.current == null) {
        flowerBirthHoldStartRef.current = performance.now();
      }
      const elapsed = performance.now() - flowerBirthHoldStartRef.current;
      const nextProgress = Math.min(elapsed / DEFAULT_SHARED_RITUAL_HOLD_MS, 1);
      setFlowerBirthHoldProgress(nextProgress);
      if (nextProgress >= 1) {
        if (
          !flowerBirthSealTriggeredRef.current &&
          flowerBirthLeaderUserId === myProfileId
        ) {
          flowerBirthSealTriggeredRef.current = true;
          void finalizeFlowerBirthSeal().catch((error) => {
            onSetMessage(getErrorMessage(error, "No se pudo cerrar el nacimiento compartido."));
            flowerBirthSealTriggeredRef.current = false;
            flowerBirthHoldStartRef.current = null;
            setFlowerBirthHoldProgress(0);
            flowerBirthSharedChannel.setLocalHolding(false);
          });
        }
        return;
      }
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [
    finalizeFlowerBirthSeal,
    flowerBirthHoldCanProgress,
    flowerBirthLeaderUserId,
    flowerBirthSharedChannel,
    myProfileId,
    onSetMessage,
    saving,
  ]);

  return {
    audioEditorsLabel,
    canArmFlowerBirthHold,
    canEnterFlowerBirthSealStage,
    coverEditorsLabel,
    currentSharedEditorsLabel,
    displayRating,
    flowerBirthConnected,
    flowerBirthEditingLocked,
    flowerBirthHoldCanProgress,
    flowerBirthHoldProgressPercent,
    flowerBirthHoldStatusLabel,
    flowerBirthLeaderUserId,
    flowerBirthPendingEntry,
    flowerBirthRatingLocked,
    flowerBirthRitualNotice,
    flowerBirthRitualParticipants,
    flowerBirthSealStepItems,
    flowerBirthSealSummaryItems,
    handleFlowerBirthHoldEnd,
    handleFlowerBirthHoldStart,
    handleLocalCanvasPointerChange,
    hasDeferredSharedFlowerSnapshot,
    hasFlowerBirthRatingsForAllParticipants,
    localReady: flowerBirthSharedChannel.localReady,
    locationEditorsLabel,
    planTypeEditorsLabel,
    readyFlowerBirthParticipantsCount,
    remoteCanvasPointers,
    returnToFlowerBirthDraftStage,
    summaryEditorsLabel,
    toggleFlowerBirthReady,
  };
}
