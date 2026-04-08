"use client";

import { useMemo } from "react";
import {
  addIsoDays,
  buildDateRange,
  isIsoDate,
  todayIsoLocal,
} from "@/lib/homePageUtils";
import { buildPageVisualSnapshot } from "@/lib/pageVisualSnapshot";
import { buildPageVisualSnapshotFromState, type PageVisualState } from "@/lib/pageVisualState";
import { SEED_PLANNING_DRAFT_STATUS } from "@/lib/seedPreparationTypes";
import type {
  BloomPagePreview,
  HomePageRow,
  RuleRow,
  SeedStatusRow,
  UnlockRow,
} from "@/lib/homeDataTypes";

export type EventKind = "seed" | "sprout" | "flower" | "tree";

export type PathEvent = {
  id: string;
  date: string;
  title: string;
  kind: EventKind;
  href: string;
  iconSrc: string;
  element?: string | null;
  rating?: number | null;
  isFavorite?: boolean;
  tier?: RuleRow["tier"] | null;
  pageId?: string | null;
  unlockId?: string | null;
  ruleId?: string | null;
  claimedAt?: string | null;
  preferredRegionId?: string | null;
  importance?: RuleRow["importance"] | null;
  rank?: RuleRow["rank"] | null;
  rarity?: RuleRow["rarity"] | null;
  leafVariant?: RuleRow["leaf_variant"] | null;
  accentColor?: RuleRow["accent_color"] | null;
  previewSnippet?: string | null;
  locationLabel?: string | null;
};

type UseHomeTrailEventsParams = {
  currentYear: number;
  dateFrom: string;
  dateTo: string;
  bloomedStatusCode: string;
  seedRows: SeedStatusRow[];
  pageRows: HomePageRow[];
  unlocks: UnlockRow[];
  rulesById: Record<string, RuleRow>;
  pageElementById: Record<string, string>;
  pageVisualStateById: Record<string, PageVisualState>;
  bloomPagePreviewById: Record<string, BloomPagePreview>;
  pagePlanVisualById: Record<
    string,
    {
      category: string | null;
      flowerFamily: string | null;
      flowerAssetPath: string | null;
      flowerBuilderConfig: import("@/lib/planTypeFlowerComposer").PlanFlowerComposerConfig | null;
      suggestedElement: string | null;
    }
  >;
  treeIconByTier: Record<string, string>;
  defaultTreeIcon: string;
  seedAsset: string;
  sproutAsset: string;
};

type UseHomeTrailEventsResult = {
  allEvents: PathEvent[];
  normalizedRange: { start: string; end: string };
  pathDays: string[];
  visibleEvents: PathEvent[];
  eventsByDate: Map<string, PathEvent[]>;
  availableYears: number[];
  selectedYearValue: string;
};

