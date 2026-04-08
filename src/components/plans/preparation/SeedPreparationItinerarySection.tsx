"use client";

import type { SeedPlaceOption, SeedRouteOption } from "@/lib/plansTypes";
import type {
  SeedPreparationItineraryItem,
  SeedPreparationStop,
  SeedPreparationTransportLeg,
} from "@/lib/seedPreparationTypes";
import { SeedPreparationSectionCard } from "@/components/plans/preparation/SeedPreparationSectionCard";
import {
  ITINERARY_STATUS_OPTIONS,
  buildPlaceOptionLabel,
  buildRouteOptionLabel,
  buildStopOptionLabel,
} from "@/components/plans/preparation/seedPreparationUi";

type SeedPreparationItinerarySectionProps = {
  items: SeedPreparationItineraryItem[];
  placeOptions: SeedPlaceOption[];
  routeOptions: SeedRouteOption[];
  stopOptions: SeedPreparationStop[];
  transportLegs: SeedPreparationTransportLeg[];
  onAdd: () => void;
  onBlurItem?: (itemId: string) => void;
  onChange: (itemId: string, patch: Partial<SeedPreparationItineraryItem>) => void;
  onFocusItem?: (input: { itemId: string; label: string }) => void;
  onRemove: (itemId: string) => void;
};

export function SeedPreparationItinerarySection({
  items,
  placeOptions,
  routeOptions,
  stopOptions,
  transportLegs,
  onAdd,
  onBlurItem,
  onChange,
  onFocusItem,
  onRemove,
}: SeedPreparationItinerarySectionProps) {
  return (
    <SeedPreparationSectionCard
      eyebrow="Itinerario"
      title="Itinerario y actividades"
      description="Museos, tours, excursiones, restaurantes o momentos libres. Cada actividad puede tener fecha, duracion y enlaces al mapa."
      action={
        <button type="button" className="lv-btn lv-btn-secondary" onClick={onAdd}>
          Anadir actividad
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
                  label: item.title.trim() || `Actividad ${index + 1}`,
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
                    {item.title.trim() || `Actividad ${index + 1}`}
                  </div>
                  <div className="text-xs text-[var(--lv-text-muted)]">
                    {item.day_date?.trim() || "Sin dia"} {item.time_label?.trim() ? `- ${item.time_label}` : ""}
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

              <div className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Actividad
                  </div>
                  <input
                    className="lv-input"
                    value={item.title}
                    onChange={(event) => onChange(item.id, { title: event.target.value })}
                    placeholder="Museo de Orsay, paseo en barco, cena especial..."
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
                        status: event.target.value as SeedPreparationItineraryItem["status"],
                      })
                    }
                  >
                    {ITINERARY_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-[0.8fr_0.7fr_0.7fr_0.8fr]">
                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Dia
                  </div>
                  <input
                    type="date"
                    className="lv-input"
                    value={item.day_date ?? ""}
                    onChange={(event) => onChange(item.id, { day_date: event.target.value || null })}
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Hora
                  </div>
                  <input
                    className="lv-input"
                    value={item.time_label ?? ""}
                    onChange={(event) => onChange(item.id, { time_label: event.target.value || null })}
                    placeholder="10:30"
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Duracion
                  </div>
                  <input
                    type="number"
                    className="lv-input"
                    min="0"
                    step="5"
                    value={item.duration_minutes ?? ""}
                    onChange={(event) =>
                      onChange(item.id, {
                        duration_minutes: event.target.value ? Number(event.target.value) : null,
                      })
                    }
                    placeholder="90"
                  />
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

              <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr]">
                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Lugar
                  </div>
                  <select
                    className="lv-select"
                    value={item.map_place_id ?? ""}
                    onChange={(event) => onChange(item.id, { map_place_id: event.target.value || null })}
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
                    Ruta
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

                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Trayecto relacionado
                  </div>
                  <select
                    className="lv-select"
                    value={item.transport_leg_id ?? ""}
                    onChange={(event) =>
                      onChange(item.id, { transport_leg_id: event.target.value || null })
                    }
                  >
                    <option value="">Sin trayecto</option>
                    {transportLegs.map((leg, legIndex) => (
                      <option key={leg.id} value={leg.id}>
                        {leg.title?.trim() || `Trayecto ${legIndex + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="space-y-2">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                  Descripcion
                </div>
                <textarea
                  className="lv-textarea min-h-[88px]"
                  value={item.description ?? ""}
                  onChange={(event) =>
                    onChange(item.id, { description: event.target.value || null })
                  }
                  placeholder="Duracion real, notas, si requiere reserva o si depende del clima."
                />
              </label>
            </article>
          ))
        ) : (
          <div className="rounded-[20px] border border-dashed border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 py-4 text-sm leading-6 text-[var(--lv-text-muted)]">
            Usa el itinerario para poner lo que querais hacer cada dia, aunque aun no este todo cerrado. Luego la flor podra dialogar con esto.
          </div>
        )}
      </div>
    </SeedPreparationSectionCard>
  );
}
