import { supabase } from "@/lib/supabase";
import { isSuperadminRole } from "@/lib/roles";
import { withGardenScope } from "@/lib/gardens";
import { PROGRESSION_GRAPH_DB_KEY } from "@/lib/progressionGraph";
import {
  buildLegacyCompatibleProgressionRules,
  type CanonicalProgressionGraphStateRow,
  type CanonicalProgressionTreeRow,
} from "@/lib/progressionRuntime";
import {
  listClaimedProgressionRewards,
  progressionStickerTokenToSrc,
  type ClaimedProgressionReward,
} from "@/lib/progressionRewardsRuntime";

export type CanvasStickerCatalogItem = {
  id: string;
  key: string;
  label: string;
  src: string;
  category: string | null;
  sortOrder: number;
};

export type CanvasTemplateObjectInput = {
  type: "sticker" | "text" | "photo" | "video";
  x?: number;
  y?: number;
  rotation?: number;
  locked?: boolean;
  src?: string | null;
  scale?: number;
  text?: string;
  width?: number;
  fontSize?: number;
  fill?: string;
  height?: number;
  caption?: string | null;
  washi?: "none" | "top" | "corner";
  stamp?: "none" | "love" | "done";
};

export type CanvasTemplateConfig = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  sortOrder: number;
  objects: CanvasTemplateObjectInput[];
};

type CanvasRewardDrivenTemplateKind =
  | "canvas_tool"
  | "canvas_template"
  | "canvas_effect"
  | "page_frame"
  | "page_background";

type StickerPackItemRow = {
  pack_id: string | null;
  sort_order: number | null;
  sticker:
    | {
        id: string | null;
        key: string | null;
        label: string | null;
        src: string | null;
        category: string | null;
        is_active: boolean | null;
      }
    | Array<{
        id: string | null;
        key: string | null;
        label: string | null;
        src: string | null;
        category: string | null;
        is_active: boolean | null;
      }>
    | null;
};

type StickerPackRow = {
  id: string | null;
  key: string | null;
  is_active: boolean | null;
};

type StickerUnlockRuleRow = {
  pack_id: string | null;
  rule_type: string | null;
  rule_value: string | null;
  enabled: boolean | null;
};

type TemplateRow = {
  id: string | null;
  key: string | null;
  label: string | null;
  description: string | null;
  sort_order: number | null;
  enabled: boolean | null;
};

type TemplateObjectRow = {
  template_id: string | null;
  object_order: number | null;
  object_json: CanvasTemplateObjectInput | null;
  enabled: boolean | null;
};

const FALLBACK_STICKERS: CanvasStickerCatalogItem[] = [
  { id: "fallback-seed", key: "seed", label: "Seed", src: "/stickers/sticker_seed.svg", category: "nature", sortOrder: 10 },
  { id: "fallback-water", key: "water", label: "Water", src: "/stickers/sticker_water.svg", category: "nature", sortOrder: 20 },
  { id: "fallback-fire", key: "fire", label: "Fire", src: "/stickers/sticker_fire.svg", category: "nature", sortOrder: 30 },
  { id: "fallback-sun", key: "sun", label: "Sun", src: "/stickers/sticker_sun.svg", category: "nature", sortOrder: 40 },
  { id: "fallback-leaf", key: "leaf", label: "Leaf", src: "/stickers/sticker_leaf.svg", category: "nature", sortOrder: 50 },
  { id: "fallback-star", key: "star", label: "Star", src: "/stickers/sticker_star.svg", category: "decor", sortOrder: 60 },
  { id: "fallback-heart", key: "heart", label: "Heart", src: "/stickers/sticker_heart.svg", category: "decor", sortOrder: 70 },
  { id: "fallback-rainbow", key: "rainbow", label: "Rainbow", src: "/stickers/sticker_rainbow.svg", category: "decor", sortOrder: 80 },
  { id: "fallback-washi", key: "washi", label: "Washi", src: "/stickers/sticker_washi.svg", category: "paper", sortOrder: 90 },
  { id: "fallback-stamp-done", key: "stamp_done", label: "Stamp Done", src: "/stickers/sticker_stamp_done.svg", category: "stamp", sortOrder: 100 },
  { id: "fallback-stamp-love", key: "stamp_love", label: "Stamp Love", src: "/stickers/sticker_stamp_love.svg", category: "stamp", sortOrder: 110 },
  { id: "fallback-cloud", key: "cloud", label: "Cloud", src: "/stickers/sticker_cloud.svg", category: "nature", sortOrder: 120 },
  { id: "fallback-moon", key: "moon", label: "Moon", src: "/stickers/sticker_moon.svg", category: "nature", sortOrder: 130 },
  { id: "fallback-music", key: "music", label: "Music", src: "/stickers/sticker_music.svg", category: "decor", sortOrder: 140 },
  { id: "fallback-qr", key: "qr", label: "QR", src: "/stickers/sticker_qr.svg", category: "utility", sortOrder: 150 },
  { id: "fallback-map", key: "map", label: "Map", src: "/stickers/sticker_map.svg", category: "utility", sortOrder: 160 },
  { id: "fallback-calendar", key: "calendar", label: "Calendar", src: "/stickers/sticker_calendar.svg", category: "utility", sortOrder: 170 },
];

