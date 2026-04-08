import {
  type AnnualTreeGrowth,
  type AnnualTreePhase,
} from "@/lib/annualTreeEngine";
import { buildCanonicalAnnualTreeSnapshot } from "@/lib/annualTreeCanonical";
import {
  buildAnnualTreeSnapshotFromState,
  type GardenYearTreeState,
} from "@/lib/annualTreeState";
import {
  detectCanonicalTemplate,
  type CanonicalPageTemplate,
} from "@/lib/canonicalPageTemplates";
import {
  FLOWER_FAMILY_LABELS,
  getFlowerFamilyFromLegacyElement,
  type FlowerFamily,
} from "@/lib/productDomainContracts";
import { buildPageVisualSnapshot } from "@/lib/pageVisualSnapshot";
import type { PageVisualState } from "@/lib/pageVisualState";
import {
  extractTexts,
  getSeason,
  summarizeCanvasObjects,
  type ExportItem,
  type Season,
} from "@/lib/yearPdfExportHelpers";
import { resolveExplicitYearHighlights } from "@/lib/yearHighlightSelection";

export type AnnualBookSpecialMomentKind =
  | "anniversary"
  | "valentine"
  | "birthday"
  | "trip"
  | "first_date"
  | "moving"
  | "new_year"
  | null;

export type AnnualBookMemoryArchetype =
  | "memory_minimal"
  | "memory_standard"
  | "memory_canvas"
  | "memory_feature"
  | "memory_special";

export type AnnualBookReflection = {
  authorLabel: string;
  favoritePart: string | null;
  rememberedMoment: string | null;
  whatIFelt: string | null;
  whatItMeantToMe: string | null;
  whatIDiscoveredAboutYou: string | null;
  smallPromise: string | null;
};

export type AnnualBookPageItem = ExportItem & {
  planTypeCode: string | null;
  planTypeLabel: string | null;
  flowerFamily: FlowerFamily;
  locationLabel: string | null;
  planSummary: string | null;
  audioLabel: string | null;
  season: Season;
  heroImageUrl: string | null;
  secondaryPhotoUrl: string | null;
  textExcerpt: string | null;
  canvasSummary: ReturnType<typeof summarizeCanvasObjects>;
  reflections: AnnualBookReflection[];
  specialMomentKind: AnnualBookSpecialMomentKind;
  canonicalTemplate: CanonicalPageTemplate | null;
  archetype: AnnualBookMemoryArchetype;
};

export type AnnualBookChapter = {
  season: Season;
  items: AnnualBookPageItem[];
  heroItem: AnnualBookPageItem | null;
  topMoments: AnnualBookPageItem[];
  favoriteCount: number;
  avgStars: number;
  note: string | null;
};

export type AnnualBookReadModel = {
  year: number;
  items: AnnualBookPageItem[];
  chapters: Record<Season, AnnualBookChapter>;
  coverImageUrl: string | null;
  bestMoments: AnnualBookPageItem[];
  totalPages: number;
  shinyCount: number;
  favoriteCount: number;
  avgStars: number;
  activeMonths: number;
  dominantFlowerFamily: FlowerFamily | null;
  dominantFlowerFamilyLabel: string | null;
  growth: AnnualTreeGrowth;
  annualTreeAssetPath: string | null;
  annualTreeLabel: string;
  yearNote: string | null;
};

type BuildAnnualBookReadModelParams = {
  year: number;
  items: ExportItem[];
  seasonNotesMap: Map<Season, string>;
  yearNote: string | null;
  highlightPageIds: string[];
  yearMilestones: number;
  annualTreeAssets: Record<AnnualTreePhase, string | null>;
  annualTreeState?: GardenYearTreeState | null;
  pageVisualStateByPageId?: Map<string, PageVisualState>;
  planTypeById: Map<
    string,
    {
      code: string;
      label: string;
      category: string;
      flowerFamily: FlowerFamily;
      flowerAssetPath: string | null;
      flowerBuilderConfig: import("@/lib/planTypeFlowerComposer").PlanFlowerComposerConfig;
      suggestedElement: string;
    }
  >;
  reflectionsByPageId: Map<string, AnnualBookReflection[]>;
};

