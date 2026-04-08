import type { ReactNode } from "react";
import type { ElementKind } from "@/lib/canvasTypes";
import type { FlowerFamily } from "@/lib/productDomainContracts";
import {
  PLAN_TYPE_CATEGORY_LABELS,
  type PlanTypeCategory,
} from "@/lib/planTypeCatalog";
import {
  resolvePlanFlowerAssetPath,
  resolvePlanSeedAssetPath,
} from "@/lib/planVisuals";
import {
  AdminInlineNote,
  AdminPanel,
  AdminToggleGroup,
  AdminWorkspace,
} from "@/components/admin/AdminWorkspace";

export type AdminPlanTypesWorkspaceRow = {
  id: string;
  code: string;
  label: string;
  category: PlanTypeCategory;
  description: string | null;
  flowerFamily: FlowerFamily;
  suggestedElement: ElementKind;
  iconEmoji: string | null;
  flowerAssetPath: string | null;
  seedAssetPath: string | null;
  isCustom: boolean;
  sortOrder: number;
  archivedAt: string | null;
};

export type AdminPlanTypesWorkspaceDraft = {
  label: string;
  category: PlanTypeCategory;
  description: string;
  suggestedElement: ElementKind;
  iconEmoji: string;
  flowerAssetPath: string;
  seedAssetPath: string;
  sortOrder: string;
};

type CategoryFilter = "all" | PlanTypeCategory;
type ElementFilter = "all" | ElementKind;

type WorkspaceProps = {
  message: ReactNode;
  showArchived: boolean;
  onToggleArchived: (next: boolean) => void;
  search: string;
  onSearchChange: (value: string) => void;
  categoryFilter: CategoryFilter;
  onCategoryFilterChange: (value: CategoryFilter) => void;
  elementFilter: ElementFilter;
  onElementFilterChange: (value: ElementFilter) => void;
  onlyCustom: boolean;
  onOnlyCustomChange: (value: boolean) => void;
  visibleCount: number;
  customCount: number;
  groupedRows: Array<{ category: PlanTypeCategory; items: AdminPlanTypesWorkspaceRow[] }>;
  selectedRow: AdminPlanTypesWorkspaceRow | null;
  selectedDraft: AdminPlanTypesWorkspaceDraft | null;
  selectedIsDirty: boolean;
  savingId: string | null;
  archivingId: string | null;
  createDraft: AdminPlanTypesWorkspaceDraft;
  creating: boolean;
  showCreatePanel: boolean;
  onOpenCreate: () => void;
  onCloseCreate: () => void;
  onSelectRow: (rowId: string) => void;
  onUpdateRowDraft: (
    rowId: string,
    patch: Partial<AdminPlanTypesWorkspaceDraft>,
  ) => void;
  onUpdateCreateDraft: (patch: Partial<AdminPlanTypesWorkspaceDraft>) => void;
  onSaveRow: (row: AdminPlanTypesWorkspaceRow) => void;
  onToggleArchive: (row: AdminPlanTypesWorkspaceRow) => void;
  onCreatePlanType: () => void;
};

const ELEMENT_OPTIONS: Array<{ value: ElementKind; label: string }> = [
  { value: "fire", label: "Fuego" },
  { value: "water", label: "Agua" },
  { value: "air", label: "Aire" },
  { value: "earth", label: "Tierra" },
  { value: "aether", label: "Eter" },
];

const CATEGORY_ORDER: PlanTypeCategory[] = [
  "salida",
  "comida",
  "naturaleza",
  "movimiento",
  "casa",
  "cultura",
  "escapada",
  "celebracion",
  "custom",
];

const fieldInputClass =
  "mt-2 w-full rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-3 text-[var(--lv-text)] shadow-[var(--lv-shadow-sm)]";
const textAreaClass = `${fieldInputClass} min-h-[120px]`;
const primaryActionClass =
  "rounded-[18px] bg-[var(--lv-primary)] px-4 py-2 text-sm text-white shadow-[var(--lv-shadow-sm)] disabled:opacity-50";
const secondaryActionClass =
  "rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm text-[var(--lv-text)] shadow-[var(--lv-shadow-sm)]";
const chipClass =
  "rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-2 py-1";
