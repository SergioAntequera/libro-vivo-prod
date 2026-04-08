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
import { getFallbackPlanTypeOptions } from "@/lib/planTypeCatalog";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { StatusNotice } from "@/components/ui/StatusNotice";
import {
  buildSeedsValidationIssues,
  type SeedsValidationIssue,
} from "@/lib/adminDiagnostics";
import {
  getDefaultValidationRules,
  loadValidationRulesForDomain,
  type ValidationRuleDefinition,
} from "@/lib/adminValidationRules";
import {
  SeedComposerSurface,
  type SeedComposerResizeHandle,
} from "@/components/plans/SeedComposerSurface";
import {
  SEED_COMPOSER_LAYOUT_CATALOG_KEY,
  SEED_COMPOSER_STAGE_HEIGHT,
  SEED_COMPOSER_STAGE_WIDTH,
  getFallbackSeedComposerLayoutConfig,
  getSeedComposerBlockPreset,
  getSeedComposerLayoutBlockMap,
  getSeedComposerLayoutCatalogRows,
  getSeedComposerLayoutConfig,
  normalizeSeedComposerLayoutConfig,
  type SeedComposerBlockConfig,
  type SeedComposerBlockId,
  type SeedComposerLayoutConfig,
} from "@/lib/seedComposerLayoutConfig";
import type { SeedPlaceOption } from "@/lib/plansTypes";

type EditorPanel = "demo" | "blocks" | "validation" | "advanced" | "inspector";

type DragInteraction =
  | {
      mode: "move";
      blockId: SeedComposerBlockId;
      startClientX: number;
      startClientY: number;
      startBlock: SeedComposerBlockConfig;
    }
  | {
      mode: "resize";
      blockId: SeedComposerBlockId;
      corner: SeedComposerResizeHandle;
      startClientX: number;
      startClientY: number;
      startBlock: SeedComposerBlockConfig;
    };

type FloatingPanelDrag = {
  panel: EditorPanel;
  startClientX: number;
  startClientY: number;
  startOffsetX: number;
  startOffsetY: number;
};

