"use client";

import type { SeedPlaceOption, SeedPlanTypeOption, SeedRouteOption } from "@/lib/plansTypes";
import type { SeedPreparationCollaborationMode } from "@/lib/seedPreparationTypes";
import { resolvePreparationCollaborationHint, resolvePreparationCollaborationLabel } from "@/lib/seedPreparation";
import PlanTypePicker from "@/components/shared/PlanTypePicker";
import {
  DESTINATION_KIND_OPTIONS,
  buildPlaceOptionLabel,
  buildRouteOptionLabel,
  computeDateRangeDays,
  formatPreparationDateRange,
} from "@/components/plans/preparation/seedPreparationUi";
import { SeedPreparationSectionCard } from "@/components/plans/preparation/SeedPreparationSectionCard";

function resolveCollaborationModeNotice(mode: SeedPreparationCollaborationMode) {
  return mode === "shared"
    ? "Ya lo veis las dos personas dentro del jardin y podeis prepararlo en conjunto cuando querais."
    : "Solo te aparece a ti mientras siga asi. Si antes estaba en conjunto, dejara de verse al otro lado hasta que vuelvas a compartirlo.";
}

function CollaborationModeButton({
  active,
  label,
  hint,
  testId,
  onClick,
}: {
  active: boolean;
  label: string;
  hint: string;
  testId?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={`rounded-[20px] border p-4 text-left transition ${
        active
          ? "border-[#86b49d] bg-[#eef6ea] text-[#2f5137]"
          : "border-[var(--lv-border)] bg-white text-[var(--lv-text)]"
      }`}
    >
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-2 text-sm leading-6 text-[var(--lv-text-muted)]">{hint}</div>
    </button>
  );
}

type SeedPreparationTripBriefSectionProps = {
  title: string;
  notes: string;
  summary: string;
  selectedPlanTypeId: string;
  collaborationMode: SeedPreparationCollaborationMode;
  dateMode: "single_day" | "date_range" | "flexible";
  startsOn: string;
  endsOn: string;
  budgetAmount: string;
  budgetCurrency: string;
  budgetNotes: string;
  goalTagsRaw: string;
  destinationLabel: string;
  destinationKind: string;
  sharedIntention: string;
  whyThisTrip: string;
  climateContext: string;
  primaryMapPlaceId: string;
  primaryMapRouteId: string;
  planTypeOptions: SeedPlanTypeOption[];
  placeOptions: SeedPlaceOption[];
  routeOptions: SeedRouteOption[];
  onBlurSection?: () => void;
  onTitleChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onSummaryChange: (value: string) => void;
  onSelectedPlanTypeIdChange: (value: string) => void;
  onCollaborationModeChange: (value: SeedPreparationCollaborationMode) => void;
  onDateModeChange: (value: "single_day" | "date_range" | "flexible") => void;
  onStartsOnChange: (value: string) => void;
  onEndsOnChange: (value: string) => void;
  onBudgetAmountChange: (value: string) => void;
  onBudgetCurrencyChange: (value: string) => void;
  onBudgetNotesChange: (value: string) => void;
  onGoalTagsRawChange: (value: string) => void;
  onDestinationLabelChange: (value: string) => void;
  onDestinationKindChange: (value: string) => void;
  onSharedIntentionChange: (value: string) => void;
  onWhyThisTripChange: (value: string) => void;
  onClimateContextChange: (value: string) => void;
  onPrimaryMapPlaceIdChange: (value: string) => void;
  onPrimaryMapRouteIdChange: (value: string) => void;
  onFocusSection?: () => void;
};

