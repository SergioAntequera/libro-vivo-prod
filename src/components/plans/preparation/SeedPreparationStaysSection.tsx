"use client";

import type { SeedPlaceOption } from "@/lib/plansTypes";
import type {
  SeedPreparationAttachment,
  SeedPreparationStay,
  SeedPreparationStop,
} from "@/lib/seedPreparationTypes";
import { SeedPreparationInlineAttachments } from "@/components/plans/preparation/SeedPreparationInlineAttachments";
import { SeedPreparationSectionCard } from "@/components/plans/preparation/SeedPreparationSectionCard";
import {
  STAY_KIND_OPTIONS,
  buildPlaceOptionLabel,
  buildStopOptionLabel,
} from "@/components/plans/preparation/seedPreparationUi";

type SeedPreparationStaysSectionProps = {
  items: SeedPreparationStay[];
  attachmentItems: SeedPreparationAttachment[];
  placeOptions: SeedPlaceOption[];
  stopOptions: SeedPreparationStop[];
  busy?: boolean;
  uploadingAttachmentIds: string[];
  onAdd: () => void;
  onBlurItem?: (itemId: string) => void;
  onChange: (itemId: string, patch: Partial<SeedPreparationStay>) => void;
  onFocusItem?: (input: { itemId: string; label: string }) => void;
  onRemove: (itemId: string) => void;
  onAttachDocument: (itemId: string, file: File) => Promise<void>;
  onRemoveAttachment: (itemId: string) => void;
};

export function SeedPreparationStaysSection({
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
}: SeedPreparationStaysSectionProps) {
  return (
    <SeedPreparationSectionCard
      eyebrow="Alojamientos"
      title="Alojamientos"
      description="Hotel, hostal, apartamento o casa. Cada alojamiento puede quedar ligado a una etapa y a su confirmacion."
      action={
        <button type="button" className="lv-btn lv-btn-secondary" onClick={onAdd}>
          Anadir alojamiento
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
                  label: item.name.trim() || `Alojamiento ${index + 1}`,
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
                    attachment.linked_kind === "stay" && attachment.linked_record_id === item.id,
                );
                return (
                  <SeedPreparationInlineAttachments
                    title="Confirmaciones del alojamiento"
                    description="Guarda aqui la reserva, el comprobante o cualquier PDF util de este alojamiento."
                    items={linkedAttachments}
                    busy={busy}
                    uploadingIds={uploadingAttachmentIds}
                    emptyText="Todavia no hay documentos ligados a este alojamiento."
                    uploadLabel="Adjuntar confirmacion"
                    onUpload={(file) => onAttachDocument(item.id, file)}
                    onRemove={onRemoveAttachment}
                  />
                );
              })()}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--lv-text)]">
                    {item.name.trim() || `Alojamiento ${index + 1}`}
                  </div>
                  <div className="text-xs text-[var(--lv-text-muted)]">
                    {STAY_KIND_OPTIONS.find((option) => option.value === item.stay_kind)?.label ??
                      "Alojamiento"}
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

              <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Tipo
                  </div>
                  <select
                    className="lv-select"
                    value={item.stay_kind}
                    onChange={(event) =>
                      onChange(item.id, {
                        stay_kind: event.target.value as SeedPreparationStay["stay_kind"],
                      })
                    }
                  >
                    {STAY_KIND_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Nombre
                  </div>
                  <input
                    className="lv-input"
                    value={item.name}
                    onChange={(event) => onChange(item.id, { name: event.target.value })}
                    placeholder="Hotel Avenida, apartamento en Alfama..."
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
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
                    {stopOptions.map((stop, index) => (
                      <option key={stop.id} value={stop.id}>
                        {buildStopOptionLabel(stop, index)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Lugar enlazado
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

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Check-in
                  </div>
                  <input
                    type="date"
                    className="lv-input"
                    value={item.check_in_date ?? ""}
                    onChange={(event) =>
                      onChange(item.id, { check_in_date: event.target.value || null })
                    }
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Check-out
                  </div>
                  <input
                    type="date"
                    className="lv-input"
                    value={item.check_out_date ?? ""}
                    onChange={(event) =>
                      onChange(item.id, { check_out_date: event.target.value || null })
                    }
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Web o booking
                  </div>
                  <input
                    className="lv-input"
                    value={item.booking_url ?? ""}
                    onChange={(event) => onChange(item.id, { booking_url: event.target.value || null })}
                    placeholder="https://..."
                  />
                </label>

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
                    placeholder="Booking, Airbnb, web oficial..."
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_0.8fr]">
                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Direccion o referencia
                  </div>
                  <input
                    className="lv-input"
                    value={item.address_label ?? ""}
                    onChange={(event) =>
                      onChange(item.id, { address_label: event.target.value || null })
                    }
                    placeholder="Rua das Flores, junto a la estacion..."
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Confirmacion
                  </div>
                  <input
                    className="lv-input"
                    value={item.confirmation_code ?? ""}
                    onChange={(event) =>
                      onChange(item.id, { confirmation_code: event.target.value || null })
                    }
                    placeholder="XYZ-123"
                  />
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
                  placeholder="Late check-in, desayuno incluido, parking, etc."
                />
              </label>
            </article>
          ))
        ) : (
          <div className="rounded-[20px] border border-dashed border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 py-4 text-sm leading-6 text-[var(--lv-text-muted)]">
            Guarda aqui cada alojamiento importante para no perder enlaces, fechas de entrada y localizadores.
          </div>
        )}
      </div>
    </SeedPreparationSectionCard>
  );
}
