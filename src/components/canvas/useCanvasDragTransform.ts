"use client";

import type Konva from "konva";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useCallback, useRef } from "react";
import type { CanvasObject } from "@/lib/canvasTypes";
import {
  clamp,
  isLocked,
  shouldCenterSnapForObject,
  snapToGrid,
} from "@/components/canvas/canvasEditorUtils";
import {
  buildMultiDragState,
  clampDeltaForBox as clampDragDeltaForBox,
  clampMultiDragDelta as clampMultiDragDeltaForCanvas,
  computeGuides as computeDragGuides,
  getBoxForObject,
  getMultiDragBounds as getMultiDragBoundsForCanvas,
  snapDeltaToGrid as snapDeltaForBoxToGrid,
  type Box2D,
  type GuideLine,
  type MultiDragState,
  type ObjectBox,
} from "@/components/canvas/canvasDragSnap";
import {
  buildTransformPatchForObject,
  type TransformNodeLike,
} from "@/components/canvas/canvasTransformPatch";

type StageSize = { width: number; height: number };

type HistoryOptions = {
  skipHistory?: boolean;
  historyBatchKey?: string;
  historyBatchMs?: number;
};

type CanvasObjectPatch = Record<string, unknown>;

type UseCanvasDragTransformParams = {
  stageRef: MutableRefObject<Konva.Stage | null>;
  objects: CanvasObject[];
  stageSize: StageSize;
  selectedIds: string[];
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  snapEnabled: boolean;
  snapToObjectsEnabled: boolean;
  gridSize: number;
  snapTolerance: number;
  setGuides: Dispatch<SetStateAction<GuideLine[]>>;
  setObjects: (next: CanvasObject[], opts?: HistoryOptions) => void;
  updateById: (
    id: string,
    patch: CanvasObjectPatch,
    opts?: HistoryOptions,
  ) => void;
};

