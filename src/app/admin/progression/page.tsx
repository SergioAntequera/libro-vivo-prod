"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { ProgressionGraphCanvas } from "@/components/admin/ProgressionGraphCanvas";
import { ensureSuperadminOrRedirect } from "@/lib/auth";
import {
  buildProgressionValidationIssues,
  type ProgressionValidationIssue,
} from "@/lib/adminDiagnostics";
import {
  getDefaultValidationRules,
  loadValidationRulesForDomain,
  type ValidationRuleDefinition,
} from "@/lib/adminValidationRules";
import { getHomeTrailRuntimeConfig } from "@/lib/homeTrailCatalog";
import type { SceneRegion } from "@/lib/homeSceneRegions";
import {
  PROGRESSION_CONDITION_CATEGORY_LABELS,
  PROGRESSION_CONDITION_TEMPLATES,
} from "@/lib/progressionCatalog";
import {
  labelProgressionRewardKind,
  buildCanonicalProgressionSeedBundle,
  buildConditionDraftFromRow,
  buildConditionInsertPayload,
  buildRewardDraftFromRow,
  buildRewardInsertPayload,
  buildTreeDraftFromRow,
  buildTreeInsertPayload,
  applyConditionTemplateToDraft,
  applyRewardTemplateToDraft,
  applyTreePresetToDraft,
  conditionTemplateById,
  defaultConditionDraft,
  defaultRewardDraft,
  defaultTreeDraft,
  rewardTemplateById,
  treePresetById,
  type ProgressionConditionDraft,
  type ProgressionConditionRow,
  type ProgressionRewardDraft,
  type ProgressionRewardRow,
  type ProgressionTreeDraft,
  type ProgressionTreeRow,
} from "@/lib/progressionDomain";
import {
  PROGRESSION_TREE_PRESETS,
} from "@/lib/progressionBlueprintCatalog";
import { PROGRESSION_REWARD_TEMPLATES_V1 as PROGRESSION_REWARD_TEMPLATES } from "@/lib/progressionRewardsV1";
import {
  EMPTY_PROGRESSION_GRAPH_DRAFT,
  PROGRESSION_GRAPH_DB_KEY,
  buildProgressionGraphLinkId,
  canLinkProgressionNodes,
  defaultProgressionGraphPosition,
  makeProgressionGraphNodeKey,
  normalizeProgressionGraphDraft,
  splitProgressionGraphNodeKey,
  type ProgressionGraphCanvasNode,
  type ProgressionGraphDraft,
  type ProgressionRelationMode,
  type ProgressionTreeImportance,
} from "@/lib/progressionGraph";
import { supabase } from "@/lib/supabase";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { ProgressionMilestoneTree } from "@/components/shared/ProgressionMilestoneTree";
import {
  PROGRESSION_TREE_RANK_OPTIONS,
  PROGRESSION_TREE_RARITY_OPTIONS,
  defaultProgressionTreeRankForImportance,
  normalizeProgressionLeafVariant,
} from "@/lib/progressionTreeVisuals";

type ProgressionPanel = "tree" | "conditions" | "rewards" | "validation";
type ProgressionViewMode = "canvas" | "list";
type ProgressionPanelDrag = {
  panel: ProgressionPanel;
  startClientX: number;
  startClientY: number;
  startOffsetX: number;
  startOffsetY: number;
};

type ProgressionGraphStateTableRow = {
  key: string;
  positions: unknown;
  links: unknown;
  relation_modes: unknown;
  tree_settings: unknown;
  condition_settings: unknown;
};

type TrailMilestoneRegionOption = {
  id: string;
  label: string;
  hint: string;
};

const fieldLabelClass = "font-medium text-[var(--lv-text)]";
const fieldControlClass =
  "w-full rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-3 text-[var(--lv-text)] shadow-[var(--lv-shadow-sm)]";
const textareaControlClass = `min-h-[120px] ${fieldControlClass}`;
const secondaryButtonClass =
  "rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-[var(--lv-text)] shadow-[var(--lv-shadow-sm)]";
const primaryButtonClass =
  "rounded-[20px] bg-[var(--lv-primary)] px-4 py-2 text-white shadow-[var(--lv-shadow-sm)]";
const tertiaryButtonClass =
  "rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-[var(--lv-text)] shadow-[var(--lv-shadow-sm)]";
const rewardKindOptions = Array.from(
  new Map(
    PROGRESSION_REWARD_TEMPLATES.map((template) => [
      template.kind,
      labelProgressionRewardKind(template.kind),
    ]),
  ).entries(),
);

function labelGraphNodeKind(kind: "condition" | "tree" | "reward") {
  if (kind === "condition") return "Condicion";
  if (kind === "tree") return "Árbol";
  return "Reward";
}

