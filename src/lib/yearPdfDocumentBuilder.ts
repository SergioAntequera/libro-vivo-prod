import { PDFDocument, rgb, type PDFImage } from "pdf-lib";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildAnnualBookReadModel,
  type AnnualBookPageItem,
  type AnnualBookReflection,
} from "@/lib/annualBookModel";
import { getHomeTrailRuntimeConfig } from "@/lib/homeTrailCatalog";
import { mapGardenPlanTypeRow } from "@/lib/planTypeCatalog";
import { getPdfThemeConfig, renderPdfTemplate } from "@/lib/pdfThemeConfig";
import { FLOWER_FAMILY_LABELS } from "@/lib/productDomainContracts";
import {
  isMissingYearHighlightPageIdsError,
  normalizeYearHighlightPageIds,
} from "@/lib/yearHighlightSelection";
import { isSchemaNotReadyError, withGardenScope } from "@/lib/gardens";
import {
  MARGIN,
  PAGE_H,
  PAGE_W,
  assetColor,
  buildMediaQrTargetsForPage,
  buildNotesLines,
  drawAnnualIllustrations,
  drawCanvasPreview,
  drawCard,
  drawFooter,
  drawFlower,
  drawFrameOrnaments,
  drawImageBox,
  drawNotesSection,
  drawPageBg,
  drawProgressionMilestoneTreePdf,
  drawQrBlock,
  drawSeasonIllustrations,
  drawTopBand,
  drawWrappedText,
  extractTexts,
  hexToRgb,
  loadPdfFonts,
  makeQrPngBytes,
  safePdfText,
  seasonLabel,
  seasonPalette,
  type ExportItem,
  type Season,
  type SeasonNoteRow,
  type YearNoteRow,
} from "@/lib/yearPdfExportHelpers";
import {
  buildCanvasSummaryCopy,
  buildGeoHighlights,
  buildReflectionExcerpt,
  drawCompactQrCard,
  drawFlowerFamilyCard,
  drawGeoConstellation,
  editorialLocationLabel,
  editorialMemoryTitle,
  firstNonEmptyText,
  flowerFamilyPalette,
  joinMeta,
  monthLabelFromIso,
  shortClaimDate,
  specialMomentPalette,
  specialMomentTemplateKey,
  type GeoHighlight,
} from "@/lib/yearPdfBuilderUtils";
import { countClaimedProgressionRewards } from "@/lib/progressionRewardsRuntime";
import {
  buildClaimedProgressionMilestoneVisuals,
  type ClaimedProgressionMilestoneVisual,
} from "@/lib/annualProgressionMilestones";
import { loadGardenYearTreeStates } from "@/lib/annualTreeState";
import {
  indexPageVisualStatesByPageId,
  loadPageVisualStates,
} from "@/lib/pageVisualState";
import type {
  CanonicalProgressionGraphStateRow,
  CanonicalProgressionTreeRow,
  CanonicalProgressionTreeUnlockRow,
} from "@/lib/progressionRuntime";

type BuildYearPdfBytesParams = {
  client: SupabaseClient;
  items: ExportItem[];
  year: number;
  activeGardenId: string;
  siteUrl: string;
};


