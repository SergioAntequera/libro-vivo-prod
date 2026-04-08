import { supabase } from "@/lib/supabase";

export const FLOWER_REFLECTION_GROUP_IDS = ["memory", "meaning", "bond"] as const;
export type FlowerReflectionGroupId = (typeof FLOWER_REFLECTION_GROUP_IDS)[number];

export const FLOWER_REFLECTION_FIELD_IDS = [
  "favoritePart",
  "rememberedMoment",
  "whatIFelt",
  "whatItMeantToMe",
  "whatIDiscoveredAboutYou",
  "smallPromise",
] as const;
export type FlowerReflectionFieldId = (typeof FLOWER_REFLECTION_FIELD_IDS)[number];

export const FLOWER_TEXT_SECTION_IDS = [
  "reflections",
  "context_summary",
  "location",
  "audio",
  "video",
] as const;
export type FlowerTextSectionId = (typeof FLOWER_TEXT_SECTION_IDS)[number];

export const FLOWER_TEXT_SECTION_LABELS: Record<FlowerTextSectionId, string> = {
  reflections: "Miradas",
  context_summary: "Resumen de contexto",
  location: "Lugar",
  audio: "Audio",
  video: "Video",
};

export const FLOWER_UI_TEXT_KEYS = [
  "reflections_eyebrow",
  "reflections_title",
  "reflections_description_read",
  "reflections_description_edit",
  "reflections_tab_mine",
  "reflections_progress_template",
  "reflections_unavailable",
  "reflections_empty_mine",
  "reflections_empty_other",
  "context_summary_eyebrow",
  "context_summary_title",
  "context_summary_description",
  "context_summary_cta",
  "context_summary_place_label",
  "context_summary_place_title_empty",
  "context_summary_place_desc_has",
  "context_summary_place_desc_empty",
  "context_summary_audio_label",
  "context_summary_audio_title_has",
  "context_summary_audio_title_empty",
  "context_summary_audio_desc_has",
  "context_summary_audio_desc_empty",
  "context_summary_video_label",
  "context_summary_video_title_template",
  "context_summary_video_title_empty",
  "context_summary_video_desc_has",
  "context_summary_video_desc_empty",
  "location_eyebrow",
  "location_title_has",
  "location_title_empty",
  "location_value_empty",
  "location_desc_has",
  "location_desc_empty",
  "location_picker_hint",
  "location_picker_cta_empty",
  "location_picker_cta_has",
  "location_clear_cta",
  "audio_eyebrow",
  "audio_title",
  "audio_summary_has_label",
  "audio_summary_empty",
  "audio_hint_has",
  "audio_hint_empty",
  "audio_toggle_cta_empty",
  "audio_toggle_cta_has",
  "audio_toggle_cta_hide",
  "audio_clear_cta",
  "audio_label_placeholder",
  "audio_record_cta",
  "audio_recording_cta",
  "audio_stop_cta",
  "audio_external_cta",
  "audio_browser_fallback",
  "audio_upload_status_hint",
  "video_eyebrow",
  "video_title",
  "video_summary_with_count",
  "video_summary_empty",
  "video_hint",
  "video_cta_empty",
  "video_cta_has",
] as const;
export type FlowerUiTextKey = (typeof FLOWER_UI_TEXT_KEYS)[number];

export type FlowerReflectionFieldConfig = {
  id: FlowerReflectionFieldId;
  label: string;
  sortOrder: number;
  enabled: boolean;
  groupId: FlowerReflectionGroupId;
  groupTitle: string;
  groupDescription: string;
  placeholder: string;
  rows: number;
};

export type FlowerReflectionGroupConfig = {
  id: FlowerReflectionGroupId;
  title: string;
  description: string;
  fields: FlowerReflectionFieldConfig[];
};

export type FlowerUiTextDefinition = {
  key: FlowerUiTextKey;
  label: string;
  section: FlowerTextSectionId;
  sortOrder: number;
  defaultValue: string;
  help?: string;
};

export type FlowerUiTextItem = FlowerUiTextDefinition & {
  text: string;
  enabled: boolean;
};

export type FlowerRuntimeConfig = {
  reflectionFields: FlowerReflectionFieldConfig[];
  texts: Record<FlowerUiTextKey, FlowerUiTextItem>;
};

