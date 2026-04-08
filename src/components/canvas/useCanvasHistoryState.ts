"use client";

import { useCallback, useRef } from "react";
import type { CanvasObject } from "@/lib/canvasTypes";

type SetObjectsOptions = {
  skipHistory?: boolean;
  historyBatchKey?: string;
  historyBatchMs?: number;
};

type UseCanvasHistoryStateParams = {
  objects: CanvasObject[];
  onChange: (next: CanvasObject[]) => void;
  maxHistoryDepth?: number;
};

type UseCanvasHistoryStateResult = {
  setObjects: (next: CanvasObject[], opts?: SetObjectsOptions) => void;
  undo: () => void;
  redo: () => void;
};

export function useCanvasHistoryState({
  objects,
  onChange,
  maxHistoryDepth = 80,
}: UseCanvasHistoryStateParams): UseCanvasHistoryStateResult {
  const undoStack = useRef<CanvasObject[][]>([]);
  const redoStack = useRef<CanvasObject[][]>([]);
  const historyBatchRef = useRef<{ key: string; until: number } | null>(null);
  const skipHistoryRef = useRef(false);

  const pushHistory = useCallback(
    (prev: CanvasObject[]) => {
      if (skipHistoryRef.current) return;
      undoStack.current.push(prev);
      if (undoStack.current.length > maxHistoryDepth) undoStack.current.shift();
      redoStack.current = [];
    },
    [maxHistoryDepth],
  );

  const setObjects = useCallback(
    (next: CanvasObject[], opts?: SetObjectsOptions) => {
      const prev = objects;
      const same =
        prev.length === next.length && prev.every((obj, idx) => obj === next[idx]);
      if (same) return;

      if (!opts?.skipHistory) {
        const key = opts?.historyBatchKey;
        if (key) {
          const now = Date.now();
          const windowMs = opts?.historyBatchMs ?? 260;
          const prevBatch = historyBatchRef.current;
          const canMerge =
            !!prevBatch && prevBatch.key === key && now <= prevBatch.until;
          if (!canMerge) pushHistory(prev);
          historyBatchRef.current = { key, until: now + windowMs };
        } else {
          pushHistory(prev);
          historyBatchRef.current = null;
        }
      }

      onChange(next);
    },
    [objects, onChange, pushHistory],
  );

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    historyBatchRef.current = null;
    skipHistoryRef.current = true;
    redoStack.current.push(objects);
    onChange(prev);
    queueMicrotask(() => {
      skipHistoryRef.current = false;
    });
  }, [objects, onChange]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    historyBatchRef.current = null;
    skipHistoryRef.current = true;
    undoStack.current.push(objects);
    onChange(next);
    queueMicrotask(() => {
      skipHistoryRef.current = false;
    });
  }, [objects, onChange]);

  return {
    setObjects,
    undo,
    redo,
  };
}