const FALLBACK_TEMPLATES: CanvasTemplateConfig[] = [
  {
    id: "fallback-moment",
    key: "moment",
    label: "Momento",
    description: "Foto + texto + QR",
    sortOrder: 10,
    objects: [
      {
        type: "photo",
        x: 90,
        y: 70,
        width: 340,
        height: 220,
        rotation: 0,
        src: null,
        caption: "Nuestro momento",
        washi: "top",
        stamp: "love",
        locked: false,
      },
      {
        type: "text",
        x: 90,
        y: 310,
        width: 520,
        fontSize: 26,
        rotation: 0,
        fill: "#1f2937",
        text: "Que paso hoy? (3 lineas bonitas)",
        locked: false,
      },
      {
        type: "sticker",
        src: "/stickers/sticker_qr.svg",
        x: 450,
        y: 90,
        rotation: 0,
        scale: 1,
        locked: false,
      },
    ],
  },
  {
    id: "fallback-date",
    key: "date",
    label: "Fecha especial",
    description: "Composicion para fecha importante",
    sortOrder: 20,
    objects: [
      {
        type: "photo",
        x: 90,
        y: 70,
        width: 340,
        height: 220,
        rotation: 0,
        src: null,
        caption: "Fecha especial",
        washi: "top",
        stamp: "love",
        locked: false,
      },
      {
        type: "text",
        x: 90,
        y: 310,
        width: 520,
        fontSize: 26,
        rotation: 0,
        fill: "#1f2937",
        text: "Título + mini historia + promesa para el futuro",
        locked: false,
      },
      {
        type: "sticker",
        src: "/stickers/sticker_qr.svg",
        x: 450,
        y: 90,
        rotation: 0,
        scale: 1,
        locked: false,
      },
    ],
  },
];

function normalizeStickerRow(
  row: StickerPackItemRow,
): CanvasStickerCatalogItem | null {
  const sticker = Array.isArray(row.sticker)
    ? (row.sticker[0] ?? null)
    : row.sticker;
  if (!sticker) return null;

  const id = String(sticker.id ?? "").trim();
  const key = String(sticker.key ?? "").trim();
  const label = String(sticker.label ?? "").trim();
  const src = String(sticker.src ?? "").trim();

  if (!id || !key || !label || !src) return null;

  return {
    id,
    key,
    label,
    src,
    category: sticker.category ?? null,
    sortOrder: Number.isFinite(row.sort_order) ? Number(row.sort_order) : 999,
  };
}

function normalizeTemplateRow(row: TemplateRow): Omit<CanvasTemplateConfig, "objects"> | null {
  const id = String(row.id ?? "").trim();
  const key = String(row.key ?? "").trim();
  const label = String(row.label ?? "").trim();
  if (!id || !key || !label) return null;

  return {
    id,
    key,
    label,
    description: row.description ?? null,
    sortOrder: Number.isFinite(row.sort_order) ? Number(row.sort_order) : 999,
  };
}

