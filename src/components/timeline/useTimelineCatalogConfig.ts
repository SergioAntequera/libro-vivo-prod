"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  getManyCatalogItems,
  getFallbackCatalogItems,
  type CatalogItemConfig,
} from "@/lib/appConfig";
import {
  getFallbackTimelineViewConfig,
  getTimelineMilestoneRules,
  getTimelineViewConfig,
  type TimelineMilestoneRule,
  type TimelineViewConfig,
} from "@/lib/timelineConfig";

type UseTimelineCatalogConfigParams = {
  hasViewInUrl: boolean;
  onApplyDefaultView: (view: "rail" | "album" | "path") => void;
};

type UseTimelineCatalogConfigResult = {
  elementOptions: CatalogItemConfig[];
  moodOptions: CatalogItemConfig[];
  seasonOptions: CatalogItemConfig[];
  timelineConfig: TimelineViewConfig;
  setTimelineConfig: Dispatch<SetStateAction<TimelineViewConfig>>;
  milestoneRules: TimelineMilestoneRule[];
};

export function useTimelineCatalogConfig({
  hasViewInUrl,
  onApplyDefaultView,
}: UseTimelineCatalogConfigParams): UseTimelineCatalogConfigResult {
  const [elementOptions, setElementOptions] = useState<CatalogItemConfig[]>(
    getFallbackCatalogItems("elements"),
  );
  const [moodOptions, setMoodOptions] = useState<CatalogItemConfig[]>(
    getFallbackCatalogItems("moods"),
  );
  const [seasonOptions, setSeasonOptions] = useState<CatalogItemConfig[]>(
    getFallbackCatalogItems("seasons"),
  );
  const [timelineConfig, setTimelineConfig] = useState<TimelineViewConfig>(
    getFallbackTimelineViewConfig(),
  );
  const [milestoneRules, setMilestoneRules] = useState<TimelineMilestoneRule[]>(
    [],
  );

  useEffect(() => {
    (async () => {
      const [catalogCfg, timelineCfg, rulesCfg] = await Promise.all([
        getManyCatalogItems(["elements", "moods", "seasons"]),
        getTimelineViewConfig(),
        getTimelineMilestoneRules(),
      ]);

      setElementOptions(catalogCfg.elements ?? getFallbackCatalogItems("elements"));
      setMoodOptions(catalogCfg.moods ?? getFallbackCatalogItems("moods"));
      setSeasonOptions(catalogCfg.seasons ?? getFallbackCatalogItems("seasons"));

      setTimelineConfig(timelineCfg);
      setMilestoneRules(rulesCfg);
      if (!hasViewInUrl) {
        onApplyDefaultView(timelineCfg.defaultView === "path" ? "rail" : timelineCfg.defaultView);
      }
    })();
  }, [hasViewInUrl, onApplyDefaultView]);

  return {
    elementOptions,
    moodOptions,
    seasonOptions,
    timelineConfig,
    setTimelineConfig,
    milestoneRules,
  };
}
