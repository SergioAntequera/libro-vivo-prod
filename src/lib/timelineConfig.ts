import { supabase } from "@/lib/supabase";

export type SeasonCode = "spring" | "summer" | "autumn" | "winter";
export type TimelineViewMode = "path" | "album";
export type TimelineMilestoneMode = "every" | "rules" | "hybrid";

export type TimelineViewConfig = {
  key: string;
  defaultView: TimelineViewMode;
  milestoneMode: TimelineMilestoneMode;
  milestoneEvery: number;
  milestoneChoices: number[];
  milestoneMessage: string;
  seasonHemisphere: "north" | "south";
  springStartMmdd: number;
  summerStartMmdd: number;
  autumnStartMmdd: number;
  winterStartMmdd: number;
};

export type TimelineMilestoneRule = {
  id: string;
  milestoneNumber: number;
  title: string;
  message: string;
  icon: string | null;
  accentColor: string | null;
  enabled: boolean;
};

type TimelineViewRow = {
  key: string | null;
  default_view: string | null;
  milestone_mode: string | null;
  milestone_every: number | null;
  milestone_choices: number[] | null;
  milestone_message: string | null;
  season_hemisphere: string | null;
  spring_start_mmdd: number | null;
  summer_start_mmdd: number | null;
  autumn_start_mmdd: number | null;
  winter_start_mmdd: number | null;
};

type TimelineMilestoneRuleRow = {
  id: string | null;
  milestone_number: number | null;
  title: string | null;
  message: string | null;
  icon: string | null;
  accent_color: string | null;
  enabled: boolean | null;
};

const DEFAULT_MILESTONE_MESSAGE =
  "Habeis llegado a un número redondo. Este tramo del sendero ya tiene historia propia.";

const FALLBACK_TIMELINE_CONFIG: TimelineViewConfig = {
  key: "default",
  defaultView: "path",
  milestoneMode: "every",
  milestoneEvery: 10,
  milestoneChoices: [5, 10, 15],
  milestoneMessage: DEFAULT_MILESTONE_MESSAGE,
  seasonHemisphere: "north",
  springStartMmdd: 321,
  summerStartMmdd: 621,
  autumnStartMmdd: 923,
  winterStartMmdd: 1221,
};

const FALLBACK_MILESTONE_RULES: TimelineMilestoneRule[] = [
  {
    id: "fallback-5",
    milestoneNumber: 5,
    title: "Milestone #5",
    message: "Primer tramo importante completado.",
    icon: "trophy",
    accentColor: "#fff7e6",
    enabled: true,
  },
  {
    id: "fallback-10",
    milestoneNumber: 10,
    title: "Milestone #10",
    message: "Seguis acumulando recuerdos con fuerza.",
    icon: "trophy",
    accentColor: "#fff7e6",
    enabled: true,
  },
  {
    id: "fallback-15",
    milestoneNumber: 15,
    title: "Milestone #15",
    message: "Un nuevo nivel de historia compartida.",
    icon: "trophy",
    accentColor: "#fff7e6",
    enabled: true,
  },
];

function normalizeMilestoneChoices(input: unknown): number[] {
  if (!Array.isArray(input)) return [...FALLBACK_TIMELINE_CONFIG.milestoneChoices];
  const values = input
    .map((x) => Number(x))
    .filter((x) => Number.isInteger(x) && x > 0 && x <= 500);
  const unique = Array.from(new Set(values)).sort((a, b) => a - b);
  return unique.length ? unique : [...FALLBACK_TIMELINE_CONFIG.milestoneChoices];
}

function normalizeTimelineView(value: unknown): TimelineViewMode {
  return value === "album" ? "album" : "path";
}

function normalizeMilestoneMode(value: unknown): TimelineMilestoneMode {
  if (value === "rules") return "rules";
  if (value === "hybrid") return "hybrid";
  return "every";
}

function normalizeHemisphere(value: unknown): "north" | "south" {
  return value === "south" ? "south" : "north";
}

function normalizeTimelineConfig(
  row: TimelineViewRow | null,
): TimelineViewConfig {
  if (!row) return { ...FALLBACK_TIMELINE_CONFIG };

  const milestoneEvery = Number(row.milestone_every);
  const normalizedEvery =
    Number.isInteger(milestoneEvery) && milestoneEvery > 0 && milestoneEvery <= 500
      ? milestoneEvery
      : FALLBACK_TIMELINE_CONFIG.milestoneEvery;

  return {
    key: String(row.key ?? "default") || "default",
    defaultView: normalizeTimelineView(row.default_view),
    milestoneMode: normalizeMilestoneMode(row.milestone_mode),
    milestoneEvery: normalizedEvery,
    milestoneChoices: normalizeMilestoneChoices(row.milestone_choices),
    milestoneMessage:
      String(row.milestone_message ?? "").trim() ||
      FALLBACK_TIMELINE_CONFIG.milestoneMessage,
    seasonHemisphere: normalizeHemisphere(row.season_hemisphere),
    springStartMmdd:
      Number.isInteger(row.spring_start_mmdd) && Number(row.spring_start_mmdd) > 0
        ? Number(row.spring_start_mmdd)
        : FALLBACK_TIMELINE_CONFIG.springStartMmdd,
    summerStartMmdd:
      Number.isInteger(row.summer_start_mmdd) && Number(row.summer_start_mmdd) > 0
        ? Number(row.summer_start_mmdd)
        : FALLBACK_TIMELINE_CONFIG.summerStartMmdd,
    autumnStartMmdd:
      Number.isInteger(row.autumn_start_mmdd) && Number(row.autumn_start_mmdd) > 0
        ? Number(row.autumn_start_mmdd)
        : FALLBACK_TIMELINE_CONFIG.autumnStartMmdd,
    winterStartMmdd:
      Number.isInteger(row.winter_start_mmdd) && Number(row.winter_start_mmdd) > 0
        ? Number(row.winter_start_mmdd)
        : FALLBACK_TIMELINE_CONFIG.winterStartMmdd,
  };
}

