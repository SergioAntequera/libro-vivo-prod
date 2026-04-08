export type AnnualTreePhase =
  | "seed"
  | "germination"
  | "sprout"
  | "sapling"
  | "young"
  | "mature"
  | "blooming"
  | "legacy";

export type AnnualTreeMetrics = {
  year: number;
  totalEvents: number;
  activeDays: number;
  bloomedEvents: number;
  shinyEvents: number;
  favoriteEvents: number;
  avgRating: number;
  milestonesUnlocked: number;
};

export type AnnualTreeEventInput = {
  date: string;
  rating: number | null;
  mood: string | null;
  isBloomed: boolean;
  isFavorite: boolean;
};

export type AnnualTreeTargets = {
  totalEvents: number;
  activeDays: number;
  bloomedEvents: number;
  shinyEvents: number;
  favoriteEvents: number;
  avgRating: number;
  milestonesUnlocked: number;
};

export type AnnualTreeWeights = {
  totalEvents: number;
  activeDays: number;
  bloomedEvents: number;
  shinyEvents: number;
  favoriteEvents: number;
  avgRating: number;
  milestonesUnlocked: number;
};

export type AnnualTreeGrowthConfig = {
  maxStage: number;
  targets: AnnualTreeTargets;
  weights: AnnualTreeWeights;
};

export type AnnualTreeGrowthDimension = {
  key: keyof AnnualTreeWeights;
  ratio: number;
  points: number;
};

export type AnnualTreeGrowth = {
  score: number;
  stage: number;
  progress: number;
  phase: AnnualTreePhase;
  breakdown: AnnualTreeGrowthDimension[];
};

export type AnnualTreeBranch = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
};

export type AnnualTreeLeaf = {
  x: number;
  y: number;
  r: number;
  fill: string;
  opacity: number;
};

export type AnnualTreeFlower = {
  x: number;
  y: number;
  r: number;
  petal: string;
  center: string;
  opacity: number;
};

export type AnnualTreeFruit = {
  x: number;
  y: number;
  r: number;
  fill: string;
  opacity: number;
};

export type AnnualTreeCrownLayer = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  fill: string;
  opacity: number;
};

export type AnnualTreeRoot = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
};

export type AnnualTreePalette = {
  trunkLight: string;
  trunkDark: string;
  branch: string;
  crownA: string;
  crownB: string;
  crownC: string;
  leafA: string;
  leafB: string;
  flowerA: string;
  flowerB: string;
  flowerCenter: string;
  fruit: string;
};

export type AnnualTreeFrame = {
  year: number;
  stage: number;
  progress: number;
  phase: AnnualTreePhase;
  trunkHeight: number;
  trunkWidth: number;
  trunkRadius: number;
  crownLayers: AnnualTreeCrownLayer[];
  branches: AnnualTreeBranch[];
  roots: AnnualTreeRoot[];
  leaves: AnnualTreeLeaf[];
  flowers: AnnualTreeFlower[];
  fruits: AnnualTreeFruit[];
  palette: AnnualTreePalette;
};

export const DEFAULT_ANNUAL_TREE_CONFIG: AnnualTreeGrowthConfig = {
  maxStage: 100,
  targets: {
    totalEvents: 72,
    activeDays: 120,
    bloomedEvents: 36,
    shinyEvents: 24,
    favoriteEvents: 14,
    avgRating: 4.5,
    milestonesUnlocked: 8,
  },
  weights: {
    totalEvents: 0.28,
    activeDays: 0.2,
    bloomedEvents: 0.16,
    shinyEvents: 0.12,
    favoriteEvents: 0.08,
    avgRating: 0.1,
    milestonesUnlocked: 0.06,
  },
};

const PHASE_CUTS: Array<{ max: number; phase: AnnualTreePhase }> = [
  { max: 0, phase: "seed" },
  { max: 8, phase: "germination" },
  { max: 22, phase: "sprout" },
  { max: 38, phase: "sapling" },
  { max: 56, phase: "young" },
  { max: 74, phase: "mature" },
  { max: 90, phase: "blooming" },
  { max: 100, phase: "legacy" },
];