type CatalogItemRow = {
  catalog_key: string | null;
  code: string | null;
  label: string | null;
  sort_order: number | null;
  enabled: boolean | null;
  metadata: Record<string, unknown> | null;
};

const FLOWER_REFLECTION_FALLBACK: FlowerReflectionFieldConfig[] = [
  {
    id: "favoritePart",
    label: "Mi parte favorita",
    sortOrder: 10,
    enabled: true,
    groupId: "memory",
    groupTitle: "Lo que más recuerdas",
    groupDescription: "Dos ideas cortas para atrapar la escena.",
    placeholder: "Ese detalle al que volverias siempre.",
    rows: 3,
  },
  {
    id: "rememberedMoment",
    label: "El momento que más recuerdo",
    sortOrder: 20,
    enabled: true,
    groupId: "memory",
    groupTitle: "Lo que más recuerdas",
    groupDescription: "Dos ideas cortas para atrapar la escena.",
    placeholder: "La escena que se te quedo grabada.",
    rows: 3,
  },
  {
    id: "whatIFelt",
    label: "Lo que senti",
    sortOrder: 30,
    enabled: true,
    groupId: "meaning",
    groupTitle: "Lo que te dejo",
    groupDescription: "Como lo viviste y que peso tuvo para ti.",
    placeholder: "Como lo viviste por dentro.",
    rows: 4,
  },
  {
    id: "whatItMeantToMe",
    label: "Lo que significo para mi",
    sortOrder: 40,
    enabled: true,
    groupId: "meaning",
    groupTitle: "Lo que te dejo",
    groupDescription: "Como lo viviste y que peso tuvo para ti.",
    placeholder: "Que lugar ocupa este recuerdo en vuestra historia.",
    rows: 4,
  },
  {
    id: "whatIDiscoveredAboutYou",
    label: "Algo que descubri de ti",
    sortOrder: 50,
    enabled: true,
    groupId: "bond",
    groupTitle: "Lo que nace de aquí",
    groupDescription: "Una mirada hacia la otra persona y hacia lo que queréis cuidar.",
    placeholder: "Una cosa bonita o sorprendente que viste en la otra persona.",
    rows: 3,
  },
  {
    id: "smallPromise",
    label: "Pequena promesa",
    sortOrder: 60,
    enabled: true,
    groupId: "bond",
    groupTitle: "Lo que nace de aquí",
    groupDescription: "Una mirada hacia la otra persona y hacia lo que queréis cuidar.",
    placeholder: "Algo sencillo que te gustaria cuidar o repetir.",
    rows: 3,
  },
];

