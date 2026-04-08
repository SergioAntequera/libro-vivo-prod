"use client";

import { useId, useState } from "react";
import {
  formatFlowerText,
  getFallbackFlowerRuntimeConfig,
  resolveFlowerText,
  type FlowerRuntimeConfig,
} from "@/lib/flowerRuntimeConfig";
import { parseYouTubeVideoId } from "@/lib/youtubeUtils";

type PageAudioCardProps = {
  mode: "audio" | "video";
  audioFieldsAvailable: boolean;
  audioLabel: string;
  onAudioLabelChange: (next: string) => void;
  uploadingAudio: boolean;
  isRecordingAudio: boolean;
  canRecordAudio: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onOpenExternalAudioUrl: () => void;
  onEnqueueAudioFiles: (files: File[]) => void;
  audioQueueLength: number;
  hasActiveAudioItem: boolean;
  hasFailedAudioItem: boolean;
  audioQueueInfo: string | null;
  audioUrl: string;
  onClearAudio: () => void;
  videoObjectsCount: number;
  onAddVideoToCanvas: () => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  presenceLabel?: string | null;
  conflictNotice?: boolean;
  config?: FlowerRuntimeConfig | null;
};

export function PageAudioCard(props: PageAudioCardProps) {
  const {
    mode,
    audioFieldsAvailable,
    audioLabel,
    onAudioLabelChange,
    uploadingAudio,
    isRecordingAudio,
    canRecordAudio,
    onStartRecording,
    onStopRecording,
    onOpenExternalAudioUrl,
    onEnqueueAudioFiles,
    audioQueueLength,
    hasActiveAudioItem,
    hasFailedAudioItem,
    audioQueueInfo,
    audioUrl,
    onClearAudio,
    videoObjectsCount,
    onAddVideoToCanvas,
    onInteractionStart,
    onInteractionEnd,
    presenceLabel,
    conflictNotice = false,
    config,
  } = props;
  const runtimeConfig = config ?? getFallbackFlowerRuntimeConfig();
  const hasAudio = Boolean(audioUrl.trim());
  const hasVideoFrames = videoObjectsCount > 0;
  const [isAudioExpanded, setIsAudioExpanded] = useState(!hasAudio);
  const audioFileInputId = useId();

  if (mode === "video") {
    return (
      <div
        className={`lv-card-soft space-y-3 p-4 ${conflictNotice ? "ring-1 ring-[var(--lv-warning)]" : ""}`}
        onFocusCapture={onInteractionStart}
        onBlurCapture={onInteractionEnd}
        onMouseDownCapture={onInteractionStart}
      >
        <div>
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
            {resolveFlowerText(runtimeConfig, "video_eyebrow")}
          </div>
          <div className="mt-1 text-sm font-medium text-[var(--lv-text)]">
            {resolveFlowerText(runtimeConfig, "video_title")}
          </div>
        </div>

        {presenceLabel ? (
          <div className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-1 text-xs font-medium text-[var(--lv-primary-strong)]">
            {presenceLabel}
          </div>
        ) : null}

        {conflictNotice ? (
          <div className="rounded-[18px] border border-[var(--lv-warning)] bg-[var(--lv-warning-soft)] px-3 py-2 text-xs text-[var(--lv-warning)]">
            Han entrado cambios remotos en esta zona mientras estabas dentro. Se aplicaran al salir.
          </div>
        ) : null}

        <div className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-3">
          <div className="text-sm font-medium text-[var(--lv-text)]">
            {hasVideoFrames
              ? formatFlowerText(
                  resolveFlowerText(runtimeConfig, "video_summary_with_count"),
                  { count: videoObjectsCount },
                )
              : resolveFlowerText(runtimeConfig, "video_summary_empty")}
          </div>
          <div className="mt-1 text-xs text-[var(--lv-text-muted)]">
            {resolveFlowerText(runtimeConfig, "video_hint")}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            onInteractionStart?.();
            onAddVideoToCanvas();
          }}
          className="lv-btn lv-btn-secondary rounded-lg px-3 py-2 text-sm"
        >
          {hasVideoFrames
            ? resolveFlowerText(runtimeConfig, "video_cta_has")
            : resolveFlowerText(runtimeConfig, "video_cta_empty")}
        </button>
      </div>
    );
  }

  return (
    <div
      className={`lv-card-soft space-y-4 p-4 ${conflictNotice ? "ring-1 ring-[var(--lv-warning)]" : ""}`}
      onFocusCapture={onInteractionStart}
      onBlurCapture={onInteractionEnd}
      onMouseDownCapture={onInteractionStart}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
        <div className="text-xs uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
          {resolveFlowerText(runtimeConfig, "audio_eyebrow")}
        </div>
        <div className="mt-1 text-sm font-medium text-[var(--lv-text)]">
          {resolveFlowerText(runtimeConfig, "audio_title")}
        </div>
        </div>
        {presenceLabel ? (
          <div className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-1 text-xs font-medium text-[var(--lv-primary-strong)]">
            {presenceLabel}
          </div>
        ) : null}
      </div>

      {conflictNotice ? (
        <div className="rounded-[18px] border border-[var(--lv-warning)] bg-[var(--lv-warning-soft)] px-3 py-2 text-xs text-[var(--lv-warning)]">
          Han entrado cambios remotos en esta zona mientras estabas dentro. Se aplicaran al salir.
        </div>
      ) : null}

      {!audioFieldsAvailable ? (
        <div className="lv-state-panel lv-tone-warning text-xs">
          Faltan columnas de audio en `pages` o bucket de storage. Ejecuta:
          `supabase/sql/2026-03-06_page_audio_support.sql`
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-3">
            <div className="text-sm font-medium text-[var(--lv-text)]">
              {audioLabel.trim() ||
                (hasAudio
                  ? resolveFlowerText(runtimeConfig, "audio_summary_has_label")
                  : resolveFlowerText(runtimeConfig, "audio_summary_empty"))}
            </div>
            <div className="mt-1 text-xs text-[var(--lv-text-muted)]">
              {hasAudio
                ? resolveFlowerText(runtimeConfig, "audio_hint_has")
                : resolveFlowerText(runtimeConfig, "audio_hint_empty")}
            </div>
          </div>

          {audioUrl ? (
            <div className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-3">
              {(() => {
                const ytId = parseYouTubeVideoId(audioUrl);
                if (ytId) {
                  return (
                    <div className="relative w-full overflow-hidden rounded-2xl" style={{ aspectRatio: "16 / 9" }}>
                      <iframe
                        src={`https://www.youtube.com/embed/${ytId}`}
                        title="YouTube"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute inset-0 h-full w-full rounded-2xl border-0"
                      />
                    </div>
                  );
                }
                return (
                  <audio controls preload="none" src={audioUrl} className="w-full">
                    Tu navegador no soporta audio HTML5.
                  </audio>
                );
              })()}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="lv-btn lv-btn-secondary px-3 py-2 text-sm"
              onClick={() => setIsAudioExpanded((prev) => !prev)}
            >
              {isAudioExpanded
                ? resolveFlowerText(runtimeConfig, "audio_toggle_cta_hide")
                : hasAudio
                  ? resolveFlowerText(runtimeConfig, "audio_toggle_cta_has")
                  : resolveFlowerText(runtimeConfig, "audio_toggle_cta_empty")}
            </button>
            {hasAudio ? (
              <button
                type="button"
                onClick={onClearAudio}
                className="lv-btn lv-btn-secondary rounded-lg px-3 py-2 text-sm"
              >
                {resolveFlowerText(runtimeConfig, "audio_clear_cta")}
              </button>
            ) : null}
          </div>

          {isAudioExpanded ? (
            <div className="space-y-3 rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-bg-soft)] p-3">
              <input
                value={audioLabel}
                onChange={(event) => onAudioLabelChange(event.target.value)}
                placeholder={resolveFlowerText(runtimeConfig, "audio_label_placeholder")}
                className="lv-input text-sm"
              />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onStartRecording}
                  disabled={uploadingAudio || isRecordingAudio || !canRecordAudio}
                  className="lv-btn lv-btn-secondary rounded-lg px-3 py-2 text-sm disabled:opacity-50"
                >
                  {isRecordingAudio
                    ? resolveFlowerText(runtimeConfig, "audio_recording_cta")
                    : resolveFlowerText(runtimeConfig, "audio_record_cta")}
                </button>
                <button
                  type="button"
                  onClick={onStopRecording}
                  disabled={!isRecordingAudio}
                  className="lv-btn lv-btn-secondary rounded-lg px-3 py-2 text-sm disabled:opacity-50"
                >
                  {resolveFlowerText(runtimeConfig, "audio_stop_cta")}
                </button>
                <button
                  type="button"
                  onClick={onOpenExternalAudioUrl}
                  disabled={
                    uploadingAudio ||
                    isRecordingAudio ||
                    audioQueueLength > 0 ||
                    hasActiveAudioItem
                  }
                  className="lv-btn lv-btn-secondary rounded-lg px-3 py-2 text-sm disabled:opacity-50"
                >
                  {resolveFlowerText(runtimeConfig, "audio_external_cta")}
                </button>
              </div>

              {!canRecordAudio ? (
                <p className="text-xs text-[var(--lv-text-muted)]">
                  {resolveFlowerText(runtimeConfig, "audio_browser_fallback")}
                </p>
              ) : null}

              <div className="rounded-[18px] border border-dashed border-[var(--lv-border)] bg-[var(--lv-surface)] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor={audioFileInputId}
                    className={`lv-btn lv-btn-secondary cursor-pointer rounded-lg px-3 py-2 text-sm ${
                      uploadingAudio || isRecordingAudio ? "pointer-events-none opacity-50" : ""
                    }`}
                  >
                    Elegir archivo de audio
                  </label>
                  <div className="text-xs text-[var(--lv-text-muted)]">
                    También puedes usar una grabación desde el móvil o desde el PC.
                  </div>
                </div>
                <input
                  id={audioFileInputId}
                  type="file"
                  accept="audio/*"
                  capture="user"
                  multiple
                  className="sr-only"
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    if (files.length) onEnqueueAudioFiles(files);
                    event.currentTarget.value = "";
                  }}
                  disabled={uploadingAudio || isRecordingAudio}
                />
              </div>

              {uploadingAudio ||
              audioQueueLength > 0 ||
              hasFailedAudioItem ||
              audioQueueInfo ? (
                <div className="lv-state-panel lv-tone-info text-xs">
                  {resolveFlowerText(runtimeConfig, "audio_upload_status_hint")}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
