import { supabase } from "@/lib/supabase";

export type SeedStatusFlowRule = {
  id: string;
  fromStatus: string;
  toStatus: string;
  actionKey: string;
  requiresScheduledDate: boolean;
  clearScheduledDate: boolean;
  createPageOnTransition: boolean;
  enabled: boolean;
  sortOrder: number;
  metadata: Record<string, unknown>;
};

export type SeedDefaultsConfig = {
  key: string;
  defaultSeedStatus: string;
  scheduledStatus: string;
  bloomedStatus: string;
  fallbackElement: string;
  defaultMoodState: string;
  defaultCanvasObjects: unknown[];
  autoOpenCreatedPage: boolean;
  createPageOnBloom: boolean;
};

export type CalendarRulesConfig = {
  key: string;
  allowPastSchedule: boolean;
  maxSeedsPerDay: number;
  bloomOnlyScheduled: boolean;
  showUnscheduledInCalendar: boolean;
  daysAheadLimit: number;
};

export type SeedCalendarConfig = {
  defaults: SeedDefaultsConfig;
  calendarRules: CalendarRulesConfig;
  flowRules: SeedStatusFlowRule[];
};

type SeedDefaultsRow = {
  key: string | null;
  default_seed_status: string | null;
  scheduled_status: string | null;
  bloomed_status: string | null;
  fallback_element: string | null;
  default_mood_state: string | null;
  default_canvas_objects: unknown;
  auto_open_created_page: boolean | null;
  create_page_on_bloom: boolean | null;
};

type CalendarRulesRow = {
  key: string | null;
  allow_past_schedule: boolean | null;
  max_seeds_per_day: number | null;
  bloom_only_scheduled: boolean | null;
  show_unscheduled_in_calendar: boolean | null;
  days_ahead_limit: number | null;
};

type SeedStatusFlowRow = {
  id: string | null;
  from_status: string | null;
  to_status: string | null;
  action_key: string | null;
  requires_scheduled_date: boolean | null;
  clear_scheduled_date: boolean | null;
  create_page_on_transition: boolean | null;
  enabled: boolean | null;
  sort_order: number | null;
  metadata: Record<string, unknown> | null;
};

const FALLBACK_DEFAULTS: SeedDefaultsConfig = {
  key: "default",
  defaultSeedStatus: "seed",
  scheduledStatus: "scheduled",
  bloomedStatus: "bloomed",
  fallbackElement: "earth",
  defaultMoodState: "healthy",
  defaultCanvasObjects: [],
  autoOpenCreatedPage: true,
  createPageOnBloom: true,
};

const FALLBACK_CALENDAR_RULES: CalendarRulesConfig = {
  key: "default",
  allowPastSchedule: true,
  maxSeedsPerDay: 0,
  bloomOnlyScheduled: true,
  showUnscheduledInCalendar: false,
  daysAheadLimit: 0,
};

const FALLBACK_FLOW_RULES: SeedStatusFlowRule[] = [
  {
    id: "fallback-plant-draft",
    fromStatus: "planning_draft",
    toStatus: "seed",
    actionKey: "plant",
    requiresScheduledDate: false,
    clearScheduledDate: true,
    createPageOnTransition: false,
    enabled: true,
    sortOrder: 5,
    metadata: {},
  },
  {
    id: "fallback-plant-draft-scheduled",
    fromStatus: "planning_draft",
    toStatus: "scheduled",
    actionKey: "plant_schedule",
    requiresScheduledDate: true,
    clearScheduledDate: false,
    createPageOnTransition: false,
    enabled: true,
    sortOrder: 6,
    metadata: {},
  },
  {
    id: "fallback-seed-schedule",
    fromStatus: "seed",
    toStatus: "scheduled",
    actionKey: "schedule",
    requiresScheduledDate: true,
    clearScheduledDate: false,
    createPageOnTransition: false,
    enabled: true,
    sortOrder: 10,
    metadata: {},
  },
  {
    id: "fallback-unschedule",
    fromStatus: "scheduled",
    toStatus: "seed",
    actionKey: "unschedule",
    requiresScheduledDate: false,
    clearScheduledDate: true,
    createPageOnTransition: false,
    enabled: true,
    sortOrder: 20,
    metadata: {},
  },
  {
    id: "fallback-bloom",
    fromStatus: "scheduled",
    toStatus: "bloomed",
    actionKey: "bloom",
    requiresScheduledDate: true,
    clearScheduledDate: false,
    createPageOnTransition: true,
    enabled: true,
    sortOrder: 30,
    metadata: {},
  },
];

