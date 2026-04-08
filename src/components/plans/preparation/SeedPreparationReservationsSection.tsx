"use client";

import type { SeedPlaceOption } from "@/lib/plansTypes";
import type {
  SeedPreparationAttachment,
  SeedPreparationReservation,
  SeedPreparationStop,
} from "@/lib/seedPreparationTypes";
import { SeedPreparationInlineAttachments } from "@/components/plans/preparation/SeedPreparationInlineAttachments";
import { SeedPreparationSectionCard } from "@/components/plans/preparation/SeedPreparationSectionCard";
import {
  RESERVATION_KIND_OPTIONS,
  RESERVATION_STATUS_OPTIONS,
  buildPlaceOptionLabel,
  buildStopOptionLabel,
} from "@/components/plans/preparation/seedPreparationUi";

type SeedPreparationReservationsSectionProps = {
  items: SeedPreparationReservation[];
  attachmentItems: SeedPreparationAttachment[];
  placeOptions: SeedPlaceOption[];
  stopOptions: SeedPreparationStop[];
  busy?: boolean;
  uploadingAttachmentIds: string[];
  onAdd: () => void;
  onBlurItem?: (itemId: string) => void;
  onChange: (itemId: string, patch: Partial<SeedPreparationReservation>) => void;
  onFocusItem?: (input: { itemId: string; label: string }) => void;
  onRemove: (itemId: string) => void;
  onAttachDocument: (itemId: string, file: File) => Promise<void>;
  onRemoveAttachment: (itemId: string) => void;
};

