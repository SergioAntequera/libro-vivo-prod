"use client";

import { useEffect, useRef } from "react";
import type { SeasonCode, TimelineViewMode } from "@/lib/timelineConfig";
import { isSeasonCode, isValidYm } from "@/lib/timelinePageUtils";

type TimelineSurfaceView = TimelineViewMode | "rail";
type MinStars = 0 | 1 | 2 | 3 | 4 | 5;

type UseTimelineUrlStateParams = {
  pathname: string;
  replaceUrl: (url: string) => void;
  q: string;
  setQ: (value: string) => void;
  yearFilter: "all" | string;
  setYearFilter: (value: "all" | string) => void;
  element: "all" | string;
  setElement: (value: "all" | string) => void;
  mood: "all" | string;
  setMood: (value: "all" | string) => void;
  minStars: MinStars;
  setMinStars: (value: MinStars) => void;
  season: "all" | SeasonCode;
  setSeason: (value: "all" | SeasonCode) => void;
  view: TimelineSurfaceView;
  setView: (value: TimelineSurfaceView) => void;
  monthScope: "selected" | "all";
  setMonthScope: (value: "selected" | "all") => void;
  selectedMonth: string;
  setSelectedMonth: (value: string) => void;
};

function readInitialTimelineViewFlag() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const nextView = params.get("view");
  return nextView === "rail" || nextView === "album" || nextView === "path";
}

export function useTimelineUrlState(params: UseTimelineUrlStateParams) {
  const {
    pathname,
    replaceUrl,
    q,
    setQ,
    yearFilter,
    setYearFilter,
    element,
    setElement,
    mood,
    setMood,
    minStars,
    setMinStars,
    season,
    setSeason,
    view,
    setView,
    monthScope,
    setMonthScope,
    selectedMonth,
    setSelectedMonth,
  } = params;

  const hasViewInUrl = readInitialTimelineViewFlag();
  const initialUrlSyncDoneRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const nextQ = params.get("q");
    const nextYear = params.get("year");
    const nextElement = params.get("element");
    const nextMood = params.get("mood");
    const nextStars = params.get("stars");
    const nextSeason = params.get("season");
    const nextView = params.get("view");
    const scope = params.get("scope");
    const month = params.get("month");

    if (typeof nextQ === "string") setQ(nextQ);
    if (nextYear && /^\d{4}$/.test(nextYear)) {
      setYearFilter(nextYear);
    }
    if (nextElement && nextElement !== "all") setElement(nextElement);
    if (nextMood && nextMood !== "all") setMood(nextMood);

    if (nextStars) {
      const parsed = Number(nextStars);
      if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 5) {
        setMinStars(parsed as MinStars);
      }
    }

    if (nextSeason === "all") {
      setSeason("all");
    } else if (nextSeason && isSeasonCode(nextSeason)) {
      setSeason(nextSeason);
    }

    if (nextView === "rail" || nextView === "album" || nextView === "path") {
      setView(nextView);
    }

    if (scope === "all" || scope === "selected") {
      setMonthScope(scope);
    }
    if (month && isValidYm(month)) {
      setSelectedMonth(month);
    }

    initialUrlSyncDoneRef.current = true;
  }, [
    setElement,
    setMinStars,
    setMood,
    setMonthScope,
    setQ,
    setSeason,
    setSelectedMonth,
    setView,
    setYearFilter,
  ]);

  useEffect(() => {
    if (!initialUrlSyncDoneRef.current) return;
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    let changed = false;

    if (params.get("scope") !== monthScope) {
      params.set("scope", monthScope);
      changed = true;
    }

    if (params.get("view") !== view) {
      params.set("view", view);
      changed = true;
    }

    const normalizedQ = q.trim();
    if (normalizedQ) {
      if (params.get("q") !== normalizedQ) {
        params.set("q", normalizedQ);
        changed = true;
      }
    } else if (params.has("q")) {
      params.delete("q");
      changed = true;
    }

    if (yearFilter !== "all") {
      if (params.get("year") !== yearFilter) {
        params.set("year", yearFilter);
        changed = true;
      }
    } else if (params.has("year")) {
      params.delete("year");
      changed = true;
    }

    if (element !== "all") {
      if (params.get("element") !== element) {
        params.set("element", element);
        changed = true;
      }
    } else if (params.has("element")) {
      params.delete("element");
      changed = true;
    }

    if (mood !== "all") {
      if (params.get("mood") !== mood) {
        params.set("mood", mood);
        changed = true;
      }
    } else if (params.has("mood")) {
      params.delete("mood");
      changed = true;
    }

    if (minStars > 0) {
      const value = String(minStars);
      if (params.get("stars") !== value) {
        params.set("stars", value);
        changed = true;
      }
    } else if (params.has("stars")) {
      params.delete("stars");
      changed = true;
    }

    if (season !== "all") {
      if (params.get("season") !== season) {
        params.set("season", season);
        changed = true;
      }
    } else if (params.has("season")) {
      params.delete("season");
      changed = true;
    }

    if (selectedMonth && isValidYm(selectedMonth)) {
      if (params.get("month") !== selectedMonth) {
        params.set("month", selectedMonth);
        changed = true;
      }
    } else if (params.has("month")) {
      params.delete("month");
      changed = true;
    }

    if (!changed) return;

    const query = params.toString();
    const nextUrl = query ? `${pathname}?${query}` : pathname;
    replaceUrl(nextUrl);
  }, [
    element,
    minStars,
    mood,
    monthScope,
    pathname,
    q,
    replaceUrl,
    season,
    selectedMonth,
    view,
    yearFilter,
  ]);

  return {
    hasViewInUrl,
    urlStateReady: true,
  };
}

