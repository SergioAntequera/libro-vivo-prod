"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { clampNumber } from "@/lib/forestPageUtils";

type ForestContentBounds = {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
};

type ForestZone = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
};

type ForestPlacement = {
  year: number;
  x: number;
  y: number;
};

type UseForestViewportControllerParams = {
  forestCanvasWidth: number;
  forestCanvasHeight: number;
  forestContentBounds: ForestContentBounds;
  forestZones: ForestZone[];
  forestZoneCount: number;
  forestZoneCapacity: number;
  annualTreeYears: number[];
  orchardPlacements: ForestPlacement[];
  minZoom: number;
  maxZoom: number;
};

export function useForestViewportController(
  params: UseForestViewportControllerParams,
) {
  const {
    forestCanvasWidth,
    forestCanvasHeight,
    forestContentBounds,
    forestZones,
    forestZoneCount,
    forestZoneCapacity,
    annualTreeYears,
    orchardPlacements,
    minZoom,
    maxZoom,
  } = params;

  const [forestZoom, setForestZoom] = useState(1);
  const [forestActiveZoneState, setForestActiveZoneState] = useState(0);
  const [highlightedTreeYears, setHighlightedTreeYears] = useState<number[]>([]);

  const forestViewportRef = useRef<HTMLDivElement | null>(null);
  const forestHighlightTimeoutRef = useRef<number | null>(null);
  const forestDragRef = useRef({
    active: false,
    moved: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    startScrollTop: 0,
  });
  const suppressForestClickUntilRef = useRef(0);

  function scaledForestWidth(zoom: number) {
    return Math.round(forestCanvasWidth * zoom);
  }

  function scaledForestHeight(zoom: number) {
    return Math.round(forestCanvasHeight * zoom);
  }

  const maxForestActiveZone = Math.max(0, forestZoneCount - 1);
  const forestActiveZone = clampNumber(forestActiveZoneState, 0, maxForestActiveZone);
  const forestScaledWidth = scaledForestWidth(forestZoom);
  const forestScaledHeight = scaledForestHeight(forestZoom);

  function computeForestZoneFitZoom(zoneIndex = 0) {
    const viewport = forestViewportRef.current;
    if (!viewport) return 1;
    const zone = forestZones[zoneIndex];
    const targetWidth =
      zone != null
        ? zone.right - zone.left + (forestZoneCount > 1 ? 132 : 108)
        : forestContentBounds.width + 108;
    const targetHeight =
      zone != null
        ? zone.bottom - zone.top + 130
        : forestContentBounds.height + 120;
    const fitX = (viewport.clientWidth - 24) / targetWidth;
    const fitY = (viewport.clientHeight - 24) / targetHeight;
    return clampNumber(Math.min(fitX, fitY), forestZoneCount > 1 ? 0.9 : 0.98, maxZoom);
  }

  function computeForestOverviewZoom() {
    const viewport = forestViewportRef.current;
    if (!viewport) return 1;
    const fitX = (viewport.clientWidth - 24) / (forestContentBounds.width + 120);
    const fitY = (viewport.clientHeight - 20) / (forestContentBounds.height + 130);
    return clampNumber(Math.min(1, fitX, fitY), minZoom, maxZoom);
  }

  function centerForestViewport(nextZoom = forestZoom) {
    const viewport = forestViewportRef.current;
    if (!viewport) return;
    viewport.scrollLeft = Math.max(
      0,
      forestContentBounds.centerX * nextZoom - viewport.clientWidth / 2,
    );
    viewport.scrollTop = Math.max(
      0,
      forestContentBounds.centerY * nextZoom - viewport.clientHeight / 2,
    );
  }

  function pulseForestYears(years: number[]) {
    if (forestHighlightTimeoutRef.current != null) {
      window.clearTimeout(forestHighlightTimeoutRef.current);
    }
    setHighlightedTreeYears(years);
    forestHighlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightedTreeYears([]);
      forestHighlightTimeoutRef.current = null;
    }, 1650);
  }

  function focusForestZone(
    zoneIndex: number,
    nextZoom = computeForestZoneFitZoom(zoneIndex),
    yearsToHighlight: number[] = [],
  ) {
    const zone = forestZones[zoneIndex];
    if (!zone) return;
    const clampedZoom = clampNumber(nextZoom, minZoom, maxZoom);
    setForestActiveZoneState(zoneIndex);
    setForestZoom(clampedZoom);
    if (yearsToHighlight.length) {
      pulseForestYears(yearsToHighlight);
    }
    requestAnimationFrame(() => {
      const viewport = forestViewportRef.current;
      if (!viewport) return;
      viewport.scrollLeft = Math.max(0, zone.centerX * clampedZoom - viewport.clientWidth / 2);
      viewport.scrollTop = Math.max(0, zone.centerY * clampedZoom - viewport.clientHeight / 2);
    });
  }

  function focusForestYear(year: number) {
    const tree = orchardPlacements.find((entry) => entry.year === year);
    if (!tree) return;
    const yearIndex = annualTreeYears.findIndex((value) => value === year);
    const zoneIndex =
      yearIndex >= 0
        ? clampNumber(Math.floor(yearIndex / forestZoneCapacity), 0, maxForestActiveZone)
        : forestActiveZone;
    const nextZoom =
      zoneIndex === forestActiveZone
        ? Math.max(forestZoom, computeForestZoneFitZoom(zoneIndex))
        : computeForestZoneFitZoom(zoneIndex);
    setForestActiveZoneState(zoneIndex);
    setForestZoom(nextZoom);
    pulseForestYears([year]);
    requestAnimationFrame(() => {
      const viewport = forestViewportRef.current;
      if (!viewport) return;
      viewport.scrollLeft = Math.max(0, tree.x * nextZoom - viewport.clientWidth / 2);
      viewport.scrollTop = Math.max(0, tree.y * nextZoom - viewport.clientHeight / 2);
    });
  }

  function fitForestViewport(mode: "zone" | "overview" = "zone") {
    const zoneIndex = forestActiveZone;
    const next =
      mode === "overview"
        ? computeForestOverviewZoom()
        : forestZoneCount > 1
          ? computeForestZoneFitZoom(zoneIndex)
          : Math.max(0.98, computeForestZoneFitZoom());
    setForestZoom(next);
    requestAnimationFrame(() => {
      if (mode === "zone" && forestZoneCount > 1) {
        focusForestZone(zoneIndex, next);
        return;
      }
      centerForestViewport(next);
    });
  }

  function onForestPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const viewport = forestViewportRef.current;
    if (!viewport) return;
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest('[data-forest-tree-button="true"]')
    ) {
      return;
    }

    forestDragRef.current.active = true;
    forestDragRef.current.moved = false;
    forestDragRef.current.pointerId = event.pointerId;
    forestDragRef.current.startX = event.clientX;
    forestDragRef.current.startY = event.clientY;
    forestDragRef.current.startScrollLeft = viewport.scrollLeft;
    forestDragRef.current.startScrollTop = viewport.scrollTop;
    viewport.setPointerCapture?.(event.pointerId);
  }

  function onForestPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!forestDragRef.current.active) return;
    const viewport = forestViewportRef.current;
    if (!viewport) return;

    const deltaX = event.clientX - forestDragRef.current.startX;
    const deltaY = event.clientY - forestDragRef.current.startY;
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      forestDragRef.current.moved = true;
    }
    viewport.scrollLeft = forestDragRef.current.startScrollLeft - deltaX;
    viewport.scrollTop = forestDragRef.current.startScrollTop - deltaY;
  }

  function finishForestDrag(pointerId: number) {
    const viewport = forestViewportRef.current;
    if (!viewport || !forestDragRef.current.active) return;
    viewport.releasePointerCapture?.(pointerId);
    if (forestDragRef.current.moved) {
      suppressForestClickUntilRef.current = Date.now() + 140;
    }
    forestDragRef.current.active = false;
    forestDragRef.current.moved = false;
  }

  function isForestTreeClickSuppressed() {
    return Date.now() < suppressForestClickUntilRef.current;
  }

  function clearForestHighlights() {
    setHighlightedTreeYears([]);
  }

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const viewport = forestViewportRef.current;
      if (!viewport) return;

      const zoneIndex = forestActiveZone;
      const zone = forestZones[zoneIndex];
      const targetWidth =
        zone != null
          ? zone.right - zone.left + (forestZoneCount > 1 ? 132 : 108)
          : forestContentBounds.width + 108;
      const targetHeight =
        zone != null
          ? zone.bottom - zone.top + 130
          : forestContentBounds.height + 120;
      const fitX = (viewport.clientWidth - 24) / targetWidth;
      const fitY = (viewport.clientHeight - 24) / targetHeight;
      const next = clampNumber(Math.min(fitX, fitY), forestZoneCount > 1 ? 0.9 : 0.98, maxZoom);

      setForestZoom(next);

      requestAnimationFrame(() => {
        const nextViewport = forestViewportRef.current;
        if (!nextViewport) return;

        if (forestZoneCount > 1 && zone) {
          nextViewport.scrollLeft = Math.max(
            0,
            zone.centerX * next - nextViewport.clientWidth / 2,
          );
          nextViewport.scrollTop = Math.max(
            0,
            zone.centerY * next - nextViewport.clientHeight / 2,
          );
          return;
        }

        nextViewport.scrollLeft = Math.max(
          0,
          forestContentBounds.centerX * next - nextViewport.clientWidth / 2,
        );
        nextViewport.scrollTop = Math.max(
          0,
          forestContentBounds.centerY * next - nextViewport.clientHeight / 2,
        );
      });
    });
    return () => cancelAnimationFrame(id);
  }, [
    forestActiveZone,
    forestCanvasHeight,
    forestCanvasWidth,
    forestContentBounds.centerX,
    forestContentBounds.centerY,
    forestContentBounds.height,
    forestContentBounds.width,
    forestZoneCount,
    forestZones,
    maxZoom,
  ]);

  useEffect(() => {
    return () => {
      if (forestHighlightTimeoutRef.current != null) {
        window.clearTimeout(forestHighlightTimeoutRef.current);
      }
    };
  }, []);

  function setForestActiveZone(nextValue: number) {
    setForestActiveZoneState(clampNumber(nextValue, 0, maxForestActiveZone));
  }

  return {
    forestViewportRef,
    forestZoom,
    setForestZoom,
    forestActiveZone,
    setForestActiveZone,
    highlightedTreeYears,
    clearForestHighlights,
    forestScaledWidth,
    forestScaledHeight,
    computeForestZoneFitZoom,
    focusForestZone,
    focusForestYear,
    fitForestViewport,
    onForestPointerDown,
    onForestPointerMove,
    finishForestDrag,
    isForestTreeClickSuppressed,
  };
}