export function SeedPreparationReservationsSection({
  items,
  attachmentItems,
  placeOptions,
  stopOptions,
  busy = false,
  uploadingAttachmentIds,
  onAdd,
  onBlurItem,
  onChange,
  onFocusItem,
  onRemove,
  onAttachDocument,
  onRemoveAttachment,
}: SeedPreparationReservationsSectionProps) {
  return (
    <SeedPreparationSectionCard
      eyebrow="Reservas"
      title="Reservas y entradas"
      description="Museos, excursiones, restaurantes, seguros o cualquier reserva con proveedor, importe, localizador y documentos asociados."
      action={
        <button type="button" className="lv-btn lv-btn-secondary" onClick={onAdd}>
          Anadir reserva
        </button>
      }
    >
      <div className="space-y-4">
        {items.length ? (
          items.map((item, index) => (
            <article
              key={item.id}
              className="space-y-4 rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4"
              onFocusCapture={() =>
                onFocusItem?.({
                  itemId: item.id,
                  label: item.title.trim() || `Reserva ${index + 1}`,
                })
              }
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  onBlurItem?.(item.id);
                }
              }}
            >
              {(() => {
                const linkedAttachments = attachmentItems.filter(
                  (attachment) =>
                    attachment.linked_kind === "reservation" &&
                    attachment.linked_record_id === item.id,
                );
                return (
                  <SeedPreparationInlineAttachments
                    title="Comprobantes y entradas"
                    description="Adjunta aqui entradas, recibos, seguro o cualquier documento ligado a esta reserva."
                    items={linkedAttachments}
                    busy={busy}
                    uploadingIds={uploadingAttachmentIds}
                    emptyText="Todavia no hay documentos ligados a esta reserva."
                    uploadLabel="Adjuntar comprobante"
                    onUpload={(file) => onAttachDocument(item.id, file)}
                    onRemove={onRemoveAttachment}
                  />
                );
              })()}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--lv-text)]">
                    {item.title.trim() || `Reserva ${index + 1}`}
                  </div>
                  <div className="text-xs text-[var(--lv-text-muted)]">
                    {RESERVATION_KIND_OPTIONS.find((option) => option.value === item.reservation_kind)
                      ?.label ?? "Reserva"}
                  </div>
                </div>
                <button
                  type="button"
                  className="lv-btn lv-btn-ghost"
                  onClick={() => onRemove(item.id)}
                >
                  Quitar
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Titulo
                  </div>
                  <input
                    className="lv-input"
                    value={item.title}
                    onChange={(event) => onChange(item.id, { title: event.target.value })}
                    placeholder="Entrada museo, seguro viaje, restaurante..."
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Tipo
                  </div>
                  <select
                    className="lv-select"
                    value={item.reservation_kind}
                    onChange={(event) =>
                      onChange(item.id, {
                        reservation_kind: event.target.value as SeedPreparationReservation["reservation_kind"],
                      })
                    }
                  >
                    {RESERVATION_KIND_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_0.8fr_0.8fr]">
                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Proveedor
                  </div>
                  <input
                    className="lv-input"
                    value={item.provider_name ?? ""}
                    onChange={(event) =>
                      onChange(item.id, { provider_name: event.target.value || null })
                    }
                    placeholder="Ticketmaster, Booking, web oficial..."
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Estado
                  </div>
                  <select
                    className="lv-select"
                    value={item.status}
                    onChange={(event) =>
                      onChange(item.id, {
                        status: event.target.value as SeedPreparationReservation["status"],
                      })
                    }
                  >
                    {RESERVATION_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Etapa
                  </div>
                  <select
                    className="lv-select"
                    value={item.stop_id ?? ""}
                    onChange={(event) => onChange(item.id, { stop_id: event.target.value || null })}
                  >
                    <option value="">Sin etapa</option>
                    {stopOptions.map((stop, stopIndex) => (
                      <option key={stop.id} value={stop.id}>
                        {buildStopOptionLabel(stop, stopIndex)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_0.8fr_0.7fr_0.5fr]">
                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Enlace
                  </div>
                  <input
                    className="lv-input"
                    value={item.reservation_url ?? ""}
                    onChange={(event) =>
                      onChange(item.id, { reservation_url: event.target.value || null })
                    }
                    placeholder="https://..."
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Localizador
                  </div>
                  <input
                    className="lv-input"
                    value={item.reference_code ?? ""}
                    onChange={(event) =>
                      onChange(item.id, { reference_code: event.target.value || null })
                    }
                    placeholder="ABC123"
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Importe
                  </div>
                  <input
                    type="number"
                    className="lv-input"
                    step="0.01"
                    value={item.amount ?? ""}
                    onChange={(event) =>
                      onChange(item.id, {
                        amount: event.target.value ? Number(event.target.value) : null,
                      })
                    }
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Moneda
                  </div>
                  <input
                    className="lv-input"
                    value={item.currency ?? ""}
                    onChange={(event) => onChange(item.id, { currency: event.target.value || null })}
                    maxLength={4}
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Fecha y hora
                  </div>
                  <input
                    type="datetime-local"
                    className="lv-input"
                    value={item.starts_at ?? ""}
                    onChange={(event) => onChange(item.id, { starts_at: event.target.value || null })}
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Lugar asociado
                  </div>
                  <select
                    className="lv-select"
                    value={item.map_place_id ?? ""}
                    onChange={(event) =>
                      onChange(item.id, { map_place_id: event.target.value || null })
                    }
                  >
                    <option value="">Sin lugar</option>
                    {placeOptions.map((place) => (
                      <option key={place.id} value={place.id}>
                        {buildPlaceOptionLabel(place)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="space-y-2">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                  Notas
                </div>
                <textarea
                  className="lv-textarea min-h-[88px]"
                  value={item.notes ?? ""}
                  onChange={(event) => onChange(item.id, { notes: event.target.value || null })}
                  placeholder="Politica de cancelacion, si ya esta pagado, asientos, mesa reservada..."
                />
              </label>
            </article>
          ))
        ) : (
          <div className="rounded-[20px] border border-dashed border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 py-4 text-sm leading-6 text-[var(--lv-text-muted)]">
            Mete aqui todo lo que tenga localizador, pago, proveedor o fecha importante para no depender luego del correo o de una nota suelta.
          </div>
        )}
      </div>
    </SeedPreparationSectionCard>
  );
}
