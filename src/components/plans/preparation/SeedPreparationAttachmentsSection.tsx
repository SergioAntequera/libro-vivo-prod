"use client";

import type { SeedPreparationAttachment } from "@/lib/seedPreparationTypes";
import { SeedPreparationSectionCard } from "@/components/plans/preparation/SeedPreparationSectionCard";
import { ATTACHMENT_KIND_OPTIONS } from "@/components/plans/preparation/seedPreparationUi";

type SeedPreparationAttachmentsSectionProps = {
  items: SeedPreparationAttachment[];
  busy?: boolean;
  uploadingIds: string[];
  onAdd: () => void;
  onBlurItem?: (itemId: string) => void;
  onChange: (itemId: string, patch: Partial<SeedPreparationAttachment>) => void;
  onFocusItem?: (input: { itemId: string; label: string }) => void;
  onRemove: (itemId: string) => void;
  onUpload: (itemId: string, file: File) => Promise<void>;
};

export function SeedPreparationAttachmentsSection({
  items,
  busy = false,
  uploadingIds,
  onAdd,
  onBlurItem,
  onChange,
  onFocusItem,
  onRemove,
  onUpload,
}: SeedPreparationAttachmentsSectionProps) {
  const generalItems = items.filter(
    (item) => item.linked_kind === "seed" || item.linked_kind === "generic_document",
  );

  return (
    <SeedPreparationSectionCard
      eyebrow="Documentos generales"
      title="Documentos del viaje"
      description="Pasaporte, DNI, seguro o cualquier archivo general del viaje. Los billetes, reservas y confirmaciones viven mejor en su propia pieza."
      action={
        <button type="button" className="lv-btn lv-btn-secondary" onClick={onAdd}>
          Anadir documento
        </button>
      }
    >
      <div className="space-y-4">
        {generalItems.length ? (
          generalItems.map((item, index) => {
            const uploading = uploadingIds.includes(item.id);

            return (
              <article
                key={item.id}
                className="space-y-4 rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4"
                onFocusCapture={() =>
                  onFocusItem?.({
                    itemId: item.id,
                    label: item.title.trim() || item.file_name?.trim() || `Documento ${index + 1}`,
                  })
                }
                onBlurCapture={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    onBlurItem?.(item.id);
                  }
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[var(--lv-text)]">
                      {item.title.trim() || item.file_name?.trim() || `Documento ${index + 1}`}
                    </div>
                    <div className="text-xs text-[var(--lv-text-muted)]">
                      {item.file_name?.trim() || "Sin archivo todavia"}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="lv-btn lv-btn-ghost"
                    onClick={() => onRemove(item.id)}
                    disabled={busy || uploading}
                  >
                    Quitar
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-[1fr_0.8fr]">
                  <label className="space-y-2">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                      Titulo
                    </div>
                    <input
                      className="lv-input"
                      value={item.title}
                      onChange={(event) => onChange(item.id, { title: event.target.value })}
                      placeholder="Pasaporte, seguro, resumen del viaje..."
                    />
                  </label>

                  <label className="space-y-2">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                      Tipo
                    </div>
                    <select
                      className="lv-select"
                      value={item.attachment_kind}
                      onChange={(event) =>
                        onChange(item.id, {
                          attachment_kind: event.target.value as SeedPreparationAttachment["attachment_kind"],
                        })
                      }
                    >
                      {ATTACHMENT_KIND_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                  <label className="space-y-2">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                      Archivo
                    </div>
                    <input
                      type="file"
                      className="lv-input file:mr-3 file:rounded-full file:border-0 file:bg-[#eef6ea] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#2f5137]"
                      disabled={busy || uploading}
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        if (!file) return;
                        void onUpload(item.id, file);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>

                  <div className="flex items-end gap-2">
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
                    {uploading ? (
                      <span className="rounded-full bg-white px-3 py-2 text-sm text-[var(--lv-text-muted)]">
                        Subiendo...
                      </span>
                    ) : null}
                  </div>
                </div>

                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Notas
                  </div>
                  <textarea
                    className="lv-textarea min-h-[88px]"
                    value={item.notes ?? ""}
                    onChange={(event) => onChange(item.id, { notes: event.target.value || null })}
                    placeholder="Pagado, caduca, imprimir, llevar a mano..."
                  />
                </label>
              </article>
            );
          })
        ) : (
          <div className="rounded-[20px] border border-dashed border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 py-4 text-sm leading-6 text-[var(--lv-text-muted)]">
            Guarda aqui solo los documentos generales del viaje. Lo ligado a trayectos, alojamientos y reservas vive ya en su propio sitio para no mezclarlo todo.
          </div>
        )}
      </div>
    </SeedPreparationSectionCard>
  );
}
