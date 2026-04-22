"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CanvasEditor } from "@/components/canvas/CanvasEditor";
import { useGardenCompanionLabel } from "@/components/chat/useGardenCompanionLabel";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { getSessionAccessToken } from "@/lib/auth";
import type { CanvasObject } from "@/lib/canvasTypes";
import type { FutureMomentsCapsuleConfig } from "@/lib/futureMomentsConfig";
import {
  DEFAULT_SHARED_RITUAL_HOLD_MS,
  pickSharedGardenLeaderUserId,
  resolveSharedGardenRequiredParticipants,
  sharedGardenRitualChannelName,
} from "@/lib/sharedGardenSessions";
import {
  capsuleWindowLabel,
  getTimeCapsuleContentBlockDefinition,
  isTimeCapsuleMediaBlockKind,
  TIME_CAPSULE_WINDOWS,
  type TimeCapsuleContentBlock,
  type TimeCapsuleDraftRevisionRow,
  type TimeCapsuleDraftRow,
  type TimeCapsuleContentBlockKind,
  type TimeCapsuleWindow,
} from "@/lib/timeCapsuleModel";
import {
  uploadCapsuleAudio,
  uploadCapsulePhoto,
  uploadCapsuleVideo,
} from "@/lib/uploadCapsuleMedia";
import { toErrorMessage } from "@/lib/errorMessage";
import { useSharedRitualChannel } from "@/lib/useSharedRitualChannel";

export type CapsuleComposerBlockDraft = {
  id: string;
  kind: TimeCapsuleContentBlockKind;
  value: string;
  caption: string;
  mediaUrl: string | null;
  canvasObjects: CanvasObject[];
};

export type CreateTimeCapsulePayload = {
  title: string;
  windowCode: TimeCapsuleWindow;
  contentBlocks: TimeCapsuleContentBlock[];
};

type TimeCapsuleDraftSnapshot = {
  blocks: CapsuleComposerBlockDraft[];
  title: string;
  windowCode: TimeCapsuleWindow;
};

type CapsuleEditField =
  | "title"
  | "window"
  | "value"
  | "caption"
  | "media"
  | "canvas_note"
  | "canvas_scene";

type CapsuleEditTarget = {
  blockId: string | null;
  cursorOffset: number | null;
  field: CapsuleEditField;
  key: string;
  label: string;
};

type TimeCapsuleComposerModalProps = {
  activeGardenId: string | null;
  activeGardenMemberCount: number;
  currentUser: { id: string; name: string } | null;
  currentYear: number;
  config: FutureMomentsCapsuleConfig;
  onRemoteSealed?: (title?: string) => Promise<void> | void;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateTimeCapsulePayload) => Promise<void>;
};

type UploadState = {
  blockId: string;
  fileName: string;
  percent: number;
  phase: string | null;
  error: string | null;
};

type CanvasPointerState = {
  x: number;
  y: number;
};

type PersistedDraftApiResponse = {
  draft: TimeCapsuleDraftRow | null;
  revisions: TimeCapsuleDraftRevisionRow[];
  revisionsEnabled: boolean;
};

const CAPSULE_DRAFT_AUTOSAVE_MS = 700;
const ACTIVE_EDITOR_PRESENCE_MS = 9000;

const PRIMARY_BLOCK_KINDS: TimeCapsuleContentBlockKind[] = [
  "letter",
  "promise",
  "prediction",
  "wish",
  "question",
  "photo_url",
  "audio_url",
  "video_url",
  "canvas_note",
  "flower",
  "keepsake",
  "text",
];

async function callPersistedDraftApi<T>(input: string, init?: RequestInit): Promise<T> {
  const token = await getSessionAccessToken();
  if (!token) {
    throw new Error("Sesion expirada.");
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(input, { ...init, headers, credentials: "same-origin" });
  const payload = res.headers.get("content-type")?.includes("application/json")
    ? await res.json()
    : null;

  if (!res.ok) {
    throw new Error(
      payload && typeof payload.error === "string" ? payload.error : `Error HTTP ${res.status}`,
    );
  }

  return payload as T;
}

function createInitialDraft(): TimeCapsuleDraftSnapshot {
  return {
    title: "",
    windowCode: "1y",
    blocks: [createDraftBlock("letter")],
  };
}

function createDraftVersion() {
  return `${new Date().toISOString()}-${crypto.randomUUID().slice(0, 8)}`;
}

function createDraftBlock(kind: TimeCapsuleContentBlockKind): CapsuleComposerBlockDraft {
  return {
    id: crypto.randomUUID(),
    kind,
    value: "",
    caption: "",
    mediaUrl: null,
    canvasObjects: [],
  };
}

function mediaAcceptForKind(kind: TimeCapsuleContentBlockKind) {
  if (kind === "photo_url") return "image/*";
  if (kind === "audio_url") return "audio/*";
  if (kind === "video_url") return "video/*";
  return "*/*";
}

function mediaCtaForKind(kind: TimeCapsuleContentBlockKind) {
  if (kind === "photo_url") return "Subir imagen";
  if (kind === "audio_url") return "Subir audio";
  if (kind === "video_url") return "Subir video";
  return "Subir archivo";
}

function mediaPreviewLabel(kind: TimeCapsuleContentBlockKind) {
  if (kind === "photo_url") return "Imagen lista";
  if (kind === "audio_url") return "Audio listo";
  if (kind === "video_url") return "Video listo";
  return "Archivo listo";
}

function buildContentBlocks(blocks: CapsuleComposerBlockDraft[]) {
  return blocks
    .map((block): TimeCapsuleContentBlock | null => {
      if (isTimeCapsuleMediaBlockKind(block.kind)) {
        const mediaUrl = String(block.mediaUrl ?? "").trim();
        const caption = block.caption.trim();
        if (!mediaUrl) return null;
        return {
          kind: block.kind,
          value: mediaUrl,
          mediaUrl,
          ...(caption ? { caption } : {}),
        };
      }

      if (block.kind === "canvas_note") {
        const note = block.value.trim();
        const canvasObjects = Array.isArray(block.canvasObjects) ? block.canvasObjects : [];
        if (!note && !canvasObjects.length) return null;
        return {
          kind: block.kind,
          value: note || "Escena simbolica guardada en el canvas.",
          ...(canvasObjects.length ? { canvasObjects } : {}),
        };
      }

      const value = block.value.trim();
      if (!value) return null;
      return {
        kind: block.kind,
        value,
        ...(block.caption.trim() ? { caption: block.caption.trim() } : {}),
      };
    })
    .filter((block): block is TimeCapsuleContentBlock => Boolean(block));
}

function normalizeDraftForPersistence(snapshot: TimeCapsuleDraftSnapshot) {
  return {
    title: snapshot.title,
    windowCode: snapshot.windowCode,
    blocks: snapshot.blocks.map((block) => ({
      id: block.id,
      kind: block.kind,
      value: block.value,
      caption: block.caption,
      mediaUrl: block.mediaUrl,
      canvasObjects: block.canvasObjects,
    })),
  };
}

function serializeDraftSnapshot(snapshot: TimeCapsuleDraftSnapshot) {
  return JSON.stringify(normalizeDraftForPersistence(snapshot));
}

function hasMeaningfulDraft(snapshot: TimeCapsuleDraftSnapshot) {
  if (snapshot.title.trim()) return true;
  if (snapshot.windowCode !== "1y") return true;
  return snapshot.blocks.some((block) => {
    if (block.value.trim()) return true;
    if (block.caption.trim()) return true;
    if (String(block.mediaUrl ?? "").trim()) return true;
    return Array.isArray(block.canvasObjects) && block.canvasObjects.length > 0;
  });
}

function participantPointerColor(userId: string) {
  const palette = ["#c56f52", "#4c8c6b", "#5a7fd6", "#9c6ac8", "#c28d3f", "#3d88a6"];
  let hash = 0;
  for (const character of userId) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return palette[hash % palette.length] ?? palette[0];
}

function isPresenceFresh(updatedAt: string) {
  const timestamp = Date.parse(updatedAt);
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp <= ACTIVE_EDITOR_PRESENCE_MS;
}

function hydrateSnapshotFromPersistedRow(row: TimeCapsuleDraftRow): TimeCapsuleDraftSnapshot {
  return {
    title: row.title,
    windowCode: row.window_code,
    blocks: row.content_blocks.length
      ? row.content_blocks.map((block) => ({
          id: block.id,
          kind: block.kind,
          value: block.value,
          caption: block.caption,
          mediaUrl: block.mediaUrl,
          canvasObjects: block.canvasObjects,
        }))
      : [createDraftBlock("letter")],
  };
}

function formatRevisionTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(date);
}

function mergeRemoteDraftSnapshot(
  local: TimeCapsuleDraftSnapshot,
  remote: TimeCapsuleDraftSnapshot,
  activeTarget: CapsuleEditTarget | null,
) {
  if (!activeTarget) return remote;

  let next: TimeCapsuleDraftSnapshot = remote;

  if (activeTarget.field === "title") {
    next = { ...next, title: local.title };
  }
  if (activeTarget.field === "window") {
    next = { ...next, windowCode: local.windowCode };
  }

  if (!activeTarget.blockId) return next;

  const localBlock = local.blocks.find((block) => block.id === activeTarget.blockId) ?? null;
  if (!localBlock) return next;

  const remoteIndex = next.blocks.findIndex((block) => block.id === activeTarget.blockId);
  if (remoteIndex < 0) {
    return {
      ...next,
      blocks: [...next.blocks, localBlock],
    };
  }

  const mergedBlock = { ...next.blocks[remoteIndex] };
  if (activeTarget.field === "value") mergedBlock.value = localBlock.value;
  if (activeTarget.field === "caption") mergedBlock.caption = localBlock.caption;
  if (activeTarget.field === "media") {
    mergedBlock.mediaUrl = localBlock.mediaUrl;
    mergedBlock.value = localBlock.value;
  }
  if (activeTarget.field === "canvas_note") {
    mergedBlock.value = localBlock.value;
  }

  const mergedBlocks = [...next.blocks];
  mergedBlocks.splice(remoteIndex, 1, mergedBlock);
  return {
    ...next,
    blocks: mergedBlocks,
  };
}

function didRemoteChangeActiveTarget(
  local: TimeCapsuleDraftSnapshot,
  remote: TimeCapsuleDraftSnapshot,
  activeTarget: CapsuleEditTarget | null,
) {
  if (!activeTarget) return false;

  if (activeTarget.field === "title") {
    return local.title !== remote.title;
  }
  if (activeTarget.field === "window") {
    return local.windowCode !== remote.windowCode;
  }
  if (!activeTarget.blockId) return false;

  const localBlock = local.blocks.find((block) => block.id === activeTarget.blockId) ?? null;
  const remoteBlock = remote.blocks.find((block) => block.id === activeTarget.blockId) ?? null;
  if (!localBlock || !remoteBlock) return false;

  if (activeTarget.field === "value" || activeTarget.field === "canvas_note") {
    return localBlock.value !== remoteBlock.value;
  }
  if (activeTarget.field === "caption") {
    return localBlock.caption !== remoteBlock.caption;
  }
  if (activeTarget.field === "media") {
    return (
      localBlock.mediaUrl !== remoteBlock.mediaUrl ||
      localBlock.value !== remoteBlock.value
    );
  }
  if (activeTarget.field === "canvas_scene") {
    return JSON.stringify(localBlock.canvasObjects) !== JSON.stringify(remoteBlock.canvasObjects);
  }

  return false;
}

