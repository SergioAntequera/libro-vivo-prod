import type { MutableRefObject } from "react";
import { getElementLabel } from "@/lib/narrativeTaxonomy";
import {
  eventKindLabel,
  isIsoDate,
  parseIsoLocal,
  starsLabel,
} from "@/lib/homePageUtils";
import InlineTrailEventSprite, {
  getBloomPaletteForElement,
  type TrailEventKind,
  type TrailRuleTier,
} from "@/components/home/InlineTrailEventSprite";

export type HomePathPreviewEvent = {
  id: string;
  date: string;
  title: string;
  kind: TrailEventKind;
  iconSrc: string;
  element?: string | null;
  rating?: number | null;
  isFavorite?: boolean;
  tier?: TrailRuleTier | null;
  claimedAt?: string | null;
};

export type HomeBloomPagePreview = {
  title: string;
  rating: number | null;
  location: string | null;
  snippet: string | null;
};

export type HomePathPreviewCardPos = {
  leftPct: number;
  topPct: number;
  side: "left" | "right";
  vertical: "above" | "below";
};

export default function ActiveTrailPreviewCard<TEvent extends HomePathPreviewEvent>({
  event,
  preview,
  cardPos,
  viewportZoom,
  focusMonthLabel,
  focusDayProgress,
  focusIndex,
  pathDaysCount,
  suppressClickUntilRef,
  onEventClick,
}: {
  event: TEvent;
  preview: HomeBloomPagePreview | null;
  cardPos: HomePathPreviewCardPos;
  viewportZoom: number;
  focusMonthLabel: string;
  focusDayProgress: number;
  focusIndex: number;
  pathDaysCount: number;
  suppressClickUntilRef: MutableRefObject<number>;
  onEventClick: (event: TEvent) => void;
}) {
  const palette = getBloomPaletteForElement(event.element ?? null);
  const viewportSafeZoom = Math.max(1, viewportZoom);
  const targetScreenScale =
    viewportSafeZoom <= 1
      ? 1
      : Math.max(0.82, 1 - (viewportSafeZoom - 1) * 0.14);
  const localScale = targetScreenScale / viewportSafeZoom;

  return (
    <div
      className="absolute z-[62]"
      style={{
        left: `${cardPos.leftPct}%`,
        top: `${cardPos.topPct}%`,
        width: "min(272px, calc(100% - 28px))",
        transform: `scale(${localScale})`,
        transformOrigin:
          cardPos.side === "left"
            ? cardPos.vertical === "above"
              ? "right bottom"
              : "right top"
            : cardPos.vertical === "above"
              ? "left bottom"
              : "left top",
      }}
    >
      <div
        className="pointer-events-none absolute h-5 w-5 rounded-full blur-[6px]"
        style={{
          background:
            event.kind === "tree" ? "rgba(234, 213, 135, 0.38)" : palette.glow,
          left: cardPos.side === "left" ? "auto" : "-5px",
          right: cardPos.side === "left" ? "-5px" : "auto",
          top: cardPos.vertical === "above" ? "auto" : "16px",
          bottom: cardPos.vertical === "above" ? "16px" : "auto",
        }}
      />
      <button
        type="button"
        data-event-button="1"
        className="relative w-full rounded-[22px] border px-3 py-3 text-left backdrop-blur-md transition hover:shadow-[0_22px_48px_rgba(60,84,45,0.18)]"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(248,251,244,0.92) 100%)",
          borderColor:
            event.kind === "tree"
              ? "rgba(214, 185, 106, 0.52)"
              : `${palette.petalShade}88`,
          boxShadow:
            event.kind === "tree"
              ? "0 18px 42px rgba(123, 106, 52, 0.18)"
              : `0 18px 42px ${palette.glow}`,
        }}
        onClick={() => {
          if (Date.now() < suppressClickUntilRef.current) return;
          onEventClick(event);
        }}
        onPointerDown={(e) => {
          suppressClickUntilRef.current = 0;
          e.stopPropagation();
        }}
        onPointerUp={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="grid grid-cols-[74px_1fr] gap-3">
          <div className="h-[92px] self-start overflow-hidden rounded-[16px] border bg-[var(--lv-surface)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--lv-surface)_82%,white)]">
            {event.iconSrc ? (
              <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_34%,rgba(245,250,224,0.94),rgba(231,241,211,0.88))]">
                <img
                  src={event.iconSrc}
                  alt=""
                  className="h-[58px] w-[58px] object-contain"
                />
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_34%,rgba(245,250,224,0.94),rgba(231,241,211,0.88))]">
                <InlineTrailEventSprite
                  kind={event.kind}
                  element={event.element ?? null}
                  rating={event.rating ?? null}
                  isFavorite={event.isFavorite ?? false}
                  claimed={Boolean(event.claimedAt)}
                  tier={event.tier ?? null}
                  size={event.kind === "flower" ? 58 : 50}
                />
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="rounded-full border bg-[var(--lv-surface)] px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.15em] text-[var(--lv-text-muted)]">
                {eventKindLabel(event.kind)}
              </div>
              <div className="rounded-full border bg-[var(--lv-surface)] px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-[var(--lv-text-muted)]">
                {focusMonthLabel}
              </div>
              {event.kind !== "tree" && event.element ? (
                <div className="rounded-full border bg-[var(--lv-surface)] px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-[var(--lv-text-muted)]">
                  {getElementLabel(event.element ?? null)}
                </div>
              ) : null}
            </div>

            <div className="truncate text-[13px] font-semibold">
              {event.title || "Sin título"}
            </div>

            <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] opacity-72">
              <span>
                {isIsoDate(event.date)
                  ? parseIsoLocal(event.date).toLocaleDateString("es-ES")
                  : event.date}
              </span>
              {event.kind === "flower" ? <span>{starsLabel(event.rating ?? null)}</span> : null}
              {event.isFavorite ? <span>Favorita</span> : null}
            </div>

            {preview ? (
              <>
                <div className="max-h-[42px] overflow-hidden text-[11px] leading-[1.08rem] opacity-84">
                  {preview.snippet ?? "Sin texto aún en esta página."}
                </div>
                {preview.location ? (
                  <div className="truncate text-[10px] uppercase tracking-[0.1em] text-[var(--lv-text-muted)]">
                    {preview.location}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="max-h-[42px] overflow-hidden text-[11px] leading-[1.08rem] opacity-78">
                {event.kind === "tree"
                  ? "Este hito marca un logro del camino."
                  : event.kind === "seed"
                    ? "Plan sembrado en el sendero."
                    : "Plan con fecha, listo para florecer."}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-0.5">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--lv-progress-track)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(4, focusDayProgress * 100)}%`,
                    background: "linear-gradient(90deg, var(--lv-primary), var(--lv-progress-fill))",
                  }}
                />
              </div>
              <div className="rounded-full border bg-[var(--lv-surface)] px-2 py-0.5 text-[10px] text-[var(--lv-text-muted)] shadow-[var(--lv-shadow-sm)]">
                {focusIndex + 1}/{pathDaysCount}
              </div>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}
