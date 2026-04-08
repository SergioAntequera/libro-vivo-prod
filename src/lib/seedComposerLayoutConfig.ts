import { supabase } from "@/lib/supabase";

export const SEED_COMPOSER_LAYOUT_CATALOG_KEY = "seed_composer_surface_layout";
export const SEED_COMPOSER_LAYOUT_VERSION = 3;
export const SEED_COMPOSER_STAGE_WIDTH = 1280;
export const SEED_COMPOSER_STAGE_HEIGHT = 860;
export const SEED_COMPOSER_STAGE_ASPECT_RATIO =
  SEED_COMPOSER_STAGE_WIDTH / SEED_COMPOSER_STAGE_HEIGHT;

export const SEED_COMPOSER_BLOCK_IDS = [
  "header_title",
  "header_hint",
  "title_input",
  "plan_type_select",
  "date_input",
  "place_card",
  "notes_input",
  "status_hint",
  "submit_button",
] as const;

export type SeedComposerBlockId = (typeof SEED_COMPOSER_BLOCK_IDS)[number];

export type SeedComposerLayoutIssue = {
  id: string;
  tone: "error" | "warning" | "info";
  title: string;
  detail: string;
  blockId?: SeedComposerBlockId;
};

export type SeedComposerBlockConfig = {
  id: SeedComposerBlockId;
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
};

export type SeedComposerLayoutConfig = {
  blocks: SeedComposerBlockConfig[];
};

type CatalogItemRow = {
  code: string | null;
  label: string | null;
  sort_order: number | null;
  enabled: boolean | null;
  metadata: Record<string, unknown> | null;
};

type SeedComposerBlockPreset = Omit<
  SeedComposerBlockConfig,
  "enabled" | "label" | "description"
> & {
  defaultEnabled: boolean;
  defaultLabel: string;
  defaultDescription: string;
  sortOrder: number;
};

const SEED_COMPOSER_BLOCK_PRESETS: SeedComposerBlockPreset[] = [
  {
    id: "header_title",
    defaultEnabled: true,
    defaultLabel: "Nueva semilla",
    defaultDescription: "Encabezado principal del compositor.",
    sortOrder: 10,
    x: 0,
    y: 0,
    w: 100,
    h: 7,
    minW: 24,
    minH: 4,
    maxW: 100,
    maxH: 12,
    movable: true,
    resizable: true,
    required: false,
  },
  {
    id: "header_hint",
    defaultEnabled: true,
    defaultLabel: "Crea el plan con su tipo, fecha cuando la tengas clara y un lugar si ya lo sabes.",
    defaultDescription: "Texto de apoyo justo debajo del encabezado.",
    sortOrder: 20,
    x: 0,
    y: 7.8,
    w: 100,
    h: 5.2,
    minW: 28,
    minH: 3.5,
    maxW: 100,
    maxH: 9,
    movable: true,
    resizable: true,
    required: false,
  },
  {
    id: "title_input",
    defaultEnabled: true,
    defaultLabel: "Título del plan",
    defaultDescription: "Campo principal para nombrar la nueva semilla.",
    sortOrder: 30,
    x: 0,
    y: 16.2,
    w: 100,
    h: 8.4,
    minW: 32,
    minH: 5,
    maxW: 100,
    maxH: 12,
    movable: true,
    resizable: true,
    required: true,
  },
  {
    id: "plan_type_select",
    defaultEnabled: true,
    defaultLabel: "Tipo de plan",
    defaultDescription: "Selector canónico del tipo de plan.",
    sortOrder: 40,
    x: 0,
    y: 28.2,
    w: 63,
    h: 10,
    minW: 24,
    minH: 6.5,
    maxW: 74,
    maxH: 14,
    movable: true,
    resizable: true,
    required: true,
  },
  {
    id: "date_input",
    defaultEnabled: true,
    defaultLabel: "Fecha",
    defaultDescription: "Fecha opcional para que la semilla entre ya en agenda.",
    sortOrder: 50,
    x: 67,
    y: 28.2,
    w: 33,
    h: 10,
    minW: 20,
    minH: 6.5,
    maxW: 46,
    maxH: 14,
    movable: true,
    resizable: true,
    required: false,
  },
  {
    id: "place_card",
    defaultEnabled: true,
    defaultLabel: "Lugar del plan",
    defaultDescription: "Bloque para elegir, cambiar o quitar el lugar desde el mapa.",
    sortOrder: 60,
    x: 0,
    y: 41.2,
    w: 100,
    h: 16,
    minW: 36,
    minH: 10,
    maxW: 100,
    maxH: 22,
    movable: true,
    resizable: true,
    required: false,
  },
  {
    id: "notes_input",
    defaultEnabled: true,
    defaultLabel: "Notas opcionales",
    defaultDescription: "Espacio para enriquecer la semilla con contexto.",
    sortOrder: 70,
    x: 0,
    y: 60.2,
    w: 100,
    h: 12,
    minW: 36,
    minH: 8,
    maxW: 100,
    maxH: 18,
    movable: true,
    resizable: true,
    required: false,
  },
  {
    id: "status_hint",
    defaultEnabled: true,
    defaultLabel: "Si no pones fecha, quedará como idea para programar después.",
    defaultDescription: "Pista final que ayuda a entender como se guardará la semilla.",
    sortOrder: 80,
    x: 0,
    y: 75.6,
    w: 62,
    h: 4.8,
    minW: 28,
    minH: 3.5,
    maxW: 78,
    maxH: 8,
    movable: true,
    resizable: true,
    required: false,
  },
  {
    id: "submit_button",
    defaultEnabled: true,
    defaultLabel: "Guardar semilla",
    defaultDescription: "CTA principal del compositor.",
    sortOrder: 90,
    x: 68,
    y: 74,
    w: 32,
    h: 6.6,
    minW: 18,
    minH: 4.5,
    maxW: 40,
    maxH: 10,
    movable: true,
    resizable: true,
    required: true,
  },
];

