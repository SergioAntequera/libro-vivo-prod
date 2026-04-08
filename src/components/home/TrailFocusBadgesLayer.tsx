type Point = {
  x: number;
  y: number;
};

export default function TrailFocusBadgesLayer({
  focusTrailPoint,
  focusPerspectiveScale,
  focusMonthLabel,
  summitLabel,
  canvasWidth,
  canvasHeight,
  compact = false,
}: {
  focusTrailPoint: Point;
  focusPerspectiveScale: number;
  focusMonthLabel: string;
  summitLabel: Point & { text: string };
  canvasWidth: number;
  canvasHeight: number;
  compact?: boolean;
}) {
  return (
    <>
      <div
        className="pointer-events-none absolute z-[10]"
        style={{
          left: `${(focusTrailPoint.x / canvasWidth) * 100}%`,
          top: `${(focusTrailPoint.y / canvasHeight) * 100}%`,
          transform: "translate(-50%, -50%)",
        }}
      >
        <div
          className="rounded-full bg-[#f5efbc]/34 blur-[12px]"
          style={{
            width: `${26 + focusPerspectiveScale * 18}px`,
            height: `${26 + focusPerspectiveScale * 18}px`,
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60 bg-[#fbf7da]/72"
          style={{
            width: `${8 + focusPerspectiveScale * 4.4}px`,
            height: `${8 + focusPerspectiveScale * 4.4}px`,
          }}
        />
      </div>

      {!compact ? (
        <>
          <div
            className="pointer-events-none absolute z-[12] rounded-full border bg-white/92 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-700 shadow-sm"
            style={{
              left: `${(summitLabel.x / canvasWidth) * 100}%`,
              top: `${(summitLabel.y / canvasHeight) * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {summitLabel.text}
          </div>
          <div
            className="pointer-events-none absolute z-[24] rounded-full border bg-white/92 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-700 shadow-sm"
            style={{
              left: `${(focusTrailPoint.x / canvasWidth) * 100}%`,
              top: `${(focusTrailPoint.y / canvasHeight) * 100}%`,
              transform:
                focusTrailPoint.x < 220
                  ? "translate(18%, -188%)"
                  : focusTrailPoint.x > 780
                    ? "translate(-118%, -188%)"
                    : "translate(-178%, -188%)",
            }}
          >
            {focusMonthLabel}
          </div>
        </>
      ) : null}
    </>
  );
}
