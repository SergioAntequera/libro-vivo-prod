"use client";

import { Star } from "lucide-react";

export function StarRating(props: {
  value: number;
  onChange: (v: number) => void;
  compact?: boolean;
}) {
  const { value, onChange, compact = false } = props;

  return (
    <div className={`min-w-0 ${compact ? "space-y-2" : "space-y-1.5"}`}>
      <div className={`flex flex-wrap items-center ${compact ? "gap-2" : "gap-1.5"}`}>
        {[1, 2, 3, 4, 5].map((n) => {
          const active = n <= value;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`lv-btn min-h-0 leading-none ${
                compact ? "h-10 w-10 rounded-[18px] px-0 py-0" : "px-2 py-1"
              } ${active ? "lv-btn-primary" : "lv-btn-secondary"}`}
              aria-label={`Poner ${n} estrellas`}
              title={`${n} estrellas`}
            >
              <Star
                size={compact ? 16 : 18}
                strokeWidth={1.9}
                style={active ? { fill: "currentColor" } : undefined}
              />
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => onChange(0)}
        className={`lv-btn lv-btn-ghost min-h-0 ${compact ? "px-2.5 py-1.5 text-[11px]" : "px-2 py-1 text-xs"}`}
        title="Quitar valoración"
      >
        Quitar valoracion
      </button>
    </div>
  );
}