const SEED_COMPOSER_BLOCK_PRESET_MAP = Object.fromEntries(
  SEED_COMPOSER_BLOCK_PRESETS.map((preset) => [preset.id, preset]),
) as Record<SeedComposerBlockId, SeedComposerBlockPreset>;

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

function normalizeBlockFromRow(
  preset: SeedComposerBlockPreset,
  row: CatalogItemRow | undefined,
): SeedComposerBlockConfig {
  const metadata = metadataObject(row);
  const layoutVersion = Number(metadata.layout_version ?? 1);
  const usePresetFrame = layoutVersion < SEED_COMPOSER_LAYOUT_VERSION;

  return {
    id: preset.id,
    label: normalizeText(row?.label, preset.defaultLabel),
    description: normalizeText(metadata.description, preset.defaultDescription),
    enabled: row?.enabled == null ? preset.defaultEnabled : row.enabled !== false,
    x: usePresetFrame ? preset.x : clampMetric(metadata.x_percent, preset.x, 0, 100),
    y: usePresetFrame ? preset.y : clampMetric(metadata.y_percent, preset.y, 0, 100),
    w: usePresetFrame
      ? preset.w
      : clampMetric(metadata.w_percent, preset.w, preset.minW, preset.maxW),
    h: usePresetFrame
      ? preset.h
      : clampMetric(metadata.h_percent, preset.h, preset.minH, preset.maxH),
    minW: usePresetFrame ? preset.minW : clampMetric(metadata.min_w_percent, preset.minW, 4, 100),
    minH: usePresetFrame ? preset.minH : clampMetric(metadata.min_h_percent, preset.minH, 4, 100),
    maxW: usePresetFrame ? preset.maxW : clampMetric(metadata.max_w_percent, preset.maxW, preset.minW, 100),
    maxH: usePresetFrame ? preset.maxH : clampMetric(metadata.max_h_percent, preset.maxH, preset.minH, 100),
    movable: toBoolean(metadata.movable, preset.movable),
    resizable: toBoolean(metadata.resizable, preset.resizable),
    required: toBoolean(metadata.required, preset.required),
  };
}

export function getSeedComposerBlockPreset(id: SeedComposerBlockId) {
  return SEED_COMPOSER_BLOCK_PRESET_MAP[id];
}

