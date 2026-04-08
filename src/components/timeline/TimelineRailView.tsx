"use client";

import { Star, Trophy } from "lucide-react";
import type { PageItem } from "@/lib/timelinePageUtils";
import { clampText, monthLabel } from "@/lib/timelinePageUtils";
import {
  ElementIcon,
  MoodIcon,
  Stars,
} from "@/components/timeline/TimelineValuePills";

type MilestoneDetail = {
  title: string;
  message: string;
  accentColor?: string | null;
};

type TimelineRailViewProps = {
  grouped: Array<[string, PageItem[]]>;
  filteredIndexById: Map<string, number>;
  milestoneIndices: Set<number>;
  getMilestoneDetail: (count: number) => MilestoneDetail;
  onOpenPage: (id: string) => void;
  elementLabel: (code: string) => string;
  moodLabel: (code: string) => string;
};

export default function TimelineRailView(props: TimelineRailViewProps) {
  const {
    grouped,
    filteredIndexById,
    milestoneIndices,
    getMilestoneDetail,
    onOpenPage,
    elementLabel,
    moodLabel,
  } = props;

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-4 min-w-max pr-2">
        {grouped.map(([ym, list]) => (
          <div
            key={ym}
            className="lv-card w-[340px] shrink-0 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold capitalize">{monthLabel(ym)}</div>
              <div className="text-xs text-[var(--lv-text-muted)]">{list.length} páginas</div>
            </div>

            <div className="mt-3 space-y-2">
              {list.map((item) => {
                const globalIndex = filteredIndexById.get(item.id) ?? -1;
                const isMilestone = globalIndex >= 0 && milestoneIndices.has(globalIndex);
                const milestoneCount = globalIndex + 1;
                const milestoneDetail = getMilestoneDetail(milestoneCount);

                return (
                  <button
                    key={item.id}
                    onClick={() => onOpenPage(item.id)}
                    className={`lv-card-soft w-full p-3 text-left transition hover:shadow-md ${
                      isMilestone ? "lv-tone-warning" : "bg-white"
                    }`}
                    style={
                      isMilestone && milestoneDetail.accentColor
                        ? { backgroundColor: milestoneDetail.accentColor }
                        : undefined
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">
                          {item.title ?? "Página sin título"}
                        </div>
                        <div className="mt-1 text-xs text-[var(--lv-text-muted)]">{item.date}</div>
                        <div className="mt-2 flex flex-wrap gap-2 items-center text-xs">
                          <span className="lv-badge bg-white px-2 py-1 inline-flex items-center gap-1">
                            <ElementIcon code={item.element} /> {elementLabel(item.element)}
                          </span>
                          <span className="lv-badge bg-white px-2 py-1 inline-flex items-center gap-1">
                            <MoodIcon code={item.mood_state} /> {moodLabel(item.mood_state)}
                          </span>
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-1 text-xs text-[var(--lv-text-muted)]">
                        <Star size={14} />
                        <Stars rating={item.rating} />
                      </div>
                    </div>

                    {isMilestone && (
                      <div className="lv-card-soft mt-2 bg-white p-2 text-xs">
                        <div className="font-medium flex items-center gap-1">
                          <Trophy size={14} /> {milestoneDetail.title}
                        </div>
                        <div className="opacity-80 mt-1">
                          {clampText(milestoneDetail.message, 90)}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
