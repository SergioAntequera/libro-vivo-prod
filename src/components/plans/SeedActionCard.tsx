"use client";

import { useMemo, useState } from "react";
import type { SeedItem, SeedPlaceOption, SeedPlanTypeOption, SeedRouteOption } from "@/lib/plansTypes";
import {
  resolvePlanFlowerAssetPath,
  resolvePlanSeedAssetPath,
} from "@/lib/planVisuals";
import PlanTypePicker from "@/components/shared/PlanTypePicker";

type SeedActionCardProps = {
  seed: SeedItem;
  statusLabel: string;
  elementName: string | null;
  planTypeLabel?: string | null;
  linkedPlaceLabel?: string | null;
  linkedRouteLabel?: string | null;
  planTypeOptions?: SeedPlanTypeOption[];
  placeOptions?: SeedPlaceOption[];
  routeOptions?: SeedRouteOption[];
  onCreatePlanType?: (input: {
    label: string;
    suggestedElement: string;
  }) => Promise<SeedPlanTypeOption | null>;
  onUpdateSeedContext?: (
    seed: SeedItem,
    input: { mapPlaceId: string | null; mapRouteId: string | null; planTypeId: string | null },
  ) => void;
  onOpenMap?: () => void;
  containerClassName?: string;
  actionsMinWidthClassName?: string;
  canSchedule: boolean;
  canUnschedule: boolean;
  canBloom: boolean;
  scheduleValue: string;
  scheduleButtonLabel: string;
  scheduleRequiredMessage: string;
  scheduleButtonClassName?: string;
  deleting: boolean;
  onScheduleValueChange: (seedId: string, value: string) => void;
  onSchedule: (seed: SeedItem, date: string) => void;
  onUnschedule: (seed: SeedItem) => void;
  onOpenWizard: (seed: SeedItem) => void;
  onBloom?: (seed: SeedItem) => void;
  onOpenPage?: (pageId: string) => void;
  onDelete: (seed: SeedItem) => void;
  onMessage: (message: string) => void;
  openWizardButtonClassName?: string;
  deleteButtonClassName?: string;
};