export function useCanvasDragTransform(params: UseCanvasDragTransformParams) {
  const {
    stageRef,
    objects,
    stageSize,
    selectedIds,
    setSelectedIds,
    snapEnabled,
    snapToObjectsEnabled,
    gridSize,
    snapTolerance,
    setGuides,
    setObjects,
    updateById,
  } = params;

  const multiDragRef = useRef<MultiDragState | null>(null);

  const getLiveBoxForId = useCallback((id: string): ObjectBox | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const node = stage.findOne<Konva.Node>(`#${id}`);
    if (!node) return null;

    try {
      const rect = node.getClientRect({ skipShadow: true });
      if (!Number.isFinite(rect?.x) || !Number.isFinite(rect?.y)) return null;
      if (!Number.isFinite(rect?.width) || !Number.isFinite(rect?.height)) return null;
      return { id, x: rect.x, y: rect.y, w: rect.width, h: rect.height };
    } catch {
      return null;
    }
  }, [stageRef]);

  const getSnapBoxForObject = useCallback((object: CanvasObject): ObjectBox => {
    if (!object?.id) return getBoxForObject(object);
    return getLiveBoxForId(object.id) ?? getBoxForObject(object);
  }, [getLiveBoxForId]);

  const computeGuides = useCallback((
    box: Box2D,
    draggingId: string,
    excludedIds?: Set<string>,
    opts?: { movingCenterOnly?: boolean },
  ) => {
    return computeDragGuides({
      box,
      draggingId,
      objects,
      stageSize,
      snapTol: snapTolerance,
      snapToObjectsEnabled,
      excludedIds,
      movingCenterOnly: opts?.movingCenterOnly,
      getSnapBoxForObject: (obj) => getSnapBoxForObject(obj as CanvasObject),
      shouldCenterSnapForObject: (obj) => shouldCenterSnapForObject(obj),
    });
  }, [getSnapBoxForObject, objects, snapTolerance, snapToObjectsEnabled, stageSize]);

  const buildTransformPatchForNode = useCallback((
    id: string,
    node: TransformNodeLike,
    opts?: { fromMulti?: boolean },
  ) => {
    const found = objects.find((object) => object.id === id);
    if (!found || isLocked(found)) return null;
    return buildTransformPatchForObject(found, node, opts);
  }, [objects]);

  const applyTransformForNode = useCallback((
    id: string,
    node: TransformNodeLike,
    fromMulti = false,
  ) => {
    const patch = buildTransformPatchForNode(id, node, { fromMulti });
    if (!patch) return;
    updateById(id, patch);
  }, [buildTransformPatchForNode, updateById]);

  const applyTransformForNodes = useCallback((nodes: TransformNodeLike[]) => {
    if (!nodes.length) return;

    const patchMap = new Map<string, Record<string, unknown>>();
    for (const node of nodes) {
      const id = node?.id?.();
      if (!id) continue;
      const patch = buildTransformPatchForNode(id, node, { fromMulti: true });
      if (patch) patchMap.set(id, patch);
    }

    if (!patchMap.size) return;

    const next = objects.map((object) => {
      const patch = patchMap.get(object.id);
      return patch ? { ...object, ...patch } : object;
    });

    setObjects(next);
  }, [buildTransformPatchForNode, objects, setObjects]);

  const clampMultiDragDelta = useCallback((
    context: MultiDragState,
    dx: number,
    dy: number,
  ): { dx: number; dy: number } => {
    return clampMultiDragDeltaForCanvas(context, dx, dy, stageSize, clamp);
  }, [stageSize]);

  const resolveMultiDragDelta = useCallback((
    context: MultiDragState,
    rawDx: number,
    rawDy: number,
    opts: { snapGuides: boolean; snapGrid: boolean },
  ) => {
    let { dx, dy } = clampMultiDragDelta(context, rawDx, rawDy);

    if (!snapEnabled) {
      if (opts.snapGuides) setGuides([]);
      return { dx, dy };
    }

    if (opts.snapGuides) {
      const box = getMultiDragBoundsForCanvas(context, dx, dy);
      const guides = computeGuides(box, context.anchorId, new Set(context.ids), {
        movingCenterOnly: context.centerSnap,
      });
      setGuides(guides.guides);
      if (guides.hit) {
        const clamped = clampMultiDragDelta(context, dx + guides.dx, dy + guides.dy);
        dx = clamped.dx;
        dy = clamped.dy;
      }
    }

    if (opts.snapGrid) {
      const box = getMultiDragBoundsForCanvas(context, dx, dy);
      const gx = snapToGrid(
        context.centerSnap ? box.x + box.w / 2 : box.x,
        gridSize,
      );
      const gy = snapToGrid(
        context.centerSnap ? box.y + box.h / 2 : box.y,
        gridSize,
      );
      const anchorX = context.centerSnap ? box.x + box.w / 2 : box.x;
      const anchorY = context.centerSnap ? box.y + box.h / 2 : box.y;
      const clamped = clampMultiDragDelta(
        context,
        dx + (gx - anchorX),
        dy + (gy - anchorY),
      );
      dx = clamped.dx;
      dy = clamped.dy;
    }

    return { dx, dy };
  }, [clampMultiDragDelta, computeGuides, gridSize, setGuides, snapEnabled]);

  const previewMultiDrag = useCallback((context: MultiDragState, dx: number, dy: number) => {
    const stage = stageRef.current;
    if (!stage) return;

    for (const id of context.ids) {
      const p = context.startPos[id];
      if (!p) continue;
      const node = stage.findOne<Konva.Node>(`#${id}`);
      if (!node) continue;
      node.position({ x: p.x + dx, y: p.y + dy });
    }

    stage.batchDraw();
  }, [stageRef]);

  const startMultiDrag = useCallback((id: string, x: number, y: number) => {
    multiDragRef.current = buildMultiDragState({
      anchorId: id,
      anchorStart: { x, y },
      selectedIds,
      objects,
      isLocked,
      getSnapBoxForObject: (obj) => getSnapBoxForObject(obj as CanvasObject),
      shouldCenterSnapForObject,
    });
  }, [getSnapBoxForObject, objects, selectedIds]);

  const handleDragMoveMaybeMulti = useCallback((
    id: string,
    x: number,
    y: number,
    setPos: (nx: number, ny: number) => void,
  ) => {
    const context = multiDragRef.current;
    if (!context || context.anchorId !== id) return false;

    const rawDx = x - context.anchorStart.x;
    const rawDy = y - context.anchorStart.y;
    const { dx, dy } = resolveMultiDragDelta(context, rawDx, rawDy, {
      snapGuides: true,
      snapGrid: false,
    });

    previewMultiDrag(context, dx, dy);

    const anchorStart = context.startPos[id] ?? context.anchorStart;
    setPos(anchorStart.x + dx, anchorStart.y + dy);
    return true;
  }, [previewMultiDrag, resolveMultiDragDelta]);

  const finishDragMaybeMulti = useCallback((id: string, x: number, y: number) => {
    const context = multiDragRef.current;
    if (!context || context.anchorId !== id) return false;

    const rawDx = x - context.anchorStart.x;
    const rawDy = y - context.anchorStart.y;
    const { dx, dy } = resolveMultiDragDelta(context, rawDx, rawDy, {
      snapGuides: false,
      snapGrid: true,
    });

    const next = objects.map((object) => {
      const p = context.startPos[object.id];
      if (!p) return object;
      return { ...object, x: p.x + dx, y: p.y + dy };
    });

    setGuides([]);
    multiDragRef.current = null;
    setObjects(next);
    return true;
  }, [objects, resolveMultiDragDelta, setGuides, setObjects]);

  const handleDragMoveGeneric = useCallback((
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
    setPos: (nx: number, ny: number) => void,
  ) => {
    if (!snapEnabled) {
      setGuides([]);
      return;
    }

    const box = getLiveBoxForId(id) ?? { id, x, y, w, h };
    const moving = objects.find((object) => object.id === id);
    const guides = computeGuides(box, id, undefined, {
      movingCenterOnly: moving ? shouldCenterSnapForObject(moving) : false,
    });
    setGuides(guides.guides);

    if (guides.hit) setPos(x + guides.dx, y + guides.dy);
  }, [computeGuides, getLiveBoxForId, objects, setGuides, snapEnabled]);

  const finishDragGeneric = useCallback((
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => {
    setGuides([]);

    const baseBox = getLiveBoxForId(id) ?? { id, x, y, w, h };
    const moving = objects.find((object) => object.id === id);
    const centerSnap = moving ? shouldCenterSnapForObject(moving) : false;
    let delta = clampDragDeltaForBox(baseBox, 0, 0, stageSize);

    if (snapEnabled) {
      const snapped = snapDeltaForBoxToGrid(
        baseBox,
        delta.dx,
        delta.dy,
        centerSnap,
        gridSize,
        snapToGrid,
      );
      delta.dx = snapped.dx;
      delta.dy = snapped.dy;
      delta = clampDragDeltaForBox(baseBox, delta.dx, delta.dy, stageSize);
    }

    updateById(id, { x: x + delta.dx, y: y + delta.dy });
  }, [getLiveBoxForId, gridSize, objects, setGuides, snapEnabled, stageSize, updateById]);

  const nudgeIds = useCallback((
    ids: string[],
    dx: number,
    dy: number,
    opts?: { historyBatchKey?: string },
  ) => {
    if (!ids.length) return;
    const movableIds = ids.filter((id) => {
      const object = objects.find((candidate) => candidate.id === id);
      return !!object && !isLocked(object);
    });
    if (!movableIds.length) return;

    const shouldSnapGrid =
      snapEnabled && (Math.abs(dx) >= gridSize || Math.abs(dy) >= gridSize);

    if (movableIds.length === 1) {
      const targetId = movableIds[0];
      const object = objects.find((candidate) => candidate.id === targetId);
      if (!object) return;

      const box = getSnapBoxForObject(object);
      const centerSnap = shouldCenterSnapForObject(object);
      let delta = clampDragDeltaForBox(box, dx, dy, stageSize);

      if (shouldSnapGrid) {
        const snapped = snapDeltaForBoxToGrid(
          box,
          delta.dx,
          delta.dy,
          centerSnap,
          gridSize,
          snapToGrid,
        );
        delta.dx = snapped.dx;
        delta.dy = snapped.dy;
        delta = clampDragDeltaForBox(box, delta.dx, delta.dy, stageSize);
      }

      updateById(
        targetId,
        { x: (object.x ?? 0) + delta.dx, y: (object.y ?? 0) + delta.dy },
        {
          historyBatchKey: opts?.historyBatchKey,
          historyBatchMs: 260,
        },
      );
      return;
    }

    const startPos: Record<string, { x: number; y: number }> = {};
    const sizes: Record<string, { w: number; h: number }> = {};
    const boundsOffset: Record<string, { x: number; y: number }> = {};
    for (const id of movableIds) {
      const object = objects.find((candidate) => candidate.id === id);
      if (!object) continue;
      const ox = object.x ?? 0;
      const oy = object.y ?? 0;
      startPos[id] = { x: ox, y: oy };
      const box = getSnapBoxForObject(object);
      sizes[id] = { w: box.w, h: box.h };
      boundsOffset[id] = { x: box.x - ox, y: box.y - oy };
    }

    const anchorId = movableIds[0];
    if (!startPos[anchorId]) return;

    const context: MultiDragState = {
      ids: Object.keys(startPos),
      anchorId,
      anchorStart: { ...startPos[anchorId] },
      startPos,
      sizes,
      boundsOffset,
      centerSnap: movableIds.some((id) => {
        const object = objects.find((candidate) => candidate.id === id);
        return object ? shouldCenterSnapForObject(object) : false;
      }),
    };

    const resolved = resolveMultiDragDelta(context, dx, dy, {
      snapGuides: false,
      snapGrid: shouldSnapGrid,
    });

    const next = objects.map((object) => {
      const p = context.startPos[object.id];
      if (!p) return object;
      return { ...object, x: p.x + resolved.dx, y: p.y + resolved.dy };
    });

    setObjects(next, {
      historyBatchKey: opts?.historyBatchKey,
      historyBatchMs: 260,
    });
  }, [getSnapBoxForObject, gridSize, objects, resolveMultiDragDelta, setObjects, snapEnabled, stageSize, updateById]);

  const selectOne = useCallback((id: string, additive: boolean) => {
    if (additive) {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id],
      );
    } else {
      setSelectedIds([id]);
    }
  }, [setSelectedIds]);

  return {
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
  };
}
