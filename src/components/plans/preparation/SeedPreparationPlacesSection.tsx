"use client";

import type { SeedPlaceOption, SeedRouteOption } from "@/lib/plansTypes";
import type {
  SeedPreparationPlaceLink,
  SeedPreparationStop,
  SeedPreparationTransportLeg,
} from "@/lib/seedPreparationTypes";
import { SeedPreparationSectionCard } from "@/components/plans/preparation/SeedPreparationSectionCard";
import {
  PLACE_PRIORITY_OPTIONS,
  PLACE_STATE_OPTIONS,
  buildPlaceOptionLabel,
  buildRouteOptionLabel,
  buildStopOptionLabel,
} from "@/components/plans/preparation/seedPreparationUi";

type SeedPreparationPlacesSectionProps = {
  items: SeedPreparationPlaceLink[];
  placeOptions: SeedPlaceOption[];
  routeOptions: SeedRouteOption[];
  stopOptions: SeedPreparationStop[];
  transportLegs: SeedPreparationTransportLeg[];
  onAdd: () => void;
  onBlurItem?: (itemId: string) => void;
  onChange: (itemId: string, patch: Partial<SeedPreparationPlaceLink>) => void;
  onFocusItem?: (input: { itemId: string; label: string }) => void;
  onRemove: (itemId: string) => void;
};

export function SeedPreparationPlacesSection({
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
}: SeedPreparationPlacesSectionProps) {
  return (
    <SeedPreparationSectionCard
      eyebrow="Lugares"
      title="Lugares a ver"
      description="Aqui vive la lista de sitios, enlazados al mapa cuando existan y con prioridad o estado segun lo importantes que sean."
      action={
        <button type="button" className="lv-btn lv-btn-secondary" onClick={onAdd}>
          Anadir lugar
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
                    item.manual_title?.trim() ||
                    placeOptions.find((place) => place.id === item.map_place_id)?.title ||
                    `Lugar ${index + 1}`,
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
                    {item.manual_title?.trim() ||
                      placeOptions.find((place) => place.id === item.map_place_id)?.title ||
                      `Lugar ${index + 1}`}
                  </div>
                  <div className="text-xs text-[var(--lv-text-muted)]">
                    Lugar del viaje {index + 1}
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

              <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Lugar del mapa
                  </div>
                  <select
                    className="lv-select"
                    value={item.map_place_id ?? ""}
                    onChange={(event) => onChange(item.id, { map_place_id: event.target.value || null })}
                  >
                    <option value="">Sin enlazar</option>
                    {placeOptions.map((place) => (
                      <option key={place.id} value={place.id}>
                        {buildPlaceOptionLabel(place)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Titulo manual
                  </div>
                  <input
                    className="lv-input"
                    value={item.manual_title ?? ""}
                    onChange={(event) => onChange(item.id, { manual_title: event.target.value || null })}
                    placeholder="Mercado callejero, playa escondida..."
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-[0.9fr_0.9fr_1fr]">
                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Prioridad
                  </div>
                  <select
                    className="lv-select"
                    value={item.priority}
                    onChange={(event) =>
                      onChange(item.id, {
                        priority: event.target.value as SeedPreparationPlaceLink["priority"],
                      })
                    }
                  >
                    {PLACE_PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Estado
                  </div>
                  <select
                    className="lv-select"
                    value={item.planning_state}
                    onChange={(event) =>
                      onChange(item.id, {
                        planning_state: event.target.value as SeedPreparationPlaceLink["planning_state"],
                      })
                    }
                  >
                    {PLACE_STATE_OPTIONS.map((option) => (
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

              <div className="grid gap-4 md:grid-cols-[0.8fr_1fr_1fr]">
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
                    Trayecto asociado
                  </div>
                  <select
                    className="lv-select"
                    value={item.linked_transport_leg_id ?? ""}
                    onChange={(event) =>
                      onChange(item.id, { linked_transport_leg_id: event.target.value || null })
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

                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Ruta asociada
                  </div>
                  <select
                    className="lv-select"
                    value={item.linked_route_id ?? ""}
                    onChange={(event) =>
                      onChange(item.id, { linked_route_id: event.target.value || null })
                    }
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

              <label className="space-y-2">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                  Notas
                </div>
                <textarea
                  className="lv-textarea min-h-[88px]"
                  value={item.notes ?? ""}
                  onChange={(event) => onChange(item.id, { notes: event.target.value || null })}
                  placeholder="Que os interesa de este lugar, si exige reserva o si encaja mejor en un dia concreto."
                />
              </label>
            </article>
          ))
        ) : (
          <div className="rounded-[20px] border border-dashed border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 py-4 text-sm leading-6 text-[var(--lv-text-muted)]">
            Mezcla aqui sitios guardados del mapa con ideas sueltas. El mapa sigue siendo la verdad espacial; este bloque solo organiza el viaje.
          </div>
        )}
      </div>
    </SeedPreparationSectionCard>
  );
}
