"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  ensureSuperadminOrRedirect,
  getSessionAccessToken,
} from "@/lib/auth";
import {
  getFallbackPdfThemeConfig,
  renderPdfTemplate,
} from "@/lib/pdfThemeConfig";
import ActiveGardenSwitcher from "@/components/shared/ActiveGardenSwitcher";
import { AdminPageHero } from "@/components/admin/AdminPageHero";
import {
  AdminInlineNote,
  AdminPanel,
  AdminToggleGroup,
  AdminWorkspace,
} from "@/components/admin/AdminWorkspace";
import {
  resolveActiveGardenIdForUser,
  withGardenIdOnInsert,
  withGardenScope,
} from "@/lib/gardens";
import {
  MAX_YEAR_HIGHLIGHTS,
  isMissingYearHighlightPageIdsError,
  normalizeYearHighlightPageIds,
  resolveExplicitYearHighlights,
} from "@/lib/yearHighlightSelection";
import { toErrorMessage } from "@/lib/errorMessage";

type ThemeRow = {
  key: string;
  label: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  is_active: boolean;
  priority: number;
};

type AssetRow = {
  id: string;
  asset_key: string;
  value: string;
  enabled: boolean;
  sort_order: number;
};

type TextTemplateRow = {
  id: string;
  template_key: string;
  body: string;
  enabled: boolean;
  sort_order: number;
};

type LayoutRow = {
  id: string;
  preset_key: string;
  metadata: Record<string, unknown> | null;
  enabled: boolean;
  sort_order: number;
};

type LayoutDraft = {
  metadataText: string;
  enabled: boolean;
  sortOrder: string;
};

type FontCheckStatus =
  | "ok"
  | "missing"
  | "outside_public"
  | "absolute_unchecked"
  | "invalid"
  | "error";

type FontCheck = {
  input: string;
  resolved: string | null;
  status: FontCheckStatus;
  message: string;
};

type FontValidationPayload = {
  regular: FontCheck;
  bold: FontCheck;
  error?: string;
};

type YearEditorialPageRow = {
  id: string;
  title: string | null;
  date: string;
  cover_photo_url: string | null;
  thumbnail_url: string | null;
  is_favorite: boolean;
  rating: number | null;
};

type PdfView = "chapter" | "theme" | "copy" | "visuals" | "layout" | "advanced";

const VIEW_OPTIONS: Array<{ key: PdfView; label: string }> = [
  { key: "chapter", label: "Capítulo anual" },
  { key: "theme", label: "Tema editorial" },
  { key: "copy", label: "Textos" },
  { key: "visuals", label: "Visuales" },
  { key: "layout", label: "Layout" },
  { key: "advanced", label: "Avanzado" },
];

const SEASONS = [
  { code: "spring", label: "Primavera" },
  { code: "summer", label: "Verano" },
  { code: "autumn", label: "Otoño" },
  { code: "winter", label: "Invierno" },
] as const;

const PRIMARY_ASSET_KEYS = [
  ...SEASONS.flatMap((season) => [
    `season_label.${season.code}`,
    `palette.${season.code}.bg`,
    `palette.${season.code}.accent`,
    `palette.${season.code}.soft`,
  ]),
  "ornament.frame.color",
] as const;

const COPY_GROUPS = [
  {
    title: "Portada",
    fields: [
      { key: "cover_main_title", label: "Título principal", hint: "Admite {year}." },
      { key: "annual_title", label: "Subtítulo de portada", hint: "Bajada editorial del libro." },
      { key: "annual_cover_missing", label: "Portada ausente", hint: "Texto si no hay portada anual." },
      { key: "year_phrase_title", label: "Título de frase del año", hint: "Encabezado del bloque de frase del año." },
      { key: "year_phrase_empty", label: "Sin frase del año", hint: "Fallback si no hay frase guardada." },
    ],
  },
  {
    title: "Apertura editorial",
    fields: [
      { key: "annual_opening_title", label: "Título de apertura", hint: "Encabezado de la apertura anual." },
      { key: "annual_opening_subtitle", label: "Subtítulo de apertura", hint: "Bajada editorial del primer pliego." },
      { key: "annual_tree_title", label: "Título del árbol anual", hint: "Encabezado del bloque del árbol." },
      { key: "annual_tree_note", label: "Nota del árbol anual", hint: "Explica el sentido del árbol en el libro." },
      { key: "annual_tree_summary", label: "Resumen del árbol", hint: "Admite {count}, {months} y {favorites}." },
      { key: "annual_highlights_title", label: "Título de momentos clave", hint: "Lista de recuerdos que definieron el año." },
      { key: "annual_chapter_preview_title", label: "Título de vista de capítulos", hint: "Resumen de como se reparte el año." },
      { key: "annual_geo_title", label: "Título de huella geográfica", hint: "Encabezado de la capa geográfica anual." },
      { key: "annual_geo_subtitle", label: "Subtítulo de huella geográfica", hint: "Bajada editorial de la página geográfica." },
      { key: "annual_geo_places_title", label: "Título de lugares del año", hint: "Lista corta de lugares importantes." },
      { key: "annual_geo_constellation_title", label: "Título de constelación", hint: "Cabecera del mapa abstracto del año." },
      { key: "annual_geo_constellation_empty", label: "Sin constelación", hint: "Fallback si no hay suficientes coordenadas." },
      { key: "annual_geo_summary", label: "Resumen geográfico", hint: "Admite {places} y {months}." },
      { key: "annual_geo_rhythm_title", label: "Título del recorrido", hint: "Cabecera del ritmo geográfico del año." },
      { key: "annual_geo_rhythm_note", label: "Nota del recorrido", hint: "Admite {first} y {last}." },
    ],
  },
  {
    title: "Cierre anual",
    fields: [
      { key: "annual_closing_title", label: "Título de cierre", hint: "Encabezado del cierre del libro." },
      { key: "annual_closing_note", label: "Nota de cierre", hint: "Bajada emocional de la última página." },
      { key: "annual_closing_summary", label: "Resumen de cierre", hint: "Admite {count}, {favorites}, {flower} y {locations}." },
      { key: "annual_closing_moments_title", label: "Título de recuerdos finales", hint: "Lista corta de momentos que cierran el año." },
    ],
  },
  {
    title: "Capitulos",
    fields: [
      { key: "season_chapter_title", label: "Título del capítulo", hint: "Admite {season}." },
      { key: "chapter_stats_pages", label: "Páginas del capítulo", hint: "Admite {count}." },
      { key: "chapter_stats_shiny", label: "Brillantes del capítulo", hint: "Admite {count}." },
      { key: "chapter_stats_avg_stars", label: "Media del capítulo", hint: "Admite {value}." },
      { key: "season_card_pages", label: "Resumen de estación: páginas", hint: "Admite {count}." },
      { key: "season_card_shiny", label: "Resumen de estación: brillantes", hint: "Admite {count}." },
      { key: "season_note_title", label: "Título de nota de temporada", hint: "Se ve en la portada del capítulo." },
      { key: "season_chapter_note_fallback", label: "Nota fallback del capítulo", hint: "Admite {season} y {count}." },
      { key: "top_moments_title", label: "Título de top momentos", hint: "Listado destacado del capítulo." },
      { key: "top_moments_empty", label: "Sin top momentos", hint: "Fallback si no hay destacados." },
      { key: "chapter_start_label", label: "Inicio del capítulo", hint: "Texto de arranque del capítulo." },
    ],
  },
  {
    title: "Páginas y notas",
    fields: [
      { key: "memory_description_title", label: "Título de descripción", hint: "Cabecera principal de la descripción del recuerdo." },
      { key: "memory_feature_title", label: "Título de recuerdo destacado", hint: "Cabecera de recuerdos más importantes." },
      { key: "memory_special_title", label: "Título de recuerdo especial", hint: "Cabecera para aniversarios, cumpleaños, viajes y momentos canónicos." },
      { key: "memory_reflections_title", label: "Título de miradas", hint: "Cabecera de la parte más intima de la flor." },
      { key: "memory_reflection_empty", label: "Miradas vacias", hint: "Fallback cuando no hay memorias personales escritas." },
      { key: "memory_canvas_title", label: "Título de lienzo y contexto", hint: "Cabecera del bloque que resume canvas, lugar y medios." },
      { key: "memory_canvas_empty", label: "Lienzo vacío", hint: "Fallback cuando el lienzo apenas tiene contenido." },
      { key: "memory_context_empty", label: "Contexto vacío", hint: "Fallback cuando no hay lugar ni medios asociados." },
      { key: "memory_media_title", label: "Título de audio y video", hint: "Cabecera de la columna de QR multimedia." },
      { key: "special_label_anniversary", label: "Etiqueta de aniversario", hint: "Label corta para recuerdos de aniversario." },
      { key: "special_label_valentine", label: "Etiqueta de San Valentin", hint: "Label corta para recuerdos de San Valentin." },
      { key: "special_label_birthday", label: "Etiqueta de cumpleaños", hint: "Label corta para recuerdos de cumpleaños." },
      { key: "special_label_trip", label: "Etiqueta de viaje especial", hint: "Label corta para viajes y escapadas importantes." },
      { key: "notes_title", label: "Título de notas", hint: "Cabecera de la seccion de notas." },
      { key: "empty_note", label: "Sin notas", hint: "Fallback dentro de una página sin texto." },
      { key: "page_notes_header", label: "Cabecera de notas", hint: "Admite {title} e {index}." },
      { key: "notes_continuation_title", label: "Notas en continuación", hint: "Admite {index}." },
      { key: "page_cover_missing", label: "Sin portada de página", hint: "Texto si la página no tiene imagen." },
    ],
  },
  {
    title: "Footer y accesos",
    fields: [
      { key: "footer_brand", label: "Marca del footer", hint: "Admite {year}." },
      { key: "footer_page_counter", label: "Contador de páginas", hint: "Admite {page} y {total}." },
      { key: "qr_year_label", label: "QR del año", hint: "Etiqueta del QR al year." },
      { key: "qr_page_label", label: "QR de página", hint: "Etiqueta del QR a la página." },
      { key: "qr_audio_label", label: "QR de audio", hint: "Etiqueta del QR si la página tiene audio." },
      { key: "qr_video_label", label: "QR de video", hint: "Etiqueta del QR si la página tiene video." },
      { key: "stats_total_pages", label: "Estadistica total páginas", hint: "Label del resumen anual." },
      { key: "stats_shiny", label: "Estadistica brillantes", hint: "Label del resumen anual." },
      { key: "stats_healthy", label: "Estadistica sanas", hint: "Label del resumen anual." },
      { key: "stats_avg_stars", label: "Estadistica media", hint: "Label del resumen anual." },
    ],
  },
] as const;

