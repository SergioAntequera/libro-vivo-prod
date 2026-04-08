import {
  trailPerspectiveScale,
  type TrailCurveSegment,
  type TrailPoint,
} from "@/lib/homeTrailGeometry";
import { SEASON_THEME } from "@/lib/homeSceneDefaults";

type TrailSceneTerrainLayerProps = {
  trailCurveSegments: TrailCurveSegment[];
  trailPoints: TrailPoint[];
  eventDayIndexSet: Set<number>;
  focusIndex: number;
  canvasWidth: number;
  canvasHeight: number;
  hillBackdropPath: string;
  seasonBands: Array<{
    season: "spring" | "summer" | "autumn" | "winter";
    label: string;
    top: number;
    bottom: number;
  }>;
  renderTerrain?: boolean;
  showSeasonLabels?: boolean;
};

export default function TrailSceneTerrainLayer({
  trailCurveSegments,
  trailPoints,
  eventDayIndexSet,
  focusIndex,
  canvasWidth,
  canvasHeight,
  hillBackdropPath,
  seasonBands,
  renderTerrain = true,
  showSeasonLabels = true,
}: TrailSceneTerrainLayerProps) {
  return (
    <>
      {renderTerrain ? (
        <div className="pointer-events-none absolute left-1/2 top-[1.6%] z-[2] h-[14%] w-[30%] -translate-x-1/2 rounded-[50%] bg-[#eef5db]/60 blur-[16px]" />
      ) : null}

      {showSeasonLabels
        ? seasonBands.map((band) => {
        const tone = SEASON_THEME[band.season];
        return (
          <div
            key={`hill-band-label-${band.season}`}
            className="pointer-events-none absolute left-3 z-[18] rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-700 shadow-sm backdrop-blur"
            style={{
              top: `${(((band.top + band.bottom) / 2) / canvasHeight) * 100}%`,
              transform: "translateY(-50%)",
              borderColor: tone.pathGlow,
              background: "rgba(255,255,255,0.74)",
              boxShadow: "0 8px 18px rgba(92, 122, 74, 0.08)",
            }}
          >
            {band.label}
          </div>
        );
      })
        : null}

      {renderTerrain ? (
        <svg
          className="pointer-events-none absolute inset-0 z-[3] h-full w-full"
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="lvHillBodyGradient" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="rgba(90, 146, 66, 0.66)" />
              <stop offset="56%" stopColor="rgba(141, 191, 102, 0.42)" />
              <stop offset="100%" stopColor="rgba(225, 239, 193, 0.03)" />
            </linearGradient>
            <radialGradient id="lvHillCrestGlow" cx="50%" cy="18%" r="42%">
              <stop offset="0%" stopColor="rgba(245, 250, 214, 0.56)" />
              <stop offset="58%" stopColor="rgba(245, 250, 214, 0.12)" />
              <stop offset="100%" stopColor="rgba(245, 250, 214, 0)" />
            </radialGradient>
            <radialGradient id="lvHillLeftLight" cx="30%" cy="48%" r="68%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.16)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
            </radialGradient>
            <radialGradient id="lvHillRightShade" cx="76%" cy="66%" r="62%">
              <stop offset="0%" stopColor="rgba(70, 112, 49, 0.08)" />
              <stop offset="100%" stopColor="rgba(70, 112, 49, 0)" />
            </radialGradient>
            <clipPath id="lvHillClip">
              <path d={hillBackdropPath} />
            </clipPath>
          </defs>
          <path d={hillBackdropPath} fill="url(#lvHillBodyGradient)" />
          <g clipPath="url(#lvHillClip)">
            <ellipse cx={canvasWidth * 0.5} cy={canvasHeight * 0.78} rx={canvasWidth * 0.65} ry={canvasHeight * 0.2} fill="rgba(193, 231, 255, 0.16)" />
            <ellipse cx={canvasWidth * 0.5} cy={canvasHeight * 0.62} rx={canvasWidth * 0.57} ry={canvasHeight * 0.18} fill="rgba(188, 245, 203, 0.16)" />
            <ellipse cx={canvasWidth * 0.5} cy={canvasHeight * 0.44} rx={canvasWidth * 0.43} ry={canvasHeight * 0.15} fill="rgba(255, 234, 180, 0.08)" />
            <ellipse cx={canvasWidth * 0.54} cy={canvasHeight * 0.22} rx={canvasWidth * 0.274} ry={canvasHeight * 0.088} fill="rgba(255, 214, 186, 0.05)" />
            <rect x="0" y="0" width={canvasWidth} height={canvasHeight} fill="url(#lvHillCrestGlow)" />
            <ellipse cx={canvasWidth * 0.452} cy={canvasHeight * 0.62} rx={canvasWidth * 0.592} ry={canvasHeight * 0.276} fill="url(#lvHillLeftLight)" />
            <ellipse cx={canvasWidth * 0.566} cy={canvasHeight * 0.78} rx={canvasWidth * 0.706} ry={canvasHeight * 0.208} fill="url(#lvHillRightShade)" />
          </g>
          <path
            d={hillBackdropPath}
            fill="none"
            stroke="rgba(245, 252, 234, 0.05)"
            strokeWidth="0.8"
          />
        </svg>
      ) : null}

      <svg
        className="absolute inset-0 z-[4] h-full w-full"
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="lvTrailShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>

        {renderTerrain
          ? trailCurveSegments.map((segment, index) => {
          const scale = trailPerspectiveScale(segment.avgY, canvasHeight);
          return (
            <path
              key={`trail-shadow-${index}`}
              d={segment.d}
              fill="none"
              stroke="rgba(88, 118, 68, 0.12)"
              strokeWidth={20 + scale * 30}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#lvTrailShadow)"
            />
          );
        })
          : null}

        {renderTerrain
          ? trailCurveSegments.map((segment, index) => {
          const scale = trailPerspectiveScale(segment.avgY, canvasHeight);
          return (
            <path
              key={`trail-outer-${index}`}
              d={segment.d}
              fill="none"
              stroke="rgba(215, 200, 134, 0.97)"
              strokeWidth={20 + scale * 28}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })
          : null}

        {renderTerrain
          ? trailCurveSegments.map((segment, index) => {
          const scale = trailPerspectiveScale(segment.avgY, canvasHeight);
          return (
            <path
              key={`trail-inner-${index}`}
              d={segment.d}
              fill="none"
              stroke="rgba(247, 237, 188, 0.98)"
              strokeWidth={14 + scale * 20}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })
          : null}

        {renderTerrain
          ? trailCurveSegments.map((segment, index) => {
          const scale = trailPerspectiveScale(segment.avgY, canvasHeight);
          return (
            <path
              key={`trail-highlight-${index}`}
              d={segment.d}
              fill="none"
              stroke="rgba(255, 255, 255, 0.18)"
              strokeWidth={1.4 + scale * 2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })
          : null}

        {renderTerrain
          ? trailCurveSegments.map((segment, index) => {
          const scale = trailPerspectiveScale(segment.avgY, canvasHeight);
          return (
            <path
              key={`trail-dots-${index}`}
              d={segment.d}
              fill="none"
              stroke="rgba(163, 159, 103, 0.22)"
              strokeWidth={0.8 + scale * 1.1}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={`${1.2 + scale * 0.35} ${13 + scale * 8}`}
            />
          );
        })
          : null}

        {trailPoints.map((point, index) => {
          if (eventDayIndexSet.has(index)) return null;
          const isFocus = index === focusIndex;
          if (!isFocus && index % 28 !== 0) return null;
          return (
            <circle
              key={`trail-day-${index}`}
              cx={point.x}
              cy={point.y}
              r={
                (isFocus ? 2.4 : 1.6) +
                trailPerspectiveScale(point.y, canvasHeight) * (isFocus ? 1.05 : 0.42)
              }
              fill={isFocus ? "rgba(110, 140, 76, 0.9)" : "rgba(168, 172, 121, 0.32)"}
            />
          );
        })}
      </svg>
    </>
  );
}
