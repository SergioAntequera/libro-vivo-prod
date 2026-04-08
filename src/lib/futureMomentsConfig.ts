import { supabase } from "@/lib/supabase";

export const ANNUAL_TREE_REMINDER_YEARS = [1, 3, 5, 7, 10] as const;
export type AnnualTreeReminderYear = (typeof ANNUAL_TREE_REMINDER_YEARS)[number];

export const ANNUAL_CAPSULE_MAX_PER_YEAR = 1;
export const ANNUAL_CAPSULE_PROMPT_START_MONTH = 11;
export const FUTURE_MOMENTS_CATALOG_KEY = "future_moments";

import {
  DEFAULT_ANNUAL_TREE_NARRATIVES,
  type AnnualTreeNarrativeCopy,
  type AnnualTreeNarrativeKey,
} from "@/lib/annualTreeNarrative";

export type FutureMomentsTreeConfig = {
  plantingEyebrow: string;
  plantingIntro: string;
  plantingLocationHint: string;
  plantingNotesHint: string;
  anniversaryEyebrow: string;
  anniversaryIntro: string;
  anniversaryLocationHint: string;
  anniversaryNotesHint: string;
  narratives: AnnualTreeNarrativeCopy[];
};

export type FutureMomentsCapsuleConfig = {
  annualPromptStartMonth: number;
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  ceremonyHint: string;
  symbolicPrompt: string;
  objectIdeas: string[];
  openingEyebrow: string;
  openingTitle: string;
  openingDescription: string;
};

export type FutureMomentsConfig = {
  tree: FutureMomentsTreeConfig;
  capsule: FutureMomentsCapsuleConfig;
};

type FutureMomentsConfigDraft = {
  tree?: Partial<FutureMomentsTreeConfig>;
  capsule?: Partial<FutureMomentsCapsuleConfig>;
};

type CatalogItemRow = {
  code: string | null;
  metadata: Record<string, unknown> | null;
};

export const DEFAULT_FUTURE_MOMENTS_CONFIG: FutureMomentsConfig = {
  tree: {
    plantingEyebrow: "Ritual anual desbloqueado",
    plantingIntro:
      "El capitulo ya se ha cerrado. Ahora toca llevar ese arbol al mundo real y registrar el gesto con una presencia mas ceremonial.",
    plantingLocationHint:
      "Podeis describir el sitio, meter coordenadas manuales o abrir el mapa para encontrarlo con calma.",
    plantingNotesHint:
      "Dejad aqui lo que sentisteis, por que elegisteis ese lugar y como quereis recordarlo cuando vuelvais dentro de unos años.",
    anniversaryEyebrow: "Recordatorio del arbol real",
    anniversaryIntro:
      "Este es uno de esos momentos que conviene parar y mirar con atencion. Contad como esta, si sigue ahi y que ha cambiado con el tiempo.",
    anniversaryLocationHint:
      "Si se movio, desaparecio o hubo que replantarlo, dejad esa verdad tambien. La historia sigue siendo vuestra.",
    anniversaryNotesHint:
      "Podeis anadir una foto, una nota nueva o incluso registrar una despedida si el arbol ya no sigue con vosotras.",
    narratives: DEFAULT_ANNUAL_TREE_NARRATIVES,
  },
  capsule: {
    annualPromptStartMonth: ANNUAL_CAPSULE_PROMPT_START_MONTH,
    heroEyebrow: "Memoria futura",
    heroTitle: "Una capsula anual para guardar lo irrepetible",
    heroDescription:
      "Solo una por año. No como formulario, sino como ceremonia: una pieza sellada que el tiempo os devolvera cuando ya mireis este momento con otra luz.",
    ceremonyHint:
      "Dentro de una sola capsula podeis mezclar carta, audio, promesa, imagen, mini canvas o pequenos simbolos del presente.",
    symbolicPrompt:
      "Cuando la selleis, la app deberia sugerir tambien un gesto fisico: una cajita, un sobre, una flor seca o una nota manuscrita con fecha de apertura.",
    objectIdeas: [
      "Una carta para vuestro yo futuro",
      "Una promesa que quereis recordar",
      "Una prediccion sobre lo que vendra",
      "Una foto muy pequena pero decisiva",
      "Un audio con vuestra voz de hoy",
      "Un simbolo o mini objeto que solo vosotras entendeis",
    ],
    openingEyebrow: "Apertura",
    openingTitle: "El sello por fin se rompe",
    openingDescription:
      "Aqui no deberia sentirse un CRUD. Primero aparece la capsula, luego el sello, y despues las piezas una a una, como si el tiempo las devolviera despacio.",
  },
};

