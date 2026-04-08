import { supabase } from "@/lib/supabase";
import { isSchemaNotReadyError, withGardenIdOnInsert, withGardenScope } from "@/lib/gardens";
import { getSeedCalendarConfig } from "@/lib/seedCalendarConfig";
import { normalizeProgressionGraphDraft, splitProgressionGraphNodeKey } from "@/lib/progressionGraph";
import { extractPageSnippet, hasPhotoInCanvas } from "@/lib/homePageUtils";
import { resolveFlowerFamilyFromPlanType, type FlowerFamily } from "@/lib/productDomainContracts";

type ProgressionConditionRecord = {
  id: string;
  code: string;
  template_id: string | null;
  enabled: boolean | null;
};

type ProgressionTreeRecord = {
  id: string;
  code: string;
  enabled: boolean | null;
};

type ProgressionRewardRecord = {
  id: string;
  code: string;
  enabled: boolean | null;
};

type ProgressionExistingConditionUnlock = {
  id: string;
  condition_id: string;
};

type ProgressionExistingTreeUnlock = {
  id: string;
  tree_id: string;
};

type ProgressionExistingRewardUnlock = {
  id: string;
  reward_id: string;
};

type ProgressionGraphStateRow = {
  links?: unknown;
  relation_modes?: unknown;
};

type PageRow = {
  id: string;
  title: string | null;
  date: string | null;
  element: string | null;
  plan_type_id: string | null;
  cover_photo_url: string | null;
  thumbnail_url: string | null;
  canvas_objects: unknown;
  location_label: string | null;
  is_favorite: boolean | null;
};

type SeedRow = {
  id: string;
  title: string | null;
  element: string | null;
  status: string | null;
  scheduled_date: string | null;
  bloomed_page_id: string | null;
  created_at: string | null;
  plan_type_id: string | null;
};

type WateringRow = {
  seed_id: string | null;
  user_id: string | null;
};

type PlanTypeRow = {
  id: string;
  code: string | null;
  flower_family: string | null;
  suggested_element: string | null;
};

type MapPlaceRow = {
  title: string | null;
  kind: string | null;
};

type ConditionMetrics = {
  totalSeeds: number;
  bloomedSeeds: number;
  spontaneousBlooms: number;
  bloomedSeedsAfterWaiting: number;
  bloomedSeedsWithPlace: number;
  bloomedSeedsWithStory: number;
  bloomedSeedsWithVoice: number;
  bloomedSeedsHighlighted: number;
  jointWateredSeeds: number;
  pageCount: number;
  pagesWithPlace: number;
  pagesWithAudio: number;
  pagesWithTwoVoices: number;
  pagesWithPhoto: number;
  pagesWithStory: number;
  pagesWithFavorite: number;
  fullSensesPages: number;
  symbolicPlaceReflectionPages: number;
  routeMemoryPages: number;
  sameLocationRevisits: number;
  traditionPlaces: number;
  repeatedWeekdayCount: number;
  maxWeekdayRepeat: number;
  sameMonthDayAcrossYears: number;
  homePages: number;
  seasonsTouched: Set<string>;
  seasonCounts: Record<"spring" | "summer" | "autumn" | "winter", number>;
  familyCounts: Record<FlowerFamily, number>;
  familySeasonPairs: Set<string>;
  planTypeRepeatCount: number;
  maxPlanTypeOccurrences: number;
  mapPlaceCount: number;
  mapPlaceKinds: Set<string>;
  texts: string[];
};

export type ProgressionUnlockSyncResult = {
  conditionsUnlockedNow: number;
  treesUnlockedNow: number;
  rewardsUnlockedNow: number;
  skipped: boolean;
  reason?: string;
};

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeForSearch(value: unknown) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isIsoDateLike(value: string | null | undefined) {
  return /^\d{4}-\d{2}-\d{2}/.test(String(value ?? "").trim());
}

function parseMonthDay(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  if (!isIsoDateLike(text)) return null;
  return {
    year: Number(text.slice(0, 4)),
    month: Number(text.slice(5, 7)),
    day: Number(text.slice(8, 10)),
  };
}

function seasonFromDate(value: string | null | undefined) {
  const parsed = parseMonthDay(value);
  if (!parsed) return null;
  if (parsed.month >= 3 && parsed.month <= 5) return "spring";
  if (parsed.month >= 6 && parsed.month <= 8) return "summer";
  if (parsed.month >= 9 && parsed.month <= 11) return "autumn";
  return "winter";
}