export function SeedPreparationTripBriefSection({
  title,
  notes,
  summary,
  selectedPlanTypeId,
  collaborationMode,
  dateMode,
  startsOn,
  endsOn,
  budgetAmount,
  budgetCurrency,
  budgetNotes,
  goalTagsRaw,
  destinationLabel,
  destinationKind,
  sharedIntention,
  whyThisTrip,
  climateContext,
  primaryMapPlaceId,
  primaryMapRouteId,
  planTypeOptions,
  placeOptions,
  routeOptions,
  onBlurSection,
  onTitleChange,
  onNotesChange,
  onSummaryChange,
  onSelectedPlanTypeIdChange,
  onCollaborationModeChange,
  onDateModeChange,
  onStartsOnChange,
  onEndsOnChange,
  onBudgetAmountChange,
  onBudgetCurrencyChange,
  onBudgetNotesChange,
  onGoalTagsRawChange,
  onDestinationLabelChange,
  onDestinationKindChange,
  onSharedIntentionChange,
  onWhyThisTripChange,
  onClimateContextChange,
  onPrimaryMapPlaceIdChange,
  onPrimaryMapRouteIdChange,
  onFocusSection,
}: SeedPreparationTripBriefSectionProps) {
  const durationDays = computeDateRangeDays(startsOn, endsOn, dateMode);
  const dateRangeSummary = formatPreparationDateRange(startsOn, endsOn, dateMode);
  const collaborationNotice = resolveCollaborationModeNotice(collaborationMode);

  return (
    <div
      onFocusCapture={() => onFocusSection?.()}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onBlurSection?.();
        }
      }}
    >
      <SeedPreparationSectionCard
        eyebrow="Resumen del viaje"
        title="Base del viaje"
        description="Aqui se decide el destino, la intencion y la forma minima del viaje antes de bajar a etapas, trayectos y reservas."
        action={
          <div className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-3 py-2 text-sm text-[var(--lv-text-muted)]">
            {durationDays ? `${durationDays} dia${durationDays === 1 ? "" : "s"}` : dateRangeSummary}
          </div>
        }
      >
      <div className="space-y-3">
        <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
          Colaboracion
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <CollaborationModeButton
            active={collaborationMode === "solo_for_now"}
            label={resolvePreparationCollaborationLabel("solo_for_now")}
            hint={resolvePreparationCollaborationHint("solo_for_now")}
            testId="seed-preparation-collaboration-solo"
            onClick={() => onCollaborationModeChange("solo_for_now")}
          />
          <CollaborationModeButton
            active={collaborationMode === "shared"}
            label={resolvePreparationCollaborationLabel("shared")}
            hint={resolvePreparationCollaborationHint("shared")}
            testId="seed-preparation-collaboration-shared"
            onClick={() => onCollaborationModeChange("shared")}
          />
        </div>
        <div className="rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 py-3 text-sm leading-6 text-[var(--lv-text-muted)]">
          {collaborationNotice}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
            Titulo
          </div>
          <input
            data-testid="seed-preparation-title"
            className="lv-input"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Ej. Escapada a Lisboa"
          />
        </label>

        <label className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
            Clasificacion opcional
          </div>
          <div className="text-xs leading-5 text-[var(--lv-text-muted)]">
            Solo si quieres encajar este viaje en la biblioteca.
          </div>
          <div data-testid="seed-preparation-plan-type">
            <PlanTypePicker
              options={planTypeOptions}
              value={selectedPlanTypeId}
              onChange={onSelectedPlanTypeIdChange}
              testId="seed-preparation-plan-type"
              placeholder="Buscar tipo de plan"
              searchPlaceholder="Escribe para buscar un tipo"
              compact
            />
          </div>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
        <label className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
            Destino principal
          </div>
          <input
            data-testid="seed-preparation-destination-label"
            className="lv-input"
            value={destinationLabel}
            onChange={(event) => onDestinationLabelChange(event.target.value)}
            placeholder="Lisboa, Costa Amalfitana, Japon..."
          />
        </label>

        <label className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
            Tipo de destino
          </div>
          <select
            data-testid="seed-preparation-destination-kind"
            className="lv-select"
            value={destinationKind}
            onChange={(event) => onDestinationKindChange(event.target.value)}
          >
            <option value="">Sin perfil</option>
            {DESTINATION_KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="space-y-2">
        <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
          Resumen
        </div>
        <textarea
          data-testid="seed-preparation-summary"
          className="lv-textarea min-h-[110px]"
          value={summary}
          onChange={(event) => onSummaryChange(event.target.value)}
          placeholder="Que forma tiene el viaje, como os imaginais el ritmo y que quereis tener claro antes de plantarlo."
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
            Intencion compartida
          </div>
          <textarea
            data-testid="seed-preparation-shared-intention"
            className="lv-textarea min-h-[96px]"
            value={sharedIntention}
            onChange={(event) => onSharedIntentionChange(event.target.value)}
            placeholder="Que os gustaria sentir o cuidar con este viaje."
          />
        </label>

        <label className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
            Por que os apetece
          </div>
          <textarea
            data-testid="seed-preparation-why-this-trip"
            className="lv-textarea min-h-[96px]"
            value={whyThisTrip}
            onChange={(event) => onWhyThisTripChange(event.target.value)}
            placeholder="Motivo emocional, celebracion, descanso, curiosidad o impulso compartido."
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-[0.9fr_1fr_1fr]">
        <label className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
            Modo de fechas
          </div>
          <select
            data-testid="seed-preparation-date-mode"
            className="lv-select"
            value={dateMode}
            onChange={(event) =>
              onDateModeChange(event.target.value as "single_day" | "date_range" | "flexible")
            }
          >
            <option value="single_day">Un solo dia</option>
            <option value="date_range">Rango</option>
            <option value="flexible">Flexible</option>
          </select>
        </label>

        <label className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
            Desde
          </div>
          <input
            data-testid="seed-preparation-starts-on"
            type="date"
            className="lv-input"
            value={startsOn}
            onChange={(event) => onStartsOnChange(event.target.value)}
            disabled={dateMode === "flexible"}
          />
        </label>

        <label className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
            Hasta
          </div>
          <input
            data-testid="seed-preparation-ends-on"
            type="date"
            className="lv-input"
            value={endsOn}
            onChange={(event) => onEndsOnChange(event.target.value)}
            disabled={dateMode !== "date_range"}
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-[0.8fr_0.6fr_1.2fr]">
        <label className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
            Presupuesto aproximado
          </div>
          <input
            data-testid="seed-preparation-budget-amount"
            className="lv-input"
            value={budgetAmount}
            onChange={(event) => onBudgetAmountChange(event.target.value)}
            placeholder="Opcional"
            inputMode="decimal"
          />
        </label>

        <label className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
            Moneda
          </div>
          <input
            data-testid="seed-preparation-budget-currency"
            className="lv-input"
            value={budgetCurrency}
            onChange={(event) => onBudgetCurrencyChange(event.target.value.toUpperCase())}
            maxLength={4}
          />
        </label>

        <label className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
            Matiz del presupuesto
          </div>
          <input
            data-testid="seed-preparation-budget-notes"
            className="lv-input"
            value={budgetNotes}
            onChange={(event) => onBudgetNotesChange(event.target.value)}
            placeholder="Que incluye, margen de flexibilidad o tope mental."
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
            Lugar principal del mapa
          </div>
          <select
            data-testid="seed-preparation-primary-place"
            className="lv-select"
            value={primaryMapPlaceId}
            onChange={(event) => onPrimaryMapPlaceIdChange(event.target.value)}
          >
            <option value="">Sin lugar principal todavia</option>
            {placeOptions.map((place) => (
              <option key={place.id} value={place.id}>
                {buildPlaceOptionLabel(place)}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
            Ruta principal
          </div>
          <select
            data-testid="seed-preparation-primary-route"
            className="lv-select"
            value={primaryMapRouteId}
            onChange={(event) => onPrimaryMapRouteIdChange(event.target.value)}
          >
            <option value="">Sin ruta principal todavia</option>
            {routeOptions.map((route) => (
              <option key={route.id} value={route.id}>
                {buildRouteOptionLabel(route)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
            Objetivos
          </div>
          <input
            data-testid="seed-preparation-goals"
            className="lv-input"
            value={goalTagsRaw}
            onChange={(event) => onGoalTagsRawChange(event.target.value)}
            placeholder="Relax, aventura, cultura, fiesta, desconectar..."
          />
        </label>

        <label className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
            Clima y contexto estacional
          </div>
          <input
            data-testid="seed-preparation-climate-context"
            className="lv-input"
            value={climateContext}
            onChange={(event) => onClimateContextChange(event.target.value)}
            placeholder="Frio y lluvia, calor seco, posibilidad de nieve..."
          />
        </label>
      </div>

      <label className="space-y-2">
        <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
          Notas internas
        </div>
        <textarea
          data-testid="seed-preparation-notes"
          className="lv-textarea min-h-[96px]"
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Detalles libres que os ayuden antes de plantar."
        />
      </label>
      </SeedPreparationSectionCard>
    </div>
  );
}
