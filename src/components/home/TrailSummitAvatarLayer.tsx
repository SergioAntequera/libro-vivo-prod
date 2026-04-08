import { AnnualTreeVisual } from "@/components/shared/AnnualTreeVisual";
import { annualTreePhaseFromStage, type AnnualTreePhase } from "@/lib/annualTreeEngine";

type Point = {
  x: number;
  y: number;
};

type AvatarItem = {
  src: string;
  alt: string;
};

function annualTreeVisualSize(phase: AnnualTreePhase) {
  if (phase === "seed" || phase === "germination") return 132;
  if (phase === "sprout" || phase === "sapling") return 146;
  if (phase === "young") return 158;
  if (phase === "mature") return 170;
  return 182;
}

export default function TrailSummitAvatarLayer({
  treeAnchor,
  statusAnchor,
  canvasWidth,
  canvasHeight,
  annualTreeStage,
  annualTreeSeed,
  annualTreeStatusLabel,
  annualTreeAssets,
  focusTrailPoint,
  focusAvatarOffset,
  focusPerspectiveScale,
  avatars,
  compact = false,
  treeScale = 1,
}: {
  treeAnchor: Point;
  statusAnchor: Point;
  canvasWidth: number;
  canvasHeight: number;
  annualTreeStage: number;
  annualTreeSeed: number;
  annualTreeStatusLabel: string;
  annualTreeAssets: Record<AnnualTreePhase, string | null>;
  focusTrailPoint: Point;
  focusAvatarOffset: Point;
  focusPerspectiveScale: number;
  avatars: AvatarItem[];
  compact?: boolean;
  treeScale?: number;
}) {
  const annualTreePhase = annualTreePhaseFromStage(annualTreeStage);
  const treeSize = Math.round(annualTreeVisualSize(annualTreePhase) * treeScale);
  const treeFrameWidth = treeSize + 64;
  const treeFrameHeight = treeSize + 54;

  return (
    <>
      <div
        className="pointer-events-none absolute z-[30]"
        style={{
          left: `${(treeAnchor.x / canvasWidth) * 100}%`,
          top: `${(treeAnchor.y / canvasHeight) * 100}%`,
          width: `${treeFrameWidth}px`,
          height: `${treeFrameHeight}px`,
          transform: "translate(-50%, -100%)",
        }}
      >
        {!compact ? (
          <>
            <div className="absolute left-1/2 top-[12px] h-14 w-40 -translate-x-1/2 rounded-[50%] bg-[#f6eed7]/38 blur-[18px]" />
            <div className="absolute left-1/2 bottom-1 h-8 w-28 -translate-x-1/2 rounded-full bg-[#516b40]/18 blur-[9px]" />
            <div className="absolute left-1/2 bottom-0 h-10 w-34 -translate-x-1/2 rounded-full bg-[#dbcdb6]/18 blur-[10px]" />
          </>
        ) : null}
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2">
          <AnnualTreeVisual
            stage={annualTreeStage}
            seed={annualTreeSeed}
            size={treeSize}
            assetsByPhase={annualTreeAssets}
            className="object-contain drop-shadow-[0_10px_20px_rgba(84,70,45,0.18)]"
          />
        </div>
      </div>
      {!compact ? (
        <>
          <div
            className="pointer-events-none absolute z-[32] rounded-full border bg-white/94 px-3 py-1 text-[11px] text-slate-700 shadow-sm"
            style={{
              left: `${(statusAnchor.x / canvasWidth) * 100}%`,
              top: `${(statusAnchor.y / canvasHeight) * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {annualTreeStatusLabel}
          </div>
          <div
            className="pointer-events-none absolute z-[40]"
            style={{
              left: `${((focusTrailPoint.x + focusAvatarOffset.x) / canvasWidth) * 100}%`,
              top: `${((focusTrailPoint.y + focusAvatarOffset.y) / canvasHeight) * 100}%`,
              transform: `translate(-50%, -50%) scale(${0.72 + focusPerspectiveScale * 0.26})`,
            }}
          >
            <div
              className="flex -space-x-2"
              style={{ animation: "lvAvatarBob 3.8s ease-in-out infinite" }}
            >
              {avatars.map((avatar) => (
                <img
                  key={`${avatar.src}:${avatar.alt}`}
                  src={avatar.src}
                  alt={avatar.alt}
                  className="h-8 w-8 rounded-xl border bg-white shadow-sm"
                />
              ))}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
