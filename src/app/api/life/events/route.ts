import { NextResponse } from "next/server";
import {
  isSchemaNotReadyError,
  listGardenMembershipsForUser,
  resolveActiveGardenIdForUser,
  setActiveGardenIdForUser,
  withGardenScope,
} from "@/lib/gardens";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import {
  countLifeEventsByKind,
  filterLifeEventsByDateRange,
  mapPageRowsToLifeEvents,
  mapSeedRowsToLifeEvents,
  mapUnlockRowsToLifeEvents,
  normalizeIsoDate,
  sortLifeEventsByDate,
  type LifeEvent,
  type LifeEventKind,
  type RuleMetaLike,
} from "@/lib/lifeEventModel";
import { PROGRESSION_GRAPH_DB_KEY } from "@/lib/progressionGraph";
import {
  buildLegacyCompatibleProgressionRules,
  buildLegacyCompatibleProgressionUnlocks,
  type CanonicalProgressionGraphStateRow,
  type CanonicalProgressionTreeRow,
  type CanonicalProgressionTreeUnlockRow,
} from "@/lib/progressionRuntime";
import { toErrorMessage } from "@/lib/errorMessage";

type PageRow = {
  id: string;
  title: string | null;
  date: string;
  element: string | null;
  rating: number | null;
  mood_state: string | null;
  is_favorite: boolean | null;
  planned_from_seed_id: string | null;
  garden_id: string | null;
  thumbnail_url: string | null;
  cover_photo_url: string | null;
};

type SeedRow = {
  id: string;
  title: string | null;
  element: string | null;
  status: string | null;
  scheduled_date: string | null;
  bloomed_page_id: string | null;
  created_at: string | null;
  garden_id: string | null;
};

type LifeEventSourceEntity = LifeEvent["source"]["entity"];

const LIFE_EVENT_KINDS: LifeEventKind[] = [
  "seed",
  "sprout",
  "flower",
  "tree",
  "milestone",
  "reward",
  "capsule",
  "challenge",
];

const LIFE_EVENT_SOURCE_ENTITIES: LifeEventSourceEntity[] = [
  "page",
  "seed",
  "unlock",
  "derived",
];

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return Math.trunc(value);
}

function currentYearRange() {
  const year = new Date().getFullYear();
  return {
    from: `${year}-01-01`,
    to: `${year}-12-31`,
    year,
  };
}

// ── URL param helpers (parse once, pass searchParams) ──────────────

function parseRange(sp: URLSearchParams) {
  const yearRaw = Number(sp.get("year"));
  if (Number.isInteger(yearRaw) && yearRaw >= 1970 && yearRaw <= 3000) {
    return {
      from: `${yearRaw}-01-01`,
      to: `${yearRaw}-12-31`,
      year: yearRaw,
    };
  }

  const defaults = currentYearRange();
  const fromRaw = normalizeIsoDate(sp.get("from"));
  const toRaw = normalizeIsoDate(sp.get("to"));
  const from = fromRaw ?? defaults.from;
  const to = toRaw ?? fromRaw ?? defaults.to;
  return from <= to
    ? { from, to, year: Number(from.slice(0, 4)) }
    : { from: to, to: from, year: Number(to.slice(0, 4)) };
}

function parseOrder(sp: URLSearchParams) {
  const raw = sp.get("order");
  return raw === "asc" ? "asc" : "desc";
}

function parseLimit(sp: URLSearchParams) {
  const raw = Number(sp.get("limit"));
  return clampInt(raw, 1, 2000);
}

function parseBooleanParam(
  sp: URLSearchParams,
  key: string,
  defaultValue: boolean,
) {
  const raw = sp.get(key);
  if (!raw) return defaultValue;
  const normalized = raw.trim().toLowerCase();
  if (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on"
  ) {
    return true;
  }
  if (
    normalized === "0" ||
    normalized === "false" ||
    normalized === "no" ||
    normalized === "off"
  ) {
    return false;
  }
  return defaultValue;
}

