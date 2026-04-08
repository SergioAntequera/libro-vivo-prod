"use client";

import { useState } from "react";
import type {
  SeedPreparationChecklistCategory,
  SeedPreparationChecklistItem,
  SeedPreparationChecklistOwner,
} from "@/lib/seedPreparationTypes";
import { SeedPreparationSectionCard } from "@/components/plans/preparation/SeedPreparationSectionCard";

const CHECKLIST_CATEGORY_OPTIONS: Array<{
  value: SeedPreparationChecklistCategory;
  label: string;
}> = [
  { value: "documents", label: "Documentos" },
  { value: "health", label: "Salud" },
  { value: "clothes", label: "Ropa" },
  { value: "tech", label: "Tecnologia" },
  { value: "money", label: "Dinero" },
  { value: "insurance", label: "Seguros" },
  { value: "misc", label: "Misc" },
];

const CHECKLIST_OWNER_OPTIONS: Array<{ value: SeedPreparationChecklistOwner; label: string }> = [
  { value: "me", label: "Yo" },
  { value: "partner", label: "La otra persona" },
  { value: "shared", label: "Compartido" },
];

type SeedPreparationChecklistSectionProps = {
  items: SeedPreparationChecklistItem[];
  busy?: boolean;
  planting?: boolean;
  onBlurSection?: () => void;
  onAddItem: (input: {
    label: string;
    category: SeedPreparationChecklistCategory;
    owner: SeedPreparationChecklistOwner;
    isRequired: boolean;
  }) => void;
  onFocusSection?: () => void;
  onToggleItem: (item: SeedPreparationChecklistItem, completed: boolean) => void;
  onDeleteItem: (itemId: string) => void;
};

export function SeedPreparationChecklistSection({
  items,
  busy = false,
  planting = false,
  onBlurSection,
  onAddItem,
  onFocusSection,
  onToggleItem,
  onDeleteItem,
}: SeedPreparationChecklistSectionProps) {
  const [newLabel, setNewLabel] = useState("");
  const [newCategory, setNewCategory] = useState<SeedPreparationChecklistCategory>("misc");
  const [newOwner, setNewOwner] = useState<SeedPreparationChecklistOwner>("shared");
  const [newRequired, setNewRequired] = useState(false);

  return (
    <div
      onFocusCapture={() => onFocusSection?.()}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onBlurSection?.();
        }
      }}
    >
      <SeedPreparationSectionCard
        eyebrow="Checklist"
        title="Maleta y preparativos"
        description="Documentos, salud, tecnologia, dinero o ropa. Reparte lo que depende de cada quien y lo que es compartido."
      >
      <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_auto]">
        <input
          data-testid="seed-preparation-new-checklist-item"
          className="lv-input"
          value={newLabel}
          onChange={(event) => setNewLabel(event.target.value)}
          placeholder="Pasaporte, seguro de viaje, adaptador..."
        />
        <select
          className="lv-select"
          value={newCategory}
          onChange={(event) =>
            setNewCategory(event.target.value as SeedPreparationChecklistCategory)
          }
        >
          {CHECKLIST_CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          className="lv-select"
          value={newOwner}
          onChange={(event) => setNewOwner(event.target.value as SeedPreparationChecklistOwner)}
        >
          {CHECKLIST_OWNER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          data-testid="seed-preparation-add-checklist-item"
          className="lv-btn lv-btn-secondary"
          disabled={busy || planting}
          onClick={() => {
            if (!newLabel.trim()) return;
            onAddItem({
              label: newLabel,
              category: newCategory,
              owner: newOwner,
              isRequired: newRequired,
            });
            setNewLabel("");
            setNewCategory("misc");
            setNewOwner("shared");
            setNewRequired(false);
          }}
        >
          Anadir
        </button>
      </div>

      <label className="flex items-center gap-3 text-sm text-[var(--lv-text-muted)]">
        <input
          type="checkbox"
          checked={newRequired}
          onChange={(event) => setNewRequired(event.target.checked)}
        />
        Es imprescindible
      </label>

      <div className="space-y-2">
        {items.length ? (
          items.map((item) => {
            const completed = Boolean(item.completed_at);
            const categoryLabel =
              CHECKLIST_CATEGORY_OPTIONS.find((option) => option.value === item.category)?.label ??
              item.category;
            const ownerLabel =
              CHECKLIST_OWNER_OPTIONS.find((option) => option.value === item.owner)?.label ??
              item.owner;

            return (
              <div
                data-testid="seed-preparation-checklist-item"
                key={item.id}
                className="flex items-center gap-3 rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-3 py-2.5"
              >
                <input
                  data-testid="seed-preparation-checklist-toggle"
                  type="checkbox"
                  checked={completed}
                  onChange={(event) => onToggleItem(item, event.target.checked)}
                />
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-sm ${
                      completed ? "text-[var(--lv-text-muted)] line-through" : "text-[var(--lv-text)]"
                    }`}
                  >
                    {item.label}
                  </div>
                  <div className="text-xs text-[var(--lv-text-muted)]">
                    {categoryLabel} · {ownerLabel}
                    {item.is_required ? " · Imprescindible" : ""}
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="seed-preparation-checklist-delete"
                  className="lv-btn lv-btn-ghost"
                  onClick={() => onDeleteItem(item.id)}
                  disabled={busy || planting}
                >
                  Quitar
                </button>
              </div>
            );
          })
        ) : (
          <div className="rounded-[18px] border border-dashed border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 py-4 text-sm text-[var(--lv-text-muted)]">
            Todavia no hay preparativos. Empieza por documentos, medicacion, ropa o lo que haga falta para no improvisar luego.
          </div>
        )}
      </div>
      </SeedPreparationSectionCard>
    </div>
  );
}
