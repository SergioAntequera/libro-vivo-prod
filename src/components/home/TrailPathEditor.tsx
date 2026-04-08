"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
} from "react";
import {
  ensureSuperadminOrRedirect,
  getSessionAccessToken,
} from "@/lib/auth";
import { getManyCatalogItems, type CatalogItemConfig } from "@/lib/appConfig";
import {
  ANNUAL_TREE_PHASES,
  buildHomeTrailSceneCatalogRows,
  DEFAULT_HOME_TRAIL_RUNTIME_CONFIG,
  normalizeHomeTrailRuntimeConfig,
  resolveHomeTrailConfigFromSceneCatalog,
  type HomeTrailRuntimeConfig,
} from "@/lib/homeTrailCatalog";
import {
  HOME_TRAIL_CANVAS_HEIGHT,
  HOME_TRAIL_CANVAS_WIDTH,
  buildTrailSlotsExport,
  resolveTrailGeometry,
  type TrailCurveSegment,
} from "@/lib/homeTrailGeometry";
import {
  DEFAULT_FLOWER_ICON,
  DEFAULT_FLOWER_ICON_BY_ELEMENT,
  DEFAULT_HOME_SCENE,
} from "@/lib/homeSceneDefaults";
import {
  buildHomeTrailValidationIssues,
  summitPreviewTreeAsset,
  type TrailEditorTab,
} from "@/lib/adminDiagnostics";
import {
  getDefaultValidationRules,
  loadValidationRulesForDomain,
  type ValidationRuleDefinition,
} from "@/lib/adminValidationRules";
import {
  SCENE_REGION_KIND_OPTIONS,
  SCENE_REGION_PLACEMENT_OPTIONS,
  assignItemsToSceneRegions,
  createEmptySceneRegion,
  createSceneRegionId,
  type SceneRegion,
  type SceneRegionKind,
  type SceneRegionPlacementMode,
  type SceneRegionPoint,
} from "@/lib/homeSceneRegions";
import {
  isManagedHomeTrailBackgroundUrl,
  normalizeAccessibleHomeTrailBackgroundAssetUrl,
} from "@/lib/homeTrailBackgroundAsset";
import {
  mapGardenPlanTypeRow,
  PLAN_TYPE_CATEGORY_LABELS,
} from "@/lib/planTypeCatalog";
import { resolvePlanFlowerAssetPath } from "@/lib/planVisuals";
import InlineTrailEventSprite from "@/components/home/InlineTrailEventSprite";
import {
  buildLegacyCompatibleProgressionRules,
  type CanonicalProgressionTreeRow,
  type LegacyCompatibleProgressionRule,
} from "@/lib/progressionRuntime";
import { supabase } from "@/lib/supabase";
import {
  cubicSegmentsFromSvgPath,
  cubicSegmentsToSvgPath,
} from "@/lib/svgPathGeometry";
import { PRODUCT_DEFAULT_AVATAR_BY_ROLE } from "@/lib/productIdentity";

type Point = {
  x: number;
  y: number;
};

type EditablePathModel = {
  anchors: Point[];
  controlsStart: Point[];
  controlsEnd: Point[];
};

type HandleKind = "anchor" | "control-start" | "control-end";

type ActiveHandle = {
  kind: HandleKind;
  index: number;
  pointerId: number;
};

type PanSession = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startPanX: number;
  startPanY: number;
};

type TrailOverlayPanelId = "inspector" | "validation" | "advanced";

type TrailOverlayDrag =
  | {
      panel: TrailOverlayPanelId;
      startClientX: number;
      startClientY: number;
      startOffsetX: number;
      startOffsetY: number;
    }
  | null;

type ImageSize = {
  width: number;
  height: number;
};

type SummitLayoutModel = {
  label: Point;
  tree: Point;
  status: Point;
};

type SummitHandleKey = keyof SummitLayoutModel;

type ActiveSummitHandle = {
  key: SummitHandleKey;
  pointerId: number;
};

type RegionEditorMode = "select" | "draw_polygon" | "add_anchor";

type ActiveRegionVertexHandle = {
  regionId: string;
  pointIndex: number;
  pointerId: number;
};

type ActiveRegionAnchorHandle = {
  regionId: string;
  anchorId: string;
  pointerId: number;
};

type AssetPickerTarget =
  | { kind: "annual"; key: (typeof ANNUAL_TREE_PHASES)[number] }
  | null;

type AssetPickerFilter = "recommended" | "flowers" | "trees" | "hill" | "other" | "all";

type ManagedImageUploadTarget =
  | { kind: "background" }
  | { kind: "annual"; key: (typeof ANNUAL_TREE_PHASES)[number] }
  | null;

type TrailPlanTypeFlowerSample = {
  code: string;
  label: string;
  category: string;
  suggestedElement: string;
  flowerFamily: string;
  flowerAssetPath: string | null;
};

type TrailScenePreviewSprite =
  | {
      id: string;
      x: number;
      y: number;
      kind: "asset";
      assetSrc: string;
      width: number;
      height: number;
      baseAligned: boolean;
      label: string;
    }
  | {
      id: string;
      x: number;
      y: number;
      kind: "tree";
      size: number;
      baseAligned: true;
      label: string;
      tier: LegacyCompatibleProgressionRule["tier"];
      importance: LegacyCompatibleProgressionRule["importance"];
      rank: LegacyCompatibleProgressionRule["rank"];
      rarity: LegacyCompatibleProgressionRule["rarity"];
      leafVariant: LegacyCompatibleProgressionRule["leaf_variant"];
      accentColor: LegacyCompatibleProgressionRule["accent_color"];
      claimed?: boolean;
    };

type TrailTreePreviewSprite = Extract<TrailScenePreviewSprite, { kind: "tree" }>;

function TrailFloatingPanel(props: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onHeaderPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onClose?: () => void;
}) {
  return (
    <div
      style={props.style}
      className={`pointer-events-auto absolute z-20 flex flex-col overflow-hidden rounded-[28px] border border-[#e4ecdf] bg-[rgba(255,255,255,0.98)] p-4 shadow-[0_18px_44px_rgba(24,36,26,0.14)] ${props.className ?? ""}`}
    >
      <div
        className={`mb-4 flex shrink-0 items-start justify-between gap-3 ${
          props.onHeaderPointerDown ? "cursor-grab active:cursor-grabbing" : ""
        }`}
        onPointerDown={props.onHeaderPointerDown}
      >
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-semibold text-slate-950">{props.title}</h2>
          {props.description ? (
            <p className="text-sm leading-6 text-slate-600">{props.description}</p>
          ) : null}
        </div>
        {props.onClose ? (
          <button
            type="button"
            className="shrink-0 rounded-full border border-[#d9e4d3] bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-[#f8fbf5]"
            onClick={props.onClose}
          >
            Cerrar
          </button>
        ) : null}
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-auto pr-1">{props.children}</div>
    </div>
  );
}

function TrailPreviewTreeSprite({
  x,
  y,
  size,
  tier,
  importance,
  rank,
  rarity,
  leafVariant,
  accentColor,
  claimed = true,
}: {
  x: number;
  y: number;
  size: number;
  tier: LegacyCompatibleProgressionRule["tier"];
  importance: LegacyCompatibleProgressionRule["importance"];
  rank: LegacyCompatibleProgressionRule["rank"];
  rarity: LegacyCompatibleProgressionRule["rarity"];
  leafVariant: LegacyCompatibleProgressionRule["leaf_variant"];
  accentColor: LegacyCompatibleProgressionRule["accent_color"];
  claimed?: boolean;
}) {
  return (
    <foreignObject
      x={x - size / 2}
      y={y - size}
      width={size}
      height={size}
      overflow="visible"
      pointerEvents="none"
    >
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
      >
        <InlineTrailEventSprite
          kind="tree"
          size={size}
          tier={tier}
          importance={importance}
          rank={rank}
          rarity={rarity}
          leafVariant={leafVariant}
          accentColor={accentColor}
          claimed={claimed}
        />
      </div>
    </foreignObject>
  );
}

function sceneCatalogValueByCode(items: CatalogItemConfig[], code: string, fallback = "") {
  const row = items.find((item) => item.code === code);
  const meta = row?.metadata ?? {};
  if (typeof meta.value === "string" && meta.value.trim()) return meta.value.trim();
  if (typeof row?.icon === "string" && row.icon.trim()) return row.icon.trim();
  return fallback;
}

function buildSceneAssetRows(seedAsset: string, sproutAsset: string) {
  return [
    {
      catalog_key: "home_scene_theme",
      code: "seed_asset",
      label: "Semilla sendero",
      sort_order: 145,
      enabled: true,
      color: null as string | null,
      icon: seedAsset || null,
      metadata: { value: seedAsset || "" },
    },
    {
      catalog_key: "home_scene_theme",
      code: "sprout_asset",
      label: "Brote sendero",
      sort_order: 146,
      enabled: true,
      color: null as string | null,
      icon: sproutAsset || null,
      metadata: { value: sproutAsset || "" },
    },
  ];
}

function collapseTrailPlanTypeFlowerSamples(rows: Record<string, unknown>[]) {
  const byCode = new Map<string, TrailPlanTypeFlowerSample & { updatedAt: string | null }>();
  for (const row of rows) {
    const mapped = mapGardenPlanTypeRow(row);
    const updatedAt =
      typeof row.updated_at === "string" && row.updated_at.trim() ? row.updated_at : null;
    const existing = byCode.get(mapped.code);
    const candidate = {
      code: mapped.code,
      label: mapped.label,
      category: mapped.category,
      suggestedElement: mapped.suggestedElement,
      flowerFamily: mapped.flowerFamily,
      flowerAssetPath: mapped.flowerAssetPath,
      updatedAt,
    };
    if (!existing) {
      byCode.set(mapped.code, candidate);
      continue;
    }
    const existingStamp = Date.parse(existing.updatedAt ?? "");
    const candidateStamp = Date.parse(updatedAt ?? "");
    if (Number.isFinite(candidateStamp) && (!Number.isFinite(existingStamp) || candidateStamp > existingStamp)) {
      byCode.set(mapped.code, candidate);
    }
  }

  return [...byCode.values()]
    .sort((left, right) => left.label.localeCompare(right.label, "es"))
    .map(({ updatedAt: _updatedAt, ...sample }) => sample);
}

function fallbackTrailProgressionTreeSamples(): LegacyCompatibleProgressionRule[] {
  return [
    {
      id: "trail-fallback-tree-paso",
      title: "Hito de paso",
      tier: "bronze",
      default_reward_id: null,
      preferred_region_id: null,
      importance: "paso",
      rank: "bronze",
      rarity: "common",
      leaf_variant: 8,
      accent_color: null,
    },
    {
      id: "trail-fallback-tree-mayor",
      title: "Hito mayor",
      tier: "gold",
      default_reward_id: null,
      preferred_region_id: null,
      importance: "mayor",
      rank: "gold",
      rarity: "epic",
      leaf_variant: 34,
      accent_color: null,
    },
    {
      id: "trail-fallback-tree-anual",
      title: "Hito anual",
      tier: "diamond",
      default_reward_id: null,
      preferred_region_id: null,
      importance: "anual",
      rank: "diamond",
      rarity: "legendary",
      leaf_variant: 73,
      accent_color: "#b7c9db",
    },
  ];
}

function treeSampleForRegion(
  region: SceneRegion | null,
  treeSamples: LegacyCompatibleProgressionRule[],
  index = 0,
) {
  const samples = treeSamples.length ? treeSamples : fallbackTrailProgressionTreeSamples();
  if (!region) return samples[index % samples.length] ?? samples[0];
  const matching = samples.filter((sample) => sample.preferred_region_id === region.id);
  if (matching.length) {
    return matching[index % matching.length] ?? matching[0];
  }
  return samples[index % samples.length] ?? samples[0];
}

function buildCanonicalTrailFlowerAssetMap(samples: TrailPlanTypeFlowerSample[]) {
  const next: Record<string, string> = {
    ...DEFAULT_FLOWER_ICON_BY_ELEMENT,
    default: DEFAULT_FLOWER_ICON,
  };

  const orderedElements = ["fire", "water", "air", "earth", "aether"] as const;
  for (const element of orderedElements) {
    const sample = samples.find((entry) => entry.suggestedElement === element);
    if (!sample) continue;
    next[element] = resolvePlanFlowerAssetPath({
      planCategory: sample.category,
      planFlowerFamily: sample.flowerFamily,
      planFlowerAssetPath: sample.flowerAssetPath,
      planSuggestedElement: sample.suggestedElement,
      rating: 3,
      fallbackFlowerByElement: DEFAULT_FLOWER_ICON_BY_ELEMENT,
      defaultFlowerAssetPath: DEFAULT_FLOWER_ICON,
    });
  }

  const defaultSample = samples[0];
  if (defaultSample) {
    next.default = resolvePlanFlowerAssetPath({
      planCategory: defaultSample.category,
      planFlowerFamily: defaultSample.flowerFamily,
      planFlowerAssetPath: defaultSample.flowerAssetPath,
      planSuggestedElement: defaultSample.suggestedElement,
      rating: 3,
      fallbackFlowerByElement: DEFAULT_FLOWER_ICON_BY_ELEMENT,
      defaultFlowerAssetPath: DEFAULT_FLOWER_ICON,
    });
  }

  return next;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function readViewportFrameMetrics(frame: HTMLDivElement | null) {
  if (!frame) return null;
  const rect = frame.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return { width: rect.width, height: rect.height };
}

function clampEditorViewToFrame(
  view: { zoom: number; panX: number; panY: number },
  frame: { width: number; height: number } | null,
) {
  const safeZoom = Math.max(1, view.zoom);
  if (!frame) {
    return {
      zoom: safeZoom,
      panX: safeZoom <= 1 ? 0 : view.panX,
      panY: safeZoom <= 1 ? 0 : view.panY,
    };
  }
  if (safeZoom <= 1) {
    return { zoom: 1, panX: 0, panY: 0 };
  }
  const minPanX = frame.width * (1 - safeZoom);
  const minPanY = frame.height * (1 - safeZoom);
  return {
    zoom: safeZoom,
    panX: clamp(view.panX, minPanX, 0),
    panY: clamp(view.panY, minPanY, 0),
  };
}

function clonePoint(point: Point): Point {
  return { x: point.x, y: point.y };
}

function assetFilename(value: string | null | undefined) {
  const input = String(value ?? "").trim();
  if (!input) return "Sin asset";
  const clean = input.split("?")[0]?.split("#")[0] ?? input;
  const parts = clean.split("/");
  return parts[parts.length - 1] || clean;
}

function assetCategoryForPath(assetPath: string): Exclude<AssetPickerFilter, "recommended" | "all"> {
  const text = assetFilename(assetPath).toLowerCase();
  if (
    text.includes("flower") ||
    text.includes("flor") ||
    text.includes("seed") ||
    text.includes("sprout") ||
    text.includes("bloom") ||
    text.includes("leaf")
  ) {
    return "flowers";
  }
  if (text.includes("tree") || text.includes("árbol") || text.includes("forest")) {
    return "trees";
  }
  if (
    text.includes("hill") ||
    text.includes("colina") ||
    text.includes("trail") ||
    text.includes("path") ||
    text.includes("terrain")
  ) {
    return "hill";
  }
  return "other";
}

function recommendedAssetFilter(target: AssetPickerTarget): AssetPickerFilter {
  if (!target) return "all";
  if (target.kind === "annual") {
    return "trees";
  }
  return "all";
}

function regionTagsText(region: SceneRegion | null) {
  if (!region) return "";
  return region.metadata.tags.join(", ");
}

function regionAllowedKindsText(region: SceneRegion | null) {
  if (!region) return "";
  return region.metadata.allowedKinds.join(", ");
}

function parseCommaSeparatedList(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function regionTone(regionKind: SceneRegionKind) {
  if (regionKind === "milestone_tree") {
    return { stroke: "#2f855a", fill: "rgba(110, 200, 145, 0.20)" };
  }
  if (regionKind === "flower_area") {
    return { stroke: "#b83280", fill: "rgba(244, 114, 182, 0.18)" };
  }
  if (regionKind === "object_area") {
    return { stroke: "#2563eb", fill: "rgba(96, 165, 250, 0.18)" };
  }
  if (regionKind === "character_area") {
    return { stroke: "#7c3aed", fill: "rgba(167, 139, 250, 0.18)" };
  }
  if (regionKind === "event_area") {
    return { stroke: "#c05621", fill: "rgba(251, 191, 36, 0.18)" };
  }
  if (regionKind === "allowed") {
    return { stroke: "#15803d", fill: "rgba(74, 222, 128, 0.14)" };
  }
  if (regionKind === "forbidden") {
    return { stroke: "#dc2626", fill: "rgba(248, 113, 113, 0.16)" };
  }
  return { stroke: "#475569", fill: "rgba(148, 163, 184, 0.16)" };
}

function regionKindLabel(regionKind: SceneRegionKind) {
  return (
    SCENE_REGION_KIND_OPTIONS.find((option) => option.value === regionKind)?.label ??
    regionKind
  );
}

function regionPlacementLabel(placementMode: SceneRegionPlacementMode) {
  return (
    SCENE_REGION_PLACEMENT_OPTIONS.find((option) => option.value === placementMode)?.label ??
    placementMode
  );
}

function regionKindDescription(regionKind: SceneRegionKind) {
  if (regionKind === "milestone_tree") {
    return "Para árboles de hitos o recompensas que no deben salir sobre el sendero.";
  }
  if (regionKind === "flower_area") {
    return "Reserva una zona para flores u otros elementos pequenos fuera del camino.";
  }
  if (regionKind === "object_area") {
    return "Zona para objetos decorativos o piezas especiales de escena.";
  }
  if (regionKind === "character_area") {
    return "Zona para personajes, avatares o companeros del recorrido.";
  }
  if (regionKind === "event_area") {
    return "Area interactiva donde más adelante podremos disparar acciones o escenas.";
  }
  if (regionKind === "allowed") {
    return "Zona expresamente permitida para colocar contenido.";
  }
  if (regionKind === "forbidden") {
    return "Zona donde no queremos colocar contenido automáticamente.";
  }
  return "Zona libre para usos avanzados o futuros.";
}

function regionPlacementDescription(placementMode: SceneRegionPlacementMode) {
  if (placementMode === "anchors_in_order") {
    return "Usa anchors concretos que marcas tu. El primer elemento usa el anchor 1, el segundo el 2 y así sucesivamente. Es el modo mas preciso.";
  }
  if (placementMode === "centroid") {
    return "Coloca el contenido en el centro de la zona. Muy útil cuando solo debe salir un elemento.";
  }
  if (placementMode === "random_inside") {
    return "Coloca elementos en puntos aleatorios dentro de la zona, sin preocuparse por separacion minima.";
  }
  if (placementMode === "random_poisson") {
    return "Coloca varios elementos dentro de la zona intentando que no se amontonen. Es el mejor aleatorio para flores o grupos.";
  }
  return "Modo flexible para pruebas rapidas: si anades anchors los aprovecha y si no coloca cerca del centro.";
}

function regionPlacementHint(region: SceneRegion | null) {
  if (!region) return "";
  if (region.kind === "milestone_tree" && region.placementMode === "anchors_in_order") {
    return "Recomendado para hitos importantes: marcas tu el punto exacto donde debe nacer cada árbol.";
  }
  if (region.kind === "milestone_tree" && region.placementMode === "centroid") {
    return "Bueno para una sola zona con un solo árbol y sin complicarte con anchors.";
  }
  if (region.kind === "flower_area" && region.placementMode === "random_poisson") {
    return "Ideal para repartir varias flores sin que se pisen entre ellas.";
  }
  if (region.kind === "forbidden") {
    return "Esta zona quedará reservada para evitar colocaciones automaticas en el futuro.";
  }
  return "";
}

function regionPreviewSpec(region: SceneRegion | null, options: {
  flowerAssetMap: Record<string, string>;
  treeSamples: LegacyCompatibleProgressionRule[];
  seedAsset: string;
  sproutAsset: string;
}) {
  if (!region) return null;
  if (region.kind === "milestone_tree") {
    const sample = treeSampleForRegion(region, options.treeSamples);
    return {
      desiredKind: "tree",
      previewKind: "tree" as const,
      size: 88,
      baseAligned: true as const,
      tier: sample.tier,
      importance: sample.importance,
      rank: sample.rank,
      rarity: sample.rarity,
      leafVariant: sample.leaf_variant,
      accentColor: sample.accent_color,
      label: "Hito",
    };
  }
  if (region.kind === "flower_area") {
    return {
      desiredKind: "flower",
      previewKind: "asset" as const,
      assetSrc:
        options.flowerAssetMap.default?.trim() ||
        options.flowerAssetMap.air?.trim() ||
        DEFAULT_FLOWER_ICON,
      width: 46,
      height: 46,
      baseAligned: true,
      label: "Flor",
    };
  }
  if (region.kind === "character_area") {
    return {
      desiredKind: "character",
      previewKind: "asset" as const,
      assetSrc: PRODUCT_DEFAULT_AVATAR_BY_ROLE.gardener_a,
      width: 42,
      height: 42,
      baseAligned: true,
      label: "Personaje",
    };
  }
  if (region.kind === "object_area") {
    return {
      desiredKind: "object",
      previewKind: "asset" as const,
      assetSrc: options.seedAsset?.trim() || DEFAULT_FLOWER_ICON,
      width: 38,
      height: 38,
      baseAligned: true,
      label: "Objeto",
    };
  }
  if (region.kind === "event_area") {
    return {
      desiredKind: "event",
      previewKind: "asset" as const,
      assetSrc: options.sproutAsset?.trim() || DEFAULT_FLOWER_ICON,
      width: 42,
      height: 42,
      baseAligned: true,
      label: "Evento",
    };
  }
  return {
    desiredKind: "custom",
    previewKind: "asset" as const,
    assetSrc: "",
    width: 24,
    height: 24,
    baseAligned: false,
    label: "Zona",
  };
}

function pointBetween(start: Point, end: Point, t: number): Point {
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
  };
}

function createAutoSegmentControls(start: Point, end: Point) {
  return {
    controlStart: pointBetween(start, end, 0.35),
    controlEnd: pointBetween(start, end, 0.65),
  };
}

function selectedAnchorIndexFromHandle(value: string | null) {
  if (!value?.startsWith("anchor:")) return null;
  const parsed = Number(value.split(":")[1]);
  return Number.isInteger(parsed) ? parsed : null;
}

function editableModelFromPath(pathD: string): EditablePathModel {
  const segments = cubicSegmentsFromSvgPath(pathD);
  if (!segments.length) {
    return {
      anchors: [],
      controlsStart: [],
      controlsEnd: [],
    };
  }

  return {
    anchors: [
      clonePoint(segments[0].start),
      ...segments.map((segment) => clonePoint(segment.end)),
    ],
    controlsStart: segments.map((segment) => clonePoint(segment.controlStart)),
    controlsEnd: segments.map((segment) => clonePoint(segment.controlEnd)),
  };
}

function editableModelToPathD(model: EditablePathModel) {
  if (model.anchors.length < 2) return "";

  const segments = model.anchors.slice(0, -1).map((anchor, index) => ({
    d: "",
    start: clonePoint(anchor),
    controlStart: clonePoint(model.controlsStart[index] ?? anchor),
    controlEnd: clonePoint(
      model.controlsEnd[index] ?? model.anchors[index + 1] ?? anchor,
    ),
    end: clonePoint(model.anchors[index + 1]),
    avgY: 0,
    length: 0,
  }));

  return cubicSegmentsToSvgPath(segments);
}

function segmentsFromEditableModel(model: EditablePathModel): TrailCurveSegment[] {
  if (model.anchors.length < 2) return [];
  return cubicSegmentsFromSvgPath(editableModelToPathD(model));
}

function formatConfigJson(input: HomeTrailRuntimeConfig) {
  return JSON.stringify(
    {
      canvasWidth: Math.round(input.canvasWidth),
      canvasHeight: Math.round(input.canvasHeight),
      sourceAsset: input.sourceAsset?.trim() || null,
      pathD: input.pathD.trim(),
      displayDesktopWidth: Math.round(input.displayDesktopWidth),
      displayTabletWidth: Math.round(input.displayTabletWidth),
      displayMobileWidth: Math.round(input.displayMobileWidth),
      showSeasonBandLabels: input.showSeasonBandLabels,
      sceneBackgroundMode: input.sceneBackgroundMode,
      sceneBackgroundSolid: input.sceneBackgroundSolid,
      summitLabelText: input.summitLabelText,
      summitLabelX: Number(input.summitLabelX.toFixed(2)),
      summitLabelY: Number(input.summitLabelY.toFixed(2)),
      summitTreeX: Number(input.summitTreeX.toFixed(2)),
      summitTreeY: Number(input.summitTreeY.toFixed(2)),
      summitStatusX: Number(input.summitStatusX.toFixed(2)),
      summitStatusY: Number(input.summitStatusY.toFixed(2)),
      annualTreeAssets: input.annualTreeAssets,
    },
    null,
    2,
  );
}

async function copyText(value: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    throw new Error("Clipboard no disponible.");
  }
  await navigator.clipboard.writeText(value);
}

