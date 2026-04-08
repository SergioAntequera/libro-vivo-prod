"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ensureSuperadminOrRedirect } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { AdminInlineNote, AdminPanel } from "@/components/admin/AdminWorkspace";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { CanvasEditor } from "@/components/canvas/CanvasEditor";
import { getFallbackCanvasTemplates, type CanvasTemplateConfig, type CanvasTemplateObjectInput } from "@/lib/canvasCatalog";
import type { CanvasObject } from "@/lib/canvasTypes";
import { PROGRESSION_TREE_RANK_OPTIONS } from "@/lib/progressionTreeVisuals";
import { uploadStickerSvgAsset } from "@/lib/uploadStickerAsset";
import { toErrorMessage } from "@/lib/errorMessage";

type View = "demo" | "packs" | "stickers" | "templates";
type CanvasPanel = "library" | "inspector" | null;
type UnlockRuleType =
  | "always"
  | "progression_tree"
  | "progression_rank"
  | "manual";

type PackRow = { id: string; key: string; label: string; description: string | null; is_active: boolean };
type StickerRow = { id: string; key: string; label: string; src: string; category: string | null; is_active: boolean };
type PackItemRow = { id: string; pack_id: string; sticker_id: string; sort_order: number; enabled: boolean };
type UnlockRuleRow = { id: string; pack_id: string; rule_type: UnlockRuleType; rule_value: string | null; enabled: boolean };
type TemplateRow = { id: string; key: string; label: string; description: string | null; sort_order: number; enabled: boolean };
type TemplateObjectRow = { id: string; template_id: string; object_order: number; object_json: unknown; enabled: boolean };
type ProgressionTreeRow = {
  id: string;
  title: string;
  rank: string | null;
  kind: string;
  threshold: number;
};

type PackDraft = { key: string; label: string; description: string; isActive: boolean };
type StickerDraft = { key: string; label: string; src: string; category: string; isActive: boolean; assignPackId: string; sortOrder: string };
type TemplateDraft = { key: string; label: string; description: string; sortOrder: string; enabled: boolean; objectsJson: string };
type DeleteTarget = { kind: "pack" | "sticker" | "template" | "unlock"; id: string } | null;

const EMPTY_PACK: PackDraft = { key: "", label: "", description: "", isActive: true };
const EMPTY_STICKER: StickerDraft = { key: "", label: "", src: "", category: "", isActive: true, assignPackId: "", sortOrder: "100" };

function stringifyJson(value: unknown) { return JSON.stringify(value, null, 2); }
function emptyTemplate(): TemplateDraft { return { key: "", label: "", description: "", sortOrder: "100", enabled: true, objectsJson: stringifyJson(getFallbackCanvasTemplates()[0]?.objects ?? []) }; }
function toSlug(input: string) { return input.toLowerCase().trim().replace(/[^a-z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""); }
function labelTier(value: string) { return value === "bronze" ? "Bronce" : value === "silver" ? "Plata" : value === "gold" ? "Oro" : value === "diamond" ? "Diamante" : value; }
function normalizeCanvasAdminError(input: string) {
  const raw = String(input ?? "").trim();
  if (!raw) return "Error inesperado en admin canvas.";
  const lower = raw.toLowerCase();
  if (lower.includes("row-level security policy")) return "Upload bloqueado por RLS de Storage. Ejecuta supabase/sql/2026-03-05_storage_stickers_assets.sql y repite la subida.";
  if (lower.includes("bucket") && lower.includes("not found")) return "No existe el bucket stickers-assets. Ejecuta supabase/sql/2026-03-05_storage_stickers_assets.sql.";
  return raw;
}
function parseTemplateObjects(raw: string): Array<Record<string, unknown>> {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Template objects debe ser un array JSON.");
  const out: Array<Record<string, unknown>> = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const obj = item as Record<string, unknown>;
    const type = String(obj.type ?? "").trim();
    if (type === "sticker" || type === "text" || type === "photo" || type === "video") out.push(obj);
  }
  if (!out.length) throw new Error("Template objects no contiene objetos validos.");
  return out;
}
function readFileAsDataUrl(file: File): Promise<string> { return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result ?? "")); r.onerror = () => reject(new Error("No se pudo leer el archivo.")); r.readAsDataURL(file); }); }
function readFileAsText(file: File): Promise<string> { return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result ?? "")); r.onerror = () => reject(new Error("No se pudo leer el archivo SVG.")); r.readAsText(file); }); }
function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> { return new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve({ width: Math.max(1, Math.round(img.naturalWidth || img.width || 1)), height: Math.max(1, Math.round(img.naturalHeight || img.height || 1)) }); img.onerror = () => reject(new Error("No se pudo leer dimensiones de la imagen.")); img.src = dataUrl; }); }
function wrapRasterAsSvg(dataUrl: string, width: number, height: number) { return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">\n  <image href="${dataUrl}" width="${width}" height="${height}" />\n</svg>`; }
const secondaryActionClass =
  "rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm text-[var(--lv-text)] transition hover:bg-[var(--lv-surface-soft)]";
const primaryActionClass =
  "rounded-[20px] bg-[var(--lv-primary)] px-4 py-2 text-sm text-white transition hover:opacity-90";
const subtleActionClass =
  "rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-3 py-2 text-sm text-[var(--lv-text)] transition hover:bg-[var(--lv-surface)]";
const dangerActionClass =
  "rounded-[18px] border border-[var(--lv-danger)] bg-[var(--lv-danger-soft)] px-3 py-2 text-sm text-[var(--lv-danger)] transition hover:opacity-90";
const fieldControlClass =
  "rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-3 text-sm text-[var(--lv-text)] outline-none transition placeholder:text-[var(--lv-text-muted)] focus:border-[var(--lv-primary)] focus:bg-[var(--lv-surface-soft)]";
const compactFieldControlClass =
  "rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-2 text-sm text-[var(--lv-text)] outline-none transition placeholder:text-[var(--lv-text-muted)] focus:border-[var(--lv-primary)] focus:bg-[var(--lv-surface-soft)]";
const tableShellClass = "overflow-auto rounded-[22px] border border-[var(--lv-border)] bg-[var(--lv-surface)]";

function selectableLibraryCardClass(selected: boolean) {
  return `w-full rounded-[20px] border p-3 text-left transition ${
    selected
      ? "border-[var(--lv-primary)] bg-[var(--lv-primary-soft)]"
      : "border-[var(--lv-border)] bg-[var(--lv-surface-soft)] hover:bg-[var(--lv-surface)]"
  }`;
}

function SummaryValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-3 py-2">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-[var(--lv-text)]">{value}</div>
    </div>
  );
}

function StickerThumb({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      className="h-10 w-10 rounded-xl border border-[var(--lv-border)] bg-[var(--lv-surface)] object-contain p-1"
    />
  );
}

