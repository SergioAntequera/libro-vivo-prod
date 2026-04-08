"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { ensureSuperadminOrRedirect } from "@/lib/auth";
import {
  getCanonicalElementCatalogItems,
  getFallbackElementCatalogItems,
  getElementColor,
  normalizeElementCode,
} from "@/lib/elementsCatalog";
import { ensureGardenPlanTypes } from "@/lib/gardenPlanTypes";
import { resolveActiveGardenIdForUser } from "@/lib/gardens";
import {
  FLOWER_FAMILY_LABELS,
  FLOWER_FAMILY_ORDER,
  type FlowerFamily,
} from "@/lib/productDomainContracts";
import {
  createCustomPlanTypeCode,
  groupPlanTypeOptions,
  mapGardenPlanTypeRow,
  PLAN_TYPE_CATEGORY_LABELS,
  type PlanTypeCategory,
  type PlanTypeOption,
} from "@/lib/planTypeCatalog";
import {
  createDefaultPlanFlowerSlotConfig,
  createEmptyPlanFlowerComposerConfig,
  getPlanFlowerVariantConfig,
  PLAN_FLOWER_SLOT_KEYS,
  PLAN_FLOWER_SLOT_LABELS,
  upsertPlanFlowerVariantSlotConfig,
  type PlanFlowerComposerConfig,
  type PlanFlowerSlotKey,
} from "@/lib/planTypeFlowerComposer";
import {
  PLAN_FLOWER_BUILDER_TEMPLATE,
  PLAN_SEED_BUILDER_TEMPLATE,
  resolvePlanFlowerAssetPath,
  resolvePlanSeedAssetPath,
} from "@/lib/planVisuals";
import { uploadPlanTypeAsset } from "@/lib/uploadPlanTypeAsset";
import { supabase } from "@/lib/supabase";
import type { ElementKind } from "@/lib/canvasTypes";

type AdminPlanTypeRow = PlanTypeOption & {
  archivedAt: string | null;
  gardenIds: string[];
  sourceCount: number;
  updatedAt: string | null;
};

type AdminPlanTypeSourceRow = PlanTypeOption & {
  archivedAt: string | null;
  gardenId: string | null;
  updatedAt: string | null;
};

type PlanTypeDraft = {
  label: string;
  category: PlanTypeCategory;
  description: string;
  suggestedElement: ElementKind;
  flowerFamily: FlowerFamily;
  iconEmoji: string;
  flowerAssetPath: string;
  seedAssetPath: string;
  flowerBuilderConfig: PlanFlowerComposerConfig;
  sortOrder: string;
};

type CategoryFilter = "all" | PlanTypeCategory;
type ElementFilter = "all" | ElementKind;
type FamilyFilter = "all" | FlowerFamily;
type PlanTypesPanel = "library" | "inspector" | "elements";
type EditorMode = "edit" | "create";
type CategoryCollapseState = Record<PlanTypeCategory, boolean>;
type ElementCatalogRow = {
  code: ElementKind;
  label: string;
  color: string | null;
  icon: string | null;
  emoji: string;
  sortOrder: number;
  enabled: boolean;
};

type NewElementDraft = {
  code: string;
  label: string;
  color: string;
  emoji: string;
  sortOrder: string;
  enabled: boolean;
};

type FloatingPanelDrag = {
  panel: PlanTypesPanel;
  startClientX: number;
  startClientY: number;
  startOffsetX: number;
  startOffsetY: number;
};

type PlanTypeAssetLibraryRow = {
  code: string;
  label: string;
  src: string;
  storagePath: string | null;
  slot: PlanFlowerSlotKey | "all";
  enabled: boolean;
  sortOrder: number;
};

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

const STAR_OPTIONS = [1, 2, 3, 4, 5] as const;

const STAGE_GLOW_BY_ELEMENT: Record<
  ElementKind,
  { halo: string; wash: string; edge: string }
> = {
  fire: {
    halo: "rgba(255, 171, 125, 0.32)",
    wash: "rgba(255, 240, 231, 0.92)",
    edge: "rgba(227, 121, 88, 0.18)",
  },
  water: {
    halo: "rgba(140, 212, 255, 0.32)",
    wash: "rgba(238, 246, 255, 0.92)",
    edge: "rgba(112, 170, 255, 0.16)",
  },
  air: {
    halo: "rgba(192, 236, 255, 0.26)",
    wash: "rgba(244, 250, 255, 0.92)",
    edge: "rgba(138, 205, 232, 0.14)",
  },
  earth: {
    halo: "rgba(240, 212, 143, 0.26)",
    wash: "rgba(250, 246, 233, 0.92)",
    edge: "rgba(174, 124, 73, 0.16)",
  },
  aether: {
    halo: "rgba(211, 198, 255, 0.28)",
    wash: "rgba(247, 244, 255, 0.92)",
    edge: "rgba(162, 142, 232, 0.16)",
  },
};

const INITIAL_CATEGORY_COLLAPSE_STATE: CategoryCollapseState = {
  salida: false,
  comida: false,
  naturaleza: false,
  movimiento: false,
  casa: false,
  cultura: false,
  escapada: false,
  celebracion: false,
  custom: false,
};

const DEFAULT_ELEMENT_ROWS: ElementCatalogRow[] = getFallbackElementCatalogItems().map((item) => ({
  code: item.code,
  label: item.label,
  color: item.color,
  icon: item.icon,
  emoji: item.emoji,
  sortOrder: item.sortOrder,
  enabled: item.enabled,
}));

function createEmptyElementDraft(): NewElementDraft {
  return {
    code: "",
    label: "",
    color: "",
    emoji: "",
    sortOrder: "100",
    enabled: true,
  };
}

function createAssetCode(raw: string) {
  return normalizeElementCode(raw).replace(/^[-_]+|[-_]+$/g, "") || `asset_${Date.now().toString(36)}`;
}

function assetFilename(assetPath: string) {
  const value = String(assetPath ?? "").trim();
  if (!value) return "Sin asset";
  const clean = value.split("?")[0] ?? value;
  const parts = clean.split("/");
  return parts[parts.length - 1] ?? value;
}

const PANEL_BOUNDS = {
  minY: -36,
  maxY: 24,
  minX: -360,
  maxX: 360,
} as const;

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const message = String((error as { message?: unknown }).message ?? "").trim();
    if (message) return message;
  }
  return fallback;
}

function createEmptyDraft(): PlanTypeDraft {
  return {
    label: "",
    category: "custom",
    description: "",
    suggestedElement: "aether",
    flowerFamily: "estrella",
    iconEmoji: "",
    flowerAssetPath: PLAN_FLOWER_BUILDER_TEMPLATE,
    seedAssetPath: PLAN_SEED_BUILDER_TEMPLATE,
    flowerBuilderConfig: createEmptyPlanFlowerComposerConfig(),
    sortOrder: "900",
  };
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizeAssetPath(value: string | null | undefined, fallback: string) {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function slotIsCustomized(
  slot: Partial<ReturnType<typeof createDefaultPlanFlowerSlotConfig>> | null | undefined,
) {
  if (!slot) return false;
  return (
    !slot.enabled ||
    Boolean(String(slot.assetPath ?? "").trim()) ||
    Number(slot.opacity ?? 1) !== 1 ||
    Number(slot.scale ?? 1) !== 1 ||
    Number(slot.offsetX ?? 0) !== 0 ||
    Number(slot.offsetY ?? 0) !== 0 ||
    Number(slot.rotation ?? 0) !== 0
  );
}

function toDraft(row: AdminPlanTypeRow): PlanTypeDraft {
  return {
    label: row.label,
    category: row.category,
    description: row.description ?? "",
    suggestedElement: row.suggestedElement,
    flowerFamily: row.flowerFamily,
    iconEmoji: row.iconEmoji ?? "",
    flowerAssetPath: normalizeAssetPath(row.flowerAssetPath, PLAN_FLOWER_BUILDER_TEMPLATE),
    seedAssetPath: normalizeAssetPath(row.seedAssetPath, PLAN_SEED_BUILDER_TEMPLATE),
    flowerBuilderConfig: row.flowerBuilderConfig,
    sortOrder: String(row.sortOrder),
  };
}

function mapAdminSourceRow(row: Record<string, unknown>): AdminPlanTypeSourceRow {
  const option = mapGardenPlanTypeRow(row);
  return {
    ...option,
    archivedAt:
      typeof row.archived_at === "string" && row.archived_at.trim()
        ? row.archived_at
        : null,
    gardenId:
      typeof row.garden_id === "string" && row.garden_id.trim() ? row.garden_id : null,
    updatedAt:
      typeof row.updated_at === "string" && row.updated_at.trim() ? row.updated_at : null,
  };
}

function sortCanonicalRows(
  left: Pick<AdminPlanTypeSourceRow, "updatedAt" | "sortOrder" | "label">,
  right: Pick<AdminPlanTypeSourceRow, "updatedAt" | "sortOrder" | "label">,
) {
  const leftUpdated = Date.parse(left.updatedAt ?? "");
  const rightUpdated = Date.parse(right.updatedAt ?? "");
  if (Number.isFinite(leftUpdated) && Number.isFinite(rightUpdated) && leftUpdated !== rightUpdated) {
    return rightUpdated - leftUpdated;
  }
  if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
  return left.label.localeCompare(right.label, "es");
}

function collapseAdminRows(rows: AdminPlanTypeSourceRow[]) {
  const byCode = new Map<string, AdminPlanTypeSourceRow[]>();
  for (const row of rows) {
    const current = byCode.get(row.code) ?? [];
    current.push(row);
    byCode.set(row.code, current);
  }

  return [...byCode.values()]
    .map((group) => {
      const canonical = [...group].sort(sortCanonicalRows)[0];
      return {
        ...canonical,
        gardenIds: [...new Set(group.map((row) => row.gardenId).filter(Boolean) as string[])],
        sourceCount: group.length,
      } satisfies AdminPlanTypeRow;
    })
    .sort(sortCanonicalRows);
}

async function resolveCanonicalGardenScopeIds(profileId: string) {
  const { data, error } = await supabase
    .from("gardens")
    .select("id")
    .order("created_at", { ascending: true });

  if (!error) {
    const ids = ((data as Array<{ id?: unknown }> | null) ?? [])
      .map((row) => String(row.id ?? "").trim())
      .filter(Boolean);
    if (ids.length) return [...new Set(ids)];
  }

  const fallbackGardenId = await resolveActiveGardenIdForUser({
    userId: profileId,
    forceRefresh: true,
  }).catch(() => null);

  return fallbackGardenId ? [fallbackGardenId] : [];
}

function hasDraftChanges(row: AdminPlanTypeRow, draft: PlanTypeDraft) {
  return (
    row.label !== draft.label ||
    row.category !== draft.category ||
    (row.description ?? "") !== draft.description ||
    row.suggestedElement !== draft.suggestedElement ||
    row.flowerFamily !== draft.flowerFamily ||
    (row.iconEmoji ?? "") !== draft.iconEmoji ||
    normalizeAssetPath(row.flowerAssetPath, PLAN_FLOWER_BUILDER_TEMPLATE) !==
      normalizeAssetPath(draft.flowerAssetPath, PLAN_FLOWER_BUILDER_TEMPLATE) ||
    normalizeAssetPath(row.seedAssetPath, PLAN_SEED_BUILDER_TEMPLATE) !==
      normalizeAssetPath(draft.seedAssetPath, PLAN_SEED_BUILDER_TEMPLATE) ||
    JSON.stringify(row.flowerBuilderConfig ?? {}) !==
      JSON.stringify(draft.flowerBuilderConfig ?? {}) ||
    String(row.sortOrder) !== draft.sortOrder
  );
}

function isCreateDraftDirty(draft: PlanTypeDraft) {
  const base = createEmptyDraft();
  return JSON.stringify(draft) !== JSON.stringify(base);
}

function togglePanel<T extends string>(current: T | null, next: T) {
  return current === next ? null : next;
}

function ToolbarButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-5 py-2.5 text-base transition ${
        active
          ? "border-[var(--lv-primary)] bg-[var(--lv-primary-soft)] text-[var(--lv-primary-strong)]"
          : "border-[var(--lv-border)] bg-[var(--lv-surface)] text-[var(--lv-text)] hover:bg-[var(--lv-surface-soft)]"
      }`}
    >
      {children}
    </button>
  );
}

function FloatingPanel(props: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  style?: CSSProperties;
  onHeaderPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  actions?: ReactNode;
  description?: string;
}) {
  return (
    <div
      style={props.style}
      className={`absolute z-20 flex flex-col rounded-[30px] border border-[var(--lv-border)] bg-[rgba(255,255,255,0.96)] p-4 shadow-[0_26px_80px_rgba(24,36,26,0.18)] backdrop-blur ${props.className ?? ""}`}
    >
      <div
        className={`mb-3 shrink-0 flex items-start justify-between gap-3 ${
          props.onHeaderPointerDown ? "cursor-grab active:cursor-grabbing" : ""
        }`}
        onPointerDown={props.onHeaderPointerDown}
      >
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-[var(--lv-text)]">{props.title}</h2>
          {props.description ? (
            <p className="mt-1 text-sm leading-6 text-[var(--lv-text-muted)]">
              {props.description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={props.onClose}
          className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-1.5 text-xs text-[var(--lv-text)]"
        >
          Cerrar
        </button>
      </div>
      {props.actions ? (
        <div className="mb-3 shrink-0 flex flex-wrap gap-2">{props.actions}</div>
      ) : null}
      <div className={`min-h-0 flex-1 overflow-y-auto pr-1 ${props.bodyClassName ?? ""}`}>
        {props.children}
      </div>
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-[var(--lv-border)] bg-[rgba(255,255,255,0.92)] px-4 py-2 shadow-[var(--lv-shadow-sm)]">
      <span className="text-[11px] uppercase tracking-[0.22em] text-[var(--lv-text-muted)]">
        {label}
      </span>
      <span className="ml-3 text-sm font-medium text-[var(--lv-text)]">{value}</span>
    </div>
  );
}

function SmallMetaChip({
  active = false,
  children,
}: {
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] ${
        active
          ? "border-[var(--lv-primary)] bg-[var(--lv-primary-soft)] text-[var(--lv-primary-strong)]"
          : "border-[var(--lv-border)] bg-[rgba(255,255,255,0.78)] text-[var(--lv-text-muted)]"
      }`}
    >
      {children}
    </span>
  );
}

function SurfaceChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-[var(--lv-border)] bg-[rgba(255,255,255,0.82)] px-3 py-2 text-sm shadow-[var(--lv-shadow-sm)] backdrop-blur">
      <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
        {label}
      </span>
      <span className="ml-2 font-medium text-[var(--lv-text)]">{value}</span>
    </div>
  );
}

function ProductMiniPreview({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--lv-border)] bg-white/78 p-4 shadow-[var(--lv-shadow-sm)]">
      <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--lv-text-muted)]">
        {title}
      </div>
      <div className="mt-2 text-sm leading-6 text-[var(--lv-text-muted)]">{hint}</div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function stageBackgroundStyle(element: ElementKind): CSSProperties {
  const fallback = deriveElementGlow(getElementColor(element)) ?? {
    halo: "rgba(211, 198, 255, 0.28)",
    wash: "rgba(247, 244, 255, 0.92)",
    edge: "rgba(162, 142, 232, 0.16)",
  };
  const colors = STAGE_GLOW_BY_ELEMENT[element] ?? fallback;
  return {
    background: `radial-gradient(circle at 50% 32%, ${colors.halo} 0%, transparent 42%), linear-gradient(180deg, rgba(255,255,255,0.96), ${colors.wash})`,
    boxShadow: `inset 0 0 0 1px ${colors.edge}`,
  };
}