const MOCK_PLACE_OPTIONS: SeedPlaceOption[] = [
  {
    id: "mirador",
    title: "Mirador de la sierra",
    subtitle: "Atardecer y termo",
    kind: "viewpoint",
    state: "favorite",
  },
  {
    id: "cafe-centro",
    title: "Cafe del centro",
    subtitle: "Esquina de siempre",
    kind: "cafe",
    state: "saved",
  },
  {
    id: "playa-sur",
    title: "Playa sur",
    subtitle: "Camino de madera",
    kind: "spot",
    state: "wishlist",
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundMetric(value: number) {
  return Math.round(value * 100) / 100;
}

function togglePanel<T extends string>(current: T | null, next: T) {
  return current === next ? null : next;
}

function updateBlockInConfig(
  config: SeedComposerLayoutConfig,
  blockId: SeedComposerBlockId,
  updater: (block: SeedComposerBlockConfig) => SeedComposerBlockConfig,
) {
  return normalizeSeedComposerLayoutConfig({
    blocks: config.blocks.map((block) =>
      block.id === blockId ? updater(block) : block,
    ),
  });
}

function applyResizeDelta(
  block: SeedComposerBlockConfig,
  corner: SeedComposerResizeHandle,
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
  actions?: ReactNode;
}) {
  return (
    <div
      style={props.style}
      className={`absolute z-20 rounded-[30px] border border-[var(--lv-border)] bg-[rgba(255,255,255,0.96)] p-4 shadow-[0_26px_80px_rgba(24,36,26,0.18)] backdrop-blur ${props.className ?? ""}`}
    >
      <div
        className={`mb-3 flex items-start justify-between gap-3 ${
          props.onHeaderPointerDown ? "cursor-grab active:cursor-grabbing" : ""
        }`}
        onPointerDown={props.onHeaderPointerDown}
      >
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-[var(--lv-text)]">{props.title}</h2>
        </div>
        <button
          type="button"
          onClick={props.onClose}
          className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-1.5 text-xs text-[var(--lv-text)]"
        >
          Cerrar
        </button>
      </div>
      {props.actions ? <div className="mb-3 flex flex-wrap gap-2">{props.actions}</div> : null}
      {props.children}
    </div>
  );
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

export default function AdminSeedsPage() {
  const router = useRouter();
  const previewRef = useRef<HTMLDivElement | null>(null);
  const planTypeOptions = useMemo(() => getFallbackPlanTypeOptions(), []);
  const placeLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const place of MOCK_PLACE_OPTIONS) {
      map.set(place.id, place.subtitle ? `${place.title} - ${place.subtitle}` : place.title);
    }
    return map;
  }, []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [validationRules, setValidationRules] = useState<ValidationRuleDefinition[]>(
    getDefaultValidationRules("seeds"),
  );
  const [layoutConfig, setLayoutConfig] = useState<SeedComposerLayoutConfig>(
    getFallbackSeedComposerLayoutConfig(),
  );
  const [initialSerializedConfig, setInitialSerializedConfig] = useState("");
  const [selectedBlockId, setSelectedBlockId] = useState<SeedComposerBlockId | null>(null);
  const [activePanel, setActivePanel] = useState<Exclude<EditorPanel, "inspector"> | null>("demo");
  const [interaction, setInteraction] = useState<DragInteraction | null>(null);
  const [floatingPanelDrag, setFloatingPanelDrag] = useState<FloatingPanelDrag | null>(null);
  const [panelOffsets, setPanelOffsets] = useState<Record<EditorPanel, { x: number; y: number }>>({
    demo: { x: 0, y: 0 },
    blocks: { x: 0, y: 0 },
    validation: { x: 0, y: 0 },
    advanced: { x: 0, y: 0 },
    inspector: { x: 0, y: 0 },
  });
  const [previewTitle, setPreviewTitle] = useState("Atardecer con termo y paseo lento");
  const [previewNotes, setPreviewNotes] = useState(
    "Parar, ver el valle y volver con la sensacion de que merecia quedar guardado como semilla.",
  );
  const [previewScheduledDate, setPreviewScheduledDate] = useState("");
  const [previewPlanTypeId, setPreviewPlanTypeId] = useState(planTypeOptions[0]?.id ?? "");
  const [previewSelectedPlaceId, setPreviewSelectedPlaceId] = useState(MOCK_PLACE_OPTIONS[0]?.id ?? "");
  const [previewCreating, setPreviewCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await ensureSuperadminOrRedirect(router);
      if (!session || cancelled) return;
      const [nextConfig, nextRules] = await Promise.all([
        getSeedComposerLayoutConfig(),
        loadValidationRulesForDomain("seeds"),
      ]);
      if (cancelled) return;
      const normalized = normalizeSeedComposerLayoutConfig(nextConfig);
      setLayoutConfig(normalized);
      setValidationRules(nextRules);
      setInitialSerializedConfig(JSON.stringify(normalized));
      setLoading(false);
    })().catch((error) => {
      if (cancelled) return;
      console.error("[admin/seeds] fallo cargando surface editor:", error);
      setMsg("No se pudo cargar el editor de nueva semilla.");
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!interaction) return;
    const active = interaction;
    function handlePointerMove(event: PointerEvent) {
      const movedX = event.clientX - active.startClientX;
      const movedY = event.clientY - active.startClientY;
      const threshold = active.mode === "move" ? 6 : 4;
      if (Math.max(Math.abs(movedX), Math.abs(movedY)) < threshold) return;
      const rect = previewRef.current?.getBoundingClientRect();
      const width = rect?.width ?? SEED_COMPOSER_STAGE_WIDTH;
      const height = rect?.height ?? SEED_COMPOSER_STAGE_HEIGHT;
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
      setPanelOffsets((current) => ({
        ...current,
        [active.panel]: {
          x: active.startOffsetX + (event.clientX - active.startClientX),
          y: active.startOffsetY + (event.clientY - active.startClientY),
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

  const normalizedConfig = useMemo(
    () => normalizeSeedComposerLayoutConfig(layoutConfig),
    [layoutConfig],
  );
  const blockMap = useMemo(
    () => getSeedComposerLayoutBlockMap(normalizedConfig),
    [normalizedConfig],
  );
  const selectedBlock = selectedBlockId ? blockMap[selectedBlockId] : null;
  const validationIssues = useMemo(
    () =>
      buildSeedsValidationIssues({
        config: normalizedConfig,
        rules: validationRules,
      }),
    [normalizedConfig, validationRules],
  );
  const disabledBlocks = normalizedConfig.blocks.filter((block) => !block.enabled);
  const previewSelectedPlaceLabel = previewSelectedPlaceId
    ? placeLabel.get(previewSelectedPlaceId) ?? null
    : null;
  const isDirty = JSON.stringify(normalizedConfig) !== initialSerializedConfig;

  function startPanelDrag(panel: EditorPanel, event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement | null)?.closest("button")) return;
    setFloatingPanelDrag({
      panel,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: panelOffsets[panel].x,
      startOffsetY: panelOffsets[panel].y,
    });
  }

  function panelStyle(panel: EditorPanel): CSSProperties {
    return {
      transform: `translate(${panelOffsets[panel].x}px, ${panelOffsets[panel].y}px)`,
    };
  }

  async function saveLayout() {
    const normalized = normalizeSeedComposerLayoutConfig(layoutConfig);
    setSaving(true);
    setMsg(null);
    try {
      const { error: catalogError } = await supabase.from("catalogs").upsert(
        {
          key: SEED_COMPOSER_LAYOUT_CATALOG_KEY,
          label: "Seeds: nueva semilla",
          description: "Composicion visible de la superficie de creación de nueva semilla.",
          is_active: true,
        },
        { onConflict: "key" },
      );
      if (catalogError) throw new Error(catalogError.message);

      const { error } = await supabase
        .from("catalog_items")
        .upsert(getSeedComposerLayoutCatalogRows(normalized), {
          onConflict: "catalog_key,code",
        });
      if (error) throw new Error(error.message);

      setLayoutConfig(normalized);
      setInitialSerializedConfig(JSON.stringify(normalized));
      setMsg("Layout de nueva semilla publicado.");
    } catch (error) {
      setMsg(
        `No se pudo guardar seeds: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`,
      );
    } finally {
      setSaving(false);
    }
  }

  function startInteraction(
    blockId: SeedComposerBlockId,
    mode: "move" | "resize",
    clientX: number,
    clientY: number,
    corner?: SeedComposerResizeHandle,
  ) {
    setSelectedBlockId(blockId);
    setInteraction(
      mode === "move"
        ? { mode, blockId, startClientX: clientX, startClientY: clientY, startBlock: blockMap[blockId] }
        : {
            mode,
            blockId,
            corner: corner ?? "se",
            startClientX: clientX,
            startClientY: clientY,
            startBlock: blockMap[blockId],
          },
    );
  }

  function updateSelectedBlock(updater: (block: SeedComposerBlockConfig) => SeedComposerBlockConfig) {
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

  function restoreSelectedBlock() {
    if (!selectedBlockId) return;
    const preset = getSeedComposerBlockPreset(selectedBlockId);
    const fallbackBlock = getSeedComposerLayoutBlockMap(
      getFallbackSeedComposerLayoutConfig(),
    )[selectedBlockId];
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
    return <PageLoadingState message="Cargando editor inmersivo de seeds..." />;
  }

  return (
    <div className="lv-page h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.88),rgba(232,239,226,0.98))]">
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
              active={activePanel === "demo"}
              onClick={() => setActivePanel((current) => togglePanel(current, "demo"))}
            >
              Demo
            </ToolbarButton>
            <ToolbarButton
              active={activePanel === "blocks"}
              onClick={() => setActivePanel((current) => togglePanel(current, "blocks"))}
            >
              Bloques
            </ToolbarButton>
            <ToolbarButton
              active={activePanel === "validation"}
              onClick={() => setActivePanel((current) => togglePanel(current, "validation"))}
            >
              Validacion {validationIssues.length ? `(${validationIssues.length})` : ""}
            </ToolbarButton>
            <ToolbarButton
              active={activePanel === "advanced"}
              onClick={() => setActivePanel((current) => togglePanel(current, "advanced"))}
            >
              Avanzado
            </ToolbarButton>
            <button
              type="button"
              onClick={() => void saveLayout()}
              disabled={saving}
              className="rounded-full border border-[var(--lv-primary)] bg-[var(--lv-primary-soft)] px-4 py-2 text-sm font-medium text-[var(--lv-primary-strong)] transition hover:bg-[rgba(233,243,234,0.96)] disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Publicar"}
            </button>
          </div>
        </div>

        {msg ? (
          <StatusNotice
            message={msg}
            className="absolute left-1/2 top-24 z-30 w-[min(640px,calc(100%-2rem))] -translate-x-1/2"
          />
        ) : null}

        <div className="pointer-events-none absolute bottom-4 left-4 z-20 flex flex-wrap gap-2 text-sm">
          <span className="pointer-events-auto rounded-full border border-[var(--lv-border)] bg-white/92 px-3 py-1.5 text-[var(--lv-text)] shadow-[0_12px_34px_rgba(24,36,26,0.12)] backdrop-blur">
            {selectedBlock
              ? `Seleccionado: ${selectedBlock.label}`
              : "Pincha cualquier bloque para componer la superficie"}
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

        {activePanel === "demo" ? (
          <FloatingPanel
            title="Demo editable"
            onClose={() => setActivePanel(null)}
            onHeaderPointerDown={(event) => startPanelDrag("demo", event)}
            style={panelStyle("demo")}
            className="left-4 top-24 w-[360px] max-h-[calc(100dvh-140px)] overflow-hidden"
          >
            <div className="max-h-[calc(100dvh-230px)] space-y-3 overflow-auto pr-1">
              <label className="space-y-1 text-sm">
                <span className="text-[var(--lv-text)]">Titulo demo</span>
                <input
                  value={previewTitle}
                  onChange={(event) => setPreviewTitle(event.target.value)}
                  className="lv-input"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[var(--lv-text)]">Notas demo</span>
                <textarea
                  value={previewNotes}
                  onChange={(event) => setPreviewNotes(event.target.value)}
                  className="lv-textarea min-h-[112px]"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[var(--lv-text)]">Fecha</span>
                <input
                  type="date"
                  value={previewScheduledDate}
                  onChange={(event) => setPreviewScheduledDate(event.target.value)}
                  className="lv-input"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[var(--lv-text)]">Tipo de plan</span>
                <select
                  value={previewPlanTypeId}
                  onChange={(event) => setPreviewPlanTypeId(event.target.value)}
                  className="lv-select"
                >
                  {planTypeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[var(--lv-text)]">Lugar demo</span>
                <select
                  value={previewSelectedPlaceId}
                  onChange={(event) => setPreviewSelectedPlaceId(event.target.value)}
                  className="lv-select"
                >
                  <option value="">Sin lugar</option>
                  {MOCK_PLACE_OPTIONS.map((place) => (
                    <option key={place.id} value={place.id}>
                      {placeLabel.get(place.id) ?? place.title}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className={`rounded-full border px-3 py-2 text-sm transition ${
                  previewCreating
                    ? "border-[var(--lv-primary)] bg-[var(--lv-primary-soft)] text-[var(--lv-primary-strong)]"
                    : "border-[var(--lv-border)] bg-[var(--lv-surface)] text-[var(--lv-text)]"
                }`}
                onClick={() => setPreviewCreating((value) => !value)}
              >
                {previewCreating ? "Demo en guardando" : "Demo en reposo"}
              </button>
            </div>
          </FloatingPanel>
        ) : null}

        {activePanel === "blocks" ? (
          <FloatingPanel
            title="Biblioteca de bloques"
            onClose={() => setActivePanel(null)}
            onHeaderPointerDown={(event) => startPanelDrag("blocks", event)}
            style={panelStyle("blocks")}
            className="left-4 top-24 w-[360px] max-h-[calc(100dvh-140px)] overflow-hidden"
          >
            <div className="max-h-[calc(100dvh-230px)] space-y-2 overflow-auto pr-1">
              {disabledBlocks.length ? (
                disabledBlocks.map((block) => (
                  <button
                    key={block.id}
                    type="button"
                    onClick={() => {
                      setLayoutConfig((current) =>
                        updateBlockInConfig(current, block.id, (item) => ({
                          ...item,
                          enabled: true,
                        })),
                      );
                      setSelectedBlockId(block.id);
                      setActivePanel(null);
                    }}
                    className="w-full rounded-[20px] border border-[var(--lv-border)] bg-white px-4 py-3 text-left text-sm text-[var(--lv-text)]"
                  >
                    <div className="font-medium">{block.label}</div>
                    <div className="mt-1 text-xs text-[var(--lv-text-muted)]">{block.description}</div>
                  </button>
                ))
              ) : (
                <div className="rounded-[22px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4 text-sm text-[var(--lv-text-muted)]">
                  Todos los bloques base de nueva semilla ya estan activos.
                </div>
              )}
            </div>
          </FloatingPanel>
        ) : null}

        {activePanel === "validation" ? (
          <FloatingPanel
            title="Validacion"
            onClose={() => setActivePanel(null)}
            onHeaderPointerDown={(event) => startPanelDrag("validation", event)}
            style={panelStyle("validation")}
            className="bottom-4 left-4 w-[380px] max-h-[calc(100dvh-140px)] overflow-hidden"
          >
            <div className="max-h-[calc(100dvh-230px)] space-y-2 overflow-auto pr-1">
              {validationIssues.length ? (
                validationIssues.map((issue: SeedsValidationIssue) => (
                  <button
                    key={issue.id}
                    type="button"
                    onClick={() => {
                      if (issue.blockId) setSelectedBlockId(issue.blockId);
                      setActivePanel(null);
                    }}
                    className={`w-full rounded-[20px] border px-4 py-3 text-left text-sm ${
                      issue.tone === "error"
                        ? "border-[#ecc1bc] bg-[#fff5f3] text-[#7a3e36]"
                        : issue.tone === "warning"
                          ? "border-[#eadfc1] bg-[#fffaf0] text-[#7a5c18]"
                          : "border-[var(--lv-border)] bg-[var(--lv-surface-soft)] text-[var(--lv-text)]"
                    }`}
                  >
                    <div className="font-medium">{issue.title}</div>
                    <div className="mt-1 text-xs opacity-80">{issue.detail}</div>
                  </button>
                ))
              ) : (
                <div className="rounded-[22px] border border-[#a7cdb7] bg-[#eef8f1] p-4 text-sm text-[#2f6d4f]">
                  No hay alertas en esta superficie.
                </div>
              )}
            </div>
          </FloatingPanel>
        ) : null}

        {activePanel === "advanced" ? (
          <FloatingPanel
            title="JSON runtime"
            onClose={() => setActivePanel(null)}
            onHeaderPointerDown={(event) => startPanelDrag("advanced", event)}
            style={panelStyle("advanced")}
            className="bottom-4 right-4 w-[460px] max-h-[calc(100dvh-140px)] overflow-hidden"
            actions={
              <button
                type="button"
                onClick={() => setLayoutConfig(getFallbackSeedComposerLayoutConfig())}
                className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm text-[var(--lv-text)]"
              >
                Restaurar base
              </button>
            }
          >
            <pre className="max-h-[420px] overflow-auto rounded-[22px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4 text-xs leading-6 text-[var(--lv-text)]">
              {JSON.stringify(normalizedConfig, null, 2)}
            </pre>
          </FloatingPanel>
        ) : null}

        {selectedBlock ? (
          <FloatingPanel
            title={`Inspector: ${selectedBlock.label}`}
            onClose={() => setSelectedBlockId(null)}
            onHeaderPointerDown={(event) => startPanelDrag("inspector", event)}
            style={panelStyle("inspector")}
            className="right-4 top-24 w-[380px] max-h-[calc(100dvh-140px)] overflow-hidden"
          >
            <div className="flex max-h-[calc(100dvh-240px)] flex-col">
              <div className="flex-1 space-y-3 overflow-auto pr-1">
                <label className="space-y-1 text-sm">
                  <span className="text-[var(--lv-text)]">Label visible</span>
                  <input
                    value={selectedBlock.label}
                    onChange={(event) =>
                      updateSelectedBlock((block) => ({
                        ...block,
                        label: event.target.value,
                      }))
                    }
                    className="lv-input"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[var(--lv-text)]">Descripcion</span>
                  <textarea
                    value={selectedBlock.description}
                    onChange={(event) =>
                      updateSelectedBlock((block) => ({
                        ...block,
                        description: event.target.value,
                      }))
                    }
                    className="lv-textarea min-h-[96px]"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1 text-sm">
                    <span className="text-[var(--lv-text)]">X %</span>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      max={roundMetric(100 - selectedBlock.w)}
                      value={selectedBlock.x}
                      onChange={(event) =>
                        updateSelectedBlock((block) => ({
                          ...block,
                          x: roundMetric(clamp(Number(event.target.value) || block.x, 0, 100 - block.w)),
                        }))
                      }
                      className="lv-input"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-[var(--lv-text)]">Y %</span>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      max={roundMetric(100 - selectedBlock.h)}
                      value={selectedBlock.y}
                      onChange={(event) =>
                        updateSelectedBlock((block) => ({
                          ...block,
                          y: roundMetric(clamp(Number(event.target.value) || block.y, 0, 100 - block.h)),
                        }))
                      }
                      className="lv-input"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-[var(--lv-text)]">Ancho %</span>
                    <input
                      type="number"
                      step="0.1"
                      min={selectedBlock.minW}
                      max={roundMetric(Math.min(selectedBlock.maxW, 100 - selectedBlock.x))}
                      value={selectedBlock.w}
                      onChange={(event) =>
                        updateSelectedBlock((block) => ({
                          ...block,
                          w: roundMetric(
                            clamp(
                              Number(event.target.value) || block.w,
                              block.minW,
                              Math.min(block.maxW, 100 - block.x),
                            ),
                          ),
                        }))
                      }
                      className="lv-input"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-[var(--lv-text)]">Alto %</span>
                    <input
                      type="number"
                      step="0.1"
                      min={selectedBlock.minH}
                      max={roundMetric(Math.min(selectedBlock.maxH, 100 - selectedBlock.y))}
                      value={selectedBlock.h}
                      onChange={(event) =>
                        updateSelectedBlock((block) => ({
                          ...block,
                          h: roundMetric(
                            clamp(
                              Number(event.target.value) || block.h,
                              block.minH,
                              Math.min(block.maxH, 100 - block.y),
                            ),
                          ),
                        }))
                      }
                      className="lv-input"
                    />
                  </label>
                </div>
              </div>
              <div className="mt-3 space-y-2 border-t border-[var(--lv-border)] bg-white/96 pt-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateSelectedBlock((block) => ({
                        ...block,
                        enabled: !block.enabled,
                      }))
                    }
                    className={`rounded-[16px] border px-3 py-2 text-sm ${
                      selectedBlock.enabled
                        ? "border-[#a7cdb7] bg-[#eef8f1] text-[#2f6d4f]"
                        : "border-[var(--lv-border)] bg-[var(--lv-surface)] text-[var(--lv-text)]"
                    }`}
                  >
                    {selectedBlock.enabled ? "Visible" : "Oculto"}
                  </button>
                  <button
                    type="button"
                    onClick={restoreSelectedBlock}
                    className="rounded-[16px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2 text-sm text-[var(--lv-text)]"
                  >
                    Restaurar bloque
                  </button>
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
          className="absolute inset-0 overflow-auto px-8 pb-8 pt-28 transition-[padding] duration-300 ease-out"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedBlockId(null);
          }}
        >
          <div className="flex min-h-full w-full items-start justify-center">
            <div
              className="relative h-auto w-full max-w-[1260px] overflow-hidden rounded-[42px]"
              style={{ aspectRatio: `${SEED_COMPOSER_STAGE_WIDTH} / ${SEED_COMPOSER_STAGE_HEIGHT}` }}
            >
              <SeedComposerSurface
                title={previewTitle}
                notes={previewNotes}
                scheduledDate={previewScheduledDate}
                selectedPlanTypeId={previewPlanTypeId}
                selectedPlaceId={previewSelectedPlaceId}
                selectedPlaceLabel={previewSelectedPlaceLabel}
                planTypeOptions={planTypeOptions}
                placeOptions={MOCK_PLACE_OPTIONS}
                creating={previewCreating}
                layoutConfig={normalizedConfig}
                onTitleChange={setPreviewTitle}
                onNotesChange={setPreviewNotes}
                onScheduledDateChange={setPreviewScheduledDate}
                onSelectedPlanTypeIdChange={setPreviewPlanTypeId}
                onClearSelectedPlace={() => setPreviewSelectedPlaceId("")}
                onOpenMap={() => setMsg("La demo no abre mapa real. Usa este panel para simular el bloque de lugar.")}
                onCreateSeed={() => setMsg("La demo no crea semillas reales. Sirve para componer la superficie.")}
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

        <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <SummaryPill
              label="Bloques activos"
              value={String(normalizedConfig.blocks.filter((block) => block.enabled).length)}
            />
            <SummaryPill label="Bloques ocultos" value={String(disabledBlocks.length)} />
            <SummaryPill
              label="Tipo demo"
              value={planTypeOptions.find((option) => option.id === previewPlanTypeId)?.label ?? "Sin tipo"}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm text-[var(--lv-text)]"
              onClick={() => router.push("/plans?focus=ideas")}
            >
              Ver composer real
            </button>
            <button
              type="button"
              className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm text-[var(--lv-text)]"
              onClick={() => router.push("/admin/plan-types")}
            >
              Tipos de plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
