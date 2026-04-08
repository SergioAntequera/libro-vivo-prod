import {
  ritualActivityMessage,
  type AnnualTreeRitualRow,
  type AnnualTreeRitualStatus,
} from "@/lib/annualTreeRitual";

export type AnnualTreeNarrativeKey =
  | "seedling"
  | "rooting"
  | "story"
  | "ritual"
  | "mature"
  | "celebration";

export type AnnualTreeNarrativeCopy = {
  key: AnnualTreeNarrativeKey;
  eyebrow: string;
  title: string;
  body: string;
};

export type ResolvedAnnualTreeNarrative = {
  key: AnnualTreeNarrativeKey;
  eyebrow: string;
  title: string;
  body: string;
  milestoneStage: number | null;
  showRitualAction: boolean;
  actionLabel: string | null;
  isRitualNarrative: boolean;
  ritualStatus: AnnualTreeRitualStatus | null;
};

export const ANNUAL_TREE_NARRATIVE_RANGES: Array<{
  key: AnnualTreeNarrativeKey;
  minStage: number;
  maxStage: number;
  milestoneStage: number | null;
}> = [
  { key: "seedling", minStage: 0, maxStage: 9, milestoneStage: null },
  { key: "rooting", minStage: 10, maxStage: 24, milestoneStage: 10 },
  { key: "story", minStage: 25, maxStage: 49, milestoneStage: 25 },
  { key: "ritual", minStage: 50, maxStage: 74, milestoneStage: 50 },
  { key: "mature", minStage: 75, maxStage: 99, milestoneStage: 75 },
  { key: "celebration", minStage: 100, maxStage: 100, milestoneStage: 100 },
];

export const ANNUAL_TREE_NARRATIVE_EDITOR_META: Array<{
  key: AnnualTreeNarrativeKey;
  rangeLabel: string;
  title: string;
  description: string;
}> = [
  {
    key: "seedling",
    rangeLabel: "0-9",
    title: "Arranque del año",
    description: "Cuando el arbol apenas despierta y todavia solo hay primeras senales.",
  },
  {
    key: "rooting",
    rangeLabel: "10-24",
    title: "Raices visibles",
    description: "Cuando el arbol ya deja de sentirse promesa y empieza a coger forma.",
  },
  {
    key: "story",
    rangeLabel: "25-49",
    title: "Historia sostenida",
    description: "Cuando el año ya tiene cuerpo narrativo y suficiente peso propio.",
  },
  {
    key: "ritual",
    rangeLabel: "50-74",
    title: "Umbral del ritual",
    description: "Cuando el arbol puede abrir el ritual anual en el mundo real.",
  },
  {
    key: "mature",
    rangeLabel: "75-99",
    title: "Madurez fuerte",
    description: "Cuando el año ya respira con mucha fuerza y el ritual gana peso ceremonial.",
  },
  {
    key: "celebration",
    rangeLabel: "100",
    title: "Celebracion",
    description: "Cuando el arbol alcanza plenitud y merece un cierre de enhorabuena.",
  },
];

export const DEFAULT_ANNUAL_TREE_NARRATIVES: AnnualTreeNarrativeCopy[] = [
  {
    key: "seedling",
    eyebrow: "El año empieza",
    title: "El arbol apenas despierta",
    body:
      "Todavia esta reuniendo primeras flores y ritmo. Lo importante aqui no es correr, sino dejar que el año empiece a coger verdad.",
  },
  {
    key: "rooting",
    eyebrow: "Ya hay raices",
    title: "El año empieza a coger forma",
    body:
      "El arbol ya no es solo una promesa. Hay suficiente base para notar que este año empieza a sostenerse de verdad.",
  },
  {
    key: "story",
    eyebrow: "La historia se sostiene",
    title: "El arbol ya tiene cuerpo",
    body:
      "Ya hay una historia compartida reconocible. Seguid cuidando el ritmo del año para que el arbol gane peso propio.",
  },
  {
    key: "ritual",
    eyebrow: "Ritual disponible",
    title: "El arbol ya puede plantarse",
    body:
      "Este año ya ha reunido suficiente verdad para dar el salto al mundo real. Si quereis, ya podeis registrar el ritual del arbol.",
  },
  {
    key: "mature",
    eyebrow: "Casi completo",
    title: "El arbol respira con fuerza",
    body:
      "El año ya se siente maduro. Si el ritual sigue pendiente, este es un momento muy bueno para dejarle una huella mas ceremonial.",
  },
  {
    key: "celebration",
    eyebrow: "Enhorabuena",
    title: "Habeis llevado este arbol a su plenitud",
    body:
      "Este año deja una huella completa. Si el ritual aun no se ha registrado, ahora merece un cierre a la altura de todo lo vivido.",
  },
];