function describeRevisionSummary(revision: TimeCapsuleDraftRevisionRow, currentUserId: string | null) {
  const actorLabel =
    revision.actor_user_id && currentUserId && revision.actor_user_id === currentUserId
      ? "Tu lado"
      : revision.actor_name?.trim() || "El otro lado";
  const parts: string[] = [];

  if (revision.summary.added.length > 0) {
    parts.push(
      `anadio ${revision.summary.added
        .slice(0, 2)
        .map((item) => item.label.toLowerCase())
        .join(" y ")}`,
    );
  }
  if (revision.summary.removed.length > 0) {
    parts.push(
      `quito ${revision.summary.removed
        .slice(0, 2)
        .map((item) => item.label.toLowerCase())
        .join(" y ")}`,
    );
  }
  if (revision.summary.changed.length > 0) {
    parts.push(
      `retoco ${revision.summary.changed
        .slice(0, 2)
        .map((item) => item.label.toLowerCase())
        .join(" y ")}`,
    );
  }
  if (revision.summary.titleChanged) parts.push("ajusto el titulo");
  if (revision.summary.windowChanged) parts.push("movio la apertura");

  return {
    actorLabel,
    text: parts.length > 0 ? parts.join(", ") : "ajusto el borrador",
  };
}

function describeRevisionField(field: string) {
  if (field === "value") return "texto";
  if (field === "caption") return "nota";
  if (field === "media") return "media";
  if (field === "canvas") return "canvas";
  if (field === "kind") return "tipo";
  if (field === "order") return "orden";
  return field;
}

function buildUploadActivityLabel(
  uploadState: UploadState | null,
  draft: TimeCapsuleDraftSnapshot,
) {
  if (!uploadState || uploadState.error) return null;
  const block = draft.blocks.find((entry) => entry.id === uploadState.blockId) ?? null;
  const label = block ? getTimeCapsuleContentBlockDefinition(block.kind).label : "Archivo";
  if (uploadState.phase === "processing") return `Procesando ${label.toLowerCase()}`;
  return `Subiendo ${label.toLowerCase()}`;
}

