import type {
  CareAction,
  CareLogItem,
  CareMood,
  CareNeedKey,
  CareNeedsState,
} from "@/lib/careTypes";

export type CareActionModel = {
  code: string;
  targetNeed?: CareNeedKey;
  effects?: Partial<Record<CareNeedKey, number>>;
  decayAll?: number;
  scoreBonus?: number;
  sortOrder?: number;
};

export type MoodThreshold = {
  mood: CareMood;
  minScore: number;
  maxScore: number;
  anchorScore: number;
  sortOrder?: number;
};

const NEED_KEYS: CareNeedKey[] = ["water", "light", "soil", "air"];

const DEFAULT_ACTION_MODELS: CareActionModel[] = [
  {
    code: "water",
    targetNeed: "water",
    effects: { water: 24, air: 4 },
    decayAll: 3,
    scoreBonus: 6,
    sortOrder: 10,
  },
  {
    code: "fertilize",
    targetNeed: "soil",
    effects: { soil: 24, water: 4 },
    decayAll: 3,
    scoreBonus: 6,
    sortOrder: 20,
  },
  {
    code: "light",
    targetNeed: "light",
    effects: { light: 22, air: 6 },
    decayAll: 3,
    scoreBonus: 6,
    sortOrder: 30,
  },
];

const DEFAULT_MOOD_THRESHOLDS: MoodThreshold[] = [
  { mood: "wilted", minScore: 0, maxScore: 34, anchorScore: 20, sortOrder: 10 },
  { mood: "healthy", minScore: 35, maxScore: 74, anchorScore: 55, sortOrder: 20 },
  { mood: "shiny", minScore: 75, maxScore: 100, anchorScore: 85, sortOrder: 30 },
];

const NEED_LABELS: Record<CareNeedKey, string> = {
  water: "Agua",
  light: "Luz",
  soil: "Tierra",
  air: "Aire",
};

