import { supabase } from "@/lib/supabase";

export const FLOWER_PAGE_LAYOUT_CATALOG_KEY = "flower_page_surface_layout";
export const FLOWER_PAGE_LAYOUT_VERSION = 4;
export const FLOWER_PAGE_STAGE_WIDTH = 1440;
export const FLOWER_PAGE_STAGE_HEIGHT = 980;
export const FLOWER_PAGE_STAGE_ASPECT_RATIO =
  FLOWER_PAGE_STAGE_WIDTH / FLOWER_PAGE_STAGE_HEIGHT;

const LEGACY_GRID_COLUMNS = 12;
const LEGACY_GRID_ROWS = 18;

export const FLOWER_PAGE_BLOCK_IDS = [
  "back_button",
  "edit_button",
  "date",
  "title",
  "favorite_button",
  "highlight_button",
  "plan_meta_badge",
  "place_type_badge",
  "completion_badge",
  "completion_hint",
  "flower_visual",
  "rating",
  "summary",
  "seed_card",
  "place_card",
  "route_card",
  "audio_card",
] as const;

export type FlowerPageBlockId = (typeof FLOWER_PAGE_BLOCK_IDS)[number];

export type FlowerPageSampleField = "title" | "summary" | null;

export type FlowerPageBlockConfig = {
  id: FlowerPageBlockId;
  label: string;
  description: string;
  enabled: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  minW: number;
  minH: number;
  maxW: number;
  maxH: number;
  movable: boolean;
  resizable: boolean;
  required: boolean;
  maxChars: number | null;
  sampleField: FlowerPageSampleField;
};

export type FlowerPageLayoutConfig = {
  blocks: FlowerPageBlockConfig[];
};

export type FlowerPageLayoutIssue = {
  id: string;
  tone: "error" | "warning" | "info";
  title: string;
  detail: string;
  blockId?: FlowerPageBlockId;
};

type CatalogItemRow = {
  code: string | null;
  label: string | null;
  sort_order: number | null;
  enabled: boolean | null;
  metadata: Record<string, unknown> | null;
};

type FlowerPageBlockPreset = Omit<
  FlowerPageBlockConfig,
  "enabled" | "label" | "description"
> & {
  defaultEnabled: boolean;
  defaultLabel: string;
  defaultDescription: string;
  sortOrder: number;
};

const LEGACY_TOP_ACTIONS_FALLBACK = { x: 0, y: 0, w: 100, h: 10 } as const;
const LEGACY_MEMORY_ACTIONS_FALLBACK = { x: 84, y: 24, w: 16, h: 10 } as const;
const LEGACY_BADGES_FALLBACK = { x: 0, y: 38, w: 56, h: 6 } as const;
const LEGACY_DETAIL_CARDS_FALLBACK = { x: 34, y: 86, w: 66, h: 13 } as const;