function normalizeTemplateObject(row: TemplateObjectRow): {
  templateId: string;
  objectOrder: number;
  object: CanvasTemplateObjectInput;
} | null {
  const templateId = String(row.template_id ?? "").trim();
  if (!templateId) return null;

  const object = row.object_json;
  if (!object || typeof object !== "object") return null;
  if (
    object.type !== "sticker" &&
    object.type !== "text" &&
    object.type !== "photo" &&
    object.type !== "video"
  ) {
    return null;
  }

  return {
    templateId,
    objectOrder: Number.isFinite(row.object_order) ? Number(row.object_order) : 999,
    object,
  };
}

function stickerSrcByKey(key: string) {
  const normalized = key.trim().toLowerCase();
  const found = FALLBACK_STICKERS.find((item) => item.key === normalized);
  return found?.src ?? progressionStickerTokenToSrc(normalized);
}

function rewardFamilyAccent(reward: ClaimedProgressionReward) {
  const key = String(reward.referenceKey ?? "").toLowerCase();
  if (key.startsWith("intimacy_")) return "#f6dfe9";
  if (key.startsWith("home_")) return "#efe6d8";
  if (key.startsWith("travel_")) return "#ddeaf7";
  if (key.startsWith("celebration_")) return "#fff1c9";
  if (key.startsWith("botanic_")) return "#e3f2dc";
  if (key.startsWith("trail_")) return "#e9f0db";
  if (key.startsWith("forest_")) return "#dff0e8";
  if (key.startsWith("year_")) return "#e9eef9";
  if (key.startsWith("pdf_")) return "#f5eee6";
  return "#f2f5fb";
}

function rewardPrimarySticker(reward: ClaimedProgressionReward) {
  const ref = String(reward.referenceKey ?? "").trim().toLowerCase();
  if (ref.includes("travel")) return stickerSrcByKey("map");
  if (ref.includes("pdf")) return stickerSrcByKey("qr");
  if (ref.includes("year")) return stickerSrcByKey("calendar");
  if (ref.includes("forest")) return stickerSrcByKey("leaf");
  if (ref.includes("home")) return stickerSrcByKey("heart");
  if (ref.includes("intimacy")) return stickerSrcByKey("moon");
  if (ref.includes("celebration")) return stickerSrcByKey("rainbow");
  if (ref.includes("trail")) return stickerSrcByKey("star");
  return stickerSrcByKey("leaf");
}

function rewardSecondarySticker(reward: ClaimedProgressionReward) {
  const ref = String(reward.referenceKey ?? "").trim().toLowerCase();
  if (ref.includes("travel") || ref.includes("trail")) return stickerSrcByKey("calendar");
  if (ref.includes("pdf")) return stickerSrcByKey("map");
  if (ref.includes("year")) return stickerSrcByKey("star");
  if (ref.includes("forest") || ref.includes("botanic")) return stickerSrcByKey("seed");
  if (ref.includes("celebration")) return stickerSrcByKey("star");
  return stickerSrcByKey("heart");
}

