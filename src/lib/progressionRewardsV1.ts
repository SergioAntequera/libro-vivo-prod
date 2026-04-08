import type {
  ProgressionRewardKind,
  ProgressionRewardTemplate,
} from "@/lib/progressionBlueprintCatalog";

type RewardFamilySeed = {
  id: string;
  label: string;
  tone: string;
  referencePrefix: string;
};

const REWARD_FAMILIES_V1: RewardFamilySeed[] = [
  { id: "origen", label: "Inicio compartido", tone: "fundacional", referencePrefix: "origin" },
  { id: "hogar", label: "Hogar", tone: "de abrigo", referencePrefix: "home" },
  { id: "agua", label: "Agua", tone: "sereno", referencePrefix: "water" },
  { id: "sendero", label: "Paseo y sendero", tone: "de camino", referencePrefix: "trail" },
  { id: "bosque", label: "Bosque", tone: "organico", referencePrefix: "forest" },
  { id: "celebracion", label: "Celebracion", tone: "luminoso", referencePrefix: "celebration" },
  { id: "noche", label: "Noche e intimidad", tone: "intimo", referencePrefix: "night" },
  { id: "promesa", label: "Promesa", tone: "de futuro", referencePrefix: "future" },
  { id: "estacion", label: "Estacion", tone: "de temporada", referencePrefix: "season" },
  { id: "editorial", label: "Editorial", tone: "de libro", referencePrefix: "editorial" },
];

const REWARD_VARIANTS_V1: Array<{
  id: string;
  kind: ProgressionRewardKind;
  title: string;
  description: string;
  referenceSuffix: string;
  payloadSeed: (family: RewardFamilySeed) => Record<string, unknown>;
}> = [
  {
    id: "message_letter",
    kind: "message",
    title: "Carta del recorrido",
    description: "Desbloquea una carta breve para celebrar el hito y dejarle una huella emocional propia.",
    referenceSuffix: "message-letter",
    payloadSeed: (family) => ({
      text: `Carta ${family.tone} para ${family.label.toLowerCase()}.`,
    }),
  },
  {
    id: "gift_ritual",
    kind: "gift",
    title: "Ritual sugerido",
    description: "Desbloquea una idea bonita y accionable para seguir dando vida al jardin despues del hito.",
    referenceSuffix: "gift-ritual",
    payloadSeed: (family) => ({
      description: `Idea de ritual ${family.tone} para volver a ${family.label.toLowerCase()}.`,
      ctaLabel: "Abrir planes",
      surface: "plans",
    }),
  },
  {
    id: "sticker_constellation",
    kind: "sticker_pack",
    title: "Pack creativo",
    description: "Activa un pequeno set visual para expresar mejor este tipo de hito en canvas o pagina.",
    referenceSuffix: "stickers",
    payloadSeed: (family) => ({
      packName: `Pack ${family.label}`,
      stickers: [`${family.referencePrefix}_spark`, `${family.referencePrefix}_leaf`, `${family.referencePrefix}_trace`],
    }),
  },
  {
    id: "canvas_tool",
    kind: "canvas_tool",
    title: "Objeto simbolico",
    description: "Anade un recurso visual con peso simbolico para enriquecer el lienzo.",
    referenceSuffix: "canvas-tool",
    payloadSeed: (family) => ({
      toolKey: `${family.referencePrefix}_symbol`,
      unlock: "canvas_tool",
    }),
  },
  {
    id: "canvas_template",
    kind: "canvas_template",
    title: "Composicion guiada",
    description: "Desbloquea una composicion reutilizable para construir paginas con mas riqueza.",
    referenceSuffix: "canvas-template",
    payloadSeed: (family) => ({
      templateKey: `${family.referencePrefix}_spread`,
      unlock: "canvas_template",
    }),
  },
  {
    id: "canvas_effect",
    kind: "canvas_effect",
    title: "Capa del bosque",
    description: "Activa una atmosfera visual nueva para que ciertas memorias respiren distinto.",
    referenceSuffix: "canvas-effect",
    payloadSeed: (family) => ({
      effectKey: `${family.referencePrefix}_glow`,
      unlock: "canvas_effect",
    }),
  },
  {
    id: "page_frame",
    kind: "page_frame",
    title: "Marco especial",
    description: "Anade un marco o envolvente visual para momentos destacados.",
    referenceSuffix: "page-frame",
    payloadSeed: (family) => ({
      frameKey: `${family.referencePrefix}_frame`,
      unlock: "page_frame",
    }),
  },
  {
    id: "page_background",
    kind: "page_background",
    title: "Fondo vivo",
    description: "Desbloquea un fondo ambiental para memorias con personalidad propia.",
    referenceSuffix: "page-background",
    payloadSeed: (family) => ({
      backgroundKey: `${family.referencePrefix}_background`,
      unlock: "page_background",
    }),
  },
  {
    id: "year_chapter",
    kind: "year_chapter",
    title: "Capitulo anual",
    description: "Abre una capa editorial visible dentro del recorrido anual.",
    referenceSuffix: "year-chapter",
    payloadSeed: (family) => ({
      chapterKey: `${family.referencePrefix}_year_detail`,
      unlock: "year_chapter",
    }),
  },
  {
    id: "pdf_detail",
    kind: "pdf_detail",
    title: "Detalle del libro",
    description: "Desbloquea un recurso de maquetacion o acabado para el libro exportado.",
    referenceSuffix: "pdf-detail",
    payloadSeed: (family) => ({
      pdfKey: `${family.referencePrefix}_pdf_detail`,
      unlock: "pdf_detail",
    }),
  },
];

export const PROGRESSION_REWARD_TEMPLATES_V1: ProgressionRewardTemplate[] =
  REWARD_FAMILIES_V1.flatMap((family) =>
    REWARD_VARIANTS_V1.map((variant) => ({
      id: `${family.id}_${variant.id}`,
      familyId: family.id,
      familyLabel: family.label,
      kind: variant.kind,
      title: `${variant.title} - ${family.label}`,
      description: `${variant.description} Mantiene el tono de ${family.label.toLowerCase()} dentro del proyecto.`,
      referenceHint: `${family.referencePrefix}_${variant.referenceSuffix}`,
      payloadSeed: variant.payloadSeed(family),
    })),
  );

export const PROGRESSION_REWARD_KIND_LABELS_V1: Record<ProgressionRewardKind, string> = {
  message: "Carta",
  gift: "Ritual",
  sticker_pack: "Pack creativo",
  canvas_tool: "Objeto simbolico",
  canvas_template: "Composicion",
  canvas_effect: "Capa del bosque",
  page_frame: "Marco especial",
  page_background: "Fondo vivo",
  year_chapter: "Capitulo anual",
  pdf_detail: "Detalle del libro",
};
