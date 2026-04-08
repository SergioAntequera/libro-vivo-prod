"use client";

import { useMemo } from "react";
import type { ForestViewConfig } from "@/lib/forestConfig";
import { seasonFromDate, type Season } from "@/lib/forestLogic";
import { tierLabel, type Tier } from "@/lib/forestTiers";
import { getSeasonLabel } from "@/lib/narrativeTaxonomy";
import {
  FLOWER_FAMILY_LABELS,
  getFlowerFamilyFromLegacyElement,
  normalizeFlowerFamily,
} from "@/lib/productDomainContracts";
import { hexOrFallback, kindLabel, parseYearToken } from "@/lib/forestPageUtils";
import type { AchievementRule, ForestItem, UnlockEntry } from "@/lib/forestDataTypes";

type SeasonStats = {
  total: number;
  shiny: number;
  healthy: number;
  wilted: number;
  avgStars: number;
};

type MilestoneStatus = "unlocked" | "ready" | "locked";

export type ForestMilestoneCard = AchievementRule & {
  current: number;
  status: MilestoneStatus;
  progressPct: number;
  unlockedAt: string | null;
};

type UseForestOverviewDataParams = {
  items: ForestItem[];
  yearFilter: "all" | string;
  seedsBloomed: number;
  tiers: Tier[];
  rules: AchievementRule[];
  unlockedRuleIds: string[];
  unlockedEntries: UnlockEntry[];
  forestConfig: ForestViewConfig;
  allSeasons: Season[];
  tierOrder: Tier[];
};

type UseForestOverviewDataResult = {
  yearOptions: string[];
  visibleItems: ForestItem[];
  grouped: Record<Season, ForestItem[]>;
  stats: {
    total: number;
    shiny: number;
    healthy: number;
    wilted: number;
    avgStars: number;
  };
  visibleSeedsBloomed: number;
  activeYearForBook: number;
  seasonStats: Record<Season, SeasonStats>;
  tierSet: Set<Tier>;
  activeTierSummary: string;
  seasonLabelUi: (season: Season) => string;
  seasonCardStyle: (season: Season) => { backgroundColor: string };
  kindLabelUi: (kind: AchievementRule["kind"]) => string;
  dominantFlowerFamilies: Array<{ key: string; label: string; count: number }>;
  milestoneCards: ForestMilestoneCard[];
  milestoneTimeline: ForestMilestoneCard[];
  nextMilestone: ForestMilestoneCard | null;
  unlockedMilestoneCount: number;
};

