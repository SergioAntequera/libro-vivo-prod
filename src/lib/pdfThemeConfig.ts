import { supabase } from "@/lib/supabase";

export type Season = "spring" | "summer" | "autumn" | "winter";

export type PdfSeasonPaletteHex = {
  bg: string;
  accent: string;
  soft: string;
};

export type PdfThemeConfig = {
  themeKey: string;
  themeMetadata: {
    font_regular: string;
    font_bold: string;
  };
  seasonLabels: Record<Season, string>;
  seasonPalettes: Record<Season, PdfSeasonPaletteHex>;
  textTemplates: Record<string, string>;
  layoutPresets: Record<string, Record<string, unknown>>;
  assets: Record<string, string>;
};

const FALLBACK: PdfThemeConfig = {
  themeKey: "storybook_default",
  themeMetadata: {
    font_regular: "public/fonts/Lato-Regular.ttf",
    font_bold: "public/fonts/Lato-Bold.ttf",
  },
  seasonLabels: {
    spring: "Primavera",
    summer: "Verano",
    autumn: "Otoño",
    winter: "Invierno",
  },
  seasonPalettes: {
    spring: { bg: "#f2fff5", accent: "#338c52", soft: "#e0f8e6" },
    summer: { bg: "#fffbe6", accent: "#b6821f", soft: "#f9efbf" },
    autumn: { bg: "#fff2e8", accent: "#9e5726", soft: "#f8ddcc" },
    winter: { bg: "#edf5ff", accent: "#3f6396", soft: "#dae8fb" },
  },
  textTemplates: {
    annual_title: "Portada anual",
    cover_main_title: "Libro Vivo - {year}",
    season_chapter_title: "Capítulo de {season}",
    notes_title: "Notas",
    empty_note: "- Sin notas en esta página",
    page_notes_header: "{title} - Notas ({index})",
    notes_continuation_title: "Notas (continuación {index})",
    footer_brand: "Libro Vivo {year}",
    footer_page_counter: "{page}/{total}",
    qr_year_label: "Abrir año",
    qr_page_label: "Abrir página",
    qr_audio_label: "Abrir audio",
    qr_video_label: "Abrir video",
    stats_total_pages: "Flores",
    stats_shiny: "Brillantes",
    stats_healthy: "Sanas",
    stats_avg_stars: "Media estrellas",
    chapter_stats_pages: "Flores: {count}",
    chapter_stats_shiny: "Brillantes: {count}",
    chapter_stats_avg_stars: "Media estrellas: {value}",
    season_card_pages: "Flores {count}",
    season_card_shiny: "Brillantes {count}",
    annual_cover_missing: "Sin portada anual",
    year_phrase_title: "Frase del año",
    year_phrase_empty: "Año sin frase guardada.",
    annual_opening_title: "Así se sintió este año",
    annual_opening_subtitle:
      "Una lectura editorial del año vivido, con su árbol, sus flores y los momentos que lo hicieron único.",
    annual_tree_title: "Árbol anual",
    annual_tree_note:
      "El mismo árbol que crece en sendero y bosque. Aquí resume la fuerza y la constancia del capítulo anual.",
    annual_tree_summary: "{count} flores - {months} meses activos - {favorites} favoritas",
    annual_highlights_title: "Momentos que definieron el año",
    annual_chapter_preview_title: "Cómo se repartió el capítulo",
    annual_geo_title: "La huella geográfica del año",
    annual_geo_subtitle:
      "No es un mapa técnico, sino una lectura de los lugares que sostuvieron el capítulo: donde volvisteis, donde pasó algo y qué zonas dejaron huella.",
    annual_geo_places_title: "Lugares que sostuvieron el año",
    annual_geo_constellation_title: "Constelación del año",
    annual_geo_constellation_empty:
      "Todavía no hay suficientes coordenadas guardadas para dibujar una constelación del año, pero los lugares sí forman ya una memoria geográfica.",
    annual_geo_summary: "{places} lugares distintos - {months} meses con huella geográfica",
    annual_geo_rhythm_title: "Cómo se movió el capítulo",
    annual_geo_rhythm_note:
      "El año empezó por {first} y terminó por {last}. Entre medias quedaron lugares repetidos, favoritos y puntos que hicieron de ancla para vuestra historia.",
    annual_closing_title: "Y así queda este capítulo",
    annual_closing_note:
      "El año termina aquí, pero el jardín ya deja ver todo lo que creció, lo que os definió y lo que merece volver a abrirse con calma.",
    annual_closing_summary:
      "{count} flores - {favorites} favoritas - {flower} como flor dominante - {locations} lugares",
    annual_closing_moments_title: "Flores que siguen encendiendo el año",
    season_chapter_note_fallback: "Capítulo {season} con {count} flores.",
    season_note_title: "Nota de temporada",
    top_moments_title: "Top momentos",
    top_moments_empty: "Sin flores destacadas",
    chapter_start_label: "Inicio del capítulo",
    page_cover_missing: "Sin portada para esta página",
    memory_description_title: "Sentido de la flor",
    memory_feature_title: "Lo que hizo especial esta flor",
    memory_special_title: "Lo que hizo único este momento",
    memory_reflections_title: "Miradas",
    memory_reflection_empty: "Todavía no hay memorias personales escritas en esta flor.",
    memory_canvas_title: "Lienzo y contexto",
    memory_canvas_empty: "El lienzo de esta flor es breve, pero sigue dando cuerpo a la flor.",
    memory_context_empty: "Sin contexto adicional guardado.",
    memory_media_title: "Audio y video",
    special_label_anniversary: "Aniversario",
    special_label_valentine: "San Valentin",
    special_label_birthday: "Cumpleaños",
    special_label_trip: "Viaje especial",
  },
  layoutPresets: {
    chapter_page: {
      header_height: 138,
      continuation_header_height: 132,
    },
  },
  assets: {
    "season_label.spring": "Primavera",
    "season_label.summer": "Verano",
    "season_label.autumn": "Otoño",
    "season_label.winter": "Invierno",
    "palette.spring.bg": "#f2fff5",
    "palette.spring.accent": "#338c52",
    "palette.spring.soft": "#e0f8e6",
    "palette.summer.bg": "#fffbe6",
    "palette.summer.accent": "#b6821f",
    "palette.summer.soft": "#f9efbf",
    "palette.autumn.bg": "#fff2e8",
    "palette.autumn.accent": "#9e5726",
    "palette.autumn.soft": "#f8ddcc",
    "palette.winter.bg": "#edf5ff",
    "palette.winter.accent": "#3f6396",
    "palette.winter.soft": "#dae8fb",
    "ornament.frame.color": "#e6effc",
    "ornament.annual.flower_primary.petal": "#ffdea3",
    "ornament.annual.flower_primary.center": "#f9b244",
    "ornament.annual.flower_secondary.petal": "#d4eaff",
    "ornament.annual.flower_secondary.center": "#72aedf",
    "ornament.annual.sprout.leaf": "#abdfb8",
    "ornament.annual.sprout.stem": "#4f9562",
    "ornament.annual.spark": "#a8bbdb",
    "ornament.season.spring.primary": "#dcf4d9",
    "ornament.season.summer.primary": "#ffe8b8",
    "ornament.season.autumn.primary": "#ffd7b3",
    "ornament.season.winter.primary": "#dcecff",
    "ornament.season.spring.secondary": "#efe0ff",
    "ornament.season.summer.secondary": "#dba940",
    "ornament.season.autumn.secondary": "#cf7e48",
    "ornament.season.winter.secondary": "#7ca7df",
  },
};

