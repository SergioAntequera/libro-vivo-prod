"use client";

import { useMemo, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import type { SeedPlaceOption, SeedPlanTypeOption } from "@/lib/plansTypes";
import PlanTypePicker from "@/components/shared/PlanTypePicker";
import {
  normalizeSeedComposerLayoutConfig,
  type SeedComposerBlockConfig,
  type SeedComposerBlockId,
  type SeedComposerLayoutConfig,
} from "@/lib/seedComposerLayoutConfig";

export type SeedComposerResizeHandle = "n" | "e" | "s" | "w" | "nw" | "ne" | "sw" | "se";

export type SeedComposerBlockEditor = {
  selectedBlockId: SeedComposerBlockId | null;
  stageRef: RefObject<HTMLDivElement | null>;
  onSelectBlock: (blockId: SeedComposerBlockId | null) => void;
  onStartDrag: (
    blockId: SeedComposerBlockId,
    event: ReactPointerEvent<HTMLElement>,
  ) => void;
  onStartResize: (
    blockId: SeedComposerBlockId,
    handle: SeedComposerResizeHandle,
    event: ReactPointerEvent<HTMLElement>,
  ) => void;
};

type SeedComposerSurfaceProps = {
  title: string;
  notes: string;
  scheduledDate: string;
  selectedPlanTypeId: string;
  selectedPlaceId: string;
  selectedPlaceLabel: string | null;
  planTypeOptions: SeedPlanTypeOption[];
  placeOptions: SeedPlaceOption[];
  creating: boolean;
  layoutConfig: SeedComposerLayoutConfig;
  onTitleChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onScheduledDateChange: (value: string) => void;
  onSelectedPlanTypeIdChange: (value: string) => void;
  onClearSelectedPlace: () => void;
  onOpenMap: () => void;
  onCreateSeed: () => void;
  blockEditor?: SeedComposerBlockEditor;
};

const resizeHandles: SeedComposerResizeHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

function resizeHandleStyle(handle: SeedComposerResizeHandle) {
  const shared =
    "absolute h-4 w-4 rounded-full border border-[rgba(20,34,28,0.14)] bg-white shadow-[0_8px_20px_rgba(18,26,19,0.14)]";
  if (handle === "nw") return `${shared} -left-2 -top-2 cursor-nwse-resize`;
  if (handle === "n") {
    return `${shared} left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize`;
  }
  if (handle === "ne") return `${shared} -right-2 -top-2 cursor-nesw-resize`;
  if (handle === "e") {
    return `${shared} right-0 top-1/2 -translate-y-1/2 translate-x-1/2 cursor-ew-resize`;
  }
  if (handle === "se") return `${shared} -bottom-2 -right-2 cursor-nwse-resize`;
  if (handle === "s") {
    return `${shared} bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize`;
  }
  if (handle === "sw") return `${shared} -bottom-2 -left-2 cursor-nesw-resize`;
  return `${shared} left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-ew-resize`;
}

function BlockFrame(props: {
  block: SeedComposerBlockConfig;
  editor?: SeedComposerBlockEditor;
  children: React.ReactNode;
}) {
  const { block, editor, children } = props;
  const selected = editor?.selectedBlockId === block.id;

  return (
    <div
      className={`absolute overflow-visible ${editor ? "cursor-grab active:cursor-grabbing" : ""}`}
      style={{
        left: `${block.x}%`,
        top: `${block.y}%`,
        width: `${block.w}%`,
        height: `${block.h}%`,
      }}
      onClick={(event) => {
        event.stopPropagation();
        editor?.onSelectBlock(block.id);
      }}
      onPointerDown={(event) => {
        if (!editor) return;
        if ((event.target as HTMLElement | null)?.closest("[data-seed-resize-handle='true']")) {
          return;
        }
        event.stopPropagation();
        editor.onStartDrag(block.id, event);
      }}
    >
      {children}
      {editor ? (
        <div
          className={`pointer-events-none absolute inset-0 rounded-[28px] border-2 transition ${
            selected
              ? "border-[var(--lv-primary)] shadow-[0_0_0_6px_rgba(61,125,84,0.12)]"
              : "border-transparent"
          }`}
        >
          {selected
            ? resizeHandles.map((handle) => (
                <button
                  key={handle}
                  type="button"
                  data-seed-resize-handle="true"
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    editor.onStartResize(block.id, handle, event);
                  }}
                  className={`pointer-events-auto ${resizeHandleStyle(handle)}`}
                  aria-label={`Resize ${block.label}`}
                />
              ))
            : null}
        </div>
      ) : null}
    </div>
  );
}

