"use client";

import type { SeedPreparationAttachment } from "@/lib/seedPreparationTypes";

type SeedPreparationInlineAttachmentsProps = {
  title: string;
  description: string;
  items: SeedPreparationAttachment[];
  busy?: boolean;
  uploadingIds: string[];
  emptyText: string;
  uploadLabel: string;
  onUpload: (file: File) => Promise<void> | void;
  onRemove: (itemId: string) => void;
};

export function SeedPreparationInlineAttachments({
  title,
  description,
  items,
  busy = false,
  uploadingIds,
  emptyText,
  uploadLabel,
  onUpload,
  onRemove,
}: SeedPreparationInlineAttachmentsProps) {
  return (
    <div className="space-y-3 rounded-[20px] border border-[var(--lv-border)] bg-white px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
            Adjuntos ligados
          </div>
          <div className="text-sm font-semibold text-[var(--lv-text)]">{title}</div>
          <p className="max-w-2xl text-sm leading-6 text-[var(--lv-text-muted)]">{description}</p>
        </div>

        <label className="lv-btn lv-btn-secondary cursor-pointer">
          {uploadLabel}
          <input
            type="file"
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              if (!file) return;
              void onUpload(file);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>

      {items.length ? (
        <div className="space-y-2">
          {items.map((item) => {
            const uploading = uploadingIds.includes(item.id);
            return (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-3 py-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="truncate text-sm font-medium text-[var(--lv-text)]">
                    {item.title.trim() || item.file_name?.trim() || "Documento adjunto"}
                  </div>
                  <div className="truncate text-xs text-[var(--lv-text-muted)]">
                    {uploading
                      ? "Subiendo..."
                      : item.file_name?.trim() || "Aun sin archivo subido"}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {item.file_url.trim() ? (
                    <a
                      href={item.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="lv-btn lv-btn-secondary"
                    >
                      Abrir
                    </a>
                  ) : null}
                  <button
                    type="button"
                    className="lv-btn lv-btn-ghost"
                    disabled={busy || uploading}
                    onClick={() => onRemove(item.id)}
                  >
                    Quitar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[18px] border border-dashed border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-3 py-3 text-sm leading-6 text-[var(--lv-text-muted)]">
          {emptyText}
        </div>
      )}
    </div>
  );
}
