import { getManyCatalogItems, type CatalogItemConfig } from "@/lib/appConfig";
import type { AnnualTreePhase } from "@/lib/annualTreeEngine";
import { resolveTrailGeometry } from "@/lib/homeTrailGeometry";
import { HOME_VISIBLE_TRAIL_PATH_CONFIG } from "@/lib/homeTrailPathConfig";
import {
  normalizeSceneRegions,
  serializeSceneRegions,
  type SceneRegion,
} from "@/lib/homeSceneRegions";

const DEFAULT_GEOMETRY = resolveTrailGeometry(HOME_VISIBLE_TRAIL_PATH_CONFIG);

export const ANNUAL_TREE_PHASES: AnnualTreePhase[] = [
  "seed",
  "germination",
  "sprout",
  "sapling",
  "young",
  "mature",
  "blooming",
  "legacy",
];

export const HOME_TRAIL_SCENE_CODES = {
  canvasWidth: "trail_canvas_width",
  canvasHeight: "trail_canvas_height",
  pathD: "trail_path_d",
  sourceAsset: "trail_source_asset",
  displayDesktopWidth: "trail_display_desktop_width",
  displayTabletWidth: "trail_display_tablet_width",
  displayMobileWidth: "trail_display_mobile_width",
  showSeasonBandLabels: "trail_show_season_band_labels",
  sceneBackgroundMode: "trail_scene_background_mode",
  sceneBackgroundSolid: "trail_scene_background_solid",
  summitLabelText: "trail_summit_label_text",
  summitLabelX: "trail_summit_label_x",
  summitLabelY: "trail_summit_label_y",
  summitTreeX: "trail_summit_tree_x",
  summitTreeY: "trail_summit_tree_y",
  summitStatusX: "trail_summit_status_x",
  summitStatusY: "trail_summit_status_y",
  summitAvatarsX: "trail_summit_avatars_x",
  summitAvatarsY: "trail_summit_avatars_y",
  annualTreeSeedAsset: "annual_tree_seed_asset",
  annualTreeGerminationAsset: "annual_tree_germination_asset",
  annualTreeSproutAsset: "annual_tree_sprout_asset",
  annualTreeSaplingAsset: "annual_tree_sapling_asset",
  annualTreeYoungAsset: "annual_tree_young_asset",
  annualTreeMatureAsset: "annual_tree_mature_asset",
  annualTreeBloomingAsset: "annual_tree_blooming_asset",
  annualTreeLegacyAsset: "annual_tree_legacy_asset",
  regionsJson: "trail_regions_json",
} as const;

export type HomeTrailRuntimeConfig = {
  canvasWidth: number;
  canvasHeight: number;
  pathD: string;
  sourceAsset: string | null;
  displayDesktopWidth: number;
  displayTabletWidth: number;
  displayMobileWidth: number;
  showSeasonBandLabels: boolean;
  sceneBackgroundMode: "season_gradient" | "solid" | "none";
  sceneBackgroundSolid: string;
  summitLabelText: string;
  summitLabelX: number;
  summitLabelY: number;
  summitTreeX: number;
  summitTreeY: number;
  summitStatusX: number;
  summitStatusY: number;
  summitAvatarsX: number;
  summitAvatarsY: number;
  annualTreeAssets: Record<AnnualTreePhase, string | null>;
  regions: SceneRegion[];
};

type HomeTrailRuntimeConfigInput = {
  canvasWidth?: unknown;
  canvasHeight?: unknown;
  pathD?: unknown;
  sourceAsset?: unknown;
  displayDesktopWidth?: unknown;
  displayTabletWidth?: unknown;
  displayMobileWidth?: unknown;
  showSeasonBandLabels?: unknown;
  sceneBackgroundMode?: unknown;
  sceneBackgroundSolid?: unknown;
  summitLabelText?: unknown;
  summitLabelX?: unknown;
  summitLabelY?: unknown;
  summitTreeX?: unknown;
  summitTreeY?: unknown;
  summitStatusX?: unknown;
  summitStatusY?: unknown;
  summitAvatarsX?: unknown;
  summitAvatarsY?: unknown;
  annualTreeAssets?: Partial<Record<AnnualTreePhase, unknown>>;
  regions?: unknown;
};

