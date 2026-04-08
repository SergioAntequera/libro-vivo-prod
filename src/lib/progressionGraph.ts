export type ProgressionGraphNodeKind = "condition" | "tree" | "reward";

export type ProgressionRelationMode = "and" | "or";

export type ProgressionTreeImportance =
  | "paso"
  | "importante"
  | "mayor"
  | "anual";

export type ProgressionGraphPosition = {
  x: number;
  y: number;
};

export type ProgressionGraphLink = {
  id: string;
  source: string;
  target: string;
};

export type ProgressionTreeSettings = {
  regionId: string;
  importance: ProgressionTreeImportance;
};

export type ProgressionConditionSettings = {
  templateId: string;
};

export type ProgressionGraphDraft = {
  positions: Record<string, ProgressionGraphPosition>;
  links: ProgressionGraphLink[];
  relationModes: Record<string, ProgressionRelationMode>;
  treeSettings: Record<string, ProgressionTreeSettings>;
  conditionSettings: Record<string, ProgressionConditionSettings>;
};

export type ProgressionGraphCanvasNode = {
  key: string;
  entityId: string;
  kind: ProgressionGraphNodeKind;
  title: string;
  subtitle: string;
  meta?: string;
  accentColor?: string | null;
  rank?: import("@/lib/progressionTreeVisuals").ProgressionTreeRank | null;
  rarity?: import("@/lib/progressionTreeVisuals").ProgressionTreeRarity | null;
  leafVariant?: number | null;
  importance?: ProgressionTreeImportance | null;
  selected?: boolean;
};

export const PROGRESSION_GRAPH_DB_KEY = "default";
export const PROGRESSION_GRAPH_CANVAS_WIDTH = 16000;
export const PROGRESSION_GRAPH_CANVAS_HEIGHT = 9600;
export const PROGRESSION_GRAPH_MIN_SCALE = 0.2;
export const PROGRESSION_GRAPH_MAX_SCALE = 2.2;

export const PROGRESSION_GRAPH_NODE_SIZE: Record<
  ProgressionGraphNodeKind,
  { width: number; height: number }
> = {
  condition: { width: 280, height: 196 },
  tree: { width: 320, height: 212 },
  reward: { width: 280, height: 196 },
};

export const PROGRESSION_GRAPH_ZONES: Record<
  ProgressionGraphNodeKind,
  { x: number; width: number; label: string }
> = {
  condition: { x: 260, width: 3600, label: "Condiciones" },
  tree: { x: 4700, width: 4300, label: "Árbol" },
  reward: { x: 9860, width: 3600, label: "Rewards" },
};

export const EMPTY_PROGRESSION_GRAPH_DRAFT: ProgressionGraphDraft = {
  positions: {},
  links: [],
  relationModes: {},
  treeSettings: {},
  conditionSettings: {},
};

export function makeProgressionGraphNodeKey(
  kind: ProgressionGraphNodeKind,
  entityId: string,
) {
  return `${kind}:${entityId}`;
}

export function splitProgressionGraphNodeKey(key: string) {
  const [kind, ...rest] = key.split(":");
  return {
    kind: kind as ProgressionGraphNodeKind,
    entityId: rest.join(":"),
  };
}

export function canLinkProgressionNodes(
  sourceKind: ProgressionGraphNodeKind,
  targetKind: ProgressionGraphNodeKind,
) {
  return (
    (sourceKind === "condition" && targetKind === "tree") ||
    (sourceKind === "tree" && targetKind === "tree") ||
    (sourceKind === "tree" && targetKind === "reward")
  );
}

export function normalizeProgressionGraphDraft(
  raw: unknown,
): ProgressionGraphDraft {
  if (!raw || typeof raw !== "object") return EMPTY_PROGRESSION_GRAPH_DRAFT;
  const input = raw as Partial<ProgressionGraphDraft>;
  return {
    positions:
      input.positions && typeof input.positions === "object" ? input.positions : {},
    links: Array.isArray(input.links) ? input.links : [],
    relationModes:
      input.relationModes && typeof input.relationModes === "object"
        ? input.relationModes
        : {},
    treeSettings:
      input.treeSettings && typeof input.treeSettings === "object"
        ? input.treeSettings
        : {},
    conditionSettings:
      input.conditionSettings && typeof input.conditionSettings === "object"
        ? input.conditionSettings
        : {},
  };
}

export function clampProgressionGraphPosition(
  kind: ProgressionGraphNodeKind,
  position: ProgressionGraphPosition,
) {
  const size = PROGRESSION_GRAPH_NODE_SIZE[kind];
  return {
    x: Math.min(
      PROGRESSION_GRAPH_CANVAS_WIDTH - size.width - 28,
      Math.max(28, Math.round(position.x)),
    ),
    y: Math.min(
      PROGRESSION_GRAPH_CANVAS_HEIGHT - size.height - 28,
      Math.max(40, Math.round(position.y)),
    ),
  };
}

export function defaultProgressionGraphPosition(
  kind: ProgressionGraphNodeKind,
  index: number,
) {
  const zone = PROGRESSION_GRAPH_ZONES[kind];
  const size = PROGRESSION_GRAPH_NODE_SIZE[kind];
  const columns = kind === "tree" ? 3 : 2;
  const row = Math.floor(index / columns);
  const column = index % columns;
  const innerGutter = kind === "tree" ? 64 : 44;
  const baseX = zone.x + 28 + column * (size.width + innerGutter);
  const baseY = 96 + row * (size.height + 40);
  return clampProgressionGraphPosition(kind, { x: baseX, y: baseY });
}

export function buildProgressionGraphLinkId(source: string, target: string) {
  return `${source}=>${target}`;
}
