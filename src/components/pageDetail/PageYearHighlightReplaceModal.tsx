"use client";

import { useEffect, useId } from "react";

type YearHighlightPagePreview = {
  id: string;
  title: string | null;
  date: string;
  coverPhotoUrl: string | null;
  thumbnailUrl: string | null;
};

type PageYearHighlightReplaceModalProps = {
  open: boolean;
  year: number | null;
  currentPageTitle: string;
  currentPageDate: string;
  highlights: YearHighlightPagePreview[];
  busy?: boolean;
  onReplace: (pageId: string) => void;
  onCancel: () => void;
};

function previewImage(item: YearHighlightPagePreview) {
  return item.coverPhotoUrl || item.thumbnailUrl || null;
}

function shortDate(value: string) {
  return String(value ?? "").slice(0, 10);
}

export function PageYearHighlightReplaceModal({
  open,
  year,
  currentPageTitle,
  currentPageDate,
  highlights,
  busy = false,
  onReplace,
  onCancel,
}: PageYearHighlightReplaceModalProps) {
  const headingId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const currentYearLabel = year != null ? String(year) : "este año";

  return (
    <div
      className="lv-modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        className="lv-modal max-w-4xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={descriptionId}
      >
        <h2 id={headingId} className="text-lg font-semibold text-[var(--lv-text)]">
          Solo puedes tener 3 destacados
        </h2>
        <p id={descriptionId} className="mt-2 text-sm text-[var(--lv-text-muted)]">
          Ya tienes 3 paginas destacadas para {currentYearLabel}. Elige cual quieres sustituir por
          esta flor.
        </p>

        <div className="lv-card-soft mt-4 p-4">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
            Nueva candidata
          </div>
          <div className="mt-2 text-base font-semibold text-[var(--lv-text)] lv-text-safe">
            {currentPageTitle}
          </div>
          <div className="mt-1 text-sm text-[var(--lv-text-muted)]">
            {shortDate(currentPageDate) || "Sin fecha"}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {highlights.map((item) => {
            const image = previewImage(item);
            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface)]"
              >
                {image ? (
                  <img
                    src={image}
                    alt=""
                    className="h-32 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-32 items-center justify-center bg-[var(--lv-surface-soft)] text-xs uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
                    Sin portada
                  </div>
                )}
                <div className="p-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
                    {shortDate(item.date) || "Sin fecha"}
                  </div>
                  <div className="mt-2 min-h-[3rem] text-sm font-semibold text-[var(--lv-text)] lv-text-safe">
                    {item.title || "Página sin título"}
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onReplace(item.id)}
                    className="lv-btn lv-btn-secondary mt-4 w-full justify-center disabled:opacity-50"
                  >
                    {busy ? "Actualizando..." : "Sustituir este"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <div className="lv-modal-actions">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="lv-btn lv-btn-secondary disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