export const DEFAULT_HOME_TRAIL_RUNTIME_CONFIG: HomeTrailRuntimeConfig = {
  canvasWidth: HOME_VISIBLE_TRAIL_PATH_CONFIG.canvasWidth,
  canvasHeight: HOME_VISIBLE_TRAIL_PATH_CONFIG.canvasHeight,
  pathD: HOME_VISIBLE_TRAIL_PATH_CONFIG.pathD,
  sourceAsset: HOME_VISIBLE_TRAIL_PATH_CONFIG.sourceAsset,
  displayDesktopWidth: 780,
  displayTabletWidth: 700,
  displayMobileWidth: 360,
  showSeasonBandLabels: false,
  sceneBackgroundMode: "season_gradient",
  sceneBackgroundSolid: "#efe7dc",
  summitLabelText: "Cima del año",
  summitLabelX: DEFAULT_GEOMETRY.summitPoint.x,
  summitLabelY: DEFAULT_GEOMETRY.summitLabelY,
  summitTreeX: DEFAULT_GEOMETRY.summitPoint.x,
  summitTreeY: DEFAULT_GEOMETRY.summitPoint.y + 18,
  summitStatusX: DEFAULT_GEOMETRY.summitPoint.x,
  summitStatusY: DEFAULT_GEOMETRY.summitPoint.y + 88,
  summitAvatarsX: DEFAULT_GEOMETRY.summitPoint.x + 68,
  summitAvatarsY: DEFAULT_GEOMETRY.summitPoint.y + 84,
  annualTreeAssets: {
    seed: "/assets/tree_seed.png",
    germination: "/assets/tree_seed.png",
    sprout: "/assets/tree_sprout.png",
    sapling: "/assets/tree_sprout.png",
    young: "/assets/tree_young.png",
    mature: "/assets/tree_medium.png",
    blooming: "/assets/tree_big.png",
    legacy: "/assets/tree_big.png",
  },
  regions: [],
};

function toPositiveNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(100, Math.round(parsed));
}

function toDisplayWidth(value: unknown, fallback: number, min: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < min) return fallback;
  return Math.round(parsed);
}

function toCanvasNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.round(parsed * 100) / 100;
}

function toBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  const text = String(value ?? "").trim().toLowerCase();
  if (["1", "true", "yes", "si", "on"].includes(text)) return true;
  if (["0", "false", "no", "off"].includes(text)) return false;
  return fallback;
}

function toSceneBackgroundMode(value: unknown): HomeTrailRuntimeConfig["sceneBackgroundMode"] {
  const text = String(value ?? "").trim().toLowerCase();
  if (text === "none") return "none";
  if (text === "solid") return "solid";
  return "season_gradient";
}

function sceneCatalogValue(item: CatalogItemConfig | undefined) {
  if (!item) return "";
  const meta = item.metadata ?? {};
  if (typeof meta.value === "string") return meta.value.trim();
  if (typeof meta.value === "number" && Number.isFinite(meta.value)) {
    return String(meta.value);
  }
  return "";
}

