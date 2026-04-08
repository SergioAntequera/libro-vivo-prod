export type GuideLine = { x1: number; y1: number; x2: number; y2: number };

export type StageSize = { width: number; height: number };

export type Box2D = { x: number; y: number; w: number; h: number };

export type ObjectBox = Box2D & { id: string };

export type MultiDragState = {
  ids: string[];
  anchorId: string;
  anchorStart: { x: number; y: number };
  startPos: Record<string, { x: number; y: number }>;
  sizes: Record<string, { w: number; h: number }>;
  boundsOffset: Record<string, { x: number; y: number }>;
  centerSnap: boolean;
};

type AnyObject = {
  id?: unknown;
  type?: unknown;
  x?: unknown;
  y?: unknown;
  rotation?: unknown;
  locked?: boolean | undefined;
  scale?: unknown;
  fontSize?: unknown;
  width?: unknown;
  height?: unknown;
};

function num(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function idOf(value: unknown) {
  const id = String(value ?? "").trim();
  return id.length > 0 ? id : "";
}

export function getBoxForObject(obj: AnyObject): ObjectBox {
  const id = idOf(obj?.id);
  const x = num(obj?.x, 0);
  const y = num(obj?.y, 0);
  const type = String(obj?.type ?? "").trim();

  if (type === "sticker") {
    const scale = num(obj?.scale, 1);
    const side = 96 * scale;
    return { id, x, y, w: side, h: side };
  }

  if (type === "text") {
    const w = num(obj?.width, 260);
    const h = num(obj?.fontSize, 28) * 1.4;
    return { id, x, y, w, h };
  }

  if (type === "photo") {
    const w = num(obj?.width, 300);
    const h = num(obj?.height, 200);
    return { id, x, y, w, h };
  }

  if (type === "video") {
    const w = num(obj?.width, 320);
    const h = num(obj?.height, 220);
    return { id, x, y, w, h };
  }

  return { id, x, y, w: 100, h: 100 };
}

export function getAnchorsForBox(box: Box2D, centerOnly: boolean) {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  if (centerOnly) return { xs: [cx], ys: [cy] };
  return { xs: [box.x, cx, box.x + box.w], ys: [box.y, cy, box.y + box.h] };
}

export function shiftBox(box: Box2D, dx: number, dy: number): Box2D {
  return { x: box.x + dx, y: box.y + dy, w: box.w, h: box.h };
}

export function snapDeltaToGrid(
  box: Box2D,
  dx: number,
  dy: number,
  centerOnly: boolean,
  grid: number,
  snapToGrid: (value: number, gridSize: number) => number,
) {
  const shifted = shiftBox(box, dx, dy);
  const anchorX = centerOnly ? shifted.x + shifted.w / 2 : shifted.x;
  const anchorY = centerOnly ? shifted.y + shifted.h / 2 : shifted.y;
  return {
    dx: dx + (snapToGrid(anchorX, grid) - anchorX),
    dy: dy + (snapToGrid(anchorY, grid) - anchorY),
  };
}

export function clampDeltaForBox(
  box: Box2D,
  dx: number,
  dy: number,
  stageSize: StageSize,
) {
  let nextDx = dx;
  let nextDy = dy;

  let bx = box.x + nextDx;
  let by = box.y + nextDy;

  if (bx < 0) nextDx += -bx;
  bx = box.x + nextDx;
  if (bx + box.w > stageSize.width) nextDx -= bx + box.w - stageSize.width;

  if (by < 0) nextDy += -by;
  by = box.y + nextDy;
  if (by + box.h > stageSize.height) nextDy -= by + box.h - stageSize.height;

  return { dx: nextDx, dy: nextDy };
}

export function computeGuides(params: {
  box: Box2D;
  draggingId: string;
  objects: AnyObject[];
  stageSize: StageSize;
  snapTol: number;
  snapToObjectsEnabled: boolean;
  excludedIds?: Set<string>;
  movingCenterOnly?: boolean;
  getSnapBoxForObject: (obj: AnyObject) => ObjectBox;
  shouldCenterSnapForObject: (obj: AnyObject) => boolean;
}) {
  const {
    box,
    draggingId,
    objects,
    stageSize,
    snapTol,
    snapToObjectsEnabled,
    excludedIds,
    movingCenterOnly,
    getSnapBoxForObject,
    shouldCenterSnapForObject,
  } = params;

  const targetsX = new Set<number>([0, stageSize.width / 2, stageSize.width]);
  const targetsY = new Set<number>([0, stageSize.height / 2, stageSize.height]);

  if (snapToObjectsEnabled) {
    for (const object of objects) {
      const objectId = idOf(object?.id);
      if (!objectId || objectId === draggingId) continue;
      if (excludedIds?.has(objectId)) continue;
      const objectBox = getSnapBoxForObject(object);
      const targetAnchors = getAnchorsForBox(
        objectBox,
        shouldCenterSnapForObject(object),
      );
      for (const x of targetAnchors.xs) targetsX.add(x);
      for (const y of targetAnchors.ys) targetsY.add(y);
    }
  }

  const out: GuideLine[] = [];
  const movingAnchors = getAnchorsForBox(box, Boolean(movingCenterOnly));
  const xs = movingAnchors.xs;
  const ys = movingAnchors.ys;

  let bestDx: number | null = null;
  let bestXLine: number | null = null;
  for (const target of targetsX.values()) {
    for (const x of xs) {
      const delta = target - x;
      if (Math.abs(delta) <= snapTol) {
        if (bestDx === null || Math.abs(delta) < Math.abs(bestDx)) {
          bestDx = delta;
          bestXLine = target;
        }
      }
    }
  }

  let bestDy: number | null = null;
  let bestYLine: number | null = null;
  for (const target of targetsY.values()) {
    for (const y of ys) {
      const delta = target - y;
      if (Math.abs(delta) <= snapTol) {
        if (bestDy === null || Math.abs(delta) < Math.abs(bestDy)) {
          bestDy = delta;
          bestYLine = target;
        }
      }
    }
  }

  if (bestXLine !== null) {
    out.push({ x1: bestXLine, y1: 0, x2: bestXLine, y2: stageSize.height });
  }
  if (bestYLine !== null) {
    out.push({ x1: 0, y1: bestYLine, x2: stageSize.width, y2: bestYLine });
  }

  return {
    guides: out,
    dx: bestDx ?? 0,
    dy: bestDy ?? 0,
    hit: out.length > 0,
  };
}

export function buildMultiDragState(params: {
  anchorId: string;
  anchorStart: { x: number; y: number };
  selectedIds: string[];
  objects: AnyObject[];
  isLocked: (obj: AnyObject | null | undefined) => boolean;
  getSnapBoxForObject: (obj: AnyObject) => ObjectBox;
  shouldCenterSnapForObject: (obj: AnyObject) => boolean;
}) {
  const {
    anchorId,
    anchorStart,
    selectedIds,
    objects,
    isLocked,
    getSnapBoxForObject,
    shouldCenterSnapForObject,
  } = params;

  const ids = selectedIds.filter((selectedId) => {
    const obj = objects.find((candidate) => idOf(candidate?.id) === selectedId);
    return Boolean(obj) && !isLocked(obj);
  });

  if (ids.length <= 1 || !ids.includes(anchorId)) return null;

  const startPos: Record<string, { x: number; y: number }> = {};
  const sizes: Record<string, { w: number; h: number }> = {};
  const boundsOffset: Record<string, { x: number; y: number }> = {};

  for (const selectedId of ids) {
    const obj = objects.find((candidate) => idOf(candidate?.id) === selectedId);
    if (!obj) continue;

    const ox = num(obj.x, 0);
    const oy = num(obj.y, 0);
    startPos[selectedId] = { x: ox, y: oy };

    const box = getSnapBoxForObject(obj);
    sizes[selectedId] = { w: box.w, h: box.h };
    boundsOffset[selectedId] = { x: box.x - ox, y: box.y - oy };
  }

  if (!startPos[anchorId]) return null;

  const centerSnap = ids.some((selectedId) => {
    const obj = objects.find((candidate) => idOf(candidate?.id) === selectedId);
    return obj ? shouldCenterSnapForObject(obj) : false;
  });

  return {
    ids: Object.keys(startPos),
    anchorId,
    anchorStart,
    startPos,
    sizes,
    boundsOffset,
    centerSnap,
  } satisfies MultiDragState;
}

export function getMultiDragBounds(
  ctx: MultiDragState,
  dx: number,
  dy: number,
): Box2D {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const id of ctx.ids) {
    const position = ctx.startPos[id];
    const size = ctx.sizes[id];
    const offset = ctx.boundsOffset[id] ?? { x: 0, y: 0 };
    if (!position || !size) continue;
    const x = position.x + dx + offset.x;
    const y = position.y + dy + offset.y;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + size.w);
    maxY = Math.max(maxY, y + size.h);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function clampMultiDragDelta(
  ctx: MultiDragState,
  dx: number,
  dy: number,
  stageSize: StageSize,
  clamp: (value: number, min: number, max: number) => number,
) {
  let minDx = Number.NEGATIVE_INFINITY;
  let maxDx = Number.POSITIVE_INFINITY;
  let minDy = Number.NEGATIVE_INFINITY;
  let maxDy = Number.POSITIVE_INFINITY;

  for (const id of ctx.ids) {
    const position = ctx.startPos[id];
    const size = ctx.sizes[id];
    const offset = ctx.boundsOffset[id] ?? { x: 0, y: 0 };
    if (!position || !size) continue;
    minDx = Math.max(minDx, -(position.x + offset.x));
    maxDx = Math.min(maxDx, stageSize.width - size.w - position.x - offset.x);
    minDy = Math.max(minDy, -(position.y + offset.y));
    maxDy = Math.min(maxDy, stageSize.height - size.h - position.y - offset.y);
  }

  return {
    dx: clamp(dx, minDx, maxDx),
    dy: clamp(dy, minDy, maxDy),
  };
}
