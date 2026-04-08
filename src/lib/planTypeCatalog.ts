import type { ElementKind } from "@/lib/canvasTypes";
import {
  getSuggestedElementForFlowerFamily,
  normalizeElementKind,
  resolveFlowerFamilyFromPlanType,
  type FlowerFamily,
} from "@/lib/productDomainContracts";
import {
  createEmptyPlanFlowerComposerConfig,
  normalizePlanFlowerComposerConfig,
  type PlanFlowerComposerConfig,
} from "@/lib/planTypeFlowerComposer";
import {
  PLAN_FLOWER_BUILDER_TEMPLATE,
  PLAN_SEED_BUILDER_TEMPLATE,
} from "@/lib/planVisuals";

export type PlanTypeCategory =
  | "salida"
  | "comida"
  | "naturaleza"
  | "movimiento"
  | "casa"
  | "cultura"
  | "escapada"
  | "celebracion"
  | "custom";

export type PlanTypeOption = {
  id: string;
  code: string;
  label: string;
  category: PlanTypeCategory;
  description: string | null;
  flowerFamily: FlowerFamily;
  suggestedElement: ElementKind;
  iconEmoji: string | null;
  flowerAssetPath: string | null;
  seedAssetPath: string | null;
  flowerBuilderConfig: PlanFlowerComposerConfig;
  isCustom: boolean;
  sortOrder: number;
};

type PlanTypePreset = Omit<
  PlanTypeOption,
  | "id"
  | "isCustom"
  | "flowerAssetPath"
  | "seedAssetPath"
  | "flowerFamily"
  | "flowerBuilderConfig"
>;

export const CUSTOM_PLAN_TYPE_VALUE = "__custom_plan_type__";
export const OTHER_PLAN_TYPE_VALUE = "__other_plan_type__";
export const OTHER_PLAN_TYPE_LABEL = "Otro momento";

export const PLAN_TYPE_CATEGORY_LABELS: Record<PlanTypeCategory, string> = {
  salida: "Salidas",
  comida: "Comer y beber",
  naturaleza: "Naturaleza",
  movimiento: "Movimiento",
  casa: "Casa",
  cultura: "Cultura",
  escapada: "Escapadas",
  celebracion: "Celebraciones",
  custom: "Personalizados",
};

