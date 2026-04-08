"use client";

import type { SharedGardenParticipantPresence } from "@/lib/sharedGardenSessions";

type RemoteSaveNotice = {
  actorName: string;
  savedAt: string;
};

type SeedPreparationCollaborationPanelProps = {
  connected: boolean;
  myProfileId: string | null;
  participants: SharedGardenParticipantPresence[];
  remoteSaveNotice?: RemoteSaveNotice | null;
  reloading?: boolean;
  onReloadRemoteChanges?: (() => void) | null;
};

function formatSavedAtLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "hace un momento";
  return parsed.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SeedPreparationCollaborationPanel({
  connected,
  myProfileId,
  participants,
  remoteSaveNotice = null,
  reloading = false,
  onReloadRemoteChanges = null,
}: SeedPreparationCollaborationPanelProps) {
  const presentCount = participants.length;
  const otherParticipants = participants.filter(
    (participant) => participant.userId !== String(myProfileId ?? "").trim(),
  );

  return (
    <section className="rounded-[24px] border border-[color-mix(in_srgb,var(--lv-primary)_20%,white)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--lv-primary-soft)_58%,white),color-mix(in_srgb,var(--lv-surface)_96%,white))] p-4 shadow-[var(--lv-shadow-sm)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-primary-strong)]">
            Preparacion compartida
          </div>
          <div className="text-sm font-medium text-[var(--lv-text)]">
            {connected ? "Edicion en directo activada" : "Conectando edicion compartida..."}
          </div>
          <div className="text-sm text-[var(--lv-text-muted)]">
            {otherParticipants.length
              ? "Ya veis quien esta dentro del dossier y cuando la otra persona guarda cambios."
              : "Tu presencia ya cuenta. Cuando entre la otra persona aparecera aqui sin salir del dossier."}
          </div>
        </div>

        <span className="rounded-full border border-[var(--lv-border)] bg-white/88 px-3 py-1 text-xs font-medium text-[var(--lv-text)]">
          Dentro ahora: {presentCount}
        </span>
      </div>

      {remoteSaveNotice ? (
        <div className="mt-4 rounded-[18px] border border-[var(--lv-border)] bg-white/88 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-[var(--lv-text)]">
                {remoteSaveNotice.actorName} ha guardado cambios a las {formatSavedAtLabel(remoteSaveNotice.savedAt)}.
              </div>
              <div className="mt-1 text-xs text-[var(--lv-text-muted)]">
                Recarga este dossier cuando quieras para traer la version mas reciente sin perder el contexto.
              </div>
            </div>
            {onReloadRemoteChanges ? (
              <button
                type="button"
                className="lv-btn lv-btn-secondary"
                onClick={onReloadRemoteChanges}
                disabled={reloading}
              >
                {reloading ? "Recargando..." : "Recargar cambios"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {participants.length ? (
          participants.map((participant) => (
            <div
              key={`seed-preparation-participant:${participant.userId}`}
              className="rounded-[18px] border border-[var(--lv-border)] bg-white/82 px-3 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-[var(--lv-text)]">
                    {participant.name}
                    {participant.userId === myProfileId ? " (tu)" : ""}
                  </div>
                  <div className="mt-1 text-xs text-[var(--lv-text-muted)]">
                    {participant.focusLabel ?? participant.activityLabel ?? "Dentro del dossier"}
                  </div>
                </div>
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--lv-primary)]" />
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[18px] border border-[var(--lv-border)] bg-white/82 px-3 py-3 text-sm text-[var(--lv-text-muted)]">
            La presencia compartida aparecera aqui en cuanto se sincronice el canal.
          </div>
        )}
      </div>
    </section>
  );
}