function downloadTextFile(
  filename: string,
  content: string,
  contentType = "application/json",
) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function readImageSize(file: File): Promise<ImageSize> {
  if (typeof window === "undefined") {
    return { width: 1000, height: 1000 };
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise<ImageSize>((resolve, reject) => {
      const image = new window.Image();
      image.onload = () =>
        resolve({
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
      image.onerror = () => reject(new Error("No se pudo leer la imagen."));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function insertAnchorAfter(model: EditablePathModel, anchorIndex: number) {
  if (anchorIndex < 0 || anchorIndex >= model.anchors.length - 1) return model;
  const start = model.anchors[anchorIndex];
  const end = model.anchors[anchorIndex + 1];
  if (!start || !end) return model;

  const nextAnchor = pointBetween(start, end, 0.5);
  const firstControls = createAutoSegmentControls(start, nextAnchor);
  const secondControls = createAutoSegmentControls(nextAnchor, end);

  return {
    anchors: [
      ...model.anchors.slice(0, anchorIndex + 1),
      nextAnchor,
      ...model.anchors.slice(anchorIndex + 1),
    ],
    controlsStart: [
      ...model.controlsStart.slice(0, anchorIndex),
      firstControls.controlStart,
      secondControls.controlStart,
      ...model.controlsStart.slice(anchorIndex + 1),
    ],
    controlsEnd: [
      ...model.controlsEnd.slice(0, anchorIndex),
      firstControls.controlEnd,
      secondControls.controlEnd,
      ...model.controlsEnd.slice(anchorIndex + 1),
    ],
  };
}

function deleteAnchorAt(model: EditablePathModel, anchorIndex: number) {
  if (anchorIndex <= 0 || anchorIndex >= model.anchors.length - 1) return model;
  const start = model.anchors[anchorIndex - 1];
  const end = model.anchors[anchorIndex + 1];
  if (!start || !end) return model;

  const mergedControls = createAutoSegmentControls(start, end);

  return {
    anchors: model.anchors.filter((_, index) => index !== anchorIndex),
    controlsStart: [
      ...model.controlsStart.slice(0, anchorIndex - 1),
      mergedControls.controlStart,
      ...model.controlsStart.slice(anchorIndex + 1),
    ],
    controlsEnd: [
      ...model.controlsEnd.slice(0, anchorIndex - 1),
      mergedControls.controlEnd,
      ...model.controlsEnd.slice(anchorIndex + 1),
    ],
  };
}

function remapPointCloud(
  points: Point[],
  fromWidth: number,
  fromHeight: number,
  toWidth: number,
  toHeight: number,
  padding = 18,
) {
  const sx = toWidth / Math.max(1, fromWidth);
  const sy = toHeight / Math.max(1, fromHeight);
  const scaled = points.map((point) => ({
    x: point.x * sx,
    y: point.y * sy,
  }));
  if (!scaled.length) return scaled;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const point of scaled) {
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
  }

  const availableWidth = Math.max(1, toWidth - padding * 2);
  const availableHeight = Math.max(1, toHeight - padding * 2);
  const bboxWidth = Math.max(1, maxX - minX);
  const bboxHeight = Math.max(1, maxY - minY);
  const fitScale = Math.min(1, availableWidth / bboxWidth, availableHeight / bboxHeight);

  let fitted = scaled;
  if (fitScale < 1) {
    fitted = scaled.map((point) => ({
      x: padding + (point.x - minX) * fitScale,
      y: padding + (point.y - minY) * fitScale,
    }));

    minX = padding;
    minY = padding;
    maxX = padding + bboxWidth * fitScale;
    maxY = padding + bboxHeight * fitScale;
  }

  const dx =
    minX < padding
      ? padding - minX
      : maxX > toWidth - padding
        ? toWidth - padding - maxX
        : 0;
  const dy =
    minY < padding
      ? padding - minY
      : maxY > toHeight - padding
        ? toHeight - padding - maxY
        : 0;

  return fitted.map((point) => ({
    x: clamp(point.x + dx, padding, Math.max(padding, toWidth - padding)),
    y: clamp(point.y + dy, padding, Math.max(padding, toHeight - padding)),
  }));
}

function scaleModelToCanvas(
  model: EditablePathModel,
  fromWidth: number,
  fromHeight: number,
  toWidth: number,
  toHeight: number,
) {
  const allPoints = [
    ...model.anchors.map(clonePoint),
    ...model.controlsStart.map(clonePoint),
    ...model.controlsEnd.map(clonePoint),
  ];
  const remapped = remapPointCloud(
    allPoints,
    fromWidth,
    fromHeight,
    toWidth,
    toHeight,
  );
  let cursor = 0;
  return {
    anchors: model.anchors.map(() => remapped[cursor++] ?? { x: 18, y: 18 }),
    controlsStart: model.controlsStart.map(
      () => remapped[cursor++] ?? { x: 18, y: 18 },
    ),
    controlsEnd: model.controlsEnd.map(
      () => remapped[cursor++] ?? { x: 18, y: 18 },
    ),
  };
}

async function parseApiError(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as
    | { error?: unknown }
    | null;
  const message = String(payload?.error ?? "").trim();
  return message || fallback;
}

export default function TrailPathEditor() {
  const router = useRouter();
  const defaultConfig = DEFAULT_HOME_TRAIL_RUNTIME_CONFIG;
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const viewportFrameRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const activeHandleRef = useRef<ActiveHandle | null>(null);
  const activeSummitHandleRef = useRef<ActiveSummitHandle | null>(null);
  const activeRegionVertexRef = useRef<ActiveRegionVertexHandle | null>(null);
  const activeRegionAnchorRef = useRef<ActiveRegionAnchorHandle | null>(null);
  const activePanRef = useRef<PanSession | null>(null);

  const [persistedBaseline, setPersistedBaseline] =
    useState<HomeTrailRuntimeConfig>(defaultConfig);
  const [loadingPersisted, setLoadingPersisted] = useState(true);
  const [savingPersistent, setSavingPersistent] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadTarget, setImageUploadTarget] =
    useState<ManagedImageUploadTarget>(null);
  const [canvasWidth, setCanvasWidth] = useState(HOME_TRAIL_CANVAS_WIDTH);
  const [canvasHeight, setCanvasHeight] = useState(HOME_TRAIL_CANVAS_HEIGHT);
  const [backgroundAsset, setBackgroundAsset] = useState(
    normalizeAccessibleHomeTrailBackgroundAssetUrl(defaultConfig.sourceAsset),
  );
  const [imageNaturalSize, setImageNaturalSize] = useState<ImageSize | null>(null);
  const [model, setModel] = useState<EditablePathModel>(() =>
    editableModelFromPath(defaultConfig.pathD),
  );
  const [pathDraft, setPathDraft] = useState(defaultConfig.pathD);
  const [selectedHandle, setSelectedHandle] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [showControlLines, setShowControlLines] = useState(false);
  const [showSamplePoints, setShowSamplePoints] = useState(false);
  const [showNormals, setShowNormals] = useState(false);
  const [sampleStep, setSampleStep] = useState(24);
  const [editorView, setEditorView] = useState({ zoom: 1, panX: 0, panY: 0 });
  const [activeTab, setActiveTab] = useState<TrailEditorTab | null>(null);
  const [displayDesktopWidth, setDisplayDesktopWidth] = useState(
    defaultConfig.displayDesktopWidth,
  );
  const [displayTabletWidth, setDisplayTabletWidth] = useState(
    defaultConfig.displayTabletWidth,
  );
  const [displayMobileWidth, setDisplayMobileWidth] = useState(
    defaultConfig.displayMobileWidth,
  );
  const [showSeasonBandLabels, setShowSeasonBandLabels] = useState(
    defaultConfig.showSeasonBandLabels,
  );
  const [sceneBackgroundMode, setSceneBackgroundMode] = useState<
    HomeTrailRuntimeConfig["sceneBackgroundMode"]
  >(defaultConfig.sceneBackgroundMode);
  const [sceneBackgroundSolid, setSceneBackgroundSolid] = useState(
    defaultConfig.sceneBackgroundSolid,
  );
  const [summitLayout, setSummitLayout] = useState<SummitLayoutModel>({
    label: {
      x: defaultConfig.summitLabelX,
      y: defaultConfig.summitLabelY,
    },
    tree: {
      x: defaultConfig.summitTreeX,
      y: defaultConfig.summitTreeY,
    },
    status: {
      x: defaultConfig.summitStatusX,
      y: defaultConfig.summitStatusY,
    },
  });
  const [summitLabelText, setSummitLabelText] = useState(defaultConfig.summitLabelText);
  const [regions, setRegions] = useState<SceneRegion[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [selectedRegionVertexIndex, setSelectedRegionVertexIndex] = useState<number | null>(null);
  const [selectedRegionAnchorId, setSelectedRegionAnchorId] = useState<string | null>(null);
  const [regionEditorMode, setRegionEditorMode] = useState<RegionEditorMode>("select");
  const [regionPreviewCount, setRegionPreviewCount] = useState(3);
  const [seedAsset, setSeedAsset] = useState(DEFAULT_HOME_SCENE.seedAsset);
  const [sproutAsset, setSproutAsset] = useState(DEFAULT_HOME_SCENE.sproutAsset);
  const [flowerAssetMap, setFlowerAssetMap] = useState<Record<string, string>>({
    ...DEFAULT_FLOWER_ICON_BY_ELEMENT,
    default: DEFAULT_FLOWER_ICON,
  });
  const [planTypeFlowerSamples, setPlanTypeFlowerSamples] = useState<TrailPlanTypeFlowerSample[]>(
    [],
  );
  const [canonicalTreeSamples, setCanonicalTreeSamples] = useState<
    LegacyCompatibleProgressionRule[]
  >(() => fallbackTrailProgressionTreeSamples());
  const [annualTreeAssets, setAnnualTreeAssets] = useState<
    Record<(typeof ANNUAL_TREE_PHASES)[number], string | null>
  >({ ...defaultConfig.annualTreeAssets });
  const [publicAssets, setPublicAssets] = useState<string[]>([]);
  const [assetPickerTarget, setAssetPickerTarget] = useState<AssetPickerTarget>(null);
  const [assetPickerFilter, setAssetPickerFilter] =
    useState<AssetPickerFilter>("recommended");
  const [showValidationPanel, setShowValidationPanel] = useState(false);
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(false);
  const [overlayDrag, setOverlayDrag] = useState<TrailOverlayDrag>(null);
  const [overlayOffsets, setOverlayOffsets] = useState<
    Record<TrailOverlayPanelId, { x: number; y: number }>
  >({
    inspector: { x: 0, y: 0 },
    validation: { x: 0, y: 0 },
    advanced: { x: 0, y: 0 },
  });
  const [persistedSeedAsset, setPersistedSeedAsset] = useState(DEFAULT_HOME_SCENE.seedAsset);
  const [persistedSproutAsset, setPersistedSproutAsset] = useState(DEFAULT_HOME_SCENE.sproutAsset);
  const [persistedFlowerAssetMap, setPersistedFlowerAssetMap] = useState<Record<string, string>>({
    ...DEFAULT_FLOWER_ICON_BY_ELEMENT,
    default: DEFAULT_FLOWER_ICON,
  });
  const [validationRules, setValidationRules] = useState<ValidationRuleDefinition[]>(
    () => getDefaultValidationRules("trail"),
  );

  const resolvedBackgroundSrc = backgroundAsset.trim();
  const selectedAnchorIndex = useMemo(
    () => selectedAnchorIndexFromHandle(selectedHandle),
    [selectedHandle],
  );
  const selectedAnchor = useMemo(
    () =>
      selectedAnchorIndex === null ? null : model.anchors[selectedAnchorIndex] ?? null,
    [model.anchors, selectedAnchorIndex],
  );
  const pathD = useMemo(() => editableModelToPathD(model), [model]);
  const segments = useMemo(() => segmentsFromEditableModel(model), [model]);
  const previewSeasonBands = useMemo(
    () =>
      resolveTrailGeometry({
        canvasWidth,
        canvasHeight,
        pathD,
      }).seasonBands,
    [canvasHeight, canvasWidth, pathD],
  );
  const slots365 = useMemo(() => buildTrailSlotsExport(365, segments), [segments]);
  const slotsPreview = useMemo(
    () =>
      slots365.filter(
        (slot, index) =>
          index % Math.max(1, sampleStep) === 0 ||
          index === 0 ||
          index === slots365.length - 1,
      ),
    [sampleStep, slots365],
  );
  const filteredPublicAssets = useMemo(() => {
    if (assetPickerFilter === "all") return publicAssets;
    if (assetPickerFilter === "recommended") {
      const recommended = recommendedAssetFilter(assetPickerTarget);
      if (recommended === "all") return publicAssets;
      return publicAssets.filter(
        (assetPath) => assetCategoryForPath(assetPath) === recommended,
      );
    }
    return publicAssets.filter(
      (assetPath) => assetCategoryForPath(assetPath) === assetPickerFilter,
    );
  }, [assetPickerFilter, assetPickerTarget, publicAssets]);
  const uploadingBackground =
    uploadingImage && imageUploadTarget?.kind === "background";
  const uploadingAnnualPhase =
    uploadingImage && imageUploadTarget?.kind === "annual"
      ? imageUploadTarget.key
      : null;
  const runtimeConfig = useMemo(
    () =>
      normalizeHomeTrailRuntimeConfig({
        canvasWidth,
        canvasHeight,
        sourceAsset: backgroundAsset.trim() || null,
        pathD,
        displayDesktopWidth,
        displayTabletWidth,
        displayMobileWidth,
        showSeasonBandLabels,
        sceneBackgroundMode,
        sceneBackgroundSolid,
        summitLabelText,
        summitLabelX: summitLayout.label.x,
        summitLabelY: summitLayout.label.y,
        summitTreeX: summitLayout.tree.x,
        summitTreeY: summitLayout.tree.y,
        summitStatusX: summitLayout.status.x,
        summitStatusY: summitLayout.status.y,
        summitAvatarsX: persistedBaseline.summitAvatarsX,
        summitAvatarsY: persistedBaseline.summitAvatarsY,
        annualTreeAssets,
        regions,
      }),
    [
      annualTreeAssets,
      backgroundAsset,
      canvasHeight,
      canvasWidth,
      displayDesktopWidth,
      displayMobileWidth,
      displayTabletWidth,
      pathD,
      persistedBaseline.summitAvatarsX,
      persistedBaseline.summitAvatarsY,
      regions,
      sceneBackgroundMode,
      sceneBackgroundSolid,
      showSeasonBandLabels,
      summitLabelText,
      summitLayout.label.x,
      summitLayout.label.y,
      summitLayout.status.x,
      summitLayout.status.y,
      summitLayout.tree.x,
      summitLayout.tree.y,
    ],
  );
  const summitTreePreviewAsset = useMemo(
    () => summitPreviewTreeAsset(annualTreeAssets),
    [annualTreeAssets],
  );
  const validationIssues = useMemo(() => {
    return buildHomeTrailValidationIssues({
      config: runtimeConfig,
      seedAsset,
      sproutAsset,
      flowerAssetMap,
      canonicalTreeCount: canonicalTreeSamples.length,
      publicAssets,
    }, validationRules);
  }, [
    canonicalTreeSamples.length,
    flowerAssetMap,
    publicAssets,
    runtimeConfig,
    seedAsset,
    sproutAsset,
    validationRules,
  ]);
  const selectedRegion = useMemo(
    () => regions.find((region) => region.id === selectedRegionId) ?? null,
    [regions, selectedRegionId],
  );
  const selectedRegionPreview = useMemo(() => {
    if (!selectedRegion || selectedRegion.points.length < 3) return [] as TrailScenePreviewSprite[];

    const spec = regionPreviewSpec(selectedRegion, {
      flowerAssetMap,
      treeSamples: canonicalTreeSamples,
      seedAsset,
      sproutAsset,
    });
    if (!spec) return [];

    const count = Math.max(
      1,
      Math.min(
        10,
        selectedRegion.capacity != null
          ? selectedRegion.capacity
          : regionPreviewCount,
      ),
    );
    const items = Array.from({ length: count }, (_, index) => ({
      id: `preview-${selectedRegion.id}-${index + 1}`,
    }));
    const { placements } = assignItemsToSceneRegions(items, [selectedRegion], spec.desiredKind);
    return placements.map((placement, index) => {
      if (spec.previewKind === "tree") {
        const sample = treeSampleForRegion(selectedRegion, canonicalTreeSamples, index);
        return {
          id: placement.item.id,
          x: placement.point.x,
          y: placement.point.y,
          kind: "tree" as const,
          size: spec.size,
          baseAligned: spec.baseAligned,
          label: `${spec.label} ${index + 1}`,
          tier: sample.tier,
          importance: sample.importance,
          rank: sample.rank,
          rarity: sample.rarity,
          leafVariant: sample.leaf_variant,
          accentColor: sample.accent_color,
          claimed: true,
        };
      }
      return {
        id: placement.item.id,
        x: placement.point.x,
        y: placement.point.y,
        kind: "asset" as const,
        assetSrc: spec.assetSrc,
        width: spec.width,
        height: spec.height,
        baseAligned: spec.baseAligned,
        label: `${spec.label} ${index + 1}`,
      };
    });
  }, [
    canonicalTreeSamples,
    flowerAssetMap,
    regionPreviewCount,
    seedAsset,
    selectedRegion,
    sproutAsset,
  ]);
  const exportConfigJson = useMemo(
    () => formatConfigJson(runtimeConfig),
    [runtimeConfig],
  );
  const exportSlotsJson = useMemo(() => JSON.stringify(slots365, null, 2), [slots365]);
  const editorZoomLabel = Math.round(editorView.zoom * 100);
  const backgroundAssetLabel = useMemo(() => {
    const value = backgroundAsset.trim();
    if (!value) return "";
    const parts = value.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? value;
  }, [backgroundAsset]);
  const trailEditorTabs: Array<{
    id: TrailEditorTab;
    label: string;
    description: string;
    previewHint: string;
  }> = [
    {
      id: "canvas",
      label: "Lienzo",
      description:
        "Gestiona el fondo y el tamano base del lienzo global antes de editar el resto del sendero.",
      previewHint:
        "Sube la imagen base y ajusta el tamano del lienzo para trabajar sobre una escena estable.",
    },
    {
      id: "path",
      label: "Recorrido",
      description:
        "Ajusta el trazado principal, sus puntos de giro y la lectura general del sendero.",
      previewHint:
        "Arrastra puntos y handles directamente sobre la colina para afinar el recorrido.",
    },
    {
      id: "view",
      label: "Vista",
      description:
        "Define el encuadre y la presencia visual con la que Home muestra la colina.",
      previewHint:
        "Comprueba el equilibrio del encuadre y la lectura de la escena en una sola vista.",
    },
    {
      id: "summit",
      label: "Cima",
      description:
        "Coloca la etiqueta de cima, el árbol anual y el estado visible del año sin salir del lienzo.",
      previewHint:
        "Mueve la cima sobre el preview para ver al instante como respira la parte alta del Home.",
    },
    {
      id: "regions",
      label: "Regiones",
      description:
        "Delimita zonas semanticas sobre la colina para repartir hitos, flores y capas narrativas.",
      previewHint:
        "Dibuja zonas y anchors sobre la imagen base para comprobar densidades y limites visuales.",
    },
    {
      id: "demo",
      label: "Demo",
      description:
        "Previsualiza flores de planes, hitos y árbol anual juntos para comprobar la lectura del sendero completo.",
      previewHint:
        "Aquí solo miras el conjunto: sendero, botánica, hitos y cima en una misma escena.",
    },
    {
      id: "assets",
      label: "Árbol anual",
      description:
        "Gestiona solo el árbol anual del sendero. La botánica vive en plan-types y los hitos en progression.",
      previewHint:
        "Comprueba como respiran las fases del árbol anual sobre la cima del sendero.",
    },
  ];
  const activeTabConfig = activeTab
    ? trailEditorTabs.find((tab) => tab.id === activeTab) ?? null
    : null;
  const activeTabLabel = activeTabConfig?.label ?? "Preview";
  const activeTabDescription =
    activeTabConfig?.description ??
    "Abre solo la capa que necesites. El lienzo puede quedarse libre mientras ajustas la escena.";
  const activeTabPreviewHint =
    activeTabConfig?.previewHint ??
    "Preview libre. Abre un panel solo cuando necesites editar una capa concreta del sendero.";
  const demoFlowerPlacements = useMemo(() => {
    if (!slots365.length) return [] as Array<{
      id: string;
      x: number;
      y: number;
      assetSrc: string;
      width: number;
      height: number;
    }>;
    const samples = planTypeFlowerSamples.slice(0, 6);
    const fallbackElements = ["fire", "water", "air", "earth", "aether", "fire"] as const;
    const indices = [22, 78, 132, 188, 246, 314];

    return indices.map((slotIndex, index) => {
      const slot = slots365[Math.min(slotIndex, Math.max(slots365.length - 1, 0))];
      const sample = samples[index] ?? null;
      const assetSrc = sample
        ? resolvePlanFlowerAssetPath({
            planCategory: sample.category,
            planFlowerFamily: sample.flowerFamily,
            planFlowerAssetPath: sample.flowerAssetPath,
            planSuggestedElement: sample.suggestedElement,
            rating: ((index % 5) + 1),
            fallbackFlowerByElement: DEFAULT_FLOWER_ICON_BY_ELEMENT,
            defaultFlowerAssetPath: DEFAULT_FLOWER_ICON,
          })
        : flowerAssetMap[fallbackElements[index] ?? "default"] ?? DEFAULT_FLOWER_ICON;
      return {
        id: `demo-flower-${index}`,
        x: slot.x + slot.normalX * 56,
        y: slot.y + slot.normalY * 56,
        assetSrc,
        width: 60 + (index % 3) * 6,
        height: 60 + (index % 3) * 6,
      };
    });
  }, [flowerAssetMap, planTypeFlowerSamples, slots365]);

  const demoBasePlacements = useMemo(() => {
    if (!slots365.length) return [] as Array<{
      id: string;
      x: number;
      y: number;
      assetSrc: string;
      width: number;
      height: number;
    }>;
    const seedSlot = slots365[Math.min(10, Math.max(slots365.length - 1, 0))];
    const sproutSlot = slots365[Math.min(44, Math.max(slots365.length - 1, 0))];
    return [
      {
        id: "demo-seed",
        x: seedSlot.x + seedSlot.normalX * 36,
        y: seedSlot.y + seedSlot.normalY * 36,
        assetSrc: seedAsset,
        width: 34,
        height: 34,
      },
      {
        id: "demo-sprout",
        x: sproutSlot.x + sproutSlot.normalX * 38,
        y: sproutSlot.y + sproutSlot.normalY * 38,
        assetSrc: sproutAsset,
        width: 42,
        height: 42,
      },
    ];
  }, [seedAsset, slots365, sproutAsset]);

  const demoTreePlacements = useMemo<TrailTreePreviewSprite[]>(() => {
    const samples = canonicalTreeSamples.length
      ? canonicalTreeSamples
      : fallbackTrailProgressionTreeSamples();
    const milestoneRegions = regions.filter(
      (region) => region.enabled && region.kind === "milestone_tree" && region.points.length >= 3,
    );
    if (milestoneRegions.length) {
      const items = samples.slice(0, Math.min(samples.length, 6)).map((sample, index) => ({
        id: `demo-tree-${sample.id || index}`,
      }));
      const { placements } = assignItemsToSceneRegions(items, milestoneRegions, "tree");
      return placements.map((placement, index) => {
        const sample = samples[index % samples.length] ?? samples[0];
        return {
          id: placement.item.id,
          x: placement.point.x,
          y: placement.point.y,
          kind: "tree" as const,
          size: 94,
          baseAligned: true as const,
          label: sample.title,
          tier: sample.tier,
          importance: sample.importance,
          rank: sample.rank,
          rarity: sample.rarity,
          leafVariant: sample.leaf_variant,
          accentColor: sample.accent_color,
          claimed: true,
        };
      });
    }

    if (!slots365.length) return [] as TrailTreePreviewSprite[];

    const fallbackIndices = [118, 278];
    return fallbackIndices.map((slotIndex, index) => {
      const slot = slots365[Math.min(slotIndex, Math.max(slots365.length - 1, 0))];
      const sample = samples[index % samples.length] ?? samples[0];
      return {
        id: `demo-tree-${sample.id || index}`,
        x: slot.x - slot.normalX * 92,
        y: slot.y - slot.normalY * 92,
        kind: "tree" as const,
        size: 96,
        baseAligned: true as const,
        label: sample.title,
        tier: sample.tier,
        importance: sample.importance,
        rank: sample.rank,
        rarity: sample.rarity,
        leafVariant: sample.leaf_variant,
        accentColor: sample.accent_color,
        claimed: true,
      };
    });
  }, [canonicalTreeSamples, regions, slots365]);

  useEffect(() => {
    if (!overlayDrag) return;

    const handlePointerMove = (event: PointerEvent) => {
      setOverlayOffsets((current) => ({
        ...current,
        [overlayDrag.panel]: {
          x: overlayDrag.startOffsetX + (event.clientX - overlayDrag.startClientX),
          y: overlayDrag.startOffsetY + (event.clientY - overlayDrag.startClientY),
        },
      }));
    };

    const handlePointerUp = () => {
      setOverlayDrag(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [overlayDrag]);

  useEffect(() => {
    const frame = viewportFrameRef.current;
    if (!frame) return;

    const handleNativeWheel = (event: WheelEvent) => {
      event.preventDefault();

      const rect = frame.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const zoomFactor = Math.exp(-event.deltaY * 0.0015);
      const frameMetrics = { width: rect.width, height: rect.height };

      setEditorView((prev) => {
        const nextZoom = clamp(prev.zoom * zoomFactor, 1, 4);
        const worldX = (pointerX - prev.panX) / prev.zoom;
        const worldY = (pointerY - prev.panY) / prev.zoom;
        return clampEditorViewToFrame(
          {
            zoom: nextZoom,
            panX: pointerX - worldX * nextZoom,
            panY: pointerY - worldY * nextZoom,
          },
          frameMetrics,
        );
      });
    };

    frame.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => {
      frame.removeEventListener("wheel", handleNativeWheel);
    };
  }, []);

  function applyEditorConfig(config: HomeTrailRuntimeConfig) {
    const normalized = normalizeHomeTrailRuntimeConfig(config);
    const derivedGeometry = resolveTrailGeometry(normalized);
    const shouldRecenterSummit =
      normalized.summitLabelX <= 1 &&
      normalized.summitLabelY <= 1 &&
      normalized.summitTreeX <= 1 &&
      normalized.summitTreeY <= 1 &&
      normalized.summitStatusX <= 1 &&
      normalized.summitStatusY <= 1;
    const summitDefaults = shouldRecenterSummit
      ? {
          label: {
            x: derivedGeometry.summitPoint.x,
            y: derivedGeometry.summitLabelY,
          },
          tree: {
            x: derivedGeometry.summitPoint.x,
            y: derivedGeometry.summitPoint.y + 18,
          },
          status: {
            x: derivedGeometry.summitPoint.x,
            y: derivedGeometry.summitPoint.y + 88,
          },
        }
      : {
          label: { x: normalized.summitLabelX, y: normalized.summitLabelY },
          tree: { x: normalized.summitTreeX, y: normalized.summitTreeY },
          status: { x: normalized.summitStatusX, y: normalized.summitStatusY },
        };

    setCanvasWidth(normalized.canvasWidth);
    setCanvasHeight(normalized.canvasHeight);
    setBackgroundAsset(
      normalizeAccessibleHomeTrailBackgroundAssetUrl(normalized.sourceAsset),
    );
    setDisplayDesktopWidth(normalized.displayDesktopWidth);
    setDisplayTabletWidth(normalized.displayTabletWidth);
    setDisplayMobileWidth(normalized.displayMobileWidth);
    setShowSeasonBandLabels(normalized.showSeasonBandLabels);
    setSceneBackgroundMode(normalized.sceneBackgroundMode);
    setSceneBackgroundSolid(normalized.sceneBackgroundSolid);
    setSummitLabelText(normalized.summitLabelText);
    setSummitLayout(summitDefaults);
    setAnnualTreeAssets({ ...normalized.annualTreeAssets });
    setRegions(normalized.regions.map((region) => createEmptySceneRegion(region)));
    setSelectedRegionId(normalized.regions[0]?.id ?? null);
    setSelectedRegionVertexIndex(null);
    setSelectedRegionAnchorId(null);
    setRegionEditorMode("select");
    const nextModel = scaleModelToCanvas(
      editableModelFromPath(normalized.pathD),
      normalized.canvasWidth,
      normalized.canvasHeight,
      normalized.canvasWidth,
      normalized.canvasHeight,
    );
    setModel(nextModel);
    setPathDraft(normalized.pathD);
    setSelectedHandle(nextModel.anchors.length ? "anchor:0" : null);
    resetEditorView();
  }

  function resizeCanvas(nextWidth: number, nextHeight: number) {
    const safeWidth = Math.max(100, Math.round(nextWidth));
    const safeHeight = Math.max(100, Math.round(nextHeight));
    setModel((prev) =>
      scaleModelToCanvas(prev, canvasWidth, canvasHeight, safeWidth, safeHeight),
    );
    setRegions((prev) =>
      prev.map((region) =>
        createEmptySceneRegion({
          ...region,
          points: region.points.map((point) => ({
            x: (point.x / Math.max(canvasWidth, 1)) * safeWidth,
            y: (point.y / Math.max(canvasHeight, 1)) * safeHeight,
          })),
          anchors: region.anchors.map((anchor) => ({
            ...anchor,
            x: (anchor.x / Math.max(canvasWidth, 1)) * safeWidth,
            y: (anchor.y / Math.max(canvasHeight, 1)) * safeHeight,
          })),
        }),
      ),
    );
    setCanvasWidth(safeWidth);
    setCanvasHeight(safeHeight);
    resetEditorView();
  }

  function resetEditorView() {
    setEditorView({ zoom: 1, panX: 0, panY: 0 });
  }

  useEffect(() => {
    let active = true;

    (async () => {
      const session = await ensureSuperadminOrRedirect(router);
      if (!session) return;

      try {
        const [
          catalogs,
          loadedValidationRules,
          token,
          planTypeResponse,
          progressionTreesResponse,
          progressionGraphStateResponse,
        ] = await Promise.all([
          getManyCatalogItems(["home_scene_theme"]),
          loadValidationRulesForDomain("trail"),
          getSessionAccessToken(),
          supabase
            .from("garden_plan_types")
            .select(
              "id,code,label,category,description,flower_family,suggested_element,icon_emoji,flower_asset_path,seed_asset_path,flower_builder_config,is_custom,sort_order,archived_at,updated_at",
            )
            .is("archived_at", null),
          supabase
            .from("progression_tree_nodes")
            .select("id,title,description,accent_color,rank,rarity,leaf_variant,enabled")
            .eq("enabled", true)
            .order("code", { ascending: true }),
          supabase
            .from("progression_graph_state")
            .select("tree_settings")
            .eq("key", "default")
            .maybeSingle(),
        ]);
        if (!active) return;
        setValidationRules(loadedValidationRules);
        const sceneCatalog = catalogs.home_scene_theme ?? [];
        const persisted = resolveHomeTrailConfigFromSceneCatalog(sceneCatalog);
        setPersistedBaseline(persisted);
        applyEditorConfig(persisted);

        const nextSeedAsset = sceneCatalogValueByCode(
          sceneCatalog,
          "seed_asset",
          DEFAULT_HOME_SCENE.seedAsset,
        );
        const nextSproutAsset = sceneCatalogValueByCode(
          sceneCatalog,
          "sprout_asset",
          DEFAULT_HOME_SCENE.sproutAsset,
        );
        setSeedAsset(nextSeedAsset);
        setSproutAsset(nextSproutAsset);
        setPersistedSeedAsset(nextSeedAsset);
        setPersistedSproutAsset(nextSproutAsset);

        const canonicalSamples = planTypeResponse.error
          ? []
          : collapseTrailPlanTypeFlowerSamples(
              ((planTypeResponse.data as Record<string, unknown>[] | null) ?? []),
            );
        const nextFlowerAssets = canonicalSamples.length
          ? buildCanonicalTrailFlowerAssetMap(canonicalSamples)
          : {
              ...DEFAULT_FLOWER_ICON_BY_ELEMENT,
              default: DEFAULT_FLOWER_ICON,
            };
        setPlanTypeFlowerSamples(canonicalSamples);
        setFlowerAssetMap(nextFlowerAssets);
        setPersistedFlowerAssetMap(nextFlowerAssets);

        const nextTreeSamples = progressionTreesResponse.error
          ? fallbackTrailProgressionTreeSamples()
          : Object.values(
              buildLegacyCompatibleProgressionRules({
                trees:
                  ((progressionTreesResponse.data as CanonicalProgressionTreeRow[] | null) ?? [])
                    .filter((row) => row.enabled !== false),
                graphStateRow: progressionGraphStateResponse.data
                  ? { tree_settings: progressionGraphStateResponse.data.tree_settings }
                  : null,
              }),
            );
        setCanonicalTreeSamples(
          nextTreeSamples.length ? nextTreeSamples : fallbackTrailProgressionTreeSamples(),
        );

        if (token) {
          const response = await fetch("/api/admin/home/public-assets", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const payload = (await response.json()) as { assets?: unknown };
            if (Array.isArray(payload.assets)) {
              setPublicAssets(payload.assets.map((row) => String(row ?? "").trim()).filter(Boolean));
            }
          }
        }
      } catch (error) {
        if (!active) return;
        setStatus(
          error instanceof Error
            ? error.message
            : "No se pudo cargar el sendero persistido.",
        );
      } finally {
        if (active) setLoadingPersisted(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    setPathDraft(pathD);
  }, [pathD]);

  useEffect(() => {
    if (!assetPickerTarget) return;
    setAssetPickerFilter("recommended");
  }, [assetPickerTarget]);

  useEffect(() => {
    if (!resolvedBackgroundSrc) {
      setImageNaturalSize(null);
      return;
    }

    const image = new window.Image();
    image.onload = () => {
      const nextSize = {
        width: image.naturalWidth,
        height: image.naturalHeight,
      };
      setImageNaturalSize({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => {
      setImageNaturalSize(null);
    };
    image.src = resolvedBackgroundSrc;
  }, [resolvedBackgroundSrc]);

  function registerPublicAsset(assetPath: string) {
    const nextPath = assetPath.trim();
    if (!nextPath) return;
    setPublicAssets((prev) => {
      if (prev.includes(nextPath)) return prev;
      return [...prev, nextPath].sort((a, b) => a.localeCompare(b, "es"));
    });
  }

  function collectReferencedHomeTrailAssets(
    background: string | null | undefined,
    annualAssets: Record<(typeof ANNUAL_TREE_PHASES)[number], string | null>,
  ) {
    return new Set(
      [
        String(background ?? "").trim(),
        ...ANNUAL_TREE_PHASES.map((phase) => String(annualAssets[phase] ?? "").trim()),
      ].filter(Boolean),
    );
  }

  function isHomeTrailAssetReferencedElsewhere(
    assetPath: string | null | undefined,
    options: {
      background: string | null | undefined;
      annualAssets: Record<(typeof ANNUAL_TREE_PHASES)[number], string | null>;
      excludeAnnualPhase?: (typeof ANNUAL_TREE_PHASES)[number];
      excludeBackground?: boolean;
    },
  ) {
    const normalized = String(assetPath ?? "").trim();
    if (!normalized) return false;

    if (
      !options.excludeBackground &&
      String(options.background ?? "").trim() === normalized
    ) {
      return true;
    }

    return ANNUAL_TREE_PHASES.some(
      (phase) =>
        phase !== options.excludeAnnualPhase &&
        String(options.annualAssets[phase] ?? "").trim() === normalized,
    );
  }

  function openImageUploadPicker(target: NonNullable<ManagedImageUploadTarget>) {
    setImageUploadTarget(target);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
      imageInputRef.current.click();
    }
  }

  async function bestEffortDeleteManagedAssets(urls: Array<string | null | undefined>) {
    const pending = Array.from(
      new Set(
        urls
          .map((url) => String(url ?? "").trim())
          .filter((url) => url.length > 0 && isManagedHomeTrailBackgroundUrl(url)),
      ),
    );
    if (!pending.length) return;

    const token = await getSessionAccessToken();
    if (!token) return;

    await Promise.allSettled(
      pending.map((url) =>
        fetch("/api/admin/home/trail-background", {
          method: "DELETE",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ url }),
        }).catch(() => null),
      ),
    );
  }

  function replaceAnnualTreeAsset(
    phase: (typeof ANNUAL_TREE_PHASES)[number],
    nextPath: string | null,
  ) {
    const current = annualTreeAssets[phase]?.trim() || "";
    const persisted = persistedBaseline.annualTreeAssets[phase]?.trim() || "";
    const normalizedNext = String(nextPath ?? "").trim();

    if (
      current &&
      current !== normalizedNext &&
      current !== persisted &&
      isManagedHomeTrailBackgroundUrl(current) &&
      !isHomeTrailAssetReferencedElsewhere(current, {
        background: backgroundAsset,
        annualAssets: annualTreeAssets,
        excludeAnnualPhase: phase,
      })
    ) {
      void bestEffortDeleteManagedAssets([current]);
    }

    setAnnualTreeAssets((prev) => ({
      ...prev,
      [phase]: normalizedNext || null,
    }));
  }

  function toCanvasPoint(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: clamp(((clientX - rect.left) / rect.width) * canvasWidth, 0, canvasWidth),
      y: clamp(((clientY - rect.top) / rect.height) * canvasHeight, 0, canvasHeight),
    };
  }

  function updateHandlePoint(kind: HandleKind, index: number, point: Point) {
    setModel((prev) => {
      const next: EditablePathModel = {
        anchors: prev.anchors.map(clonePoint),
        controlsStart: prev.controlsStart.map(clonePoint),
        controlsEnd: prev.controlsEnd.map(clonePoint),
      };

      if (kind === "anchor") {
        const previousAnchor = next.anchors[index];
        if (!previousAnchor) return prev;
        const dx = point.x - previousAnchor.x;
        const dy = point.y - previousAnchor.y;
        next.anchors[index] = point;
        if (index < next.controlsStart.length && next.controlsStart[index]) {
          next.controlsStart[index] = {
            x: clamp(next.controlsStart[index].x + dx, 0, canvasWidth),
            y: clamp(next.controlsStart[index].y + dy, 0, canvasHeight),
          };
        }
        if (index > 0 && next.controlsEnd[index - 1]) {
          next.controlsEnd[index - 1] = {
            x: clamp(next.controlsEnd[index - 1].x + dx, 0, canvasWidth),
            y: clamp(next.controlsEnd[index - 1].y + dy, 0, canvasHeight),
          };
        }
        return next;
      }

      if (kind === "control-start" && next.controlsStart[index]) {
        next.controlsStart[index] = point;
      }

      if (kind === "control-end" && next.controlsEnd[index]) {
        next.controlsEnd[index] = point;
      }

      return next;
    });
  }

  function updateSummitPoint(key: SummitHandleKey, point: Point) {
    setSummitLayout((prev) => ({
      ...prev,
      [key]: point,
    }));
  }

  function updateRegion(regionId: string, updater: (region: SceneRegion) => SceneRegion) {
    setRegions((prev) =>
      prev.map((region) => (region.id === regionId ? createEmptySceneRegion(updater(region)) : region)),
    );
  }

  function handleCreateRegion() {
    const nextRegion = createEmptySceneRegion({
      id: createSceneRegionId("region"),
      name: `Region ${regions.length + 1}`,
      kind: "milestone_tree",
      placementMode: "manual",
      capacity: 1,
    });
    setRegions((prev) => [...prev, nextRegion]);
    setSelectedRegionId(nextRegion.id);
    setSelectedRegionVertexIndex(null);
    setSelectedRegionAnchorId(null);
    setRegionEditorMode("draw_polygon");
    setStatus("Nueva región creada. Haz clic en el lienzo para dibujar el polígono.");
  }

  function handleDeleteSelectedRegion() {
    if (!selectedRegionId) return;
    setRegions((prev) => prev.filter((region) => region.id !== selectedRegionId));
    const nextRegion = regions.find((region) => region.id !== selectedRegionId) ?? null;
    setSelectedRegionId(nextRegion?.id ?? null);
    setSelectedRegionVertexIndex(null);
    setSelectedRegionAnchorId(null);
    setRegionEditorMode("select");
    setStatus("Region eliminada.");
  }

  function applyRegionPreset(
    regionId: string,
    preset: "milestone_exact" | "milestone_zone" | "flowers_scattered" | "forbidden_zone",
  ) {
    updateRegion(regionId, (region) => {
      if (preset === "milestone_exact") {
        return {
          ...region,
          kind: "milestone_tree",
          placementMode: "anchors_in_order",
          capacity: Math.max(region.anchors.length || 1, 1),
          metadata: {
            ...region.metadata,
            allowedKinds: ["tree"],
          },
        };
      }
      if (preset === "milestone_zone") {
        return {
          ...region,
          kind: "milestone_tree",
          placementMode: "centroid",
          capacity: 1,
          metadata: {
            ...region.metadata,
            allowedKinds: ["tree"],
          },
        };
      }
      if (preset === "flowers_scattered") {
        return {
          ...region,
          kind: "flower_area",
          placementMode: "random_poisson",
          capacity: region.capacity ?? 6,
          metadata: {
            ...region.metadata,
            allowedKinds: ["flower", "sprout", "seed"],
          },
        };
      }
      return {
        ...region,
        kind: "forbidden",
        placementMode: "manual",
        capacity: null,
        metadata: {
          ...region.metadata,
          allowedKinds: [],
        },
      };
    });

    if (preset === "milestone_exact") {
      setStatus("Preset aplicado: hito exacto con anchors.");
    } else if (preset === "milestone_zone") {
      setStatus("Preset aplicado: un árbol centrado en la zona.");
    } else if (preset === "flowers_scattered") {
      setStatus("Preset aplicado: flores repartidas dentro de la zona.");
    } else {
      setStatus("Preset aplicado: zona marcada como bloqueada.");
    }
  }

  function handleAddRegionPoint(point: SceneRegionPoint) {
    if (!selectedRegionId) return;
    updateRegion(selectedRegionId, (region) => ({
      ...region,
      points: [...region.points, point],
    }));
    setSelectedRegionVertexIndex((selectedRegion?.points.length ?? 0));
  }

  function handleCloseSelectedRegion() {
    if (!selectedRegion) return;
    if (selectedRegion.points.length < 3) {
      setStatus("La región necesita al menos 3 vértices.");
      return;
    }
    setRegionEditorMode("select");
    setStatus("Polígono cerrado. Ahora puedes mover vértices o anchors.");
  }

  function handleDeleteSelectedRegionVertex() {
    if (!selectedRegion || selectedRegionVertexIndex == null) return;
    if (selectedRegion.points.length <= 3) {
      setStatus("Una región necesita al menos 3 vértices.");
      return;
    }
    updateRegion(selectedRegion.id, (region) => ({
      ...region,
      points: region.points.filter((_, index) => index !== selectedRegionVertexIndex),
    }));
    setSelectedRegionVertexIndex(null);
  }

  function handleDeleteSelectedRegionAnchor() {
    if (!selectedRegion || !selectedRegionAnchorId) return;
    updateRegion(selectedRegion.id, (region) => ({
      ...region,
      anchors: region.anchors.filter((anchor) => anchor.id !== selectedRegionAnchorId),
    }));
    setSelectedRegionAnchorId(null);
  }

  function startRegionVertexDrag(
    regionId: string,
    pointIndex: number,
    event: ReactPointerEvent<SVGCircleElement>,
  ) {
    event.preventDefault();
    event.stopPropagation();
    activeRegionVertexRef.current = {
      regionId,
      pointIndex,
      pointerId: event.pointerId,
    };
    setSelectedRegionId(regionId);
    setSelectedRegionVertexIndex(pointIndex);
    setSelectedRegionAnchorId(null);
    setRegionEditorMode("select");
    svgRef.current?.setPointerCapture?.(event.pointerId);
  }

  function startRegionAnchorDrag(
    regionId: string,
    anchorId: string,
    event: ReactPointerEvent<SVGElement>,
  ) {
    event.preventDefault();
    event.stopPropagation();
    activeRegionAnchorRef.current = {
      regionId,
      anchorId,
      pointerId: event.pointerId,
    };
    setSelectedRegionId(regionId);
    setSelectedRegionAnchorId(anchorId);
    setSelectedRegionVertexIndex(null);
    setRegionEditorMode("select");
    svgRef.current?.setPointerCapture?.(event.pointerId);
  }

  function finishRegionVertexDrag(pointerId: number) {
    const active = activeRegionVertexRef.current;
    if (!active || active.pointerId !== pointerId) return;
    svgRef.current?.releasePointerCapture?.(pointerId);
    activeRegionVertexRef.current = null;
  }

  function finishRegionAnchorDrag(pointerId: number) {
    const active = activeRegionAnchorRef.current;
    if (!active || active.pointerId !== pointerId) return;
    svgRef.current?.releasePointerCapture?.(pointerId);
    activeRegionAnchorRef.current = null;
  }

  function handleRegionSurfaceClick(event: ReactPointerEvent<SVGSVGElement>) {
    if (activeTab !== "regions") return;
    const point = toCanvasPoint(event.clientX, event.clientY);
    if (!point || !selectedRegionId) return;

    if (regionEditorMode === "draw_polygon") {
      handleAddRegionPoint(point);
      return;
    }

    if (regionEditorMode === "add_anchor") {
      updateRegion(selectedRegionId, (region) => ({
        ...region,
        anchors: [
          ...region.anchors,
          {
            id: createSceneRegionId("anchor"),
            label: `Anchor ${region.anchors.length + 1}`,
            x: point.x,
            y: point.y,
          },
        ],
      }));
      setRegionEditorMode("select");
      setStatus("Anchor añadido a la región.");
    }
  }

  function applyPickedAsset(assetPath: string) {
    const target = assetPickerTarget;
    if (!target) return;
    const nextPath = assetPath.trim();
    if (!nextPath) return;

    if (target.kind === "annual") {
      replaceAnnualTreeAsset(target.key, nextPath);
      setStatus(`Asset anual actualizado para ${target.key}. Guarda persistente para publicarlo.`);
    }

    setAssetPickerTarget(null);
  }

  function startHandleDrag(
    kind: HandleKind,
    index: number,
    event: ReactPointerEvent<SVGCircleElement>,
  ) {
    event.preventDefault();
    event.stopPropagation();
    activeHandleRef.current = {
      kind,
      index,
      pointerId: event.pointerId,
    };
    setSelectedHandle(`${kind}:${index}`);
    svgRef.current?.setPointerCapture?.(event.pointerId);
  }

  function startSummitDrag(key: SummitHandleKey, event: ReactPointerEvent<SVGCircleElement>) {
    event.preventDefault();
    event.stopPropagation();
    activeSummitHandleRef.current = {
      key,
      pointerId: event.pointerId,
    };
    svgRef.current?.setPointerCapture?.(event.pointerId);
  }

  function finishHandleDrag(pointerId: number) {
    const active = activeHandleRef.current;
    if (!active || active.pointerId !== pointerId) return;
    svgRef.current?.releasePointerCapture?.(pointerId);
    activeHandleRef.current = null;
  }

  function finishSummitDrag(pointerId: number) {
    const active = activeSummitHandleRef.current;
    if (!active || active.pointerId !== pointerId) return;
    svgRef.current?.releasePointerCapture?.(pointerId);
    activeSummitHandleRef.current = null;
  }

  function startPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if (activeTab === "regions" && regionEditorMode !== "select") return;
    activePanRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPanX: editorView.panX,
      startPanY: editorView.panY,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function movePan(event: ReactPointerEvent<HTMLDivElement>) {
    const pan = activePanRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    const dx = event.clientX - pan.startClientX;
    const dy = event.clientY - pan.startClientY;
    setEditorView((prev) =>
      clampEditorViewToFrame(
        {
          ...prev,
          panX: pan.startPanX + dx,
          panY: pan.startPanY + dy,
        },
        readViewportFrameMetrics(viewportFrameRef.current),
      ),
    );
  }

  function finishPan(pointerId: number) {
    const pan = activePanRef.current;
    if (!pan || pan.pointerId !== pointerId) return;
    viewportFrameRef.current?.releasePointerCapture?.(pointerId);
    activePanRef.current = null;
  }

  function handleSurfacePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const point = toCanvasPoint(event.clientX, event.clientY);
    if (!point) return;
    const regionVertexActive = activeRegionVertexRef.current;
    if (regionVertexActive && regionVertexActive.pointerId === event.pointerId) {
      updateRegion(regionVertexActive.regionId, (region) => ({
        ...region,
        points: region.points.map((vertex, index) =>
          index === regionVertexActive.pointIndex ? point : vertex,
        ),
      }));
      return;
    }

    const regionAnchorActive = activeRegionAnchorRef.current;
    if (regionAnchorActive && regionAnchorActive.pointerId === event.pointerId) {
      updateRegion(regionAnchorActive.regionId, (region) => ({
        ...region,
        anchors: region.anchors.map((anchor) =>
          anchor.id === regionAnchorActive.anchorId
            ? { ...anchor, x: point.x, y: point.y }
            : anchor,
        ),
      }));
      return;
    }

    const active = activeHandleRef.current;
    if (active && active.pointerId === event.pointerId) {
      updateHandlePoint(active.kind, active.index, point);
      return;
    }

    const summitActive = activeSummitHandleRef.current;
    if (summitActive && summitActive.pointerId === event.pointerId) {
      updateSummitPoint(summitActive.key, point);
    }
  }

  function handleApplyPathDraft() {
    try {
      const nextModel = editableModelFromPath(pathDraft);
      if (nextModel.anchors.length < 2) {
        throw new Error("El path necesita al menos dos puntos.");
      }
      setModel(nextModel);
      setSelectedHandle("anchor:0");
      setStatus("Path aplicado.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "No se pudo aplicar el path.",
      );
    }
  }

  function handleResetToPersisted() {
    applyEditorConfig(persistedBaseline);
    setSeedAsset(persistedSeedAsset);
    setSproutAsset(persistedSproutAsset);
    setFlowerAssetMap({ ...persistedFlowerAssetMap });
    setStatus("Editor reseteado a la configuración global guardada.");
  }

  function handleInsertAnchorAfterSelected() {
    if (selectedAnchorIndex === null) return;
    if (selectedAnchorIndex >= model.anchors.length - 1) {
      setStatus("Selecciona un punto que no sea el último para insertar después.");
      return;
    }
    setModel((prev) => insertAnchorAfter(prev, selectedAnchorIndex));
    setSelectedHandle(`anchor:${selectedAnchorIndex + 1}`);
    setStatus("Punto de giro insertado.");
  }

  function handleDeleteSelectedAnchor() {
    if (selectedAnchorIndex === null) return;
    if (selectedAnchorIndex <= 0 || selectedAnchorIndex >= model.anchors.length - 1) {
      setStatus("El primer y el último punto no se pueden borrar.");
      return;
    }
    setModel((prev) => deleteAnchorAt(prev, selectedAnchorIndex));
    setSelectedHandle(`anchor:${Math.max(0, selectedAnchorIndex - 1)}`);
    setStatus("Punto de giro eliminado.");
  }

  async function handleCopy(label: string, value: string) {
    try {
      await copyText(value);
      setStatus(`${label} copiado al portapapeles.`);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : `No se pudo copiar ${label}.`,
      );
    }
  }

  async function handleUploadBackground(file: File) {
    setUploadingImage(true);
    try {
      const token = await getSessionAccessToken();
      if (!token) {
        setStatus("Sesión no disponible para subir la imagen.");
        return;
      }

      const size = await readImageSize(file);
      const form = new FormData();
      form.set("file", file);
      const currentBackground = backgroundAsset.trim();
      const persistedBackground = persistedBaseline.sourceAsset?.trim() || "";
      if (
        currentBackground &&
        currentBackground !== persistedBackground &&
        isManagedHomeTrailBackgroundUrl(currentBackground) &&
        !isHomeTrailAssetReferencedElsewhere(currentBackground, {
          background: backgroundAsset,
          annualAssets: annualTreeAssets,
          excludeBackground: true,
        })
      ) {
        form.set("replaceUrl", backgroundAsset.trim());
      }

      const response = await fetch("/api/admin/home/trail-background", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      if (!response.ok) {
        const message = await parseApiError(
          response,
          "No se pudo subir la imagen del sendero.",
        );
        setStatus(message);
        return;
      }

      const payload = (await response.json()) as { url?: unknown };
      const nextUrl = String(payload.url ?? "").trim();
      if (!nextUrl) {
        setStatus("La subida termino, pero no devolvio URL.");
        return;
      }

      setBackgroundAsset(nextUrl);
      registerPublicAsset(nextUrl);
      setImageNaturalSize(size);
      setStatus(
        `Imagen subida al proyecto. El fondo ya ocupa el lienzo actual; usa "Ajustar a imagen real" solo si quieres que el stage adopte exactamente ${size.width} x ${size.height}.`,
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "No se pudo subir la imagen del sendero.",
      );
    } finally {
      setUploadingImage(false);
      setImageUploadTarget(null);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  }

  async function handleUploadAnnualAsset(
    phase: (typeof ANNUAL_TREE_PHASES)[number],
    file: File,
  ) {
    setUploadingImage(true);
    try {
      const token = await getSessionAccessToken();
      if (!token) {
        setStatus("Sesion no disponible para subir la imagen.");
        return;
      }

      const form = new FormData();
      form.set("file", file);
      const currentAsset = annualTreeAssets[phase]?.trim() || "";
      const persistedAsset = persistedBaseline.annualTreeAssets[phase]?.trim() || "";
      if (
        currentAsset &&
        currentAsset !== persistedAsset &&
        isManagedHomeTrailBackgroundUrl(currentAsset) &&
        !isHomeTrailAssetReferencedElsewhere(currentAsset, {
          background: backgroundAsset,
          annualAssets: annualTreeAssets,
          excludeAnnualPhase: phase,
        })
      ) {
        form.set("replaceUrl", currentAsset);
      }

      const response = await fetch("/api/admin/home/trail-background", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      if (!response.ok) {
        const message = await parseApiError(
          response,
          "No se pudo subir la imagen de la cima.",
        );
        setStatus(message);
        return;
      }

      const payload = (await response.json()) as { url?: unknown };
      const nextUrl = String(payload.url ?? "").trim();
      if (!nextUrl) {
        setStatus("La subida termino, pero no devolvio URL.");
        return;
      }

      setAnnualTreeAssets((prev) => ({
        ...prev,
        [phase]: nextUrl,
      }));
      registerPublicAsset(nextUrl);
      setAssetPickerTarget(null);
      setStatus(`Imagen anual subida para ${phase}. Guarda persistente para publicarla.`);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "No se pudo subir la imagen de la cima.",
      );
    } finally {
      setUploadingImage(false);
      setImageUploadTarget(null);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  }

  async function handleRemoveBackground() {
    const current = backgroundAsset.trim();
    const persistedBackground = persistedBaseline.sourceAsset?.trim() || "";
    if (!current) {
      setStatus("No hay imagen cargada.");
      return;
    }

    if (isManagedHomeTrailBackgroundUrl(current) && current !== persistedBackground) {
      if (
        !isHomeTrailAssetReferencedElsewhere(current, {
          background: backgroundAsset,
          annualAssets: annualTreeAssets,
          excludeBackground: true,
        })
      ) {
        const token = await getSessionAccessToken();
        if (token) {
          const response = await fetch("/api/admin/home/trail-background", {
            method: "DELETE",
            headers: {
              "content-type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ url: current }),
          });

          if (!response.ok) {
            const message = await parseApiError(
              response,
              "No se pudo borrar la imagen actual.",
            );
            setStatus(message);
            return;
          }
        }
      }
    }

    setBackgroundAsset("");
    setImageNaturalSize(null);
    setStatus("Imagen de fondo eliminada. Guarda persistente para reflejarlo en Home.");
  }

  async function handleSavePersistentConfig() {
    const normalized = normalizeHomeTrailRuntimeConfig({
      canvasWidth,
      canvasHeight,
      pathD,
      sourceAsset: backgroundAsset.trim() || null,
      displayDesktopWidth,
      displayTabletWidth,
      displayMobileWidth,
      showSeasonBandLabels,
      sceneBackgroundMode,
      sceneBackgroundSolid,
      summitLabelText,
      summitLabelX: summitLayout.label.x,
      summitLabelY: summitLayout.label.y,
      summitTreeX: summitLayout.tree.x,
      summitTreeY: summitLayout.tree.y,
      summitStatusX: summitLayout.status.x,
      summitStatusY: summitLayout.status.y,
      summitAvatarsX: persistedBaseline.summitAvatarsX,
      summitAvatarsY: persistedBaseline.summitAvatarsY,
      annualTreeAssets,
      regions,
    });
    const previousAsset = persistedBaseline.sourceAsset?.trim() || "";
    const nextAsset = normalized.sourceAsset?.trim() || "";

    setSavingPersistent(true);
    try {
      const rows = [
        ...buildHomeTrailSceneCatalogRows(normalized),
        ...buildSceneAssetRows(seedAsset.trim(), sproutAsset.trim()),
      ];

      const { error } = await supabase.from("catalog_items").upsert(rows, {
        onConflict: "catalog_key,code",
      });

      if (error) {
        setStatus(`No se pudo guardar el sendero global: ${error.message}`);
        return;
      }

      const nextReferencedAssets = collectReferencedHomeTrailAssets(
        nextAsset,
        normalized.annualTreeAssets,
      );

      await bestEffortDeleteManagedAssets([
        previousAsset &&
        previousAsset !== nextAsset &&
        !nextReferencedAssets.has(previousAsset)
          ? previousAsset
          : "",
        ...ANNUAL_TREE_PHASES.map((phase) => {
          const previous = persistedBaseline.annualTreeAssets[phase]?.trim() || "";
          const next = normalized.annualTreeAssets[phase]?.trim() || "";
          return previous &&
            previous !== next &&
            !nextReferencedAssets.has(previous)
            ? previous
            : "";
        }),
      ]);

      setPersistedBaseline(normalized);
      setPersistedSeedAsset(seedAsset.trim());
      setPersistedSproutAsset(sproutAsset.trim());
      setPersistedFlowerAssetMap({ ...flowerAssetMap });
      setStatus("Sendero guardado globalmente.");
    } finally {
      setSavingPersistent(false);
    }
  }

  function startOverlayDrag(panel: TrailOverlayPanelId, event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    setOverlayDrag({
      panel,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: overlayOffsets[panel].x,
      startOffsetY: overlayOffsets[panel].y,
    });
  }

  return (
    <div className="lv-page h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.9),rgba(232,239,226,0.98))] text-slate-900">
      <div className="relative h-full w-full overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-4 z-30 -translate-x-1/2">
          <div className="pointer-events-auto inline-flex w-max max-w-[calc(100vw-2rem)] items-center justify-center gap-2 overflow-x-auto rounded-full border border-[#d9e4d3] bg-[rgba(255,255,255,0.98)] px-3 py-3 shadow-[0_18px_44px_rgba(24,36,26,0.14)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="shrink-0 rounded-full border border-[#d9e4d3] bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-[#f8fbf5]"
            >
              Volver
            </button>
            {trailEditorTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setActiveTab((current) => (current === tab.id ? null : tab.id))
                }
                className={`shrink-0 rounded-full border px-4 py-2 text-sm transition ${
                  activeTab === tab.id
                    ? "border-[#94b38c] bg-[#eef8e8] text-[#496445]"
                    : "border-[#d9e4d3] bg-white text-slate-700 hover:bg-[#f8fbf5]"
                }`}
              >
                {tab.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowValidationPanel((value) => !value)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm transition ${
                showValidationPanel
                  ? "border-[#eadfc1] bg-[#fff7db] text-[#7b6116]"
                  : "border-[#d9e4d3] bg-white text-slate-700 hover:bg-[#f8fbf5]"
              }`}
            >
              Validacion {validationIssues.length ? `(${validationIssues.length})` : ""}
            </button>
            <button
              type="button"
              onClick={() => setShowAdvancedPanel((value) => !value)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm transition ${
                showAdvancedPanel
                  ? "border-[#d3d9e5] bg-[#f4f7fb] text-[#43506a]"
                  : "border-[#d9e4d3] bg-white text-slate-700 hover:bg-[#f8fbf5]"
              }`}
            >
              Avanzado
            </button>
            <button
              type="button"
              onClick={() => void handleSavePersistentConfig()}
              disabled={loadingPersisted || savingPersistent}
              className="shrink-0 rounded-full border border-[#94b38c] bg-[#eef8e8] px-4 py-2 text-sm text-[#496445] transition hover:bg-[#e4f3da] disabled:opacity-60"
            >
              {savingPersistent ? "Guardando..." : "Publicar"}
            </button>
          </div>
        </div>

        <div className="absolute inset-0 overflow-hidden">
          <section className="relative h-full overflow-hidden bg-[#f7f5f2]">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                const target = imageUploadTarget;
                if (!file || !target) {
                  if (imageInputRef.current) {
                    imageInputRef.current.value = "";
                  }
                  setImageUploadTarget(null);
                  return;
                }
                if (target.kind === "background") {
                  void handleUploadBackground(file);
                  return;
                }
                void handleUploadAnnualAsset(target.key, file);
              }}
            />

            <div className="pointer-events-none absolute bottom-4 left-4 z-20 flex max-w-[calc(100%-2rem)] flex-wrap gap-2">
              <div className="rounded-full border border-[#e4ecdf] bg-[rgba(255,255,255,0.98)] px-4 py-2 text-sm text-slate-700 shadow-[0_12px_30px_rgba(24,36,26,0.12)]">
                {activeTabLabel}
              </div>
              <div className="rounded-full border border-[#e4ecdf] bg-[rgba(255,255,255,0.98)] px-4 py-2 text-sm text-slate-700 shadow-[0_12px_30px_rgba(24,36,26,0.12)]">
                Lienzo {canvasWidth} x {canvasHeight}
              </div>
              <div className="rounded-full border border-[#e4ecdf] bg-[rgba(255,255,255,0.98)] px-4 py-2 text-sm text-slate-700 shadow-[0_12px_30px_rgba(24,36,26,0.12)]">
                Zoom {editorZoomLabel}%
              </div>
              <div className="rounded-full border border-[#e4ecdf] bg-[rgba(255,255,255,0.98)] px-4 py-2 text-sm text-slate-700 shadow-[0_12px_30px_rgba(24,36,26,0.12)]">
                {status ?? activeTabPreviewHint}
              </div>
            </div>

            <div className="absolute inset-0 overflow-hidden">
              <div
                ref={viewportFrameRef}
                className={`relative h-full w-full overflow-hidden bg-[#ece7dc] touch-none select-none ${
                  activeTab === "regions" && regionEditorMode !== "select"
                    ? "cursor-crosshair"
                    : "cursor-grab active:cursor-grabbing"
                }`}
                style={{
                  background:
                    sceneBackgroundMode === "none"
                      ? "#ece7dc"
                      : sceneBackgroundMode === "solid"
                        ? sceneBackgroundSolid
                        : "linear-gradient(180deg, rgba(244,248,229,0.92), rgba(247,239,229,0.68))",
                }}
                onPointerDown={startPan}
                onPointerMove={movePan}
                onPointerUp={(event) => finishPan(event.pointerId)}
                onPointerCancel={(event) => finishPan(event.pointerId)}
              >
                {showSeasonBandLabels
                  ? previewSeasonBands.map((band) => (
                      <div
                        key={`preview-band-${band.season}`}
                        className="pointer-events-none absolute left-3 z-20 rounded-full border bg-white/84 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-700 shadow-sm"
                        style={{
                          top: `${(((band.top + band.bottom) / 2) / canvasHeight) * 100}%`,
                          transform: "translateY(-50%)",
                        }}
                      >
                        {band.label}
                      </div>
                    ))
                  : null}
                <div
                  className="absolute inset-0"
                  style={{
                    transform: `translate(${editorView.panX}px, ${editorView.panY}px) scale(${editorView.zoom})`,
                    transformOrigin: "0 0",
                  }}
                >
                  <svg
                    ref={svgRef}
                    viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
                    className="absolute inset-0 h-full w-full touch-none select-none"
                    preserveAspectRatio="none"
                    onPointerMove={handleSurfacePointerMove}
                    onPointerUp={(event) => {
                      finishHandleDrag(event.pointerId);
                      finishSummitDrag(event.pointerId);
                      finishRegionVertexDrag(event.pointerId);
                      finishRegionAnchorDrag(event.pointerId);
                    }}
                    onPointerCancel={(event) => {
                      finishHandleDrag(event.pointerId);
                      finishSummitDrag(event.pointerId);
                      finishRegionVertexDrag(event.pointerId);
                      finishRegionAnchorDrag(event.pointerId);
                    }}
                    onClick={handleRegionSurfaceClick}
                  >
                    <rect
                      x="0"
                      y="0"
                      width={canvasWidth}
                      height={canvasHeight}
                      fill="#f4efe7"
                    />
                    {resolvedBackgroundSrc ? (
                      <image
                        href={resolvedBackgroundSrc}
                        x="0"
                        y="0"
                        width={canvasWidth}
                        height={canvasHeight}
                        preserveAspectRatio="none"
                        opacity="0.96"
                      />
                    ) : null}

                    {activeTab === "regions"
                      ? regions.map((region) => {
                          const tone = regionTone(region.kind);
                          const pointsAttr = region.points
                            .map((point) => `${point.x},${point.y}`)
                            .join(" ");
                          const isSelected = region.id === selectedRegionId;
                          return (
                            <g
                              key={region.id}
                              onPointerDown={(event) => {
                                event.stopPropagation();
                                setSelectedRegionId(region.id);
                                setSelectedRegionVertexIndex(null);
                                setSelectedRegionAnchorId(null);
                                setRegionEditorMode("select");
                              }}
                            >
                              {region.points.length >= 3 ? (
                                <polygon
                                  points={pointsAttr}
                                  fill={tone.fill}
                                  stroke={tone.stroke}
                                  strokeWidth={isSelected ? 3.2 : 2.2}
                                  opacity={region.enabled ? 1 : 0.42}
                                />
                              ) : region.points.length >= 2 ? (
                                <polyline
                                  points={pointsAttr}
                                  fill="transparent"
                                  stroke={tone.stroke}
                                  strokeWidth={isSelected ? 3.2 : 2.2}
                                  strokeDasharray="7 6"
                                  opacity={region.enabled ? 1 : 0.42}
                                />
                              ) : null}
                              {region.points.map((point, index) => (
                                <circle
                                  key={`${region.id}:point:${index}`}
                                  cx={point.x}
                                  cy={point.y}
                                  r={
                                    isSelected && selectedRegionVertexIndex === index ? 7 : 5.8
                                  }
                                  fill={isSelected ? tone.stroke : "#ffffff"}
                                  stroke={isSelected ? "#ffffff" : tone.stroke}
                                  strokeWidth={2}
                                  onPointerDown={(event) =>
                                    startRegionVertexDrag(region.id, index, event)
                                  }
                                />
                              ))}
                              {region.anchors.map((anchor) => (
                                <g key={anchor.id}>
                                  <rect
                                    x={anchor.x - 5}
                                    y={anchor.y - 5}
                                    width={10}
                                    height={10}
                                    rx={2}
                                    fill={
                                      isSelected && selectedRegionAnchorId === anchor.id
                                        ? "#111827"
                                        : "#ffffff"
                                    }
                                    stroke={tone.stroke}
                                    strokeWidth={2}
                                    onPointerDown={(event) =>
                                      startRegionAnchorDrag(region.id, anchor.id, event)
                                    }
                                  />
                                  <text
                                    x={anchor.x + 8}
                                    y={anchor.y - 8}
                                    fontSize="11"
                                    fill="#334155"
                                  >
                                    {anchor.label}
                                  </text>
                                </g>
                              ))}
                              {region.points.length >= 3 ? (
                                <text
                                  x={region.points[0]!.x + 10}
                                  y={region.points[0]!.y - 10}
                                  fontSize="12"
                                  fill={tone.stroke}
                                >
                                  {region.name}
                                </text>
                              ) : null}
                            </g>
                          );
                        })
                      : null}
                    {activeTab === "regions"
                      ? selectedRegionPreview.map((preview) => (
                          <g key={preview.id} pointerEvents="none">
                            <circle
                              cx={preview.x}
                              cy={preview.y}
                              r={preview.baseAligned ? 7 : 10}
                              fill="rgba(255,255,255,0.72)"
                              stroke="rgba(15,23,42,0.22)"
                              strokeWidth={1.4}
                            />
                            {preview.kind === "tree" ? (
                              <TrailPreviewTreeSprite
                                x={preview.x}
                                y={preview.y}
                                size={preview.size}
                                tier={preview.tier}
                                importance={preview.importance}
                                rank={preview.rank}
                                rarity={preview.rarity}
                                leafVariant={preview.leafVariant}
                                accentColor={preview.accentColor}
                                claimed={preview.claimed}
                              />
                            ) : preview.assetSrc ? (
                              <image
                                href={preview.assetSrc}
                                x={preview.x - preview.width / 2}
                                y={
                                  preview.baseAligned
                                    ? preview.y - preview.height
                                    : preview.y - preview.height / 2
                                }
                                width={preview.width}
                                height={preview.height}
                                preserveAspectRatio={
                                  preview.baseAligned ? "xMidYMax meet" : "xMidYMid meet"
                                }
                                opacity="0.9"
                              />
                            ) : (
                              <circle
                                cx={preview.x}
                                cy={preview.y}
                                r={12}
                                fill="rgba(15,23,42,0.12)"
                                stroke="rgba(15,23,42,0.38)"
                                strokeWidth={1.4}
                              />
                            )}
                          </g>
                        ))
                      : null}

                    <path
                      d={pathD}
                      fill="none"
                      stroke="rgba(53, 72, 41, 0.18)"
                      strokeWidth={20}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#f8e9bb"
                      strokeWidth={12}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d={pathD}
                      fill="none"
                      stroke="rgba(146, 114, 44, 0.32)"
                      strokeWidth={1.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {showSamplePoints
                      ? slotsPreview.map((slot) => (
                          <g key={`slot-${slot.day}`}>
                            <circle
                              cx={slot.x}
                              cy={slot.y}
                              r={slot.day === 1 || slot.day === 365 ? 5.2 : 3.6}
                              fill="rgba(21, 75, 124, 0.78)"
                            />
                            {showNormals ? (
                              <line
                                x1={slot.x}
                                y1={slot.y}
                                x2={slot.x + slot.normalX * 22}
                                y2={slot.y + slot.normalY * 22}
                                stroke="rgba(187, 39, 73, 0.68)"
                                strokeWidth={1.8}
                              />
                            ) : null}
                          </g>
                        ))
                      : null}

                    {activeTab === "demo"
                      ? [...demoBasePlacements, ...demoFlowerPlacements].map((item) => (
                          <image
                            key={item.id}
                            href={item.assetSrc}
                            x={item.x - item.width / 2}
                            y={item.y - item.height}
                            width={item.width}
                            height={item.height}
                            preserveAspectRatio="xMidYMax meet"
                            opacity="0.98"
                          />
                        ))
                      : null}

                    {activeTab === "demo"
                      ? demoTreePlacements.map((item) => (
                          <TrailPreviewTreeSprite
                            key={item.id}
                            x={item.x}
                            y={item.y}
                            size={item.size}
                            tier={item.tier}
                            importance={item.importance}
                            rank={item.rank}
                            rarity={item.rarity}
                            leafVariant={item.leafVariant}
                            accentColor={item.accentColor}
                            claimed={item.claimed}
                          />
                        ))
                      : null}

                    {segments.map((segment, index) => {
                      const selectedOutgoing =
                        selectedHandle === `control-start:${index}`;
                      const selectedIncoming =
                        selectedHandle === `control-end:${index}`;
                      const selectedAnchorStart =
                        selectedHandle === `anchor:${index}`;
                      const selectedAnchorEnd =
                        selectedHandle === `anchor:${index + 1}`;

                      return (
                        <g key={`segment-${index}`}>
                          {showControlLines ? (
                            <>
                              <line
                                x1={segment.start.x}
                                y1={segment.start.y}
                                x2={segment.controlStart.x}
                                y2={segment.controlStart.y}
                                stroke={
                                  selectedOutgoing
                                    ? "#ef4444"
                                    : "rgba(71, 85, 105, 0.48)"
                                }
                                strokeDasharray="4 4"
                              />
                              <line
                                x1={segment.end.x}
                                y1={segment.end.y}
                                x2={segment.controlEnd.x}
                                y2={segment.controlEnd.y}
                                stroke={
                                  selectedIncoming
                                    ? "#ef4444"
                                    : "rgba(71, 85, 105, 0.48)"
                                }
                                strokeDasharray="4 4"
                              />
                              <circle
                                cx={segment.controlStart.x}
                                cy={segment.controlStart.y}
                                r={selectedOutgoing ? 6 : 4.8}
                                fill={selectedOutgoing ? "#ef4444" : "#f59e0b"}
                                stroke="white"
                                strokeWidth={2}
                                onPointerDown={(event) =>
                                  startHandleDrag("control-start", index, event)
                                }
                              />
                              <circle
                                cx={segment.controlEnd.x}
                                cy={segment.controlEnd.y}
                                r={selectedIncoming ? 6 : 4.8}
                                fill={selectedIncoming ? "#ef4444" : "#f59e0b"}
                                stroke="white"
                                strokeWidth={2}
                                onPointerDown={(event) =>
                                  startHandleDrag("control-end", index, event)
                                }
                              />
                            </>
                          ) : null}

                          <circle
                            cx={segment.start.x}
                            cy={segment.start.y}
                            r={selectedAnchorStart ? 7 : 5.8}
                            fill={selectedAnchorStart ? "#0f766e" : "#0ea5e9"}
                            stroke="white"
                            strokeWidth={2.2}
                            onPointerDown={(event) =>
                              startHandleDrag("anchor", index, event)
                            }
                          />

                          {index === segments.length - 1 ? (
                            <circle
                              cx={segment.end.x}
                              cy={segment.end.y}
                              r={selectedAnchorEnd ? 7 : 5.8}
                              fill={selectedAnchorEnd ? "#0f766e" : "#0ea5e9"}
                              stroke="white"
                              strokeWidth={2.2}
                              onPointerDown={(event) =>
                                startHandleDrag("anchor", index + 1, event)
                              }
                            />
                          ) : null}
                        </g>
                      );
                    })}

                    {activeTab === "summit" ? (
                      <g>
                        {summitTreePreviewAsset ? (
                          <image
                            href={summitTreePreviewAsset}
                            x={summitLayout.tree.x - 72}
                            y={summitLayout.tree.y - 122}
                            width={144}
                            height={144}
                            preserveAspectRatio="xMidYMax meet"
                            opacity="0.96"
                          />
                        ) : null}
                        <line
                          x1={summitLayout.label.x}
                          y1={summitLayout.label.y}
                          x2={summitLayout.tree.x}
                          y2={summitLayout.tree.y}
                          stroke="rgba(126, 76, 149, 0.38)"
                          strokeDasharray="6 5"
                        />
                        <line
                          x1={summitLayout.tree.x}
                          y1={summitLayout.tree.y}
                          x2={summitLayout.status.x}
                          y2={summitLayout.status.y}
                          stroke="rgba(126, 76, 149, 0.38)"
                          strokeDasharray="6 5"
                        />
                        <circle
                          cx={summitLayout.label.x}
                          cy={summitLayout.label.y}
                          r={7}
                          fill="#7c3aed"
                          stroke="white"
                          strokeWidth={2.2}
                          onPointerDown={(event) => startSummitDrag("label", event)}
                        />
                        <circle
                          cx={summitLayout.tree.x}
                          cy={summitLayout.tree.y}
                          r={8}
                          fill="#16a34a"
                          stroke="white"
                          strokeWidth={2.2}
                          onPointerDown={(event) => startSummitDrag("tree", event)}
                        />
                        <circle
                          cx={summitLayout.status.x}
                          cy={summitLayout.status.y}
                          r={7}
                          fill="#db2777"
                          stroke="white"
                          strokeWidth={2.2}
                          onPointerDown={(event) => startSummitDrag("status", event)}
                        />
                        <text
                          x={summitLayout.label.x + 10}
                          y={summitLayout.label.y - 10}
                          fontSize="12"
                          fill="#5b3d73"
                        >
                          Etiqueta cima
                        </text>
                        <text
                          x={summitLayout.tree.x + 10}
                          y={summitLayout.tree.y - 10}
                          fontSize="12"
                          fill="#365f2a"
                        >
                          Arbol anual
                        </text>
                        <text
                          x={summitLayout.status.x + 10}
                          y={summitLayout.status.y - 10}
                          fontSize="12"
                          fill="#8e1b57"
                        >
                          Estado anual
                        </text>
                      </g>
                    ) : null}
                    {activeTab === "demo" && summitTreePreviewAsset ? (
                      <image
                        href={summitTreePreviewAsset}
                        x={summitLayout.tree.x - 72}
                        y={summitLayout.tree.y - 122}
                        width={144}
                        height={144}
                        preserveAspectRatio="xMidYMax meet"
                        opacity="0.96"
                      />
                    ) : null}
                  </svg>
                </div>
              </div>
            </div>
          </section>

          {activeTabConfig ? (
          <TrailFloatingPanel
            title={activeTabLabel}
            description={activeTabDescription}
            className="right-4 top-[108px] w-[380px] max-h-[calc(100%-7.5rem)]"
            style={{
              transform: `translate(${overlayOffsets.inspector.x}px, ${overlayOffsets.inspector.y}px)`,
            }}
            onHeaderPointerDown={(event) => startOverlayDrag("inspector", event)}
          >
            <div className="space-y-4">
            {activeTab === "canvas" ? (
            <div className="rounded-3xl border bg-white p-4 shadow-sm">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Lienzo base
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-2xl border px-4 py-2 text-sm disabled:opacity-60"
                  onClick={() => openImageUploadPicker({ kind: "background" })}
                  disabled={uploadingImage}
                >
                  {uploadingBackground ? "Subiendo fondo..." : "Subir fondo"}
                </button>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3">
                <div>
                  <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                    Fondo actual
                  </div>
                  <div
                    className="min-h-[42px] rounded-2xl border bg-[#fbfcfa] px-3 py-2 text-sm text-slate-700"
                    title={backgroundAsset.trim() || undefined}
                  >
                    {backgroundAsset.trim() ? (
                      <>
                        <div className="font-medium text-slate-900">{backgroundAssetLabel}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          La imagen se estira para ocupar todo el lienzo base.
                        </div>
                      </>
                    ) : (
                      "Sin fondo subido todavia."
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 rounded-2xl border bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-600">
                En `hill` inmersivo la escena ya llena la pantalla automaticamente.
                No necesitas tocar tamano base ni anchos legacy para que el fondo ocupe el viewport.
              </div>
              {imageNaturalSize ? (
                <div className="mt-3 rounded-2xl border bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  Imagen real:{" "}
                  <strong className="text-slate-950">
                    {imageNaturalSize.width} x {imageNaturalSize.height}
                  </strong>
                </div>
              ) : null}
              <details className="mt-3 rounded-2xl border bg-[#fbfcfa] px-3 py-3 text-sm text-slate-700">
                <summary className="cursor-pointer select-none font-medium text-slate-900">
                  Ajuste experto del lienzo
                </summary>
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label>
                      <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                        Ancho base
                      </div>
                      <input
                        type="number"
                        min={100}
                        className="w-full rounded-2xl border px-3 py-2 text-sm"
                        value={canvasWidth}
                        onChange={(event) =>
                          resizeCanvas(Number(event.target.value) || 100, canvasHeight)
                        }
                      />
                    </label>
                    <label>
                      <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                        Alto base
                      </div>
                      <input
                        type="number"
                        min={100}
                        className="w-full rounded-2xl border px-3 py-2 text-sm"
                        value={canvasHeight}
                        onChange={(event) =>
                          resizeCanvas(canvasWidth, Number(event.target.value) || 100)
                        }
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-2xl border px-4 py-2 text-sm disabled:opacity-60"
                      onClick={() => {
                        if (!imageNaturalSize) return;
                        resizeCanvas(imageNaturalSize.width, imageNaturalSize.height);
                        setStatus("Lienzo ajustado al tamano real de la imagen.");
                      }}
                      disabled={!imageNaturalSize}
                    >
                      Ajustar a imagen real
                    </button>
                  </div>
                  <div className="rounded-2xl border bg-white px-3 py-2 text-xs leading-6 text-slate-600">
                    Solo toca esto si quieres cambiar deliberadamente el sistema interno de coordenadas
                    del sendero. No hace falta para que la escena inmersiva ocupe toda la pantalla.
                  </div>
                </div>
              </details>
              {false ? (
                <>
              <div className="mt-4 grid gap-2">
                <div className="rounded-2xl border bg-[#fbfcfa] px-3 py-2 text-sm text-slate-600">
                  Persistencia global:{" "}
                  <strong className="text-slate-950">
                    {loadingPersisted ? "Cargando..." : "Lista"}
                  </strong>
                </div>
                <div className="rounded-2xl border bg-[#fbfcfa] px-3 py-2 text-sm text-slate-600">
                  Recorrido:{" "}
                  <strong className="text-slate-950">
                    {segments.length} segmentos · {model.anchors.length} puntos
                  </strong>
                </div>
                <div className="rounded-2xl border bg-[#fbfcfa] px-3 py-2 text-sm text-slate-600">
                  Slots generados: <strong className="text-slate-950">{slots365.length}</strong>
                </div>
                <div className="rounded-2xl border bg-[#fbfcfa] px-3 py-2 text-sm text-slate-600">
                  Modo activo: <strong className="text-slate-950">{activeTabLabel}</strong>
                </div>
              </div>
              <details className="mt-4 rounded-2xl border bg-[#fbfcfa] px-3 py-3 text-sm text-slate-700">
                <summary className="cursor-pointer select-none font-medium text-slate-900">
                  Avanzado
                </summary>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-2xl border px-4 py-2 text-sm disabled:opacity-60"
                    onClick={() => void handleRemoveBackground()}
                    disabled={!backgroundAsset.trim() || uploadingImage}
                  >
                    Quitar fondo
                  </button>
                  <button
                    type="button"
                    className="rounded-2xl border px-4 py-2 text-sm disabled:opacity-60"
                    onClick={() => {
                      if (!imageNaturalSize) return;
                      resizeCanvas(imageNaturalSize!.width, imageNaturalSize!.height);
                      setStatus("Lienzo ajustado al tamano real de la imagen.");
                    }}
                    disabled={!imageNaturalSize}
                  >
                    Ajustar lienzo a imagen
                  </button>
                  <button
                    type="button"
                    className="rounded-2xl border px-4 py-2 text-sm"
                    onClick={resetEditorView}
                  >
                    Reset vista
                  </button>
                </div>
                {imageNaturalSize ? (
                  <div className="mt-3 rounded-2xl border bg-white px-3 py-2 text-sm text-slate-600">
                    Imagen real:{" "}
                    <strong className="text-slate-950">
                      {imageNaturalSize!.width} x {imageNaturalSize!.height}
                    </strong>
                  </div>
                ) : null}
              </details>
              {selectedAnchor ? (
                <div className="mt-4 rounded-2xl border bg-slate-50 px-3 py-2 text-sm">
                  Punto seleccionado: <strong>#{(selectedAnchorIndex ?? 0) + 1}</strong>
                  <div className="mt-1 text-xs opacity-70">
                    x={Math.round(selectedAnchor!.x)} y={Math.round(selectedAnchor!.y)}
                  </div>
                </div>
              ) : null}
              {status ? (
                <div className="mt-4 rounded-2xl border bg-white px-3 py-3 text-sm leading-6 text-slate-700">
                  {status}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border bg-white px-3 py-3 text-sm leading-6 text-slate-600">
                  Selecciona una capa y ajusta el sendero sin salir del preview global.
                </div>
              )}
                </>
              ) : null}
            </div>
            ) : null}

            {activeTab === "path" ? (
              <>
                <div className="rounded-3xl border bg-white p-4 shadow-sm">
                  <div className="mb-3 text-sm font-medium">Lectura del trazado</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={`rounded-2xl border px-3 py-2 text-sm ${
                        showControlLines ? "border-[#94b38c] bg-[#eef8e8] text-[#496445]" : ""
                      }`}
                      onClick={() => setShowControlLines((prev) => !prev)}
                    >
                      Curvatura avanzada: {showControlLines ? "ON" : "OFF"}
                    </button>
                    <button
                      type="button"
                      className={`rounded-2xl border px-3 py-2 text-sm ${
                        showSamplePoints ? "border-[#94b38c] bg-[#eef8e8] text-[#496445]" : ""
                      }`}
                      onClick={() => setShowSamplePoints((prev) => !prev)}
                    >
                      Muestras: {showSamplePoints ? "ON" : "OFF"}
                    </button>
                    <button
                      type="button"
                      className={`rounded-2xl border px-3 py-2 text-sm disabled:opacity-50 ${
                        showNormals ? "border-[#94b38c] bg-[#eef8e8] text-[#496445]" : ""
                      }`}
                      onClick={() => setShowNormals((prev) => !prev)}
                      disabled={!showSamplePoints}
                    >
                      Normales: {showNormals ? "ON" : "OFF"}
                    </button>
                    <label className="flex items-center gap-2 rounded-2xl border bg-white px-3 py-2 text-sm text-slate-700">
                      <span className="text-xs uppercase tracking-[0.12em] text-slate-500">
                        Paso preview
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        className="w-20 rounded-xl border px-2 py-1 text-sm"
                        value={sampleStep}
                        onChange={(event) =>
                          setSampleStep(clamp(Number(event.target.value) || 1, 1, 365))
                        }
                      />
                    </label>
                  </div>
                  <div className="mt-3 rounded-2xl border bg-slate-50 px-3 py-2 text-xs leading-6 text-slate-600">
                    Activa las guias para afinar curvas Bezier, revisar densidad de slots y ver
                    la direccion del sendero directamente sobre la colina.
                  </div>
                </div>

                <div className="rounded-3xl border bg-white p-4 shadow-sm">
                  <div className="mb-2 text-sm font-medium">Puntos de giro</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-2xl border px-3 py-2 text-sm disabled:opacity-50"
                      onClick={handleInsertAnchorAfterSelected}
                      disabled={
                        selectedAnchorIndex === null ||
                        selectedAnchorIndex >= model.anchors.length - 1
                      }
                    >
                      Insertar despues
                    </button>
                    <button
                      type="button"
                      className="rounded-2xl border px-3 py-2 text-sm disabled:opacity-50"
                      onClick={handleDeleteSelectedAnchor}
                      disabled={
                        selectedAnchorIndex === null ||
                        selectedAnchorIndex <= 0 ||
                        selectedAnchorIndex >= model.anchors.length - 1
                      }
                    >
                      Borrar seleccionado
                    </button>
                    <button
                      type="button"
                      className="rounded-2xl border px-3 py-2 text-sm disabled:opacity-50"
                      onClick={() => {
                        if (selectedAnchorIndex === null) return;
                        setSelectedHandle(`anchor:${Math.max(0, selectedAnchorIndex - 1)}`);
                      }}
                      disabled={selectedAnchorIndex === null || selectedAnchorIndex <= 0}
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      className="rounded-2xl border px-3 py-2 text-sm disabled:opacity-50"
                      onClick={() => {
                        if (selectedAnchorIndex === null) return;
                        setSelectedHandle(
                          `anchor:${Math.min(model.anchors.length - 1, selectedAnchorIndex + 1)}`,
                        );
                      }}
                      disabled={
                        selectedAnchorIndex === null ||
                        selectedAnchorIndex >= model.anchors.length - 1
                      }
                    >
                      Siguiente
                    </button>
                  </div>
                  <div className="mt-3 grid max-h-[220px] grid-cols-2 gap-2 overflow-auto">
                    {model.anchors.map((anchor, index) => (
                      <button
                        key={`anchor-list-${index}`}
                        type="button"
                        className={`rounded-2xl border px-3 py-2 text-left text-xs ${
                          selectedAnchorIndex === index ? "bg-[#eaf7ff]" : "bg-white"
                        }`}
                        onClick={() => setSelectedHandle(`anchor:${index}`)}
                      >
                        <div className="font-medium">Punto {index + 1}</div>
                        <div className="opacity-70">
                          {Math.round(anchor.x)}, {Math.round(anchor.y)}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 rounded-2xl border bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {selectedAnchor ? (
                      <>
                        Punto seleccionado: <strong>#{(selectedAnchorIndex ?? 0) + 1}</strong>
                        <div className="mt-1 text-xs text-slate-500">
                          x={Math.round(selectedAnchor.x)} y={Math.round(selectedAnchor.y)}
                        </div>
                      </>
                    ) : (
                      <>
                        Selecciona un punto del sendero para moverlo o insertar uno nuevo
                        despues.
                      </>
                    )}
                  </div>
                </div>

                <details className="rounded-3xl border bg-white p-4 shadow-sm">
                  <summary className="cursor-pointer select-none text-sm font-medium text-slate-900">
                    Avanzado: path SVG
                  </summary>
                  <div className="mt-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="text-sm text-slate-600">
                        Usa este bloque solo si necesitas un ajuste tecnico fino del trazado.
                      </div>
                      <button
                        type="button"
                        className="rounded-2xl border px-3 py-1.5 text-sm"
                        onClick={() => void handleCopy("Path", pathD)}
                      >
                        Copiar
                      </button>
                    </div>
                    <textarea
                      className="min-h-[160px] w-full rounded-2xl border p-3 font-mono text-xs"
                      value={pathDraft}
                      onChange={(event) => setPathDraft(event.target.value)}
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        className="rounded-2xl border px-3 py-2 text-sm"
                        onClick={handleApplyPathDraft}
                      >
                        Aplicar path pegado
                      </button>
                    </div>
                  </div>
                </details>
              </>
            ) : null}

            {activeTab === "view" ? (
              <div className="rounded-3xl border bg-white p-4 shadow-sm">
                <div className="mb-3 text-sm font-medium">Vista en Home</div>
                <div className="rounded-2xl border bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-600">
                  Esta pestana ya no gobierna el tamano del lienzo ni la imagen base.
                  El editor replica la escena real; los anchos responsive del shell quedan
                  en `Avanzado`.
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[160px_minmax(0,1fr)]">
                  <label>
                    <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                      Fondo escena
                    </div>
                    <select
                      className="w-full rounded-2xl border px-3 py-2 text-sm"
                      value={sceneBackgroundMode}
                      onChange={(event) =>
                        setSceneBackgroundMode(
                          event.target.value as HomeTrailRuntimeConfig["sceneBackgroundMode"],
                        )
                      }
                    >
                      <option value="season_gradient">Gradiente estacional</option>
                      <option value="solid">Color solido</option>
                      <option value="none">Sin fondo</option>
                    </select>
                  </label>
                  <label>
                    <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                      Color solido
                    </div>
                    <input
                      className="w-full rounded-2xl border px-3 py-2 text-sm"
                      value={sceneBackgroundSolid}
                      onChange={(event) => setSceneBackgroundSolid(event.target.value)}
                    />
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className={`rounded-2xl border px-3 py-2 text-sm ${
                      showSeasonBandLabels ? "bg-slate-100" : ""
                    }`}
                    onClick={() => setShowSeasonBandLabels((prev) => !prev)}
                  >
                    Etiquetas estaciones: {showSeasonBandLabels ? "ON" : "OFF"}
                  </button>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Recomendacion: con imagen real, deja las etiquetas de estaciones en OFF y usa el gradiente estacional.
                </p>
              </div>
            ) : null}

            {activeTab === "summit" ? (
              <div className="rounded-3xl border bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">Cima anual</div>
                  <button
                    type="button"
                    className="rounded-2xl border px-3 py-2 text-sm"
                    onClick={() => {
                      const geometry = resolveTrailGeometry({
                        canvasWidth,
                        canvasHeight,
                        pathD,
                      });
                      setSummitLayout({
                        label: {
                          x: geometry.summitPoint.x,
                          y: geometry.summitLabelY,
                        },
                        tree: {
                          x: geometry.summitPoint.x,
                          y: geometry.summitPoint.y + 18,
                        },
                        status: {
                          x: geometry.summitPoint.x,
                          y: geometry.summitPoint.y + 88,
                        },
                      });
                    }}
                  >
                    Recolocar auto
                  </button>
                </div>
                <label className="block">
                  <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                    Texto de cima
                  </div>
                  <input
                    className="w-full rounded-2xl border px-3 py-2 text-sm"
                    value={summitLabelText}
                    onChange={(event) => setSummitLabelText(event.target.value)}
                  />
                </label>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label>
                    <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                      Etiqueta X
                    </div>
                    <input
                      type="number"
                      className="w-full rounded-2xl border px-3 py-2 text-sm"
                      value={Math.round(summitLayout.label.x)}
                      onChange={(event) =>
                        setSummitLayout((prev) => ({
                          ...prev,
                          label: { ...prev.label, x: Number(event.target.value) || 0 },
                        }))
                      }
                    />
                  </label>
                  <label>
                    <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                      Etiqueta Y
                    </div>
                    <input
                      type="number"
                      className="w-full rounded-2xl border px-3 py-2 text-sm"
                      value={Math.round(summitLayout.label.y)}
                      onChange={(event) =>
                        setSummitLayout((prev) => ({
                          ...prev,
                          label: { ...prev.label, y: Number(event.target.value) || 0 },
                        }))
                      }
                    />
                  </label>
                  <label>
                    <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                      Arbol X
                    </div>
                    <input
                      type="number"
                      className="w-full rounded-2xl border px-3 py-2 text-sm"
                      value={Math.round(summitLayout.tree.x)}
                      onChange={(event) =>
                        setSummitLayout((prev) => ({
                          ...prev,
                          tree: { ...prev.tree, x: Number(event.target.value) || 0 },
                        }))
                      }
                    />
                  </label>
                  <label>
                    <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                      Arbol Y
                    </div>
                    <input
                      type="number"
                      className="w-full rounded-2xl border px-3 py-2 text-sm"
                      value={Math.round(summitLayout.tree.y)}
                      onChange={(event) =>
                        setSummitLayout((prev) => ({
                          ...prev,
                          tree: { ...prev.tree, y: Number(event.target.value) || 0 },
                        }))
                      }
                    />
                  </label>
                  <label>
                    <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                      Estado X
                    </div>
                    <input
                      type="number"
                      className="w-full rounded-2xl border px-3 py-2 text-sm"
                      value={Math.round(summitLayout.status.x)}
                      onChange={(event) =>
                        setSummitLayout((prev) => ({
                          ...prev,
                          status: { ...prev.status, x: Number(event.target.value) || 0 },
                        }))
                      }
                    />
                  </label>
                  <label>
                    <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                      Estado Y
                    </div>
                    <input
                      type="number"
                      className="w-full rounded-2xl border px-3 py-2 text-sm"
                      value={Math.round(summitLayout.status.y)}
                      onChange={(event) =>
                        setSummitLayout((prev) => ({
                          ...prev,
                          status: { ...prev.status, y: Number(event.target.value) || 0 },
                        }))
                      }
                    />
                  </label>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Tambien puedes mover los tres handles directamente sobre la colina.
                </p>
                <div className="mt-3 rounded-2xl border bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <div>Etiqueta: x={Math.round(summitLayout.label.x)} y={Math.round(summitLayout.label.y)}</div>
                  <div>Arbol: x={Math.round(summitLayout.tree.x)} y={Math.round(summitLayout.tree.y)}</div>
                  <div>Estado: x={Math.round(summitLayout.status.x)} y={Math.round(summitLayout.status.y)}</div>
                </div>
              </div>
            ) : null}

            {activeTab === "regions" ? (
              <>
                <div className="rounded-3xl border bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">Regiones semanticas</div>
                    <div className="rounded-2xl border bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                      Modo:{" "}
                      <strong>
                        {regionEditorMode === "draw_polygon"
                          ? "Dibujar poligono"
                          : regionEditorMode === "add_anchor"
                            ? "Anadir anchor"
                            : "Seleccion"}
                      </strong>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-2xl border px-3 py-2 text-sm"
                      onClick={handleCreateRegion}
                    >
                      Nueva region
                    </button>
                    <button
                      type="button"
                      className={`rounded-2xl border px-3 py-2 text-sm ${
                        regionEditorMode === "draw_polygon" ? "bg-slate-100" : ""
                      }`}
                      onClick={() => {
                        if (!selectedRegion) return;
                        setRegionEditorMode("draw_polygon");
                        setStatus("Haz clic sobre el lienzo para seguir dibujando vertices.");
                      }}
                      disabled={!selectedRegion}
                    >
                      Dibujar zona
                    </button>
                    <button
                      type="button"
                      className={`rounded-2xl border px-3 py-2 text-sm ${
                        regionEditorMode === "add_anchor" ? "bg-slate-100" : ""
                      }`}
                      onClick={() => {
                        if (!selectedRegion) return;
                        setRegionEditorMode("add_anchor");
                        setStatus("Haz clic dentro del lienzo para colocar un anchor.");
                      }}
                      disabled={!selectedRegion}
                    >
                      Anadir anchor
                    </button>
                    <details className="rounded-2xl border bg-white px-3 py-2 text-sm text-slate-700">
                      <summary className="cursor-pointer select-none">Mas acciones</summary>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-2xl border px-3 py-2 text-sm disabled:opacity-50"
                          onClick={handleCloseSelectedRegion}
                          disabled={!selectedRegion || selectedRegion.points.length < 3}
                        >
                          Cerrar poligono
                        </button>
                        <button
                          type="button"
                          className="rounded-2xl border px-3 py-2 text-sm disabled:opacity-50"
                          onClick={handleDeleteSelectedRegionVertex}
                          disabled={!selectedRegion || selectedRegionVertexIndex == null}
                        >
                          Eliminar vertice
                        </button>
                        <button
                          type="button"
                          className="rounded-2xl border px-3 py-2 text-sm disabled:opacity-50"
                          onClick={handleDeleteSelectedRegionAnchor}
                          disabled={!selectedRegion || !selectedRegionAnchorId}
                        >
                          Eliminar anchor
                        </button>
                        <button
                          type="button"
                          className="rounded-2xl border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-50"
                          onClick={handleDeleteSelectedRegion}
                          disabled={!selectedRegion}
                        >
                          Eliminar region
                        </button>
                      </div>
                    </details>
                  </div>
                  <div className="mt-3 rounded-2xl border bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    Clic para crear vertices. Arrastra vertices y anchors directamente sobre
                    la imagen. Usa estas regiones para hitos, flores, personajes, objetos o
                    zonas permitidas/prohibidas sin alterar la imagen base.
                  </div>
                </div>

                <div className="rounded-3xl border bg-white p-4 shadow-sm">
                  <div className="mb-3 text-sm font-medium">Lista de regiones</div>
                  <div className="grid max-h-[260px] grid-cols-1 gap-2 overflow-auto">
                    {regions.map((region) => {
                      const isSelected = region.id === selectedRegionId;
                      return (
                        <button
                          key={region.id}
                          type="button"
                          className={`rounded-2xl border px-3 py-3 text-left text-sm ${
                            isSelected ? "border-slate-900 bg-slate-50" : "bg-white"
                          }`}
                          onClick={() => {
                            setSelectedRegionId(region.id);
                            setSelectedRegionVertexIndex(null);
                            setSelectedRegionAnchorId(null);
                            setRegionEditorMode("select");
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium">{region.name}</div>
                            <div
                              className={`rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] ${
                                region.enabled ? "bg-white" : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              {region.enabled ? "Activa" : "OFF"}
                            </div>
                          </div>
                          <div className="mt-1 text-xs text-slate-600">
                            {regionKindLabel(region.kind)} · {regionPlacementLabel(region.placementMode)}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {region.points.length} vertices · {region.anchors.length} anchors
                            {region.capacity ? ` · cap ${region.capacity}` : " · sin limite"}
                          </div>
                        </button>
                      );
                    })}
                    {regions.length === 0 ? (
                      <div className="rounded-2xl border border-dashed p-4 text-sm text-slate-500">
                        Aun no hay regiones. Crea una y empieza a marcar zonas sobre la colina.
                      </div>
                    ) : null}
                  </div>
                </div>

                {selectedRegion ? (
                  <>
                    <div className="rounded-3xl border bg-white p-4 shadow-sm">
                      <div className="mb-3 text-sm font-medium">Region seleccionada</div>
                      <div className="mb-3 rounded-2xl border bg-slate-50 px-3 py-3 text-sm text-slate-700">
                        <div className="font-medium">{regionKindLabel(selectedRegion.kind)}</div>
                        <div className="mt-1">{regionKindDescription(selectedRegion.kind)}</div>
                        <div className="mt-2 rounded-2xl border bg-white px-3 py-2 text-xs text-slate-600">
                          <strong>{regionPlacementLabel(selectedRegion.placementMode)}:</strong>{" "}
                          {regionPlacementDescription(selectedRegion.placementMode)}
                        </div>
                        {regionPlacementHint(selectedRegion) ? (
                          <div className="mt-2 text-xs text-slate-500">
                            {regionPlacementHint(selectedRegion)}
                          </div>
                        ) : null}
                      </div>
                      <div className="mb-4">
                        <div className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                          Presets rapidos
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded-2xl border px-3 py-2 text-sm"
                            onClick={() => applyRegionPreset(selectedRegion.id, "milestone_exact")}
                          >
                            Hito exacto
                          </button>
                          <button
                            type="button"
                            className="rounded-2xl border px-3 py-2 text-sm"
                            onClick={() => applyRegionPreset(selectedRegion.id, "milestone_zone")}
                          >
                            Hito por zona
                          </button>
                          <button
                            type="button"
                            className="rounded-2xl border px-3 py-2 text-sm"
                            onClick={() => applyRegionPreset(selectedRegion.id, "flowers_scattered")}
                          >
                            Flores dispersas
                          </button>
                          <button
                            type="button"
                            className="rounded-2xl border px-3 py-2 text-sm"
                            onClick={() => applyRegionPreset(selectedRegion.id, "forbidden_zone")}
                          >
                            Zona bloqueada
                          </button>
                        </div>
                      </div>
                      <div className="mb-4 rounded-2xl border bg-slate-50 p-3">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-[140px_1fr]">
                          <label>
                            <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                              Preview items
                            </div>
                            <input
                              type="number"
                              min={1}
                              max={10}
                              className="w-full rounded-2xl border px-3 py-2 text-sm"
                              value={regionPreviewCount}
                              onChange={(event) =>
                                setRegionPreviewCount(
                                  clamp(Number(event.target.value) || 1, 1, 10),
                                )
                              }
                            />
                          </label>
                          <div className="text-sm text-slate-600">
                            Veras assets de prueba dentro de la zona segun el modo actual.
                            Si la region tiene capacidad fija, la preview respetara ese limite.
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <label>
                          <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                            Nombre
                          </div>
                          <input
                            className="w-full rounded-2xl border px-3 py-2 text-sm"
                            value={selectedRegion.name}
                            onChange={(event) =>
                              updateRegion(selectedRegion.id, (region) => ({
                                ...region,
                                name: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <label>
                            <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                              Tipo de region
                            </div>
                            <select
                              className="w-full rounded-2xl border px-3 py-2 text-sm"
                              value={selectedRegion.kind}
                              onChange={(event) =>
                                updateRegion(selectedRegion.id, (region) => ({
                                  ...region,
                                  kind: event.target.value as SceneRegionKind,
                                }))
                              }
                            >
                              {SCENE_REGION_KIND_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <div className="mt-1 text-xs text-slate-500">
                              Define para que sirve esta zona dentro de la colina.
                            </div>
                          </label>
                          <label>
                            <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                              Como se colocan dentro
                            </div>
                            <select
                              className="w-full rounded-2xl border px-3 py-2 text-sm"
                              value={selectedRegion.placementMode}
                              onChange={(event) =>
                                updateRegion(selectedRegion.id, (region) => ({
                                  ...region,
                                  placementMode: event.target.value as SceneRegionPlacementMode,
                                }))
                              }
                            >
                              {SCENE_REGION_PLACEMENT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <div className="mt-1 text-xs text-slate-500">
                              Elige si quieres puntos exactos, centro o reparto automatico.
                            </div>
                          </label>
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-[140px_1fr]">
                          <label>
                            <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                              Capacidad
                            </div>
                            <input
                              type="number"
                              min={1}
                              className="w-full rounded-2xl border px-3 py-2 text-sm"
                              value={selectedRegion.capacity ?? ""}
                              placeholder="Ilimitada"
                              onChange={(event) =>
                                updateRegion(selectedRegion.id, (region) => ({
                                  ...region,
                                  capacity: event.target.value
                                    ? Math.max(1, Number(event.target.value) || 1)
                                    : null,
                                }))
                              }
                            />
                            <div className="mt-1 text-xs text-slate-500">
                              Cuantos elementos maximo puede alojar esta zona.
                            </div>
                          </label>
                          <label className="flex items-end">
                            <button
                              type="button"
                              className={`rounded-2xl border px-3 py-2 text-sm ${
                                selectedRegion.enabled ? "bg-white" : "bg-slate-100"
                              }`}
                              onClick={() =>
                                updateRegion(selectedRegion.id, (region) => ({
                                  ...region,
                                  enabled: !region.enabled,
                                }))
                              }
                            >
                              Region {selectedRegion.enabled ? "activa" : "desactivada"}
                            </button>
                          </label>
                        </div>
                        <details className="rounded-2xl border bg-slate-50 p-3">
                          <summary className="cursor-pointer select-none text-sm font-medium text-slate-900">
                            Avanzado de region
                          </summary>
                          <div className="mt-3 grid grid-cols-1 gap-3">
                            <label>
                              <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                                Tags opcionales
                              </div>
                              <input
                                className="w-full rounded-2xl border px-3 py-2 text-sm"
                                value={regionTagsText(selectedRegion)}
                                placeholder="hito, zona-alta, especial"
                                onChange={(event) =>
                                  updateRegion(selectedRegion.id, (region) => ({
                                    ...region,
                                    metadata: {
                                      ...region.metadata,
                                      tags: parseCommaSeparatedList(event.target.value),
                                    },
                                  }))
                                }
                              />
                            </label>
                            <label>
                              <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                                Allowed kinds opcional
                              </div>
                              <input
                                className="w-full rounded-2xl border px-3 py-2 text-sm"
                                value={regionAllowedKindsText(selectedRegion)}
                                placeholder="tree, flower, object"
                                onChange={(event) =>
                                  updateRegion(selectedRegion.id, (region) => ({
                                    ...region,
                                    metadata: {
                                      ...region.metadata,
                                      allowedKinds: parseCommaSeparatedList(event.target.value),
                                    },
                                  }))
                                }
                              />
                              <div className="mt-1 text-xs text-slate-500">
                                Solo si quieres permitir tipos extra. Para la mayoria de casos puedes ignorarlo.
                              </div>
                            </label>
                            <label>
                              <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                                Notas internas
                              </div>
                              <textarea
                                className="min-h-[90px] w-full rounded-2xl border px-3 py-2 text-sm"
                                value={selectedRegion.metadata.notes ?? ""}
                                placeholder="Uso previsto, prioridad visual, comentario interno..."
                                onChange={(event) =>
                                  updateRegion(selectedRegion.id, (region) => ({
                                    ...region,
                                    metadata: {
                                      ...region.metadata,
                                      notes: event.target.value || null,
                                    },
                                  }))
                                }
                              />
                            </label>
                          </div>
                        </details>
                      </div>
                    </div>

                    <details className="rounded-3xl border bg-white p-4 shadow-sm">
                      <summary className="cursor-pointer select-none text-sm font-medium text-slate-900">
                        Avanzado: vertices y anchors
                      </summary>
                      <div className="mt-3">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div>
                            <div className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                              Vertices
                            </div>
                            <div className="grid max-h-[220px] grid-cols-1 gap-2 overflow-auto">
                              {selectedRegion.points.map((point, index) => (
                                <button
                                  key={`${selectedRegion.id}:vertex:${index}`}
                                  type="button"
                                  className={`rounded-2xl border px-3 py-2 text-left text-xs ${
                                    selectedRegionVertexIndex === index ? "bg-[#eaf7ff]" : "bg-white"
                                  }`}
                                  onClick={() => {
                                    setSelectedRegionVertexIndex(index);
                                    setSelectedRegionAnchorId(null);
                                  }}
                                >
                                  <div className="font-medium">Vertice {index + 1}</div>
                                  <div className="opacity-70">
                                    x={Math.round(point.x)} y={Math.round(point.y)}
                                  </div>
                                </button>
                              ))}
                              {selectedRegion.points.length === 0 ? (
                                <div className="rounded-2xl border border-dashed p-3 text-xs text-slate-500">
                                  Empieza a dibujar el poligono con clics sobre el lienzo.
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <div>
                            <div className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                              Anchors
                            </div>
                            <div className="grid max-h-[220px] grid-cols-1 gap-2 overflow-auto">
                              {selectedRegion.anchors.map((anchor) => (
                                <button
                                  key={anchor.id}
                                  type="button"
                                  className={`rounded-2xl border px-3 py-2 text-left text-xs ${
                                    selectedRegionAnchorId === anchor.id ? "bg-[#f8edff]" : "bg-white"
                                  }`}
                                  onClick={() => {
                                    setSelectedRegionAnchorId(anchor.id);
                                    setSelectedRegionVertexIndex(null);
                                  }}
                                >
                                  <div className="font-medium">{anchor.label}</div>
                                  <div className="opacity-70">
                                    x={Math.round(anchor.x)} y={Math.round(anchor.y)}
                                  </div>
                                </button>
                              ))}
                              {selectedRegion.anchors.length === 0 ? (
                                <div className="rounded-2xl border border-dashed p-3 text-xs text-slate-500">
                                  No hay anchors. Usa &quot;Anadir anchor&quot; para marcar puntos exactos dentro de la zona.
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        {selectedRegionAnchorId ? (
                          <div className="mt-3 rounded-2xl border bg-slate-50 p-3">
                            <div className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                              Anchor seleccionado
                            </div>
                            {(() => {
                              const selectedAnchor =
                                selectedRegion.anchors.find(
                                  (anchor) => anchor.id === selectedRegionAnchorId,
                                ) ?? null;
                              if (!selectedAnchor) return null;
                              return (
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                  <label>
                                    <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                                      Label
                                    </div>
                                    <input
                                      className="w-full rounded-2xl border px-3 py-2 text-sm"
                                      value={selectedAnchor.label}
                                      onChange={(event) =>
                                        updateRegion(selectedRegion.id, (region) => ({
                                          ...region,
                                          anchors: region.anchors.map((anchor) =>
                                            anchor.id === selectedAnchor.id
                                              ? { ...anchor, label: event.target.value }
                                              : anchor,
                                          ),
                                        }))
                                      }
                                    />
                                  </label>
                                  <label>
                                    <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                                      X
                                    </div>
                                    <input
                                      type="number"
                                      className="w-full rounded-2xl border px-3 py-2 text-sm"
                                      value={Math.round(selectedAnchor.x)}
                                      onChange={(event) =>
                                        updateRegion(selectedRegion.id, (region) => ({
                                          ...region,
                                          anchors: region.anchors.map((anchor) =>
                                            anchor.id === selectedAnchor.id
                                              ? {
                                                  ...anchor,
                                                  x: Number(event.target.value) || 0,
                                                }
                                              : anchor,
                                          ),
                                        }))
                                      }
                                    />
                                  </label>
                                  <label>
                                    <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                                      Y
                                    </div>
                                    <input
                                      type="number"
                                      className="w-full rounded-2xl border px-3 py-2 text-sm"
                                      value={Math.round(selectedAnchor.y)}
                                      onChange={(event) =>
                                        updateRegion(selectedRegion.id, (region) => ({
                                          ...region,
                                          anchors: region.anchors.map((anchor) =>
                                            anchor.id === selectedAnchor.id
                                              ? {
                                                  ...anchor,
                                                  y: Number(event.target.value) || 0,
                                                }
                                              : anchor,
                                          ),
                                        }))
                                      }
                                    />
                                  </label>
                                </div>
                              );
                            })()}
                          </div>
                        ) : null}
                      </div>
                    </details>
                  </>
                ) : null}
              </>
            ) : null}

            {activeTab === "assets" ? (
              <>
                <div className="rounded-3xl border bg-white p-4 shadow-sm">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Arbol anual canonico
                  </div>
                  <div className="mt-4 rounded-2xl border bg-[#f8faf6] px-4 py-3 text-sm text-slate-700">
                    `plan-types` gestiona flores y semillas de planes. `progression` gestiona los
                    arboles de hito. Aqui solo vive el arbol anual del sendero.
                  </div>
                </div>

                <div className="rounded-3xl border bg-white p-4 shadow-sm">
                  <div className="mb-3 text-sm font-medium">Arbol anual por fase</div>
                  <div className="grid grid-cols-1 gap-3">
                    {ANNUAL_TREE_PHASES.map((phase) => (
                      <div key={phase} className="rounded-2xl border p-3">
                        <div className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                          {phase}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border bg-[#f8faf6]">
                            {annualTreeAssets[phase] ? (
                              <img src={annualTreeAssets[phase] ?? ""} alt="" className="max-h-12 max-w-12 object-contain" />
                            ) : (
                              <span className="text-[11px] text-slate-400">Sin asset</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{assetFilename(annualTreeAssets[phase])}</div>
                            <div className="text-xs text-slate-500">Preview actual</div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="rounded-2xl border px-3 py-2 text-sm disabled:opacity-60"
                              onClick={() => openImageUploadPicker({ kind: "annual", key: phase })}
                              disabled={uploadingImage}
                            >
                              {uploadingAnnualPhase === phase ? "Subiendo..." : "Subir"}
                            </button>
                            <button
                              type="button"
                              className="rounded-2xl border px-3 py-2 text-sm disabled:opacity-60"
                              onClick={() => setAssetPickerTarget({ kind: "annual", key: phase })}
                              disabled={uploadingImage}
                            >
                              Elegir
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
            {activeTab === "demo" ? (
              <>
                <div className="rounded-3xl border bg-white p-4 shadow-sm">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Lectura conjunta
                  </div>
                  <div className="mt-3 text-sm leading-7 text-slate-700">
                    Esta vista mezcla una muestra de flores de `plan-types`, hitos de
                    `progression`, estados base y el arbol anual para comprobar si todo respira
                    bien en el mismo sendero.
                  </div>
                </div>

                <div className="rounded-3xl border bg-white p-4 shadow-sm">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border bg-[#f8faf6] px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                        Flores demo
                      </div>
                      <div className="mt-2 text-xl font-semibold text-slate-950">
                        {demoFlowerPlacements.length}
                      </div>
                    </div>
                    <div className="rounded-2xl border bg-[#f8faf6] px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                        Hitos demo
                      </div>
                      <div className="mt-2 text-xl font-semibold text-slate-950">
                        {demoTreePlacements.length}
                      </div>
                    </div>
                    <div className="rounded-2xl border bg-[#f8faf6] px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                        Regiones hito
                      </div>
                      <div className="mt-2 text-xl font-semibold text-slate-950">
                        {regions.filter((region) => region.kind === "milestone_tree" && region.enabled).length}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border bg-white p-4 shadow-sm">
                  <div className="mb-3 text-sm font-medium">Fuentes de verdad</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-2xl border px-3 py-2 text-sm"
                      onClick={() => router.push("/admin/plan-types")}
                    >
                      Abrir plan-types
                    </button>
                    <button
                      type="button"
                      className="rounded-2xl border px-3 py-2 text-sm"
                      onClick={() => router.push("/admin/progression")}
                    >
                      Abrir progression
                    </button>
                  </div>
                </div>
              </>
            ) : null}
            </div>
          </TrailFloatingPanel>
          ) : null}
          {showValidationPanel ? (
            <TrailFloatingPanel
              title="Validacion"
              description="Chequeos visuales y estructurales antes de publicar el sendero global."
              className="bottom-4 left-4 w-[380px] max-h-[calc(100%-1rem)]"
              style={{
                transform: `translate(${overlayOffsets.validation.x}px, ${overlayOffsets.validation.y}px)`,
              }}
              onHeaderPointerDown={(event) => startOverlayDrag("validation", event)}
              onClose={() => setShowValidationPanel(false)}
            >
              <div className="space-y-2">
                {validationIssues.length ? (
                  validationIssues.map((issue) => (
                    <button
                      key={issue.id}
                      type="button"
                      onClick={() => {
                        setShowValidationPanel(false);
                        if (issue.targetTab) setActiveTab(issue.targetTab);
                        if (issue.targetRegionId) {
                          setSelectedRegionId(issue.targetRegionId);
                          setSelectedRegionVertexIndex(null);
                          setSelectedRegionAnchorId(null);
                          setRegionEditorMode("select");
                        }
                        if (issue.openAdvanced) setShowAdvancedPanel(true);
                      }}
                      className={`w-full rounded-2xl border px-3 py-3 text-left text-sm ${
                        issue.tone === "error"
                          ? "border-[#ecc1bc] bg-[#fff5f3] text-[#7a3e36]"
                          : issue.tone === "warning"
                            ? "border-[#eadfc1] bg-[#fffaf0] text-[#7a5c18]"
                            : "border-[#d9e4d3] bg-[#fbfcfa] text-slate-700"
                      }`}
                    >
                      <div className="font-medium">{issue.title}</div>
                      <div className="mt-1 text-xs opacity-80">{issue.detail}</div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-[#a7cdb7] bg-[#eef8f1] px-3 py-3 text-sm text-[#2f6d4f]">
                    No hay alertas visibles en este sendero.
                  </div>
                )}
              </div>
            </TrailFloatingPanel>
          ) : null}
          {showAdvancedPanel ? (
            <TrailFloatingPanel
              title="Avanzado"
              description="JSON y exportaciones tecnicas del sendero global."
              className="bottom-4 right-4 w-[420px] max-h-[calc(100%-1rem)]"
              style={{
                transform: `translate(${overlayOffsets.advanced.x}px, ${overlayOffsets.advanced.y}px)`,
              }}
              onHeaderPointerDown={(event) => startOverlayDrag("advanced", event)}
              onClose={() => setShowAdvancedPanel(false)}
            >
              <div className="space-y-4">
                <div>
                  <div className="mb-2 text-sm font-medium">Herramientas de lienzo</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-2xl border px-3 py-1.5 text-sm disabled:opacity-60"
                      onClick={handleResetToPersisted}
                      disabled={loadingPersisted}
                    >
                      Restaurar guardado
                    </button>
                    <button
                      type="button"
                      className="rounded-2xl border px-3 py-1.5 text-sm disabled:opacity-60"
                      onClick={() => void handleRemoveBackground()}
                      disabled={!backgroundAsset.trim() || uploadingImage}
                    >
                      Quitar fondo
                    </button>
                    <button
                      type="button"
                      className="rounded-2xl border px-3 py-1.5 text-sm disabled:opacity-60"
                      onClick={() => {
                        if (!imageNaturalSize) return;
                        resizeCanvas(imageNaturalSize!.width, imageNaturalSize!.height);
                        setStatus("Lienzo ajustado al tamano real de la imagen.");
                      }}
                      disabled={!imageNaturalSize}
                    >
                      Ajustar a imagen
                    </button>
                    <button
                      type="button"
                      className="rounded-2xl border px-3 py-1.5 text-sm"
                      onClick={resetEditorView}
                    >
                      Reset vista
                    </button>
                  </div>
                  {imageNaturalSize ? (
                    <div className="mt-3 rounded-2xl border bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      Imagen real:{" "}
                      <strong className="text-slate-950">
                        {imageNaturalSize!.width} x {imageNaturalSize!.height}
                      </strong>
                    </div>
                  ) : null}
                </div>
                <details className="rounded-2xl border bg-[#fbfcfa] px-3 py-3 text-sm text-slate-700">
                  <summary className="cursor-pointer select-none font-medium text-slate-900">
                    Compatibilidad del home normal
                  </summary>
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <label>
                        <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                          Desktop
                        </div>
                        <input
                          type="number"
                          min={420}
                          className="w-full rounded-2xl border px-3 py-2 text-sm"
                          value={displayDesktopWidth}
                          onChange={(event) =>
                            setDisplayDesktopWidth(Math.max(420, Number(event.target.value) || 420))
                          }
                        />
                      </label>
                      <label>
                        <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                          Tablet
                        </div>
                        <input
                          type="number"
                          min={320}
                          className="w-full rounded-2xl border px-3 py-2 text-sm"
                          value={displayTabletWidth}
                          onChange={(event) =>
                            setDisplayTabletWidth(Math.max(320, Number(event.target.value) || 320))
                          }
                        />
                      </label>
                      <label>
                        <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                          Movil
                        </div>
                        <input
                          type="number"
                          min={260}
                          className="w-full rounded-2xl border px-3 py-2 text-sm"
                          value={displayMobileWidth}
                          onChange={(event) =>
                            setDisplayMobileWidth(Math.max(260, Number(event.target.value) || 260))
                          }
                        />
                      </label>
                    </div>
                    <div className="rounded-2xl border bg-white px-3 py-2 text-xs leading-6 text-slate-600">
                      Esto solo afecta al `home` normal dentro del shell publicado. No cambia el
                      tamano del lienzo, no cambia la imagen base y no controla `immersive=hill`.
                    </div>
                  </div>
                </details>
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">Config JSON</div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-2xl border px-3 py-1.5 text-sm"
                        onClick={() => void handleCopy("Config JSON", exportConfigJson)}
                      >
                        Copiar
                      </button>
                      <button
                        type="button"
                        className="rounded-2xl border px-3 py-1.5 text-sm"
                        onClick={() => downloadTextFile("home-trail-config.json", exportConfigJson)}
                      >
                        Descargar
                      </button>
                    </div>
                  </div>
                  <textarea
                    readOnly
                    className="min-h-[160px] w-full rounded-2xl border bg-slate-50 p-3 font-mono text-xs"
                    value={exportConfigJson}
                  />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">Slots 365 JSON</div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-2xl border px-3 py-1.5 text-sm"
                        onClick={() => void handleCopy("Slots JSON", exportSlotsJson)}
                      >
                        Copiar
                      </button>
                      <button
                        type="button"
                        className="rounded-2xl border px-3 py-1.5 text-sm"
                        onClick={() =>
                          downloadTextFile("home-trail-slots-365.json", exportSlotsJson)
                        }
                      >
                        Descargar
                      </button>
                    </div>
                  </div>
                  <textarea
                    readOnly
                    className="min-h-[220px] w-full rounded-2xl border bg-slate-50 p-3 font-mono text-xs"
                    value={JSON.stringify(slots365.slice(0, 20), null, 2)}
                  />
                  <div className="mt-2 text-xs text-slate-500">
                    Preview mostrando solo los 20 primeros. Los botones exportan los 365 completos.
                  </div>
                </div>
              </div>
            </TrailFloatingPanel>
          ) : null}
        </div>
        {assetPickerTarget ? (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/35 p-4">
            <div className="max-h-[86vh] w-full max-w-[980px] overflow-hidden rounded-[28px] border bg-white shadow-2xl">
              <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
                <div>
                  <div className="text-lg font-semibold">Elegir asset</div>
                  <div className="text-sm text-slate-500">
                    Selecciona una imagen de `public/assets` o sube una nueva al proyecto.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {assetPickerTarget.kind === "annual" ? (
                    <button
                      type="button"
                      className="rounded-2xl border px-3 py-2 text-sm disabled:opacity-60"
                      onClick={() =>
                        openImageUploadPicker({
                          kind: "annual",
                          key: assetPickerTarget.key,
                        })
                      }
                      disabled={uploadingImage}
                    >
                      {uploadingAnnualPhase === assetPickerTarget.key
                        ? "Subiendo..."
                        : "Subir imagen"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="rounded-2xl border px-3 py-2 text-sm"
                    onClick={() => setAssetPickerTarget(null)}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
              <div className="border-b px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    ["recommended", "Recomendados"],
                    ["flowers", "Flores"],
                    ["trees", "Arboles"],
                    ["hill", "Colina"],
                    ["other", "Otros"],
                    ["all", "Todo"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`rounded-2xl border px-3 py-1.5 text-sm ${
                        assetPickerFilter === value ? "bg-slate-100" : ""
                      }`}
                      onClick={() => setAssetPickerFilter(value as AssetPickerFilter)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {filteredPublicAssets.length} asset(s) visibles
                </div>
              </div>
              <div className="grid max-h-[72vh] grid-cols-2 gap-3 overflow-auto p-4 md:grid-cols-4">
                {filteredPublicAssets.map((assetPath) => (
                  <button
                    key={assetPath}
                    type="button"
                    className="rounded-2xl border p-3 text-left transition hover:bg-slate-50"
                    onClick={() => applyPickedAsset(assetPath)}
                  >
                    <div className="flex h-28 items-center justify-center rounded-2xl border bg-[#f8faf6]">
                      <img src={assetPath} alt="" className="max-h-24 max-w-full object-contain" />
                    </div>
                    <div className="mt-2 truncate text-sm font-medium">{assetFilename(assetPath)}</div>
                    <div className="text-xs text-slate-500">
                      {assetCategoryForPath(assetPath)}
                    </div>
                  </button>
                ))}
                {filteredPublicAssets.length === 0 ? (
                  <div className="col-span-full rounded-2xl border border-dashed p-6 text-sm text-slate-500">
                    No hay assets en este filtro. Cambia la categoria o anade nuevos archivos a `public/assets`.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
