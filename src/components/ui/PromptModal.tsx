"use client";

import { useEffect, useId, useRef } from "react";

type PromptModalProps = {
  open: boolean;
  title: string;
  description?: string;
  placeholder?: string;
  value: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onValueChange: (next: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export function PromptModal({
  open,
  title,
  description,
  placeholder,
  value,
  confirmLabel = "Guardar",
  cancelLabel = "Cancelar",
  busy = false,
  onValueChange,
  onConfirm,
  onCancel,
}: PromptModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const headingId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="lv-modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        className="lv-modal max-w-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <h2 id={headingId} className="text-lg font-semibold">
          {title}
        </h2>
        {description ? (
          <p id={descriptionId} className="mt-2 text-sm text-[var(--lv-text-muted)]">
            {description}
          </p>
        ) : null}

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onConfirm();
            }
          }}
          placeholder={placeholder}
          className="lv-input mt-4"
        />

        <div className="lv-modal-actions">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="lv-btn lv-btn-secondary disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="lv-btn lv-btn-primary disabled:opacity-50"
          >
            {busy ? "Guardando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
