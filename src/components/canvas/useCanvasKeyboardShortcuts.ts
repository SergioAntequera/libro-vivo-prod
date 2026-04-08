"use client";

import { useEffect } from "react";

type UseCanvasKeyboardShortcutsParams = {
  selectedUnlockedIds: string[];
  gridSize: number;
  setSpaceDown: (next: boolean) => void;
  undo: () => void;
  redo: () => void;
  duplicateSelection: () => void;
  resetView: () => void;
  removeSelected: () => void;
  nudgeSelection: (
    dx: number,
    dy: number,
    opts?: { historyBatchKey?: string },
  ) => void;
};

export function useCanvasKeyboardShortcuts(
  params: UseCanvasKeyboardShortcutsParams,
) {
  const {
    selectedUnlockedIds,
    gridSize,
    setSpaceDown,
    undo,
    redo,
    duplicateSelection,
    resetView,
    removeSelected,
    nudgeSelection,
  } = params;

  useEffect(() => {
    function isTypingTarget(element: EventTarget | null) {
      if (!(element instanceof HTMLElement)) return false;
      const tag = element.tagName.toLowerCase();
      return tag === "input" || tag === "textarea" || element.isContentEditable;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;

      if (event.code === "Space") {
        setSpaceDown(true);
      }

      const meta = event.metaKey || event.ctrlKey;

      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (meta && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }

      if (meta && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelection();
        return;
      }

      if (meta && event.key.toLowerCase() === "0") {
        event.preventDefault();
        resetView();
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (!selectedUnlockedIds.length) return;
        event.preventDefault();
        removeSelected();
        return;
      }

      const step = event.shiftKey ? gridSize : 2;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        nudgeSelection(-step, 0, { historyBatchKey: "kbd-nudge" });
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        nudgeSelection(step, 0, { historyBatchKey: "kbd-nudge" });
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        nudgeSelection(0, -step, { historyBatchKey: "kbd-nudge" });
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        nudgeSelection(0, step, { historyBatchKey: "kbd-nudge" });
      }
    }

    function onKeyUp(event: KeyboardEvent) {
      if (event.code === "Space") setSpaceDown(false);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [
    selectedUnlockedIds,
    gridSize,
    setSpaceDown,
    undo,
    redo,
    duplicateSelection,
    resetView,
    removeSelected,
    nudgeSelection,
  ]);
}
