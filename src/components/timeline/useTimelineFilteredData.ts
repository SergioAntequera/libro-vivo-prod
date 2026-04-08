"use client";

import { useMemo } from "react";
import {
  getMilestoneChoicesWithCurrent,
  isTimelineMilestone,
  resolveSeasonFromDate,
  type SeasonCode,
  type TimelineMilestoneRule,
  type TimelineViewConfig,
} from "@/lib/timelineConfig";
import { monthKey, type PageItem } from "@/lib/timelinePageUtils";

type UseTimelineFilteredDataParams = {
  items: PageItem[];
  q: string;
  yearFilter: "all" | string;
  element: "all" | string;
  mood: "all" | string;
  minStars: 0 | 1 | 2 | 3 | 4 | 5;
  season: "all" | SeasonCode;
  timelineConfig: TimelineViewConfig;
  monthScope: "selected" | "all";
  selectedMonth: string;
  milestoneRules: TimelineMilestoneRule[];
};

type UseTimelineFilteredDataResult = {
  yearOptions: string[];
  filtered: PageItem[];
  monthGroupsAll: Array<[string, PageItem[]]>;
  visibleFiltered: PageItem[];
  grouped: Array<[string, PageItem[]]>;
  monthKeys: string[];
  selectedMonthIndex: number;
  activeYearForBook: number;
  canGoNewerMonth: boolean;
  canGoOlderMonth: boolean;
  filteredIndexById: Map<string, number>;
  ruleByNumber: Map<number, TimelineMilestoneRule>;
  milestoneIndices: Set<number>;
  milestoneEveryOptions: number[];
};

export function useTimelineFilteredData({
  items,
  q,
  yearFilter,
  element,
  mood,
  minStars,
  season,
  timelineConfig,
  monthScope,
  selectedMonth,
  milestoneRules,
}: UseTimelineFilteredDataParams): UseTimelineFilteredDataResult {
  const yearOptions = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      const year = item.date.slice(0, 4);
      if (/^\d{4}$/.test(year)) set.add(year);
    }
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [items]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return items.filter((p) => {
      if (yearFilter !== "all" && !p.date.startsWith(`${yearFilter}-`)) return false;
      if (element !== "all" && p.element !== element) return false;
      if (mood !== "all" && p.mood_state !== mood) return false;

      const seasonCode = resolveSeasonFromDate(p.date, timelineConfig);
      if (season !== "all" && seasonCode !== season) return false;

      const stars = p.rating ?? 0;
      if (stars < minStars) return false;

      if (query) {
        const haystack = `${p.title ?? ""} ${p.date} ${p.element} ${p.mood_state}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [items, q, yearFilter, element, mood, minStars, season, timelineConfig]);

  const monthGroupsAll = useMemo(() => {
    const map = new Map<string, PageItem[]>();
    for (const p of filtered) {
      const key = monthKey(p.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const visibleFiltered = useMemo(() => {
    if (monthScope === "all") return filtered;
    if (!selectedMonth) return filtered;
    return filtered.filter((p) => monthKey(p.date) === selectedMonth);
  }, [filtered, monthScope, selectedMonth]);

  const grouped = useMemo(() => {
    const map = new Map<string, PageItem[]>();
    for (const p of visibleFiltered) {
      const key = monthKey(p.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return Array.from(map.entries());
  }, [visibleFiltered]);

  const monthKeys = useMemo(
    () => monthGroupsAll.map(([ym]) => ym),
    [monthGroupsAll],
  );

  const selectedMonthIndex = useMemo(
    () => monthKeys.findIndex((x) => x === selectedMonth),
    [monthKeys, selectedMonth],
  );

  const activeYearForBook = useMemo(() => {
    if (yearFilter !== "all" && /^\d{4}$/.test(yearFilter)) return Number(yearFilter);
    if (selectedMonth && /^\d{4}-\d{2}$/.test(selectedMonth)) {
      return Number(selectedMonth.slice(0, 4));
    }
    return new Date().getFullYear();
  }, [yearFilter, selectedMonth]);

  const canGoNewerMonth = selectedMonthIndex > 0;
  const canGoOlderMonth =
    selectedMonthIndex >= 0 && selectedMonthIndex < monthKeys.length - 1;

  const filteredIndexById = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((item, index) => map.set(item.id, index));
    return map;
  }, [filtered]);

  const ruleByNumber = useMemo(() => {
    const map = new Map<number, TimelineMilestoneRule>();
    milestoneRules.forEach((rule) => map.set(rule.milestoneNumber, rule));
    return map;
  }, [milestoneRules]);

  const ruleNumbers = useMemo(
    () => new Set(milestoneRules.map((rule) => rule.milestoneNumber)),
    [milestoneRules],
  );

  const milestoneIndices = useMemo(() => {
    const set = new Set<number>();
    filtered.forEach((_, index) => {
      const position = index + 1;
      if (isTimelineMilestone(position, timelineConfig, ruleNumbers)) {
        set.add(index);
      }
    });
    return set;
  }, [filtered, timelineConfig, ruleNumbers]);

  const milestoneEveryOptions = useMemo(
    () =>
      getMilestoneChoicesWithCurrent(
        timelineConfig.milestoneChoices,
        timelineConfig.milestoneEvery,
      ),
    [timelineConfig.milestoneChoices, timelineConfig.milestoneEvery],
  );

  return {
    yearOptions,
    filtered,
    monthGroupsAll,
    visibleFiltered,
    grouped,
    monthKeys,
    selectedMonthIndex,
    activeYearForBook,
    canGoNewerMonth,
    canGoOlderMonth,
    filteredIndexById,
    ruleByNumber,
    milestoneIndices,
    milestoneEveryOptions,
  };
}