const warningChipClass =
  "rounded-full border border-[var(--lv-warning)] bg-[var(--lv-warning-soft)] px-2 py-1 text-[var(--lv-warning)]";

function assetFallbackLabel(label: string, iconEmoji: string, element: ElementKind) {
  if (iconEmoji.trim()) return iconEmoji.trim();
  const byElement: Record<ElementKind, string> = {
    fire: "F",
    water: "A",
    air: "V",
    earth: "T",
    aether: label.trim().slice(0, 1).toUpperCase() || "P",
  };
  return byElement[element] ?? "P";
}

function FormFieldLabel({ title, hint }: { title: string; hint?: string }) {
  return (
    <label className="space-y-1">
      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
        {title}
      </div>
      {hint ? <div className="text-xs leading-5 text-[var(--lv-text-muted)]">{hint}</div> : null}
    </label>
  );
}

function AssetPreview({
  src,
  alt,
  fallback,
  className,
}: {
  src: string;
  alt: string;
  fallback: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        className={`flex items-center justify-center rounded-[18px] border border-[var(--lv-border)] bg-[linear-gradient(180deg,var(--lv-surface)_0%,var(--lv-surface-soft)_100%)] text-sm font-semibold text-[var(--lv-text)] ${className ?? ""}`}
      >
        {fallback}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`rounded-[18px] border border-[var(--lv-border)] bg-[linear-gradient(180deg,var(--lv-surface)_0%,var(--lv-surface-soft)_100%)] object-contain ${className ?? ""}`}
    />
  );
}