function buildRewardTemplateObjects(
  reward: ClaimedProgressionReward,
): CanvasTemplateObjectInput[] {
  const primarySticker = rewardPrimarySticker(reward);
  const secondarySticker = rewardSecondarySticker(reward);
  const accent = rewardFamilyAccent(reward);
  const baseObjects: CanvasTemplateObjectInput[] = [
    {
      type: "photo",
      x: 88,
      y: 74,
      width: 336,
      height: 220,
      rotation: 0,
      src: null,
      caption: reward.title,
      washi: "top",
      stamp: "love",
      locked: false,
    },
    {
      type: "text",
      x: 88,
      y: 314,
      width: 520,
      fontSize: 24,
      rotation: 0,
      fill: "#213047",
      text: reward.description ?? `Desbloqueo ${reward.title}`,
      locked: false,
    },
  ];

  const kind = reward.kind as CanvasRewardDrivenTemplateKind;
  if (kind === "canvas_template") {
    return [
      ...baseObjects,
      { type: "sticker", src: primarySticker, x: 448, y: 82, scale: 1.02, rotation: -6, locked: false },
      { type: "sticker", src: secondarySticker, x: 500, y: 118, scale: 0.88, rotation: 8, locked: false },
    ];
  }
  if (kind === "canvas_effect") {
    return [
      ...baseObjects,
      { type: "sticker", src: stickerSrcByKey("star"), x: 460, y: 86, scale: 0.84, rotation: 0, locked: false },
      { type: "sticker", src: primarySticker, x: 520, y: 126, scale: 0.76, rotation: 14, locked: false },
      { type: "sticker", src: secondarySticker, x: 54, y: 46, scale: 0.76, rotation: -10, locked: false },
    ];
  }
  if (kind === "page_frame") {
    return [
      ...baseObjects,
      { type: "sticker", src: primarySticker, x: 40, y: 38, scale: 0.8, rotation: -8, locked: false },
      { type: "sticker", src: secondarySticker, x: 560, y: 40, scale: 0.8, rotation: 9, locked: false },
      { type: "sticker", src: primarySticker, x: 46, y: 360, scale: 0.8, rotation: 8, locked: false },
      { type: "sticker", src: secondarySticker, x: 560, y: 360, scale: 0.8, rotation: -8, locked: false },
    ];
  }
  if (kind === "page_background") {
    return [
      {
        type: "text",
        x: 72,
        y: 42,
        width: 560,
        fontSize: 30,
        fill: accent,
        text: "FONDO DESBLOQUEADO",
        rotation: 0,
        locked: false,
      },
      ...baseObjects,
      { type: "sticker", src: primarySticker, x: 20, y: 110, scale: 1.18, rotation: -10, locked: false },
      { type: "sticker", src: secondarySticker, x: 540, y: 280, scale: 1.05, rotation: 8, locked: false },
    ];
  }
  return [
    ...baseObjects,
    {
      type: "text",
      x: 438,
      y: 92,
      width: 178,
      fontSize: 18,
      fill: accent,
      text: "NUEVA HERRAMIENTA",
      rotation: 0,
      locked: false,
    },
    { type: "sticker", src: primarySticker, x: 486, y: 146, scale: 0.92, rotation: -4, locked: false },
    { type: "sticker", src: stickerSrcByKey("music"), x: 526, y: 112, scale: 0.68, rotation: 0, locked: false },
  ];
}

function buildRewardDrivenTemplate(
  reward: ClaimedProgressionReward,
  index: number,
): CanvasTemplateConfig | null {
  if (
    reward.kind !== "canvas_tool" &&
    reward.kind !== "canvas_template" &&
    reward.kind !== "canvas_effect" &&
    reward.kind !== "page_frame" &&
    reward.kind !== "page_background"
  ) {
    return null;
  }

  return {
    id: `progression-${reward.unlockId}`,
    key: reward.referenceKey ?? `progression_${reward.rewardId}`,
    label: reward.title,
    description: reward.description ?? "Plantilla desbloqueada desde progression.",
    sortOrder: 9000 + index,
    objects: buildRewardTemplateObjects(reward),
  };
}

export function getFallbackCanvasStickers(): CanvasStickerCatalogItem[] {
  return FALLBACK_STICKERS.map((x) => ({ ...x }));
}

export function getFallbackCanvasTemplates(): CanvasTemplateConfig[] {
  return FALLBACK_TEMPLATES.map((x) => ({
    ...x,
    objects: x.objects.map((obj) => ({ ...obj })),
  }));
}

async function isCurrentUserSuperadmin(): Promise<boolean> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) return false;

    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (error) return false;
    const role = String((data as { role?: string } | null)?.role ?? "");
    return isSuperadminRole(role);
  } catch {
    return false;
  }
}