export function getFallbackSeedComposerLayoutConfig(): SeedComposerLayoutConfig {
  return {
    blocks: SEED_COMPOSER_BLOCK_PRESETS.map((preset) =>
      normalizeBlockFromRow(preset, undefined),
    ),
  };
}

export function normalizeSeedComposerLayoutConfig(
  input: SeedComposerLayoutConfig | null | undefined,
): SeedComposerLayoutConfig {
  const inputById = new Map((input?.blocks ?? []).map((block) => [block.id, block]));
  return {
    blocks: SEED_COMPOSER_BLOCK_PRESETS.map((preset) => {
      const current = inputById.get(preset.id);
      return normalizeBlockFromRow(
        preset,
        current
          ? {
              code: current.id,
              label: current.label,
              sort_order: preset.sortOrder,
              enabled: current.enabled,
              metadata: {
                layout_version: SEED_COMPOSER_LAYOUT_VERSION,
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
              },
            }
          : undefined,
      );
    }),
  };
}

export function getSeedComposerLayoutBlockMap(config: SeedComposerLayoutConfig) {
  return Object.fromEntries(
    normalizeSeedComposerLayoutConfig(config).blocks.map((block) => [block.id, block]),
  ) as Record<SeedComposerBlockId, SeedComposerBlockConfig>;
}

export async function getSeedComposerLayoutConfig(): Promise<SeedComposerLayoutConfig> {
  const fallback = getFallbackSeedComposerLayoutConfig();
  try {
    const { data, error } = await supabase
      .from("catalog_items")
      .select("code,label,sort_order,enabled,metadata")
      .eq("catalog_key", SEED_COMPOSER_LAYOUT_CATALOG_KEY)
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
      if (id) rowById.set(id, row);
    }

    return {
      blocks: SEED_COMPOSER_BLOCK_PRESETS.map((preset) =>
        normalizeBlockFromRow(preset, rowById.get(preset.id)),
      ),
    };
  } catch {
    return fallback;
  }
}

export function getSeedComposerLayoutCatalogRows(config: SeedComposerLayoutConfig) {
  return normalizeSeedComposerLayoutConfig(config).blocks.map((block, index) => ({
    catalog_key: SEED_COMPOSER_LAYOUT_CATALOG_KEY,
    code: block.id,
    label: block.label,
    sort_order: (index + 1) * 10,
    enabled: block.enabled,
    color: null,
    icon: null,
    metadata: {
      layout_version: SEED_COMPOSER_LAYOUT_VERSION,
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
    },
  }));
}

function blocksOverlap(left: SeedComposerBlockConfig, right: SeedComposerBlockConfig) {
  return (
    left.x < right.x + right.w &&
    left.x + left.w > right.x &&
    left.y < right.y + right.h &&
    left.y + left.h > right.y
  );
}

export function validateSeedComposerLayoutConfig(
  config: SeedComposerLayoutConfig,
): SeedComposerLayoutIssue[] {
  const normalized = normalizeSeedComposerLayoutConfig(config);
  const issues: SeedComposerLayoutIssue[] = [];

  for (const block of normalized.blocks) {
    if (!block.enabled) {
      if (block.required) {
        issues.push({
          id: `${block.id}-required-disabled`,
          tone: "error",
          title: `${block.label} esta oculto`,
          detail: "Esta pieza forma parte de la superficie base de nueva semilla.",
          blockId: block.id,
        });
      }
      continue;
    }

    if (block.x + block.w > 100) {
      issues.push({
        id: `${block.id}-width-overflow`,
        tone: "error",
        title: `${block.label} se sale en horizontal`,
        detail: "Su ancho rebasa el 100% del stage.",
        blockId: block.id,
      });
    }

    if (block.y + block.h > 100) {
      issues.push({
        id: `${block.id}-height-overflow`,
        tone: "warning",
        title: `${block.label} se sale en vertical`,
        detail: "La pieza baja demasiado y compromete la lectura del compositor.",
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
        detail: "Revisa si el solapamiento es intencional o si la lectura del compositor queda comprometida.",
        blockId: current.id,
      });
    }
  }

  const rank = { error: 0, warning: 1, info: 2 };
  return issues.sort((left, right) => rank[left.tone] - rank[right.tone]);
}
