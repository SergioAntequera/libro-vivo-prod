"use client";

import type { CSSProperties, PointerEvent, RefObject } from "react";
import ForestCanvasContent from "@/components/forest/ForestCanvasContent";
import type { AnnualTreePhase } from "@/lib/annualTreeEngine";
import type {
  ForestCanvasPlacedTree,
  ForestCanvasTimelineNode,
  ForestFlowerDot,
  ForestGlowPatch,
  ForestMossPatch,
} from "@/lib/forestCanvasDecor";

type ZoneItem = {
  zoneIndex: number;
  yearsLabel: string;
};

type TreeChip = {
  year: number;
  label: string;
  style: CSSProperties;
};

type ForestAnnualCanvasSectionProps = {
  annualTreeCount: number;
  forestZoneCount: number;
  forestZoneCapacity: number;
  onFitZone: () => void;
  onFitOverview: () => void;
  showOverviewButton: boolean;
  zones: ZoneItem[];
  activeZone: number;
  onZoneClick: (zoneIndex: number) => void;
  viewportRef: RefObject<HTMLDivElement | null>;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (pointerId: number) => void;
  viewportHeight: number;
  scaledWidth: number;
  scaledHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  showDebugGrid: boolean;
  forestPathD: string | null;
  orchardTimeline: ForestCanvasTimelineNode[];
  gladeDecor: ForestGlowPatch[];
  mossPatches: ForestMossPatch[];
  flowerDecor: ForestFlowerDot[];
  blossomScatter: ForestFlowerDot[];
  orchardPlacements: ForestCanvasPlacedTree[];
  annualTreeAssets: Record<AnnualTreePhase, string | null>;
  highlightedTreeYearSet: Set<number>;
  showTreeLabels: boolean;
  onOpenForestYear: (year: number) => void;
  treeChips: TreeChip[];
  onTreeChipClick: (year: number) => void;
};

export default function ForestAnnualCanvasSection(
  props: ForestAnnualCanvasSectionProps,
) {
  const {
    annualTreeCount,
    forestZoneCount,
    forestZoneCapacity,
    onFitZone,
    onFitOverview,
    showOverviewButton,
    zones,
    activeZone,
    onZoneClick,
    viewportRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    viewportHeight,
    scaledWidth,
    scaledHeight,
    canvasWidth,
    canvasHeight,
    zoom,
    showDebugGrid,
    forestPathD,
    orchardTimeline,
    gladeDecor,
    mossPatches,
    flowerDecor,
    blossomScatter,
    orchardPlacements,
    annualTreeAssets,
    highlightedTreeYearSet,
    showTreeLabels,
    onOpenForestYear,
    treeChips,
    onTreeChipClick,
  } = props;

  return (
    <section className="lv-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Bosque de años</h2>
          <p className="mt-1 text-sm text-[var(--lv-text-muted)]">
            Cada árbol resume un año. Recorre el paisaje para detectar patrones y
            entra en un libro anual cuando quieras bajar a detalle.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="mr-1 text-sm text-[var(--lv-text-muted)]">
            {annualTreeCount} año(s) visibles
          </div>
          <div className="lv-badge px-3 py-1 text-xs">{forestZoneCount} zona(s)</div>
          <button
            type="button"
            onClick={onFitZone}
            className="lv-btn lv-btn-secondary rounded-full px-3 py-1 text-xs"
          >
            {forestZoneCount > 1 ? "Enfocar zona" : "Ajustar vista"}
          </button>
          {showOverviewButton ? (
            <button
              type="button"
              onClick={onFitOverview}
              className="lv-btn lv-btn-secondary rounded-full px-3 py-1 text-xs"
            >
              Ver todo
            </button>
          ) : null}
        </div>
      </div>

      <div
        className="lv-card-soft mt-4 p-3 md:p-4"
        title="Arrastra para recorrer el bosque. Pulsa un árbol para abrir su año."
      >
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-[var(--lv-text-muted)]">
          <div className="lv-badge bg-white/80 px-3 py-1">Arrastra para moverte</div>
          <div className="lv-badge bg-white/80 px-3 py-1">
            Pulsa un árbol para abrir su libro
          </div>
          <div className="lv-badge bg-white/80 px-3 py-1">
            Usa los chips inferiores para enfocar
          </div>
          {forestZoneCount > 1 ? (
            <div className="lv-badge bg-white/80 px-3 py-1">
              Cada zona agrupa hasta {forestZoneCapacity} años
            </div>
          ) : null}
        </div>

        {zones.length > 1 ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {zones.map((zone) => (
              <button
                key={`forest-zone-${zone.zoneIndex}`}
                type="button"
                onClick={() => onZoneClick(zone.zoneIndex)}
                className="lv-btn rounded-full border px-3 py-1 text-xs"
                style={
                  activeZone === zone.zoneIndex
                    ? {
                        borderColor: "var(--lv-primary)",
                        backgroundColor: "var(--lv-primary-soft)",
                        color: "var(--lv-primary-strong)",
                      }
                    : {
                        borderColor: "var(--lv-border)",
                        backgroundColor: "var(--lv-surface)",
                        color: "var(--lv-text)",
                      }
                }
              >
                Zona {zone.zoneIndex + 1} · {zone.yearsLabel}
              </button>
            ))}
          </div>
        ) : null}

        <div
          ref={viewportRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(event) => onPointerUp(event.pointerId)}
          onPointerCancel={(event) => onPointerUp(event.pointerId)}
          className="relative cursor-grab overflow-auto overscroll-none rounded-[28px] border active:cursor-grabbing"
          style={{
            height: viewportHeight,
            touchAction: "none",
            scrollbarWidth: "thin",
            borderColor: "var(--lv-border)",
            background:
              "linear-gradient(180deg, var(--lv-bg-soft) 0%, rgba(207, 222, 199, 0.75) 100%)",
            boxShadow: "var(--lv-shadow-md)",
          }}
          aria-label="Bosque anual navegable"
        >
          <div className="relative" style={{ width: scaledWidth, height: scaledHeight }}>
            <div
              className="absolute left-0 top-0 origin-top-left overflow-hidden rounded-[28px]"
              style={{
                width: canvasWidth,
                height: canvasHeight,
                transform: `scale(${zoom})`,
              }}
            >
              <ForestCanvasContent
                forestCanvasWidth={canvasWidth}
                forestCanvasHeight={canvasHeight}
                showDebugGrid={showDebugGrid}
                forestPathD={forestPathD}
                orchardTimeline={orchardTimeline}
                gladeDecor={gladeDecor}
                mossPatches={mossPatches}
                flowerDecor={flowerDecor}
                blossomScatter={blossomScatter}
                orchardPlacements={orchardPlacements}
                annualTreeAssets={annualTreeAssets}
                highlightedTreeYearSet={highlightedTreeYearSet}
                showTreeLabels={showTreeLabels}
                onOpenForestYear={onOpenForestYear}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {treeChips.map((chip) => (
          <button
            key={`annual-tree-chip-${chip.year}`}
            type="button"
            onClick={() => onTreeChipClick(chip.year)}
            className="lv-btn rounded-full border px-3 py-1 text-xs transition-colors hover:brightness-[0.98]"
            style={chip.style}
            title={`Enfocar año ${chip.year} en el bosque`}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </section>
  );
}