export function normalizeHomeTrailRuntimeConfig(
  config: HomeTrailRuntimeConfigInput | null | undefined,
): HomeTrailRuntimeConfig {
  const annualTreeAssets = Object.fromEntries(
    ANNUAL_TREE_PHASES.map((phase) => {
      const configured = String(config?.annualTreeAssets?.[phase] ?? "").trim();
      const fallback = String(
        DEFAULT_HOME_TRAIL_RUNTIME_CONFIG.annualTreeAssets[phase] ?? "",
      ).trim();
      return [phase, configured || fallback || null];
    }),
  ) as Record<AnnualTreePhase, string | null>;
  const regions = normalizeSceneRegions(config?.regions);

  return {
    canvasWidth: toPositiveNumber(
      config?.canvasWidth,
      DEFAULT_HOME_TRAIL_RUNTIME_CONFIG.canvasWidth,
    ),
    canvasHeight: toPositiveNumber(
      config?.canvasHeight,
      DEFAULT_HOME_TRAIL_RUNTIME_CONFIG.canvasHeight,
    ),
    pathD:
      String(config?.pathD ?? "").trim() || DEFAULT_HOME_TRAIL_RUNTIME_CONFIG.pathD,
    sourceAsset: String(config?.sourceAsset ?? "").trim() || null,
    displayDesktopWidth: toDisplayWidth(
      config?.displayDesktopWidth,
      DEFAULT_HOME_TRAIL_RUNTIME_CONFIG.displayDesktopWidth,
      420,
    ),
    displayTabletWidth: toDisplayWidth(
      config?.displayTabletWidth,
      DEFAULT_HOME_TRAIL_RUNTIME_CONFIG.displayTabletWidth,
      320,
    ),
    displayMobileWidth: toDisplayWidth(
      config?.displayMobileWidth,
      DEFAULT_HOME_TRAIL_RUNTIME_CONFIG.displayMobileWidth,
      260,
    ),
    showSeasonBandLabels: toBoolean(
      config?.showSeasonBandLabels,
      DEFAULT_HOME_TRAIL_RUNTIME_CONFIG.showSeasonBandLabels,
    ),
    sceneBackgroundMode: toSceneBackgroundMode(config?.sceneBackgroundMode),
    sceneBackgroundSolid:
      String(config?.sceneBackgroundSolid ?? "").trim() ||
      DEFAULT_HOME_TRAIL_RUNTIME_CONFIG.sceneBackgroundSolid,
    summitLabelText:
      String(config?.summitLabelText ?? "").trim() ||
      DEFAULT_HOME_TRAIL_RUNTIME_CONFIG.summitLabelText,
    summitLabelX: toCanvasNumber(
      config?.summitLabelX,
      DEFAULT_HOME_TRAIL_RUNTIME_CONFIG.summitLabelX,
    ),
    summitLabelY: toCanvasNumber(
      config?.summitLabelY,
      DEFAULT_HOME_TRAIL_RUNTIME_CONFIG.summitLabelY,
    ),
    summitTreeX: toCanvasNumber(
      config?.summitTreeX,
      DEFAULT_HOME_TRAIL_RUNTIME_CONFIG.summitTreeX,
    ),
    summitTreeY: toCanvasNumber(
      config?.summitTreeY,
      DEFAULT_HOME_TRAIL_RUNTIME_CONFIG.summitTreeY,
    ),
    summitStatusX: toCanvasNumber(
      config?.summitStatusX,
      DEFAULT_HOME_TRAIL_RUNTIME_CONFIG.summitStatusX,
    ),
    summitStatusY: toCanvasNumber(
      config?.summitStatusY,
      DEFAULT_HOME_TRAIL_RUNTIME_CONFIG.summitStatusY,
    ),
    summitAvatarsX: toCanvasNumber(
      config?.summitAvatarsX,
      DEFAULT_HOME_TRAIL_RUNTIME_CONFIG.summitAvatarsX,
    ),
    summitAvatarsY: toCanvasNumber(
      config?.summitAvatarsY,
      DEFAULT_HOME_TRAIL_RUNTIME_CONFIG.summitAvatarsY,
    ),
    annualTreeAssets,
    regions,
  };
}