function clampStage(stage: number) {
  if (!Number.isFinite(stage)) return 0;
  return Math.max(0, Math.min(100, Math.round(stage)));
}

function narrativeMap(entries: AnnualTreeNarrativeCopy[]) {
  return new Map(entries.map((entry) => [entry.key, entry] as const));
}

export function resolveAnnualTreeNarrativeRange(stage: number) {
  const safeStage = clampStage(stage);
  return (
    ANNUAL_TREE_NARRATIVE_RANGES.find(
      (range) => safeStage >= range.minStage && safeStage <= range.maxStage,
    ) ?? ANNUAL_TREE_NARRATIVE_RANGES[0]
  );
}

export function resolveAnnualTreeNarrativeCopy(
  stage: number,
  entries: AnnualTreeNarrativeCopy[],
) {
  const range = resolveAnnualTreeNarrativeRange(stage);
  const map = narrativeMap(entries);
  return (
    map.get(range.key) ??
    DEFAULT_ANNUAL_TREE_NARRATIVES.find((entry) => entry.key === range.key)!
  );
}

export function resolveAnnualTreeNarrative(input: {
  year: number;
  stage: number;
  ritual: AnnualTreeRitualRow | null;
  entries: AnnualTreeNarrativeCopy[];
}): ResolvedAnnualTreeNarrative {
  const range = resolveAnnualTreeNarrativeRange(input.stage);
  const copy = resolveAnnualTreeNarrativeCopy(input.stage, input.entries);

  if (input.ritual && range.key === "ritual") {
    return {
      key: range.key,
      eyebrow: "Ritual del arbol registrado",
      title:
        input.ritual.status === "confirmed"
          ? `El arbol de ${input.year} ya esta confirmado`
          : `El arbol de ${input.year} ya esta plantado`,
      body: ritualActivityMessage(input.year, input.ritual.status),
      milestoneStage: range.milestoneStage,
      showRitualAction: true,
      actionLabel: "Ver ritual",
      isRitualNarrative: true,
      ritualStatus: input.ritual.status,
    };
  }

  return {
    key: range.key,
    eyebrow: copy.eyebrow,
    title: copy.title,
    body: copy.body,
    milestoneStage: range.milestoneStage,
    showRitualAction: input.stage >= 50,
    actionLabel: input.stage >= 50 ? (input.ritual ? "Ver ritual" : "Abrir ritual") : null,
    isRitualNarrative: false,
    ritualStatus: input.ritual?.status ?? null,
  };
}

export function resolveAnnualTreeMilestoneStage(stage: number) {
  const safeStage = clampStage(stage);
  const milestones = ANNUAL_TREE_NARRATIVE_RANGES.map((range) => range.milestoneStage).filter(
    (value): value is number => typeof value === "number",
  );
  return milestones.filter((value) => safeStage >= value).at(-1) ?? null;
}

export function annualTreeMilestoneStorageKey(input: {
  profileId: string | null | undefined;
  gardenId: string | null | undefined;
  year: number;
  milestoneStage: number;
}) {
  const profileId = String(input.profileId ?? "").trim();
  const gardenId = String(input.gardenId ?? "").trim();
  if (!profileId || !gardenId) return null;
  return `lv.annual-tree.milestone.v1:${gardenId}:${profileId}:${input.year}:${input.milestoneStage}`;
}
