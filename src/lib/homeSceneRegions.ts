export type SceneRegionPoint = {
  x: number;
  y: number;
};

export type SceneRegionAnchor = {
  id: string;
  label: string;
  x: number;
  y: number;
};

export type SceneRegionKind =
  | "milestone_tree"
  | "flower_area"
  | "object_area"
  | "character_area"
  | "event_area"
  | "allowed"
  | "forbidden"
  | "custom";

export type SceneRegionPlacementMode =
  | "manual"
  | "anchors_in_order"
  | "centroid"
  | "random_inside"
  | "random_poisson";

export type SceneRegion = {
  id: string;
  name: string;
  kind: SceneRegionKind;
  enabled: boolean;
  placementMode: SceneRegionPlacementMode;
  capacity: number | null;
  points: SceneRegionPoint[];
  anchors: SceneRegionAnchor[];
  metadata: {
    tags: string[];
    notes: string | null;
    allowedKinds: string[];
  };
};

export type SceneRegionPlacementItem = {
  id: string;
  preferredRegionId?: string | null;
};

export type SceneRegionPlacementResult<TItem extends SceneRegionPlacementItem> = {
  item: TItem;
  regionId: string;
  point: SceneRegionPoint;
  placementMode: SceneRegionPlacementMode;
};

const DEFAULT_REGION_KIND: SceneRegionKind = "custom";
const DEFAULT_PLACEMENT_MODE: SceneRegionPlacementMode = "manual";

export const SCENE_REGION_KIND_OPTIONS: Array<{
  value: SceneRegionKind;
  label: string;
}> = [
  { value: "milestone_tree", label: "Árboles de hito" },
  { value: "flower_area", label: "Flores" },
  { value: "object_area", label: "Objetos" },
  { value: "character_area", label: "Personajes" },
  { value: "event_area", label: "Interacciones" },
  { value: "allowed", label: "Zona permitida" },
  { value: "forbidden", label: "Zona bloqueada" },
  { value: "custom", label: "Zona personalizada" },
];

export const SCENE_REGION_PLACEMENT_OPTIONS: Array<{
  value: SceneRegionPlacementMode;
  label: string;
}> = [
  { value: "manual", label: "Guiado" },
  { value: "anchors_in_order", label: "Puntos exactos" },
  { value: "centroid", label: "Centro automatico" },
  { value: "random_inside", label: "Aleatorio libre" },
  { value: "random_poisson", label: "Aleatorio ordenado" },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toFiniteNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean);
}

function toRegionKind(value: unknown): SceneRegionKind {
  const text = String(value ?? "").trim().toLowerCase();
  return (
    SCENE_REGION_KIND_OPTIONS.find((option) => option.value === text)?.value ??
    DEFAULT_REGION_KIND
  );
}

function toPlacementMode(value: unknown): SceneRegionPlacementMode {
  const text = String(value ?? "").trim().toLowerCase();
  return (
    SCENE_REGION_PLACEMENT_OPTIONS.find((option) => option.value === text)?.value ??
    DEFAULT_PLACEMENT_MODE
  );
}

function normalizeRegionPoint(input: unknown): SceneRegionPoint | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  return {
    x: Math.round(toFiniteNumber(raw.x, 0) * 100) / 100,
    y: Math.round(toFiniteNumber(raw.y, 0) * 100) / 100,
  };
}

function normalizeRegionAnchor(input: unknown, index: number): SceneRegionAnchor | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const point = normalizeRegionPoint(raw);
  if (!point) return null;
  return {
    id: String(raw.id ?? `anchor-${index + 1}`).trim() || `anchor-${index + 1}`,
    label: String(raw.label ?? `Anchor ${index + 1}`).trim() || `Anchor ${index + 1}`,
    x: point.x,
    y: point.y,
  };
}