function PreviewPanel({
  draft,
  label,
  archived,
}: {
  draft: AdminPlanTypesWorkspaceDraft;
  label: string;
  archived?: boolean;
}) {
  const seedSrc = resolvePlanSeedAssetPath({
    planSeedAssetPath: draft.seedAssetPath,
  });
  const flowerSamples = [1, 2, 3, 4, 5].map((rating) => ({
    rating,
    src: resolvePlanFlowerAssetPath({
      planFlowerAssetPath: draft.flowerAssetPath,
      planSuggestedElement: draft.suggestedElement,
      rating,
    }),
  }));
  const fallback = assetFallbackLabel(label, draft.iconEmoji, draft.suggestedElement);

  return (
    <div className="rounded-[24px] border border-[var(--lv-border)] bg-[linear-gradient(180deg,var(--lv-surface)_0%,var(--lv-surface-soft)_100%)] p-4 shadow-[var(--lv-shadow-sm)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--lv-text-muted)]">
            Vista previa
          </div>
          <div className="mt-1 text-sm text-[var(--lv-text-muted)]">
            Asi se leeran semilla y flor en el resto del producto.
          </div>
        </div>
        {archived ? (
          <span className={warningChipClass + " text-[10px] uppercase tracking-[0.18em]"}>
            Archivado
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[112px_minmax(0,1fr)]">
        <div className="space-y-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
            Semilla
          </div>
          <AssetPreview
            src={seedSrc}
            alt={`Semilla de ${label}`}
            fallback={fallback}
            className="h-28 w-full p-3"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
              Flor segun valoracion
            </div>
            <div className="text-xs text-[var(--lv-text-muted)]">1 a 5 estrellas</div>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {flowerSamples.map((sample) => (
              <div key={sample.rating} className="space-y-1 text-center">
                <AssetPreview
                  src={sample.src}
                  alt={`Flor ${sample.rating}`}
                  fallback={fallback}
                  className="h-16 w-full p-2"
                />
                <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                  {sample.rating}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DraftEditor({
  row,
  draft,
  isDirty,
  savingId,
  archivingId,
  onUpdateDraft,
  onSave,
  onArchive,
}: {
  row: AdminPlanTypesWorkspaceRow;
  draft: AdminPlanTypesWorkspaceDraft;
  isDirty: boolean;
  savingId: string | null;
  archivingId: string | null;
  onUpdateDraft: (patch: Partial<AdminPlanTypesWorkspaceDraft>) => void;
  onSave: () => void;
  onArchive: () => void;
}) {
  return (
    <AdminPanel
      title={draft.label || row.label}
      description="Edita una sola ficha cada vez. Todo lo que cambies aquí se propaga al resto del producto."
      actions={
        <>
        <button
          type="button"
          className={secondaryActionClass}
          disabled={archivingId === row.id}
          onClick={onArchive}
        >
            {archivingId === row.id
              ? "Actualizando..."
              : row.archivedAt
                ? "Recuperar"
                : "Archivar"}
          </button>
        <button
          type="button"
          className={primaryActionClass}
          disabled={savingId === row.id || !isDirty}
          onClick={onSave}
        >
            {savingId === row.id ? "Guardando..." : "Guardar cambios"}
          </button>
        </>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--lv-text-muted)]">
            <span className={chipClass}>
              Codigo: <span className="font-mono">{row.code}</span>
            </span>
            <span className={chipClass}>
              {row.isCustom ? "Personalizado" : "Preset"}
            </span>
            {isDirty ? (
              <span className={warningChipClass}>
                Cambios sin guardar
              </span>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <FormFieldLabel title="Nombre visible" />
              <input
                className={fieldInputClass}
                value={draft.label}
                onChange={(event) => onUpdateDraft({ label: event.target.value })}
              />
            </div>
            <div>
              <FormFieldLabel title="Emoji o símbolo" />
              <input
                className={fieldInputClass}
                value={draft.iconEmoji}
                onChange={(event) => onUpdateDraft({ iconEmoji: event.target.value })}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <FormFieldLabel title="Categoria" />
              <select
                className={fieldInputClass}
                value={draft.category}
                onChange={(event) =>
                  onUpdateDraft({ category: event.target.value as PlanTypeCategory })
                }
              >
                {Object.entries(PLAN_TYPE_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FormFieldLabel title="Elemento sugerido" />
              <select
                className={fieldInputClass}
                value={draft.suggestedElement}
                onChange={(event) =>
                  onUpdateDraft({ suggestedElement: event.target.value as ElementKind })
                }
              >
                {ELEMENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <FormFieldLabel
              title="Descripción"
              hint="Sirve para que tu y la app entendáis rápido la intención del plan."
            />
            <textarea
              className={textAreaClass}
              value={draft.description}
              onChange={(event) => onUpdateDraft({ description: event.target.value })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_120px]">
            <div>
              <FormFieldLabel
                title="Asset de flor"
                hint="Acepta {rating}, {stars}, {element} y {flower_family}. Si va vacío, usa fallback."
              />
              <input
                className={fieldInputClass}
                value={draft.flowerAssetPath}
                onChange={(event) => onUpdateDraft({ flowerAssetPath: event.target.value })}
                placeholder="/assets/flowers/fire-{rating}.png"
              />
            </div>
            <div>
              <FormFieldLabel title="Orden" />
              <input
                className={fieldInputClass}
                value={draft.sortOrder}
                onChange={(event) => onUpdateDraft({ sortOrder: event.target.value })}
              />
            </div>
          </div>

          <div>
            <FormFieldLabel title="Asset de semilla" />
            <input
              className={fieldInputClass}
              value={draft.seedAssetPath}
              onChange={(event) => onUpdateDraft({ seedAssetPath: event.target.value })}
              placeholder="/assets/seeds/fire.png"
            />
          </div>
        </div>

        <div className="space-y-4">
          <PreviewPanel draft={draft} label={draft.label || row.label} archived={Boolean(row.archivedAt)} />
          <AdminInlineNote tone="warning">
            Cambia esta ficha aqui y deja que semillas, home, mapa, paginas y PDF lean la misma
            verdad visual.
          </AdminInlineNote>
        </div>
      </div>
    </AdminPanel>
  );
}

function CreateEditor({
  draft,
  creating,
  onUpdateDraft,
  onCreate,
}: {
  draft: AdminPlanTypesWorkspaceDraft;
  creating: boolean;
  onUpdateDraft: (patch: Partial<AdminPlanTypesWorkspaceDraft>) => void;
  onCreate: () => void;
}) {
  return (
    <AdminPanel
      title="Nuevo tipo personalizado"
      description="Crea una entrada nueva para el jardín sin tocar los presets base."
      actions={
        <button
          type="button"
          className={primaryActionClass}
          disabled={creating}
          onClick={onCreate}
        >
          {creating ? "Guardando..." : "Guardar tipo"}
        </button>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <FormFieldLabel title="Nombre visible" hint="Cómo se vera en semillas, páginas y mapa." />
              <input
                className={fieldInputClass}
                value={draft.label}
                onChange={(event) => onUpdateDraft({ label: event.target.value })}
                placeholder="Ej. Ruta en bici al rio"
              />
            </div>
            <div>
              <FormFieldLabel title="Emoji o símbolo" hint="Opcional, solo apoyo visual." />
              <input
                className={fieldInputClass}
                value={draft.iconEmoji}
                onChange={(event) => onUpdateDraft({ iconEmoji: event.target.value })}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <FormFieldLabel title="Categoria" />
              <select
                className={fieldInputClass}
                value={draft.category}
                onChange={(event) =>
                  onUpdateDraft({ category: event.target.value as PlanTypeCategory })
                }
              >
                {Object.entries(PLAN_TYPE_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FormFieldLabel title="Elemento sugerido" />
              <select
                className={fieldInputClass}
                value={draft.suggestedElement}
                onChange={(event) =>
                  onUpdateDraft({ suggestedElement: event.target.value as ElementKind })
                }
              >
                {ELEMENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <FormFieldLabel
              title="Descripción"
              hint="Una frase clara para entender que clase de plan es y cuando se usa."
            />
            <textarea
              className={textAreaClass}
              value={draft.description}
              onChange={(event) => onUpdateDraft({ description: event.target.value })}
              placeholder="Que tipo de plan es, que tono tiene y por que merece existir."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_120px]">
            <div>
              <FormFieldLabel
                title="Asset de flor"
                hint="Puedes usar {rating}, {element} o {flower_family} si cambia con la valoración."
              />
              <input
                className={fieldInputClass}
                value={draft.flowerAssetPath}
                onChange={(event) => onUpdateDraft({ flowerAssetPath: event.target.value })}
                placeholder="/assets/flowers/ruta-{rating}.png"
              />
            </div>
            <div>
              <FormFieldLabel title="Orden" />
              <input
                className={fieldInputClass}
                value={draft.sortOrder}
                onChange={(event) => onUpdateDraft({ sortOrder: event.target.value })}
                placeholder="900"
              />
            </div>
          </div>

          <div>
            <FormFieldLabel title="Asset de semilla" />
            <input
              className={fieldInputClass}
              value={draft.seedAssetPath}
              onChange={(event) => onUpdateDraft({ seedAssetPath: event.target.value })}
              placeholder="/assets/seeds/ruta.png"
            />
          </div>
        </div>

        <div className="space-y-4">
          <PreviewPanel draft={draft} label={draft.label || "Plan nuevo"} />
          <AdminInlineNote>
            Si la flor cambia por valoracion, usa un patron como{" "}
            <code className="rounded bg-[var(--lv-surface)] px-1 py-0.5 text-[var(--lv-text)]">
              /assets/flowers/picnic-{"{rating}"}.png
            </code>
            .
          </AdminInlineNote>
        </div>
      </div>
    </AdminPanel>
  );
}

export function AdminPlanTypesWorkspace({
  message,
  showArchived,
  onToggleArchived,
  search,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  elementFilter,
  onElementFilterChange,
  onlyCustom,
  onOnlyCustomChange,
  visibleCount,
  customCount,
  groupedRows,
  selectedRow,
  selectedDraft,
  selectedIsDirty,
  savingId,
  archivingId,
  createDraft,
  creating,
  showCreatePanel,
  onOpenCreate,
  onCloseCreate,
  onSelectRow,
  onUpdateRowDraft,
  onUpdateCreateDraft,
  onSaveRow,
  onToggleArchive,
  onCreatePlanType,
}: WorkspaceProps) {
  return (
    <AdminWorkspace
      sidebar={
        <>
          {message}

          <AdminPanel
            title="Biblioteca"
            description="Busca un tipo y abre solo la ficha que quieres tocar."
            actions={
              <label className="flex items-center gap-2 text-sm text-[var(--lv-text-muted)]">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(event) => onToggleArchived(event.target.checked)}
                />
                Ver archivados
              </label>
            }
          >
            <div className="space-y-3">
              <input
                className="w-full rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-3 text-[var(--lv-text)] shadow-[var(--lv-shadow-sm)]"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Buscar por nombre, código o descripción"
              />
              <div className="grid gap-2">
                <select
                  className="rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-3 text-[var(--lv-text)] shadow-[var(--lv-shadow-sm)]"
                  value={categoryFilter}
                  onChange={(event) => onCategoryFilterChange(event.target.value as CategoryFilter)}
                >
                  <option value="all">Todas las categorias</option>
                  {CATEGORY_ORDER.map((category) => (
                    <option key={category} value={category}>
                      {PLAN_TYPE_CATEGORY_LABELS[category]}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-3 text-[var(--lv-text)] shadow-[var(--lv-shadow-sm)]"
                  value={elementFilter}
                  onChange={(event) => onElementFilterChange(event.target.value as ElementFilter)}
                >
                  <option value="all">Todos los elementos</option>
                  {ELEMENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <AdminToggleGroup
                value={onlyCustom ? "custom" : "all"}
                onChange={(value) => onOnlyCustomChange(value === "custom")}
                options={[
                  { key: "all", label: `Todo (${visibleCount})` },
                  { key: "custom", label: `Solo personalizados (${customCount})` },
                ]}
              />
            </div>

            <div className="mt-4 space-y-3">
              {groupedRows.map(({ category, items }) => (
                <div key={category} className="space-y-2">
                  <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    {PLAN_TYPE_CATEGORY_LABELS[category]} ({items.length})
                  </div>
                  <div className="space-y-2">
                    {items.map((row) => {
                      const isSelected = !showCreatePanel && selectedRow?.id === row.id;
                      return (
                        <button
                          key={row.id}
                          type="button"
                          onClick={() => onSelectRow(row.id)}
                          className={`w-full rounded-[22px] border p-3 text-left transition ${
                            isSelected
                              ? "border-[var(--lv-primary)] bg-[var(--lv-primary-soft)]"
                              : "border-[var(--lv-border)] bg-[var(--lv-surface)] hover:border-[var(--lv-primary)]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate font-medium text-[var(--lv-text)]">{row.label}</div>
                              <div className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--lv-text-muted)]">
                                {(row.description ?? "").trim() || "Sin descripción todavía."}
                              </div>
                            </div>
                            <div className="shrink-0 rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                              {row.suggestedElement}
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[var(--lv-text-muted)]">
                            <span className={chipClass}>
                              {row.isCustom ? "Personalizado" : "Preset"}
                            </span>
                            {row.archivedAt ? (
                              <span className={warningChipClass}>
                                Archivado
                              </span>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {!groupedRows.length ? (
                <AdminInlineNote>
                  No hay tipos visibles con este filtro. Ajusta la busqueda o activa los
                  archivados.
                </AdminInlineNote>
              ) : null}
            </div>
          </AdminPanel>

          <AdminPanel
            title="Crear tipo nuevo"
            description="Solo cuando realmente falte en la biblioteca."
            actions={
              <button
                type="button"
                className={secondaryActionClass}
                onClick={() => (showCreatePanel ? onCloseCreate() : onOpenCreate())}
              >
                {showCreatePanel ? "Cerrar" : "Abrir"}
              </button>
            }
          >
            <AdminInlineNote tone="warning">
              Evita duplicar planes parecidos. Si el ajuste es solo de assets o copy, edita el
              existente.
            </AdminInlineNote>
          </AdminPanel>
        </>
      }
    >
      {showCreatePanel ? (
        <CreateEditor
          draft={createDraft}
          creating={creating}
          onUpdateDraft={onUpdateCreateDraft}
          onCreate={onCreatePlanType}
        />
      ) : selectedRow && selectedDraft ? (
        <DraftEditor
          row={selectedRow}
          draft={selectedDraft}
          isDirty={selectedIsDirty}
          savingId={savingId}
          archivingId={archivingId}
          onUpdateDraft={(patch) => onUpdateRowDraft(selectedRow.id, patch)}
          onSave={() => onSaveRow(selectedRow)}
          onArchive={() => onToggleArchive(selectedRow)}
        />
      ) : (
        <AdminPanel title="Sin selección" description="Elige un tipo de la biblioteca o crea uno nuevo.">
          <AdminInlineNote>
            Cuando selecciones un tipo, aqui veras su editor completo con preview de semilla y
            flor.
          </AdminInlineNote>
        </AdminPanel>
      )}
    </AdminWorkspace>
  );
}