const NEED_HINTS: Record<CareNeedKey, string> = {
  water: "Falta cercania y presencia.",
  light: "Falta claridad y momentos bonitos.",
  soil: "Falta base: rutina y acuerdos pequenos.",
  air: "Falta espacio para respirar y escucharse.",
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function isCareNeedKey(value: unknown): value is CareNeedKey {
  return (
    value === "water" ||
    value === "light" ||
    value === "soil" ||
    value === "air"
  );
}

function isCareMood(value: unknown): value is CareMood {
  return value === "wilted" || value === "healthy" || value === "shiny";
}

function asFiniteNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function sortActionModels(models: CareActionModel[]) {
  return [...models].sort((a, b) => {
    const ao = Number.isFinite(a.sortOrder) ? Number(a.sortOrder) : 999;
    const bo = Number.isFinite(b.sortOrder) ? Number(b.sortOrder) : 999;
    if (ao !== bo) return ao - bo;
    return String(a.code).localeCompare(String(b.code));
  });
}

function sortMoodThresholds(rows: MoodThreshold[]) {
  return [...rows].sort((a, b) => {
    const ao = Number.isFinite(a.sortOrder) ? Number(a.sortOrder) : a.minScore;
    const bo = Number.isFinite(b.sortOrder) ? Number(b.sortOrder) : b.minScore;
    if (ao !== bo) return ao - bo;
    return a.minScore - b.minScore;
  });
}

function getActionModels(actionModels?: CareActionModel[]) {
  if (!Array.isArray(actionModels) || actionModels.length === 0) {
    return sortActionModels(DEFAULT_ACTION_MODELS);
  }

  const normalized = actionModels
    .filter((x) => x && typeof x.code === "string" && x.code.trim())
    .map((x) => ({ ...x, code: x.code.trim() }));

  if (!normalized.length) return sortActionModels(DEFAULT_ACTION_MODELS);
  return sortActionModels(normalized);
}

export function getDefaultMoodThresholds() {
  return DEFAULT_MOOD_THRESHOLDS.map((x) => ({ ...x }));
}

export function normalizeMoodThresholds(
  thresholds?: MoodThreshold[],
): MoodThreshold[] {
  if (!Array.isArray(thresholds) || thresholds.length === 0) {
    return getDefaultMoodThresholds();
  }

  const byMood: Partial<Record<CareMood, MoodThreshold>> = {};

  for (const row of thresholds) {
    if (!row || !isCareMood(row.mood)) continue;

    const minRaw = asFiniteNumber(row.minScore);
    const maxRaw = asFiniteNumber(row.maxScore);
    const anchorRaw = asFiniteNumber(row.anchorScore);

    if (minRaw === null || maxRaw === null) continue;

    const minScore = clamp(Math.round(Math.min(minRaw, maxRaw)), 0, 100);
    const maxScore = clamp(Math.round(Math.max(minRaw, maxRaw)), 0, 100);
    const midpoint = Math.round((minScore + maxScore) / 2);

    byMood[row.mood] = {
      mood: row.mood,
      minScore,
      maxScore,
      anchorScore:
        anchorRaw === null
          ? midpoint
          : clamp(Math.round(anchorRaw), minScore, maxScore),
      sortOrder: row.sortOrder,
    };
  }

  for (const fallback of DEFAULT_MOOD_THRESHOLDS) {
    if (!byMood[fallback.mood]) {
      byMood[fallback.mood] = { ...fallback };
    }
  }

  return sortMoodThresholds(Object.values(byMood) as MoodThreshold[]);
}

function resolveActionModel(action: CareAction, actionModels: CareActionModel[]) {
  const exact = actionModels.find((x) => x.code === action);
  if (exact) return exact;

  const fallback = DEFAULT_ACTION_MODELS.find((x) => x.code === action);
  if (fallback) return fallback;

  return actionModels[0] ?? DEFAULT_ACTION_MODELS[0];
}

function resolveActionEffects(action: CareAction, model: CareActionModel) {
  const fromModel = model.effects ?? {};
  const hasModelEffects = NEED_KEYS.some((key) => Number(fromModel[key] ?? 0) !== 0);

  if (hasModelEffects) {
    const out: Partial<Record<CareNeedKey, number>> = {};
    for (const key of NEED_KEYS) {
      const val = asFiniteNumber(fromModel[key]);
      if (val !== null) out[key] = val;
    }
    return out;
  }

  const fallback = DEFAULT_ACTION_MODELS.find((x) => x.code === action)?.effects ?? {};
  return { ...fallback };
}

function resolveActionTargetNeed(action: CareAction, model: CareActionModel): CareNeedKey {
  if (isCareNeedKey(model.targetNeed)) return model.targetNeed;

  const effects = resolveActionEffects(action, model);
  let bestKey: CareNeedKey = "water";
  let bestGain = Number(effects[bestKey] ?? 0);

  for (const key of NEED_KEYS) {
    const gain = Number(effects[key] ?? 0);
    if (gain > bestGain) {
      bestGain = gain;
      bestKey = key;
    }
  }

  if (bestGain > 0) return bestKey;

  if (action === "fertilize") return "soil";
  if (action === "light") return "light";
  if (action === "water") return "water";

  return "water";
}

function formatActionCode(code: string) {
  return code
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export function clampCareScore(score: number) {
  if (!Number.isFinite(score)) return 60;
  return clamp(Math.round(score), 0, 100);
}

export function scoreToMood(score: number, thresholds?: MoodThreshold[]): CareMood {
  const s = clampCareScore(score);
  const rules = normalizeMoodThresholds(thresholds);

  const exact = rules.find((row) => s >= row.minScore && s <= row.maxScore);
  if (exact) return exact.mood;

  if (s < rules[0].minScore) return rules[0].mood;
  return rules[rules.length - 1].mood;
}

export function moodToScore(mood: CareMood, thresholds?: MoodThreshold[]) {
  const rules = normalizeMoodThresholds(thresholds);
  const row = rules.find((x) => x.mood === mood);
  if (!row) {
    return mood === "wilted" ? 20 : mood === "shiny" ? 85 : 55;
  }
  return clampCareScore(row.anchorScore);
}

export function actionLabel(a: CareAction) {
  if (a === "water") return "Regar";
  if (a === "fertilize") return "Abonar";
  if (a === "light") return "Dar luz";
  return formatActionCode(a || "Acción");
}

export function careNeedLabel(need: CareNeedKey) {
  return NEED_LABELS[need];
}

export function careNeedHint(need: CareNeedKey) {
  return NEED_HINTS[need];
}

export function defaultCareNeeds(): CareNeedsState {
  return {
    water: 55,
    light: 55,
    soil: 55,
    air: 55,
  };
}

export function normalizeCareNeeds(input: unknown): CareNeedsState {
  const fallback = defaultCareNeeds();
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return fallback;
  }

  const obj = input as Record<string, unknown>;
  const out: CareNeedsState = { ...fallback };
  for (const key of NEED_KEYS) {
    const raw = Number(obj[key]);
    out[key] = Number.isFinite(raw) ? clamp(Math.round(raw), 0, 100) : fallback[key];
  }

  return out;
}

export function careNeedsAverage(needs: CareNeedsState) {
  const total = NEED_KEYS.reduce((acc, key) => acc + needs[key], 0);
  return Math.round(total / NEED_KEYS.length);
}

export function lowestCareNeed(needs: CareNeedsState): CareNeedKey {
  let minKey: CareNeedKey = "water";
  let minValue = needs[minKey];

  for (const key of NEED_KEYS) {
    if (needs[key] < minValue) {
      minValue = needs[key];
      minKey = key;
    }
  }

  return minKey;
}

export function recommendCareAction(
  needs: CareNeedsState,
  actionModels?: CareActionModel[],
): CareAction {
  const weakest = lowestCareNeed(needs);
  const models = getActionModels(actionModels);

  const matching = models.filter(
    (model) => resolveActionTargetNeed(model.code, model) === weakest,
  );

  if (matching.length > 0) return matching[0].code;
  return models[0]?.code ?? "water";
}

function isoDayFromDate(date: Date) {
  const y = date.getUTCFullYear();
  const m = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const d = `${date.getUTCDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function careStreakDays(log: CareLogItem[]) {
  if (!Array.isArray(log) || log.length === 0) return 0;

  const daySet = new Set<string>();
  for (const item of log) {
    const date = new Date(item.at);
    if (!Number.isFinite(date.getTime())) continue;
    daySet.add(isoDayFromDate(date));
  }

  if (daySet.size === 0) return 0;

  const days = Array.from(daySet).sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));
  let streak = 0;
  const cursor = new Date(`${days[0]}T00:00:00.000Z`);

  for (const day of days) {
    const expected = isoDayFromDate(cursor);
    if (day !== expected) break;
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

export function applyCareActionModel(args: {
  action: CareAction;
  score: number;
  needs: CareNeedsState;
  actionModels?: CareActionModel[];
  moodThresholds?: MoodThreshold[];
}) {
  const baseScore = clampCareScore(args.score);
  const nextNeeds: CareNeedsState = { ...args.needs };

  const models = getActionModels(args.actionModels);
  const model = resolveActionModel(args.action, models);
  const effects = resolveActionEffects(args.action, model);

  const decayAllRaw = asFiniteNumber(model.decayAll);
  const decayAll = decayAllRaw === null ? 3 : clamp(Math.round(decayAllRaw), 0, 30);

  const scoreBonusRaw = asFiniteNumber(model.scoreBonus);
  const scoreBonus = scoreBonusRaw === null ? 6 : clamp(Math.round(scoreBonusRaw), -20, 40);

  // Each action spends a little global energy, then restores targeted needs.
  for (const key of NEED_KEYS) {
    nextNeeds[key] = clamp(nextNeeds[key] - decayAll, 0, 100);
  }

  for (const key of NEED_KEYS) {
    const gain = Number(effects[key] ?? 0);
    if (gain) {
      nextNeeds[key] = clamp(nextNeeds[key] + gain, 0, 100);
    }
  }

  const avg = careNeedsAverage(nextNeeds);
  const scoreGain = scoreBonus + Math.floor((avg - 40) / 10);
  const nextScore = clampCareScore(baseScore + scoreGain);
  const nextMood = scoreToMood(nextScore, args.moodThresholds);
  const suggested = recommendCareAction(nextNeeds, models);

  return {
    nextScore,
    nextMood,
    nextNeeds,
    suggested,
  };
}
