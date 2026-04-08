"use client";

import type { AgendaFocus, AgendaSection, SeedItem } from "@/lib/plansTypes";
import type { SeedPlaceOption, SeedPlanTypeOption, SeedRouteOption } from "@/lib/plansTypes";
import SeedActionCard from "@/components/plans/SeedActionCard";

type PlansCalendarTabProps = {
  agendaFocus: AgendaFocus;
  onSetFocus: (next: AgendaFocus) => void;
  dueTodayCount: number;
  overdueCount: number;
  upcomingCount: number;
  withoutDateCount: number;
  agendaSections: AgendaSection[];
  visibleAgendaSections: AgendaSection[];
  statusLabel: Map<string, string>;
  elementLabel: Map<string, string>;
  planTypeLabel: Map<string, string>;
  placeLabel: Map<string, string>;
  routeLabel: Map<string, string>;
  planTypeOptions: SeedPlanTypeOption[];
  placeOptions: SeedPlaceOption[];
  routeOptions: SeedRouteOption[];
  fallbackElement: string;
  onCreatePlanType: (input: { label: string; suggestedElement: string }) => Promise<SeedPlanTypeOption | null>;
  onUpdateSeedContext: (
    seed: SeedItem,
    input: { mapPlaceId: string | null; mapRouteId: string | null; planTypeId: string | null },
  ) => void;
  onOpenMap: () => void;
  canSchedule: (seed: SeedItem) => boolean;
  canUnschedule: (seed: SeedItem) => boolean;
  canBloom: (seed: SeedItem) => boolean;
  scheduleDrafts: Record<string, string>;
  onScheduleDraftChange: (seedId: string, value: string) => void;
  onScheduleSeed: (seed: SeedItem, date: string) => void;
  onUnscheduleSeed: (seed: SeedItem) => void;
  onOpenWizard: (seed: SeedItem) => void;
  onBloomSeed: (seed: SeedItem) => void;
  onOpenPage: (pageId: string) => void;
  onDeleteSeed: (seed: SeedItem) => void;
  deletingSeedId: string | null;
  onMessage: (message: string) => void;
};

export default function PlansCalendarTab(props: PlansCalendarTabProps) {
  const {
    agendaFocus,
    onSetFocus,
    dueTodayCount,
    overdueCount,
    upcomingCount,
    withoutDateCount,
    agendaSections,
    visibleAgendaSections,
    statusLabel,
    elementLabel,
    planTypeLabel,
    placeLabel,
    routeLabel,
    planTypeOptions,
    placeOptions,
    routeOptions,
    fallbackElement,
    onCreatePlanType,
    onUpdateSeedContext,
    onOpenMap,
    canSchedule,
    canUnschedule,
    canBloom,
    scheduleDrafts,
    onScheduleDraftChange,
    onScheduleSeed,
    onUnscheduleSeed,
    onOpenWizard,
    onBloomSeed,
    onOpenPage,
    onDeleteSeed,
    deletingSeedId,
    onMessage,
  } = props;

  return (
    <div className="space-y-3">
      <div className="text-sm text-[var(--lv-text-muted)]">
        Vista por urgencia para decidir que hacer hoy y que dejar programado.
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          className={`lv-card-soft p-3 text-left ${
            agendaFocus === "today" ? "lv-tone-success" : ""
          }`}
          onClick={() => onSetFocus("today")}
        >
          <div className="text-xs text-[var(--lv-text-muted)]">Hoy</div>
          <div className="text-xl font-semibold">{dueTodayCount}</div>
        </button>
        <button
          className={`lv-card-soft p-3 text-left ${
            agendaFocus === "overdue" ? "lv-tone-warning" : ""
          }`}
          onClick={() => onSetFocus("overdue")}
        >
          <div className="text-xs text-[var(--lv-text-muted)]">Atrasadas</div>
          <div className="text-xl font-semibold">{overdueCount}</div>
        </button>
        <button
          className={`lv-card-soft p-3 text-left ${
            agendaFocus === "upcoming" ? "lv-tone-info" : ""
          }`}
          onClick={() => onSetFocus("upcoming")}
        >
          <div className="text-xs text-[var(--lv-text-muted)]">Proximas</div>
          <div className="text-xl font-semibold">{upcomingCount}</div>
        </button>
        <button
          className={`lv-card-soft p-3 text-left ${
            agendaFocus === "without_date" ? "lv-tone-warning" : ""
          }`}
          onClick={() => onSetFocus("without_date")}
        >
          <div className="text-xs text-[var(--lv-text-muted)]">Sin fecha</div>
          <div className="text-xl font-semibold">{withoutDateCount}</div>
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className={`lv-btn lv-btn-secondary text-sm ${
            agendaFocus === "all" ? "lv-tone-info" : ""
          }`}
          onClick={() => onSetFocus("all")}
        >
          Ver todo
        </button>
        {agendaFocus !== "all" && (
          <div className="lv-card-soft bg-white px-3 py-2 text-sm">
            Foco: {agendaSections.find((section) => section.key === agendaFocus)?.title ?? "Agenda"}
          </div>
        )}
      </div>

      {!visibleAgendaSections.some((section) => section.items.length > 0) ? (
        <div className="lv-card-soft p-4 text-sm text-[var(--lv-text-muted)]">
          No hay semillas para este foco.
        </div>
      ) : (
        <div className="space-y-3">
          {visibleAgendaSections
            .filter((section) => section.items.length > 0)
            .map((section) => (
              <div key={section.key} className="lv-card-soft p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{section.title}</div>
                    <div className="text-sm text-[var(--lv-text-muted)]">{section.hint}</div>
                  </div>
                  <div className="lv-badge bg-white px-3 py-1 text-sm">
                    {section.items.length}
                  </div>
                </div>
                <div className="mt-2 space-y-2">
                  {section.items.map((seed) => {
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
                        actionsMinWidthClassName="min-w-[230px]"
                        canSchedule={canSchedule(seed)}
                        canUnschedule={canUnschedule(seed)}
                        canBloom={canBloom(seed)}
                        scheduleValue={scheduleDrafts[seed.id] ?? ""}
                        scheduleButtonLabel="Guardar fecha"
                        scheduleRequiredMessage="Selecciona una fecha antes de guardar agenda."
                        deleting={deletingSeedId === seed.id}
                        onScheduleValueChange={onScheduleDraftChange}
                        onSchedule={onScheduleSeed}
                        onUnschedule={onUnscheduleSeed}
                        onOpenWizard={onOpenWizard}
                        onBloom={onBloomSeed}
                        onOpenPage={onOpenPage}
                        onDelete={onDeleteSeed}
                        onMessage={onMessage}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