export function createSceneRegionId(prefix = "region") {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${random}`;
}

export function createEmptySceneRegion(partial?: Partial<SceneRegion>): SceneRegion {
  return {
    id: partial?.id?.trim() || createSceneRegionId(),
    name: partial?.name?.trim() || "Nueva region",
    kind: partial?.kind ?? DEFAULT_REGION_KIND,
    enabled: partial?.enabled ?? true,
    placementMode: partial?.placementMode ?? DEFAULT_PLACEMENT_MODE,
    capacity:
      typeof partial?.capacity === "number" && Number.isFinite(partial.capacity)
        ? Math.max(1, Math.round(partial.capacity))
        : null,
    points: partial?.points?.map((point) => ({
      x: point.x,
      y: point.y,
    })) ?? [],
    anchors: partial?.anchors?.map((anchor, index) => ({
      id: anchor.id || `anchor-${index + 1}`,
      label: anchor.label || `Anchor ${index + 1}`,
      x: anchor.x,
      y: anchor.y,
    })) ?? [],
    metadata: {
      tags: partial?.metadata?.tags?.map((tag) => tag.trim()).filter(Boolean) ?? [],
      notes: partial?.metadata?.notes?.trim() || null,
      allowedKinds:
        partial?.metadata?.allowedKinds?.map((value) => value.trim()).filter(Boolean) ?? [],
    },
  };
}

export function normalizeSceneRegion(input: unknown, index: number): SceneRegion | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const points = Array.isArray(raw.points)
    ? raw.points.map(normalizeRegionPoint).filter((point): point is SceneRegionPoint => Boolean(point))
    : [];
  const anchors = Array.isArray(raw.anchors)
    ? raw.anchors
        .map((anchor, anchorIndex) => normalizeRegionAnchor(anchor, anchorIndex))
        .filter((anchor): anchor is SceneRegionAnchor => Boolean(anchor))
    : [];
  const metadata =
    raw.metadata && typeof raw.metadata === "object"
      ? (raw.metadata as Record<string, unknown>)
      : {};

  return createEmptySceneRegion({
    id: String(raw.id ?? `region-${index + 1}`).trim() || `region-${index + 1}`,
    name: String(raw.name ?? `Region ${index + 1}`).trim() || `Region ${index + 1}`,
    kind: toRegionKind(raw.kind),
    enabled:
      typeof raw.enabled === "boolean"
        ? raw.enabled
        : !["false", "0", "off"].includes(String(raw.enabled ?? "").trim().toLowerCase()),
    placementMode: toPlacementMode(raw.placementMode),
    capacity:
      raw.capacity == null || raw.capacity === ""
        ? null
        : Math.max(1, Math.round(toFiniteNumber(raw.capacity, 1))),
    points,
    anchors,
    metadata: {
      tags: toStringArray(metadata.tags),
      notes: String(metadata.notes ?? "").trim() || null,
      allowedKinds: toStringArray(metadata.allowedKinds),
    },
  });
}

export function normalizeSceneRegions(input: unknown) {
  if (!Array.isArray(input)) return [] as SceneRegion[];
  return input
    .map((region, index) => normalizeSceneRegion(region, index))
    .filter((region): region is SceneRegion => Boolean(region));
}

export function serializeSceneRegions(regions: SceneRegion[]) {
  return JSON.stringify(
    regions.map((region) => ({
      id: region.id,
      name: region.name,
      kind: region.kind,
      enabled: region.enabled,
      placementMode: region.placementMode,
      capacity: region.capacity,
      points: region.points.map((point) => ({
        x: Number(point.x.toFixed(2)),
        y: Number(point.y.toFixed(2)),
      })),
      anchors: region.anchors.map((anchor) => ({
        id: anchor.id,
        label: anchor.label,
        x: Number(anchor.x.toFixed(2)),
        y: Number(anchor.y.toFixed(2)),
      })),
      metadata: {
        tags: region.metadata.tags,
        notes: region.metadata.notes,
        allowedKinds: region.metadata.allowedKinds,
      },
    })),
    null,
    2,
  );
}

export function pointInPolygon(point: SceneRegionPoint, polygon: SceneRegionPoint[]) {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let index = 0, prev = polygon.length - 1; index < polygon.length; prev = index, index += 1) {
    const a = polygon[index];
    const b = polygon[prev];
    const intersects =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / Math.max(0.00001, b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function polygonCentroid(points: SceneRegionPoint[]): SceneRegionPoint {
  if (!points.length) return { x: 0, y: 0 };
  if (points.length < 3) {
    const sum = points.reduce(
      (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
      { x: 0, y: 0 },
    );
    return {
      x: sum.x / points.length,
      y: sum.y / points.length,
    };
  }

  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const factor = current.x * next.y - next.x * current.y;
    area += factor;
    cx += (current.x + next.x) * factor;
    cy += (current.y + next.y) * factor;
  }

  if (Math.abs(area) < 0.00001) {
    const sum = points.reduce(
      (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
      { x: 0, y: 0 },
    );
    return {
      x: sum.x / points.length,
      y: sum.y / points.length,
    };
  }

  const areaFactor = area * 0.5;
  return {
    x: cx / (6 * areaFactor),
    y: cy / (6 * areaFactor),
  };
}

function polygonBounds(points: SceneRegionPoint[]) {
  if (!points.length) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
  }
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function hashString(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function deterministicPointInsidePolygon(
  polygon: SceneRegionPoint[],
  seedKey: string,
  fallbackPoint: SceneRegionPoint,
  minDistance: number,
  placedPoints: SceneRegionPoint[],
) {
  const bounds = polygonBounds(polygon);
  if (bounds.width <= 0 || bounds.height <= 0) return fallbackPoint;
  const random = mulberry32(hashString(seedKey));

  for (let attempt = 0; attempt < 180; attempt += 1) {
    const candidate = {
      x: bounds.minX + random() * bounds.width,
      y: bounds.minY + random() * bounds.height,
    };
    if (!pointInPolygon(candidate, polygon)) continue;
    if (
      placedPoints.some(
        (placed) => Math.hypot(placed.x - candidate.x, placed.y - candidate.y) < minDistance,
      )
    ) {
      continue;
    }
    return candidate;
  }

  return fallbackPoint;
}

function manualPlacementPoint(
  region: SceneRegion,
  itemIndex: number,
  placedPoints: SceneRegionPoint[],
) {
  const centroid = polygonCentroid(region.points);
  if (region.anchors.length) {
    return region.anchors[Math.min(itemIndex, region.anchors.length - 1)];
  }
  const radius = 18;
  const angle = (Math.PI * 2 * itemIndex) / Math.max(1, placedPoints.length + 1);
  return {
    x: centroid.x + Math.cos(angle) * radius,
    y: centroid.y + Math.sin(angle) * radius,
  };
}

function centroidPlacementPoint(region: SceneRegion, itemIndex: number) {
  const centroid = polygonCentroid(region.points);
  if (itemIndex === 0) return centroid;
  const radius = 22 + Math.floor(itemIndex / 6) * 10;
  const angle = (Math.PI * 2 * itemIndex) / 6;
  return {
    x: centroid.x + Math.cos(angle) * radius,
    y: centroid.y + Math.sin(angle) * radius,
  };
}

function regionMatchesKind(region: SceneRegion, desiredKind: string) {
  if (!region.enabled) return false;
  if (region.kind === "forbidden") return false;
  if (region.kind === "milestone_tree" && desiredKind === "tree") return true;
  if (region.metadata.allowedKinds.includes(desiredKind)) return true;
  return false;
}

function regionPlacementPoint(
  region: SceneRegion,
  item: SceneRegionPlacementItem,
  itemIndex: number,
  placedPoints: SceneRegionPoint[],
) {
  const centroid = polygonCentroid(region.points);
  if (region.placementMode === "anchors_in_order") {
    return region.anchors[itemIndex] ?? region.anchors[itemIndex % Math.max(region.anchors.length, 1)] ?? centroid;
  }
  if (region.placementMode === "manual") {
    return manualPlacementPoint(region, itemIndex, placedPoints);
  }
  if (region.placementMode === "centroid") {
    return centroidPlacementPoint(region, itemIndex);
  }
  if (region.placementMode === "random_inside") {
    return deterministicPointInsidePolygon(
      region.points,
      `${region.id}:${item.id}:random`,
      centroid,
      0,
      [],
    );
  }
  return deterministicPointInsidePolygon(
    region.points,
    `${region.id}:${item.id}:poisson`,
    centroid,
    38,
    placedPoints,
  );
}

export function assignItemsToSceneRegions<TItem extends SceneRegionPlacementItem>(
  items: TItem[],
  regions: SceneRegion[],
  desiredKind: string,
) {
  const candidates = regions.filter(
    (region) => region.points.length >= 3 && regionMatchesKind(region, desiredKind),
  );
  if (!candidates.length || !items.length) {
    return {
      placements: [] as SceneRegionPlacementResult<TItem>[],
      unassignedItems: items,
    };
  }

  const placements: SceneRegionPlacementResult<TItem>[] = [];
  const regionUsage = new Map<string, number>();
  const regionPlacedPoints = new Map<string, SceneRegionPoint[]>();
  const unassignedItems: TItem[] = [];

  for (const item of items) {
    let assignedRegion: SceneRegion | null = null;
    const preferredRegionId = String(item.preferredRegionId ?? "").trim() || null;
    if (preferredRegionId) {
      const preferred = candidates.find((region) => {
        if (region.id !== preferredRegionId) return false;
        const used = regionUsage.get(region.id) ?? 0;
        const capacity = region.capacity ?? Number.POSITIVE_INFINITY;
        return used < capacity;
      });
      if (preferred) assignedRegion = preferred;
    }

    for (const region of candidates) {
      if (assignedRegion) break;
      const used = regionUsage.get(region.id) ?? 0;
      const capacity = region.capacity ?? Number.POSITIVE_INFINITY;
      if (used < capacity) {
        assignedRegion = region;
        break;
      }
    }

    if (!assignedRegion) {
      unassignedItems.push(item);
      continue;
    }

    const used = regionUsage.get(assignedRegion.id) ?? 0;
    const placedPoints = regionPlacedPoints.get(assignedRegion.id) ?? [];
    const point = regionPlacementPoint(assignedRegion, item, used, placedPoints);
    const safePoint = {
      x: Number(clamp(point.x, 0, Number.MAX_SAFE_INTEGER).toFixed(2)),
      y: Number(clamp(point.y, 0, Number.MAX_SAFE_INTEGER).toFixed(2)),
    };
    placements.push({
      item,
      regionId: assignedRegion.id,
      point: safePoint,
      placementMode: assignedRegion.placementMode,
    });
    regionUsage.set(assignedRegion.id, used + 1);
    regionPlacedPoints.set(assignedRegion.id, [...placedPoints, safePoint]);
  }

  return {
    placements,
    unassignedItems,
  };
}
