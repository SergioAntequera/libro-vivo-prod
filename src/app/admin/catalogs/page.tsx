"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ensureSuperadminOrRedirect } from "@/lib/auth";
import { AdminPageHero } from "@/components/admin/AdminPageHero";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { StatusNotice } from "@/components/ui/StatusNotice";

type CatalogRow = {
  key: string;
  label: string;
  description: string | null;
  is_active: boolean;
};

type CatalogItemRow = {
  id: string;
  catalog_key: string;
  code: string;
  label: string;
  sort_order: number;
  enabled: boolean;
  color: string | null;
  icon: string | null;
  metadata: Record<string, unknown> | null;
};

type CareNeedDraft = {
  label: string;
  sortOrder: string;
  hint: string;
};

type CatalogSectionKey =
  | "all"
  | "care"
  | "milestones"
  | "timeline"
  | "visual_home"
  | "seeds_calendar"
  | "general"
  | "legacy"
  | "other";

const CATALOG_SECTION_LABELS: Record<CatalogSectionKey, string> = {
  all: "Todos",
  care: "Cuidado",
  milestones: "Hitos y logros",
  timeline: "Timeline",
  visual_home: "Home visual",
  seeds_calendar: "Semillas y calendario",
  general: "Sistema",
  legacy: "Legacy",
  other: "Otros",
};

const CATALOG_SECTION_ORDER: CatalogSectionKey[] = [
  "care",
  "milestones",
  "timeline",
  "visual_home",
  "seeds_calendar",
  "general",
  "legacy",
  "other",
];

const CATALOG_SECTION_BY_KEY: Record<string, CatalogSectionKey> = {
  moods: "care",
  mood_thresholds: "care",
  care_actions: "care",
  care_needs: "care",
  care_texts: "care",
  achievement_kinds: "milestones",
  tiers: "milestones",
  reward_kinds: "milestones",
  seasons: "timeline",
  home_scene_theme: "visual_home",
  home_art_packs: "visual_home",
  home_tree_species: "visual_home",
  home_flower_species: "legacy",
  seed_statuses: "seeds_calendar",
  elements: "general",
  ui_theme_tokens: "general",
};

