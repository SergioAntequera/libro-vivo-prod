"use client";

import { Star } from "lucide-react";
import type { PageItem } from "@/lib/timelinePageUtils";
import { buildPageVisualSnapshotFromState } from "@/lib/pageVisualState";
import {
  ElementIcon,
  MoodIcon,
  Stars,
} from "@/components/timeline/TimelineValuePills";

type TimelineAlbumViewProps = {
  items: PageItem[];
  onOpenPage: (id: string) => void;
  elementLabel: (code: string) => string;
  moodLabel: (code: string) => string;
};

export default function TimelineAlbumView(props: TimelineAlbumViewProps) {
  const { items, onOpenPage, elementLabel, moodLabel } = props;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onOpenPage(item.id)}
          className="lv-card p-4 text-left transition hover:shadow-md"
        >
          {(() => {
            const visualSrc = item.visual
              ? buildPageVisualSnapshotFromState(item.visual).primaryAssetPath
              : item.cover_photo_url || item.thumbnail_url;
            return visualSrc ? (
              <img
                src={visualSrc}
                alt="cover"
                className="mb-3 h-36 w-full rounded-2xl border bg-white object-contain"
              />
            ) : (
              <div className="mb-3 flex h-36 w-full items-center justify-center rounded-2xl border bg-white text-[var(--lv-text-muted)]">
                Sin portada
              </div>
            );
          })()}

          <div className="flex items-start justify-between gap-3">
            <span className="lv-badge bg-white px-2 py-1 text-sm inline-flex items-center gap-2">
              <ElementIcon code={item.element} /> {elementLabel(item.element)}
            </span>

            <span className="lv-badge bg-white px-2 py-1 text-sm inline-flex items-center gap-2">
              <MoodIcon code={item.mood_state} /> {moodLabel(item.mood_state)}
            </span>
          </div>

          <div className="mt-2 font-semibold text-lg">
            {item.title ?? "Página sin título"}
          </div>
          <div className="text-sm text-[var(--lv-text-muted)]">{item.date}</div>

          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <span className="lv-badge bg-white px-2 py-1 text-sm inline-flex items-center gap-2">
              <Star size={16} className="opacity-70" />
              <Stars rating={item.rating} />
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
