import type { AnnualTreePhase } from "@/lib/annualTreeEngine";
import { clampNumber, seededUnit } from "@/lib/forestPageUtils";

export type ForestCanvasTimelineNode = {
  year: number;
  x: number;
  y: number;
  treeSize: number;
};

export type ForestCanvasPlacedTree = ForestCanvasTimelineNode & {
  growth: {
    stage: number;
    phase: AnnualTreePhase;
  };
};

export type ForestGlowPatch = {
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
  color: string;
};

export type ForestMossPatch = {
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
  rotate: number;
  color: string;
};

export type ForestFlowerDot = {
  x: number;
  y: number;
  size: number;
  color: string;
};

type DecorBaseInput = {
  annualTreeCount: number;
  forestCanvasWidth: number;
  forestCanvasHeight: number;
};

export function buildGladeDecor({
  annualTreeCount,
  forestCanvasWidth,
  forestCanvasHeight,
}: DecorBaseInput): ForestGlowPatch[] {
  const count = clampNumber(5 + Math.floor(annualTreeCount / 4), 5, 10);
  return Array.from({ length: count }, (_, idx) => {
    const x = clampNumber(
      seededUnit(6800 + idx * 37) * forestCanvasWidth,
      90,
      forestCanvasWidth - 90,
    );
    const y = clampNumber(
      forestCanvasHeight * (0.26 + seededUnit(7000 + idx * 19) * 0.56),
      78,
      forestCanvasHeight - 52,
    );
    const w = 170 + seededUnit(7200 + idx * 13) * 260;
    const h = 74 + seededUnit(7400 + idx * 23) * 120;
    const opacity = 0.13 + seededUnit(7600 + idx * 31) * 0.12;
    const color =
      idx % 3 === 0
        ? "rgba(247, 240, 197, 0.9)"
        : idx % 3 === 1
          ? "rgba(215, 239, 191, 0.86)"
          : "rgba(190, 225, 171, 0.74)";
    return { x, y, w, h, opacity, color };
  });
}

export function buildMossPatches({
  annualTreeCount,
  forestCanvasWidth,
  forestCanvasHeight,
}: DecorBaseInput): ForestMossPatch[] {
  const patchCount = clampNumber(12 + annualTreeCount * 2, 12, 36);
  return Array.from({ length: patchCount }, (_, idx) => {
    const x = clampNumber(
      seededUnit(7100 + idx * 17) * forestCanvasWidth,
      32,
      forestCanvasWidth - 32,
    );
    const y = clampNumber(
      forestCanvasHeight * (0.24 + seededUnit(7300 + idx * 29) * 0.62),
      44,
      forestCanvasHeight - 24,
    );
    const w = 42 + seededUnit(7400 + idx * 31) * 104;
    const h = 16 + seededUnit(7600 + idx * 37) * 36;
    const opacity = 0.08 + seededUnit(7800 + idx * 13) * 0.14;
    const rotate = (seededUnit(8000 + idx * 17) - 0.5) * 22;
    const color = idx % 2 === 0 ? "#7fb56d" : "#91c17c";
    return { x, y, w, h, opacity, rotate, color };
  });
}

export function buildFlowerDecor({
  annualTreeCount,
  forestCanvasWidth,
  forestCanvasHeight,
}: DecorBaseInput): ForestFlowerDot[] {
  const count = clampNumber(18 + annualTreeCount * 3, 18, 54);
  return Array.from({ length: count }, (_, idx) => {
    const progress = count <= 1 ? 0.5 : idx / (count - 1);
    const x = clampNumber(
      forestCanvasWidth * (0.08 + progress * 0.84) +
        (seededUnit(8200 + idx * 43) - 0.5) * 42,
      26,
      forestCanvasWidth - 26,
    );
    const y = clampNumber(
      forestCanvasHeight * (0.5 + Math.sin(progress * Math.PI * 1.35 + 0.4) * 0.11) +
        (seededUnit(8500 + idx * 19) - 0.5) * 60,
      forestCanvasHeight * 0.34,
      forestCanvasHeight - 22,
    );
    const size = 2.6 + seededUnit(8700 + idx * 47) * 4.4;
    const hue = idx % 4 === 0 ? 345 : idx % 4 === 1 ? 39 : idx % 4 === 2 ? 283 : 198;
    const sat = idx % 4 === 1 ? 74 : 62;
    const light = idx % 4 === 1 ? 75 : 80;
    return { x, y, size, color: `hsl(${hue} ${sat}% ${light}%)` };
  });
}

export function buildBlossomScatter(
  orchardTimeline: ForestCanvasPlacedTree[],
): ForestFlowerDot[] {
  return orchardTimeline.flatMap((tree) => {
    const count =
      tree.growth.phase === "legacy"
        ? 10
        : tree.growth.phase === "blooming"
          ? 8
          : tree.growth.phase === "mature"
            ? 4
            : 0;
    return Array.from({ length: count }, (_, idx) => {
      const angle = seededUnit(tree.year * 53 + idx * 11) * Math.PI * 2;
      const distance = tree.treeSize * (0.34 + seededUnit(tree.year * 61 + idx * 17) * 0.38);
      const x = tree.x + Math.cos(angle) * distance;
      const y = tree.y + tree.treeSize * 0.18 + Math.sin(angle) * distance * 0.54;
      const size = 3 + seededUnit(tree.year * 71 + idx * 23) * 4.4;
      const color = idx % 3 === 0 ? "#ffe6ef" : idx % 3 === 1 ? "#ffe8c5" : "#f4d7ff";
      return { x, y, size, color };
    });
  });
}