function ToolbarButton({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition ${
        active
          ? "border-[var(--lv-primary)] bg-[var(--lv-primary-soft)] text-[var(--lv-primary-strong)]"
          : "border-[var(--lv-border)] bg-[var(--lv-surface)] text-[var(--lv-text)] hover:bg-[var(--lv-surface-soft)]"
      }`}
    >
      {children}
    </button>
  );
}

function FloatingCanvasPanel({
  title,
  description,
  onClose,
  children,
  className,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  className: string;
}) {
  return (
    <div
      className={`absolute z-20 flex max-h-[calc(100dvh-150px)] flex-col rounded-[30px] border border-[var(--lv-border)] bg-[rgba(255,255,255,0.96)] p-4 shadow-[0_26px_80px_rgba(24,36,26,0.18)] backdrop-blur ${className}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-[var(--lv-text)]">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-[var(--lv-text-muted)]">{description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-1.5 text-xs text-[var(--lv-text)]"
        >
          Cerrar
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">{children}</div>
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-[var(--lv-border)] bg-[rgba(255,255,255,0.92)] px-4 py-2 shadow-[var(--lv-shadow-sm)]">
      <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">{label}</span>
      <span className="ml-3 text-sm font-medium text-[var(--lv-text)]">{value}</span>
    </div>
  );
}

function buildTemplatePreviewConfig(
  template: TemplateRow | null,
  rows: TemplateObjectRow[],
): CanvasTemplateConfig | null {
  if (!template) return null;
  const id = String(template.id ?? "").trim();
  const key = String(template.key ?? "").trim();
  const label = String(template.label ?? "").trim();
  if (!id || !key || !label) return null;
  const objects = rows
    .filter((row) => row.template_id === id && row.enabled)
    .sort((a, b) => a.object_order - b.object_order)
    .map((row) => row.object_json)
    .filter((value): value is CanvasTemplateObjectInput => Boolean(value && typeof value === "object" && !Array.isArray(value)));
  if (!objects.length) return null;
  return {
    id,
    key,
    label,
    description: template.description ?? null,
    sortOrder: Number.isFinite(template.sort_order) ? Number(template.sort_order) : 100,
    objects,
  };
}

function buildDemoObjectFromTemplate(
  object: CanvasTemplateObjectInput,
  id: string,
): CanvasObject | null {
  if (object.type === "sticker") {
    return {
      id,
      type: "sticker",
      x: Number(object.x ?? 120),
      y: Number(object.y ?? 120),
      rotation: Number(object.rotation ?? 0),
      locked: true,
      src: String(object.src ?? "/stickers/sticker_star.svg"),
      scale: Number(object.scale ?? 1),
    };
  }

  if (object.type === "text") {
    return {
      id,
      type: "text",
      x: Number(object.x ?? 120),
      y: Number(object.y ?? 120),
      rotation: Number(object.rotation ?? 0),
      locked: true,
      text: String(object.text ?? "Recuerdo compartido"),
      width: Number(object.width ?? 420),
      fontSize: Number(object.fontSize ?? 24),
      fill: String(object.fill ?? "#1f2937"),
    };
  }

  if (object.type === "photo") {
    return {
      id,
      type: "photo",
      x: Number(object.x ?? 96),
      y: Number(object.y ?? 72),
      rotation: Number(object.rotation ?? 0),
      locked: true,
      width: Number(object.width ?? 320),
      height: Number(object.height ?? 220),
      src: String(object.src ?? ""),
      caption: object.caption ? String(object.caption) : null,
      washi: object.washi === "corner" || object.washi === "top" ? object.washi : "top",
      stamp: object.stamp === "done" || object.stamp === "love" ? object.stamp : "love",
    };
  }

  if (object.type === "video") {
    return {
      id,
      type: "video",
      x: Number(object.x ?? 96),
      y: Number(object.y ?? 72),
      rotation: Number(object.rotation ?? 0),
      locked: true,
      width: Number(object.width ?? 320),
      height: Number(object.height ?? 220),
      src: String(object.src ?? ""),
      caption: object.caption ? String(object.caption) : null,
    };
  }

  return null;
}

function buildCanvasDemoObjects(
  template: CanvasTemplateConfig | null,
  stickerSources: string[],
): CanvasObject[] {
  const baseObjects = (template?.objects ?? [])
    .map((object, index) => buildDemoObjectFromTemplate(object, `demo-template-${index}`))
    .filter((value): value is CanvasObject => value !== null);

  const stickerObjects = stickerSources.slice(0, 3).map((src, index) => ({
    id: `demo-sticker-${index}`,
    type: "sticker" as const,
    x: 492 + index * 52,
    y: 92 + index * 34,
    rotation: index % 2 === 0 ? -8 : 8,
    locked: true,
    src,
    scale: index === 0 ? 1.1 : 0.88,
  }));

  return [...baseObjects, ...stickerObjects];
}

export default function AdminCanvasPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [view, setView] = useState<View>("demo");
  const [activePanel, setActivePanel] = useState<CanvasPanel>(null);
  const [packs, setPacks] = useState<PackRow[]>([]);
  const [stickers, setStickers] = useState<StickerRow[]>([]);
  const [packItems, setPackItems] = useState<PackItemRow[]>([]);
  const [unlockRules, setUnlockRules] = useState<UnlockRuleRow[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [templateObjects, setTemplateObjects] = useState<TemplateObjectRow[]>([]);
  const [progressionTrees, setProgressionTrees] = useState<ProgressionTreeRow[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [creatingPack, setCreatingPack] = useState(false);
  const [creatingSticker, setCreatingSticker] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [packDraft, setPackDraft] = useState<PackDraft>(EMPTY_PACK);
  const [stickerDraft, setStickerDraft] = useState<StickerDraft>(EMPTY_STICKER);
  const [templateDraft, setTemplateDraft] = useState<TemplateDraft>(emptyTemplate);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [packStickerSearch, setPackStickerSearch] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");
  const [newRuleType, setNewRuleType] = useState<UnlockRuleType>("always");
  const [newRuleTreeId, setNewRuleTreeId] = useState("");
  const [newRuleRank, setNewRuleRank] = useState("bronze");
  const [newRuleManualValue, setNewRuleManualValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [busyDelete, setBusyDelete] = useState(false);

  useEffect(() => {
    (async () => {
      const session = await ensureSuperadminOrRedirect(router);
      if (!session) return;
      await refresh();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setMsg(null);
    const [packsRes, stickersRes, packItemsRes, unlockRes, templatesRes, objectRes, progressionTreesRes] = await Promise.all([
      supabase.from("sticker_packs").select("id,key,label,description,is_active").order("label", { ascending: true }),
      supabase.from("stickers").select("id,key,label,src,category,is_active").order("label", { ascending: true }),
      supabase.from("sticker_pack_items").select("id,pack_id,sticker_id,sort_order,enabled").order("sort_order", { ascending: true }),
      supabase.from("sticker_unlock_rules").select("id,pack_id,rule_type,rule_value,enabled").order("created_at", { ascending: true }),
      supabase.from("canvas_templates").select("id,key,label,description,sort_order,enabled").order("sort_order", { ascending: true }),
      supabase.from("template_objects").select("id,template_id,object_order,object_json,enabled").order("object_order", { ascending: true }),
      supabase.from("progression_tree_nodes").select("id,title,rank,enabled").eq("enabled", true).order("code", { ascending: true }),
    ]);

    if (packsRes.error || stickersRes.error || packItemsRes.error || unlockRes.error || templatesRes.error || objectRes.error || progressionTreesRes.error) {
      setMsg(packsRes.error?.message ?? stickersRes.error?.message ?? packItemsRes.error?.message ?? unlockRes.error?.message ?? templatesRes.error?.message ?? objectRes.error?.message ?? progressionTreesRes.error?.message ?? "No se pudo cargar admin canvas.");
      return;
    }

    setPacks((packsRes.data as PackRow[] | null) ?? []);
    setStickers((stickersRes.data as StickerRow[] | null) ?? []);
    setPackItems((packItemsRes.data as PackItemRow[] | null) ?? []);
    setUnlockRules((unlockRes.data as UnlockRuleRow[] | null) ?? []);
    setTemplates((templatesRes.data as TemplateRow[] | null) ?? []);
    setTemplateObjects((objectRes.data as TemplateObjectRow[] | null) ?? []);
    setProgressionTrees(
      (((progressionTreesRes.data as Array<{ id: string; title: string; rank: string | null }> | null) ?? []).map(
        (row) => ({
          ...row,
          kind: "progression_tree",
          threshold: 1,
        }),
      )),
    );
  }

  useEffect(() => {
    if (creatingPack) return;
    if (!packs.length) return void setSelectedPackId(null);
    if (!selectedPackId || !packs.some((pack) => pack.id === selectedPackId)) setSelectedPackId(packs[0].id);
  }, [packs, selectedPackId, creatingPack]);

  useEffect(() => {
    if (creatingSticker) return;
    if (!stickers.length) return void setSelectedStickerId(null);
    if (!selectedStickerId || !stickers.some((sticker) => sticker.id === selectedStickerId)) setSelectedStickerId(stickers[0].id);
  }, [stickers, selectedStickerId, creatingSticker]);

  useEffect(() => {
    if (creatingTemplate) return;
    if (!templates.length) return void setSelectedTemplateId(null);
    if (!selectedTemplateId || !templates.some((template) => template.id === selectedTemplateId)) setSelectedTemplateId(templates[0].id);
  }, [templates, selectedTemplateId, creatingTemplate]);

  const selectedPack = useMemo(() => packs.find((pack) => pack.id === selectedPackId) ?? null, [packs, selectedPackId]);
  const selectedSticker = useMemo(() => stickers.find((sticker) => sticker.id === selectedStickerId) ?? null, [stickers, selectedStickerId]);
  const selectedTemplate = useMemo(() => templates.find((template) => template.id === selectedTemplateId) ?? null, [templates, selectedTemplateId]);
  const stickerById = useMemo(() => new Map(stickers.map((sticker) => [sticker.id, sticker])), [stickers]);

  useEffect(() => {
    if (creatingPack) return;
    if (!selectedPack) return void setPackDraft(EMPTY_PACK);
    setPackDraft({ key: selectedPack.key, label: selectedPack.label, description: selectedPack.description ?? "", isActive: selectedPack.is_active });
  }, [creatingPack, selectedPack]);

  useEffect(() => {
    if (creatingSticker) return;
    if (!selectedSticker) return void setStickerDraft(EMPTY_STICKER);
    const firstPackId = packItems.find((item) => item.sticker_id === selectedSticker.id)?.pack_id ?? "";
    setStickerDraft({ key: selectedSticker.key, label: selectedSticker.label, src: selectedSticker.src, category: selectedSticker.category ?? "", isActive: selectedSticker.is_active, assignPackId: firstPackId, sortOrder: "100" });
  }, [creatingSticker, selectedSticker, packItems]);

  useEffect(() => {
    if (creatingTemplate) return;
    if (!selectedTemplate) return void setTemplateDraft(emptyTemplate());
    const rows = templateObjects.filter((item) => item.template_id === selectedTemplate.id && item.enabled).sort((a, b) => a.object_order - b.object_order).map((item) => item.object_json);
    setTemplateDraft({ key: selectedTemplate.key, label: selectedTemplate.label, description: selectedTemplate.description ?? "", sortOrder: String(selectedTemplate.sort_order), enabled: selectedTemplate.enabled, objectsJson: stringifyJson(rows) });
  }, [creatingTemplate, selectedTemplate, templateObjects]);

  const packItemsForSelectedPack = useMemo(() => {
    if (!selectedPackId) return [] as Array<PackItemRow & { sticker: StickerRow | null }>;
    return packItems.filter((item) => item.pack_id === selectedPackId).sort((a, b) => a.sort_order - b.sort_order).map((item) => ({ ...item, sticker: stickerById.get(item.sticker_id) ?? null }));
  }, [packItems, selectedPackId, stickerById]);

  const availableStickersForSelectedPack = useMemo(() => {
    const query = packStickerSearch.trim().toLowerCase();
    const existing = new Set(packItemsForSelectedPack.map((item) => item.sticker_id));
    return stickers.filter((sticker) => !existing.has(sticker.id) && (!query || `${sticker.label} ${sticker.key} ${sticker.category ?? ""}`.toLowerCase().includes(query)));
  }, [packItemsForSelectedPack, packStickerSearch, stickers]);

  const filteredStickers = useMemo(() => {
    const query = librarySearch.trim().toLowerCase();
    return stickers.filter((sticker) => !query || `${sticker.label} ${sticker.key} ${sticker.category ?? ""}`.toLowerCase().includes(query));
  }, [librarySearch, stickers]);

  const filteredTemplates = useMemo(() => {
    const query = templateSearch.trim().toLowerCase();
    return templates.filter((template) => !query || `${template.label} ${template.key} ${template.description ?? ""}`.toLowerCase().includes(query));
  }, [templateSearch, templates]);

  const packUnlockRules = useMemo(() => selectedPackId ? unlockRules.filter((rule) => rule.pack_id === selectedPackId) : [], [unlockRules, selectedPackId]);
  const stats = useMemo(() => ({ activePacks: packs.filter((pack) => pack.is_active).length, activeStickers: stickers.filter((sticker) => sticker.is_active).length, activeTemplates: templates.filter((template) => template.enabled).length, gatedPacks: new Set(unlockRules.map((rule) => rule.pack_id)).size }), [packs, stickers, templates, unlockRules]);
  const demoTemplate = useMemo(() => {
    const selected = buildTemplatePreviewConfig(selectedTemplate, templateObjects);
    if (selected) return selected;
    return getFallbackCanvasTemplates()[0] ?? null;
  }, [selectedTemplate, templateObjects]);
  const demoStickerSources = useMemo(() => {
    if (selectedSticker?.src) return [selectedSticker.src];
    const packSources = packItemsForSelectedPack
      .map((item) => item.sticker?.src ?? "")
      .filter((src) => src.trim());
    if (packSources.length) return packSources;
    return stickers.map((sticker) => sticker.src).filter((src) => src.trim());
  }, [selectedSticker, packItemsForSelectedPack, stickers]);
  const demoObjects = useMemo(
    () => buildCanvasDemoObjects(demoTemplate, demoStickerSources),
    [demoStickerSources, demoTemplate],
  );
  const creativeCapabilities = useMemo(
    () => [
      "Stickers narrativos y decorativos",
      "Plantillas base para empezar sin lienzo vacío",
      "Fotos y video dentro del recuerdo",
      "Texto, captions y pequenas capas editoriales",
      "Marcos, fondos y efectos futuros desbloqueables",
      "Recursos especiales para year y pdf cuando progression los desbloquee",
    ],
    [],
  );

  function togglePanel(panel: Exclude<CanvasPanel, null>) {
    setActivePanel((current) => (current === panel ? null : panel));
  }

  function changeView(next: View) {
    setView(next);
    setActivePanel("library");
  }

  async function saveCurrentView() {
    if (view === "packs") {
      await savePack();
      return;
    }
    if (view === "stickers") {
      await saveSticker();
      return;
    }
    if (view === "templates") {
      await saveTemplate();
      return;
    }
  }

  const saveCurrentLabel =
    view === "packs"
      ? creatingPack
        ? "Crear pack"
        : "Guardar pack"
      : view === "stickers"
        ? creatingSticker
          ? "Crear sticker"
          : "Guardar sticker"
        : view === "templates"
          ? creatingTemplate
            ? "Crear plantilla"
            : "Guardar plantilla"
          : null;

  function startNewPack() { setView("packs"); setCreatingPack(true); setSelectedPackId(null); setPackDraft(EMPTY_PACK); }
  function startNewSticker() { setView("stickers"); setCreatingSticker(true); setSelectedStickerId(null); setStickerDraft({ ...EMPTY_STICKER, assignPackId: selectedPackId ?? "" }); setUploadFile(null); if (fileRef.current) fileRef.current.value = ""; }
  function startNewTemplate() { setView("templates"); setCreatingTemplate(true); setSelectedTemplateId(null); setTemplateDraft(emptyTemplate()); }

  async function savePack() {
    setMsg(null);
    const key = toSlug(packDraft.key.trim() || packDraft.label.trim());
    const label = packDraft.label.trim();
    if (!key || !label) return void setMsg("Pack key y label son obligatorios.");
    if (creatingPack || !selectedPack) {
      const { data, error } = await supabase.from("sticker_packs").insert({ key, label, description: packDraft.description.trim() || null, is_active: packDraft.isActive }).select("id").single();
      if (error || !data?.id) return void setMsg(error?.message ?? "No se pudo crear el pack.");
      await refresh(); setCreatingPack(false); setSelectedPackId(data.id); setMsg("Pack creado."); return;
    }
    const { error } = await supabase.from("sticker_packs").update({ key, label, description: packDraft.description.trim() || null, is_active: packDraft.isActive }).eq("id", selectedPack.id);
    if (error) return void setMsg(error.message);
    await refresh(); setMsg("Pack actualizado.");
  }

  async function updatePackItem(itemId: string, patch: Partial<Pick<PackItemRow, "sort_order" | "enabled">>) {
    const { error } = await supabase.from("sticker_pack_items").update(patch).eq("id", itemId);
    if (error) return void setMsg(error.message);
    await refresh();
  }

  async function addStickerToSelectedPack(stickerId: string) {
    if (!selectedPackId) return;
    const maxOrder = packItemsForSelectedPack.reduce((acc, item) => Math.max(acc, item.sort_order || 0), 0);
    const { error } = await supabase.from("sticker_pack_items").upsert({ pack_id: selectedPackId, sticker_id: stickerId, sort_order: maxOrder + 10, enabled: true }, { onConflict: "pack_id,sticker_id" });
    if (error) return void setMsg(error.message);
    await refresh(); setMsg("Sticker añadido al pack.");
  }

  async function removePackItem(itemId: string) {
    const { error } = await supabase.from("sticker_pack_items").delete().eq("id", itemId);
    if (error) return void setMsg(error.message);
    await refresh(); setMsg("Sticker quitado del pack.");
  }

  async function createUnlockRule() {
    if (!selectedPackId) return void setMsg("Selecciona un pack primero.");
    let ruleValue: string | null = null;
    if (newRuleType === "progression_tree") {
      ruleValue = newRuleTreeId || null;
    } else if (newRuleType === "progression_rank") {
      ruleValue = newRuleRank;
    }
    else if (newRuleType === "manual") ruleValue = newRuleManualValue.trim() || null;
    if (newRuleType !== "always" && !ruleValue) return void setMsg("Completa el valor de la regla.");
    const { error } = await supabase.from("sticker_unlock_rules").insert({ pack_id: selectedPackId, rule_type: newRuleType, rule_value: ruleValue, enabled: true });
    if (error) return void setMsg(error.message);
    setNewRuleType("always"); setNewRuleTreeId(""); setNewRuleRank("bronze"); setNewRuleManualValue("");
    await refresh(); setMsg("Regla de desbloqueo guardada.");
  }

  async function toggleUnlockRule(rule: UnlockRuleRow) {
    const { error } = await supabase.from("sticker_unlock_rules").update({ enabled: !rule.enabled }).eq("id", rule.id);
    if (error) return void setMsg(error.message);
    await refresh();
  }

  async function buildSvgFromFile(file: File): Promise<string> {
    const lowerName = file.name.toLowerCase();
    const mime = (file.type || "").toLowerCase();
    const isSvg = mime === "image/svg+xml" || lowerName.endsWith(".svg");
    if (isSvg) {
      const raw = await readFileAsText(file);
      if (!raw.includes("<svg")) throw new Error("El archivo SVG no parece válido.");
      return raw;
    }
    const isRaster = ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(mime) || lowerName.endsWith(".png") || lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg") || lowerName.endsWith(".webp");
    if (!isRaster) throw new Error("Formato no soportado. Usa PNG, JPG, WEBP o SVG.");
    const dataUrl = await readFileAsDataUrl(file);
    const { width, height } = await getImageDimensions(dataUrl);
    return wrapRasterAsSvg(dataUrl, width, height);
  }

  async function saveSticker() {
    setMsg(null);
    const key = toSlug(stickerDraft.key.trim() || stickerDraft.label.trim());
    const label = stickerDraft.label.trim();
    if (!key || !label) return void setMsg("Sticker key y label son obligatorios.");
    let finalSrc = stickerDraft.src.trim();
    try {
      if (uploadFile) {
        setUploading(true);
        const svgText = await buildSvgFromFile(uploadFile);
        finalSrc = await uploadStickerSvgAsset({ keyBase: key || uploadFile.name.replace(/\.[^.]+$/, ""), svgText });
      }
      if (!finalSrc) return void setMsg("Sube un archivo o pega una URL valida para el sticker.");
      let stickerId = selectedSticker?.id ?? null;
      if (creatingSticker || !selectedSticker) {
        const { data, error } = await supabase.from("stickers").insert({ key, label, src: finalSrc, category: stickerDraft.category.trim() || null, is_active: stickerDraft.isActive }).select("id").single();
        if (error || !data?.id) return void setMsg(error?.message ?? "No se pudo crear el sticker.");
        stickerId = data.id;
      } else {
        const { error } = await supabase.from("stickers").update({ key, label, src: finalSrc, category: stickerDraft.category.trim() || null, is_active: stickerDraft.isActive }).eq("id", selectedSticker.id);
        if (error) return void setMsg(error.message);
      }
      if (stickerDraft.assignPackId && stickerId) {
        const sortOrder = Number.parseInt(stickerDraft.sortOrder, 10);
        const { error: packErr } = await supabase.from("sticker_pack_items").upsert({ pack_id: stickerDraft.assignPackId, sticker_id: stickerId, sort_order: Number.isFinite(sortOrder) ? sortOrder : 100, enabled: true }, { onConflict: "pack_id,sticker_id" });
        if (packErr) return void setMsg(`Sticker guardado, pero fallo la asignacion al pack: ${packErr.message}`);
      }
      await refresh(); setCreatingSticker(false); setUploadFile(null); if (fileRef.current) fileRef.current.value = ""; setMsg("Sticker guardado.");
    } catch (error: unknown) {
      setMsg(normalizeCanvasAdminError(toErrorMessage(error, "No se pudo guardar el sticker.")));
    } finally {
      setUploading(false);
    }
  }

  async function saveTemplate() {
    setMsg(null);
    const key = toSlug(templateDraft.key.trim() || templateDraft.label.trim());
    const label = templateDraft.label.trim();
    if (!key || !label) return void setMsg("Template key y label son obligatorios.");
    let objects: Array<Record<string, unknown>>;
    try { objects = parseTemplateObjects(templateDraft.objectsJson); } catch (error: unknown) { return void setMsg(toErrorMessage(error, "Template JSON invalido.")); }
    const payload = { key, label, description: templateDraft.description.trim() || null, sort_order: Number.parseInt(templateDraft.sortOrder, 10) || 100, enabled: templateDraft.enabled };
    let templateId = selectedTemplate?.id ?? null;
    if (creatingTemplate || !selectedTemplate) {
      const { data, error } = await supabase.from("canvas_templates").insert(payload).select("id").single();
      if (error || !data?.id) return void setMsg(error?.message ?? "No se pudo crear la plantilla.");
      templateId = data.id;
    } else {
      const { error } = await supabase.from("canvas_templates").update(payload).eq("id", selectedTemplate.id);
      if (error) return void setMsg(error.message);
      templateId = selectedTemplate.id;
    }
    const { error: deleteError } = await supabase.from("template_objects").delete().eq("template_id", templateId);
    if (deleteError) return void setMsg(deleteError.message);
    const inserts = objects.map((obj, index) => ({ template_id: templateId, object_order: (index + 1) * 10, object_json: obj, enabled: true }));
    const { error: insertError } = await supabase.from("template_objects").insert(inserts);
    if (insertError) return void setMsg(insertError.message);
    await refresh(); setCreatingTemplate(false); setMsg("Plantilla guardada.");
  }

  async function toggleTemplate(template: TemplateRow) {
    const { error } = await supabase.from("canvas_templates").update({ enabled: !template.enabled }).eq("id", template.id);
    if (error) return void setMsg(error.message);
    await refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusyDelete(true);
    try {
      if (deleteTarget.kind === "pack") { const { error } = await supabase.from("sticker_packs").delete().eq("id", deleteTarget.id); if (error) throw new Error(error.message); if (selectedPackId === deleteTarget.id) setSelectedPackId(null); }
      if (deleteTarget.kind === "sticker") { const { error } = await supabase.from("stickers").delete().eq("id", deleteTarget.id); if (error) throw new Error(error.message); if (selectedStickerId === deleteTarget.id) setSelectedStickerId(null); }
      if (deleteTarget.kind === "template") { const { error } = await supabase.from("canvas_templates").delete().eq("id", deleteTarget.id); if (error) throw new Error(error.message); if (selectedTemplateId === deleteTarget.id) setSelectedTemplateId(null); }
      if (deleteTarget.kind === "unlock") { const { error } = await supabase.from("sticker_unlock_rules").delete().eq("id", deleteTarget.id); if (error) throw new Error(error.message); }
      await refresh(); setMsg("Elemento borrado."); setDeleteTarget(null);
    } catch (error: unknown) {
      setMsg(toErrorMessage(error, "No se pudo borrar el elemento."));
    } finally { setBusyDelete(false); }
  }

  function describeUnlockRule(rule: UnlockRuleRow) {
    if (rule.rule_type === "always") return "Siempre visible";
    if (rule.rule_type === "progression_rank") {
      return `Rango ${labelTier(rule.rule_value ?? "")}`;
    }
    if (rule.rule_type === "progression_tree") {
      const match = progressionTrees.find((entry) => entry.id === rule.rule_value);
      return match ? `${match.title} / ${match.kind === "pages_completed" ? "Paginas" : "Semillas"} ${match.threshold}` : `Regla ${rule.rule_value}`;
    }
    return rule.rule_value ?? "Manual";
  }

  function summarizeTemplate(templateId: string) {
    const counts = new Map<string, number>();
    for (const row of templateObjects) {
      if (row.template_id !== templateId || !row.enabled) continue;
      const type = row.object_json && typeof row.object_json === "object" && !Array.isArray(row.object_json) ? String((row.object_json as Record<string, unknown>).type ?? "") : "";
      if (!type) continue;
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }
    return counts.size ? Array.from(counts.entries()).map(([type, count]) => `${count} ${type}`).join(" / ") : "Sin objetos";
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--lv-bg)] p-6 text-[var(--lv-text)]">
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="rounded-[28px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-6 py-5 shadow-[var(--lv-shadow-sm)]">
            Cargando admin canvas...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--lv-bg)] p-6 text-[var(--lv-text)]">
      <div className="relative min-h-[calc(100dvh-48px)] overflow-hidden rounded-[34px] border border-[var(--lv-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,251,247,0.94))] shadow-[var(--lv-shadow-md)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,241,221,0.45),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(223,235,255,0.52),transparent_42%)]" />

        <div className="absolute left-1/2 top-6 z-30 flex max-w-[calc(100%-48px)] -translate-x-1/2 items-center justify-center gap-2 overflow-x-auto rounded-full border border-[var(--lv-border)] bg-[rgba(255,255,255,0.95)] px-3 py-2 shadow-[var(--lv-shadow-sm)] backdrop-blur">
          <ToolbarButton onClick={() => router.push("/admin")}>Volver</ToolbarButton>
          <ToolbarButton active={activePanel === "library"} onClick={() => togglePanel("library")}>
            Biblioteca
          </ToolbarButton>
          <ToolbarButton active={activePanel === "inspector"} onClick={() => togglePanel("inspector")}>
            Inspector
          </ToolbarButton>
          <ToolbarButton active={view === "demo"} onClick={() => changeView("demo")}>
            Demo
          </ToolbarButton>
          <ToolbarButton active={view === "packs"} onClick={() => changeView("packs")}>
            Packs
          </ToolbarButton>
          <ToolbarButton active={view === "stickers"} onClick={() => changeView("stickers")}>
            Stickers
          </ToolbarButton>
          <ToolbarButton active={view === "templates"} onClick={() => changeView("templates")}>
            Plantillas
          </ToolbarButton>
          {saveCurrentLabel ? (
            <button className={primaryActionClass} onClick={() => void saveCurrentView()}>
              {saveCurrentLabel}
            </button>
          ) : null}
        </div>

        {msg ? (
          <div className="absolute left-1/2 top-28 z-30 w-[min(920px,calc(100%-32px))] -translate-x-1/2">
            <StatusNotice message={msg} />
          </div>
        ) : null}

        <div className="absolute inset-0 px-6 pb-24 pt-28 xl:px-[23rem]">
          <div className="flex h-full flex-col rounded-[32px] border border-[var(--lv-border)] bg-[rgba(255,255,255,0.76)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur">
            <div className="mb-2 flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--lv-text-muted)]">
                  Biblioteca creativa del recuerdo
                </div>
                <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-[var(--lv-text)]">
                  Canvas
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--lv-text-muted)]">
                  Aqui decides que recursos creativos existen realmente: stickers, packs,
                  plantillas y futuras capas para enriquecer recuerdos. Progression solo decide
                  cuando se desbloquean.
                </p>
              </div>
              <div className="rounded-[22px] border border-[var(--lv-border)] bg-[rgba(255,255,255,0.92)] px-4 py-2 text-sm leading-6 text-[var(--lv-text-muted)] shadow-[var(--lv-shadow-sm)]">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">Modo</div>
                <div className="mt-0.5 text-sm font-medium text-[var(--lv-text)]">
                  {view === "demo"
                    ? "Preview general"
                    : view === "packs"
                      ? creatingPack
                        ? "Nuevo pack"
                        : selectedPack?.label ?? "Packs"
                      : view === "stickers"
                        ? creatingSticker
                          ? "Nuevo sticker"
                          : selectedSticker?.label ?? "Stickers"
                        : creatingTemplate
                          ? "Nueva plantilla"
                          : selectedTemplate?.label ?? "Plantillas"}
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1">
              <div className="h-full rounded-[30px] border border-[var(--lv-border)] bg-[linear-gradient(180deg,rgba(250,253,250,0.98),rgba(243,249,245,0.95))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                <CanvasEditor
                  value={demoObjects}
                  onChange={() => undefined}
                  readOnly
                  showVideoUploadPanel={false}
                />
              </div>
            </div>
          </div>
        </div>

        {activePanel === "library" ? (
          <FloatingCanvasPanel
            title={
              view === "demo"
                ? "Biblioteca creativa"
                : view === "packs"
                  ? "Biblioteca de packs"
                  : view === "stickers"
                    ? "Biblioteca de stickers"
                    : "Biblioteca de plantillas"
            }
            description={
              view === "demo"
                ? "Canvas debe sentirse como una caja de herramientas creativa, no como un panel de desbloqueos."
                : view === "packs"
                  ? "Selecciona o crea recursos sin salir del stage central."
                  : view === "stickers"
                    ? "Aquí revisas y eliges los assets base del lienzo."
                    : "Las plantillas ayudan a empezar sin lienzo vacío."
            }
            onClose={() => setActivePanel(null)}
            className="left-6 top-28 bottom-24 w-[320px]"
          >
            <>
          <AdminPanel title="Trabajo actual" description="La barra superior ya gobierna el modo activo de canvas.">
            <AdminInlineNote>
              Usa `Demo`, `Packs`, `Stickers` y `Plantillas` desde el toolbar centrado para no duplicar controles aqui dentro.
            </AdminInlineNote>
          </AdminPanel>
          <AdminPanel title="Resumen rápido" description="Lectura corta del estado de la biblioteca creativa.">
            <div className="grid gap-2"><SummaryValue label="Total packs" value={String(packs.length)} /><SummaryValue label="Total stickers" value={String(stickers.length)} /><SummaryValue label="Total plantillas" value={String(templates.length)} /><SummaryValue label="Reglas activas" value={String(unlockRules.filter((rule) => rule.enabled).length)} /></div>
          </AdminPanel>

          {view === "demo" ? <AdminPanel title="Qué puede vivir aquí" description="Canvas no se queda solo en stickers. Esta es la caja de herramientas para personalizar recuerdos con mucho más juego.">
            <div className="space-y-2">{creativeCapabilities.map((entry) => <AdminInlineNote key={entry}>{entry}</AdminInlineNote>)}</div>
          </AdminPanel> : null}

          {view === "packs" ? <AdminPanel title="Biblioteca de packs" description="Cada pack debe corresponder a una coleccion reconocible." actions={<button className={subtleActionClass} onClick={startNewPack}>Nuevo pack</button>}>
            <div className="space-y-2">{packs.map((pack) => {
              const count = packItems.filter((item) => item.pack_id === pack.id && item.enabled).length;
              const unlockCount = unlockRules.filter((rule) => rule.pack_id === pack.id && rule.enabled).length;
              return <button key={pack.id} type="button" onClick={() => { setCreatingPack(false); setSelectedPackId(pack.id); setView("packs"); }} className={selectableLibraryCardClass(!creatingPack && selectedPackId === pack.id)}><div className="text-sm font-medium text-[var(--lv-text)]">{pack.label}</div><div className="mt-1 text-xs leading-5 text-[var(--lv-text-muted)]">{count} stickers - {unlockCount ? `${unlockCount} reglas` : "sin reglas"}</div></button>;
            })}{!packs.length ? <AdminInlineNote>No hay packs todavía. Crea el primero y luego mete stickers dentro.</AdminInlineNote> : null}</div>
          </AdminPanel> : null}

          {view === "stickers" ? <AdminPanel title="Biblioteca de stickers" description="Selecciona un sticker para editarlo o crea uno nuevo." actions={<button className={subtleActionClass} onClick={startNewSticker}>Nuevo sticker</button>}>
            <div className="space-y-2"><input className={`w-full ${compactFieldControlClass}`} placeholder="Buscar sticker" value={librarySearch} onChange={(event) => setLibrarySearch(event.target.value)} />
            {filteredStickers.slice(0, 18).map((sticker) => <button key={sticker.id} type="button" onClick={() => { setCreatingSticker(false); setSelectedStickerId(sticker.id); setView("stickers"); }} className={`flex items-center gap-3 ${selectableLibraryCardClass(!creatingSticker && selectedStickerId === sticker.id)}`}><StickerThumb src={sticker.src} alt={sticker.label} /><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-[var(--lv-text)]">{sticker.label}</div><div className="truncate text-xs text-[var(--lv-text-muted)]">{sticker.category ?? "Sin categoría"}</div></div></button>)}
            {!filteredStickers.length ? <AdminInlineNote>No hay stickers para este filtro.</AdminInlineNote> : null}</div>
          </AdminPanel> : null}

          {view === "templates" ? <AdminPanel title="Plantillas guardadas" description="Solo toca aquí cuando realmente quieras cambiar la base del lienzo." actions={<button className={subtleActionClass} onClick={startNewTemplate}>Nueva plantilla</button>}>
            <div className="space-y-2"><input className={`w-full ${compactFieldControlClass}`} placeholder="Buscar plantilla" value={templateSearch} onChange={(event) => setTemplateSearch(event.target.value)} />
            {filteredTemplates.map((template) => <button key={template.id} type="button" onClick={() => { setCreatingTemplate(false); setSelectedTemplateId(template.id); setView("templates"); }} className={selectableLibraryCardClass(!creatingTemplate && selectedTemplateId === template.id)}><div className="text-sm font-medium text-[var(--lv-text)]">{template.label}</div><div className="mt-1 text-xs leading-5 text-[var(--lv-text-muted)]">{summarizeTemplate(template.id)}</div></button>)}
            {!filteredTemplates.length ? <AdminInlineNote>No hay plantillas para este filtro.</AdminInlineNote> : null}</div>
          </AdminPanel> : null}
            </>
          </FloatingCanvasPanel>
        ) : null}

        {activePanel === "inspector" ? (
          <FloatingCanvasPanel
            title={
              view === "demo"
                ? "Inspector del canvas"
                : view === "packs"
                  ? creatingPack
                    ? "Nuevo pack"
                    : selectedPack
                      ? `Pack - ${selectedPack.label}`
                      : "Nuevo pack"
                  : view === "stickers"
                    ? creatingSticker
                      ? "Nuevo sticker"
                      : selectedSticker
                        ? `Sticker - ${selectedSticker.label}`
                        : "Nuevo sticker"
                    : creatingTemplate
                      ? "Nueva plantilla"
                      : selectedTemplate
                        ? `Plantilla - ${selectedTemplate.label}`
                        : "Nueva plantilla"
            }
            description={
              view === "demo"
                ? "Una lectura corta de como esta respirando el dominio y hacia donde puede crecer."
                : view === "packs"
                  ? "Crea colecciones claras y conecta bien sus desbloqueos."
                  : view === "stickers"
                    ? "Edita el asset una vez y reutilizalo donde haga falta."
                    : "Ajusta la base del lienzo solo cuando realmente aporte."
            }
            onClose={() => setActivePanel(null)}
            className="right-6 top-28 bottom-24 w-[min(420px,calc(100%-3rem))]"
          >

          {view === "demo" ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <SummaryValue label="Plantilla" value={demoTemplate?.label ?? "Fallback"} />
                <SummaryValue label="Stickers inyectados" value={String(Math.min(3, demoStickerSources.length))} />
                <SummaryValue label="Objetos demo" value={String(demoObjects.length)} />
                <SummaryValue label="Packs con reglas" value={String(stats.gatedPacks)} />
              </div>
              <AdminPanel title="Como debería usarse" description="Canvas define el recurso creativo; progression decide cuando se consigue.">
                <div className="space-y-2 text-sm leading-6 text-[var(--lv-text-muted)]">
                  <div>Crea stickers una sola vez y reutilízalos en packs y recuerdos.</div>
                  <div>Usa plantillas como punto de partida, no como límite del lienzo.</div>
                  <div>Reserva los desbloqueos narrativos a progression para no duplicar contexto.</div>
                </div>
              </AdminPanel>
              <AdminPanel title="Ideas futuras con encaje" description="Capas que enriquecerian el recuerdo sin convertir esto en otro dominio narrativo.">
                <div className="space-y-2 text-sm leading-6 text-[var(--lv-text-muted)]">
                  <div>Tarjetas de audio y cita destacada.</div>
                  <div>Capas de collage: cinta, sello, ticket, papel y borde manual.</div>
                  <div>Modulos de contexto: lugar, fecha, clima, trayecto y playlist.</div>
                  <div>Fondos, marcos y efectos suaves desbloqueables.</div>
                </div>
              </AdminPanel>
            </div>
          ) : null}

          {view === "packs" ? <div className="space-y-4">
            <AdminPanel title={creatingPack ? "Nuevo pack" : selectedPack ? `Pack: ${selectedPack.label}` : "Nuevo pack"} description="Crea una coleccion clara. Un pack debe tener una intención reconocible y una regla de desbloqueo clara." actions={!creatingPack && selectedPack ? <button className={dangerActionClass} onClick={() => setDeleteTarget({ kind: "pack", id: selectedPack.id })}>Borrar pack</button> : null}>
              <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]"><div className="grid gap-3"><input className={fieldControlClass} placeholder="Nombre del pack" value={packDraft.label} onChange={(event) => setPackDraft((prev) => ({ ...prev, label: event.target.value }))} /><input className={fieldControlClass} placeholder="Key interna" value={packDraft.key} onChange={(event) => setPackDraft((prev) => ({ ...prev, key: event.target.value }))} /><textarea className={`min-h-[110px] ${fieldControlClass}`} placeholder="Para que sirve este pack y cuando debería desbloquearse" value={packDraft.description} onChange={(event) => setPackDraft((prev) => ({ ...prev, description: event.target.value }))} /></div><div className="space-y-3 rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4"><label className="flex items-center gap-2 text-sm text-[var(--lv-text-muted)]"><input type="checkbox" checked={packDraft.isActive} onChange={(event) => setPackDraft((prev) => ({ ...prev, isActive: event.target.checked }))} />Pack activo</label><AdminInlineNote>Ejemplos buenos: &quot;Celebracion dorada&quot;, &quot;Naturaleza suave&quot;, &quot;Recuerdos en casa&quot;.</AdminInlineNote><div className="flex flex-wrap gap-2"><button className={primaryActionClass} onClick={savePack}>{creatingPack ? "Crear pack" : "Guardar pack"}</button><button className={secondaryActionClass} onClick={() => { setCreatingPack(false); if (packs.length) setSelectedPackId((current) => current ?? packs[0].id); }}>Cancelar</button></div></div></div>
            </AdminPanel>
            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <AdminPanel title="Contenido del pack" description={selectedPack ? "Gestiona que stickers contiene este pack y en que orden se muestran." : "Selecciona un pack para ver su contenido."}>
                {!selectedPack ? <AdminInlineNote>Selecciona o crea un pack para meter stickers dentro.</AdminInlineNote> : <div className="space-y-4"><div className={tableShellClass}><table className="min-w-full text-sm"><thead className="bg-[var(--lv-surface-soft)]"><tr><th className="p-2 text-left">Sticker</th><th className="p-2 text-left">Orden</th><th className="p-2 text-left">Estado</th><th className="p-2 text-left">Acciones</th></tr></thead><tbody>{packItemsForSelectedPack.map((item) => <tr key={item.id} className="border-t border-[var(--lv-border)] align-top"><td className="p-2">{item.sticker ? <div className="flex items-center gap-3"><StickerThumb src={item.sticker.src} alt={item.sticker.label} /><div><div className="font-medium text-[var(--lv-text)]">{item.sticker.label}</div><div className="text-xs text-[var(--lv-text-muted)]">{item.sticker.key}</div></div></div> : <span className="text-[var(--lv-text-muted)]">Sticker no encontrado</span>}</td><td className="p-2"><input className="w-24 rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-2 text-sm text-[var(--lv-text)] outline-none" defaultValue={String(item.sort_order)} onBlur={(event) => { const next = Number.parseInt(event.target.value, 10); if (Number.isFinite(next)) void updatePackItem(item.id, { sort_order: next }); }} /></td><td className="p-2"><label className="flex items-center gap-2 text-sm text-[var(--lv-text-muted)]"><input type="checkbox" checked={item.enabled} onChange={(event) => void updatePackItem(item.id, { enabled: event.target.checked })} />{item.enabled ? "Activo" : "Oculto"}</label></td><td className="p-2"><button className={subtleActionClass} onClick={() => void removePackItem(item.id)}>Quitar del pack</button></td></tr>)}{!packItemsForSelectedPack.length ? <tr><td colSpan={4} className="p-3 text-[var(--lv-text-muted)]">Este pack aún no tiene stickers.</td></tr> : null}</tbody></table></div>
                <div className="rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h3 className="text-sm font-semibold text-[var(--lv-text)]">Añadir stickers existentes</h3><p className="mt-1 text-xs leading-5 text-[var(--lv-text-muted)]">Usa esta lista para montar el pack sin duplicar assets.</p></div><input className={compactFieldControlClass} placeholder="Buscar sticker" value={packStickerSearch} onChange={(event) => setPackStickerSearch(event.target.value)} /></div><div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{availableStickersForSelectedPack.slice(0, 18).map((sticker) => <div key={sticker.id} className="flex items-center gap-3 rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-3"><StickerThumb src={sticker.src} alt={sticker.label} /><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-[var(--lv-text)]">{sticker.label}</div><div className="truncate text-xs text-[var(--lv-text-muted)]">{sticker.category ?? "Sin categoría"}</div></div><button className={subtleActionClass} onClick={() => void addStickerToSelectedPack(sticker.id)}>Añadir</button></div>)}{!availableStickersForSelectedPack.length ? <AdminInlineNote>No hay más stickers disponibles para este pack con ese filtro.</AdminInlineNote> : null}</div></div></div>}
              </AdminPanel>

              <AdminPanel title="Desbloqueo del pack" description={selectedPack ? "Define si este pack aparece siempre o si depende de hitos o tiers reales del sistema." : "Selecciona un pack para editar sus reglas."}>
                {!selectedPack ? <AdminInlineNote>Las reglas de desbloqueo viven dentro del pack. Así evitamos una pantalla separada que solo duplicaba contexto.</AdminInlineNote> : <div className="space-y-4"><div className="rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4"><div className="grid gap-3"><select className={fieldControlClass} value={newRuleType} onChange={(event) => setNewRuleType(event.target.value as UnlockRuleType)}><option value="always">Siempre visible</option><option value="progression_tree">Cuando se desbloquee un hito concreto</option><option value="progression_rank">Cuando se llegue a un rango</option><option value="manual">Manual / etiqueta libre</option></select>{newRuleType === "progression_tree" ? <select className={fieldControlClass} value={newRuleTreeId} onChange={(event) => setNewRuleTreeId(event.target.value)}><option value="">Selecciona un hito</option>{progressionTrees.map((rule) => <option key={rule.id} value={rule.id}>{`${rule.title} - ${labelTier(rule.rank ?? "bronze")}`}</option>)}</select> : null}{newRuleType === "progression_rank" ? <select className={fieldControlClass} value={newRuleRank} onChange={(event) => setNewRuleRank(event.target.value)}>{PROGRESSION_TREE_RANK_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : null}{newRuleType === "manual" ? <input className={fieldControlClass} placeholder="Etiqueta interna para este desbloqueo" value={newRuleManualValue} onChange={(event) => setNewRuleManualValue(event.target.value)} /> : null}<button className={primaryActionClass} onClick={createUnlockRule}>Guardar regla</button></div></div><div className="space-y-2">{packUnlockRules.map((rule) => <div key={rule.id} className="flex flex-col gap-3 rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-3 lg:flex-row lg:items-center lg:justify-between"><div className="space-y-1"><div className="text-sm font-medium text-[var(--lv-text)]">{describeUnlockRule(rule)}</div><div className="text-xs uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">{rule.rule_type}</div></div><div className="flex flex-wrap gap-2"><button className={subtleActionClass} onClick={() => void toggleUnlockRule(rule)}>{rule.enabled ? "Ocultar" : "Activar"}</button><button className={dangerActionClass} onClick={() => setDeleteTarget({ kind: "unlock", id: rule.id })}>Borrar</button></div></div>)}{!packUnlockRules.length ? <AdminInlineNote>Este pack aún no tiene reglas. Si debe estar siempre visible, crea una regla &quot;Siempre visible&quot;.</AdminInlineNote> : null}</div></div>}
              </AdminPanel>
            </div>
          </div> : null}

          {view === "stickers" ? <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]"><AdminPanel title={creatingSticker ? "Nuevo sticker" : selectedSticker ? `Sticker: ${selectedSticker.label}` : "Nuevo sticker"} description="Crea el asset una vez, asignale categoría y, si quieres, anadelo a un pack al guardar." actions={selectedSticker ? <button className={dangerActionClass} onClick={() => setDeleteTarget({ kind: "sticker", id: selectedSticker.id })}>Borrar sticker</button> : null}><div className="space-y-3"><input className={fieldControlClass} placeholder="Nombre visible" value={stickerDraft.label} onChange={(event) => setStickerDraft((prev) => ({ ...prev, label: event.target.value }))} /><input className={fieldControlClass} placeholder="Key interna" value={stickerDraft.key} onChange={(event) => setStickerDraft((prev) => ({ ...prev, key: event.target.value }))} /><input className={fieldControlClass} placeholder="Categoria" value={stickerDraft.category} onChange={(event) => setStickerDraft((prev) => ({ ...prev, category: event.target.value }))} /><input className={fieldControlClass} placeholder="URL manual del sticker (opcional si subes archivo)" value={stickerDraft.src} onChange={(event) => setStickerDraft((prev) => ({ ...prev, src: event.target.value }))} /><div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_120px]"><select className={fieldControlClass} value={stickerDraft.assignPackId} onChange={(event) => setStickerDraft((prev) => ({ ...prev, assignPackId: event.target.value }))}><option value="">No asignar a pack</option>{packs.map((pack) => <option key={pack.id} value={pack.id}>{pack.label}</option>)}</select><input className={fieldControlClass} placeholder="Orden" value={stickerDraft.sortOrder} onChange={(event) => setStickerDraft((prev) => ({ ...prev, sortOrder: event.target.value }))} /></div><label className="flex items-center gap-2 text-sm text-[var(--lv-text-muted)]"><input type="checkbox" checked={stickerDraft.isActive} onChange={(event) => setStickerDraft((prev) => ({ ...prev, isActive: event.target.checked }))} />Sticker activo</label><div className="rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4"><div className="flex flex-wrap items-center gap-2"><input ref={fileRef} type="file" accept=".svg,image/svg+xml,image/png,image/jpeg,image/jpg,image/webp" className="hidden" onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} /><button className={secondaryActionClass} onClick={() => fileRef.current?.click()}>Seleccionar archivo</button><span className="text-sm text-[var(--lv-text-muted)]">{uploadFile ? uploadFile.name : "Sin archivo seleccionado"}</span></div><p className="mt-2 text-xs leading-5 text-[var(--lv-text-muted)]">Se acepta SVG, PNG, JPG o WEBP. Si subes raster, se envuelve en SVG para mantener el pipeline del editor.</p></div><div className="flex flex-wrap gap-2"><button className={`${primaryActionClass} disabled:opacity-50`} onClick={saveSticker} disabled={uploading}>{uploading ? "Procesando..." : creatingSticker ? "Crear sticker" : "Guardar sticker"}</button><button className={secondaryActionClass} onClick={() => { setCreatingSticker(false); setUploadFile(null); if (fileRef.current) fileRef.current.value = ""; }}>Cancelar</button></div></div></AdminPanel>
          <AdminPanel title="Stickers existentes" description="Esta lista ya sirve para revisar visualmente que asset existe, donde vive y cual necesita limpieza."><div className={tableShellClass}><table className="min-w-full text-sm"><thead className="bg-[var(--lv-surface-soft)]"><tr><th className="p-2 text-left">Sticker</th><th className="p-2 text-left">Packs</th><th className="p-2 text-left">Estado</th><th className="p-2 text-left">Accion</th></tr></thead><tbody>{filteredStickers.map((sticker) => { const packNames = packItems.filter((item) => item.sticker_id === sticker.id && item.enabled).map((item) => packs.find((pack) => pack.id === item.pack_id)?.label ?? item.pack_id).join(", "); return <tr key={sticker.id} className="border-t border-[var(--lv-border)] align-top"><td className="p-2"><div className="flex items-center gap-3"><StickerThumb src={sticker.src} alt={sticker.label} /><div><div className="font-medium text-[var(--lv-text)]">{sticker.label}</div><div className="text-xs text-[var(--lv-text-muted)]">{sticker.key} - {sticker.category ?? "Sin categoría"}</div></div></div></td><td className="p-2 text-[var(--lv-text-muted)]">{packNames || "Sin pack"}</td><td className="p-2 text-[var(--lv-text-muted)]">{sticker.is_active ? "Activo" : "Oculto"}</td><td className="p-2"><button className={subtleActionClass} onClick={() => { setCreatingSticker(false); setSelectedStickerId(sticker.id); }}>Editar</button></td></tr>; })}{!filteredStickers.length ? <tr><td colSpan={4} className="p-3 text-[var(--lv-text-muted)]">No hay stickers para este filtro.</td></tr> : null}</tbody></table></div></AdminPanel></div> : null}

          {view === "templates" ? <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]"><AdminPanel title={creatingTemplate ? "Nueva plantilla" : selectedTemplate ? `Plantilla: ${selectedTemplate.label}` : "Nueva plantilla"} description="Aquí dejas la base del lienzo. Sigue siendo el bloque mas avanzado del canvas, pero ya queda aislado y no contamina el resto." actions={selectedTemplate ? <button className={dangerActionClass} onClick={() => setDeleteTarget({ kind: "template", id: selectedTemplate.id })}>Borrar plantilla</button> : null}><div className="space-y-3"><input className={fieldControlClass} placeholder="Nombre visible" value={templateDraft.label} onChange={(event) => setTemplateDraft((prev) => ({ ...prev, label: event.target.value }))} /><input className={fieldControlClass} placeholder="Key interna" value={templateDraft.key} onChange={(event) => setTemplateDraft((prev) => ({ ...prev, key: event.target.value }))} /><input className={fieldControlClass} placeholder="Descripción" value={templateDraft.description} onChange={(event) => setTemplateDraft((prev) => ({ ...prev, description: event.target.value }))} /><div className="grid gap-3 lg:grid-cols-[140px_minmax(0,1fr)]"><input className={fieldControlClass} placeholder="Orden" value={templateDraft.sortOrder} onChange={(event) => setTemplateDraft((prev) => ({ ...prev, sortOrder: event.target.value }))} /><label className="flex items-center gap-2 rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-3 text-sm text-[var(--lv-text-muted)]"><input type="checkbox" checked={templateDraft.enabled} onChange={(event) => setTemplateDraft((prev) => ({ ...prev, enabled: event.target.checked }))} />Plantilla activa</label></div><textarea className={`min-h-[320px] font-mono text-xs ${fieldControlClass}`} value={templateDraft.objectsJson} onChange={(event) => setTemplateDraft((prev) => ({ ...prev, objectsJson: event.target.value }))} /><div className="flex flex-wrap gap-2"><button className={primaryActionClass} onClick={saveTemplate}>{creatingTemplate ? "Crear plantilla" : "Guardar plantilla"}</button><button className={secondaryActionClass} onClick={() => { setCreatingTemplate(false); if (selectedTemplate) { const rows = templateObjects.filter((item) => item.template_id === selectedTemplate.id && item.enabled).sort((a, b) => a.object_order - b.object_order).map((item) => item.object_json); setTemplateDraft({ key: selectedTemplate.key, label: selectedTemplate.label, description: selectedTemplate.description ?? "", sortOrder: String(selectedTemplate.sort_order), enabled: selectedTemplate.enabled, objectsJson: stringifyJson(rows) }); } else setTemplateDraft(emptyTemplate()); }}>Cancelar</button></div></div></AdminPanel>
          <AdminPanel title="Plantillas disponibles" description="Revisa rápido cuantos objetos tiene cada plantilla y entra solo en la que de verdad necesitas tocar."><div className="space-y-2">{filteredTemplates.map((template) => <div key={template.id} className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><div className="text-sm font-semibold text-[var(--lv-text)]">{template.label}</div><div className="mt-1 text-xs text-[var(--lv-text-muted)]">{template.key}</div><div className="mt-2 text-sm text-[var(--lv-text-muted)]">{template.description ?? "Sin descripción"}</div><div className="mt-2 text-xs text-[var(--lv-text-muted)]">{summarizeTemplate(template.id)}</div></div><div className="flex flex-wrap gap-2"><button className={subtleActionClass} onClick={() => { setCreatingTemplate(false); setSelectedTemplateId(template.id); }}>Editar</button><button className={subtleActionClass} onClick={() => void toggleTemplate(template)}>{template.enabled ? "Ocultar" : "Activar"}</button></div></div></div>)}{!filteredTemplates.length ? <AdminInlineNote>No hay plantillas para este filtro.</AdminInlineNote> : null}</div></AdminPanel></div> : null}
          </FloatingCanvasPanel>
        ) : null}

        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 flex-wrap justify-center gap-3">
          <SummaryPill label="Packs activos" value={String(stats.activePacks)} />
          <SummaryPill label="Stickers activos" value={String(stats.activeStickers)} />
          <SummaryPill label="Plantillas activas" value={String(stats.activeTemplates)} />
          <SummaryPill label="Packs con reglas" value={String(stats.gatedPacks)} />
        </div>
      </div>

      <ConfirmModal open={!!deleteTarget} title={deleteTarget?.kind === "pack" ? "Borrar pack" : deleteTarget?.kind === "sticker" ? "Borrar sticker" : deleteTarget?.kind === "template" ? "Borrar plantilla" : "Borrar regla"} description={deleteTarget?.kind === "pack" ? "Se borraran también sus relaciones con stickers y sus reglas de desbloqueo." : deleteTarget?.kind === "sticker" ? "Se eliminará el asset del catálogo y sus asignaciones a packs." : deleteTarget?.kind === "template" ? "Se eliminaran también los objetos de esa plantilla." : "La regla dejara de afectar al pack seleccionado."} confirmLabel="Borrar" cancelLabel="Cancelar" tone="danger" busy={busyDelete} onCancel={() => setDeleteTarget(null)} onConfirm={() => void confirmDelete()} />
    </div>
  );
}