function normalizeText(value: unknown, fallback: string) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalizeMonth(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(12, Math.max(1, Math.round(parsed)));
}

function normalizeAnnualTreeNarratives(value: unknown, fallback: AnnualTreeNarrativeCopy[]) {
  const fallbackByKey = new Map(fallback.map((entry) => [entry.key, entry] as const));
  const candidateRows = Array.isArray(value) ? value : [];
  const candidateByKey = new Map<AnnualTreeNarrativeKey, Partial<AnnualTreeNarrativeCopy>>();

  for (const row of candidateRows) {
    if (!row || typeof row !== "object") continue;
    const key = String((row as { key?: unknown }).key ?? "").trim() as AnnualTreeNarrativeKey;
    if (!fallbackByKey.has(key)) continue;
    candidateByKey.set(key, row as Partial<AnnualTreeNarrativeCopy>);
  }

  return fallback.map((entry) => {
    const candidate = candidateByKey.get(entry.key);
    return {
      key: entry.key,
      eyebrow: normalizeText(candidate?.eyebrow, entry.eyebrow),
      title: normalizeText(candidate?.title, entry.title),
      body: normalizeText(candidate?.body, entry.body),
    } satisfies AnnualTreeNarrativeCopy;
  });
}

function normalizeStringList(value: unknown, fallback: string[]) {
  if (Array.isArray(value)) {
    const list = value.map((entry) => String(entry ?? "").trim()).filter(Boolean);
    return list.length ? list : fallback;
  }
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  const list = text
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return list.length ? list : fallback;
}

function metadataObject(row: CatalogItemRow | undefined) {
  return row?.metadata && typeof row.metadata === "object" ? row.metadata : {};
}

