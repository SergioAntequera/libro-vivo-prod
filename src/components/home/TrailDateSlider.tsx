import { useEffect, useRef, useState } from "react";

export default function TrailDateSlider({
  pathDaysCount,
  focusIndex,
  onChangeIndex,
  compact = false,
}: {
  pathDaysCount: number;
  focusIndex: number;
  onChangeIndex: (rawIndex: number) => void;
  compact?: boolean;
}) {
  const maxIndex = Math.max(pathDaysCount - 1, 0);
  const safeValue = Math.min(focusIndex, maxIndex);
  const [draftState, setDraftState] = useState({
    sourceValue: safeValue,
    value: safeValue,
  });
  const [isDragging, setIsDragging] = useState(false);
  const frameRef = useRef<number | null>(null);
  const pendingValueRef = useRef(safeValue);

  useEffect(() => {
    if (!isDragging) {
      pendingValueRef.current = safeValue;
    }
  }, [isDragging, safeValue]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  function queueCommit(nextValue: number) {
    pendingValueRef.current = nextValue;
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      onChangeIndex(pendingValueRef.current);
    });
  }

  function flushCommit(nextValue: number) {
    pendingValueRef.current = nextValue;
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    onChangeIndex(nextValue);
  }

  const draftValue = isDragging || draftState.sourceValue === safeValue
    ? draftState.value
    : safeValue;

  return (
    <div className={`absolute z-[60] ${compact ? "inset-x-3 bottom-3" : "inset-x-6 bottom-3"}`}>
      <div
        className={`rounded-full border bg-white/90 shadow-sm backdrop-blur ${
          compact ? "px-3 py-2.5" : "px-3 py-2"
        }`}
      >
        <input
          type="range"
          min={0}
          max={maxIndex}
          value={draftValue}
          step={1}
          className={`w-full accent-[#6f9352] ${compact ? "h-3" : "h-2"}`}
          onChange={(e) => {
            const nextValue = Number(e.target.value);
            setDraftState({
              sourceValue: safeValue,
              value: nextValue,
            });
            queueCommit(nextValue);
          }}
          onPointerDown={(e) => {
            setIsDragging(true);
            e.stopPropagation();
          }}
          onPointerUp={(e) => {
            setIsDragging(false);
            flushCommit(pendingValueRef.current);
            e.stopPropagation();
          }}
          onTouchEnd={() => {
            setIsDragging(false);
            flushCommit(pendingValueRef.current);
          }}
        />
      </div>
    </div>
  );
}
