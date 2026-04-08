"use client";

import TopdownTreeSprite from "@/components/forest/TopdownTreeSprite";
import {
  annualTreePhaseFromStage,
  type AnnualTreePhase,
} from "@/lib/annualTreeEngine";

type AnnualTreeVisualProps = {
  stage: number;
  seed: number;
  size?: number | string;
  assetsByPhase?: Record<AnnualTreePhase, string | null>;
  className?: string;
  alt?: string;
};

export function AnnualTreeVisual({
  stage,
  seed,
  size = 88,
  assetsByPhase,
  className,
  alt = "",
}: AnnualTreeVisualProps) {
  const phase = annualTreePhaseFromStage(stage);
  const assetPath = assetsByPhase?.[phase]?.trim() || null;

  if (assetPath) {
    return (
      <img
        src={assetPath}
        alt={alt}
        className={className ?? "object-contain"}
        style={{
          width: typeof size === "number" ? `${size}px` : size,
          height: typeof size === "number" ? `${size}px` : size,
        }}
      />
    );
  }

  return <TopdownTreeSprite stage={stage} seed={seed} size={size} />;
}