function normalizeDefaults(row: SeedDefaultsRow | null): SeedDefaultsConfig {
  if (!row) return { ...FALLBACK_DEFAULTS };
  return {
    key: String(row.key ?? "default") || "default",
    defaultSeedStatus:
      String(row.default_seed_status ?? "").trim() ||
      FALLBACK_DEFAULTS.defaultSeedStatus,
    scheduledStatus:
      String(row.scheduled_status ?? "").trim() ||
      FALLBACK_DEFAULTS.scheduledStatus,
    bloomedStatus:
      String(row.bloomed_status ?? "").trim() || FALLBACK_DEFAULTS.bloomedStatus,
    fallbackElement:
      String(row.fallback_element ?? "").trim() ||
      FALLBACK_DEFAULTS.fallbackElement,
    defaultMoodState:
      String(row.default_mood_state ?? "").trim() ||
      FALLBACK_DEFAULTS.defaultMoodState,
    defaultCanvasObjects: Array.isArray(row.default_canvas_objects)
      ? row.default_canvas_objects
      : [...FALLBACK_DEFAULTS.defaultCanvasObjects],
    autoOpenCreatedPage:
      row.auto_open_created_page ?? FALLBACK_DEFAULTS.autoOpenCreatedPage,
    createPageOnBloom:
      row.create_page_on_bloom ?? FALLBACK_DEFAULTS.createPageOnBloom,
  };
}

function normalizeCalendarRules(row: CalendarRulesRow | null): CalendarRulesConfig {
  if (!row) return { ...FALLBACK_CALENDAR_RULES };

  const maxSeeds = Number(row.max_seeds_per_day);
  const daysAhead = Number(row.days_ahead_limit);

  return {
    key: String(row.key ?? "default") || "default",
    allowPastSchedule:
      row.allow_past_schedule ?? FALLBACK_CALENDAR_RULES.allowPastSchedule,
    maxSeedsPerDay:
      Number.isInteger(maxSeeds) && maxSeeds >= 0
        ? maxSeeds
        : FALLBACK_CALENDAR_RULES.maxSeedsPerDay,
    bloomOnlyScheduled:
      row.bloom_only_scheduled ?? FALLBACK_CALENDAR_RULES.bloomOnlyScheduled,
    showUnscheduledInCalendar:
      row.show_unscheduled_in_calendar ??
      FALLBACK_CALENDAR_RULES.showUnscheduledInCalendar,
    daysAheadLimit:
      Number.isInteger(daysAhead) && daysAhead >= 0
        ? daysAhead
        : FALLBACK_CALENDAR_RULES.daysAheadLimit,
  };
}

function normalizeFlowRule(row: SeedStatusFlowRow): SeedStatusFlowRule | null {
  const id = String(row.id ?? "").trim();
  const fromStatus = String(row.from_status ?? "").trim();
  const toStatus = String(row.to_status ?? "").trim();
  const actionKey = String(row.action_key ?? "").trim();
  if (!id || !fromStatus || !toStatus || !actionKey) return null;

  const sortOrder = Number(row.sort_order);

  return {
    id,
    fromStatus,
    toStatus,
    actionKey,
    requiresScheduledDate: row.requires_scheduled_date === true,
    clearScheduledDate: row.clear_scheduled_date === true,
    createPageOnTransition: row.create_page_on_transition === true,
    enabled: row.enabled !== false,
    sortOrder:
      Number.isInteger(sortOrder) && sortOrder >= 0 ? sortOrder : 100,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? row.metadata
        : {},
  };
}

export function getFallbackSeedCalendarConfig(): SeedCalendarConfig {
  return {
    defaults: { ...FALLBACK_DEFAULTS },
    calendarRules: { ...FALLBACK_CALENDAR_RULES },
    flowRules: FALLBACK_FLOW_RULES.map((x) => ({ ...x })),
  };
}

export async function getSeedCalendarConfig(): Promise<SeedCalendarConfig> {
  const fallback = getFallbackSeedCalendarConfig();

  try {
    const [defaultsRes, rulesRes, flowRes] = await Promise.all([
      supabase
        .from("seed_defaults")
        .select(
          "key,default_seed_status,scheduled_status,bloomed_status,fallback_element,default_mood_state,default_canvas_objects,auto_open_created_page,create_page_on_bloom",
        )
        .eq("key", "default")
        .maybeSingle(),
      supabase
        .from("calendar_rules")
        .select(
          "key,allow_past_schedule,max_seeds_per_day,bloom_only_scheduled,show_unscheduled_in_calendar,days_ahead_limit",
        )
        .eq("key", "default")
        .maybeSingle(),
      supabase
        .from("seed_status_flow")
        .select(
          "id,from_status,to_status,action_key,requires_scheduled_date,clear_scheduled_date,create_page_on_transition,enabled,sort_order,metadata",
        )
        .eq("enabled", true)
        .order("sort_order", { ascending: true })
        .order("from_status", { ascending: true })
        .order("to_status", { ascending: true }),
    ]);

    const defaults = defaultsRes.error
      ? fallback.defaults
      : normalizeDefaults((defaultsRes.data as SeedDefaultsRow | null) ?? null);

    const calendarRules = rulesRes.error
      ? fallback.calendarRules
      : normalizeCalendarRules((rulesRes.data as CalendarRulesRow | null) ?? null);

    let flowRules = fallback.flowRules;
    if (!flowRes.error) {
      const normalized = ((flowRes.data as SeedStatusFlowRow[] | null) ?? [])
        .map(normalizeFlowRule)
        .filter(Boolean) as SeedStatusFlowRule[];
      if (normalized.length) flowRules = normalized;
    }

    return {
      defaults,
      calendarRules,
      flowRules,
    };
  } catch {
    return fallback;
  }
}

