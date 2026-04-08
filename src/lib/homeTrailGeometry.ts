import { trailEventAnchor, type HomeEventKind, type HomeSeasonTone } from "@/lib/homePageUtils";
import {
  HOME_VISIBLE_TRAIL_PATH_CONFIG,
  type HomeTrailPathConfig,
} from "@/lib/homeTrailPathConfig";
import {
  cubicSegmentsFromSvgPath,
  pathPointAtRatioOnSegments,
  resamplePathEquidistantPoints,
  type CubicPathSegment,
  type PathAnchor,
  type PathSamplePoint,
} from "@/lib/svgPathGeometry";

export type TrailAnchor = PathAnchor;

export type TrailPoint = PathSamplePoint;

export type TrailCurveSegment = CubicPathSegment;
export type TrailSlotExportPoint = {
  day: number;
  x: number;
  y: number;
  t: number;
  normalX: number;
  normalY: number;
};

export type TrailResolvedGeometry = {
  canvasWidth: number;
  canvasHeight: number;
  pathD: string;
  segments: TrailCurveSegment[];
  anchors: TrailAnchor[];
  summitPoint: TrailAnchor;
  summitLabelY: number;
  summitTreeTop: number;
  hillBackdropPath: string;
  seasonBands: Array<{
    season: HomeSeasonTone;
    label: string;
    top: number;
    bottom: number;
  }>;
};

export type RectBox = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type FocusDayLayoutLike = {
  point: TrailPoint;
  anchor?: { x: number; y: number };
  frame?: { width: number; height: number };
  primaryEvent: {
    kind: HomeEventKind;
  };
};

type TrailMarkerSpreadItem = {
  point: TrailPoint;
  anchor: { x: number; y: number };
  frame: { width: number; height: number };
};

export const HOME_TRAIL_CANVAS_WIDTH = HOME_VISIBLE_TRAIL_PATH_CONFIG.canvasWidth;
export const HOME_TRAIL_CANVAS_HEIGHT = HOME_VISIBLE_TRAIL_PATH_CONFIG.canvasHeight;
export const HOME_TRAIL_SLIDER_EVENT_SNAP_RADIUS = 2;

const HOME_TRAIL_APEX_Y = 58;
const HOME_TRAIL_APEX_X = 520;