export function useHomeTrailEvents({
  currentYear,
  dateFrom,
  dateTo,
  bloomedStatusCode,
  seedRows,
  pageRows,
  unlocks,
  rulesById,
  pageElementById,
  pageVisualStateById,
  bloomPagePreviewById,
  pagePlanVisualById,
  treeIconByTier,
  defaultTreeIcon,
  seedAsset,
  sproutAsset,
}: UseHomeTrailEventsParams): UseHomeTrailEventsResult {
  const seedEvents = useMemo<PathEvent[]>(() => {
    return seedRows.flatMap((seed) => {
      if (seed.status === SEED_PLANNING_DRAFT_STATUS) return [];
      const dateCandidate =
        seed.scheduled_date && isIsoDate(seed.scheduled_date)
          ? seed.scheduled_date
          : String(seed.created_at ?? "").slice(0, 10);

      if (!isIsoDate(dateCandidate)) return [];

      const isBloomed = seed.status === bloomedStatusCode && Boolean(seed.bloomed_page_id);
      const pageElement = seed.bloomed_page_id
        ? pageElementById[seed.bloomed_page_id] ?? null
        : null;
      const pagePreview = seed.bloomed_page_id
        ? bloomPagePreviewById[seed.bloomed_page_id] ?? null
        : null;
      const pageVisualState = seed.bloomed_page_id
        ? pageVisualStateById[seed.bloomed_page_id] ?? null
        : null;
      const pagePlanVisual = seed.bloomed_page_id
        ? pagePlanVisualById[seed.bloomed_page_id] ?? null
        : null;
      const hasScheduledDate = Boolean(seed.scheduled_date && isIsoDate(seed.scheduled_date));
      const stage: EventKind = isBloomed ? "flower" : hasScheduledDate ? "sprout" : "seed";
      const href = isBloomed
        ? `/page/${seed.bloomed_page_id}`
        : hasScheduledDate
          ? "/plans?focus=all"
          : "/plans?focus=ideas";
      const flowerIcon = pageVisualState
        ? buildPageVisualSnapshotFromState(pageVisualState).primaryAssetPath
        : buildPageVisualSnapshot({
            planCategory: pagePlanVisual?.category ?? null,
            planFlowerFamily: pagePlanVisual?.flowerFamily ?? null,
            planFlowerAssetPath: pagePlanVisual?.flowerAssetPath ?? null,
            planFlowerBuilderConfig: pagePlanVisual?.flowerBuilderConfig ?? null,
            planSuggestedElement: pagePlanVisual?.suggestedElement ?? null,
            element: pageElement ?? seed.element ?? null,
            rating: pagePreview?.rating ?? null,
          }).primaryAssetPath;
      const stageIcon =
        stage === "seed" ? seedAsset : stage === "sprout" ? sproutAsset : flowerIcon;

      return [
        {
          id: seed.id,
          date: dateCandidate,
          title: seed.title,
          kind: stage,
          href,
          pageId: isBloomed ? seed.bloomed_page_id : null,
          iconSrc: stageIcon,
          element: pageElement ?? seed.element ?? null,
          rating: pagePreview?.rating ?? null,
          isFavorite: pagePreview?.isFavorite ?? false,
          previewSnippet: pagePreview?.snippet ?? null,
          locationLabel: pagePreview?.location ?? null,
        },
      ];
    });
  }, [
    seedRows,
    bloomedStatusCode,
    pageElementById,
    pageVisualStateById,
    bloomPagePreviewById,
    pagePlanVisualById,
    seedAsset,
    sproutAsset,
  ]);

  const directPageEvents = useMemo<PathEvent[]>(() => {
    const seededPageIds = new Set(
      seedRows.map((seed) => seed.bloomed_page_id).filter((id): id is string => Boolean(id)),
    );

    return pageRows.flatMap((page) => {
      const pageId = String(page.id ?? "").trim();
      if (!pageId) return [];
      if (seededPageIds.has(pageId)) return [];

      const dateCandidate = String(page.date ?? "").slice(0, 10);
      if (!isIsoDate(dateCandidate)) return [];

      const pagePlanVisual = pagePlanVisualById[pageId] ?? null;
      const pageVisualState = pageVisualStateById[pageId] ?? null;
      const flowerIcon = pageVisualState
        ? buildPageVisualSnapshotFromState(pageVisualState).primaryAssetPath
        : buildPageVisualSnapshot({
            planCategory: pagePlanVisual?.category ?? null,
            planFlowerFamily: pagePlanVisual?.flowerFamily ?? null,
            planFlowerAssetPath: pagePlanVisual?.flowerAssetPath ?? null,
            planFlowerBuilderConfig: pagePlanVisual?.flowerBuilderConfig ?? null,
            planSuggestedElement: pagePlanVisual?.suggestedElement ?? null,
            element: page.element ?? null,
            rating: page.rating ?? null,
          }).primaryAssetPath;

      return [
        {
          id: `page-${pageId}`,
          date: dateCandidate,
          title: String(page.title ?? "").trim() || "Recuerdo sin título",
          kind: "flower",
          href: `/page/${pageId}`,
          pageId,
          iconSrc: flowerIcon,
          element: page.element ?? null,
          rating: page.rating ?? null,
          isFavorite: Boolean(page.is_favorite),
          previewSnippet: bloomPagePreviewById[pageId]?.snippet ?? null,
          locationLabel: bloomPagePreviewById[pageId]?.location ?? null,
        },
      ];
    });
  }, [
    bloomPagePreviewById,
    pageVisualStateById,
    pagePlanVisualById,
    pageRows,
    seedRows,
  ]);

  const milestoneTreeEvents = useMemo<PathEvent[]>(() => {
    return unlocks.flatMap((unlock, idx) => {
      if (!unlock?.rule_id) return [];
      if (!unlock.claimed_at) return [];
      const rule = rulesById[unlock.rule_id];
      const dateCandidate = String(unlock.claimed_at ?? unlock.created_at ?? "").slice(0, 10);
      const eventDate = isIsoDate(dateCandidate)
        ? dateCandidate
        : addIsoDays(todayIsoLocal(), -(unlocks.length - idx));

      return [
        {
          id: unlock.id ? `tree-${unlock.id}` : `tree-${unlock.rule_id}-${idx}`,
          date: eventDate,
          title: rule?.title || "Árbol de hito",
          kind: "tree",
          href: "/achievements",
          iconSrc: treeIconByTier[rule?.tier ?? "bronze"] ?? defaultTreeIcon,
          tier: rule?.tier ?? null,
          importance: rule?.importance ?? null,
          rank: rule?.rank ?? null,
          rarity: rule?.rarity ?? null,
          leafVariant: rule?.leaf_variant ?? null,
          accentColor: rule?.accent_color ?? null,
          unlockId: unlock.id,
          ruleId: unlock.rule_id,
          claimedAt: unlock.claimed_at,
          preferredRegionId: rule?.preferred_region_id ?? null,
        },
      ];
    });
  }, [unlocks, rulesById, treeIconByTier, defaultTreeIcon]);

  const allEvents = useMemo(
    () => [...seedEvents, ...directPageEvents, ...milestoneTreeEvents],
    [seedEvents, directPageEvents, milestoneTreeEvents],
  );

  const normalizedRange = useMemo(() => {
    const fallbackStart = `${currentYear}-01-01`;
    const fallbackEnd = `${currentYear}-12-31`;
    const start = isIsoDate(dateFrom) ? dateFrom : fallbackStart;
    const end = isIsoDate(dateTo) ? dateTo : fallbackEnd;
    if (start <= end) return { start, end };
    return { start: end, end: start };
  }, [dateFrom, dateTo, currentYear]);

  const pathDays = useMemo(
    () => buildDateRange(normalizedRange.start, normalizedRange.end),
    [normalizedRange],
  );

  const visibleEvents = useMemo(
    () =>
      allEvents.filter(
        (event) => event.date >= normalizedRange.start && event.date <= normalizedRange.end,
      ),
    [allEvents, normalizedRange],
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, PathEvent[]>();
    for (const event of visibleEvents) {
      if (!map.has(event.date)) map.set(event.date, []);
      map.get(event.date)!.push(event);
    }
    return map;
  }, [visibleEvents]);

  const availableYears = useMemo(() => {
    let minYear = currentYear - 12;
    let maxYear = currentYear;
    for (const event of allEvents) {
      const year = Number(event.date.slice(0, 4));
      if (!Number.isFinite(year)) continue;
      minYear = Math.min(minYear, year);
      maxYear = Math.min(currentYear, Math.max(maxYear, year));
    }

    const out: number[] = [];
    for (let y = maxYear; y >= minYear; y -= 1) out.push(y);
    return out;
  }, [allEvents, currentYear]);

  const selectedYearValue = useMemo(() => normalizedRange.start.slice(0, 4), [normalizedRange.start]);

  return {
    allEvents,
    normalizedRange,
    pathDays,
    visibleEvents,
    eventsByDate,
    availableYears,
    selectedYearValue,
  };
}