export const FALLBACK_PLAN_TYPE_PRESETS: PlanTypePreset[] = [
  { code: "salida_general", label: "Salida", category: "salida", description: "Quedar, salir y romper rutina.", suggestedElement: "air", iconEmoji: null, sortOrder: 10 },
  { code: "paseo", label: "Paseo", category: "salida", description: "Salir a caminar sin más.", suggestedElement: "air", iconEmoji: null, sortOrder: 20 },
  { code: "parque", label: "Parque", category: "salida", description: "Una tarde ligera fuera de casa.", suggestedElement: "air", iconEmoji: null, sortOrder: 30 },
  { code: "terraza", label: "Terraza", category: "salida", description: "Plan de charla y algo rico.", suggestedElement: "air", iconEmoji: null, sortOrder: 40 },
  { code: "playa", label: "Playa", category: "naturaleza", description: "Mar, arena y tiempo juntos.", suggestedElement: "water", iconEmoji: null, sortOrder: 50 },
  { code: "campo", label: "Campo", category: "naturaleza", description: "Salir a verde y respirar.", suggestedElement: "earth", iconEmoji: null, sortOrder: 60 },
  { code: "picnic", label: "Picnic", category: "naturaleza", description: "Comida tranquila al aire libre.", suggestedElement: "earth", iconEmoji: null, sortOrder: 70 },
  { code: "mirador", label: "Mirador", category: "naturaleza", description: "Un sitio bonito al que volver.", suggestedElement: "air", iconEmoji: null, sortOrder: 80 },
  { code: "senderismo", label: "Senderismo", category: "movimiento", description: "Ruta andando por naturaleza.", suggestedElement: "earth", iconEmoji: null, sortOrder: 90 },
  { code: "ruta", label: "Ruta", category: "movimiento", description: "Recorrido con origen y destino.", suggestedElement: "earth", iconEmoji: null, sortOrder: 100 },
  { code: "bici", label: "Montar en bici", category: "movimiento", description: "Plan sobre ruedas.", suggestedElement: "air", iconEmoji: null, sortOrder: 110 },
  { code: "deporte", label: "Deporte juntos", category: "movimiento", description: "Moverse y activarse.", suggestedElement: "air", iconEmoji: null, sortOrder: 120 },
  { code: "desayuno", label: "Desayuno", category: "comida", description: "Empezar el dia con algo rico.", suggestedElement: "fire", iconEmoji: null, sortOrder: 130 },
  { code: "brunch", label: "Brunch", category: "comida", description: "Plan lento de media mañana.", suggestedElement: "fire", iconEmoji: null, sortOrder: 140 },
  { code: "cafe", label: "Cafe", category: "comida", description: "Parar, hablar y mirarse.", suggestedElement: "fire", iconEmoji: null, sortOrder: 150 },
  { code: "vermut", label: "Vermut", category: "comida", description: "Salir a tomar algo juntos.", suggestedElement: "fire", iconEmoji: null, sortOrder: 160 },
  { code: "restaurante", label: "Restaurante", category: "comida", description: "Comida o cena especial.", suggestedElement: "fire", iconEmoji: null, sortOrder: 170 },
  { code: "cena", label: "Cena", category: "comida", description: "Plan para comer sin prisa.", suggestedElement: "fire", iconEmoji: null, sortOrder: 180 },
  { code: "noche_casa", label: "Plan en casa", category: "casa", description: "Momentos tranquilos y calentitos.", suggestedElement: "fire", iconEmoji: null, sortOrder: 190 },
  { code: "cocinar_juntos", label: "Cocinar juntos", category: "casa", description: "Hacer algo rico entre dos.", suggestedElement: "fire", iconEmoji: null, sortOrder: 200 },
  { code: "peli", label: "Peli o serie", category: "casa", description: "Tiempo de sofa y manta.", suggestedElement: "fire", iconEmoji: null, sortOrder: 210 },
  { code: "juegos", label: "Juegos de mesa", category: "casa", description: "Reirse, picarse y compartir.", suggestedElement: "fire", iconEmoji: null, sortOrder: 220 },
  { code: "lectura", label: "Lectura compartida", category: "casa", description: "Un rato suave y lento.", suggestedElement: "aether", iconEmoji: null, sortOrder: 230 },
  { code: "cine", label: "Cine", category: "cultura", description: "Salir a ver una historia juntos.", suggestedElement: "aether", iconEmoji: null, sortOrder: 240 },
  { code: "concierto", label: "Concierto", category: "cultura", description: "Musica y recuerdo fuerte.", suggestedElement: "fire", iconEmoji: null, sortOrder: 250 },
  { code: "museo", label: "Museo", category: "cultura", description: "Plan de descubrir algo nuevo.", suggestedElement: "aether", iconEmoji: null, sortOrder: 260 },
  { code: "feria", label: "Feria o evento", category: "cultura", description: "Salir a algo especial.", suggestedElement: "fire", iconEmoji: null, sortOrder: 270 },
  { code: "escapada", label: "Escapada", category: "escapada", description: "Salir fuera y romper escenario.", suggestedElement: "earth", iconEmoji: null, sortOrder: 280 },
  { code: "viaje", label: "Viaje", category: "escapada", description: "Moverse más lejos y vivir algo grande.", suggestedElement: "aether", iconEmoji: null, sortOrder: 290 },
  { code: "road_trip", label: "Road trip", category: "escapada", description: "Ruta de coche con varias paradas.", suggestedElement: "air", iconEmoji: null, sortOrder: 300 },
  { code: "tren", label: "Viaje en tren", category: "escapada", description: "Trayecto bonito para recordar.", suggestedElement: "air", iconEmoji: null, sortOrder: 310 },
  { code: "celebracion", label: "Celebracion", category: "celebracion", description: "Un dia que merece marcarse.", suggestedElement: "fire", iconEmoji: null, sortOrder: 320 },
  { code: "aniversario", label: "Aniversario", category: "celebracion", description: "Un hito emocional del jardín.", suggestedElement: "aether", iconEmoji: null, sortOrder: 330 },
  { code: "sorpresa", label: "Sorpresa", category: "celebracion", description: "Plan pensado para emocionar.", suggestedElement: "aether", iconEmoji: null, sortOrder: 340 },
];

