import {
  PROGRESSION_TREE_PRESETS,
  type ProgressionRewardKind,
} from "@/lib/progressionBlueprintCatalog";
import {
  PROGRESSION_REWARD_KIND_LABELS_V1 as PROGRESSION_REWARD_KIND_LABELS,
  PROGRESSION_REWARD_TEMPLATES_V1 as PROGRESSION_REWARD_TEMPLATES,
} from "@/lib/progressionRewardsV1";
import {
  PROGRESSION_CONDITION_TEMPLATES,
  type ProgressionConditionTemplate,
} from "@/lib/progressionCatalog";
import type { ProgressionRelationMode, ProgressionTreeImportance } from "@/lib/progressionGraph";
import {
  defaultProgressionTreeRankForImportance,
  defaultProgressionTreeRarityForIndex,
  normalizeProgressionLeafVariant,
  normalizeProgressionTreeRank,
  normalizeProgressionTreeRarity,
  type ProgressionTreeRank,
  type ProgressionTreeRarity,
} from "@/lib/progressionTreeVisuals";

export type ProgressionTreeRow = {
  id: string;
  code: string;
  title: string;
  description: string;
  preset_id: string | null;
  asset_key: string | null;
  accent_color: string | null;
  rank?: ProgressionTreeRank | null;
  rarity?: ProgressionTreeRarity | null;
  leaf_variant?: number | null;
  enabled: boolean;
  milestone_number?: number;
  message?: string | null;
  icon?: string | null;
};

export type ProgressionConditionRow = {
  id: string;
  code: string;
  title: string;
  description: string;
  template_id: string | null;
  narrative_seed: string | null;
  enabled: boolean;
  kind?: string | null;
  threshold?: number;
  tier?: string | null;
  default_reward_id?: string | null;
};

export type ProgressionRewardRow = {
  id: string;
  code: string;
  kind: ProgressionRewardKind;
  title: string;
  description: string;
  preset_id: string | null;
  reference_key: string | null;
  payload: Record<string, unknown> | null;
  enabled: boolean;
};

export type ProgressionTreeDraft = {
  code: string;
  title: string;
  description: string;
  presetId: string;
  assetKey: string;
  accentColor: string;
  rank: ProgressionTreeRank;
  rarity: ProgressionTreeRarity;
  leafVariant: number;
  enabled: boolean;
};

export type ProgressionConditionDraft = {
  code: string;
  title: string;
  description: string;
  templateId: string;
  narrativeSeed: string;
  enabled: boolean;
};

export type ProgressionRewardDraft = {
  code: string;
  kind: ProgressionRewardKind;
  title: string;
  description: string;
  presetId: string;
  referenceKey: string;
  itemsCsv: string;
  enabled: boolean;
};

export type CanonicalProgressionSeedBundle = {
  trees: Array<
    Omit<ProgressionTreeRow, "id"> & {
      preset_id: string;
      importance: ProgressionTreeImportance;
      rank: ProgressionTreeRank;
      rarity: ProgressionTreeRarity;
      leaf_variant: number;
    }
  >;
  conditions: Array<
    Omit<ProgressionConditionRow, "id"> & {
      template_id: string;
    }
  >;
  rewards: Array<
    Omit<ProgressionRewardRow, "id"> & {
      preset_id: string;
      relationMode: ProgressionRelationMode;
    }
  >;
};

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

export function labelProgressionRewardKind(kind: ProgressionRewardKind) {
  return PROGRESSION_REWARD_KIND_LABELS[kind] ?? kind;
}

export function firstTreePresetId() {
  return PROGRESSION_TREE_PRESETS[0]?.id ?? "";
}

export function firstConditionTemplateId() {
  return PROGRESSION_CONDITION_TEMPLATES[0]?.id ?? "";
}

export function firstRewardPresetId() {
  return PROGRESSION_REWARD_TEMPLATES[0]?.id ?? "";
}

export function defaultTreeDraft(): ProgressionTreeDraft {
  const preset = PROGRESSION_TREE_PRESETS[0];
  const importance = preset?.suggestedImportance ?? "importante";
  return {
    code: preset ? `tree_${preset.id}` : "",
    title: preset?.title ?? "",
    description: preset?.description ?? "",
    presetId: preset?.id ?? "",
    assetKey: preset?.assetKey ?? "",
    accentColor: preset?.accentColor ?? "",
    rank: defaultProgressionTreeRankForImportance(importance),
    rarity: "common",
    leafVariant: 0,
    enabled: true,
  };
}

