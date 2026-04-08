"use client";

import type { ChangeEvent, RefObject } from "react";
import {
  Loader2,
  Mic,
  Paperclip,
  RotateCcw,
  SmilePlus,
  Square,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";

type GardenChatComposerMediaTrayProps = {
  disabled?: boolean;
  canRecordAudio: boolean;
  isRecordingAudio: boolean;
  uploadingMedia: boolean;
  mediaStatusLabel: string | null;
  mediaError: string | null;
  queuedItems: number;
  pendingQueueItems: number;
  failedMediaLabel: string | null;
  canRetryFailedMedia: boolean;
  canCancelUpload: boolean;
  emojiPickerOpen: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onToggleEmojiPicker: () => void;
  onOpenFilePicker: () => void;
  onFileInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onStartVoiceRecording: () => void | Promise<void>;
  onStopVoiceRecording: () => void;
  onCancelVoiceRecording: () => void;
  onCancelCurrentUpload: () => void;
  onRetryFailedMedia: () => void;
  onClearPendingQueue: () => void;
  onClearMediaError: () => void;
};

type ToolButtonProps = {
  label: string;
  onClick: () => void;
  icon: LucideIcon;
  disabled?: boolean;
  tone?: "default" | "danger" | "accent";
  spinning?: boolean;
};

function ToolButton({
  label,
  onClick,
  icon: Icon,
  disabled = false,
  tone = "default",
  spinning = false,
}: ToolButtonProps) {
  const palette =
    tone === "danger"
      ? "border-[#e2c7bf] bg-[#fff4ef] text-[#9a4a3b] hover:bg-[#ffede5]"
      : tone === "accent"
        ? "border-[#cfe0d5] bg-[#eff7f0] text-[#446755] hover:bg-[#e3f1e6]"
        : "border-[#dccfbe] bg-white text-[#6f5e4f] hover:bg-[#f7f1e8]";

  return (
    <button
      type="button"
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-50 ${palette}`}
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
    >
      <Icon size={15} className={spinning ? "animate-spin" : ""} />
    </button>
  );
}

export function GardenChatComposerMediaTray({
  disabled = false,
  canRecordAudio,
  isRecordingAudio,
  uploadingMedia,
  mediaStatusLabel,
  mediaError,
  queuedItems,
  pendingQueueItems,
  failedMediaLabel,
  canRetryFailedMedia,
  canCancelUpload,
  emojiPickerOpen,
  fileInputRef,
  onToggleEmojiPicker,
  onOpenFilePicker,
  onFileInputChange,
  onStartVoiceRecording,
  onStopVoiceRecording,
  onCancelVoiceRecording,
  onCancelCurrentUpload,
  onRetryFailedMedia,
  onClearPendingQueue,
  onClearMediaError,
}: GardenChatComposerMediaTrayProps) {
  const helperText = mediaError || mediaStatusLabel || null;
  const queueHint =
    pendingQueueItems > 0
      ? pendingQueueItems === 1
        ? "1 pendiente"
        : `${pendingQueueItems} pendientes`
      : queuedItems > 1
        ? `${queuedItems - 1} esperando`
        : null;

  return (
    <div className="absolute bottom-3 left-3 right-16 flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        onChange={onFileInputChange}
        data-testid="garden-chat-file-input"
      />

      <div className="flex shrink-0 items-center gap-2">
        <ToolButton
          label={emojiPickerOpen ? "Ocultar selector de emojis" : "Selector de emojis"}
          onClick={onToggleEmojiPicker}
          icon={SmilePlus}
          tone={emojiPickerOpen ? "accent" : "default"}
          disabled={disabled}
        />
        <ToolButton
          label="Adjuntar archivo"
          onClick={onOpenFilePicker}
          icon={Paperclip}
          disabled={disabled || uploadingMedia || isRecordingAudio}
        />
        <ToolButton
          label={isRecordingAudio ? "Terminar grabacion" : "Grabar nota de voz"}
          onClick={() => {
            if (isRecordingAudio) {
              onStopVoiceRecording();
              return;
            }
            void onStartVoiceRecording();
          }}
          icon={isRecordingAudio ? Square : Mic}
          tone={isRecordingAudio ? "danger" : "default"}
          disabled={disabled || (!canRecordAudio && !isRecordingAudio) || uploadingMedia}
        />
        {isRecordingAudio ? (
          <ToolButton
            label="Descartar grabacion"
            onClick={onCancelVoiceRecording}
            icon={X}
            tone="danger"
          />
        ) : null}
        {uploadingMedia ? (
          <>
            <ToolButton
              label="Subiendo adjunto"
              onClick={() => undefined}
              icon={Loader2}
              disabled
              spinning
            />
            <ToolButton
              label="Cancelar subida"
              onClick={onCancelCurrentUpload}
              icon={X}
              tone="danger"
              disabled={!canCancelUpload}
            />
          </>
        ) : null}
        {canRetryFailedMedia ? (
          <ToolButton
            label={
              failedMediaLabel
                ? `Reintentar ${failedMediaLabel}`
                : "Reintentar adjunto fallido"
            }
            onClick={onRetryFailedMedia}
            icon={RotateCcw}
            tone="accent"
          />
        ) : null}
        {pendingQueueItems > 0 && !uploadingMedia ? (
          <ToolButton
            label="Vaciar cola de adjuntos"
            onClick={onClearPendingQueue}
            icon={Trash2}
            tone="danger"
          />
        ) : null}
        {mediaError ? (
          <ToolButton
            label="Ocultar error de media"
            onClick={onClearMediaError}
            icon={X}
            tone="danger"
          />
        ) : null}
      </div>

      {helperText || queueHint ? (
        <div className="min-w-0 flex-1">
          {helperText ? (
            <div
              className={`truncate text-left text-[11px] ${
                mediaError ? "text-[#a14f44]" : "text-[#7d7165]"
              }`}
              title={helperText}
            >
              {helperText}
            </div>
          ) : null}
          {queueHint ? (
            <div className="truncate text-left text-[10px] text-[#9c8f82]" title={queueHint}>
              {queueHint}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