export function clampRange(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function rectFromTopLeft(left: number, top: number, width: number, height: number): RectBox {
  return { left, top, right: left + width, bottom: top + height };
}

export function rectFromCenter(cx: number, cy: number, width: number, height: number): RectBox {
  return {
    left: cx - width / 2,
    top: cy - height / 2,
    right: cx + width / 2,
    bottom: cy + height / 2,
  };
}

export function rectOverlapArea(a: RectBox, b: RectBox) {
  const overlapW = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const overlapH = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return overlapW * overlapH;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function lerp(start: number, end: number, t: number) {
  return start + (end - start) * t;
}

function hillCenterXAtY(y: number, canvasHeight = HOME_TRAIL_CANVAS_HEIGHT, apexX = HOME_TRAIL_APEX_X, apexY = HOME_TRAIL_APEX_Y) {
  const normalized = clamp01((y - apexY) / Math.max(1, canvasHeight - apexY));
  const sway = Math.sin((1 - normalized) * Math.PI * 0.82) * 16;
  return apexX + sway;
}

function hillHalfWidthAtY(y: number, canvasHeight = HOME_TRAIL_CANVAS_HEIGHT, apexY = HOME_TRAIL_APEX_Y) {
  const normalized = clamp01((y - apexY) / Math.max(1, canvasHeight - apexY));
  const shoulder = Math.sin(normalized * Math.PI) * 26;
  return 92 + Math.pow(normalized, 0.82) * 520 + shoulder;
}

function buildHillBackdropPath(
  canvasWidth = HOME_TRAIL_CANVAS_WIDTH,
  canvasHeight = HOME_TRAIL_CANVAS_HEIGHT,
) {
  const steps = 36;
  const left: Array<{ x: number; y: number }> = [];
  const right: Array<{ x: number; y: number }> = [];
  const apexY = Math.max(24, canvasHeight * 0.05);
  const apexX = canvasWidth * 0.52;

  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const y = lerp(canvasHeight, apexY, t);
    const centerX = hillCenterXAtY(y, canvasHeight, apexX, apexY);
    const halfWidth = hillHalfWidthAtY(y, canvasHeight, apexY);
    left.push({ x: centerX - halfWidth, y });
    right.push({ x: centerX + halfWidth, y });
  }

  const pathParts: string[] = [];
  pathParts.push(`M ${left[0].x} ${left[0].y}`);
  for (let index = 1; index < left.length; index += 1) {
    pathParts.push(`L ${left[index].x} ${left[index].y}`);
  }
  for (let index = right.length - 1; index >= 0; index -= 1) {
    pathParts.push(`L ${right[index].x} ${right[index].y}`);
  }
  pathParts.push("Z");
  return pathParts.join(" ");
}

function trailAnchorsFromSegments(segments: TrailCurveSegment[]) {
  if (!segments.length) return [] as TrailAnchor[];
  const anchors: TrailAnchor[] = [segments[0].start];
  for (const segment of segments) {
    anchors.push(segment.end);
  }
  return anchors;
}

export function trailPointAtRatioOnCurve(segments: TrailCurveSegment[], ratio: number): TrailPoint {
  return pathPointAtRatioOnSegments(segments, ratio);
}

export function buildTrailPoints(count: number, segments: TrailCurveSegment[] = HOME_TRAIL_CURVE_SEGMENTS) {
  return resamplePathEquidistantPoints(segments, count);
}

export function buildTrailSlotsExport(
  count: number,
  segments: TrailCurveSegment[] = HOME_TRAIL_CURVE_SEGMENTS,
) {
  return buildTrailPoints(count, segments).map(
    (point, index) =>
      ({
        day: index + 1,
        x: Number(point.x.toFixed(2)),
        y: Number(point.y.toFixed(2)),
        t: Number(point.t.toFixed(6)),
        normalX: Number(point.normalX.toFixed(6)),
        normalY: Number(point.normalY.toFixed(6)),
      }) satisfies TrailSlotExportPoint,
  );
}

export function trailPerspectiveScale(avgY: number, canvasHeight = HOME_TRAIL_CANVAS_HEIGHT) {
  const normalized = Math.max(0, Math.min(1, avgY / canvasHeight));
  return 0.42 + Math.pow(normalized, 1.46) * 0.8;
}

function trailUsableHalfWidthAtY(y: number, canvasHeight = HOME_TRAIL_CANVAS_HEIGHT) {
  const scale = trailPerspectiveScale(y, canvasHeight);
  const innerWidth = 14 + scale * 20;
  return innerWidth / 2;
}

function buildClusterLanePattern(size: number) {
  if (size <= 1) return [0];
  if (size % 2 === 0) {
    return Array.from({ length: size }, (_, index) => {
      const step = Math.floor(index / 2) + 0.5;
      return index % 2 === 0 ? -step : step;
    });
  }

  const pattern = [0];
  for (let step = 1; pattern.length < size; step += 1) {
    pattern.push(-step);
    if (pattern.length < size) pattern.push(step);
  }
  return pattern;
}

export function computeTrailMarkerSpreadOffsets(
  items: TrailMarkerSpreadItem[],
  canvasHeight = HOME_TRAIL_CANVAS_HEIGHT,
) {
  if (items.length <= 1) return items.map(() => 0);

  const offsets = items.map(() => 0);
  const clusterThresholdFor = (left: TrailMarkerSpreadItem, right: TrailMarkerSpreadItem) => {
    const dx = right.anchor.x - left.anchor.x;
    const dy = right.anchor.y - left.anchor.y;
    const distance = Math.hypot(dx, dy);
    const frameThreshold = Math.max(
      52,
      Math.min(94, (left.frame.width + right.frame.width) * 0.82),
    );
    const pathGap = Math.abs(right.point.t - left.point.t);
    return distance <= frameThreshold && pathGap <= 0.18;
  };

  const applyCluster = (start: number, end: number) => {
    const clusterSize = end - start + 1;
    if (clusterSize <= 1) return;
    const pattern = buildClusterLanePattern(clusterSize);
    const maxPattern = Math.max(...pattern.map((value) => Math.abs(value)), 1);
    const safeHalfWidth = Math.min(
      ...items.slice(start, end + 1).map((item) =>
        Math.max(4.5, Math.min(13.5, trailUsableHalfWidthAtY(item.point.y, canvasHeight) - 3)),
      ),
    );
    const step = safeHalfWidth / maxPattern;

    for (let index = start; index <= end; index += 1) {
      offsets[index] = pattern[index - start] * step;
    }
  };

  let clusterStart = 0;
  for (let index = 1; index <= items.length; index += 1) {
    const keepClustering =
      index < items.length && clusterThresholdFor(items[index - 1], items[index]);
    if (keepClustering) continue;
    applyCluster(clusterStart, index - 1);
    clusterStart = index;
  }

  return offsets;
}

export function computeFocusAvatarOffset({
  trailPoints,
  focusIndex,
  focusTrailPoint,
  focusDayLayout,
  cardSide,
  canvasWidth = HOME_TRAIL_CANVAS_WIDTH,
  canvasHeight = HOME_TRAIL_CANVAS_HEIGHT,
}: {
  trailPoints: TrailPoint[];
  focusIndex: number;
  focusTrailPoint: { x: number; y: number };
  focusDayLayout: FocusDayLayoutLike | null;
  cardSide: "left" | "right" | null;
  canvasWidth?: number;
  canvasHeight?: number;
}) {
  if (!trailPoints.length) return { x: -40, y: 22 };

  const prev = trailPoints[Math.max(0, focusIndex - 1)] ?? focusTrailPoint;
  const next = trailPoints[Math.min(trailPoints.length - 1, focusIndex + 1)] ?? focusTrailPoint;
  const dx = next.x - prev.x;
  const dy = next.y - prev.y;
  const length = Math.hypot(dx, dy) || 1;
  const tx = dx / length;
  const ty = dy / length;
  const px = -dy / length;
  const py = dx / length;

  let nx = -tx * 34;
  let ny = -ty * 34;

  if (cardSide) {
    const sideSign = cardSide === "left" ? 1 : -1;
    nx += px * 16 * sideSign;
    ny += py * 16 * sideSign;
  }

  if (focusDayLayout) {
    const eventAnchor =
      focusDayLayout.anchor ??
      trailEventAnchor(focusDayLayout.point, focusDayLayout.primaryEvent.kind);
    const avatarX = focusTrailPoint.x + nx;
    const avatarY = focusTrailPoint.y + ny;
    const vx = avatarX - eventAnchor.x;
    const vy = avatarY - eventAnchor.y;
    const dist = Math.hypot(vx, vy);
    const minDist = 76;
    if (dist < minDist) {
      const safeDist = dist || 1;
      const bump = (minDist - safeDist) / safeDist;
      nx += vx * bump;
      ny += vy * bump;
    }
  }

  const maxOffset = 46;
  const norm = Math.hypot(nx, ny) || 1;
  if (norm > maxOffset) {
    nx = (nx / norm) * maxOffset;
    ny = (ny / norm) * maxOffset;
  }

  const maxY = canvasHeight - 120;
  const minY = 62;
  const maxX = canvasWidth - 42;
  const minX = 42;

  const avatarX = focusTrailPoint.x + nx;
  const avatarY = focusTrailPoint.y + ny;

  if (avatarY > maxY) ny -= avatarY - maxY;
  if (avatarY < minY) ny += minY - avatarY;
  if (avatarX > maxX) nx -= avatarX - maxX;
  if (avatarX < minX) nx += minX - avatarX;

  return { x: nx, y: ny + 6 };
}

export const HOME_TRAIL_PATH_D = HOME_VISIBLE_TRAIL_PATH_CONFIG.pathD;
export const HOME_TRAIL_CURVE_SEGMENTS: TrailCurveSegment[] =
  cubicSegmentsFromSvgPath(HOME_TRAIL_PATH_D);
export const HOME_TRAIL_ANCHORS: TrailAnchor[] =
  trailAnchorsFromSegments(HOME_TRAIL_CURVE_SEGMENTS);
export const HOME_TRAIL_DAY_SLOTS_365 = buildTrailSlotsExport(365, HOME_TRAIL_CURVE_SEGMENTS);
export const HOME_SUMMIT_POINT: TrailAnchor =
  HOME_TRAIL_ANCHORS[HOME_TRAIL_ANCHORS.length - 1] ?? {
    x: HOME_TRAIL_APEX_X,
    y: HOME_TRAIL_APEX_Y,
  };
export const HOME_SUMMIT_LABEL_Y = Math.max(24, HOME_SUMMIT_POINT.y - 18);
export const HOME_SUMMIT_TREE_TOP = Math.max(-96, HOME_SUMMIT_POINT.y - 156);

export const HOME_HILL_BACKDROP_PATH =
  HOME_VISIBLE_TRAIL_PATH_CONFIG.hillBackdropPath?.trim() || buildHillBackdropPath();

export const HOME_TRAIL_BANDS: Array<{
  season: HomeSeasonTone;
  label: string;
  top: number;
  bottom: number;
}> =
  HOME_VISIBLE_TRAIL_PATH_CONFIG.seasonBands ?? [
    { season: "autumn", label: "Otoño", top: 76, bottom: HOME_TRAIL_CANVAS_HEIGHT * 0.26 },
    { season: "summer", label: "Verano", top: HOME_TRAIL_CANVAS_HEIGHT * 0.26, bottom: HOME_TRAIL_CANVAS_HEIGHT * 0.49 },
    { season: "spring", label: "Primavera", top: HOME_TRAIL_CANVAS_HEIGHT * 0.49, bottom: HOME_TRAIL_CANVAS_HEIGHT * 0.74 },
    { season: "winter", label: "Invierno", top: HOME_TRAIL_CANVAS_HEIGHT * 0.74, bottom: HOME_TRAIL_CANVAS_HEIGHT },
  ];

export function resolveTrailGeometry(
  config?: Pick<HomeTrailPathConfig, "canvasWidth" | "canvasHeight" | "pathD" | "hillBackdropPath" | "seasonBands"> | null,
): TrailResolvedGeometry {
  const canvasWidth = Math.max(100, Number(config?.canvasWidth ?? HOME_TRAIL_CANVAS_WIDTH));
  const canvasHeight = Math.max(100, Number(config?.canvasHeight ?? HOME_TRAIL_CANVAS_HEIGHT));
  const pathD = String(config?.pathD ?? HOME_TRAIL_PATH_D).trim() || HOME_TRAIL_PATH_D;
  const segments = cubicSegmentsFromSvgPath(pathD);
  const anchors = trailAnchorsFromSegments(segments);
  const summitPoint =
    anchors[anchors.length - 1] ?? {
      x: canvasWidth * 0.52,
      y: Math.max(24, canvasHeight * 0.05),
    };
  const summitLabelY = Math.max(24, summitPoint.y - 18);
  const summitTreeTop = Math.max(-96, summitPoint.y - 156);
  const seasonBands =
    config?.seasonBands ?? [
      { season: "autumn", label: "Otoño", top: 76, bottom: canvasHeight * 0.26 },
      { season: "summer", label: "Verano", top: canvasHeight * 0.26, bottom: canvasHeight * 0.49 },
      { season: "spring", label: "Primavera", top: canvasHeight * 0.49, bottom: canvasHeight * 0.74 },
      { season: "winter", label: "Invierno", top: canvasHeight * 0.74, bottom: canvasHeight },
    ];

  return {
    canvasWidth,
    canvasHeight,
    pathD,
    segments,
    anchors,
    summitPoint,
    summitLabelY,
    summitTreeTop,
    hillBackdropPath:
      String(config?.hillBackdropPath ?? "").trim() ||
      buildHillBackdropPath(canvasWidth, canvasHeight),
    seasonBands,
  };
}
