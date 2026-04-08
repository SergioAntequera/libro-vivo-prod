"use client";

import {
  getFallbackFlowerRuntimeConfig,
  resolveFlowerText,
  type FlowerRuntimeConfig,
} from "@/lib/flowerRuntimeConfig";

type PageLocationCardProps = {
  locationFieldsAvailable: boolean;
  locationLabel: string;
  locationLat: string;
  locationLng: string;
  onOpenMapPicker: () => void;
  onClearLocation: () => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  presenceLabel?: string | null;
  conflictNotice?: boolean;
  config?: FlowerRuntimeConfig | null;
};

export function PageLocationCard(props: PageLocationCardProps) {
  const {
    locationFieldsAvailable,
    locationLabel,
    locationLat,
    locationLng,
    onOpenMapPicker,
    onClearLocation,
    onInteractionStart,
    onInteractionEnd,
    presenceLabel,
    conflictNotice = false,
    config,
  } = props;
  const runtimeConfig = config ?? getFallbackFlowerRuntimeConfig();
  const hasLocation = Boolean(locationLat && locationLng);

  return (
    <div
      className={`lv-card-soft space-y-3 p-4 ${conflictNotice ? "ring-1 ring-[var(--lv-warning)]" : ""}`}
      onFocusCapture={onInteractionStart}
      onBlurCapture={onInteractionEnd}
      onMouseDownCapture={onInteractionStart}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
            {resolveFlowerText(runtimeConfig, "location_eyebrow")}
          </div>
          <div className="mt-1 text-sm font-medium text-[var(--lv-text)]">
            {hasLocation
              ? resolveFlowerText(runtimeConfig, "location_title_has")
              : resolveFlowerText(runtimeConfig, "location_title_empty")}
          </div>
        </div>
        {presenceLabel ? (
          <div className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-1 text-xs font-medium text-[var(--lv-primary-strong)]">
            {presenceLabel}
          </div>
        ) : null}
      </div>

      {conflictNotice ? (
        <div className="rounded-[18px] border border-[var(--lv-warning)] bg-[var(--lv-warning-soft)] px-3 py-2 text-xs text-[var(--lv-warning)]">
          Han entrado cambios remotos en esta zona mientras estabas dentro. Se aplicaran al salir.
        </div>
      ) : null}

      {locationFieldsAvailable ? (
        <div className="space-y-3">
          <div className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-3">
            <div className="text-sm font-medium text-[var(--lv-text)]">
              {locationLabel || resolveFlowerText(runtimeConfig, "location_value_empty")}
            </div>
            {hasLocation ? (
              <div className="mt-1 text-xs text-[var(--lv-text-muted)]">
                {resolveFlowerText(runtimeConfig, "location_desc_has")}
              </div>
            ) : (
              <div className="mt-1 text-xs text-[var(--lv-text-muted)]">
                {resolveFlowerText(runtimeConfig, "location_desc_empty")}
              </div>
            )}
          </div>

          <div className="space-y-2 rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-3">
            <p className="text-sm text-[var(--lv-text-muted)]">
              {resolveFlowerText(runtimeConfig, "location_picker_hint")}
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  onInteractionStart?.();
                  onOpenMapPicker();
                }}
                className="lv-btn lv-btn-secondary rounded-lg px-3 py-2 text-sm"
              >
                {hasLocation
                  ? resolveFlowerText(runtimeConfig, "location_picker_cta_has")
                  : resolveFlowerText(runtimeConfig, "location_picker_cta_empty")}
              </button>
              {hasLocation ? (
                <button
                  type="button"
                  onClick={() => {
                    onInteractionStart?.();
                    onClearLocation();
                  }}
                  className="lv-btn lv-btn-secondary rounded-lg px-3 py-2 text-sm"
                >
                  {resolveFlowerText(runtimeConfig, "location_clear_cta")}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="lv-state-panel lv-tone-warning text-xs">
          Faltan columnas de ubicacion en `pages`. Ejecuta:
          `supabase/sql/2026-03-06_pages_location_fields.sql`
        </div>
      )}
    </div>
  );
}