export function useForestOverviewData({
  items,
  yearFilter,
  seedsBloomed,
  tiers,
  rules,
  unlockedRuleIds,
  unlockedEntries,
  forestConfig,
  allSeasons,
  tierOrder,
}: UseForestOverviewDataParams): UseForestOverviewDataResult {
  const yearOptions = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      const year = parseYearToken(item.date);
      if (year) set.add(String(year));
    }
    for (const entry of unlockedEntries) {
      const year = parseYearToken(entry.created_at);
      if (year) set.add(String(year));
    }
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [items, unlockedEntries]);

  const visibleItems = useMemo(() => {
    if (yearFilter === "all") return items;
    return items.filter((item) => item.date.startsWith(`${yearFilter}-`));
  }, [items, yearFilter]);

  const grouped = useMemo(() => {
    const map: Record<Season, ForestItem[]> = {
      spring: [],
      summer: [],
      autumn: [],
      winter: [],
    };

    for (const item of visibleItems) {
      const season = seasonFromDate(item.date);
      map[season].push(item);
    }

    return map;
  }, [visibleItems]);

  const stats = useMemo(() => {
    const total = visibleItems.length;
    const shiny = visibleItems.filter((item) => item.mood_state === "shiny").length;
    const healthy = visibleItems.filter((item) => item.mood_state === "healthy").length;
    const wilted = visibleItems.filter((item) => item.mood_state === "wilted").length;
    const avgStars = total
      ? visibleItems.reduce((acc, item) => acc + (item.rating ?? 0), 0) / total
      : 0;

    return { total, shiny, healthy, wilted, avgStars };
  }, [visibleItems]);

  const visibleSeedsBloomed = useMemo(() => {
    if (yearFilter === "all") return seedsBloomed;
    return visibleItems.filter((item) => Boolean(item.planned_from_seed_id)).length;
  }, [yearFilter, seedsBloomed, visibleItems]);

  const activeYearForBook = useMemo(() => {
    if (yearFilter !== "all" && /^\d{4}$/.test(yearFilter)) return Number(yearFilter);
    return yearOptions.length ? Number(yearOptions[0]) : new Date().getFullYear();
  }, [yearFilter, yearOptions]);

  const seasonStats = useMemo(() => {
    const output: Record<Season, SeasonStats> = {
      spring: { total: 0, shiny: 0, healthy: 0, wilted: 0, avgStars: 0 },
      summer: { total: 0, shiny: 0, healthy: 0, wilted: 0, avgStars: 0 },
      autumn: { total: 0, shiny: 0, healthy: 0, wilted: 0, avgStars: 0 },
      winter: { total: 0, shiny: 0, healthy: 0, wilted: 0, avgStars: 0 },
    };

    for (const season of allSeasons) {
      const list = grouped[season] ?? [];
      const avgStars = list.length
        ? list.reduce((acc, item) => acc + (item.rating ?? 0), 0) / list.length
        : 0;

      output[season] = {
        total: list.length,
        shiny: list.filter((item) => item.mood_state === "shiny").length,
        healthy: list.filter((item) => item.mood_state === "healthy").length,
        wilted: list.filter((item) => item.mood_state === "wilted").length,
        avgStars,
      };
    }

    return output;
  }, [allSeasons, grouped]);

  const unlockedRuleSet = useMemo(() => new Set(unlockedRuleIds), [unlockedRuleIds]);

  const unlockedDateByRuleId = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const row of unlockedEntries) {
      if (!row?.rule_id) continue;
      map[row.rule_id] = row.created_at ?? null;
    }
    return map;
  }, [unlockedEntries]);

  const tierSet = useMemo(() => {
    const set = new Set<Tier>(tiers);
    if (!set.size && rules.length && unlockedRuleSet.size) {
      for (const rule of rules) {
        if (unlockedRuleSet.has(rule.id)) set.add(rule.tier);
      }
    }
    return set;
  }, [tiers, rules, unlockedRuleSet]);

  const activeTierSummary = useMemo(() => {
    const labels = tierOrder
      .filter((tier) => tierSet.has(tier))
      .map((tier) => tierLabel(tier));
    return labels.length ? labels.join(" · ") : "Sin tiers activos todavía";
  }, [tierOrder, tierSet]);

  const seasonLabelUi = useMemo(() => {
    return (season: Season) =>
      forestConfig.seasonLabels[season] ?? getSeasonLabel(season);
  }, [forestConfig.seasonLabels]);

  const assetValue = useMemo(() => {
    return (assetKey: string, fallback: string) => {
      const raw = forestConfig.assets[assetKey];
      if (typeof raw !== "string") return fallback;
      const next = raw.trim();
      return next || fallback;
    };
  }, [forestConfig.assets]);

  const assetHex = useMemo(() => {
    return (assetKey: string, fallback: string) =>
      hexOrFallback(forestConfig.assets[assetKey], fallback);
  }, [forestConfig.assets]);

  const seasonCardStyle = useMemo(() => {
    return (season: Season) => ({
      backgroundColor: assetHex(
        `color.season_card.${season}`,
        season === "spring"
          ? "#f4fff6"
          : season === "summer"
            ? "#fffbe9"
            : season === "autumn"
              ? "#fff3ea"
              : "#eef6ff",
      ),
    });
  }, [assetHex]);

  const kindLabelUi = useMemo(() => {
    return (kind: AchievementRule["kind"]) =>
      assetValue(`label.kind.${kind}`, kindLabel(kind));
  }, [assetValue]);

  const dominantFlowerFamilies = useMemo(() => {
    const counts = new Map<string, number>();

    for (const item of visibleItems) {
      const family =
        normalizeFlowerFamily(item.flower_family) ??
        getFlowerFamilyFromLegacyElement(item.element);
      counts.set(family, (counts.get(family) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([key, count]) => ({
        key,
        count,
        label: FLOWER_FAMILY_LABELS[key as keyof typeof FLOWER_FAMILY_LABELS] ?? "Flor",
      }));
  }, [visibleItems]);

  const milestoneCards = useMemo(() => {
    const ordered = [...rules].sort((a, b) => {
      if (a.kind === b.kind) return a.threshold - b.threshold;
      if (a.kind === "pages_completed") return -1;
      if (b.kind === "pages_completed") return 1;
      return a.kind.localeCompare(b.kind);
    });

    return ordered.map((rule) => {
      const current =
        rule.kind === "seeds_bloomed"
          ? visibleSeedsBloomed
          : rule.kind === "progression_tree"
            ? unlockedRuleSet.has(rule.id)
              ? 1
              : 0
            : stats.total;
      const unlocked = unlockedRuleSet.has(rule.id);
      const ready = !unlocked && current >= rule.threshold;
      const status: MilestoneStatus = unlocked
        ? "unlocked"
        : ready
          ? "ready"
          : "locked";
      const progressPct =
        rule.threshold > 0
          ? Math.min(100, Math.round((current / rule.threshold) * 100))
          : 100;
      const unlockedAt = unlockedDateByRuleId[rule.id] ?? null;

      return {
        ...rule,
        current,
        status,
        progressPct,
        unlockedAt,
      };
    });
  }, [rules, unlockedRuleSet, visibleSeedsBloomed, stats.total, unlockedDateByRuleId]);

  const milestoneTimeline = useMemo(() => {
    return [...milestoneCards].sort((a, b) => {
      if (a.status === "unlocked" && b.status === "unlocked") {
        const timeA = a.unlockedAt ? Date.parse(a.unlockedAt) : Number.POSITIVE_INFINITY;
        const timeB = b.unlockedAt ? Date.parse(b.unlockedAt) : Number.POSITIVE_INFINITY;
        if (timeA !== timeB) return timeA - timeB;
      }
      if (a.status !== b.status) {
        if (a.status === "unlocked") return -1;
        if (b.status === "unlocked") return 1;
        if (a.status === "ready") return -1;
        if (b.status === "ready") return 1;
      }
      if (a.kind === b.kind) return a.threshold - b.threshold;
      if (a.kind === "pages_completed") return -1;
      if (b.kind === "pages_completed") return 1;
      return a.kind.localeCompare(b.kind);
    });
  }, [milestoneCards]);

  const nextMilestone = useMemo(() => {
    return milestoneTimeline.find((card) => card.status !== "unlocked") ?? null;
  }, [milestoneTimeline]);

  const unlockedMilestoneCount = useMemo(
    () => milestoneCards.filter((card) => card.status === "unlocked").length,
    [milestoneCards],
  );

  return {
    yearOptions,
    visibleItems,
    grouped,
    stats,
    visibleSeedsBloomed,
    activeYearForBook,
    seasonStats,
    tierSet,
    activeTierSummary,
    seasonLabelUi,
    seasonCardStyle,
    kindLabelUi,
    dominantFlowerFamilies,
    milestoneCards,
    milestoneTimeline,
    nextMilestone,
    unlockedMilestoneCount,
  };
}