export function resolveHomeTrailConfigFromSceneCatalog(
  sceneCatalog: CatalogItemConfig[] | null | undefined,
): HomeTrailRuntimeConfig {
  const byCode = new Map((sceneCatalog ?? []).map((item) => [item.code, item]));

  return normalizeHomeTrailRuntimeConfig({
    canvasWidth: sceneCatalogValue(byCode.get(HOME_TRAIL_SCENE_CODES.canvasWidth)),
    canvasHeight: sceneCatalogValue(byCode.get(HOME_TRAIL_SCENE_CODES.canvasHeight)),
    pathD: sceneCatalogValue(byCode.get(HOME_TRAIL_SCENE_CODES.pathD)),
    sourceAsset:
      sceneCatalogValue(byCode.get(HOME_TRAIL_SCENE_CODES.sourceAsset)) ||
      DEFAULT_HOME_TRAIL_RUNTIME_CONFIG.sourceAsset ||
      null,
    displayDesktopWidth: sceneCatalogValue(byCode.get(HOME_TRAIL_SCENE_CODES.displayDesktopWidth)),
    displayTabletWidth: sceneCatalogValue(byCode.get(HOME_TRAIL_SCENE_CODES.displayTabletWidth)),
    displayMobileWidth: sceneCatalogValue(byCode.get(HOME_TRAIL_SCENE_CODES.displayMobileWidth)),
    showSeasonBandLabels: sceneCatalogValue(byCode.get(HOME_TRAIL_SCENE_CODES.showSeasonBandLabels)),
    sceneBackgroundMode: sceneCatalogValue(byCode.get(HOME_TRAIL_SCENE_CODES.sceneBackgroundMode)),
    sceneBackgroundSolid: sceneCatalogValue(byCode.get(HOME_TRAIL_SCENE_CODES.sceneBackgroundSolid)),
    summitLabelText: sceneCatalogValue(byCode.get(HOME_TRAIL_SCENE_CODES.summitLabelText)),
    summitLabelX: sceneCatalogValue(byCode.get(HOME_TRAIL_SCENE_CODES.summitLabelX)),
    summitLabelY: sceneCatalogValue(byCode.get(HOME_TRAIL_SCENE_CODES.summitLabelY)),
    summitTreeX: sceneCatalogValue(byCode.get(HOME_TRAIL_SCENE_CODES.summitTreeX)),
    summitTreeY: sceneCatalogValue(byCode.get(HOME_TRAIL_SCENE_CODES.summitTreeY)),
    summitStatusX: sceneCatalogValue(byCode.get(HOME_TRAIL_SCENE_CODES.summitStatusX)),
    summitStatusY: sceneCatalogValue(byCode.get(HOME_TRAIL_SCENE_CODES.summitStatusY)),
    summitAvatarsX: sceneCatalogValue(byCode.get(HOME_TRAIL_SCENE_CODES.summitAvatarsX)),
    summitAvatarsY: sceneCatalogValue(byCode.get(HOME_TRAIL_SCENE_CODES.summitAvatarsY)),
    regions: (() => {
      const raw = sceneCatalogValue(byCode.get(HOME_TRAIL_SCENE_CODES.regionsJson));
      if (!raw) return [];
      try {
        return JSON.parse(raw);
      } catch {
        return [];
      }
    })(),
    annualTreeAssets: {
      seed: sceneCatalogValue(byCode.get(HOME_TRAIL_SCENE_CODES.annualTreeSeedAsset)),
      germination: sceneCatalogValue(byCode.get(HOME_TRAIL_SCENE_CODES.annualTreeGerminationAsset)),
      sprout: sceneCatalogValue(byCode.get(HOME_TRAIL_SCENE_CODES.annualTreeSproutAsset)),
      sapling: sceneCatalogValue(byCode.get(HOME_TRAIL_SCENE_CODES.annualTreeSaplingAsset)),
      young: sceneCatalogValue(byCode.get(HOME_TRAIL_SCENE_CODES.annualTreeYoungAsset)),
      mature: sceneCatalogValue(byCode.get(HOME_TRAIL_SCENE_CODES.annualTreeMatureAsset)),
      blooming: sceneCatalogValue(byCode.get(HOME_TRAIL_SCENE_CODES.annualTreeBloomingAsset)),
      legacy: sceneCatalogValue(byCode.get(HOME_TRAIL_SCENE_CODES.annualTreeLegacyAsset)),
    },
  });
}

export async function getHomeTrailRuntimeConfig() {
  try {
    const catalogs = await getManyCatalogItems(["home_scene_theme"]);
    return resolveHomeTrailConfigFromSceneCatalog(catalogs.home_scene_theme ?? []);
  } catch {
    return DEFAULT_HOME_TRAIL_RUNTIME_CONFIG;
  }
}

