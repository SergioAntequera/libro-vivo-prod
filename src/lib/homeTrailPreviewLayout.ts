import {
  clampRange,
  rectFromCenter,
  rectFromTopLeft,
  rectOverlapArea,
  type RectBox,
  type TrailPoint,
} from "@/lib/homeTrailGeometry";

export type TrailDayPreviewLayout = {
  iso: string;
  anchor: { x: number; y: number };
  frame: { width: number; height: number };
};

export type ActiveTrailPreviewCardPos = {
  side: "left" | "right";
  vertical: "above" | "below";
  leftPct: number;
  topPct: number;
};

type ComputeActiveTrailPreviewCardPosInput = {
  hasActivePreview: boolean;
  focusTrailPoint: TrailPoint;
  focusEventAnchor: { x: number; y: number };
  focusEventFrame: { width: number; height: number };
  focusAvatarBasePoint: { x: number; y: number };
  trailDayVisualLayouts: TrailDayPreviewLayout[];
  pathDayIndexByIso: Map<string, number>;
  focusIndex: number;
  canvasWidth: number;
  canvasHeight: number;
  summitPoint: { x: number; y: number };
};

export function computeActiveTrailPreviewCardPos(
  input: ComputeActiveTrailPreviewCardPosInput,
): ActiveTrailPreviewCardPos | null {
  const {
    hasActivePreview,
    focusTrailPoint,
    focusEventAnchor,
    focusEventFrame,
    focusAvatarBasePoint,
    trailDayVisualLayouts,
    pathDayIndexByIso,
    focusIndex,
    canvasWidth,
    canvasHeight,
    summitPoint,
  } = input;

  if (!hasActivePreview) return null;

  const cardWidth = 312;
  const cardHeight = 170;
  const minLeft = 18;
  const maxLeft = canvasWidth - cardWidth - 18;
  const minTop = 18;
  const maxTop = canvasHeight - cardHeight - 90;
  const sides: Array<"left" | "right"> =
    focusTrailPoint.x > canvasWidth * 0.58 ? ["left", "right"] : ["right", "left"];
  const verticals: Array<"above" | "below"> =
    focusTrailPoint.y < canvasHeight * 0.24 ? ["below", "above"] : ["above", "below"];

  const focusRect = rectFromCenter(
    focusEventAnchor.x,
    focusEventAnchor.y,
    focusEventFrame.width + 24,
    focusEventFrame.height + 20,
  );
  const avatarRect = rectFromCenter(
    focusAvatarBasePoint.x,
    focusAvatarBasePoint.y,
    72,
    46,
  );
  const summitRect = rectFromCenter(summitPoint.x, summitPoint.y + 42, 266, 126);

  const nearbyEventRects: RectBox[] = [];
  trailDayVisualLayouts.forEach((day) => {
    const dayIndex = pathDayIndexByIso.get(day.iso);
    if (dayIndex == null) return;
    if (Math.abs(dayIndex - focusIndex) > 24) return;
    if (dayIndex === focusIndex) return;
    nearbyEventRects.push(
      rectFromCenter(day.anchor.x, day.anchor.y, day.frame.width + 10, day.frame.height + 10),
    );
  });

  let best: {
    side: "left" | "right";
    vertical: "above" | "below";
    left: number;
    top: number;
    score: number;
  } | null = null;

  for (const side of sides) {
    for (const vertical of verticals) {
      for (const xGap of [30, 44, 60]) {
        for (const yGap of [28, 40]) {
          const rawLeft =
            side === "left"
              ? focusEventAnchor.x - cardWidth - xGap
              : focusEventAnchor.x + xGap;
          const rawTop =
            vertical === "above"
              ? focusEventAnchor.y - cardHeight - yGap
              : focusEventAnchor.y + yGap;
          const left = clampRange(rawLeft, minLeft, maxLeft);
          const top = clampRange(rawTop, minTop, maxTop);
          const rect = rectFromTopLeft(left, top, cardWidth, cardHeight);
          const edgePenalty = Math.abs(left - rawLeft) * 0.82 + Math.abs(top - rawTop) * 0.9;

          let overlapPenalty = 0;
          overlapPenalty += rectOverlapArea(rect, focusRect) * 8.8;
          overlapPenalty += rectOverlapArea(rect, avatarRect) * 10.2;
          overlapPenalty += rectOverlapArea(rect, summitRect) * 3.6;
          for (const nearby of nearbyEventRects) {
            overlapPenalty += rectOverlapArea(rect, nearby) * 2.2;
          }

          const centerX = left + cardWidth / 2;
          const centerY = top + cardHeight / 2;
          const distPenalty =
            Math.hypot(centerX - focusEventAnchor.x, centerY - focusEventAnchor.y) * 0.038;

          const score = overlapPenalty + edgePenalty + distPenalty;
          if (!best || score < best.score) {
            best = { side, vertical, left, top, score };
          }
        }
      }
    }
  }

  if (!best) return null;

  return {
    side: best.side,
    vertical: best.vertical,
    leftPct: (best.left / canvasWidth) * 100,
    topPct: (best.top / canvasHeight) * 100,
  };
}
