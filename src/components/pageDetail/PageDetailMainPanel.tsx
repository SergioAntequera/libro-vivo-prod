"use client";

import {
  type CSSProperties,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import {
  type PlanTypeOption,
} from "@/lib/planTypeCatalog";
import { StatusNotice } from "@/components/ui/StatusNotice";
import PlanTypePicker from "@/components/shared/PlanTypePicker";
import type { PageRow } from "@/lib/pageDetailTypes";
import {
  FLOWER_FAMILY_LABELS,
  getFlowerFamilyFromLegacyElement,
  normalizeFlowerFamily,
  type PageCompletionState,
} from "@/lib/productDomainContracts";
import {
  FLOWER_PAGE_STAGE_ASPECT_RATIO,
  getFallbackFlowerPageLayoutConfig,
  getFlowerPageLayoutBlockMap,
  normalizeFlowerPageLayoutConfig,
  type FlowerPageBlockConfig,
  type FlowerPageBlockId,
  type FlowerPageLayoutConfig,
} from "@/lib/flowerPageLayoutConfig";
import { ArrowLeft, MapPin, Route, Sparkles, Star, Volume2 } from "lucide-react";

type PageDetailMainPanelProps = {
  page: PageRow;
  msg: string | null;
  mode: "read" | "edit";
  completionState: PageCompletionState;
  hasUnsavedChanges: boolean;
  rating: number;
  onRatingChange: (value: number) => void;
  onPlanSummaryChange: (value: string) => void;
  onSummaryFocus?: () => void;
  onSummaryBlur?: () => void;
  summaryPresenceLabel?: string | null;
  summaryConflictNotice?: boolean;
  ratingHint?: string | null;
  ratingReadOnly?: boolean;
  saving: boolean;
  deletingPage: boolean;
  onSave: () => void;
  hideSaveButton?: boolean;
  hideEditTopControls?: boolean;
  hideReadModeEditButton?: boolean;
  hideReadModeBackButton?: boolean;
  backButtonLabel?: string;
  onModeChange: (value: "read" | "edit") => void;
  onCancelEdit: () => void;
  onBackHome: () => void;
  onOpenDeleteConfirm: () => void;
  onToggleFavorite: () => void;
  onToggleYearHighlight: () => void;
  onUploadCoverPhoto: (file: File) => void | Promise<void>;
  coverPhotoUrl: string | null;
  uploadingCoverPhoto: boolean;
  coverPresenceLabel?: string | null;
  coverConflictNotice?: boolean;
  onCoverInteractionStart?: () => void;
  onCoverInteractionEnd?: () => void;
  isYearHighlight: boolean;
  canToggleYearHighlight: boolean;
  updatingYearHighlight: boolean;
  plantAssetSrc: string;
  planTypeId: string | null;
  planTypeLabel: string | null;
  planTypeFlowerFamily: string | null;
  planTypeOptions: PlanTypeOption[];
  changingPlanType: boolean;
  onPlanTypeChange: (value: string) => void;
  planTypePresenceLabel?: string | null;
  planTypeConflictNotice?: boolean;
  onPlanTypeInteractionStart?: () => void;
  onPlanTypeInteractionEnd?: () => void;
  linkedSeedTitle: string | null;
  linkedPlaceKind: string | null;
  linkedPlaceLabel: string | null;
  linkedRouteLabel: string | null;
  currentLocationLabel?: string | null;
  audioDisplayUrl?: string | null;
  layoutConfig?: FlowerPageLayoutConfig | null;
  blockEditor?:
    | {
      selectedBlockId: FlowerPageBlockId | null;
      stageRef?: RefObject<HTMLDivElement | null>;
      onSelectBlock: (id: FlowerPageBlockId) => void;
      onStartDrag: (
        id: FlowerPageBlockId,
        event: ReactPointerEvent<HTMLElement>,
      ) => void;
      onStartResize: (
        id: FlowerPageBlockId,
        corner: ResizeHandle,
        event: ReactPointerEvent<HTMLElement>,
      ) => void;
      }
    | null;
  surfacePresentation?: "card" | "immersive";
};

function placeKindLabel(kind: string | null) {
  if (!kind) return null;
  if (kind === "restaurant") return "Restaurante";
  if (kind === "cafe") return "Cafe";
  if (kind === "viewpoint") return "Mirador";
  if (kind === "trip_place") return "Escapada";
  if (kind === "custom") return "Especial";
  return "Sitio";
}

function fallbackPlanTypeLabel(input: {
  element: string | null | undefined;
  linkedPlaceKind: string | null;
  linkedRouteLabel: string | null;
}) {
  const { element, linkedPlaceKind, linkedRouteLabel } = input;
  if (linkedRouteLabel) return "Ruta o paseo";
  if (linkedPlaceKind === "restaurant") return "Restaurante";
  if (linkedPlaceKind === "cafe") return "Cafe";
  if (linkedPlaceKind === "viewpoint") return "Mirador";
  if (linkedPlaceKind === "trip_place") return "Escapada";
  if (element === "water") return "Plan de agua";
  if (element === "earth") return "Plan de campo";
  if (element === "fire") return "Plan calido";
  if (element === "air") return "Plan al aire libre";
  return "Momento especial";
}

function InlineStars(props: {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
}) {
  const readOnly = props.readOnly === true;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {[1, 2, 3, 4, 5].map((value) => {
          const active = value <= props.value;
          return readOnly ? (
            <span
              key={value}
              className={active ? "text-[var(--lv-warning)]" : "text-[var(--lv-text-muted)]"}
              aria-hidden="true"
            >
              <Star
                size={26}
                strokeWidth={1.9}
                style={active ? { fill: "currentColor" } : undefined}
              />
            </span>
          ) : (
            <button
              key={value}
              type="button"
              onClick={() => props.onChange?.(value)}
              className={`transition ${
                active
                  ? "text-[var(--lv-warning)] hover:text-[color-mix(in_srgb,var(--lv-warning)_82%,black)]"
                  : "text-[var(--lv-text-muted)] hover:text-[var(--lv-text)]"
              }`}
              title={`${value} estrellas`}
              aria-label={`Poner ${value} estrellas`}
            >
              <Star
                size={26}
                strokeWidth={1.9}
                style={active ? { fill: "currentColor" } : undefined}
              />
            </button>
          );
        })}
      </div>

      {props.value > 0 && !readOnly ? (
        <button
          type="button"
          onClick={() => props.onChange?.(0)}
          className="text-sm font-medium text-[var(--lv-text-muted)] underline-offset-4 hover:text-[var(--lv-text)] hover:underline"
        >
          Quitar valoracion
        </button>
      ) : null}
    </div>
  );
}

