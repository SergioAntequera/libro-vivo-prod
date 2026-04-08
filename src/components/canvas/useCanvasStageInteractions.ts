"use client";

import type Konva from "konva";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useCallback, useRef } from "react";
import type { CanvasObject } from "@/lib/canvasTypes";
import type {
  GuideLine,
  MultiDragState,
  ObjectBox,
} from "@/components/canvas/canvasDragSnap";
import { clamp, eventShiftKey } from "@/components/canvas/canvasEditorUtils";

type StagePosition = { x: number; y: number };
type MarqueeState = { active: boolean; x: number; y: number; w: number; h: number };

type UseCanvasStageInteractionsParams = {
  stageRef: MutableRefObject<Konva.Stage | null>;
  spaceDown: boolean;
  stagePos: StagePosition;
  stageScale: number;
  setStagePos: Dispatch<SetStateAction<StagePosition>>;
  setStageScale: Dispatch<SetStateAction<number>>;
  marquee: MarqueeState;
  setMarquee: Dispatch<SetStateAction<MarqueeState>>;
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  objects: CanvasObject[];
  getSnapBoxForObject: (object: CanvasObject) => ObjectBox;
  setGuides: (guides: GuideLine[]) => void;
  multiDragRef: MutableRefObject<MultiDragState | null>;
  onPointerChange?: (pointer: { x: number; y: number } | null) => void;
  minScale?: number;
  maxScale?: number;
  zoomScaleBy?: number;
};

export function useCanvasStageInteractions(
  params: UseCanvasStageInteractionsParams,
) {
  const {
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
    onPointerChange,
    minScale = 0.5,
    maxScale = 2.5,
    zoomScaleBy = 1.05,
  } = params;

  const panStartRef = useRef<{
    x: number;
    y: number;
    px: number;
    py: number;
  } | null>(null);
  const marqueeStartRef = useRef<{ x: number; y: number } | null>(null);

  const pointerToWorld = useCallback(
    (stage: Konva.Stage) => {
      const pointer = stage.getPointerPosition();
      if (!pointer) return null;
      return {
        x: (pointer.x - stagePos.x) / stageScale,
        y: (pointer.y - stagePos.y) / stageScale,
      };
    },
    [stagePos, stageScale],
  );

  const onWheel = useCallback(
    (event: Konva.KonvaEventObject<WheelEvent>) => {
      event.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const oldScale = stageScale;
      const direction = event.evt.deltaY > 0 ? -1 : 1;
      const newScale = clamp(
        direction > 0 ? oldScale * zoomScaleBy : oldScale / zoomScaleBy,
        minScale,
        maxScale,
      );

      const mousePointTo = {
        x: (pointer.x - stagePos.x) / oldScale,
        y: (pointer.y - stagePos.y) / oldScale,
      };

      setStageScale(newScale);
      setStagePos({
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      });
    },
    [
      stageRef,
      stageScale,
      zoomScaleBy,
      minScale,
      maxScale,
      stagePos.x,
      stagePos.y,
      setStageScale,
      setStagePos,
    ],
  );

  const onStageMouseDown = useCallback(
    (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = stageRef.current;
      if (!stage) return;

      if (spaceDown) {
        const pointer = stage.getPointerPosition();
        if (!pointer) return;
        const worldPointer = pointerToWorld(stage);
        onPointerChange?.(worldPointer);
        panStartRef.current = {
          x: pointer.x,
          y: pointer.y,
          px: stagePos.x,
          py: stagePos.y,
        };
        return;
      }

      const isEmpty = event.target === stage;
      if (!isEmpty) return;

      const worldPointer = pointerToWorld(stage);
      if (!worldPointer) return;
      onPointerChange?.(worldPointer);

      marqueeStartRef.current = { x: worldPointer.x, y: worldPointer.y };
      setMarquee({
        active: true,
        x: worldPointer.x,
        y: worldPointer.y,
        w: 0,
        h: 0,
      });

      if (!eventShiftKey(event)) {
        setSelectedIds([]);
      }
    },
    [
      onPointerChange,
      pointerToWorld,
      setMarquee,
      setSelectedIds,
      spaceDown,
      stagePos.x,
      stagePos.y,
      stageRef,
    ],
  );

  const onStageMouseMove = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const worldPointer = pointerToWorld(stage);
    onPointerChange?.(worldPointer);

    if (spaceDown && panStartRef.current) {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const dx = pointer.x - panStartRef.current.x;
      const dy = pointer.y - panStartRef.current.y;
      setStagePos({
        x: panStartRef.current.px + dx,
        y: panStartRef.current.py + dy,
      });
      return;
    }

    if (!marquee.active || !marqueeStartRef.current) return;

    if (!worldPointer) return;

    const x0 = marqueeStartRef.current.x;
    const y0 = marqueeStartRef.current.y;
    const x1 = worldPointer.x;
    const y1 = worldPointer.y;

    setMarquee({
      active: true,
      x: Math.min(x0, x1),
      y: Math.min(y0, y1),
      w: Math.abs(x1 - x0),
      h: Math.abs(y1 - y0),
    });
  }, [marquee.active, onPointerChange, pointerToWorld, setMarquee, setStagePos, spaceDown, stageRef]);

  const onStageMouseUp = useCallback(
    (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = stageRef.current;
      if (!stage) return;
      onPointerChange?.(pointerToWorld(stage));

      if (panStartRef.current) {
        panStartRef.current = null;
      }

      if (marquee.active) {
        const selectedIds = objects
          .map(getSnapBoxForObject)
          .filter((box) => {
            return (
              box.x < marquee.x + marquee.w &&
              box.x + box.w > marquee.x &&
              box.y < marquee.y + marquee.h &&
              box.y + box.h > marquee.y
            );
          })
          .map((box) => box.id);

        setMarquee({ active: false, x: 0, y: 0, w: 0, h: 0 });
        marqueeStartRef.current = null;

        if (selectedIds.length) {
          if (eventShiftKey(event)) {
            setSelectedIds((prev) => Array.from(new Set([...prev, ...selectedIds])));
          } else {
            setSelectedIds(selectedIds);
          }
        }
      }

      setGuides([]);
      multiDragRef.current = null;
    },
    [
      getSnapBoxForObject,
      setGuides,
      multiDragRef,
      objects,
      onPointerChange,
      pointerToWorld,
      marquee,
      setMarquee,
      setSelectedIds,
      stageRef,
    ],
  );

  const onStageMouseLeave = useCallback(() => {
    onPointerChange?.(null);
  }, [onPointerChange]);

  return {
    onWheel,
    onStageMouseDown,
    onStageMouseMove,
    onStageMouseUp,
    onStageMouseLeave,
  };
}
