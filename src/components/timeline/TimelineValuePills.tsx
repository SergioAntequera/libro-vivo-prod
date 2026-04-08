"use client";

import {
  CloudRain,
  Droplet,
  Flame,
  Flower2,
  Sparkles,
  Sprout,
  Star,
  Wind,
} from "lucide-react";

export function ElementIcon({ code }: { code: string }) {
  if (code === "fire") return <Flame size={18} />;
  if (code === "water") return <Droplet size={18} />;
  if (code === "air") return <Wind size={18} />;
  if (code === "earth") return <Sprout size={18} />;
  return <Sparkles size={18} />;
}

export function MoodIcon({ code }: { code: string }) {
  if (code === "wilted") return <CloudRain size={18} />;
  if (code === "healthy") return <Flower2 size={18} />;
  return <Sparkles size={18} />;
}

export function Stars({ rating }: { rating: number | null }) {
  const value = rating ?? 0;
  if (value <= 0) return <span className="opacity-60">-</span>;
  return (
    <span className="inline-flex items-center gap-1">
      {Array.from({ length: value }).map((_, index) => (
        <Star key={index} size={16} className="opacity-80" />
      ))}
    </span>
  );
}