export function getFallbackPlanTypeOptions(): PlanTypeOption[] {
  return FALLBACK_PLAN_TYPE_PRESETS.map((item) => ({
    id: item.code,
    ...item,
    flowerFamily: resolveFlowerFamilyFromPlanType({
      code: item.code,
      suggestedElement: item.suggestedElement,
    }),
    flowerAssetPath: PLAN_FLOWER_BUILDER_TEMPLATE,
    seedAssetPath: PLAN_SEED_BUILDER_TEMPLATE,
    flowerBuilderConfig: createEmptyPlanFlowerComposerConfig(),
    isCustom: false,
  }));
}

export function findFallbackPlanTypeOption(code: string | null | undefined) {
  if (!code) return null;
  const normalized = code.trim().toLowerCase();
  return getFallbackPlanTypeOptions().find((item) => item.code === normalized) ?? null;
}

export function slugifyPlanTypeLabel(label: string) {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

export function createCustomPlanTypeCode(label: string) {
  const slug = slugifyPlanTypeLabel(label) || "plan";
  const suffix = Date.now().toString(36);
  return `custom_${slug}_${suffix}`;
}

export function groupPlanTypeOptions(options: PlanTypeOption[]) {
  const groups = new Map<PlanTypeCategory, PlanTypeOption[]>();
  for (const option of [...options].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.label.localeCompare(b.label, "es");
  })) {
    const current = groups.get(option.category) ?? [];
    current.push(option);
    groups.set(option.category, current);
  }
  return groups;
}

export function formatPlanTypeOptionLabel(option: Pick<PlanTypeOption, "label" | "isCustom">) {
  return option.isCustom ? `Propio ? ${option.label}` : `Sugerido ? ${option.label}`;
}

export function mapGardenPlanTypeRow(row: Record<string, unknown>): PlanTypeOption {
  const code = String(row.code ?? "").trim() || "plan";
  const fallback = findFallbackPlanTypeOption(code);
  const flowerFamily = resolveFlowerFamilyFromPlanType({
    flowerFamily: row.flower_family,
    code,
    suggestedElement: row.suggested_element ?? fallback?.suggestedElement ?? null,
  });
  const normalizedElement = normalizeElementKind(
    row.suggested_element ??
      fallback?.suggestedElement ??
      getSuggestedElementForFlowerFamily(flowerFamily),
  );

  return {
    id: String(row.id ?? code),
    code,
    label: String(row.label ?? fallback?.label ?? "Plan").trim() || "Plan",
    category: (String(row.category ?? fallback?.category ?? "custom").trim() || "custom") as PlanTypeCategory,
    description: String(row.description ?? fallback?.description ?? "").trim() || null,
    flowerFamily,
    suggestedElement: normalizedElement,
    iconEmoji: String(row.icon_emoji ?? fallback?.iconEmoji ?? "").trim() || null,
    flowerAssetPath:
      String(row.flower_asset_path ?? "").trim() || fallback?.flowerAssetPath || null,
    seedAssetPath:
      String(row.seed_asset_path ?? "").trim() || fallback?.seedAssetPath || null,
    flowerBuilderConfig: normalizePlanFlowerComposerConfig(
      row.flower_builder_config ?? fallback?.flowerBuilderConfig ?? null,
    ),
    isCustom: Boolean(row.is_custom),
    sortOrder: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : fallback?.sortOrder ?? 999,
  };
}