function completionBadgeLabel(value: PageCompletionState) {
  if (value === "pending_capture") return "Flor abierta pendiente";
  if (value === "captured") return "Recuerdo capturado";
  if (value === "enriched") return "Recuerdo enriquecido";
  return "Recuerdo completo";
}

function completionHint(value: PageCompletionState) {
  if (value === "pending_capture") {
    return "La flor ya brotó, pero aún le falta contenido vivido para sentirse completa.";
  }
  if (value === "captured") {
    return "Ya hay base del recuerdo. Puedes seguir enriqueciendolo cuando quieras.";
  }
  if (value === "enriched") {
    return "La flor ya tiene bastante cuerpo y se puede leer con sentido.";
  }
  return "La flor ya se siente cerrada y lista para revisitar.";
}

function DetailLine(props: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex h-full w-full items-start gap-2.5 rounded-[18px] border border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_88%,transparent)] px-3 py-2.5 shadow-[var(--lv-shadow-sm)] backdrop-blur-sm">
      <div className="mt-0.5 text-[var(--lv-primary)]">{props.icon}</div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
          {props.label}
        </div>
        <div className="mt-1 text-sm font-medium leading-snug text-[var(--lv-text)] break-words">
          {props.value}
        </div>
      </div>
    </div>
  );
}

function isInteractiveEditorChild(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return false;
}

function isEditorContentTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("[data-editor-hit='content']"));
}

type ResizeHandle = "n" | "e" | "s" | "w" | "nw" | "ne" | "sw" | "se";

function resizeCursor(handle: ResizeHandle) {
  if (handle === "n" || handle === "s") return "ns-resize";
  if (handle === "e" || handle === "w") return "ew-resize";
  if (handle === "nw" || handle === "se") return "nwse-resize";
  return "nesw-resize";
}

function resolveResizeHandleFromRect(bounds: DOMRect) {
  const insetX = Math.min(28, Math.max(14, bounds.width * 0.18));
  const insetY = Math.min(28, Math.max(14, bounds.height * 0.18));
  return function resolve(clientX: number, clientY: number): ResizeHandle | null {
    const nearLeft = clientX <= bounds.left + insetX;
    const nearRight = clientX >= bounds.right - insetX;
    const nearTop = clientY <= bounds.top + insetY;
    const nearBottom = clientY >= bounds.bottom - insetY;

    if (nearLeft && nearTop) return "nw";
    if (nearRight && nearTop) return "ne";
    if (nearLeft && nearBottom) return "sw";
    if (nearRight && nearBottom) return "se";
    if (nearTop) return "n";
    if (nearBottom) return "s";
    if (nearLeft) return "w";
    if (nearRight) return "e";
    return null;
  };
}

function sameOverlayStyle(
  left: CSSProperties | undefined,
  right: CSSProperties | undefined,
) {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return (
    left.inset === right.inset &&
    left.left === right.left &&
    left.top === right.top &&
    left.width === right.width &&
    left.height === right.height
  );
}

function measureSelectionOverlayStyle(params: {
  blockId: FlowerPageBlockId;
  mode: "frame" | "content";
  frameRefs: MutableRefObject<Map<FlowerPageBlockId, HTMLDivElement | null>>;
  contentRefs: MutableRefObject<Map<FlowerPageBlockId, HTMLDivElement | null>>;
}): CSSProperties | undefined {
  const { blockId, mode, frameRefs, contentRefs } = params;
  if (mode === "frame") {
    return { inset: 0 };
  }

  const frameNode = frameRefs.current.get(blockId);
  const contentNode = contentRefs.current.get(blockId);
  if (!frameNode || !contentNode) return undefined;

  const frameRect = frameNode.getBoundingClientRect();
  const contentRect = contentNode.getBoundingClientRect();
  return {
    left: `${contentRect.left - frameRect.left}px`,
    top: `${contentRect.top - frameRect.top}px`,
    width: `${contentRect.width}px`,
    height: `${contentRect.height}px`,
  };
}

function BlockSelectionOverlay(props: {
  blockId: FlowerPageBlockId;
  mode: "frame" | "content";
  frameRefs: MutableRefObject<Map<FlowerPageBlockId, HTMLDivElement | null>>;
  contentRefs: MutableRefObject<Map<FlowerPageBlockId, HTMLDivElement | null>>;
}) {
  const { blockId, mode, frameRefs, contentRefs } = props;
  const [style, setStyle] = useState<CSSProperties | undefined>(() =>
    measureSelectionOverlayStyle({ blockId, mode, frameRefs, contentRefs }),
  );

  useEffect(() => {
    const updateStyle = () => {
      const nextStyle = measureSelectionOverlayStyle({
        blockId,
        mode,
        frameRefs,
        contentRefs,
      });
      setStyle((currentStyle) =>
        sameOverlayStyle(currentStyle, nextStyle) ? currentStyle : nextStyle,
      );
    };

    updateStyle();

    const frameNode = frameRefs.current.get(blockId);
    const contentNode = contentRefs.current.get(blockId);
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            updateStyle();
          });

    if (resizeObserver && frameNode) {
      resizeObserver.observe(frameNode);
    }
    if (resizeObserver && contentNode && contentNode !== frameNode) {
      resizeObserver.observe(contentNode);
    }

    window.addEventListener("resize", updateStyle);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateStyle);
    };
  });

  if (!style) return null;

  return (
    <div
      style={style}
      className="pointer-events-none absolute rounded-[30px] border border-dashed border-[color-mix(in_srgb,var(--lv-primary)_55%,white)] bg-[color-mix(in_srgb,var(--lv-primary-soft)_28%,transparent)]"
    >
      <span className="absolute left-[2px] top-[2px] h-[10px] w-[10px] rounded-full border border-[var(--lv-primary)] bg-[var(--lv-surface)] shadow-[var(--lv-shadow-sm)]" />
      <span className="absolute right-[2px] top-[2px] h-[10px] w-[10px] rounded-full border border-[var(--lv-primary)] bg-[var(--lv-surface)] shadow-[var(--lv-shadow-sm)]" />
      <span className="absolute bottom-[2px] left-[2px] h-[10px] w-[10px] rounded-full border border-[var(--lv-primary)] bg-[var(--lv-surface)] shadow-[var(--lv-shadow-sm)]" />
      <span className="absolute bottom-[2px] right-[2px] h-[10px] w-[10px] rounded-full border border-[var(--lv-primary)] bg-[var(--lv-surface)] shadow-[var(--lv-shadow-sm)]" />
      <span className="absolute left-1/2 top-[2px] h-[6px] w-[22px] -translate-x-1/2 rounded-full bg-[var(--lv-primary)] shadow-[var(--lv-shadow-sm)]" />
      <span className="absolute bottom-[2px] left-1/2 h-[6px] w-[22px] -translate-x-1/2 rounded-full bg-[var(--lv-primary)] shadow-[var(--lv-shadow-sm)]" />
      <span className="absolute left-[2px] top-1/2 h-[22px] w-[6px] -translate-y-1/2 rounded-full bg-[var(--lv-primary)] shadow-[var(--lv-shadow-sm)]" />
      <span className="absolute right-[2px] top-1/2 h-[22px] w-[6px] -translate-y-1/2 rounded-full bg-[var(--lv-primary)] shadow-[var(--lv-shadow-sm)]" />
    </div>
  );
}