export function defaultConditionDraft(): ProgressionConditionDraft {
  const template = PROGRESSION_CONDITION_TEMPLATES[0];
  return {
    code: template ? `condition_${template.id}` : "",
    title: template?.title ?? "",
    description: template?.description ?? "",
    templateId: template?.id ?? "",
    narrativeSeed: template?.narrativeSeed ?? "",
    enabled: true,
  };
}

export function defaultRewardDraft(): ProgressionRewardDraft {
  const preset = PROGRESSION_REWARD_TEMPLATES[0];
  return {
    code: preset ? `reward_${preset.id}` : "",
    kind: preset?.kind ?? "message",
    title: preset?.title ?? "",
    description: preset?.description ?? "",
    presetId: preset?.id ?? "",
    referenceKey: preset?.referenceHint ?? "",
    itemsCsv: readPayloadItemsCsv(preset?.payloadSeed ?? null),
    enabled: true,
  };
}

export function buildTreeDraftFromRow(row: ProgressionTreeRow | null): ProgressionTreeDraft {
  if (!row) return defaultTreeDraft();
  return {
    code: row.code,
    title: row.title,
    description: row.description,
    presetId: row.preset_id ?? "",
    assetKey: row.asset_key ?? "",
    accentColor: row.accent_color ?? "",
    rank: normalizeProgressionTreeRank(row.rank),
    rarity: normalizeProgressionTreeRarity(row.rarity),
    leafVariant: normalizeProgressionLeafVariant(row.leaf_variant),
    enabled: row.enabled,
  };
}

export function buildConditionDraftFromRow(
  row: ProgressionConditionRow | null,
): ProgressionConditionDraft {
  if (!row) return defaultConditionDraft();
  return {
    code: row.code,
    title: row.title,
    description: row.description,
    templateId: row.template_id ?? firstConditionTemplateId(),
    narrativeSeed: row.narrative_seed ?? "",
    enabled: row.enabled,
  };
}

export function buildRewardDraftFromRow(
  row: ProgressionRewardRow | null,
): ProgressionRewardDraft {
  if (!row) return defaultRewardDraft();
  return {
    code: row.code,
    kind: row.kind,
    title: row.title,
    description: row.description,
    presetId: row.preset_id ?? "",
    referenceKey: row.reference_key ?? "",
    itemsCsv: readPayloadItemsCsv(row.payload),
    enabled: row.enabled,
  };
}

export function applyTreePresetToDraft(
  presetId: string,
  current: ProgressionTreeDraft,
) {
  const preset = PROGRESSION_TREE_PRESETS.find((entry) => entry.id === presetId);
  if (!preset) return current;
  return {
    ...current,
    code: current.code.trim() ? current.code : `tree_${preset.id}`,
    title: preset.title,
    description: preset.description,
    presetId: preset.id,
    assetKey: preset.assetKey,
    accentColor: preset.accentColor,
    rank: current.rank || defaultProgressionTreeRankForImportance(preset.suggestedImportance),
  };
}

export function applyConditionTemplateToDraft(
  templateId: string,
  current: ProgressionConditionDraft,
) {
  const template = PROGRESSION_CONDITION_TEMPLATES.find(
    (entry) => entry.id === templateId,
  );
  if (!template) return current;
  return {
    ...current,
    code: current.code.trim() ? current.code : `condition_${template.id}`,
    title: template.title,
    description: template.description,
    templateId: template.id,
    narrativeSeed: template.narrativeSeed,
  };
}

export function applyRewardTemplateToDraft(
  presetId: string,
  current: ProgressionRewardDraft,
) {
  const preset = PROGRESSION_REWARD_TEMPLATES.find((entry) => entry.id === presetId);
  if (!preset) return current;
  return {
    ...current,
    code: current.code.trim() ? current.code : `reward_${preset.id}`,
    kind: preset.kind,
    title: preset.title,
    description: preset.description,
    presetId: preset.id,
    referenceKey: preset.referenceHint,
    itemsCsv: readPayloadItemsCsv(preset.payloadSeed),
  };
}

export function treePresetById(presetId: string | null | undefined) {
  return PROGRESSION_TREE_PRESETS.find((entry) => entry.id === presetId) ?? null;
}

export function conditionTemplateById(templateId: string | null | undefined) {
  return (
    PROGRESSION_CONDITION_TEMPLATES.find((entry) => entry.id === templateId) ?? null
  );
}

