import type { Season } from "@/lib/forestLogic";
import { supabase } from "@/lib/supabase";

export type ForestViewConfig = {
  themeKey: string;
  title: string;
  subtitle: string;
  emptyMessage: string;
  seasonLabels: Record<Season, string>;
  elementLabels: Record<string, string>;
  narrativeTemplates: Record<string, string>;
  assets: Record<string, string>;
};

const FALLBACK_FOREST_CONFIG: ForestViewConfig = {
  themeKey: "storybook_default",
  title: "Bosque de Recuerdos",
  subtitle: "Cada página que vivís planta una flor en vuestro cuento.",
  emptyMessage:
    "Tu bosque está vacío. Planta la primera página y aparecerá vuestra primera flor.",
  seasonLabels: {
    spring: "Primavera",
    summer: "Verano",
    autumn: "Otoño",
    winter: "Invierno",
  },
  elementLabels: {
    fire: "Fuego",
    water: "Agua",
    air: "Aire",
    earth: "Tierra",
    aether: "Éter",
  },
  narrativeTemplates: {
    season_empty:
      "En {season} todavía no hay flores. Puede ser un buen momento para plantar una página nueva.",
    mood_shiny: "Fue una etapa luminosa, con muchos días especialmente vivos.",
    mood_wilted: "Fue una etapa sensible, con días que pidieron más cuidado.",
    mood_balanced: "Fue una etapa equilibrada, con un ritmo constante.",
    stars_high: "La media de estrellas fue muy alta: un capítulo especialmente valioso.",
    stars_low: "La media de estrellas fue discreta, pero el bosque siguió creciendo.",
    stars_mid: "La media de estrellas quedó estable y sostenida.",
    element_line: "Elemento dominante: {element}.",
    element_none: "Sin un elemento dominante claro.",
  },
  assets: {
    "season_label.spring": "Primavera",
    "season_label.summer": "Verano",
    "season_label.autumn": "Otoño",
    "season_label.winter": "Invierno",
    "element_label.fire": "Fuego",
    "element_label.water": "Agua",
    "element_label.air": "Aire",
    "element_label.earth": "Tierra",
    "element_label.aether": "Éter",
    "token.element.fire": "F",
    "token.element.water": "A",
    "token.element.air": "Ai",
    "token.element.earth": "T",
    "token.element.aether": "E",
    "icon.tier.bronze": "B",
    "icon.tier.silver": "S",
    "icon.tier.gold": "G",
    "icon.tier.diamond": "D",
    "icon.kind.pages_completed": "#",
    "icon.kind.seeds_bloomed": "*",
    "label.kind.pages_completed": "Páginas completadas",
    "label.kind.seeds_bloomed": "Semillas florecidas",
    "label.status.unlocked": "Desbloqueado",
    "label.status.ready": "Listo para desbloquear",
    "label.status.locked": "En progreso",
    "label.mood.shiny": "Brillante",
    "label.mood.healthy": "Sana",
    "label.mood.wilted": "Mustia",
    "color.season_card.spring": "#f4fff6",
    "color.season_card.summer": "#fffbe9",
    "color.season_card.autumn": "#fff3ea",
    "color.season_card.winter": "#eef6ff",
    "color.element.fire": "#ffd8d0",
    "color.element.water": "#d8ecff",
    "color.element.air": "#e7f5ff",
    "color.element.earth": "#f6e7d1",
    "color.element.aether": "#efe4ff",
    "color.element.default": "#efefef",
    "color.tier_card.locked": "#f8f8f8",
    "color.tier_card.bronze": "#fff4ea",
    "color.tier_card.silver": "#f0f7ff",
    "color.tier_card.gold": "#fff9df",
    "color.tier_card.diamond": "#f4efff",
    "color.tier_crown.locked": "#efefef",
    "color.tier_crown.bronze": "#f2c9a4",
    "color.tier_crown.silver": "#cde1f5",
    "color.tier_crown.gold": "#f5e6a8",
    "color.tier_crown.diamond": "#dbc9ff",
    "color.tier_trunk.locked": "#c7c7c7",
    "color.tier_trunk.bronze": "#986647",
    "color.tier_trunk.silver": "#74859a",
    "color.tier_trunk.gold": "#9f8440",
    "color.tier_trunk.diamond": "#736099",
    "color.milestone.progress.unlocked.bg": "#e7f8ec",
    "color.milestone.progress.unlocked.border": "#b9e7c6",
    "color.milestone.progress.ready.bg": "#fff7e7",
    "color.milestone.progress.ready.border": "#f0d9a4",
    "color.milestone.progress.locked.bg": "#ffffff",
    "color.milestone.progress.locked.border": "#e2e2e2",
    "color.milestone.badge.locked": "#f0f0f0",
    "color.milestone.badge.bronze": "#f8dfcc",
    "color.milestone.badge.silver": "#deecfb",
    "color.milestone.badge.gold": "#fff1c5",
    "color.milestone.badge.diamond": "#eadfff",
    "color.milestone.dot.locked": "#cfcfcf",
    "color.milestone.dot.ready": "#f0b34a",
    "color.milestone.dot.bronze": "#d88e54",
    "color.milestone.dot.silver": "#7ba3cc",
    "color.milestone.dot.gold": "#d5b43c",
    "color.milestone.dot.diamond": "#9a7ad6",
    "color.milestone.connector.unlocked": "#8dcf9e",
    "color.milestone.connector.ready": "#efc978",
    "color.milestone.connector.locked": "#d8d8d8",
  },
};

