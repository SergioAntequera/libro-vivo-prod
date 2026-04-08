import type { AnnualTreeGrowth } from "@/lib/annualTreeEngine";
export { toErrorMessage } from "@/lib/errorMessage";

export function isHexColor(value: string) {
  return /^#([0-9a-fA-F]{6})$/.test(value.trim());
}

export function hexOrFallback(value: string | undefined, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return isHexColor(trimmed) ? trimmed : fallback;
}

export function kindLabel(kind: string) {
  if (kind === "pages_completed") return "Páginas completadas";
  if (kind === "seeds_bloomed") return "Semillas florecidas";
  return kind;
}

export function seededUnit(seed: number) {
  const raw = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return raw - Math.floor(raw);
}

export function clampNumber(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function lerpNumber(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function parseYearToken(value: string | null | undefined) {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{4})/);
  if (!match) return null;
  const year = Number(match[1]);
  if (!Number.isInteger(year) || year < 1900 || year > 2200) return null;
  return year;
}

// toErrorMessage is now re-exported from @/lib/errorMessage (see top of file).

export function distributeIntoBands(count: number, bandCount: number) {
  const out: number[] = [];
  let remaining = count;
  for (let idx = 0; idx < bandCount; idx += 1) {
    const bandsLeft = bandCount - idx;
    const next = Math.ceil(remaining / bandsLeft);
    out.push(next);
    remaining -= next;
  }
  return out;
}

export function annualTreePhaseTone(phase: AnnualTreeGrowth["phase"]) {
  if (phase === "seed") {
    return { backgroundColor: "#fff4e4", borderColor: "#e7c9a5", color: "#77573c" };
  }
  if (phase === "germination") {
    return { backgroundColor: "#f5efdf", borderColor: "#d8c287", color: "#6f5d31" };
  }
  if (phase === "sprout") {
    return { backgroundColor: "#e7f4df", borderColor: "#b4d39d", color: "#365938" };
  }
  if (phase === "sapling") {
    return { backgroundColor: "#e0f2e2", borderColor: "#9dc7a6", color: "#2f5a43" };
  }
  if (phase === "young") {
    return { backgroundColor: "#dff0ea", borderColor: "#94bcae", color: "#25564b" };
  }
  if (phase === "mature") {
    return { backgroundColor: "#e7efe0", borderColor: "#a1b68d", color: "#315136" };
  }
  if (phase === "blooming") {
    return { backgroundColor: "#fff0f4", borderColor: "#e4bcc7", color: "#834d62" };
  }
  return { backgroundColor: "#fff5dc", borderColor: "#dfc276", color: "#71501f" };
}

export function annualTreeBedTone(phase: AnnualTreeGrowth["phase"]) {
  if (phase === "seed") {
    return {
      mulch: "rgba(153, 112, 66, 0.54)",
      glow: "rgba(255, 245, 221, 0.48)",
      ring: "rgba(104, 74, 43, 0.34)",
    };
  }
  if (phase === "germination" || phase === "sprout") {
    return {
      mulch: "rgba(137, 121, 70, 0.5)",
      glow: "rgba(242, 251, 228, 0.46)",
      ring: "rgba(84, 104, 49, 0.3)",
    };
  }
  if (phase === "sapling" || phase === "young") {
    return {
      mulch: "rgba(77, 103, 52, 0.4)",
      glow: "rgba(238, 249, 231, 0.42)",
      ring: "rgba(47, 74, 39, 0.28)",
    };
  }
  if (phase === "mature") {
    return {
      mulch: "rgba(88, 110, 58, 0.22)",
      glow: "rgba(206, 236, 183, 0.24)",
      ring: "rgba(54, 80, 43, 0.16)",
    };
  }
  if (phase === "blooming") {
    return {
      mulch: "rgba(105, 112, 61, 0.22)",
      glow: "rgba(255, 220, 232, 0.28)",
      ring: "rgba(145, 96, 114, 0.18)",
    };
  }
  return {
    mulch: "rgba(112, 106, 50, 0.24)",
    glow: "rgba(255, 234, 184, 0.3)",
    ring: "rgba(138, 116, 56, 0.2)",
  };
}