export function TimeCapsuleComposerModal(props: TimeCapsuleComposerModalProps) {
  const {
    activeGardenId,
    activeGardenMemberCount,
    config,
    currentUser,
    currentYear,
    onClose,
    onRemoteSealed,
    onSubmit,
    submitting,
  } = props;
  const [draft, setDraft] = useState<TimeCapsuleDraftSnapshot>(() => createInitialDraft());
  const [draftVersion, setDraftVersion] = useState(() => createDraftVersion());
  const [localError, setLocalError] = useState<string | null>(null);
  const [remoteNotice, setRemoteNotice] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const [editingCanvasBlockId, setEditingCanvasBlockId] = useState<string | null>(null);
  const [canvasPointer, setCanvasPointer] = useState<CanvasPointerState | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [sealStageOpen, setSealStageOpen] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [draftSyncState, setDraftSyncState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [revisions, setRevisions] = useState<TimeCapsuleDraftRevisionRow[]>([]);
  const [revisionsEnabled, setRevisionsEnabled] = useState(true);
  const [activeEditTarget, setActiveEditTarget] = useState<CapsuleEditTarget | null>(null);
  const [hasDeferredServerDraft, setHasDeferredServerDraft] = useState(false);
  const [sharedConflictTargetKey, setSharedConflictTargetKey] = useState<string | null>(null);
  const draftRef = useRef<TimeCapsuleDraftSnapshot>(draft);
  const holdStartRef = useRef<number | null>(null);
  const sealTriggeredRef = useRef(false);
  const previousOtherReadyIdsRef = useRef<string[]>([]);
  const lastPersistedDraftRef = useRef("");
  const refreshPersistedDraftRef = useRef<
    ((mode?: "replace" | "replace-if-clean" | "revisions-only") => Promise<void>) | null
  >(null);
  const activeEditTargetRef = useRef<CapsuleEditTarget | null>(null);
  const lastCanvasPointerRef = useRef<{ at: number; pointer: CanvasPointerState | null }>({
    at: 0,
    pointer: null,
  });

  const requiredParticipants = useMemo(
    () => resolveSharedGardenRequiredParticipants(activeGardenMemberCount),
    [activeGardenMemberCount],
  );
  const channelName = useMemo(
    () =>
      sharedGardenRitualChannelName({
        ritual: "capsule",
        gardenId: activeGardenId,
        entityKey: `${currentYear}`,
      }),
    [activeGardenId, currentYear],
  );
  const uploadActivityLabel = useMemo(
    () => buildUploadActivityLabel(uploadState, draft),
    [draft, uploadState],
  );
  const { companionReference } = useGardenCompanionLabel(activeGardenId, currentUser?.id ?? null);

  const sharedChannel = useSharedRitualChannel<TimeCapsuleDraftSnapshot>({
    channelName,
    displayName: currentUser?.name ?? "Tu lado",
    enabled: draftHydrated && requiredParticipants > 1 && Boolean(currentUser?.id),
    localActivityLabel: uploadActivityLabel,
    localActivityProgress:
      uploadState && !uploadState.error ? Math.round(uploadState.percent) : null,
    localCursorOffset: activeEditTarget?.cursorOffset ?? null,
    localFocusKey: activeEditTarget?.key ?? null,
    localFocusLabel: activeEditTarget?.label ?? null,
    localPointerX: canvasPointer?.x ?? null,
    localPointerY: canvasPointer?.y ?? null,
    onRemoteSnapshot: (snapshot, meta) => {
      const activeTarget = activeEditTargetRef.current;
      let changedActiveTarget = false;
      setDraft((current) => {
        changedActiveTarget = didRemoteChangeActiveTarget(current, snapshot, activeTarget);
        return mergeRemoteDraftSnapshot(current, snapshot, activeTarget);
      });
      setDraftVersion(meta.version);
      lastPersistedDraftRef.current = serializeDraftSnapshot(snapshot);
      if (activeTarget && changedActiveTarget) {
        setSharedConflictTargetKey(activeTarget.key);
        setRemoteNotice(
          `${companionReference} tambien esta escribiendo en ${activeTarget.label.toLowerCase()}. Tu texto local sigue delante por ahora.`,
        );
        setHasDeferredServerDraft(true);
      } else {
        setSharedConflictTargetKey(null);
        setRemoteNotice(
          activeTarget
            ? `El borrador se ha actualizado sin tocar ${activeTarget.label.toLowerCase()}.`
            : "El borrador compartido acaba de actualizarse.",
        );
        setHasDeferredServerDraft(false);
      }
      setLocalError(null);
      setDraftSyncState("saved");
      setSealStageOpen(false);
      setHoldProgress(0);
      holdStartRef.current = null;
      sealTriggeredRef.current = false;
      void refreshPersistedDraftRef.current?.("revisions-only");
    },
    onRemoteSealed: async (payload) => {
      setRemoteNotice(
        payload.title
          ? `"${payload.title}" ya ha quedado sellada.`
          : "La capsula ya ha quedado sellada.",
      );
      setLocalError(null);
      setSealStageOpen(false);
      setHoldProgress(0);
      holdStartRef.current = null;
      sealTriggeredRef.current = false;
      setEditingCanvasBlockId(null);
      await onRemoteSealed?.(payload.title);
    },
    snapshot: draftHydrated ? draft : null,
    snapshotVersion: draftHydrated ? draftVersion : null,
    userId: currentUser?.id ?? null,
  });

  const editingCanvasBlock = useMemo(
    () => draft.blocks.find((block) => block.id === editingCanvasBlockId) ?? null,
    [draft.blocks, editingCanvasBlockId],
  );

  const pieceSummaries = useMemo(
    () =>
      draft.blocks.map((block, index) => ({
        id: block.id,
        order: index + 1,
        label: getTimeCapsuleContentBlockDefinition(block.kind).label,
        ready:
          block.kind === "canvas_note"
            ? block.canvasObjects.length > 0 || block.value.trim().length > 0
            : isTimeCapsuleMediaBlockKind(block.kind)
              ? String(block.mediaUrl ?? "").trim().length > 0
              : block.value.trim().length > 0,
      })),
    [draft.blocks],
  );
  const contentBlocks = useMemo(() => buildContentBlocks(draft.blocks), [draft.blocks]);
  const readyPiecesCount = pieceSummaries.filter((piece) => piece.ready).length;
  const pendingPiecesCount = pieceSummaries.length - readyPiecesCount;
  const windowLabel = useMemo(() => capsuleWindowLabel(draft.windowCode), [draft.windowCode]);
  const remoteEditors = useMemo(
    () =>
      sharedChannel.participants.filter(
        (participant) =>
          participant.userId !== currentUser?.id &&
          Boolean(participant.focusKey) &&
          isPresenceFresh(participant.updatedAt),
      ),
    [currentUser?.id, sharedChannel.participants],
  );
  const editorsForTarget = useCallback(
    (targetKey: string) =>
      remoteEditors.filter(
        (participant) => participant.focusKey && participant.focusKey === targetKey,
      ),
    [remoteEditors],
  );
  const canvasStageTargetKey = editingCanvasBlockId ? `block:${editingCanvasBlockId}:canvas:stage` : null;
  const canvasNoteTargetKey = editingCanvasBlockId ? `block:${editingCanvasBlockId}:canvas:note` : null;
  const remoteCanvasPointers = useMemo(() => {
    if (!canvasStageTargetKey) return [];
    return remoteEditors
      .filter(
        (participant) =>
          participant.focusKey === canvasStageTargetKey &&
          typeof participant.pointerX === "number" &&
          typeof participant.pointerY === "number",
      )
      .map((participant) => ({
        userId: participant.userId,
        name: participant.name,
        x: participant.pointerX as number,
        y: participant.pointerY as number,
        color: participantPointerColor(participant.userId),
      }));
  }, [canvasStageTargetKey, remoteEditors]);

  const setEditingTarget = useCallback(
    (target: Omit<CapsuleEditTarget, "cursorOffset">, cursorOffset: number | null = null) => {
      setSharedConflictTargetKey((current) => (current === target.key ? current : null));
      setActiveEditTarget({
        ...target,
        cursorOffset,
      });
    },
    [],
  );

  const clearEditingTarget = useCallback((targetKey?: string) => {
    setActiveEditTarget((current) => {
      if (!current) return null;
      if (targetKey && current.key !== targetKey) return current;
      return null;
    });
    if (targetKey) {
      setSharedConflictTargetKey((current) => (current === targetKey ? null : current));
    } else {
      setSharedConflictTargetKey(null);
    }
  }, []);

  useEffect(() => {
    if (editingCanvasBlockId && !editingCanvasBlock) {
      clearEditingTarget(`block:${editingCanvasBlockId}:canvas:stage`);
      clearEditingTarget(`block:${editingCanvasBlockId}:canvas:note`);
      setEditingCanvasBlockId(null);
      setCanvasPointer(null);
    }
  }, [clearEditingTarget, editingCanvasBlock, editingCanvasBlockId]);

  useEffect(() => {
    if (editingCanvasBlockId) return;
    lastCanvasPointerRef.current = { at: 0, pointer: null };
    setCanvasPointer(null);
  }, [editingCanvasBlockId]);

  const updateCursorFromEvent = useCallback(
    (
      target: Omit<CapsuleEditTarget, "cursorOffset">,
      event: { currentTarget: HTMLInputElement | HTMLTextAreaElement },
    ) => {
      const offset =
        typeof event.currentTarget.selectionStart === "number"
          ? event.currentTarget.selectionStart
          : null;
      setEditingTarget(target, offset);
    },
    [setEditingTarget],
  );

  const handleCanvasPointerChange = useCallback(
    (pointer: CanvasPointerState | null) => {
      const now = Date.now();
      const normalized =
        pointer &&
        Number.isFinite(pointer.x) &&
        Number.isFinite(pointer.y)
          ? {
              x: Math.round(pointer.x),
              y: Math.round(pointer.y),
            }
          : null;
      const previous = lastCanvasPointerRef.current.pointer;
      const movedEnough =
        !previous ||
        !normalized ||
        Math.abs(previous.x - normalized.x) >= 5 ||
        Math.abs(previous.y - normalized.y) >= 5;
      const elapsedEnough = now - lastCanvasPointerRef.current.at >= 70;
      const changedPresence =
        Boolean(previous) !== Boolean(normalized) ||
        (previous && normalized && (previous.x !== normalized.x || previous.y !== normalized.y));

      if (!changedPresence) return;
      if (!elapsedEnough && !movedEnough) return;

      lastCanvasPointerRef.current = {
        at: now,
        pointer: normalized,
      };
      setCanvasPointer(normalized);
      if (editingCanvasBlockId && normalized) {
        setEditingTarget(
          {
            blockId: editingCanvasBlockId,
            field: "canvas_scene",
            key: `block:${editingCanvasBlockId}:canvas:stage`,
            label: "Canvas en directo",
          },
          null,
        );
      } else if (editingCanvasBlockId) {
        clearEditingTarget(`block:${editingCanvasBlockId}:canvas:stage`);
      }
    },
    [clearEditingTarget, editingCanvasBlockId, setEditingTarget],
  );

  const renderTargetEditors = useCallback(
    (targetKey: string) => {
      const editors = editorsForTarget(targetKey);
      if (!editors.length) return null;
      return (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {editors.map((participant) => (
            <span
              key={`${targetKey}:${participant.userId}`}
              className="rounded-full border border-[#e5d7c4] bg-[#fff7ef] px-2 py-0.5 text-[11px] text-[#8a5a3d]"
            >
              {participant.name} aqui
              {typeof participant.cursorOffset === "number" && participant.cursorOffset >= 0
                ? ` · ${participant.cursorOffset}`
                : ""}
            </span>
          ))}
        </div>
      );
    },
    [editorsForTarget],
  );

  const renderSharedEditingNotice = useCallback(
    (targetKey: string, label: string) => {
      const editors = editorsForTarget(targetKey);
      const hasConflict = sharedConflictTargetKey === targetKey;
      if (!editors.length && !hasConflict) return null;

      const names = editors.map((participant) => participant.name).join(" y ");
      const message = hasConflict
        ? `${
            names || companionReference
          } tambien esta escribiendo en ${label}. Tu version local sigue delante mientras mantienes el foco, pero ya hay cambios compartidos esperando.`
        : `${names || companionReference} tambien esta aqui. Podeis escribir a la vez, pero el ultimo guardado manda si tocais lo mismo.`;

      return (
        <div
          className={`mt-2 rounded-[18px] border px-3 py-2 text-xs leading-5 ${
            hasConflict
              ? "border-[#d6a683] bg-[#fff6ec] text-[#8a5a3d]"
              : "border-[#eadfca] bg-[#fffaf4] text-slate-600"
          }`}
        >
          {message}
        </div>
      );
    },
    [companionReference, editorsForTarget, sharedConflictTargetKey],
  );

  const refreshPersistedDraft = useCallback(
    async (mode: "replace" | "replace-if-clean" | "revisions-only" = "replace") => {
      if (!activeGardenId || !currentUser?.id) return;
      const localDraft = draftRef.current;

      const data = await callPersistedDraftApi<PersistedDraftApiResponse>(
        `/api/capsules/draft?year=${currentYear}`,
      );
      setRevisions(Array.isArray(data.revisions) ? data.revisions : []);
      setRevisionsEnabled(data.revisionsEnabled !== false);

      if (!data.draft) {
      if (mode === "replace") {
        lastPersistedDraftRef.current = "";
        setHasDeferredServerDraft(false);
        setDraftSyncState("idle");
      }
      return;
      }

      if (mode === "revisions-only") return;

      const nextDraft = hydrateSnapshotFromPersistedRow(data.draft);
      const persistedSnapshotKey = serializeDraftSnapshot(nextDraft);
      const localSnapshotKey = serializeDraftSnapshot(localDraft);
      const localIsClean =
        !hasMeaningfulDraft(localDraft) || localSnapshotKey === lastPersistedDraftRef.current;
      const shouldReplace = mode === "replace" || (mode === "replace-if-clean" && localIsClean);

      if (!shouldReplace) {
        if (persistedSnapshotKey !== lastPersistedDraftRef.current) {
          setHasDeferredServerDraft(true);
          setRemoteNotice("Hay cambios guardados nuevos en el borrador compartido.");
        }
        return;
      }

      setDraft(nextDraft);
      setDraftVersion(createDraftVersion());
      lastPersistedDraftRef.current = persistedSnapshotKey;
      setHasDeferredServerDraft(false);
      setDraftSyncState("saved");
    },
    [activeGardenId, currentUser?.id, currentYear],
  );

  useEffect(() => {
    refreshPersistedDraftRef.current = refreshPersistedDraft;
  }, [refreshPersistedDraft]);

  useEffect(() => {
    activeEditTargetRef.current = activeEditTarget;
  }, [activeEditTarget]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const persistDraftNow = useCallback(async () => {
    if (!draftHydrated || !activeGardenId || !currentUser?.id) return true;

    const snapshotKey = serializeDraftSnapshot(draft);
    const meaningful = hasMeaningfulDraft(draft);

    if (!meaningful) {
      if (!lastPersistedDraftRef.current) {
        setDraftSyncState("idle");
        return true;
      }

      setDraftSyncState("saving");
      await callPersistedDraftApi<{ ok: boolean }>(`/api/capsules/draft?year=${currentYear}`, {
        method: "DELETE",
      });
      lastPersistedDraftRef.current = "";
      setRevisions([]);
      setRevisionsEnabled(true);
      setHasDeferredServerDraft(false);
      setDraftSyncState("idle");
      return true;
    }

    if (snapshotKey === lastPersistedDraftRef.current) {
      setDraftSyncState(lastPersistedDraftRef.current ? "saved" : "idle");
      return true;
    }

    setDraftSyncState("saving");
    const data = await callPersistedDraftApi<PersistedDraftApiResponse>("/api/capsules/draft", {
      method: "PUT",
      body: JSON.stringify({
        year: currentYear,
        title: draft.title,
        windowCode: draft.windowCode,
        contentBlocks: normalizeDraftForPersistence(draft).blocks,
      }),
    });
    setRevisions(Array.isArray(data.revisions) ? data.revisions : []);
    setRevisionsEnabled(data.revisionsEnabled !== false);
    if (data.draft) {
      lastPersistedDraftRef.current = serializeDraftSnapshot(hydrateSnapshotFromPersistedRow(data.draft));
    } else {
      lastPersistedDraftRef.current = snapshotKey;
    }
    setHasDeferredServerDraft(false);
    setDraftSyncState("saved");
    return true;
  }, [activeGardenId, currentUser?.id, currentYear, draft, draftHydrated]);

  const handleClose = useCallback(async () => {
    try {
      await persistDraftNow();
      onClose();
    } catch (error) {
      setLocalError(toErrorMessage(error, "No se pudo guardar el borrador antes de cerrar."));
      setDraftSyncState("error");
    }
  }, [onClose, persistDraftNow]);

  const applyLocalDraft = useCallback(
    (updater: (current: TimeCapsuleDraftSnapshot) => TimeCapsuleDraftSnapshot) => {
      setDraft((current) => updater(current));
      setDraftVersion(createDraftVersion());
      setRemoteNotice(null);
      setLocalError(null);
      setSealStageOpen(false);
      setHoldProgress(0);
      holdStartRef.current = null;
      sealTriggeredRef.current = false;
      if (sharedChannel.localReady) sharedChannel.setLocalReady(false);
      if (sharedChannel.localHolding) sharedChannel.setLocalHolding(false);
    },
    [
      sharedChannel.localHolding,
      sharedChannel.localReady,
      sharedChannel.setLocalHolding,
      sharedChannel.setLocalReady,
    ],
  );

  const updateBlock = useCallback(
    (
      blockId: string,
      updater: (current: CapsuleComposerBlockDraft) => CapsuleComposerBlockDraft,
    ) => {
      applyLocalDraft((current) => ({
        ...current,
        blocks: current.blocks.map((block) => (block.id === blockId ? updater(block) : block)),
      }));
    },
    [applyLocalDraft],
  );

  const moveBlock = useCallback(
    (blockId: string, direction: "up" | "down") => {
      applyLocalDraft((current) => {
        const index = current.blocks.findIndex((block) => block.id === blockId);
        if (index < 0) return current;
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= current.blocks.length) return current;
        const next = [...current.blocks];
        const [moved] = next.splice(index, 1);
        next.splice(targetIndex, 0, moved);
        return {
          ...current,
          blocks: next,
        };
      });
    },
    [applyLocalDraft],
  );

  useEffect(() => {
    let active = true;
    if (!activeGardenId || !currentUser?.id) {
      setDraftHydrated(true);
      setRevisions([]);
      return () => {
        active = false;
      };
    }

    setDraftHydrated(false);
    setDraftSyncState("idle");

    void (async () => {
      try {
        await refreshPersistedDraft("replace");
        if (!active) return;
      } catch (error) {
        if (!active) return;
        setLocalError((current) =>
          current ?? toErrorMessage(error, "No se pudo recuperar el borrador guardado."),
        );
        setDraftSyncState("error");
      } finally {
        if (active) setDraftHydrated(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [activeGardenId, currentUser?.id, currentYear, refreshPersistedDraft]);

  useEffect(() => {
    if (!draftHydrated || !activeGardenId || !currentUser?.id) return;

    const snapshotKey = serializeDraftSnapshot(draft);
    const meaningful = hasMeaningfulDraft(draft);
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      if (!meaningful) {
        if (!lastPersistedDraftRef.current) {
          setDraftSyncState("idle");
          return;
        }
        setDraftSyncState("saving");
        void callPersistedDraftApi<{ ok: boolean }>(`/api/capsules/draft?year=${currentYear}`, {
          method: "DELETE",
        })
          .then(() => {
            if (cancelled) return;
            lastPersistedDraftRef.current = "";
            setRevisions([]);
            setRevisionsEnabled(true);
            setHasDeferredServerDraft(false);
            setDraftSyncState("idle");
          })
          .catch(() => {
            if (cancelled) return;
            setDraftSyncState("error");
          });
        return;
      }

      if (snapshotKey === lastPersistedDraftRef.current) {
        setDraftSyncState(lastPersistedDraftRef.current ? "saved" : "idle");
        return;
      }

      setDraftSyncState("saving");
      void callPersistedDraftApi<PersistedDraftApiResponse>("/api/capsules/draft", {
        method: "PUT",
        body: JSON.stringify({
          year: currentYear,
          title: draft.title,
          windowCode: draft.windowCode,
          contentBlocks: normalizeDraftForPersistence(draft).blocks,
        }),
      })
        .then((data) => {
          if (cancelled) return;
          setRevisions(Array.isArray(data.revisions) ? data.revisions : []);
          setRevisionsEnabled(data.revisionsEnabled !== false);
          if (data.draft) {
            const persistedSnapshot = hydrateSnapshotFromPersistedRow(data.draft);
            lastPersistedDraftRef.current = serializeDraftSnapshot(persistedSnapshot);
          } else {
            lastPersistedDraftRef.current = snapshotKey;
          }
          setHasDeferredServerDraft(false);
          setDraftSyncState("saved");
        })
        .catch(() => {
          if (cancelled) return;
          setDraftSyncState("error");
        });
    }, CAPSULE_DRAFT_AUTOSAVE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeGardenId, currentUser?.id, currentYear, draft, draftHydrated]);

  useEffect(() => {
    if (!draftHydrated || !activeGardenId || !currentUser?.id) return;

    const handleFocusRefresh = () => {
      void refreshPersistedDraft("replace-if-clean").catch(() => {
        // Best effort refresh when the tab becomes active again.
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      handleFocusRefresh();
    };

    window.addEventListener("focus", handleFocusRefresh);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("focus", handleFocusRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeGardenId, currentUser?.id, draftHydrated, refreshPersistedDraft]);

  useEffect(() => {
    if (!draftHydrated || !activeGardenId || !currentUser?.id) return;

    const handlePageHide = () => {
      void persistDraftNow().catch(() => {
        // Best effort before the page goes away.
      });
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [activeGardenId, currentUser?.id, draftHydrated, persistDraftNow]);

  useEffect(() => {
    if (!draftHydrated || !sharedChannel.connected) return;
    void refreshPersistedDraft("replace-if-clean").catch(() => {
      // Best effort after reconnect.
    });
  }, [draftHydrated, refreshPersistedDraft, sharedChannel.connected]);

  async function handleMediaUpload(
    blockId: string,
    kind: TimeCapsuleContentBlockKind,
    file: File,
  ) {
    if (!isTimeCapsuleMediaBlockKind(kind) || submitting) return;

    setLocalError(null);
    setUploadState({
      blockId,
      fileName: file.name,
      percent: 0,
      phase: "uploading",
      error: null,
    });

    try {
      const uploader =
        kind === "photo_url"
          ? uploadCapsulePhoto
          : kind === "audio_url"
            ? uploadCapsuleAudio
            : uploadCapsuleVideo;
      const url = await uploader(file, {
        onProgress: (progress) => {
          setUploadState((current) =>
            current && current.blockId === blockId
              ? { ...current, percent: Math.max(0, Math.min(100, progress.percent)) }
              : current,
          );
        },
        onPhaseChange: (phase) => {
          setUploadState((current) =>
            current && current.blockId === blockId ? { ...current, phase } : current,
          );
        },
      });

      updateBlock(blockId, (current) => ({
        ...current,
        mediaUrl: url,
        value: url,
      }));
      setUploadState(null);
    } catch (error) {
      setUploadState((current) =>
        current && current.blockId === blockId
          ? { ...current, error: toErrorMessage(error, "No se pudo subir el archivo.") }
          : current,
      );
    }
  }

  const enoughParticipantsPresent =
    requiredParticipants === 1 || sharedChannel.participants.length >= requiredParticipants;
  const readyParticipantsCount =
    requiredParticipants === 1
      ? sharedChannel.localReady
        ? 1
        : 0
      : sharedChannel.participants.filter((participant) => participant.ready).length;
  const holdingParticipantsCount =
    requiredParticipants === 1
      ? sharedChannel.localHolding
        ? 1
        : 0
      : sharedChannel.participants.filter((participant) => participant.holding).length;
  const sealCanBeArmed =
    contentBlocks.length > 0 &&
    (!uploadState || Boolean(uploadState.error)) &&
    sharedChannel.localReady &&
    enoughParticipantsPresent &&
    readyParticipantsCount >= requiredParticipants;
  const holdCanProgress =
    sealCanBeArmed &&
    holdingParticipantsCount >= requiredParticipants &&
    sharedChannel.localHolding;
  const canEnterSealStage =
    contentBlocks.length > 0 &&
    enoughParticipantsPresent &&
    readyParticipantsCount >= requiredParticipants;
  const leaderUserId =
    pickSharedGardenLeaderUserId(sharedChannel.participants) ?? currentUser?.id ?? null;
  const ritualParticipants = useMemo(
    () => {
      const localParticipant = {
        activityLabel: uploadActivityLabel,
        activityProgress:
          uploadState && !uploadState.error ? Math.round(uploadState.percent) : null,
        cursorOffset: activeEditTarget?.cursorOffset ?? null,
        focusKey: activeEditTarget?.key ?? null,
        focusLabel: activeEditTarget?.label ?? null,
        holding: sharedChannel.localHolding,
        name: currentUser?.name ?? "Tu lado",
        ready: sharedChannel.localReady,
        updatedAt: new Date().toISOString(),
        userId: currentUser?.id ?? "local",
      };
      if (requiredParticipants <= 1) return [localParticipant];
      if (!sharedChannel.participants.length) return [localParticipant];
      if (sharedChannel.participants.some((participant) => participant.userId === localParticipant.userId)) {
        return sharedChannel.participants;
      }
      return [localParticipant, ...sharedChannel.participants];
    },
    [
      currentUser?.id,
      currentUser?.name,
      uploadActivityLabel,
      uploadState,
      activeEditTarget?.cursorOffset,
      activeEditTarget?.key,
      activeEditTarget?.label,
      requiredParticipants,
      sharedChannel.localHolding,
      sharedChannel.localReady,
      sharedChannel.participants,
    ],
  );
  const otherParticipant = useMemo(
    () => ritualParticipants.find((participant) => participant.userId !== currentUser?.id) ?? null,
    [currentUser?.id, ritualParticipants],
  );
  const draftTitle = draft.title.trim() || `Capsula anual ${currentYear}`;
  const holdProgressPercent = Math.round(holdProgress * 100);
  const sealStageStatus = useMemo(() => {
    if (submitting) return "Sellando...";
    if (uploadState && !uploadState.error) return "La capsula sigue absorbiendo una pieza.";
    if (!contentBlocks.length) return "Anade al menos una pieza real.";
    if (!sharedChannel.localReady) {
      return requiredParticipants > 1
        ? "Marca que ya esta todo a punto para entrar en el ritual."
        : "Marca que ya esta todo a punto para sellarla.";
    }
    if (!enoughParticipantsPresent) {
      return otherParticipant
        ? `Esperando a ${otherParticipant.name}.`
        : `Esperando a ${companionReference}.`;
    }
    if (readyParticipantsCount < requiredParticipants) {
      return otherParticipant
        ? `${otherParticipant.name} aun esta preparando la capsula.`
        : `Falta que ${companionReference} se prepare.`;
    }
    if (holdProgress >= 1 && leaderUserId !== currentUser?.id) {
      return "Confirmando el sellado...";
    }
    if (holdProgress > 0) {
      return requiredParticipants > 1
        ? "Seguid manteniendo la capsula."
        : "Sigue manteniendo la capsula.";
    }
    if (requiredParticipants > 1 && holdingParticipantsCount === 1 && !sharedChannel.localHolding) {
      return otherParticipant
        ? `${otherParticipant.name} ya ha empezado a sellar.`
        : `${companionReference} ya ha empezado a sellar.`;
    }
    return requiredParticipants > 1
      ? "Mantened ambas la capsula para sellarla."
      : "Manten la capsula para sellarla.";
  }, [
    companionReference,
    contentBlocks.length,
    currentUser?.id,
    enoughParticipantsPresent,
    holdProgress,
    holdingParticipantsCount,
    leaderUserId,
    otherParticipant,
    readyParticipantsCount,
    requiredParticipants,
    sharedChannel.localHolding,
    sharedChannel.localReady,
    submitting,
    uploadState,
  ]);

  useEffect(() => {
    const otherReadyParticipants = sharedChannel.participants
      .filter((participant) => participant.userId !== currentUser?.id && participant.ready)
      .map((participant) => participant.userId)
      .sort();
    const previousIds = previousOtherReadyIdsRef.current;
    const justBecameReadyId = otherReadyParticipants.find((id) => !previousIds.includes(id));
    previousOtherReadyIdsRef.current = otherReadyParticipants;
    if (!justBecameReadyId) return;
    const participant = sharedChannel.participants.find((entry) => entry.userId === justBecameReadyId);
    if (!participant) return;
    setRemoteNotice(`${participant.name} ya esta a punto para sellar.`);
  }, [currentUser?.id, sharedChannel.participants]);

  useEffect(() => {
    if (!activeEditTarget) return;
    const competingEditors = editorsForTarget(activeEditTarget.key);
    if (!competingEditors.length) return;
    setRemoteNotice(
      `${competingEditors[0]?.name ?? companionReference} tambien esta en ${activeEditTarget.label.toLowerCase()}.`,
    );
  }, [activeEditTarget, companionReference, editorsForTarget]);

  useEffect(() => {
    if (canEnterSealStage) {
      setSealStageOpen(true);
      return;
    }
    setSealStageOpen(false);
  }, [canEnterSealStage]);

  useEffect(() => {
    if (contentBlocks.length > 0) return;
    if (sharedChannel.localReady) sharedChannel.setLocalReady(false);
    if (sharedChannel.localHolding) sharedChannel.setLocalHolding(false);
  }, [
    contentBlocks.length,
    sharedChannel.localHolding,
    sharedChannel.localReady,
    sharedChannel.setLocalHolding,
    sharedChannel.setLocalReady,
  ]);

  const finalizeSeal = useCallback(async () => {
    if (uploadState && !uploadState.error) {
      setLocalError("Espera a que termine la subida actual antes de sellar la capsula.");
      return;
    }
    if (!contentBlocks.length) {
      setLocalError("Anade al menos una pieza real antes de sellar la capsula.");
      return;
    }

    const title = draft.title.trim() || `Capsula anual ${currentYear}`;
    setLocalError(null);
    await onSubmit({
      title,
      windowCode: draft.windowCode,
      contentBlocks,
    });
    await sharedChannel.broadcastSealed(title);
  }, [contentBlocks, currentYear, draft.title, draft.windowCode, onSubmit, sharedChannel, uploadState]);

  useEffect(() => {
    if (!holdCanProgress || submitting) {
      setHoldProgress(0);
      holdStartRef.current = null;
      sealTriggeredRef.current = false;
      return;
    }

    let frameId = 0;
    const tick = () => {
      if (holdStartRef.current == null) {
        holdStartRef.current = performance.now();
      }
      const elapsed = performance.now() - holdStartRef.current;
      const nextProgress = Math.min(elapsed / DEFAULT_SHARED_RITUAL_HOLD_MS, 1);
      setHoldProgress(nextProgress);
      if (nextProgress >= 1) {
        if (!sealTriggeredRef.current && leaderUserId === currentUser?.id) {
          sealTriggeredRef.current = true;
          void finalizeSeal().catch((error) => {
            setLocalError(toErrorMessage(error, "No se pudo sellar la capsula."));
            sealTriggeredRef.current = false;
            setHoldProgress(0);
            holdStartRef.current = null;
            sharedChannel.setLocalHolding(false);
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
  }, [currentUser?.id, finalizeSeal, holdCanProgress, leaderUserId, sharedChannel, submitting]);

  function handleHoldStart() {
    if (!sealCanBeArmed || submitting) return;
    sharedChannel.setLocalHolding(true);
  }

  function handleHoldEnd() {
    sharedChannel.setLocalHolding(false);
  }

  function toggleLocalReady() {
    if (!sharedChannel.localReady && !contentBlocks.length) {
      setLocalError("Anade al menos una pieza real antes de marcar que ya esta todo a punto.");
      return;
    }
    const nextReady = !sharedChannel.localReady;
    setLocalError(null);
    setRemoteNotice(null);
    if (!nextReady) {
      setSealStageOpen(false);
      setHoldProgress(0);
      holdStartRef.current = null;
      sealTriggeredRef.current = false;
      if (sharedChannel.localHolding) sharedChannel.setLocalHolding(false);
    }
    sharedChannel.setLocalReady(nextReady);
  }

  function returnToDraftStage() {
    setSealStageOpen(false);
    setHoldProgress(0);
    holdStartRef.current = null;
    sealTriggeredRef.current = false;
    if (sharedChannel.localHolding) sharedChannel.setLocalHolding(false);
    if (sharedChannel.localReady) sharedChannel.setLocalReady(false);
    setRemoteNotice("Has vuelto al borrador compartido.");
  }

  function holdLabel() {
    if (submitting) return "Sellando...";
    if (uploadState && !uploadState.error) return "Termina primero la subida";
    if (!contentBlocks.length) return "Anade una pieza real";
    if (!sharedChannel.localReady) {
      return requiredParticipants > 1
        ? "Marca primero que ya esta todo a punto"
        : "Marca primero que ya esta todo a punto";
    }
    if (!enoughParticipantsPresent) return `Esperando a ${companionReference}`;
    if (readyParticipantsCount < requiredParticipants) {
      return `Falta que ${companionReference} se prepare`;
    }
    if (holdProgress >= 1 && leaderUserId !== currentUser?.id) return "Confirmando el sellado...";
    if (holdProgress > 0) {
      return requiredParticipants > 1
        ? "Seguid manteniendo la capsula"
        : "Sigue manteniendo la capsula";
    }
    return requiredParticipants > 1 ? "Mantened ambas la capsula" : "Mantener para sellar";
  }

  function openCanvasEditor(blockId: string) {
    const block = draft.blocks.find((item) => item.id === blockId);
    if (!block) return;
    setEditingTarget({
      blockId,
      field: "canvas_scene",
      key: `block:${blockId}:canvas:stage`,
      label: `${getTimeCapsuleContentBlockDefinition(block.kind).label} · Canvas`,
    });
    setEditingCanvasBlockId(blockId);
  }

  function saveCanvasEditor() {
    if (!editingCanvasBlockId) return;
    clearEditingTarget(`block:${editingCanvasBlockId}:canvas:stage`);
    clearEditingTarget(`block:${editingCanvasBlockId}:canvas:note`);
    setCanvasPointer(null);
    setEditingCanvasBlockId(null);
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[28px] border bg-[linear-gradient(180deg,#fffdf8_0%,#f7f5ff_100%)] p-6 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">
                {config.heroEyebrow}
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Capsula anual</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Una sola capsula para {currentYear}.</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                {requiredParticipants > 1 ? (
                  <span
                    className={`rounded-full px-2.5 py-1 ${
                      sharedChannel.connected ? "bg-[#ebf7e8] text-[#2f6b3b]" : "bg-[#f4efe7] text-slate-500"
                    }`}
                  >
                    {sharedChannel.connected ? "En directo" : "Reconectando"}
                  </span>
                ) : null}
                {uploadActivityLabel ? (
                  <span className="rounded-full bg-[#fff2e8] px-2.5 py-1 text-[#93452f]">
                    {uploadActivityLabel}
                    {uploadState && !uploadState.error ? ` ${Math.round(uploadState.percent)}%` : ""}
                  </span>
                ) : null}
                {!draftHydrated
                  ? "Recuperando borrador..."
                  : draftSyncState === "saving"
                    ? "Guardando borrador..."
                    : draftSyncState === "saved"
                      ? "Borrador sincronizado"
                      : draftSyncState === "error"
                        ? "Borrador sin sincronizar"
                        : "Borrador local"}
              </div>
            </div>
            <button type="button" className="lv-btn lv-btn-secondary" onClick={() => void handleClose()}>
              Cerrar
            </button>
          </div>

          {localError ? (
            <div className="mt-4">
              <StatusNotice message={localError} tone="error" />
            </div>
          ) : null}
          {!localError && remoteNotice ? (
            <div className="mt-4">
              <StatusNotice message={remoteNotice} />
            </div>
          ) : null}
          {hasDeferredServerDraft ? (
            <div className="mt-4 rounded-[20px] border border-[#e6d9c7] bg-[#fffaf2] px-4 py-3 text-sm text-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>Hay cambios guardados del otro lado que todavia no has absorbido en esta vista.</div>
                <button
                  type="button"
                  className="rounded-full border border-[#ccb89a] bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                  onClick={() => void refreshPersistedDraft("replace")}
                >
                  Traer cambios guardados
                </button>
              </div>
            </div>
          ) : null}

          <div
            className={`${sealStageOpen ? "hidden " : ""}mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]`}
          >
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Titulo</label>
                  {renderTargetEditors("title")}
                  <input
                    className={`mt-1 w-full rounded-2xl border p-3 ${
                      editorsForTarget("title").length ? "border-[#d6a683] bg-[#fffaf4]" : ""
                    }`}
                    placeholder={`Capsula anual ${currentYear}`}
                    value={draft.title}
                    onBlur={() => clearEditingTarget("title")}
                    onChange={(event) =>
                      applyLocalDraft((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    onFocus={(event) =>
                      updateCursorFromEvent(
                        { blockId: null, field: "title", key: "title", label: "Titulo" },
                        event,
                      )
                    }
                    onKeyUp={(event) =>
                      updateCursorFromEvent(
                        { blockId: null, field: "title", key: "title", label: "Titulo" },
                        event,
                      )
                    }
                    onMouseUp={(event) =>
                      updateCursorFromEvent(
                        { blockId: null, field: "title", key: "title", label: "Titulo" },
                        event,
                      )
                    }
                    onSelect={(event) =>
                      updateCursorFromEvent(
                        { blockId: null, field: "title", key: "title", label: "Titulo" },
                        event,
                      )
                    }
                  />
                  {renderSharedEditingNotice("title", "el titulo")}
                </div>
                <div>
                  <label className="text-sm font-medium">Cuando se abre</label>
                  {renderTargetEditors("window")}
                  <select
                    className={`mt-1 w-full rounded-2xl border p-3 ${
                      editorsForTarget("window").length ? "border-[#d6a683] bg-[#fffaf4]" : ""
                    }`}
                    value={draft.windowCode}
                    onBlur={() => clearEditingTarget("window")}
                    onChange={(event) =>
                      applyLocalDraft((current) => ({
                        ...current,
                        windowCode: event.target.value as TimeCapsuleWindow,
                      }))
                    }
                    onFocus={() =>
                      setEditingTarget({
                        blockId: null,
                        field: "window",
                        key: "window",
                        label: "Apertura",
                      })
                    }
                  >
                    {TIME_CAPSULE_WINDOWS.map((window) => (
                      <option key={window.code} value={window.code}>
                        {window.label}
                      </option>
                    ))}
                  </select>
                  {renderSharedEditingNotice("window", "la apertura")}
                </div>
              </div>

              <section className="rounded-[24px] border border-[#e5dccf] bg-white/80 p-4">
                <div className="mt-3 flex flex-wrap gap-2">
                  {PRIMARY_BLOCK_KINDS.map((kind) => {
                    const definition = getTimeCapsuleContentBlockDefinition(kind);
                    return (
                      <button
                        key={kind}
                        type="button"
                        className="rounded-full border border-[#d7d2ca] bg-[#fffaf0] px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-[#c2b39b]"
                        onClick={() =>
                          applyLocalDraft((current) => ({
                            ...current,
                            blocks: [...current.blocks, createDraftBlock(kind)],
                          }))
                        }
                      >
                        + {definition.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              <div className="space-y-4">
                {draft.blocks.map((block, index) => {
                  const definition = getTimeCapsuleContentBlockDefinition(block.kind);
                  const isMedia = isTimeCapsuleMediaBlockKind(block.kind);
                  const isCanvas = block.kind === "canvas_note";
                  const isUploadingThisBlock = uploadState?.blockId === block.id;
                  const valueTargetKey = `block:${block.id}:value`;
                  const captionTargetKey = `block:${block.id}:caption`;
                  const mediaTargetKey = `block:${block.id}:media`;
                  const canvasNoteTargetKey = `block:${block.id}:canvas:note`;
                  const canvasStageTargetKey = `block:${block.id}:canvas:stage`;
                  const blockIsEditedRemotely =
                    editorsForTarget(valueTargetKey).length > 0 ||
                    editorsForTarget(captionTargetKey).length > 0 ||
                    editorsForTarget(mediaTargetKey).length > 0 ||
                    editorsForTarget(canvasNoteTargetKey).length > 0 ||
                    editorsForTarget(canvasStageTargetKey).length > 0;
                  return (
                    <section
                      key={block.id}
                      className={`rounded-[24px] border bg-[#fbfcfa] p-4 shadow-sm ${
                        blockIsEditedRemotely ? "border-[#d6a683]" : "border-[#e5dccf]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          {definition.label}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-[#eadfca] bg-[#fffaf0] px-2.5 py-1 text-[11px] font-medium text-slate-500">
                            {index + 1}
                          </span>
                          <button
                            type="button"
                            className="rounded-full border border-[#eadfca] px-2.5 py-1 text-xs text-slate-500 disabled:opacity-30"
                            onClick={() => moveBlock(block.id, "up")}
                            disabled={index === 0}
                          >
                            Subir
                          </button>
                          <button
                            type="button"
                            className="rounded-full border border-[#eadfca] px-2.5 py-1 text-xs text-slate-500 disabled:opacity-30"
                            onClick={() => moveBlock(block.id, "down")}
                            disabled={index === draft.blocks.length - 1}
                          >
                            Bajar
                          </button>
                          {draft.blocks.length > 1 ? (
                            <button
                              type="button"
                              className="rounded-full border border-[#eadfca] px-3 py-1 text-xs text-slate-500 hover:text-red-600"
                              onClick={() =>
                                applyLocalDraft((current) => ({
                                  ...current,
                                  blocks: current.blocks.filter((item) => item.id !== block.id),
                                }))
                              }
                            >
                              Quitar
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {blockIsEditedRemotely ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {[
                            ...editorsForTarget(valueTargetKey),
                            ...editorsForTarget(captionTargetKey),
                            ...editorsForTarget(mediaTargetKey),
                            ...editorsForTarget(canvasNoteTargetKey),
                            ...editorsForTarget(canvasStageTargetKey),
                          ].map((participant) => (
                            <span
                              key={`${block.id}:${participant.userId}:${participant.focusKey ?? "focus"}`}
                              className="rounded-full border border-[#ead4c0] bg-[#fff7ef] px-2 py-0.5 text-[11px] text-[#8a5a3d]"
                            >
                              {participant.name} en {participant.focusLabel?.toLowerCase() ?? "este bloque"}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {isMedia ? (
                        <div className="mt-4 space-y-4">
                          <div className="rounded-2xl border border-dashed border-[#d9cfbc] bg-white/80 p-4">
                            <div className="flex flex-wrap items-center gap-3">
                              <label className="lv-btn lv-btn-secondary cursor-pointer">
                                {mediaCtaForKind(block.kind)}
                                <input
                                  type="file"
                                  accept={mediaAcceptForKind(block.kind)}
                                  className="hidden"
                                  onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (file) {
                                      void handleMediaUpload(block.id, block.kind, file);
                                    }
                                    event.currentTarget.value = "";
                                  }}
                                />
                              </label>
                              <div className="text-xs text-slate-500">
                                {block.mediaUrl ? mediaPreviewLabel(block.kind) : "Todavia no hay archivo subido"}
                              </div>
                            </div>

                            {isUploadingThisBlock ? (
                              <div className="mt-4 space-y-2">
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                  <span>{uploadState?.fileName}</span>
                                  <span>{Math.round(uploadState?.percent ?? 0)}%</span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-[#efe7db]">
                                  <div
                                    className="h-full rounded-full bg-[#7c9a66] transition-all"
                                    style={{ width: `${Math.max(4, uploadState?.percent ?? 0)}%` }}
                                  />
                                </div>
                                <div className="text-xs text-slate-500">
                                  {uploadState?.phase === "processing"
                                    ? "Procesando archivo..."
                                    : "Subiendo archivo..."}
                                </div>
                              </div>
                            ) : null}

                            {isUploadingThisBlock && uploadState?.error ? (
                              <div className="mt-3">
                                <StatusNotice message={uploadState.error} tone="error" />
                              </div>
                            ) : null}

                            {block.mediaUrl ? (
                              <div className="mt-4 rounded-2xl border border-[#eadfca] bg-[#fffaf4] p-3">
                                {block.kind === "photo_url" ? (
                                  <img
                                    src={block.mediaUrl}
                                    alt={block.caption || definition.label}
                                    className="max-h-56 w-full rounded-2xl object-cover"
                                  />
                                ) : block.kind === "audio_url" ? (
                                  <audio controls src={block.mediaUrl} className="w-full" />
                                ) : (
                                  <video controls src={block.mediaUrl} className="max-h-56 w-full rounded-2xl" />
                                )}
                              </div>
                            ) : null}
                          </div>

                          <div>
                            <label className="text-sm font-medium">URL manual</label>
                            {renderTargetEditors(mediaTargetKey)}
                            <input
                              className={`mt-1 w-full rounded-2xl border p-3 ${
                                editorsForTarget(mediaTargetKey).length ? "border-[#d6a683] bg-[#fffaf4]" : ""
                              }`}
                              placeholder={definition.placeholder}
                              value={block.mediaUrl ?? ""}
                              onBlur={() => clearEditingTarget(mediaTargetKey)}
                              onChange={(event) => {
                                const nextUrl = event.target.value;
                                updateBlock(block.id, (current) => ({
                                  ...current,
                                  mediaUrl: nextUrl,
                                  value: nextUrl,
                                }));
                              }}
                              onFocus={(event) =>
                                updateCursorFromEvent(
                                  {
                                    blockId: block.id,
                                    field: "media",
                                    key: mediaTargetKey,
                                    label: `${definition.label} · URL`,
                                  },
                                  event,
                                )
                              }
                              onKeyUp={(event) =>
                                updateCursorFromEvent(
                                  {
                                    blockId: block.id,
                                    field: "media",
                                    key: mediaTargetKey,
                                    label: `${definition.label} · URL`,
                                  },
                                  event,
                                )
                              }
                              onMouseUp={(event) =>
                                updateCursorFromEvent(
                                  {
                                    blockId: block.id,
                                    field: "media",
                                    key: mediaTargetKey,
                                    label: `${definition.label} · URL`,
                                  },
                                  event,
                                )
                              }
                              onSelect={(event) =>
                                updateCursorFromEvent(
                                  {
                                    blockId: block.id,
                                    field: "media",
                                    key: mediaTargetKey,
                                    label: `${definition.label} · URL`,
                                  },
                                  event,
                                )
                              }
                            />
                            {renderSharedEditingNotice(mediaTargetKey, `la URL de ${definition.label.toLowerCase()}`)}
                          </div>

                          <div>
                            <label className="text-sm font-medium">Nota o pie</label>
                            {renderTargetEditors(captionTargetKey)}
                            <textarea
                              className={`mt-1 w-full resize-none rounded-2xl border p-3 text-sm ${
                                editorsForTarget(captionTargetKey).length ? "border-[#d6a683] bg-[#fffaf4]" : ""
                              }`}
                              rows={3}
                              placeholder="Que querreis recordar cuando vuelva a aparecer..."
                              value={block.caption}
                              onBlur={() => clearEditingTarget(captionTargetKey)}
                              onChange={(event) => {
                                const nextCaption = event.target.value;
                                updateBlock(block.id, (current) => ({
                                  ...current,
                                  caption: nextCaption,
                                }));
                              }}
                              onFocus={(event) =>
                                updateCursorFromEvent(
                                  {
                                    blockId: block.id,
                                    field: "caption",
                                    key: captionTargetKey,
                                    label: `${definition.label} · Nota`,
                                  },
                                  event,
                                )
                              }
                              onKeyUp={(event) =>
                                updateCursorFromEvent(
                                  {
                                    blockId: block.id,
                                    field: "caption",
                                    key: captionTargetKey,
                                    label: `${definition.label} · Nota`,
                                  },
                                  event,
                                )
                              }
                              onMouseUp={(event) =>
                                updateCursorFromEvent(
                                  {
                                    blockId: block.id,
                                    field: "caption",
                                    key: captionTargetKey,
                                    label: `${definition.label} · Nota`,
                                  },
                                  event,
                                )
                              }
                              onSelect={(event) =>
                                updateCursorFromEvent(
                                  {
                                    blockId: block.id,
                                    field: "caption",
                                    key: captionTargetKey,
                                    label: `${definition.label} · Nota`,
                                  },
                                  event,
                                )
                              }
                            />
                            {renderSharedEditingNotice(captionTargetKey, `la nota de ${definition.label.toLowerCase()}`)}
                          </div>
                        </div>
                      ) : isCanvas ? (
                        <div className="mt-4 space-y-4">
                          <div className="rounded-2xl border border-[#e3d8ea] bg-white/80 p-4">
                            <div className="flex flex-wrap items-center gap-3">
                              <button
                                type="button"
                                className="lv-btn lv-btn-secondary"
                                onClick={() => openCanvasEditor(block.id)}
                              >
                                {block.canvasObjects.length ? "Editar canvas" : "Abrir canvas"}
                              </button>
                              <div className="text-xs text-slate-500">
                                {block.canvasObjects.length
                                  ? `${block.canvasObjects.length} pieza(s) guardadas en esta escena`
                                  : "Usa el canvas para montar una escena simbolica con texto, stickers y plantillas."}
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium">Que representa este canvas</label>
                            {renderTargetEditors(canvasNoteTargetKey)}
                            <textarea
                              className={`mt-1 w-full resize-none rounded-2xl border p-3 text-sm ${
                                editorsForTarget(canvasNoteTargetKey).length ? "border-[#d6a683] bg-[#fffaf4]" : ""
                              }`}
                              rows={3}
                              placeholder={definition.placeholder}
                              value={block.value}
                              onBlur={() => clearEditingTarget(canvasNoteTargetKey)}
                              onChange={(event) => {
                                const nextValue = event.target.value;
                                updateBlock(block.id, (current) => ({
                                  ...current,
                                  value: nextValue,
                                }));
                              }}
                              onFocus={(event) =>
                                updateCursorFromEvent(
                                  {
                                    blockId: block.id,
                                    field: "canvas_note",
                                    key: canvasNoteTargetKey,
                                    label: `${definition.label} · Nota`,
                                  },
                                  event,
                                )
                              }
                              onKeyUp={(event) =>
                                updateCursorFromEvent(
                                  {
                                    blockId: block.id,
                                    field: "canvas_note",
                                    key: canvasNoteTargetKey,
                                    label: `${definition.label} · Nota`,
                                  },
                                  event,
                                )
                              }
                              onMouseUp={(event) =>
                                updateCursorFromEvent(
                                  {
                                    blockId: block.id,
                                    field: "canvas_note",
                                    key: canvasNoteTargetKey,
                                    label: `${definition.label} · Nota`,
                                  },
                                  event,
                                )
                              }
                              onSelect={(event) =>
                                updateCursorFromEvent(
                                  {
                                    blockId: block.id,
                                    field: "canvas_note",
                                    key: canvasNoteTargetKey,
                                    label: `${definition.label} · Nota`,
                                  },
                                  event,
                                )
                              }
                            />
                            {renderSharedEditingNotice(canvasNoteTargetKey, "la nota del canvas")}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4">
                          {renderTargetEditors(valueTargetKey)}
                          <textarea
                            className={`w-full resize-none rounded-2xl border p-3 text-sm ${
                              editorsForTarget(valueTargetKey).length ? "border-[#d6a683] bg-[#fffaf4]" : ""
                            }`}
                            rows={4}
                            placeholder={definition.placeholder}
                            value={block.value}
                            onBlur={() => clearEditingTarget(valueTargetKey)}
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              updateBlock(block.id, (current) => ({
                                ...current,
                                value: nextValue,
                              }));
                            }}
                            onFocus={(event) =>
                              updateCursorFromEvent(
                                {
                                  blockId: block.id,
                                  field: "value",
                                  key: valueTargetKey,
                                  label: definition.label,
                                },
                                event,
                              )
                            }
                            onKeyUp={(event) =>
                              updateCursorFromEvent(
                                {
                                  blockId: block.id,
                                  field: "value",
                                  key: valueTargetKey,
                                  label: definition.label,
                                },
                                event,
                              )
                            }
                            onMouseUp={(event) =>
                              updateCursorFromEvent(
                                {
                                  blockId: block.id,
                                  field: "value",
                                  key: valueTargetKey,
                                  label: definition.label,
                                },
                                event,
                              )
                            }
                            onSelect={(event) =>
                              updateCursorFromEvent(
                                {
                                  blockId: block.id,
                                  field: "value",
                                  key: valueTargetKey,
                                  label: definition.label,
                                },
                                event,
                              )
                            }
                          />
                          {renderSharedEditingNotice(valueTargetKey, definition.label.toLowerCase())}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            </div>

            <aside className="space-y-4">
              <section className="overflow-hidden rounded-[28px] border border-[#d9cfbf] bg-[linear-gradient(180deg,#fff8ea_0%,#f3ecff_100%)] p-5 shadow-[0_18px_45px_rgba(73,50,24,0.12)]">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Capsula</div>
                <div className="mt-4 rounded-[30px] border border-[#ccb89a] bg-[radial-gradient(circle_at_top,#fff9ee_0%,#f7efe1_45%,#ebdfcd_100%)] p-5 shadow-inner">
                  <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full border border-[#c7b091] bg-[radial-gradient(circle,#fef9f0_0%,#eddcc7_70%,#dac2a5_100%)] shadow-[0_12px_30px_rgba(77,57,31,0.18)]">
                    <div
                      className={`lv-capsule-seal flex h-20 w-20 items-center justify-center rounded-full border border-[#9a5b49] text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[#fff5ec] shadow-[0_8px_20px_rgba(94,38,28,0.28)] ${
                        sealCanBeArmed ? "lv-capsule-seal-armed" : ""
                      }`}
                    >
                      Sello
                    </div>
                  </div>
                  <div className="mt-5 text-center">
                    <div className="text-lg font-semibold text-slate-900">
                      {draft.title.trim() || `Capsula anual ${currentYear}`}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      Se abrira en {windowLabel.toLowerCase()}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-[#eadfca] bg-white/80 p-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Completas</div>
                    <div className="mt-1 text-2xl font-semibold text-slate-900">{readyPiecesCount}</div>
                  </div>
                  <div className="rounded-2xl border border-[#eadfca] bg-white/80 p-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Pendientes</div>
                    <div className="mt-1 text-2xl font-semibold text-slate-900">{pendingPiecesCount}</div>
                  </div>
                </div>

                <div className="mt-4 rounded-[22px] border border-[#e7dccd] bg-white/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Preparadas para sellar
                    </div>
                    <button
                      type="button"
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        sharedChannel.localReady
                          ? "bg-[#2f6b3b] text-white"
                          : "border border-[#ccb89a] bg-[#fff7eb] text-slate-700"
                      }`}
                      onClick={toggleLocalReady}
                    >
                      {sharedChannel.localReady ? "A punto" : "Marcar a punto"}
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {ritualParticipants.map((participant) => (
                      <div
                        key={participant.userId}
                        className="flex items-center justify-between rounded-2xl border border-[#eee4d6] bg-[#fffaf2] px-3 py-2"
                      >
                        <div className="text-sm text-slate-700">{participant.name}</div>
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                          <span
                            className={`rounded-full px-2 py-1 ${
                              participant.ready ? "bg-[#ebf7e8] text-[#2f6b3b]" : "bg-[#f4efe7]"
                            }`}
                          >
                            {participant.ready ? "a punto" : "editando"}
                          </span>
                          <span
                            className={`rounded-full px-2 py-1 ${
                              participant.holding ? "bg-[#fce7d9] text-[#93452f]" : "bg-[#f4efe7]"
                            }`}
                          >
                            {participant.holding ? "sellando" : "en espera"}
                          </span>
                          {participant.focusLabel ? (
                            <span className="rounded-full bg-[#f6efe6] px-2 py-1 text-[#8a5a3d] normal-case tracking-normal">
                              {participant.focusLabel}
                            </span>
                          ) : null}
                          {participant.activityLabel ? (
                            <span className="rounded-full bg-[#fff2e8] px-2 py-1 text-[#93452f] normal-case tracking-normal">
                              {participant.activityLabel}
                              {typeof participant.activityProgress === "number"
                                ? ` ${participant.activityProgress}%`
                                : ""}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl border border-[#e7dccd] bg-[#fff9f1] px-3 py-3 text-sm leading-6 text-slate-600">
                    {requiredParticipants > 1
                      ? "Cuando las dos esteis a punto, la capsula os llevara sola al sellado compartido."
                      : "Cuando la marques a punto, entraras en el sellado."}
                  </div>
                </div>
              </section>
              <section className="rounded-[24px] border border-[#e5dccf] bg-white/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Actividad reciente
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                    {!revisionsEnabled
                      ? "requiere sql"
                      : revisions.length
                        ? `${revisions.length} revision(es)`
                        : "sin actividad"}
                  </div>
                </div>
                {!revisionsEnabled ? (
                  <div className="mt-3 rounded-[20px] border border-dashed border-[#e6d9c7] bg-[#fffaf2] px-3 py-3 text-sm leading-6 text-slate-600">
                    La actividad reciente necesita la migracion <code>2026-03-25_time_capsule_draft_revisions.sql</code>.
                  </div>
                ) : revisions.length ? (
                  <div className="mt-3 space-y-2.5">
                    {revisions.map((revision) => {
                      const summary = describeRevisionSummary(revision, currentUser?.id ?? null);
                      return (
                        <div
                          key={revision.id}
                          className="rounded-[20px] border border-[#eee4d6] bg-[#fffaf2] px-3 py-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 text-sm font-medium text-slate-900">
                              {summary.actorLabel}
                            </div>
                            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                              {formatRevisionTimestamp(revision.created_at)}
                            </div>
                          </div>
                          <div className="mt-1 text-sm leading-6 text-slate-600">{summary.text}</div>
                          {revision.summary.added.length || revision.summary.removed.length || revision.summary.changed.length || revision.summary.titleChanged || revision.summary.windowChanged ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {revision.summary.titleChanged ? (
                                <span className="rounded-full bg-[#f4efe7] px-2 py-0.5 text-[11px] text-slate-600">
                                  titulo
                                </span>
                              ) : null}
                              {revision.summary.windowChanged ? (
                                <span className="rounded-full bg-[#f4efe7] px-2 py-0.5 text-[11px] text-slate-600">
                                  apertura
                                </span>
                              ) : null}
                              {revision.summary.added.map((item) => (
                                <span
                                  key={`${revision.id}:add:${item.id}`}
                                  className="rounded-full bg-[#ebf7e8] px-2 py-0.5 text-[11px] text-[#2f6b3b]"
                                >
                                  + {item.label.toLowerCase()}
                                </span>
                              ))}
                              {revision.summary.removed.map((item) => (
                                <span
                                  key={`${revision.id}:remove:${item.id}`}
                                  className="rounded-full bg-[#fce8e2] px-2 py-0.5 text-[11px] text-[#93452f]"
                                >
                                  - {item.label.toLowerCase()}
                                </span>
                              ))}
                              {revision.summary.changed.map((item) => (
                                <span
                                  key={`${revision.id}:change:${item.id}`}
                                  className="rounded-full bg-[#f4efe7] px-2 py-0.5 text-[11px] text-slate-600"
                                >
                                  {item.label.toLowerCase()}: {item.fields.map((field) => describeRevisionField(field)).join(", ")}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-3 rounded-[20px] border border-dashed border-[#e6d9c7] bg-[#fffaf2] px-3 py-3 text-sm leading-6 text-slate-600">
                    En cuanto una de las dos haga una pausa y el borrador se guarde, aqui vereis el rastro de lo que se ha tocado.
                  </div>
                )}
              </section>

              <section className="rounded-[24px] border border-[#e5dccf] bg-white/80 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Orden de apertura</div>
                <div className="mt-3 space-y-2">
                  {pieceSummaries.map((piece) => (
                    <div
                      key={piece.id}
                      className="flex items-center justify-between rounded-2xl border border-[#eee4d6] bg-[#fffaf2] px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#d7c7ae] bg-white text-[11px] font-semibold text-slate-500">
                          {piece.order}
                        </span>
                        <span className="text-sm text-slate-700">{piece.label}</span>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          piece.ready
                            ? "bg-[#ebf7e8] text-[#2f6b3b]"
                            : "bg-[#f4efe7] text-slate-500"
                        }`}
                      >
                        {piece.ready ? "Completa" : "Pendiente"}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="hidden rounded-[24px] border border-[#e5dccf] bg-[#f7f2ff] p-4 text-sm leading-6 text-slate-700">
                <div className="font-medium text-slate-900">Ritual de sellado</div>
                <p className="mt-2">Solo una capsula por jardin y por año. Mejor una ceremonia especial que varias pequeñas sin peso.</p>
              </section>
            </aside>
          </div>

          {sealStageOpen ? (
            <section className="mt-5 flex min-h-[70vh] flex-col overflow-hidden rounded-[34px] border border-[#d4c0a4] bg-[linear-gradient(180deg,#fff8ea_0%,#f6efe3_44%,#f2ecff_100%)] shadow-[0_28px_65px_rgba(79,50,20,0.16)]">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/50 px-6 py-6">
                <div className="max-w-2xl">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-500">
                    Sellado compartido
                  </div>
                  <h3 className="mt-2 text-3xl font-semibold text-slate-900">{draftTitle}</h3>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                    <span className="rounded-full border border-[#eadfca] bg-white/75 px-3 py-1">
                      {readyPiecesCount} piezas completas
                    </span>
                    <span className="rounded-full border border-[#eadfca] bg-white/75 px-3 py-1">
                      Apertura en {windowLabel.toLowerCase()}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="lv-btn lv-btn-secondary"
                  onClick={returnToDraftStage}
                  disabled={submitting}
                >
                  Volver al borrador
                </button>
              </div>

              <div className="flex flex-1 flex-col justify-between gap-8 px-6 py-6">
                <div className="grid gap-3 md:grid-cols-2">
                  {ritualParticipants.map((participant) => (
                    <div
                      key={participant.userId}
                      className="rounded-[24px] border border-[#e5d7c4] bg-white/72 p-4 backdrop-blur"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900">
                            {participant.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {participant.userId === currentUser?.id ? "Tu lado" : "Lado compartido"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                          <span
                            className={`rounded-full px-2.5 py-1 ${
                              participant.ready ? "bg-[#ebf7e8] text-[#2f6b3b]" : "bg-[#f4efe7]"
                            }`}
                          >
                            {participant.ready ? "a punto" : "editando"}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 ${
                              participant.holding ? "bg-[#fce7d9] text-[#93452f]" : "bg-[#f4efe7]"
                            }`}
                          >
                            {participant.holding ? "sellando" : "esperando"}
                          </span>
                          {participant.focusLabel ? (
                            <span className="rounded-full bg-[#f6efe6] px-2.5 py-1 text-[#8a5a3d] normal-case tracking-normal">
                              {participant.focusLabel}
                            </span>
                          ) : null}
                          {participant.activityLabel ? (
                            <span className="rounded-full bg-[#fff2e8] px-2.5 py-1 text-[#93452f] normal-case tracking-normal">
                              {participant.activityLabel}
                              {typeof participant.activityProgress === "number"
                                ? ` ${participant.activityProgress}%`
                                : ""}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-end">
                  <div className="rounded-[30px] border border-[#dcc6ab] bg-white/46 px-4 py-6 shadow-inner md:px-8 md:py-8">
                    <div className="text-center text-sm font-medium text-slate-700">
                      {sealStageStatus}
                    </div>
                    <div className="mt-2 text-center text-[11px] uppercase tracking-[0.22em] text-slate-500">
                      {requiredParticipants > 1
                        ? "Las dos teneis que mantener la capsula a la vez"
                        : "Manten la capsula unos segundos"}
                    </div>

                    <div className="relative mx-auto mt-8 flex min-h-[430px] w-full max-w-[560px] items-end justify-center pb-4">
                      <div className="absolute bottom-4 h-14 w-[78%] rounded-full bg-[#b18a61]/24 blur-3xl" />
                      <div
                        className={`lv-capsule-ritual-orbit absolute bottom-20 left-1/2 h-[280px] w-[280px] -translate-x-1/2 rounded-full border border-white/40 ${
                          holdCanProgress ? "opacity-100" : "opacity-60"
                        }`}
                      />
                      <div
                        className={`lv-capsule-ritual-orbit absolute bottom-12 left-1/2 h-[360px] w-[360px] -translate-x-1/2 rounded-full border border-[#d7bea0]/55 ${
                          sealCanBeArmed ? "opacity-100" : "opacity-60"
                        }`}
                      />

                      <button
                        type="button"
                        className={`lv-capsule-ritual-shell relative z-10 flex h-[360px] w-[260px] flex-col items-center justify-end overflow-hidden rounded-[46%_46%_38%_38%/28%_28%_60%_60%] border border-[#b48e69] bg-[linear-gradient(180deg,#fef8ef_0%,#f2dfc5_54%,#dfbd97_100%)] px-8 pb-9 pt-10 shadow-[0_28px_60px_rgba(89,55,23,0.22)] transition disabled:cursor-not-allowed disabled:opacity-65 ${
                          sealCanBeArmed ? "lv-capsule-ritual-shell-armed" : ""
                        } ${holdCanProgress ? "lv-capsule-ritual-shell-holding" : ""}`}
                        disabled={!sealCanBeArmed || submitting}
                        onPointerDown={handleHoldStart}
                        onPointerUp={handleHoldEnd}
                        onPointerLeave={handleHoldEnd}
                        onPointerCancel={handleHoldEnd}
                        onTouchStart={handleHoldStart}
                        onTouchEnd={handleHoldEnd}
                        onTouchCancel={handleHoldEnd}
                        onDragStart={(event) => event.preventDefault()}
                        style={{
                          userSelect: "none",
                          WebkitUserSelect: "none",
                          WebkitTouchCallout: "none",
                        }}
                      >
                        <span className="sr-only">{holdLabel()}</span>
                        <span className="absolute inset-[7%] rounded-[42%_42%_36%_36%/28%_28%_58%_58%] border border-white/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.68)_0%,rgba(255,255,255,0.08)_38%,rgba(94,48,28,0.06)_100%)]" />
                        <span className="absolute inset-x-[15%] bottom-[10%] overflow-hidden rounded-[40%_40%_32%_32%/26%_26%_54%_54%]">
                          <span
                            className="lv-capsule-ritual-fill absolute inset-x-0 bottom-0"
                            style={{ height: `${Math.max(holdProgress > 0 ? 10 : 0, holdProgress * 100)}%` }}
                          />
                          <span className="lv-capsule-ritual-fill-glow absolute inset-x-0 bottom-0 h-8" />
                        </span>
                        <span
                          className={`lv-capsule-ritual-halo absolute inset-[2%] rounded-[46%_46%_38%_38%/28%_28%_60%_60%] ${
                            holdCanProgress ? "opacity-100" : "opacity-60"
                          }`}
                        />
                        <span className="absolute left-1/2 top-[16%] flex h-24 w-24 -translate-x-1/2 items-center justify-center rounded-full border border-[#b87962] bg-[radial-gradient(circle,#d98668_0%,#b56249_66%,#914431_100%)] text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-[#fff4eb] shadow-[0_12px_28px_rgba(98,43,30,0.34)]">
                          {holdProgress > 0 ? `${holdProgressPercent}%` : "Sello"}
                        </span>
                        <span className="relative z-10 flex select-none flex-col items-center text-center">
                          <span className="rounded-full border border-white/55 bg-white/55 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-600 backdrop-blur">
                            {holdLabel()}
                          </span>
                          <span className="mt-24 text-xl font-semibold text-slate-900">
                            {draftTitle}
                          </span>
                          <span className="mt-2 text-sm text-slate-600">
                            Se abrira en {windowLabel.toLowerCase()}
                          </span>
                        </span>
                      </button>
                    </div>

                    <div className="mx-auto max-w-xl">
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        <span>Sellado compartido</span>
                        <span>{holdProgressPercent}%</span>
                      </div>
                      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#e9ddcf]">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#cd8d70_0%,#a35d46_100%)] transition-all"
                          style={{ width: `${Math.max(holdProgress > 0 ? 8 : 0, holdProgress * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <div className={`${sealStageOpen ? "hidden " : ""}mt-6 flex justify-end gap-2`}>
            <button type="button" className="lv-btn lv-btn-secondary" onClick={() => void handleClose()}>
              Cancelar
            </button>
          </div>
        </div>
      </div>

      {editingCanvasBlock ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[28px] border bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="max-w-2xl">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Canvas simbolico</div>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">Escena para sellar dentro de la capsula</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Aqui reutilizamos el canvas del jardin como un espacio intimo: texto, stickers y plantillas para guardar una escena simbolica sin ensuciar la home.
                </p>
              </div>
              <button
                type="button"
                className="lv-btn lv-btn-secondary"
                onClick={() => {
                  if (editingCanvasBlockId) {
                    clearEditingTarget(`block:${editingCanvasBlockId}:canvas:stage`);
                    clearEditingTarget(`block:${editingCanvasBlockId}:canvas:note`);
                  }
                  setCanvasPointer(null);
                  setEditingCanvasBlockId(null);
                }}
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-[#eadfca] bg-[#fffaf0] p-4 text-sm leading-6 text-slate-700">
              Consejo: usad este canvas para simbolos, textos, stickers y composiciones. Las fotos, audios y videos viven mejor como piezas propias de la capsula.
            </div>

            <div className="mt-5">
              <CanvasEditor
                value={editingCanvasBlock.canvasObjects}
                onChange={(nextObjects) =>
                  updateBlock(editingCanvasBlock.id, (current) => ({
                    ...current,
                    canvasObjects: nextObjects,
                  }))
                }
                showVideoUploadPanel={false}
                showPhotoTool={false}
                onPointerStateChange={handleCanvasPointerChange}
                remotePointers={remoteCanvasPointers}
              />
              {canvasStageTargetKey ? renderSharedEditingNotice(canvasStageTargetKey, "el canvas") : null}
            </div>

            <div className="mt-5">
              <label className="text-sm font-medium">Que significa esta escena</label>
              {canvasNoteTargetKey ? renderTargetEditors(canvasNoteTargetKey) : null}
              <textarea
                className={`mt-1 w-full resize-none rounded-2xl border p-3 text-sm ${
                  canvasNoteTargetKey && editorsForTarget(canvasNoteTargetKey).length
                    ? "border-[#d6a683] bg-[#fffaf4]"
                    : ""
                }`}
                rows={3}
                placeholder="Una frase o nota que ayude a entender este canvas cuando vuelva a aparecer."
                value={editingCanvasBlock.value}
                onBlur={() => {
                  if (canvasNoteTargetKey) clearEditingTarget(canvasNoteTargetKey);
                }}
                onChange={(event) =>
                  updateBlock(editingCanvasBlock.id, (current) => ({
                    ...current,
                    value: event.target.value,
                  }))
                }
                onFocus={(event) =>
                  canvasNoteTargetKey
                    ? updateCursorFromEvent(
                        {
                          blockId: editingCanvasBlock.id,
                          field: "canvas_note",
                          key: canvasNoteTargetKey,
                          label: "Canvas · Nota",
                        },
                        event,
                      )
                    : undefined
                }
                onKeyUp={(event) =>
                  canvasNoteTargetKey
                    ? updateCursorFromEvent(
                        {
                          blockId: editingCanvasBlock.id,
                          field: "canvas_note",
                          key: canvasNoteTargetKey,
                          label: "Canvas · Nota",
                        },
                        event,
                      )
                    : undefined
                }
                onMouseUp={(event) =>
                  canvasNoteTargetKey
                    ? updateCursorFromEvent(
                        {
                          blockId: editingCanvasBlock.id,
                          field: "canvas_note",
                          key: canvasNoteTargetKey,
                          label: "Canvas · Nota",
                        },
                        event,
                      )
                    : undefined
                }
                onSelect={(event) =>
                  canvasNoteTargetKey
                    ? updateCursorFromEvent(
                        {
                          blockId: editingCanvasBlock.id,
                          field: "canvas_note",
                          key: canvasNoteTargetKey,
                          label: "Canvas · Nota",
                        },
                        event,
                      )
                    : undefined
                }
              />
              {canvasNoteTargetKey ? renderSharedEditingNotice(canvasNoteTargetKey, "la nota del canvas") : null}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="lv-btn lv-btn-secondary"
                onClick={() => {
                  if (editingCanvasBlockId) {
                    clearEditingTarget(`block:${editingCanvasBlockId}:canvas:stage`);
                    clearEditingTarget(`block:${editingCanvasBlockId}:canvas:note`);
                  }
                  setCanvasPointer(null);
                  setEditingCanvasBlockId(null);
                }}
              >
                Cancelar
              </button>
              <button type="button" className="lv-btn lv-btn-primary" onClick={saveCanvasEditor}>
                Guardar canvas
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
