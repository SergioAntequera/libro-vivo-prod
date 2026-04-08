"use client";

import { formatBytesCompact, formatEtaCompact } from "@/lib/uploadFormat";
import { StatusNotice } from "@/components/ui/StatusNotice";

export type UploadTaskChannel = {
  id: string;
  label: string;
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
  onCancel?: () => void;
  onRetry?: () => void;
  onClear?: () => void;
};

type UploadTaskCenterProps = {
  channels: UploadTaskChannel[];
  className?: string;
};

function hasChannelActivity(channel: UploadTaskChannel) {
  return (
    channel.uploading ||
    channel.queueLength > 0 ||
    Boolean(channel.failedFileName) ||
    Boolean(channel.errorMessage) ||
    Boolean(channel.infoMessage)
  );
}

export function UploadTaskCenter({ channels, className }: UploadTaskCenterProps) {
  const activeChannels = channels.filter(hasChannelActivity);
  if (!activeChannels.length) return null;

  return (
    <section className={`lv-card space-y-3 p-4 ${className ?? ""}`} aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold">Centro de subidas</div>
        <div className="lv-badge">{activeChannels.length} canal(es) activo(s)</div>
      </div>

      <div className="space-y-2">
        {activeChannels.map((channel) => (
          <article key={channel.id} className="lv-card-soft space-y-2 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium">{channel.label}</div>
              <div className="text-xs text-[var(--lv-text-muted)]">
                Pendientes: {channel.queueLength}
                {channel.failedFileName ? " | 1 con error" : ""}
              </div>
            </div>

            {channel.uploading ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span>{channel.statusLabel ?? "Subiendo archivo..."}</span>
                  <span>{Math.round(channel.uploadPercent)}%</span>
                </div>
                <div className="lv-progress-track">
                  <div
                    className="lv-progress-fill"
                    style={{ width: `${channel.uploadPercent}%` }}
                  />
                </div>
                {channel.statusLabel === "Procesando en Drive..." ? (
                  <div className="text-[11px] text-[var(--lv-text-muted)]">
                    Archivo enviado. Esperando confirmacion de Google Drive.
                  </div>
                ) : (
                  <div className="text-[11px] text-[var(--lv-text-muted)]">
                    {formatBytesCompact(channel.uploadLoaded)} /{" "}
                    {formatBytesCompact(channel.uploadTotal || channel.uploadLoaded)} | ETA{" "}
                    {formatEtaCompact(channel.uploadEtaMs)}
                  </div>
                )}
                <div className="text-[11px] text-[var(--lv-text-muted)]">
                  Archivo: {channel.activeFileName ?? "archivo"}
                </div>
              </div>
            ) : null}

            {channel.infoMessage ? (
              <StatusNotice
                tone="info"
                message={channel.infoMessage}
                className="text-[11px]"
              />
            ) : null}
            {channel.failedFileName ? (
              <StatusNotice
                tone="error"
                message={`Error en ${channel.failedFileName}: ${channel.errorMessage ?? "fallo de subida"}`}
                className="text-[11px]"
              />
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="lv-btn lv-btn-secondary text-xs disabled:opacity-50"
                onClick={channel.onCancel}
                disabled={!channel.uploading || !channel.onCancel}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="lv-btn lv-btn-secondary text-xs disabled:opacity-50"
                onClick={channel.onRetry}
                disabled={!channel.failedFileName || !channel.onRetry}
              >
                Reintentar error
              </button>
              <button
                type="button"
                className="lv-btn lv-btn-ghost text-xs disabled:opacity-50"
                onClick={channel.onClear}
                disabled={
                  (!channel.queueLength && !channel.failedFileName) || !channel.onClear
                }
              >
                Limpiar cola
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
