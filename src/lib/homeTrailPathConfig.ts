import type { HomeSeasonTone } from "@/lib/homePageUtils";

export type HomeTrailPathConfig = {
  canvasWidth: number;
  canvasHeight: number;
  sourceLabel: string;
  sourceAsset: string | null;
  pathD: string;
  hillBackdropPath?: string | null;
  seasonBands?: Array<{
    season: HomeSeasonTone;
    label: string;
    top: number;
    bottom: number;
  }>;
};

export const HOME_VISIBLE_TRAIL_PATH_CONFIG: HomeTrailPathConfig = {
  canvasWidth: 1000,
  canvasHeight: 1160,
  sourceLabel: "Sendero visible manual editable",
  sourceAsset: null,
  pathD:
    "M 68 1080 C 191.84 1067.32 915.17 1027.88 932 991.5 C 932 955.12 207.48 876.57 185.42 826.21 C 163.36 775.84 751.35 692.48 778.09 640.11 C 804.82 587.74 392.73 508.83 371.95 460.84 C 351.18 412.85 616.36 344.04 633.12 305.28 C 649.88 266.52 501.82 217.75 488.89 190.41 C 475.96 163.07 537.83 131.51 542.89 114.55 C 547.94 97.6 526.21 80.22 524.15 72.11 C 522.1 64.01 527.94 60.02 528.57 58",
};