function countCanvasSignals(input: unknown, terms: string[]) {
  let count = 0;
  const visit = (value: unknown) => {
    if (typeof value === "string") {
      const text = normalizeForSearch(value);
      if (terms.some((term) => text.includes(term))) count += 1;
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value && typeof value === "object") {
      Object.values(value as Record<string, unknown>).forEach(visit);
    }
  };
  visit(input);
  return count;
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function buildMetrics(params: {
  pages: PageRow[];
  seeds: SeedRow[];
  wateringRows: WateringRow[];
  planTypes: PlanTypeRow[];
  mapPlaces: MapPlaceRow[];
  bloomedStatus: string;
}) {
  const planTypeById = new Map(params.planTypes.map((row) => [row.id, row] as const));
  const pageById = new Map(params.pages.map((row) => [row.id, row] as const));

  const familyCounts: ConditionMetrics["familyCounts"] = {
    agua: 0,
    fuego: 0,
    tierra: 0,
    aire: 0,
    luz: 0,
    luna: 0,
    estrella: 0,
  };
  const seasonCounts: ConditionMetrics["seasonCounts"] = {
    spring: 0,
    summer: 0,
    autumn: 0,
    winter: 0,
  };
  const seasonsTouched = new Set<string>();
  const familySeasonPairs = new Set<string>();
  const locationCounts = new Map<string, number>();
  const planTypeCounts = new Map<string, number>();
  const weekdayCounts = new Map<number, number>();
  const monthDayYears = new Map<string, Set<number>>();
  const texts: string[] = [];

  let pagesWithPlace = 0;
  let pagesWithAudio = 0;
  let pagesWithTwoVoices = 0;
  let pagesWithPhoto = 0;
  let pagesWithStory = 0;
  let pagesWithFavorite = 0;
  let fullSensesPages = 0;
  let symbolicPlaceReflectionPages = 0;
  let routeMemoryPages = 0;
  let homePages = 0;

  for (const page of params.pages) {
    const title = normalizeText(page.title);
    const location = normalizeText(page.location_label);
    const snippet = normalizeText(extractPageSnippet(page.canvas_objects));
    const textBlob = normalizeForSearch([title, location, snippet].filter(Boolean).join(" "));
    texts.push(textBlob);

    const hasPlace = Boolean(location);
    const audioCount = countCanvasSignals(page.canvas_objects, ["audio", "voice", "voz"]);
    const hasAudio = audioCount > 0;
    const hasPhoto = Boolean(
      page.cover_photo_url || page.thumbnail_url || hasPhotoInCanvas(page.canvas_objects),
    );
    const hasStory = snippet.length >= 80;
    const hasFavorite = Boolean(page.is_favorite);

    if (hasPlace) {
      pagesWithPlace += 1;
      const key = normalizeForSearch(location);
      locationCounts.set(key, (locationCounts.get(key) ?? 0) + 1);
    }
    if (hasAudio) pagesWithAudio += 1;
    if (audioCount >= 2) pagesWithTwoVoices += 1;
    if (hasPhoto) pagesWithPhoto += 1;
    if (hasStory) pagesWithStory += 1;
    if (hasFavorite) pagesWithFavorite += 1;
    if (hasPlace && hasAudio && hasPhoto && hasStory) fullSensesPages += 1;
    if (hasPlace && hasStory) symbolicPlaceReflectionPages += 1;
    if (includesAny(textBlob, ["ruta", "camino", "trayecto", "paseo"])) routeMemoryPages += 1;
    if (includesAny(textBlob, ["casa", "hogar"])) homePages += 1;

    const season = seasonFromDate(page.date);
    if (season) {
      seasonCounts[season] += 1;
      seasonsTouched.add(season);
    }

    const planType = page.plan_type_id ? planTypeById.get(page.plan_type_id) ?? null : null;
    const family = resolveFlowerFamilyFromPlanType({
      flowerFamily: planType?.flower_family ?? null,
      code: planType?.code ?? null,
      suggestedElement: planType?.suggested_element ?? page.element,
    });
    familyCounts[family] += 1;
    if (season) familySeasonPairs.add(`${family}:${season}`);

    const planTypeCode = normalizeText(planType?.code);
    if (planTypeCode) {
      planTypeCounts.set(planTypeCode, (planTypeCounts.get(planTypeCode) ?? 0) + 1);
    }

    const parsed = parseMonthDay(page.date);
    if (parsed) {
      const weekday = new Date(`${parsed.year}-${String(parsed.month).padStart(2, "0")}-${String(parsed.day).padStart(2, "0")}T12:00:00`).getDay();
      weekdayCounts.set(weekday, (weekdayCounts.get(weekday) ?? 0) + 1);
      const monthDay = `${String(parsed.month).padStart(2, "0")}-${String(parsed.day).padStart(2, "0")}`;
      const years = monthDayYears.get(monthDay) ?? new Set<number>();
      years.add(parsed.year);
      monthDayYears.set(monthDay, years);
    }
  }

  const wateredBySeed = new Map<string, Set<string>>();
  for (const row of params.wateringRows) {
    const seedId = normalizeText(row.seed_id);
    const userId = normalizeText(row.user_id);
    if (!seedId || !userId) continue;
    const set = wateredBySeed.get(seedId) ?? new Set<string>();
    set.add(userId);
    wateredBySeed.set(seedId, set);
  }

  let bloomedSeeds = 0;
  let spontaneousBlooms = 0;
  let bloomedSeedsAfterWaiting = 0;
  let bloomedSeedsWithPlace = 0;
  let bloomedSeedsWithStory = 0;
  let bloomedSeedsWithVoice = 0;
  let bloomedSeedsHighlighted = 0;
  let jointWateredSeeds = 0;

  for (const seed of params.seeds) {
    const isBloomed =
      normalizeText(seed.status).toLowerCase() === normalizeText(params.bloomedStatus).toLowerCase() &&
      Boolean(seed.bloomed_page_id);
    const waterers = wateredBySeed.get(seed.id) ?? new Set<string>();
    if (waterers.size >= 2) jointWateredSeeds += 1;
    if (!isBloomed || !seed.bloomed_page_id) continue;
    bloomedSeeds += 1;
    if (!seed.scheduled_date) spontaneousBlooms += 1;
    const page = pageById.get(seed.bloomed_page_id) ?? null;
    if (page) {
      const snippet = normalizeText(extractPageSnippet(page.canvas_objects));
      const hasAudio = countCanvasSignals(page.canvas_objects, ["audio", "voice", "voz"]) > 0;
      if (normalizeText(page.location_label)) bloomedSeedsWithPlace += 1;
      if (snippet.length >= 80) bloomedSeedsWithStory += 1;
      if (hasAudio) bloomedSeedsWithVoice += 1;
      if (page.is_favorite) bloomedSeedsHighlighted += 1;
    }
    const createdMs = Date.parse(String(seed.created_at ?? ""));
    const bloomMs = page?.date ? Date.parse(page.date) : Number.NaN;
    if (Number.isFinite(createdMs) && Number.isFinite(bloomMs)) {
      const dayDiff = (bloomMs - createdMs) / (1000 * 60 * 60 * 24);
      if (dayDiff >= 14) bloomedSeedsAfterWaiting += 1;
    }
  }

  const sameLocationRevisits = [...locationCounts.values()].filter((count) => count >= 2).length;
  const traditionPlaces = [...locationCounts.values()].filter((count) => count >= 3).length;
  const repeatedWeekdayCount = [...weekdayCounts.values()].filter((count) => count >= 2).length;
  const maxWeekdayRepeat = Math.max(0, ...weekdayCounts.values());
  const sameMonthDayAcrossYears = [...monthDayYears.values()].filter((years) => years.size >= 2).length;
  const planTypeRepeatCount = [...planTypeCounts.values()].filter((count) => count >= 2).length;
  const maxPlanTypeOccurrences = Math.max(0, ...planTypeCounts.values());

  return {
    totalSeeds: params.seeds.length,
    bloomedSeeds,
    spontaneousBlooms,
    bloomedSeedsAfterWaiting,
    bloomedSeedsWithPlace,
    bloomedSeedsWithStory,
    bloomedSeedsWithVoice,
    bloomedSeedsHighlighted,
    jointWateredSeeds,
    pageCount: params.pages.length,
    pagesWithPlace,
    pagesWithAudio,
    pagesWithTwoVoices,
    pagesWithPhoto,
    pagesWithStory,
    pagesWithFavorite,
    fullSensesPages,
    symbolicPlaceReflectionPages,
    routeMemoryPages,
    sameLocationRevisits,
    traditionPlaces,
    repeatedWeekdayCount,
    maxWeekdayRepeat,
    sameMonthDayAcrossYears,
    homePages,
    seasonsTouched,
    seasonCounts,
    familyCounts,
    familySeasonPairs,
    planTypeRepeatCount,
    maxPlanTypeOccurrences,
    mapPlaceCount: params.mapPlaces.length,
    mapPlaceKinds: new Set(
      params.mapPlaces.map((place) => normalizeText(place.kind).toLowerCase()).filter(Boolean),
    ),
    texts,
  } satisfies ConditionMetrics;
}

function metricsHasAnyText(metrics: ConditionMetrics, terms: string[]) {
  return metrics.texts.some((text) => includesAny(text, terms));
}

function metricsHasTextAtLeast(metrics: ConditionMetrics, terms: string[], min: number) {
  return metrics.texts.filter((text) => includesAny(text, terms)).length >= min;
}

function metricsFamilyAtLeast(metrics: ConditionMetrics, family: FlowerFamily, min: number) {
  return (metrics.familyCounts[family] ?? 0) >= min;
}

function metricsSeasonAtLeast(
  metrics: ConditionMetrics,
  season: keyof ConditionMetrics["seasonCounts"],
  min: number,
) {
  return (metrics.seasonCounts[season] ?? 0) >= min;
}

function metricsAnySeasonAtLeast(metrics: ConditionMetrics, min: number) {
  return Object.values(metrics.seasonCounts).some((count) => count >= min);
}

function metricsSeasonsReachedAtLeast(metrics: ConditionMetrics, min: number) {
  return Object.values(metrics.seasonCounts).filter((count) => count >= min).length;
}

function metricsFamilyAcrossSeasonsAtLeast(
  metrics: ConditionMetrics,
  family: FlowerFamily,
  minSeasons: number,
) {
  return (
    [...metrics.familySeasonPairs].filter((pair) => pair.startsWith(`${family}:`)).length >=
    minSeasons
  );
}

function evaluateConditionTemplate(templateId: string | null, metrics: ConditionMetrics) {
  const id = normalizeText(templateId);
  if (!id) return false;

  const firstFamily: Record<string, FlowerFamily> = {
    first_water_family_plan: "agua",
    first_fire_family_plan: "fuego",
    first_earth_family_plan: "tierra",
    first_air_family_plan: "aire",
    first_light_family_plan: "luz",
    first_moon_family_plan: "luna",
    first_star_family_plan: "estrella",
  };
  if (id in firstFamily) {
    return metricsFamilyAtLeast(metrics, firstFamily[id], 1) && metrics.pagesWithStory >= 1;
  }

  const completeFamily: Record<string, FlowerFamily> = {
    complete_water_branch: "agua",
    complete_fire_branch: "fuego",
    complete_earth_branch: "tierra",
    complete_air_branch: "aire",
    complete_light_branch: "luz",
    complete_moon_branch: "luna",
    complete_star_branch: "estrella",
  };
  if (id in completeFamily) {
    return metricsFamilyAtLeast(metrics, completeFamily[id], 4) && metrics.pagesWithStory >= 2;
  }

  const seasonOpen: Record<string, keyof ConditionMetrics["seasonCounts"]> = {
    spring_story_opens: "spring",
    summer_story_opens: "summer",
    autumn_story_opens: "autumn",
    winter_story_opens: "winter",
  };
  if (id in seasonOpen) {
    return metricsSeasonAtLeast(metrics, seasonOpen[id], 2) && metrics.pagesWithStory >= 1;
  }

  switch (id) {
    case "first_seed_together":
      return metrics.totalSeeds >= 1;
    case "first_page_with_voice":
      return metrics.pagesWithAudio >= 1 && metrics.pagesWithStory >= 1;
    case "first_page_with_place":
    case "first_saved_symbolic_place":
      return (metrics.pagesWithPlace >= 1 || metrics.mapPlaceCount >= 1) && metrics.pagesWithStory >= 1;
    case "new_place_with_weight":
      return (metrics.pagesWithPlace >= 2 || metrics.mapPlaceCount >= 2) && metrics.pagesWithStory >= 2;
    case "first_joint_watering":
      return metrics.jointWateredSeeds >= 1 && metrics.totalSeeds >= 2;
    case "first_spontaneous_plan_lived":
      return metrics.spontaneousBlooms >= 1 && metrics.bloomedSeedsWithStory >= 1;
    case "idea_to_memory_complete_arc":
      return (
        metrics.spontaneousBlooms >= 1 &&
        metrics.bloomedSeedsWithStory >= 1 &&
        metrics.bloomedSeedsWithPlace >= 1
      );
    case "first_rescheduled_plan_kept":
    case "replanned_seed_still_blooms":
    case "seed_bloomed_after_rescue":
      return metrics.bloomedSeedsAfterWaiting >= 1 && metrics.bloomedSeedsWithStory >= 1;
    case "weekday_ritual_begins":
      return metrics.maxWeekdayRepeat >= 3 && metrics.pagesWithStory >= 1;
    case "first_morning_ritual_page":
      return metricsHasAnyText(metrics, ["manana", "desayuno", "brunch", "amanecer"]) && metrics.pagesWithStory >= 1;
    case "first_night_ritual_page":
      return metricsHasAnyText(metrics, ["noche", "madrugada", "luna", "estrellas"]) && metrics.pagesWithStory >= 1;
    case "home_ritual_settles":
      return metrics.homePages >= 3 && metrics.pagesWithStory >= 2;
    case "season_opening_ritual":
      return metricsAnySeasonAtLeast(metrics, 2) && metrics.pagesWithStory >= 1;
    case "season_closing_ritual":
      return metricsSeasonsReachedAtLeast(metrics, 2) >= 2 && metrics.pagesWithStory >= 2;
    case "shared_walk_route_ritual":
      return metrics.routeMemoryPages >= 3 && metrics.pagesWithStory >= 2;
    case "page_full_senses":
      return metrics.fullSensesPages >= 1 && metrics.pagesWithStory >= 1;
    case "both_reflections_same_page":
    case "voice_answer_pair":
      return metrics.pagesWithTwoVoices >= 1 && metrics.pagesWithStory >= 1;
    case "future_promise_recorded_in_page":
    case "future_promise_recorded":
    case "message_to_future_self":
      return (
        metricsHasAnyText(metrics, ["promesa", "prometimos", "futuro", "yo futuro", "mas adelante"]) &&
        metrics.pagesWithStory >= 1
      );
    case "page_answers_old_memory":
    case "old_page_reopened_with_new_reflection":
      return metrics.sameLocationRevisits >= 1 && metrics.pagesWithStory >= 2;
    case "manual_canvas_becomes_meaningful":
      return (
        metrics.pagesWithStory >= 2 &&
        metrics.pagesWithPhoto >= 1 &&
        (metrics.pagesWithAudio >= 1 || metrics.pagesWithPlace >= 1)
      );
    case "page_becomes_editorial_candidate":
    case "year_chapter_opens_from_memory":
      return (
        (metrics.pagesWithFavorite >= 1 || metrics.bloomedSeedsHighlighted >= 1) &&
        (metrics.pagesWithStory >= 2 || metrics.fullSensesPages >= 1)
      );
    case "memory_promoted_to_year_highlight":
      return metrics.pagesWithFavorite >= 1 && metrics.pagesWithStory >= 2;
    case "seed_becomes_highlight_page":
      return metrics.bloomedSeedsHighlighted >= 1 && metrics.bloomedSeedsWithStory >= 1;
    case "symbolic_place_plus_reflection":
      return metrics.symbolicPlaceReflectionPages >= 1 && metrics.pagesWithStory >= 2;
    case "route_memory_with_context":
      return metrics.routeMemoryPages >= 2 && metrics.pagesWithStory >= 2;
    case "seasonal_meaning_page":
      return metricsAnySeasonAtLeast(metrics, 2) && metrics.pagesWithStory >= 2;
    case "favorite_place_returns":
    case "place_revisited_with_growth":
    case "place_revisited_new_layer":
      return metrics.sameLocationRevisits >= 1 && metrics.pagesWithStory >= 2;
    case "home_route_marked":
      return metrics.routeMemoryPages >= 1 && metrics.homePages >= 2 && metrics.pagesWithStory >= 1;
    case "sunset_spot_named":
      return (
        metricsHasAnyText(metrics, ["atardecer", "puesta de sol", "sol cayendo"]) &&
        metrics.pagesWithPlace >= 1 &&
        metrics.pagesWithStory >= 1
      );
    case "water_place_claimed":
      return (
        metricsHasAnyText(metrics, ["mar", "playa", "rio", "lago", "agua"]) &&
        metrics.pagesWithPlace >= 1 &&
        metrics.pagesWithStory >= 1
      );
    case "forest_place_claimed":
      return (
        metricsHasAnyText(metrics, ["bosque", "campo", "naturaleza", "montana"]) &&
        metrics.pagesWithPlace >= 1 &&
        metrics.pagesWithStory >= 1
      );
    case "city_place_redeemed":
      return (
        metricsHasAnyText(metrics, ["ciudad", "calle", "barrio", "centro"]) &&
        metrics.pagesWithPlace >= 1 &&
        metrics.pagesWithStory >= 1
      );
    case "trip_place_becomes_marker":
      return (
        metricsHasAnyText(metrics, ["viaje", "escapada", "road trip", "tren"]) &&
        metrics.pagesWithPlace >= 1 &&
        metrics.pagesWithStory >= 1
      );
    case "season_fully_inhabited":
      return Object.values(metrics.seasonCounts).some((count) => count >= 4) && metrics.pagesWithStory >= 2;
    case "season_changes_with_bloom":
      return metrics.seasonsTouched.size >= 2 && metrics.bloomedSeeds >= 2 && metrics.bloomedSeedsWithStory >= 1;
    case "anniversary_in_new_season":
      return (
        metricsHasAnyText(metrics, ["aniversario"]) &&
        metrics.sameMonthDayAcrossYears >= 1 &&
        metrics.seasonsTouched.size >= 2 &&
        metrics.pagesWithStory >= 1
      );
    case "first_anniversary_page":
      return metricsHasAnyText(metrics, ["aniversario"]) && metrics.pagesWithStory >= 1;
    case "anniversary_with_location":
      return metricsHasAnyText(metrics, ["aniversario"]) && metrics.pagesWithPlace >= 1 && metrics.pagesWithStory >= 1;
    case "solstice_or_equinox_memory":
      return metricsHasAnyText(metrics, ["solsticio", "equinoccio"]) && metrics.pagesWithStory >= 1;
    case "rain_day_memory":
      return metricsHasAnyText(metrics, ["lluvia", "lloviendo", "llovio"]) && metrics.pagesWithStory >= 1;
    case "clear_night_memory":
      return metricsHasAnyText(metrics, ["noche", "cielo despejado", "estrellas", "luna"]) && metrics.pagesWithStory >= 1;
    case "seed_bloomed_after_waiting":
      return metrics.bloomedSeedsAfterWaiting >= 1 && metrics.bloomedSeedsWithStory >= 1;
    case "seed_bloomed_with_place_attached":
      return metrics.bloomedSeedsWithPlace >= 1 && metrics.bloomedSeedsWithStory >= 1;
    case "seed_bloomed_with_story_ready":
      return metrics.bloomedSeedsWithStory >= 1 && metrics.bloomedSeeds >= 1;
    case "seed_bloomed_with_both_voices":
      return metrics.bloomedSeedsWithVoice >= 1 && metrics.bloomedSeedsWithStory >= 1;
    case "seed_bloomed_on_special_day":
      return metricsHasAnyText(metrics, ["aniversario", "cumple", "celebracion"]) && metrics.bloomedSeeds >= 1;
    case "family_branch_care_matures":
      return Object.values(metrics.familyCounts).some((count) => count >= 4) && metrics.bloomedSeeds >= 2;
    case "plan_type_returns_changed":
      return metrics.maxPlanTypeOccurrences >= 3 && metrics.pagesWithStory >= 2;
    case "old_promise_gets_answer":
    case "future_promise_fulfilled":
      return (
        metricsHasAnyText(metrics, ["cumplimos", "cumplida", "promesa cumplida", "lo logramos"]) &&
        metrics.pagesWithStory >= 2
      );
    case "return_to_first_route":
      return metrics.routeMemoryPages >= 3 && metrics.sameLocationRevisits >= 1;
    case "ritual_second_form":
      return (
        (metrics.maxWeekdayRepeat >= 3 || metrics.maxPlanTypeOccurrences >= 3) &&
        metrics.pagesWithStory >= 2
      );
    case "same_symbol_new_season":
      return (
        (metricsFamilyAcrossSeasonsAtLeast(metrics, "agua", 3) ||
          metricsFamilyAcrossSeasonsAtLeast(metrics, "fuego", 3) ||
          metricsFamilyAcrossSeasonsAtLeast(metrics, "tierra", 3) ||
          metricsFamilyAcrossSeasonsAtLeast(metrics, "aire", 3) ||
          metricsFamilyAcrossSeasonsAtLeast(metrics, "luz", 3) ||
          metricsFamilyAcrossSeasonsAtLeast(metrics, "luna", 3) ||
          metricsFamilyAcrossSeasonsAtLeast(metrics, "estrella", 3)) &&
        metrics.pagesWithStory >= 2
      );
    case "first_date_recalled_later":
      return metricsHasAnyText(metrics, ["primera cita"]) && metrics.pagesWithStory >= 2;
    case "symbolic_day_returns_year_later":
    case "promise_anniversary_returns":
      return metrics.sameMonthDayAcrossYears >= 1 && metrics.pagesWithStory >= 2;
    case "place_becomes_tradition":
      return metrics.traditionPlaces >= 1 && metrics.pagesWithStory >= 2;
    case "shared_birthday_memory":
      return metricsHasAnyText(metrics, ["cumple", "cumpleanos"]) && metrics.pagesWithStory >= 1;
    case "light_family_celebration":
      return metricsFamilyAtLeast(metrics, "luz", 2) && metrics.pagesWithStory >= 1;
    case "goal_reached_together":
      return metricsHasAnyText(metrics, ["meta", "objetivo", "logramos", "conseguimos"]) && metrics.pagesWithStory >= 1;
    case "surprise_memory_opens":
      return metricsHasAnyText(metrics, ["sorpresa"]) && metrics.pagesWithStory >= 1;
    case "special_night_marked":
      return metricsHasTextAtLeast(metrics, ["noche especial", "gran noche"], 1) && metrics.pagesWithStory >= 1;
    case "special_trip_marked":
      return (
        metricsHasAnyText(metrics, ["viaje", "escapada", "road trip", "tren"]) &&
        metrics.pagesWithPlace >= 1 &&
        metrics.pagesWithStory >= 1
      );
    case "new_year_memory":
      return metricsHasAnyText(metrics, ["ano nuevo", "fin de ano"]) && metrics.pagesWithStory >= 1;
    case "year_closure_memory":
      return metricsHasAnyText(metrics, ["cierre de ano", "fin de ano"]) && metrics.pagesWithStory >= 1;
    case "forest_layer_opens":
      return (
        (metrics.pagesWithFavorite >= 2 && metrics.pagesWithStory >= 3) ||
        metrics.seasonsTouched.size >= 4
      );
    case "time_capsule_created":
      return metricsHasAnyText(metrics, ["capsula del tiempo", "capsula"]) && metrics.pagesWithStory >= 1;
    case "time_capsule_opened":
      return metricsHasAnyText(metrics, ["abrimos la capsula", "capsula abierta"]) && metrics.pagesWithStory >= 1;
    case "memory_changes_with_time":
      return metrics.sameMonthDayAcrossYears >= 1 && metrics.sameLocationRevisits >= 1 && metrics.pagesWithStory >= 2;
    case "real_tree_ritual":
      return metricsHasAnyText(metrics, ["arbol real", "plantamos un arbol"]) && metrics.pagesWithPhoto >= 1 && metrics.pagesWithStory >= 1;
    case "end_of_cycle_closure":
      return metricsHasAnyText(metrics, ["fin de ciclo", "cierre", "despedida"]) && metrics.pagesWithStory >= 1;
    case "new_cycle_opening":
      return metricsHasAnyText(metrics, ["nuevo ciclo", "nueva etapa", "empezamos de nuevo"]) && metrics.pagesWithStory >= 1;
    default:
      return false;
  }

  switch (id) {
    case "first_seed_together":
      return metrics.totalSeeds >= 1;
    case "first_page_with_voice":
      return metrics.pagesWithAudio >= 1;
    case "first_page_with_place":
    case "first_saved_symbolic_place":
    case "new_place_with_weight":
      return metrics.pagesWithPlace >= 1 || metrics.mapPlaceCount >= 1;
    case "first_joint_watering":
      return metrics.jointWateredSeeds >= 1;
    case "first_spontaneous_plan_lived":
    case "idea_to_memory_complete_arc":
      return metrics.spontaneousBlooms >= 1;
    case "first_rescheduled_plan_kept":
    case "replanned_seed_still_blooms":
    case "seed_bloomed_after_rescue":
      return metrics.bloomedSeedsAfterWaiting >= 1;
    case "weekday_ritual_begins":
      return metrics.repeatedWeekdayCount >= 1;
    case "first_morning_ritual_page":
      return metricsHasAnyText(metrics, ["manana", "desayuno", "brunch", "amanecer"]);
    case "first_night_ritual_page":
      return metricsHasAnyText(metrics, ["noche", "madrugada", "luna", "estrellas"]);
    case "home_ritual_settles":
      return metrics.homePages >= 2;
    case "season_opening_ritual":
      return metrics.seasonsTouched.size >= 1;
    case "season_closing_ritual":
      return metrics.seasonsTouched.size >= 2;
    case "shared_walk_route_ritual":
      return metrics.routeMemoryPages >= 2;
    case "page_full_senses":
      return metrics.fullSensesPages >= 1;
    case "both_reflections_same_page":
    case "voice_answer_pair":
      return metrics.pagesWithTwoVoices >= 1;
    case "future_promise_recorded_in_page":
    case "future_promise_recorded":
    case "message_to_future_self":
      return metricsHasAnyText(metrics, [
        "promesa",
        "prometimos",
        "futuro",
        "yo futuro",
        "mas adelante",
      ]);
    case "page_answers_old_memory":
    case "old_page_reopened_with_new_reflection":
      return metrics.sameLocationRevisits >= 1;
    case "manual_canvas_becomes_meaningful":
      return metrics.pagesWithStory >= 1 && metrics.pagesWithPhoto >= 1;
    case "page_becomes_editorial_candidate":
    case "memory_promoted_to_year_highlight":
    case "year_chapter_opens_from_memory":
    case "seed_becomes_highlight_page":
      return metrics.pagesWithFavorite >= 1 || metrics.bloomedSeedsHighlighted >= 1;
    case "symbolic_place_plus_reflection":
      return metrics.symbolicPlaceReflectionPages >= 1;
    case "route_memory_with_context":
      return metrics.routeMemoryPages >= 1 && metrics.pagesWithStory >= 1;
    case "seasonal_meaning_page":
      return metrics.seasonsTouched.size >= 1 && metrics.pagesWithStory >= 1;
    case "favorite_place_returns":
    case "place_revisited_with_growth":
    case "place_revisited_new_layer":
      return metrics.sameLocationRevisits >= 1;
    case "home_route_marked":
      return metrics.routeMemoryPages >= 1 && metrics.homePages >= 1;
    case "sunset_spot_named":
      return metricsHasAnyText(metrics, ["atardecer", "puesta de sol", "sol cayendo"]);
    case "water_place_claimed":
      return metricsHasAnyText(metrics, ["mar", "playa", "rio", "lago", "agua"]);
    case "forest_place_claimed":
      return metricsHasAnyText(metrics, ["bosque", "campo", "naturaleza", "montana"]);
    case "city_place_redeemed":
      return metricsHasAnyText(metrics, ["ciudad", "calle", "barrio", "centro"]);
    case "trip_place_becomes_marker":
      return metricsHasAnyText(metrics, ["viaje", "escapada", "road trip", "tren"]);
    case "season_fully_inhabited":
      return Object.values(metrics.seasonCounts).some((count) => count >= 3);
    case "season_changes_with_bloom":
      return metrics.seasonsTouched.size >= 2 && metrics.bloomedSeeds >= 1;
    case "anniversary_in_new_season":
    case "first_anniversary_page":
    case "anniversary_with_location":
      return metricsHasAnyText(metrics, ["aniversario"]) && metrics.pagesWithPlace >= 1;
    case "solstice_or_equinox_memory":
      return metrics.texts.length > 0;
    case "rain_day_memory":
      return metricsHasAnyText(metrics, ["lluvia", "lloviendo", "llovio"]);
    case "clear_night_memory":
      return metricsHasAnyText(metrics, ["noche", "cielo despejado", "estrellas", "luna"]);
    case "seed_bloomed_after_waiting":
      return metrics.bloomedSeedsAfterWaiting >= 1;
    case "seed_bloomed_with_place_attached":
      return metrics.bloomedSeedsWithPlace >= 1;
    case "seed_bloomed_with_story_ready":
      return metrics.bloomedSeedsWithStory >= 1;
    case "seed_bloomed_with_both_voices":
      return metrics.bloomedSeedsWithVoice >= 1;
    case "seed_bloomed_on_special_day":
      return metricsHasAnyText(metrics, ["aniversario", "cumple", "celebracion"]);
    case "family_branch_care_matures":
      return Object.values(metrics.familyCounts).some((count) => count >= 3);
    case "plan_type_returns_changed":
      return metrics.planTypeRepeatCount >= 1;
    case "old_promise_gets_answer":
    case "future_promise_fulfilled":
      return metricsHasAnyText(metrics, ["cumplimos", "cumplida", "promesa cumplida", "lo logramos"]);
    case "return_to_first_route":
      return metrics.routeMemoryPages >= 2;
    case "ritual_second_form":
      return metrics.repeatedWeekdayCount >= 2 || metrics.planTypeRepeatCount >= 1;
    case "same_symbol_new_season":
      return [...metrics.familySeasonPairs].some((pair) => {
        const [family] = pair.split(":");
        return [...metrics.familySeasonPairs].filter((candidate) => candidate.startsWith(`${family}:`)).length >= 2;
      });
    case "first_date_recalled_later":
      return metricsHasAnyText(metrics, ["primera cita"]);
    case "symbolic_day_returns_year_later":
    case "promise_anniversary_returns":
      return metrics.sameMonthDayAcrossYears >= 1;
    case "place_becomes_tradition":
      return metrics.traditionPlaces >= 1;
    case "shared_birthday_memory":
      return metricsHasAnyText(metrics, ["cumple", "cumpleanos"]);
    case "light_family_celebration":
      return metricsFamilyAtLeast(metrics, "luz", 1);
    case "goal_reached_together":
      return metricsHasAnyText(metrics, ["meta", "objetivo", "logramos", "conseguimos"]);
    case "surprise_memory_opens":
      return metricsHasAnyText(metrics, ["sorpresa"]);
    case "special_night_marked":
      return metricsHasAnyText(metrics, ["noche especial", "gran noche", "noche"]);
    case "special_trip_marked":
      return metricsHasAnyText(metrics, ["viaje", "escapada", "road trip", "tren"]);
    case "new_year_memory":
      return metricsHasAnyText(metrics, ["ano nuevo", "fin de ano"]);
    case "year_closure_memory":
      return metricsHasAnyText(metrics, ["cierre de ano", "fin de ano"]);
    case "forest_layer_opens":
      return metrics.pagesWithFavorite >= 2 || metrics.seasonsTouched.size >= 3;
    case "time_capsule_created":
      return metricsHasAnyText(metrics, ["capsula del tiempo", "capsula"]);
    case "time_capsule_opened":
      return metricsHasAnyText(metrics, ["abrimos la capsula", "capsula abierta"]);
    case "memory_changes_with_time":
      return metrics.sameMonthDayAcrossYears >= 1 || metrics.sameLocationRevisits >= 2;
    case "real_tree_ritual":
      return metricsHasAnyText(metrics, ["arbol real", "plantamos un arbol"]);
    case "end_of_cycle_closure":
      return metricsHasAnyText(metrics, ["fin de ciclo", "cierre", "despedida"]);
    case "new_cycle_opening":
      return metricsHasAnyText(metrics, ["nuevo ciclo", "nueva etapa", "empezamos de nuevo"]);
    default:
      return false;
  }
}

export async function syncProgressionUnlocks(
  gardenId?: string | null,
): Promise<ProgressionUnlockSyncResult> {
  if (!normalizeText(gardenId)) {
    return { conditionsUnlockedNow: 0, treesUnlockedNow: 0, rewardsUnlockedNow: 0, skipped: true, reason: "No active garden." };
  }

  const bloomedStatus = (await getSeedCalendarConfig()).defaults.bloomedStatus || "bloomed";

  const [
    conditionsRes,
    treesRes,
    rewardsRes,
    graphRes,
    pagesRes,
    seedsRes,
    wateringRes,
    planTypesRes,
    placesRes,
    conditionUnlocksRes,
    treeUnlocksRes,
    rewardUnlocksRes,
  ] = await Promise.all([
    supabase.from("progression_conditions").select("id,code,template_id,enabled"),
    supabase.from("progression_tree_nodes").select("id,code,enabled"),
    supabase.from("progression_rewards").select("id,code,enabled"),
    supabase
      .from("progression_graph_state")
      .select("links,relation_modes")
      .eq("key", "default")
      .maybeSingle(),
    withGardenScope(
      supabase
        .from("pages")
        .select("id,title,date,element,plan_type_id,cover_photo_url,thumbnail_url,canvas_objects,location_label,is_favorite")
        .order("date", { ascending: true }),
      gardenId,
    ),
    withGardenScope(
      supabase
        .from("seeds")
        .select("id,title,element,status,scheduled_date,bloomed_page_id,created_at,plan_type_id")
        .order("created_at", { ascending: true }),
      gardenId,
    ),
    withGardenScope(
      supabase
        .from("seed_watering_confirmations")
        .select("seed_id,user_id"),
      gardenId,
    ),
    withGardenScope(
      supabase
        .from("garden_plan_types")
        .select("id,code,flower_family,suggested_element")
        .is("archived_at", null),
      gardenId,
    ),
    withGardenScope(
      supabase
        .from("map_places")
        .select("title,kind")
        .is("archived_at", null),
      gardenId,
    ),
    withGardenScope(
      supabase.from("progression_condition_unlocks").select("id,condition_id"),
      gardenId,
    ),
    withGardenScope(
      supabase.from("progression_tree_unlocks").select("id,tree_id"),
      gardenId,
    ),
    withGardenScope(
      supabase.from("progression_reward_unlocks").select("id,reward_id"),
      gardenId,
    ),
  ]);

  const allErrors = [
    conditionsRes.error,
    treesRes.error,
    rewardsRes.error,
    graphRes.error,
    pagesRes.error,
    seedsRes.error,
    wateringRes.error,
    planTypesRes.error,
    placesRes.error,
    conditionUnlocksRes.error,
    treeUnlocksRes.error,
    rewardUnlocksRes.error,
  ].filter(Boolean);

  const blocking = allErrors.find((error) => !isSchemaNotReadyError(error));
  if (blocking) {
    throw blocking;
  }
  if (allErrors.length > 0) {
    return {
      conditionsUnlockedNow: 0,
      treesUnlockedNow: 0,
      rewardsUnlockedNow: 0,
      skipped: true,
      reason: "Progression runtime tables are not ready yet.",
    };
  }

  const metrics = buildMetrics({
    pages: ((pagesRes.data as PageRow[] | null) ?? []),
    seeds: ((seedsRes.data as SeedRow[] | null) ?? []),
    wateringRows: ((wateringRes.data as WateringRow[] | null) ?? []),
    planTypes: ((planTypesRes.data as PlanTypeRow[] | null) ?? []),
    mapPlaces: ((placesRes.data as MapPlaceRow[] | null) ?? []),
    bloomedStatus,
  });

  const conditionRows = ((conditionsRes.data as ProgressionConditionRecord[] | null) ?? []).filter(
    (row) => row.enabled !== false,
  );
  const treeRows = ((treesRes.data as ProgressionTreeRecord[] | null) ?? []).filter(
    (row) => row.enabled !== false,
  );
  const rewardRows = ((rewardsRes.data as ProgressionRewardRecord[] | null) ?? []).filter(
    (row) => row.enabled !== false,
  );
  const existingConditionUnlocks = new Set(
    (((conditionUnlocksRes.data as ProgressionExistingConditionUnlock[] | null) ?? [])).map(
      (row) => row.condition_id,
    ),
  );
  const existingTreeUnlocks = new Set(
    (((treeUnlocksRes.data as ProgressionExistingTreeUnlock[] | null) ?? [])).map(
      (row) => row.tree_id,
    ),
  );
  const existingRewardUnlocks = new Set(
    (((rewardUnlocksRes.data as ProgressionExistingRewardUnlock[] | null) ?? [])).map(
      (row) => row.reward_id,
    ),
  );

  const graphDraft = normalizeProgressionGraphDraft({
    links: (graphRes.data as ProgressionGraphStateRow | null)?.links,
    relationModes: (graphRes.data as ProgressionGraphStateRow | null)?.relation_modes,
  });

  const newlyUnlockedConditionIds = new Set<string>();
  const allUnlockedConditionIds = new Set(existingConditionUnlocks);
  for (const condition of conditionRows) {
    if (!evaluateConditionTemplate(condition.template_id, metrics)) continue;
    allUnlockedConditionIds.add(condition.id);
    if (!existingConditionUnlocks.has(condition.id)) {
      newlyUnlockedConditionIds.add(condition.id);
    }
  }

  if (newlyUnlockedConditionIds.size > 0) {
    const inserts = [...newlyUnlockedConditionIds].map((conditionId) =>
      withGardenIdOnInsert({ condition_id: conditionId }, gardenId),
    );
    const { error } = await supabase.from("progression_condition_unlocks").insert(inserts);
    if (error && !isSchemaNotReadyError(error)) throw error;
  }

  const linksByTarget = new Map<string, Array<{ sourceKind: string; sourceId: string }>>();
  for (const link of graphDraft.links) {
    const target = splitProgressionGraphNodeKey(link.target);
    const source = splitProgressionGraphNodeKey(link.source);
    const list = linksByTarget.get(link.target) ?? [];
    list.push({ sourceKind: source.kind, sourceId: source.entityId });
    linksByTarget.set(link.target, list);
  }

  const unlockedTreeIds = new Set(existingTreeUnlocks);
  let treeChanged = true;
  while (treeChanged) {
    treeChanged = false;
    for (const tree of treeRows) {
      if (unlockedTreeIds.has(tree.id)) continue;
      const nodeKey = `tree:${tree.id}`;
      const incoming = linksByTarget.get(nodeKey) ?? [];
      if (!incoming.length) continue;
      const mode = graphDraft.relationModes[nodeKey] ?? "or";
      const states = incoming.map((entry) => {
        if (entry.sourceKind === "condition") return allUnlockedConditionIds.has(entry.sourceId);
        if (entry.sourceKind === "tree") return unlockedTreeIds.has(entry.sourceId);
        return false;
      });
      const satisfied = mode === "and" ? states.every(Boolean) : states.some(Boolean);
      if (!satisfied) continue;
      unlockedTreeIds.add(tree.id);
      treeChanged = true;
    }
  }

  const newlyUnlockedTreeIds = [...unlockedTreeIds].filter((id) => !existingTreeUnlocks.has(id));
  if (newlyUnlockedTreeIds.length > 0) {
    const inserts = newlyUnlockedTreeIds.map((treeId) =>
      withGardenIdOnInsert({ tree_id: treeId }, gardenId),
    );
    const { error } = await supabase.from("progression_tree_unlocks").insert(inserts);
    if (error && !isSchemaNotReadyError(error)) throw error;
  }

  const newlyUnlockedRewardIds = new Set<string>();
  const rewardInserts: Array<Record<string, unknown>> = [];
  for (const reward of rewardRows) {
    if (existingRewardUnlocks.has(reward.id)) continue;
    const nodeKey = `reward:${reward.id}`;
    const incoming = linksByTarget.get(nodeKey) ?? [];
    if (!incoming.length) continue;
    const mode = graphDraft.relationModes[nodeKey] ?? "or";
    const treeInputs = incoming.filter((entry) => entry.sourceKind === "tree");
    const states = treeInputs.map((entry) => unlockedTreeIds.has(entry.sourceId));
    const satisfied = states.length > 0 && (mode === "and" ? states.every(Boolean) : states.some(Boolean));
    if (!satisfied) continue;
    const sourceTreeId = treeInputs.find((entry) => unlockedTreeIds.has(entry.sourceId))?.sourceId ?? null;
    newlyUnlockedRewardIds.add(reward.id);
    rewardInserts.push(
      withGardenIdOnInsert(
        {
          reward_id: reward.id,
          source_tree_id: sourceTreeId,
        },
        gardenId,
      ),
    );
  }

  if (rewardInserts.length > 0) {
    const { error } = await supabase.from("progression_reward_unlocks").insert(rewardInserts);
    if (error && !isSchemaNotReadyError(error)) throw error;
  }

  return {
    conditionsUnlockedNow: newlyUnlockedConditionIds.size,
    treesUnlockedNow: newlyUnlockedTreeIds.length,
    rewardsUnlockedNow: newlyUnlockedRewardIds.size,
    skipped: false,
  };
}