const FLOWER_PAGE_BLOCK_PRESETS: FlowerPageBlockPreset[] = [
  {
    id: "back_button",
    defaultEnabled: true,
    defaultLabel: "Volver",
    defaultDescription: "Boton de retorno de la flor.",
    sortOrder: 10,
    x: 0,
    y: 0,
    w: 16,
    h: 8,
    minW: 8,
    minH: 6,
    maxW: 24,
    maxH: 12,
    movable: true,
    resizable: true,
    required: false,
    maxChars: null,
    sampleField: null,
  },
  {
    id: "edit_button",
    defaultEnabled: true,
    defaultLabel: "Editar flor",
    defaultDescription: "Acción principal visible de la flor.",
    sortOrder: 20,
    x: 82,
    y: 0,
    w: 16,
    h: 8,
    minW: 10,
    minH: 6,
    maxW: 24,
    maxH: 10,
    movable: true,
    resizable: true,
    required: false,
    maxChars: null,
    sampleField: null,
  },
  {
    id: "date",
    defaultEnabled: true,
    defaultLabel: "Fecha",
    defaultDescription: "Fecha visible del recuerdo.",
    sortOrder: 30,
    x: 0,
    y: 17,
    w: 20,
    h: 5,
    minW: 12,
    minH: 4,
    maxW: 28,
    maxH: 10,
    movable: true,
    resizable: true,
    required: false,
    maxChars: null,
    sampleField: null,
  },
  {
    id: "title",
    defaultEnabled: true,
    defaultLabel: "Título",
    defaultDescription: "Título principal de la flor.",
    sortOrder: 40,
    x: 0,
    y: 24,
    w: 72,
    h: 13,
    minW: 28,
    minH: 10,
    maxW: 82,
    maxH: 22,
    movable: true,
    resizable: true,
    required: true,
    maxChars: 72,
    sampleField: "title",
  },
  {
    id: "favorite_button",
    defaultEnabled: true,
    defaultLabel: "Favorito",
    defaultDescription: "Boton visible de favorito.",
    sortOrder: 50,
    x: 86,
    y: 24,
    w: 6,
    h: 8,
    minW: 4,
    minH: 6,
    maxW: 10,
    maxH: 12,
    movable: true,
    resizable: true,
    required: false,
    maxChars: null,
    sampleField: null,
  },
  {
    id: "highlight_button",
    defaultEnabled: true,
    defaultLabel: "Destacada",
    defaultDescription: "Boton visible de destacado anual.",
    sortOrder: 60,
    x: 93,
    y: 24,
    w: 6,
    h: 8,
    minW: 4,
    minH: 8,
    maxW: 10,
    maxH: 12,
    movable: true,
    resizable: true,
    required: false,
    maxChars: null,
    sampleField: null,
  },
  {
    id: "plan_meta_badge",
    defaultEnabled: true,
    defaultLabel: "Tipo de plan",
    defaultDescription: "Badge principal con tipo de plan y familia.",
    sortOrder: 70,
    x: 0,
    y: 38,
    w: 22,
    h: 5,
    minW: 12,
    minH: 4,
    maxW: 34,
    maxH: 9,
    movable: true,
    resizable: true,
    required: false,
    maxChars: null,
    sampleField: null,
  },
  {
    id: "place_type_badge",
    defaultEnabled: true,
    defaultLabel: "Tipo de lugar",
    defaultDescription: "Badge secundaria con la clase de lugar.",
    sortOrder: 80,
    x: 24,
    y: 38,
    w: 12,
    h: 5,
    minW: 8,
    minH: 4,
    maxW: 22,
    maxH: 9,
    movable: true,
    resizable: true,
    required: false,
    maxChars: null,
    sampleField: null,
  },
  {
    id: "completion_badge",
    defaultEnabled: true,
    defaultLabel: "Estado de flor",
    defaultDescription: "Badge con el estado narrativo de la flor.",
    sortOrder: 90,
    x: 38,
    y: 38,
    w: 18,
    h: 5,
    minW: 10,
    minH: 4,
    maxW: 28,
    maxH: 9,
    movable: true,
    resizable: true,
    required: false,
    maxChars: null,
    sampleField: null,
  },
  {
    id: "completion_hint",
    defaultEnabled: true,
    defaultLabel: "Pista narrativa",
    defaultDescription: "Hint de estado narrativo del recuerdo.",
    sortOrder: 100,
    x: 0,
    y: 45,
    w: 58,
    h: 7,
    minW: 24,
    minH: 4,
    maxW: 72,
    maxH: 12,
    movable: true,
    resizable: true,
    required: false,
    maxChars: null,
    sampleField: null,
  },
  {
    id: "flower_visual",
    defaultEnabled: true,
    defaultLabel: "Imagen de flor",
    defaultDescription: "Visual principal de la flor.",
    sortOrder: 110,
    x: 0,
    y: 56,
    w: 28,
    h: 28,
    minW: 18,
    minH: 18,
    maxW: 40,
    maxH: 38,
    movable: true,
    resizable: true,
    required: true,
    maxChars: null,
    sampleField: null,
  },
  {
    id: "rating",
    defaultEnabled: true,
    defaultLabel: "Valoracion",
    defaultDescription: "Bloque de valoración visual.",
    sortOrder: 120,
    x: 0,
    y: 86,
    w: 28,
    h: 12,
    minW: 18,
    minH: 8,
    maxW: 38,
    maxH: 18,
    movable: true,
    resizable: true,
    required: false,
    maxChars: null,
    sampleField: null,
  },
  {
    id: "summary",
    defaultEnabled: true,
    defaultLabel: "Descripción",
    defaultDescription: "Texto principal que explica el recuerdo.",
    sortOrder: 130,
    x: 34,
    y: 56,
    w: 66,
    h: 26,
    minW: 30,
    minH: 16,
    maxW: 74,
    maxH: 42,
    movable: true,
    resizable: true,
    required: true,
    maxChars: 240,
    sampleField: "summary",
  },
  {
    id: "seed_card",
    defaultEnabled: true,
    defaultLabel: "Tarjeta semilla",
    defaultDescription: "Tarjeta relacionada con la semilla asociada.",
    sortOrder: 140,
    x: 34,
    y: 85,
    w: 31,
    h: 6.5,
    minW: 18,
    minH: 5,
    maxW: 40,
    maxH: 14,
    movable: true,
    resizable: true,
    required: false,
    maxChars: null,
    sampleField: null,
  },
  {
    id: "place_card",
    defaultEnabled: true,
    defaultLabel: "Tarjeta lugar",
    defaultDescription: "Tarjeta relacionada con el lugar asociado.",
    sortOrder: 150,
    x: 69,
    y: 85,
    w: 31,
    h: 6.5,
    minW: 18,
    minH: 5,
    maxW: 40,
    maxH: 14,
    movable: true,
    resizable: true,
    required: false,
    maxChars: null,
    sampleField: null,
  },
  {
    id: "route_card",
    defaultEnabled: true,
    defaultLabel: "Tarjeta ruta",
    defaultDescription: "Tarjeta relacionada con la ruta asociada.",
    sortOrder: 160,
    x: 34,
    y: 92.5,
    w: 31,
    h: 6.5,
    minW: 18,
    minH: 5,
    maxW: 40,
    maxH: 14,
    movable: true,
    resizable: true,
    required: false,
    maxChars: null,
    sampleField: null,
  },
  {
    id: "audio_card",
    defaultEnabled: true,
    defaultLabel: "Tarjeta audio",
    defaultDescription: "Tarjeta relacionada con el audio asociado.",
    sortOrder: 170,
    x: 69,
    y: 92.5,
    w: 31,
    h: 6.5,
    minW: 18,
    minH: 5,
    maxW: 40,
    maxH: 14,
    movable: true,
    resizable: true,
    required: false,
    maxChars: null,
    sampleField: null,
  },
] as const;

