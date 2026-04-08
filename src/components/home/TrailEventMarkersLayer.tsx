import type { MutableRefObject } from "react";
import InlineTrailEventSprite, {
  type TrailEventKind,
  type TrailRuleTier,
} from "@/components/home/InlineTrailEventSprite";
import type { ProgressionTreeImportance } from "@/lib/progressionGraph";
import type {
  ProgressionTreeRank,
  ProgressionTreeRarity,
} from "@/lib/progressionTreeVisuals";

type MarkerEventBase = {
  id: string;
  date: string;
  title: string;
  kind: TrailEventKind;
  iconSrc?: string | null;
  element?: string | null;
  rating?: number | null;
  isFavorite?: boolean;
  tier?: TrailRuleTier | null;
  importance?: ProgressionTreeImportance | null;
  rank?: ProgressionTreeRank | null;
  rarity?: ProgressionTreeRarity | null;
  leafVariant?: number | null;
  accentColor?: string | null;
  claimedAt?: string | null;
  ruleId?: string | null;
};

type MarkerDayLayout<TEvent extends MarkerEventBase> = {
  iso: string;
  anchor: { x: number; y: number };
  frame: { width: number; height: number };
  size: number;
  primaryEvent: TEvent;
};

export default function TrailEventMarkersLayer<TEvent extends MarkerEventBase>({
  days,
  todayEventId,
  plantingEventIds,
  focusEventId,
  canvasWidth,
  canvasHeight,
  suppressClickUntilRef,
  onEventClick,
  compact = false,
  markerScale = 1,
}: {
  days: MarkerDayLayout<TEvent>[];
  todayEventId?: string | null;
  plantingEventIds: Record<string, number>;
  focusEventId?: string | null;
  canvasWidth: number;
  canvasHeight: number;
  suppressClickUntilRef: MutableRefObject<number>;
  onEventClick: (event: TEvent) => void;
  compact?: boolean;
  markerScale?: number;
}) {
  return (
    <>
      {days.map((day) => {
        const event = day.primaryEvent;
        const anchor = day.anchor;
        const size = day.size;
        const frame = day.frame;
        const isMilestoneTree = event.kind === "tree" && Boolean(event.ruleId);
        const isClaimedTree = isMilestoneTree && Boolean(event.claimedAt);
        const isTodayEvent = event.id === todayEventId;
        const isPlanting = Boolean(plantingEventIds[event.id]);
        const isFavoriteFlower = Boolean(event.isFavorite);
        const isFocusedEvent = event.id === focusEventId;
        const focusBoost = isTodayEvent || isFocusedEvent ? 1.06 : 1;
        const renderScale = markerScale;
        const assetSrc = String(event.iconSrc ?? "").trim();
        // Floral assets often include generous transparent padding, so the hill marker
        // needs extra overscan to preserve the same silhouette seen in the page detail.
        const assetOverscan =
          assetSrc && event.kind === "flower"
            ? 1.7
            : assetSrc && event.kind === "sprout"
              ? 1.18
              : 1;
        const assetSize =
          Math.round(
            (size +
              (event.kind === "flower"
                ? 14
                : event.kind === "sprout"
                  ? 8
                  : event.kind === "seed"
                    ? 4
                    : 10)) *
              renderScale *
              assetOverscan,
          );

        return (
          <button
            key={event.id}
            type="button"
            data-event-button="1"
            className="absolute z-30 transition"
            style={{
              left: `${(anchor.x / canvasWidth) * 100}%`,
              top: `${(anchor.y / canvasHeight) * 100}%`,
              width: `${Math.round(frame.width * renderScale)}px`,
              height: `${Math.round(frame.height * renderScale)}px`,
              zIndex: 30 + Math.round(anchor.y / 44),
              transform: `translate(-50%, -50%) scale(${focusBoost})`,
              boxShadow: isTodayEvent
                ? "0 0 20px rgba(255, 215, 0, 0.6), 0 2px 6px rgba(0,0,0,.22)"
                : undefined,
              animation: isTodayEvent
                ? "lvTodayPulse 2.2s ease-in-out infinite"
                : isPlanting
                  ? "lvPlantIn 0.82s ease-out"
                  : undefined,
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
            title={event.title}
          >
            {isMilestoneTree ? (
              <>
                <span className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-5 -translate-x-1/2 translate-y-[9px] rounded-full bg-black/10 blur-[5px]" />
                {isFocusedEvent && (
                  <span className="pointer-events-none absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f4e7a0]/24 blur-[8px]" />
                )}
                <span className="relative flex h-full w-full items-center justify-center">
                  <InlineTrailEventSprite
                    kind="tree"
                    tier={event.tier ?? null}
                    importance={event.importance ?? null}
                    rank={event.rank ?? null}
                    rarity={event.rarity ?? null}
                    leafVariant={event.leafVariant ?? null}
                    accentColor={event.accentColor ?? null}
                    claimed={isClaimedTree}
                    size={Math.round((size + 8) * renderScale)}
                  />
                </span>
              </>
            ) : (
              <>
                <span className="pointer-events-none absolute left-1/2 top-1/2 h-2.5 w-4 -translate-x-1/2 translate-y-[7px] rounded-full bg-black/10 blur-[4px]" />
                {isFavoriteFlower && (
                  <span className="pointer-events-none absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f0d47a]/20 blur-[8px]" />
                )}
                {isFocusedEvent && (
                  <span className="pointer-events-none absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/55 bg-white/18 blur-[1px]" />
                )}
                <span className="relative flex h-full w-full items-center justify-center">
                  {assetSrc ? (
                    <img
                      src={assetSrc}
                      alt=""
                      className="object-contain drop-shadow-[0_6px_12px_rgba(82,61,31,0.18)]"
                      style={{ width: `${assetSize}px`, height: `${assetSize}px` }}
                    />
                  ) : (
                    <InlineTrailEventSprite
                      kind={event.kind}
                      element={event.element ?? null}
                      rating={event.rating ?? null}
                      isFavorite={event.isFavorite ?? false}
                      size={Math.round((
                        size +
                        (event.kind === "flower"
                          ? 12
                          : event.kind === "sprout"
                            ? 5
                            : 1)
                      ) * renderScale)}
                    />
                  )}
                </span>
              </>
            )}
          </button>
        );
      })}
    </>
  );
}