export function buildHomeTrailSceneCatalogRows(config: HomeTrailRuntimeConfig) {
  const normalized = normalizeHomeTrailRuntimeConfig(config);

  const rows = [
    {
      catalog_key: "home_scene_theme",
      code: HOME_TRAIL_SCENE_CODES.canvasWidth,
      label: "Trail canvas width",
      sort_order: 1,
      enabled: true,
      color: null as string | null,
      icon: null as string | null,
      metadata: { value: String(normalized.canvasWidth) },
    },
    {
      catalog_key: "home_scene_theme",
      code: HOME_TRAIL_SCENE_CODES.canvasHeight,
      label: "Trail canvas height",
      sort_order: 2,
      enabled: true,
      color: null as string | null,
      icon: null as string | null,
      metadata: { value: String(normalized.canvasHeight) },
    },
    {
      catalog_key: "home_scene_theme",
      code: HOME_TRAIL_SCENE_CODES.pathD,
      label: "Trail path SVG",
      sort_order: 3,
      enabled: true,
      color: null as string | null,
      icon: null as string | null,
      metadata: { value: normalized.pathD },
    },
    {
      catalog_key: "home_scene_theme",
      code: HOME_TRAIL_SCENE_CODES.sourceAsset,
      label: "Trail source asset",
      sort_order: 4,
      enabled: true,
      color: null as string | null,
      icon: normalized.sourceAsset,
      metadata: { value: normalized.sourceAsset ?? "" },
    },
    {
      catalog_key: "home_scene_theme",
      code: HOME_TRAIL_SCENE_CODES.displayDesktopWidth,
      label: "Trail display desktop width",
      sort_order: 5,
      enabled: true,
      color: null as string | null,
      icon: null as string | null,
      metadata: { value: String(normalized.displayDesktopWidth) },
    },
    {
      catalog_key: "home_scene_theme",
      code: HOME_TRAIL_SCENE_CODES.displayTabletWidth,
      label: "Trail display tablet width",
      sort_order: 6,
      enabled: true,
      color: null as string | null,
      icon: null as string | null,
      metadata: { value: String(normalized.displayTabletWidth) },
    },
    {
      catalog_key: "home_scene_theme",
      code: HOME_TRAIL_SCENE_CODES.displayMobileWidth,
      label: "Trail display mobile width",
      sort_order: 7,
      enabled: true,
      color: null as string | null,
      icon: null as string | null,
      metadata: { value: String(normalized.displayMobileWidth) },
    },
    {
      catalog_key: "home_scene_theme",
      code: HOME_TRAIL_SCENE_CODES.showSeasonBandLabels,
      label: "Trail show season labels",
      sort_order: 8,
      enabled: true,
      color: null as string | null,
      icon: null as string | null,
      metadata: { value: normalized.showSeasonBandLabels ? "true" : "false" },
    },
    {
      catalog_key: "home_scene_theme",
      code: HOME_TRAIL_SCENE_CODES.sceneBackgroundMode,
      label: "Trail scene background mode",
      sort_order: 9,
      enabled: true,
      color: null as string | null,
      icon: null as string | null,
      metadata: { value: normalized.sceneBackgroundMode },
    },
    {
      catalog_key: "home_scene_theme",
      code: HOME_TRAIL_SCENE_CODES.sceneBackgroundSolid,
      label: "Trail scene background solid",
      sort_order: 10,
      enabled: true,
      color: normalized.sceneBackgroundSolid,
      icon: null as string | null,
      metadata: { value: normalized.sceneBackgroundSolid },
    },
    {
      catalog_key: "home_scene_theme",
      code: HOME_TRAIL_SCENE_CODES.summitLabelText,
      label: "Trail summit label text",
      sort_order: 11,
      enabled: true,
      color: null as string | null,
      icon: null as string | null,
      metadata: { value: normalized.summitLabelText },
    },
    {
      catalog_key: "home_scene_theme",
      code: HOME_TRAIL_SCENE_CODES.summitLabelX,
      label: "Trail summit label x",
      sort_order: 12,
      enabled: true,
      color: null as string | null,
      icon: null as string | null,
      metadata: { value: String(normalized.summitLabelX) },
    },
    {
      catalog_key: "home_scene_theme",
      code: HOME_TRAIL_SCENE_CODES.summitLabelY,
      label: "Trail summit label y",
      sort_order: 13,
      enabled: true,
      color: null as string | null,
      icon: null as string | null,
      metadata: { value: String(normalized.summitLabelY) },
    },
    {
      catalog_key: "home_scene_theme",
      code: HOME_TRAIL_SCENE_CODES.summitTreeX,
      label: "Trail summit tree x",
      sort_order: 14,
      enabled: true,
      color: null as string | null,
      icon: null as string | null,
      metadata: { value: String(normalized.summitTreeX) },
    },
    {
      catalog_key: "home_scene_theme",
      code: HOME_TRAIL_SCENE_CODES.summitTreeY,
      label: "Trail summit tree y",
      sort_order: 15,
      enabled: true,
      color: null as string | null,
      icon: null as string | null,
      metadata: { value: String(normalized.summitTreeY) },
    },
    {
      catalog_key: "home_scene_theme",
      code: HOME_TRAIL_SCENE_CODES.summitStatusX,
      label: "Trail summit status x",
      sort_order: 16,
      enabled: true,
      color: null as string | null,
      icon: null as string | null,
      metadata: { value: String(normalized.summitStatusX) },
    },
    {
      catalog_key: "home_scene_theme",
      code: HOME_TRAIL_SCENE_CODES.summitStatusY,
      label: "Trail summit status y",
      sort_order: 17,
      enabled: true,
      color: null as string | null,
      icon: null as string | null,
      metadata: { value: String(normalized.summitStatusY) },
    },
    {
      catalog_key: "home_scene_theme",
      code: HOME_TRAIL_SCENE_CODES.summitAvatarsX,
      label: "Trail summit avatars x",
      sort_order: 18,
      enabled: true,
      color: null as string | null,
      icon: null as string | null,
      metadata: { value: String(normalized.summitAvatarsX) },
    },
    {
      catalog_key: "home_scene_theme",
      code: HOME_TRAIL_SCENE_CODES.summitAvatarsY,
      label: "Trail summit avatars y",
      sort_order: 19,
      enabled: true,
      color: null as string | null,
      icon: null as string | null,
      metadata: { value: String(normalized.summitAvatarsY) },
    },
    {
      catalog_key: "home_scene_theme",
      code: HOME_TRAIL_SCENE_CODES.regionsJson,
      label: "Trail regions json",
      sort_order: 20,
      enabled: true,
      color: null as string | null,
      icon: null as string | null,
      metadata: { value: serializeSceneRegions(normalized.regions) },
    },
  ];

  const annualTreeRows = ANNUAL_TREE_PHASES.map((phase, index) => ({
    catalog_key: "home_scene_theme",
    code:
      phase === "seed"
        ? HOME_TRAIL_SCENE_CODES.annualTreeSeedAsset
        : phase === "germination"
          ? HOME_TRAIL_SCENE_CODES.annualTreeGerminationAsset
          : phase === "sprout"
            ? HOME_TRAIL_SCENE_CODES.annualTreeSproutAsset
            : phase === "sapling"
              ? HOME_TRAIL_SCENE_CODES.annualTreeSaplingAsset
              : phase === "young"
                ? HOME_TRAIL_SCENE_CODES.annualTreeYoungAsset
                : phase === "mature"
                  ? HOME_TRAIL_SCENE_CODES.annualTreeMatureAsset
                  : phase === "blooming"
                    ? HOME_TRAIL_SCENE_CODES.annualTreeBloomingAsset
                    : HOME_TRAIL_SCENE_CODES.annualTreeLegacyAsset,
    label: `Annual tree ${phase} asset`,
    sort_order: 30 + index,
    enabled: true,
    color: null as string | null,
    icon: normalized.annualTreeAssets[phase],
    metadata: { value: normalized.annualTreeAssets[phase] ?? "" },
  }));

  return [...rows, ...annualTreeRows];
}