export function normalizeFutureMomentsConfig(
  input: FutureMomentsConfigDraft | null | undefined,
): FutureMomentsConfig {
  const tree: Partial<FutureMomentsTreeConfig> = input?.tree ?? {};
  const capsule: Partial<FutureMomentsCapsuleConfig> = input?.capsule ?? {};

  return {
    tree: {
      plantingEyebrow: normalizeText(
        tree.plantingEyebrow,
        DEFAULT_FUTURE_MOMENTS_CONFIG.tree.plantingEyebrow,
      ),
      plantingIntro: normalizeText(
        tree.plantingIntro,
        DEFAULT_FUTURE_MOMENTS_CONFIG.tree.plantingIntro,
      ),
      plantingLocationHint: normalizeText(
        tree.plantingLocationHint,
        DEFAULT_FUTURE_MOMENTS_CONFIG.tree.plantingLocationHint,
      ),
      plantingNotesHint: normalizeText(
        tree.plantingNotesHint,
        DEFAULT_FUTURE_MOMENTS_CONFIG.tree.plantingNotesHint,
      ),
      anniversaryEyebrow: normalizeText(
        tree.anniversaryEyebrow,
        DEFAULT_FUTURE_MOMENTS_CONFIG.tree.anniversaryEyebrow,
      ),
      anniversaryIntro: normalizeText(
        tree.anniversaryIntro,
        DEFAULT_FUTURE_MOMENTS_CONFIG.tree.anniversaryIntro,
      ),
      anniversaryLocationHint: normalizeText(
        tree.anniversaryLocationHint,
        DEFAULT_FUTURE_MOMENTS_CONFIG.tree.anniversaryLocationHint,
      ),
      anniversaryNotesHint: normalizeText(
        tree.anniversaryNotesHint,
        DEFAULT_FUTURE_MOMENTS_CONFIG.tree.anniversaryNotesHint,
      ),
      narratives: normalizeAnnualTreeNarratives(
        tree.narratives,
        DEFAULT_FUTURE_MOMENTS_CONFIG.tree.narratives,
      ),
    },
    capsule: {
      annualPromptStartMonth: normalizeMonth(
        capsule.annualPromptStartMonth,
        DEFAULT_FUTURE_MOMENTS_CONFIG.capsule.annualPromptStartMonth,
      ),
      heroEyebrow: normalizeText(
        capsule.heroEyebrow,
        DEFAULT_FUTURE_MOMENTS_CONFIG.capsule.heroEyebrow,
      ),
      heroTitle: normalizeText(
        capsule.heroTitle,
        DEFAULT_FUTURE_MOMENTS_CONFIG.capsule.heroTitle,
      ),
      heroDescription: normalizeText(
        capsule.heroDescription,
        DEFAULT_FUTURE_MOMENTS_CONFIG.capsule.heroDescription,
      ),
      ceremonyHint: normalizeText(
        capsule.ceremonyHint,
        DEFAULT_FUTURE_MOMENTS_CONFIG.capsule.ceremonyHint,
      ),
      symbolicPrompt: normalizeText(
        capsule.symbolicPrompt,
        DEFAULT_FUTURE_MOMENTS_CONFIG.capsule.symbolicPrompt,
      ),
      objectIdeas: normalizeStringList(
        capsule.objectIdeas,
        DEFAULT_FUTURE_MOMENTS_CONFIG.capsule.objectIdeas,
      ),
      openingEyebrow: normalizeText(
        capsule.openingEyebrow,
        DEFAULT_FUTURE_MOMENTS_CONFIG.capsule.openingEyebrow,
      ),
      openingTitle: normalizeText(
        capsule.openingTitle,
        DEFAULT_FUTURE_MOMENTS_CONFIG.capsule.openingTitle,
      ),
      openingDescription: normalizeText(
        capsule.openingDescription,
        DEFAULT_FUTURE_MOMENTS_CONFIG.capsule.openingDescription,
      ),
    },
  };
}

function parseFutureMomentsRows(rows: CatalogItemRow[]) {
  const rowByCode = new Map(
    rows
      .map((row) => [String(row.code ?? "").trim().toLowerCase(), row] as const)
      .filter(([code]) => code.length > 0),
  );

  const treeMeta = metadataObject(rowByCode.get("annual_tree"));
  const capsuleMeta = metadataObject(rowByCode.get("time_capsule"));

  return normalizeFutureMomentsConfig({
    tree: {
      plantingEyebrow: treeMeta.planting_eyebrow as string | undefined,
      plantingIntro: treeMeta.planting_intro as string | undefined,
      plantingLocationHint: treeMeta.planting_location_hint as string | undefined,
      plantingNotesHint: treeMeta.planting_notes_hint as string | undefined,
      anniversaryEyebrow: treeMeta.anniversary_eyebrow as string | undefined,
      anniversaryIntro: treeMeta.anniversary_intro as string | undefined,
      anniversaryLocationHint: treeMeta.anniversary_location_hint as string | undefined,
      anniversaryNotesHint: treeMeta.anniversary_notes_hint as string | undefined,
      narratives: treeMeta.narratives as AnnualTreeNarrativeCopy[] | undefined,
    },
    capsule: {
      annualPromptStartMonth: capsuleMeta.annual_prompt_start_month as number | undefined,
      heroEyebrow: capsuleMeta.hero_eyebrow as string | undefined,
      heroTitle: capsuleMeta.hero_title as string | undefined,
      heroDescription: capsuleMeta.hero_description as string | undefined,
      ceremonyHint: capsuleMeta.ceremony_hint as string | undefined,
      symbolicPrompt: capsuleMeta.symbolic_prompt as string | undefined,
      objectIdeas: capsuleMeta.object_ideas as string[] | undefined,
      openingEyebrow: capsuleMeta.opening_eyebrow as string | undefined,
      openingTitle: capsuleMeta.opening_title as string | undefined,
      openingDescription: capsuleMeta.opening_description as string | undefined,
    },
  });
}