function normalizeText(value: string | null | undefined) {
  const next = String(value ?? "").trim();
  return next || null;
}

function averageRating(items: Array<Pick<AnnualBookPageItem, "rating">>) {
  const rated = items
    .map((item) =>
      typeof item.rating === "number" && Number.isFinite(item.rating) ? item.rating : null,
    )
    .filter((value): value is number => value != null);
  if (!rated.length) return 0;
  return rated.reduce((sum, value) => sum + value, 0) / rated.length;
}

const CANONICAL_CODE_TO_SPECIAL_KIND: Record<string, AnnualBookSpecialMomentKind> = {
  aniversario: "anniversary",
  san_valentin: "valentine",
  cumpleanos: "birthday",
  primer_viaje: "trip",
  primera_cita: "first_date",
  mudanza: "moving",
  nochevieja: "new_year",
};

function detectSpecialMomentKind(item: {
  date: string;
  title: string | null;
  planTypeCode: string | null;
  planTypeLabel: string | null;
}): { kind: AnnualBookSpecialMomentKind; template: CanonicalPageTemplate | null } {
  const planTypeCode = normalizeText(item.planTypeCode)?.toLowerCase() ?? "";
  const planTypeLabel = normalizeText(item.planTypeLabel)?.toLowerCase() ?? "";

  // 1. Canonical template auto-detection (date + title keywords)
  const canonical = detectCanonicalTemplate(item.date ?? "", item.title ?? "");
  if (canonical) {
    return {
      kind: CANONICAL_CODE_TO_SPECIAL_KIND[canonical.code] ?? null,
      template: canonical,
    };
  }

  // 2. Plan-type based detection (legacy fallback)
  if (planTypeCode === "aniversario" || planTypeLabel.includes("aniversario")) {
    return { kind: "anniversary", template: null };
  }
  if (["viaje", "escapada", "road_trip", "tren"].includes(planTypeCode)) {
    return { kind: "trip", template: null };
  }
  return { kind: null, template: null };
}

function resolveMemoryArchetype(
  item: Pick<
    AnnualBookPageItem,
    | "specialMomentKind"
    | "is_favorite"
    | "rating"
    | "secondaryPhotoUrl"
    | "planSummary"
    | "reflections"
    | "audio_url"
    | "locationLabel"
    | "textExcerpt"
    | "canvasSummary"
  >,
): AnnualBookMemoryArchetype {
  if (item.specialMomentKind) return "memory_special";
  const hasCanvasContent =
    item.canvasSummary.photoCount > 0 ||
    item.canvasSummary.videoCount > 0 ||
    item.canvasSummary.stickerCount > 0 ||
    item.canvasSummary.textCount > 0;
  const hasFeatureSignals =
    Boolean(item.secondaryPhotoUrl) ||
    Boolean(item.planSummary) ||
    item.reflections.length > 0 ||
    Boolean(item.textExcerpt) ||
    Boolean(item.locationLabel) ||
    Boolean(item.audio_url);
  if (hasCanvasContent) return "memory_canvas";
  if (
    item.is_favorite ||
    (item.rating ?? 0) >= 4 ||
    hasFeatureSignals
  ) {
    return "memory_feature";
  }
  if (!hasFeatureSignals) return "memory_minimal";
  return "memory_standard";
}

function sortMoments(left: AnnualBookPageItem, right: AnnualBookPageItem) {
  const favoriteDelta = Number(Boolean(right.is_favorite)) - Number(Boolean(left.is_favorite));
  if (favoriteDelta !== 0) return favoriteDelta;
  const ratingDelta = (right.rating ?? 0) - (left.rating ?? 0);
  if (ratingDelta !== 0) return ratingDelta;
  return String(right.date).localeCompare(String(left.date));
}

