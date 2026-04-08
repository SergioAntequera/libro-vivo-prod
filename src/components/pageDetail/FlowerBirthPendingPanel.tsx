"use client";

import type { SharedGardenParticipantPresence } from "@/lib/sharedGardenSessions";

type FlowerBirthPendingPanelProps = {
  connected: boolean;
  companionReference: string;
  myProfileId: string | null;
  onExit: () => void;
  participants: SharedGardenParticipantPresence[];
  requiredParticipants: number;
};

export function FlowerBirthPendingPanel({
  connected,
  companionReference,
  myProfileId,
  onExit,
  participants,
  requiredParticipants,
}: FlowerBirthPendingPanelProps) {
  const presentCount = participants.length;
  const requiredCount = Math.max(1, requiredParticipants);
  const waitingCount = Math.max(requiredCount - presentCount, 0);

  return (
    <section className="rounded-[28px] border border-[color-mix(in_srgb,var(--lv-primary)_22%,white)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--lv-primary-soft)_70%,white),color-mix(in_srgb,var(--lv-surface)_96%,white))] p-5 shadow-[var(--lv-shadow-md)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl flex-1">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-primary-strong)]">
            Nacimiento pendiente
          </div>
          <h2 className="mt-2 text-xl font-semibold text-[var(--lv-text)]">
            La flor ya puede nacer.
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--lv-text-muted)]">
            El riego compartido ya se ha completado. Esta es la antesala del nacimiento: cuando
            entreis las dos personas, la flor se abrira en directo para empezar a crearla.
          </p>
        </div>

        <button
          type="button"
          onClick={onExit}
          className="rounded-full border border-[var(--lv-border)] bg-white/88 px-4 py-2 text-sm font-medium text-[var(--lv-text)] transition hover:bg-white"
        >
          Volver luego
        </button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]">
        <div className="rounded-[22px] border border-[var(--lv-border)] bg-white/82 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
            Estado compartido
          </div>
          <div className="mt-2 text-sm font-medium text-[var(--lv-text)]">
            {connected ? "Antesala en directo" : "Conectando antesala..."}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-[var(--lv-surface)] px-3 py-1 text-xs font-medium text-[var(--lv-text)]">
              Dentro ahora: {presentCount}/{requiredCount}
            </span>
            {waitingCount > 0 ? (
              <span className="rounded-full bg-[var(--lv-warning-soft)] px-3 py-1 text-xs font-medium text-[var(--lv-warning)]">
                Falta {waitingCount === 1 ? companionReference : `${waitingCount} personas`}
              </span>
            ) : null}
          </div>
          <div className="mt-3 text-sm text-[var(--lv-text-muted)]">
            {waitingCount > 0
              ? `Tu presencia ya cuenta. Esperando a ${companionReference} para empezar el nacimiento compartido.`
              : "Ya estais dentro las dos personas. La flor se esta preparando para abrirse."}
          </div>
        </div>

        <div className="rounded-[22px] border border-[var(--lv-border)] bg-white/82 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
            Quien esta dentro
          </div>
          <div className="mt-3 space-y-3">
            {participants.length ? (
              participants.map((participant) => (
                <div
                  key={`flower-birth-pending:${participant.userId}`}
                  className="rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-[var(--lv-text)]">
                        {participant.name}
                        {participant.userId === myProfileId ? " (tu)" : ""}
                      </div>
                      <div className="mt-1 text-xs text-[var(--lv-text-muted)]">
                        {participant.focusLabel ??
                          participant.activityLabel ??
                          "Esperando en la antesala"}
                      </div>
                    </div>
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--lv-primary)]" />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-3 text-sm text-[var(--lv-text-muted)]">
                Tu entrada se reflejara aqui en cuanto la presencia se sincronice.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
