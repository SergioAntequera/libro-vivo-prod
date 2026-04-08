"use client";

import type Konva from "konva";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  CanvasObject,
  CanvasSticker,
} from "@/lib/canvasTypes";

import { PromptModal } from "@/components/ui/PromptModal";
import { CanvasEditorToolbar } from "@/components/canvas/CanvasEditorToolbar";
import { CanvasEditorObjectNodes } from "@/components/canvas/CanvasEditorObjectNodes";
import { CanvasEditorStage } from "@/components/canvas/CanvasEditorStage";
import {
  useVideoUploadQueue,
} from "@/components/canvas/useVideoUploadQueue";
import { usePhotoUploadTask } from "@/components/canvas/usePhotoUploadTask";
import { useCanvasMediaUploadActions } from "@/components/canvas/useCanvasMediaUploadActions";
import { useCanvasKeyboardShortcuts } from "@/components/canvas/useCanvasKeyboardShortcuts";
import { useCanvasStageInteractions } from "@/components/canvas/useCanvasStageInteractions";
import {
  useCanvasPromptController,
} from "@/components/canvas/useCanvasPromptController";
import { useCanvasUploadStateEmitter } from "@/components/canvas/useCanvasUploadStateEmitter";
import type { CanvasUploadState } from "@/components/canvas/canvasUploadState";
import { useCanvasObjectActions } from "@/components/canvas/useCanvasObjectActions";
import { useCanvasHistoryState } from "@/components/canvas/useCanvasHistoryState";
import {
  isLocked,
  uid,
} from "@/components/canvas/canvasEditorUtils";
import {
  type GuideLine,
  getBoxForObject,
} from "@/components/canvas/canvasDragSnap";
import { useCanvasAssetsLibrary } from "@/components/canvas/useCanvasAssetsLibrary";
import { useCanvasDragTransform } from "@/components/canvas/useCanvasDragTransform";
import {
  deleteManagedMediaForPage,
  describeManagedMediaDeleteError,
} from "@/lib/deleteManagedMedia";

export type CanvasEditorHandle = {
  exportPng: () => string | null;
  addVideoFrame: () => void;
};

export type CanvasPhotoUploadState = CanvasUploadState;
export type CanvasVideoUploadState = CanvasUploadState;

type CanvasEditorProps = {
  pageId?: string;
  activeGardenId?: string | null;
  value: CanvasObject[];
  onChange: (next: CanvasObject[]) => void;
  coverPhotoUrl?: string | null;
  readOnly?: boolean;
  showVideoUploadPanel?: boolean;
  showPhotoTool?: boolean;
  onPhotoUploadStateChange?: (state: CanvasPhotoUploadState | null) => void;
  onVideoUploadStateChange?: (state: CanvasVideoUploadState | null) => void;
  onPointerStateChange?: (pointer: { x: number; y: number } | null) => void;
  remotePointers?: Array<{
    userId: string;
    name: string;
    x: number;
    y: number;
    color: string;
  }>;
};

type SelectedKind = "none" | "sticker" | "text" | "photo" | "video";

type CanvasObjectPatch = Record<string, unknown>;
type LegacySticker = CanvasSticker & { emoji?: unknown };

function getCanvasManagedMediaSrc(object: CanvasObject) {
  if (object.type !== "photo" && object.type !== "video") return null;
  const src = String(object.src ?? "").trim();
  return src || null;
}

const DEFAULT_PROJECT_MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const CANVAS_STAGE_MIN_WIDTH = 960;
const CANVAS_STAGE_MIN_HEIGHT = 460;
const CANVAS_STAGE_GROW_PADDING_X = 180;
const CANVAS_STAGE_GROW_PADDING_Y = 140;
const PROJECT_MAX_VIDEO_BYTES = (() => {
  const raw = process.env.NEXT_PUBLIC_MAX_VIDEO_UPLOAD_BYTES;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_PROJECT_MAX_VIDEO_BYTES;
})();

export const CanvasEditor = forwardRef<
  CanvasEditorHandle,
  CanvasEditorProps