function resolveCatalogSection(catalogKey: string): CatalogSectionKey {
  return CATALOG_SECTION_BY_KEY[catalogKey] ?? "other";
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

const secondaryActionClass =
  "rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm text-[var(--lv-text)] transition hover:bg-[var(--lv-surface-soft)]";
const primaryActionClass =
  "rounded-[20px] bg-[var(--lv-primary)] px-4 py-2 text-sm text-white transition hover:opacity-90";
const subtleActionClass =
  "rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-3 py-1.5 text-sm text-[var(--lv-text)] transition hover:bg-[var(--lv-surface)]";
const dangerActionClass =
  "rounded-[18px] border border-[var(--lv-danger)] bg-[var(--lv-danger-soft)] px-3 py-1.5 text-sm text-[var(--lv-danger)] transition hover:opacity-90";
const fieldControlClass =
  "w-full rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-3 text-sm text-[var(--lv-text)] outline-none transition placeholder:text-[var(--lv-text-muted)] focus:border-[var(--lv-primary)] focus:bg-[var(--lv-surface-soft)]";
const compactFieldControlClass =
  "w-full rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-2 text-sm text-[var(--lv-text)] outline-none transition placeholder:text-[var(--lv-text-muted)] focus:border-[var(--lv-primary)] focus:bg-[var(--lv-surface-soft)]";
const textareaControlClass =
  "w-full rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-3 text-sm text-[var(--lv-text)] outline-none transition placeholder:text-[var(--lv-text-muted)] focus:border-[var(--lv-primary)] focus:bg-[var(--lv-surface-soft)]";
const tableShellClass = "overflow-auto rounded-[22px] border border-[var(--lv-border)] bg-[var(--lv-surface)]";
const tableHeadClass = "bg-[var(--lv-surface-soft)] text-[var(--lv-text-muted)]";

export default function AdminCatalogsPage() {
  const router = useRouter();

  const [catalogs, setCatalogs] = useState<CatalogRow[]>([]);
  const [items, setItems] = useState<CatalogItemRow[]>([]);
  const [selectedCatalogKey, setSelectedCatalogKey] = useState<string>("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [itemStateFilter, setItemStateFilter] = useState<"all" | "enabled" | "disabled">("all");
  const [catalogSection, setCatalogSection] = useState<CatalogSectionKey>("all");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [careNeedDrafts, setCareNeedDrafts] = useState<Record<string, CareNeedDraft>>({});
  const [showNewCatalogForm, setShowNewCatalogForm] = useState(false);
  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [showNewItemAdvanced, setShowNewItemAdvanced] = useState(false);
  const [showEditAdvanced, setShowEditAdvanced] = useState(false);

  const [newCatalogKey, setNewCatalogKey] = useState("");
  const [newCatalogLabel, setNewCatalogLabel] = useState("");
  const [newCatalogDescription, setNewCatalogDescription] = useState("");

  const [newItemCode, setNewItemCode] = useState("");
  const [newItemLabel, setNewItemLabel] = useState("");
  const [newItemSortOrder, setNewItemSortOrder] = useState("100");
  const [newItemIcon, setNewItemIcon] = useState("");
  const [newItemColor, setNewItemColor] = useState("");
  const [newItemMetadata, setNewItemMetadata] = useState("{}");
  const [editingItem, setEditingItem] = useState<CatalogItemRow | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [editingSortOrder, setEditingSortOrder] = useState("100");
  const [editingIcon, setEditingIcon] = useState("");
  const [editingColor, setEditingColor] = useState("");
  const [editingMetadata, setEditingMetadata] = useState("{}");
  const [savingEdit, setSavingEdit] = useState(false);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<CatalogItemRow | null>(
    null,
  );
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const selectedCatalog = useMemo(
    () => catalogs.find((x) => x.key === selectedCatalogKey) ?? null,
    [catalogs, selectedCatalogKey],
  );

  const filteredCatalogs = useMemo(() => {
    const q = normalizeText(catalogSearch);
    return catalogs.filter((catalog) => {
      const section = resolveCatalogSection(catalog.key);
      if (catalogSection !== "all" && section !== catalogSection) return false;
      if (!q) return true;

      const haystack = [
        normalizeText(catalog.key),
        normalizeText(catalog.label),
        normalizeText(catalog.description),
      ].join(" ");

      return haystack.includes(q);
    });
  }, [catalogSearch, catalogSection, catalogs]);

  const groupedCatalogs = useMemo(() => {
    const groups: Record<CatalogSectionKey, CatalogRow[]> = {
      all: [],
      care: [],
      milestones: [],
      timeline: [],
      visual_home: [],
      seeds_calendar: [],
      general: [],
      legacy: [],
      other: [],
    };

    for (const catalog of filteredCatalogs) {
      groups[resolveCatalogSection(catalog.key)].push(catalog);
    }

    return CATALOG_SECTION_ORDER.map((sectionKey) => ({
      sectionKey,
      label: CATALOG_SECTION_LABELS[sectionKey],
      rows: groups[sectionKey],
    })).filter((group) => group.rows.length > 0);
  }, [filteredCatalogs]);

  const filteredItems = useMemo(() => {
    const q = normalizeText(itemSearch);
    return items.filter((item) => {
      if (itemStateFilter === "enabled" && !item.enabled) return false;
      if (itemStateFilter === "disabled" && item.enabled) return false;
      if (!q) return true;
      const haystack = [
        normalizeText(item.code),
        normalizeText(item.label),
        normalizeText(item.icon),
        normalizeText(item.color),
        normalizeText(JSON.stringify(item.metadata ?? {})),
      ].join(" ");
      return haystack.includes(q);
    });
  }, [itemSearch, itemStateFilter, items]);

  const legacyCatalogCount = useMemo(
    () => catalogs.filter((catalog) => resolveCatalogSection(catalog.key) === "legacy").length,
    [catalogs],
  );

  useEffect(() => {
    if (selectedCatalogKey !== "care_needs") return;

    const next: Record<string, CareNeedDraft> = {};
    for (const item of items) {
      const hint =
        item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
          ? typeof item.metadata.hint === "string"
            ? String(item.metadata.hint)
            : ""
          : "";

      next[item.id] = {
        label: item.label ?? "",
        sortOrder: String(item.sort_order ?? 100),
        hint,
      };
    }

    setCareNeedDrafts(next);
  }, [items, selectedCatalogKey]);

  useEffect(() => {
    (async () => {
      const session = await ensureSuperadminOrRedirect(router);
      if (!session) return;

      await refreshCatalogs();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedCatalogKey) {
      setItems([]);
      return;
    }
    setItemSearch("");
    setItemStateFilter("all");
    setShowNewItemForm(false);
    setShowNewItemAdvanced(false);
    void refreshItems(selectedCatalogKey);
  }, [selectedCatalogKey]);

  async function refreshCatalogs() {
    setMsg(null);
    const { data, error } = await supabase
      .from("catalogs")
      .select("key,label,description,is_active")
      .order("key", { ascending: true });

    if (error) {
      setMsg(
        `No se pudo leer catalogs: ${error.message}. Ejecuta primero supabase/sql/2026-03-05_config_foundation.sql`,
      );
      setCatalogs([]);
      return;
    }

    const next = (data as CatalogRow[] | null) ?? [];
    setCatalogs(next);
    if (!selectedCatalogKey && next.length) setSelectedCatalogKey(next[0].key);
    if (selectedCatalogKey && !next.find((x) => x.key === selectedCatalogKey)) {
      setSelectedCatalogKey(next[0]?.key ?? "");
    }
  }

  async function refreshItems(catalogKey: string) {
    setMsg(null);
    const { data, error } = await supabase
      .from("catalog_items")
      .select("id,catalog_key,code,label,sort_order,enabled,color,icon,metadata")
      .eq("catalog_key", catalogKey)
      .order("sort_order", { ascending: true })
      .order("code", { ascending: true });

    if (error) {
      setMsg(`No se pudo leer catalog_items: ${error.message}`);
      setItems([]);
      return;
    }
    setItems((data as CatalogItemRow[] | null) ?? []);
  }

  async function createCatalog() {
    setMsg(null);
    const key = newCatalogKey.trim().toLowerCase().replace(/\s+/g, "_");
    const label = newCatalogLabel.trim();
    if (!key || !label) {
      setMsg("Catalog key y label son obligatorios.");
      return;
    }

    const { error } = await supabase.from("catalogs").upsert({
      key,
      label,
      description: newCatalogDescription.trim() || null,
      is_active: true,
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    setNewCatalogKey("");
    setNewCatalogLabel("");
    setNewCatalogDescription("");
    await refreshCatalogs();
    setSelectedCatalogKey(key);
    setMsg("Catalogo guardado.");
  }

  async function createItem() {
    setMsg(null);
    if (!selectedCatalogKey) {
      setMsg("Selecciona un catálogo.");
      return;
    }

    const code = newItemCode.trim().toLowerCase();
    const label = newItemLabel.trim();
    if (!code || !label) {
      setMsg("Code y label son obligatorios.");
      return;
    }

    let metadataObj: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(newItemMetadata || "{}");
      metadataObj =
        parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? parsed
          : {};
    } catch {
      setMsg("Metadata JSON invalido.");
      return;
    }

    const sortOrderNum = Number.parseInt(newItemSortOrder, 10);
    const { error } = await supabase.from("catalog_items").upsert({
      catalog_key: selectedCatalogKey,
      code,
      label,
      sort_order: Number.isFinite(sortOrderNum) ? sortOrderNum : 100,
      enabled: true,
      icon: newItemIcon.trim() || null,
      color: newItemColor.trim() || null,
      metadata: metadataObj,
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    setNewItemCode("");
    setNewItemLabel("");
    setNewItemSortOrder("100");
    setNewItemIcon("");
    setNewItemColor("");
    setNewItemMetadata("{}");
    setShowNewItemAdvanced(false);
    await refreshItems(selectedCatalogKey);
    setMsg("Item guardado.");
  }

  async function toggleItemEnabled(item: CatalogItemRow) {
    setMsg(null);
    const { error } = await supabase
      .from("catalog_items")
      .update({ enabled: !item.enabled })
      .eq("id", item.id);

    if (error) {
      setMsg(error.message);
      return;
    }
    await refreshItems(item.catalog_key);
  }

  function openEditItem(item: CatalogItemRow) {
    setMsg(null);
    setEditingItem(item);
    setShowEditAdvanced(false);
    setEditingLabel(item.label ?? "");
    setEditingSortOrder(String(item.sort_order ?? 100));
    setEditingIcon(item.icon ?? "");
    setEditingColor(item.color ?? "");
    setEditingMetadata(JSON.stringify(item.metadata ?? {}, null, 2));
  }

  function closeEditItem() {
    if (savingEdit) return;
    setEditingItem(null);
    setShowEditAdvanced(false);
  }

  async function saveEditedItem() {
    if (!editingItem) return;
    setMsg(null);

    const nextLabel = editingLabel.trim();
    if (!nextLabel) {
      setMsg("Label obligatorio.");
      return;
    }

    const sortParsed = Number.parseInt(editingSortOrder.trim(), 10);
    const nextSort = Number.isFinite(sortParsed)
      ? sortParsed
      : editingItem.sort_order;

    let nextMetadata: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(editingMetadata || "{}");
      nextMetadata =
        parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? parsed
          : {};
    } catch {
      setMsg("Metadata JSON invalido.");
      return;
    }

    setSavingEdit(true);
    const { error } = await supabase
      .from("catalog_items")
      .update({
        label: nextLabel,
        sort_order: nextSort,
        icon: editingIcon.trim() || null,
        color: editingColor.trim() || null,
        metadata: nextMetadata,
      })
      .eq("id", editingItem.id);

    if (error) {
      setMsg(error.message);
      setSavingEdit(false);
      return;
    }

    await refreshItems(editingItem.catalog_key);
    setMsg("Item actualizado.");
    setSavingEdit(false);
    setEditingItem(null);
  }

  function setCareNeedDraft(
    itemId: string,
    field: keyof CareNeedDraft,
    value: string,
  ) {
    setCareNeedDrafts((prev) => ({
      ...prev,
      [itemId]: {
        label: prev[itemId]?.label ?? "",
        sortOrder: prev[itemId]?.sortOrder ?? "100",
        hint: prev[itemId]?.hint ?? "",
        [field]: value,
      },
    }));
  }

  async function saveCareNeedDraft(item: CatalogItemRow) {
    setMsg(null);
    if (item.catalog_key !== "care_needs") return;

    const draft = careNeedDrafts[item.id];
    if (!draft) return;

    const nextLabel = draft.label.trim();
    if (!nextLabel) {
      setMsg("Label obligatorio para la necesidad.");
      return;
    }

    const metadataBase =
      item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
        ? { ...item.metadata }
        : {};

    const nextMetadata: Record<string, unknown> = { ...metadataBase };
    const nextHint = draft.hint.trim();
    if (nextHint) nextMetadata.hint = nextHint;
    else delete nextMetadata.hint;

    const sortCandidate = Number.parseInt(draft.sortOrder, 10);
    const nextSort = Number.isFinite(sortCandidate) ? sortCandidate : item.sort_order;

    const { error } = await supabase
      .from("catalog_items")
      .update({
        label: nextLabel,
        sort_order: nextSort,
        metadata: nextMetadata,
      })
      .eq("id", item.id);

    if (error) {
      setMsg(error.message);
      return;
    }

    await refreshItems(item.catalog_key);
    setMsg(`Necesidad "${nextLabel}" actualizada.`);
  }

  function openDeleteItem(item: CatalogItemRow) {
    setMsg(null);
    setPendingDeleteItem(item);
  }

  async function confirmDeleteItem() {
    const item = pendingDeleteItem;
    if (!item) return;

    setPendingDeleteItem(null);
    setDeletingItemId(item.id);
    const { error } = await supabase
      .from("catalog_items")
      .delete()
      .eq("id", item.id);
    if (error) {
      setMsg(error.message);
      setDeletingItemId(null);
      return;
    }
    await refreshItems(item.catalog_key);
    setDeletingItemId(null);
    setMsg("Item borrado.");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--lv-bg)] p-6 text-[var(--lv-text)]">
        <div className="rounded-[28px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-6 py-5 shadow-[var(--lv-shadow-sm)]">
          Cargando admin de catalogos...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--lv-bg)] p-6 text-[var(--lv-text)]">
      <div className="mx-auto max-w-7xl space-y-4">
        <AdminPageHero
          title="Admin: Catalogos tecnicos y legacy"
          description="Aquí viven catálogos globales del sistema y piezas heredadas que todavía sostienen parte del proyecto. No es la verdad visual de semillas y flores: eso ya vive en Tipos de plan."
          actions={
            <>
              <button
                className={secondaryActionClass}
                onClick={() => router.push("/admin/plan-types")}
              >
                Tipos de plan
              </button>
              <button
                className={secondaryActionClass}
                onClick={() => router.push("/admin/home")}
              >
                Home
              </button>
              <button
                className={secondaryActionClass}
                onClick={() => router.push("/admin/progression")}
              >
                Rewards
              </button>
              <button
                className={secondaryActionClass}
                onClick={() => router.push("/admin")}
              >
                Volver al indice
              </button>
            </>
          }
          message={msg ? <StatusNotice message={msg} /> : null}
          stats={[
            { label: "Catalogos", value: String(catalogs.length) },
            { label: "Filtrados", value: String(filteredCatalogs.length) },
            { label: "Legacy", value: String(legacyCatalogCount) },
            { label: "Items", value: String(items.length) },
          ]}
          noticeTitle="Como usar esta pantalla"
          noticeBody="Usa Catalogos para estados, elementos, tiers, textos y tablas tecnicas. Si la intención es cambiar una especie, asset o preview de plan, debes ir a Tipos de plan."
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-3 rounded-[28px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5 shadow-[var(--lv-shadow-sm)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Catalogos</h2>
              <button
                type="button"
                className={subtleActionClass}
                onClick={() => setShowNewCatalogForm((current) => !current)}
              >
                {showNewCatalogForm ? "Ocultar alta" : "Nuevo catálogo"}
              </button>
            </div>
            <div className="space-y-3 rounded-[22px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-3">
              <input
                className={compactFieldControlClass}
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Buscar por key, label o descripción..."
              />
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    "all",
                    "care",
                    "milestones",
                    "timeline",
                    "visual_home",
                    "seeds_calendar",
                    "general",
                    "legacy",
                    "other",
                  ] as CatalogSectionKey[]
                ).map((sectionKey) => (
                  <button
                    key={sectionKey}
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${
                      catalogSection === sectionKey
                        ? "border-[var(--lv-primary)] bg-[var(--lv-primary-soft)] text-[var(--lv-primary-strong)]"
                        : "border-[var(--lv-border)] bg-[var(--lv-surface)] text-[var(--lv-text-muted)] hover:bg-[var(--lv-surface-soft)]"
                    }`}
                    onClick={() => setCatalogSection(sectionKey)}
                  >
                    {CATALOG_SECTION_LABELS[sectionKey]}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[420px] space-y-3 overflow-auto pr-1">
              {groupedCatalogs.map((group) => (
                <div key={group.sectionKey} className="space-y-2">
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                    {group.label} ({group.rows.length})
                  </div>
                  {group.rows.map((catalog) => (
                    <button
                      key={catalog.key}
                      className={`w-full rounded-[20px] border px-3 py-2 text-left transition ${
                        catalog.key === selectedCatalogKey
                          ? "border-[var(--lv-primary)] bg-[var(--lv-primary-soft)] text-[var(--lv-primary-strong)]"
                          : "border-[var(--lv-border)] bg-[var(--lv-surface)] text-[var(--lv-text)] hover:bg-[var(--lv-surface-soft)]"
                      }`}
                      onClick={() => setSelectedCatalogKey(catalog.key)}
                    >
                      <div className="font-medium">{catalog.label}</div>
                      <div className="text-xs text-[var(--lv-text-muted)]">{catalog.key}</div>
                    </button>
                  ))}
                </div>
              ))}

              {!catalogs.length && (
                <div className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-3 text-sm text-[var(--lv-text-muted)]">
                  Sin catalogos aun.
                </div>
              )}
              {catalogs.length > 0 && filteredCatalogs.length === 0 && (
                <div className="rounded-[20px] border border-[var(--lv-warning)] bg-[var(--lv-warning-soft)] p-3 text-sm text-[var(--lv-warning)]">
                  No hay catalogos para ese filtro.
                </div>
              )}
            </div>

            {showNewCatalogForm ? (
              <div className="space-y-2 border-t border-[var(--lv-border)] pt-2">
                <div className="text-sm font-medium text-[var(--lv-text)]">Nuevo catalogo</div>
                <input
                  className={compactFieldControlClass}
                  value={newCatalogKey}
                  onChange={(e) => setNewCatalogKey(e.target.value)}
                  placeholder="key (ej: elements)"
                />
                <input
                  className={compactFieldControlClass}
                  value={newCatalogLabel}
                  onChange={(e) => setNewCatalogLabel(e.target.value)}
                  placeholder="label"
                />
                <textarea
                  className={`${textareaControlClass} min-h-[76px] p-2`}
                  value={newCatalogDescription}
                  onChange={(e) => setNewCatalogDescription(e.target.value)}
                  placeholder="description (opcional)"
                />
                <button
                  className={primaryActionClass}
                  onClick={createCatalog}
                >
                  Guardar catalogo
                </button>
              </div>
            ) : (
              <div className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-3 text-sm text-[var(--lv-text-muted)]">
                Crea catalogos nuevos solo cuando falte una tabla de configuracion real.
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-[28px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5 shadow-[var(--lv-shadow-sm)] lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  Items: {selectedCatalog?.label ?? "-"}
                </h2>
                <p className="text-sm text-[var(--lv-text-muted)]">
                  {selectedCatalog?.description ?? "Selecciona un catálogo."}
                </p>
                {selectedCatalogKey === "care_actions" && (
                  <p className="mt-1 text-xs text-[var(--lv-text-muted)]">
                    Metadata sugerida: {"{ \"target_need\":\"water\", \"effects\":{\"water\":24,\"air\":4}, \"decay_all\":3, \"score_bonus\":6 }"}
                  </p>
                )}
                {selectedCatalogKey === "mood_thresholds" && (
                  <p className="mt-1 text-xs text-[var(--lv-text-muted)]">
                    Metadata sugerida: {"{ \"min_score\":35, \"max_score\":74, \"anchor_score\":55 }"}
                  </p>
                )}
                {selectedCatalogKey === "care_needs" && (
                  <p className="mt-1 text-xs text-[var(--lv-text-muted)]">
                    Metadata sugerida: {"{ \"hint\":\"Texto explicativo\" }"}
                  </p>
                )}
                {selectedCatalogKey === "care_texts" && (
                  <p className="mt-1 text-xs text-[var(--lv-text-muted)]">
                    Usa `label` como texto final. En plantillas puedes usar llaves como {"{needLabel} {needValue} {needHint} {days} {dayWord} {avg}"}.
                  </p>
                )}
                {selectedCatalog ? (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-primary-soft)] px-2 py-1 text-[var(--lv-primary-strong)]">
                      Seccion: {CATALOG_SECTION_LABELS[resolveCatalogSection(selectedCatalog.key)]}
                    </span>
                    <span className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-2 py-1 text-[var(--lv-text-muted)]">
                      Items: {items.length}
                    </span>
                    <span className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-2 py-1 text-[var(--lv-text-muted)]">
                      Activo: {selectedCatalog.is_active ? "Si" : "No"}
                    </span>
                  </div>
                ) : null}
                {selectedCatalogKey === "home_art_packs" || selectedCatalogKey === "home_scene_theme" ? (
                  <div className="mt-3 rounded-[20px] border border-[var(--lv-warning)] bg-[var(--lv-warning-soft)] p-3 text-sm text-[var(--lv-warning)]">
                    Este catalogo sigue siendo tecnico. Para editar packs y escena del home, la pantalla util de verdad es{" "}
                    <button
                      type="button"
                      className="font-medium underline"
                      onClick={() => router.push("/admin/home")}
                    >
                      Admin Home
                    </button>
                    .
                  </div>
                ) : null}
                {selectedCatalogKey === "home_flower_species" ? (
                  <div className="mt-3 rounded-[20px] border border-[var(--lv-warning)] bg-[var(--lv-warning-soft)] p-3 text-sm text-[var(--lv-warning)]">
                    Este catalogo queda como legacy. La verdad visual de flor y semilla vive ahora en{" "}
                    <button
                      type="button"
                      className="font-medium underline"
                      onClick={() => router.push("/admin/plan-types")}
                    >
                      Tipos de plan
                    </button>
                    .
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedCatalog ? (
                  <button
                    className={secondaryActionClass}
                    onClick={() => refreshItems(selectedCatalog.key)}
                  >
                    Recargar
                  </button>
                ) : null}
                {selectedCatalog ? (
                  <button
                    type="button"
                    className={secondaryActionClass}
                    onClick={() => setShowNewItemForm((current) => !current)}
                  >
                    {showNewItemForm ? "Ocultar alta" : "Nuevo item"}
                  </button>
                ) : null}
                {selectedCatalog ? (
                  <select
                    className={secondaryActionClass}
                    value={itemStateFilter}
                    onChange={(e) =>
                      setItemStateFilter(e.target.value as "all" | "enabled" | "disabled")
                    }
                  >
                    <option value="all">Todos</option>
                    <option value="enabled">Activos</option>
                    <option value="disabled">Ocultos</option>
                  </select>
                ) : null}
                {selectedCatalog ? (
                  <input
                    className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2 text-sm text-[var(--lv-text)] outline-none placeholder:text-[var(--lv-text-muted)]"
                    placeholder="Buscar item"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                  />
                ) : null}
              </div>
            </div>

            {selectedCatalogKey ? (
              <>
                {selectedCatalogKey === "care_needs" && (
                  <div className="space-y-2 rounded-[22px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-3">
                    <div className="text-sm font-medium text-[var(--lv-text)]">
                      Edicion rapida de necesidades
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {items.map((it) => {
                        const draft = careNeedDrafts[it.id] ?? {
                          label: it.label ?? "",
                          sortOrder: String(it.sort_order ?? 100),
                          hint:
                            typeof it.metadata?.hint === "string"
                              ? String(it.metadata.hint)
                              : "",
                        };

                        return (
                          <div
                            key={`need-${it.id}`}
                            className="space-y-2 rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-3"
                          >
                            <div className="flex items-center justify-between gap-2 text-xs text-[var(--lv-text-muted)]">
                              <span className="font-mono">{it.code}</span>
                              <span>{it.enabled ? "ON" : "OFF"}</span>
                            </div>
                            <input
                              className={compactFieldControlClass}
                              value={draft.label}
                              onChange={(e) =>
                                setCareNeedDraft(it.id, "label", e.target.value)
                              }
                              placeholder="Label"
                            />
                            <textarea
                              className={`${compactFieldControlClass} min-h-[78px]`}
                              value={draft.hint}
                              onChange={(e) =>
                                setCareNeedDraft(it.id, "hint", e.target.value)
                              }
                              placeholder="Hint contextual para la frase del pulso"
                            />
                            <div className="flex items-center gap-2">
                              <input
                                className="w-28 rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-2 text-sm text-[var(--lv-text)] outline-none placeholder:text-[var(--lv-text-muted)]"
                                value={draft.sortOrder}
                                onChange={(e) =>
                                  setCareNeedDraft(it.id, "sortOrder", e.target.value)
                                }
                                placeholder="Sort"
                              />
                              <button
                                className={primaryActionClass}
                                onClick={() => saveCareNeedDraft(it)}
                              >
                                Guardar
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className={tableShellClass}>
                  <table className="min-w-full text-sm">
                    <thead className={tableHeadClass}>
                      <tr>
                        <th className="text-left p-2">Code</th>
                        <th className="text-left p-2">Label</th>
                        <th className="text-left p-2">Sort</th>
                        <th className="text-left p-2">Enabled</th>
                        <th className="text-left p-2">Icon</th>
                        <th className="text-left p-2">Color</th>
                        <th className="text-left p-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((it) => (
                        <tr key={it.id} className="border-t border-[var(--lv-border)]">
                          <td className="p-2 font-mono text-[var(--lv-text-muted)]">{it.code}</td>
                          <td className="p-2 text-[var(--lv-text)]">{it.label}</td>
                          <td className="p-2 text-[var(--lv-text-muted)]">{it.sort_order}</td>
                          <td className="p-2 text-[var(--lv-text-muted)]">{it.enabled ? "ON" : "OFF"}</td>
                          <td className="p-2 text-[var(--lv-text-muted)]">{it.icon ?? "-"}</td>
                          <td className="p-2 text-[var(--lv-text-muted)]">{it.color ?? "-"}</td>
                          <td className="p-2">
                            <div className="flex gap-2">
                              {selectedCatalogKey === "care_needs" && (
                                <button
                                  className={subtleActionClass}
                                  onClick={() => saveCareNeedDraft(it)}
                                >
                                  Guardar caja
                                </button>
                              )}
                              {selectedCatalogKey !== "care_needs" && (
                                <button
                                  className={subtleActionClass}
                                  onClick={() => openEditItem(it)}
                                  disabled={savingEdit}
                                >
                                  Editar
                                </button>
                              )}
                              <button
                                className={subtleActionClass}
                                onClick={() => toggleItemEnabled(it)}
                              >
                                {it.enabled ? "Desactivar" : "Activar"}
                              </button>
                              <button
                                className={dangerActionClass}
                                onClick={() => openDeleteItem(it)}
                                disabled={deletingItemId === it.id}
                              >
                                {deletingItemId === it.id ? "Borrando..." : "Borrar"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!filteredItems.length && (
                        <tr>
                          <td className="p-3 text-[var(--lv-text-muted)]" colSpan={7}>
                            No hay items para este filtro.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {showNewItemForm ? (
                  <div className="space-y-2 border-t border-[var(--lv-border)] pt-3">
                    <div className="text-sm font-medium text-[var(--lv-text)]">Nuevo item</div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      <input
                        className={compactFieldControlClass}
                        value={newItemCode}
                        onChange={(e) => setNewItemCode(e.target.value)}
                        placeholder="code"
                      />
                      <input
                        className={compactFieldControlClass}
                        value={newItemLabel}
                        onChange={(e) => setNewItemLabel(e.target.value)}
                        placeholder="label"
                      />
                      <input
                        className={compactFieldControlClass}
                        value={newItemSortOrder}
                        onChange={(e) => setNewItemSortOrder(e.target.value)}
                        placeholder="sort_order"
                      />
                      <input
                        className={compactFieldControlClass}
                        value={newItemIcon}
                        onChange={(e) => setNewItemIcon(e.target.value)}
                        placeholder="icon (opcional)"
                      />
                      <input
                        className={`${compactFieldControlClass} md:col-span-2`}
                        value={newItemColor}
                        onChange={(e) => setNewItemColor(e.target.value)}
                        placeholder="color hex (opcional)"
                      />
                    </div>
                    <button
                      type="button"
                      className={subtleActionClass}
                      onClick={() => setShowNewItemAdvanced((current) => !current)}
                    >
                      {showNewItemAdvanced ? "Ocultar metadata avanzada" : "Mostrar metadata avanzada"}
                    </button>
                    {showNewItemAdvanced ? (
                      <textarea
                        className={`${textareaControlClass} min-h-[92px] font-mono text-xs`}
                        value={newItemMetadata}
                        onChange={(e) => setNewItemMetadata(e.target.value)}
                        placeholder='metadata JSON (ej: {"hint":"Texto", "effects":{"water":24}})'
                      />
                    ) : null}
                    <button
                      className={primaryActionClass}
                      onClick={createItem}
                    >
                      Guardar item
                    </button>
                  </div>
                ) : (
                  <div className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-3 text-sm text-[var(--lv-text-muted)]">
                    Crea items nuevos solo cuando no exista ya un valor reutilizable dentro del catalogo seleccionado.
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4 text-sm text-[var(--lv-text-muted)]">
                Selecciona o crea un catalogo para comenzar.
              </div>
            )}
          </div>
        </div>
      </div>

      {editingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--lv-overlay)] p-4">
          <div className="w-full max-w-2xl space-y-3 rounded-[28px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5 shadow-[var(--lv-shadow-lg)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--lv-text)]">Editar item</h2>
                <p className="mt-1 font-mono text-xs text-[var(--lv-text-muted)]">
                  {editingItem.catalog_key} / {editingItem.code}
                </p>
              </div>
              <button
                className={subtleActionClass}
                onClick={closeEditItem}
                disabled={savingEdit}
              >
                Cerrar
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <input
                className={compactFieldControlClass}
                value={editingLabel}
                onChange={(e) => setEditingLabel(e.target.value)}
                placeholder="Label"
              />
              <input
                className={compactFieldControlClass}
                value={editingSortOrder}
                onChange={(e) => setEditingSortOrder(e.target.value)}
                placeholder="Sort order"
              />
              <input
                className={compactFieldControlClass}
                value={editingIcon}
                onChange={(e) => setEditingIcon(e.target.value)}
                placeholder="Icon (opcional)"
              />
              <input
                className={compactFieldControlClass}
                value={editingColor}
                onChange={(e) => setEditingColor(e.target.value)}
                placeholder="Color hex (opcional)"
              />
            </div>

            <button
              type="button"
              className={subtleActionClass}
              onClick={() => setShowEditAdvanced((current) => !current)}
            >
              {showEditAdvanced ? "Ocultar metadata avanzada" : "Mostrar metadata avanzada"}
            </button>

            {showEditAdvanced ? (
              <textarea
                className={`${textareaControlClass} min-h-[140px] font-mono text-xs`}
                value={editingMetadata}
                onChange={(e) => setEditingMetadata(e.target.value)}
                placeholder='Metadata JSON (ej: {"hint":"Texto"})'
              />
            ) : null}

            <div className="flex justify-end gap-2">
              <button
                className={secondaryActionClass}
                onClick={closeEditItem}
                disabled={savingEdit}
              >
                Cancelar
              </button>
              <button
                className={`${primaryActionClass} disabled:opacity-50`}
                onClick={() => void saveEditedItem()}
                disabled={savingEdit}
              >
                {savingEdit ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={pendingDeleteItem !== null}
        title="Borrar item"
        description={
          pendingDeleteItem
            ? `Se borrará "${pendingDeleteItem.label}" (${pendingDeleteItem.code}).`
            : undefined
        }
        confirmLabel="Si, borrar item"
        tone="danger"
        busy={Boolean(deletingItemId)}
        onConfirm={() => void confirmDeleteItem()}
        onCancel={() => {
          if (deletingItemId) return;
          setPendingDeleteItem(null);
        }}
      />
    </div>
  );
}
