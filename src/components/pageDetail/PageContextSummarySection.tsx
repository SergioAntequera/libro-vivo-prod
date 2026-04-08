"use client";

import type { ReactNode } from "react";
import {
  formatFlowerText,
  getFallbackFlowerRuntimeConfig,
  resolveFlowerText,
  type FlowerRuntimeConfig,
} from "@/lib/flowerRuntimeConfig";

type PageContextSummarySectionProps = {
  locationLabel: string;
  audioUrl: string;
  audioLabel: string;
  videoObjectsCount: number;
  onEditContext: () => void;
  config?: FlowerRuntimeConfig | null;
};

function SummaryCard(props: {
  label: string;
  title: string;
  description: string;
  extra?: ReactNode;
}) {
  return (
    <article className="rounded-[22px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-4 shadow-[var(--lv-shadow-sm)]">
      <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
        {props.label}
      </div>
      <div className="mt-2 text-sm font-semibold text-[var(--lv-text)]">{props.title}</div>
      <p className="mt-1 text-sm text-[var(--lv-text-muted)]">{props.description}</p>
      {props.extra ? <div className="mt-3">{props.extra}</div> : null}
    </article>
  );
}

export function PageContextSummarySection(props: PageContextSummarySectionProps) {
  const { locationLabel, audioUrl, audioLabel, videoObjectsCount, onEditContext, config } = props;
  const runtimeConfig = config ?? getFallbackFlowerRuntimeConfig();
  const hasLocation = Boolean(locationLabel.trim());
  const hasAudio = Boolean(audioUrl.trim());
  const hasVideo = videoObjectsCount > 0;

  return (
    <section className="lv-card space-y-4 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
            {resolveFlowerText(runtimeConfig, "context_summary_eyebrow")}
          </div>
          <h2 className="mt-1 text-xl font-semibold text-[var(--lv-text)]">
            {resolveFlowerText(runtimeConfig, "context_summary_title")}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--lv-text-muted)]">
            {resolveFlowerText(runtimeConfig, "context_summary_description")}
          </p>
        </div>
        <button type="button" className="lv-btn lv-btn-secondary" onClick={onEditContext}>
          {resolveFlowerText(runtimeConfig, "context_summary_cta")}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <SummaryCard
          label={resolveFlowerText(runtimeConfig, "context_summary_place_label")}
          title={
            hasLocation
              ? locationLabel
              : resolveFlowerText(runtimeConfig, "context_summary_place_title_empty")
          }
          description={
            hasLocation
              ? resolveFlowerText(runtimeConfig, "context_summary_place_desc_has")
              : resolveFlowerText(runtimeConfig, "context_summary_place_desc_empty")
          }
        />

        <SummaryCard
          label={resolveFlowerText(runtimeConfig, "context_summary_audio_label")}
          title={
            hasAudio
              ? audioLabel.trim() ||
                resolveFlowerText(runtimeConfig, "context_summary_audio_title_has")
              : resolveFlowerText(runtimeConfig, "context_summary_audio_title_empty")
          }
          description={
            hasAudio
              ? resolveFlowerText(runtimeConfig, "context_summary_audio_desc_has")
              : resolveFlowerText(runtimeConfig, "context_summary_audio_desc_empty")
          }
          extra={
            hasAudio ? (
              <div className="rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-3 py-2">
                <audio controls preload="none" src={audioUrl} className="w-full">
                  Tu navegador no soporta audio HTML5.
                </audio>
              </div>
            ) : null
          }
        />

        <SummaryCard
          label={resolveFlowerText(runtimeConfig, "context_summary_video_label")}
          title={
            hasVideo
              ? formatFlowerText(
                  resolveFlowerText(runtimeConfig, "context_summary_video_title_template"),
                  {
                    count: videoObjectsCount,
                  },
                )
              : resolveFlowerText(runtimeConfig, "context_summary_video_title_empty")
          }
          description={
            hasVideo
              ? resolveFlowerText(runtimeConfig, "context_summary_video_desc_has")
              : resolveFlowerText(runtimeConfig, "context_summary_video_desc_empty")
          }
        />
      </div>
    </section>
  );
}
