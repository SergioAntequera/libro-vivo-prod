"use client";

import type { PlansAgendaSection, PlansSeedView } from "@/lib/plansTypes";
import { ChatShareButton } from "@/components/chat/ChatShareButton";

type PlansAgendaPanelProps = {
  visibleSections: PlansAgendaSection[];
  scheduleDrafts: Record<string, string>;
  deletingSeedId: string | null;
  sharingSeedId?: string | null;
  highlightedSeedId?: string | null;
  shareRecipientLabel?: string | null;
  companionReferenceLabel?: string | null;
  emptyMessage: string;
  focusNote?: string | null;
  onScheduleDraftChange: (seedId: string, value: string) => void;
  onSaveDate: (seed: PlansSeedView, nextDate?: string) => void;
  onUnscheduleSeed: (seed: PlansSeedView) => void;
  onWaterSeed: (seed: PlansSeedView) => void;
  onDeleteSeed: (seed: PlansSeedView) => void;
  onShareSeedToChat: (seed: PlansSeedView) => void;
};

function AgendaCard(props: {
  item: PlansSeedView;
  scheduleValue: string;
  deleting: boolean;
  sharing: boolean;
  highlighted: boolean;
  shareRecipientLabel: string | null | undefined;
  companionReferenceLabel: string | null | undefined;
  onScheduleValueChange: (value: string) => void;
  onSaveDate: (nextDate?: string) => void;
  onUnschedule: () => void;
  onWater: () => void;
  onDelete: () => void;
  onShareToChat: () => void;
}) {
  const {
    item,
    scheduleValue,
    deleting,
    sharing,
    highlighted,
    shareRecipientLabel,
    companionReferenceLabel,
    onScheduleValueChange,
    onSaveDate,
    onUnschedule,
    onWater,
    onDelete,
    onShareToChat,
  } = props;
  const { seed } = item;
  const otherPersonLabel = String(companionReferenceLabel ?? "").trim() || "la otra persona";

  let helperText = "Esta flor ya no se gestiona aqui.";
  if (item.stage === "scheduled") {
    helperText =
      "Ya está colocada en agenda. Cuando llegue el día podréis empezar el rito de riego compartido.";
  } else if (item.stage === "ready_to_water") {
    helperText =
      item.otherParticipantHasWatered && !item.currentUserHasWatered
        ? `${otherPersonLabel} ya regó esta semilla. Si la riegas ahora, empezará el nacimiento compartido de la flor.`
        : "Cuando la riegues, quedará registrada tu parte de la experiencia compartida.";
  } else if (item.stage === "waiting_partner") {
    helperText = `Tu parte ya está hecha. Falta ${otherPersonLabel} para activar el nacimiento compartido.`;
  } else if (item.stage === "idea") {
    helperText = "Sigue siendo una idea. Ponle fecha cuando queráis llevarla a la agenda.";
  }

  const showDateControls = item.stage === "idea" || item.stage === "scheduled";
  const shouldShowProgramButton = item.stage === "idea";

  return (
    <article
      id={`plan-seed-${seed.id}`}
      data-testid="plans-agenda-card"
      data-seed-id={seed.id}
      className={`rounded-[24px] border bg-white p-4 shadow-sm ${
        highlighted
          ? "border-[#86b49d] shadow-[0_0_0_3px_rgba(134,180,157,0.18)]"
          : "border-[var(--lv-border)]"
      }`}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold">{seed.title}</h3>
              <span className="lv-badge">{item.stageLabel}</span>
              {item.effectiveDate ? <span className="lv-badge bg-white">{item.effectiveDate}</span> : null}
            </div>

            {item.planTypeLabel || item.linkedPlaceLabel || item.linkedRouteLabel ? (
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {item.planTypeLabel ? <span className="lv-badge">Plan: {item.planTypeLabel}</span> : null}
                {item.linkedPlaceLabel ? <span className="lv-badge">Lugar: {item.linkedPlaceLabel}</span> : null}
                {item.linkedRouteLabel ? <span className="lv-badge">Ruta: {item.linkedRouteLabel}</span> : null}
              </div>
            ) : null}
          </div>
        </div>

        {seed.notes ? <p className="text-sm text-[var(--lv-text-muted)]">{seed.notes}</p> : null}

        <p className="text-sm text-[var(--lv-text-muted)]">{helperText}</p>

        <div className="flex flex-wrap items-center gap-2">
          <ChatShareButton
            onClick={onShareToChat}
            busy={sharing}
            recipientLabel={shareRecipientLabel}
            label="Compartir en chat"
            busyLabel="Compartiendo..."
          />
          {showDateControls ? (
            <>
              <input
                type="date"
                className="lv-input w-[190px] min-w-[170px]"
                value={scheduleValue}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  onScheduleValueChange(nextValue);
                  if (item.stage === "scheduled" && nextValue) {
                    onSaveDate(nextValue);
                  }
                }}
              />
              {shouldShowProgramButton ? (
                <button type="button" className="lv-btn lv-btn-primary" onClick={() => onSaveDate()}>
                  Programar
                </button>
              ) : null}
            </>
          ) : null}

          {item.canWaterNow ? (
            <button type="button" className="lv-btn lv-btn-primary" onClick={onWater}>
              {item.otherParticipantHasWatered && !item.currentUserHasWatered
                ? "Regar y empezar flor"
                : "Regar"}
            </button>
          ) : null}

          {seed.scheduled_date ? (
            <button type="button" className="lv-btn lv-btn-secondary" onClick={onUnschedule}>
              Quitar fecha
            </button>
          ) : null}

          <button type="button" className="lv-btn lv-btn-danger" onClick={onDelete} disabled={deleting}>
            {deleting ? "Desplantando..." : "Desplantar"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function PlansAgendaPanel(props: PlansAgendaPanelProps) {
  const {
    visibleSections,
    scheduleDrafts,
    deletingSeedId,
    sharingSeedId,
    highlightedSeedId,
    shareRecipientLabel,
    companionReferenceLabel,
    emptyMessage,
    focusNote,
    onScheduleDraftChange,
    onSaveDate,
    onUnscheduleSeed,
    onWaterSeed,
    onDeleteSeed,
    onShareSeedToChat,
  } = props;

  const sectionsWithItems = visibleSections.filter((section) => section.items.length > 0);

  if (!sectionsWithItems.length) {
    return (
      <div
        data-plans-tour="agenda-panel"
        className="rounded-[24px] border border-dashed border-[var(--lv-border)] bg-white/80 p-4 text-sm text-[var(--lv-text-muted)]"
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div data-plans-tour="agenda-panel" className="space-y-4">
      {focusNote ? (
        <div className="rounded-[20px] border border-[var(--lv-border)] bg-white/80 px-4 py-3 text-sm text-[var(--lv-text-muted)]">
          {focusNote}
        </div>
      ) : null}

      {sectionsWithItems.map((section) => (
        <div
          key={section.key}
          data-testid="plans-agenda-section"
          data-section-key={section.key}
          className="space-y-3 rounded-[24px] border border-[var(--lv-border)] bg-white/85 p-4"
        >
          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--lv-text-muted)]">
                {section.title}
              </h3>
              <span className="lv-badge bg-white">{section.items.length}</span>
            </div>
            <p className="text-sm text-[var(--lv-text-muted)]">{section.hint}</p>
          </div>

          <div className="space-y-3">
            {section.items.map((item) => (
              <AgendaCard
                key={item.seed.id}
                item={item}
                scheduleValue={scheduleDrafts[item.seed.id] ?? item.seed.scheduled_date ?? ""}
                deleting={deletingSeedId === item.seed.id}
                sharing={sharingSeedId === item.seed.id}
                highlighted={highlightedSeedId === item.seed.id}
                shareRecipientLabel={shareRecipientLabel}
                companionReferenceLabel={companionReferenceLabel}
                onScheduleValueChange={(value) => onScheduleDraftChange(item.seed.id, value)}
                onSaveDate={(nextDate) => onSaveDate(item, nextDate)}
                onUnschedule={() => onUnscheduleSeed(item)}
                onWater={() => onWaterSeed(item)}
                onDelete={() => onDeleteSeed(item)}
                onShareToChat={() => onShareSeedToChat(item)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
