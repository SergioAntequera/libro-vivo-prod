"use client";

import { useMemo, useState } from "react";
import type { CatalogItemConfig } from "@/lib/appConfig";
import type {
  SeedItem,
  SeedPlaceOption,
  SeedPlanTypeOption,
  SeedRouteOption,
} from "@/lib/plansTypes";
import {
  CUSTOM_PLAN_TYPE_VALUE,
  PLAN_TYPE_CATEGORY_LABELS,
  formatPlanTypeOptionLabel,
  groupPlanTypeOptions,
} from "@/lib/planTypeCatalog";
import { getCatalogLabelWithEmoji } from "@/lib/appConfig";
import SeedActionCard from "@/components/plans/SeedActionCard";

type PlansIdeasTabProps = {
  title: string;
  notes: string;
  element: string;
  elementOptions: CatalogItemConfig[];
  planTypeOptions: SeedPlanTypeOption[];
  selectedPlanTypeId: string;
  customPlanTypeLabel: string;
  placeOptions: SeedPlaceOption[];
  routeOptions: SeedRouteOption[];
  selectedPlaceId: string;
  selectedRouteId: string;
  onTitleChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onElementChange: (value: string) => void;
  onSelectedPlanTypeIdChange: (value: string) => void;
  onCustomPlanTypeLabelChange: (value: string) => void;
  onSelectedPlaceIdChange: (value: string) => void;
  onSelectedRouteIdChange: (value: string) => void;
  onOpenMap: () => void;
  onCreateSeed: () => void;
  unscheduledIdeas: SeedItem[];
  scheduledCount: number;
  statusLabel: Map<string, string>;
  elementLabel: Map<string, string>;
  placeLabel: Map<string, string>;
  routeLabel: Map<string, string>;
  planTypeLabel: Map<string, string>;
  fallbackElement: string;
  onCreatePlanType: (input: { label: string; suggestedElement: string }) => Promise<SeedPlanTypeOption | null>;
  onUpdateSeedContext: (
    seed: SeedItem,
    input: { mapPlaceId: string | null; mapRouteId: string | null; planTypeId: string | null },
  ) => void;
  canSchedule: (seed: SeedItem) => boolean;
  canUnschedule: (seed: SeedItem) => boolean;
  canBloom: (seed: SeedItem) => boolean;
  scheduleDrafts: Record<string, string>;
  onScheduleDraftChange: (seedId: string, value: string) => void;
  onScheduleSeed: (seed: SeedItem, date: string) => void;
  onUnscheduleSeed: (seed: SeedItem) => void;
  onOpenWizard: (seed: SeedItem) => void;
  onDeleteSeed: (seed: SeedItem) => void;
  deletingSeedId: string | null;
  onMessage: (message: string) => void;
  onOpenCalendar: () => void;
};