export const FLOWER_UI_TEXT_DEFINITIONS: FlowerUiTextDefinition[] = [
  {
    key: "reflections_eyebrow",
    label: "Eyebrow",
    section: "reflections",
    sortOrder: 10,
    defaultValue: "Miradas",
  },
  {
    key: "reflections_title",
    label: "Título",
    section: "reflections",
    sortOrder: 20,
    defaultValue: "Lo que dejo este recuerdo en cada uno",
  },
  {
    key: "reflections_description_read",
    label: "Descripción lectura",
    section: "reflections",
    sortOrder: 30,
    defaultValue:
      "Aquí lees la parte más personal de la flor, separada del lienzo y del resto del contexto.",
  },
  {
    key: "reflections_description_edit",
    label: "Descripción edición",
    section: "reflections",
    sortOrder: 40,
    defaultValue:
      "Aquí puede vivir vuestra parte más personal, sin pelear con el lienzo ni con el resto del contexto.",
  },
  {
    key: "reflections_tab_mine",
    label: "Tab propia",
    section: "reflections",
    sortOrder: 50,
    defaultValue: "Tu mirada",
  },
  {
    key: "reflections_progress_template",
    label: "Progreso",
    section: "reflections",
    sortOrder: 60,
    defaultValue: "{count}/{total} ideas escritas",
    help: "Puedes usar {count} y {total}.",
  },
  {
    key: "reflections_unavailable",
    label: "Aviso sin schema",
    section: "reflections",
    sortOrder: 70,
    defaultValue:
      "Las reflexiones compartidas aún no estan disponibles en esta base de datos.",
  },
  {
    key: "reflections_empty_mine",
    label: "Vacio propio",
    section: "reflections",
    sortOrder: 80,
    defaultValue: "Tu mirada todavía esta vacía. Entra en editar cuando quieras escribirla.",
  },
  {
    key: "reflections_empty_other",
    label: "Vacio otra persona",
    section: "reflections",
    sortOrder: 90,
    defaultValue: "Cuando la otra persona escriba su mirada, aparecerá aquí.",
  },
  {
    key: "context_summary_eyebrow",
    label: "Eyebrow resumen",
    section: "context_summary",
    sortOrder: 100,
    defaultValue: "Contexto",
  },
  {
    key: "context_summary_title",
    label: "Título resumen",
    section: "context_summary",
    sortOrder: 110,
    defaultValue: "Lo que acompaña a la flor",
  },
  {
    key: "context_summary_description",
    label: "Descripción resumen",
    section: "context_summary",
    sortOrder: 120,
    defaultValue:
      "Lugar, audio y video quedan aparte para no pelear con la lectura principal del recuerdo.",
  },
  {
    key: "context_summary_cta",
    label: "CTA resumen",
    section: "context_summary",
    sortOrder: 130,
    defaultValue: "Editar contexto",
  },
  {
    key: "context_summary_place_label",
    label: "Label lugar",
    section: "context_summary",
    sortOrder: 140,
    defaultValue: "Lugar",
  },
  {
    key: "context_summary_place_title_empty",
    label: "Título lugar vacío",
    section: "context_summary",
    sortOrder: 150,
    defaultValue: "Aún sin lugar",
  },
  {
    key: "context_summary_place_desc_has",
    label: "Descripción lugar con dato",
    section: "context_summary",
    sortOrder: 160,
    defaultValue: "El recuerdo ya esta anclado a un sitio del mapa.",
  },
  {
    key: "context_summary_place_desc_empty",
    label: "Descripción lugar vacío",
    section: "context_summary",
    sortOrder: 170,
    defaultValue: "Puedes asociar un lugar cuando quieras completar mejor la memoria.",
  },
  {
    key: "context_summary_audio_label",
    label: "Label audio",
    section: "context_summary",
    sortOrder: 180,
    defaultValue: "Audio",
  },
  {
    key: "context_summary_audio_title_has",
    label: "Título audio con dato",
    section: "context_summary",
    sortOrder: 190,
    defaultValue: "Audio asociado",
  },
  {
    key: "context_summary_audio_title_empty",
    label: "Título audio vacío",
    section: "context_summary",
    sortOrder: 200,
    defaultValue: "Sin audio",
  },
  {
    key: "context_summary_audio_desc_has",
    label: "Descripción audio con dato",
    section: "context_summary",
    sortOrder: 210,
    defaultValue: "La flor ya guarda una voz o sonido del momento.",
  },
  {
    key: "context_summary_audio_desc_empty",
    label: "Descripción audio vacío",
    section: "context_summary",
    sortOrder: 220,
    defaultValue: "Si queréis, podéis añadir una nota de voz o un audio externo.",
  },
  {
    key: "context_summary_video_label",
    label: "Label video",
    section: "context_summary",
    sortOrder: 230,
    defaultValue: "Video",
  },
  {
    key: "context_summary_video_title_template",
    label: "Título video con conteo",
    section: "context_summary",
    sortOrder: 240,
    defaultValue: "{count} video(s) en el lienzo",
    help: "Puedes usar {count}.",
  },
  {
    key: "context_summary_video_title_empty",
    label: "Título video vacío",
    section: "context_summary",
    sortOrder: 250,
    defaultValue: "Sin video",
  },
  {
    key: "context_summary_video_desc_has",
    label: "Descripción video con dato",
    section: "context_summary",
    sortOrder: 260,
    defaultValue: "La flor ya tiene video dentro del lienzo compartido.",
  },
  {
    key: "context_summary_video_desc_empty",
    label: "Descripción video vacío",
    section: "context_summary",
    sortOrder: 270,
    defaultValue: "Si el recuerdo lo pide, podéis añadir video más adelante.",
  },
  {
    key: "location_eyebrow",
    label: "Eyebrow lugar",
    section: "location",
    sortOrder: 280,
    defaultValue: "Lugar",
  },
  {
    key: "location_title_has",
    label: "Título lugar con dato",
    section: "location",
    sortOrder: 290,
    defaultValue: "Lugar asociado al recuerdo",
  },
  {
    key: "location_title_empty",
    label: "Título lugar vacío",
    section: "location",
    sortOrder: 300,
    defaultValue: "Aún sin lugar",
  },
  {
    key: "location_value_empty",
    label: "Valor vacío",
    section: "location",
    sortOrder: 310,
    defaultValue: "Sin lugar seleccionado",
  },
  {
    key: "location_desc_has",
    label: "Descripción con dato",
    section: "location",
    sortOrder: 320,
    defaultValue: "Queda guardado dentro del recuerdo y conectado al mapa vivo.",
  },
  {
    key: "location_desc_empty",
    label: "Descripción vacía",
    section: "location",
    sortOrder: 330,
    defaultValue:
      "Puedes usar un lugar ya guardado, buscarlo por calle y número en el mapa o marcar uno nuevo.",
  },
  {
    key: "location_picker_hint",
    label: "Hint mapa",
    section: "location",
    sortOrder: 340,
    defaultValue:
      "Abre el mapa vivo para elegir un sitio ya guardado, buscar una dirección concreta o marcar un punto nuevo sin salirte del recuerdo.",
  },
  {
    key: "location_picker_cta_empty",
    label: "CTA sin lugar",
    section: "location",
    sortOrder: 350,
    defaultValue: "Elegir, marcar o buscar en mapa",
  },
  {
    key: "location_picker_cta_has",
    label: "CTA con lugar",
    section: "location",
    sortOrder: 360,
    defaultValue: "Cambiar en mapa",
  },
  {
    key: "location_clear_cta",
    label: "CTA quitar",
    section: "location",
    sortOrder: 370,
    defaultValue: "Quitar ubicacion",
  },
  {
    key: "audio_eyebrow",
    label: "Eyebrow audio",
    section: "audio",
    sortOrder: 380,
    defaultValue: "Audio",
  },
  {
    key: "audio_title",
    label: "Título audio",
    section: "audio",
    sortOrder: 390,
    defaultValue: "Voz o sonido del recuerdo",
  },
  {
    key: "audio_summary_has_label",
    label: "Resumen con audio sin título",
    section: "audio",
    sortOrder: 400,
    defaultValue: "Audio del recuerdo",
  },
  {
    key: "audio_summary_empty",
    label: "Resumen sin audio",
    section: "audio",
    sortOrder: 410,
    defaultValue: "Sin audio asociado",
  },
  {
    key: "audio_hint_has",
    label: "Hint con audio",
    section: "audio",
    sortOrder: 420,
    defaultValue: "Puedes escucharlo, sustituirlo o quitarlo.",
  },
  {
    key: "audio_hint_empty",
    label: "Hint sin audio",
    section: "audio",
    sortOrder: 430,
    defaultValue: "Puedes grabar una nota de voz, subir un archivo o enlazar un audio externo.",
  },
  {
    key: "audio_toggle_cta_empty",
    label: "CTA abrir sin audio",
    section: "audio",
    sortOrder: 440,
    defaultValue: "Añadir audio",
  },
  {
    key: "audio_toggle_cta_has",
    label: "CTA abrir con audio",
    section: "audio",
    sortOrder: 450,
    defaultValue: "Editar audio",
  },
  {
    key: "audio_toggle_cta_hide",
    label: "CTA cerrar",
    section: "audio",
    sortOrder: 460,
    defaultValue: "Ocultar controles",
  },
  {
    key: "audio_clear_cta",
    label: "CTA quitar audio",
    section: "audio",
    sortOrder: 470,
    defaultValue: "Quitar audio",
  },
  {
    key: "audio_label_placeholder",
    label: "Placeholder título",
    section: "audio",
    sortOrder: 480,
    defaultValue: "Título del audio (opcional)",
  },
  {
    key: "audio_record_cta",
    label: "CTA grabar",
    section: "audio",
    sortOrder: 490,
    defaultValue: "Grabar audio",
  },
  {
    key: "audio_recording_cta",
    label: "CTA grabando",
    section: "audio",
    sortOrder: 500,
    defaultValue: "Grabando...",
  },
  {
    key: "audio_stop_cta",
    label: "CTA detener",
    section: "audio",
    sortOrder: 510,
    defaultValue: "Detener y guardar",
  },
  {
    key: "audio_external_cta",
    label: "CTA externa",
    section: "audio",
    sortOrder: 520,
    defaultValue: "URL externa",
  },
  {
    key: "audio_browser_fallback",
    label: "Fallback navegador",
    section: "audio",
    sortOrder: 530,
    defaultValue:
      "Grabacion directa no disponible en este navegador. Puedes subir un archivo.",
  },
  {
    key: "audio_upload_status_hint",
    label: "Hint de cola",
    section: "audio",
    sortOrder: 540,
    defaultValue: "El estado de audio se muestra arriba en el centro de subidas.",
  },
  {
    key: "video_eyebrow",
    label: "Eyebrow video",
    section: "video",
    sortOrder: 550,
    defaultValue: "Video",
  },
  {
    key: "video_title",
    label: "Título video",
    section: "video",
    sortOrder: 560,
    defaultValue: "Video dentro del lienzo",
  },
  {
    key: "video_summary_with_count",
    label: "Resumen con conteo",
    section: "video",
    sortOrder: 570,
    defaultValue: "{count} marco(s) de video en el lienzo",
    help: "Puedes usar {count}.",
  },
  {
    key: "video_summary_empty",
    label: "Resumen vacío",
    section: "video",
    sortOrder: 580,
    defaultValue: "Todavía no hay video en el lienzo",
  },
  {
    key: "video_hint",
    label: "Hint video",
    section: "video",
    sortOrder: 590,
    defaultValue: "El video se añade desde aquí, pero se coloca y se sube dentro del lienzo.",
  },
  {
    key: "video_cta_empty",
    label: "CTA sin video",
    section: "video",
    sortOrder: 600,
    defaultValue: "Añadir video al lienzo",
  },
  {
    key: "video_cta_has",
    label: "CTA con video",
    section: "video",
    sortOrder: 610,
    defaultValue: "Añadir otro video",
  },
];

