import { annualTreePhaseLabel } from "@/lib/annualTreeEngine";
import type { AnnualTreePhase } from "@/lib/annualTreeEngine";
import { AnnualTreeVisual } from "@/components/shared/AnnualTreeVisual";
import {
  annualTreeBedTone,
  annualTreePhaseTone,
  clampNumber,
} from "@/lib/forestPageUtils";
import type {
  ForestCanvasPlacedTree,
  ForestCanvasTimelineNode,
  ForestFlowerDot,
  ForestGlowPatch,
  ForestMossPatch,
} from "@/lib/forestCanvasDecor";

type ForestCanvasContentProps = {
  forestCanvasWidth: number;
  forestCanvasHeight: number;
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
};

export default function ForestCanvasContent({
  forestCanvasWidth,
  forestCanvasHeight,
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
}: ForestCanvasContentProps) {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(180deg, #dbe6d1 0%, #d3e2c7 18%, #c1d9ae 42%, #9fc47f 74%, #7ea65e 100%), radial-gradient(circle at 18% 14%, rgba(255,255,255,0.34), transparent 28%), radial-gradient(circle at 84% 18%, rgba(248,241,210,0.22), transparent 26%), radial-gradient(circle at 54% 58%, rgba(241,233,187,0.2), transparent 34%), radial-gradient(circle at 14% 82%, rgba(109, 86, 47, 0.15), transparent 28%), radial-gradient(circle at 88% 84%, rgba(89, 72, 43, 0.16), transparent 28%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[22%]"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0))",
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[24%]"
        style={{
          background:
            "linear-gradient(180deg, rgba(86,118,58,0), rgba(66,95,46,0.18) 55%, rgba(53,79,38,0.28))",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-25 mix-blend-soft-light"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px), radial-gradient(circle, rgba(67,94,56,0.12) 0.9px, transparent 1px)",
          backgroundSize: "18px 18px, 26px 26px",
          backgroundPosition: "0 0, 11px 9px",
        }}
      />

      {showDebugGrid && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(40,40,40,0.16) 0px, rgba(40,40,40,0.16) 1px, transparent 1px, transparent 34px), repeating-linear-gradient(90deg, rgba(40,40,40,0.16) 0px, rgba(40,40,40,0.16) 1px, transparent 1px, transparent 34px)",
          }}
        />
      )}

      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 ${forestCanvasWidth} ${forestCanvasHeight}`}
        preserveAspectRatio="none"
      >
        {forestPathD && (
          <>
            <path
              d={forestPathD}
              fill="none"
              stroke="rgba(244, 232, 184, 0.52)"
              strokeWidth={18}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.46}
            />
            <path
              d={forestPathD}
              fill="none"
              stroke="rgba(117, 96, 55, 0.12)"
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="2 18"
              opacity={0.85}
            />
          </>
        )}
        {orchardTimeline.map((tree) => (
          <g key={`forest-node-${tree.year}`}>
            <circle
              cx={tree.x}
              cy={tree.y + tree.treeSize * 0.18}
              r={Math.max(6, tree.treeSize * 0.055)}
              fill="rgba(246, 238, 211, 0.54)"
            />
            <circle
              cx={tree.x}
              cy={tree.y + tree.treeSize * 0.18}
              r={Math.max(2.2, tree.treeSize * 0.018)}
              fill="rgba(134, 104, 57, 0.32)"
            />
          </g>
        ))}
      </svg>

      <div className="pointer-events-none absolute inset-0">
        {gladeDecor.map((patch, idx) => (
          <div
            key={`forest-glade-${idx}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-[999px]"
            style={{
              left: `${patch.x}px`,
              top: `${patch.y}px`,
              width: `${patch.w}px`,
              height: `${patch.h}px`,
              opacity: patch.opacity,
              backgroundColor: patch.color,
              filter: "blur(14px)",
              mixBlendMode: "soft-light",
            }}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0">
        {mossPatches.map((patch, idx) => (
          <div
            key={`forest-moss-patch-${idx}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-[999px]"
            style={{
              left: `${patch.x}px`,
              top: `${patch.y}px`,
              width: `${patch.w}px`,
              height: `${patch.h}px`,
              opacity: patch.opacity,
              backgroundColor: patch.color,
              filter: "blur(2px)",
              transform: `translate(-50%, -50%) rotate(${patch.rotate}deg)`,
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
            }}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0">
        {flowerDecor.map((flower, idx) => (
          <div
            key={`forest-flower-${idx}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/45"
            style={{
              left: `${flower.x}px`,
              top: `${flower.y}px`,
              width: `${flower.size}px`,
              height: `${flower.size}px`,
              backgroundColor: flower.color,
            }}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0">
        {blossomScatter.map((flower, idx) => (
          <div
            key={`forest-blossom-scatter-${idx}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/55"
            style={{
              left: `${flower.x}px`,
              top: `${flower.y}px`,
              width: `${flower.size}px`,
              height: `${flower.size}px`,
              backgroundColor: flower.color,
              boxShadow: "0 0 8px rgba(255,255,255,0.22)",
            }}
          />
        ))}
      </div>

      {orchardPlacements.map((tree) => {
        const bed = annualTreeBedTone(tree.growth.phase);
        const isHighlighted = highlightedTreeYearSet.has(tree.year);
        const needsContrastBoost =
          tree.growth.phase === "seed" ||
          tree.growth.phase === "germination" ||
          tree.growth.phase === "sprout" ||
          tree.growth.phase === "sapling" ||
          tree.growth.phase === "young";
        return (
          <div
            key={`annual-tree-topdown-${tree.year}`}
            className="absolute"
            style={{
              left: `${tree.x}px`,
              top: `${tree.y}px`,
              transform: "translate(-50%, -50%)",
              width: `${tree.treeSize}px`,
              height: `${tree.treeSize}px`,
              zIndex: 10 + Math.round(tree.y),
            }}
          >
            {isHighlighted && (
              <>
                <div
                  className="pointer-events-none absolute left-1/2 top-[46%] h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#fff6bd]/90 animate-ping"
                  style={{
                    boxShadow: "0 0 34px rgba(255, 244, 181, 0.55)",
                  }}
                />
                <div
                  className="pointer-events-none absolute left-1/2 top-[46%] h-[64%] w-[64%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#fff3ab]"
                  style={{
                    boxShadow: "0 0 0 10px rgba(255, 245, 199, 0.18)",
                  }}
                />
              </>
            )}
            {needsContrastBoost && (
              <div
                className="pointer-events-none absolute left-1/2 top-[43%] h-[48%] w-[58%] -translate-x-1/2 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(255,255,246,0.52) 0%, rgba(245,249,233,0.32) 42%, rgba(255,255,255,0) 78%)",
                  filter: "blur(12px)",
                }}
              />
            )}
            <div
              className="pointer-events-none absolute left-1/2 top-[58%] h-[30%] w-[84%] -translate-x-1/2 rounded-[999px]"
              style={{
                backgroundColor: bed.glow,
                filter: "blur(18px)",
                opacity: 0.9,
              }}
            />
            <div
              className="pointer-events-none absolute left-1/2 top-[66%] h-[20%] w-[70%] -translate-x-1/2 rounded-[999px]"
              style={{
                backgroundColor: bed.mulch,
                boxShadow: `0 0 0 1px ${bed.ring}, 0 6px 14px rgba(48, 70, 38, 0.12)`,
              }}
            />
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
              onClick={() => onOpenForestYear(tree.year)}
              data-forest-tree-button="true"
              className="absolute z-20 block overflow-visible transition-transform duration-200 hover:scale-[1.05] focus:scale-[1.05]"
              style={{
                left: "-8%",
                top: "-10%",
                width: "116%",
                height: "116%",
              }}
              title={`${tree.year} - ${annualTreePhaseLabel(tree.growth.phase)} - ${tree.growth.stage}/100`}
              aria-label={`Abrir ${tree.year}, ${annualTreePhaseLabel(tree.growth.phase)}, ${tree.growth.stage} de 100`}
            >
              <AnnualTreeVisual
                stage={tree.growth.stage}
                seed={tree.year * 29 + tree.growth.stage}
                size="100%"
                assetsByPhase={annualTreeAssets}
              />
            </button>
          </div>
        );
      })}

      {showTreeLabels && (
        <div className="pointer-events-none absolute inset-0" style={{ zIndex: 2000 }}>
          {orchardPlacements.map((tree) => {
            const labelLeft = clampNumber(tree.x, 58, forestCanvasWidth - 58);
            const labelTop = clampNumber(
              tree.y + tree.treeSize * 0.62,
              28,
              forestCanvasHeight - 28,
            );
            return (
              <div
                key={`annual-tree-label-${tree.year}`}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.01em]"
                style={{
                  ...annualTreePhaseTone(tree.growth.phase),
                  minWidth: "54px",
                  textAlign: "center",
                  left: `${labelLeft}px`,
                  top: `${labelTop}px`,
                  boxShadow:
                    highlightedTreeYearSet.has(tree.year)
                      ? "0 12px 28px rgba(76, 96, 35, 0.22), 0 0 0 3px rgba(255,243,171,0.34), inset 0 1px 0 rgba(255,255,255,0.4)"
                      : "0 10px 22px rgba(42, 60, 34, 0.16), inset 0 1px 0 rgba(255,255,255,0.35)",
                  backdropFilter: "blur(6px)",
                  backgroundImage:
                    "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0))",
                }}
              >
                {tree.year}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