async function getUnlockedProgressionContext(gardenId?: string | null): Promise<{
  treeIds: Set<string>;
  ranks: Set<string>;
}> {
  const out = {
    treeIds: new Set<string>(),
    ranks: new Set<string>(),
  };

  try {
    const [unlocksRes, treesRes, graphRes] = await Promise.all([
      withGardenScope(
        supabase
          .from("progression_tree_unlocks")
          .select("tree_id"),
        gardenId,
      ),
      supabase
        .from("progression_tree_nodes")
        .select("id,title,rank,enabled"),
      supabase
        .from("progression_graph_state")
        .select("tree_settings")
        .eq("key", PROGRESSION_GRAPH_DB_KEY)
        .maybeSingle(),
    ]);

    if (unlocksRes.error || treesRes.error || graphRes.error) return out;

    const rulesById = buildLegacyCompatibleProgressionRules({
      trees: (((treesRes.data as CanonicalProgressionTreeRow[] | null) ?? []).filter(
        (row) => row.enabled !== false,
      )),
      graphStateRow: (graphRes.data as CanonicalProgressionGraphStateRow | null) ?? null,
    });

    for (const row of ((unlocksRes.data as Array<{ tree_id?: string | null }> | null) ?? [])) {
      const treeId = String(row.tree_id ?? "").trim();
      if (!treeId) continue;
      out.treeIds.add(treeId);
      const rank = String(rulesById[treeId]?.rank ?? "").trim().toLowerCase();
      if (rank) out.ranks.add(rank);
    }

    return out;
  } catch {
    return out;
  }
}

async function resolveUnlockedPackIds(
  packs: StickerPackRow[],
  gardenId?: string | null,
): Promise<Set<string>> {
  const activePackIds = packs
    .map((p) => String(p.id ?? "").trim())
    .filter(Boolean);

  const unlocked = new Set<string>();
  if (!activePackIds.length) return unlocked;

  if (await isCurrentUserSuperadmin()) {
    for (const id of activePackIds) unlocked.add(id);
    return unlocked;
  }

  let rules: StickerUnlockRuleRow[] = [];
  try {
    const { data, error } = await supabase
      .from("sticker_unlock_rules")
      .select("pack_id,rule_type,rule_value,enabled")
      .eq("enabled", true)
      .in("pack_id", activePackIds);

    if (error) {
      for (const id of activePackIds) unlocked.add(id);
      return unlocked;
    }

    rules = (((data as unknown) as StickerUnlockRuleRow[] | null) ?? []).filter(
      (r) => String(r.pack_id ?? "").trim(),
    );
  } catch {
    for (const id of activePackIds) unlocked.add(id);
    return unlocked;
  }

  const grouped = new Map<string, StickerUnlockRuleRow[]>();
  for (const rule of rules) {
    const packId = String(rule.pack_id ?? "").trim();
    if (!packId) continue;
    const list = grouped.get(packId) ?? [];
    list.push(rule);
    grouped.set(packId, list);
  }

  const noRulesPackIds = activePackIds.filter((id) => !grouped.has(id));
  for (const id of noRulesPackIds) unlocked.add(id);

  const needsProgression = rules.some((r) => {
    const t = String(r.rule_type ?? "").trim();
    return t === "progression_tree" || t === "progression_rank";
  });

  const progressionCtx = needsProgression
    ? await getUnlockedProgressionContext(gardenId)
    : { treeIds: new Set<string>(), ranks: new Set<string>() };

  for (const [packId, packRules] of grouped.entries()) {
    for (const rule of packRules) {
      const ruleType = String(rule.rule_type ?? "").trim();
      const ruleValue = String(rule.rule_value ?? "").trim();

      if (ruleType === "always") {
        unlocked.add(packId);
        break;
      }
      if (ruleType === "progression_tree" && ruleValue) {
        if (progressionCtx.treeIds.has(ruleValue)) {
          unlocked.add(packId);
          break;
        }
      }
      if (ruleType === "progression_rank" && ruleValue) {
        if (progressionCtx.ranks.has(ruleValue.toLowerCase())) {
          unlocked.add(packId);
          break;
        }
      }
    }
  }

  return unlocked;
}