const FLOWER_PAGE_BLOCK_PRESET_MAP = Object.fromEntries(
  FLOWER_PAGE_BLOCK_PRESETS.map((preset) => [preset.id, preset]),
) as Record<FlowerPageBlockId, FlowerPageBlockPreset>;

function roundMetric(value: number) {
  return Math.round(value * 100) / 100;
}

function clampMetric(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return roundMetric(fallback);
  return roundMetric(Math.max(min, Math.min(max, parsed)));
}

function toBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  const text = String(value ?? "").trim().toLowerCase();
  if (["1", "true", "yes", "si", "on"].includes(text)) return true;
  if (["0", "false", "no", "off"].includes(text)) return false;
  return fallback;
}

function normalizeText(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function metadataObject(row: CatalogItemRow | null | undefined) {
  return row?.metadata && typeof row.metadata === "object" ? row.metadata : {};
}

function legacyDimensionToPercent(value: unknown, axis: "x" | "y") {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const divisor = axis === "x" ? LEGACY_GRID_COLUMNS : LEGACY_GRID_ROWS;
  return roundMetric((parsed / divisor) * 100);
}

function legacyOffsetToPercent(value: unknown, axis: "x" | "y") {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const divisor = axis === "x" ? LEGACY_GRID_COLUMNS : LEGACY_GRID_ROWS;
  return roundMetric(((parsed - 1) / divisor) * 100);
}

function readBlockMetric(
  metadata: Record<string, unknown>,
  input: {
    percentKey: string;
    legacyKey: string;
    axis: "x" | "y";
    fallback: number;
    min: number;
    max: number;
    isOffset?: boolean;
  },
) {
  const percentValue = metadata[input.percentKey];
  if (percentValue != null) {
    return clampMetric(percentValue, input.fallback, input.min, input.max);
  }

  const coordinateMode = String(metadata.coordinate_mode ?? "").trim().toLowerCase();
  if (coordinateMode === "percent") {
    return clampMetric(input.fallback, input.fallback, input.min, input.max);
  }

  const legacyValue = metadata[input.legacyKey];
  const converted = input.isOffset
    ? legacyOffsetToPercent(legacyValue, input.axis)
    : legacyDimensionToPercent(legacyValue, input.axis);

  if (converted == null) {
    return clampMetric(input.fallback, input.fallback, input.min, input.max);
  }

  return clampMetric(converted, input.fallback, input.min, input.max);
}

function editableBoundsForPreset(preset: FlowerPageBlockPreset) {
  return {
    minW: roundMetric(Math.max(4, Math.min(preset.w * 0.35, 18))),
    minH: roundMetric(Math.max(4, Math.min(preset.h * 0.45, 14))),
    maxW: 100,
    maxH: 100,
  };
}

type LegacySplitSource = {
  sourceCode: string;
  sourceFallback: { x: number; y: number; w: number; h: number };
};

const LEGACY_SPLIT_SOURCES: Partial<Record<FlowerPageBlockId, LegacySplitSource>> = {
  back_button: {
    sourceCode: "top_actions",
    sourceFallback: LEGACY_TOP_ACTIONS_FALLBACK,
  },
  edit_button: {
    sourceCode: "top_actions",
    sourceFallback: LEGACY_TOP_ACTIONS_FALLBACK,
  },
  favorite_button: {
    sourceCode: "memory_actions",
    sourceFallback: LEGACY_MEMORY_ACTIONS_FALLBACK,
  },
  highlight_button: {
    sourceCode: "memory_actions",
    sourceFallback: LEGACY_MEMORY_ACTIONS_FALLBACK,
  },
  plan_meta_badge: {
    sourceCode: "badges",
    sourceFallback: LEGACY_BADGES_FALLBACK,
  },
  place_type_badge: {
    sourceCode: "badges",
    sourceFallback: LEGACY_BADGES_FALLBACK,
  },
  completion_badge: {
    sourceCode: "badges",
    sourceFallback: LEGACY_BADGES_FALLBACK,
  },
  seed_card: {
    sourceCode: "detail_cards",
    sourceFallback: LEGACY_DETAIL_CARDS_FALLBACK,
  },
  place_card: {
    sourceCode: "detail_cards",
    sourceFallback: LEGACY_DETAIL_CARDS_FALLBACK,
  },
  route_card: {
    sourceCode: "detail_cards",
    sourceFallback: LEGACY_DETAIL_CARDS_FALLBACK,
  },
  audio_card: {
    sourceCode: "detail_cards",
    sourceFallback: LEGACY_DETAIL_CARDS_FALLBACK,
  },
};

function resolveStoredBox(
  row: CatalogItemRow | undefined,
  fallback: { x: number; y: number; w: number; h: number },
) {
  const metadata = metadataObject(row);
  const minW = readBlockMetric(metadata, {
    percentKey: "min_w_percent",
    legacyKey: "min_w",
    axis: "x",
    fallback: 4,
    min: 4,
    max: 100,
  });
  const minH = readBlockMetric(metadata, {
    percentKey: "min_h_percent",
    legacyKey: "min_h",
    axis: "y",
    fallback: 4,
    min: 4,
    max: 100,
  });
  const w = readBlockMetric(metadata, {
    percentKey: "w_percent",
    legacyKey: "w",
    axis: "x",
    fallback: fallback.w,
    min: minW,
    max: 100,
  });
  const h = readBlockMetric(metadata, {
    percentKey: "h_percent",
    legacyKey: "h",
    axis: "y",
    fallback: fallback.h,
    min: minH,
    max: 100,
  });
  const x = readBlockMetric(metadata, {
    percentKey: "x_percent",
    legacyKey: "x",
    axis: "x",
    fallback: fallback.x,
    min: 0,
    max: Math.max(0, 100 - w),
    isOffset: true,
  });
  const y = readBlockMetric(metadata, {
    percentKey: "y_percent",
    legacyKey: "y",
    axis: "y",
    fallback: fallback.y,
    min: 0,
    max: Math.max(0, 100 - h),
    isOffset: true,
  });

  return { x, y, w, h };
}

function buildLegacySplitRow(
  preset: FlowerPageBlockPreset,
  rowByCode?: Map<string, CatalogItemRow>,
) {
  if (!rowByCode) return undefined;
  const splitSource = LEGACY_SPLIT_SOURCES[preset.id];
  if (!splitSource) return undefined;
  const legacyRow = rowByCode.get(splitSource.sourceCode);
  if (!legacyRow) return undefined;
  const legacyBox = resolveStoredBox(legacyRow, splitSource.sourceFallback);
  const editableBounds = editableBoundsForPreset(preset);
  const relativeX = (preset.x - splitSource.sourceFallback.x) / splitSource.sourceFallback.w;
  const relativeY = (preset.y - splitSource.sourceFallback.y) / splitSource.sourceFallback.h;
  const relativeW = preset.w / splitSource.sourceFallback.w;
  const relativeH = preset.h / splitSource.sourceFallback.h;
  const derivedX = roundMetric(
    clampMetric(
      legacyBox.x + legacyBox.w * relativeX,
      preset.x,
      0,
      Math.max(0, 100 - editableBounds.minW),
    ),
  );
  const derivedY = roundMetric(
    clampMetric(
      legacyBox.y + legacyBox.h * relativeY,
      preset.y,
      0,
      Math.max(0, 100 - editableBounds.minH),
    ),
  );
  const derivedW = roundMetric(
    clampMetric(
      legacyBox.w * relativeW,
      preset.w,
      editableBounds.minW,
      Math.min(editableBounds.maxW, 100 - derivedX),
    ),
  );
  const derivedH = roundMetric(
    clampMetric(
      legacyBox.h * relativeH,
      preset.h,
      editableBounds.minH,
      Math.min(editableBounds.maxH, 100 - derivedY),
    ),
  );

  return {
    code: preset.id,
    label: preset.defaultLabel,
    sort_order: preset.sortOrder,
    enabled: legacyRow.enabled,
    metadata: {
      ...metadataObject(legacyRow),
      layout_version: FLOWER_PAGE_LAYOUT_VERSION,
      coordinate_mode: "percent",
      description: preset.defaultDescription,
      x_percent: derivedX,
      y_percent: derivedY,
      w_percent: derivedW,
      h_percent: derivedH,
      min_w_percent: editableBounds.minW,
      min_h_percent: editableBounds.minH,
      max_w_percent: editableBounds.maxW,
      max_h_percent: editableBounds.maxH,
    },
  };
}

function normalizeBlockFromRow(
  preset: FlowerPageBlockPreset,
  row: CatalogItemRow | undefined,
  rowByCode?: Map<string, CatalogItemRow>,
): FlowerPageBlockConfig {
  const sourceRow = row ?? buildLegacySplitRow(preset, rowByCode);
  const metadata = metadataObject(sourceRow);
  const layoutVersion = Number(metadata.layout_version ?? 1);
  const editableBounds = editableBoundsForPreset(preset);
  const hasPercentLayout =
    String(metadata.coordinate_mode ?? "").trim().toLowerCase() === "percent" ||
    metadata.x_percent != null ||
    metadata.y_percent != null ||
    metadata.w_percent != null ||
    metadata.h_percent != null;
  const minW = readBlockMetric(metadata, {
    percentKey: "min_w_percent",
    legacyKey: "min_w",
    axis: "x",
    fallback:
      layoutVersion < FLOWER_PAGE_LAYOUT_VERSION
        ? editableBounds.minW
        : preset.minW,
    min: 4,
    max: 100,
  });
  const maxW = readBlockMetric(metadata, {
    percentKey: "max_w_percent",
    legacyKey: "max_w",
    axis: "x",
    fallback:
      layoutVersion < FLOWER_PAGE_LAYOUT_VERSION
        ? editableBounds.maxW
        : preset.maxW,
    min: minW,
    max: 100,
  });
  const minH = readBlockMetric(metadata, {
    percentKey: "min_h_percent",
    legacyKey: "min_h",
    axis: "y",
    fallback:
      layoutVersion < FLOWER_PAGE_LAYOUT_VERSION
        ? editableBounds.minH
        : preset.minH,
    min: 4,
    max: 100,
  });
  const maxH = readBlockMetric(metadata, {
    percentKey: "max_h_percent",
    legacyKey: "max_h",
    axis: "y",
    fallback:
      layoutVersion < FLOWER_PAGE_LAYOUT_VERSION
        ? editableBounds.maxH
        : preset.maxH,
    min: minH,
    max: 100,
  });
  const w = readBlockMetric(metadata, {
    percentKey: "w_percent",
    legacyKey: "w",
    axis: "x",
    fallback: preset.w,
    min: minW,
    max: maxW,
  });
  const h = readBlockMetric(metadata, {
    percentKey: "h_percent",
    legacyKey: "h",
    axis: "y",
    fallback: preset.h,
    min: minH,
    max: maxH,
  });
  const x = readBlockMetric(metadata, {
    percentKey: "x_percent",
    legacyKey: "x",
    axis: "x",
    fallback: preset.x,
    min: 0,
    max: Math.max(0, 100 - w),
    isOffset: true,
  });
  const y = readBlockMetric(metadata, {
    percentKey: "y_percent",
    legacyKey: "y",
    axis: "y",
    fallback: preset.y,
    min: 0,
    max: Math.max(0, 100 - h),
    isOffset: true,
  });

  const migratedEnabled =
    sourceRow?.enabled == null
      ? preset.defaultEnabled
      : hasPercentLayout
        ? sourceRow.enabled !== false
        : preset.defaultEnabled;

  const migratedPosition = { x, y, w, h };

  return {
    id: preset.id,
    label: normalizeText(sourceRow?.label, preset.defaultLabel),
    description: normalizeText(metadata.description, preset.defaultDescription),
    enabled: migratedEnabled,
    x: migratedPosition.x,
    y: migratedPosition.y,
    w: migratedPosition.w,
    h: migratedPosition.h,
    minW,
    minH,
    maxW,
    maxH,
    movable: toBoolean(metadata.movable, preset.movable),
    resizable: toBoolean(metadata.resizable, preset.resizable),
    required: toBoolean(metadata.required, preset.required),
    maxChars:
      preset.maxChars == null
        ? null
        : clampMetric(metadata.max_chars, preset.maxChars, 12, 600),
    sampleField:
      metadata.sample_field === "title" || metadata.sample_field === "summary"
        ? metadata.sample_field
        : preset.sampleField,
  };
}

export function getFlowerPageBlockPreset(id: FlowerPageBlockId) {
  return FLOWER_PAGE_BLOCK_PRESET_MAP[id];
}

export function getFallbackFlowerPageLayoutConfig(): FlowerPageLayoutConfig {
  return {
    blocks: FLOWER_PAGE_BLOCK_PRESETS.map((preset) =>
      normalizeBlockFromRow(preset, undefined),
    ),
  };
}

export function normalizeFlowerPageLayoutConfig(
  input: FlowerPageLayoutConfig | null | undefined,
): FlowerPageLayoutConfig {
  const inputById = new Map((input?.blocks ?? []).map((block) => [block.id, block]));

  return {
    blocks: FLOWER_PAGE_BLOCK_PRESETS.map((preset) => {
      const current = inputById.get(preset.id);
      if (!current) return normalizeBlockFromRow(preset, undefined);
      return normalizeBlockFromRow(preset, {
        code: current.id,
        label: current.label,
        sort_order: preset.sortOrder,
        enabled: current.enabled,
        metadata: {
          layout_version: FLOWER_PAGE_LAYOUT_VERSION,
          coordinate_mode: "percent",
          description: current.description,
          x_percent: current.x,
          y_percent: current.y,
          w_percent: current.w,
          h_percent: current.h,
          min_w_percent: current.minW,
          min_h_percent: current.minH,
          max_w_percent: current.maxW,
          max_h_percent: current.maxH,
          movable: current.movable,
          resizable: current.resizable,
          required: current.required,
          max_chars: current.maxChars,
          sample_field: current.sampleField,
        },
      });
    }),
  };
}

export function getFlowerPageLayoutBlockMap(config: FlowerPageLayoutConfig) {
  return Object.fromEntries(
    normalizeFlowerPageLayoutConfig(config).blocks.map((block) => [block.id, block]),
  ) as Record<FlowerPageBlockId, FlowerPageBlockConfig>;
}

export async function getFlowerPageLayoutConfig(): Promise<FlowerPageLayoutConfig> {
  const fallback = getFallbackFlowerPageLayoutConfig();

  try {
    const { data, error } = await supabase
      .from("catalog_items")
      .select("code,label,sort_order,enabled,metadata")
      .eq("catalog_key", FLOWER_PAGE_LAYOUT_CATALOG_KEY)
      .order("sort_order", { ascending: true })
      .order("code", { ascending: true });

    if (error) return fallback;

    const rows = ((data as CatalogItemRow[] | null) ?? []).filter((row) =>
      String(row.code ?? "").length > 0,
    );

    if (!rows.length) return fallback;

    const rowById = new Map<string, CatalogItemRow>();
    for (const row of rows) {
      const id = String(row.code ?? "");
      if (id) {
        rowById.set(id, row);
      }
    }

    return {
      blocks: FLOWER_PAGE_BLOCK_PRESETS.map((preset) =>
        normalizeBlockFromRow(preset, rowById.get(preset.id), rowById),
      ),
    };
  } catch {
    return fallback;
  }
}

export function getFlowerPageLayoutCatalogRows(config: FlowerPageLayoutConfig) {
  return normalizeFlowerPageLayoutConfig(config).blocks.map((block, index) => ({
    catalog_key: FLOWER_PAGE_LAYOUT_CATALOG_KEY,
    code: block.id,
    label: block.label,
    sort_order: (index + 1) * 10,
    enabled: block.enabled,
    color: null,
    icon: null,
    metadata: {
      layout_version: FLOWER_PAGE_LAYOUT_VERSION,
      coordinate_mode: "percent",
      description: block.description,
      x_percent: block.x,
      y_percent: block.y,
      w_percent: block.w,
      h_percent: block.h,
      min_w_percent: block.minW,
      min_h_percent: block.minH,
      max_w_percent: block.maxW,
      max_h_percent: block.maxH,
      movable: block.movable,
      resizable: block.resizable,
      required: block.required,
      max_chars: block.maxChars,
      sample_field: block.sampleField,
    },
  }));
}

function blocksOverlap(left: FlowerPageBlockConfig, right: FlowerPageBlockConfig) {
  return (
    left.x < right.x + right.w &&
    left.x + left.w > right.x &&
    left.y < right.y + right.h &&
    left.y + left.h > right.y
  );
}

export function validateFlowerPageLayoutConfig(
  config: FlowerPageLayoutConfig,
): FlowerPageLayoutIssue[] {
  const normalized = normalizeFlowerPageLayoutConfig(config);
  const issues: FlowerPageLayoutIssue[] = [];

  for (const block of normalized.blocks) {
    if (!block.enabled) {
      if (block.required) {
        issues.push({
          id: `${block.id}-required-disabled`,
          tone: "error",
          title: `${block.label} esta oculto`,
          detail: "Este bloque forma parte de la superficie base y no debería quedarse apagado.",
          blockId: block.id,
        });
      }
      continue;
    }

    if (block.x < 0 || block.y < 0) {
      issues.push({
        id: `${block.id}-start-outside`,
        tone: "error",
        title: `${block.label} arranca fuera del stage`,
        detail: "Recolócalo dentro del área visible de la superficie.",
        blockId: block.id,
      });
    }

    if (block.x + block.w > 100) {
      issues.push({
        id: `${block.id}-width-overflow`,
        tone: "error",
        title: `${block.label} se sale en horizontal`,
        detail: "Su ancho actual rebasa el 100% del stage.",
        blockId: block.id,
      });
    }

    if (block.y + block.h > 100) {
      issues.push({
        id: `${block.id}-height-overflow`,
        tone: "warning",
        title: `${block.label} se sale en vertical`,
        detail: "Su altura baja demasiado en la superficie visible.",
        blockId: block.id,
      });
    }

    if (block.maxChars != null && block.maxChars < 24) {
      issues.push({
        id: `${block.id}-chars-low`,
        tone: "info",
        title: `${block.label} tiene un límite muy bajo`,
        detail: "Puede quedarse corto para una escritura normal.",
        blockId: block.id,
      });
    }
  }

  const visibleBlocks = normalized.blocks.filter((block) => block.enabled);
  for (let index = 0; index < visibleBlocks.length; index += 1) {
    const current = visibleBlocks[index];
    for (let nextIndex = index + 1; nextIndex < visibleBlocks.length; nextIndex += 1) {
      const candidate = visibleBlocks[nextIndex];
      if (!blocksOverlap(current, candidate)) continue;
      issues.push({
        id: `${current.id}-overlap-${candidate.id}`,
        tone: "warning",
        title: `${current.label} se cruza con ${candidate.label}`,
        detail: "Revisa si el solapamiento es intencional o si la lectura queda comprometida.",
        blockId: current.id,
      });
    }
  }

  const rank = { error: 0, warning: 1, info: 2 };
  return issues.sort((left, right) => rank[left.tone] - rank[right.tone]);
}