export function resolveSeedTransition(
  flowRules: SeedStatusFlowRule[],
  params: {
    fromStatus: string;
    toStatus: string;
    actionKey?: string | null;
  },
): SeedStatusFlowRule | null {
  const from = String(params.fromStatus ?? "").trim();
  const to = String(params.toStatus ?? "").trim();
  const action = String(params.actionKey ?? "").trim();
  if (!from || !to) return null;

  if (action) {
    const exact = flowRules.find(
      (rule) =>
        rule.enabled &&
        rule.fromStatus === from &&
        rule.toStatus === to &&
        rule.actionKey === action,
    );
    if (exact) return exact;
  }

  return (
    flowRules.find(
      (rule) =>
        rule.enabled && rule.fromStatus === from && rule.toStatus === to,
    ) ?? null
  );
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function compareIsoDates(a: string, b: string) {
  if (!a || !b) return 0;
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function daysBetweenIsoDates(from: string, to: string) {
  const fromMs = Date.parse(`${from}T00:00:00.000Z`);
  const toMs = Date.parse(`${to}T00:00:00.000Z`);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return 0;
  return Math.floor((toMs - fromMs) / 86400000);
}

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true") return true;
    if (v === "false") return false;
  }
  return fallback;
}

function toInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string") {
    const n = Number.parseInt(value.trim(), 10);
    if (Number.isInteger(n)) return n;
  }
  return null;
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((x) => String(x ?? "").trim().toLowerCase())
    .filter(Boolean);
}

type SeedTransitionGuardContext = {
  nowDate?: string;
  targetDate?: string | null;
  scheduledDate?: string | null;
  seedCreatedAt?: string | null;
  userRole?: string | null;
};

export function evaluateSeedTransitionGuard(
  rule: SeedStatusFlowRule,
  context: SeedTransitionGuardContext,
): string | null {
  const metadata = rule.metadata ?? {};
  const message =
    typeof metadata.custom_error === "string" && metadata.custom_error.trim()
      ? metadata.custom_error.trim()
      : "Transicion bloqueada por regla de flujo.";

  const nowDate = context.nowDate || todayIsoDate();
  const targetDate = String(context.targetDate ?? "").trim() || null;
  const scheduledDate = String(context.scheduledDate ?? "").trim() || null;
  const seedCreatedAtRaw = String(context.seedCreatedAt ?? "").trim();
  const seedCreatedDate =
    seedCreatedAtRaw.length >= 10 ? seedCreatedAtRaw.slice(0, 10) : null;
  const role = String(context.userRole ?? "").trim().toLowerCase();

  const allowedRoles = toStringList(metadata.allowed_roles);
  if (allowedRoles.length && !allowedRoles.includes(role)) {
    return message;
  }

  const minDaysSinceCreated = toInt(metadata.min_days_since_created);
  if (
    minDaysSinceCreated !== null &&
    minDaysSinceCreated > 0 &&
    seedCreatedDate
  ) {
    const days = daysBetweenIsoDates(seedCreatedDate, nowDate);
    if (days < minDaysSinceCreated) return message;
  }

  const maxDaysAhead = toInt(metadata.max_days_ahead);
  if (maxDaysAhead !== null && maxDaysAhead >= 0 && targetDate) {
    const ahead = daysBetweenIsoDates(nowDate, targetDate);
    if (ahead > maxDaysAhead) return message;
  }

  if (toBoolean(metadata.not_before_today) && targetDate) {
    if (compareIsoDates(targetDate, nowDate) < 0) return message;
  }

  if (toBoolean(metadata.scheduled_date_must_be_today_or_past) && scheduledDate) {
    if (compareIsoDates(scheduledDate, nowDate) > 0) return message;
  }

  return null;
}
