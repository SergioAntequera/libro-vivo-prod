import type { AnnualTreeEventInput } from "@/lib/annualTreeEngine";

export type LifeEventKind =
  | "seed"
  | "sprout"
  | "flower"
  | "tree"
  | "milestone"
  | "reward"
  | "capsule"
  | "challenge";

export type LifeEventSource =
  | {
      entity: "page";
      id: string;
      plannedFromSeedId?: string | null;
    }
  | {
      entity: "seed";
      id: string;
      status?: string | null;
      bloomedPageId?: string | null;
    }
  | {
      entity: "unlock";
      id: string | null;
      ruleId?: string | null;
      tier?: string | null;
    }
  | {
      entity: "derived";
      id: string;
      from?: string | null;
    };

export type LifeEvent = {
  id: string;
  date: string;
  title: string;
  kind: LifeEventKind;
  source: LifeEventSource;
  gardenId?: string | null;
  element?: string | null;
  rating?: number | null;
  mood?: string | null;
  isFavorite?: boolean;
  thumbnailUrl?: string | null;
  coverPhotoUrl?: string | null;
};

export type PageLikeLifeInput = {
  id: string;
  date: string;
  title?: string | null;
  element?: string | null;
  rating?: number | null;
  mood_state?: string | null;
  is_favorite?: boolean | null;
  planned_from_seed_id?: string | null;
  garden_id?: string | null;
  thumbnail_url?: string | null;
  cover_photo_url?: string | null;
};

export type PathLikeLifeInput = {
  id: string;
  date: string;
  title: string;
  kind: "seed" | "sprout" | "flower" | "tree";
  element?: string | null;
  rating?: number | null;
  isFavorite?: boolean;
};

export type PathLikeMetricDetails = {
  rating?: number | null;
  mood?: string | null;
  isFavorite?: boolean;
  isBloomed?: boolean;
};

export type SeedLikeLifeInput = {
  id: string;
  title?: string | null;
  element?: string | null;
  status?: string | null;
  scheduled_date?: string | null;
  bloomed_page_id?: string | null;
  created_at?: string | null;
  garden_id?: string | null;
};

export type UnlockLikeLifeInput = {
  id?: string | null;
  rule_id: string;
  created_at?: string | null;
  unlocked_at?: string | null;
  claimed_at?: string | null;
  garden_id?: string | null;
};

export type RuleMetaLike = {
  id: string;
  title?: string | null;
  tier?: string | null;
  kind?: string | null;
};

