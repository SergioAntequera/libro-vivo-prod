"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import {
  PROGRESSION_GRAPH_CANVAS_HEIGHT,
  PROGRESSION_GRAPH_CANVAS_WIDTH,
  PROGRESSION_GRAPH_MAX_SCALE,
  PROGRESSION_GRAPH_MIN_SCALE,
  PROGRESSION_GRAPH_NODE_SIZE,
  canLinkProgressionNodes,
  clampProgressionGraphPosition,
  defaultProgressionGraphPosition,
  splitProgressionGraphNodeKey,
  type ProgressionGraphCanvasNode,
  type ProgressionGraphLink,
  type ProgressionGraphPosition,
  type ProgressionRelationMode,
} from "@/lib/progressionGraph";
import { ProgressionMilestoneTree } from "@/components/shared/ProgressionMilestoneTree";
import { defaultProgressionTreeRankForImportance } from "@/lib/progressionTreeVisuals";

type ProgressionGraphCanvasProps = {
  nodes: ProgressionGraphCanvasNode[];
  links: ProgressionGraphLink[];
  positions: Record<string, ProgressionGraphPosition>;
  relationModes: Record<string, ProgressionRelationMode>;
  activePanel: "tree" | "conditions" | "rewards" | null;
  linkingSourceKey: string | null;
  fitContentSignal?: number;
  onSelectNode: (node: ProgressionGraphCanvasNode) => void;
  onRequestLink: (nodeKey: string | null) => void;
  onToggleLink: (sourceKey: string, targetKey: string) => void;
  onChangePosition: (nodeKey: string, position: ProgressionGraphPosition) => void;
  onChangeRelationMode: (nodeKey: string, mode: ProgressionRelationMode) => void;
};

type NodeDragState = {
  key: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startPosition: ProgressionGraphPosition;
};

type PanDragState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
};

function panelToKind(panel: ProgressionGraphCanvasProps["activePanel"]) {
  if (panel === "conditions") return "condition";
  if (panel === "rewards") return "reward";
  if (panel === "tree") return "tree";
  return null;
}

function nodeToneClass(
  kind: ProgressionGraphCanvasNode["kind"],
  activeKind: ProgressionGraphCanvasNode["kind"] | null,
) {
  const isActive = activeKind === null || activeKind === kind;
  if (kind === "condition") {
    return isActive
      ? "bg-[rgba(255,248,236,0.98)] border-[rgba(192,154,92,0.36)]"
      : "bg-[rgba(255,248,236,0.82)] border-[rgba(192,154,92,0.22)]";
  }
  if (kind === "tree") {
    return isActive
      ? "bg-[rgba(239,247,239,0.98)] border-[rgba(103,141,114,0.34)]"
      : "bg-[rgba(239,247,239,0.84)] border-[rgba(103,141,114,0.2)]";
  }
  return isActive
    ? "bg-[rgba(239,245,255,0.98)] border-[rgba(99,128,178,0.3)]"
    : "bg-[rgba(239,245,255,0.84)] border-[rgba(99,128,178,0.18)]";
}

