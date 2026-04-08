"use client";

import {
  useCallback,
  useEffect,
  useState,
  useRef,
  type RefCallback,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { TrailPoint } from "@/lib/homeTrailGeometry";
import { HOME_TRAIL_SLIDER_EVENT_SNAP_RADIUS, clampRange } from "@/lib/homeTrailGeometry";
import {
  buildIsoForYearAnchor,
  clampIsoToRange,
  isIsoDate,
  todayIsoLocal,
} from "@/lib/homePageUtils";

type UseHomeTrailInteractionsParams = {
  loading: boolean;
  pathDays: string[];
  trailPoints: TrailPoint[];
  normalizedRange: { start: string; end: string };
  focusDate: string;
  selectedYear: number;
  canvasWidth: number;
  canvasHeight: number;
  eventDayIndexes: number[];
  eventDayIndexSet: Set<number>;
  setFocusDate: (value: string) => void;
  setJumpDate: (value: string) => void;
  setDateFrom: (value: string) => void;
  setDateTo: (value: string) => void;
};

export function useHomeTrailInteractions(params: UseHomeTrailInteractionsParams) {
  const {
    loading,
    pathDays,
    trailPoints,
    normalizedRange,
    focusDate,
    selectedYear,
    canvasWidth,
    canvasHeight,
    eventDayIndexes,
    eventDayIndexSet,
    setFocusDate,
    setJumpDate,
    setDateFrom,
    setDateTo,
  } = params;

  const viewportNodeRef = useRef<HTMLDivElement | null>(null);
  const [viewportNode, setViewportNode] = useState<HTMLDivElement | null>(null);
  const viewportRef = useCallback<RefCallback<HTMLDivElement>>((node) => {
    viewportNodeRef.current = node;
    setViewportNode(node);
  }, []);
  const pendingCenterDateRef = useRef<string | null>(null);
  const initialCenterDoneRef = useRef(false);
  const suppressClickUntilRef = useRef(0);
  const dragRef = useRef({
    active: false,
    moved: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
  });
  const [viewportTransform, setViewportTransform] = useState({
    zoom: 1,
    panX: 0,
    panY: 0,
  });

  const clampPanForFrame = useCallback(
    (panX: number, panY: number, zoom: number) => {
      const currentFrame = viewportNodeRef.current;
      if (!currentFrame || zoom <= 1) return { panX: 0, panY: 0 };
      const rect = currentFrame.getBoundingClientRect();
      const minPanX = rect.width - rect.width * zoom;
      const minPanY = rect.height - rect.height * zoom;
      return {
        panX: clampRange(panX, minPanX, 0),
        panY: clampRange(panY, minPanY, 0),
      };
    },
    [],
  );

  const focusNearestTrailDateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const currentCanvas = viewportNodeRef.current;
      if (!currentCanvas || !pathDays.length || !trailPoints.length) return;

      const rect = currentCanvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const viewportX = clientX - rect.left;
      const viewportY = clientY - rect.top;
      const stageX = (viewportX - viewportTransform.panX) / viewportTransform.zoom;
      const stageY = (viewportY - viewportTransform.panY) / viewportTransform.zoom;
      const localX = (stageX / rect.width) * canvasWidth;
      const localY = (stageY / rect.height) * canvasHeight;

      let bestIndex = 0;
      let bestScore = Number.POSITIVE_INFINITY;

      for (let index = 0; index < trailPoints.length; index += 1) {
        const point = trailPoints[index];
        const dx = point.x - localX;
        const dy = point.y - localY;
        const score = dx * dx + dy * dy * 1.18;
        if (score < bestScore) {
          bestScore = score;
          bestIndex = index;
        }
      }

      const targetDate = pathDays[bestIndex];
      if (targetDate && targetDate !== focusDate) {
        setFocusDate(targetDate);
      }
    },
    [
      canvasHeight,
      canvasWidth,
      focusDate,
      pathDays,
      setFocusDate,
      trailPoints,
      viewportTransform.panX,
      viewportTransform.panY,
      viewportTransform.zoom,
    ],
  );

  useEffect(() => {
    const requested = pendingCenterDateRef.current;
    const today = todayIsoLocal();
    if (!pathDays.length) return;

    let targetDate =
      requested && isIsoDate(requested)
        ? clampIsoToRange(requested, normalizedRange.start, normalizedRange.end)
        : clampIsoToRange(focusDate, normalizedRange.start, normalizedRange.end);

    if (!pathDays.includes(targetDate)) {
      targetDate = pathDays.includes(today) ? today : pathDays[0];
    }

    const resolvedFocus = targetDate;
    if (resolvedFocus !== focusDate) setFocusDate(resolvedFocus);
    setJumpDate(resolvedFocus);
    pendingCenterDateRef.current = null;
  }, [
    focusDate,
    normalizedRange.end,
    normalizedRange.start,
    pathDays,
    setFocusDate,
    setJumpDate,
  ]);

  const onPathPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      const target = event.target as Element | null;
      if (target?.closest("[data-event-button='1']")) return;
      const currentCanvas = viewportNodeRef.current;
      if (!currentCanvas) return;

      dragRef.current.active = true;
      dragRef.current.moved = false;
      dragRef.current.pointerId = event.pointerId;
      dragRef.current.startX = event.clientX;
      dragRef.current.startY = event.clientY;
      dragRef.current.startPanX = viewportTransform.panX;
      dragRef.current.startPanY = viewportTransform.panY;
      currentCanvas.setPointerCapture?.(event.pointerId);
    },
    [viewportTransform.panX, viewportTransform.panY],
  );

  const onPathPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragRef.current.active) return;
      const deltaX = event.clientX - dragRef.current.startX;
      const deltaY = event.clientY - dragRef.current.startY;
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) dragRef.current.moved = true;

      if (viewportTransform.zoom <= 1.01) return;

      const next = clampPanForFrame(
        dragRef.current.startPanX + deltaX,
        dragRef.current.startPanY + deltaY,
        viewportTransform.zoom,
      );
      setViewportTransform((prev) => ({
        ...prev,
        panX: next.panX,
        panY: next.panY,
      }));
    },
    [clampPanForFrame, viewportTransform.zoom],
  );

  const finishDrag = useCallback((pointerId: number) => {
    const canvas = viewportNodeRef.current;
    if (!dragRef.current.active) return;

    canvas?.releasePointerCapture?.(pointerId);
    if (dragRef.current.moved) {
      suppressClickUntilRef.current = Date.now() + 120;
    } else {
      focusNearestTrailDateFromPointer(dragRef.current.startX, dragRef.current.startY);
    }
    dragRef.current.active = false;
    dragRef.current.moved = false;
  }, [focusNearestTrailDateFromPointer]);

  const applyViewportWheel = useCallback(
    (clientX: number, clientY: number, deltaY: number) => {
      const currentFrame = viewportNodeRef.current;
      if (!currentFrame) return;
      const rect = currentFrame.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const pointerX = clientX - rect.left;
      const pointerY = clientY - rect.top;
      const zoomFactor = deltaY < 0 ? 1.1 : 0.9;

      setViewportTransform((prev) => {
        const nextZoom = clampRange(prev.zoom * zoomFactor, 1, 2.6);
        const worldX = (pointerX - prev.panX) / prev.zoom;
        const worldY = (pointerY - prev.panY) / prev.zoom;
        const unclampedPanX = pointerX - worldX * nextZoom;
        const unclampedPanY = pointerY - worldY * nextZoom;
        const nextPan = clampPanForFrame(unclampedPanX, unclampedPanY, nextZoom);
        return {
          zoom: nextZoom,
          panX: nextPan.panX,
          panY: nextPan.panY,
        };
      });
    },
    [clampPanForFrame],
  );

  useEffect(() => {
    if (!viewportNode) return;

    const nativeWheelHandler = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      applyViewportWheel(event.clientX, event.clientY, event.deltaY);
    };

    viewportNode.addEventListener("wheel", nativeWheelHandler, {
      passive: false,
      capture: true,
    });
    return () => {
      viewportNode.removeEventListener("wheel", nativeWheelHandler, {
        capture: true,
      });
    };
  }, [applyViewportWheel, viewportNode]);

  const resetViewport = useCallback(() => {
    setViewportTransform({ zoom: 1, panX: 0, panY: 0 });
  }, []);

  const setRangeToYear = useCallback(
    (year: number) => {
      const start = `${year}-01-01`;
      const end = `${year}-12-31`;
      const anchor = buildIsoForYearAnchor(year, focusDate);
      setDateFrom(start);
      setDateTo(end);
      pendingCenterDateRef.current = anchor;
    },
    [focusDate, setDateFrom, setDateTo],
  );

  const centerDate = useCallback(
    (iso: string) => {
      if (!isIsoDate(iso)) return;
      const targetYear = Number(iso.slice(0, 4));
      if (selectedYear !== targetYear) {
        setRangeToYear(targetYear);
        pendingCenterDateRef.current = iso;
        setJumpDate(iso);
        return;
      }

      const targetDate = pathDays.includes(iso)
        ? iso
        : clampIsoToRange(iso, normalizedRange.start, normalizedRange.end);
      setFocusDate(targetDate);
      setJumpDate(targetDate);
    },
    [
      normalizedRange.end,
      normalizedRange.start,
      pathDays,
      selectedYear,
      setFocusDate,
      setJumpDate,
      setRangeToYear,
    ],
  );

  const centerToday = useCallback(() => {
    const today = todayIsoLocal();
    const todayYear = Number(today.slice(0, 4));
    if (selectedYear !== todayYear) {
      setRangeToYear(todayYear);
      pendingCenterDateRef.current = today;
      return;
    }
    centerDate(today);
  }, [centerDate, selectedYear, setRangeToYear]);

  const snapSliderIndex = useCallback(
    (rawIndex: number) => {
      const maxIndex = Math.max(pathDays.length - 1, 0);
      const clamped = clampRange(Math.round(rawIndex), 0, maxIndex);
      if (!eventDayIndexes.length) return clamped;
      if (eventDayIndexSet.has(clamped)) return clamped;

      let nearest = clamped;
      let nearestDist = Number.POSITIVE_INFINITY;
      for (const eventIndex of eventDayIndexes) {
        const dist = Math.abs(eventIndex - clamped);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = eventIndex;
        }
      }

      if (nearestDist <= HOME_TRAIL_SLIDER_EVENT_SNAP_RADIUS) return nearest;
      return clamped;
    },
    [eventDayIndexSet, eventDayIndexes, pathDays.length],
  );

  useEffect(() => {
    if (loading) return;
    if (!pathDays.length) return;
    if (initialCenterDoneRef.current) return;

    const today = todayIsoLocal();
    initialCenterDoneRef.current = true;
    const targetDate = pathDays.includes(today)
      ? today
      : clampIsoToRange(today, normalizedRange.start, normalizedRange.end);
    setFocusDate(targetDate);
    setJumpDate(targetDate);
  }, [
    loading,
    normalizedRange.end,
    normalizedRange.start,
    pathDays,
    setFocusDate,
    setJumpDate,
  ]);

  return {
    viewportRef,
    viewportTransform,
    suppressClickUntilRef,
    onPathPointerDown,
    onPathPointerMove,
    finishDrag,
    setRangeToYear,
    centerToday,
    centerDate,
    snapSliderIndex,
    resetViewport,
  };
}