function SurfaceFieldLabel({
  label,
  description,
  compact = false,
}: {
  label: string;
  description?: string;
  compact?: boolean;
}) {
  return (
    <div className={`space-y-1 ${compact ? "mb-1.5" : "mb-2"}`}>
      <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--lv-text-muted)]">
        {label}
      </div>
      {description ? (
        <div className="text-xs leading-5 text-[var(--lv-text-muted)]">{description}</div>
      ) : null}
    </div>
  );
}

export function SeedComposerSurface(props: SeedComposerSurfaceProps) {
  const {
    title,
    notes,
    scheduledDate,
    selectedPlanTypeId,
    selectedPlaceId,
    selectedPlaceLabel,
    planTypeOptions,
    placeOptions,
    creating,
    layoutConfig,
    onTitleChange,
    onNotesChange,
    onScheduledDateChange,
    onSelectedPlanTypeIdChange,
    onClearSelectedPlace,
    onOpenMap,
    onCreateSeed,
    blockEditor,
  } = props;

  const normalizedConfig = useMemo(
    () => normalizeSeedComposerLayoutConfig(layoutConfig),
    [layoutConfig],
  );
  const blockMap = useMemo(
    () =>
      Object.fromEntries(normalizedConfig.blocks.map((block) => [block.id, block])) as Record<
        SeedComposerBlockId,
        SeedComposerBlockConfig
      >,
    [normalizedConfig],
  );
  const selectedPlanType =
    planTypeOptions.find((option) => option.id === selectedPlanTypeId) ?? null;
  const interactive = !blockEditor;
  const helperText = scheduledDate
    ? "Se guardara ya programada en agenda."
    : "Si no pones fecha, quedara como idea para programar despues.";

  return (
    <div
      ref={blockEditor?.stageRef}
      className="relative aspect-[1280/860] w-full overflow-hidden rounded-[34px] border border-[rgba(255,255,255,0.84)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,250,244,0.98))] shadow-[0_28px_90px_rgba(20,35,24,0.14)]"
      onClick={() => blockEditor?.onSelectBlock(null)}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(223,239,228,0.76),transparent_42%)]" />

      {normalizedConfig.blocks
        .filter((block) => block.enabled)
        .map((block) => {
          if (block.id === "header_title") {
            return (
              <BlockFrame key={block.id} block={block} editor={blockEditor}>
                <div className="h-full rounded-[24px] bg-transparent px-1 py-0.5">
                  <h2 className="text-[2.7rem] font-semibold tracking-[-0.045em] text-[var(--lv-text)]">
                    {block.label}
                  </h2>
                </div>
              </BlockFrame>
            );
          }

          if (block.id === "header_hint") {
            return (
              <BlockFrame key={block.id} block={block} editor={blockEditor}>
                <div className="h-full rounded-[24px] bg-transparent px-1 py-0.5 text-[15px] leading-7 text-[var(--lv-text-muted)]">
                  {block.label}
                </div>
              </BlockFrame>
            );
          }

          if (block.id === "title_input") {
            return (
              <BlockFrame key={block.id} block={block} editor={blockEditor}>
                <div className="h-full rounded-[28px] bg-transparent p-0 shadow-none">
                  {interactive ? (
                    <input
                      className="lv-input"
                      placeholder={block.label}
                      value={title}
                      onChange={(event) => onTitleChange(event.target.value)}
                    />
                  ) : (
                    <div className="rounded-[20px] border border-[var(--lv-border)] bg-white/92 px-4 py-3 text-[15px] text-[var(--lv-text)] shadow-[var(--lv-shadow-sm)]">
                      {title || block.label}
                    </div>
                  )}
                </div>
              </BlockFrame>
            );
          }

          if (block.id === "plan_type_select") {
            return (
              <BlockFrame key={block.id} block={block} editor={blockEditor}>
                <div className="h-full rounded-[24px] bg-transparent p-0.5 shadow-none">
                  <SurfaceFieldLabel
                    label="Clasificacion opcional"
                    description="Solo si quieres encajar este plan en la biblioteca."
                    compact
                  />
                  {interactive ? (
                    <PlanTypePicker
                      options={planTypeOptions}
                      value={selectedPlanTypeId}
                      onChange={onSelectedPlanTypeIdChange}
                      placeholder="Buscar tipo de plan"
                      searchPlaceholder="Escribe para buscar un tipo"
                      compact
                    />
                  ) : (
                    <div className="rounded-[18px] border border-[var(--lv-border)] bg-white/92 px-4 py-3 text-[15px] text-[var(--lv-text)] shadow-[var(--lv-shadow-sm)]">
                      {selectedPlanType?.label ?? "Sin tipo"}
                    </div>
                  )}
                </div>
              </BlockFrame>
            );
          }

          if (block.id === "date_input") {
            return (
              <BlockFrame key={block.id} block={block} editor={blockEditor}>
                <div className="h-full rounded-[24px] bg-transparent p-0.5 shadow-none">
                  <SurfaceFieldLabel label={block.label} compact />
                  {interactive ? (
                    <input
                      type="date"
                      className="lv-input"
                      value={scheduledDate}
                      onChange={(event) => onScheduledDateChange(event.target.value)}
                    />
                  ) : (
                    <div className="rounded-[18px] border border-[var(--lv-border)] bg-white/92 px-4 py-3 text-[15px] text-[var(--lv-text)] shadow-[var(--lv-shadow-sm)]">
                      {scheduledDate || "Sin fecha"}
                    </div>
                  )}
                </div>
              </BlockFrame>
            );
          }

          if (block.id === "place_card") {
            return (
              <BlockFrame key={block.id} block={block} editor={blockEditor}>
                <div className="h-full rounded-[24px] border border-[var(--lv-border)] bg-white/94 p-4 shadow-[0_16px_32px_rgba(24,35,27,0.07)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-[var(--lv-text)]">{block.label}</div>
                      <div className="mt-1 text-xs leading-5 text-[var(--lv-text-muted)]">
                        Se puede dejar vacio o resolver luego desde el mapa.
                      </div>
                    </div>
                  </div>

                  {selectedPlaceId && selectedPlaceLabel ? (
                    <div className="mt-3 flex items-start gap-3 rounded-xl border border-[var(--lv-border)] bg-[var(--lv-bg-subtle,#f6f7f6)] px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-[var(--lv-text-muted)]">
                          Lugar
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-sm font-medium text-[var(--lv-text)]">
                          {selectedPlaceLabel}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <button
                          type="button"
                          className="lv-btn lv-btn-secondary !px-2.5 !py-1 !text-xs"
                          onClick={interactive ? onOpenMap : undefined}
                        >
                          Cambiar
                        </button>
                        <button
                          type="button"
                          className="lv-btn lv-btn-secondary !px-2.5 !py-1 !text-xs text-red-600 hover:text-red-700"
                          onClick={interactive ? onClearSelectedPlace : undefined}
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mt-3 text-sm text-[var(--lv-text-muted)]">
                        {placeOptions.length
                          ? `Todavia no hay lugar vinculado. Ya existen ${placeOptions.length} sitio(s) guardados.`
                          : "Todavia no hay lugar vinculado."}
                      </div>
                      <div className="mt-4">
                        <button
                          type="button"
                          className="lv-btn lv-btn-secondary"
                          onClick={interactive ? onOpenMap : undefined}
                        >
                          Elegir, marcar o buscar en mapa
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </BlockFrame>
            );
          }

          if (block.id === "notes_input") {
            return (
              <BlockFrame key={block.id} block={block} editor={blockEditor}>
                <div className="h-full rounded-[24px] bg-transparent p-0.5 shadow-none">
                  <SurfaceFieldLabel label={block.label} compact />
                  {interactive ? (
                    <textarea
                      className="lv-textarea h-[calc(100%-2rem)] min-h-[88px]"
                      placeholder="Notas opcionales"
                      value={notes}
                      onChange={(event) => onNotesChange(event.target.value)}
                    />
                  ) : (
                    <div className="flex h-[calc(100%-2rem)] min-h-[88px] rounded-[18px] border border-[var(--lv-border)] bg-white/92 px-4 py-3 text-[15px] leading-7 text-[var(--lv-text)] shadow-[var(--lv-shadow-sm)]">
                      <div>{notes || "Notas opcionales"}</div>
                    </div>
                  )}
                </div>
              </BlockFrame>
            );
          }

          if (block.id === "status_hint") {
            return (
              <BlockFrame key={block.id} block={block} editor={blockEditor}>
                <div className="flex h-full items-center rounded-[18px] bg-transparent px-1 py-1 text-sm text-[var(--lv-text-muted)]">
                  {scheduledDate ? helperText : block.label}
                </div>
              </BlockFrame>
            );
          }

          return (
            <BlockFrame key={block.id} block={block} editor={blockEditor}>
              <div className="flex h-full items-end justify-end">
                <button
                  type="button"
                  className="lv-btn lv-btn-primary h-full w-full disabled:opacity-50"
                  onClick={interactive ? onCreateSeed : undefined}
                  disabled={interactive ? creating : false}
                >
                  {interactive ? (creating ? "Guardando..." : block.label) : block.label}
                </button>
              </div>
            </BlockFrame>
          );
        })}
    </div>
  );
}