function isHexColor(value: string) {
  return /^#([0-9a-fA-F]{6})$/.test(value.trim());
}

export function getFallbackPdfThemeConfig(): PdfThemeConfig {
  return {
    ...FALLBACK,
    themeMetadata: { ...FALLBACK.themeMetadata },
    seasonLabels: { ...FALLBACK.seasonLabels },
    seasonPalettes: {
      spring: { ...FALLBACK.seasonPalettes.spring },
      summer: { ...FALLBACK.seasonPalettes.summer },
      autumn: { ...FALLBACK.seasonPalettes.autumn },
      winter: { ...FALLBACK.seasonPalettes.winter },
    },
    textTemplates: { ...FALLBACK.textTemplates },
    layoutPresets: { ...FALLBACK.layoutPresets },
    assets: { ...FALLBACK.assets },
  };
}

export function renderPdfTemplate(
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

export async function getPdfThemeConfig(): Promise<PdfThemeConfig> {
  const fallback = getFallbackPdfThemeConfig();

  try {
    const themeRes = await supabase
      .from("pdf_themes")
      .select("key,metadata")
      .eq("is_active", true)
      .order("priority", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (themeRes.error || !themeRes.data?.key) return fallback;
    const themeKey = String(themeRes.data.key);

    const [assetsRes, textsRes, layoutsRes] = await Promise.all([
      supabase
        .from("pdf_theme_assets")
        .select("asset_key,value")
        .eq("theme_key", themeKey)
        .eq("enabled", true),
      supabase
        .from("pdf_text_templates")
        .select("template_key,body")
        .eq("theme_key", themeKey)
        .eq("enabled", true),
      supabase
        .from("pdf_layout_presets")
        .select("preset_key,metadata")
        .eq("theme_key", themeKey)
        .eq("enabled", true),
    ]);

    const next = getFallbackPdfThemeConfig();
    next.themeKey = themeKey;

    const themeMetadata =
      themeRes.data.metadata &&
      typeof themeRes.data.metadata === "object" &&
      !Array.isArray(themeRes.data.metadata)
        ? (themeRes.data.metadata as Record<string, unknown>)
        : {};
    if (
      typeof themeMetadata.font_regular === "string" &&
      themeMetadata.font_regular.trim()
    ) {
      next.themeMetadata.font_regular = themeMetadata.font_regular.trim();
    }
    if (
      typeof themeMetadata.font_bold === "string" &&
      themeMetadata.font_bold.trim()
    ) {
      next.themeMetadata.font_bold = themeMetadata.font_bold.trim();
    }

    if (!assetsRes.error) {
      for (const row of (assetsRes.data as { asset_key: string; value: string }[] | null) ??
        []) {
        const key = String(row.asset_key ?? "").trim();
        const value = String(row.value ?? "").trim();
        if (!key || !value) continue;

        next.assets[key] = value;

        if (key.startsWith("season_label.")) {
          const season = key.slice("season_label.".length) as Season;
          if (season in next.seasonLabels) next.seasonLabels[season] = value;
          continue;
        }

        if (key.startsWith("palette.")) {
          const [, season, tone] = key.split(".");
          if (
            (season === "spring" ||
              season === "summer" ||
              season === "autumn" ||
              season === "winter") &&
            (tone === "bg" || tone === "accent" || tone === "soft") &&
            isHexColor(value)
          ) {
            next.seasonPalettes[season][tone] = value;
          }
        }
      }
    }

    if (!textsRes.error) {
      for (const row of (textsRes.data as { template_key: string; body: string }[] | null) ??
        []) {
        const key = String(row.template_key ?? "").trim();
        const body = String(row.body ?? "").trim();
        if (!key || !body) continue;
        next.textTemplates[key] = body;
      }
    }

    if (!layoutsRes.error) {
      for (const row of (layoutsRes.data as { preset_key: string; metadata: unknown }[] | null) ??
        []) {
        const key = String(row.preset_key ?? "").trim();
        if (!key) continue;
        const metadata =
          row.metadata &&
          typeof row.metadata === "object" &&
          !Array.isArray(row.metadata)
            ? (row.metadata as Record<string, unknown>)
            : {};
        next.layoutPresets[key] = metadata;
      }
    }

    return next;
  } catch {
    return fallback;
  }
}
