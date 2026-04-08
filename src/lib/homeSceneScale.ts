export type HomeSceneScalePreset = "default" | "immersive_mobile";

export type HomeSceneScaleConfig = {
  preset: HomeSceneScalePreset;
  markerScale: number;
  annualTreeScale: number;
};

const HOME_SCENE_SCALES: Record<HomeSceneScalePreset, HomeSceneScaleConfig> = {
  default: {
    preset: "default",
    markerScale: 1,
    annualTreeScale: 1,
  },
  immersive_mobile: {
    preset: "immersive_mobile",
    markerScale: 0.58,
    annualTreeScale: 0.72,
  },
};

export function resolveHomeSceneScale(options: {
  immersive: boolean;
  mobileLike: boolean;
}): HomeSceneScaleConfig {
  const { immersive, mobileLike } = options;
  if (immersive && mobileLike) return HOME_SCENE_SCALES.immersive_mobile;
  return HOME_SCENE_SCALES.default;
}
