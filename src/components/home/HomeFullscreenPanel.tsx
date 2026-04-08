"use client";

import type { ReactNode } from "react";

export default function HomeFullscreenPanel({
  title,
  subtitle,
  detail,
  infoActionLabel,
  onInfoClick,
  onClose,
  children,
  variant = "panel",
  showInfoCard = true,
  showCloseButton = true,
}: {
  title: string;
  subtitle?: string;
  detail?: string;
  infoActionLabel?: string;
  onInfoClick?: () => void;
  onClose: () => void;
  children: ReactNode;
  variant?: "panel" | "immersive";
  showInfoCard?: boolean;
  showCloseButton?: boolean;
}) {
  if (variant === "immersive") {
    const infoCard = !showInfoCard ? null : onInfoClick ? (
      <button
        type="button"
        className="pointer-events-auto max-w-[min(72vw,360px)] border px-4 py-3 text-left backdrop-blur-md transition hover:-translate-y-[1px]"
        style={{
          borderRadius: "var(--lv-radius-lg)",
          borderColor: "var(--lv-map-chrome-border)",
          background: "var(--lv-map-chrome-bg)",
          boxShadow: "var(--lv-map-chrome-shadow)",
        }}
        onClick={onInfoClick}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--lv-map-chrome-text)] sm:text-xs">
              {title}
            </div>
            {subtitle ? (
              <div className="mt-1 text-[11px] text-[var(--lv-map-chrome-text)] sm:text-sm">
                {subtitle}
              </div>
            ) : null}
            {detail ? (
              <div className="mt-1 text-[10px] uppercase tracking-[0.08em] text-[var(--lv-text-muted)] sm:text-[11px]">
                {detail}
              </div>
            ) : null}
          </div>
          <span
            className="shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium normal-case tracking-normal"
            style={{
              borderColor: "var(--lv-map-chrome-border)",
              background: "var(--lv-surface)",
              color: "var(--lv-map-chrome-text)",
            }}
          >
            {infoActionLabel ?? "Abrir"}
          </span>
        </div>
      </button>
    ) : (
      <div
        className="pointer-events-none max-w-[min(72vw,360px)] border px-4 py-3 backdrop-blur-md"
        style={{
          borderRadius: "var(--lv-radius-lg)",
          borderColor: "var(--lv-map-chrome-border)",
          background: "var(--lv-map-chrome-bg)",
          boxShadow: "var(--lv-map-chrome-shadow)",
        }}
      >
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--lv-map-chrome-text)] sm:text-xs">
          {title}
        </div>
        {subtitle ? (
          <div className="mt-1 text-[11px] text-[var(--lv-map-chrome-text)] sm:text-sm">
            {subtitle}
          </div>
        ) : null}
        {detail ? (
          <div className="mt-1 text-[10px] uppercase tracking-[0.08em] text-[var(--lv-text-muted)] sm:text-[11px]">
            {detail}
          </div>
        ) : null}
      </div>
    );

    return (
      <div className="fixed inset-0 z-[1100] bg-[var(--lv-bg)]">
        <div className="absolute inset-0">{children}</div>
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-[1400] flex items-start justify-between p-3 sm:p-4"
          style={{
            paddingTop: "max(0.75rem, env(safe-area-inset-top))",
          }}
        >
          {showCloseButton ? (
            <button
              type="button"
              className="pointer-events-auto rounded-full border px-4 py-2 text-sm font-medium backdrop-blur-md transition hover:-translate-y-[1px]"
              style={{
                borderColor: "var(--lv-map-chrome-border)",
                background: "var(--lv-map-chrome-bg)",
                color: "var(--lv-map-chrome-text)",
                boxShadow: "var(--lv-map-chrome-shadow)",
              }}
              onClick={onClose}
            >
              Volver
            </button>
          ) : (
            <div />
          )}
          {infoCard}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[var(--lv-bg)]">
      <div className="mx-auto flex min-h-dvh max-w-none flex-col">
        <div
          className="sticky top-0 z-20 flex items-start justify-between gap-3 border-b px-4 py-4 backdrop-blur-md sm:px-5"
          style={{
            paddingTop: "max(1rem, env(safe-area-inset-top))",
            borderColor: "var(--lv-border)",
            background: "color-mix(in srgb, var(--lv-surface) 95%, transparent)",
          }}
        >
          <div className="min-w-0">
            <div className="text-lg font-semibold">{title}</div>
            {subtitle ? (
              <div className="mt-1 text-sm text-[var(--lv-text-muted)]">{subtitle}</div>
            ) : null}
          </div>
          <button
            type="button"
            className="lv-btn lv-btn-secondary shrink-0"
            onClick={onClose}
          >
            Volver
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
          {children}
        </div>
      </div>
    </div>
  );
}
