"use client";

import { formatBytesCompact, formatEtaCompact } from "@/lib/uploadFormat";

type VideoUploadQueuePanelProps = {
  uploading: boolean;
  uploadPercent: number;
  uploadLoaded: number;
  uploadTotal: number;
  uploadEtaMs: number | null;
  activeFileName: string | null;
  queueLength: number;
  failedFileName: string | null;
  errorMessage: string | null;
  infoMessage: string | null;
  statusLabel?: string | null;
  onCancel: () => void;
  onRetry: () => void;
  onClear: () => void;
};

export function VideoUploadQueuePanel({
  uploading,
  uploadPercent,
  uploadLoaded,
  uploadTotal,
  uploadEtaMs,
  activeFileName,
  queueLength,
  failedFileName,
  errorMessage,
  infoMessage,
  statusLabel,
  onCancel,
  onRetry,
  onClear,
}: VideoUploadQueuePanelProps) {
  const hasQueueArea =
    queueLength > 0 || !!failedFileName || !!errorMessage || !!infoMessage;

  return (
    <>
      {uploading ? (
        <div className="w-full rounded-2xl border border-[var(--lv-info)] bg-[var(--lv-info-soft)] px-3 py-2 space-y-2 text-[var(--lv-info)]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">{statusLabel ?? "Subiendo video..."}</span>
            <span>{Math.round(uploadPercent)}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-[color-mix(in_srgb,var(--lv-info)_18%,white)] overflow-hidden">
            <div
              className="h-full bg-[var(--lv-info)] transition-all"
              style={{ width: `${uploadPercent}%` }}
            />
          </div>
          {statusLabel === "Procesando en Drive..." ? (
            <div className="text-[11px] opacity-70">
              Archivo enviado. Esperando confirmacion de Google Drive.
            </div>
          ) : (
            <div className="text-[11px] opacity-70">
              {formatBytesCompact(uploadLoaded)} /{" "}
              {formatBytesCompact(uploadTotal || uploadLoaded)} - ETA{" "}
              {formatEtaCompact(uploadEtaMs)}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-1 text-xs text-[var(--lv-text)]"
            >
              Cancelar subida
            </button>
            <div className="text-[11px] opacity-70 self-center">
              Archivo: {activeFileName ?? "video"}
            </div>
          </div>
        </div>
      ) : null}

      {hasQueueArea ? (
        <div className="w-full rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-3 py-2 space-y-2">
          <div className="text-xs font-medium text-[var(--lv-text)]">
            Cola de videos: {queueLength} pendiente(s)
            {failedFileName ? " - 1 con error" : ""}
          </div>
          {infoMessage ? (
            <div className="text-[11px] text-[var(--lv-info)]">{infoMessage}</div>
          ) : null}
          {failedFileName ? (
            <div className="text-[11px] text-[var(--lv-danger)]">
              Error en {failedFileName}: {errorMessage ?? "fallo de subida"}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onRetry}
              disabled={!failedFileName}
              className="rounded-xl border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-1 text-xs text-[var(--lv-text)] disabled:opacity-50"
            >
              Reintentar error
            </button>
            <button
              type="button"
              onClick={onClear}
              disabled={!queueLength && !failedFileName}
              className="rounded-xl border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-1 text-xs text-[var(--lv-text)] disabled:opacity-50"
            >
              Limpiar cola
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