export default function PlansIdeasTab(props: PlansIdeasTabProps) {
  const {
    title,
    notes,
    element,
    elementOptions,
    planTypeOptions,
    selectedPlanTypeId,
    customPlanTypeLabel,
    placeOptions,
    routeOptions,
    selectedPlaceId,
    selectedRouteId,
    onTitleChange,
    onNotesChange,
    onElementChange,
    onSelectedPlanTypeIdChange,
    onCustomPlanTypeLabelChange,
    onSelectedPlaceIdChange,
    onSelectedRouteIdChange,
    onOpenMap,
    onCreateSeed,
    unscheduledIdeas,
    scheduledCount,
    statusLabel,
    elementLabel,
    placeLabel,
    routeLabel,
    planTypeLabel,
    fallbackElement,
    onCreatePlanType,
    onUpdateSeedContext,
    canSchedule,
    canUnschedule,
    canBloom,
    scheduleDrafts,
    onScheduleDraftChange,
    onScheduleSeed,
    onUnscheduleSeed,
    onOpenWizard,
    onDeleteSeed,
    deletingSeedId,
    onMessage,
    onOpenCalendar,
  } = props;
  const [showMapContext, setShowMapContext] = useState(false);
  const groupedPlanTypes = useMemo(() => groupPlanTypeOptions(planTypeOptions), [planTypeOptions]);

  return (
    <div className="space-y-4">
      <div className="lv-card-soft space-y-3 p-4">
        <div className="font-semibold">Nueva semilla</div>
        <input
          className="lv-input"
          placeholder="Título"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
        />
        <textarea
          className="lv-textarea min-h-[80px]"
          placeholder="Notas (opcional)"
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
        />

        <div className="rounded-[20px] border border-[var(--lv-border)] bg-white/70 p-3 space-y-3">
          <div>
            <div className="text-sm font-medium">Tipo de plan</div>
            <div className="text-xs text-[var(--lv-text-muted)]">
              Define de un vistazo si es una escapada, una salida, una ruta o cualquier otro plan.
            </div>
          </div>
          <select
            className="lv-select"
            value={selectedPlanTypeId}
            onChange={(event) => onSelectedPlanTypeIdChange(event.target.value)}
          >
            <option value="">Sin definir todavía</option>
            {[...groupedPlanTypes.entries()].map(([category, options]) => (
              <optgroup key={category} label={PLAN_TYPE_CATEGORY_LABELS[category]}>
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {formatPlanTypeOptionLabel(option)}
                  </option>
                ))}
              </optgroup>
            ))}
            <option value={CUSTOM_PLAN_TYPE_VALUE}>Añadir tipo propio</option>
          </select>

          {selectedPlanTypeId === CUSTOM_PLAN_TYPE_VALUE ? (
            <div className="rounded-[18px] border border-dashed border-[var(--lv-border)] bg-[#fbfcf7] p-3 space-y-2">
              <input
                className="lv-input"
                placeholder="Ej. Noche de pizza, ruta en bici, mini escapada..."
                value={customPlanTypeLabel}
                onChange={(event) => onCustomPlanTypeLabelChange(event.target.value)}
              />
              <div className="text-xs text-[var(--lv-text-muted)]">
                Lo guardaremos en vuestra biblioteca de planes para reutilizarlo luego.
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-[20px] border border-[var(--lv-border)] bg-white/70 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Lugar o ruta</div>
              <div className="text-xs text-[var(--lv-text-muted)]">
                Opcional. Sirve para que la semilla nazca ya conectada con el mapa.
              </div>
            </div>
            <button
              type="button"
              className="lv-btn lv-btn-secondary px-3 py-2 text-sm"
              onClick={() => setShowMapContext((prev) => !prev)}
              aria-expanded={showMapContext}
            >
              {showMapContext ? "Ocultar" : "Añadir"}
            </button>
          </div>
          {(selectedPlaceId || selectedRouteId) && !showMapContext ? (
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {selectedPlaceId ? (
                <span className="lv-badge">Lugar: {placeLabel.get(selectedPlaceId) ?? "Lugar guardado"}</span>
              ) : null}
              {selectedRouteId ? (
                <span className="lv-badge">Ruta: {routeLabel.get(selectedRouteId) ?? "Ruta guardada"}</span>
              ) : null}
            </div>
          ) : null}
          {showMapContext ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <select
                className="lv-select"
                value={selectedPlaceId}
                onChange={(event) => onSelectedPlaceIdChange(event.target.value)}
              >
                <option value="">Sin lugar asociado</option>
                {placeOptions.map((place) => (
                  <option key={place.id} value={place.id}>
                    {placeLabel.get(place.id) ?? place.title}
                  </option>
                ))}
              </select>
              <select
                className="lv-select"
                value={selectedRouteId}
                onChange={(event) => onSelectedRouteIdChange(event.target.value)}
              >
                <option value="">Sin ruta asociada</option>
                {routeOptions.map((route) => (
                  <option key={route.id} value={route.id}>
                    {routeLabel.get(route.id) ?? route.title}
                  </option>
                ))}
              </select>
              <div className="sm:col-span-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="lv-btn lv-btn-secondary px-3 py-2 text-sm"
                  onClick={onOpenMap}
                >
                  Abrir mapa
                </button>
                <div className="text-xs text-[var(--lv-text-muted)] self-center">
                  Si no existe todav?a, puedes guardar un sitio o crear una ruta y volver aqu?.
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2">
          <select
            className="lv-select"
            value={element}
            onChange={(event) => onElementChange(event.target.value)}
          >
            {elementOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {getCatalogLabelWithEmoji(option)}
              </option>
            ))}
          </select>
          <button className="lv-btn lv-btn-primary py-3" onClick={onCreateSeed}>
            Guardar semilla
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="lv-card-soft p-3">
          <div className="text-xs text-[var(--lv-text-muted)]">Ideas sin fecha</div>
          <div className="text-2xl font-semibold">{unscheduledIdeas.length}</div>
        </div>
        <div className="lv-card-soft p-3">
          <div className="text-xs text-[var(--lv-text-muted)]">Ya programadas</div>
          <div className="text-2xl font-semibold">{scheduledCount}</div>
        </div>
      </div>

      {!unscheduledIdeas.length ? (
        <div className="lv-card-soft p-4 text-sm text-[var(--lv-text-muted)]">
          No hay ideas sin fecha. Puedes crear una nueva arriba o revisar Agenda.
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-sm font-medium">Ideas por planificar</div>
          {unscheduledIdeas.map((seed) => {
            const label = statusLabel.get(seed.status) ?? seed.status;
            const elementName = seed.element
              ? elementLabel.get(seed.element) ?? seed.element
              : fallbackElement;

            return (
              <SeedActionCard
                key={seed.id}
                seed={seed}
                statusLabel={label}
                elementName={elementName}
                planTypeLabel={seed.plan_type_id ? planTypeLabel.get(seed.plan_type_id) ?? null : null}
                linkedPlaceLabel={seed.map_place_id ? placeLabel.get(seed.map_place_id) ?? null : null}
                linkedRouteLabel={seed.map_route_id ? routeLabel.get(seed.map_route_id) ?? null : null}
                planTypeOptions={planTypeOptions}
                placeOptions={placeOptions}
                routeOptions={routeOptions}
                onCreatePlanType={onCreatePlanType}
                onUpdateSeedContext={onUpdateSeedContext}
                onOpenMap={onOpenMap}
                containerClassName="bg-[var(--lv-surface)]"
                actionsMinWidthClassName="min-w-[220px]"
                canSchedule={canSchedule(seed)}
                canUnschedule={canUnschedule(seed)}
                canBloom={canBloom(seed)}
                scheduleValue={scheduleDrafts[seed.id] ?? ""}
                scheduleButtonLabel="Programar"
                scheduleRequiredMessage="Selecciona una fecha antes de programar."
                scheduleButtonClassName="lv-btn lv-btn-primary px-3 py-2 text-sm"
                deleting={deletingSeedId === seed.id}
                onScheduleValueChange={onScheduleDraftChange}
                onSchedule={onScheduleSeed}
                onUnschedule={onUnscheduleSeed}
                onOpenWizard={onOpenWizard}
                openWizardButtonClassName="lv-btn lv-btn-secondary px-3 py-2 text-sm"
                onDelete={onDeleteSeed}
                onMessage={onMessage}
                deleteButtonClassName="lv-btn lv-btn-danger px-3 py-2 text-sm"
              />
            );
          })}
        </div>
      )}

      {scheduledCount > 0 && (
        <div className="lv-card-soft p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold">Agenda activa</div>
              <div className="mt-1 text-sm text-[var(--lv-text-muted)]">
                Teneis {scheduledCount} plan(es) con fecha.
              </div>
            </div>
            <button className="lv-btn lv-btn-secondary" onClick={onOpenCalendar}>
              Abrir Agenda
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