const PRIMARY_TEXT_KEYS = COPY_GROUPS.flatMap((group) =>
  group.fields.map((field) => field.key),
);

function isHexColor(value: string) {
  return /^#([0-9a-fA-F]{6})$/.test(value.trim());
}

function isBlockingFontStatus(status: FontCheckStatus) {
  return (
    status === "missing" ||
    status === "outside_public" ||
    status === "invalid" ||
    status === "error"
  );
}

function fontStatusLabel(status: FontCheckStatus) {
  if (status === "ok") return "OK";
  if (status === "missing") return "Missing";
  if (status === "outside_public") return "Outside public";
  if (status === "absolute_unchecked") return "Absolute path";
  if (status === "invalid") return "Invalid";
  return "Error";
}

function fontStatusClass(status: FontCheckStatus) {
  if (status === "ok") return "bg-[var(--lv-success-soft)]";
  if (status === "absolute_unchecked") return "bg-[var(--lv-info-soft)]";
  return "bg-[var(--lv-warning-soft)]";
}

function assetTypeForKey(key: string, value: string) {
  if (key.startsWith("palette.") || key === "ornament.frame.color" || isHexColor(value)) {
    return "color";
  }
  return "token";
}

function assetSortOrder(key: string) {
  const index = PRIMARY_ASSET_KEYS.findIndex((entry) => entry === key);
  if (index >= 0) return (index + 1) * 10;
  return 1000;
}

function textSortOrder(key: string) {
  const index = PRIMARY_TEXT_KEYS.findIndex((entry) => entry === key);
  if (index >= 0) return (index + 1) * 10;
  return 1000;
}

function asMetadataObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function buildAssetDrafts(rows: AssetRow[]) {
  const fallback = getFallbackPdfThemeConfig();
  const next: Record<string, string> = { ...fallback.assets };
  for (const row of rows) {
    if (!row.enabled) continue;
    next[row.asset_key] = row.value;
  }
  return next;
}

function buildTextDrafts(rows: TextTemplateRow[]) {
  const fallback = getFallbackPdfThemeConfig();
  const next: Record<string, string> = { ...fallback.textTemplates };
  for (const row of rows) {
    if (!row.enabled) continue;
    next[row.template_key] = row.body;
  }
  return next;
}

function pageImage(item: Pick<YearEditorialPageRow, "cover_photo_url" | "thumbnail_url">) {
  return item.cover_photo_url || item.thumbnail_url || null;
}

function shortDate(value: string) {
  return String(value ?? "").slice(0, 10);
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-3 py-2">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-[var(--lv-text)]">{value}</div>
    </div>
  );
}

const secondaryActionClass =
  "rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm text-[var(--lv-text)] transition hover:bg-[var(--lv-surface-soft)]";
const primaryActionClass =
  "rounded-[20px] bg-[var(--lv-primary)] px-4 py-2 text-sm text-white transition hover:opacity-90";
const subtleActionClass =
  "rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-3 py-2 text-sm text-[var(--lv-text)] transition hover:bg-[var(--lv-surface)]";
const fieldControlClass =
  "w-full rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-3 text-sm text-[var(--lv-text)] outline-none transition placeholder:text-[var(--lv-text-muted)] focus:border-[var(--lv-primary)] focus:bg-[var(--lv-surface-soft)]";
const compactFieldControlClass =
  "rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-3 text-sm text-[var(--lv-text)] outline-none transition placeholder:text-[var(--lv-text-muted)] focus:border-[var(--lv-primary)] focus:bg-[var(--lv-surface-soft)]";