function toNonEmptyString(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

export function normalizeIsoDate(value: unknown): string | null {
  const raw = toNonEmptyString(value);
  if (!raw) return null;
  const day = raw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  return day;
}

export function mapPageRowsToLifeEvents<T extends PageLikeLifeInput>(
  rows: T[],
  options?: {
    kind?: LifeEventKind;
    idPrefix?: string;
    titleFallback?: string;
  },
) {
  const kind = options?.kind ?? "flower";
  const idPrefix = toNonEmptyString(options?.idPrefix);
  const titleFallback =
    toNonEmptyString(options?.titleFallback) || "Recuerdo sin título";

  const out: LifeEvent[] = [];
  for (const row of rows ?? []) {
    const idRaw = toNonEmptyString(row.id);
    const date = normalizeIsoDate(row.date);
    if (!idRaw || !date) continue;

    out.push({
      id: idPrefix ? `${idPrefix}-${idRaw}` : idRaw,
      date,
      title: toNonEmptyString(row.title) || titleFallback,
      kind,
      source: {
        entity: "page",
        id: idRaw,
        plannedFromSeedId: row.planned_from_seed_id ?? null,
      },
      gardenId: toNonEmptyString(row.garden_id) || null,
      element: toNonEmptyString(row.element) || null,
      rating: typeof row.rating === "number" ? row.rating : null,
      mood: toNonEmptyString(row.mood_state) || null,
      isFavorite: Boolean(row.is_favorite),
      thumbnailUrl: toNonEmptyString(row.thumbnail_url) || null,
      coverPhotoUrl: toNonEmptyString(row.cover_photo_url) || null,
    });
  }

  return out;
}

export function mapPathEventsToLifeEvents<T extends PathLikeLifeInput>(rows: T[]) {
  const out: LifeEvent[] = [];
  for (const row of rows ?? []) {
    const id = toNonEmptyString(row.id);
    const date = normalizeIsoDate(row.date);
    if (!id || !date) continue;

    out.push({
      id,
      date,
      title: toNonEmptyString(row.title) || "Evento",
      kind: row.kind,
      source: {
        entity: "derived",
        id,
        from: "path",
      },
      element: toNonEmptyString(row.element) || null,
      rating: typeof row.rating === "number" ? row.rating : null,
      isFavorite: Boolean(row.isFavorite),
    });
  }
  return out;
}

export function annualTreeInputFromLifeEvent(
  event: LifeEvent,
  options?: {
    isBloomed?: boolean;
  },
): AnnualTreeEventInput {
  const explicitBloomed = options?.isBloomed;
  return {
    date: event.date,
    rating: typeof event.rating === "number" ? event.rating : null,
    mood: toNonEmptyString(event.mood) || null,
    isBloomed:
      typeof explicitBloomed === "boolean"
        ? explicitBloomed
        : event.kind === "flower" ||
          event.kind === "tree" ||
          event.kind === "milestone" ||
          event.kind === "reward",
    isFavorite: Boolean(event.isFavorite),
  };
}

export function annualTreeInputsFromLifeEvents(
  events: LifeEvent[],
  options?: {
    isBloomed?: boolean;
  },
) {
  return events.map((event) => annualTreeInputFromLifeEvent(event, options));
}

export function annualTreeInputFromPathEvent(
  event: PathLikeLifeInput,
  details?: PathLikeMetricDetails,
): AnnualTreeEventInput {
  return {
    date: normalizeIsoDate(event.date) ?? "1970-01-01",
    rating:
      typeof details?.rating === "number"
        ? details.rating
        : typeof event.rating === "number"
          ? event.rating
          : null,
    mood: toNonEmptyString(details?.mood) || null,
    isBloomed:
      typeof details?.isBloomed === "boolean"
        ? details.isBloomed
        : event.kind === "flower" || event.kind === "tree",
    isFavorite:
      typeof details?.isFavorite === "boolean"
        ? details.isFavorite
        : Boolean(event.isFavorite),
  };
}

export function annualTreeInputsFromPathEvents<T extends PathLikeLifeInput>(
  events: T[],
  options?: {
    resolveDetails?: (event: T) => PathLikeMetricDetails | undefined;
  },
) {
  const out: AnnualTreeEventInput[] = [];
  for (const event of events ?? []) {
    const date = normalizeIsoDate(event.date);
    if (!date) continue;
    const safeEvent = { ...event, date };
    out.push(
      annualTreeInputFromPathEvent(
        safeEvent,
        options?.resolveDetails?.(event),
      ),
    );
  }
  return out;
}

function dateFallbackFromCreatedAt(value: unknown) {
  return normalizeIsoDate(value);
}

export function mapSeedRowsToLifeEvents<T extends SeedLikeLifeInput>(
  rows: T[],
  options?: {
    bloomedStatusCode?: string;
    titleFallback?: string;
    idPrefix?: string;
  },
) {
  const idPrefix = toNonEmptyString(options?.idPrefix);
  const bloomedStatus = toNonEmptyString(options?.bloomedStatusCode).toLowerCase();
  const titleFallback = toNonEmptyString(options?.titleFallback) || "Semilla";

  const out: LifeEvent[] = [];
  for (const row of rows ?? []) {
    const rawId = toNonEmptyString(row.id);
    if (!rawId) continue;

    const scheduledDate = normalizeIsoDate(row.scheduled_date);
    const createdDate = dateFallbackFromCreatedAt(row.created_at);
    const eventDate = scheduledDate ?? createdDate;
    if (!eventDate) continue;

    const status = toNonEmptyString(row.status).toLowerCase();
    const bloomedPageId = toNonEmptyString(row.bloomed_page_id) || null;
    const isBloomed =
      Boolean(bloomedPageId) ||
      (Boolean(status) && Boolean(bloomedStatus) && status === bloomedStatus);

    const kind: LifeEventKind = isBloomed
      ? "flower"
      : scheduledDate
        ? "sprout"
        : "seed";

    out.push({
      id: idPrefix ? `${idPrefix}-${rawId}` : `seed-${rawId}`,
      date: eventDate,
      title: toNonEmptyString(row.title) || titleFallback,
      kind,
      source: {
        entity: "seed",
        id: rawId,
        status: row.status ?? null,
        bloomedPageId,
      },
      gardenId: toNonEmptyString(row.garden_id) || null,
      element: toNonEmptyString(row.element) || null,
      isFavorite: false,
    });
  }

  return out;
}

export function mapUnlockRowsToLifeEvents<T extends UnlockLikeLifeInput>(
  rows: T[],
  ruleMetaById?: Record<string, RuleMetaLike | undefined>,
  options?: {
    titleFallback?: string;
    idPrefix?: string;
  },
) {
  const idPrefix = toNonEmptyString(options?.idPrefix);
  const titleFallback = toNonEmptyString(options?.titleFallback) || "Hito desbloqueado";
  const out: LifeEvent[] = [];

  for (let idx = 0; idx < (rows ?? []).length; idx += 1) {
    const row = rows[idx];
    const ruleId = toNonEmptyString(row.rule_id);
    if (!ruleId) continue;
    const unlockedDate = normalizeIsoDate(row.unlocked_at);
    const createdDate = normalizeIsoDate(row.created_at);
    const eventDate = unlockedDate ?? createdDate;
    if (!eventDate) continue;

    const meta = ruleMetaById?.[ruleId];
    const eventKind: LifeEventKind =
      toNonEmptyString(meta?.kind).toLowerCase() === "reward" ? "reward" : "tree";
    const eventIdRaw =
      toNonEmptyString(row.id) || `${ruleId}-${eventDate}-${idx}`;

    out.push({
      id: idPrefix ? `${idPrefix}-${eventIdRaw}` : `unlock-${eventIdRaw}`,
      date: eventDate,
      title: toNonEmptyString(meta?.title) || titleFallback,
      kind: eventKind,
      source: {
        entity: "unlock",
        id: toNonEmptyString(row.id) || null,
        ruleId,
        tier: toNonEmptyString(meta?.tier) || null,
      },
      gardenId: toNonEmptyString(row.garden_id) || null,
      isFavorite: false,
    });
  }

  return out;
}

export function filterLifeEventsByDateRange(
  events: LifeEvent[],
  from: string,
  to: string,
) {
  const fromDay = normalizeIsoDate(from);
  const toDay = normalizeIsoDate(to);
  if (!fromDay || !toDay) return [...events];
  const [start, end] = fromDay <= toDay ? [fromDay, toDay] : [toDay, fromDay];
  return events.filter((event) => event.date >= start && event.date <= end);
}

export function sortLifeEventsByDate(
  events: LifeEvent[],
  direction: "asc" | "desc" = "desc",
) {
  const sign = direction === "asc" ? 1 : -1;
  return [...events].sort((a, b) => {
    if (a.date !== b.date) return a.date > b.date ? sign : -sign;
    return a.id > b.id ? sign : -sign;
  });
}

export function countLifeEventsByKind(events: LifeEvent[]) {
  const out: Record<LifeEventKind, number> = {
    seed: 0,
    sprout: 0,
    flower: 0,
    tree: 0,
    milestone: 0,
    reward: 0,
    capsule: 0,
    challenge: 0,
  };
  for (const event of events) {
    if (event.kind in out) {
      out[event.kind] += 1;
    }
  }
  return out;
}
