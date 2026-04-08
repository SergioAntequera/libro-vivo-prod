"use client";

import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { ensureSuperadminOrRedirect } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { AdminInlineNote } from "@/components/admin/AdminWorkspace";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { PageDetailMainPanel } from "@/components/pageDetail/PageDetailMainPanel";
import { getFallbackPlanTypeOptions } from "@/lib/planTypeCatalog";
import { resolveFlowerAssetPathByRating } from "@/lib/homeSceneDefaults";
import { normalizePageRow } from "@/lib/pageDetailTypes";
import type { PageCompletionState } from "@/lib/productDomainContracts";
import {
  FLOWER_PAGE_LAYOUT_CATALOG_KEY,
  FLOWER_PAGE_STAGE_HEIGHT,
  FLOWER_PAGE_STAGE_WIDTH,
  getFallbackFlowerPageLayoutConfig,
  getFlowerPageBlockPreset,
  getFlowerPageLayoutCatalogRows,
  getFlowerPageLayoutConfig,
  getFlowerPageLayoutBlockMap,
  normalizeFlowerPageLayoutConfig,
  type FlowerPageBlockConfig,
  type FlowerPageBlockId,
  type FlowerPageLayoutConfig,
  type FlowerPageLayoutIssue,
} from "@/lib/flowerPageLayoutConfig";
import { buildFlowerValidationIssues } from "@/lib/adminDiagnostics";
import {
  getDefaultValidationRules,
  loadValidationRulesForDomain,
  type ValidationRuleDefinition,
} from "@/lib/adminValidationRules";

type ResizeHandle = "n" | "e" | "s" | "w" | "nw" | "ne" | "sw" | "se";

type DragInteraction =
  | {
      mode: "move";
      blockId: FlowerPageBlockId;
      startClientX: number;
      startClientY: number;
      startBlock: FlowerPageBlockConfig;
    }
  | {
      mode: "resize";
      blockId: FlowerPageBlockId;
      corner: ResizeHandle;
      startClientX: number;
      startClientY: number;
      startBlock: FlowerPageBlockConfig;
    };

type FloatingPanelDrag =
  | {
      panel: "inspector";
      startClientX: number;
      startClientY: number;
      startOffsetX: number;
      startOffsetY: number;
    }
  | null;

const noop = () => {};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundMetric(value: number) {
  return Math.round(value * 100) / 100;
}

function completionStateForRating(rating: number): PageCompletionState {
  if (rating >= 5) return "complete";
  if (rating >= 4) return "enriched";
  if (rating >= 3) return "captured";
  return "pending_capture";
}

function updateBlockInConfig(
  config: FlowerPageLayoutConfig,
  blockId: FlowerPageBlockId,
  updater: (block: FlowerPageBlockConfig) => FlowerPageBlockConfig,
) {
  return normalizeFlowerPageLayoutConfig({
    blocks: config.blocks.map((block) =>
      block.id === blockId ? updater(block) : block,
    ),
  });
}

function sortIssues(issues: FlowerPageLayoutIssue[]) {
  const rank = { error: 0, warning: 1, info: 2 };
  return [...issues].sort((left, right) => rank[left.tone] - rank[right.tone]);
}

function applyResizeDelta(
  block: FlowerPageBlockConfig,
  corner: ResizeHandle,
  deltaX: number,
  deltaY: number,
) {
  let nextX = block.x;
  let nextY = block.y;
  let nextW = block.w;
  let nextH = block.h;

  if (corner === "ne" || corner === "e" || corner === "se") {
    nextW = roundMetric(clamp(block.w + deltaX, block.minW, Math.min(block.maxW, 100 - block.x)));
  }
  if (corner === "sw" || corner === "w" || corner === "nw") {
    const right = block.x + block.w;
    const minX = Math.max(0, right - block.maxW);
    const maxX = right - block.minW;
    nextX = roundMetric(clamp(block.x + deltaX, minX, maxX));
    nextW = roundMetric(right - nextX);
  }
  if (corner === "sw" || corner === "s" || corner === "se") {
    nextH = roundMetric(clamp(block.h + deltaY, block.minH, Math.min(block.maxH, 100 - block.y)));
  }
  if (corner === "nw" || corner === "n" || corner === "ne") {
    const bottom = block.y + block.h;
    const minY = Math.max(0, bottom - block.maxH);
    const maxY = bottom - block.minH;
    nextY = roundMetric(clamp(block.y + deltaY, minY, maxY));
    nextH = roundMetric(bottom - nextY);
  }

  return { ...block, x: nextX, y: nextY, w: nextW, h: nextH };
}