export async function getCanvasStickerCatalog(
  gardenId?: string | null,
): Promise<CanvasStickerCatalogItem[]> {
  const fallback = getFallbackCanvasStickers();
  try {
    const { data: packsData, error: packsError } = await supabase
      .from("sticker_packs")
      .select("id,key,is_active")
      .eq("is_active", true);

    if (packsError) return fallback;

    const activePacks = ((packsData as StickerPackRow[] | null) ?? []).filter(
      (p) => String(p.id ?? "").trim(),
    );
    if (!activePacks.length) return fallback;

    const unlockedPackIds = await resolveUnlockedPackIds(activePacks, gardenId);
    const unlockedList = Array.from(unlockedPackIds);
    if (!unlockedList.length) return fallback;

    const { data, error } = await supabase
      .from("sticker_pack_items")
      .select("pack_id,sort_order,sticker:stickers!inner(id,key,label,src,category,is_active)")
      .eq("enabled", true)
      .eq("sticker.is_active", true)
      .in("pack_id", unlockedList)
      .order("sort_order", { ascending: true });

    if (error) return fallback;

    const normalized = (((data as unknown) as StickerPackItemRow[] | null) ?? [])
      .map(normalizeStickerRow)
      .filter(Boolean) as CanvasStickerCatalogItem[];

    if (!normalized.length) return fallback;

    const dedupBySrc = new Map<string, CanvasStickerCatalogItem>();
    for (const item of normalized) {
      if (!dedupBySrc.has(item.src)) dedupBySrc.set(item.src, item);
    }

    return Array.from(dedupBySrc.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  } catch {
    return fallback;
  }
}

export async function getCanvasTemplatesCatalog(
  gardenId?: string | null,
): Promise<CanvasTemplateConfig[]> {
  const fallback = getFallbackCanvasTemplates();
  try {
    const rewardTemplates = (await listClaimedProgressionRewards({
      gardenId,
      kinds: [
        "canvas_tool",
        "canvas_template",
        "canvas_effect",
        "page_frame",
        "page_background",
      ],
    }).catch(() => []))
      .map((reward, index) => buildRewardDrivenTemplate(reward, index))
      .filter((template): template is CanvasTemplateConfig => template !== null);

    const { data: templatesData, error: templatesError } = await supabase
      .from("canvas_templates")
      .select("id,key,label,description,sort_order,enabled")
      .eq("enabled", true)
      .order("sort_order", { ascending: true });

    if (templatesError) {
      return rewardTemplates.length
        ? [...fallback, ...rewardTemplates].sort((a, b) => a.sortOrder - b.sortOrder)
        : fallback;
    }

    const templates = ((templatesData as TemplateRow[] | null) ?? [])
      .map(normalizeTemplateRow)
      .filter(Boolean) as Array<Omit<CanvasTemplateConfig, "objects">>;

    if (!templates.length) {
      return rewardTemplates.length
        ? [...fallback, ...rewardTemplates].sort((a, b) => a.sortOrder - b.sortOrder)
        : fallback;
    }

    const templateIds = templates.map((t) => t.id);

    const { data: objectsData, error: objectsError } = await supabase
      .from("template_objects")
      .select("template_id,object_order,object_json,enabled")
      .in("template_id", templateIds)
      .eq("enabled", true)
      .order("object_order", { ascending: true });

    if (objectsError) {
      return rewardTemplates.length
        ? [...fallback, ...rewardTemplates].sort((a, b) => a.sortOrder - b.sortOrder)
        : fallback;
    }

    const grouped = new Map<string, Array<{ objectOrder: number; object: CanvasTemplateObjectInput }>>();

    for (const row of (objectsData as TemplateObjectRow[] | null) ?? []) {
      const normalized = normalizeTemplateObject(row);
      if (!normalized) continue;
      const list = grouped.get(normalized.templateId) ?? [];
      list.push({ objectOrder: normalized.objectOrder, object: normalized.object });
      grouped.set(normalized.templateId, list);
    }

    const out: CanvasTemplateConfig[] = [];
    for (const template of templates) {
      const objects = (grouped.get(template.id) ?? [])
        .sort((a, b) => a.objectOrder - b.objectOrder)
        .map((x) => ({ ...x.object }));

      if (!objects.length) continue;

      out.push({
        ...template,
        objects,
      });
    }

    const mergedTemplates = [...out, ...rewardTemplates];
    if (!mergedTemplates.length) return fallback;
    return mergedTemplates.sort((a, b) => a.sortOrder - b.sortOrder);
  } catch {
    return fallback;
  }
}