export function buildAnnualBookReadModel(
  params: BuildAnnualBookReadModelParams,
): AnnualBookReadModel {
  const normalizedItems: AnnualBookPageItem[] = params.items.map((item) => {
    const pageVisualState =
      params.pageVisualStateByPageId?.get(String(item.id ?? "").trim()) ?? null;
    const planTypeId = normalizeText(item.plan_type_id);
    const planType = planTypeId ? params.planTypeById.get(planTypeId) ?? null : null;
    const flowerFamily =
      pageVisualState?.planFlowerFamily ??
      planType?.flowerFamily ??
      getFlowerFamilyFromLegacyElement(item.element);
    const textExcerpt = extractTexts(item.canvas_objects ?? [])[0] ?? null;
    const pageVisual = buildPageVisualSnapshot({
      planCategory: pageVisualState?.planCategory ?? planType?.category ?? null,
      planFlowerFamily:
        pageVisualState?.planFlowerFamily ?? planType?.flowerFamily ?? null,
      planFlowerAssetPath:
        pageVisualState?.planFlowerAssetPath ?? planType?.flowerAssetPath ?? null,
      planFlowerBuilderConfig:
        pageVisualState?.planFlowerBuilderConfig ?? planType?.flowerBuilderConfig ?? null,
      planSuggestedElement:
        pageVisualState?.planSuggestedElement ?? planType?.suggestedElement ?? null,
      element: pageVisualState?.pageElement ?? item.element,
      rating: pageVisualState?.rating ?? item.rating,
      coverPhotoUrl: pageVisualState?.coverPhotoUrl ?? item.cover_photo_url,
      thumbnailUrl: pageVisualState?.thumbnailUrl ?? item.thumbnail_url,
    });
    const heroImageUrl = pageVisual.primaryAssetPath;
    const planSummary = normalizeText(item.plan_summary);
    const audioLabel = normalizeText(item.audio_label);
    const canvasSummary = summarizeCanvasObjects(item.canvas_objects ?? []);
    const reflections = params.reflectionsByPageId.get(item.id) ?? [];
    const { kind: specialMomentKind, template: canonicalTemplate } = detectSpecialMomentKind({
      date: item.date,
      title: item.title,
      planTypeCode: planType?.code ?? null,
      planTypeLabel: planType?.label ?? null,
    });

    const next: AnnualBookPageItem = {
      ...item,
      planTypeCode: pageVisualState?.planTypeCode ?? planType?.code ?? null,
      planTypeLabel: pageVisualState?.planTypeLabel ?? planType?.label ?? null,
      flowerFamily,
      locationLabel: normalizeText(item.location_label),
      planSummary,
      audioLabel,
      season: getSeason(item.date),
      heroImageUrl,
      secondaryPhotoUrl: pageVisual.secondaryPhotoUrl,
      textExcerpt,
      canvasSummary,
      reflections,
      specialMomentKind,
      canonicalTemplate,
      archetype: "memory_standard",
    };
    next.archetype = resolveMemoryArchetype(next);
    return next;
  });

  const annualTreeSnapshot = params.annualTreeState
    ? buildAnnualTreeSnapshotFromState(
        params.annualTreeState,
        params.annualTreeAssets,
      )
    : buildCanonicalAnnualTreeSnapshot({
    year: params.year,
    pages: normalizedItems,
    milestonesUnlocked: params.yearMilestones,
    annualTreeAssets: params.annualTreeAssets,
    idPrefix: "annual-book-page",
    titleFallback: "Recuerdo del año",
  });
  const growth = annualTreeSnapshot.growth;

  const chapters = {
    spring: [] as AnnualBookPageItem[],
    summer: [] as AnnualBookPageItem[],
    autumn: [] as AnnualBookPageItem[],
    winter: [] as AnnualBookPageItem[],
  };
  for (const item of normalizedItems) {
    chapters[item.season].push(item);
  }

  const chapterModel = {
    spring: {
      season: "spring" as const,
      items: chapters.spring,
      heroItem: chapters.spring.find((item) => item.heroImageUrl) ?? chapters.spring[0] ?? null,
      topMoments: [...chapters.spring].sort(sortMoments).slice(0, 3),
      favoriteCount: chapters.spring.filter((item) => item.is_favorite).length,
      avgStars: averageRating(chapters.spring),
      note: params.seasonNotesMap.get("spring") ?? null,
    },
    summer: {
      season: "summer" as const,
      items: chapters.summer,
      heroItem: chapters.summer.find((item) => item.heroImageUrl) ?? chapters.summer[0] ?? null,
      topMoments: [...chapters.summer].sort(sortMoments).slice(0, 3),
      favoriteCount: chapters.summer.filter((item) => item.is_favorite).length,
      avgStars: averageRating(chapters.summer),
      note: params.seasonNotesMap.get("summer") ?? null,
    },
    autumn: {
      season: "autumn" as const,
      items: chapters.autumn,
      heroItem: chapters.autumn.find((item) => item.heroImageUrl) ?? chapters.autumn[0] ?? null,
      topMoments: [...chapters.autumn].sort(sortMoments).slice(0, 3),
      favoriteCount: chapters.autumn.filter((item) => item.is_favorite).length,
      avgStars: averageRating(chapters.autumn),
      note: params.seasonNotesMap.get("autumn") ?? null,
    },
    winter: {
      season: "winter" as const,
      items: chapters.winter,
      heroItem: chapters.winter.find((item) => item.heroImageUrl) ?? chapters.winter[0] ?? null,
      topMoments: [...chapters.winter].sort(sortMoments).slice(0, 3),
      favoriteCount: chapters.winter.filter((item) => item.is_favorite).length,
      avgStars: averageRating(chapters.winter),
      note: params.seasonNotesMap.get("winter") ?? null,
    },
  };

  const explicitHighlights = resolveExplicitYearHighlights(
    normalizedItems,
    params.highlightPageIds,
  );
  const bestMoments = explicitHighlights.length
    ? explicitHighlights
    : [...normalizedItems].sort(sortMoments).slice(0, 4);
  const familyCounts = new Map<FlowerFamily, number>();
  normalizedItems.forEach((item) => {
    familyCounts.set(item.flowerFamily, (familyCounts.get(item.flowerFamily) ?? 0) + 1);
  });
  const dominantFlowerFamily =
    [...familyCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
  const coverImageUrl =
    explicitHighlights.find((item) => item.heroImageUrl)?.heroImageUrl ??
    normalizedItems.find((item) => item.is_favorite && item.heroImageUrl)?.heroImageUrl ??
    bestMoments.find((item) => item.heroImageUrl)?.heroImageUrl ??
    null;

  return {
    year: params.year,
    items: normalizedItems,
    chapters: chapterModel,
    coverImageUrl,
    bestMoments,
    totalPages: normalizedItems.length,
    shinyCount: normalizedItems.filter((item) => item.mood_state === "shiny").length,
    favoriteCount: normalizedItems.filter((item) => item.is_favorite).length,
    avgStars: averageRating(normalizedItems),
    activeMonths: new Set(normalizedItems.map((item) => item.date.slice(0, 7))).size,
    dominantFlowerFamily,
    dominantFlowerFamilyLabel: dominantFlowerFamily ? FLOWER_FAMILY_LABELS[dominantFlowerFamily] : null,
    growth,
    annualTreeAssetPath: annualTreeSnapshot.assetPath,
    annualTreeLabel: annualTreeSnapshot.label,
    yearNote: normalizeText(params.yearNote),
  };
}