function FloatingPanel(props: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onHeaderPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      style={props.style}
      className={`absolute z-20 rounded-[28px] border border-[#d9e4d3] bg-white/96 p-4 shadow-[0_24px_80px_rgba(24,36,26,0.18)] backdrop-blur ${props.className ?? ""}`}
    >
      <div
        className={`mb-3 flex items-start justify-between gap-3 ${
          props.onHeaderPointerDown ? "cursor-grab active:cursor-grabbing" : ""
        }`}
        onPointerDown={props.onHeaderPointerDown}
      >
        <h2 className="text-base font-semibold text-slate-950">{props.title}</h2>
        <button
          type="button"
          onClick={props.onClose}
          className="rounded-full border border-[#d9e4d3] px-2.5 py-1 text-xs text-slate-600 transition hover:bg-[#f7faf4]"
        >
          Cerrar
        </button>
      </div>
      {props.children}
    </div>
  );
}

export default function AdminFlowersPage() {
  const router = useRouter();
  const previewRef = useRef<HTMLDivElement | null>(null);
  const planTypeOptions = useMemo(() => getFallbackPlanTypeOptions(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [layoutConfig, setLayoutConfig] = useState<FlowerPageLayoutConfig>(
    getFallbackFlowerPageLayoutConfig(),
  );
  const [initialSerializedConfig, setInitialSerializedConfig] = useState("");
  const [selectedBlockId, setSelectedBlockId] = useState<FlowerPageBlockId | null>(null);
  const [showDemoPanel, setShowDemoPanel] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showValidationPanel, setShowValidationPanel] = useState(false);
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(false);
  const [interaction, setInteraction] = useState<DragInteraction | null>(null);
  const [floatingPanelDrag, setFloatingPanelDrag] = useState<FloatingPanelDrag>(null);
  const [inspectorOffset, setInspectorOffset] = useState({ x: 0, y: 0 });
  const [previewTitle, setPreviewTitle] = useState("Atardecer con termo y paseo lento");
  const [previewSummary, setPreviewSummary] = useState(
    "Una tarde simple, de esas que no prometen gran cosa y acaban quedandose. El paseo fue suave, con charla facil, una parada improvisada y la sensacion de que el tiempo estaba de vuestro lado.",
  );
  const [previewDate, setPreviewDate] = useState("2026-03-14");
  const [previewPlanTypeId, setPreviewPlanTypeId] = useState(
    getFallbackPlanTypeOptions()[0]?.id ?? "cafe",
  );
  const [previewRating, setPreviewRating] = useState(4);
  const [previewFavorite, setPreviewFavorite] = useState(true);
  const [previewYearHighlight, setPreviewYearHighlight] = useState(true);
  const [validationRules, setValidationRules] = useState<ValidationRuleDefinition[]>(
    () => getDefaultValidationRules("flowers"),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await ensureSuperadminOrRedirect(router);
      if (!session || cancelled) return;
      const [nextConfig, loadedRules] = await Promise.all([
        getFlowerPageLayoutConfig(),
        loadValidationRulesForDomain("flowers"),
      ]);
      if (cancelled) return;
      const normalized = normalizeFlowerPageLayoutConfig(nextConfig);
      setValidationRules(loadedRules);
      setLayoutConfig(normalized);
      setInitialSerializedConfig(JSON.stringify(normalized));
      setLoading(false);
    })().catch((error) => {
      if (cancelled) return;
      console.error("[admin/flowers] fallo cargando editor:", error);
      setMsg("No se pudo cargar el editor inmersivo de flowers.");
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const normalizedConfig = useMemo(
    () => normalizeFlowerPageLayoutConfig(layoutConfig),
    [layoutConfig],
  );
  const blockMap = useMemo(
    () => getFlowerPageLayoutBlockMap(normalizedConfig),
    [normalizedConfig],
  );
  const selectedBlock = selectedBlockId ? blockMap[selectedBlockId] : null;
  const previewPlanType =
    planTypeOptions.find((option) => option.id === previewPlanTypeId) ??
    planTypeOptions[0];
  const previewCompletionState = completionStateForRating(previewRating);
  const previewPlantAsset = resolveFlowerAssetPathByRating({
    planFlowerAssetPath: previewPlanType?.flowerAssetPath ?? null,
    planFlowerFamily: previewPlanType?.flowerFamily ?? null,
    planSuggestedElement: previewPlanType?.suggestedElement ?? null,
    element: previewPlanType?.suggestedElement ?? "aether",
    rating: previewRating,
  });
  const previewPage = useMemo(
    () =>
      normalizePageRow(
        {
          id: "admin-preview-flower",
          title: previewTitle,
          plan_summary: previewSummary,
          date: previewDate,
          element: previewPlanType?.suggestedElement ?? "aether",
          canvas_objects: [],
          rating: previewRating,
          mood_state: "healthy",
          care_log: [],
          created_by: "preview",
          plan_type_id: previewPlanType?.id ?? null,
          location_label: "Mirador de la sierra",
          audio_url: "preview-audio",
          cover_photo_url: "/illustrations/packs/sunny-kids/preview.svg",
          is_favorite: previewFavorite,
        },
        "admin-preview-flower",
      ),
    [previewDate, previewFavorite, previewPlanType?.id, previewPlanType?.suggestedElement, previewRating, previewSummary, previewTitle],
  );
  const sampleLengths = useMemo(
    () => ({
      title: String(previewTitle).trim().length,
      summary: String(previewSummary).trim().length,
    }),
    [previewSummary, previewTitle],
  );
  const validationIssues = useMemo(() => {
    return sortIssues(
      buildFlowerValidationIssues({
        config: normalizedConfig,
        sampleLengths,
        rules: validationRules,
      }),
    );
  }, [normalizedConfig, sampleLengths, validationRules]);
  const disabledBlocks = normalizedConfig.blocks.filter((block) => !block.enabled);
  const isDirty = JSON.stringify(normalizedConfig) !== initialSerializedConfig;
  const previewPadding = {
    paddingTop: 112,
    paddingRight: 40,
    paddingBottom: 48,
    paddingLeft: 40,
  };

  useEffect(() => {
    if (!interaction) return;
    const active = interaction;
    function handlePointerMove(event: PointerEvent) {
      const movedX = event.clientX - active.startClientX;
      const movedY = event.clientY - active.startClientY;
      const threshold = active.mode === "move" ? 6 : 4;
      if (Math.max(Math.abs(movedX), Math.abs(movedY)) < threshold) {
        return;
      }
      const rect = previewRef.current?.getBoundingClientRect();
      const width = rect?.width ?? FLOWER_PAGE_STAGE_WIDTH;
      const height = rect?.height ?? FLOWER_PAGE_STAGE_HEIGHT;
      const deltaX = roundMetric((movedX / width) * 100);
      const deltaY = roundMetric((movedY / height) * 100);
      setLayoutConfig((current) =>
        updateBlockInConfig(current, active.blockId, (block) =>
          active.mode === "move"
            ? {
                ...block,
                x: roundMetric(clamp(active.startBlock.x + deltaX, 0, 100 - active.startBlock.w)),
                y: roundMetric(clamp(active.startBlock.y + deltaY, 0, 100 - active.startBlock.h)),
              }
            : applyResizeDelta(active.startBlock, active.corner, deltaX, deltaY),
        ),
      );
    }
    function handlePointerUp() {
      setInteraction(null);
    }
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [interaction]);

  useEffect(() => {
    if (!floatingPanelDrag) return;
    const active = floatingPanelDrag;
    function handlePointerMove(event: PointerEvent) {
      setInspectorOffset({
        x: active.startOffsetX + (event.clientX - active.startClientX),
        y: active.startOffsetY + (event.clientY - active.startClientY),
      });
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

  async function saveLayout() {
    const normalized = normalizeFlowerPageLayoutConfig(layoutConfig);
    setSaving(true);
    setMsg(null);
    try {
      const { error: catalogError } = await supabase.from("catalogs").upsert(
        {
          key: FLOWER_PAGE_LAYOUT_CATALOG_KEY,
          label: "Flores: superficie principal",
          description: "Composicion visible de la cabecera principal de /page/[id].",
          is_active: true,
        },
        { onConflict: "key" },
      );
      if (catalogError) throw new Error(catalogError.message);
      const { error } = await supabase
        .from("catalog_items")
        .upsert(getFlowerPageLayoutCatalogRows(normalized), {
          onConflict: "catalog_key,code",
        });
      if (error) throw new Error(error.message);
      setLayoutConfig(normalized);
      setInitialSerializedConfig(JSON.stringify(normalized));
      setMsg("Layout de la superficie principal publicado.");
    } catch (error) {
      setMsg(`No se pudo guardar flowers: ${error instanceof Error ? error.message : "Error desconocido"}`);
    } finally {
      setSaving(false);
    }
  }

  function startInteraction(
    blockId: FlowerPageBlockId,
    mode: "move" | "resize",
    clientX: number,
    clientY: number,
    corner?: ResizeHandle,
  ) {
    setSelectedBlockId(blockId);
    setInteraction(
      mode === "move"
        ? { mode, blockId, startClientX: clientX, startClientY: clientY, startBlock: blockMap[blockId] }
        : { mode, blockId, corner: corner ?? "se", startClientX: clientX, startClientY: clientY, startBlock: blockMap[blockId] },
    );
  }

  function updateSelectedBlock(updater: (block: FlowerPageBlockConfig) => FlowerPageBlockConfig) {
    if (!selectedBlockId) return;
    setLayoutConfig((current) => updateBlockInConfig(current, selectedBlockId, updater));
  }

  function removeSelectedBlock() {
    if (!selectedBlockId) return;
    setLayoutConfig((current) =>
      updateBlockInConfig(current, selectedBlockId, (block) => ({
        ...block,
        enabled: false,
      })),
    );
    setSelectedBlockId(null);
  }

  function startInspectorDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement | null)?.closest("button")) return;
    setFloatingPanelDrag({
      panel: "inspector",
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: inspectorOffset.x,
      startOffsetY: inspectorOffset.y,
    });
  }

  function restoreSelectedBlock() {
    if (!selectedBlockId) return;
    const fallbackBlock = getFlowerPageLayoutBlockMap(
      getFallbackFlowerPageLayoutConfig(),
    )[selectedBlockId];
    const preset = getFlowerPageBlockPreset(selectedBlockId);
    setLayoutConfig((current) =>
      updateBlockInConfig(current, selectedBlockId, () => ({
        ...fallbackBlock,
        id: preset.id,
        label: preset.defaultLabel,
        description: preset.defaultDescription,
        enabled: true,
      })),
    );
  }

  if (loading) {
    return <PageLoadingState message="Cargando editor inmersivo de flowers..." />;
  }

  return (
    <div className="lv-page h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.88),rgba(232,239,226,0.98))]">
      <div className="relative h-full w-full overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-4 z-30 -translate-x-1/2">
          <div className="pointer-events-auto inline-flex w-max max-w-[calc(100vw-2rem)] flex-wrap items-center justify-center gap-2 rounded-full border border-[#d9e4d3] bg-white/94 px-3 py-3 shadow-[0_24px_80px_rgba(24,36,26,0.16)] backdrop-blur">
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="rounded-full border border-[#d9e4d3] bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-[#f8fbf5]"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={() => setShowDemoPanel((value) => !value)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                showDemoPanel
                  ? "border-[#94b38c] bg-[#eef8e8] text-[#496445]"
                  : "border-[#d9e4d3] bg-white text-slate-700 hover:bg-[#f8fbf5]"
              }`}
            >
              Demo
            </button>
            <button
              type="button"
              onClick={() => setShowAddPanel((value) => !value)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                showAddPanel
                  ? "border-[#94b38c] bg-[#eef8e8] text-[#496445]"
                  : "border-[#d9e4d3] bg-white text-slate-700 hover:bg-[#f8fbf5]"
              }`}
            >
              Anadir bloque
            </button>
            <button
              type="button"
              onClick={() => setShowValidationPanel((value) => !value)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                showValidationPanel
                  ? "border-[#eadfc1] bg-[#fff7db] text-[#7b6116]"
                  : "border-[#d9e4d3] bg-white text-slate-700 hover:bg-[#f8fbf5]"
              }`}
            >
              Validacion {validationIssues.length ? `(${validationIssues.length})` : ""}
            </button>
            <button
              type="button"
              onClick={() => setShowAdvancedPanel((value) => !value)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                showAdvancedPanel
                  ? "border-[#d3d9e5] bg-[#f4f7fb] text-[#43506a]"
                  : "border-[#d9e4d3] bg-white text-slate-700 hover:bg-[#f8fbf5]"
              }`}
            >
              JSON
            </button>
            <button
              type="button"
              onClick={() => setLayoutConfig(getFallbackFlowerPageLayoutConfig())}
              className="rounded-full border border-[#d9e4d3] bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-[#f8fbf5]"
            >
              Restaurar base
            </button>
            <button
              type="button"
              onClick={() => void saveLayout()}
              disabled={saving}
              className="rounded-full border border-[#94b38c] bg-[#eef8e8] px-4 py-2 text-sm font-medium text-[#496445] transition hover:bg-[#e5f2dd] disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Publicar"}
            </button>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-4 left-4 z-20 flex flex-wrap gap-2 text-sm">
          <span className="pointer-events-auto rounded-full border border-[#d9e4d3] bg-white/92 px-3 py-1.5 text-slate-700 shadow-[0_12px_34px_rgba(24,36,26,0.12)] backdrop-blur">
            {selectedBlock ? `Seleccionado: ${selectedBlock.label}` : "Pincha cualquier pieza para editarla"}
          </span>
          <span
            className={`pointer-events-auto rounded-full px-3 py-1.5 shadow-[0_12px_34px_rgba(24,36,26,0.12)] backdrop-blur ${
              isDirty
                ? "border border-[#eadfc1] bg-[#fff7db]/95 text-[#7b6116]"
                : "border border-[#a7cdb7] bg-[#eef8f1]/95 text-[#2f6d4f]"
            }`}
          >
            {isDirty ? "Cambios sin publicar" : "Runtime sincronizado"}
          </span>
        </div>

        {msg ? (
          <StatusNotice
            message={msg}
            className="absolute left-1/2 top-24 z-30 w-[min(560px,calc(100%-2rem))] -translate-x-1/2"
          />
        ) : null}

        <div className="relative h-full w-full overflow-hidden">
          {showDemoPanel ? (
            <FloatingPanel
              title="Demo editable"
              onClose={() => setShowDemoPanel(false)}
              className="left-4 top-24 w-[320px] max-h-[calc(100dvh-140px)] overflow-hidden"
            >
              <div className="space-y-3 overflow-auto pr-1">
                <input value={previewTitle} onChange={(e) => setPreviewTitle(e.target.value)} className="w-full rounded-[18px] border border-[#d9e4d3] px-3 py-2.5 text-sm" placeholder="Título demo" />
                <textarea value={previewSummary} onChange={(e) => setPreviewSummary(e.target.value)} className="min-h-[120px] w-full rounded-[18px] border border-[#d9e4d3] px-3 py-2.5 text-sm" placeholder="Descripción demo" />
                <input type="date" value={previewDate} onChange={(e) => setPreviewDate(e.target.value)} className="w-full rounded-[18px] border border-[#d9e4d3] px-3 py-2.5 text-sm" />
                <select value={previewPlanTypeId} onChange={(e) => setPreviewPlanTypeId(e.target.value)} className="w-full rounded-[18px] border border-[#d9e4d3] px-3 py-2.5 text-sm">
                  {planTypeOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 3, 4, 5].map((value) => (
                    <button key={value} type="button" onClick={() => setPreviewRating(value)} className={`rounded-[16px] border px-3 py-2 text-sm ${previewRating === value ? "border-[#94b38c] bg-[#eef8e8] text-[#496445]" : "border-[#d9e4d3] bg-white text-slate-700"}`}>{value} est.</button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setPreviewFavorite((v) => !v)} className={`rounded-[16px] border px-3 py-2 text-sm ${previewFavorite ? "border-[#e0c674] bg-[#fff7db] text-[#7b6116]" : "border-[#d9e4d3] bg-white text-slate-700"}`}>Favorito</button>
                  <button type="button" onClick={() => setPreviewYearHighlight((v) => !v)} className={`rounded-[16px] border px-3 py-2 text-sm ${previewYearHighlight ? "border-[#a7cdb7] bg-[#eef8f1] text-[#2f6d4f]" : "border-[#d9e4d3] bg-white text-slate-700"}`}>Destacado</button>
                </div>
              </div>
            </FloatingPanel>
          ) : null}

          {showAddPanel ? (
            <FloatingPanel
              title="Añadir bloque"
              onClose={() => setShowAddPanel(false)}
              className="left-4 top-24 w-[320px] max-h-[calc(100dvh-140px)] overflow-hidden"
            >
              <div className="space-y-2 overflow-auto pr-1">
                {disabledBlocks.length ? disabledBlocks.map((block) => (
                  <button key={block.id} type="button" onClick={() => {
                    setLayoutConfig((current) => updateBlockInConfig(current, block.id, (item) => ({ ...item, enabled: true })));
                    setSelectedBlockId(block.id);
                    setShowAddPanel(false);
                  }} className="w-full rounded-[18px] border border-[#d9e4d3] bg-white px-3 py-2.5 text-left text-sm text-slate-700">
                    <div className="font-medium">{block.label}</div>
                    <div className="mt-1 text-xs text-slate-500">{block.description}</div>
                  </button>
                )) : <AdminInlineNote tone="success">Todos los bloques base ya estan activos.</AdminInlineNote>}
              </div>
            </FloatingPanel>
          ) : null}

          {showValidationPanel ? (
            <FloatingPanel
              title="Validacion"
              onClose={() => setShowValidationPanel(false)}
              className="bottom-4 left-4 w-[360px] max-h-[calc(100dvh-140px)] overflow-hidden"
            >
              <div className="max-h-[340px] space-y-2 overflow-auto pr-1">
                {validationIssues.length ? validationIssues.map((issue) => (
                  <button key={issue.id} type="button" onClick={() => {
                    if (issue.blockId) setSelectedBlockId(issue.blockId);
                    setShowValidationPanel(false);
                  }} className={`w-full rounded-[18px] border px-3 py-2.5 text-left text-sm ${issue.tone === "error" ? "border-[#ecc1bc] bg-[#fff5f3] text-[#7a3e36]" : issue.tone === "warning" ? "border-[#eadfc1] bg-[#fffaf0] text-[#7a5c18]" : "border-[#d9e4d3] bg-[#fbfcfa] text-slate-700"}`}>
                    <div className="font-medium">{issue.title}</div>
                    <div className="mt-1 text-xs opacity-80">{issue.detail}</div>
                  </button>
                )) : <AdminInlineNote tone="success">No hay alertas en este layout.</AdminInlineNote>}
              </div>
            </FloatingPanel>
          ) : null}

          {showAdvancedPanel ? (
            <FloatingPanel
              title="JSON runtime"
              onClose={() => setShowAdvancedPanel(false)}
              className="bottom-4 right-4 w-[420px] max-h-[calc(100dvh-140px)] overflow-hidden"
            >
              <pre className="max-h-[380px] overflow-auto rounded-[22px] border border-[#d9e4d3] bg-[#f8faf6] p-4 text-xs leading-6 text-slate-700">{JSON.stringify(normalizedConfig, null, 2)}</pre>
            </FloatingPanel>
          ) : null}

        {selectedBlock ? (
          <FloatingPanel
            title={`Inspector: ${selectedBlock.label}`}
            onClose={() => setSelectedBlockId(null)}
            className="right-4 top-24 w-[360px] max-h-[calc(100dvh-140px)] overflow-hidden"
            style={{ transform: `translate(${inspectorOffset.x}px, ${inspectorOffset.y}px)` }}
            onHeaderPointerDown={startInspectorDrag}
          >
              <div className="flex max-h-[calc(100dvh-240px)] flex-col">
                <div className="flex-1 space-y-3 overflow-auto pr-1">
                <input value={selectedBlock.label} onChange={(e) => updateSelectedBlock((block) => ({ ...block, label: e.target.value }))} className="w-full rounded-[18px] border border-[#d9e4d3] px-3 py-2.5 text-sm" placeholder="Nombre visible" />
                <textarea value={selectedBlock.description} onChange={(e) => updateSelectedBlock((block) => ({ ...block, description: e.target.value }))} className="min-h-[88px] w-full rounded-[18px] border border-[#d9e4d3] px-3 py-2.5 text-sm" placeholder="Descripción" />
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1 text-sm text-slate-700"><span>X %</span><input type="number" step="0.1" min={0} max={roundMetric(100 - selectedBlock.w)} value={selectedBlock.x} onChange={(e) => updateSelectedBlock((block) => ({ ...block, x: roundMetric(clamp(Number(e.target.value) || block.x, 0, 100 - block.w)) }))} className="w-full rounded-[16px] border border-[#d9e4d3] px-3 py-2" /></label>
                  <label className="space-y-1 text-sm text-slate-700"><span>Y %</span><input type="number" step="0.1" min={0} max={roundMetric(100 - selectedBlock.h)} value={selectedBlock.y} onChange={(e) => updateSelectedBlock((block) => ({ ...block, y: roundMetric(clamp(Number(e.target.value) || block.y, 0, 100 - block.h)) }))} className="w-full rounded-[16px] border border-[#d9e4d3] px-3 py-2" /></label>
                  <label className="space-y-1 text-sm text-slate-700"><span>Ancho %</span><input type="number" step="0.1" min={selectedBlock.minW} max={roundMetric(Math.min(selectedBlock.maxW, 100 - selectedBlock.x))} value={selectedBlock.w} onChange={(e) => updateSelectedBlock((block) => ({ ...block, w: roundMetric(clamp(Number(e.target.value) || block.w, block.minW, Math.min(block.maxW, 100 - block.x))) }))} className="w-full rounded-[16px] border border-[#d9e4d3] px-3 py-2" /></label>
                  <label className="space-y-1 text-sm text-slate-700"><span>Alto %</span><input type="number" step="0.1" min={selectedBlock.minH} max={roundMetric(Math.min(selectedBlock.maxH, 100 - selectedBlock.y))} value={selectedBlock.h} onChange={(e) => updateSelectedBlock((block) => ({ ...block, h: roundMetric(clamp(Number(e.target.value) || block.h, block.minH, Math.min(block.maxH, 100 - block.y))) }))} className="w-full rounded-[16px] border border-[#d9e4d3] px-3 py-2" /></label>
                </div>
                {selectedBlock.maxChars != null ? (
                  <div className="space-y-1">
                    <label className="text-sm text-slate-700">Max chars</label>
                    <input type="number" min={12} max={600} value={selectedBlock.maxChars} onChange={(e) => updateSelectedBlock((block) => ({ ...block, maxChars: clamp(Number(e.target.value) || block.maxChars || 12, 12, 600) }))} className="w-full rounded-[16px] border border-[#d9e4d3] px-3 py-2 text-sm" />
                    <div className="text-xs text-slate-500">{selectedBlock.sampleField ? `${sampleLengths[selectedBlock.sampleField]}/${selectedBlock.maxChars}` : "Sin referencia de demo"}</div>
                  </div>
                ) : null}
                </div>
                <div className="mt-3 space-y-2 border-t border-[#e4ecdf] bg-white/96 pt-3">
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => updateSelectedBlock((block) => ({ ...block, enabled: !block.enabled }))} className={`rounded-[16px] border px-3 py-2 text-sm ${selectedBlock.enabled ? "border-[#a7cdb7] bg-[#eef8f1] text-[#2f6d4f]" : "border-[#d9e4d3] bg-white text-slate-700"}`}>{selectedBlock.enabled ? "Visible" : "Oculto"}</button>
                  <button type="button" onClick={restoreSelectedBlock} className="rounded-[16px] border border-[#d9e4d3] bg-white px-3 py-2 text-sm text-slate-700">Restaurar bloque</button>
                </div>
                <button
                  type="button"
                  onClick={removeSelectedBlock}
                  className="w-full rounded-[16px] border border-[#ecc1bc] bg-[#fff5f3] px-3 py-2 text-sm text-[#7a3e36]"
                >
                  Quitar del canvas
                </button>
                </div>
              </div>
            </FloatingPanel>
          ) : null}

          <div
            className="absolute inset-0 overflow-auto transition-[padding] duration-300 ease-out"
            style={previewPadding}
            onClick={(event) => {
              if (event.target === event.currentTarget) setSelectedBlockId(null);
            }}
          >
            <div
              className="flex min-h-full w-full items-start justify-center py-2"
              onClick={(event) => {
                if (event.target === event.currentTarget) setSelectedBlockId(null);
              }}
            >
              <div
                className="relative h-auto w-full max-w-[1180px] overflow-hidden rounded-[42px] border border-white/70 shadow-[0_34px_120px_rgba(24,36,26,0.16)]"
                style={{
                  aspectRatio: `${FLOWER_PAGE_STAGE_WIDTH} / ${FLOWER_PAGE_STAGE_HEIGHT}`,
                }}
              >
                <PageDetailMainPanel
                  page={previewPage}
                  msg={null}
                  mode="read"
                  completionState={previewCompletionState}
                  hasUnsavedChanges={false}
                  rating={previewRating}
                  onRatingChange={noop}
                  onPlanSummaryChange={noop}
                  saving={false}
                  deletingPage={false}
                  onSave={noop}
                  onModeChange={noop}
                  onCancelEdit={noop}
                  onBackHome={noop}
                  onOpenDeleteConfirm={noop}
                  onToggleFavorite={noop}
                  onToggleYearHighlight={noop}
                  onUploadCoverPhoto={noop}
                  coverPhotoUrl={previewPage.cover_photo_url ?? null}
                  uploadingCoverPhoto={false}
                  isYearHighlight={previewYearHighlight}
                  canToggleYearHighlight
                  updatingYearHighlight={false}
                  plantAssetSrc={previewPlantAsset}
                  planTypeId={previewPlanType?.id ?? null}
                  planTypeLabel={previewPlanType?.label ?? null}
                  planTypeFlowerFamily={previewPlanType?.flowerFamily ?? null}
                  planTypeOptions={planTypeOptions}
                  changingPlanType={false}
                  onPlanTypeChange={noop}
                  linkedSeedTitle="Paseo con parada para ver el valle"
                  linkedPlaceKind="viewpoint"
                  linkedPlaceLabel="Mirador de la sierra"
                  linkedRouteLabel="Camino de ida y vuelta"
                  layoutConfig={normalizedConfig}
                  surfacePresentation="immersive"
                  blockEditor={{
                    selectedBlockId,
                    stageRef: previewRef,
                    onSelectBlock: setSelectedBlockId,
                    onStartDrag: (blockId, event) => {
                      event.preventDefault();
                      startInteraction(blockId, "move", event.clientX, event.clientY);
                    },
                    onStartResize: (blockId, corner, event) => {
                      event.preventDefault();
                      startInteraction(blockId, "resize", event.clientX, event.clientY, corner);
                    },
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
