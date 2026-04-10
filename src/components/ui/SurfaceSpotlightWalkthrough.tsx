"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type SurfaceSpotlightWalkthroughStep = {
  targetId: string;
  title: string;
  description: string;
};

type HighlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type SurfaceSpotlightWalkthroughProps = {
  open: boolean;
  steps: SurfaceSpotlightWalkthroughStep[];
  targetAttribute: string;
  dialogLabel: string;
  testId: string;
  eyebrow?: string;
  onDismiss: () => void;
  onComplete: () => void;
};

const PANEL_WIDTH = 320;
const PANEL_HEIGHT = 210;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function SurfaceSpotlightWalkthrough({
  open,
  steps,
  targetAttribute,
  dialogLabel,
  testId,
  eyebrow = "Primer paseo",
  onDismiss,
  onComplete,
}: SurfaceSpotlightWalkthroughProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const handleDismiss = useCallback(() => {
    setActiveIndex(0);
    onDismiss();
  }, [onDismiss]);
  const handleComplete = useCallback(() => {
    setActiveIndex(0);
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (!open) return;

    function measure() {
      const step = steps[activeIndex];
      const matches = Array.from(
        document.querySelectorAll<HTMLElement>(`[${targetAttribute}="${step?.targetId ?? ""}"]`),
      );
      const target =
        matches.find((candidate) => {
          const rect = candidate.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }) ?? null;

      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });

      if (!target) {
        setHighlightRect(null);
        return;
      }

      const rect = target.getBoundingClientRect();
      setHighlightRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    }

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleDismiss();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, handleDismiss, open, steps, targetAttribute]);

  const activeStep = steps[activeIndex] ?? null;

  const bubblePosition = useMemo(() => {
    if (!highlightRect || viewport.width === 0) {
      return {
        top: 24,
        left: 24,
      };
    }

    const roomBelow = viewport.height - highlightRect.top - highlightRect.height;
    const prefersBelow = roomBelow >= PANEL_HEIGHT + 28;
    const top = prefersBelow
      ? clamp(
          highlightRect.top + highlightRect.height + 16,
          16,
          Math.max(16, viewport.height - PANEL_HEIGHT - 16),
        )
      : clamp(
          highlightRect.top - PANEL_HEIGHT - 16,
          16,
          Math.max(16, viewport.height - PANEL_HEIGHT - 16),
        );
    const left = clamp(highlightRect.left, 16, Math.max(16, viewport.width - PANEL_WIDTH - 16));

    return { top, left };
  }, [highlightRect, viewport.height, viewport.width]);

  if (!open || !activeStep) return null;

  const isLastStep = activeIndex === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[160]">
      <div className="absolute inset-0 bg-[rgba(12,18,14,0.48)] backdrop-blur-[1px]" />

      {highlightRect ? (
        <div
          className="pointer-events-none absolute rounded-[28px] border-2 border-white/90 shadow-[0_0_0_9999px_rgba(12,18,14,0.32)] transition-all duration-200"
          style={{
            top: Math.max(8, highlightRect.top - 8),
            left: Math.max(8, highlightRect.left - 8),
            width: highlightRect.width + 16,
            height: highlightRect.height + 16,
          }}
        />
      ) : null}

      <div
        className="absolute w-[min(320px,calc(100vw-2rem))] rounded-[28px] border border-[rgba(255,255,255,0.22)] bg-white p-5 text-slate-900 shadow-[0_18px_48px_rgba(8,12,10,0.28)]"
        style={{
          top: bubblePosition.top,
          left: bubblePosition.left,
        }}
        role="dialog"
        aria-modal="true"
        aria-label={dialogLabel}
        data-testid={testId}
      >
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--lv-text-muted)]">
          {eyebrow}
        </div>
        <h2 className="mt-2 text-xl font-semibold">{activeStep.title}</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--lv-text-muted)]">
          {activeStep.description}
        </p>

        <div className="mt-4 flex items-center justify-between text-xs text-[var(--lv-text-muted)]">
          <span>
            Paso {activeIndex + 1} de {steps.length}
          </span>
          <button
            type="button"
            className="font-semibold text-[var(--lv-text-muted)]"
            onClick={handleDismiss}
          >
            Saltar
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            className="lv-btn lv-btn-secondary"
            onClick={() => setActiveIndex((current) => Math.max(0, current - 1))}
            disabled={activeIndex === 0}
            data-testid={`${testId}-back`}
          >
            Atras
          </button>
          <button
            type="button"
            className="lv-btn lv-btn-primary"
            onClick={() => {
              if (isLastStep) {
                handleComplete();
                return;
              }
              setActiveIndex((current) => Math.min(steps.length - 1, current + 1));
            }}
            data-testid={`${testId}-next`}
          >
            {isLastStep ? "Terminar" : "Siguiente"}
          </button>
        </div>
      </div>
    </div>
  );
}
