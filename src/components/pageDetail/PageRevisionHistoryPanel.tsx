"use client";

import { useState } from "react";
import { StatusNotice } from "@/components/ui/StatusNotice";
import {
  type FlowerPageRevisionChangeField,
  type FlowerPageRevisionRow,
  type FlowerPageRevisionSummary,
  hasFlowerPageRevisionChanges,
} from "@/lib/flowerPageRevision";

type PageRevisionHistoryPanelProps = {
  revisions: FlowerPageRevisionRow[];
  revisionsAvailable: boolean;
  currentUserId: string | null;
  draftSummary?: FlowerPageRevisionSummary | null;
  className?: string;
  compact?: boolean;
  initialVisibleRevisions?: number;
};

function formatRevisionTimestamp(timestamp: string) {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return "Hace un momento";
  return parsed.toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fieldLabel(field: FlowerPageRevisionChangeField) {
  if (field === "summary") return "texto";
  if (field === "plan_type") return "tipo de plan";
  if (field === "favorite") return "favorita";
  if (field === "highlight") return "destacado";
  if (field === "rating") return "estrellas";
  if (field === "canvas") return "lienzo";
  if (field === "location") return "lugar";
  if (field === "audio") return "audio";
  if (field === "cover") return "portada";
  return "miradas";
}

function describeRevision(revision: FlowerPageRevisionRow, currentUserId: string | null) {
  const actor =
    revision.actor_user_id && currentUserId && revision.actor_user_id === currentUserId
      ? "Tu lado"
      : revision.actor_name?.trim() || "El otro lado";
  const pieces = revision.summary.changedFields.map(fieldLabel);
  if (!pieces.length) return `${actor} guardo la flor.`;
  return `${actor} retoco ${pieces.join(", ")}.`;
}

export function PageRevisionHistoryPanel(props: PageRevisionHistoryPanelProps) {
  const {
    revisions,
    revisionsAvailable,
    currentUserId,
    draftSummary = null,
    className = "",
    compact = false,
    initialVisibleRevisions = 3,
  } = props;
  const hasDraftChanges = Boolean(draftSummary && hasFlowerPageRevisionChanges(draftSummary));
  const [expanded, setExpanded] = useState(false);
  const collapsedVisibleCount = compact
    ? initialVisibleRevisions
    : Math.max(initialVisibleRevisions, 5);
  const visibleRevisions = !expanded
    ? revisions.slice(0, collapsedVisibleCount)
    : revisions;
  const hiddenRevisionCount = Math.max(revisions.length - visibleRevisions.length, 0);

  return (
    <section className={`lv-card space-y-4 p-5 ${className}`.trim()}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
            Actividad reciente
          </div>
          <h2 className={`${compact ? "mt-1 text-lg" : "mt-1 text-xl"} font-semibold text-[var(--lv-text)]`}>
            Huellas de la flor
          </h2>
          {compact ? (
            <p className="mt-1 max-w-sm text-sm text-[var(--lv-text-muted)]">
              Quien tocó la flor y qué cambió.
            </p>
          ) : (
            <p className="mt-1 max-w-2xl text-sm text-[var(--lv-text-muted)]">
              Aqui queda quien toco la flor, cuando paso y que zonas cambiaron.
            </p>
          )}
        </div>
        <div className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-1 text-xs text-[var(--lv-text-muted)]">
          {!revisionsAvailable ? "Sin tabla de revisiones" : `${revisions.length} revision(es)`}
        </div>
      </div>

      {hasDraftChanges && draftSummary ? (
        <article className="rounded-[22px] border border-[var(--lv-primary)] bg-[var(--lv-primary-soft)]/40 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-[var(--lv-text)]">
                Cambios en curso
              </div>
              <div className="mt-1 text-xs text-[var(--lv-text-muted)]">
                La flor ya ha cambiado respecto a la ultima huella guardada.
              </div>
            </div>
            <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-[var(--lv-primary-strong)]">
              Aun sin guardar
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {draftSummary.changedFields.map((field) => (
              <span
                key={`draft:${field}`}
                className="rounded-full bg-[var(--lv-surface)] px-3 py-1 text-xs font-medium text-[var(--lv-text)]"
              >
                {fieldLabel(field)}
              </span>
            ))}
            {draftSummary.canvasAddedCount > 0 ? (
              <span className="rounded-full bg-[var(--lv-surface-soft)] px-3 py-1 text-xs text-[var(--lv-text-muted)]">
                +{draftSummary.canvasAddedCount} pieza(s) en lienzo
              </span>
            ) : null}
            {draftSummary.canvasRemovedCount > 0 ? (
              <span className="rounded-full bg-[var(--lv-surface-soft)] px-3 py-1 text-xs text-[var(--lv-text-muted)]">
                -{draftSummary.canvasRemovedCount} pieza(s) en lienzo
              </span>
            ) : null}
          </div>
        </article>
      ) : null}

      {!revisionsAvailable ? (
        <StatusNotice
          tone="warning"
          message="La actividad reciente necesita la migracion 2026-03-25_flower_page_revisions.sql."
        />
      ) : revisions.length ? (
        <div className="space-y-3">
          {visibleRevisions.map((revision) => (
            <article
              key={revision.id}
              className="rounded-[22px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-[var(--lv-text)]">
                    {describeRevision(revision, currentUserId)}
                  </div>
                  <div className="mt-1 text-xs text-[var(--lv-text-muted)]">
                    {formatRevisionTimestamp(revision.created_at)}
                  </div>
                </div>
              </div>

              {revision.summary.changedFields.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {revision.summary.changedFields.map((field) => (
                    <span
                      key={`${revision.id}:${field}`}
                      className="rounded-full bg-[var(--lv-bg-soft)] px-3 py-1 text-xs font-medium text-[var(--lv-text)]"
                    >
                      {fieldLabel(field)}
                    </span>
                  ))}
                  {revision.summary.canvasAddedCount > 0 ? (
                    <span className="rounded-full bg-[var(--lv-surface-soft)] px-3 py-1 text-xs text-[var(--lv-text-muted)]">
                      +{revision.summary.canvasAddedCount} pieza(s) en lienzo
                    </span>
                  ) : null}
                  {revision.summary.canvasRemovedCount > 0 ? (
                    <span className="rounded-full bg-[var(--lv-surface-soft)] px-3 py-1 text-xs text-[var(--lv-text-muted)]">
                      -{revision.summary.canvasRemovedCount} pieza(s) en lienzo
                    </span>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
          {hiddenRevisionCount > 0 ? (
            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              className={`rounded-[18px] border border-[var(--lv-border)] bg-white/70 px-4 py-3 text-sm font-medium text-[var(--lv-text)] transition hover:bg-white ${
                compact ? "w-full" : "w-full sm:w-auto"
              }`}
            >
              {expanded ? "Ver menos" : `Ver mas (${hiddenRevisionCount})`}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="rounded-[22px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-4 text-sm text-[var(--lv-text-muted)]">
          Todavia no hay revisiones guardadas en esta flor.
        </div>
      )}
    </section>
  );
}