>(function CanvasEditor(props, ref) {
  const {
    pageId,
    activeGardenId,
    value,
    onChange,
    coverPhotoUrl,
    readOnly = false,
    showVideoUploadPanel = true,
    showPhotoTool = true,
    onPhotoUploadStateChange,
    onVideoUploadStateChange,
    onPointerStateChange,
    remotePointers = [],
  } = props;

  const stageRef = useRef<Konva.Stage | null>(null);
  const trRef = useRef<Konva.Transformer | null>(null);
  const photoFileInputRef = useRef<HTMLInputElement | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    availableStickers,
    templatePresets,
    activeLibraryPanel,
    setActiveLibraryPanel,
    stickerQuery,
    setStickerQuery,
    filteredStickerSources,
  } = useCanvasAssetsLibrary({ activeGardenId });
  const [playingVideoIdState, setPlayingVideoId] = useState<string | null>(null);

  // Zoom/Pan
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [spaceDown, setSpaceDown] = useState(false);

  // Snap + guias
  const [showGrid, setShowGrid] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [snapToObjectsEnabled, setSnapToObjectsEnabled] = useState(true);
  const GRID = 20;
  const SNAP_TOL = 8;
  const [guides, setGuides] = useState<GuideLine[]>([]);

  // Seleccion (multi)
  const [selectedIdsState, setSelectedIds] = useState<string[]>([]);

  // Marquee select
  const [marquee, setMarquee] = useState<{
    active: boolean;
    x: number;
    y: number;
    w: number;
    h: number;
  }>({ active: false, x: 0, y: 0, w: 0, h: 0 });

  // Normaliza legacy stickers y repara ids faltantes/duplicados para evitar
  // conflictos de render y seleccion en Konva/React.
  const { normalizedValue, hadIdentityFixes } = useMemo(() => {
    const seen = new Set<string>();
    const normalizedEntries = (value ?? []).map((object) => {
      let nextObject = object as CanvasObject;
      let didFixObject = false;

      if (object.type === "sticker") {
        const sticker = object as LegacySticker;
        if (!sticker.src && sticker.emoji) {
          nextObject = { ...sticker, src: "/stickers/sticker_star.svg" } as CanvasObject;
          didFixObject = true;
        }
      }

      const rawId =
        typeof (nextObject as { id?: unknown }).id === "string"
          ? String((nextObject as { id?: unknown }).id ?? "").trim()
          : "";
      const idTaken = rawId ? seen.has(rawId) : false;
      const resolvedId = rawId && !idTaken ? rawId : uid();
      if (resolvedId !== rawId) {
        nextObject = { ...nextObject, id: resolvedId } as CanvasObject;
        didFixObject = true;
      }
      seen.add(resolvedId);
      return { object: nextObject, didFixObject };
    });

    return {
      normalizedValue: normalizedEntries.map((entry) => entry.object),
      hadIdentityFixes: normalizedEntries.some((entry) => entry.didFixObject),
    };
  }, [value]);

  useEffect(() => {
    if (!hadIdentityFixes) return;
    onChange(normalizedValue);
  }, [hadIdentityFixes, normalizedValue, onChange]);

  // Orden del array = capas (ultimo arriba)
  const objects = useMemo<CanvasObject[]>(() => normalizedValue, [normalizedValue]);
  const stageSize = useMemo(() => {
    let maxX = 0;
    let maxY = 0;

    for (const object of objects) {
      const box = getBoxForObject(object);
      maxX = Math.max(maxX, box.x + box.w);
      maxY = Math.max(maxY, box.y + box.h);
    }

    return {
      width: Math.max(
        CANVAS_STAGE_MIN_WIDTH,
        Math.ceil(maxX + CANVAS_STAGE_GROW_PADDING_X),
      ),
      height: Math.max(
        CANVAS_STAGE_MIN_HEIGHT,
        Math.ceil(maxY + CANVAS_STAGE_GROW_PADDING_Y),
      ),
    };
  }, [objects]);
  const displayObjects = useMemo<CanvasObject[]>(
    () =>
      readOnly
        ? objects.map((object) => ({ ...object, locked: true }) as CanvasObject)
        : objects,
    [objects, readOnly],
  );
  const selectedIds = useMemo(() => {
    const validIds = new Set(displayObjects.map((object) => object.id));
    const nextSelectedIds = selectedIdsState.filter((id) => validIds.has(id));
    return readOnly ? [] : nextSelectedIds;
  }, [displayObjects, readOnly, selectedIdsState]);
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null;

  const playingVideoId = useMemo(() => {
    if (!playingVideoIdState) return null;
    const playingObject = objects.find((object) => object.id === playingVideoIdState);
    if (!playingObject || playingObject.type !== "video" || !playingObject.src) return null;
    return playingVideoIdState;
  }, [objects, playingVideoIdState]);

  const selectedUnlockedIds = useMemo(() => {
    return selectedIds.filter((id) => {
      const obj = displayObjects.find((o) => o.id === id);
      return !!obj && !isLocked(obj);
    });
  }, [displayObjects, selectedIds]);
  const selectedLockedCount = selectedIds.length - selectedUnlockedIds.length;

  const transformableSelectedIds = selectedUnlockedIds;

  const singleTransformId =
    transformableSelectedIds.length === 1 ? transformableSelectedIds[0] : null;

  const transformerKind: SelectedKind = useMemo(() => {
    if (!singleTransformId) return "none";
    const sel = displayObjects.find((o) => o.id === singleTransformId);
    return (sel?.type ?? "none") as SelectedKind;
  }, [displayObjects, singleTransformId]);

  const isMultiTransform = transformableSelectedIds.length > 1;

  // ---------- History ----------
  const { setObjects, undo, redo } = useCanvasHistoryState({
    objects,
    onChange,
  });

  // ---------- CRUD ----------
  const updateById = useCallback((
    id: string,
    patch: CanvasObjectPatch,
    opts?: {
      skipHistory?: boolean;
      historyBatchKey?: string;
      historyBatchMs?: number;
    },
  ) => {
    const next = objects.map((o) => (o.id === id ? { ...o, ...patch } : o));
    setObjects(next, opts);
  }, [objects, setObjects]);

  const hasVideoTarget = useCallback(
    (targetId: string) => {
      const targetObj = objects.find((o) => o.id === targetId);
      return Boolean(targetObj && targetObj.type === "video");
    },
    [objects],
  );

  const clearPlayingVideoForTarget = useCallback((targetId: string) => {
    setPlayingVideoId((prev) => (prev === targetId ? null : prev));
  }, []);

  const collectManagedMediaUrls = useCallback((canvasObjects: CanvasObject[]) => {
    return canvasObjects
      .map((object) => getCanvasManagedMediaSrc(object))
      .filter((value): value is string => Boolean(value));
  }, []);

  const deleteManagedUrls = useCallback(
    async (urls: Array<string | null | undefined>) => {
      if (!pageId) return true;

      const uniqueUrls = Array.from(
        new Set(
          urls
            .map((value) => String(value ?? "").trim())
            .filter(Boolean),
        ),
      );
      if (!uniqueUrls.length) return true;

      const failures: string[] = [];
      for (const url of uniqueUrls) {
        try {
          await deleteManagedMediaForPage(pageId, url);
        } catch (error) {
          const message = describeManagedMediaDeleteError(error);
          failures.push(message);
          if (typeof window !== "undefined") {
            window.alert(message);
          }
        }
      }

      return failures.length === 0;
    },
    [pageId],
  );

  const deleteManagedUrlsIfOrphaned = useCallback(
    async (
      candidateUrls: Array<string | null | undefined>,
      nextObjects: CanvasObject[],
    ) => {
      const remainingUrls = new Set(
        collectManagedMediaUrls(nextObjects).map((value) => value.trim()),
      );
      const coverUrl = String(coverPhotoUrl ?? "").trim();
      if (coverUrl) {
        remainingUrls.add(coverUrl);
      }
      const orphanedUrls = Array.from(
        new Set(
          candidateUrls
            .map((value) => String(value ?? "").trim())
            .filter((value) => value.length > 0 && !remainingUrls.has(value)),
        ),
      );
      if (!orphanedUrls.length) return true;
      return deleteManagedUrls(orphanedUrls);
    },
    [collectManagedMediaUrls, coverPhotoUrl, deleteManagedUrls],
  );

  const applyUploadedVideoUrl = useCallback(
    (targetId: string, url: string) => {
      const targetObj = objects.find((object) => object.id === targetId);
      const previousUrl = targetObj && targetObj.type === "video" ? targetObj.src ?? null : null;
      const nextObjects = objects.map((object) =>
        object.id === targetId && object.type === "video"
          ? { ...object, src: url }
          : object,
      );
      updateById(targetId, { src: url });
      void deleteManagedUrlsIfOrphaned([previousUrl], nextObjects);
    },
    [deleteManagedUrlsIfOrphaned, objects, updateById],
  );

  const applyUploadedPhotoUrl = useCallback(
    (targetId: string, url: string) => {
      const targetObj = objects.find((object) => object.id === targetId);
      if (!targetObj || targetObj.type !== "photo") return;
      const previousUrl = targetObj.src ?? null;
      const nextObjects = objects.map((object) =>
        object.id === targetId && object.type === "photo"
          ? {
              ...object,
              src: url,
              washi: targetObj.washi ?? "top",
              stamp: targetObj.stamp ?? "love",
            }
          : object,
      );
      updateById(targetId, {
        src: url,
        washi: targetObj.washi ?? "top",
        stamp: targetObj.stamp ?? "love",
      });
      void deleteManagedUrlsIfOrphaned([previousUrl], nextObjects);
    },
    [deleteManagedUrlsIfOrphaned, objects, updateById],
  );

  const clearManagedVideoSourceForTarget = useCallback(
    async (targetId: string) => {
      const targetObj = objects.find((object) => object.id === targetId);
      if (!targetObj || targetObj.type !== "video") return false;

      const nextObjects = objects.map((object) =>
        object.id === targetId && object.type === "video"
          ? { ...object, src: null }
          : object,
      );
      const cleared = await deleteManagedUrlsIfOrphaned([targetObj.src ?? null], nextObjects);
      if (!cleared) return false;

      clearPlayingVideoForTarget(targetId);
      updateById(targetId, { src: null });
      return true;
    },
    [clearPlayingVideoForTarget, deleteManagedUrlsIfOrphaned, objects, updateById],
  );

  const clearManagedPhotoSourceForTarget = useCallback(
    async (targetId: string) => {
      const targetObj = objects.find((object) => object.id === targetId);
      if (!targetObj || targetObj.type !== "photo") return false;

      const nextObjects = objects.map((object) =>
        object.id === targetId && object.type === "photo"
          ? { ...object, src: null }
          : object,
      );
      const cleared = await deleteManagedUrlsIfOrphaned([targetObj.src ?? null], nextObjects);
      if (!cleared) return false;

      updateById(targetId, { src: null });
      return true;
    },
    [deleteManagedUrlsIfOrphaned, objects, updateById],
  );

  const hasPhotoTarget = useCallback(
    (targetId: string) => {
      const targetObj = objects.find((object) => object.id === targetId);
      return Boolean(targetObj && targetObj.type === "photo");
    },
    [objects],
  );

  const {
    uploadingPhoto,
    photoUploadPercent,
    photoUploadLoaded,
    photoUploadTotal,
    photoUploadEtaMs,
    photoUploadStatusLabel,
    activePhotoItem,
    failedPhotoItem,
    photoUploadError,
    photoUploadInfo,
    uploadPhotoToTarget,
    cancelCurrentPhotoUpload,
    retryFailedPhotoUpload,
    clearPhotoUploadState,
  } = usePhotoUploadTask({
    pageId,
    hasTarget: hasPhotoTarget,
    applyUploadedUrl: applyUploadedPhotoUrl,
  });

  const {
    uploadingVideo,
    videoUploadPercent,
    videoUploadLoaded,
    videoUploadTotal,
    videoUploadEtaMs,
    videoQueue,
    activeVideoItem,
    failedVideoItem,
    videoUploadError,
    videoQueueInfo,
    videoUploadStatusLabel,
    setVideoUploadError,
    enqueueItems,
    cancelCurrentVideoUpload,
    retryFailedVideoUpload,
    clearPendingVideoQueue,
  } = useVideoUploadQueue({
    pageId,
    hasTarget: hasVideoTarget,
    applyUploadedUrl: applyUploadedVideoUrl,
    onUploaded: (targetId) => setPlayingVideoId(targetId),
  });

  useCanvasUploadStateEmitter({
    onUploadStateChange: onPhotoUploadStateChange,
    uploading: uploadingPhoto,
    uploadPercent: photoUploadPercent,
    uploadLoaded: photoUploadLoaded,
    uploadTotal: photoUploadTotal,
    uploadEtaMs: photoUploadEtaMs,
    activeFileName: activePhotoItem?.file.name ?? null,
    queueLength: 0,
    failedFileName: failedPhotoItem?.file.name ?? null,
    errorMessage: photoUploadError,
    infoMessage: photoUploadInfo,
    statusLabel: photoUploadStatusLabel,
    onCancel: cancelCurrentPhotoUpload,
    onRetry: retryFailedPhotoUpload,
    onClear: clearPhotoUploadState,
  });

  useCanvasUploadStateEmitter({
    onUploadStateChange: onVideoUploadStateChange,
    uploading: uploadingVideo,
    uploadPercent: videoUploadPercent,
    uploadLoaded: videoUploadLoaded,
    uploadTotal: videoUploadTotal,
    uploadEtaMs: videoUploadEtaMs,
    activeFileName: activeVideoItem?.file.name ?? null,
    queueLength: videoQueue.length,
    failedFileName: failedVideoItem?.file.name ?? null,
    errorMessage: videoUploadError,
    infoMessage: videoQueueInfo,
    statusLabel: videoUploadStatusLabel,
    onCancel: cancelCurrentVideoUpload,
    onRetry: retryFailedVideoUpload,
    onClear: clearPendingVideoQueue,
  });

  const {
    promptState,
    openCanvasPrompt,
    cancelCanvasPrompt,
    submitCanvasPrompt,
    setPromptValue,
  } = useCanvasPromptController({
    updateById,
    clearPlayingVideoForTarget,
    clearManagedVideoSourceForTarget,
    setVideoUploadError,
  });
  const {
    removeIds,
    removeSelected: removeSelectedByIds,
    toggleLock,
    bringToFront,
    sendBackwardOne,
    bringForwardOne,
    sendToBack,
    duplicateIds,
    addTemplate,
    addSticker,
    addText,
    addPhoto,
    addVideo,
  } = useCanvasObjectActions({
    objects,
    setObjects: (next) => setObjects(next),
    setSelectedIds,
    onRemoveObjects: (removedObjects, nextObjects) => {
      const removedMediaUrls = removedObjects
        .filter((object) => object.type === "video" || object.type === "photo")
        .map((object) => object.src ?? null);
      const removedIds = new Set(removedObjects.map((object) => object.id));
      setPlayingVideoId((prev) => (prev && removedIds.has(prev) ? null : prev));
      void deleteManagedUrlsIfOrphaned(removedMediaUrls, nextObjects);
    },
  });

  const removeSelected = useCallback(() => {
    removeSelectedByIds(selectedUnlockedIds);
  }, [removeSelectedByIds, selectedUnlockedIds]);
  const {
    multiDragRef,
    getSnapBoxForObject,
    nudgeIds,
    applyTransformForNode,
    applyTransformForNodes,
    startMultiDrag,
    handleDragMoveMaybeMulti,
    finishDragMaybeMulti,
    handleDragMoveGeneric,
    finishDragGeneric,
    selectOne,
  } = useCanvasDragTransform({
    stageRef,
    objects,
    stageSize,
    selectedIds,
    setSelectedIds,
    snapEnabled,
    snapToObjectsEnabled,
    gridSize: GRID,
    snapTolerance: SNAP_TOL,
    setGuides,
    setObjects,
    updateById,
  });

  function setExternalVideoUrlForSelected() {
    if (selectedObj?.type !== "video") return;
    if (isLocked(selectedObj)) return;
    const targetId = selectedObj.id;
    const current = String(selectedObj.src ?? "").trim();
    setVideoUploadError(null);
    openCanvasPrompt({
      kind: "video_url",
      targetId,
      title: "URL pública de video",
      description:
        "Pega una URL https://. Si lo dejas vacío se quitara el video enlazado.",
      placeholder: "https://...",
      confirmLabel: "Guardar URL",
      value: current || "https://",
    });
  }

  // ---------- Transformer binding ----------
  useEffect(() => {
    const stage = stageRef.current;
    const tr = trRef.current;
    if (!stage || !tr) return;

    if (!transformableSelectedIds.length) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }

    const nodes = transformableSelectedIds
      .map((id) => stage.findOne<Konva.Node>(`#${id}`))
      .filter((node): node is Konva.Node => Boolean(node));

    if (!nodes.length) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }

    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [objects, transformableSelectedIds]);

  // ---------- Keyboard: undo/redo, delete, duplicate, nudge, zoom reset ----------
  useCanvasKeyboardShortcuts({
    selectedUnlockedIds,
    gridSize: GRID,
    setSpaceDown,
    undo,
    redo,
    duplicateSelection: () => duplicateIds(selectedUnlockedIds),
    resetView: () => {
      setStageScale(1);
      setStagePos({ x: 0, y: 0 });
    },
    removeSelected,
    nudgeSelection: (dx, dy, opts) => nudgeIds(selectedUnlockedIds, dx, dy, opts),
  });

  const { onWheel, onStageMouseDown, onStageMouseMove, onStageMouseUp, onStageMouseLeave } =
    useCanvasStageInteractions({
      stageRef,
      spaceDown,
      stagePos,
      stageScale,
      setStagePos,
      setStageScale,
      marquee,
      setMarquee,
      setSelectedIds,
      objects,
      getSnapBoxForObject,
      setGuides,
      multiDragRef,
      onPointerChange: readOnly ? undefined : onPointerStateChange,
    });

  useEffect(() => {
    return () => {
      onPointerStateChange?.(null);
    };
  }, [onPointerStateChange]);

  const selectedObj: CanvasObject | null = selectedId
    ? (displayObjects.find((o) => o.id === selectedId) ?? null)
    : null;
  const selectedPhoto = selectedObj?.type === "photo" ? selectedObj : null;
  const selectedVideo = selectedObj?.type === "video" ? selectedObj : null;
  const { onPickPhoto, enqueueVideoFiles, togglePlaybackForVideo } =
    useCanvasMediaUploadActions({
      pageId,
      selectedId,
      selectedObj,
      objects,
      maxVideoBytes: PROJECT_MAX_VIDEO_BYTES,
      uploadPhotoToTarget,
      enqueueItems,
      setPlayingVideoId,
    });
  const multiSelected = selectedIds.length > 1;
  const selectedUnlockedCount = selectedUnlockedIds.length;
  const hasEditableSelection = selectedUnlockedCount > 0;
  const lockActionLabel =
    selectedIds.length > 0 && selectedLockedCount === selectedIds.length
      ? "Unlock"
      : "Lock";
  const canUploadPhoto = !!pageId && showPhotoTool;

  useImperativeHandle(ref, () => ({
    exportPng: () => {
      const st = stageRef.current;
      if (!st) return null;
      return st.toDataURL({ mimeType: "image/png", pixelRatio: 2 });
    },
    addVideoFrame: () => {
      addVideo();
    },
  }), [addVideo]);

  return (
    <div className="space-y-3">
      {!readOnly ? (
        <CanvasEditorToolbar
          addText={addText}
          addPhoto={addPhoto}
          showPhotoButton={showPhotoTool}
          activeLibraryPanel={activeLibraryPanel}
          onToggleLibraryPanel={(panel) =>
            setActiveLibraryPanel((prev) => (prev === panel ? "none" : panel))
          }
          onCloseLibraryPanel={() => setActiveLibraryPanel("none")}
          availableStickers={availableStickers}
          templatePresets={templatePresets}
          showGrid={showGrid}
          onToggleGrid={() => setShowGrid((value) => !value)}
          snapEnabled={snapEnabled}
          onToggleSnap={() => setSnapEnabled((value) => !value)}
          snapToObjectsEnabled={snapToObjectsEnabled}
          onToggleSnapObjects={() => setSnapToObjectsEnabled((value) => !value)}
          onResetView={() => {
            setStageScale(1);
            setStagePos({ x: 0, y: 0 });
          }}
          onUndo={undo}
          onRedo={redo}
          stickerQuery={stickerQuery}
          onStickerQueryChange={setStickerQuery}
          filteredStickerSources={filteredStickerSources}
          onAddSticker={addSticker}
          onAddTemplate={addTemplate}
          selectionCount={selectedIds.length}
          selectedUnlockedCount={selectedUnlockedCount}
          selectedLockedCount={selectedLockedCount}
          hasEditableSelection={hasEditableSelection}
          multiSelected={multiSelected}
          lockActionLabel={lockActionLabel}
          canToggleLockSelection={selectedIds.length > 0}
          onDuplicateSelection={() => duplicateIds(selectedUnlockedIds)}
          onBringToFrontSelection={() => bringToFront(selectedUnlockedIds)}
          onBringForwardSelection={() => bringForwardOne(selectedUnlockedIds)}
          onSendBackwardSelection={() => sendBackwardOne(selectedUnlockedIds)}
          onSendToBackSelection={() => sendToBack(selectedUnlockedIds)}
          onToggleLockSelection={() => toggleLock(selectedIds)}
          onRemoveSelection={removeSelected}
          photoFileInputRef={photoFileInputRef}
          videoFileInputRef={videoFileInputRef}
          onPhotoFileSelected={onPickPhoto}
          onVideoFilesSelected={enqueueVideoFiles}
          selectedObjectType={(selectedObj?.type ?? "none") as SelectedKind}
          selectedObjectLocked={selectedObj ? isLocked(selectedObj) : false}
          canUploadPhoto={canUploadPhoto}
          uploadingPhoto={uploadingPhoto}
          uploadingVideo={uploadingVideo}
          onRequestPhotoUpload={() => {
            if (uploadingPhoto) return;
            if (!canUploadPhoto) return;
            if (selectedObj?.type !== "photo") return;
            if (isLocked(selectedObj)) return;
            photoFileInputRef.current?.click();
          }}
          onRequestVideoUpload={() => {
            if (uploadingVideo) return;
            if (!canUploadPhoto) return;
            if (selectedObj?.type !== "video") return;
            if (isLocked(selectedObj)) return;
            videoFileInputRef.current?.click();
          }}
          onOpenExternalVideoUrl={setExternalVideoUrlForSelected}
          showVideoUploadPanel={showVideoUploadPanel}
          videoUploadState={{
            uploading: uploadingVideo,
            uploadPercent: videoUploadPercent,
            uploadLoaded: videoUploadLoaded,
            uploadTotal: videoUploadTotal,
            uploadEtaMs: videoUploadEtaMs,
            activeFileName: activeVideoItem?.file.name ?? null,
            queueLength: videoQueue.length,
            failedFileName: failedVideoItem?.file.name ?? null,
            errorMessage: videoUploadError,
            infoMessage: videoQueueInfo,
            statusLabel: videoUploadStatusLabel,
            onCancel: cancelCurrentVideoUpload,
            onRetry: retryFailedVideoUpload,
            onClear: clearPendingVideoQueue,
          }}
          selectedPhotoSrc={selectedPhoto?.src ?? null}
          selectedPhotoWashi={selectedPhoto?.washi ?? "none"}
          selectedPhotoStamp={selectedPhoto?.stamp ?? "none"}
          onClearSelectedPhoto={() => {
            if (!selectedPhoto) return;
            void clearManagedPhotoSourceForTarget(selectedPhoto.id);
          }}
          onToggleSelectedPhotoWashi={() => {
            if (!selectedPhoto) return;
            const current = selectedPhoto.washi ?? "none";
            updateById(selectedPhoto.id, {
              washi: current === "top" ? "none" : "top",
            });
          }}
          onCycleSelectedPhotoStamp={() => {
            if (!selectedPhoto) return;
            const current = selectedPhoto.stamp ?? "none";
            const next =
              current === "none" ? "love" : current === "love" ? "done" : "none";
            updateById(selectedPhoto.id, { stamp: next });
          }}
          selectedVideoSrc={selectedVideo?.src ?? null}
          isSelectedVideoPlaying={
            Boolean(selectedVideo) && playingVideoId === selectedVideo?.id
          }
          onToggleSelectedVideoPlayback={() => {
            if (!selectedVideo) return;
            togglePlaybackForVideo(selectedVideo.id);
          }}
          onClearSelectedVideo={() => {
            if (!selectedVideo) return;
            void clearManagedVideoSourceForTarget(selectedVideo.id);
          }}
        />
      ) : null}

      <CanvasEditorStage
        stageSize={stageSize}
        stageScale={stageScale}
        stagePos={stagePos}
        stageRef={stageRef}
        transformerRef={trRef}
        onWheel={onWheel}
        onStageMouseDown={onStageMouseDown}
        onStageMouseMove={onStageMouseMove}
        onStageMouseUp={onStageMouseUp}
        onStageMouseLeave={onStageMouseLeave}
        showGrid={showGrid}
        gridSize={GRID}
        guides={guides}
        marquee={marquee}
        remotePointers={remotePointers}
        objectNodes={
          <CanvasEditorObjectNodes
            objects={displayObjects}
            selectedIds={selectedIds}
            playingVideoId={playingVideoId}
            onClearPlayingVideo={() => setPlayingVideoId(null)}
            onToggleVideoPlayback={togglePlaybackForVideo}
            selectOne={selectOne}
            startMultiDrag={startMultiDrag}
            handleDragMoveMaybeMulti={handleDragMoveMaybeMulti}
            handleDragMoveGeneric={handleDragMoveGeneric}
            finishDragMaybeMulti={finishDragMaybeMulti}
            finishDragGeneric={finishDragGeneric}
            removeIds={removeIds}
            onEditText={(targetId, value) => {
              openCanvasPrompt({
                kind: "text_body",
                targetId,
                title: "Editar texto",
                description:
                  "Actualiza el contenido del bloque de texto seleccionado.",
                placeholder: "Escribe el texto...",
                confirmLabel: "Guardar texto",
                value,
              });
            }}
            onEditPhotoCaption={(targetId, value) => {
              openCanvasPrompt({
                kind: "photo_caption",
                targetId,
                title: "Texto bajo la foto",
                description:
                  "Este texto se muestra como pie de foto dentro del marco.",
                placeholder: "Escribe un pie de foto...",
                confirmLabel: "Guardar caption",
                value,
              });
            }}
            onEditVideoCaption={(targetId, value) => {
              openCanvasPrompt({
                kind: "video_caption",
                targetId,
                title: "Texto bajo el video",
                description:
                  "Define un caption para el reproductor de video.",
                placeholder: "Escribe un caption...",
                confirmLabel: "Guardar caption",
                value,
              });
            }}
          />
        }
        isMultiTransform={isMultiTransform}
        transformerKind={transformerKind}
        onTransformEnd={() => {
          const tr = trRef.current;
          const nodes = tr?.nodes?.() ?? [];
          if (!nodes.length) return;

          if (nodes.length > 1 || isMultiTransform) {
            applyTransformForNodes(nodes);
            return;
          }

          const node = nodes[0];
          const id = node?.id?.();
          if (id) applyTransformForNode(id, node);
        }}
      />

      <PromptModal
        open={promptState.kind !== "none"}
        title={promptState.title || "Editar"}
        description={promptState.description}
        placeholder={promptState.placeholder}
        value={promptState.value}
        confirmLabel={promptState.confirmLabel}
        onValueChange={setPromptValue}
        onConfirm={submitCanvasPrompt}
        onCancel={cancelCanvasPrompt}
      />
    </div>
  );
});