export async function getFutureMomentsConfig(): Promise<FutureMomentsConfig> {
  try {
    const { data, error } = await supabase
      .from("catalog_items")
      .select("code,metadata")
      .eq("catalog_key", FUTURE_MOMENTS_CATALOG_KEY)
      .eq("enabled", true)
      .order("sort_order", { ascending: true })
      .order("code", { ascending: true });

    if (error) return DEFAULT_FUTURE_MOMENTS_CONFIG;
    const rows = (data as CatalogItemRow[] | null) ?? [];
    if (!rows.length) return DEFAULT_FUTURE_MOMENTS_CONFIG;
    return parseFutureMomentsRows(rows);
  } catch {
    return DEFAULT_FUTURE_MOMENTS_CONFIG;
  }
}

export function getFutureMomentsCatalogRows(config: FutureMomentsConfig) {
  const normalized = normalizeFutureMomentsConfig(config);
  return [
    {
      catalog_key: FUTURE_MOMENTS_CATALOG_KEY,
      code: "annual_tree",
      label: "Arbol real",
      sort_order: 10,
      enabled: true,
      color: "#d8e6cf",
      icon: null,
      metadata: {
        planting_eyebrow: normalized.tree.plantingEyebrow,
        planting_intro: normalized.tree.plantingIntro,
        planting_location_hint: normalized.tree.plantingLocationHint,
        planting_notes_hint: normalized.tree.plantingNotesHint,
        anniversary_eyebrow: normalized.tree.anniversaryEyebrow,
        anniversary_intro: normalized.tree.anniversaryIntro,
        anniversary_location_hint: normalized.tree.anniversaryLocationHint,
        anniversary_notes_hint: normalized.tree.anniversaryNotesHint,
        narratives: normalized.tree.narratives,
      },
    },
    {
      catalog_key: FUTURE_MOMENTS_CATALOG_KEY,
      code: "time_capsule",
      label: "Capsula anual",
      sort_order: 20,
      enabled: true,
      color: "#d9cdec",
      icon: null,
      metadata: {
        annual_prompt_start_month: normalized.capsule.annualPromptStartMonth,
        hero_eyebrow: normalized.capsule.heroEyebrow,
        hero_title: normalized.capsule.heroTitle,
        hero_description: normalized.capsule.heroDescription,
        ceremony_hint: normalized.capsule.ceremonyHint,
        symbolic_prompt: normalized.capsule.symbolicPrompt,
        object_ideas: normalized.capsule.objectIdeas,
        opening_eyebrow: normalized.capsule.openingEyebrow,
        opening_title: normalized.capsule.openingTitle,
        opening_description: normalized.capsule.openingDescription,
      },
    },
  ];
}

export function isAnnualCapsulePromptSeason(
  date = new Date(),
  startMonth = ANNUAL_CAPSULE_PROMPT_START_MONTH,
) {
  return date.getMonth() + 1 >= startMonth;
}

export function getDueAnnualTreeReminderYears(
  plantedAt: string | null | undefined,
  now = new Date(),
) {
  if (!plantedAt) return [] as AnnualTreeReminderYear[];
  const plantedDate = new Date(plantedAt);
  if (Number.isNaN(plantedDate.getTime())) return [] as AnnualTreeReminderYear[];

  return ANNUAL_TREE_REMINDER_YEARS.filter((year) => {
    const target = new Date(plantedDate);
    target.setFullYear(target.getFullYear() + year);
    return target.getTime() <= now.getTime();
  });
}

export function getLatestPendingAnnualTreeReminderYear(input: {
  plantedAt: string | null | undefined;
  completedYears: number[];
  now?: Date;
}) {
  const dueYears = getDueAnnualTreeReminderYears(input.plantedAt, input.now ?? new Date());
  const completed = new Set(input.completedYears);
  const pending = dueYears.filter((year) => !completed.has(year));
  return pending.length ? pending[pending.length - 1] : null;
}