function deriveElementGlow(color: string | null | undefined) {
  const value = String(color ?? "").trim();
  if (!/^#([0-9a-fA-F]{6})$/.test(value)) return null;
  return {
    halo: `${value}33`,
    wash: `${value}14`,
    edge: `${value}2a`,
  };
}

export default function AdminPlanTypesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [myProfileId, setMyProfileId] = useState("");
  const [gardenScopeIds, setGardenScopeIds] = useState<string[]>([]);
  const [elementRows, setElementRows] = useState<ElementCatalogRow[]>(DEFAULT_ELEMENT_ROWS);
  const [savingElementCode, setSavingElementCode] = useState<ElementKind | null>(null);
  const [creatingElement, setCreatingElement] = useState(false);
  const [newElementDraft, setNewElementDraft] = useState<NewElementDraft>(createEmptyElementDraft());
  const [assetLibraryRows, setAssetLibraryRows] = useState<PlanTypeAssetLibraryRow[]>([]);
  const [assetPickerSlot, setAssetPickerSlot] = useState<PlanFlowerSlotKey | null>(null);
  const [assetLibrarySearch, setAssetLibrarySearch] = useState("");
  const [uploadingSlotAsset, setUploadingSlotAsset] = useState(false);
  const [deletingSlotAssetCode, setDeletingSlotAssetCode] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [rows, setRows] = useState<AdminPlanTypeRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, PlanTypeDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>("edit");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [elementFilter, setElementFilter] = useState<ElementFilter>("all");
  const [familyFilter, setFamilyFilter] = useState<FamilyFilter>("all");
  const [onlyCustom, setOnlyCustom] = useState(false);
  const [activePanel, setActivePanel] = useState<PlanTypesPanel | null>("library");
  const [previewRating, setPreviewRating] = useState<(typeof STAR_OPTIONS)[number]>(3);
  const [previewElementOverride, setPreviewElementOverride] = useState<ElementKind | null>(null);
  const [floatingPanelDrag, setFloatingPanelDrag] = useState<FloatingPanelDrag | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<CategoryCollapseState>(
    INITIAL_CATEGORY_COLLAPSE_STATE,
  );
  const [panelOffsets, setPanelOffsets] = useState<Record<PlanTypesPanel, { x: number; y: number }>>({
    library: { x: 0, y: 0 },
    inspector: { x: 0, y: 0 },
    elements: { x: 0, y: 0 },
  });
  const [createDraft, setCreateDraft] = useState<PlanTypeDraft>(createEmptyDraft());
  const slotAssetInputRef = useRef<HTMLInputElement | null>(null);

  const stats = useMemo(() => {
    const active = rows.filter((row) => !row.archivedAt).length;
    const archived = rows.filter((row) => row.archivedAt).length;
    const custom = rows.filter((row) => row.isCustom && !row.archivedAt).length;
    return { active, archived, custom };
  }, [rows]);

  const elementOptions = useMemo(
    () =>
      [...elementRows]
        .filter((row) => row.enabled)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((row) => ({ value: row.code, label: row.label })),
    [elementRows],
  );

  const elementLabelMap = useMemo(
    () =>
      Object.fromEntries(elementRows.map((row) => [row.code, row.label])) as Record<
        ElementKind,
        string
      >,
    [elementRows],
  );

  const elementColorMap = useMemo(
    () =>
      Object.fromEntries(elementRows.map((row) => [row.code, row.color])) as Record<
        ElementKind,
        string | null
      >,
    [elementRows],
  );

  const visibleRows = useMemo(
    () => rows.filter((row) => (showArchived ? true : !row.archivedAt)),
    [rows, showArchived],
  );

  const preCategoryRows = useMemo(() => {
    const normalizedSearch = normalizeSearchText(search);
    return visibleRows.filter((row) => {
      const draft = drafts[row.id] ?? toDraft(row);
      if (elementFilter !== "all" && draft.suggestedElement !== elementFilter) return false;
      if (familyFilter !== "all" && draft.flowerFamily !== familyFilter) return false;
      if (onlyCustom && !row.isCustom) return false;
      if (!normalizedSearch) return true;

      const haystack = normalizeSearchText(
        [
          row.code,
          draft.label,
          draft.description,
          PLAN_TYPE_CATEGORY_LABELS[draft.category],
          FLOWER_FAMILY_LABELS[draft.flowerFamily],
          draft.suggestedElement,
        ]
          .filter(Boolean)
          .join(" "),
      );
      return haystack.includes(normalizedSearch);
    });
  }, [
    drafts,
    elementFilter,
    familyFilter,
    onlyCustom,
    search,
    visibleRows,
  ]);

  const filteredRows = useMemo(
    () =>
      preCategoryRows.filter((row) => {
        if (categoryFilter === "all") return true;
        const draft = drafts[row.id] ?? toDraft(row);
        return draft.category === categoryFilter;
      }),
    [categoryFilter, drafts, preCategoryRows],
  );

  const categoryCounts = useMemo(
    () =>
      CATEGORY_ORDER.reduce<Record<PlanTypeCategory, number>>((acc, category) => {
        acc[category] = preCategoryRows.filter((row) => {
          const draft = drafts[row.id] ?? toDraft(row);
          return draft.category === category;
        }).length;
        return acc;
      }, {} as Record<PlanTypeCategory, number>),
    [drafts, preCategoryRows],
  );

  const groupedRows = useMemo(() => {
    const groups = groupPlanTypeOptions(filteredRows);
    return CATEGORY_ORDER.map((category) => ({
      category,
      items: (groups.get(category) as AdminPlanTypeRow[] | undefined) ?? [],
    })).filter((entry) => entry.items.length > 0);
  }, [filteredRows]);

  const selectedRow = useMemo(
    () => rows.find((row) => row.id === selectedRowId) ?? null,
    [rows, selectedRowId],
  );

  const selectedDraft = useMemo(
    () => (selectedRow ? drafts[selectedRow.id] ?? toDraft(selectedRow) : null),
    [drafts, selectedRow],
  );

  const currentDraft = useMemo(() => {
    if (editorMode === "create") return createDraft;
    return selectedDraft ?? createDraft;
  }, [createDraft, editorMode, selectedDraft]);
  const previewElement = previewElementOverride ?? currentDraft.suggestedElement;
  const activeVariantSlots = useMemo(
    () =>
      getPlanFlowerVariantConfig({
        config: currentDraft.flowerBuilderConfig,
        element: previewElement,
        rating: previewRating,
      }),
    [currentDraft.flowerBuilderConfig, previewElement, previewRating],
  );
  const activeVariantCustomSlotCount = useMemo(
    () => Object.values(activeVariantSlots).filter((slot) => slotIsCustomized(slot)).length,
    [activeVariantSlots],
  );
  const filteredAssetLibraryRows = useMemo(() => {
    const normalizedSearch = normalizeSearchText(assetLibrarySearch);
    return assetLibraryRows.filter((row) => {
      if (!row.enabled) return false;
      if (assetPickerSlot && row.slot !== "all" && row.slot !== assetPickerSlot) return false;
      if (!normalizedSearch) return true;
      const haystack = normalizeSearchText([row.label, row.code, row.slot, row.src].join(" "));
      return haystack.includes(normalizedSearch);
    });
  }, [assetLibraryRows, assetLibrarySearch, assetPickerSlot]);

  const selectedIsDirty = Boolean(
    selectedRow && selectedDraft && hasDraftChanges(selectedRow, selectedDraft),
  );
  const createIsDirty = useMemo(() => isCreateDraftDirty(createDraft), [createDraft]);
  const isDirty = editorMode === "create" ? createIsDirty : selectedIsDirty;

  const currentFlowerSrc = useMemo(
    () =>
      resolvePlanFlowerAssetPath({
        planFlowerAssetPath: currentDraft.flowerAssetPath,
        planFlowerBuilderConfig: currentDraft.flowerBuilderConfig,
        planCategory: currentDraft.category,
        planFlowerFamily: currentDraft.flowerFamily,
        planSuggestedElement: previewElement,
        rating: previewRating,
      }),
    [currentDraft, previewElement, previewRating],
  );

  const currentSeedSrc = useMemo(
    () =>
      resolvePlanSeedAssetPath({
        planSeedAssetPath: currentDraft.seedAssetPath,
        planCategory: currentDraft.category,
        planFlowerFamily: currentDraft.flowerFamily,
        planSuggestedElement: previewElement,
      }),
    [currentDraft, previewElement],
  );

  const flowerVariants = useMemo(
    () =>
      STAR_OPTIONS.map((rating) => ({
        rating,
        src: resolvePlanFlowerAssetPath({
          planFlowerAssetPath: currentDraft.flowerAssetPath,
          planFlowerBuilderConfig: currentDraft.flowerBuilderConfig,
          planCategory: currentDraft.category,
          planFlowerFamily: currentDraft.flowerFamily,
          planSuggestedElement: previewElement,
          rating,
        }),
      })),
    [currentDraft, previewElement],
  );
  const elementVariants = useMemo(
    () =>
      elementOptions.map((option) => ({
        ...option,
        src: resolvePlanFlowerAssetPath({
          planFlowerAssetPath: currentDraft.flowerAssetPath,
          planFlowerBuilderConfig: currentDraft.flowerBuilderConfig,
          planCategory: currentDraft.category,
          planFlowerFamily: currentDraft.flowerFamily,
          planSuggestedElement: option.value,
          rating: previewRating,
        }),
      })),
    [currentDraft, elementOptions, previewRating],
  );

  const refresh = useCallback(async (profileId: string, includeArchived: boolean) => {
    if (!profileId) {
      setRows([]);
      setDrafts({});
      setGardenScopeIds([]);
      return [] as AdminPlanTypeRow[];
    }

    const scopeIds = await resolveCanonicalGardenScopeIds(profileId);
    setGardenScopeIds(scopeIds);
    if (!scopeIds.length) {
      setRows([]);
      setDrafts({});
      return [] as AdminPlanTypeRow[];
    }

    setMsg(null);
    await Promise.all(
      scopeIds.map((gardenId) => ensureGardenPlanTypes({ gardenId, profileId })),
    );

    let query = supabase
      .from("garden_plan_types")
      .select(
        "id,garden_id,code,label,category,description,flower_family,suggested_element,icon_emoji,flower_asset_path,seed_asset_path,flower_builder_config,is_custom,sort_order,archived_at,updated_at",
      )
      .in("garden_id", scopeIds)
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true });

    if (!includeArchived) {
      query = query.is("archived_at", null);
    }

    const { data, error } = await query;
    if (error) {
      setMsg(getErrorMessage(error, "No se pudo cargar la biblioteca canónica de tipos de plan."));
      setRows([]);
      setDrafts({});
      return [] as AdminPlanTypeRow[];
    }

    const nextRows = collapseAdminRows(
      ((data as Record<string, unknown>[] | null) ?? []).map(mapAdminSourceRow),
    );
    setRows(nextRows);
    setDrafts(Object.fromEntries(nextRows.map((row) => [row.id, toDraft(row)])));
    return nextRows;
  }, []);

  const loadElements = useCallback(async () => {
    const nextRows = await getCanonicalElementCatalogItems();
    setElementRows(
      nextRows.map((row) => ({
        code: row.code,
        label: row.label,
        color: row.color,
        icon: row.icon,
        emoji: row.emoji,
        sortOrder: row.sortOrder,
        enabled: row.enabled,
      })),
    );
  }, []);

  const loadAssetLibrary = useCallback(async () => {
    const { data, error } = await supabase
      .from("catalog_items")
      .select("code,label,enabled,sort_order,metadata")
      .eq("catalog_key", "plan_type_flower_assets")
      .order("sort_order", { ascending: true });

    if (error) {
      setMsg(getErrorMessage(error, "No se pudo cargar la biblioteca de assets florales."));
      return;
    }

    const nextRows = ((data as Array<Record<string, unknown>> | null) ?? [])
      .map((row) => {
        const metadata =
          row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
            ? (row.metadata as Record<string, unknown>)
            : {};
        const src = String(metadata.asset_path ?? "").trim();
        if (!src) return null;
        const slot = String(metadata.slot ?? "all").trim();
        return {
          code: String(row.code ?? "").trim(),
          label: String(row.label ?? row.code ?? "Asset").trim() || "Asset",
          src,
          storagePath: String(metadata.storage_path ?? "").trim() || null,
          slot: (PLAN_FLOWER_SLOT_KEYS.includes(slot as PlanFlowerSlotKey)
            ? slot
            : "all") as PlanFlowerSlotKey | "all",
          enabled: row.enabled === false ? false : true,
          sortOrder: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : 100,
        } satisfies PlanTypeAssetLibraryRow;
      })
      .filter(Boolean) as PlanTypeAssetLibraryRow[];

    setAssetLibraryRows(nextRows);
  }, []);

  useEffect(() => {
    (async () => {
      const session = await ensureSuperadminOrRedirect(router);
      if (!session) return;

      setMyProfileId(session.profile.id);
      await Promise.all([refresh(session.profile.id, false), loadElements(), loadAssetLibrary()]);
      setLoading(false);
    })();
  }, [loadAssetLibrary, loadElements, refresh, router]);

  useEffect(() => {
    if (!myProfileId) return;
    void refresh(myProfileId, showArchived);
  }, [myProfileId, refresh, showArchived]);

  useEffect(() => {
    if (editorMode === "create") return;
    if (!filteredRows.length) {
      setSelectedRowId(null);
      return;
    }
    if (!selectedRowId || !filteredRows.some((row) => row.id === selectedRowId)) {
      setSelectedRowId(filteredRows[0].id);
    }
  }, [editorMode, filteredRows, selectedRowId]);

  useEffect(() => {
    setPreviewElementOverride(null);
  }, [editorMode, selectedRowId]);

  useEffect(() => {
    if (!floatingPanelDrag) return;
    const active = floatingPanelDrag;
    function handlePointerMove(event: PointerEvent) {
      const nextX =
        active.startOffsetX + (event.clientX - active.startClientX);
      const nextY =
        active.startOffsetY + (event.clientY - active.startClientY);
      setPanelOffsets((current) => ({
        ...current,
        [active.panel]: {
          x: Math.min(PANEL_BOUNDS.maxX, Math.max(PANEL_BOUNDS.minX, nextX)),
          y: Math.min(PANEL_BOUNDS.maxY, Math.max(PANEL_BOUNDS.minY, nextY)),
        },
      }));
    }
    function handlePointerUp() {
      setFloatingPanelDrag(null);
    }
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [floatingPanelDrag]);

  function startPanelDrag(panel: PlanTypesPanel, event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement | null)?.closest("button,input,select,textarea")) return;
    setFloatingPanelDrag({
      panel,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: panelOffsets[panel].x,
      startOffsetY: panelOffsets[panel].y,
    });
  }

  function panelStyle(panel: PlanTypesPanel): CSSProperties {
    return {
      transform: `translate(${panelOffsets[panel].x}px, ${panelOffsets[panel].y}px)`,
    };
  }

  function updateCreateDraft(patch: Partial<PlanTypeDraft>) {
    setCreateDraft((prev) => ({ ...prev, ...patch }));
  }

  function updateRowDraft(rowId: string, patch: Partial<PlanTypeDraft>) {
    const row = rows.find((entry) => entry.id === rowId);
    if (!row) return;
    setDrafts((prev) => ({
      ...prev,
      [rowId]: { ...(prev[rowId] ?? toDraft(row)), ...patch },
    }));
  }

  function updateCurrentVariantSlot(
    slot: PlanFlowerSlotKey,
    patch: Partial<ReturnType<typeof createDefaultPlanFlowerSlotConfig>>,
  ) {
    const nextConfig = upsertPlanFlowerVariantSlotConfig({
      config: currentDraft.flowerBuilderConfig,
      element: previewElement,
      rating: previewRating,
      slot,
      patch,
    });
    if (editorMode === "create") {
      updateCreateDraft({ flowerBuilderConfig: nextConfig });
      return;
    }
    if (selectedRowId) {
      updateRowDraft(selectedRowId, { flowerBuilderConfig: nextConfig });
    }
  }

  function resetCurrentVariantComposer() {
    const nextConfig = { ...currentDraft.flowerBuilderConfig };
    const nextElement = { ...(nextConfig[previewElement] ?? {}) };
    delete nextElement[String(previewRating) as keyof typeof nextElement];
    if (Object.keys(nextElement).length) {
      nextConfig[previewElement] = nextElement;
    } else {
      delete nextConfig[previewElement];
    }
    if (editorMode === "create") {
      updateCreateDraft({ flowerBuilderConfig: nextConfig });
      return;
    }
    if (selectedRowId) {
      updateRowDraft(selectedRowId, { flowerBuilderConfig: nextConfig });
    }
  }

  function applyPickedSlotAsset(assetPath: string) {
    if (!assetPickerSlot) return;
    updateCurrentVariantSlot(assetPickerSlot, { assetPath });
    setAssetPickerSlot(null);
  }

  async function handleUploadSlotAsset(file: File) {
    if (!assetPickerSlot) return;
    const baseName = file.name.replace(/\.[^.]+$/, "");
    const label = baseName.trim() || `${assetPickerSlot}-${Date.now().toString(36)}`;
    const code = `${createAssetCode(label)}_${Date.now().toString(36)}`;

    setUploadingSlotAsset(true);
    setMsg(null);
    try {
      const { error: catalogError } = await supabase.from("catalogs").upsert(
        {
          key: "plan_type_flower_assets",
          label: "Assets florales de plan types",
          description:
            "Biblioteca persistida de assets para slots del compositor floral de plan-types.",
          is_active: true,
        },
        { onConflict: "key" },
      );
      if (catalogError) {
        setMsg(getErrorMessage(catalogError, "No se pudo preparar el catálogo de assets florales."));
        return;
      }

      const uploaded = await uploadPlanTypeAsset({
        keyBase: `${assetPickerSlot}-${label}`,
        file,
      });
      const sortOrder = assetLibraryRows.length
        ? Math.max(...assetLibraryRows.map((row) => row.sortOrder)) + 10
        : 100;
      const { error } = await supabase.from("catalog_items").upsert(
        {
          catalog_key: "plan_type_flower_assets",
          code,
          label,
          sort_order: sortOrder,
          enabled: true,
          metadata: {
            asset_path: uploaded.publicUrl,
            storage_path: uploaded.storagePath,
            slot: assetPickerSlot,
            bucket: uploaded.bucket,
          },
        },
        { onConflict: "catalog_key,code" },
      );
      if (error) {
        setMsg(getErrorMessage(error, "No se pudo guardar el asset floral."));
        return;
      }
      await loadAssetLibrary();
      applyPickedSlotAsset(uploaded.publicUrl);
      setMsg(`Asset añadido para ${PLAN_FLOWER_SLOT_LABELS[assetPickerSlot]}.`);
    } catch (error) {
      setMsg(getErrorMessage(error, "No se pudo subir el asset floral."));
    } finally {
      setUploadingSlotAsset(false);
      if (slotAssetInputRef.current) slotAssetInputRef.current.value = "";
    }
  }

  async function deleteSlotAsset(asset: PlanTypeAssetLibraryRow) {
    setDeletingSlotAssetCode(asset.code);
    setMsg(null);
    try {
      if (asset.storagePath) {
        const { error: storageError } = await supabase.storage
          .from("plan-type-assets")
          .remove([asset.storagePath]);
        if (storageError) {
          throw new Error(storageError.message);
        }
      }
      const { error } = await supabase
        .from("catalog_items")
        .delete()
        .eq("catalog_key", "plan_type_flower_assets")
        .eq("code", asset.code);
      if (error) {
        throw new Error(error.message);
      }
      await loadAssetLibrary();
      if (assetPickerSlot && activeVariantSlots[assetPickerSlot]?.assetPath === asset.src) {
        updateCurrentVariantSlot(assetPickerSlot, { assetPath: "" });
      }
      setMsg(`Asset borrado: ${asset.label}.`);
    } catch (error) {
      setMsg(getErrorMessage(error, "No se pudo borrar el asset."));
    } finally {
      setDeletingSlotAssetCode(null);
    }
  }

  function updateElementRow(code: string, patch: Partial<ElementCatalogRow>) {
    setElementRows((current) =>
      current.map((row) => (row.code === code ? { ...row, ...patch } : row)),
    );
  }

  function beginCreate() {
    setEditorMode("create");
    setSelectedRowId(null);
    setCreateDraft(createEmptyDraft());
    setCollapsedCategories((current) => ({ ...current, custom: false }));
    setActivePanel("inspector");
  }

  function beginCreateFromRow(row: AdminPlanTypeRow) {
    setEditorMode("create");
    setSelectedRowId(null);
    setCreateDraft({
      ...toDraft(row),
      label: `${row.label} copia`,
      sortOrder: String(row.sortOrder + 10),
    });
    setCollapsedCategories((current) => ({ ...current, [row.category]: false }));
    setActivePanel("inspector");
  }

  function handleSelectRow(rowId: string) {
    setEditorMode("edit");
    setSelectedRowId(rowId);
    const row = rows.find((entry) => entry.id === rowId);
    if (row) {
      setCollapsedCategories((current) => ({ ...current, [row.category]: false }));
    }
  }

  function toggleCategoryCollapse(category: PlanTypeCategory) {
    setCollapsedCategories((current) => ({
      ...current,
      [category]: !current[category],
    }));
  }

  function resetCurrentDraftToCanonical() {
    if (editorMode === "create") {
      updateCreateDraft({
        flowerAssetPath: PLAN_FLOWER_BUILDER_TEMPLATE,
        seedAssetPath: PLAN_SEED_BUILDER_TEMPLATE,
        flowerBuilderConfig: createEmptyPlanFlowerComposerConfig(),
      });
      return;
    }
    if (!selectedRowId) return;
    updateRowDraft(selectedRowId, {
      flowerAssetPath: PLAN_FLOWER_BUILDER_TEMPLATE,
      seedAssetPath: PLAN_SEED_BUILDER_TEMPLATE,
      flowerBuilderConfig: createEmptyPlanFlowerComposerConfig(),
    });
  }

  async function createPlanType() {
    const label = createDraft.label.trim();
    if (!label) {
      setMsg("Pon un nombre para el tipo de plan.");
      return;
    }
    if (!gardenScopeIds.length || !myProfileId) {
      setMsg("No hay alcance canónico disponible para guardar esta biblioteca.");
      return;
    }

    setCreating(true);
    setMsg(null);
    try {
      const code = createCustomPlanTypeCode(label);
      const sortOrder = Number.parseInt(createDraft.sortOrder, 10);
      const payload = gardenScopeIds.map((gardenId) => ({
        garden_id: gardenId,
        code,
        label,
        category: createDraft.category,
        description: createDraft.description.trim() || null,
        flower_family: createDraft.flowerFamily,
        suggested_element: createDraft.suggestedElement,
        icon_emoji: createDraft.iconEmoji.trim() || null,
        flower_asset_path: normalizeAssetPath(
          createDraft.flowerAssetPath,
          PLAN_FLOWER_BUILDER_TEMPLATE,
        ),
        seed_asset_path: normalizeAssetPath(
          createDraft.seedAssetPath,
          PLAN_SEED_BUILDER_TEMPLATE,
        ),
        flower_builder_config: createDraft.flowerBuilderConfig,
        is_custom: true,
        sort_order: Number.isFinite(sortOrder) ? sortOrder : 900,
        created_by_user_id: myProfileId,
        updated_by_user_id: myProfileId,
        archived_at: null,
      }));

      const { error } = await supabase
        .from("garden_plan_types")
        .upsert(payload, { onConflict: "garden_id,code" });
      if (error) {
        setMsg(getErrorMessage(error, "No se pudo crear el tipo de plan."));
        return;
      }

      setCreateDraft(createEmptyDraft());
      const nextRows = await refresh(myProfileId, showArchived);
      setEditorMode("edit");
      const createdRow = nextRows.find((row) => row.code === code);
      if (createdRow) {
        setSelectedRowId(createdRow.id);
      }
      setMsg("Tipo de plan guardado en la biblioteca canónica.");
    } finally {
      setCreating(false);
    }
  }

  async function saveRow(row: AdminPlanTypeRow) {
    const draft = drafts[row.id];
    if (!draft) return;

    const label = draft.label.trim();
    if (!label) {
      setMsg("El tipo de plan necesita un nombre.");
      return;
    }
    if (!gardenScopeIds.length || !myProfileId) return;

    setSavingId(row.id);
    setMsg(null);
    try {
      const sortOrder = Number.parseInt(draft.sortOrder, 10);
      const payload = gardenScopeIds.map((gardenId) => ({
        garden_id: gardenId,
        code: row.code,
        label,
        category: draft.category,
        description: draft.description.trim() || null,
        flower_family: draft.flowerFamily,
        suggested_element: draft.suggestedElement,
        icon_emoji: draft.iconEmoji.trim() || null,
        flower_asset_path: normalizeAssetPath(
          draft.flowerAssetPath,
          PLAN_FLOWER_BUILDER_TEMPLATE,
        ),
        seed_asset_path: normalizeAssetPath(
          draft.seedAssetPath,
          PLAN_SEED_BUILDER_TEMPLATE,
        ),
        flower_builder_config: draft.flowerBuilderConfig,
        is_custom: row.isCustom,
        sort_order: Number.isFinite(sortOrder) ? sortOrder : row.sortOrder,
        created_by_user_id: myProfileId,
        updated_by_user_id: myProfileId,
        archived_at: row.archivedAt,
      }));
      const { error } = await supabase
        .from("garden_plan_types")
        .upsert(payload, { onConflict: "garden_id,code" });

      if (error) {
        setMsg(getErrorMessage(error, "No se pudo guardar el tipo de plan."));
        return;
      }

      const nextRows = await refresh(myProfileId, showArchived);
      setSelectedRowId(nextRows.find((entry) => entry.code === row.code)?.id ?? row.id);
      setMsg(`Biblioteca actualizada: ${label}.`);
    } finally {
      setSavingId(null);
    }
  }

  async function saveElementRow(row: ElementCatalogRow) {
    setSavingElementCode(row.code);
    setMsg(null);
    try {
      const { error } = await supabase.from("catalog_items").upsert(
        {
          catalog_key: "elements",
          code: row.code,
          label: row.label.trim() || row.code,
          sort_order: row.sortOrder,
          enabled: row.enabled,
          color: row.color?.trim() || null,
          icon: row.icon?.trim() || null,
          metadata: row.emoji.trim() ? { emoji: row.emoji.trim() } : {},
        },
        { onConflict: "catalog_key,code" },
      );

      if (error) {
        setMsg(getErrorMessage(error, "No se pudo guardar el elemento."));
        return;
      }

      await loadElements();
      setMsg(`Elemento actualizado: ${row.label}.`);
    } finally {
      setSavingElementCode(null);
    }
  }

  async function createElementRow() {
    const rawCode = newElementDraft.code.trim() || newElementDraft.label.trim();
    const code = normalizeElementCode(rawCode);
    if (!rawCode || !code) {
      setMsg("Pon un código o nombre base para el elemento.");
      return;
    }
    if (elementRows.some((row) => row.code === code)) {
      setMsg("Ese elemento ya existe en la biblioteca canónica.");
      return;
    }

    const row: ElementCatalogRow = {
      code,
      label: newElementDraft.label.trim() || code,
      color: newElementDraft.color.trim() || getElementColor(code),
      icon: null,
      emoji: newElementDraft.emoji.trim() || "\u2728",
      sortOrder: Number.parseInt(newElementDraft.sortOrder || "0", 10) || 100,
      enabled: newElementDraft.enabled,
    };

    setCreatingElement(true);
    setMsg(null);
    try {
      const { error } = await supabase.from("catalog_items").upsert(
        {
          catalog_key: "elements",
          code: row.code,
          label: row.label,
          sort_order: row.sortOrder,
          enabled: row.enabled,
          color: row.color?.trim() || null,
          icon: row.icon?.trim() || null,
          metadata: row.emoji.trim() ? { emoji: row.emoji.trim() } : {},
        },
        { onConflict: "catalog_key,code" },
      );

      if (error) {
        setMsg(getErrorMessage(error, "No se pudo crear el elemento."));
        return;
      }

      await loadElements();
      setNewElementDraft(createEmptyElementDraft());
      setMsg(`Elemento canónico creado: ${row.label}.`);
    } finally {
      setCreatingElement(false);
    }
  }

  async function toggleArchive(row: AdminPlanTypeRow) {
    if (!gardenScopeIds.length || !myProfileId) return;

    setArchivingId(row.id);
    setMsg(null);
    try {
      const { error } = await supabase
        .from("garden_plan_types")
        .update({
          archived_at: row.archivedAt ? null : new Date().toISOString(),
          updated_by_user_id: myProfileId,
        })
        .in("garden_id", row.gardenIds.length ? row.gardenIds : gardenScopeIds)
        .eq("code", row.code);

      if (error) {
        setMsg(getErrorMessage(error, "No se pudo actualizar el estado del tipo de plan."));
        return;
      }

      const nextRows = await refresh(myProfileId, showArchived);
      setSelectedRowId(nextRows.find((entry) => entry.code === row.code)?.id ?? row.id);
      setMsg(row.archivedAt ? "Tipo de plan recuperado." : "Tipo de plan archivado.");
    } finally {
      setArchivingId(null);
    }
  }

  async function saveCurrent() {
    if (editorMode === "create") {
      await createPlanType();
      return;
    }
    if (selectedRow) {
      await saveRow(selectedRow);
    }
  }

  if (loading) {
    return <PageLoadingState message="Cargando contrato visual de flores..." />;
  }

  const currentElement = currentDraft.suggestedElement;
  const currentCategoryLabel = PLAN_TYPE_CATEGORY_LABELS[currentDraft.category];
  const currentFamilyLabel = FLOWER_FAMILY_LABELS[currentDraft.flowerFamily];
  const previewGlow = deriveElementGlow(
    elementColorMap[previewElement] ?? getElementColor(previewElement),
  );
  const stageStyle = previewGlow
    ? {
        background: `radial-gradient(circle at 50% 32%, ${previewGlow.halo} 0%, transparent 42%), linear-gradient(180deg, rgba(255,255,255,0.96), ${previewGlow.wash})`,
        boxShadow: `inset 0 0 0 1px ${previewGlow.edge}`,
      }
    : stageBackgroundStyle(previewElement);
  const currentLabel = currentDraft.label.trim() || "Tipo sin nombre";
  const libraryDescription = `${filteredRows.length} visibles de ${visibleRows.length} tipos dentro de la biblioteca canónica.`;
  const previewElementLabel = elementLabelMap[previewElement] ?? "Eter";

  return (
    <div className="lv-page h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.88),rgba(232,239,226,0.98))] text-[var(--lv-text)]">
      <div className="relative h-full w-full overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-4 z-30 -translate-x-1/2">
          <div className="pointer-events-auto inline-flex w-max max-w-[calc(100vw-2rem)] flex-wrap items-center justify-center gap-2 rounded-full border border-[var(--lv-border)] bg-[rgba(255,255,255,0.94)] px-3 py-3 shadow-[0_24px_80px_rgba(24,36,26,0.16)] backdrop-blur">
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm text-[var(--lv-text)] transition hover:bg-[var(--lv-surface-soft)]"
            >
              Volver
            </button>
            <ToolbarButton
              active={activePanel === "library"}
              onClick={() => setActivePanel((current) => togglePanel(current, "library"))}
            >
              Biblioteca
            </ToolbarButton>
            <ToolbarButton
              active={activePanel === "inspector"}
              onClick={() => setActivePanel((current) => togglePanel(current, "inspector"))}
            >
              Inspector
            </ToolbarButton>
            <ToolbarButton
              active={activePanel === "elements"}
              onClick={() => setActivePanel((current) => togglePanel(current, "elements"))}
            >
              Elementos
            </ToolbarButton>
            <button
              type="button"
              onClick={() => void saveCurrent()}
              disabled={creating || Boolean(savingId)}
              className="rounded-full border border-[var(--lv-primary)] bg-[var(--lv-primary-soft)] px-4 py-2 text-sm font-medium text-[var(--lv-primary-strong)] transition hover:bg-[rgba(233,243,234,0.96)] disabled:opacity-60"
            >
              {creating || savingId
                ? "Guardando..."
                : editorMode === "create"
                  ? "Crear tipo"
                  : "Guardar"}
            </button>
          </div>
        </div>

        {msg ? (
          <StatusNotice
            message={msg}
            className="absolute left-1/2 top-24 z-30 w-[min(720px,calc(100%-2rem))] -translate-x-1/2"
          />
        ) : null}

        {activePanel === "library" ? (
          <FloatingPanel
            title="Biblioteca viva"
            description="Aquí vive la verdad visual de semillas y flores de planes en toda la app."
            onClose={() => setActivePanel(null)}
            onHeaderPointerDown={(event) => startPanelDrag("library", event)}
            style={panelStyle("library")}
            className="left-4 top-24 w-[390px] max-h-[calc(100dvh-140px)]"
            bodyClassName="space-y-3"
            actions={
              <>
                <button
                  type="button"
                  className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm text-[var(--lv-text)]"
                  onClick={beginCreate}
                >
                  Nuevo tipo
                </button>
                <button
                  type="button"
                  className={`rounded-full border px-4 py-2 text-sm ${
                    showArchived
                      ? "border-[var(--lv-primary)] bg-[var(--lv-primary-soft)] text-[var(--lv-primary-strong)]"
                      : "border-[var(--lv-border)] bg-[var(--lv-surface)] text-[var(--lv-text)]"
                  }`}
                  onClick={() => setShowArchived((value) => !value)}
                >
                  {showArchived ? "Ocultar archivados" : "Ver archivados"}
                </button>
              </>
            }
          >
              <div className="space-y-3">
                <div className="grid gap-3">
                  <div className="space-y-2">
                    <div className="text-sm text-[var(--lv-text-muted)]">Navegar por categoría</div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setCategoryFilter("all")}
                        className={`rounded-full border px-3 py-2 text-sm transition ${
                          categoryFilter === "all"
                            ? "border-[var(--lv-primary)] bg-[var(--lv-primary-soft)] text-[var(--lv-primary-strong)]"
                            : "border-[var(--lv-border)] bg-[var(--lv-surface)] text-[var(--lv-text)] hover:bg-[var(--lv-surface-soft)]"
                        }`}
                      >
                        Todas
                        <span className="ml-2 text-[var(--lv-text-muted)]">
                          {preCategoryRows.length}
                        </span>
                      </button>
                      {CATEGORY_ORDER.map((category) => {
                        const count = categoryCounts[category] ?? 0;
                        return (
                          <button
                            key={category}
                            type="button"
                            onClick={() => setCategoryFilter(category)}
                            className={`rounded-full border px-3 py-2 text-sm transition ${
                              categoryFilter === category
                                ? "border-[var(--lv-primary)] bg-[var(--lv-primary-soft)] text-[var(--lv-primary-strong)]"
                                : "border-[var(--lv-border)] bg-[var(--lv-surface)] text-[var(--lv-text)] hover:bg-[var(--lv-surface-soft)]"
                            }`}
                          >
                            {PLAN_TYPE_CATEGORY_LABELS[category]}
                            <span className="ml-2 text-[var(--lv-text-muted)]">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="space-y-1 text-sm">
                    <div className="text-[var(--lv-text-muted)]">Buscar</div>
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    className="lv-input"
                    placeholder="Código, familia, categoría o descripción"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1 text-sm">
                    <div className="text-[var(--lv-text-muted)]">Elemento</div>
                    <select
                      className="lv-select"
                      value={elementFilter}
                      onChange={(event) => setElementFilter(event.target.value as ElementFilter)}
                    >
                      <option value="all">Todos</option>
                      {elementOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-sm">
                    <div className="text-[var(--lv-text-muted)]">Familia</div>
                    <select
                      className="lv-select"
                      value={familyFilter}
                      onChange={(event) => setFamilyFilter(event.target.value as FamilyFilter)}
                    >
                      <option value="all">Todas</option>
                      {FLOWER_FAMILY_ORDER.map((family) => (
                        <option key={family} value={family}>
                          {FLOWER_FAMILY_LABELS[family]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <button
                  type="button"
                  className={`rounded-full border px-4 py-2 text-sm ${
                    onlyCustom
                      ? "border-[var(--lv-primary)] bg-[var(--lv-primary-soft)] text-[var(--lv-primary-strong)]"
                      : "border-[var(--lv-border)] bg-[var(--lv-surface)] text-[var(--lv-text)]"
                  }`}
                  onClick={() => setOnlyCustom((value) => !value)}
                >
                  {onlyCustom ? "Solo personalizados" : "Mostrar también canónicos"}
                </button>
                <button
                  type="button"
                  className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm text-[var(--lv-text)]"
                  onClick={() => {
                    setSearch("");
                    setCategoryFilter("all");
                    setElementFilter("all");
                    setFamilyFilter("all");
                    setOnlyCustom(false);
                  }}
                >
                  Limpiar filtros
                </button>
              </div>

              <div className="rounded-[22px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 py-3 text-sm text-[var(--lv-text-muted)]">
                {libraryDescription}
              </div>

              {groupedRows.length ? (
                groupedRows.map((group) => (
                  <div key={group.category} className="space-y-2">
                    <button
                      type="button"
                      onClick={() => toggleCategoryCollapse(group.category)}
                      className="flex w-full items-center justify-between rounded-[18px] border border-[var(--lv-border)] bg-[rgba(255,255,255,0.76)] px-3 py-2 text-left"
                    >
                      <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--lv-text-muted)]">
                        {PLAN_TYPE_CATEGORY_LABELS[group.category]}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[var(--lv-text-muted)]">
                        <span>{group.items.length}</span>
                        <span>{collapsedCategories[group.category] ? "Abrir" : "Cerrar"}</span>
                      </div>
                    </button>
                    {collapsedCategories[group.category]
                      ? null
                      : group.items.map((row) => {
                      const draft = drafts[row.id] ?? toDraft(row);
                      const previewSrc = resolvePlanFlowerAssetPath({
                        planFlowerAssetPath: draft.flowerAssetPath,
                        planFlowerBuilderConfig: draft.flowerBuilderConfig,
                        planCategory: draft.category,
                        planFlowerFamily: draft.flowerFamily,
                        planSuggestedElement: draft.suggestedElement,
                        rating: 3,
                      });
                      const seedPreviewSrc = resolvePlanSeedAssetPath({
                        planSeedAssetPath: draft.seedAssetPath,
                        planCategory: draft.category,
                        planFlowerFamily: draft.flowerFamily,
                        planSuggestedElement: draft.suggestedElement,
                      });
                      const selected = editorMode === "edit" && selectedRowId === row.id;
                      return (
                        <div
                          key={row.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleSelectRow(row.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              handleSelectRow(row.id);
                            }
                          }}
                          className={`flex w-full cursor-pointer items-start gap-3 rounded-[26px] border p-3 text-left shadow-[var(--lv-shadow-sm)] transition ${
                            selected
                              ? "border-[var(--lv-primary)] bg-[var(--lv-primary-soft)]"
                              : "border-[var(--lv-border)] bg-[var(--lv-surface)] hover:bg-[var(--lv-surface-soft)]"
                          }`}
                        >
                          <div className="relative flex h-[78px] w-[78px] shrink-0 items-center justify-center rounded-[22px] border border-[var(--lv-border)] bg-white/88">
                            <img src={previewSrc} alt="" className="h-14 w-14 object-contain" />
                            <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-[14px] border border-[var(--lv-border)] bg-[rgba(255,255,255,0.96)] shadow-[var(--lv-shadow-sm)]">
                              <img src={seedPreviewSrc} alt="" className="h-5 w-5 object-contain" />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-[var(--lv-text)]">
                                  {draft.label}
                                </div>
                                <div className="mt-1 text-xs text-[var(--lv-text-muted)]">
                                  {row.code}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  beginCreateFromRow(row);
                                }}
                                className="shrink-0 rounded-full border border-[var(--lv-border)] bg-[rgba(255,255,255,0.9)] px-3 py-1 text-xs text-[var(--lv-text)] transition hover:bg-white"
                              >
                                Duplicar
                              </button>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <SmallMetaChip active={selected}>
                                {PLAN_TYPE_CATEGORY_LABELS[draft.category]}
                              </SmallMetaChip>
                              <SmallMetaChip>
                                {elementLabelMap[draft.suggestedElement] ?? draft.suggestedElement}
                              </SmallMetaChip>
                              <SmallMetaChip>
                                {FLOWER_FAMILY_LABELS[draft.flowerFamily]}
                              </SmallMetaChip>
                              {row.isCustom ? <SmallMetaChip>Custom</SmallMetaChip> : null}
                              {row.archivedAt ? <SmallMetaChip>Archivado</SmallMetaChip> : null}
                            </div>
                            {draft.description ? (
                              <div className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--lv-text-muted)]">
                                {draft.description}
                              </div>
                            ) : (
                              <div className="mt-2 text-sm text-[var(--lv-text-muted)]">
                                Sin descripcion todavia.
                              </div>
                            )}
                            <div className="mt-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                              <span>Escala</span>
                              <div className="flex items-center gap-1">
                                {([1, 3, 5] as const).map((rating) => (
                                  <div
                                    key={rating}
                                    className="flex h-8 w-8 items-center justify-center rounded-[12px] border border-[var(--lv-border)] bg-white/78"
                                  >
                                    <img
                                      src={resolvePlanFlowerAssetPath({
                                        planFlowerAssetPath: draft.flowerAssetPath,
                                        planFlowerBuilderConfig: draft.flowerBuilderConfig,
                                        planCategory: draft.category,
                                        planFlowerFamily: draft.flowerFamily,
                                        planSuggestedElement: draft.suggestedElement,
                                        rating,
                                      })}
                                      alt=""
                                      className="h-5 w-5 object-contain"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-4 text-sm text-[var(--lv-text-muted)]">
                  No hay tipos de plan para este filtro todavia.
                </div>
              )}
            </div>
          </FloatingPanel>
        ) : null}

        {activePanel === "elements" ? (
          <FloatingPanel
            title="Elementos canónicos"
            description="Aquí editas y amplias la capa canónica global de elementos. Si un elemento existe, plan-types, page, trail y el resto deberian leerlo desde esta misma biblioteca."
            onClose={() => setActivePanel(null)}
            onHeaderPointerDown={(event) => startPanelDrag("elements", event)}
            style={panelStyle("elements")}
            className="right-4 top-24 w-[400px] max-h-[calc(100dvh-140px)]"
            bodyClassName="space-y-3"
          >
            <div className="space-y-3">
              <div className="rounded-[22px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4">
                <div className="text-sm font-semibold text-[var(--lv-text)]">Nuevo elemento</div>
                <div className="mt-1 text-sm leading-6 text-[var(--lv-text-muted)]">
                  Crea un elemento global y pruebalo enseguida dentro de la flor generativa.
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <label className="space-y-1 text-sm">
                    <div className="text-[var(--lv-text-muted)]">Codigo</div>
                    <input
                      className="lv-input"
                      value={newElementDraft.code}
                      onChange={(event) =>
                        setNewElementDraft((current) => ({ ...current, code: event.target.value }))
                      }
                      placeholder="dream"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <div className="text-[var(--lv-text-muted)]">Label</div>
                    <input
                      className="lv-input"
                      value={newElementDraft.label}
                      onChange={(event) =>
                        setNewElementDraft((current) => ({ ...current, label: event.target.value }))
                      }
                      placeholder="Sueno"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <div className="text-[var(--lv-text-muted)]">Emoji</div>
                    <input
                      className="lv-input"
                      value={newElementDraft.emoji}
                      onChange={(event) =>
                        setNewElementDraft((current) => ({ ...current, emoji: event.target.value }))
                      }
                      placeholder="*"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <div className="text-[var(--lv-text-muted)]">Orden</div>
                    <input
                      className="lv-input"
                      type="number"
                      value={newElementDraft.sortOrder}
                      onChange={(event) =>
                        setNewElementDraft((current) => ({
                          ...current,
                          sortOrder: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="col-span-2 space-y-1 text-sm">
                    <div className="text-[var(--lv-text-muted)]">Color</div>
                    <input
                      className="lv-input"
                      value={newElementDraft.color}
                      onChange={(event) =>
                        setNewElementDraft((current) => ({ ...current, color: event.target.value }))
                      }
                      placeholder="#dfe8ff"
                    />
                  </label>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm text-[var(--lv-text-muted)]">
                    <input
                      type="checkbox"
                      checked={newElementDraft.enabled}
                      onChange={(event) =>
                        setNewElementDraft((current) => ({
                          ...current,
                          enabled: event.target.checked,
                        }))
                      }
                    />
                    Activo desde el inicio
                  </label>
                  <button
                    type="button"
                    onClick={() => void createElementRow()}
                    disabled={creatingElement}
                    className="rounded-full border border-[var(--lv-primary)] bg-[var(--lv-primary-soft)] px-4 py-2 text-sm font-medium text-[var(--lv-primary-strong)]"
                  >
                    {creatingElement ? "Creando..." : "Crear elemento"}
                  </button>
                </div>
              </div>

              {elementRows
                .slice()
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((row) => (
                  <div
                    key={row.code}
                    className="rounded-[22px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-[var(--lv-text)]">
                          {row.label}
                        </div>
                        <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                          {row.code}
                        </div>
                      </div>
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-[var(--lv-border)]"
                        style={{ background: row.color ?? "rgba(255,255,255,0.9)" }}
                      >
                        <span className="text-lg">{row.emoji || "•"}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="space-y-1 text-sm">
                        <div className="text-[var(--lv-text-muted)]">Label</div>
                        <input
                          className="lv-input"
                          value={row.label}
                          onChange={(event) =>
                            updateElementRow(row.code, { label: event.target.value })
                          }
                        />
                      </label>
                      <label className="space-y-1 text-sm">
                        <div className="text-[var(--lv-text-muted)]">Emoji</div>
                        <input
                          className="lv-input"
                          value={row.emoji}
                          onChange={(event) =>
                            updateElementRow(row.code, { emoji: event.target.value })
                          }
                        />
                      </label>
                      <label className="space-y-1 text-sm">
                        <div className="text-[var(--lv-text-muted)]">Color</div>
                        <input
                          className="lv-input"
                          value={row.color ?? ""}
                          onChange={(event) =>
                            updateElementRow(row.code, { color: event.target.value })
                          }
                        />
                      </label>
                      <label className="space-y-1 text-sm">
                        <div className="text-[var(--lv-text-muted)]">Orden</div>
                        <input
                          className="lv-input"
                          type="number"
                          value={row.sortOrder}
                          onChange={(event) =>
                            updateElementRow(row.code, {
                              sortOrder: Number.parseInt(event.target.value || "0", 10) || 0,
                            })
                          }
                        />
                      </label>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-sm text-[var(--lv-text-muted)]">
                        <input
                          type="checkbox"
                          checked={row.enabled}
                          onChange={(event) =>
                            updateElementRow(row.code, { enabled: event.target.checked })
                          }
                        />
                        Activo
                      </label>
                      <button
                        type="button"
                        onClick={() => void saveElementRow(row)}
                        disabled={savingElementCode === row.code}
                        className="rounded-full border border-[var(--lv-primary)] bg-[var(--lv-primary-soft)] px-4 py-2 text-sm font-medium text-[var(--lv-primary-strong)]"
                      >
                        {savingElementCode === row.code ? "Guardando..." : "Guardar"}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </FloatingPanel>
        ) : null}

        {activePanel === "inspector" ? (
          <FloatingPanel
            title={editorMode === "create" ? "Nuevo tipo de plan" : "Inspector visual"}
            description={
              editorMode === "create"
                ? "Crea un tipo nuevo y define aquí su contrato de semilla, flor y combinaciones."
                : "Edita la verdad visual que consumen seeds, page, trail, year, forest y pdf."
            }
            onClose={() => setActivePanel(null)}
            onHeaderPointerDown={(event) => startPanelDrag("inspector", event)}
            style={panelStyle("inspector")}
            className="right-4 top-24 w-[440px] max-h-[calc(100dvh-140px)]"
            bodyClassName="space-y-4"
            actions={
              <>
                <button
                  type="button"
                  className="rounded-full border border-[var(--lv-primary)] bg-[var(--lv-primary-soft)] px-4 py-2 text-sm font-medium text-[var(--lv-primary-strong)]"
                  onClick={() => void saveCurrent()}
                >
                  {editorMode === "create" ? "Crear" : "Guardar"}
                </button>
                {selectedRow ? (
                  <button
                    type="button"
                    className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm text-[var(--lv-text)]"
                    onClick={() => beginCreateFromRow(selectedRow)}
                  >
                    Duplicar
                  </button>
                ) : null}
                {selectedRow ? (
                  <button
                    type="button"
                    className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm text-[var(--lv-text)]"
                    onClick={() => void toggleArchive(selectedRow)}
                    disabled={archivingId === selectedRow.id}
                  >
                    {archivingId === selectedRow.id
                      ? "Actualizando..."
                      : selectedRow.archivedAt
                        ? "Recuperar"
                        : "Archivar"}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm text-[var(--lv-text)]"
                  onClick={resetCurrentDraftToCanonical}
                >
                  Plantilla canonica
                </button>
              </>
            }
          >
            <div className="space-y-4">
              <div className="rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 py-4">
                <div className="text-sm font-semibold text-[var(--lv-text)]">Cómo se lee esta página</div>
                <div className="mt-2 space-y-2 text-sm leading-6 text-[var(--lv-text-muted)]">
                  <p>1. Un tipo de plan define una flor base y una semilla base.</p>
                  <p>2. Luego eliges una variante concreta por elemento y estrellas.</p>
                  <p>3. Solo si quieres refinar esa variante, bajas al compositor por partes.</p>
                </div>
              </div>

              <div className="rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 py-4">
                <div className="text-sm font-semibold text-[var(--lv-text)]">
                  Variante que estas editando
                </div>
                <div className="mt-1 text-sm leading-6 text-[var(--lv-text-muted)]">
                  Todo lo que cambies ahora afecta solo a esta combinacion concreta de elemento y escala.
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <label className="space-y-1 text-sm">
                    <div className="font-medium text-[var(--lv-text)]">Elemento en preview</div>
                    <select
                      className="lv-select"
                      value={previewElement}
                      onChange={(event) => setPreviewElementOverride(event.target.value as ElementKind)}
                    >
                      {elementOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-sm">
                    <div className="font-medium text-[var(--lv-text)]">Escala activa</div>
                    <select
                      className="lv-select"
                      value={previewRating}
                      onChange={(event) => setPreviewRating(Number(event.target.value) as (typeof STAR_OPTIONS)[number])}
                    >
                      {STAR_OPTIONS.map((rating) => (
                        <option key={rating} value={rating}>
                          {rating} estrella{rating === 1 ? "" : "s"}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewElementOverride(currentDraft.suggestedElement)}
                    className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-1.5 text-xs text-[var(--lv-text)]"
                  >
                    Usar elemento del tipo
                  </button>
                  <SmallMetaChip active>
                    {elementLabelMap[previewElement] ?? previewElement} / {previewRating}
                  </SmallMetaChip>
                </div>
              </div>

              <label className="space-y-1 text-sm">
                <div className="font-medium text-[var(--lv-text)]">Nombre visible</div>
                <input
                  className="lv-input"
                  value={currentDraft.label}
                  onChange={(event) =>
                    editorMode === "create"
                      ? updateCreateDraft({ label: event.target.value })
                      : selectedRowId
                        ? updateRowDraft(selectedRowId, { label: event.target.value })
                        : undefined
                  }
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-sm">
                  <div className="font-medium text-[var(--lv-text)]">Categoria</div>
                  <select
                    className="lv-select"
                    value={currentDraft.category}
                    onChange={(event) =>
                      editorMode === "create"
                        ? updateCreateDraft({ category: event.target.value as PlanTypeCategory })
                        : selectedRowId
                          ? updateRowDraft(selectedRowId, {
                              category: event.target.value as PlanTypeCategory,
                            })
                          : undefined
                    }
                  >
                    {CATEGORY_ORDER.map((category) => (
                      <option key={category} value={category}>
                        {PLAN_TYPE_CATEGORY_LABELS[category]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <div className="font-medium text-[var(--lv-text)]">Elemento</div>
                  <select
                    className="lv-select"
                    value={currentDraft.suggestedElement}
                    onChange={(event) =>
                      editorMode === "create"
                        ? updateCreateDraft({ suggestedElement: event.target.value as ElementKind })
                        : selectedRowId
                          ? updateRowDraft(selectedRowId, {
                              suggestedElement: event.target.value as ElementKind,
                            })
                          : undefined
                    }
                  >
                    {elementOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <div className="font-medium text-[var(--lv-text)]">Familia floral</div>
                  <select
                    className="lv-select"
                    value={currentDraft.flowerFamily}
                    onChange={(event) =>
                      editorMode === "create"
                        ? updateCreateDraft({ flowerFamily: event.target.value as FlowerFamily })
                        : selectedRowId
                          ? updateRowDraft(selectedRowId, {
                              flowerFamily: event.target.value as FlowerFamily,
                            })
                          : undefined
                    }
                  >
                    {FLOWER_FAMILY_ORDER.map((family) => (
                      <option key={family} value={family}>
                        {FLOWER_FAMILY_LABELS[family]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <div className="font-medium text-[var(--lv-text)]">Orden</div>
                  <input
                    className="lv-input"
                    type="number"
                    value={currentDraft.sortOrder}
                    onChange={(event) =>
                      editorMode === "create"
                        ? updateCreateDraft({ sortOrder: event.target.value })
                        : selectedRowId
                          ? updateRowDraft(selectedRowId, { sortOrder: event.target.value })
                          : undefined
                    }
                  />
                </label>
              </div>

              <details className="rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium text-[var(--lv-text)]">
                  Meta y copy
                </summary>
                <div className="mt-4 space-y-4">
                  <label className="space-y-1 text-sm">
                    <div className="font-medium text-[var(--lv-text)]">Descripcion</div>
                    <textarea
                      className="lv-textarea min-h-[108px]"
                      value={currentDraft.description}
                      onChange={(event) =>
                        editorMode === "create"
                          ? updateCreateDraft({ description: event.target.value })
                          : selectedRowId
                            ? updateRowDraft(selectedRowId, { description: event.target.value })
                            : undefined
                      }
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <div className="font-medium text-[var(--lv-text)]">Emoji / marca</div>
                    <input
                      className="lv-input"
                      value={currentDraft.iconEmoji}
                      onChange={(event) =>
                        editorMode === "create"
                          ? updateCreateDraft({ iconEmoji: event.target.value })
                          : selectedRowId
                            ? updateRowDraft(selectedRowId, { iconEmoji: event.target.value })
                            : undefined
                      }
                    />
                  </label>
                </div>
              </details>

              <details
                open
                className="rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-3"
              >
                <summary className="cursor-pointer text-sm font-medium text-[var(--lv-text)]">
                  Compositor por partes de esta variante
                </summary>
                <div className="mt-4 space-y-4">
                  <div className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 py-3 text-sm text-[var(--lv-text-muted)]">
                    <div>
                      Editas la combinacion exacta de{" "}
                      <span className="font-medium text-[var(--lv-text)]">
                        {elementLabelMap[previewElement] ?? previewElement}
                      </span>{" "}
                      en{" "}
                      <span className="font-medium text-[var(--lv-text)]">
                        {previewRating} estrella{previewRating === 1 ? "" : "s"}
                      </span>
                      . Si un slot no tiene asset, sigue usando la flor generativa canonica.
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <SmallMetaChip active={activeVariantCustomSlotCount > 0}>
                        {activeVariantCustomSlotCount} slot{activeVariantCustomSlotCount === 1 ? "" : "s"} tocados
                      </SmallMetaChip>
                      <button
                        type="button"
                        onClick={resetCurrentVariantComposer}
                        className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-1.5 text-xs text-[var(--lv-text)]"
                      >
                        Reset variante
                      </button>
                    </div>
                  </div>

                  {PLAN_FLOWER_SLOT_KEYS.map((slot) => {
                    const slotConfig =
                      activeVariantSlots[slot] ?? createDefaultPlanFlowerSlotConfig();
                    return (
                      <details
                        key={slot}
                        className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 py-3"
                      >
                        <summary className="cursor-pointer text-sm font-medium text-[var(--lv-text)]">
                          {PLAN_FLOWER_SLOT_LABELS[slot]}
                        </summary>
                        <div className="mt-4 space-y-4">
                          <label className="flex items-center gap-2 text-sm text-[var(--lv-text-muted)]">
                            <input
                              type="checkbox"
                              checked={slotConfig.enabled}
                              onChange={(event) =>
                                updateCurrentVariantSlot(slot, { enabled: event.target.checked })
                              }
                            />
                            Slot activo
                          </label>

                          <label className="space-y-1 text-sm">
                            <div className="font-medium text-[var(--lv-text)]">Asset del slot</div>
                            <div className="flex items-center gap-2">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-[var(--lv-border)] bg-white/80">
                                {slotConfig.assetPath ? (
                                  <img
                                    src={slotConfig.assetPath}
                                    alt=""
                                    className="h-9 w-9 object-contain"
                                  />
                                ) : (
                                  <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
                                    Auto
                                  </span>
                                )}
                              </div>
                              <input
                                className="lv-input flex-1"
                                value={slotConfig.assetPath}
                                placeholder="Vacio = usa el builder canónico"
                                onChange={(event) =>
                                  updateCurrentVariantSlot(slot, {
                                    assetPath: event.target.value,
                                  })
                                }
                              />
                              <button
                                type="button"
                                onClick={() => setAssetPickerSlot(slot)}
                                className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2 text-sm text-[var(--lv-text)]"
                              >
                                Elegir asset
                              </button>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => updateCurrentVariantSlot(slot, { assetPath: "" })}
                                className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-1.5 text-xs text-[var(--lv-text)]"
                              >
                                Limpiar asset
                              </button>
                            </div>
                          </label>

                          <div className="grid grid-cols-2 gap-3">
                            <label className="space-y-1 text-sm">
                              <div className="font-medium text-[var(--lv-text)]">Escala slot</div>
                              <input
                                className="lv-input"
                                type="number"
                                step="0.1"
                                min="0.2"
                                max="4"
                                value={slotConfig.scale}
                                onChange={(event) =>
                                  updateCurrentVariantSlot(slot, {
                                    scale: Number(event.target.value || "1"),
                                  })
                                }
                              />
                            </label>
                            <label className="space-y-1 text-sm">
                              <div className="font-medium text-[var(--lv-text)]">Opacidad</div>
                              <input
                                className="lv-input"
                                type="number"
                                step="0.05"
                                min="0"
                                max="1"
                                value={slotConfig.opacity}
                                onChange={(event) =>
                                  updateCurrentVariantSlot(slot, {
                                    opacity: Number(event.target.value || "1"),
                                  })
                                }
                              />
                            </label>
                            <label className="space-y-1 text-sm">
                              <div className="font-medium text-[var(--lv-text)]">Offset X</div>
                              <input
                                className="lv-input"
                                type="number"
                                step="1"
                                min="-200"
                                max="200"
                                value={slotConfig.offsetX}
                                onChange={(event) =>
                                  updateCurrentVariantSlot(slot, {
                                    offsetX: Number(event.target.value || "0"),
                                  })
                                }
                              />
                            </label>
                            <label className="space-y-1 text-sm">
                              <div className="font-medium text-[var(--lv-text)]">Offset Y</div>
                              <input
                                className="lv-input"
                                type="number"
                                step="1"
                                min="-200"
                                max="200"
                                value={slotConfig.offsetY}
                                onChange={(event) =>
                                  updateCurrentVariantSlot(slot, {
                                    offsetY: Number(event.target.value || "0"),
                                  })
                                }
                              />
                            </label>
                            <label className="space-y-1 text-sm">
                              <div className="font-medium text-[var(--lv-text)]">Rotacion</div>
                              <input
                                className="lv-input"
                                type="number"
                                step="1"
                                min="-180"
                                max="180"
                                value={slotConfig.rotation}
                                onChange={(event) =>
                                  updateCurrentVariantSlot(slot, {
                                    rotation: Number(event.target.value || "0"),
                                  })
                                }
                              />
                            </label>
                          </div>
                        </div>
                      </details>
                    );
                  })}
                </div>
              </details>

              <details className="rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium text-[var(--lv-text)]">
                  Builder avanzado
                </summary>
                <div className="mt-4 space-y-4">
                  <label className="space-y-1 text-sm">
                    <div className="font-medium text-[var(--lv-text)]">Asset de flor / plantilla</div>
                    <input
                      className="lv-input"
                      value={currentDraft.flowerAssetPath}
                      onChange={(event) =>
                        editorMode === "create"
                          ? updateCreateDraft({ flowerAssetPath: event.target.value })
                          : selectedRowId
                            ? updateRowDraft(selectedRowId, { flowerAssetPath: event.target.value })
                            : undefined
                      }
                    />
                    <div className="text-xs leading-6 text-[var(--lv-text-muted)]">
                      Builder con {"{category}"}, {"{element}"}, {"{flower_family}"} y {"{rating}"}.
                    </div>
                  </label>

                  <label className="space-y-1 text-sm">
                    <div className="font-medium text-[var(--lv-text)]">Asset de semilla / plantilla</div>
                    <input
                      className="lv-input"
                      value={currentDraft.seedAssetPath}
                      onChange={(event) =>
                        editorMode === "create"
                          ? updateCreateDraft({ seedAssetPath: event.target.value })
                          : selectedRowId
                            ? updateRowDraft(selectedRowId, { seedAssetPath: event.target.value })
                            : undefined
                      }
                    />
                    <div className="text-xs leading-6 text-[var(--lv-text-muted)]">
                      Builder con {"{category}"}, {"{element}"} y {"{flower_family}"}.
                    </div>
                  </label>
                </div>
              </details>

              <div className="rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 py-3 text-sm text-[var(--lv-text-muted)]">
                <span className="font-medium text-[var(--lv-text)]">
                  {selectedRow ? `Código: ${selectedRow.code}` : "El código se genera al guardar"}
                </span>
                <span className="ml-2">
                  {selectedRow
                    ? "Contrato visual canónico global."
                    : "Contrato visual canónico de semillas y flores."}
                </span>
              </div>
            </div>
          </FloatingPanel>
        ) : null}

        {assetPickerSlot ? (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/35 p-4">
            <div className="max-h-[86vh] w-full max-w-[1040px] overflow-hidden rounded-[28px] border bg-white shadow-2xl">
              <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
                <div>
                  <div className="text-lg font-semibold">Elegir asset del slot</div>
                  <div className="text-sm text-slate-500">
                    Biblioteca persistida para {PLAN_FLOWER_SLOT_LABELS[assetPickerSlot]}. No tira de `public`.
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-2xl border px-3 py-2 text-sm"
                  onClick={() => setAssetPickerSlot(null)}
                >
                  Cerrar
                </button>
              </div>

              <div className="border-b px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={assetLibrarySearch}
                    onChange={(event) => setAssetLibrarySearch(event.target.value)}
                    className="lv-input min-w-[240px] flex-1"
                    placeholder="Buscar asset por nombre o slot"
                  />
                  <input
                    ref={slotAssetInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleUploadSlotAsset(file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => slotAssetInputRef.current?.click()}
                    disabled={uploadingSlotAsset}
                    className="rounded-full border border-[var(--lv-primary)] bg-[var(--lv-primary-soft)] px-4 py-2 text-sm font-medium text-[var(--lv-primary-strong)]"
                  >
                    {uploadingSlotAsset ? "Subiendo..." : "Subir asset"}
                  </button>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {filteredAssetLibraryRows.length} asset(s) visibles para este slot
                </div>
              </div>

              <div className="grid max-h-[72vh] grid-cols-2 gap-3 overflow-auto p-4 md:grid-cols-4">
                {filteredAssetLibraryRows.map((asset) => (
                  <div
                    key={asset.code}
                    className="rounded-2xl border p-3 text-left transition hover:bg-slate-50"
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => applyPickedSlotAsset(asset.src)}
                    >
                      <div className="flex h-28 items-center justify-center rounded-2xl border bg-[#f8faf6]">
                        <img src={asset.src} alt="" className="max-h-24 max-w-full object-contain" />
                      </div>
                      <div className="mt-2 truncate text-sm font-medium">{asset.label}</div>
                      <div className="text-xs text-slate-500">
                        {asset.slot === "all" ? "General" : PLAN_FLOWER_SLOT_LABELS[asset.slot]}
                      </div>
                    </button>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="truncate text-xs text-slate-500">{assetFilename(asset.src)}</div>
                      <button
                        type="button"
                        onClick={() => void deleteSlotAsset(asset)}
                        disabled={deletingSlotAssetCode === asset.code}
                        className="rounded-full border border-[var(--lv-border)] bg-white px-3 py-1 text-xs text-[var(--lv-text)]"
                      >
                        {deletingSlotAssetCode === asset.code ? "Borrando..." : "Borrar"}
                      </button>
                    </div>
                  </div>
                ))}
                {filteredAssetLibraryRows.length === 0 ? (
                  <div className="col-span-full rounded-2xl border border-dashed p-6 text-sm text-slate-500">
                    No hay assets para este filtro. Sube uno nuevo y quedara guardado en la biblioteca canónica.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <div className="absolute inset-0 overflow-auto px-6 pb-28 pt-24">
          <div className="mx-auto flex min-h-full w-full max-w-[1600px] items-center justify-center">
            <div
              className="relative w-full overflow-hidden rounded-[44px] border border-[var(--lv-border)] px-8 pb-10 pt-8 shadow-[0_30px_90px_rgba(21,36,24,0.1)]"
              style={stageStyle}
            >
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--lv-text-muted)]">
                    Contrato visual canonico
                  </div>
                  <h1 className="mt-2 text-5xl font-semibold tracking-[-0.04em] text-[var(--lv-text)]">
                    {currentLabel}
                  </h1>
                  <p className="mt-4 max-w-3xl text-xl leading-9 text-[var(--lv-text-muted)]">
                    {currentDraft.description.trim() ||
                      "Esta flor se resuelve por categoría, elemento, familia floral y estrellas. Todo el proyecto debería leerla desde aquí."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <SmallMetaChip active>Paso 1: este tipo define la base</SmallMetaChip>
                    <SmallMetaChip active>Paso 2: elemento + estrellas crean la variante</SmallMetaChip>
                    <SmallMetaChip active>Paso 3: el compositor solo refina esa variante</SmallMetaChip>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <SurfaceChip label="Categoria" value={currentCategoryLabel} />
                  <SurfaceChip
                    label="Elemento"
                    value={
                      elementLabelMap[currentDraft.suggestedElement] ?? "Eter"
                    }
                  />
                  <SurfaceChip label="Familia" value={currentFamilyLabel} />
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
                <div className="flex min-h-[620px] flex-col items-center justify-center gap-8 rounded-[36px] border border-[rgba(255,255,255,0.56)] bg-[rgba(255,255,255,0.5)] px-6 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                  <div className="flex h-[390px] w-[390px] items-center justify-center rounded-[999px] border border-[rgba(255,255,255,0.62)] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.98),rgba(255,255,255,0.56))] shadow-[0_34px_90px_rgba(21,36,24,0.14)]">
                    <img
                      src={currentFlowerSrc}
                      alt=""
                      className="h-[320px] w-[320px] object-contain"
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--lv-text-muted)]">
                      Variante activa
                    </div>
                    <div className="mt-2 text-xl font-semibold text-[var(--lv-text)]">
                      {previewElementLabel} · {previewRating} estrella{previewRating === 1 ? "" : "s"}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-[var(--lv-text-muted)]">
                      Categoria como silueta, elemento como paleta, familia como matiz y estrellas como madurez.
                    </div>
                    <div className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                      {activeVariantCustomSlotCount > 0
                        ? `${activeVariantCustomSlotCount} slot${activeVariantCustomSlotCount === 1 ? "" : "s"} personalizados`
                        : "Sin overrides: usa la flor canónica generativa"}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[30px] border border-[var(--lv-border)] bg-[rgba(255,255,255,0.88)] p-5 shadow-[var(--lv-shadow-sm)] backdrop-blur">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--lv-text-muted)]">
                          Editor de variante
                        </div>
                        <div className="mt-2 text-sm leading-6 text-[var(--lv-text-muted)]">
                          Selecciona elemento y escala para editar la variante exacta de la flor.
                        </div>
                      </div>
                      <SmallMetaChip active>
                        {elementLabelMap[previewElement] ?? previewElement} / {previewRating}
                      </SmallMetaChip>
                    </div>

                    <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                      Escala 1 {"->"} 5
                    </div>
                    <div className="mt-3 grid grid-cols-5 gap-2">
                      {flowerVariants.map((item) => (
                        <button
                          key={item.rating}
                          type="button"
                          onClick={() => setPreviewRating(item.rating)}
                          className={`rounded-[22px] border p-3 transition ${
                            previewRating === item.rating
                              ? "border-[var(--lv-primary)] bg-[var(--lv-primary-soft)]"
                              : "border-[var(--lv-border)] bg-white/78 hover:bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-center">
                            <img src={item.src} alt="" className="h-16 w-16 object-contain" />
                          </div>
                          <div className="mt-2 text-center text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                            {item.rating}
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="mt-5 text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                      Elemento activo
                    </div>
                    <div className="mt-3 grid grid-cols-5 gap-2">
                      {elementVariants.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setPreviewElementOverride(item.value)}
                          className={`rounded-[22px] border p-3 transition ${
                            previewElement === item.value
                              ? "border-[var(--lv-primary)] bg-[var(--lv-primary-soft)]"
                              : "border-[var(--lv-border)] bg-white/78 hover:bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-center">
                            <img src={item.src} alt="" className="h-16 w-16 object-contain" />
                          </div>
                          <div className="mt-2 text-center text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                            {item.label}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[30px] border border-[var(--lv-border)] bg-[rgba(255,255,255,0.88)] p-5 shadow-[var(--lv-shadow-sm)] backdrop-blur">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--lv-text-muted)]">
                      Semilla base
                    </div>
                    <div className="mt-4 flex items-center gap-4">
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[24px] border border-[var(--lv-border)] bg-white/80">
                        <img src={currentSeedSrc} alt="" className="h-16 w-16 object-contain" />
                      </div>
                      <div className="min-w-0 flex-1 text-sm leading-6 text-[var(--lv-text-muted)]">
                        Primera expresion del mismo contrato visual que luego florece en page y sendero.
                      </div>
                    </div>
                  </div>

                  <ProductMiniPreview
                    title="Lectura en producto"
                    hint="Micro vistas de como este contrato cae en `page` y en el sendero."
                  >
                    <div className="grid gap-3">
                      <div className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-3">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                          Page
                        </div>
                        <div className="mt-3 flex items-start gap-3">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] border border-[var(--lv-border)] bg-white">
                            <img src={currentFlowerSrc} alt="" className="h-11 w-11 object-contain" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-[var(--lv-text)]">
                              {currentLabel}
                            </div>
                            <div className="mt-1 text-sm leading-6 text-[var(--lv-text-muted)]">
                              Recuerdo con identidad botanica coherente desde el primer vistazo.
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-3">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                          Sendero
                        </div>
                        <div className="mt-3 rounded-[18px] border border-[rgba(150,170,150,0.18)] bg-[linear-gradient(180deg,rgba(249,252,246,0.96),rgba(238,244,234,0.92))] px-3 py-4">
                          <div className="relative h-14">
                            <div className="absolute left-2 right-2 top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-[rgba(126,154,118,0.22)]" />
                            <div className="absolute left-[18%] top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-[16px] border border-[var(--lv-border)] bg-white shadow-[var(--lv-shadow-sm)]">
                              <img src={currentFlowerSrc} alt="" className="h-8 w-8 object-contain" />
                            </div>
                          </div>
                          <div className="mt-2 text-sm text-[var(--lv-text-muted)]">
                            La misma flor vive en la ruta sin depender de otra biblioteca paralela.
                          </div>
                        </div>
                      </div>
                    </div>
                  </ProductMiniPreview>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-4 right-4 z-20 flex flex-wrap justify-end gap-2">
          <div className="pointer-events-auto flex flex-wrap gap-2">
            <SummaryPill label="Activos" value={String(stats.active)} />
            <SummaryPill label="Custom" value={String(stats.custom)} />
            <SummaryPill
              label="Contrato"
              value={isDirty ? "Cambios sin guardar" : "Sincronizado"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

