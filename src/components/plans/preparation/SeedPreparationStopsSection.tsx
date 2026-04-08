"use client";

import type { SeedPlaceOption } from "@/lib/plansTypes";
import type { SeedPreparationStop } from "@/lib/seedPreparationTypes";
import { SeedPreparationSectionCard } from "@/components/plans/preparation/SeedPreparationSectionCard";
import {
  buildPlaceOptionLabel,
  buildStopOptionLabel,
} from "@/components/plans/preparation/seedPreparationUi";

type SeedPreparationStopsSectionProps = {
  items: SeedPreparationStop[];
  placeOptions: SeedPlaceOption[];
  onAdd: () => void;
  onBlurItem?: (itemId: string) => void;
  onChange: (itemId: string, patch: Partial<SeedPreparationStop>) => void;
  onFocusItem?: (input: { itemId: string; label: string }) => void;
  onRemove: (itemId: string) => void;
};

export function SeedPreparationStopsSection({
  items,
  placeOptions,
  onAdd,
  onBlurItem,
  onChange,
  onFocusItem,
  onRemove,
}: SeedPreparationStopsSectionProps) {
  return (
    <SeedPreparationSectionCard
      eyebrow="Etapas"
      title="Paradas y base del viaje"
      description="Si el viaje cambia de ciudad, zona o ritmo, aqui vive cada etapa con sus fechas y su lugar base."
      action={
        <button type="button" className="lv-btn lv-btn-secondary" onClick={onAdd}>
          Anadir etapa
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
                  label: buildStopOptionLabel(item, index),
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
                    {buildStopOptionLabel(item, index)}
                  </div>
                  <div className="text-xs text-[var(--lv-text-muted)]">
                    Etapa {index + 1}
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
                    Titulo de la etapa
                  </div>
                  <input
                    className="lv-input"
                    value={item.title}
                    onChange={(event) => onChange(item.id, { title: event.target.value })}
                    placeholder="Paris, costa norte, base en Kioto..."
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Lugar base
                  </div>
                  <select
                    className="lv-select"
                    value={item.base_place_id ?? ""}
                    onChange={(event) =>
                      onChange(item.id, { base_place_id: event.target.value || null })
                    }
                  >
                    <option value="">Sin enlazar todavia</option>
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
                    Desde
                  </div>
                  <input
                    type="date"
                    className="lv-input"
                    value={item.starts_on ?? ""}
                    onChange={(event) => onChange(item.id, { starts_on: event.target.value || null })}
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    Hasta
                  </div>
                  <input
                    type="date"
                    className="lv-input"
                    value={item.ends_on ?? ""}
                    onChange={(event) => onChange(item.id, { ends_on: event.target.value || null })}
                  />
                </label>
              </div>

              <label className="space-y-2">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                  Notas de la etapa
                </div>
                <textarea
                  className="lv-textarea min-h-[88px]"
                  value={item.notes ?? ""}
                  onChange={(event) => onChange(item.id, { notes: event.target.value || null })}
                  placeholder="Que ritmo quereis en esta parada, si es base para excursiones, etc."
                />
              </label>
            </article>
          ))
        ) : (
          <div className="rounded-[20px] border border-dashed border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 py-4 text-sm leading-6 text-[var(--lv-text-muted)]">
            Si el viaje tiene varias paradas, anade aqui cada etapa. Si no, puedes dejarlo vacio y trabajar solo con lugares y reservas.
          </div>
        )}
      </div>
    </SeedPreparationSectionCard>
  );
}
