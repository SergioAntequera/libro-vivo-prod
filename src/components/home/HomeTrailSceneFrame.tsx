import type { PointerEvent, ReactNode, Ref } from "react";

type HomeTrailParallax = {
  bgX: number;
  cloudLeftX: number;
  cloudRightX: number;
  farX: number;
  midX: number;
  nearX: number;
  frontX: number;
};

type HomeTrailSceneTokens = {
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  meadow: string;
  meadowShadow: string;
};

export default function HomeTrailSceneFrame({
  sceneTokens,
  pathGlow,
  useLandscapeAsset,
  resolvedLandscapeAsset,
  landscapeMode = "ambient",
  sceneBackgroundMode = "season_gradient",
  sceneBackgroundSolid = "#efe7dc",
  seasonSceneWash,
  onLandscapeAssetError,
  parallax,
  showAmbienceLayer,
  canvasWidth,
  canvasHeight,
  viewportTransform,
  viewportRef,
  onPathPointerDown,
  onPathPointerMove,
  onFinishDrag,
  children,
  immersive = false,
}: {
  sceneTokens: HomeTrailSceneTokens;
  pathGlow: string;
  useLandscapeAsset: boolean;
  resolvedLandscapeAsset: string;
  landscapeMode?: "ambient" | "scene";
  sceneBackgroundMode?: "season_gradient" | "solid" | "none";
  sceneBackgroundSolid?: string;
  seasonSceneWash: string;
  onLandscapeAssetError: () => void;
  parallax: HomeTrailParallax;
  showAmbienceLayer: boolean;
  canvasWidth: number;
  canvasHeight: number;
  viewportTransform: {
    zoom: number;
    panX: number;
    panY: number;
  };
  viewportRef: Ref<HTMLDivElement>;
  onPathPointerDown: (e: PointerEvent<HTMLDivElement>) => void;
  onPathPointerMove: (e: PointerEvent<HTMLDivElement>) => void;
  onFinishDrag: (pointerId: number) => void;
  children: ReactNode;
  immersive?: boolean;
}) {
  const frameBackgroundImage =
    landscapeMode === "scene"
      ? sceneBackgroundMode === "none"
        ? "none"
        : sceneBackgroundMode === "solid"
          ? "none"
          : seasonSceneWash
      : `linear-gradient(to bottom, ${sceneTokens.skyTop}, ${sceneTokens.skyMid} 46%, ${sceneTokens.skyBottom})`;
  const frameBackgroundColor =
    landscapeMode === "scene"
      ? sceneBackgroundMode === "solid"
        ? sceneBackgroundSolid
        : "#f3eee5"
      : sceneTokens.skyMid;

  return (
    <div
      className={
        immersive
          ? "relative h-full w-full overflow-hidden"
          : "lv-card relative overflow-hidden p-3"
      }
      style={{
        backgroundImage: frameBackgroundImage,
        backgroundColor: frameBackgroundColor,
        borderColor: immersive ? "transparent" : pathGlow,
      }}
    >
      {useLandscapeAsset && landscapeMode !== "scene" ? (
        <img
          src={resolvedLandscapeAsset}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{
            opacity: 0.24,
            filter: "blur(1.4px)",
            transform: `translateX(${parallax.bgX}px) scale(1.08)`,
            transformOrigin: "center center",
            transition: "transform 280ms ease-out",
          }}
          onError={onLandscapeAssetError}
        />
      ) : null}

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            landscapeMode === "scene"
              ? "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 20%, rgba(255,255,255,0) 48%)"
              : "linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.12) 18%, rgba(255,255,255,0.02) 42%, rgba(255,255,255,0) 62%)",
        }}
      />
      {landscapeMode !== "scene" ? (
        <>
          <div
            className="pointer-events-none absolute left-[10%] top-12 h-7 w-24 rounded-full opacity-14"
            style={{
              backgroundColor: "#afc5a2",
              filter: "blur(1px)",
              transform: `translateX(${parallax.cloudLeftX}px)`,
            }}
          />
          <div
            className="pointer-events-none absolute right-[20%] top-18 h-8 w-28 rounded-full opacity-12"
            style={{
              backgroundColor: "#b3cda7",
              filter: "blur(1px)",
              transform: `translateX(${parallax.cloudRightX}px)`,
            }}
          />
          <div
            className="pointer-events-none absolute bottom-[156px] left-[-10%] h-44 w-[52%] rounded-[50%] opacity-32"
            style={{
              background: "linear-gradient(180deg, rgba(224,240,214,0.76), rgba(179,210,152,0.58))",
              transform: `translateX(${parallax.farX}px)`,
            }}
          />
          <div
            className="pointer-events-none absolute bottom-[146px] right-[-12%] h-48 w-[56%] rounded-[50%] opacity-28"
            style={{
              background: "linear-gradient(180deg, rgba(222,237,207,0.74), rgba(166,198,143,0.56))",
              transform: `translateX(${parallax.midX}px)`,
            }}
          />
          <div
            className="pointer-events-none absolute bottom-[-38px] left-[-6%] right-[-6%] h-40 opacity-95"
            style={{
              background: `linear-gradient(180deg, ${sceneTokens.meadow} 0%, ${sceneTokens.meadowShadow} 100%)`,
              borderRadius: "42% 42% 0 0 / 100% 100% 0 0",
              transform: `translateX(${parallax.nearX}px)`,
            }}
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-[78px] h-22 opacity-18"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(222,239,196,0.84) 0%, rgba(222,239,196,0) 72%)",
              filter: "blur(10px)",
              transform: `translateX(${parallax.frontX}px)`,
            }}
          />
        </>
      ) : null}
      {showAmbienceLayer && (
        <div
          className="pointer-events-none absolute left-[-10%] right-[-10%] bottom-[6%] h-24 opacity-22"
          style={{
            background: pathGlow,
            borderRadius: "50%",
            transform: `translateX(${parallax.frontX}px)`,
            transition: "transform 260ms ease-out, background 380ms ease",
            filter: "blur(16px)",
          }}
        />
      )}

      <div
        className={
          immersive
            ? "absolute inset-0"
            : "relative"
        }
      >
        <div
          ref={viewportRef}
          className="relative w-full select-none touch-none cursor-grab active:cursor-grabbing"
          style={{
            overscrollBehavior: "contain",
            ...(immersive
              ? {
                  width: "100%",
                  height: "100%",
                }
              : {
                  aspectRatio: `${canvasWidth} / ${canvasHeight}`,
                }),
          }}
          onPointerDown={onPathPointerDown}
          onPointerMove={onPathPointerMove}
          onPointerUp={(e) => onFinishDrag(e.pointerId)}
          onPointerCancel={(e) => onFinishDrag(e.pointerId)}
        >
          <div
            className="absolute inset-0"
            style={{
              transform: `translate(${viewportTransform.panX}px, ${viewportTransform.panY}px) scale(${viewportTransform.zoom})`,
              transformOrigin: "0 0",
            }}
          >
            <div className="relative h-full w-full">
              {useLandscapeAsset && landscapeMode === "scene" ? (
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
                  preserveAspectRatio="none"
                >
                  <image
                    href={resolvedLandscapeAsset}
                    x="0"
                    y="0"
                    width={canvasWidth}
                    height={canvasHeight}
                    preserveAspectRatio="none"
                    opacity="0.94"
                    onError={onLandscapeAssetError}
                  />
                </svg>
              ) : null}
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