export function getFallbackForestViewConfig(): ForestViewConfig {
  return {
    ...FALLBACK_FOREST_CONFIG,
    seasonLabels: { ...FALLBACK_FOREST_CONFIG.seasonLabels },
    elementLabels: { ...FALLBACK_FOREST_CONFIG.elementLabels },
    narrativeTemplates: { ...FALLBACK_FOREST_CONFIG.narrativeTemplates },
    assets: { ...FALLBACK_FOREST_CONFIG.assets },
  };
}

export function renderForestTemplate(
  template: string,
  vars: Record<string, string | number>,
) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      return String(vars[key]);
    }
    return `{${key}}`;
  });
}

export async function getForestViewConfig(): Promise<ForestViewConfig> {
  const fallback = getFallbackForestViewConfig();

  try {
    const themeRes = await supabase
      .from("forest_theme")
      .select("key,metadata")
      .eq("is_active", true)
      .order("priority", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (themeRes.error || !themeRes.data?.key) return fallback;

    const themeKey = String(themeRes.data.key);
    const metadata =
      themeRes.data.metadata &&
      typeof themeRes.data.metadata === "object" &&
      !Array.isArray(themeRes.data.metadata)
        ? (themeRes.data.metadata as Record<string, unknown>)
        : {};

    const [assetsRes, narrativeRes] = await Promise.all([
      supabase
        .from("forest_assets")
        .select("asset_key,value")
        .eq("theme_key", themeKey)
        .eq("enabled", true),
      supabase
        .from("forest_narrative_templates")
        .select("template_key,body")
        .eq("theme_key", themeKey)
        .eq("enabled", true),
    ]);

    const next = getFallbackForestViewConfig();
    next.themeKey = themeKey;

    if (typeof metadata.title === "string" && metadata.title.trim()) {
      next.title = metadata.title.trim();
    }
    if (typeof metadata.subtitle === "string" && metadata.subtitle.trim()) {
      next.subtitle = metadata.subtitle.trim();
    }
    if (
      typeof metadata.empty_message === "string" &&
      metadata.empty_message.trim()
    ) {
      next.emptyMessage = metadata.empty_message.trim();
    }

    if (!assetsRes.error) {
      for (const row of (assetsRes.data as { asset_key: string; value: string }[] | null) ??
        []) {
        const key = String(row.asset_key ?? "").trim();
        const value = String(row.value ?? "").trim();
        if (!key || !value) continue;

        next.assets[key] = value;

        if (key.startsWith("season_label.")) {
          const seasonCode = key.slice("season_label.".length) as Season;
          if (seasonCode in next.seasonLabels) {
            next.seasonLabels[seasonCode] = value;
          }
          continue;
        }

        if (key.startsWith("element_label.")) {
          const elementCode = key.slice("element_label.".length);
          if (elementCode) next.elementLabels[elementCode] = value;
        }
      }
    }

    if (!narrativeRes.error) {
      for (const row of (narrativeRes.data as { template_key: string; body: string }[] | null) ??
        []) {
        const key = String(row.template_key ?? "").trim();
        const body = String(row.body ?? "").trim();
        if (!key || !body) continue;
        next.narrativeTemplates[key] = body;
      }
    }

    return next;
  } catch {
    return fallback;
  }
}