function normalizeTimelineRule(
  row: TimelineMilestoneRuleRow,
): TimelineMilestoneRule | null {
  const id = String(row.id ?? "").trim();
  const milestoneNumber = Number(row.milestone_number);
  if (!id || !Number.isInteger(milestoneNumber) || milestoneNumber <= 0) return null;

  return {
    id,
    milestoneNumber,
    title: String(row.title ?? "").trim() || `Milestone #${milestoneNumber}`,
    message:
      String(row.message ?? "").trim() ||
      FALLBACK_TIMELINE_CONFIG.milestoneMessage,
    icon: row.icon ?? null,
    accentColor: row.accent_color ?? null,
    enabled: row.enabled !== false,
  };
}

export function getFallbackTimelineViewConfig(): TimelineViewConfig {
  return { ...FALLBACK_TIMELINE_CONFIG };
}

export function getFallbackTimelineMilestoneRules(): TimelineMilestoneRule[] {
  return FALLBACK_MILESTONE_RULES.map((x) => ({ ...x }));
}

export async function getTimelineViewConfig(): Promise<TimelineViewConfig> {
  try {
    const { data, error } = await supabase
      .from("timeline_view_config")
      .select(
        "key,default_view,milestone_mode,milestone_every,milestone_choices,milestone_message,season_hemisphere,spring_start_mmdd,summer_start_mmdd,autumn_start_mmdd,winter_start_mmdd",
      )
      .eq("key", "default")
      .maybeSingle();

    if (error) return getFallbackTimelineViewConfig();
    return normalizeTimelineConfig((data as TimelineViewRow | null) ?? null);
  } catch {
    return getFallbackTimelineViewConfig();
  }
}

export async function getTimelineMilestoneRules(): Promise<
  TimelineMilestoneRule[]
> {
  try {
    const { data, error } = await supabase
      .from("timeline_milestone_rules")
      .select("id,milestone_number,title,message,icon,accent_color,enabled")
      .eq("enabled", true)
      .order("milestone_number", { ascending: true });

    if (error) return getFallbackTimelineMilestoneRules();

    const normalized = ((data as TimelineMilestoneRuleRow[] | null) ?? [])
      .map(normalizeTimelineRule)
      .filter(Boolean) as TimelineMilestoneRule[];

    if (!normalized.length) return getFallbackTimelineMilestoneRules();
    return normalized;
  } catch {
    return getFallbackTimelineMilestoneRules();
  }
}

function resolveNorthSeason(mmdd: number, cfg: TimelineViewConfig): SeasonCode {
  const spring = cfg.springStartMmdd;
  const summer = cfg.summerStartMmdd;
  const autumn = cfg.autumnStartMmdd;
  const winter = cfg.winterStartMmdd;

  if (mmdd >= spring && mmdd < summer) return "spring";
  if (mmdd >= summer && mmdd < autumn) return "summer";
  if (mmdd >= autumn && mmdd < winter) return "autumn";
  return "winter";
}

export function resolveSeasonFromDate(
  dateStr: string,
  cfg: TimelineViewConfig,
): SeasonCode {
  const month = Number(dateStr.slice(5, 7));
  const day = Number(dateStr.slice(8, 10));
  const mmdd = month * 100 + day;

  const north = resolveNorthSeason(mmdd, cfg);
  if (cfg.seasonHemisphere !== "south") return north;

  if (north === "spring") return "autumn";
  if (north === "summer") return "winter";
  if (north === "autumn") return "spring";
  return "summer";
}

export function getMilestoneChoicesWithCurrent(
  choices: number[],
  currentEvery: number,
): number[] {
  const set = new Set<number>();
  for (const value of choices) {
    if (Number.isInteger(value) && value > 0) set.add(value);
  }
  if (Number.isInteger(currentEvery) && currentEvery > 0) set.add(currentEvery);
  return Array.from(set).sort((a, b) => a - b);
}

export function isTimelineMilestone(
  count: number,
  cfg: TimelineViewConfig,
  ruleNumbers: Set<number>,
): boolean {
  if (!Number.isInteger(count) || count <= 0) return false;

  const everyHit =
    Number.isInteger(cfg.milestoneEvery) &&
    cfg.milestoneEvery > 0 &&
    count % cfg.milestoneEvery === 0;
  const ruleHit = ruleNumbers.has(count);

  if (cfg.milestoneMode === "rules") return ruleHit;
  if (cfg.milestoneMode === "hybrid") return everyHit || ruleHit;
  return everyHit;
}
