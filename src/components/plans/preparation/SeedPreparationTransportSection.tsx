"use client";

import type { SeedPlaceOption, SeedRouteOption } from "@/lib/plansTypes";
import type {
  SeedPreparationAttachment,
  SeedPreparationStop,
  SeedPreparationTransportLeg,
} from "@/lib/seedPreparationTypes";
import { SeedPreparationInlineAttachments } from "@/components/plans/preparation/SeedPreparationInlineAttachments";
import { SeedPreparationSectionCard } from "@/components/plans/preparation/SeedPreparationSectionCard";
import {
  TRANSPORT_KIND_OPTIONS,
  buildPlaceOptionLabel,
  buildRouteOptionLabel,
  buildStopOptionLabel,
} from "@/components/plans/preparation/seedPreparationUi";

type SeedPreparationTransportSectionProps = {
  items: SeedPreparationTransportLeg[];
  attachmentItems: SeedPreparationAttachment[];
  placeOptions: SeedPlaceOption[];
  routeOptions: SeedRouteOption[];
  stopOptions: SeedPreparationStop[];
  busy?: boolean;
  uploadingAttachmentIds: string[];
  onAdd: () => void;
  onBlurItem?: (itemId: string) => void;
  onChange: (itemId: string, patch: Partial<SeedPreparationTransportLeg>) => void;
  onFocusItem?: (input: { itemId: string; label: string }) => void;
  onRemove: (itemId: string) => void;
  onAttachDocument: (itemId: string, file: File) => Promise<void>;
  onRemoveAttachment: (itemId: string) => void;
};

export function SeedPreparationTransportSection({
  items,
  attachmentItems,
  placeOptions,
  routeOptions,
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
}: SeedPreparationTransportSectionProps) {
  return (
    <SeedPreparationSectionCard
      eyebrow="Trayectos"
      title="Como os moveis"
      description="Cada trayecto puede enlazarse a una ruta del mapa, a sus lugares de origen y destino y a una etapa concreta del viaje."
      action={
        <button type="button" className="lv-btn lv-btn-secondary" onClick={onAdd}>
          Anadir trayecto
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
                  label:
                    item.title?.trim() ||
                    `${item.from_label ?? "Origen"} -> ${item.to_label ?? "Destino"}`,
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
                    attachment.linked_kind === "transport_leg" &&
                    attachment.linked_record_id === item.id,
                );
                return (
                  <SeedPreparationInlineAttachments
                    title="Billetes y comprobantes"
                    description="Adjunta aqui el billete, la reserva o cualquier recibo de este trayecto sin mandarlo a documentos generales."
                    items={linkedAttachments}
                    busy={busy}
                    uploadingIds={uploadingAttachmentIds}
                    emptyText="Todavia no hay documentos ligados a este trayecto."
                    uploadLabel="Adjuntar billete"
                    onUpload={(file) => onAttachDocument(item.id, file)}
                    onRemove={onRemoveAttachment}
                  />
                );
              })()}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--lv-text)]">
                    {item.title?.trim() || `${item.from_label ?? "Origen"} -> ${item.to_label ?? "Destino"}`}
                  </div>
                  <div className="text-xs text-[var(--lv-text-muted)]">Trayecto {index + 1}</div>
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
                    Titulo del trayecto
                  </div>
                  <input
                    className="lv-input"
                    value={item.title ?? ""}
                    onChange={(event) => onChange(item.id, { title: event.target.value || null })}
                    placeholder="Madrid -> Paris, ferry a Capri..."
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Transporte
                  </div>
                  <select
                    className="lv-select"
                    value={item.transport_kind}
                    onChange={(event) =>
                      onChange(item.id, {
                        transport_kind: event.target.value as SeedPreparationTransportLeg["transport_kind"],
                      })
                    }
                  >
                    {TRANSPORT_KIND_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Desde
                  </div>
                  <input
                    className="lv-input"
                    value={item.from_label ?? ""}
                    onChange={(event) => onChange(item.id, { from_label: event.target.value || null })}
                    placeholder="Madrid"
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Hasta
                  </div>
                  <input
                    className="lv-input"
                    value={item.to_label ?? ""}
                    onChange={(event) => onChange(item.id, { to_label: event.target.value || null })}
                    placeholder="Paris"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Sale
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
                    Llega
                  </div>
                  <input
                    type="datetime-local"
                    className="lv-input"
                    value={item.ends_at ?? ""}
                    onChange={(event) => onChange(item.id, { ends_at: event.target.value || null })}
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Etapa origen
                  </div>
                  <select
                    className="lv-select"
                    value={item.origin_stop_id ?? ""}
                    onChange={(event) =>
                      onChange(item.id, { origin_stop_id: event.target.value || null })
                    }
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
                    Etapa destino
                  </div>
                  <select
                    className="lv-select"
                    value={item.destination_stop_id ?? ""}
                    onChange={(event) =>
                      onChange(item.id, { destination_stop_id: event.target.value || null })
                    }
                  >
                    <option value="">Sin etapa</option>
                    {stopOptions.map((stop, index) => (
                      <option key={stop.id} value={stop.id}>
                        {buildStopOptionLabel(stop, index)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Lugar origen
                  </div>
                  <select
                    className="lv-select"
                    value={item.origin_place_id ?? ""}
                    onChange={(event) =>
                      onChange(item.id, { origin_place_id: event.target.value || null })
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

                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Lugar destino
                  </div>
                  <select
                    className="lv-select"
                    value={item.destination_place_id ?? ""}
                    onChange={(event) =>
                      onChange(item.id, { destination_place_id: event.target.value || null })
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

              <div className="grid gap-4 md:grid-cols-[1fr_1fr_0.9fr]">
                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Operador
                  </div>
                  <input
                    className="lv-input"
                    value={item.provider_name ?? ""}
                    onChange={(event) =>
                      onChange(item.id, { provider_name: event.target.value || null })
                    }
                    placeholder="Renfe, Vueling, BlaBlaCar..."
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
                    Ruta asociada
                  </div>
                  <select
                    className="lv-select"
                    value={item.map_route_id ?? ""}
                    onChange={(event) => onChange(item.id, { map_route_id: event.target.value || null })}
                  >
                    <option value="">Sin ruta</option>
                    {routeOptions.map((route) => (
                      <option key={route.id} value={route.id}>
                        {buildRouteOptionLabel(route)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Enlace o reserva
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
                    Notas
                  </div>
                  <input
                    className="lv-input"
                    value={item.notes ?? ""}
                    onChange={(event) => onChange(item.id, { notes: event.target.value || null })}
                    placeholder="Maleta facturada, conexion larga, asiento reservado..."
                  />
                </label>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[20px] border border-dashed border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 py-4 text-sm leading-6 text-[var(--lv-text-muted)]">
            El transporte y las rutas son piezas distintas: aqui guardas como os moveis, y cuando tenga sentido lo enlazas a una ruta del mapa.
          </div>
        )}
      </div>
    </SeedPreparationSectionCard>
  );
}