export function rewardTemplateById(presetId: string | null | undefined) {
  return PROGRESSION_REWARD_TEMPLATES.find((entry) => entry.id === presetId) ?? null;
}

export function buildTreeInsertPayload(draft: ProgressionTreeDraft) {
  const code = draft.code.trim() || slugify(draft.title) || `tree_${Date.now()}`;
  return {
    code,
    title: draft.title.trim() || "Árbol sin título",
    description: draft.description.trim(),
    preset_id: draft.presetId || null,
    asset_key: draft.assetKey.trim() || null,
    accent_color: draft.accentColor.trim() || null,
    rank: draft.rank,
    rarity: draft.rarity,
    leaf_variant: normalizeProgressionLeafVariant(draft.leafVariant),
    enabled: draft.enabled,
  };
}

export function buildConditionInsertPayload(draft: ProgressionConditionDraft) {
  const code =
    draft.code.trim() || slugify(draft.title) || `condition_${Date.now()}`;
  return {
    code,
    title: draft.title.trim() || "Condicion sin título",
    description: draft.description.trim(),
    template_id: draft.templateId || null,
    narrative_seed: draft.narrativeSeed.trim() || null,
    enabled: draft.enabled,
  };
}

export function buildRewardInsertPayload(draft: ProgressionRewardDraft) {
  const code = draft.code.trim() || slugify(draft.title) || `reward_${Date.now()}`;
  return {
    code,
    kind: draft.kind,
    title: draft.title.trim() || "Reward sin título",
    description: draft.description.trim(),
    preset_id: draft.presetId || null,
    reference_key: draft.referenceKey.trim() || null,
    payload: buildRewardPayload(draft.kind, draft.description, draft.referenceKey, draft.itemsCsv),
    enabled: draft.enabled,
  };
}

export function buildRewardPayload(
  kind: ProgressionRewardKind,
  description: string,
  referenceKey: string,
  itemsCsv: string,
) {
  const items = itemsCsv
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (kind === "message") {
    return {
      text: description.trim() || "Mensaje desbloqueado",
    };
  }

  if (kind === "gift") {
    return {
      description: description.trim() || "Regalo desbloqueado",
    };
  }

  if (kind === "sticker_pack") {
    return {
      packName: referenceKey.trim() || "Pack desbloqueado",
      stickers: items,
    };
  }

  return {
    description: description.trim(),
    referenceKey: referenceKey.trim(),
    items,
    unlock: kind,
  };
}

export function readPayloadItemsCsv(payload: Record<string, unknown> | null) {
  if (!payload || typeof payload !== "object") return "";
  const stickers = payload.stickers;
  if (Array.isArray(stickers)) {
    return stickers.map(String).join(", ");
  }
  const items = payload.items;
  if (Array.isArray(items)) {
    return items.map(String).join(", ");
  }
  return "";
}

export function buildCanonicalProgressionSeedBundle(): CanonicalProgressionSeedBundle {
  return {
    trees: PROGRESSION_TREE_PRESETS.map((preset, index) => ({
      code: `tree_${preset.id}`,
      title: preset.title,
      description: preset.description,
      preset_id: preset.id,
      asset_key: preset.assetKey,
      accent_color: preset.accentColor,
      enabled: true,
      importance: preset.suggestedImportance,
      rank: defaultProgressionTreeRankForImportance(preset.suggestedImportance),
      rarity: defaultProgressionTreeRarityForIndex(index),
      leaf_variant: index % 100,
    })),
    conditions: PROGRESSION_CONDITION_TEMPLATES.map((template) => ({
      code: `condition_${template.id}`,
      title: template.title,
      description: template.description,
      template_id: template.id,
      narrative_seed: template.narrativeSeed,
      enabled: true,
    })),
    rewards: PROGRESSION_REWARD_TEMPLATES.map((preset) => ({
      code: `reward_${preset.id}`,
      kind: preset.kind,
      title: preset.title,
      description: preset.description,
      preset_id: preset.id,
      reference_key: preset.referenceHint,
      payload: preset.payloadSeed,
      enabled: true,
      relationMode:
        preset.kind === "message" || preset.kind === "gift" ? "or" : "and",
    })),
  };
}

export function inferConditionTemplate(
  row: ProgressionConditionRow,
  fallbackId?: string | null,
): ProgressionConditionTemplate | null {
  const id = row.template_id ?? fallbackId ?? null;
  return id ? conditionTemplateById(id) : null;
}