export default function AdminPdfPage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const [loading, setLoading] = useState(true);
  const [chapterLoading, setChapterLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [view, setView] = useState<PdfView>("chapter");
  const [myProfileId, setMyProfileId] = useState("");
  const [activeGardenId, setActiveGardenId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);
  const [chapterNote, setChapterNote] = useState("");
  const [chapterCoverUrl, setChapterCoverUrl] = useState<string | null>(null);
  const [chapterHighlightPageIds, setChapterHighlightPageIds] = useState<string[]>([]);
  const [yearPages, setYearPages] = useState<YearEditorialPageRow[]>([]);

  const [themes, setThemes] = useState<ThemeRow[]>([]);
  const [themeKey, setThemeKey] = useState("");
  const [themeLabel, setThemeLabel] = useState("");
  const [themeDescription, setThemeDescription] = useState("");
  const [fontRegularPath, setFontRegularPath] = useState("");
  const [fontBoldPath, setFontBoldPath] = useState("");
  const [fontValidation, setFontValidation] = useState<FontValidationPayload | null>(null);
  const [validatingFonts, setValidatingFonts] = useState(false);
  const [saving, setSaving] = useState(false);

  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [texts, setTexts] = useState<TextTemplateRow[]>([]);
  const [layouts, setLayouts] = useState<LayoutRow[]>([]);
  const [assetDrafts, setAssetDrafts] = useState<Record<string, string>>({});
  const [textDrafts, setTextDrafts] = useState<Record<string, string>>({});
  const [layoutDrafts, setLayoutDrafts] = useState<Record<string, LayoutDraft>>({});
  const [chapterHeaderHeight, setChapterHeaderHeight] = useState("138");
  const [chapterContinuationHeight, setChapterContinuationHeight] = useState("132");

  const [newThemeKey, setNewThemeKey] = useState("");
  const [newThemeLabel, setNewThemeLabel] = useState("");
  const [copyCurrentTheme, setCopyCurrentTheme] = useState(true);

  const [newAssetKey, setNewAssetKey] = useState("");
  const [newAssetValue, setNewAssetValue] = useState("");
  const [newTextKey, setNewTextKey] = useState("");
  const [newTextBody, setNewTextBody] = useState("");

  const selectedTheme = useMemo(
    () => themes.find((theme) => theme.key === themeKey) ?? null,
    [themes, themeKey],
  );

  const chapterLayoutRow = useMemo(
    () => layouts.find((row) => row.preset_key === "chapter_page") ?? null,
    [layouts],
  );

  const secondaryAssets = useMemo(
    () => assets.filter((row) => !PRIMARY_ASSET_KEYS.some((key) => key === row.asset_key)),
    [assets],
  );

  const secondaryTexts = useMemo(
    () => texts.filter((row) => !PRIMARY_TEXT_KEYS.some((key) => key === row.template_key)),
    [texts],
  );

  const selectedHighlightPages = useMemo(
    () => resolveExplicitYearHighlights(yearPages, chapterHighlightPageIds),
    [chapterHighlightPageIds, yearPages],
  );

  const coverSuggestions = useMemo(
    () => yearPages.filter((item) => Boolean(pageImage(item))),
    [yearPages],
  );

  const chapterPreviewCover = useMemo(() => {
    if (chapterCoverUrl) return chapterCoverUrl;
    const explicitHighlightCover = selectedHighlightPages.find((item) => pageImage(item));
    if (explicitHighlightCover) return pageImage(explicitHighlightCover);
    return pageImage(coverSuggestions[0] ?? { cover_photo_url: null, thumbnail_url: null });
  }, [chapterCoverUrl, coverSuggestions, selectedHighlightPages]);

  const chapterPageCount = yearPages.length;

  const orderedYearPages = useMemo(() => {
    const byId = new Map(yearPages.map((item) => [item.id, item] as const));
    const selected = chapterHighlightPageIds
      .map((id) => byId.get(id) ?? null)
      .filter((item): item is YearEditorialPageRow => item != null);
    const selectedIds = new Set(selected.map((item) => item.id));
    const rest = yearPages.filter((item) => !selectedIds.has(item.id));
    return [...selected, ...rest];
  }, [chapterHighlightPageIds, yearPages]);

  const preview = useMemo(() => {
    const text = (key: string, fallback: string, vars: Record<string, string | number> = {}) =>
      renderPdfTemplate(textDrafts[key] ?? fallback, vars);
    const asset = (key: string, fallback: string) => assetDrafts[key] ?? fallback;

    return {
      coverTitle: text("cover_main_title", "Libro Vivo - {year}", { year: 2026 }),
      coverSubtitle: text("annual_title", "Portada anual"),
      footerBrand: text("footer_brand", "Libro Vivo {year}", { year: 2026 }),
      footerCounter: text("footer_page_counter", "{page}/{total}", { page: 3, total: 21 }),
      qrYear: text("qr_year_label", "Abrir año"),
      qrPage: text("qr_page_label", "Abrir página"),
      chapterTitle: text("season_chapter_title", "Capítulo de {season}", {
        season: asset("season_label.spring", "Primavera"),
      }),
      chapterPages: text("chapter_stats_pages", "Páginas: {count}", { count: 12 }),
      chapterShiny: text("chapter_stats_shiny", "Brillantes: {count}", { count: 5 }),
      chapterAvg: text("chapter_stats_avg_stars", "Media estrellas: {value}", { value: "4.1" }),
      statsPages: text("stats_total_pages", "Páginas"),
      statsShiny: text("stats_shiny", "Brillantes"),
      statsHealthy: text("stats_healthy", "Sanas"),
      statsAvg: text("stats_avg_stars", "Media estrellas"),
      notesTitle: text("notes_title", "Notas"),
      pageNotesHeader: text("page_notes_header", "{title} - Notas ({index})", {
        title: "Nuestro dia especial",
        index: 2,
      }),
      notesContinuationTitle: text("notes_continuation_title", "Notas (continuación {index})", {
        index: 2,
      }),
      springLabel: asset("season_label.spring", "Primavera"),
      summerLabel: asset("season_label.summer", "Verano"),
      autumnLabel: asset("season_label.autumn", "Otoño"),
      winterLabel: asset("season_label.winter", "Invierno"),
      springBg: asset("palette.spring.bg", "#f2fff5"),
      springAccent: asset("palette.spring.accent", "#338c52"),
      springSoft: asset("palette.spring.soft", "#e0f8e6"),
      frameColor: asset("ornament.frame.color", "#e6effc"),
      annualCoverMissing: text("annual_cover_missing", "Sin portada anual"),
      pageCoverMissing: text("page_cover_missing", "Sin portada para esta página"),
    };
  }, [assetDrafts, textDrafts]);

  async function refreshChapterData(gardenId: string | null, year: number) {
    if (!gardenId) {
      setAvailableYears([year]);
      setYearPages([]);
      setChapterNote("");
      setChapterCoverUrl(null);
      setChapterHighlightPageIds([]);
      setChapterLoading(false);
      return;
    }

    setChapterLoading(true);

    const from = `${year}-01-01`;
    const nextYearFrom = `${year + 1}-01-01`;

    const loadYearNoteRecord = async () => {
      const preferred = await withGardenScope(
        supabase
          .from("year_notes")
          .select("note,cover_url,highlight_page_ids")
          .eq("year", year),
        gardenId,
      ).maybeSingle();

      if (
        preferred.error &&
        isMissingYearHighlightPageIdsError(preferred.error.message)
      ) {
        return withGardenScope(
          supabase
            .from("year_notes")
            .select("note,cover_url")
            .eq("year", year),
          gardenId,
        ).maybeSingle();
      }

      return preferred;
    };

    try {
      const [pagesRes, allDatesRes, yearNoteRes] = await Promise.all([
        withGardenScope(
          supabase
            .from("pages")
            .select("id,title,date,cover_photo_url,thumbnail_url,is_favorite,rating")
            .gte("date", from)
            .lt("date", nextYearFrom)
            .order("date", { ascending: true }),
          gardenId,
        ),
        withGardenScope(
          supabase
            .from("pages")
            .select("date")
            .order("date", { ascending: false }),
          gardenId,
        ),
        loadYearNoteRecord(),
      ]);

      if (pagesRes.error) {
        throw new Error(`No se pudieron cargar las flores del año: ${pagesRes.error.message}`);
      }

      if (allDatesRes.error) {
        throw new Error(`No se pudieron cargar los años disponibles: ${allDatesRes.error.message}`);
      }

      if (yearNoteRes.error) {
        throw new Error(`No se pudo cargar la capa editorial anual: ${yearNoteRes.error.message}`);
      }

      const years = Array.from(
        new Set(
          (((allDatesRes.data as Array<{ date?: string | null }> | null) ?? [])
            .map((row) => Number(String(row.date ?? "").slice(0, 4)))
            .filter((value) => Number.isInteger(value) && value >= 1900 && value <= 2200)),
        ),
      ).sort((left, right) => right - left);
      if (!years.includes(year)) years.unshift(year);

      setAvailableYears(years.length ? years : [year]);
      setYearPages((pagesRes.data as YearEditorialPageRow[] | null) ?? []);
      setChapterNote(((yearNoteRes.data as { note?: string | null } | null)?.note ?? "") || "");
      setChapterCoverUrl(
        ((yearNoteRes.data as { cover_url?: string | null } | null)?.cover_url ?? null) || null,
      );
      setChapterHighlightPageIds(
        normalizeYearHighlightPageIds(
          (yearNoteRes.data as { highlight_page_ids?: unknown } | null)?.highlight_page_ids,
        ),
      );
    } catch (error) {
      setMsg(toErrorMessage(error, "No se pudo cargar el capítulo anual."));
      setYearPages([]);
      setChapterNote("");
      setChapterCoverUrl(null);
      setChapterHighlightPageIds([]);
    } finally {
      setChapterLoading(false);
    }
  }

  async function saveChapterSection() {
    if (!activeGardenId) {
      setMsg("No hay jardín activo para guardar este capítulo.");
      return;
    }

    setSaving(true);
    setMsg(null);

    const normalizedNote = chapterNote.trim() || null;
    const normalizedCoverUrl = String(chapterCoverUrl ?? "").trim() || null;
    let highlightColumnAvailable = true;

    let updateRes = await withGardenScope(
      supabase
        .from("year_notes")
        .update({
          note: normalizedNote,
          cover_url: normalizedCoverUrl,
          highlight_page_ids: chapterHighlightPageIds,
        })
        .eq("year", selectedYear)
        .select("year")
        .limit(1),
      activeGardenId,
    );

    if (updateRes.error && isMissingYearHighlightPageIdsError(updateRes.error.message)) {
      highlightColumnAvailable = false;
      updateRes = await withGardenScope(
        supabase
          .from("year_notes")
          .update({
            note: normalizedNote,
            cover_url: normalizedCoverUrl,
          })
          .eq("year", selectedYear)
          .select("year")
          .limit(1),
        activeGardenId,
      );
    }

    if (updateRes.error) {
      setSaving(false);
      setMsg(`No se pudo guardar el capítulo anual: ${updateRes.error.message}`);
      return;
    }

    const hasUpdatedRow = ((updateRes.data as Array<{ year: number }> | null) ?? []).length > 0;
    if (!hasUpdatedRow) {
      let insertRes = await supabase.from("year_notes").insert(
        withGardenIdOnInsert(
          {
            year: selectedYear,
            note: normalizedNote,
            cover_url: normalizedCoverUrl,
            ...(highlightColumnAvailable
              ? { highlight_page_ids: chapterHighlightPageIds }
              : {}),
          },
          activeGardenId,
        ),
      );

      if (insertRes.error && isMissingYearHighlightPageIdsError(insertRes.error.message)) {
        highlightColumnAvailable = false;
        insertRes = await supabase.from("year_notes").insert(
          withGardenIdOnInsert(
            {
              year: selectedYear,
              note: normalizedNote,
              cover_url: normalizedCoverUrl,
            },
            activeGardenId,
          ),
        );
      }

      if (insertRes.error) {
        setSaving(false);
        setMsg(`No se pudo guardar el capítulo anual: ${insertRes.error.message}`);
        return;
      }
    }

    await refreshChapterData(activeGardenId, selectedYear);
    setSaving(false);
    setMsg(
      highlightColumnAvailable
        ? "Capítulo anual guardado."
        : "Capítulo anual guardado. El Top 3 editorial se activará cuando la base tenga la migración nueva.",
    );
  }

  function toggleChapterHighlight(pageId: string) {
    setMsg(null);
    setChapterHighlightPageIds((prev) => {
      if (prev.includes(pageId)) {
        return prev.filter((entryId) => entryId !== pageId);
      }
      if (prev.length >= MAX_YEAR_HIGHLIGHTS) {
        setMsg("Solo puedes tener 3 destacados editoriales. Quita uno antes de añadir otro.");
        return prev;
      }
      return [...prev, pageId];
    });
  }

  async function refreshThemes() {
    setMsg(null);
    const { data, error } = await supabase
      .from("pdf_themes")
      .select("key,label,description,metadata,is_active,priority")
      .order("is_active", { ascending: false })
      .order("priority", { ascending: true })
      .order("label", { ascending: true });

    if (error) {
      setMsg(
        `No se pudo leer pdf_themes: ${error.message}. Ejecuta supabase/sql/2026-03-05_pdf_theme_config.sql`,
      );
      setThemes([]);
      return;
    }

    const rows = (data as ThemeRow[] | null) ?? [];
    setThemes(rows);
    if (!rows.length) {
      setThemeKey("");
      return;
    }

    const activeTheme = rows.find((row) => row.is_active) ?? rows[0];
    if (!themeKey) {
      setThemeKey(activeTheme.key);
      return;
    }

    if (!rows.some((row) => row.key === themeKey)) {
      setThemeKey(activeTheme.key);
    }
  }

  async function refreshThemeData(key: string) {
    if (!key) return;
    setMsg(null);

    const theme = themes.find((row) => row.key === key) ?? null;
    const metadata = asMetadataObject(theme?.metadata);
    setThemeLabel(theme?.label ?? "");
    setThemeDescription(theme?.description ?? "");
    setFontRegularPath(
      typeof metadata.font_regular === "string"
        ? metadata.font_regular
        : "public/fonts/Lato-Regular.ttf",
    );
    setFontBoldPath(
      typeof metadata.font_bold === "string"
        ? metadata.font_bold
        : "public/fonts/Lato-Bold.ttf",
    );

    const [assetsRes, textsRes, layoutsRes] = await Promise.all([
      supabase
        .from("pdf_theme_assets")
        .select("id,asset_key,value,enabled,sort_order")
        .eq("theme_key", key)
        .order("sort_order", { ascending: true })
        .order("asset_key", { ascending: true }),
      supabase
        .from("pdf_text_templates")
        .select("id,template_key,body,enabled,sort_order")
        .eq("theme_key", key)
        .order("sort_order", { ascending: true })
        .order("template_key", { ascending: true }),
      supabase
        .from("pdf_layout_presets")
        .select("id,preset_key,metadata,enabled,sort_order")
        .eq("theme_key", key)
        .order("sort_order", { ascending: true })
        .order("preset_key", { ascending: true }),
    ]);

    const nextAssets = (assetsRes.data as AssetRow[] | null) ?? [];
    const nextTexts = (textsRes.data as TextTemplateRow[] | null) ?? [];
    const nextLayouts = (layoutsRes.data as LayoutRow[] | null) ?? [];

    if (assetsRes.error) setMsg(assetsRes.error.message);
    if (textsRes.error) setMsg((prev) => prev ?? textsRes.error?.message ?? null);
    if (layoutsRes.error) setMsg((prev) => prev ?? layoutsRes.error?.message ?? null);

    setAssets(nextAssets);
    setTexts(nextTexts);
    setLayouts(nextLayouts);
    setAssetDrafts(buildAssetDrafts(nextAssets));
    setTextDrafts(buildTextDrafts(nextTexts));

    const nextLayoutDrafts: Record<string, LayoutDraft> = {};
    for (const row of nextLayouts) {
      nextLayoutDrafts[row.id] = {
        metadataText: JSON.stringify(row.metadata ?? {}, null, 2),
        enabled: row.enabled,
        sortOrder: String(row.sort_order ?? 100),
      };
    }
    setLayoutDrafts(nextLayoutDrafts);

    const chapterPreset = nextLayouts.find((row) => row.preset_key === "chapter_page");
    const chapterMetadata = asMetadataObject(chapterPreset?.metadata);
    setChapterHeaderHeight(String(chapterMetadata.header_height ?? 138));
    setChapterContinuationHeight(String(chapterMetadata.continuation_header_height ?? 132));
  }

  useEffect(() => {
    (async () => {
      const session = await ensureSuperadminOrRedirect(router);
      if (!session) return;
      const resolvedGardenId = await resolveActiveGardenIdForUser({
        userId: session.profile.id,
        forceRefresh: true,
      }).catch(() => null);

      setMyProfileId(session.profile.id);
      setActiveGardenId(resolvedGardenId);
      await Promise.all([
        refreshThemes(),
        refreshChapterData(resolvedGardenId, selectedYear),
      ]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (!themeKey) return;
    void refreshThemeData(themeKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeKey]);

  useEffect(() => {
    if (!myProfileId) return;
    void refreshChapterData(activeGardenId, selectedYear);
  }, [activeGardenId, myProfileId, selectedYear]);

  useEffect(() => {
    setFontValidation(null);
  }, [fontRegularPath, fontBoldPath, themeKey]);

  async function validateFontPaths(showSuccessMessage = true) {
    setValidatingFonts(true);
    setMsg(null);
    try {
      const accessToken = await getSessionAccessToken();
      if (!accessToken) {
        setMsg("Sesión expirada. Vuelve a iniciar sesión.");
        router.push("/login");
        return false;
      }

      const regularPath = fontRegularPath.trim() || "public/fonts/Lato-Regular.ttf";
      const boldPath = fontBoldPath.trim() || "public/fonts/Lato-Bold.ttf";
      const query = new URLSearchParams({ regular: regularPath, bold: boldPath });

      const res = await fetch(`/api/admin/pdf/validate-fonts?${query.toString()}`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const payload = (await res.json()) as FontValidationPayload;
      setFontValidation(payload);

      const hasBlocking = [payload.regular, payload.bold].some((check) =>
        isBlockingFontStatus(check.status),
      );

      if (hasBlocking) {
        setMsg("Validacion fallida: hay rutas invalidas o archivos inexistentes.");
        return false;
      }

      if (showSuccessMessage) setMsg("Validacion de fuentes OK.");
      return true;
    } catch (error) {
      setFontValidation(null);
      setMsg(error instanceof Error ? error.message : "Error validando fuentes.");
      return false;
    } finally {
      setValidatingFonts(false);
    }
  }

  async function saveThemeSection() {
    if (!themeKey) return;
    setSaving(true);
    const fontsOk = await validateFontPaths(false);
    if (!fontsOk) {
      setSaving(false);
      setMsg("No se guardo el tema: corrige las fuentes antes de continuar.");
      return;
    }

    const { error } = await supabase
      .from("pdf_themes")
      .update({
        label: themeLabel.trim() || selectedTheme?.label || themeKey,
        description: themeDescription.trim() || null,
        metadata: {
          ...asMetadataObject(selectedTheme?.metadata),
          font_regular: fontRegularPath.trim() || "public/fonts/Lato-Regular.ttf",
          font_bold: fontBoldPath.trim() || "public/fonts/Lato-Bold.ttf",
        },
      })
      .eq("key", themeKey);

    setSaving(false);
    if (error) {
      setMsg(error.message);
      return;
    }

    await refreshThemes();
    await refreshThemeData(themeKey);
    setMsg("Tema editorial guardado.");
  }

  async function saveVisualsSection() {
    if (!themeKey) return;
    setSaving(true);

    const rows = PRIMARY_ASSET_KEYS.map((key) => ({
      theme_key: themeKey,
      asset_key: key,
      asset_type: assetTypeForKey(key, assetDrafts[key] ?? ""),
      value: (assetDrafts[key] ?? "").trim(),
      enabled: true,
      sort_order: assetSortOrder(key),
      metadata: {},
    })).filter((row) => row.value);

    const { error } = await supabase
      .from("pdf_theme_assets")
      .upsert(rows, { onConflict: "theme_key,asset_key" });

    setSaving(false);
    if (error) {
      setMsg(error.message);
      return;
    }

    await refreshThemeData(themeKey);
    setMsg("Visuales del libro guardados.");
  }

  async function saveCopySection() {
    if (!themeKey) return;
    setSaving(true);

    const rows = PRIMARY_TEXT_KEYS.map((key) => ({
      theme_key: themeKey,
      template_key: key,
      body: (textDrafts[key] ?? "").trim(),
      enabled: true,
      sort_order: textSortOrder(key),
      metadata: {},
    })).filter((row) => row.body);

    const { error } = await supabase
      .from("pdf_text_templates")
      .upsert(rows, { onConflict: "theme_key,template_key" });

    setSaving(false);
    if (error) {
      setMsg(error.message);
      return;
    }

    await refreshThemeData(themeKey);
    setMsg("Copy editorial guardado.");
  }

  async function saveLayoutSection() {
    if (!themeKey) return;
    setSaving(true);

    const headerHeight = Number.parseInt(chapterHeaderHeight || "138", 10) || 138;
    const continuationHeight =
      Number.parseInt(chapterContinuationHeight || "132", 10) || 132;

    const { error } = await supabase.from("pdf_layout_presets").upsert(
      {
        theme_key: themeKey,
        preset_key: "chapter_page",
        enabled: true,
        sort_order: 10,
        metadata: {
          header_height: headerHeight,
          continuation_header_height: continuationHeight,
        },
      },
      { onConflict: "theme_key,preset_key" },
    );

    setSaving(false);
    if (error) {
      setMsg(error.message);
      return;
    }

    await refreshThemeData(themeKey);
    setMsg("Layout editorial guardado.");
  }

  async function activateTheme() {
    if (!themeKey || selectedTheme?.is_active) return;
    setSaving(true);

    const { error: deactivateError } = await supabase
      .from("pdf_themes")
      .update({ is_active: false })
      .neq("key", "__none__");

    if (deactivateError) {
      setSaving(false);
      setMsg(deactivateError.message);
      return;
    }

    const { error: activateError } = await supabase
      .from("pdf_themes")
      .update({ is_active: true })
      .eq("key", themeKey);

    setSaving(false);
    if (activateError) {
      setMsg(activateError.message);
      return;
    }

    await refreshThemes();
    setMsg(`Tema activo actualizado: ${themeLabel || themeKey}.`);
  }

  async function createTheme() {
    const key = newThemeKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const label = newThemeLabel.trim();
    if (!key || !label) {
      setMsg("Nuevo tema: key y label son obligatorios.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("pdf_themes").insert({
      key,
      label,
      description: copyCurrentTheme ? themeDescription.trim() || null : null,
      is_active: false,
      priority: (themes.length + 1) * 10,
      metadata: copyCurrentTheme
        ? {
            font_regular: fontRegularPath.trim() || "public/fonts/Lato-Regular.ttf",
            font_bold: fontBoldPath.trim() || "public/fonts/Lato-Bold.ttf",
          }
        : {
            font_regular: "public/fonts/Lato-Regular.ttf",
            font_bold: "public/fonts/Lato-Bold.ttf",
          },
    });

    if (error) {
      setSaving(false);
      setMsg(error.message);
      return;
    }

    if (copyCurrentTheme) {
      if (assets.length) {
        await supabase.from("pdf_theme_assets").upsert(
          assets.map((row) => ({
            theme_key: key,
            asset_key: row.asset_key,
            asset_type: assetTypeForKey(row.asset_key, row.value),
            value: row.value,
            enabled: row.enabled,
            sort_order: row.sort_order,
            metadata: {},
          })),
          { onConflict: "theme_key,asset_key" },
        );
      }

      if (texts.length) {
        await supabase.from("pdf_text_templates").upsert(
          texts.map((row) => ({
            theme_key: key,
            template_key: row.template_key,
            body: row.body,
            enabled: row.enabled,
            sort_order: row.sort_order,
            metadata: {},
          })),
          { onConflict: "theme_key,template_key" },
        );
      }

      if (layouts.length) {
        await supabase.from("pdf_layout_presets").upsert(
          layouts.map((row) => ({
            theme_key: key,
            preset_key: row.preset_key,
            enabled: row.enabled,
            sort_order: row.sort_order,
            metadata: row.metadata ?? {},
          })),
          { onConflict: "theme_key,preset_key" },
        );
      }
    }

    setSaving(false);
    setNewThemeKey("");
    setNewThemeLabel("");
    await refreshThemes();
    setThemeKey(key);
    setMsg(`Tema editorial creado: ${label}.`);
  }

  function patchAssetRow(rowId: string, patch: Partial<AssetRow>) {
    setAssets((prev) => prev.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
  }

  function patchTextRow(rowId: string, patch: Partial<TextTemplateRow>) {
    setTexts((prev) => prev.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
  }

  function patchLayoutDraft(rowId: string, patch: Partial<LayoutDraft>, row: LayoutRow) {
    setLayoutDrafts((prev) => {
      const current = prev[rowId] ?? {
        metadataText: JSON.stringify(row.metadata ?? {}, null, 2),
        enabled: row.enabled,
        sortOrder: String(row.sort_order ?? 100),
      };
      return {
        ...prev,
        [rowId]: {
          ...current,
          ...patch,
        },
      };
    });
  }

  async function saveAssetRow(row: AssetRow) {
    const { error } = await supabase
      .from("pdf_theme_assets")
      .update({ value: row.value, enabled: row.enabled, sort_order: row.sort_order })
      .eq("id", row.id);

    if (error) {
      setMsg(error.message);
      return;
    }

    await refreshThemeData(themeKey);
    setMsg(`Asset guardado: ${row.asset_key}.`);
  }

  async function saveTextRow(row: TextTemplateRow) {
    const { error } = await supabase
      .from("pdf_text_templates")
      .update({ body: row.body, enabled: row.enabled, sort_order: row.sort_order })
      .eq("id", row.id);

    if (error) {
      setMsg(error.message);
      return;
    }

    await refreshThemeData(themeKey);
    setMsg(`Texto guardado: ${row.template_key}.`);
  }

  async function saveRawLayout(row: LayoutRow) {
    const draft = layoutDrafts[row.id] ?? {
      metadataText: JSON.stringify(row.metadata ?? {}, null, 2),
      enabled: row.enabled,
      sortOrder: String(row.sort_order ?? 100),
    };

    let parsed: Record<string, unknown> = {};
    try {
      const next = JSON.parse(draft.metadataText || "{}");
      parsed = next && typeof next === "object" && !Array.isArray(next) ? next : {};
    } catch {
      setMsg(`Metadata JSON invalido en ${row.preset_key}.`);
      return;
    }

    const nextSortOrder = Number.parseInt(draft.sortOrder || "100", 10) || 100;

    const { error } = await supabase
      .from("pdf_layout_presets")
      .update({ metadata: parsed, enabled: draft.enabled, sort_order: nextSortOrder })
      .eq("id", row.id);

    if (error) {
      setMsg(error.message);
      return;
    }

    await refreshThemeData(themeKey);
    setMsg(`Layout guardado: ${row.preset_key}.`);
  }

  async function addAsset() {
    if (!themeKey) return;
    const assetKey = newAssetKey.trim();
    const value = newAssetValue.trim();
    if (!assetKey || !value) {
      setMsg("Asset key y value son obligatorios.");
      return;
    }

    const { error } = await supabase.from("pdf_theme_assets").upsert(
      {
        theme_key: themeKey,
        asset_key: assetKey,
        asset_type: assetTypeForKey(assetKey, value),
        value,
        enabled: true,
        sort_order: 1000,
        metadata: {},
      },
      { onConflict: "theme_key,asset_key" },
    );

    if (error) {
      setMsg(error.message);
      return;
    }

    setNewAssetKey("");
    setNewAssetValue("");
    await refreshThemeData(themeKey);
    setMsg(`Asset creado: ${assetKey}.`);
  }

  async function addText() {
    if (!themeKey) return;
    const templateKey = newTextKey.trim();
    const body = newTextBody.trim();
    if (!templateKey || !body) {
      setMsg("Template key y body son obligatorios.");
      return;
    }

    const { error } = await supabase.from("pdf_text_templates").upsert(
      {
        theme_key: themeKey,
        template_key: templateKey,
        body,
        enabled: true,
        sort_order: 1000,
        metadata: {},
      },
      { onConflict: "theme_key,template_key" },
    );

    if (error) {
      setMsg(error.message);
      return;
    }

    setNewTextKey("");
    setNewTextBody("");
    await refreshThemeData(themeKey);
    setMsg(`Template creado: ${templateKey}.`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--lv-bg)] p-6 text-[var(--lv-text)]">
        <div className="mx-auto flex min-h-[300px] max-w-6xl items-center justify-center rounded-[28px] border border-[var(--lv-border)] bg-[var(--lv-surface)] shadow-[var(--lv-shadow-sm)]">
          Cargando admin PDF...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--lv-bg)] p-6 text-[var(--lv-text)]">
      <div className="mx-auto max-w-7xl space-y-4">
        <AdminPageHero
          title="Admin: Libro anual"
          description="Aquí ajustas tanto las reglas editoriales globales del libro como el capítulo anual real que comparten `year` y el PDF. No define la identidad canónica de cada plan: eso sigue viviendo en Tipos de plan."
          actions={
            <>
              <button className={secondaryActionClass} onClick={() => router.push(`/year/${selectedYear}`)}>
                Ver year visible
              </button>
              <button className={secondaryActionClass} onClick={() => router.push("/admin/forest")}>
                Bosque anual
              </button>
              <button className={secondaryActionClass} onClick={() => router.push("/admin") }>
                Volver al indice
              </button>
            </>
          }
          message={
            msg ? (
              <div className="rounded-[20px] border border-[var(--lv-warning)] bg-[var(--lv-warning-soft)] p-3 text-sm text-[var(--lv-warning)]">{msg}</div>
            ) : null
          }
          stats={[
            { label: "Tema activo", value: themes.find((theme) => theme.is_active)?.label ?? "Sin tema" },
            { label: "Temas", value: String(themes.length) },
            { label: "Año visible", value: String(selectedYear) },
            { label: "Top 3", value: `${selectedHighlightPages.length}/${MAX_YEAR_HIGHLIGHTS}` },
          ]}
          noticeTitle="Uso recomendado"
          noticeBody="Primero define el contenido editorial real del capítulo anual; después afina copy, visuales y layout del libro."
        />

        <AdminWorkspace
          sidebar={
            <>
              <AdminPanel
                title="Contexto del capítulo"
                description="Este contexto gobierna el contenido real que veras en `year` y en el libro exportado."
              >
                <div className="space-y-4">
                  <div className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4">
                    <ActiveGardenSwitcher compact onChanged={setActiveGardenId} />
                  </div>

                  <label className="space-y-1 text-sm">
                    <div className="font-medium text-slate-900">Año editorial</div>
                    <select
                      className={fieldControlClass}
                      value={String(selectedYear)}
                      onChange={(event) => setSelectedYear(Number(event.target.value))}
                    >
                      {availableYears.map((year) => (
                        <option key={`admin-pdf-year-${year}`} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="grid gap-2">
                    <SummaryChip label="Flores del año" value={String(chapterPageCount)} />
                    <SummaryChip
                      label="Destacados"
                      value={`${selectedHighlightPages.length}/${MAX_YEAR_HIGHLIGHTS}`}
                    />
                  </div>
                </div>
              </AdminPanel>

              <AdminPanel
                title="Biblioteca editorial"
                description="Elige el tema que gobierna el libro anual. Solo uno puede estar activo."
                actions={
                  !selectedTheme?.is_active ? (
                    <button
                      type="button"
                      className={secondaryActionClass}
                      onClick={() => void activateTheme()}
                      disabled={!themeKey || saving}
                    >
                      Usar como activo
                    </button>
                  ) : null
                }
              >
                <div className="space-y-2">
                  {themes.map((theme) => (
                    <button
                      key={theme.key}
                      type="button"
                      onClick={() => setThemeKey(theme.key)}
                      className={`w-full rounded-[20px] border p-3 text-left transition ${
                        theme.key === themeKey
                          ? "border-[var(--lv-primary)] bg-[var(--lv-primary-soft)]"
                          : "border-[var(--lv-border)] bg-[var(--lv-surface-soft)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium text-slate-950">{theme.label}</div>
                          <div className="mt-1 text-xs text-slate-500">{theme.key}</div>
                        </div>
                        {theme.is_active ? (
                          <span className="rounded-full border border-[var(--lv-success)] bg-[var(--lv-success-soft)] px-2 py-1 text-[11px] text-[var(--lv-success)]">
                            Activo
                          </span>
                        ) : null}
                      </div>
                    </button>
                  ))}
                </div>

                <details className="mt-4 rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4">
                  <summary className="cursor-pointer text-sm font-medium text-slate-900">
                    Crear tema nuevo
                  </summary>
                  <div className="mt-3 space-y-3">
                    <input
                      className={fieldControlClass}
                      value={newThemeKey}
                      onChange={(event) => setNewThemeKey(event.target.value)}
                      placeholder="book_2027"
                    />
                    <input
                      className={fieldControlClass}
                      value={newThemeLabel}
                      onChange={(event) => setNewThemeLabel(event.target.value)}
                      placeholder="Libro 2027"
                    />
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={copyCurrentTheme}
                        onChange={(event) => setCopyCurrentTheme(event.target.checked)}
                      />
                      Copiar el tema actual como base
                    </label>
                    <button
                      type="button"
                      className={primaryActionClass}
                      onClick={() => void createTheme()}
                      disabled={saving}
                    >
                      Crear tema
                    </button>
                  </div>
                </details>
              </AdminPanel>

              <AdminPanel title="Que quieres tocar" description="Solo te enseña el bloque necesario para esa tarea.">
                <AdminToggleGroup value={view} onChange={setView} options={VIEW_OPTIONS} />
              </AdminPanel>

              <AdminPanel title="Impacta en" description="Donde se va a notar este cambio.">
                <div className="grid gap-2">
                  <SummaryChip label="Libro/PDF" value="Portada, capítulos, copy y layout" />
                  <SummaryChip label="Year" value="Export y experiencia editorial" />
                  <SummaryChip label="No cambia" value="La flor o semilla de cada plan" />
                </div>
              </AdminPanel>
            </>
          }
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
              {view === "chapter" ? (
                <AdminPanel
                  title="Capítulo anual"
                  description="Esta capa es la misma que usa `year/[year]` para su hero y la que el PDF toma como apertura editorial real del año."
                  actions={
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={secondaryActionClass}
                        onClick={() => router.push(`/year/${selectedYear}`)}
                      >
                        Abrir year visible
                      </button>
                      <button
                        type="button"
                        className={primaryActionClass}
                        onClick={() => void saveChapterSection()}
                        disabled={saving || chapterLoading || !activeGardenId}
                      >
                        Guardar capitulo
                      </button>
                    </div>
                  }
                >
                  <div className="space-y-4">
                    <AdminInlineNote tone="success">
                      Fuente de verdad compartida: `year_notes.note`, `year_notes.cover_url` y
                      `year_notes.highlight_page_ids`. Lo que cambias aqui debe verse igual en
                      `year` y en el libro exportado.
                    </AdminInlineNote>

                    {chapterLoading ? (
                      <AdminInlineNote>Cargando contenido editorial del año...</AdminInlineNote>
                    ) : (
                      <>
                        <label className="space-y-1 text-sm">
                          <div className="font-medium text-slate-900">Memoria del año</div>
                          <div className="text-xs leading-5 text-slate-500">
                            Frase o pequeño texto que abre el capítulo anual y alimenta también la
                            portada editorial del libro.
                          </div>
                          <textarea
                            className={`${fieldControlClass} min-h-[150px] [overflow-wrap:anywhere]`}
                            value={chapterNote}
                            onChange={(event) => setChapterNote(event.target.value)}
                            placeholder="Escribe aquí la memoria o frase que resume el tono del año..."
                          />
                        </label>

                        <div className="rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-medium text-slate-900">
                                Portada del capitulo
                              </div>
                              <div className="mt-1 text-xs leading-5 text-slate-500">
                                Puedes curarla manualmente o dejar que el sistema use una imagen del
                                propio año.
                              </div>
                            </div>
                            <button
                              type="button"
                              className="rounded-[20px] border px-3 py-2 text-xs"
                              onClick={() => setChapterCoverUrl(null)}
                            >
                              Usar portada automatica
                            </button>
                          </div>

                          <input
                            className={`mt-3 ${fieldControlClass}`}
                            value={chapterCoverUrl ?? ""}
                            onChange={(event) => setChapterCoverUrl(event.target.value || null)}
                            placeholder="Opcional: pegar una URL manual de portada"
                          />

                          {coverSuggestions.length ? (
                            <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-3">
                              {coverSuggestions.map((item) => {
                                const image = pageImage(item);
                                const selected = Boolean(image) && chapterCoverUrl === image;
                                return (
                                  <button
                                    key={`admin-pdf-cover-${item.id}`}
                                    type="button"
                                    onClick={() => setChapterCoverUrl(image)}
                                    className="rounded-[20px] border bg-white p-2 text-left transition hover:shadow-sm"
                                    style={
                                      selected
                                        ? {
                                            borderColor: "#94b38c",
                                            boxShadow: "0 0 0 2px rgba(148,179,140,0.14)",
                                          }
                                        : undefined
                                    }
                                  >
                                    {image ? (
                                      <img
                                        src={image}
                                        alt={item.title ?? "Portada sugerida"}
                                        className="aspect-[16/10] w-full rounded-[16px] border object-cover"
                                      />
                                    ) : null}
                                    <div className="mt-2 text-sm font-medium text-slate-900 lv-text-safe">
                                      {item.title ?? "Página sin título"}
                                    </div>
                                    <div className="text-xs text-slate-500">{shortDate(item.date)}</div>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="mt-4">
                              <AdminInlineNote>
                                Todavia no hay imagenes en este año para sugerir una portada.
                              </AdminInlineNote>
                            </div>
                          )}
                        </div>

                        <div className="rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-medium text-slate-900">
                                Top 3 editorial
                              </div>
                              <div className="mt-1 text-xs leading-5 text-slate-500">
                                Seleccion manual del capitulo. Si marcas una flor aqui, manda sobre
                                favoritas y estrellas en `year` y en el PDF.
                              </div>
                            </div>
                            <div className="rounded-full border border-[#d9e4d3] bg-white px-3 py-1 text-xs text-slate-600">
                              {selectedHighlightPages.length}/{MAX_YEAR_HIGHLIGHTS} seleccionados
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {orderedYearPages.map((item) => {
                              const image = pageImage(item);
                              const selected = chapterHighlightPageIds.includes(item.id);
                              return (
                                <button
                                  key={`admin-pdf-highlight-${item.id}`}
                                  type="button"
                                  onClick={() => toggleChapterHighlight(item.id)}
                                  className={`rounded-[20px] border p-3 text-left transition ${
                                    selected
                                      ? "border-[var(--lv-primary)] bg-[var(--lv-primary-soft)]"
                                      : "border-[#d9e4d3] bg-white hover:bg-[#f8faf6]"
                                  }`}
                                >
                                  {image ? (
                                    <img
                                      src={image}
                                      alt={item.title ?? "Flor del año"}
                                      className="aspect-[16/10] w-full rounded-[16px] border object-cover"
                                    />
                                  ) : (
                                    <div className="flex aspect-[16/10] w-full items-center justify-center rounded-[16px] border bg-[linear-gradient(180deg,#f6f8f2_0%,#e8efdf_100%)] text-xs uppercase tracking-[0.16em] text-slate-500">
                                      Sin portada
                                    </div>
                                  )}
                                  <div className="mt-3 flex items-center justify-between gap-2">
                                    <div className="text-sm font-medium text-slate-900 lv-text-safe">
                                      {item.title ?? "Página sin título"}
                                    </div>
                                    <span className="rounded-full border bg-white px-2 py-1 text-[11px] text-slate-600">
                                      {selected ? "Dentro" : "Fuera"}
                                    </span>
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    {shortDate(item.date)}
                                  </div>
                                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                    <span>
                                      {item.rating ? `${item.rating}/5 estrellas` : "Sin estrellas"}
                                    </span>
                                    {item.is_favorite ? <span>Favorita</span> : null}
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {!orderedYearPages.length ? (
                            <div className="mt-4">
                              <AdminInlineNote>
                                Este año todavia no tiene flores guardadas, asi que no hay Top 3 que
                                seleccionar.
                              </AdminInlineNote>
                            </div>
                          ) : null}
                        </div>
                      </>
                    )}
                  </div>
                </AdminPanel>
              ) : null}

              {view === "theme" ? (
                <AdminPanel
                  title="Tema editorial"
                  description="Nombre, descripción y fuentes base del libro anual. Las fuentes se validan antes de guardar."
                  actions={
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={secondaryActionClass}
                        onClick={() => void validateFontPaths(true)}
                        disabled={validatingFonts}
                      >
                        {validatingFonts ? "Validando..." : "Validar fuentes"}
                      </button>
                      <button
                        type="button"
                        className={primaryActionClass}
                        onClick={() => void saveThemeSection()}
                        disabled={!themeKey || saving || validatingFonts}
                      >
                        Guardar tema
                      </button>
                    </div>
                  }
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-1 text-sm">
                      <div className="font-medium text-slate-900">Nombre del tema</div>
                      <input
                        className={fieldControlClass}
                        value={themeLabel}
                        onChange={(event) => setThemeLabel(event.target.value)}
                        placeholder="Libro clasico"
                      />
                    </label>
                    <label className="space-y-1 text-sm">
                      <div className="font-medium text-slate-900">Descripcion interna</div>
                      <input
                        className={fieldControlClass}
                        value={themeDescription}
                        onChange={(event) => setThemeDescription(event.target.value)}
                        placeholder="Tema editorial limpio y luminoso"
                      />
                    </label>
                    <label className="space-y-1 text-sm md:col-span-2">
                      <div className="font-medium text-slate-900">Fuente regular</div>
                      <input
                        className={fieldControlClass}
                        value={fontRegularPath}
                        onChange={(event) => setFontRegularPath(event.target.value)}
                        placeholder="public/fonts/Lato-Regular.ttf"
                      />
                    </label>
                    <label className="space-y-1 text-sm md:col-span-2">
                      <div className="font-medium text-slate-900">Fuente bold</div>
                      <input
                        className={fieldControlClass}
                        value={fontBoldPath}
                        onChange={(event) => setFontBoldPath(event.target.value)}
                        placeholder="public/fonts/Lato-Bold.ttf"
                      />
                    </label>
                  </div>

                  <AdminInlineNote>
                    Puedes usar rutas dentro de `public/` o rutas absolutas. La validacion marca las que romperian el export.
                  </AdminInlineNote>

                  {fontValidation ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {[
                        { label: "Regular", value: fontValidation.regular },
                        { label: "Bold", value: fontValidation.bold },
                      ].map((item) => (
                        <div key={item.label} className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium text-slate-900">{item.label}</div>
                            <span className={`rounded-full border px-2 py-1 text-[11px] ${fontStatusClass(item.value.status)}`}>
                              {fontStatusLabel(item.value.status)}
                            </span>
                          </div>
                          <div className="mt-2 text-slate-600">{item.value.message}</div>
                          <div className="mt-2 break-all font-mono text-xs text-slate-500">{item.value.resolved || item.value.input || "-"}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </AdminPanel>
              ) : null}

              {view === "copy" ? (
                <AdminPanel
                  title="Textos del libro"
                  description="Edita el copy que realmente se ve en portada, capítulos, páginas y footer."
                  actions={
                    <button
                      type="button"
                      className={primaryActionClass}
                      onClick={() => void saveCopySection()}
                      disabled={!themeKey || saving}
                    >
                      Guardar copy
                    </button>
                  }
                >
                  <div className="space-y-4">
                    {COPY_GROUPS.map((group) => (
                      <div key={group.title} className="rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4">
                        <div className="mb-3 text-sm font-medium text-slate-900">{group.title}</div>
                        <div className="grid gap-4">
                          {group.fields.map((field) => (
                            <label key={field.key} className="space-y-1 text-sm">
                              <div className="font-medium text-slate-900">{field.label}</div>
                              <div className="text-xs leading-5 text-slate-500">{field.hint}</div>
                              <textarea
                                className={`${fieldControlClass} min-h-[92px]`}
                                value={textDrafts[field.key] ?? ""}
                                onChange={(event) =>
                                  setTextDrafts((prev) => ({
                                    ...prev,
                                    [field.key]: event.target.value,
                                  }))
                                }
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </AdminPanel>
              ) : null}

              {view === "visuals" ? (
                <AdminPanel
                  title="Visuales del libro"
                  description="Aquí ajustas nombres de estaciones, paletas estacionales y el marco general del libro."
                  actions={
                    <button
                      type="button"
                      className={primaryActionClass}
                      onClick={() => void saveVisualsSection()}
                      disabled={!themeKey || saving}
                    >
                      Guardar visuales
                    </button>
                  }
                >
                  <div className="space-y-4">
                    {SEASONS.map((season) => (
                      <div key={season.code} className="rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4">
                        <div className="mb-3 text-sm font-medium text-slate-900">{season.label}</div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <label className="space-y-1 text-sm xl:col-span-1">
                            <div className="text-slate-600">Etiqueta</div>
                            <input
                              className={fieldControlClass}
                              value={assetDrafts[`season_label.${season.code}`] ?? ""}
                              onChange={(event) =>
                                setAssetDrafts((prev) => ({
                                  ...prev,
                                  [`season_label.${season.code}`]: event.target.value,
                                }))
                              }
                            />
                          </label>
                          {[
                            { suffix: "bg", label: "Fondo" },
                            { suffix: "accent", label: "Acento" },
                            { suffix: "soft", label: "Suave" },
                          ].map((tone) => (
                            <label key={tone.suffix} className="space-y-1 text-sm">
                              <div className="text-slate-600">{tone.label}</div>
                              <input
                                className="h-12 w-full rounded-2xl border p-2"
                                type="color"
                                value={assetDrafts[`palette.${season.code}.${tone.suffix}`] ?? "#f3f4f6"}
                                onChange={(event) =>
                                  setAssetDrafts((prev) => ({
                                    ...prev,
                                    [`palette.${season.code}.${tone.suffix}`]: event.target.value,
                                  }))
                                }
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}

                    <label className="space-y-1 text-sm rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4">
                      <div className="font-medium text-slate-900">Color del marco</div>
                      <div className="text-xs leading-5 text-slate-500">Se usa para los ornamentos y contornos principales del libro.</div>
                      <input
                        className="h-12 w-full rounded-2xl border p-2"
                        type="color"
                        value={assetDrafts["ornament.frame.color"] ?? "#e6effc"}
                        onChange={(event) =>
                          setAssetDrafts((prev) => ({
                            ...prev,
                            "ornament.frame.color": event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                </AdminPanel>
              ) : null}

              {view === "layout" ? (
                <AdminPanel
                  title="Layout editorial"
                  description="Solo el layout que de verdad cambia el flujo de lectura del libro anual."
                  actions={
                    <button
                      type="button"
                      className={primaryActionClass}
                      onClick={() => void saveLayoutSection()}
                      disabled={!themeKey || saving}
                    >
                      Guardar layout
                    </button>
                  }
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-1 text-sm">
                      <div className="font-medium text-slate-900">Altura de header de capítulo</div>
                      <input
                        className={fieldControlClass}
                        value={chapterHeaderHeight}
                        onChange={(event) => setChapterHeaderHeight(event.target.value)}
                        placeholder="138"
                      />
                    </label>
                    <label className="space-y-1 text-sm">
                      <div className="font-medium text-slate-900">Altura de header en continuación</div>
                      <input
                        className={fieldControlClass}
                        value={chapterContinuationHeight}
                        onChange={(event) => setChapterContinuationHeight(event.target.value)}
                        placeholder="132"
                      />
                    </label>
                  </div>
                  <AdminInlineNote>
                    Si necesitas tocar layout mas profundo, esta debajo en avanzado. Este bloque solo ense?a lo que afecta a la lectura diaria del libro.
                  </AdminInlineNote>
                </AdminPanel>
              ) : null}

              {view === "advanced" ? (
                <>
                  <AdminPanel title="Avanzado" description="Ornamentos, textos menos usados y layouts raw quedan aquí para no estorbar el trabajo diario.">
                    <AdminInlineNote tone="warning">
                      Si una tarea de todos los dias te obliga a venir aqui, el problema ya no es de configuracion: el admin necesita seguir simplificandose.
                    </AdminInlineNote>
                  </AdminPanel>

                  <AdminPanel title="Assets secundarios" description="Ornamentos y ajustes finos del libro.">
                    <div className="space-y-2">
                      {secondaryAssets.length ? (
                        secondaryAssets.map((row) => (
                          <div key={row.id} className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <div className="text-xs font-mono text-slate-500">{row.asset_key}</div>
                              <button
                                type="button"
                                className="rounded-full border px-3 py-1 text-xs"
                                onClick={() => patchAssetRow(row.id, { enabled: !row.enabled })}
                              >
                                {row.enabled ? "ON" : "OFF"}
                              </button>
                            </div>
                            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_100px_auto]">
                              <input
                                className={fieldControlClass}
                                value={row.value}
                                onChange={(event) => patchAssetRow(row.id, { value: event.target.value })}
                              />
                              <input
                                className={fieldControlClass}
                                value={row.sort_order}
                                onChange={(event) =>
                                  patchAssetRow(row.id, {
                                    sort_order: Number.parseInt(event.target.value || "0", 10) || 0,
                                  })
                                }
                              />
                              <button
                                type="button"
                                className={secondaryActionClass}
                                onClick={() => void saveAssetRow(row)}
                              >
                                Guardar
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <AdminInlineNote>No hay assets secundarios en este tema.</AdminInlineNote>
                      )}
                    </div>

                    <details className="mt-4 rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4">
                      <summary className="cursor-pointer text-sm font-medium text-slate-900">Anadir asset manual</summary>
                      <div className="mt-3 grid gap-3">
                        <input
                          className={fieldControlClass}
                          value={newAssetKey}
                          onChange={(event) => setNewAssetKey(event.target.value)}
                          placeholder="ornament.season.spring.spark"
                        />
                        <input
                          className={fieldControlClass}
                          value={newAssetValue}
                          onChange={(event) => setNewAssetValue(event.target.value)}
                          placeholder="#9b87cf"
                        />
                        <button
                          type="button"
                          className={secondaryActionClass}
                          onClick={() => void addAsset()}
                        >
                          Guardar asset
                        </button>
                      </div>
                    </details>
                  </AdminPanel>

                  <AdminPanel title="Textos secundarios" description="Fallbacks poco frecuentes o etiquetas tecnicas del libro.">
                    <div className="space-y-2">
                      {secondaryTexts.length ? (
                        secondaryTexts.map((row) => (
                          <div key={row.id} className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <div className="text-xs font-mono text-slate-500">{row.template_key}</div>
                              <button
                                type="button"
                                className="rounded-full border px-3 py-1 text-xs"
                                onClick={() => patchTextRow(row.id, { enabled: !row.enabled })}
                              >
                                {row.enabled ? "ON" : "OFF"}
                              </button>
                            </div>
                            <div className="grid gap-3">
                              <textarea
                                className={`${fieldControlClass} min-h-[96px]`}
                                value={row.body}
                                onChange={(event) => patchTextRow(row.id, { body: event.target.value })}
                              />
                              <div className="grid gap-3 md:grid-cols-[100px_auto]">
                                <input
                                  className={fieldControlClass}
                                  value={row.sort_order}
                                  onChange={(event) =>
                                    patchTextRow(row.id, {
                                      sort_order: Number.parseInt(event.target.value || "0", 10) || 0,
                                    })
                                  }
                                />
                                <button
                                  type="button"
                                  className={secondaryActionClass}
                                  onClick={() => void saveTextRow(row)}
                                >
                                  Guardar
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <AdminInlineNote>Todos los textos visibles de este tema ya estan en el bloque principal.</AdminInlineNote>
                      )}
                    </div>

                    <details className="mt-4 rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4">
                      <summary className="cursor-pointer text-sm font-medium text-slate-900">Anadir template manual</summary>
                      <div className="mt-3 grid gap-3">
                        <input
                          className={fieldControlClass}
                          value={newTextKey}
                          onChange={(event) => setNewTextKey(event.target.value)}
                          placeholder="template_key"
                        />
                        <textarea
                          className={`${fieldControlClass} min-h-[96px]`}
                          value={newTextBody}
                          onChange={(event) => setNewTextBody(event.target.value)}
                          placeholder="body"
                        />
                        <button
                          type="button"
                          className={secondaryActionClass}
                          onClick={() => void addText()}
                        >
                          Guardar template
                        </button>
                      </div>
                    </details>
                  </AdminPanel>

                  <AdminPanel title="Layouts raw" description="Solo para presets no cubiertos por el editor principal.">
                    <div className="space-y-2">
                      {layouts.map((row) => (
                        <div key={row.id} className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <div className="text-xs font-mono text-slate-500">{row.preset_key}</div>
                            <button
                              type="button"
                              className="rounded-full border px-3 py-1 text-xs"
                              onClick={() =>
                                patchLayoutDraft(
                                  row.id,
                                  {
                                    enabled: !(layoutDrafts[row.id]?.enabled ?? row.enabled),
                                  },
                                  row,
                                )
                              }
                            >
                              {(layoutDrafts[row.id]?.enabled ?? row.enabled) ? "ON" : "OFF"}
                            </button>
                          </div>
                          <div className="grid gap-3">
                            <textarea
                              className={`${fieldControlClass} min-h-[140px] font-mono text-xs`}
                              value={layoutDrafts[row.id]?.metadataText ?? JSON.stringify(row.metadata ?? {}, null, 2)}
                              onChange={(event) =>
                                patchLayoutDraft(row.id, { metadataText: event.target.value }, row)
                              }
                            />
                            <div className="grid gap-3 md:grid-cols-[100px_auto]">
                              <input
                                className={fieldControlClass}
                                value={layoutDrafts[row.id]?.sortOrder ?? String(row.sort_order ?? 100)}
                                onChange={(event) =>
                                  patchLayoutDraft(row.id, { sortOrder: event.target.value }, row)
                                }
                              />
                              <button
                                type="button"
                                className={secondaryActionClass}
                                onClick={() => void saveRawLayout(row)}
                              >
                                Guardar layout
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AdminPanel>
                </>
              ) : null}
            </div>

            <div className="space-y-4">
              {view === "chapter" ? (
                <AdminPanel
                  title="Preview del capítulo"
                  description="Lectura rápida del contenido editorial real del año visible."
                >
                  {chapterLoading ? (
                    <AdminInlineNote>Cargando preview del capítulo...</AdminInlineNote>
                  ) : (
                    <div className="space-y-4 rounded-[26px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4">
                      <div className="rounded-[20px] border bg-white p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-[#61755c]">
                          Portada anual
                        </div>
                        {chapterPreviewCover ? (
                          <img
                            src={chapterPreviewCover}
                            alt="Portada anual visible"
                            className="mt-3 aspect-[16/10] w-full rounded-[18px] border object-cover"
                          />
                        ) : (
                          <div className="mt-3 flex aspect-[16/10] w-full items-center justify-center rounded-[18px] border bg-[linear-gradient(180deg,#f7fbf4_0%,#ebf3e3_100%)] text-xs uppercase tracking-[0.16em] text-slate-500">
                            Sin portada curada
                          </div>
                        )}
                        <div className="mt-3 text-xs text-slate-500">
                          {chapterCoverUrl ? "Portada manual guardada" : "Portada automatica"}
                        </div>
                      </div>

                      <div className="rounded-[20px] border bg-white p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-[#61755c]">
                          Memoria del año
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-700 [overflow-wrap:anywhere] whitespace-pre-wrap">
                          {chapterNote.trim()
                            ? chapterNote
                            : "Todavía no hay memoria escrita para este capítulo."}
                        </div>
                      </div>

                      <div className="rounded-[20px] border bg-white p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-[#61755c]">
                            Top 3 editorial
                          </div>
                          <div className="text-xs text-slate-500">
                            {selectedHighlightPages.length}/{MAX_YEAR_HIGHLIGHTS}
                          </div>
                        </div>

                        {selectedHighlightPages.length ? (
                          <div className="mt-3 space-y-3">
                            {selectedHighlightPages.map((item, index) => (
                              <div
                                key={`admin-pdf-preview-highlight-${item.id}`}
                                className="rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-3"
                              >
                                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                                  Destacado {index + 1}
                                </div>
                                <div className="mt-1 text-sm font-medium text-slate-900 lv-text-safe">
                                  {item.title ?? "Página sin título"}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {shortDate(item.date)}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-3 text-sm text-slate-500">
                            Aun no has marcado el Top 3 editorial de este año.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </AdminPanel>
              ) : (
                <AdminPanel title="Preview editorial" description="Lectura rápida de portada, capítulo y footer con este tema.">
                  <div
                    className="space-y-4 rounded-[26px] border p-4"
                    style={{
                      backgroundColor: preview.springSoft,
                      borderColor: preview.frameColor,
                    }}
                  >
                    <div className="rounded-[20px] border bg-white p-4">
                      <div className="text-lg font-semibold text-slate-950">{preview.coverTitle}</div>
                      <div className="mt-1 text-sm text-slate-600">{preview.coverSubtitle}</div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
                        <div className="rounded-[16px] border p-3">{preview.statsPages}: 18</div>
                        <div className="rounded-[16px] border p-3">{preview.statsShiny}: 7</div>
                        <div className="rounded-[16px] border p-3">{preview.statsHealthy}: 8</div>
                        <div className="rounded-[16px] border p-3">{preview.statsAvg}: 4.1</div>
                      </div>
                      <div className="mt-3 text-xs text-slate-500">{preview.annualCoverMissing}</div>
                    </div>

                    <div
                      className="rounded-[20px] border p-4"
                      style={{ backgroundColor: preview.springBg, borderColor: preview.springAccent }}
                    >
                      <div className="text-sm font-semibold" style={{ color: preview.springAccent }}>
                        {preview.chapterTitle}
                      </div>
                      <div className="mt-2 text-sm text-slate-700">{preview.chapterPages}</div>
                      <div className="text-sm text-slate-700">{preview.chapterShiny}</div>
                      <div className="text-sm text-slate-700">{preview.chapterAvg}</div>
                      <div className="mt-3 text-xs text-slate-500">
                        Header: {chapterHeaderHeight}px ? Continuacion: {chapterContinuationHeight}px
                      </div>
                    </div>

                    <div className="rounded-[20px] border bg-white p-4">
                      <div className="text-sm font-medium text-slate-900">{preview.notesTitle}</div>
                      <div className="mt-2 text-sm text-slate-700">{preview.pageNotesHeader}</div>
                      <div className="text-sm text-slate-500">{preview.notesContinuationTitle}</div>
                      <div className="mt-2 text-xs text-slate-500">{preview.pageCoverMissing}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[preview.springLabel, preview.summerLabel, preview.autumnLabel, preview.winterLabel].map((label) => (
                        <div key={label} className="rounded-[16px] border bg-white p-3">{label}</div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between rounded-[20px] border bg-white p-4 text-xs text-slate-600">
                      <span>{preview.footerBrand}</span>
                      <span>{preview.footerCounter}</span>
                    </div>
                    <div className="text-xs text-slate-600">{preview.qrYear} ? {preview.qrPage}</div>
                  </div>
                </AdminPanel>
              )}

              <AdminPanel title="Lo que no deberias tocar aquí" description="Para que el libro siga alineado con el sistema principal.">
                <AdminInlineNote>
                  El libro no decide que flor usa cada plan. Primero manda Tipos de plan y despues este tema editorial adapta la salida anual.
                </AdminInlineNote>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    { label: "Ir a Tipos de plan", href: "/admin/plan-types" },
                    { label: "Bosque anual", href: "/admin/forest" },
                    { label: "Abrir year", href: `/year/${selectedYear}` },
                  ].map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      className={secondaryActionClass}
                      onClick={() => router.push(action.href)}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </AdminPanel>
            </div>
          </div>
        </AdminWorkspace>
      </div>
    </div>
  );
}