function EditorHitTarget(props: {
  blockId: FlowerPageBlockId;
  className?: string;
  children: ReactNode;
  contentRefs: MutableRefObject<Map<FlowerPageBlockId, HTMLDivElement | null>>;
}) {
  const { blockId, className, children, contentRefs } = props;
  return (
    <div
      ref={(node) => {
        contentRefs.current.set(blockId, node);
      }}
      data-editor-hit="content"
      className={className}
    >
      {children}
    </div>
  );
}

export function PageDetailMainPanel(props: PageDetailMainPanelProps) {
  const {
    page,
    msg,
    mode,
    completionState,
    hasUnsavedChanges,
    rating,
    onRatingChange,
    onPlanSummaryChange,
    onSummaryFocus,
    onSummaryBlur,
    summaryPresenceLabel,
    summaryConflictNotice = false,
    ratingHint = null,
    ratingReadOnly = false,
    saving,
    deletingPage,
    onSave,
    hideSaveButton = false,
    hideEditTopControls = false,
    hideReadModeEditButton = false,
    hideReadModeBackButton = false,
    backButtonLabel = "Volver",
    onModeChange,
    onCancelEdit,
    onBackHome,
    onOpenDeleteConfirm,
    onToggleFavorite,
    onToggleYearHighlight,
    onUploadCoverPhoto,
    coverPhotoUrl,
    uploadingCoverPhoto,
    coverPresenceLabel = null,
    coverConflictNotice = false,
    onCoverInteractionStart,
    onCoverInteractionEnd,
    isYearHighlight,
    canToggleYearHighlight,
    updatingYearHighlight,
    plantAssetSrc,
    planTypeId,
    planTypeLabel,
    planTypeFlowerFamily,
    planTypeOptions,
    changingPlanType,
    onPlanTypeChange,
    planTypePresenceLabel,
    planTypeConflictNotice = false,
    onPlanTypeInteractionStart,
    onPlanTypeInteractionEnd,
    linkedSeedTitle,
    linkedPlaceKind,
    linkedPlaceLabel,
    linkedRouteLabel,
    currentLocationLabel,
    audioDisplayUrl,
    layoutConfig,
    blockEditor,
    surfacePresentation = "card",
  } = props;

  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const resolvedPlanLabel =
    planTypeLabel ??
    fallbackPlanTypeLabel({
      element: page.element,
      linkedPlaceKind,
      linkedRouteLabel,
    });
  const resolvedFlowerFamilyLabel = useMemo(() => {
    const explicitFamily = normalizeFlowerFamily(planTypeFlowerFamily);
    if (explicitFamily) return FLOWER_FAMILY_LABELS[explicitFamily];
    return FLOWER_FAMILY_LABELS[getFlowerFamilyFromLegacyElement(page.element)];
  }, [page.element, planTypeFlowerFamily]);
  const combinedPlanMetaLabel =
    resolvedFlowerFamilyLabel && resolvedFlowerFamilyLabel !== resolvedPlanLabel
      ? `${resolvedPlanLabel} / ${resolvedFlowerFamilyLabel}`
      : resolvedPlanLabel;
  const descriptionTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const normalizedPageTitle = String(page.title ?? "").trim().toLowerCase();
  const normalizedSeedTitle = String(linkedSeedTitle ?? "").trim().toLowerCase();
  const showSeedLine = Boolean(normalizedSeedTitle) && normalizedSeedTitle !== normalizedPageTitle;
  const placeType = placeKindLabel(linkedPlaceKind);
  const resolvedPlaceLabel = String(currentLocationLabel ?? "").trim() || linkedPlaceLabel;
  const resolvedAudioUrl = String(audioDisplayUrl ?? "").trim() || page.audio_url || "";
  const readMode = mode === "read";
  const planSummaryText = String(page.plan_summary ?? "").trim();
  const yearHighlightActionLabel = !canToggleYearHighlight
    ? "Esta flor necesita una fecha valida para entrar en destacados"
    : isYearHighlight
      ? "Quitar de destacados del año"
      : "Añadir a destacados del año";
  const flowerScaleClass =
    rating >= 5
      ? "scale-[1.06] opacity-100 saturate-[1.08]"
      : rating >= 4
        ? "scale-100 opacity-100 saturate-100"
        : rating >= 3
          ? "scale-[0.97] opacity-95 saturate-90"
          : rating >= 2
        ? "scale-[0.93] opacity-85 saturate-75"
        : "scale-[0.9] opacity-75 saturate-60";
  const resolvedLayoutConfig = useMemo(
    () => normalizeFlowerPageLayoutConfig(layoutConfig ?? getFallbackFlowerPageLayoutConfig()),
    [layoutConfig],
  );
  const layoutBlocks = useMemo(
    () => getFlowerPageLayoutBlockMap(resolvedLayoutConfig),
    [resolvedLayoutConfig],
  );
  const immersiveSurface = surfacePresentation === "immersive";
  const frameRefs = useRef(new Map<FlowerPageBlockId, HTMLDivElement | null>());
  const contentRefs = useRef(new Map<FlowerPageBlockId, HTMLDivElement | null>());
  const editMetaCard = !readMode ? (
    <div className="rounded-[26px] border border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_88%,transparent)] p-4 shadow-[var(--lv-shadow-sm)] backdrop-blur-sm">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <label className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
            Tipo de plan
          </div>
          {planTypePresenceLabel ? (
            <div className="mt-2 rounded-full border border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_92%,transparent)] px-3 py-1 text-xs font-medium text-[var(--lv-primary-strong)]">
              {planTypePresenceLabel}
            </div>
          ) : null}
          <div
            className={`mt-2 rounded-[22px] border border-dashed px-4 py-3 ${
              planTypeConflictNotice
                ? "border-[var(--lv-warning)] bg-[var(--lv-warning-soft)]"
                : "border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_92%,transparent)]"
            }`}
          >
            <div className="space-y-3">
              <PlanTypePicker
                options={planTypeOptions}
                value={planTypeId ?? ""}
                onChange={onPlanTypeChange}
                placeholder="Buscar tipo de plan"
                searchPlaceholder="Escribe para buscar un tipo"
                onFocus={onPlanTypeInteractionStart}
                onBlur={onPlanTypeInteractionEnd}
                disabled={changingPlanType}
                compact
              />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
                  Familia visual
                </span>
                <span className="rounded-full bg-[var(--lv-warning-soft)] px-3 py-1 text-sm font-medium text-[var(--lv-warning)]">
                  {resolvedFlowerFamilyLabel}
                </span>
              </div>
            </div>
          </div>
          {planTypeConflictNotice ? (
            <div className="mt-2 rounded-[18px] border border-[var(--lv-warning)] bg-[var(--lv-warning-soft)] px-3 py-2 text-xs text-[var(--lv-warning)]">
              Han entrado cambios remotos en el tipo de plan mientras estabas aqui. Se aplicaran al salir.
            </div>
          ) : null}
        </label>

        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
            Portada
          </div>
          {coverPresenceLabel ? (
            <div className="mt-2 rounded-full border border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_92%,transparent)] px-3 py-1 text-xs font-medium text-[var(--lv-primary-strong)]">
              {coverPresenceLabel}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => {
              onCoverInteractionStart?.();
              coverInputRef.current?.click();
            }}
            onFocus={onCoverInteractionStart}
            onBlur={onCoverInteractionEnd}
            className={`mt-2 flex h-[54px] w-full items-center justify-center rounded-[22px] border border-dashed px-4 text-sm font-medium text-[var(--lv-text)] transition hover:border-[var(--lv-primary)] hover:bg-[var(--lv-surface)] ${
              coverConflictNotice
                ? "border-[var(--lv-warning)] bg-[var(--lv-warning-soft)]"
                : "border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_92%,transparent)]"
            }`}
            disabled={uploadingCoverPhoto}
          >
            {uploadingCoverPhoto
              ? "Subiendo portada..."
              : page.cover_photo_url
                ? "Cambiar portada"
                : "Añadir portada"}
          </button>
          {coverConflictNotice ? (
            <div className="mt-2 rounded-[18px] border border-[var(--lv-warning)] bg-[var(--lv-warning-soft)] px-3 py-2 text-xs text-[var(--lv-warning)]">
              Han entrado cambios remotos en la portada mientras estabas aqui. Se aplicaran al salir.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  ) : null;
  const editModeTopControls = !readMode && !hideEditTopControls ? (
    <div className="pointer-events-auto absolute left-0 right-0 top-0 z-20 flex flex-wrap items-start justify-between gap-3">
      <button
        type="button"
        onClick={onCancelEdit}
        className="lv-btn lv-btn-secondary px-4 py-2.5 text-sm"
      >
        Cancelar
      </button>

      <div className="flex max-w-full flex-wrap items-start justify-end gap-2">
        {hasUnsavedChanges ? (
          <div className="inline-flex rounded-[18px] border border-[var(--lv-warning)] bg-[var(--lv-warning-soft)] px-3 py-2 text-xs text-[var(--lv-warning)]">
            Tienes cambios sin guardar en esta flor.
          </div>
        ) : null}
        <button
          type="button"
          onClick={onOpenDeleteConfirm}
          disabled={deletingPage}
          className="lv-btn lv-btn-danger px-4 py-2.5 disabled:opacity-60"
        >
          {deletingPage ? "Borrando..." : "Borrar página"}
        </button>
        {hideSaveButton ? null : (
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="lv-btn lv-btn-primary px-4 py-2.5 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        )}
      </div>
    </div>
  ) : null;

  useEffect(() => {
    if (readMode) return;
    const node = descriptionTextareaRef.current;
    if (!node) return;
    node.style.height = "0px";
    node.style.height = `${Math.max(node.scrollHeight, 176)}px`;
  }, [page.plan_summary, readMode]);

  function blockStyle(block: FlowerPageBlockConfig): CSSProperties {
    return {
      left: `${block.x}%`,
      top: `${block.y}%`,
      width: `${block.w}%`,
      height: `${block.h}%`,
    };
  }

  function resolveEditorNode(
    blockId: FlowerPageBlockId,
    mode: "frame" | "content",
  ) {
    return mode === "frame"
      ? frameRefs.current.get(blockId)
      : contentRefs.current.get(blockId);
  }

  function resolveInteractionRect(
    blockId: FlowerPageBlockId,
    mode: "frame" | "content",
    fallbackNode: HTMLElement,
  ) {
    const targetNode = resolveEditorNode(blockId, mode);
    return targetNode?.getBoundingClientRect() ?? fallbackNode.getBoundingClientRect();
  }

  function resolveResizeHandle(
    blockId: FlowerPageBlockId,
    fallbackNode: HTMLElement,
    clientX: number,
    clientY: number,
    preferredMode: "frame" | "content",
  ) {
    const modes: ("content" | "frame")[] =
      preferredMode === "content" ? ["content", "frame"] : ["frame", "content"];

    for (const mode of modes) {
      const rect = resolveInteractionRect(blockId, mode, fallbackNode);
      const handle = resolveResizeHandleFromRect(rect)(clientX, clientY);
      if (handle) return handle;
    }

    return null;
  }
  function renderBlock(
    blockId: FlowerPageBlockId,
    content: ReactNode,
    options?: {
      className?: string;
      editorHitMode?: "frame" | "content";
      resizeHitMode?: "frame" | "content";
      selectionFrameMode?: "frame" | "content";
      hitTargetMode?: "wrapper" | "manual";
    },
  ) {
    const {
      className = "",
      editorHitMode = "frame",
      resizeHitMode = editorHitMode,
      selectionFrameMode = editorHitMode,
      hitTargetMode = "wrapper",
    } = options ?? {};
    const block = layoutBlocks[blockId];
    if (!block.enabled) return null;

    const selected = blockEditor?.selectedBlockId === blockId;

    return (
      <div
        key={blockId}
        ref={(node) => {
          frameRefs.current.set(blockId, node);
        }}
        style={blockStyle(block)}
        className={`absolute min-w-0 overflow-visible ${className} ${
          blockEditor ? "select-none touch-none" : ""
        }`}
        onClick={(event) => {
          if (!blockEditor) return;
          if (isInteractiveEditorChild(event.target)) return;
          if (!isEditorContentTarget(event.target)) return;
          blockEditor.onSelectBlock(blockId);
        }}
        onPointerMove={(event) => {
          if (!blockEditor) return;
          const resizeHandle = block.resizable
            ? resolveResizeHandle(
                blockId,
                event.currentTarget,
                event.clientX,
                event.clientY,
                resizeHitMode,
              )
            : null;
          if (!isEditorContentTarget(event.target) && !resizeHandle) {
            event.currentTarget.style.cursor = "default";
            return;
          }
          event.currentTarget.style.cursor = resizeHandle
            ? resizeCursor(resizeHandle)
            : "grab";
        }}
        onPointerLeave={(event) => {
          event.currentTarget.style.cursor = "";
        }}
        onPointerDown={(event) => {
          if (!blockEditor) return;
          if (isInteractiveEditorChild(event.target)) return;
          const resizeHandle = block.resizable
            ? resolveResizeHandle(
                blockId,
                event.currentTarget,
                event.clientX,
                event.clientY,
                resizeHitMode,
              )
            : null;
          if (!resizeHandle && !isEditorContentTarget(event.target)) return;
          blockEditor.onSelectBlock(blockId);
          if (resizeHandle) {
            blockEditor.onStartResize(blockId, resizeHandle, event);
            return;
          }
          blockEditor.onStartDrag(blockId, event);
        }}
      >
        {block.enabled ? (
          hitTargetMode === "wrapper" ? (
            <div
              ref={(node) => {
                contentRefs.current.set(blockId, node);
              }}
              data-editor-hit="content"
              className={
                editorHitMode === "content"
                  ? "inline-flex max-w-full items-start"
                  : "h-full w-full"
              }
            >
              {content}
            </div>
          ) : (
            content
          )
        ) : (
          <div className="flex h-full min-h-[112px] items-center justify-center rounded-[28px] border border-dashed border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 text-center text-sm text-[var(--lv-text-muted)]">
            {block.label} esta oculto en la pagina real, pero sigue disponible en este editor.
          </div>
        )}

        {blockEditor && selected && block.resizable ? (
          <BlockSelectionOverlay
            blockId={blockId}
            mode={resizeHitMode}
            frameRefs={frameRefs}
            contentRefs={contentRefs}
          />
        ) : null}
      </div>
    );
  }

  const mobileMainPanel =
    !immersiveSurface && !blockEditor ? (
      <div className="space-y-4 md:hidden">
        {readMode ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            {!hideReadModeBackButton ? (
              <button
                type="button"
                onClick={onBackHome}
                className="lv-btn lv-btn-secondary px-4 py-2.5 text-sm"
              >
                <ArrowLeft size={16} />
                <span>{backButtonLabel}</span>
              </button>
            ) : null}
            {!hideReadModeEditButton ? (
              <button
                type="button"
                className="lv-btn lv-btn-primary px-4 py-2.5"
                onClick={() => onModeChange("edit")}
              >
                Editar flor
              </button>
            ) : null}
          </div>
        ) : !hideEditTopControls ? (
          <div className="space-y-3 rounded-[26px] border border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_88%,transparent)] p-4 shadow-[var(--lv-shadow-sm)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={onCancelEdit}
                className="lv-btn lv-btn-secondary px-4 py-2.5 text-sm"
              >
                Cancelar
              </button>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={onOpenDeleteConfirm}
                  disabled={deletingPage}
                  className="lv-btn lv-btn-danger px-4 py-2.5 disabled:opacity-60"
                >
                  {deletingPage ? "Borrando..." : "Borrar pagina"}
                </button>
                {hideSaveButton ? null : (
                  <button
                    type="button"
                    onClick={onSave}
                    disabled={saving}
                    className="lv-btn lv-btn-primary px-4 py-2.5 disabled:opacity-50"
                  >
                    {saving ? "Guardando..." : "Guardar cambios"}
                  </button>
                )}
              </div>
            </div>
            {hasUnsavedChanges ? (
              <div className="rounded-[18px] border border-[var(--lv-warning)] bg-[var(--lv-warning-soft)] px-3 py-2 text-xs text-[var(--lv-warning)]">
                Tienes cambios sin guardar en esta flor.
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-[30px] border border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_88%,transparent)] p-5 shadow-[var(--lv-shadow-sm)] backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm text-[var(--lv-text-muted)]">{page.date}</div>
              <h1 className="mt-2 max-w-full break-words text-3xl font-semibold leading-[1.03] tracking-[-0.03em] text-[var(--lv-text)]">
                {page.title ?? "Pagina sin titulo"}
              </h1>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={onToggleFavorite}
                aria-label={page.is_favorite ? "Quitar de favoritas" : "Anadir a favoritas"}
                title={page.is_favorite ? "Quitar de favoritas" : "Anadir a favoritas"}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
                  page.is_favorite
                    ? "border-[var(--lv-warning)] bg-[var(--lv-warning-soft)] text-[var(--lv-warning)]"
                    : "border-[var(--lv-border)] bg-[var(--lv-surface)] text-[var(--lv-text-muted)]"
                }`}
              >
                <Star
                  size={18}
                  style={page.is_favorite ? { fill: "currentColor" } : undefined}
                />
              </button>
              <button
                type="button"
                onClick={onToggleYearHighlight}
                aria-label={yearHighlightActionLabel}
                aria-pressed={isYearHighlight}
                title={yearHighlightActionLabel}
                disabled={!canToggleYearHighlight || updatingYearHighlight}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-55 ${
                  isYearHighlight
                    ? "border-[var(--lv-primary)] bg-[var(--lv-primary-soft)] text-[var(--lv-primary-strong)]"
                    : "border-[var(--lv-border)] bg-[var(--lv-surface)] text-[var(--lv-text-muted)]"
                }`}
              >
                <Sparkles
                  size={18}
                  style={isYearHighlight ? { fill: "currentColor" } : undefined}
                />
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-[var(--lv-primary)] bg-[color-mix(in_srgb,var(--lv-primary-soft)_82%,white)] px-3 py-1 text-sm font-medium text-[var(--lv-primary-strong)]">
              {combinedPlanMetaLabel}
            </span>
            <span className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-1 text-sm font-medium text-[var(--lv-text)]">
              {placeType ?? "Tipo de lugar"}
            </span>
            <span className="rounded-full border border-[var(--lv-warning)] bg-[color-mix(in_srgb,var(--lv-warning-soft)_92%,white)] px-3 py-1 text-sm font-medium text-[var(--lv-warning)]">
              {completionBadgeLabel(completionState)}
            </span>
          </div>

          <p className="mt-4 text-sm leading-6 text-[var(--lv-text-muted)]">
            {completionHint(completionState)}
          </p>
        </div>

        <div className="rounded-[30px] border border-[var(--lv-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--lv-surface)_82%,transparent),color-mix(in_srgb,var(--lv-bg-soft)_68%,transparent))] p-5 shadow-[var(--lv-shadow-sm)] backdrop-blur-sm">
          <div className="mx-auto flex h-52 max-w-[220px] items-center justify-center overflow-hidden rounded-[34px] bg-[radial-gradient(circle_at_50%_30%,color-mix(in_srgb,var(--lv-surface)_88%,white),color-mix(in_srgb,var(--lv-bg-soft)_28%,transparent)_62%)]">
            <Image
              src={plantAssetSrc}
              alt={`Flor de ${resolvedPlanLabel.toLowerCase()}`}
              width={160}
              height={160}
              className={`h-[138px] w-[138px] object-contain transition ${flowerScaleClass}`}
            />
          </div>
        </div>

        <div
          className={`rounded-[28px] p-5 shadow-[var(--lv-shadow-sm)] backdrop-blur-sm ${
            readMode || ratingReadOnly
              ? "border border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_80%,transparent)]"
              : "border border-dashed border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_88%,transparent)]"
          }`}
        >
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
            Valoracion
          </div>
          <div className="mt-4">
            <InlineStars
              value={rating}
              onChange={onRatingChange}
              readOnly={readMode || ratingReadOnly}
            />
          </div>
          {ratingHint ? (
            <p className="mt-3 text-sm leading-6 text-[var(--lv-text-muted)]">{ratingHint}</p>
          ) : null}
        </div>

        <div
          className={`rounded-[30px] p-5 shadow-[var(--lv-shadow-sm)] backdrop-blur-sm ${
            readMode
              ? "border border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_84%,transparent)]"
              : "border border-dashed border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_90%,transparent)]"
          }`}
        >
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
            {readMode ? "Sentido del recuerdo" : "Descripcion del recuerdo"}
          </div>
          {readMode ? (
            <div className="mt-3 text-[16px] leading-7 text-[var(--lv-text)] [overflow-wrap:anywhere]">
              {planSummaryText ? (
                <p className="whitespace-pre-wrap break-words">{planSummaryText}</p>
              ) : (
                <p className="text-[var(--lv-text-muted)]">
                  Esta flor aun no tiene una descripcion escrita. Entra en editar cuando quieras
                  darle contexto.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-3 rounded-[22px] border border-dashed border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_94%,transparent)] px-4 py-3">
              {summaryPresenceLabel || summaryConflictNotice ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {summaryPresenceLabel ? (
                    <span className="rounded-full bg-[color-mix(in_srgb,var(--lv-primary-soft)_86%,white)] px-3 py-1 text-xs font-medium text-[var(--lv-primary-strong)]">
                      {summaryPresenceLabel}
                    </span>
                  ) : null}
                  {summaryConflictNotice ? (
                    <span className="rounded-full bg-[var(--lv-warning-soft)] px-3 py-1 text-xs font-medium text-[var(--lv-warning)]">
                      Han entrado cambios del otro lado en este mismo texto.
                    </span>
                  ) : null}
                </div>
              ) : null}
              <textarea
                value={page.plan_summary ?? ""}
                onChange={(event) => onPlanSummaryChange(event.target.value)}
                onFocus={onSummaryFocus}
                onBlur={onSummaryBlur}
                placeholder="Describe en una o dos frases que plan fue, como se dio o que tuvo de especial..."
                className="min-h-[180px] w-full resize-y bg-transparent text-[16px] leading-7 text-[var(--lv-text)] outline-none placeholder:text-[var(--lv-text-muted)] [overflow-wrap:anywhere]"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {showSeedLine ? (
            <DetailLine icon={<Sparkles size={16} />} label="Semilla" value={linkedSeedTitle ?? ""} />
          ) : (
            <div className="rounded-[22px] border border-dashed border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_74%,transparent)] px-4 py-3 text-sm text-[var(--lv-text-muted)]">
              Semilla sin vincular
            </div>
          )}
          {resolvedPlaceLabel ? (
            <DetailLine icon={<MapPin size={16} />} label="Lugar" value={resolvedPlaceLabel} />
          ) : (
            <div className="rounded-[22px] border border-dashed border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_74%,transparent)] px-4 py-3 text-sm text-[var(--lv-text-muted)]">
              Lugar sin vincular
            </div>
          )}
          {linkedRouteLabel ? (
            <DetailLine icon={<Route size={16} />} label="Ruta" value={linkedRouteLabel} />
          ) : (
            <div className="rounded-[22px] border border-dashed border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_74%,transparent)] px-4 py-3 text-sm text-[var(--lv-text-muted)]">
              Ruta sin vincular
            </div>
          )}
          {resolvedAudioUrl ? (
            <DetailLine icon={<Volume2 size={16} />} label="Audio" value="Audio asociado" />
          ) : (
            <div className="rounded-[22px] border border-dashed border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_74%,transparent)] px-4 py-3 text-sm text-[var(--lv-text-muted)]">
              Audio sin vincular
            </div>
          )}
        </div>
      </div>
    ) : null;

  return (
    <section
      className={
        immersiveSurface
          ? "relative h-full w-full overflow-hidden"
          : "lv-card overflow-hidden p-0"
      }
    >
      <div className="relative h-full w-full">
        {coverPhotoUrl ? (
          <>
            <img
              src={coverPhotoUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover opacity-[0.38]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--lv-surface)_72%,transparent)_0%,color-mix(in_srgb,var(--lv-bg)_62%,transparent)_36%,color-mix(in_srgb,var(--lv-bg-soft)_78%,transparent)_100%)]" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(180deg,var(--lv-surface)_0%,var(--lv-bg-soft)_100%)]" />
        )}

        <div
          className={
            immersiveSurface
              ? "relative z-10 h-full w-full"
              : "relative z-10 p-7 xl:p-8"
          }
        >
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              onCoverInteractionStart?.();
              void onUploadCoverPhoto(file);
              event.currentTarget.value = "";
            }}
          />

          {editMetaCard ? <div className="relative z-30 mb-5">{editMetaCard}</div> : null}
          {mobileMainPanel}

          <div
            className={
              immersiveSurface
                ? "absolute inset-0"
                : `relative mt-5 w-full ${blockEditor ? "" : "hidden md:block"}`
            }
            ref={blockEditor?.stageRef}
            style={
              immersiveSurface
                ? {
                    inset: "clamp(1.5rem, 2.6vw, 2.75rem)",
                  }
                : {
                    aspectRatio: `${FLOWER_PAGE_STAGE_ASPECT_RATIO}`,
                    minHeight: "780px",
                  }
            }
          >
            {editModeTopControls}

            {readMode && !hideReadModeBackButton
              ? renderBlock(
                  "back_button",
                  <div className="flex h-full w-full items-start">
                    <button
                      type="button"
                      onClick={onBackHome}
                      className="lv-btn lv-btn-secondary h-full w-full px-4 py-2.5 text-sm"
                    >
                      <ArrowLeft size={16} />
                      <span>{backButtonLabel}</span>
                    </button>
                  </div>,
                )
              : null}

            {readMode && !hideReadModeEditButton
              ? renderBlock(
                  "edit_button",
                  <div className="flex h-full w-full items-start">
                    <button
                      type="button"
                      className="lv-btn lv-btn-primary h-full w-full px-4 py-2.5"
                      onClick={() => onModeChange("edit")}
                    >
                      Editar flor
                    </button>
                  </div>,
                  { className: "flex justify-end" },
                )
              : null}

            {renderBlock(
              "date",
              <div className="flex h-full w-full items-end">
                <EditorHitTarget
                  blockId="date"
                  className="inline-flex max-w-full items-end px-1 text-sm text-[var(--lv-text-muted)]"
                  contentRefs={contentRefs}
                >
                  <span>{page.date}</span>
                </EditorHitTarget>
              </div>,
              {
                editorHitMode: "content",
                resizeHitMode: "frame",
                selectionFrameMode: "content",
                hitTargetMode: "manual",
              },
            )}

            {renderBlock(
              "title",
              <div className="flex h-full w-full items-start">
                <EditorHitTarget
                  blockId="title"
                  className="block max-w-full"
                  contentRefs={contentRefs}
                >
                  <h1 className="max-w-full text-[2.2rem] font-semibold leading-[1.02] tracking-[-0.03em] text-[var(--lv-text)] xl:text-[3rem]">
                    {page.title ?? "Pagina sin titulo"}
                  </h1>
                </EditorHitTarget>
              </div>,
              {
                editorHitMode: "content",
                resizeHitMode: "frame",
                selectionFrameMode: "content",
                hitTargetMode: "manual",
              },
            )}

            {renderBlock(
              "favorite_button",
              <button
                type="button"
                onClick={onToggleFavorite}
                aria-label={page.is_favorite ? "Quitar de favoritas" : "Anadir a favoritas"}
                title={page.is_favorite ? "Quitar de favoritas" : "Anadir a favoritas"}
                className={`inline-flex h-full w-full items-center justify-center rounded-full border transition ${
                  page.is_favorite
                    ? "border-[var(--lv-warning)] bg-[var(--lv-warning-soft)] text-[var(--lv-warning)]"
                    : "border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_88%,transparent)] text-[var(--lv-text-muted)] hover:text-[var(--lv-text)]"
                }`}
              >
                <Star
                  size={18}
                  style={page.is_favorite ? { fill: "currentColor" } : undefined}
                />
              </button>,
            )}

            {renderBlock(
              "highlight_button",
              <button
                type="button"
                onClick={onToggleYearHighlight}
                aria-label={yearHighlightActionLabel}
                aria-pressed={isYearHighlight}
                title={yearHighlightActionLabel}
                disabled={!canToggleYearHighlight || updatingYearHighlight}
                className={`inline-flex h-full w-full items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-55 ${
                  isYearHighlight
                    ? "border-[var(--lv-primary)] bg-[var(--lv-primary-soft)] text-[var(--lv-primary-strong)]"
                    : "border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_88%,transparent)] text-[var(--lv-text-muted)] hover:text-[var(--lv-text)]"
                }`}
              >
                <Sparkles
                  size={18}
                  style={isYearHighlight ? { fill: "currentColor" } : undefined}
                />
              </button>,
            )}

            {renderBlock(
              "plan_meta_badge",
              <span className="inline-flex h-full w-full items-center justify-center rounded-full border border-[var(--lv-primary)] bg-[color-mix(in_srgb,var(--lv-primary-soft)_82%,white)] px-4 text-center text-sm font-medium text-[var(--lv-primary-strong)] backdrop-blur-sm">
                {combinedPlanMetaLabel}
              </span>,
            )}

            {renderBlock(
              "place_type_badge",
              <span className="inline-flex h-full w-full items-center justify-center rounded-full border border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_90%,transparent)] px-4 text-center text-sm font-medium text-[var(--lv-text)] backdrop-blur-sm">
                {placeType ?? "Tipo de lugar"}
              </span>,
            )}

            {renderBlock(
              "completion_badge",
              <span className="inline-flex h-full w-full items-center justify-center rounded-full border border-[var(--lv-warning)] bg-[color-mix(in_srgb,var(--lv-warning-soft)_92%,white)] px-4 text-center text-sm font-medium text-[var(--lv-warning)] backdrop-blur-sm">
                {completionBadgeLabel(completionState)}
              </span>,
            )}

            {renderBlock(
              "completion_hint",
              <div className="flex h-full w-full items-start">
                <EditorHitTarget
                  blockId="completion_hint"
                  className="block max-w-full"
                  contentRefs={contentRefs}
                >
                  <p className="max-w-full text-sm text-[var(--lv-text-muted)]">
                    {completionHint(completionState)}
                  </p>
                </EditorHitTarget>
              </div>,
              {
                editorHitMode: "content",
                resizeHitMode: "frame",
                selectionFrameMode: "content",
                hitTargetMode: "manual",
              },
            )}

            {renderBlock(
              "flower_visual",
              <div className="h-full rounded-[34px] border border-[var(--lv-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--lv-surface)_82%,transparent),color-mix(in_srgb,var(--lv-bg-soft)_68%,transparent))] p-5 shadow-[var(--lv-shadow-md)] backdrop-blur-md">
                <div className="flex h-full items-center justify-center overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_50%_30%,color-mix(in_srgb,var(--lv-surface)_86%,white),color-mix(in_srgb,var(--lv-bg-soft)_18%,transparent)_60%)]">
                  <Image
                    src={plantAssetSrc}
                    alt={`Flor de ${resolvedPlanLabel.toLowerCase()}`}
                    width={160}
                    height={160}
                    className={`h-[138px] w-[138px] object-contain transition ${flowerScaleClass}`}
                  />
                </div>
              </div>,
            )}

            {renderBlock(
              "rating",
              <div className="h-full">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                  Valoracion
                </div>
                <div
                  className={`mt-4 rounded-[22px] px-4 py-4 backdrop-blur-sm ${
                    readMode || ratingReadOnly
                      ? "border border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_76%,transparent)]"
                      : "border border-dashed border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_84%,transparent)]"
                  }`}
                >
                  <InlineStars
                    value={rating}
                    onChange={onRatingChange}
                    readOnly={readMode || ratingReadOnly}
                  />
                  {ratingHint ? (
                    <p className="mt-3 text-sm text-[var(--lv-text-muted)]">{ratingHint}</p>
                  ) : null}
                </div>
              </div>,
            )}

            {renderBlock(
              "summary",
              <div
                className={`flex h-full min-h-0 flex-col rounded-[30px] p-5 shadow-[var(--lv-shadow-sm)] backdrop-blur-md ${
                  readMode
                    ? "border border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_84%,transparent)]"
                    : "border border-dashed border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_90%,transparent)]"
                }`}
              >
                <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
                  {readMode ? "Sentido del recuerdo" : "Descripcion del recuerdo"}
                </div>
                {readMode ? (
                  <div className="mt-3 min-h-0 flex-1 overflow-auto text-[16px] leading-7 text-[var(--lv-text)] [overflow-wrap:anywhere]">
                    {planSummaryText ? (
                      <p className="whitespace-pre-wrap break-words">{planSummaryText}</p>
                    ) : (
                      <p className="text-[var(--lv-text-muted)]">
                        Esta flor aun no tiene una descripcion escrita. Entra en editar cuando
                        quieras darle contexto.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 min-h-0 flex-1 rounded-[22px] border border-dashed border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_94%,transparent)] px-4 py-3">
                    {summaryPresenceLabel || summaryConflictNotice ? (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {summaryPresenceLabel ? (
                          <span className="rounded-full bg-[color-mix(in_srgb,var(--lv-primary-soft)_86%,white)] px-3 py-1 text-xs font-medium text-[var(--lv-primary-strong)]">
                            {summaryPresenceLabel}
                          </span>
                        ) : null}
                        {summaryConflictNotice ? (
                          <span className="rounded-full bg-[var(--lv-warning-soft)] px-3 py-1 text-xs font-medium text-[var(--lv-warning)]">
                            Han entrado cambios del otro lado en este mismo texto.
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    <textarea
                      ref={descriptionTextareaRef}
                      value={page.plan_summary ?? ""}
                      onChange={(event) => onPlanSummaryChange(event.target.value)}
                      onFocus={onSummaryFocus}
                      onBlur={onSummaryBlur}
                      placeholder="Describe en una o dos frases que plan fue, como se dio o que tuvo de especial..."
                      className="min-h-full w-full resize-none overflow-hidden bg-transparent text-[16px] leading-7 text-[var(--lv-text)] outline-none placeholder:text-[var(--lv-text-muted)] [overflow-wrap:anywhere]"
                    />
                  </div>
                )}
              </div>,
            )}

            {renderBlock(
              "seed_card",
              showSeedLine ? (
                <DetailLine
                  icon={<Sparkles size={16} />}
                  label="Semilla"
                  value={linkedSeedTitle ?? ""}
                />
              ) : (
                <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_74%,transparent)] px-4 text-sm text-[var(--lv-text-muted)]">
                  Semilla sin vincular
                </div>
              ),
            )}

            {renderBlock(
              "place_card",
              resolvedPlaceLabel ? (
                <DetailLine
                  icon={<MapPin size={16} />}
                  label="Lugar"
                  value={resolvedPlaceLabel}
                />
              ) : (
                <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_74%,transparent)] px-4 text-sm text-[var(--lv-text-muted)]">
                  Lugar sin vincular
                </div>
              ),
            )}

            {renderBlock(
              "route_card",
              linkedRouteLabel ? (
                <DetailLine
                  icon={<Route size={16} />}
                  label="Ruta"
                  value={linkedRouteLabel}
                />
              ) : (
                <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_74%,transparent)] px-4 text-sm text-[var(--lv-text-muted)]">
                  Ruta sin vincular
                </div>
              ),
            )}

            {renderBlock(
              "audio_card",
              resolvedAudioUrl ? (
                <DetailLine
                  icon={<Volume2 size={16} />}
                  label="Audio"
                  value="Audio asociado"
                />
              ) : (
                <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-[var(--lv-border)] bg-[color-mix(in_srgb,var(--lv-surface)_74%,transparent)] px-4 text-sm text-[var(--lv-text-muted)]">
                  Audio sin vincular
                </div>
              ),
            )}
          </div>

        </div>
      </div>

      {msg ? <StatusNotice message={msg} className="border-t border-[var(--lv-border)] px-5 py-4 xl:px-6" /> : null}
    </section>
  );
}