export function ProgressionGraphCanvas({
  nodes,
  links,
  positions,
  relationModes,
  activePanel,
  linkingSourceKey,
  fitContentSignal = 0,
  onSelectNode,
  onRequestLink,
  onToggleLink,
  onChangePosition,
  onChangeRelationMode,
}: ProgressionGraphCanvasProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const handledFitSignalRef = useRef(0);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [nodeDrag, setNodeDrag] = useState<NodeDragState | null>(null);
  const [panDrag, setPanDrag] = useState<PanDragState | null>(null);

  const nodesByKey = useMemo(
    () => new Map(nodes.map((node) => [node.key, node])),
    [nodes],
  );

  useEffect(() => {
    if (
      !fitContentSignal ||
      fitContentSignal === handledFitSignalRef.current
    ) {
      return;
    }
    const viewport = viewportRef.current;
    if (!viewport || nodes.length === 0) return;
    const viewportWidth = viewport.clientWidth;
    const viewportHeight = viewport.clientHeight;
    if (!viewportWidth || !viewportHeight) return;
    handledFitSignalRef.current = fitContentSignal;

    const bounds = nodes.reduce(
      (acc, node, index) => {
        const position =
          positions[node.key] ?? defaultProgressionGraphPosition(node.kind, index);
        const size = PROGRESSION_GRAPH_NODE_SIZE[node.kind];
        return {
          minX: Math.min(acc.minX, position.x),
          minY: Math.min(acc.minY, position.y),
          maxX: Math.max(acc.maxX, position.x + size.width),
          maxY: Math.max(acc.maxY, position.y + size.height),
        };
      },
      {
        minX: Number.POSITIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
      },
    );

    const padding = 160;
    const contentWidth = Math.max(1, bounds.maxX - bounds.minX + padding * 2);
    const contentHeight = Math.max(1, bounds.maxY - bounds.minY + padding * 2);
    const nextScale = Math.min(
      PROGRESSION_GRAPH_MAX_SCALE,
      Math.max(
        PROGRESSION_GRAPH_MIN_SCALE,
        Math.min(viewportWidth / contentWidth, viewportHeight / contentHeight),
      ),
    );

    setScale(nextScale);
    setPan({
      x: viewportWidth / 2 - ((bounds.minX + bounds.maxX) / 2) * nextScale,
      y: viewportHeight / 2 - ((bounds.minY + bounds.maxY) / 2) * nextScale,
    });
  }, [fitContentSignal, nodes, positions]);

  useEffect(() => {
    if (!nodeDrag && !panDrag) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (nodeDrag && event.pointerId === nodeDrag.pointerId) {
        const node = nodesByKey.get(nodeDrag.key);
        if (!node) return;
        onChangePosition(
          nodeDrag.key,
          clampProgressionGraphPosition(node.kind, {
            x:
              nodeDrag.startPosition.x +
              (event.clientX - nodeDrag.startClientX) / scale,
            y:
              nodeDrag.startPosition.y +
              (event.clientY - nodeDrag.startClientY) / scale,
          }),
        );
        return;
      }
      if (panDrag && event.pointerId === panDrag.pointerId) {
        setPan({
          x: panDrag.startX + (event.clientX - panDrag.startClientX),
          y: panDrag.startY + (event.clientY - panDrag.startClientY),
        });
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (nodeDrag && event.pointerId === nodeDrag.pointerId) setNodeDrag(null);
      if (panDrag && event.pointerId === panDrag.pointerId) setPanDrag(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [nodeDrag, nodesByKey, onChangePosition, panDrag, scale]);

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const worldX = (pointerX - pan.x) / scale;
    const worldY = (pointerY - pan.y) / scale;
    const nextScale = Math.min(
      PROGRESSION_GRAPH_MAX_SCALE,
      Math.max(PROGRESSION_GRAPH_MIN_SCALE, scale - event.deltaY * 0.0012),
    );
    setScale(nextScale);
    setPan({
      x: pointerX - worldX * nextScale,
      y: pointerY - worldY * nextScale,
    });
  }

  function handleCanvasPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    onRequestLink(null);
    setPanDrag({
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: pan.x,
      startY: pan.y,
    });
  }

  function handleNodePointerDown(
    node: ProgressionGraphCanvasNode,
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (event.button !== 0) return;
    event.stopPropagation();

    const wantsLink = event.ctrlKey || event.metaKey || Boolean(linkingSourceKey);
    if (wantsLink) {
      if (!linkingSourceKey || linkingSourceKey === node.key) {
        onRequestLink(linkingSourceKey === node.key ? null : node.key);
        return;
      }
      onToggleLink(linkingSourceKey, node.key);
      return;
    }

    const current =
      positions[node.key] ??
      defaultProgressionGraphPosition(
        node.kind,
        Math.max(
          0,
          nodes.findIndex((candidate) => candidate.key === node.key),
        ),
      );
    setNodeDrag({
      key: node.key,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPosition: current,
    });
  }

  function handleNodeDoubleClick(
    node: ProgressionGraphCanvasNode,
    event: ReactMouseEvent<HTMLDivElement>,
  ) {
    event.stopPropagation();
    if (event.ctrlKey || event.metaKey || linkingSourceKey) return;
    onSelectNode(node);
  }

  const activeKind = panelToKind(activePanel);

  return (
    <div
      ref={viewportRef}
      className="relative h-full w-full min-h-0 overflow-hidden bg-[linear-gradient(180deg,rgba(246,248,244,0.98),rgba(241,246,255,0.98))]"
      onWheel={handleWheel}
      onPointerDown={handleCanvasPointerDown}
    >
      <div className="absolute left-5 top-5 z-20 flex flex-wrap gap-2">
        <div className="rounded-full border border-[var(--lv-border)] bg-[rgba(255,255,255,0.92)] px-3 py-1 text-xs text-[var(--lv-text-muted)] shadow-[var(--lv-shadow-sm)]">
          Zoom {Math.round(scale * 100)}%
        </div>
        {linkingSourceKey ? (
          <button
            type="button"
            onClick={() => onRequestLink(null)}
            className="rounded-full border border-[var(--lv-primary)] bg-[var(--lv-primary-soft)] px-3 py-1 text-xs text-[var(--lv-primary-strong)] shadow-[var(--lv-shadow-sm)]"
          >
            Enlazando desde {nodesByKey.get(linkingSourceKey)?.title ?? "bloque"}
          </button>
        ) : (
          <div className="rounded-full border border-[var(--lv-border)] bg-[rgba(255,255,255,0.92)] px-3 py-1 text-xs text-[var(--lv-text-muted)] shadow-[var(--lv-shadow-sm)]">
            Ctrl/Cmd + click para enlazar bloques
          </div>
        )}
      </div>

      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: PROGRESSION_GRAPH_CANVAS_WIDTH,
          height: PROGRESSION_GRAPH_CANVAS_HEIGHT,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
        }}
      >
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox={`0 0 ${PROGRESSION_GRAPH_CANVAS_WIDTH} ${PROGRESSION_GRAPH_CANVAS_HEIGHT}`}
        >
          <defs>
            <marker
              id="progression-graph-arrow"
              markerWidth="14"
              markerHeight="14"
              refX="10"
              refY="7"
              orient="auto"
            >
              <path d="M0 0 L14 7 L0 14 Z" fill="rgba(83,103,91,0.8)" />
            </marker>
          </defs>
          {links.map((link) => {
            const source = nodesByKey.get(link.source);
            const target = nodesByKey.get(link.target);
            if (!source || !target) return null;
            const sourcePosition =
              positions[source.key] ?? defaultProgressionGraphPosition(source.kind, 0);
            const targetPosition =
              positions[target.key] ?? defaultProgressionGraphPosition(target.kind, 0);
            const sourceSize = PROGRESSION_GRAPH_NODE_SIZE[source.kind];
            const targetSize = PROGRESSION_GRAPH_NODE_SIZE[target.kind];
            const startX = sourcePosition.x + sourceSize.width;
            const startY = sourcePosition.y + sourceSize.height / 2;
            const endX = targetPosition.x;
            const endY = targetPosition.y + targetSize.height / 2;
            const curve = Math.max(80, Math.abs(endX - startX) * 0.35);
            const path = `M ${startX} ${startY} C ${startX + curve} ${startY}, ${
              endX - curve
            } ${endY}, ${endX} ${endY}`;
            return (
              <path
                key={link.id}
                d={path}
                fill="none"
                stroke="rgba(83,103,91,0.8)"
                strokeWidth="3"
                markerEnd="url(#progression-graph-arrow)"
              />
            );
          })}
        </svg>

        {(() => {
          const fallbackIndexes = {
            condition: 0,
            tree: 0,
            reward: 0,
          };
          return nodes.map((node) => {
            const fallbackIndex = fallbackIndexes[node.kind];
            fallbackIndexes[node.kind] += 1;
            const position =
              positions[node.key] ??
              defaultProgressionGraphPosition(node.kind, fallbackIndex);
            const size = PROGRESSION_GRAPH_NODE_SIZE[node.kind];
            const relationMode =
              node.kind === "condition" ? null : relationModes[node.key] ?? "or";
            const { kind } = splitProgressionGraphNodeKey(node.key);
            const isLinkSource = linkingSourceKey === node.key;
            const canAcceptLink =
              linkingSourceKey && linkingSourceKey !== node.key
                ? canLinkProgressionNodes(
                    splitProgressionGraphNodeKey(linkingSourceKey).kind,
                    node.kind,
                  )
                : false;
            return (
              <div
                key={node.key}
                className={`absolute select-none rounded-[30px] border p-5 shadow-[0_24px_54px_rgba(24,36,26,0.12)] transition ${nodeToneClass(
                  node.kind,
                  activeKind,
                )} ${
                  node.selected
                    ? "border-[var(--lv-primary)] ring-2 ring-[rgba(91,129,104,0.18)]"
                    : isLinkSource
                      ? "border-[var(--lv-primary)]"
                      : canAcceptLink
                        ? "border-[rgba(116,156,128,0.6)]"
                        : "border-[var(--lv-border)]"
                }`}
                style={{
                  left: position.x,
                  top: position.y,
                  width: size.width,
                  minHeight: size.height,
                }}
                onPointerDown={(event) => handleNodePointerDown(node, event)}
                onDoubleClick={(event) => handleNodeDoubleClick(node, event)}
              >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {node.kind === "tree" ? (
                    <div className="mt-1 flex h-14 w-14 items-center justify-center rounded-[20px] border border-[var(--lv-border)] bg-[rgba(255,255,255,0.68)]">
                      <ProgressionMilestoneTree
                        size={42}
                        rank={node.rank ?? defaultProgressionTreeRankForImportance(node.importance ?? "importante")}
                        importance={node.importance ?? "importante"}
                        rarity={node.rarity ?? "common"}
                        leafVariant={node.leafVariant ?? 0}
                        accentColor={node.accentColor ?? null}
                      />
                    </div>
                  ) : null}
                  <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--lv-text-muted)]">
                    {kind === "condition"
                      ? "Condicion"
                      : kind === "tree"
                        ? "Árbol"
                        : "Reward"}
                  </div>
                  <div className="mt-3 text-[15px] font-semibold text-[var(--lv-text)]">
                    {node.title}
                  </div>
                  <div className="mt-1 text-sm text-[var(--lv-text-muted)]">
                    {node.subtitle}
                  </div>
                </div>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-[var(--lv-border)] bg-[rgba(255,255,255,0.82)] px-3 py-1 text-[11px] text-[var(--lv-text-muted)]"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRequestLink(isLinkSource ? null : node.key);
                  }}
                >
                  {isLinkSource ? "Cancelar" : "Enlazar"}
                </button>
              </div>

              {node.meta ? (
                <div className="mt-4 text-sm text-[var(--lv-text-muted)]">{node.meta}</div>
              ) : null}

              {relationMode ? (
                <div className="mt-5 flex items-center justify-between gap-3 rounded-[22px] border border-[var(--lv-border)] bg-[rgba(255,255,255,0.58)] px-3 py-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Entrada
                  </span>
                  <div className="flex gap-1">
                    {(["or", "and"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onChangeRelationMode(node.key, mode);
                        }}
                        className={`rounded-full px-3 py-1 text-xs ${
                          relationMode === mode
                            ? "bg-[var(--lv-primary)] text-white"
                            : "border border-[var(--lv-border)] bg-[var(--lv-surface)] text-[var(--lv-text-muted)]"
                        }`}
                      >
                        {mode.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          );
          });
        })()}
      </div>
    </div>
  );
}