function clamp(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function clamp01(value: number) {
  return clamp(value, 0, 1);
}

function seededUnit(seed: number) {
  const raw = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return raw - Math.floor(raw);
}

function weightedRatio(value: number, target: number) {
  if (!Number.isFinite(value) || target <= 0) return 0;
  return clamp01(value / target);
}

export function annualTreePhaseLabel(phase: AnnualTreePhase) {
  if (phase === "seed") return "Semilla";
  if (phase === "germination") return "Germinando";
  if (phase === "sprout") return "Brote";
  if (phase === "sapling") return "Planton";
  if (phase === "young") return "Joven";
  if (phase === "mature") return "Maduro";
  if (phase === "blooming") return "Floreciendo";
  return "Legendario";
}

export function annualTreePhaseFromStage(stage: number): AnnualTreePhase {
  const safe = clamp(Math.round(stage), 0, 100);
  for (const row of PHASE_CUTS) {
    if (safe <= row.max) return row.phase;
  }
  return "legacy";
}

export function buildAnnualTreeMetricsFromEvents(params: {
  year: number;
  events: AnnualTreeEventInput[];
  milestonesUnlocked?: number;
}): AnnualTreeMetrics {
  const events = params.events ?? [];
  const uniqueDays = new Set<string>();
  let bloomedEvents = 0;
  let shinyEvents = 0;
  let favoriteEvents = 0;
  let ratingSum = 0;
  let ratingCount = 0;

  for (const event of events) {
    if (typeof event.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(event.date)) {
      uniqueDays.add(event.date);
    }
    if (event.isBloomed) bloomedEvents += 1;
    if (event.mood === "shiny") shinyEvents += 1;
    if (event.isFavorite) favoriteEvents += 1;
    if (typeof event.rating === "number" && Number.isFinite(event.rating)) {
      ratingSum += event.rating;
      ratingCount += 1;
    }
  }

  return {
    year: params.year,
    totalEvents: events.length,
    activeDays: uniqueDays.size,
    bloomedEvents,
    shinyEvents,
    favoriteEvents,
    avgRating: ratingCount > 0 ? ratingSum / ratingCount : 0,
    milestonesUnlocked: Math.max(0, params.milestonesUnlocked ?? 0),
  };
}

export function computeAnnualTreeGrowth(
  metrics: AnnualTreeMetrics,
  config: AnnualTreeGrowthConfig = DEFAULT_ANNUAL_TREE_CONFIG,
): AnnualTreeGrowth {
  const dims: AnnualTreeGrowthDimension[] = [
    {
      key: "totalEvents",
      ratio: weightedRatio(metrics.totalEvents, config.targets.totalEvents),
      points: 0,
    },
    {
      key: "activeDays",
      ratio: weightedRatio(metrics.activeDays, config.targets.activeDays),
      points: 0,
    },
    {
      key: "bloomedEvents",
      ratio: weightedRatio(metrics.bloomedEvents, config.targets.bloomedEvents),
      points: 0,
    },
    {
      key: "shinyEvents",
      ratio: weightedRatio(metrics.shinyEvents, config.targets.shinyEvents),
      points: 0,
    },
    {
      key: "favoriteEvents",
      ratio: weightedRatio(metrics.favoriteEvents, config.targets.favoriteEvents),
      points: 0,
    },
    {
      key: "avgRating",
      ratio: weightedRatio(metrics.avgRating, config.targets.avgRating),
      points: 0,
    },
    {
      key: "milestonesUnlocked",
      ratio: weightedRatio(
        metrics.milestonesUnlocked,
        config.targets.milestonesUnlocked,
      ),
      points: 0,
    },
  ];

  let score = 0;
  for (const dim of dims) {
    const weight = config.weights[dim.key] ?? 0;
    dim.points = dim.ratio * weight * config.maxStage;
    score += dim.points;
  }

  const stage = clamp(Math.round(score), 0, config.maxStage);
  const progress = config.maxStage > 0 ? stage / config.maxStage : 0;
  const phase = annualTreePhaseFromStage(stage);

  return {
    score,
    stage,
    progress,
    phase,
    breakdown: dims,
  };
}

function buildTreePalette(stage: number, year: number): AnnualTreePalette {
  const warmShift = Math.floor(seededUnit(year * 9 + stage * 3) * 9);
  return {
    trunkLight: `hsl(${30 + warmShift} 42% 42%)`,
    trunkDark: `hsl(${24 + warmShift} 45% 28%)`,
    branch: `hsl(${28 + warmShift} 42% 30%)`,
    crownA: `hsl(${100 + warmShift} 38% 58%)`,
    crownB: `hsl(${108 + warmShift} 36% 54%)`,
    crownC: `hsl(${95 + warmShift} 34% 50%)`,
    leafA: `hsl(${112 + warmShift} 41% 56%)`,
    leafB: `hsl(${104 + warmShift} 40% 49%)`,
    flowerA: "#ffe4f3",
    flowerB: "#ffefbd",
    flowerCenter: "#f5b646",
    fruit: `hsl(${22 + warmShift} 72% 54%)`,
  };
}

export function buildAnnualTreeFrame(params: {
  year: number;
  stage: number;
}): AnnualTreeFrame {
  const stage = clamp(Math.round(params.stage), 0, 100);
  const progress = stage / 100;
  const phase = annualTreePhaseFromStage(stage);
  const palette = buildTreePalette(stage, params.year);

  const trunkHeight = 18 + progress * 126;
  const trunkWidth = 7 + progress * 25;
  const trunkRadius = Math.max(2, trunkWidth * 0.42);
  const crownWidth = 32 + progress * 160;
  const crownHeight = 20 + progress * 106;

  const crownLayers: AnnualTreeCrownLayer[] =
    stage <= 3
      ? []
      : [
          {
            cx: 130,
            cy: 84,
            rx: crownWidth * 0.48,
            ry: crownHeight * 0.46,
            fill: palette.crownA,
            opacity: 0.84,
          },
          {
            cx: 100,
            cy: 92,
            rx: crownWidth * 0.35,
            ry: crownHeight * 0.32,
            fill: palette.crownB,
            opacity: 0.8,
          },
          {
            cx: 158,
            cy: 92,
            rx: crownWidth * 0.33,
            ry: crownHeight * 0.3,
            fill: palette.crownC,
            opacity: 0.8,
          },
        ];

  const branchCount = stage <= 8 ? 0 : Math.max(1, Math.floor(progress * 14));
  const branches: AnnualTreeBranch[] = Array.from({ length: branchCount }, (_, idx) => {
    const t = (idx + 1) / (branchCount + 1);
    const tilt = idx % 2 === 0 ? -1 : 1;
    const extra = seededUnit(params.year * 23 + idx * 37) * 10;
    const angleDeg = tilt * (16 + t * 30 + extra * 0.2);
    const length = 16 + progress * 36 + t * 16;
    const y1 = 182 - trunkHeight + 12 + t * (trunkHeight - 14);
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x1: 130,
      y1,
      x2: 130 + Math.cos(rad) * length,
      y2: y1 - Math.sin(rad) * (length * 0.9),
      width: 1.2 + progress * 1.4,
    };
  });

  const rootCount = stage <= 6 ? 0 : 3 + Math.floor(progress * 3);
  const roots: AnnualTreeRoot[] = Array.from({ length: rootCount }, (_, idx) => {
    const spread = (idx - (rootCount - 1) / 2) * (8 + progress * 6);
    return {
      x1: 130,
      y1: 182,
      x2: 130 + spread,
      y2: 192 + Math.abs(spread) * 0.08,
      width: 0.8 + progress * 0.8,
    };
  });

  const leafCount = stage <= 10 ? 0 : Math.floor(8 + progress * 148);
  const leaves: AnnualTreeLeaf[] = Array.from({ length: leafCount }, (_, idx) => {
    const nx = seededUnit(params.year * 5 + stage * 2 + idx * 17);
    const ny = seededUnit(params.year * 7 + stage * 3 + idx * 31);
    const ns = seededUnit(params.year * 11 + stage * 5 + idx * 13);
    const x = 130 + (nx - 0.5) * crownWidth * 0.84;
    const y = 84 + (ny - 0.5) * crownHeight * 0.74;
    const r = 1.4 + ns * 3.2;
    return {
      x,
      y,
      r,
      fill: idx % 2 === 0 ? palette.leafA : palette.leafB,
      opacity: 0.78 + (idx % 3) * 0.06,
    };
  });

  const flowerCount = stage <= 44 ? 0 : Math.floor((stage - 44) * 1.45);
  const flowers: AnnualTreeFlower[] = Array.from({ length: flowerCount }, (_, idx) => {
    const nx = seededUnit(params.year * 19 + stage * 7 + idx * 23);
    const ny = seededUnit(params.year * 29 + stage * 11 + idx * 41);
    const x = 130 + (nx - 0.5) * crownWidth * 0.76;
    const y = 84 + (ny - 0.5) * crownHeight * 0.66;
    const r = 1.4 + (idx % 3) * 0.56;
    return {
      x,
      y,
      r,
      petal: idx % 2 === 0 ? palette.flowerA : palette.flowerB,
      center: palette.flowerCenter,
      opacity: 0.82,
    };
  });

  const fruitCount = stage <= 68 ? 0 : Math.floor((stage - 68) * 0.26);
  const fruits: AnnualTreeFruit[] = Array.from({ length: fruitCount }, (_, idx) => {
    const nx = seededUnit(params.year * 31 + stage * 13 + idx * 29);
    const ny = seededUnit(params.year * 17 + stage * 19 + idx * 47);
    return {
      x: 130 + (nx - 0.5) * crownWidth * 0.64,
      y: 90 + (ny - 0.5) * crownHeight * 0.56,
      r: 1.3 + (idx % 2) * 0.45,
      fill: palette.fruit,
      opacity: 0.78,
    };
  });

  return {
    year: params.year,
    stage,
    progress,
    phase,
    trunkHeight,
    trunkWidth,
    trunkRadius,
    crownLayers,
    branches,
    roots,
    leaves,
    flowers,
    fruits,
    palette,
  };
}