export async function buildYearPdfBytes(params: BuildYearPdfBytesParams) {
  const { client, items, year: y, activeGardenId, siteUrl } = params;
const pdfTheme = await getPdfThemeConfig();
const textTemplate = (key: string, fallback: string) =>
  String(pdfTheme.textTemplates[key] ?? fallback);
const renderThemeText = (
  key: string,
  fallback: string,
  vars: Record<string, string | number>,
) => renderPdfTemplate(textTemplate(key, fallback), vars);
const specialMomentLabelText = (kind: AnnualBookPageItem["specialMomentKind"]) => {
  const key = specialMomentTemplateKey(kind);
  if (!key || !kind) return null;
  const fallbacks: Record<string, string> = {
    anniversary: "Aniversario",
    valentine: "San Valentin",
    birthday: "Cumpleaños",
    trip: "Viaje especial",
    first_date: "Primera cita",
    moving: "Mudanza",
    new_year: "Nochevieja",
  };
  return renderThemeText(key, fallbacks[kind] ?? "Momento especial", {});
};
const seasonLabels = pdfTheme.seasonLabels;
const seasonPaletteOverrides: Partial<
  Record<
    Season,
    {
      bg: ReturnType<typeof rgb>;
      accent: ReturnType<typeof rgb>;
      soft: ReturnType<typeof rgb>;
    }
  >
> = {
  spring: {
    bg: hexToRgb(pdfTheme.seasonPalettes.spring.bg),
    accent: hexToRgb(pdfTheme.seasonPalettes.spring.accent),
    soft: hexToRgb(pdfTheme.seasonPalettes.spring.soft),
  },
  summer: {
    bg: hexToRgb(pdfTheme.seasonPalettes.summer.bg),
    accent: hexToRgb(pdfTheme.seasonPalettes.summer.accent),
    soft: hexToRgb(pdfTheme.seasonPalettes.summer.soft),
  },
  autumn: {
    bg: hexToRgb(pdfTheme.seasonPalettes.autumn.bg),
    accent: hexToRgb(pdfTheme.seasonPalettes.autumn.accent),
    soft: hexToRgb(pdfTheme.seasonPalettes.autumn.soft),
  },
  winter: {
    bg: hexToRgb(pdfTheme.seasonPalettes.winter.bg),
    accent: hexToRgb(pdfTheme.seasonPalettes.winter.accent),
    soft: hexToRgb(pdfTheme.seasonPalettes.winter.soft),
  },
};
const themeColor = (assetKey: string, fallbackHex: string) =>
  assetColor(pdfTheme.assets, assetKey, fallbackHex);
const annualOrnamentPalette = {
  primaryPetal: themeColor("ornament.annual.flower_primary.petal", "#ffdea3"),
  primaryCenter: themeColor("ornament.annual.flower_primary.center", "#f9b244"),
  secondaryPetal: themeColor("ornament.annual.flower_secondary.petal", "#d4eaff"),
  secondaryCenter: themeColor("ornament.annual.flower_secondary.center", "#72aedf"),
  sproutLeaf: themeColor("ornament.annual.sprout.leaf", "#abdfb8"),
  sproutStem: themeColor("ornament.annual.sprout.stem", "#4f9562"),
  spark: themeColor("ornament.annual.spark", "#a8bbdb"),
};
const frameOrnamentColor = themeColor("ornament.frame.color", "#e6effc");
const seasonOrnamentPalette = (season: Season, accent: ReturnType<typeof rgb>) => ({
  primary: themeColor(
    `ornament.season.${season}.primary`,
    season === "spring"
      ? "#dcf4d9"
      : season === "summer"
        ? "#ffe8b8"
        : season === "autumn"
          ? "#ffd7b3"
          : "#dcecff",
  ),
  secondary: themeColor(
    `ornament.season.${season}.secondary`,
    season === "spring"
      ? "#efe0ff"
      : season === "summer"
        ? "#dba940"
        : season === "autumn"
          ? "#cf7e48"
          : "#7ca7df",
  ),
  spark: themeColor(
    `ornament.season.${season}.spark`,
    season === "spring"
      ? "#9b87cf"
      : season === "summer"
        ? "#dba940"
        : season === "autumn"
          ? "#b8673b"
          : "#6d98d8",
  ),
  leaf: themeColor(
    `ornament.season.${season}.leaf`,
    season === "summer"
      ? "#ffe8b8"
      : season === "autumn"
        ? "#e9c28f"
        : season === "winter"
          ? "#dcecff"
          : "#dcf4d9",
  ),
  stem: themeColor(
    `ornament.season.${season}.stem`,
    season === "spring"
      ? "#4d945f"
      : season === "summer"
        ? "#b97f2a"
        : season === "autumn"
          ? "#915332"
          : "#4e6ca0",
  ),
  winterLine:
    typeof pdfTheme.assets[`ornament.season.${season}.line`] === "string"
      ? themeColor(`ornament.season.${season}.line`, "#7ea3d8")
      : accent,
});
const chapterPreset = pdfTheme.layoutPresets.chapter_page ?? {};
const chapterHeaderHeight = Number(chapterPreset.header_height);
const chapterHeaderHeightSafe = Number.isFinite(chapterHeaderHeight)
  ? chapterHeaderHeight
  : 138;
const chapterContinuationHeaderHeight = Number(
  chapterPreset.continuation_header_height,
);
const chapterContinuationHeaderHeightSafe = Number.isFinite(
  chapterContinuationHeaderHeight,
)
  ? chapterContinuationHeaderHeight
  : 132;

const from = `${y}-01-01`;
const nextYearFrom = `${y + 1}-01-01`;

const loadYearNoteData = async () => {
  const preferred = await withGardenScope(
    client
      .from("year_notes")
      .select("note,cover_url,highlight_page_ids")
      .eq("year", y),
    activeGardenId,
  ).maybeSingle();

  if (
    preferred.error &&
    isMissingYearHighlightPageIdsError(preferred.error.message)
  ) {
    return withGardenScope(
      client
        .from("year_notes")
        .select("note,cover_url")
        .eq("year", y),
      activeGardenId,
    ).maybeSingle();
  }

  return preferred;
};

const loadYearMilestonesCount = async () => {
  const canonical = await withGardenScope(
    client
      .from("progression_tree_unlocks")
      .select("*", { count: "exact", head: true })
      .not("claimed_at", "is", null)
      .gte("claimed_at", from)
      .lt("claimed_at", nextYearFrom),
    activeGardenId,
  );

  if (!canonical.error) {
    return canonical.count ?? 0;
  }

  if (!isSchemaNotReadyError(canonical.error)) {
    return 0;
  }
  return 0;
};

const [
  { data: yearNoteData },
  { data: seasonNotesData },
  planTypesRes,
  yearMilestonesCount,
  editorialRewardCount,
  homeTrailConfig,
  progressionTreesRes,
  progressionUnlocksRes,
  progressionGraphRes,
  annualTreeStateRes,
  pageVisualStatesRes,
] =
  await Promise.all([
    loadYearNoteData(),
    withGardenScope(
      client
        .from("season_notes")
        .select("season,note")
        .eq("year", y),
      activeGardenId,
    ),
    withGardenScope(
      client
        .from("garden_plan_types")
        .select(
          "id,code,label,category,description,suggested_element,flower_family,icon_emoji,flower_asset_path,seed_asset_path,flower_builder_config,is_custom,sort_order,archived_at",
        )
        .is("archived_at", null),
      activeGardenId,
    ),
    loadYearMilestonesCount(),
    countClaimedProgressionRewards({
      client,
      gardenId: activeGardenId,
      kinds: ["year_chapter", "pdf_detail"],
      unlockedFrom: from,
      unlockedToExclusive: nextYearFrom,
    }).catch(() => 0),
    getHomeTrailRuntimeConfig(),
    client
      .from("progression_tree_nodes")
      .select("id,title,description,accent_color,rank,rarity,leaf_variant,enabled"),
    withGardenScope(
      client
        .from("progression_tree_unlocks")
        .select("id,tree_id,unlocked_at,claimed_at")
        .not("claimed_at", "is", null)
        .gte("claimed_at", from)
        .lt("claimed_at", nextYearFrom)
        .order("claimed_at", { ascending: false }),
      activeGardenId,
    ),
    client
      .from("progression_graph_state")
      .select("tree_settings")
      .eq("key", "default")
      .maybeSingle(),
    loadGardenYearTreeStates(client, { gardenId: activeGardenId, years: [y] }),
    loadPageVisualStates(client, {
      gardenId: activeGardenId,
      pageIds: items.map((item) => String(item.id ?? "").trim()).filter(Boolean),
    }),
  ]);

const yearNote = (yearNoteData as YearNoteRow | null)?.note ?? null;
const yearCoverOverride = (yearNoteData as YearNoteRow | null)?.cover_url ?? null;
const highlightPageIds = normalizeYearHighlightPageIds(
  (yearNoteData as { highlight_page_ids?: unknown } | null)?.highlight_page_ids,
);
const seasonNotesMap = new Map<Season, string>();
for (const row of ((seasonNotesData as SeasonNoteRow[] | null) ?? [])) {
  if (!row?.season || !row.note) continue;
  seasonNotesMap.set(row.season, row.note);
}

const planTypeById = new Map<string, ReturnType<typeof mapGardenPlanTypeRow>>();
if (!planTypesRes.error) {
  for (const row of ((planTypesRes.data as Record<string, unknown>[] | null) ?? [])) {
    const mapped = mapGardenPlanTypeRow(row);
    planTypeById.set(mapped.id, mapped);
  }
}

const progressionErrors = [
  progressionTreesRes.error,
  progressionUnlocksRes.error,
  progressionGraphRes.error,
].filter(Boolean);
const progressionBlocking = progressionErrors.find((error) => !isSchemaNotReadyError(error));
const yearClaimedMilestoneTrees =
  !progressionBlocking && progressionErrors.length === 0
    ? buildClaimedProgressionMilestoneVisuals({
        trees: ((progressionTreesRes.data as CanonicalProgressionTreeRow[] | null) ?? []).filter(
          (tree) => tree.enabled !== false,
        ),
        unlocks: (progressionUnlocksRes.data as CanonicalProgressionTreeUnlockRow[] | null) ?? [],
        graphStateRow: (progressionGraphRes.data as CanonicalProgressionGraphStateRow | null) ?? null,
        claimedFrom: from,
        claimedToExclusive: nextYearFrom,
      })
    : [];
const effectiveYearMilestonesCount =
  !progressionBlocking && progressionErrors.length === 0
    ? yearClaimedMilestoneTrees.length
    : yearMilestonesCount;

const reflectionsByPageId = new Map<string, AnnualBookReflection[]>();
const pageIds = items.map((item) => String(item.id ?? "").trim()).filter(Boolean);
if (pageIds.length) {
  const reflectionsRes = await withGardenScope(
    client
      .from("memory_reflections")
      .select(
        "page_id,user_id,favorite_part,remembered_moment,what_i_felt,what_it_meant_to_me,what_i_discovered_about_you,small_promise",
      )
      .in("page_id", pageIds),
    activeGardenId,
  );

  const reflectionRows =
    (reflectionsRes.data as
      | Array<{
          page_id?: string | null;
          user_id?: string | null;
          favorite_part?: string | null;
          remembered_moment?: string | null;
          what_i_felt?: string | null;
          what_it_meant_to_me?: string | null;
          what_i_discovered_about_you?: string | null;
          small_promise?: string | null;
        }>
      | null) ?? [];

  const profileIds = Array.from(
    new Set(
      reflectionRows
        .map((row) => String(row.user_id ?? "").trim())
        .filter(Boolean),
    ),
  );
  const profileNameById = new Map<string, string>();
  if (profileIds.length) {
    const profilesRes = await client
      .from("profiles")
      .select("id,name")
      .in("id", profileIds);
    for (const row of ((profilesRes.data as Array<{ id?: string | null; name?: string | null }> | null) ?? [])) {
      const id = String(row.id ?? "").trim();
      if (!id) continue;
      profileNameById.set(id, String(row.name ?? "").trim() || "Persona del jardín");
    }
  }

  for (const row of reflectionRows) {
    const pageId = String(row.page_id ?? "").trim();
    const userId = String(row.user_id ?? "").trim();
    if (!pageId || !userId) continue;
    const list = reflectionsByPageId.get(pageId) ?? [];
    list.push({
      authorLabel: profileNameById.get(userId) || "Persona del jardín",
      favoritePart: String(row.favorite_part ?? "").trim() || null,
      rememberedMoment: String(row.remembered_moment ?? "").trim() || null,
      whatIFelt: String(row.what_i_felt ?? "").trim() || null,
      whatItMeantToMe: String(row.what_it_meant_to_me ?? "").trim() || null,
      whatIDiscoveredAboutYou:
        String(row.what_i_discovered_about_you ?? "").trim() || null,
      smallPromise: String(row.small_promise ?? "").trim() || null,
    });
    reflectionsByPageId.set(pageId, list);
  }
}

const pdf = await PDFDocument.create();
const { font, fontBold } = await loadPdfFonts(pdf, pdfTheme.themeMetadata);
const book = buildAnnualBookReadModel({
  year: y,
  items,
  yearNote,
  highlightPageIds,
  seasonNotesMap,
  yearMilestones: effectiveYearMilestonesCount,
  annualTreeAssets: homeTrailConfig.annualTreeAssets,
  annualTreeState: annualTreeStateRes.states[0] ?? null,
  pageVisualStateByPageId: indexPageVisualStatesByPageId(pageVisualStatesRes.states),
  planTypeById: new Map(
    Array.from(planTypeById.entries()).map(([id, value]) => [
      id,
      {
        code: value.code,
        label: value.label,
        category: value.category,
        flowerFamily: value.flowerFamily,
        flowerAssetPath: value.flowerAssetPath,
        flowerBuilderConfig: value.flowerBuilderConfig,
        suggestedElement: value.suggestedElement,
      },
    ]),
  ),
  reflectionsByPageId,
});
const uniqueLocationsCount = new Set(
  book.items
    .map((item) => String(item.locationLabel ?? "").trim())
    .filter(Boolean),
).size;
const geoHighlights = buildGeoHighlights(book.items);
const geoMoments = geoHighlights.slice(0, 5);
const geoMonthsCount = new Set(
  book.items
    .filter((item) => String(item.locationLabel ?? "").trim())
    .map((item) => String(item.date).slice(0, 7)),
).size;
const firstGeoMoment =
  [...book.items]
    .filter((item) => String(item.locationLabel ?? "").trim())
    .sort((left, right) => String(left.date).localeCompare(String(right.date)))[0] ?? null;
const lastGeoMoment =
  [...book.items]
    .filter((item) => String(item.locationLabel ?? "").trim())
    .sort((left, right) => String(right.date).localeCompare(String(left.date)))[0] ?? null;
const closingMoments = book.bestMoments.slice(0, 3);

// ---------- Annual cover ----------
{
  const page = pdf.addPage([PAGE_W, PAGE_H]);
  drawPageBg(page, rgb(0.97, 0.98, 1));
  drawTopBand(page, rgb(0.86, 0.93, 1));
  drawAnnualIllustrations(page, annualOrnamentPalette);

  page.drawText(
    safePdfText(
      fontBold,
      renderThemeText("cover_main_title", "Libro Vivo - {year}", { year: y }),
    ),
    {
    x: MARGIN,
    y: PAGE_H - 72,
    size: 30,
    font: fontBold,
    color: rgb(0.12, 0.17, 0.25),
    },
  );
  page.drawText(
    safePdfText(
      font,
      pdfTheme.textTemplates.annual_title || "Resumen anual",
    ),
    {
    x: MARGIN,
    y: PAGE_H - 98,
    size: 13,
    font,
    color: rgb(0.25, 0.3, 0.4),
    },
  );
  page.drawText(
    safePdfText(font, `Detalles editoriales desbloqueados: ${editorialRewardCount}`),
    {
      x: MARGIN,
      y: PAGE_H - 114,
      size: 10,
      font,
      color: rgb(0.32, 0.38, 0.46),
    },
  );

  const coverUrl = yearCoverOverride || book.coverImageUrl;

  const seasonOrder: Season[] = ["spring", "summer", "autumn", "winter"];
  const seasonCardY = 580;
  const seasonCardW = (PAGE_W - MARGIN * 2 - 24) / 4;
  seasonOrder.forEach((s, idx) => {
    const list = book.chapters[s].items;
    const x = MARGIN + idx * (seasonCardW + 8);
    const shinyInSeason = list.filter((it) => it.mood_state === "shiny").length;
    const palette = seasonPalette(s, seasonPaletteOverrides);
    drawCard(page, x, seasonCardY, seasonCardW, 70, rgb(1, 1, 1), palette.soft);
    drawFlower(page, x + seasonCardW - 14, seasonCardY + 54, 9, palette.soft, palette.accent);
    page.drawText(seasonLabel(s, seasonLabels), {
      x: x + 8,
      y: seasonCardY + 49,
      size: 10,
      font: fontBold,
      color: palette.accent,
    });
    page.drawText(
      safePdfText(
        font,
        renderThemeText("season_card_pages", "Flores {count}", {
          count: list.length,
        }),
      ),
      {
      x: x + 8,
      y: seasonCardY + 33,
      size: 9,
      font,
      color: rgb(0.35, 0.35, 0.39),
      },
    );
    page.drawText(
      safePdfText(
        font,
        renderThemeText("season_card_shiny", "Brillantes {count}", {
          count: shinyInSeason,
        }),
      ),
      {
      x: x + 8,
      y: seasonCardY + 19,
      size: 9,
      font,
      color: rgb(0.35, 0.35, 0.39),
      },
    );
  });

  await drawImageBox(
    pdf,
    page,
    coverUrl,
    MARGIN,
    170,
    PAGE_W - MARGIN * 2,
    330,
    textTemplate("annual_cover_missing", "Sin portada anual"),
    font,
  );
  drawFrameOrnaments(
    page,
    MARGIN,
    170,
    PAGE_W - MARGIN * 2,
    330,
    frameOrnamentColor,
  );

  drawCard(
    page,
    MARGIN,
    52,
    PAGE_W - MARGIN * 2 - 120,
    96,
    rgb(1, 1, 1),
    rgb(0.83, 0.87, 0.95),
  );
  page.drawText(safePdfText(fontBold, textTemplate("year_phrase_title", "Frase del año")), {
    x: MARGIN + 12,
    y: 128,
    size: 11,
    font: fontBold,
    color: rgb(0.18, 0.2, 0.28),
  });
  drawWrappedText(
    page,
    font,
    book.yearNote || textTemplate("year_phrase_empty", "Año sin frase guardada."),
    {
    x: MARGIN + 12,
    y: 110,
    maxWidth: PAGE_W - MARGIN * 2 - 144,
    fontSize: 10,
    lineHeight: 14,
    maxLines: 4,
    color: rgb(0.28, 0.29, 0.34),
    },
  );

  const qrBytes = await makeQrPngBytes(`${siteUrl}/year/${y}`);
  const qrImg = await pdf.embedPng(qrBytes);
  drawQrBlock(
    page,
    qrImg,
    PAGE_W - MARGIN - 96,
    52,
    textTemplate("qr_year_label", "Abrir año"),
    font,
  );
}

// ---------- Annual opening ----------
{
  const page = pdf.addPage([PAGE_W, PAGE_H]);
  drawPageBg(page, rgb(0.99, 0.99, 0.98));
  drawTopBand(page, rgb(0.93, 0.97, 0.94), 150);
  drawAnnualIllustrations(page, annualOrnamentPalette);

  page.drawText(
    safePdfText(fontBold, renderThemeText("annual_opening_title", "Así se sintió este año", {})),
    {
      x: MARGIN,
      y: PAGE_H - 76,
      size: 24,
      font: fontBold,
      color: rgb(0.15, 0.2, 0.18),
    },
  );
  drawWrappedText(
    page,
    font,
    renderThemeText(
      "annual_opening_subtitle",
      "Una lectura editorial del año vivido, con su árbol, sus flores y los momentos que lo hicieron único.",
      {},
    ),
    {
      x: MARGIN,
      y: PAGE_H - 102,
      maxWidth: PAGE_W - MARGIN * 2,
      fontSize: 11,
      lineHeight: 15,
      maxLines: 3,
      color: rgb(0.31, 0.36, 0.33),
    },
  );

  drawCard(page, MARGIN, 470, 224, 180, rgb(1, 1, 1), rgb(0.84, 0.9, 0.84));
  page.drawText(safePdfText(fontBold, textTemplate("year_phrase_title", "Frase del año")), {
    x: MARGIN + 14,
    y: 626,
    size: 11,
    font: fontBold,
    color: rgb(0.19, 0.24, 0.21),
  });
  drawWrappedText(
    page,
    font,
    book.yearNote || textTemplate("year_phrase_empty", "Año sin frase guardada."),
    {
      x: MARGIN + 14,
      y: 598,
      maxWidth: 196,
      fontSize: 11,
      lineHeight: 16,
      maxLines: 5,
      color: rgb(0.28, 0.31, 0.29),
    },
  );

  drawCard(page, 278, 470, PAGE_W - MARGIN - 278, 180, rgb(1, 1, 1), rgb(0.84, 0.9, 0.84));
  page.drawText(
    safePdfText(fontBold, renderThemeText("annual_tree_title", "Árbol anual", {})),
    {
      x: 292,
      y: 626,
      size: 11,
      font: fontBold,
      color: rgb(0.19, 0.24, 0.21),
    },
  );
  page.drawText(safePdfText(fontBold, book.annualTreeLabel), {
    x: 292,
    y: 602,
    size: 16,
    font: fontBold,
    color: rgb(0.16, 0.24, 0.19),
  });
  drawWrappedText(
    page,
    font,
    renderThemeText(
      "annual_tree_note",
      "El mismo árbol que crece en sendero y bosque. Aquí resume la fuerza y la constancia del capítulo anual.",
      {},
    ),
    {
      x: 292,
      y: 576,
      maxWidth: 144,
      fontSize: 10,
      lineHeight: 14,
      maxLines: 3,
      color: rgb(0.31, 0.35, 0.33),
    },
  );
  await drawImageBox(
    pdf,
    page,
    book.annualTreeAssetPath,
    432,
    490,
    88,
    100,
    book.annualTreeLabel,
    font,
  );
  drawWrappedText(
    page,
    font,
    renderThemeText("annual_tree_summary", "{count} flores - {months} meses activos - {favorites} favoritas", {
      count: book.totalPages,
      months: book.activeMonths,
      favorites: book.favoriteCount,
    }),
    {
      x: 292,
      y: 500,
      maxWidth: 144,
      fontSize: 10,
      lineHeight: 14,
      maxLines: 3,
      color: rgb(0.31, 0.35, 0.33),
    },
  );

  drawCard(page, MARGIN, 166, 286, 216, rgb(1, 1, 1), rgb(0.84, 0.9, 0.84));
  page.drawText(
    safePdfText(fontBold, renderThemeText("annual_highlights_title", "Momentos que definieron el año", {})),
    {
      x: MARGIN + 14,
      y: 356,
      size: 11,
      font: fontBold,
      color: rgb(0.19, 0.24, 0.21),
    },
  );
  let highlightY = 332;
  if (!book.bestMoments.length) {
    drawWrappedText(
      page,
      font,
      "Todavía no hay suficientes flores para destacar momentos clave del año.",
      {
        x: MARGIN + 14,
        y: highlightY,
        maxWidth: 258,
        fontSize: 10,
        lineHeight: 14,
        maxLines: 4,
        color: rgb(0.39, 0.42, 0.4),
      },
    );
  } else {
    book.bestMoments.forEach((item, index) => {
      const meta = joinMeta([item.planTypeLabel, item.locationLabel]);
      drawWrappedText(page, fontBold, `${index + 1}. ${editorialMemoryTitle(item)}`, {
        x: MARGIN + 14,
        y: highlightY,
        maxWidth: 258,
        fontSize: 10,
        lineHeight: 12,
        maxLines: 2,
        color: rgb(0.16, 0.2, 0.18),
      });
      if (meta) {
        drawWrappedText(page, font, meta, {
          x: MARGIN + 14,
          y: highlightY - 16,
          maxWidth: 258,
          fontSize: 9,
          lineHeight: 11,
          maxLines: 2,
          color: rgb(0.39, 0.42, 0.4),
        });
      }
      highlightY -= 46;
    });
  }

  drawCard(page, 338, 166, PAGE_W - MARGIN - 338, 216, rgb(1, 1, 1), rgb(0.84, 0.9, 0.84));
  drawWrappedText(
    page,
    fontBold,
    renderThemeText("annual_chapter_preview_title", "Cómo se repartio el capítulo", {}),
    {
      x: 352,
      y: 356,
      maxWidth: PAGE_W - MARGIN - 352 - 12,
      fontSize: 11,
      lineHeight: 13,
      maxLines: 2,
      color: rgb(0.19, 0.24, 0.21),
    },
  );
  let chapterY = 318;
  (["spring", "summer", "autumn", "winter"] as Season[]).forEach((season) => {
    const chapter = book.chapters[season];
    if (!chapter.items.length) return;
    const palette = seasonPalette(season, seasonPaletteOverrides);
    drawCard(page, 352, chapterY - 18, 178, 34, rgb(1, 1, 1), palette.soft);
    page.drawText(safePdfText(fontBold, seasonLabel(season, seasonLabels)), {
      x: 364,
      y: chapterY + 2,
      size: 10,
      font: fontBold,
      color: palette.accent,
    });
    page.drawText(
        safePdfText(
          font,
          `${chapter.items.length} flores - ${chapter.favoriteCount} favoritas`,
        ),
      {
        x: 364,
        y: chapterY - 12,
        size: 9,
        font,
        color: rgb(0.39, 0.42, 0.4),
      },
    );
    chapterY -= 44;
  });
}

// ---------- Annual milestones ----------
{
  const page = pdf.addPage([PAGE_W, PAGE_H]);
  drawPageBg(page, rgb(0.992, 0.994, 0.989));
  drawTopBand(page, rgb(0.93, 0.96, 0.92), 148);
  drawAnnualIllustrations(page, annualOrnamentPalette);

  page.drawText(
    safePdfText(fontBold, renderThemeText("annual_milestones_title", "Hitos del año", {})),
    {
      x: MARGIN,
      y: PAGE_H - 76,
      size: 24,
      font: fontBold,
      color: rgb(0.16, 0.22, 0.18),
    },
  );
  drawWrappedText(
    page,
    font,
    renderThemeText(
      "annual_milestones_subtitle",
      "Solo entran aquí los hitos ya reclamados, los que de verdad pasaron a formar parte visible de la historia del año.",
      {},
    ),
    {
      x: MARGIN,
      y: PAGE_H - 104,
      maxWidth: PAGE_W - MARGIN * 2,
      fontSize: 11,
      lineHeight: 15,
      maxLines: 3,
      color: rgb(0.31, 0.36, 0.33),
    },
  );

  drawCard(page, MARGIN, 650, 160, 64, rgb(1, 1, 1), rgb(0.84, 0.9, 0.84));
  page.drawText(safePdfText(font, "Hitos visibles"), {
    x: MARGIN + 12,
    y: 690,
    size: 9,
    font,
    color: rgb(0.39, 0.42, 0.4),
  });
  page.drawText(safePdfText(fontBold, String(effectiveYearMilestonesCount)), {
    x: MARGIN + 12,
    y: 664,
    size: 20,
    font: fontBold,
    color: rgb(0.16, 0.22, 0.18),
  });

  drawCard(page, MARGIN + 174, 650, 210, 64, rgb(1, 1, 1), rgb(0.84, 0.9, 0.84));
  page.drawText(safePdfText(font, "Desbloqueos editoriales"), {
    x: MARGIN + 186,
    y: 690,
    size: 9,
    font,
    color: rgb(0.39, 0.42, 0.4),
  });
  page.drawText(safePdfText(fontBold, String(editorialRewardCount)), {
    x: MARGIN + 186,
    y: 664,
    size: 20,
    font: fontBold,
    color: rgb(0.16, 0.22, 0.18),
  });

  drawCard(page, PAGE_W - MARGIN - 145, 650, 145, 64, rgb(1, 1, 1), rgb(0.84, 0.9, 0.84));
  page.drawText(safePdfText(font, "Rango visible"), {
    x: PAGE_W - MARGIN - 133,
    y: 690,
    size: 9,
    font,
    color: rgb(0.39, 0.42, 0.4),
  });
  page.drawText(
    safePdfText(
      fontBold,
      yearClaimedMilestoneTrees[0]?.rank
        ? String(yearClaimedMilestoneTrees[0].rank)
        : "Sin hitos",
    ),
    {
      x: PAGE_W - MARGIN - 133,
      y: 664,
      size: 16,
      font: fontBold,
      color: rgb(0.16, 0.22, 0.18),
    },
  );

  if (!yearClaimedMilestoneTrees.length) {
    drawCard(page, MARGIN, 160, PAGE_W - MARGIN * 2, 448, rgb(1, 1, 1), rgb(0.84, 0.9, 0.84));
    drawWrappedText(
      page,
      font,
      "Todavía no hay hitos reclamados visibles en este año. Cuando aparezcan en el sendero y formen parte del relato, también entraran aquí.",
      {
        x: MARGIN + 20,
        y: 410,
        maxWidth: PAGE_W - MARGIN * 2 - 40,
        fontSize: 14,
        lineHeight: 22,
        maxLines: 4,
        color: rgb(0.38, 0.41, 0.39),
      },
    );
  } else {
    const milestoneCards = yearClaimedMilestoneTrees.slice(0, 6);
    const cols = 2;
    const cardW = 248;
    const cardH = 126;
    const gapX = 18;
    const gapY = 18;
    const startX = MARGIN;
    const startY = 472;

    milestoneCards.forEach((tree, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY - row * (cardH + gapY);
      drawCard(page, x, y, cardW, cardH, rgb(1, 1, 1), rgb(0.84, 0.9, 0.84));
      drawCard(page, x + 14, y + 24, 76, 76, rgb(0.97, 0.98, 0.96), rgb(0.88, 0.91, 0.86));
      drawProgressionMilestoneTreePdf(page, x + 20, y + 30, 64, {
        rank: tree.rank,
        importance: tree.importance,
        rarity: tree.rarity,
        accentColor: tree.accentColor,
        claimed: true,
      });
      drawWrappedText(page, fontBold, tree.title, {
        x: x + 102,
        y: y + 96,
        maxWidth: cardW - 116,
        fontSize: 11,
        lineHeight: 13,
        maxLines: 2,
        color: rgb(0.16, 0.22, 0.18),
      });
      drawWrappedText(page, font, `Reclamado ${shortClaimDate(tree.claimedAt)}`, {
        x: x + 102,
        y: y + 68,
        maxWidth: cardW - 116,
        fontSize: 9,
        lineHeight: 11,
        maxLines: 1,
        color: rgb(0.39, 0.42, 0.4),
      });
      if (tree.description) {
        drawWrappedText(page, font, tree.description, {
          x: x + 102,
          y: y + 52,
          maxWidth: cardW - 116,
          fontSize: 8.5,
          lineHeight: 10.5,
          maxLines: 3,
          color: rgb(0.33, 0.36, 0.34),
        });
      }
      const chips = [tree.rank, tree.importance, tree.rarity];
      chips.forEach((chip, chipIndex) => {
        const chipX = x + 102 + chipIndex * 42;
        drawCard(page, chipX, y + 12, 38, 20, rgb(0.97, 0.98, 0.96), rgb(0.88, 0.91, 0.86));
        drawWrappedText(page, font, chip, {
          x: chipX + 5,
          y: y + 19,
          maxWidth: 28,
          fontSize: 6.5,
          lineHeight: 7,
          maxLines: 2,
          color: rgb(0.33, 0.36, 0.34),
        });
      });
    });
  }
}

// ---------- Annual geo spread ----------
if (geoMoments.length > 0) {
  const page = pdf.addPage([PAGE_W, PAGE_H]);
  drawPageBg(page, rgb(0.994, 0.994, 0.99));
  drawTopBand(page, rgb(0.95, 0.97, 0.93), 144);
  drawAnnualIllustrations(page, annualOrnamentPalette);

  page.drawText(
    safePdfText(
      fontBold,
      renderThemeText("annual_geo_title", "La huella geográfica del año", {}),
    ),
    {
      x: MARGIN,
      y: PAGE_H - 76,
      size: 24,
      font: fontBold,
      color: rgb(0.15, 0.2, 0.18),
    },
  );
  drawWrappedText(
    page,
    font,
    renderThemeText(
      "annual_geo_subtitle",
      "No es un mapa técnico, sino una lectura de los lugares que sostuvieron el capítulo: donde volvisteis, donde paso algo y que zonas dejaron huella.",
      {},
    ),
    {
      x: MARGIN,
      y: PAGE_H - 102,
      maxWidth: PAGE_W - MARGIN * 2,
      fontSize: 11,
      lineHeight: 15,
      maxLines: 3,
      color: rgb(0.31, 0.36, 0.33),
    },
  );

  drawCard(page, MARGIN, 406, 262, 248, rgb(1, 1, 1), rgb(0.86, 0.9, 0.84));
  page.drawText(
    safePdfText(fontBold, textTemplate("annual_geo_places_title", "Lugares que sostuvieron el año")),
    {
      x: MARGIN + 14,
      y: 628,
      size: 11,
      font: fontBold,
      color: rgb(0.2, 0.24, 0.2),
    },
  );
  let geoY = 596;
  geoMoments.slice(0, 4).forEach((place, index) => {
    drawCard(page, MARGIN + 12, geoY - 38, 238, 44, rgb(1, 1, 1), rgb(0.92, 0.95, 0.91));
    drawWrappedText(page, fontBold, `${index + 1}. ${place.label}`, {
      x: MARGIN + 24,
      y: geoY - 4,
      maxWidth: 214,
      fontSize: 10,
      lineHeight: 12,
      maxLines: 2,
      color: rgb(0.18, 0.22, 0.19),
    });
    drawWrappedText(
      page,
      font,
      joinMeta([
        `${place.count} recuerdo${place.count === 1 ? "" : "s"}`,
        place.favoriteCount > 0
          ? `${place.favoriteCount} favorita${place.favoriteCount === 1 ? "" : "s"}`
          : null,
        place.planTypes[0] ?? null,
      ]) || "Lugar del capítulo",
      {
        x: MARGIN + 24,
        y: geoY - 18,
        maxWidth: 214,
        fontSize: 8.5,
        lineHeight: 10,
        maxLines: 2,
        color: rgb(0.36, 0.39, 0.37),
      },
    );
    geoY -= 54;
  });

  drawCard(page, 316, 406, PAGE_W - MARGIN - 316, 248, rgb(1, 1, 1), rgb(0.86, 0.9, 0.84));
  page.drawText(
    safePdfText(fontBold, textTemplate("annual_geo_constellation_title", "Constelacion del año")),
    {
      x: 330,
      y: 628,
      size: 11,
      font: fontBold,
      color: rgb(0.2, 0.24, 0.2),
    },
  );
  const drewConstellation = drawGeoConstellation(
    page,
    geoMoments.slice().sort((left, right) => left.firstDate.localeCompare(right.firstDate)),
    330,
    444,
    PAGE_W - MARGIN - 344,
    138,
    rgb(0.34, 0.53, 0.43),
  );
  if (!drewConstellation) {
    drawWrappedText(
      page,
      font,
      textTemplate(
        "annual_geo_constellation_empty",
        "Todavía no hay suficientes coordenadas guardadas para dibujar una constelación del año, pero los lugares si forman ya una memoria geográfica.",
      ),
      {
        x: 330,
        y: 560,
        maxWidth: PAGE_W - MARGIN - 346,
        fontSize: 10,
        lineHeight: 14,
        maxLines: 6,
        color: rgb(0.36, 0.39, 0.37),
      },
    );
  }
  drawWrappedText(
    page,
    font,
    renderThemeText(
      "annual_geo_summary",
      "{places} lugares distintos - {months} meses con huella geográfica",
      {
        places: uniqueLocationsCount,
        months: geoMonthsCount,
      },
    ),
    {
      x: 330,
      y: 424,
      maxWidth: PAGE_W - MARGIN - 346,
      fontSize: 10,
      lineHeight: 14,
      maxLines: 2,
      color: rgb(0.31, 0.34, 0.31),
    },
  );

  drawCard(page, MARGIN, 144, PAGE_W - MARGIN * 2, 218, rgb(1, 1, 1), rgb(0.88, 0.9, 0.92));
  page.drawText(
    safePdfText(fontBold, textTemplate("annual_geo_rhythm_title", "Como se movió el capítulo")),
    {
      x: MARGIN + 14,
      y: 336,
      size: 11,
      font: fontBold,
      color: rgb(0.2, 0.24, 0.2),
    },
  );
  drawWrappedText(
    page,
    font,
    renderThemeText(
      "annual_geo_rhythm_note",
      "El año empezó por {first} y termino por {last}. Entre medias quedaron lugares repetidos, favoritos y puntos que hicieron de ancla para vuestra historia.",
      {
        first: editorialLocationLabel(firstGeoMoment?.locationLabel) ?? "vuestro primer lugar guardado",
        last: editorialLocationLabel(lastGeoMoment?.locationLabel) ?? "vuestro último lugar guardado",
      },
    ),
    {
      x: MARGIN + 14,
      y: 312,
      maxWidth: PAGE_W - MARGIN * 2 - 28,
      fontSize: 11,
      lineHeight: 15,
      maxLines: 3,
      color: rgb(0.31, 0.34, 0.31),
    },
  );
  geoMoments.slice(0, 3).forEach((place, index) => {
    drawCard(
      page,
      MARGIN + 14 + index * 168,
      180,
      156,
      74,
      rgb(1, 1, 1),
      rgb(0.92, 0.95, 0.91),
    );
    drawWrappedText(page, fontBold, place.label, {
      x: MARGIN + 26 + index * 168,
      y: 264,
      maxWidth: 132,
      fontSize: 10,
      lineHeight: 12,
      maxLines: 2,
      color: rgb(0.18, 0.22, 0.19),
    });
    drawWrappedText(
      page,
      font,
      `${monthLabelFromIso(place.firstDate)} - ${monthLabelFromIso(place.lastDate)}`,
      {
        x: MARGIN + 26 + index * 168,
        y: 240,
        maxWidth: 132,
        fontSize: 9,
        lineHeight: 11,
        maxLines: 1,
        color: rgb(0.36, 0.39, 0.37),
      },
    );
  });

  // --- Geo spread page 2: detailed location directory ---
  {
    const page2 = pdf.addPage([PAGE_W, PAGE_H]);
    drawPageBg(page2, rgb(0.994, 0.994, 0.99));
    drawTopBand(page2, rgb(0.93, 0.96, 0.94), 120);
    drawAnnualIllustrations(page2, annualOrnamentPalette);

    page2.drawText(
      safePdfText(fontBold, "Directorio de lugares"),
      {
        x: MARGIN,
        y: PAGE_H - 72,
        size: 22,
        font: fontBold,
        color: rgb(0.15, 0.2, 0.18),
      },
    );
    drawWrappedText(
      page2,
      font,
      `Todos los puntos que dejaron marca durante ${y}. Cada lugar cuenta cuantas flores guarda y en que momento del capítulo aparecio.`,
      {
        x: MARGIN,
        y: PAGE_H - 96,
        maxWidth: PAGE_W - MARGIN * 2,
        fontSize: 10.5,
        lineHeight: 14,
        maxLines: 3,
        color: rgb(0.31, 0.36, 0.33),
      },
    );

    // --- Full location directory ---
    const directoryX = MARGIN;
    const directoryW = PAGE_W - MARGIN * 2;
    const colLeftW = directoryW * 0.5 - 6;
    const colRightW = directoryW * 0.5 - 6;
    const colRightX = MARGIN + directoryW * 0.5 + 6;
    const maxPlacesPerColumn = 10;
    const allPlaces = geoHighlights.slice(0, maxPlacesPerColumn * 2);
    const leftPlaces = allPlaces.slice(0, maxPlacesPerColumn);
    const rightPlaces = allPlaces.slice(maxPlacesPerColumn, maxPlacesPerColumn * 2);

    const drawPlaceRow = (
      targetPage: Parameters<typeof drawCard>[0],
      place: GeoHighlight,
      index: number,
      x: number,
      y: number,
      colW: number,
    ) => {
      const rowH = 52;
      drawCard(targetPage, x, y - rowH + 6, colW, rowH, rgb(1, 1, 1), rgb(0.92, 0.94, 0.91));

      // Numbering circle
      targetPage.drawCircle({
        x: x + 16,
        y: y - 14,
        size: 10,
        color: rgb(0.88, 0.92, 0.87),
        borderColor: rgb(0.7, 0.78, 0.68),
        borderWidth: 0.8,
      });
      targetPage.drawText(safePdfText(fontBold, String(index + 1)), {
        x: x + (index + 1 >= 10 ? 11 : 13),
        y: y - 18,
        size: 8,
        font: fontBold,
        color: rgb(0.28, 0.36, 0.28),
      });

      // Place label
      drawWrappedText(targetPage, fontBold, place.label, {
        x: x + 32,
        y: y - 2,
        maxWidth: colW - 44,
        fontSize: 9.5,
        lineHeight: 11,
        maxLines: 2,
        color: rgb(0.18, 0.22, 0.19),
      });

      // Meta line: count + dates + plan types
      const dateRange =
        place.firstDate === place.lastDate
          ? monthLabelFromIso(place.firstDate)
          : `${monthLabelFromIso(place.firstDate)}-${monthLabelFromIso(place.lastDate)}`;
      const metaParts = [
        `${place.count} flor${place.count === 1 ? "" : "es"}`,
        dateRange,
        place.favoriteCount > 0 ? `${place.favoriteCount} fav` : null,
        place.planTypes[0] ?? null,
      ];
      drawWrappedText(
        targetPage,
        font,
        metaParts.filter(Boolean).join(" · "),
        {
          x: x + 32,
          y: y - 22,
          maxWidth: colW - 44,
          fontSize: 8,
          lineHeight: 10,
          maxLines: 2,
          color: rgb(0.38, 0.42, 0.39),
        },
      );
    };

    // Draw left column
    let rowY = PAGE_H - 142;
    leftPlaces.forEach((place, index) => {
      drawPlaceRow(page2, place, index, directoryX, rowY, colLeftW);
      rowY -= 56;
    });

    // Draw right column
    rowY = PAGE_H - 142;
    rightPlaces.forEach((place, index) => {
      drawPlaceRow(page2, place, index + maxPlacesPerColumn, colRightX, rowY, colRightW);
      rowY -= 56;
    });

    // --- Seasonal geo breakdown at the bottom ---
    const breakdownY = 168;
    drawCard(
      page2,
      MARGIN,
      breakdownY - 100,
      PAGE_W - MARGIN * 2,
      110,
      rgb(1, 1, 1),
      rgb(0.88, 0.91, 0.86),
    );
    page2.drawText(
      safePdfText(fontBold, "Huella por estación"),
      {
        x: MARGIN + 14,
        y: breakdownY - 4,
        size: 11,
        font: fontBold,
        color: rgb(0.2, 0.24, 0.2),
      },
    );

    const seasonOrder: Season[] = ["spring", "summer", "autumn", "winter"];
    const seasonGeoCardW = (PAGE_W - MARGIN * 2 - 56 - 24) / 4;
    seasonOrder.forEach((s, idx) => {
      const seasonItems = book.chapters[s].items.filter(
        (item) => String(item.locationLabel ?? "").trim(),
      );
      const seasonPlaces = new Set(
        seasonItems.map((item) =>
          editorialLocationLabel(item.locationLabel) ?? "",
        ).filter(Boolean),
      );
      const palette = seasonPalette(s, seasonPaletteOverrides);
      const cardX = MARGIN + 14 + idx * (seasonGeoCardW + 8);
      const cardY = breakdownY - 88;
      drawCard(page2, cardX, cardY, seasonGeoCardW, 68, rgb(1, 1, 1), palette.soft);
      drawFlower(
        page2,
        cardX + seasonGeoCardW - 12,
        cardY + 54,
        7,
        palette.soft,
        palette.accent,
      );
      page2.drawText(safePdfText(fontBold, seasonLabel(s, seasonLabels)), {
        x: cardX + 8,
        y: cardY + 50,
        size: 9,
        font: fontBold,
        color: palette.accent,
      });
      page2.drawText(
        safePdfText(font, `${seasonPlaces.size} lugar${seasonPlaces.size === 1 ? "" : "es"}`),
        {
          x: cardX + 8,
          y: cardY + 34,
          size: 8.5,
          font,
          color: rgb(0.35, 0.38, 0.36),
        },
      );
      page2.drawText(
        safePdfText(font, `${seasonItems.length} flor${seasonItems.length === 1 ? "" : "es"}`),
        {
          x: cardX + 8,
          y: cardY + 20,
          size: 8.5,
          font,
          color: rgb(0.35, 0.38, 0.36),
        },
      );
    });

    // Footer summary
    drawWrappedText(
      page2,
      font,
      renderThemeText(
        "annual_geo_summary",
        "{places} lugares distintos - {months} meses con huella geográfica",
        {
          places: uniqueLocationsCount,
          months: geoMonthsCount,
        },
      ),
      {
        x: MARGIN,
        y: 48,
        maxWidth: PAGE_W - MARGIN * 2,
        fontSize: 9.5,
        lineHeight: 13,
        maxLines: 2,
        color: rgb(0.36, 0.39, 0.37),
      },
    );
  }
}

// ---------- Chapters + pages ----------
const seasons: Season[] = ["spring", "summer", "autumn", "winter"];

for (const s of seasons) {
  const chapter = book.chapters[s];
  const list = chapter.items;
  if (!list.length) continue;

  // Chapter cover
  {
    const palette = seasonPalette(s, seasonPaletteOverrides);
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    drawPageBg(page, palette.bg);
    // Header info (title/date/element/stars) needs a taller band.
    drawTopBand(page, palette.soft, 156);
    drawSeasonIllustrations(
      page,
      s,
      palette.accent,
      seasonOrnamentPalette(s, palette.accent),
    );

    page.drawText(
      safePdfText(
        fontBold,
        renderPdfTemplate(
          pdfTheme.textTemplates.season_chapter_title ||
            "Capítulo de {season}",
          { season: seasonLabel(s, seasonLabels) },
        ) + ` - ${y}`,
      ),
      {
      x: MARGIN,
      y: PAGE_H - 74,
      size: 24,
      font: fontBold,
      color: palette.accent,
      },
    );

    const shiny = list.filter((x) => x.mood_state === "shiny").length;
    const avgStars = chapter.avgStars;

    drawCard(
      page,
      MARGIN,
      PAGE_H - 160,
      PAGE_W - MARGIN * 2,
      58,
      rgb(1, 1, 1),
      palette.soft,
    );
    page.drawText(
      safePdfText(
        fontBold,
        renderThemeText("chapter_stats_pages", "Flores: {count}", {
          count: list.length,
        }),
      ),
      {
      x: MARGIN + 12,
      y: PAGE_H - 138,
      size: 12,
      font: fontBold,
      color: rgb(0.18, 0.18, 0.2),
      },
    );
    page.drawText(
      safePdfText(
        font,
        renderThemeText("chapter_stats_shiny", "Brillantes: {count}", {
          count: shiny,
        }),
      ),
      {
      x: MARGIN + 140,
      y: PAGE_H - 138,
      size: 12,
      font,
      color: rgb(0.25, 0.25, 0.3),
      },
    );
    page.drawText(
      safePdfText(
        font,
        renderThemeText("chapter_stats_avg_stars", "Media estrellas: {value}", {
          value: avgStars.toFixed(1),
        }),
      ),
      {
      x: MARGIN + 270,
      y: PAGE_H - 138,
      size: 12,
      font,
      color: rgb(0.25, 0.25, 0.3),
      },
    );

    const chapterCover = chapter.heroItem?.heroImageUrl ?? null;

    await drawImageBox(
      pdf,
      page,
      chapterCover,
      MARGIN,
      304,
      PAGE_W - MARGIN * 2,
      242,
      safePdfText(font, `Sin portada de ${seasonLabel(s, seasonLabels)}`),
      font,
    );
    drawFrameOrnaments(
      page,
      MARGIN,
      304,
      PAGE_W - MARGIN * 2,
      242,
      frameOrnamentColor,
    );

    const chapterNote =
      chapter.note ||
      renderThemeText(
        "season_chapter_note_fallback",
        "Capítulo {season} con {count} flores.",
        { season: seasonLabel(s, seasonLabels), count: list.length },
      );

    drawCard(
      page,
      MARGIN,
      116,
      328,
      150,
      rgb(1, 1, 1),
      palette.soft,
    );
    page.drawText(
      safePdfText(fontBold, textTemplate("season_note_title", "Nota de temporada")),
      {
      x: MARGIN + 12,
      y: 242,
      size: 11,
      font: fontBold,
      color: palette.accent,
      },
    );
    drawWrappedText(page, font, chapterNote, {
      x: MARGIN + 12,
      y: 218,
      maxWidth: 304,
      fontSize: 10,
      lineHeight: 14,
      maxLines: 7,
      color: rgb(0.24, 0.24, 0.28),
    });

    const topMoments = chapter.topMoments;

    drawCard(
      page,
      376,
      116,
      PAGE_W - MARGIN - 376,
      150,
      rgb(1, 1, 1),
      palette.soft,
    );
    page.drawText(
      safePdfText(fontBold, textTemplate("top_moments_title", "Top momentos")),
      {
      x: 388,
      y: 242,
      size: 11,
      font: fontBold,
      color: palette.accent,
      },
    );
    let topY = 218;
    if (!topMoments.length) {
      page.drawText(
        safePdfText(font, textTemplate("top_moments_empty", "Sin flores destacadas")),
        {
        x: 388,
        y: topY,
        size: 10,
        font,
        color: rgb(0.36, 0.36, 0.4),
        },
      );
    } else {
      topMoments.forEach((it, idx) => {
        const label = `${idx + 1}. ${editorialMemoryTitle(it)}`;
        drawWrappedText(page, font, label, {
          x: 388,
          y: topY,
          maxWidth: PAGE_W - MARGIN - 388 - 8,
          fontSize: 9,
          lineHeight: 12,
          maxLines: 2,
          color: rgb(0.3, 0.3, 0.34),
        });
        topY -= 28;
      });
    }

    page.drawText(
      safePdfText(font, textTemplate("chapter_start_label", "Inicio del capítulo")),
      {
      x: MARGIN,
      y: 86,
      size: 11,
      font,
      color: rgb(0.35, 0.35, 0.38),
      },
    );
  }

  // Chapter pages
  for (const p of list) {
    const palette = seasonPalette(s, seasonPaletteOverrides);
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    const rawNoteTexts = extractTexts(p.canvas_objects || []);
    const planSummaryText = String(p.planSummary ?? "").trim();
    const descriptionText =
      planSummaryText ||
      p.textExcerpt ||
      "Esta flor forma parte del año aunque se guardará con pocas palabras. El libro la recoge como un recuerdo que suma cuerpo al capítulo.";
    const reflectionHighlights = p.reflections
      .map((reflection) => ({
        authorLabel: reflection.authorLabel,
        excerpt: buildReflectionExcerpt(reflection),
      }))
      .filter((entry) => entry.excerpt)
      .slice(0, 2);
    const hasReflections = reflectionHighlights.length > 0;
    const canvasSummary = buildCanvasSummaryCopy(p);
    const canvasDetailTexts = rawNoteTexts.slice(planSummaryText ? 0 : 1);
    const canvasInlineExcerpts = canvasDetailTexts.slice(0, 2);
    const continuationTexts = canvasDetailTexts.slice(2);
    const imgUrl = p.heroImageUrl;
    const hasHeroImage = Boolean(imgUrl);
    const isSpecialPage = p.archetype === "memory_special";
    const isMinimalPage = p.archetype === "memory_minimal";
    const isCanvasPage = p.archetype === "memory_canvas";
    const isFeaturePage = p.archetype === "memory_feature" || isCanvasPage;
    const hasCanvasVisual =
      p.canvasSummary.photoCount > 0 ||
      p.canvasSummary.videoCount > 0 ||
      p.canvasSummary.stickerCount > 0 ||
      p.canvasSummary.textCount > 0;
    const specialPalette = specialMomentPalette(p.specialMomentKind);
    drawPageBg(page, isSpecialPage ? rgb(0.995, 0.992, 0.988) : rgb(0.99, 0.99, 0.99));
    drawTopBand(
      page,
      isSpecialPage ? specialPalette.soft : palette.soft,
      isSpecialPage
        ? chapterHeaderHeightSafe + 34
        : isMinimalPage
          ? chapterHeaderHeightSafe
          : isFeaturePage
            ? chapterHeaderHeightSafe + 18
            : chapterHeaderHeightSafe,
    );
    if (isSpecialPage) {
      drawAnnualIllustrations(page, annualOrnamentPalette);
    }

    const title = editorialMemoryTitle(p);
    page.drawText(safePdfText(fontBold, title), {
      x: MARGIN,
      y: PAGE_H - 74,
      size: 18,
      font: fontBold,
      color: isSpecialPage ? specialPalette.ink : rgb(0.12, 0.12, 0.14),
    });

    page.drawText(safePdfText(font, `${p.date.slice(0, 10)} - ${seasonLabel(s, seasonLabels)}`), {
      x: MARGIN,
      y: PAGE_H - 95,
      size: 11,
      font,
      color: isSpecialPage ? specialPalette.ink : rgb(0.3, 0.3, 0.34),
    });

    const familyMeta = p.flowerFamily ? `Flor ${FLOWER_FAMILY_LABELS[p.flowerFamily]}` : null;
    const headerMeta = joinMeta([p.planTypeLabel, familyMeta, p.locationLabel]);
    page.drawText(safePdfText(font, headerMeta || "Flor del año"), {
      x: MARGIN,
      y: PAGE_H - 113,
      size: 10,
      font,
      color: isSpecialPage ? specialPalette.ink : rgb(0.36, 0.36, 0.38),
    });
    const stars = p.rating && p.rating > 0 ? "*".repeat(p.rating) : null;
    if (stars) {
      page.drawText(safePdfText(font, `Estrellas ${stars}`), {
        x: MARGIN,
        y: PAGE_H - 129,
        size: 10,
        font,
        color: isSpecialPage ? specialPalette.ink : rgb(0.36, 0.36, 0.38),
      });
    }
    const specialLabel = specialMomentLabelText(p.specialMomentKind);
    if (specialLabel) {
      const badgeW = isSpecialPage ? 144 : 122;
      drawCard(
        page,
        PAGE_W - MARGIN - badgeW,
        PAGE_H - 120,
        badgeW,
        28,
        rgb(1, 1, 1),
        isSpecialPage ? specialPalette.soft : palette.soft,
      );
      page.drawText(safePdfText(fontBold, specialLabel), {
        x: PAGE_W - MARGIN - badgeW + 12,
        y: PAGE_H - 109,
        size: 10,
        font: fontBold,
        color: isSpecialPage ? specialPalette.accent : palette.accent,
      });
    }
    if (
      p.textExcerpt &&
      p.textExcerpt.trim() !== descriptionText.trim() &&
      (isFeaturePage || isSpecialPage) &&
      !isMinimalPage
    ) {
      drawWrappedText(page, font, p.textExcerpt, {
        x: MARGIN,
        y: PAGE_H - 146,
        maxWidth: PAGE_W - MARGIN * 2,
        fontSize: 10,
        lineHeight: 14,
        maxLines: 2,
        color: isSpecialPage ? specialPalette.ink : rgb(0.29, 0.33, 0.31),
      });
    }

    const mediaQrTargets = buildMediaQrTargetsForPage(p, siteUrl, textTemplate);
    const mediaQrs: Array<{ img: PDFImage; label: string }> = [];
    for (const target of mediaQrTargets) {
      const qrBytes = await makeQrPngBytes(target.url);
      const qrImg = await pdf.embedPng(qrBytes);
      mediaQrs.push({ img: qrImg, label: target.label });
    }

    const hasMediaQrs = mediaQrs.length > 0;
    const noteLines = buildNotesLines(
      font,
      continuationTexts,
      10,
      PAGE_W - MARGIN * 2 - (hasMediaQrs ? 140 : 0) - 24,
      safePdfText(
        font,
        pdfTheme.textTemplates.empty_note || "- Sin notas en esta página",
      ),
    );

    if (isSpecialPage) {
      await drawImageBox(
        pdf,
        page,
        imgUrl,
        MARGIN,
        392,
        248,
        248,
        textTemplate("page_cover_missing", "Sin portada para esta página"),
        font,
      );
      drawFrameOrnaments(page, MARGIN, 392, 248, 248, frameOrnamentColor);
      drawCard(
        page,
        320,
        392,
        PAGE_W - MARGIN - 320,
        248,
        rgb(1, 1, 1),
        specialPalette.soft,
      );
      page.drawText(
        safePdfText(
          fontBold,
          renderThemeText(
            "memory_special_title",
            "Lo que hizo único este momento",
            {},
          ),
        ),
        {
          x: 334,
          y: 618,
          size: 12,
          font: fontBold,
          color: specialPalette.accent,
        },
      );
      if (specialLabel) {
        drawCard(page, 334, 584, 132, 26, rgb(1, 1, 1), specialPalette.soft);
        page.drawText(safePdfText(fontBold, specialLabel), {
          x: 346,
          y: 594,
          size: 10,
          font: fontBold,
          color: specialPalette.accent,
        });
      }
      drawWrappedText(
        page,
        font,
        headerMeta || "Flor especial del año",
        {
          x: 334,
          y: 560,
          maxWidth: PAGE_W - MARGIN - 346,
          fontSize: 10,
          lineHeight: 14,
          maxLines: 2,
          color: specialPalette.ink,
        },
      );
      if (stars) {
        page.drawText(safePdfText(font, `Estrellas ${stars}`), {
          x: 334,
          y: 526,
          size: 10,
          font,
          color: specialPalette.ink,
        });
      }
      drawWrappedText(
        page,
        font,
        p.textExcerpt ||
          "Esta flor ocupa una composición distinta porque marco el tono del año y merece una lectura más ceremonial dentro del libro.",
        {
          x: 334,
          y: stars ? 504 : 526,
          maxWidth: PAGE_W - MARGIN - 346,
          fontSize: 11,
          lineHeight: 16,
          maxLines: 7,
          color: rgb(0.28, 0.31, 0.3),
        },
      );
    } else if (isMinimalPage) {
      const cardX = MARGIN;
      const cardY = 250;
      const cardW = PAGE_W - MARGIN * 2;
      const cardH = 332;
      const flowerW = 162;
      const flowerH = 210;
      drawCard(page, cardX, cardY, cardW, cardH, rgb(1, 1, 1), rgb(0.88, 0.9, 0.92));
      drawFlowerFamilyCard(
        page,
        font,
        fontBold,
        p.flowerFamily,
        cardX + 16,
        cardY + 74,
        flowerW,
        flowerH,
        p.planTypeLabel,
        p.locationLabel,
      );
      page.drawText(
        safePdfText(fontBold, textTemplate("memory_description_title", "Sentido del recuerdo")),
        {
          x: cardX + flowerW + 34,
          y: cardY + cardH - 28,
          size: 12,
          font: fontBold,
          color: rgb(0.18, 0.2, 0.22),
        },
      );
      drawWrappedText(page, font, descriptionText, {
        x: cardX + flowerW + 34,
        y: cardY + cardH - 58,
        maxWidth: cardW - flowerW - 52,
        fontSize: 11,
        lineHeight: 16,
        maxLines: 7,
        color: rgb(0.3, 0.32, 0.34),
      });
      const compactMeta = joinMeta([
        p.planTypeLabel,
        familyMeta,
        p.locationLabel,
        stars ? `Estrellas ${stars}` : null,
      ]);
      if (compactMeta) {
        drawWrappedText(page, font, compactMeta, {
          x: cardX + flowerW + 34,
          y: cardY + 66,
          maxWidth: cardW - flowerW - 52,
          fontSize: 10,
          lineHeight: 14,
          maxLines: 4,
          color: rgb(0.35, 0.37, 0.39),
        });
      }
      if (hasMediaQrs) {
        const mediaY = 132;
        const mediaCardW = mediaQrs.length > 1 ? 248 : 124;
        drawCard(page, PAGE_W - MARGIN - mediaCardW, mediaY, mediaCardW, 108, rgb(1, 1, 1), rgb(0.88, 0.9, 0.92));
        page.drawText(
          safePdfText(fontBold, textTemplate("memory_media_title", "Audio y video")),
          {
            x: PAGE_W - MARGIN - mediaCardW + 12,
            y: mediaY + 82,
            size: 10,
            font: fontBold,
            color: rgb(0.19, 0.22, 0.24),
          },
        );
        mediaQrs.slice(0, 2).forEach((entry, index) => {
          drawCompactQrCard(
            page,
            font,
            entry.img,
            PAGE_W - MARGIN - mediaCardW + 8 + index * 120,
            mediaY + 6,
            entry.label,
          );
        });
      }
    } else {
      const cardBorder = isSpecialPage ? specialPalette.soft : rgb(0.88, 0.9, 0.92);
      const sectionTitleColor = isSpecialPage ? specialPalette.accent : rgb(0.18, 0.21, 0.22);
      const bodyColor = isSpecialPage ? specialPalette.ink : rgb(0.28, 0.31, 0.3);
      const visualMode = hasHeroImage ? "hero" : hasCanvasVisual ? "canvas" : "flower";
      const topY = 356;
      const topH = 242;
      const visualW = visualMode === "flower" ? 176 : isCanvasPage ? 238 : 214;
      const visualX = MARGIN;
      const narrativeX = visualX + visualW + 16;
      const narrativeW = PAGE_W - MARGIN - narrativeX;

      if (visualMode === "hero") {
        await drawImageBox(
          pdf,
          page,
          imgUrl,
          visualX,
          topY,
          visualW,
          topH,
          textTemplate("page_cover_missing", "Sin portada para esta página"),
          font,
        );
        drawFrameOrnaments(page, visualX, topY, visualW, topH, frameOrnamentColor);
      } else if (visualMode === "canvas") {
        drawCard(page, visualX, topY, visualW, topH, rgb(1, 1, 1), cardBorder);
        page.drawText(
          safePdfText(fontBold, textTemplate("memory_canvas_title", "Lienzo y contexto")),
          {
            x: visualX + 14,
            y: topY + topH - 24,
            size: 11,
            font: fontBold,
            color: sectionTitleColor,
          },
        );
        await drawCanvasPreview(
          pdf,
          page,
          p.canvas_objects,
          visualX + 14,
          topY + 16,
          visualW - 28,
          topH - 52,
          font,
        );
      } else {
        drawFlowerFamilyCard(
          page,
          font,
          fontBold,
          p.flowerFamily,
          visualX,
          topY,
          visualW,
          topH,
          p.planTypeLabel,
          p.locationLabel,
        );
      }

      drawCard(page, narrativeX, topY, narrativeW, topH, rgb(1, 1, 1), cardBorder);
      page.drawText(
        safePdfText(
          fontBold,
          isFeaturePage
            ? renderThemeText("memory_feature_title", "Lo que hizo especial este recuerdo", {})
            : textTemplate("memory_description_title", "Sentido del recuerdo"),
        ),
        {
          x: narrativeX + 14,
          y: topY + topH - 24,
          size: 12,
          font: fontBold,
          color: sectionTitleColor,
        },
      );
      drawWrappedText(page, font, descriptionText, {
        x: narrativeX + 14,
        y: topY + topH - 52,
        maxWidth: narrativeW - 28,
        fontSize: 11,
        lineHeight: 16,
        maxLines: 7,
        color: bodyColor,
      });
      const summaryMeta = joinMeta([
        p.planTypeLabel,
        familyMeta,
        p.locationLabel,
        stars ? `Estrellas ${stars}` : null,
      ]);
      if (summaryMeta) {
        drawWrappedText(page, font, summaryMeta, {
          x: narrativeX + 14,
          y: topY + 38,
          maxWidth: narrativeW - 28,
          fontSize: 9,
          lineHeight: 12,
          maxLines: 3,
          color: rgb(0.38, 0.4, 0.39),
        });
      }

      const bottomY = 128;
      const bottomH = 188;
      const bottomGap = 12;
      const contextFactParts = [
        p.locationLabel,
        p.audio_url ? p.audioLabel || "Audio guardado" : null,
        p.canvasSummary.videoCount > 0
          ? `${p.canvasSummary.videoCount} video${p.canvasSummary.videoCount === 1 ? "" : "s"}`
          : null,
      ].filter(Boolean) as string[];
      const canvasDetailParts = [
        p.canvasSummary.photoCount > 0
          ? `${p.canvasSummary.photoCount} foto${p.canvasSummary.photoCount === 1 ? "" : "s"}`
          : null,
        p.canvasSummary.textCount > 0
          ? `${p.canvasSummary.textCount} texto${p.canvasSummary.textCount === 1 ? "" : "s"}`
          : null,
        p.canvasSummary.stickerCount > 0
          ? `${p.canvasSummary.stickerCount} sticker${p.canvasSummary.stickerCount === 1 ? "" : "s"}`
          : null,
      ].filter(Boolean) as string[];
      const canvasNarrative = [
        canvasSummary.excerpt,
        canvasSummary.secondaryExcerpt,
        canvasInlineExcerpts[0] ?? null,
      ].filter(Boolean) as string[];
      const showContextCard =
        hasCanvasVisual || contextFactParts.length > 0 || canvasDetailParts.length > 0 || canvasNarrative.length > 0;

      const sections: Array<{ kind: "reflections" | "canvas" | "media"; width: number }> = [];
      if (hasReflections) {
        sections.push({
          kind: "reflections",
          width: hasMediaQrs && showContextCard ? 136 : 178,
        });
      }
      if (showContextCard) {
        sections.push({
          kind: "canvas",
          width: hasReflections
            ? hasMediaQrs
              ? 231
              : 325
            : hasMediaQrs
              ? 379
              : 515,
        });
      }
      if (hasMediaQrs) sections.push({ kind: "media", width: 124 });

      let cursorX = MARGIN;
      for (const section of sections) {
        const cardX = cursorX;
        const cardW = section.width;
        cursorX += cardW + bottomGap;

        if (section.kind === "reflections") {
          drawCard(page, cardX, bottomY, cardW, bottomH, rgb(1, 1, 1), cardBorder);
          page.drawText(
            safePdfText(fontBold, textTemplate("memory_reflections_title", "Miradas")),
            {
              x: cardX + 14,
              y: bottomY + bottomH - 24,
              size: 11,
              font: fontBold,
              color: sectionTitleColor,
            },
          );
          let reflectionY = bottomY + bottomH - 56;
          reflectionHighlights.forEach((entry) => {
            drawCard(
              page,
              cardX + 10,
              reflectionY - 58,
              cardW - 20,
              62,
              rgb(1, 1, 1),
              rgb(0.92, 0.95, 0.91),
            );
            page.drawText(safePdfText(fontBold, entry.authorLabel), {
              x: cardX + 18,
              y: reflectionY - 12,
              size: 9,
              font: fontBold,
              color: sectionTitleColor,
            });
            drawWrappedText(page, font, entry.excerpt, {
              x: cardX + 18,
              y: reflectionY - 28,
              maxWidth: cardW - 36,
              fontSize: 9,
              lineHeight: 11,
              maxLines: 3,
              color: bodyColor,
            });
            reflectionY -= 72;
          });
        }

        if (section.kind === "canvas") {
          drawCard(page, cardX, bottomY, cardW, bottomH, rgb(1, 1, 1), cardBorder);
          page.drawText(
            safePdfText(fontBold, textTemplate("memory_canvas_title", "Lienzo y contexto")),
            {
              x: cardX + 14,
              y: bottomY + bottomH - 24,
              size: 11,
              font: fontBold,
              color: sectionTitleColor,
            },
          );
          const previewH = hasCanvasVisual ? 92 : 0;
          const previewY = bottomY + bottomH - 38 - previewH - (contextFactParts.length > 0 ? 22 : 0);
          let hasCanvasPreview = false;
          if (hasCanvasVisual) {
            hasCanvasPreview = await drawCanvasPreview(
              pdf,
              page,
              p.canvas_objects,
              cardX + 14,
              previewY,
              cardW - 28,
              previewH,
              font,
            );
          }
          if (hasCanvasPreview) {
            const previewFooter =
              canvasDetailParts.join(" - ") ||
              canvasNarrative[0] ||
              null;
            if (previewFooter) {
              drawWrappedText(page, font, previewFooter, {
                x: cardX + 14,
                y: previewY - 16,
                maxWidth: cardW - 28,
                fontSize: 8.5,
                lineHeight: 10,
                maxLines: 1,
                color: bodyColor,
              });
            }
          } else {
            let textY = bottomY + bottomH - 48;
            if (contextFactParts.length > 0) {
              drawWrappedText(page, font, contextFactParts.join(" - "), {
                x: cardX + 14,
                y: textY,
                maxWidth: cardW - 28,
                fontSize: 9,
                lineHeight: 12,
                maxLines: 3,
                color: rgb(0.37, 0.39, 0.39),
              });
              textY -= 30;
            }
            if (canvasDetailParts.length > 0) {
              drawWrappedText(page, font, canvasDetailParts.join(" - "), {
                x: cardX + 14,
                y: textY,
                maxWidth: cardW - 28,
                fontSize: 10,
                lineHeight: 14,
                maxLines: 2,
                color: bodyColor,
              });
              textY -= 24;
            }
            if (canvasNarrative.length > 0 && textY > bottomY + 26) {
              drawWrappedText(page, font, canvasNarrative[0], {
                x: cardX + 14,
                y: textY,
                maxWidth: cardW - 28,
                fontSize: 9,
                lineHeight: 12,
                maxLines: 4,
                color: bodyColor,
              });
            }
          }
        }

        if (section.kind === "media") {
          drawCard(page, cardX, bottomY, cardW, bottomH, rgb(1, 1, 1), cardBorder);
          page.drawText(
            safePdfText(fontBold, textTemplate("memory_media_title", "Audio y video")),
            {
              x: cardX + 10,
              y: bottomY + bottomH - 24,
              size: 10,
              font: fontBold,
              color: sectionTitleColor,
            },
          );
          mediaQrs.slice(0, 2).forEach((entry, index) => {
            drawCompactQrCard(
              page,
              font,
              entry.img,
              cardX + 6,
              index === 0 ? bottomY + 90 : bottomY + 4,
              entry.label,
            );
          });
        }
      }
    }

    let nextLineIdx = continuationTexts.length > 0 ? 0 : noteLines.length;

    let continuation = 1;
    while (nextLineIdx < noteLines.length) {
      const contPage = pdf.addPage([PAGE_W, PAGE_H]);
      drawPageBg(contPage, rgb(1, 1, 1));
      drawTopBand(contPage, palette.soft, chapterContinuationHeaderHeightSafe);

      contPage.drawText(
        safePdfText(
          fontBold,
          renderThemeText(
            "page_notes_header",
            "{title} - Lienzo ({index})",
            { title, index: continuation },
          ),
        ),
        {
          x: MARGIN,
          y: PAGE_H - 74,
          size: 16,
          font: fontBold,
          color: rgb(0.12, 0.12, 0.14),
        },
      );
      contPage.drawText(safePdfText(font, `${p.date} - ${seasonLabel(s, seasonLabels)}`), {
        x: MARGIN,
        y: PAGE_H - 95,
        size: 11,
        font,
        color: rgb(0.3, 0.3, 0.34),
      });

      nextLineIdx = drawNotesSection(
        contPage,
        font,
        fontBold,
        noteLines,
        nextLineIdx,
        {
          x: MARGIN,
          y: 90,
          width: PAGE_W - MARGIN * 2 - (hasMediaQrs ? 120 : 0),
          height: PAGE_H - 190,
          title: safePdfText(
            fontBold,
            renderPdfTemplate(
              pdfTheme.textTemplates.notes_continuation_title ||
                "Textos del lienzo ({index})",
              { index: continuation },
            ),
          ),
          titleY: PAGE_H - 126,
          firstLineY: PAGE_H - 146,
          minLineY: 114,
          lineHeight: 14,
          fontSize: 10,
        },
      );

      if (mediaQrs.length === 1) {
        drawQrBlock(
          contPage,
          mediaQrs[0].img,
          PAGE_W - MARGIN - 96,
          18,
          mediaQrs[0].label,
          font,
        );
      } else if (mediaQrs.length >= 2) {
        drawQrBlock(
          contPage,
          mediaQrs[0].img,
          PAGE_W - MARGIN - 96,
          160,
          mediaQrs[0].label,
          font,
        );
        drawQrBlock(
          contPage,
          mediaQrs[1].img,
          PAGE_W - MARGIN - 96,
          18,
          mediaQrs[1].label,
          font,
        );
      }
      continuation += 1;
    }
  }
}

// ---------- Annual closing ----------
{
  const page = pdf.addPage([PAGE_W, PAGE_H]);
  drawPageBg(page, rgb(0.995, 0.994, 0.99));
  drawTopBand(page, rgb(0.94, 0.95, 0.9), 148);
  drawAnnualIllustrations(page, annualOrnamentPalette);

  page.drawText(
    safePdfText(
      fontBold,
      renderThemeText("annual_closing_title", "Y así queda este capítulo", {}),
    ),
    {
      x: MARGIN,
      y: PAGE_H - 76,
      size: 24,
      font: fontBold,
      color: rgb(0.17, 0.21, 0.18),
    },
  );
  drawWrappedText(
    page,
    font,
    renderThemeText(
      "annual_closing_note",
      "El año termina aquí, pero el jardín ya deja ver todo lo que creció, lo que os definió y lo que merece volver a abrirse con calma.",
      {},
    ),
    {
      x: MARGIN,
      y: PAGE_H - 104,
      maxWidth: PAGE_W - MARGIN * 2,
      fontSize: 11,
      lineHeight: 15,
      maxLines: 3,
      color: rgb(0.31, 0.34, 0.31),
    },
  );

  drawCard(page, MARGIN, 426, 300, 226, rgb(1, 1, 1), rgb(0.86, 0.9, 0.84));
  page.drawText(
    safePdfText(fontBold, renderThemeText("annual_tree_title", "Árbol anual", {})),
    {
      x: MARGIN + 14,
      y: 636,
      size: 11,
      font: fontBold,
      color: rgb(0.2, 0.24, 0.2),
    },
  );
  page.drawText(safePdfText(fontBold, book.annualTreeLabel), {
    x: MARGIN + 14,
    y: 612,
    size: 16,
    font: fontBold,
    color: rgb(0.17, 0.23, 0.18),
  });
  await drawImageBox(
    pdf,
    page,
    book.annualTreeAssetPath,
    MARGIN + 14,
    470,
    104,
    126,
    book.annualTreeLabel,
    font,
  );
  drawWrappedText(
    page,
    font,
    renderThemeText(
      "annual_closing_summary",
      "{count} flores - {favorites} favoritas - {flower} como flor dominante - {locations} lugares",
      {
        count: book.totalPages,
        favorites: book.favoriteCount,
        flower: book.dominantFlowerFamilyLabel ?? "Sin flor dominante",
        locations: uniqueLocationsCount,
      },
    ),
    {
      x: MARGIN + 132,
      y: 586,
      maxWidth: 152,
      fontSize: 10,
      lineHeight: 14,
      maxLines: 6,
      color: rgb(0.31, 0.34, 0.31),
    },
  );

  drawCard(
    page,
    338,
    426,
    PAGE_W - MARGIN - 338,
    226,
    rgb(1, 1, 1),
    rgb(0.86, 0.9, 0.84),
  );
  drawWrappedText(
    page,
    fontBold,
    renderThemeText(
      "annual_closing_moments_title",
      "Flores que siguen encendiendo el año",
      {},
    ),
    {
      x: 352,
      y: 636,
      maxWidth: PAGE_W - MARGIN - 364,
      fontSize: 11,
      lineHeight: 13,
      maxLines: 2,
      color: rgb(0.2, 0.24, 0.2),
    },
  );
  if (!closingMoments.length) {
    drawWrappedText(
      page,
      font,
      "Todavía no hay flores suficientes para cerrar este capítulo con una selección anual.",
      {
        x: 352,
        y: 584,
        maxWidth: PAGE_W - MARGIN - 366,
        fontSize: 10,
        lineHeight: 14,
        maxLines: 4,
        color: rgb(0.38, 0.41, 0.39),
      },
    );
  } else {
    let closingY = 560;
    closingMoments.forEach((item, index) => {
      drawCard(page, 352, closingY - 34, PAGE_W - MARGIN - 366, 60, rgb(1, 1, 1), rgb(0.92, 0.95, 0.91));
      drawWrappedText(page, fontBold, `${index + 1}. ${editorialMemoryTitle(item)}`, {
        x: 364,
        y: closingY + 12,
        maxWidth: PAGE_W - MARGIN - 390,
        fontSize: 10,
        lineHeight: 12,
        maxLines: 2,
        color: rgb(0.18, 0.22, 0.19),
      });
      drawWrappedText(
        page,
        font,
        joinMeta([item.planTypeLabel, item.locationLabel, item.date.slice(0, 10)]),
        {
          x: 364,
          y: closingY - 10,
          maxWidth: PAGE_W - MARGIN - 390,
          fontSize: 9,
          lineHeight: 11,
          maxLines: 2,
          color: rgb(0.38, 0.41, 0.39),
        },
      );
      closingY -= 66;
    });
  }

  drawCard(page, MARGIN, 170, PAGE_W - MARGIN * 2, 132, rgb(1, 1, 1), rgb(0.86, 0.9, 0.84));
  page.drawText(
    safePdfText(fontBold, textTemplate("year_phrase_title", "Frase del año")),
    {
      x: MARGIN + 14,
      y: 274,
      size: 11,
      font: fontBold,
      color: rgb(0.2, 0.24, 0.2),
    },
  );
  drawWrappedText(
    page,
    font,
    book.yearNote || textTemplate("year_phrase_empty", "Año sin frase guardada."),
    {
      x: MARGIN + 14,
      y: 246,
      maxWidth: PAGE_W - MARGIN * 2 - 28,
      fontSize: 14,
      lineHeight: 20,
      maxLines: 3,
      color: rgb(0.26, 0.3, 0.27),
    },
  );
}

const allPages = pdf.getPages();
const totalPages = allPages.length;
allPages.forEach((page, idx) => {
  const footerBrand = safePdfText(
    font,
    renderThemeText("footer_brand", "Libro Vivo {year}", { year: y }),
  );
  const footerCounter = safePdfText(
    font,
    renderThemeText("footer_page_counter", "{page}/{total}", {
      page: idx + 1,
      total: totalPages,
    }),
  );
  drawFooter(page, font, footerBrand, footerCounter);
});

const bytes = await pdf.save();
const out = new Uint8Array(bytes.length);
out.set(bytes);
  return out;
}