function parseCsvList(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function labelAchievementKind(_kind?: string | null) {
  return "Condicion narrativa";
}

function labelRewardKind(kind: Parameters<typeof labelProgressionRewardKind>[0]) {
  return labelProgressionRewardKind(kind);
}

function buildGraphDraftFromTableRow(row: ProgressionGraphStateTableRow | null) {
  if (!row) return EMPTY_PROGRESSION_GRAPH_DRAFT;
  return normalizeProgressionGraphDraft({
    positions: row.positions,
    links: row.links,
    relationModes: row.relation_modes,
    treeSettings: row.tree_settings,
    conditionSettings: row.condition_settings,
  });
}

function buildGraphTablePayload(draft: ProgressionGraphDraft) {
  return {
    key: PROGRESSION_GRAPH_DB_KEY,
    positions: draft.positions,
    links: draft.links,
    relation_modes: draft.relationModes,
    tree_settings: draft.treeSettings,
    condition_settings: draft.conditionSettings,
  };
}

function togglePanel<T extends string>(current: T | null, next: T) {
  return current === next ? null : next;
}

function ToolbarButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-5 py-2.5 text-base transition ${
        active
          ? "border-[var(--lv-primary)] bg-[var(--lv-primary-soft)] text-[var(--lv-primary-strong)]"
          : "border-[var(--lv-border)] bg-[var(--lv-surface)] text-[var(--lv-text)] hover:bg-[var(--lv-surface-soft)]"
      }`}
    >
      {children}
    </button>
  );
}

function FloatingInspector({
  title,
  description,
  actions,
  onClose,
  onHeaderPointerDown,
  style,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  onClose: () => void;
  onHeaderPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div className="absolute right-4 top-24 z-20 w-[460px] max-w-[calc(100%-2rem)] overflow-hidden rounded-[30px] border border-[var(--lv-border)] bg-[rgba(255,255,255,0.96)] shadow-[0_30px_80px_rgba(24,36,26,0.16)] backdrop-blur" style={style}>
      <div className="cursor-move border-b border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-4 py-3" onPointerDown={onHeaderPointerDown}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-[var(--lv-text)]">{title}</div>
            {description ? <div className="mt-1 text-xs leading-6 text-[var(--lv-text-muted)]">{description}</div> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-1.5 text-xs text-[var(--lv-text)]">
            Cerrar
          </button>
        </div>
        {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="max-h-[calc(100dvh-220px)] overflow-auto p-4">{children}</div>
    </div>
  );
}

export default function AdminProgressionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<ProgressionPanel | null>(null);
  const [panelDrag, setPanelDrag] = useState<ProgressionPanelDrag | null>(null);
  const [panelOffsets, setPanelOffsets] = useState<Record<ProgressionPanel, { x: number; y: number }>>({
    tree: { x: 0, y: 0 },
    conditions: { x: 0, y: 0 },
    rewards: { x: 0, y: 0 },
    validation: { x: 0, y: 0 },
  });
  const [timelineRules, setTimelineRules] = useState<ProgressionTreeRow[]>([]);
  const [achievementRules, setAchievementRules] = useState<ProgressionConditionRow[]>([]);
  const [rewards, setRewards] = useState<ProgressionRewardRow[]>([]);
  const [selectedTimelineRuleId, setSelectedTimelineRuleId] = useState<string | null>(null);
  const [selectedAchievementRuleId, setSelectedAchievementRuleId] = useState<string | null>(null);
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);
  const [timelineDraft, setTimelineDraft] = useState<ProgressionTreeDraft>(defaultTreeDraft);
  const [achievementDraft, setAchievementDraft] =
    useState<ProgressionConditionDraft>(defaultConditionDraft);
  const [rewardDraft, setRewardDraft] =
    useState<ProgressionRewardDraft>(defaultRewardDraft);
  const [validationRules, setValidationRules] = useState<ValidationRuleDefinition[]>(
    () => getDefaultValidationRules("progression"),
  );
  const [trailMilestoneRegions, setTrailMilestoneRegions] = useState<TrailMilestoneRegionOption[]>([]);
  const [trailRegions, setTrailRegions] = useState<SceneRegion[]>([]);
  const [graphDraft, setGraphDraft] = useState<ProgressionGraphDraft>(EMPTY_PROGRESSION_GRAPH_DRAFT);
  const [graphHydrated, setGraphHydrated] = useState(false);
  const [linkingSourceKey, setLinkingSourceKey] = useState<string | null>(null);
  const [fitContentSignal, setFitContentSignal] = useState(0);
  const [viewMode, setViewMode] = useState<ProgressionViewMode>("canvas");
  const [linkSearch, setLinkSearch] = useState("");
  const [linkSourceKindFilter, setLinkSourceKindFilter] =
    useState<"all" | "condition" | "tree" | "reward">("all");
  const [linkTargetKindFilter, setLinkTargetKindFilter] =
    useState<"all" | "condition" | "tree" | "reward">("all");
  const [pendingDeleteTimelineRule, setPendingDeleteTimelineRule] = useState<ProgressionTreeRow | null>(null);
  const [pendingDeleteAchievementRule, setPendingDeleteAchievementRule] = useState<ProgressionConditionRow | null>(null);
  const [pendingDeleteReward, setPendingDeleteReward] = useState<ProgressionRewardRow | null>(null);
  const graphSaveTimeoutRef = useRef<number | null>(null);

  const selectedTimelineRule = useMemo(() => timelineRules.find((rule) => rule.id === selectedTimelineRuleId) ?? null, [timelineRules, selectedTimelineRuleId]);
  const selectedAchievementRule = useMemo(() => achievementRules.find((rule) => rule.id === selectedAchievementRuleId) ?? null, [achievementRules, selectedAchievementRuleId]);
  const selectedReward = useMemo(() => rewards.find((reward) => reward.id === selectedRewardId) ?? null, [rewards, selectedRewardId]);
  const rewardUsage = useMemo(() => {
    const map = new Map<string, number>();
    for (const link of graphDraft.links) {
      const target = splitProgressionGraphNodeKey(link.target);
      if (target.kind !== "reward") continue;
      map.set(target.entityId, (map.get(target.entityId) ?? 0) + 1);
    }
    return map;
  }, [graphDraft.links]);
  const trailRegionLabelById = useMemo(() => new Map(trailMilestoneRegions.map((region) => [region.id, region.label])), [trailMilestoneRegions]);
  const graphNodes = useMemo<ProgressionGraphCanvasNode[]>(() => {
    const conditionNodes = achievementRules.map((rule) => {
      const nodeKey = makeProgressionGraphNodeKey("condition", rule.id);
      const templateId = graphDraft.conditionSettings[nodeKey]?.templateId ?? "";
      const template = PROGRESSION_CONDITION_TEMPLATES.find((entry) => entry.id === templateId);
      return { key: nodeKey, entityId: rule.id, kind: "condition" as const, title: rule.title, subtitle: template?.title ?? labelAchievementKind(rule.kind), meta: template?.description ?? rule.description ?? undefined, selected: selectedAchievementRuleId === rule.id };
    });
    const treeNodes = timelineRules.map((rule) => {
      const nodeKey = makeProgressionGraphNodeKey("tree", rule.id);
      const settings = graphDraft.treeSettings[nodeKey];
      const regionLabel = settings?.regionId ? trailRegionLabelById.get(settings.regionId) : null;
      const importance = settings?.importance ?? "importante";
      return { key: nodeKey, entityId: rule.id, kind: "tree" as const, title: rule.title, subtitle: regionLabel ?? `Paso ${rule.milestone_number}`, meta: `${importance.toUpperCase()} · ${rule.enabled ? "visible" : "oculto"}`, accentColor: rule.accent_color, selected: selectedTimelineRuleId === rule.id };
    });
    const rewardNodes = rewards.map((reward) => ({
      key: makeProgressionGraphNodeKey("reward", reward.id),
      entityId: reward.id,
      kind: "reward" as const,
      title: reward.title,
      subtitle: labelRewardKind(reward.kind),
      meta: `${rewardUsage.get(reward.id) ?? 0} hitos la usan`,
      selected: selectedRewardId === reward.id,
    }));
    return [...conditionNodes, ...treeNodes, ...rewardNodes];
  }, [achievementRules, graphDraft.conditionSettings, graphDraft.treeSettings, rewardUsage, rewards, selectedAchievementRuleId, selectedRewardId, selectedTimelineRuleId, timelineRules, trailRegionLabelById]);
  const graphCanvasNodes = useMemo<ProgressionGraphCanvasNode[]>(() => {
    const conditionNodes = achievementRules.map((rule) => {
      const nodeKey = makeProgressionGraphNodeKey("condition", rule.id);
      const templateId =
        graphDraft.conditionSettings[nodeKey]?.templateId ?? rule.template_id ?? "";
      const template = conditionTemplateById(templateId) ?? PROGRESSION_CONDITION_TEMPLATES[0];
      return {
        key: nodeKey,
        entityId: rule.id,
        kind: "condition" as const,
        title: rule.title,
        subtitle: template?.title ?? "Condicion narrativa",
        meta: template?.description ?? rule.description ?? undefined,
        selected: selectedAchievementRuleId === rule.id,
      };
    });
    const treeNodes = timelineRules.map((rule) => {
      const nodeKey = makeProgressionGraphNodeKey("tree", rule.id);
      const settings = graphDraft.treeSettings[nodeKey];
      const regionLabel = settings?.regionId ? trailRegionLabelById.get(settings.regionId) : null;
      const importance = settings?.importance ?? "importante";
      return {
        key: nodeKey,
        entityId: rule.id,
        kind: "tree" as const,
        title: rule.title,
        subtitle: regionLabel ?? (rule.asset_key ? `Asset ${rule.asset_key}` : "Nodo visible"),
        meta: `${importance.toUpperCase()} - ${rule.enabled ? "visible" : "oculto"}`,
        accentColor: rule.accent_color,
        rank: rule.rank ?? defaultProgressionTreeRankForImportance(importance),
        rarity: rule.rarity ?? "common",
        leafVariant: rule.leaf_variant ?? 0,
        importance,
        selected: selectedTimelineRuleId === rule.id,
      };
    });
    const rewardNodes = rewards.map((reward) => ({
      key: makeProgressionGraphNodeKey("reward", reward.id),
      entityId: reward.id,
      kind: "reward" as const,
      title: reward.title,
      subtitle: labelProgressionRewardKind(reward.kind),
      meta: `${rewardUsage.get(reward.id) ?? 0} hitos la usan`,
      selected: selectedRewardId === reward.id,
    }));
    return [...conditionNodes, ...treeNodes, ...rewardNodes];
  }, [achievementRules, graphDraft.conditionSettings, graphDraft.treeSettings, rewardUsage, rewards, selectedAchievementRuleId, selectedRewardId, selectedTimelineRuleId, timelineRules, trailRegionLabelById]);
  void graphNodes;
  const graphNodeByKey = useMemo(
    () => new Map(graphCanvasNodes.map((node) => [node.key, node])),
    [graphCanvasNodes],
  );
  const graphLinkRows = useMemo(() => {
    return graphDraft.links
      .map((link) => {
        const sourceNode = graphNodeByKey.get(link.source);
        const targetNode = graphNodeByKey.get(link.target);
        if (!sourceNode || !targetNode) return null;
        const targetRegionId =
          targetNode.kind === "tree"
            ? graphDraft.treeSettings[targetNode.key]?.regionId ?? ""
            : "";
        return {
          id: link.id,
          sourceKey: link.source,
          targetKey: link.target,
          sourceNode,
          targetNode,
          targetMode:
            targetNode.kind === "condition"
              ? null
              : graphDraft.relationModes[targetNode.key] ?? "or",
          targetRegionLabel: targetRegionId
            ? trailRegionLabelById.get(targetRegionId) ?? targetRegionId
            : null,
        };
      })
      .filter(
        (
          row,
        ): row is {
          id: string;
          sourceKey: string;
          targetKey: string;
          sourceNode: ProgressionGraphCanvasNode;
          targetNode: ProgressionGraphCanvasNode;
          targetMode: ProgressionRelationMode | null;
          targetRegionLabel: string | null;
        } => row !== null,
      );
  }, [
    graphDraft.links,
    graphDraft.relationModes,
    graphDraft.treeSettings,
    graphNodeByKey,
    trailRegionLabelById,
  ]);
  const filteredGraphLinkRows = useMemo(() => {
    const query = linkSearch.trim().toLowerCase();
    return graphLinkRows.filter((row) => {
      if (linkSourceKindFilter !== "all" && row.sourceNode.kind !== linkSourceKindFilter) {
        return false;
      }
      if (linkTargetKindFilter !== "all" && row.targetNode.kind !== linkTargetKindFilter) {
        return false;
      }
      if (!query) return true;
      const haystack = [
        row.sourceNode.title,
        row.sourceNode.subtitle,
        row.targetNode.title,
        row.targetNode.subtitle,
        row.targetRegionLabel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [graphLinkRows, linkSearch, linkSourceKindFilter, linkTargetKindFilter]);
  const progressionValidationIssues = useMemo<ProgressionValidationIssue[]>(
    () =>
      buildProgressionValidationIssues({
        trees: timelineRules,
        conditions: achievementRules,
        rewards,
        graphDraft,
        trailRegions,
        rules: validationRules,
      }),
    [achievementRules, graphDraft, rewards, timelineRules, trailRegions, validationRules],
  );

  async function hydrateGraphDraft() {
    const { data, error } = await supabase
      .from("progression_graph_state")
      .select("key,positions,links,relation_modes,tree_settings,condition_settings")
      .eq("key", PROGRESSION_GRAPH_DB_KEY)
      .maybeSingle();
    if (error) {
      setMsg(
        error.code === "42P01" || error.message.includes("progression_graph_state")
          ? "Falta ejecutar la migración de progression_graph_state para usar este editor."
          : error.message,
      );
      setGraphHydrated(true);
      return;
    }
    setGraphDraft(
      buildGraphDraftFromTableRow((data as ProgressionGraphStateTableRow | null) ?? null),
    );
    setGraphHydrated(true);
  }

  async function persistGraphDraft(nextDraft: ProgressionGraphDraft) {
    const { error } = await supabase
      .from("progression_graph_state")
      .upsert(buildGraphTablePayload(nextDraft), { onConflict: "key" });
    if (error) {
      setMsg(error.message);
    }
  }

  useEffect(() => {
    if (!graphHydrated || typeof window === "undefined") return;
    if (graphSaveTimeoutRef.current) {
      window.clearTimeout(graphSaveTimeoutRef.current);
    }
    graphSaveTimeoutRef.current = window.setTimeout(() => {
      void persistGraphDraft(graphDraft);
    }, 500);
    return () => {
      if (graphSaveTimeoutRef.current) {
        window.clearTimeout(graphSaveTimeoutRef.current);
      }
    };
  }, [graphDraft, graphHydrated]);

  useEffect(() => {
    if (!graphCanvasNodes.length) return;
    setGraphDraft((current) => {
      const counters = { condition: 0, tree: 0, reward: 0 };
      const knownKeys = new Set(graphCanvasNodes.map((node) => node.key));
      const next: ProgressionGraphDraft = {
        positions: {},
        links: [],
        relationModes: {},
        treeSettings: {},
        conditionSettings: {},
      };
      for (const node of graphCanvasNodes) {
        const index = counters[node.kind];
        counters[node.kind] += 1;
        next.positions[node.key] =
          current.positions[node.key] ??
          defaultProgressionGraphPosition(node.kind, index);
        if (node.kind !== "condition") {
          next.relationModes[node.key] = current.relationModes[node.key] ?? "or";
        }
        if (node.kind === "tree") {
          next.treeSettings[node.key] = current.treeSettings[node.key] ?? {
            regionId: trailMilestoneRegions[0]?.id ?? "",
            importance: "importante",
          };
        }
        if (node.kind === "condition") {
          next.conditionSettings[node.key] = current.conditionSettings[node.key] ?? {
            templateId: PROGRESSION_CONDITION_TEMPLATES[0]?.id ?? "",
          };
        }
      }
      next.links = current.links.filter(
        (link) =>
          knownKeys.has(link.source) &&
          knownKeys.has(link.target) &&
          canLinkProgressionNodes(
            splitProgressionGraphNodeKey(link.source).kind,
            splitProgressionGraphNodeKey(link.target).kind,
          ),
      );
      return JSON.stringify(next) === JSON.stringify(current) ? current : next;
    });
  }, [graphCanvasNodes, trailMilestoneRegions]);

  useEffect(() => {
    (async () => {
      const session = await ensureSuperadminOrRedirect(router);
      if (!session) return;
      await Promise.all([
        refresh(),
        hydrateTrailMilestoneRegions(),
        hydrateGraphDraft(),
        hydrateValidationRules(),
      ]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!panelDrag) return;
    const activeDrag = panelDrag;
    const handlePointerMove = (event: PointerEvent) => {
      setPanelOffsets((current) => ({
        ...current,
        [activeDrag.panel]: {
          x: activeDrag.startOffsetX + (event.clientX - activeDrag.startClientX),
          y: activeDrag.startOffsetY + (event.clientY - activeDrag.startClientY),
        },
      }));
    };
    const handlePointerUp = () => setPanelDrag(null);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [panelDrag]);

  useEffect(() => {
    setTimelineDraft(buildTreeDraftFromRow(selectedTimelineRule));
  }, [selectedTimelineRule]);

  useEffect(() => {
    setAchievementDraft(buildConditionDraftFromRow(selectedAchievementRule));
  }, [selectedAchievementRule]);

  useEffect(() => {
    setRewardDraft(buildRewardDraftFromRow(selectedReward));
  }, [selectedReward]);

  async function hydrateTrailMilestoneRegions() {
    const config = await getHomeTrailRuntimeConfig();
    setTrailRegions(config.regions);
    setTrailMilestoneRegions(
      config.regions
        .filter((region) => region.enabled && region.kind === "milestone_tree")
        .map((region) => ({
          id: region.id,
          label: region.name || region.id,
          hint: `${region.placementMode} · cap ${region.capacity ?? "sin límite"}`,
        })),
    );
  }

  async function hydrateValidationRules() {
    const rules = await loadValidationRulesForDomain("progression").catch(() =>
      getDefaultValidationRules("progression"),
    );
    setValidationRules(rules);
  }

  async function refresh() {
    setMsg(null);
    const [milestoneRes, achievementRes, rewardsRes] = await Promise.all([
      supabase
        .from("progression_tree_nodes")
        .select("*")
        .order("code", { ascending: true }),
      supabase
        .from("progression_conditions")
        .select("id,code,title,description,template_id,narrative_seed,enabled")
        .order("code", { ascending: true }),
      supabase
        .from("progression_rewards")
        .select("id,code,kind,title,description,preset_id,reference_key,payload,enabled")
        .order("kind", { ascending: true })
        .order("title", { ascending: true }),
    ]);
    if (milestoneRes.error || achievementRes.error || rewardsRes.error) {
      setMsg(
        milestoneRes.error?.message ??
          achievementRes.error?.message ??
          rewardsRes.error?.message ??
          "No se pudo cargar progression.",
      );
    }
    const nextMilestones =
      ((milestoneRes.data as ProgressionTreeRow[] | null) ?? []).map((row, index) => ({
        ...row,
        milestone_number: index + 1,
        message: row.description,
        icon: row.asset_key,
      }));
    const nextAchievements =
      ((achievementRes.data as ProgressionConditionRow[] | null) ?? []).map((row) => ({
        ...row,
        kind: "progression_condition",
        threshold: 1,
        tier: "bronze",
        default_reward_id: null,
      }));
    const nextRewards = (rewardsRes.data as ProgressionRewardRow[] | null) ?? [];
    setTimelineRules(nextMilestones);
    setAchievementRules(nextAchievements);
    setRewards(nextRewards);
    setSelectedTimelineRuleId((current) =>
      current && nextMilestones.some((rule) => rule.id === current)
        ? current
        : null,
    );
    setSelectedAchievementRuleId((current) =>
      current && nextAchievements.some((rule) => rule.id === current)
        ? current
        : null,
    );
    setSelectedRewardId((current) =>
      current && nextRewards.some((reward) => reward.id === current)
        ? current
        : null,
    );
  }

  async function saveTimelineRule() {
    const payload = buildTreeInsertPayload(timelineDraft);
    if (selectedTimelineRule) {
      const { error } = await supabase
        .from("progression_tree_nodes")
        .update(payload)
        .eq("id", selectedTimelineRule.id);
      if (error) return setMsg(error.message);
    } else {
      const { data, error } = await supabase
        .from("progression_tree_nodes")
        .insert(payload)
        .select("id")
        .single();
      if (error) return setMsg(error.message);
      setSelectedTimelineRuleId(data.id);
    }
    setMsg(selectedTimelineRule ? "Árbol guardado." : "Árbol creado.");
    await refresh();
  }

  async function saveAchievementRule() {
    const payload = buildConditionInsertPayload(achievementDraft);
    if (selectedAchievementRule) {
      const { error } = await supabase
        .from("progression_conditions")
        .update(payload)
        .eq("id", selectedAchievementRule.id);
      if (error) return setMsg(error.message);
    } else {
      const { data, error } = await supabase
        .from("progression_conditions")
        .insert(payload)
        .select("id")
        .single();
      if (error) return setMsg(error.message);
      setSelectedAchievementRuleId(data.id);
    }
    setMsg(selectedAchievementRule ? "Condicion guardada." : "Condicion creada.");
    await refresh();
  }

  async function saveReward() {
    if (!rewardDraft.title.trim()) return setMsg("Pon un título para la reward.");
    const payload = buildRewardInsertPayload(rewardDraft);
    if (selectedReward) {
      const { error } = await supabase
        .from("progression_rewards")
        .update(payload)
        .eq("id", selectedReward.id);
      if (error) return setMsg(error.message);
    } else {
      const { data, error } = await supabase
        .from("progression_rewards")
        .insert(payload)
        .select("id")
        .single();
      if (error) return setMsg(error.message);
      setSelectedRewardId(data.id);
    }
    setMsg(selectedReward ? "Reward guardada." : "Reward creada.");
    await refresh();
  }

  async function confirmDeleteTimelineRule() {
    if (!pendingDeleteTimelineRule) return;
    setGraphDraft((current) => {
      const nodeKey = makeProgressionGraphNodeKey("tree", pendingDeleteTimelineRule.id);
      return {
        ...current,
        positions: Object.fromEntries(
          Object.entries(current.positions).filter(([key]) => key !== nodeKey),
        ),
        links: current.links.filter(
          (link) => link.source !== nodeKey && link.target !== nodeKey,
        ),
        relationModes: Object.fromEntries(
          Object.entries(current.relationModes).filter(([key]) => key !== nodeKey),
        ),
        treeSettings: Object.fromEntries(
          Object.entries(current.treeSettings).filter(([key]) => key !== nodeKey),
        ),
        conditionSettings: current.conditionSettings,
      };
    });
    const { error } = await supabase
      .from("progression_tree_nodes")
      .delete()
      .eq("id", pendingDeleteTimelineRule.id);
    setPendingDeleteTimelineRule(null);
    if (error) return setMsg(error.message);
    setMsg("Árbol borrado.");
    await refresh();
  }

  async function confirmDeleteAchievementRule() {
    if (!pendingDeleteAchievementRule) return;
    const ruleId = pendingDeleteAchievementRule.id;
    setGraphDraft((current) => {
      const nodeKey = makeProgressionGraphNodeKey("condition", ruleId);
      return {
        ...current,
        positions: Object.fromEntries(
          Object.entries(current.positions).filter(([key]) => key !== nodeKey),
        ),
        links: current.links.filter(
          (link) => link.source !== nodeKey && link.target !== nodeKey,
        ),
        relationModes: current.relationModes,
        treeSettings: current.treeSettings,
        conditionSettings: Object.fromEntries(
          Object.entries(current.conditionSettings).filter(([key]) => key !== nodeKey),
        ),
      };
    });
    setPendingDeleteAchievementRule(null);
    const { error } = await supabase.from("progression_conditions").delete().eq("id", ruleId);
    if (error) return setMsg(error.message);
    setMsg("Condicion borrada.");
    await refresh();
  }

  async function confirmDeleteReward() {
    if (!pendingDeleteReward) return;
    const rewardId = pendingDeleteReward.id;
    setGraphDraft((current) => {
      const nodeKey = makeProgressionGraphNodeKey("reward", rewardId);
      return {
        ...current,
        positions: Object.fromEntries(
          Object.entries(current.positions).filter(([key]) => key !== nodeKey),
        ),
        links: current.links.filter(
          (link) => link.source !== nodeKey && link.target !== nodeKey,
        ),
        relationModes: Object.fromEntries(
          Object.entries(current.relationModes).filter(([key]) => key !== nodeKey),
        ),
        treeSettings: current.treeSettings,
        conditionSettings: current.conditionSettings,
      };
    });
    setPendingDeleteReward(null);
    const { error } = await supabase.from("progression_rewards").delete().eq("id", rewardId);
    if (error) return setMsg(error.message);
    setMsg("Reward borrada.");
    await refresh();
  }

  function startPanelDrag(panel: ProgressionPanel, event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if (window.innerWidth < 1024) return;
    setPanelDrag({
      panel,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: panelOffsets[panel].x,
      startOffsetY: panelOffsets[panel].y,
    });
  }

  function openPanel(panel: ProgressionPanel) {
    setLinkingSourceKey(null);
    setActivePanel((current) => {
      if (current === panel) return null;
      if (panel === "tree") setSelectedTimelineRuleId(null);
      if (panel === "conditions") setSelectedAchievementRuleId(null);
      if (panel === "rewards") setSelectedRewardId(null);
      return panel;
    });
  }

  function handleSelectGraphNode(node: ProgressionGraphCanvasNode) {
    if (node.kind === "tree") {
      setSelectedTimelineRuleId(node.entityId);
      setActivePanel("tree");
      return;
    }
    if (node.kind === "condition") {
      setSelectedAchievementRuleId(node.entityId);
      setActivePanel("conditions");
      return;
    }
    setSelectedRewardId(node.entityId);
    setActivePanel("rewards");
  }

  function openGraphNodeFromList(nodeKey: string) {
    const node = graphNodeByKey.get(nodeKey);
    if (!node) return;
    handleSelectGraphNode(node);
  }

  function focusValidationIssue(issue: ProgressionValidationIssue) {
    if (issue.targetNodeKey) {
      openGraphNodeFromList(issue.targetNodeKey);
      return;
    }
    if (issue.targetPanel) {
      setActivePanel(issue.targetPanel);
      return;
    }
    setActivePanel("validation");
  }

  function updateGraphPosition(nodeKey: string, position: { x: number; y: number }) {
    setGraphDraft((current) => ({
      ...current,
      positions: { ...current.positions, [nodeKey]: position },
    }));
  }

  function changeRelationMode(nodeKey: string, mode: ProgressionRelationMode) {
    setGraphDraft((current) => ({
      ...current,
      relationModes: { ...current.relationModes, [nodeKey]: mode },
    }));
  }

  function toggleCanvasLink(sourceKey: string, targetKey: string) {
    const source = splitProgressionGraphNodeKey(sourceKey);
    const target = splitProgressionGraphNodeKey(targetKey);
    if (!canLinkProgressionNodes(source.kind, target.kind)) {
      setLinkingSourceKey(null);
      return;
    }
    const id = buildProgressionGraphLinkId(sourceKey, targetKey);
    setGraphDraft((current) => {
      const exists = current.links.some((link) => link.id === id);
      return {
        ...current,
        links: exists
          ? current.links.filter((link) => link.id !== id)
          : [...current.links, { id, source: sourceKey, target: targetKey }],
      };
    });
    setLinkingSourceKey(null);
  }

  function redistributeGraphCards() {
    setGraphDraft((current) => {
      const counters = { condition: 0, tree: 0, reward: 0 };
      const nextPositions: ProgressionGraphDraft["positions"] = {};
      for (const node of graphCanvasNodes) {
        const index = counters[node.kind];
        counters[node.kind] += 1;
        nextPositions[node.key] = defaultProgressionGraphPosition(node.kind, index);
      }
      return {
        ...current,
        positions: nextPositions,
      };
    });
    setTimeout(() => {
      setFitContentSignal((current) => current + 1);
    }, 0);
  }

  function focusGraphContent() {
    setFitContentSignal((current) => current + 1);
  }

  async function seedCanonicalLibrary() {
    const bundle = buildCanonicalProgressionSeedBundle();
    const { data: treeRows, error: treeError } = await supabase
      .from("progression_tree_nodes")
      .upsert(
        bundle.trees.map(({ importance: _importance, ...row }) => row),
        { onConflict: "code" },
      )
      .select("id,code,preset_id");
    if (treeError) return setMsg(treeError.message);

    const { data: conditionRows, error: conditionError } = await supabase
      .from("progression_conditions")
      .upsert(bundle.conditions, { onConflict: "code" })
      .select("id,code,template_id");
    if (conditionError) return setMsg(conditionError.message);

    const { data: rewardRows, error: rewardError } = await supabase
      .from("progression_rewards")
      .upsert(
        bundle.rewards.map(({ relationMode: _relationMode, ...row }) => row),
        { onConflict: "code" },
      )
      .select("id,code,preset_id");
    if (rewardError) return setMsg(rewardError.message);

    const treeByCode = new Map(
      (((treeRows as Array<{ id: string; code: string; preset_id: string | null }>) ?? [])).map(
        (row) => [row.code, row],
      ),
    );
    const conditionByCode = new Map(
      (((conditionRows as Array<{ id: string; code: string; template_id: string | null }>) ?? [])).map(
        (row) => [row.code, row],
      ),
    );
    const rewardByCode = new Map(
      (((rewardRows as Array<{ id: string; code: string; preset_id: string | null }>) ?? [])).map(
        (row) => [row.code, row],
      ),
    );

    const positions: ProgressionGraphDraft["positions"] = {};
    const links: ProgressionGraphDraft["links"] = [];
    const relationModes: ProgressionGraphDraft["relationModes"] = {};
    const treeSettings: ProgressionGraphDraft["treeSettings"] = {};
    const conditionSettings: ProgressionGraphDraft["conditionSettings"] = {};

    const treeKeys: string[] = [];
    const conditionKeys: string[] = [];
    const rewardKeys: string[] = [];

    bundle.conditions.forEach((condition, index) => {
      const row = conditionByCode.get(condition.code);
      if (!row) return;
      const key = makeProgressionGraphNodeKey("condition", row.id);
      conditionKeys.push(key);
      positions[key] = defaultProgressionGraphPosition("condition", index);
      conditionSettings[key] = { templateId: condition.template_id };
    });

    bundle.trees.forEach((tree, index) => {
      const row = treeByCode.get(tree.code);
      if (!row) return;
      const key = makeProgressionGraphNodeKey("tree", row.id);
      treeKeys.push(key);
      positions[key] = defaultProgressionGraphPosition("tree", index);
      relationModes[key] = index % 5 === 0 ? "and" : "or";
      treeSettings[key] = {
        regionId:
          trailMilestoneRegions[index % Math.max(1, trailMilestoneRegions.length)]?.id ?? "",
        importance: tree.importance,
      };
    });

    bundle.rewards.forEach((reward, index) => {
      const row = rewardByCode.get(reward.code);
      if (!row) return;
      const key = makeProgressionGraphNodeKey("reward", row.id);
      rewardKeys.push(key);
      positions[key] = defaultProgressionGraphPosition("reward", index);
      relationModes[key] = reward.relationMode;
    });

    for (let index = 0; index < Math.min(conditionKeys.length, treeKeys.length); index += 1) {
      const treeKey = treeKeys[index];
      const primaryCondition = conditionKeys[index];
      links.push({
        id: buildProgressionGraphLinkId(primaryCondition, treeKey),
        source: primaryCondition,
        target: treeKey,
      });
      const secondaryCondition = conditionKeys[index + 20];
      if (secondaryCondition) {
        links.push({
          id: buildProgressionGraphLinkId(secondaryCondition, treeKey),
          source: secondaryCondition,
          target: treeKey,
        });
      }
      const rewardKey = rewardKeys[index];
      if (rewardKey) {
        links.push({
          id: buildProgressionGraphLinkId(treeKey, rewardKey),
          source: treeKey,
          target: rewardKey,
        });
      }
      const siblingRewardKey = rewardKeys[index + 15];
      if (siblingRewardKey && index % 4 === 0) {
        links.push({
          id: buildProgressionGraphLinkId(treeKey, siblingRewardKey),
          source: treeKey,
          target: siblingRewardKey,
        });
      }
      const nextTreeKey = treeKeys[index + 10];
      if (nextTreeKey && index % 3 !== 2) {
        links.push({
          id: buildProgressionGraphLinkId(treeKey, nextTreeKey),
          source: treeKey,
          target: nextTreeKey,
        });
      }
    }

    const nextDraft: ProgressionGraphDraft = {
      positions,
      links,
      relationModes,
      treeSettings,
      conditionSettings,
    };

    setGraphDraft(nextDraft);
    setSelectedTimelineRuleId(null);
    setSelectedAchievementRuleId(null);
    setSelectedRewardId(null);
    setLinkingSourceKey(null);
    setFitContentSignal((current) => current + 1);
    setMsg("Biblioteca canónica sembrada en progression.");
    await refresh();
  }

  if (loading) {
    return <PageLoadingState message="Cargando progression..." />;
  }

  const selectedTreeNodeKey = selectedTimelineRule
    ? makeProgressionGraphNodeKey("tree", selectedTimelineRule.id)
    : null;
  const selectedConditionNodeKey = selectedAchievementRule
    ? makeProgressionGraphNodeKey("condition", selectedAchievementRule.id)
    : null;
  const selectedRewardNodeKey = selectedReward
    ? makeProgressionGraphNodeKey("reward", selectedReward.id)
    : null;
  const selectedTreeSettings =
    (selectedTreeNodeKey ? graphDraft.treeSettings[selectedTreeNodeKey] : null) ?? {
      regionId: trailMilestoneRegions[0]?.id ?? "",
      importance: "importante" as ProgressionTreeImportance,
    };
  const selectedConditionTemplateId =
    (selectedConditionNodeKey
      ? graphDraft.conditionSettings[selectedConditionNodeKey]?.templateId
      : null) ??
    PROGRESSION_CONDITION_TEMPLATES[0]?.id ??
    "";
  const selectedConditionTemplate =
    conditionTemplateById(selectedConditionTemplateId) ?? PROGRESSION_CONDITION_TEMPLATES[0];
  const selectedTreePreset = treePresetById(timelineDraft.presetId);
  const selectedTreeRank = timelineDraft.rank;
  const selectedTreeRarity = timelineDraft.rarity;
  const selectedTreeLeafVariant = normalizeProgressionLeafVariant(timelineDraft.leafVariant);
  const selectedRewardTemplate = rewardTemplateById(rewardDraft.presetId);
  const selectedTreeRelationMode =
    (selectedTreeNodeKey ? graphDraft.relationModes[selectedTreeNodeKey] : null) ??
    "or";
  const selectedRewardRelationMode =
    (selectedRewardNodeKey ? graphDraft.relationModes[selectedRewardNodeKey] : null) ??
    "or";
  const selectedRewardUsageCount = selectedReward
    ? rewardUsage.get(selectedReward.id) ?? 0
    : 0;
  const rewardStickerList =
    rewardDraft.kind === "sticker_pack" ? parseCsvList(rewardDraft.itemsCsv) : [];
  const activePanelStyle =
    activePanel === null
      ? undefined
      : ({
          transform: `translate(${panelOffsets[activePanel].x}px, ${panelOffsets[activePanel].y}px)`,
        } satisfies CSSProperties);
  const canvasActivePanel =
    activePanel === "validation" ? null : activePanel;

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[var(--lv-bg)] text-[var(--lv-text)]">
      <div className="absolute inset-0">
        <div className="absolute inset-x-0 top-4 z-30 flex justify-center px-4">
          <div className="flex max-w-full flex-wrap items-center justify-center gap-2 rounded-[32px] border border-[var(--lv-border)] bg-[rgba(255,255,255,0.96)] p-4 shadow-[0_18px_48px_rgba(21,36,24,0.12)] backdrop-blur">
            <button type="button" className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm transition hover:bg-[var(--lv-surface-soft)]" onClick={() => router.push("/admin")}>Volver</button>
            <ToolbarButton active={activePanel === "tree"} onClick={() => openPanel("tree")}>Arbol</ToolbarButton>
            <ToolbarButton active={activePanel === "conditions"} onClick={() => openPanel("conditions")}>Condiciones</ToolbarButton>
            <ToolbarButton active={activePanel === "rewards"} onClick={() => openPanel("rewards")}>Rewards</ToolbarButton>
            <ToolbarButton active={activePanel === "validation"} onClick={() => openPanel("validation")}>Validacion</ToolbarButton>
          </div>
        </div>

        {msg ? (
          <StatusNotice
            message={msg}
            className="absolute left-1/2 top-28 z-30 w-[min(720px,calc(100%-2rem))] -translate-x-1/2"
          />
        ) : null}

        <div className="absolute inset-0">
            {activePanel === "tree" ? (
              <FloatingInspector title="Árbol" description="Aquí eliges el hito visible, su zona del sendero y sus dependencias." style={activePanelStyle} onClose={() => setActivePanel(null)} onHeaderPointerDown={(event) => startPanelDrag("tree", event)} actions={<><button type="button" className={primaryButtonClass} onClick={() => void saveTimelineRule()}>{selectedTimelineRule ? "Guardar" : "Crear"}</button>{selectedTimelineRule ? <button type="button" className={tertiaryButtonClass} onClick={() => setPendingDeleteTimelineRule(selectedTimelineRule)}>Borrar</button> : null}</>}>
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4 text-sm text-[var(--lv-text-muted)]">{selectedTimelineRule ? `Editando ${selectedTimelineRule.title}. Cuando pulses un bloque del canvas, este inspector cargará su configuración.` : "Crea un árbol nuevo o pulsa uno del canvas para editarlo. El inspector ya no lista hitos existentes porque el canvas es la fuente visual."}</div>
                  <label className="space-y-1 text-sm"><div className={fieldLabelClass}>Biblioteca</div><select className={fieldControlClass} value={timelineDraft.presetId} onChange={(event) => setTimelineDraft((prev) => applyTreePresetToDraft(event.target.value, prev))}><option value="">Sin preset</option>{PROGRESSION_TREE_PRESETS.map((preset: (typeof PROGRESSION_TREE_PRESETS)[number]) => <option key={preset.id} value={preset.id}>{preset.familyLabel} - {preset.title}</option>)}</select></label>
                  <label className="space-y-1 text-sm"><div className={fieldLabelClass}>Código</div><input className={fieldControlClass} value={timelineDraft.code} onChange={(event) => setTimelineDraft((prev) => ({ ...prev, code: event.target.value }))} /></label>
                  <label className="space-y-1 text-sm"><div className={fieldLabelClass}>Título</div><input className={fieldControlClass} value={timelineDraft.title} onChange={(event) => setTimelineDraft((prev) => ({ ...prev, title: event.target.value }))} /></label>
                  <label className="space-y-1 text-sm"><div className={fieldLabelClass}>Descripción narrativa</div><textarea className={textareaControlClass} value={timelineDraft.description} onChange={(event) => setTimelineDraft((prev) => ({ ...prev, description: event.target.value }))} /></label>
                  <label className="space-y-1 text-sm"><div className={fieldLabelClass}>Asset</div><input className={fieldControlClass} value={timelineDraft.assetKey} onChange={(event) => setTimelineDraft((prev) => ({ ...prev, assetKey: event.target.value }))} /></label>
                  <label className="space-y-1 text-sm"><div className={fieldLabelClass}>Color de acento</div><input className={fieldControlClass} value={timelineDraft.accentColor} onChange={(event) => setTimelineDraft((prev) => ({ ...prev, accentColor: event.target.value }))} /></label>
                  <div className="rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4">
                    <div className="mb-3 text-xs uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">Preview del árbol</div>
                    <div className="flex items-center gap-4">
                      <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface)]">
                        <ProgressionMilestoneTree size={62} rank={selectedTreeRank} importance={selectedTreeSettings.importance} rarity={selectedTreeRarity} leafVariant={selectedTreeLeafVariant} accentColor={timelineDraft.accentColor || null} />
                      </div>
                      <div className="text-sm text-[var(--lv-text-muted)]">
                        <div><span className="font-medium text-[var(--lv-text)]">Rango:</span> {PROGRESSION_TREE_RANK_OPTIONS.find((option) => option.value === selectedTreeRank)?.label ?? selectedTreeRank}</div>
                        <div className="mt-1"><span className="font-medium text-[var(--lv-text)]">Rareza:</span> {PROGRESSION_TREE_RARITY_OPTIONS.find((option) => option.value === selectedTreeRarity)?.label ?? selectedTreeRarity}</div>
                        <div className="mt-1"><span className="font-medium text-[var(--lv-text)]">Variante de hoja:</span> {selectedTreeLeafVariant + 1}/100</div>
                      </div>
                    </div>
                  </div>
                  <label className="space-y-1 text-sm"><div className={fieldLabelClass}>Rango</div><select className={fieldControlClass} value={timelineDraft.rank} onChange={(event) => setTimelineDraft((prev) => ({ ...prev, rank: event.target.value as ProgressionTreeDraft["rank"] }))}>{PROGRESSION_TREE_RANK_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                  <label className="space-y-1 text-sm"><div className={fieldLabelClass}>Rareza</div><select className={fieldControlClass} value={timelineDraft.rarity} onChange={(event) => setTimelineDraft((prev) => ({ ...prev, rarity: event.target.value as ProgressionTreeDraft["rarity"] }))}>{PROGRESSION_TREE_RARITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                  <label className="space-y-1 text-sm"><div className={fieldLabelClass}>Variante de hoja</div><input className={fieldControlClass} type="number" min={0} max={99} step={1} value={selectedTreeLeafVariant} onChange={(event) => setTimelineDraft((prev) => ({ ...prev, leafVariant: normalizeProgressionLeafVariant(event.target.value) }))} /></label>
                  <label className="space-y-1 text-sm"><div className={fieldLabelClass}>Zona del trail</div><select className={fieldControlClass} value={selectedTreeSettings.regionId} disabled={!selectedTreeNodeKey} onChange={(event) => { if (!selectedTreeNodeKey) return; setGraphDraft((current) => ({ ...current, treeSettings: { ...current.treeSettings, [selectedTreeNodeKey]: { ...selectedTreeSettings, regionId: event.target.value } } })); }}><option value="">Sin zona todavía</option>{trailMilestoneRegions.map((region) => <option key={region.id} value={region.id}>{region.label}</option>)}</select></label>
                  <label className="space-y-1 text-sm"><div className={fieldLabelClass}>Importancia</div><select className={fieldControlClass} value={selectedTreeSettings.importance} disabled={!selectedTreeNodeKey} onChange={(event) => { if (!selectedTreeNodeKey) return; setGraphDraft((current) => ({ ...current, treeSettings: { ...current.treeSettings, [selectedTreeNodeKey]: { ...selectedTreeSettings, importance: event.target.value as ProgressionTreeImportance } } })); }}><option value="paso">Paso</option><option value="importante">Importante</option><option value="mayor">Mayor</option><option value="anual">Anual</option></select></label>
                  <label className="space-y-1 text-sm"><div className={fieldLabelClass}>Entrada AND / OR</div><select className={fieldControlClass} value={selectedTreeRelationMode} disabled={!selectedTreeNodeKey} onChange={(event) => { if (!selectedTreeNodeKey) return; changeRelationMode(selectedTreeNodeKey, event.target.value as ProgressionRelationMode); }}><option value="or">OR</option><option value="and">AND</option></select></label>
                  <label className="space-y-1 text-sm"><div className={fieldLabelClass}>Visible en runtime</div><select className={fieldControlClass} value={timelineDraft.enabled ? "yes" : "no"} onChange={(event) => setTimelineDraft((prev) => ({ ...prev, enabled: event.target.value === "yes" }))}><option value="yes">Si</option><option value="no">No</option></select></label>
                  {selectedTreePreset ? <div className="rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4 text-sm text-[var(--lv-text-muted)]"><div className="font-medium text-[var(--lv-text)]">{selectedTreePreset.familyLabel}</div><div className="mt-2">{selectedTreePreset.description}</div></div> : null}
                  <div className="rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4 text-sm text-[var(--lv-text-muted)]">Las dependencias del árbol se gestionan directamente en el canvas con el botón <span className="font-medium text-[var(--lv-text)]">Enlazar</span> o con <span className="font-medium text-[var(--lv-text)]">Ctrl/Cmd + click</span>.</div>
                  <button type="button" className={secondaryButtonClass} onClick={() => router.push("/admin/home/trail-editor")}>Abrir trail-editor</button>
                </div>
              </FloatingInspector>
            ) : null}

            {activePanel === "conditions" ? (
              <FloatingInspector title="Condiciones" description="Aquí defines la lógica que dispara nodos visibles del árbol." style={activePanelStyle} onClose={() => setActivePanel(null)} onHeaderPointerDown={(event) => startPanelDrag("conditions", event)} actions={<><button type="button" className={primaryButtonClass} onClick={() => void saveAchievementRule()}>{selectedAchievementRule ? "Guardar" : "Crear"}</button>{selectedAchievementRule ? <button type="button" className={tertiaryButtonClass} onClick={() => setPendingDeleteAchievementRule(selectedAchievementRule)}>Borrar</button> : null}</>}>
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4 text-sm text-[var(--lv-text-muted)]">{selectedAchievementRule ? `Editando ${selectedAchievementRule.title}. Si eliges otra tarjeta en el canvas, aquí veras su condición enlazable.` : "Crea una condición nueva o pulsa una tarjeta del canvas para editarla. El canvas es el lugar donde se distinguen las piezas ya creadas."}</div>
                  <label className="space-y-1 text-sm"><div className={fieldLabelClass}>Biblioteca</div><select className={fieldControlClass} value={selectedConditionTemplateId} onChange={(event) => { if (selectedConditionNodeKey) { setGraphDraft((current) => ({ ...current, conditionSettings: { ...current.conditionSettings, [selectedConditionNodeKey]: { templateId: event.target.value } } })); } setAchievementDraft((prev) => applyConditionTemplateToDraft(event.target.value, prev)); }}>{Object.entries(PROGRESSION_CONDITION_CATEGORY_LABELS).map(([category, label]) => <optgroup key={category} label={label}>{PROGRESSION_CONDITION_TEMPLATES.filter((template: (typeof PROGRESSION_CONDITION_TEMPLATES)[number]) => template.category === category).map((template: (typeof PROGRESSION_CONDITION_TEMPLATES)[number]) => <option key={template.id} value={template.id}>{template.title}</option>)}</optgroup>)}</select></label>
                  <label className="space-y-1 text-sm"><div className={fieldLabelClass}>Código</div><input className={fieldControlClass} value={achievementDraft.code} onChange={(event) => setAchievementDraft((prev) => ({ ...prev, code: event.target.value }))} /></label>
                  {selectedConditionTemplate ? <div className="rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4 text-sm text-[var(--lv-text-muted)]"><div className="font-medium text-[var(--lv-text)]">{selectedConditionTemplate.title}</div><div className="mt-2">{selectedConditionTemplate.description}</div><div className="mt-3 text-xs uppercase tracking-[0.16em]">Semilla narrativa: {selectedConditionTemplate.narrativeSeed}</div></div> : null}
                  <label className="space-y-1 text-sm"><div className={fieldLabelClass}>Título</div><input className={fieldControlClass} value={achievementDraft.title} onChange={(event) => setAchievementDraft((prev) => ({ ...prev, title: event.target.value }))} /></label>
                  <label className="space-y-1 text-sm"><div className={fieldLabelClass}>Descripción</div><textarea className={textareaControlClass} value={achievementDraft.description} onChange={(event) => setAchievementDraft((prev) => ({ ...prev, description: event.target.value }))} /></label>
                  <label className="space-y-1 text-sm"><div className={fieldLabelClass}>Semilla narrativa</div><textarea className={textareaControlClass} value={achievementDraft.narrativeSeed} onChange={(event) => setAchievementDraft((prev) => ({ ...prev, narrativeSeed: event.target.value }))} /></label>
                  <label className="space-y-1 text-sm"><div className={fieldLabelClass}>Activa en runtime</div><select className={fieldControlClass} value={achievementDraft.enabled ? "yes" : "no"} onChange={(event) => setAchievementDraft((prev) => ({ ...prev, enabled: event.target.value === "yes" }))}><option value="yes">Si</option><option value="no">No</option></select></label>
                  <div className="rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4 text-sm text-[var(--lv-text-muted)]">Una condición puede disparar uno o varios árboles. Ese cableado vive en el canvas, no en el inspector.</div>
                </div>
              </FloatingInspector>
            ) : null}

            {activePanel === "rewards" ? (
              <FloatingInspector title="Rewards" description="Aquí defines lo que se desbloquea cuando uno o varios árboles se completan." style={activePanelStyle} onClose={() => setActivePanel(null)} onHeaderPointerDown={(event) => startPanelDrag("rewards", event)} actions={<><button type="button" className={primaryButtonClass} onClick={() => void saveReward()}>{selectedReward ? "Guardar" : "Crear"}</button>{selectedReward ? <button type="button" className={tertiaryButtonClass} onClick={() => setPendingDeleteReward(selectedReward)}>Borrar</button> : null}</>}>
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4 text-sm text-[var(--lv-text-muted)]">{selectedReward ? `Editando ${selectedReward.title}. Pulsa otra tarjeta del canvas si quieres revisar o enlazar un desbloqueo distinto.` : "Crea una reward nueva o pulsa una tarjeta del canvas para editarla. Las rewards ya no se listan dentro del inspector para que el foco siga en el grafo."}</div>
                  <label className="space-y-1 text-sm"><div className={fieldLabelClass}>Biblioteca</div><select className={fieldControlClass} value={rewardDraft.presetId} onChange={(event) => setRewardDraft((prev) => applyRewardTemplateToDraft(event.target.value, prev))}><option value="">Sin preset</option>{PROGRESSION_REWARD_TEMPLATES.map((template: (typeof PROGRESSION_REWARD_TEMPLATES)[number]) => <option key={template.id} value={template.id}>{template.familyLabel} - {template.title}</option>)}</select></label>
                  <label className="space-y-1 text-sm"><div className={fieldLabelClass}>Código</div><input className={fieldControlClass} value={rewardDraft.code} onChange={(event) => setRewardDraft((prev) => ({ ...prev, code: event.target.value }))} /></label>
                  <label className="space-y-1 text-sm"><div className={fieldLabelClass}>Tipo</div><select className={fieldControlClass} value={rewardDraft.kind} onChange={(event) => setRewardDraft((prev) => ({ ...prev, kind: event.target.value as ProgressionRewardRow["kind"] }))}>{rewardKindOptions.map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}</select></label>
                  <label className="space-y-1 text-sm"><div className={fieldLabelClass}>Título</div><input className={fieldControlClass} value={rewardDraft.title} onChange={(event) => setRewardDraft((prev) => ({ ...prev, title: event.target.value }))} /></label>
                  <label className="space-y-1 text-sm"><div className={fieldLabelClass}>Descripción</div><textarea className={textareaControlClass} value={rewardDraft.description} onChange={(event) => setRewardDraft((prev) => ({ ...prev, description: event.target.value }))} /></label>
                  <label className="space-y-1 text-sm"><div className={fieldLabelClass}>Reference key</div><input className={fieldControlClass} value={rewardDraft.referenceKey} onChange={(event) => setRewardDraft((prev) => ({ ...prev, referenceKey: event.target.value }))} /></label>
                  <label className="space-y-1 text-sm"><div className={fieldLabelClass}>Items asociados</div><textarea className={textareaControlClass} value={rewardDraft.itemsCsv} onChange={(event) => setRewardDraft((prev) => ({ ...prev, itemsCsv: event.target.value }))} placeholder="tool_brush_soft, frame_gold, sticker_leaf" /></label>
                  {rewardDraft.kind === "sticker_pack" || rewardDraft.kind.startsWith("canvas_") ? <button type="button" className={secondaryButtonClass} onClick={() => router.push("/admin/canvas")}>Abrir canvas</button> : null}
                  <label className="space-y-1 text-sm"><div className={fieldLabelClass}>Entrada AND / OR</div><select className={fieldControlClass} value={selectedRewardRelationMode} disabled={!selectedRewardNodeKey} onChange={(event) => { if (!selectedRewardNodeKey) return; changeRelationMode(selectedRewardNodeKey, event.target.value as ProgressionRelationMode); }}><option value="or">OR</option><option value="and">AND</option></select></label>
                  <div className="rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4 text-sm text-[var(--lv-text-muted)]">Usos actuales: {selectedRewardUsageCount}. {rewardDraft.kind === "sticker_pack" ? `Stickers enlazados: ${rewardStickerList.length}.` : `Reference key: ${rewardDraft.referenceKey || "sin definir"}.`}</div>
                  {selectedRewardTemplate ? <div className="rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4 text-sm text-[var(--lv-text-muted)]"><div className="font-medium text-[var(--lv-text)]">{selectedRewardTemplate.familyLabel}</div><div className="mt-2">{selectedRewardTemplate.description}</div></div> : null}
                  <div className="rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4 text-sm text-[var(--lv-text-muted)]">Una reward puede colgar de varios árboles. El canvas es donde se conectan esas dependencias.</div>
                </div>
              </FloatingInspector>
            ) : null}

            {activePanel === "validation" ? (
              <FloatingInspector
                title="Validacion"
                description="Estas reglas se gobiernan desde diagnostics, pero aquí ves sus incidencias reales sobre progression."
                style={activePanelStyle}
                onClose={() => setActivePanel(null)}
                onHeaderPointerDown={(event) => startPanelDrag("validation", event)}
                actions={
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    onClick={() => router.push("/admin/diagnostics")}
                  >
                    Abrir diagnostics
                  </button>
                }
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-3 text-sm">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">Total</div>
                      <div className="mt-1 text-2xl font-semibold text-[var(--lv-text)]">{progressionValidationIssues.length}</div>
                    </div>
                    <div className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-3 text-sm">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">Errores</div>
                      <div className="mt-1 text-2xl font-semibold text-[var(--lv-text)]">
                        {progressionValidationIssues.filter((issue) => issue.tone === "error").length}
                      </div>
                    </div>
                    <div className="rounded-[20px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-3 text-sm">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">Warnings</div>
                      <div className="mt-1 text-2xl font-semibold text-[var(--lv-text)]">
                        {progressionValidationIssues.filter((issue) => issue.tone === "warning").length}
                      </div>
                    </div>
                  </div>
                  {!progressionValidationIssues.length ? (
                    <div className="rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] p-4 text-sm text-[var(--lv-text-muted)]">
                      No hay incidencias activas para progression con las reglas actuales.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {progressionValidationIssues.map((issue) => (
                        <button
                          key={issue.id}
                          type="button"
                          onClick={() => focusValidationIssue(issue)}
                          className="block w-full rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-4 text-left shadow-[var(--lv-shadow-sm)] transition hover:bg-[var(--lv-surface-soft)]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-[var(--lv-text)]">{issue.title}</div>
                              <div className="mt-2 text-sm leading-6 text-[var(--lv-text-muted)]">{issue.detail}</div>
                            </div>
                            <div className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--lv-text-muted)]">
                              {issue.tone}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </FloatingInspector>
            ) : null}

          {viewMode === "canvas" ? (
            <ProgressionGraphCanvas nodes={graphCanvasNodes} links={graphDraft.links} positions={graphDraft.positions} relationModes={graphDraft.relationModes} activePanel={canvasActivePanel} linkingSourceKey={linkingSourceKey} fitContentSignal={fitContentSignal} onSelectNode={handleSelectGraphNode} onRequestLink={setLinkingSourceKey} onToggleLink={toggleCanvasLink} onChangePosition={updateGraphPosition} onChangeRelationMode={changeRelationMode} />
          ) : (
            <div className="absolute inset-0 overflow-auto px-4 pb-28 pt-28">
              <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">
                <div className="rounded-[28px] border border-[var(--lv-border)] bg-[rgba(255,255,255,0.94)] p-4 shadow-[0_18px_48px_rgba(21,36,24,0.1)] backdrop-blur">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_220px_220px]">
                    <label className="space-y-1 text-sm">
                      <div className={fieldLabelClass}>Buscar enlace</div>
                      <input className={fieldControlClass} placeholder="Título, subtítulo o zona del trail" value={linkSearch} onChange={(event) => setLinkSearch(event.target.value)} />
                    </label>
                    <label className="space-y-1 text-sm">
                      <div className={fieldLabelClass}>Origen</div>
                      <select className={fieldControlClass} value={linkSourceKindFilter} onChange={(event) => setLinkSourceKindFilter(event.target.value as "all" | "condition" | "tree" | "reward")}>
                        <option value="all">Todos</option>
                        <option value="condition">Condiciones</option>
                        <option value="tree">Arboles</option>
                        <option value="reward">Rewards</option>
                      </select>
                    </label>
                    <label className="space-y-1 text-sm">
                      <div className={fieldLabelClass}>Destino</div>
                      <select className={fieldControlClass} value={linkTargetKindFilter} onChange={(event) => setLinkTargetKindFilter(event.target.value as "all" | "condition" | "tree" | "reward")}>
                        <option value="all">Todos</option>
                        <option value="condition">Condiciones</option>
                        <option value="tree">Arboles</option>
                        <option value="reward">Rewards</option>
                      </select>
                    </label>
                  </div>
                  <div className="mt-3 text-sm text-[var(--lv-text-muted)]">
                    {filteredGraphLinkRows.length} enlace(s) visibles de {graphLinkRows.length}.
                  </div>
                </div>
                <div className="overflow-hidden rounded-[28px] border border-[var(--lv-border)] bg-[rgba(255,255,255,0.94)] shadow-[0_18px_48px_rgba(21,36,24,0.1)] backdrop-blur">
                  <div className="max-h-[calc(100dvh-250px)] overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead className="sticky top-0 z-10 bg-[var(--lv-surface-soft)] text-[var(--lv-text-muted)]">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">Origen</th>
                          <th className="px-4 py-3 text-left font-medium">Destino</th>
                          <th className="px-4 py-3 text-left font-medium">Entrada</th>
                          <th className="px-4 py-3 text-left font-medium">Zona / contexto</th>
                          <th className="px-4 py-3 text-left font-medium">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredGraphLinkRows.map((row) => (
                          <tr key={row.id} className="border-t border-[var(--lv-border)] align-top">
                            <td className="px-4 py-3">
                              <div className="font-medium text-[var(--lv-text)]">{row.sourceNode.title}</div>
                              <div className="text-xs text-[var(--lv-text-muted)]">
                                {labelGraphNodeKind(row.sourceNode.kind)} · {row.sourceNode.subtitle}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-[var(--lv-text)]">{row.targetNode.title}</div>
                              <div className="text-xs text-[var(--lv-text-muted)]">
                                {labelGraphNodeKind(row.targetNode.kind)} · {row.targetNode.subtitle}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-[var(--lv-text)]">{row.targetMode ? row.targetMode.toUpperCase() : "—"}</td>
                            <td className="px-4 py-3 text-[var(--lv-text-muted)]">{row.targetRegionLabel ?? "Sin zona especifica"}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <button type="button" className={secondaryButtonClass} onClick={() => openGraphNodeFromList(row.sourceKey)}>Abrir origen</button>
                                <button type="button" className={secondaryButtonClass} onClick={() => openGraphNodeFromList(row.targetKey)}>Abrir destino</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {!filteredGraphLinkRows.length ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-[var(--lv-text-muted)]">
                              No hay enlaces para ese filtro todavia.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
            <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-[28px] border border-[var(--lv-border)] bg-[rgba(255,255,255,0.96)] p-3 shadow-[0_18px_48px_rgba(21,36,24,0.12)] backdrop-blur">
              <button
                type="button"
                className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm transition hover:bg-[var(--lv-surface-soft)]"
                onClick={redistributeGraphCards}
              >
                Redistribuir cards
              </button>
              <button
                type="button"
                className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm transition hover:bg-[var(--lv-surface-soft)]"
                onClick={focusGraphContent}
              >
                Centrar vista
              </button>
              <button
                type="button"
                className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm transition hover:bg-[var(--lv-surface-soft)]"
                onClick={() => void seedCanonicalLibrary()}
              >
                Sembrar base canonica
              </button>
              <button
                type="button"
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  viewMode === "list"
                    ? "border-[var(--lv-primary)] bg-[var(--lv-primary-soft)] text-[var(--lv-primary-strong)]"
                    : "border-[var(--lv-border)] bg-[var(--lv-surface)] hover:bg-[var(--lv-surface-soft)]"
                }`}
                onClick={() =>
                  setViewMode((current) => (current === "canvas" ? "list" : "canvas"))
                }
              >
                {viewMode === "canvas" ? "Lista" : "Canvas"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal open={pendingDeleteTimelineRule !== null} title="Borrar árbol" description={pendingDeleteTimelineRule ? `Se borrará "${pendingDeleteTimelineRule.title}".` : undefined} confirmLabel="Si, borrar" tone="danger" onConfirm={() => void confirmDeleteTimelineRule()} onCancel={() => setPendingDeleteTimelineRule(null)} />
      <ConfirmModal open={pendingDeleteAchievementRule !== null} title="Borrar condición" description={pendingDeleteAchievementRule ? `Se borrará "${pendingDeleteAchievementRule.title}" y sus desbloqueos.` : undefined} confirmLabel="Si, borrar" tone="danger" onConfirm={() => void confirmDeleteAchievementRule()} onCancel={() => setPendingDeleteAchievementRule(null)} />
      <ConfirmModal open={pendingDeleteReward !== null} title="Borrar reward" description={pendingDeleteReward ? `Se borrará "${pendingDeleteReward.title}" y se desasignará de las condiciones.` : undefined} confirmLabel="Si, borrar" tone="danger" onConfirm={() => void confirmDeleteReward()} onCancel={() => setPendingDeleteReward(null)} />
    </div>
  );
}