const FLOWER_TEXT_DEFINITION_BY_KEY = FLOWER_UI_TEXT_DEFINITIONS.reduce(
  (acc, item) => {
    acc[item.key] = item;
    return acc;
  },
  {} as Record<FlowerUiTextKey, FlowerUiTextDefinition>,
);

function isFlowerReflectionFieldId(value: string): value is FlowerReflectionFieldId {
  return FLOWER_REFLECTION_FIELD_IDS.includes(value as FlowerReflectionFieldId);
}

function isFlowerReflectionGroupId(value: string): value is FlowerReflectionGroupId {
  return FLOWER_REFLECTION_GROUP_IDS.includes(value as FlowerReflectionGroupId);
}

function isFlowerUiTextKey(value: string): value is FlowerUiTextKey {
  return FLOWER_UI_TEXT_KEYS.includes(value as FlowerUiTextKey);
}

function metadataText(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function metadataNumber(metadata: Record<string, unknown> | null | undefined, key: string, fallback: number) {
  const value = metadata?.[key];
  return Number.isFinite(value) ? Number(value) : fallback;
}

export function getFallbackFlowerReflectionFields(): FlowerReflectionFieldConfig[] {
  return FLOWER_REFLECTION_FALLBACK.map((item) => ({ ...item }));
}

export function getFallbackFlowerUiTextItems(): FlowerUiTextItem[] {
  return FLOWER_UI_TEXT_DEFINITIONS.map((item) => ({
    ...item,
    text: item.defaultValue,
    enabled: true,
  }));
}

function buildFallbackTextRecord() {
  return getFallbackFlowerUiTextItems().reduce(
    (acc, item) => {
      acc[item.key] = item;
      return acc;
    },
    {} as Record<FlowerUiTextKey, FlowerUiTextItem>,
  );
}

function parseReflectionFieldRows(rows: CatalogItemRow[]) {
  const fallbackById = getFallbackFlowerReflectionFields().reduce(
    (acc, item) => {
      acc[item.id] = item;
      return acc;
    },
    {} as Record<FlowerReflectionFieldId, FlowerReflectionFieldConfig>,
  );

  const parsed = rows
    .filter((row) => row.catalog_key === "flower_reflection_fields")
    .map((row) => {
      const code = String(row.code ?? "").trim();
      if (!isFlowerReflectionFieldId(code)) return null;
      const fallback = fallbackById[code];
      const groupIdValue = metadataText(row.metadata, "group_id");
      const groupId = isFlowerReflectionGroupId(groupIdValue) ? groupIdValue : fallback.groupId;
      return {
        id: code,
        label: String(row.label ?? "").trim() || fallback.label,
        sortOrder: Number.isFinite(row.sort_order) ? Number(row.sort_order) : fallback.sortOrder,
        enabled: row.enabled !== false,
        groupId,
        groupTitle: metadataText(row.metadata, "group_title") || fallback.groupTitle,
        groupDescription:
          metadataText(row.metadata, "group_description") || fallback.groupDescription,
        placeholder: metadataText(row.metadata, "placeholder") || fallback.placeholder,
        rows: Math.max(2, metadataNumber(row.metadata, "rows", fallback.rows)),
      } satisfies FlowerReflectionFieldConfig;
    })
    .filter((item): item is FlowerReflectionFieldConfig => item !== null)
    .sort((left, right) => left.sortOrder - right.sortOrder);

  if (!parsed.length) return getFallbackFlowerReflectionFields();
  return parsed;
}

function parseUiTextRows(rows: CatalogItemRow[]) {
  const next = buildFallbackTextRecord();

  for (const row of rows) {
    if (row.catalog_key !== "flower_ui_texts") continue;
    const code = String(row.code ?? "").trim();
    if (!isFlowerUiTextKey(code)) continue;
    const fallback = FLOWER_TEXT_DEFINITION_BY_KEY[code];
    next[code] = {
      ...fallback,
      text: String(row.label ?? "").trim() || fallback.defaultValue,
      enabled: row.enabled !== false,
    };
  }

  return next;
}

export function getFallbackFlowerRuntimeConfig(): FlowerRuntimeConfig {
  return {
    reflectionFields: getFallbackFlowerReflectionFields(),
    texts: buildFallbackTextRecord(),
  };
}

export async function getFlowerRuntimeConfig(): Promise<FlowerRuntimeConfig> {
  const fallback = getFallbackFlowerRuntimeConfig();

  try {
    const { data, error } = await supabase
      .from("catalog_items")
      .select("catalog_key,code,label,sort_order,enabled,metadata")
      .in("catalog_key", ["flower_reflection_fields", "flower_ui_texts"])
      .order("catalog_key", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("code", { ascending: true });

    if (error) return fallback;

    const rows = (data as CatalogItemRow[] | null) ?? [];
    return {
      reflectionFields: parseReflectionFieldRows(rows),
      texts: parseUiTextRows(rows),
    };
  } catch {
    return fallback;
  }
}

export function buildFlowerReflectionGroups(
  fields: FlowerReflectionFieldConfig[],
): FlowerReflectionGroupConfig[] {
  const orderedFields = [...fields]
    .filter((item) => item.enabled)
    .sort((left, right) => left.sortOrder - right.sortOrder);

  const groups = new Map<FlowerReflectionGroupId, FlowerReflectionGroupConfig>();

  for (const field of orderedFields) {
    const current = groups.get(field.groupId);
    if (current) {
      current.fields.push(field);
      continue;
    }
    groups.set(field.groupId, {
      id: field.groupId,
      title: field.groupTitle,
      description: field.groupDescription,
      fields: [field],
    });
  }

  return FLOWER_REFLECTION_GROUP_IDS.map((groupId) => groups.get(groupId) ?? null).filter(
    (item): item is FlowerReflectionGroupConfig => item !== null,
  );
}

export function resolveFlowerText(config: FlowerRuntimeConfig | null | undefined, key: FlowerUiTextKey) {
  if (!config) return FLOWER_TEXT_DEFINITION_BY_KEY[key].defaultValue;
  return config.texts[key]?.text || FLOWER_TEXT_DEFINITION_BY_KEY[key].defaultValue;
}

export function formatFlowerText(
  template: string,
  variables: Record<string, string | number>,
) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, rawKey) => {
    if (Object.prototype.hasOwnProperty.call(variables, rawKey)) {
      return String(variables[rawKey]);
    }
    return `{${rawKey}}`;
  });
}