function SeedVisualThumb({
  src,
  label,
}: {
  src: string;
  label: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex h-20 w-20 items-center justify-center rounded-[22px] border border-[var(--lv-border)] bg-white text-lg font-semibold text-[var(--lv-text-muted)]">
        {label.slice(0, 1).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={label}
      className="h-20 w-20 rounded-[22px] border border-[var(--lv-border)] bg-white object-contain p-3"
      onError={() => setFailed(true)}
    />
  );
}

export default function SeedActionCard(props: SeedActionCardProps) {
  const {
    seed,
    statusLabel,
    elementName,
    planTypeLabel = null,
    linkedPlaceLabel = null,
    linkedRouteLabel = null,
    planTypeOptions = [],
    placeOptions = [],
    routeOptions = [],
    onUpdateSeedContext,
    onOpenMap,
    containerClassName = "bg-white",
    actionsMinWidthClassName = "min-w-[230px]",
    canSchedule,
    canUnschedule,
    canBloom,
    scheduleValue,
    scheduleButtonLabel,
    scheduleRequiredMessage,
    scheduleButtonClassName = "lv-btn lv-btn-secondary px-3 py-2 text-sm",
    deleting,
    onScheduleValueChange,
    onSchedule,
    onUnschedule,
    onOpenWizard,
    onBloom,
    onOpenPage,
    onDelete,
    onMessage,
    openWizardButtonClassName = "lv-btn lv-btn-secondary",
    deleteButtonClassName = "lv-btn lv-btn-danger px-4 py-2 text-sm",
  } = props;
  const [showContextEditor, setShowContextEditor] = useState(false);
  const [draftPlaceId, setDraftPlaceId] = useState(seed.map_place_id ?? "");
  const [draftRouteId, setDraftRouteId] = useState(seed.map_route_id ?? "");
  const [draftPlanTypeId, setDraftPlanTypeId] = useState(seed.plan_type_id ?? "");
  const isBloomedSeed = Boolean(seed.bloomed_page_id);
  const currentPlanType = useMemo(
    () => planTypeOptions.find((option) => option.id === (seed.plan_type_id ?? "")) ?? null,
    [planTypeOptions, seed.plan_type_id],
  );
  const visualLabel = planTypeLabel ?? seed.title;
  const visualSrc = useMemo(() => {
    if (seed.bloomed_page_id) {
      return resolvePlanFlowerAssetPath({
        planCategory: currentPlanType?.category ?? null,
        planFlowerAssetPath: currentPlanType?.flowerAssetPath ?? null,
        planFlowerFamily: currentPlanType?.flowerFamily ?? null,
        planSuggestedElement: currentPlanType?.suggestedElement ?? seed.element,
        element: seed.element,
        rating: 3,
      });
    }

    return resolvePlanSeedAssetPath({
      planSeedAssetPath: currentPlanType?.seedAssetPath ?? null,
      planCategory: currentPlanType?.category ?? null,
      planFlowerFamily: currentPlanType?.flowerFamily ?? null,
      planSuggestedElement: currentPlanType?.suggestedElement ?? seed.element,
    });
  }, [
    currentPlanType?.category,
    currentPlanType?.flowerAssetPath,
    currentPlanType?.flowerFamily,
    currentPlanType?.seedAssetPath,
    currentPlanType?.suggestedElement,
    seed.bloomed_page_id,
    seed.element,
  ]);

  function resetDraftContext() {
    setDraftPlaceId(seed.map_place_id ?? "");
    setDraftRouteId(seed.map_route_id ?? "");
    setDraftPlanTypeId(seed.plan_type_id ?? "");
  }

  async function handleSaveContext() {
    const nextPlanTypeId = draftPlanTypeId || null;

    onUpdateSeedContext?.(seed, {
      mapPlaceId: draftPlaceId || null,
      mapRouteId: draftRouteId || null,
      planTypeId: nextPlanTypeId,
    });
    setShowContextEditor(false);
  }

  return (
    <div className={`lv-card-soft p-3 ${containerClassName}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <SeedVisualThumb src={visualSrc} label={visualLabel} />
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{seed.title}</div>
              <div className="text-sm text-[var(--lv-text-muted)]">
                {statusLabel}
                {seed.scheduled_date ? `: ${seed.scheduled_date}` : ""}
                {elementName ? ` - ${elementName}` : ""}
              </div>
              {seed.notes ? (
                <div className="mt-1 text-sm text-[var(--lv-text-muted)]">{seed.notes}</div>
              ) : null}
              {planTypeLabel || linkedPlaceLabel || linkedRouteLabel ? (
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {planTypeLabel ? <span className="lv-badge">Plan: {planTypeLabel}</span> : null}
                  {linkedPlaceLabel ? <span className="lv-badge">Lugar: {linkedPlaceLabel}</span> : null}
                  {linkedRouteLabel ? <span className="lv-badge">Ruta: {linkedRouteLabel}</span> : null}
                </div>
              ) : null}
            </div>
          </div>
          {showContextEditor ? (
            <div className="mt-3 rounded-[18px] border border-[var(--lv-border)] bg-white/80 p-3 space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <PlanTypePicker
                  options={planTypeOptions}
                  value={draftPlanTypeId}
                  onChange={setDraftPlanTypeId}
                  placeholder="Buscar tipo de plan"
                  searchPlaceholder="Escribe para buscar un tipo"
                  disabled={isBloomedSeed}
                />
                <select
                  className="lv-select"
                  value={draftPlaceId}
                  onChange={(event) => setDraftPlaceId(event.target.value)}
                >
                  <option value="">Sin lugar asociado</option>
                  {placeOptions.map((place) => (
                    <option key={place.id} value={place.id}>
                      {place.title}
                      {place.subtitle ? ` - ${place.subtitle}` : ""}
                    </option>
                  ))}
                </select>
                <select
                  className="lv-select sm:col-span-2"
                  value={draftRouteId}
                  onChange={(event) => setDraftRouteId(event.target.value)}
                >
                  <option value="">Sin ruta asociada</option>
                  {routeOptions.map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.title}
                      {route.subtitle ? ` - ${route.subtitle}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              {isBloomedSeed ? (
                <div className="text-xs text-[var(--lv-text-muted)]">
                  El tipo de plan de una flor ya se edita desde su propia pagina para mantener una sola verdad.
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="lv-btn lv-btn-secondary px-3 py-2 text-sm"
                  onClick={() => void handleSaveContext()}
                >
                  Guardar contexto
                </button>
                {onOpenMap ? (
                  <button
                    type="button"
                    className="lv-btn lv-btn-secondary px-3 py-2 text-sm"
                    onClick={onOpenMap}
                  >
                    Abrir mapa
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className={`flex flex-col gap-2 ${actionsMinWidthClassName}`}>
          {canSchedule ? (
            <div className="flex gap-2">
              <input
                type="date"
                className="lv-input flex-1 p-2"
                value={scheduleValue}
                onChange={(event) => onScheduleValueChange(seed.id, event.target.value)}
              />
              <button
                className={scheduleButtonClassName}
                onClick={() => {
                  const next = scheduleValue.trim();
                  if (!next) {
                    onMessage(scheduleRequiredMessage);
                    return;
                  }
                  onSchedule(seed, next);
                }}
              >
                {scheduleButtonLabel}
              </button>
            </div>
          ) : null}

          {canUnschedule && seed.scheduled_date ? (
            <button
              className="lv-btn lv-btn-secondary px-3 py-2 text-sm"
              onClick={() => onUnschedule(seed)}
            >
              Quitar fecha
            </button>
          ) : null}

          {canBloom ? (
            <button className={openWizardButtonClassName} onClick={() => onOpenWizard(seed)}>
              Abrir asistente
            </button>
          ) : null}

          {onUpdateSeedContext ? (
            <button
              className="lv-btn lv-btn-secondary px-3 py-2 text-sm"
              onClick={() => {
                if (showContextEditor) {
                  setShowContextEditor(false);
                  return;
                }
                resetDraftContext();
                setShowContextEditor(true);
              }}
            >
              {showContextEditor ? "Ocultar contexto" : "Editar plan y mapa"}
            </button>
          ) : null}

          {canBloom && onBloom ? (
            <button className="lv-btn lv-btn-primary" onClick={() => onBloom(seed)}>
              Florecer
            </button>
          ) : null}

          {seed.bloomed_page_id && onOpenPage ? (
            <button
              className="lv-btn lv-btn-secondary"
              onClick={() => {
                const pageId = seed.bloomed_page_id;
                if (!pageId) return;
                onOpenPage(pageId);
              }}
            >
              Abrir pagina
            </button>
          ) : null}

          <button className={deleteButtonClassName} onClick={() => onDelete(seed)} disabled={deleting}>
            {deleting ? "Borrando..." : "Borrar semilla"}
          </button>
        </div>
      </div>
    </div>
  );
}