function parseCsvParam(sp: URLSearchParams, key: string) {
  const raw = sp.get(key);
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function parseKindFilter(sp: URLSearchParams) {
  const input = parseCsvParam(sp, "kinds");
  if (!input.length) return null;
  const allowed = new Set<LifeEventKind>();
  for (const token of input) {
    if (LIFE_EVENT_KINDS.includes(token as LifeEventKind)) {
      allowed.add(token as LifeEventKind);
    }
  }
  return allowed.size ? allowed : null;
}

function parseSourceFilter(sp: URLSearchParams) {
  const input = parseCsvParam(sp, "sources");
  if (!input.length) return null;
  const allowed = new Set<LifeEventSourceEntity>();
  for (const token of input) {
    if (LIFE_EVENT_SOURCE_ENTITIES.includes(token as LifeEventSourceEntity)) {
      allowed.add(token as LifeEventSourceEntity);
    }
  }
  return allowed.size ? allowed : null;
}

export async function GET(req: Request) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  try {
    const memberships = await listGardenMembershipsForUser(
      auth.userId,
      auth.client,
    ).catch((error) => {
      if (isSchemaNotReadyError(error)) return [];
      throw error;
    });

    const allowedGardenIds = memberships.map((item) => item.gardenId);
    if (!allowedGardenIds.length) {
      return NextResponse.json(
        {
          activeGardenId: null,
          range: parseRange(new URL(req.url).searchParams),
          events: [],
          counts: countLifeEventsByKind([]),
          totalsByKind: countLifeEventsByKind([]),
          totalEvents: 0,
          returnedEvents: 0,
        },
        { status: 200 },
      );
    }

    const resolvedGardenId = await resolveActiveGardenIdForUser({
      userId: auth.userId,
      client: auth.client,
    }).catch(() => null);
    const normalizedGardenId =
      resolvedGardenId && allowedGardenIds.includes(resolvedGardenId)
        ? resolvedGardenId
        : allowedGardenIds[0];

    if (normalizedGardenId !== resolvedGardenId) {
      await setActiveGardenIdForUser({
        userId: auth.userId,
        gardenId: normalizedGardenId,
        client: auth.client,
      }).catch(() => {
        // best effort for consistency
      });
    }

    const sp = new URL(req.url).searchParams;
    const { from, to, year } = parseRange(sp);
    const order = parseOrder(sp);
    const limit = parseLimit(sp);
    const dedupeBloomedPages = parseBooleanParam(
      sp,
      "dedupeBloomedPages",
      true,
    );
    const allowedKinds = parseKindFilter(sp);
    const allowedSources = parseSourceFilter(sp);
    const fromTs = `${from}T00:00:00`;
    const toTs = `${to}T23:59:59.999`;

    // Single seeds query: fetch seeds where created_at OR scheduled_date
    // falls within the range. This replaces two separate queries + Map dedup.
    const [
      pagesRes,
      seedsRes,
      progressionUnlocksRes,
      progressionTreesRes,
      progressionGraphRes,
    ] =
      await Promise.all([
        withGardenScope(
          auth.client
            .from("pages")
            .select(
              "id,title,date,element,rating,mood_state,is_favorite,planned_from_seed_id,garden_id,thumbnail_url,cover_photo_url",
            )
            .gte("date", from)
            .lte("date", to),
          normalizedGardenId,
        ),
        withGardenScope(
          auth.client
            .from("seeds")
            .select(
              "id,title,element,status,scheduled_date,bloomed_page_id,created_at,garden_id",
            )
            .or(
              `and(created_at.gte.${fromTs},created_at.lte.${toTs}),and(scheduled_date.gte.${from},scheduled_date.lte.${to})`,
            ),
          normalizedGardenId,
        ),
        withGardenScope(
          auth.client
            .from("progression_tree_unlocks")
            .select("id,tree_id,unlocked_at,claimed_at")
            .gte("unlocked_at", fromTs)
            .lte("unlocked_at", toTs),
          normalizedGardenId,
        ),
        auth.client
          .from("progression_tree_nodes")
          .select("id,title,rank,enabled"),
        auth.client
          .from("progression_graph_state")
          .select("tree_settings")
          .eq("key", PROGRESSION_GRAPH_DB_KEY)
          .maybeSingle(),
      ]);

    const progressionBlocking =
      progressionUnlocksRes.error && !isSchemaNotReadyError(progressionUnlocksRes.error)
        ? progressionUnlocksRes.error
        : progressionTreesRes.error && !isSchemaNotReadyError(progressionTreesRes.error)
          ? progressionTreesRes.error
          : progressionGraphRes.error && !isSchemaNotReadyError(progressionGraphRes.error)
            ? progressionGraphRes.error
            : null;
    const firstError =
      pagesRes.error ??
      seedsRes.error ??
      progressionBlocking;
    if (firstError) {
      return NextResponse.json(
        {
          error: toErrorMessage(firstError, "No se pudieron cargar eventos de vida."),
        },
        { status: 500 },
      );
    }

    const pages = ((pagesRes.data as PageRow[] | null) ?? []);
    const seeds = ((seedsRes.data as SeedRow[] | null) ?? []);
    const progressionRules = buildLegacyCompatibleProgressionRules({
      trees:
        progressionBlocking || progressionTreesRes.error
          ? []
          : (((progressionTreesRes.data as CanonicalProgressionTreeRow[] | null) ?? []).filter(
              (row) => row.enabled !== false,
            )),
      graphStateRow:
        progressionBlocking || progressionGraphRes.error
          ? null
          : ((progressionGraphRes.data as CanonicalProgressionGraphStateRow | null) ?? null),
    });
    const unlocks = progressionBlocking
      ? []
      : buildLegacyCompatibleProgressionUnlocks(
          ((progressionUnlocksRes.data as CanonicalProgressionTreeUnlockRow[] | null) ?? []).map(
            (row) => ({
              id: row.id ?? null,
              tree_id: row.tree_id,
              unlocked_at: row.unlocked_at,
              claimed_at: row.claimed_at,
            }),
          ),
        );
    const rulesById: Record<string, RuleMetaLike | undefined> = Object.fromEntries(
      Object.values(progressionRules).map((rule) => [
        rule.id,
        {
          id: rule.id,
          title: rule.title,
          tier: rule.tier,
          kind: "progression_tree",
        } satisfies RuleMetaLike,
      ]),
    );

    const seedEvents = mapSeedRowsToLifeEvents(seeds, {
      bloomedStatusCode: "bloomed",
      idPrefix: "life-seed",
      titleFallback: "Semilla",
    });

    const seededPageIds = new Set<string>();
    for (const event of seedEvents) {
      if (event.kind !== "flower" || event.source.entity !== "seed") continue;
      const pageId = String(event.source.bloomedPageId ?? "").trim();
      if (pageId) seededPageIds.add(pageId);
    }

    let pageEvents = mapPageRowsToLifeEvents(pages, {
      kind: "flower",
      idPrefix: "life-page",
      titleFallback: "Recuerdo",
    });
    if (dedupeBloomedPages) {
      pageEvents = pageEvents.filter((event) => {
        if (event.source.entity !== "page") return true;
        return !seededPageIds.has(event.source.id);
      });
    }

    const unlockEvents = mapUnlockRowsToLifeEvents(unlocks, rulesById, {
      idPrefix: "life-unlock",
      titleFallback: "Árbol de hito",
    });

    const merged = [...seedEvents, ...pageEvents, ...unlockEvents].filter(
      (event) => {
        if (allowedKinds && !allowedKinds.has(event.kind)) return false;
        if (allowedSources && !allowedSources.has(event.source.entity)) {
          return false;
        }
        return true;
      },
    );
    const inRange = filterLifeEventsByDateRange(merged, from, to);
    const sorted = sortLifeEventsByDate(inRange, order);
    const totalsByKind = countLifeEventsByKind(sorted);
    const events = sorted.slice(0, limit);
    const counts = countLifeEventsByKind(events);

    return NextResponse.json({
      activeGardenId: normalizedGardenId,
      range: { from, to, year },
      order,
      limit,
      filters: {
        dedupeBloomedPages,
        kinds: allowedKinds ? [...allowedKinds] : null,
        sources: allowedSources ? [...allowedSources] : null,
      },
      totalEvents: sorted.length,
      returnedEvents: events.length,
      totalsByKind,
      counts,
      events,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: toErrorMessage(
          error,
          "No se pudieron cargar eventos de vida.",
        ),
      },
      { status: 500 },
    );
  }
}
