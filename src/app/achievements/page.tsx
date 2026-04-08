"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { ProgressionMilestoneTree } from "@/components/shared/ProgressionMilestoneTree";
import { getMyProfile, getSessionUser } from "@/lib/auth";
import { isSchemaNotReadyError, resolveActiveGardenIdForUser, withGardenScope } from "@/lib/gardens";
import { toErrorMessage } from "@/lib/errorMessage";
import { isSuperadminRole, type AppRole } from "@/lib/roles";
import { getProductSurface, getProductSurfaceHref, getYearBookHref } from "@/lib/productSurfaces";
import { PROGRESSION_CONDITION_TEMPLATES } from "@/lib/progressionCatalog";
import {
  PROGRESSION_TREE_RANK_OPTIONS,
  mapProgressionRankToLegacyTier,
  normalizeProgressionLeafVariant,
  normalizeProgressionTreeRank,
  normalizeProgressionTreeRarity,
  type ProgressionTreeRank,
  type ProgressionTreeRarity,
} from "@/lib/progressionTreeVisuals";
import { PROGRESSION_REWARD_KIND_LABELS_V1 as PROGRESSION_REWARD_KIND_LABELS } from "@/lib/progressionRewardsV1";
import { progressionStickerTokenToSrc } from "@/lib/progressionRewardsRuntime";
import { syncProgressionUnlocks } from "@/lib/progressionUnlocks";
import { supabase } from "@/lib/supabase";
import {
  PROGRESSION_GRAPH_DB_KEY,
  makeProgressionGraphNodeKey,
  normalizeProgressionGraphDraft,
  splitProgressionGraphNodeKey,
} from "@/lib/progressionGraph";
import {
  buildLegacyCompatibleProgressionRules,
  type CanonicalProgressionGraphStateRow,
  type CanonicalProgressionTreeRow,
  type CanonicalProgressionTreeUnlockRow,
} from "@/lib/progressionRuntime";

const SURFACE = getProductSurface("achievements");

function decodeEscapedUnicode(value: string) {
  return value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) =>
    String.fromCharCode(Number.parseInt(hex, 16)),
  );
}

type FilterTab = "all" | "pending" | "claimed";
type RankFilter = "all" | ProgressionTreeRank;
type RewardKind = string;

type AchievementReward = {
  unlockId: string | null;
  id: string;
  kind: RewardKind;
  title: string;
  description: string | null;
  referenceKey: string | null;
  payload: Record<string, unknown> | null;
  claimed_at: string | null;
};

type AchievementRow = {
  id: string;
  unlocked_at: string;
  claimed_at: string | null;
  reasons: Array<{
    title: string;
    description: string | null;
  }>;
  rule: {
    id: string;
    tier: "bronze" | "silver" | "gold" | "diamond";
    rank: ProgressionTreeRank;
    rarity: ProgressionTreeRarity;
    importance: "paso" | "importante" | "mayor" | "anual";
    leafVariant: number;
    accentColor: string | null;
    title: string;
    description: string | null;
  };
  rewards: AchievementReward[];
};

type RewardRow = {
  id: string;
  kind: RewardKind;
  title: string;
  description: string | null;
  payload: Record<string, unknown> | null;
  reference_key: string | null;
  enabled: boolean | null;
};

type RewardUnlockRow = {
  id: string | null;
  reward_id: string;
  source_tree_id: string | null;
  claimed_at: string | null;
};

type ConditionRow = {
  id: string;
  title: string;
  description: string | null;
  template_id: string | null;
  enabled: boolean | null;
};

type GraphStateRow = CanonicalProgressionGraphStateRow & {
  condition_settings?: unknown;
  links?: unknown;
  relation_modes?: unknown;
};

type ClaimCelebrationState = {
  rows: AchievementRow[];
  createdAt: string;
};

type RewardLibraryTab = "cards" | "rituals";

type RewardLibraryEntry = {
  unlockId: string;
  rewardId: string;
  kind: "message" | "gift";
  title: string;
  body: string;
  sourceTitle: string;
  unlockedAt: string;
  claimedAt: string | null;
  href: string | null;
  cta: string | null;
};

const yearFromIso = (value: string) => {
  const year = Number(String(value).slice(0, 4));
  return Number.isInteger(year) && year > 1900 ? year : null;
};

const formatDate = (value: string) => {
  const parsed = new Date(value);
  return decodeEscapedUnicode(
    Number.isNaN(parsed.getTime())
      ? "Sin fecha"
      : parsed.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }),
  );
};

const importanceLabel = (value: AchievementRow["rule"]["importance"]) =>
  decodeEscapedUnicode(
    value === "paso" ? "Paso" : value === "importante" ? "Importante" : value === "mayor" ? "Mayor" : "Anual",
  );

const rarityLabel = (value: ProgressionTreeRarity) =>
  decodeEscapedUnicode(
    value === "common"
      ? "Com\u00fan"
      : value === "uncommon"
        ? "Poco com\u00fan"
        : value === "rare"
          ? "Raro"
          : value === "epic"
            ? "\u00c9pico"
            : value === "legendary"
              ? "Legendario"
              : "M\u00edtico",
  );

const rankLabel = (rank: ProgressionTreeRank) =>
  decodeEscapedUnicode(PROGRESSION_TREE_RANK_OPTIONS.find((option) => option.value === rank)?.label ?? rank);

const rankTone = (rank: ProgressionTreeRank) =>
  rank === "bronze"
    ? "border-[#cfa37d] bg-[#fff2e8]"
    : rank === "silver"
      ? "border-[#a8b7d7] bg-[#f5f8ff]"
      : rank === "gold"
        ? "border-[#d8c36d] bg-[#fffbe8]"
        : rank === "diamond"
          ? "border-[#a79be8] bg-[#f3f1ff]"
          : rank === "mythic"
            ? "border-[#bf97f1] bg-[#f8efff]"
            : rank === "celestial"
              ? "border-[#7cc9ef] bg-[#eefbff]"
              : "border-[#8cc8a6] bg-[#eef9f2]";

const rankNarrative = (rank: ProgressionTreeRank) =>
  decodeEscapedUnicode(
    rank === "bronze"
      ? "Primer tronco del bosque: constancia inicial."
      : rank === "silver"
        ? "El bosque gana forma: h\u00e1bitos que se sostienen."
        : rank === "gold"
          ? "Rama fuerte: etapas bonitas y consistentes."
          : rank === "diamond"
            ? "\u00c1rbol de referencia: un hito importante ya consolidado."
            : rank === "mythic"
              ? "Hito m\u00edtico: desbloqueo poco frecuente y muy visible."
              : rank === "celestial"
                ? "Hito celestial: capa excepcional del recorrido."
                : "Hito eterno: cambia la lectura global de vuestra historia.",
  );

const importanceWeight = (value: AchievementRow["rule"]["importance"]) =>
  value === "anual" ? 4 : value === "mayor" ? 3 : value === "importante" ? 2 : 1;

function rewardKindLabel(kind: RewardKind) {
  return decodeEscapedUnicode(
    PROGRESSION_REWARD_KIND_LABELS[kind as keyof typeof PROGRESSION_REWARD_KIND_LABELS] ?? kind,
  );
}

function normalizeMeaningText(value: string | null | undefined) {
  const next = decodeEscapedUnicode(String(value ?? "").trim());
  return next ? next.replace(/\s+/g, " ") : null;
}

function normalizeMeaningSearchText(value: string | null | undefined) {
  const next = normalizeMeaningText(value);
  if (!next) return "";
  return next
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function rewardPayloadText(reward: AchievementReward, key: string) {
  const value = reward.payload?.[key];
  return typeof value === "string" ? normalizeMeaningText(value) : null;
}

function toLowerSentence(value: string) {
  const trimmed = normalizeMeaningText(value);
  if (!trimmed) return "";
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

function milestoneContextText(row: AchievementRow) {
  return [
    normalizeMeaningText(row.rule.title),
    normalizeMeaningText(row.rule.description),
    ...row.reasons.flatMap((reason) => [
      normalizeMeaningText(reason.title),
      normalizeMeaningText(reason.description),
    ]),
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");
}

function buildMeaningfulCardBody(row: AchievementRow) {
  const description = normalizeMeaningText(row.rule.description);
  const reason = normalizeMeaningText(row.reasons[0]?.description);
  const reasonTitle = normalizeMeaningText(row.reasons[0]?.title);
  const close = "Seguid cuidando esto: ya forma parte de vuestra historia.";

  if (description && reason) {
    return `${description} ${reason} ${close}`;
  }
  if (description && reasonTitle) {
    return `${description} Se abri\u00f3 cuando apareci\u00f3 ${toLowerSentence(reasonTitle)}. ${close}`;
  }
  if (description) {
    return `${description} ${close}`;
  }
  if (reason) {
    return `${reason} ${close}`;
  }
  if (reasonTitle) {
    return `Esta carta nace cuando aparece ${toLowerSentence(reasonTitle)}. ${close}`;
  }
  return `Esta carta guarda el significado de ${toLowerSentence(row.rule.title)}. ${close}`;
}

function buildMeaningfulRitualBody(row: AchievementRow) {
  const context = normalizeMeaningSearchText(milestoneContextText(row));
  const intro =
    normalizeMeaningText(row.rule.description) ??
    normalizeMeaningText(row.reasons[0]?.description) ??
    `Este hito reconoce ${toLowerSentence(row.rule.title)}.`;

  let action =
    "Recuperad este gesto en peque\u00f1o y guardad una nueva pagina para que el hito siga creciendo.";

  if (/(voz|audio|escucha)/.test(context)) {
    action =
      "Dejad hoy una nota de voz breve para seguir d\u00e1ndole presencia real a este recuerdo.";
  } else if (/(lugar|mapa|ruta|paseo|camino|trayecto)/.test(context)) {
    action = "Volved a ese lugar o trayecto y guardad una nueva capa de lo que ahora significa para vosotros.";
  } else if (/(noche|luna|intimidad)/.test(context)) {
    action =
      "Repetid un gesto de noche y dejad una linea o una voz para marcar por qu\u00e9 vuelve.";
  } else if (/(manana|morning)/.test(context)) {
    action =
      "Reservad un comienzo de dia bonito y contadlo con una pagina peque\u00f1a o una nota breve.";
  } else if (/(promesa|futuro|capsula)/.test(context)) {
    action =
      "Escribid una promesa concreta para m\u00e1s adelante y ligadla a una fecha o a una semilla.";
  } else if (/(estacion|primavera|verano|otono|invierno)/.test(context)) {
    action =
      "Nombrad c\u00f3mo est\u00e1is viviendo esta estacion y dejad una pagina que la abra o la cierre.";
  } else if (/(casa|hogar|refugio|home)/.test(context)) {
    action = "Elegid un gesto de casa para repetirlo esta semana y guardarlo como vuestro.";
  } else if (/(aniversario|cumple|celebr|luz)/.test(context)) {
    action =
      "Volved a celebrar algo peque\u00f1o y dejad constancia de por qu\u00e9 brill\u00f3.";
  } else if (/(semilla|plan|florec|flower|riego)/.test(context)) {
    action = "Plantad o recuperad un plan peque\u00f1o que nazca de este mismo impulso.";
  }

  return `${intro} ${action}`;
}

function rewardHeadline(reward: AchievementReward, row?: AchievementRow) {
  const payloadHeadline = rewardPayloadText(reward, "headline");
  if (payloadHeadline) {
    return decodeEscapedUnicode(payloadHeadline);
  }
  if (row && reward.kind === "message") {
    return decodeEscapedUnicode(`Carta de ${row.rule.title}`);
  }
  if (row && reward.kind === "gift") {
    return decodeEscapedUnicode(`Ritual de ${row.rule.title}`);
  }
  if (reward.kind === "message") {
    return decodeEscapedUnicode(String(reward.payload?.text ?? reward.description ?? reward.title));
  }
  if (reward.kind === "gift") {
    return decodeEscapedUnicode(String(reward.payload?.description ?? reward.description ?? reward.title));
  }
  return decodeEscapedUnicode(reward.title);
}

function celebrationRewards(rows: AchievementRow[]) {
  return rows.flatMap((row) => row.rewards);
}

function rewardPreviewCopy(reward: AchievementReward, row?: AchievementRow) {
  const payloadBody = rewardPayloadText(reward, "body");
  if ((reward.kind === "message" || reward.kind === "gift") && payloadBody) {
    return decodeEscapedUnicode(payloadBody);
  }
  if (row && reward.kind === "message") {
    return decodeEscapedUnicode(buildMeaningfulCardBody(row));
  }
  if (row && reward.kind === "gift") {
    return decodeEscapedUnicode(buildMeaningfulRitualBody(row));
  }
  if (reward.kind === "message") {
    return decodeEscapedUnicode(String(reward.payload?.text ?? reward.description ?? reward.title));
  }
  if (reward.kind === "gift") {
    return decodeEscapedUnicode(String(reward.payload?.description ?? reward.description ?? reward.title));
  }
  if (reward.kind === "sticker_pack") {
    return decodeEscapedUnicode(String(reward.payload?.packName ?? reward.description ?? reward.title));
  }
  return decodeEscapedUnicode(reward.description ?? reward.title);
}

function rewardSummary(row: AchievementRow) {
  if (!row.rewards.length) return decodeEscapedUnicode("Todav\u00eda no trae una recompensa asociada.");
  if (row.rewards.length === 1) {
    const reward = row.rewards[0];
    if (reward.kind === "message" || reward.kind === "gift") {
      return rewardPreviewCopy(reward, row);
    }
    return decodeEscapedUnicode(reward.title);
  }
  const visible = row.rewards.slice(0, 3).map((reward) => reward.title);
  const extra = row.rewards.length > visible.length ? ` +${row.rewards.length - visible.length}` : "";
  return decodeEscapedUnicode(`${visible.join(" \u00b7 ")}${extra}`);
}

function rewardPreviewSources(reward: AchievementReward) {
  if (reward.kind === "sticker_pack") {
    const stickers = Array.isArray(reward.payload?.stickers) ? reward.payload.stickers : [];
    const sources = stickers
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .slice(0, 3)
      .map((item) => progressionStickerTokenToSrc(item));
    return sources.length ? sources : ["/stickers/sticker_star.svg"];
  }

  const token =
    reward.kind === "canvas_tool"
      ? String(reward.payload?.toolKey ?? reward.referenceKey ?? "star")
      : reward.kind === "canvas_template"
        ? String(reward.payload?.templateKey ?? reward.referenceKey ?? "washi")
        : reward.kind === "canvas_effect"
          ? String(reward.payload?.effectKey ?? reward.referenceKey ?? "cloud")
          : reward.kind === "page_frame"
            ? String(reward.payload?.frameKey ?? reward.referenceKey ?? "washi")
            : reward.kind === "page_background"
              ? String(reward.payload?.backgroundKey ?? reward.referenceKey ?? "cloud")
              : reward.kind === "year_chapter"
                ? String(reward.payload?.chapterKey ?? reward.referenceKey ?? "year")
                : reward.kind === "pdf_detail"
                  ? String(reward.payload?.pdfKey ?? reward.referenceKey ?? "pdf")
                  : reward.kind === "gift"
                    ? "heart"
                    : reward.kind === "message"
                      ? "star"
                      : String(reward.referenceKey ?? reward.title ?? "star");

  return [progressionStickerTokenToSrc(token)];
}

function CelebrationRewardPreview({
  reward,
  extraCount,
  sourceRow,
}: {
  reward: AchievementReward;
  extraCount: number;
  sourceRow: AchievementRow | null;
}) {
  const sources = rewardPreviewSources(reward);
  const isStickerPack = reward.kind === "sticker_pack";

  return (
    <div className="rounded-[24px] border border-white/12 bg-white/[0.09] p-4 text-left shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
      <div className="text-[10px] uppercase tracking-[0.32em] text-white/52">Recompensa</div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="rounded-full border border-[#dceccf]/20 bg-[#dceccf]/10 px-3 py-1 text-[11px] text-[#eff8e7]">
          {rewardKindLabel(reward.kind)}
        </div>
        {extraCount > 0 ? (
          <div className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] text-white/68">
            +{extraCount} desbloqueos mas
          </div>
        ) : null}
      </div>
      <div className="mt-3 text-xl font-semibold text-white">{rewardHeadline(reward, sourceRow ?? undefined)}</div>
      <p className="mt-2 text-sm leading-6 text-white/72">{rewardPreviewCopy(reward, sourceRow ?? undefined)}</p>

      {isStickerPack ? (
        <div className="mt-5 flex flex-wrap gap-3">
          {sources.map((src, index) => (
            <div
              key={`${reward.id}-${src}-${index}`}
              className="flex h-[84px] w-[84px] items-center justify-center rounded-[22px] border border-white/12 bg-[radial-gradient(circle_at_top,#314438_0%,#1a241c_88%)] shadow-[0_12px_24px_rgba(0,0,0,0.18)]"
            >
              <Image src={src} alt={reward.title} width={48} height={48} className="h-12 w-12 object-contain" />
            </div>
          ))}
        </div>
      ) : reward.kind === "message" || reward.kind === "gift" ? (
        <div className="mt-5 rounded-[20px] border border-[#ebe0b6]/16 bg-[linear-gradient(180deg,rgba(255,248,226,0.09)_0%,rgba(255,255,255,0.04)_100%)] p-4 text-sm leading-6 text-[#f4efd8]">
          {rewardPreviewCopy(reward, sourceRow ?? undefined)}
        </div>
      ) : (
        <div className="mt-5 flex items-center gap-4 rounded-[22px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.03)_100%)] p-4">
          <div className="flex h-[84px] w-[84px] items-center justify-center rounded-[22px] border border-white/12 bg-[radial-gradient(circle_at_top,#314438_0%,#1a241c_88%)] shadow-[0_12px_24px_rgba(0,0,0,0.18)]">
            <Image
              src={sources[0] ?? "/stickers/sticker_star.svg"}
              alt={reward.title}
              width={48}
              height={48}
              className="h-12 w-12 object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-white/84">{rewardHeadline(reward, sourceRow ?? undefined)}</div>
            <div className="mt-2 text-xs leading-5 text-white/60">
              {reward.kind === "year_chapter" || reward.kind === "pdf_detail"
                ? "Este desbloqueo suma una capa editorial visible en el libro y en el recorrido anual."
                : "Esta recompensa queda disponible como recurso bonito dentro del lenguaje creativo del proyecto."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function rewardVisibilitySummary(reward: AchievementReward, unlockedYear: number | null) {
  if (reward.kind === "message") {
    return {
      where: "Se guarda como carta del bosque y puedes volver a abrirla desde esta pagina.",
      href: null as string | null,
      cta: null as string | null,
    };
  }
  if (reward.kind === "gift") {
    const surface = String(reward.payload?.surface ?? "").trim().toLowerCase();
    const ctaLabel = String(reward.payload?.ctaLabel ?? "").trim() || "Abrir planes";
    return {
      where: "Se guarda como ritual sugerido y puedes reutilizarlo o llevarlo a planes cuando quieras.",
      href: surface === "plans" ? "/plans" : null,
      cta: surface === "plans" ? ctaLabel : null,
    };
  }
  if (reward.kind === "sticker_pack") {
    return {
      where: "Queda disponible cuando edites una pagina, dentro de packs creativos, stickers y recursos ligeros.",
      href: null as string | null,
      cta: null as string | null,
    };
  }
  if (
    reward.kind === "canvas_tool" ||
    reward.kind === "canvas_template" ||
    reward.kind === "canvas_effect" ||
    reward.kind === "page_frame" ||
    reward.kind === "page_background"
  ) {
    return {
      where: "Queda disponible cuando edites una pagina, dentro de composiciones, objetos y capas del lienzo.",
      href: null as string | null,
      cta: null as string | null,
    };
  }
  if (reward.kind === "year_chapter" || reward.kind === "pdf_detail") {
    return {
      where: unlockedYear
        ? `Se refleja en el año ${unlockedYear} y en el libro exportado.`
        : "Se refleja en el año y en el libro exportado.",
      href: unlockedYear ? getYearBookHref(unlockedYear) : null,
      cta: unlockedYear ? `Abrir año ${unlockedYear}` : null,
    };
  }
  return {
    where: "Existe en el catalogo de hitos, pero todavia no tiene una salida visible clara en la app.",
    href: null as string | null,
    cta: null as string | null,
  };
}

function buildRewardLibraryEntries(rows: AchievementRow[]) {
  return rows
    .filter((row) => Boolean(row.claimed_at))
    .flatMap((row) =>
      row.rewards.flatMap((reward) => {
        if (!reward.claimed_at) return [];
        if (reward.kind !== "message" && reward.kind !== "gift") return [];
        const visibility = rewardVisibilitySummary(reward, yearFromIso(row.unlocked_at));
        return [
          {
            unlockId: reward.unlockId ?? `${row.id}:${reward.id}`,
            rewardId: reward.id,
            kind: reward.kind,
            title: rewardHeadline(reward, row),
            body: rewardPreviewCopy(reward, row),
            sourceTitle: row.rule.title,
            unlockedAt: row.unlocked_at,
            claimedAt: reward.claimed_at,
            href: visibility.href,
            cta: visibility.cta,
          } satisfies RewardLibraryEntry,
        ];
      }),
    )
    .sort((left, right) => new Date(right.unlockedAt).getTime() - new Date(left.unlockedAt).getTime());
}

function buildTreeReasons(params: {
  treeId: string;
  graphRow: GraphStateRow | null;
  conditionRows: ConditionRow[];
}) {
  const graphDraft = normalizeProgressionGraphDraft({
    treeSettings: params.graphRow?.tree_settings ?? null,
    conditionSettings: params.graphRow?.condition_settings ?? null,
    links: params.graphRow?.links ?? null,
    relationModes: params.graphRow?.relation_modes ?? null,
  });
  const treeKey = makeProgressionGraphNodeKey("tree", params.treeId);
  const conditionById = new Map(params.conditionRows.map((row) => [row.id, row] as const));

  return graphDraft.links
    .filter((link) => link.target === treeKey)
    .map((link) => {
      const source = splitProgressionGraphNodeKey(link.source);
      if (source.kind !== "condition") return null;
      const condition = conditionById.get(source.entityId);
      const graphTemplateId = String(graphDraft.conditionSettings[link.source]?.templateId ?? "").trim() || null;
      const templateId = condition?.template_id ?? graphTemplateId;
      const template = PROGRESSION_CONDITION_TEMPLATES.find((entry) => entry.id === templateId) ?? null;
      const title = String(condition?.title ?? "").trim() || template?.title || "Condicion del sendero";
      const description =
        String(condition?.description ?? "").trim() || template?.description || null;
      return {
        title,
        description: description ? decodeEscapedUnicode(description) : null,
      };
    })
    .filter((entry): entry is { title: string; description: string | null } => entry !== null);
}

function buildClaimSuccessMessage(rows: AchievementRow[]) {
  if (!rows.length) return "Hito reclamado.";
  if (rows.length === 1) {
    const row = rows[0];
    if (!row.rewards.length) return `Hito reclamado: ${row.rule.title}. Ya forma parte del recorrido.`;
    const firstReward = row.rewards[0];
    const where = rewardVisibilitySummary(firstReward, yearFromIso(row.unlocked_at)).where;
    return `Hito reclamado: ${row.rule.title}. Recompensa: ${rewardHeadline(firstReward, row)}. ${where}`;
  }
  const rewarded = rows.filter((row) => row.rewards.length > 0).length;
  return `Has reclamado ${rows.length} hitos. ${rewarded ? `${rewarded} traen recompensas asociadas.` : "No habia recompensas asociadas en esta tanda."}`;
}

function buildCelebrationTitle(rows: AchievementRow[]) {
  if (rows.length === 1) return "Hito reclamado";
  return `${rows.length} hitos reclamados`;
}

function buildCelebrationBody(rows: AchievementRow[]) {
  if (!rows.length) return "El recorrido suma una nueva capa.";
  if (rows.length === 1) {
    const row = rows[0];
    return row.rewards.length ? rewardSummary(row) : "Ya forma parte del recorrido.";
  }
  const rewarded = rows.filter((row) => row.rewards.length > 0).length;
  return rewarded
    ? `${rewarded} de estos hitos traen recompensa asociada.`
    : "Ya forman parte del recorrido.";
}

export default function AchievementsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AchievementRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [tab, setTab] = useState<FilterTab>("pending");
  const [rankFilter, setRankFilter] = useState<RankFilter>("all");
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimingBulk, setClaimingBulk] = useState(false);
  const [myProfileId, setMyProfileId] = useState("");
  const [myRole, setMyRole] = useState<AppRole | null>(null);
  const [activeGardenId, setActiveGardenId] = useState<string | null>(null);
  const [showAllRows, setShowAllRows] = useState(false);
  const [claimCelebration, setClaimCelebration] = useState<ClaimCelebrationState | null>(null);
  const [rewardLibraryTab, setRewardLibraryTab] = useState<RewardLibraryTab | null>(null);
  const [rewardLibraryFocusUnlockId, setRewardLibraryFocusUnlockId] = useState<string | null>(null);
  const [copiedRitualId, setCopiedRitualId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const user = await getSessionUser();
        if (!user) {
          router.push("/login");
          return;
        }
        const profile = await getMyProfile(user.id);
        if (!active) return;
        setMyProfileId(profile.id);
        setMyRole(profile.role);

        const gardenId = await resolveActiveGardenIdForUser({
          userId: profile.id,
          forceRefresh: true,
        }).catch(() => null);
        if (!active) return;
        setActiveGardenId(gardenId);
        await syncProgressionUnlocks(gardenId);

        const [treeUnlocksRes, treeRowsRes, conditionRowsRes, rewardUnlocksRes, rewardRowsRes, graphRes] = await Promise.all([
          withGardenScope(
            supabase
              .from("progression_tree_unlocks")
              .select("id,tree_id,unlocked_at,claimed_at")
              .order("unlocked_at", { ascending: false }),
            gardenId,
          ),
          supabase.from("progression_tree_nodes").select("id,title,description,accent_color,rank,rarity,leaf_variant,enabled"),
          supabase.from("progression_conditions").select("id,title,description,template_id,enabled"),
          withGardenScope(
            supabase.from("progression_reward_unlocks").select("id,reward_id,source_tree_id,claimed_at"),
            gardenId,
          ),
          supabase.from("progression_rewards").select("id,kind,title,description,payload,reference_key,enabled"),
          supabase
            .from("progression_graph_state")
            .select("tree_settings,condition_settings,links,relation_modes")
            .eq("key", PROGRESSION_GRAPH_DB_KEY)
            .maybeSingle(),
        ]);

        const errors = [
          treeUnlocksRes.error,
          treeRowsRes.error,
          conditionRowsRes.error,
          rewardUnlocksRes.error,
          rewardRowsRes.error,
          graphRes.error,
        ].filter(Boolean);
        const blocking = errors.find((error) => !isSchemaNotReadyError(error));
        if (blocking) {
          throw new Error(toErrorMessage(blocking, "No se pudo cargar progression."));
        }
        if (errors.length) return;

        const treeRows = ((treeRowsRes.data as CanonicalProgressionTreeRow[] | null) ?? []).filter(
          (row) => row.enabled !== false,
        );
        const conditionRows = ((conditionRowsRes.data as ConditionRow[] | null) ?? []).filter(
          (row) => row.enabled !== false,
        );
        const graphRow = (graphRes.data as GraphStateRow | null) ?? null;
        const rulesById = buildLegacyCompatibleProgressionRules({
          trees: treeRows,
          graphStateRow: graphRow,
        });
        const treeById = new Map(treeRows.map((tree) => [tree.id, tree] as const));
        const rewardById = new Map(
          (((rewardRowsRes.data as RewardRow[] | null) ?? []).filter((row) => row.enabled !== false)).map((reward) => [
            reward.id,
            reward,
          ] as const),
        );
        const rewardsByTree = new Map<string, AchievementReward[]>();

        for (const unlock of (rewardUnlocksRes.data as RewardUnlockRow[] | null) ?? []) {
          const sourceTreeId = String(unlock.source_tree_id ?? "").trim();
          const reward = rewardById.get(String(unlock.reward_id ?? "").trim());
          if (!sourceTreeId || !reward) continue;
          const list = rewardsByTree.get(sourceTreeId) ?? [];
          list.push({
            unlockId: unlock.id ?? null,
            id: reward.id,
            kind: reward.kind,
            title: reward.title,
            description: reward.description ? String(reward.description) : null,
            referenceKey: reward.reference_key ? String(reward.reference_key) : null,
            payload: reward.payload && typeof reward.payload === "object" ? reward.payload : null,
            claimed_at: unlock.claimed_at ? String(unlock.claimed_at) : null,
          });
          rewardsByTree.set(sourceTreeId, list);
        }

        const nextRows = (((treeUnlocksRes.data as CanonicalProgressionTreeUnlockRow[] | null) ?? []).map(
          (unlock): AchievementRow | null => {
            const treeId = String(unlock.tree_id ?? "").trim();
            const tree = treeById.get(treeId);
            if (!tree) return null;
            const rule = rulesById[treeId];
            const rank = normalizeProgressionTreeRank(tree.rank ?? rule?.rank);
            const rarity = normalizeProgressionTreeRarity(tree.rarity ?? rule?.rarity);
            return {
              id: String(unlock.id ?? treeId),
              unlocked_at: String(unlock.unlocked_at ?? new Date().toISOString()),
              claimed_at: unlock.claimed_at ? String(unlock.claimed_at) : null,
              reasons: buildTreeReasons({
                treeId,
                graphRow,
                conditionRows,
              }),
              rule: {
                id: treeId,
                tier: mapProgressionRankToLegacyTier(rank),
                rank,
                rarity,
                importance: rule?.importance ?? "importante",
                leafVariant: normalizeProgressionLeafVariant(tree.leaf_variant ?? rule?.leaf_variant),
                accentColor: tree.accent_color ? String(tree.accent_color) : (rule?.accent_color ?? null),
                title: String(tree.title ?? "Hito del sendero"),
                description:
                  typeof tree.description === "string" && tree.description.trim() ? tree.description : null,
              },
              rewards: rewardsByTree.get(treeId) ?? [],
            };
          },
        ).filter((row): row is AchievementRow => row !== null));

        if (active) setRows(nextRows);
      } catch (error) {
        if (active) {
          setMsg(toErrorMessage(error, "No se pudieron cargar los hitos."));
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [router]);

  const counters = useMemo(() => {
    const pending = rows.filter((row) => !row.claimed_at).length;
    const total = rows.length;
    const claimed = total - pending;
    return {
      pending,
      claimed,
      total,
    };
  }, [rows]);

  const filteredRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          (tab === "pending" ? !row.claimed_at : tab === "claimed" ? Boolean(row.claimed_at) : true) &&
          (rankFilter === "all" || row.rule.rank === rankFilter),
      ),
    [rankFilter, rows, tab],
  );

  const pendingFilteredIds = useMemo(
    () => filteredRows.filter((row) => !row.claimed_at).map((row) => row.id),
    [filteredRows],
  );
  const claimCelebrationRewards = useMemo(
    () => (claimCelebration ? celebrationRewards(claimCelebration.rows) : []),
    [claimCelebration],
  );
  const claimCelebrationPrimaryReward = claimCelebrationRewards[0] ?? null;
  const rewardLibraryEntries = useMemo(() => buildRewardLibraryEntries(rows), [rows]);
  const claimedLetterRewards = useMemo(
    () => rewardLibraryEntries.filter((entry) => entry.kind === "message"),
    [rewardLibraryEntries],
  );
  const claimedRitualRewards = useMemo(
    () => rewardLibraryEntries.filter((entry) => entry.kind === "gift"),
    [rewardLibraryEntries],
  );

  const sortedRows = useMemo(
    () =>
      [...filteredRows].sort((a, b) => {
        if (tab === "pending") {
          const importanceDelta = importanceWeight(b.rule.importance) - importanceWeight(a.rule.importance);
          if (importanceDelta !== 0) return importanceDelta;
        }
        return new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime();
      }),
    [filteredRows, tab],
  );

  const visibleRows = useMemo(() => (showAllRows ? sortedRows : sortedRows.slice(0, 8)), [showAllRows, sortedRows]);

  const hiddenRowsCount = Math.max(0, sortedRows.length - visibleRows.length);

  useEffect(() => {
    setShowAllRows(false);
  }, [rankFilter, tab]);

  useEffect(() => {
    if (rewardLibraryTab === "cards" && claimedLetterRewards.length === 0) {
      setRewardLibraryTab(claimedRitualRewards.length ? "rituals" : null);
      return;
    }
    if (rewardLibraryTab === "rituals" && claimedRitualRewards.length === 0) {
      setRewardLibraryTab(claimedLetterRewards.length ? "cards" : null);
    }
  }, [claimedLetterRewards.length, claimedRitualRewards.length, rewardLibraryTab]);

  useEffect(() => {
    if (!rewardLibraryTab || typeof document === "undefined") return;
    const timer = window.setTimeout(() => {
      document.getElementById("reward-library-panel")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 40);
    return () => window.clearTimeout(timer);
  }, [rewardLibraryFocusUnlockId, rewardLibraryTab]);

  function openRewardCollection(reward: AchievementReward) {
    if (reward.kind !== "message" && reward.kind !== "gift") return;
    setRewardLibraryTab(reward.kind === "message" ? "cards" : "rituals");
    setRewardLibraryFocusUnlockId(reward.unlockId ?? reward.id);
  }

  async function copyRitual(entry: RewardLibraryEntry) {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      setMsg("No se pudo copiar este ritual en este dispositivo.");
      return;
    }
    await navigator.clipboard.writeText(entry.body);
    setCopiedRitualId(entry.unlockId);
    setMsg("Ritual copiado. Ya puedes llevarlo a planes cuando quieras.");
    window.setTimeout(() => {
      setCopiedRitualId((current) => (current === entry.unlockId ? null : current));
    }, 1800);
  }

  async function claimRows(ids: string[]) {
    if (!myProfileId || !ids.length) return;
    const claimedAt = new Date().toISOString();
    const touchedRows = rows.filter((row) => ids.includes(row.id));

    const treeQuery = withGardenScope(
      supabase
        .from("progression_tree_unlocks")
        .update({ claimed_at: claimedAt, claimed_by: myProfileId })
        .in("id", ids)
        .is("claimed_at", null),
      activeGardenId,
    );
    const { error } = await treeQuery;
    if (error) throw new Error(error.message);

    const rewardQuery = withGardenScope(
      supabase
        .from("progression_reward_unlocks")
        .update({ claimed_at: claimedAt, claimed_by: myProfileId })
        .in(
          "source_tree_id",
          touchedRows.map((row) => row.rule.id),
        )
        .is("claimed_at", null),
      activeGardenId,
    );
    const { error: rewardError } = await rewardQuery;
    if (rewardError) throw new Error(rewardError.message);

    const idSet = new Set(ids);
    setRows((prev) =>
      prev.map((row) =>
        idSet.has(row.id)
          ? {
              ...row,
              claimed_at: row.claimed_at ?? claimedAt,
              rewards: row.rewards.map((reward) => ({
                ...reward,
                claimed_at: reward.claimed_at ?? claimedAt,
              })),
            }
          : row,
      ),
    );
    setClaimCelebration({
      rows: touchedRows.map((row) => ({
        ...row,
        claimed_at: row.claimed_at ?? claimedAt,
        rewards: row.rewards.map((reward) => ({
          ...reward,
          claimed_at: reward.claimed_at ?? claimedAt,
        })),
      })),
      createdAt: claimedAt,
    });
    setMsg(buildClaimSuccessMessage(touchedRows));
  }

  if (loading) {
    return <PageLoadingState message="Cargando hitos..." />;
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7fbf7_0%,#f4f6f8_48%,#f6f4ef_100%)] p-6 text-slate-900">
      {claimCelebration ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(7,10,12,0.8)] px-4 backdrop-blur-[2px]"
          onClick={() => setClaimCelebration(null)}
        >
          <div
            className="relative w-full max-w-xl overflow-hidden rounded-[32px] border border-white/12 bg-[linear-gradient(180deg,#1c251d_0%,#101511_100%)] p-6 text-white shadow-[0_35px_100px_rgba(0,0,0,0.45)] lvRewardCelebration"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-0 opacity-80">
              <div className="absolute left-[-8%] top-[-12%] h-40 w-40 rounded-full bg-[radial-gradient(circle,#f4e8a6_0%,rgba(244,232,166,0.12)_45%,transparent_72%)] lvRewardOrb" />
              <div className="absolute right-[-6%] top-[10%] h-36 w-36 rounded-full bg-[radial-gradient(circle,#b9efd1_0%,rgba(185,239,209,0.12)_42%,transparent_72%)] lvRewardOrb lvRewardOrbDelay" />
            </div>

            <div className="relative z-[1] text-center">
              <div className="text-[11px] uppercase tracking-[0.38em] text-white/60">Desbloqueo</div>
              <h2 className="mt-3 text-3xl font-semibold">{buildCelebrationTitle(claimCelebration.rows)}</h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-white/72">
                {buildCelebrationBody(claimCelebration.rows)}
              </p>
            </div>

            <div
              className={`relative z-[1] mt-6 grid gap-4 ${
                claimCelebrationPrimaryReward ? "md:grid-cols-[184px_minmax(0,1fr)]" : ""
              }`}
            >
              <div className="rounded-[24px] border border-white/12 bg-white/[0.08] p-4 text-center">
                <div className="text-[10px] uppercase tracking-[0.32em] text-white/48">Hito</div>
                <div className="mt-4 flex justify-center">
                  <div className="rounded-[24px] border border-white/12 bg-white/8 p-4 lvRewardTreeWrap">
                    <ProgressionMilestoneTree
                      size={84}
                      rank={claimCelebration.rows[0]?.rule.rank ?? "gold"}
                      importance={claimCelebration.rows[0]?.rule.importance ?? "importante"}
                      rarity={claimCelebration.rows[0]?.rule.rarity ?? "rare"}
                      leafVariant={claimCelebration.rows[0]?.rule.leafVariant ?? 0}
                      accentColor={claimCelebration.rows[0]?.rule.accentColor ?? null}
                      claimed
                    />
                  </div>
                </div>
                <div className="mt-3 text-sm font-medium text-white/82">{claimCelebration.rows[0]?.rule.title}</div>
              </div>

              {claimCelebrationPrimaryReward ? (
                <CelebrationRewardPreview
                  reward={claimCelebrationPrimaryReward}
                  extraCount={Math.max(0, claimCelebrationRewards.length - 1)}
                  sourceRow={claimCelebration.rows[0] ?? null}
                />
              ) : null}
            </div>

            {claimCelebrationPrimaryReward ? (
              <div className="relative z-[1] mt-4 flex flex-wrap justify-center gap-2">
                {claimCelebrationPrimaryReward.kind === "message" ? (
                  <button
                    className="rounded-full border border-white/16 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/14"
                    onClick={() => {
                      openRewardCollection(claimCelebrationPrimaryReward);
                      setClaimCelebration(null);
                    }}
                  >
                    Abrir carta
                  </button>
                ) : null}
                {claimCelebrationPrimaryReward.kind === "gift" ? (
                  <button
                    className="rounded-full border border-white/16 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/14"
                    onClick={() => {
                      openRewardCollection(claimCelebrationPrimaryReward);
                      setClaimCelebration(null);
                    }}
                  >
                    Abrir ritual
                  </button>
                ) : null}
                {(() => {
                  if (!claimCelebrationPrimaryReward) return null;
                  const visibility = rewardVisibilitySummary(
                    claimCelebrationPrimaryReward,
                    yearFromIso(claimCelebration.rows[0]?.unlocked_at ?? ""),
                  );
                  if (!visibility.href || !visibility.cta) return null;
                  return (
                    <button
                      className="rounded-full border border-[#dceccf]/20 bg-[#dceccf]/10 px-4 py-2 text-sm text-[#eff8e7] transition hover:bg-[#dceccf]/16"
                      onClick={() => {
                        setClaimCelebration(null);
                        router.push(visibility.href!);
                      }}
                    >
                      {visibility.cta}
                    </button>
                  );
                })()}
              </div>
            ) : null}

            <div className="relative z-[1] mt-6 space-y-3">
              {claimCelebration.rows.slice(0, 3).map((row) => (
                <div
                  key={`${claimCelebration.createdAt}-${row.id}`}
                  className="rounded-[22px] border border-white/12 bg-white/8 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-base font-semibold">{row.rule.title}</div>
                    <div className="rounded-full border border-[#d6e8d0]/30 bg-[#d6e8d0]/10 px-3 py-1 text-[11px] text-[#eef8ea]">
                      Reclamado
                    </div>
                  </div>
                  {row.rewards.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {row.rewards.slice(0, 3).map((reward) => (
                        <div
                          key={`${row.id}-${reward.id}`}
                          className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs text-white/88"
                        >
                          {rewardKindLabel(reward.kind)}: {rewardHeadline(reward, row)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 text-sm text-white/68">Este hito celebra un avance del recorrido.</div>
                  )}
                </div>
              ))}
            </div>

            <div className="relative z-[1] mt-6 flex justify-center">
              <button
                className="min-w-[168px] rounded-full border border-[#f6e6aa]/60 bg-[linear-gradient(180deg,#fff4cb_0%,#efd58a_100%)] px-8 py-3 text-base font-semibold tracking-[0.06em] text-[#182317] shadow-[0_18px_38px_rgba(239,213,138,0.32)] transition hover:scale-[1.02] hover:shadow-[0_20px_44px_rgba(239,213,138,0.38)]"
                onClick={() => setClaimCelebration(null)}
              >
                Seguir
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-6xl space-y-5">
        <section className="rounded-[32px] border border-[rgba(120,150,120,0.2)] bg-white/90 p-6 shadow-[0_20px_60px_rgba(32,48,36,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="text-xs uppercase tracking-[0.35em] text-[var(--lv-text-muted)]">Hitos</div>
              <h1 className="mt-3 text-3xl font-semibold">Hitos del recorrido</h1>
              <p className="mt-3 text-sm text-[var(--lv-text-muted)]">
                Lo ya desbloqueado y lo que sigue pendiente dentro del bosque.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-2xl border bg-white px-4 py-2 text-sm"
                onClick={() => router.push("/home")}
              >
                Volver
              </button>
              <button
                className="rounded-2xl border bg-white px-4 py-2 text-sm"
                onClick={() => router.push(getProductSurfaceHref("forest"))}
              >
                Abrir bosque
              </button>
              {isSuperadminRole(myRole) ? (
                <button
                  className="rounded-2xl border bg-white px-4 py-2 text-sm"
                  onClick={() => router.push("/admin/progression")}
                >
                  {decodeEscapedUnicode("Admin progresi\\u00f3n")}
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <div className="rounded-full border border-[#c9dec8] bg-[#eefaf0] px-4 py-2 text-sm">
              Pendientes de reclamar: <span className="font-semibold">{counters.pending}</span>
            </div>
            <div className="rounded-full border border-[#d9e3eb] bg-white px-4 py-2 text-sm">
              Ya reclamados: <span className="font-semibold">{counters.claimed}</span>
            </div>
          </div>
        </section>

        {msg ? <StatusNotice message={msg} /> : null}

        <section className="rounded-[28px] border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            {(["pending", "claimed", "all"] as const).map((value) => (
              <button
                key={value}
                className={`rounded-2xl border px-3 py-2 text-sm ${
                  tab === value ? "border-[#c9dec8] bg-[#eefaf0]" : "bg-white"
                }`}
                onClick={() => setTab(value)}
              >
                {value === "pending" ? "Pendientes" : value === "claimed" ? "Ya vividos" : "Todo"}
              </button>
            ))}
            <select
              className="rounded-2xl border bg-white px-3 py-2 text-sm"
              value={rankFilter}
              onChange={(e) => setRankFilter(e.target.value as RankFilter)}
            >
              <option value="all">{decodeEscapedUnicode("Todas las categor\\u00edas")}</option>
              {PROGRESSION_TREE_RANK_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <div className="px-1 text-sm text-[var(--lv-text-muted)]">{sortedRows.length} visible(s)</div>
              {tab !== "claimed" ? (
                <button
                  className="rounded-2xl border bg-white px-3 py-2 text-sm disabled:opacity-50"
                  disabled={claimingBulk || pendingFilteredIds.length === 0}
                  onClick={async () => {
                    try {
                      setClaimingBulk(true);
                      setMsg(null);
                      await claimRows(pendingFilteredIds);
                    } catch (error) {
                      setMsg(toErrorMessage(error, "No se pudieron reclamar los hitos visibles."));
                    } finally {
                      setClaimingBulk(false);
                    }
                  }}
                >
                  {claimingBulk ? "Reclamando..." : `Reclamar visibles (${pendingFilteredIds.length})`}
                </button>
              ) : null}
            </div>
          </div>
        </section>

        {claimedLetterRewards.length || claimedRitualRewards.length ? (
          <section
            id="reward-library-panel"
            className="rounded-[28px] border bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-3xl">
                <div className="text-xs uppercase tracking-[0.3em] text-[var(--lv-text-muted)]">Coleccion viva</div>
                <h2 className="mt-1 text-2xl font-semibold">Cartas y rituales</h2>
                <p className="mt-2 text-sm text-[var(--lv-text-muted)]">
                  Las cartas quedan guardadas para releerlas. Los rituales se pueden reusar y llevar a planes.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {claimedLetterRewards.length ? (
                  <button
                    className={`rounded-2xl border px-4 py-2 text-sm ${
                      rewardLibraryTab === "cards" ? "border-[#d8d1b6] bg-[#f8f3e4]" : "bg-white"
                    }`}
                    onClick={() => setRewardLibraryTab((current) => (current === "cards" ? null : "cards"))}
                  >
                    Cartas del bosque ({claimedLetterRewards.length})
                  </button>
                ) : null}
                {claimedRitualRewards.length ? (
                  <button
                    className={`rounded-2xl border px-4 py-2 text-sm ${
                      rewardLibraryTab === "rituals" ? "border-[#c9dec8] bg-[#eefaf0]" : "bg-white"
                    }`}
                    onClick={() => setRewardLibraryTab((current) => (current === "rituals" ? null : "rituals"))}
                  >
                    Rituales sugeridos ({claimedRitualRewards.length})
                  </button>
                ) : null}
              </div>
            </div>

            {rewardLibraryTab ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {(rewardLibraryTab === "cards" ? claimedLetterRewards : claimedRitualRewards).map((entry) =>
                  entry.kind === "message" ? (
                    <article
                      key={entry.unlockId}
                      className={`overflow-hidden rounded-[24px] border p-4 shadow-[0_10px_30px_rgba(45,40,22,0.06)] ${
                        rewardLibraryFocusUnlockId === entry.unlockId
                          ? "border-[#dbc77c] bg-[#fff9ea]"
                          : "border-[#ebe4c9] bg-[#fffdf6]"
                      }`}
                    >
                      <div className="text-[11px] uppercase tracking-[0.28em] text-[#8d7c4c]">Carta del bosque</div>
                      <div className="mt-4 rounded-[20px] border border-[#eadcb4] bg-[linear-gradient(180deg,#fff8de_0%,#fffdf4_100%)] p-4">
                        <div className="text-lg font-semibold text-[#40351a]">{entry.title}</div>
                        <p className="mt-3 text-sm leading-6 text-[#5b4e2d]">{entry.body}</p>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[#796b46]">
                        <div>Carta guardada en vuestro recorrido</div>
                        <div>{formatDate(entry.unlockedAt)}</div>
                      </div>
                    </article>
                  ) : (
                    <article
                      key={entry.unlockId}
                      className={`rounded-[24px] border p-4 shadow-[0_10px_30px_rgba(32,48,36,0.06)] ${
                        rewardLibraryFocusUnlockId === entry.unlockId
                          ? "border-[#9bc3a4] bg-[#f4fbf5]"
                          : "border-[#dce8db] bg-[#fbfdfb]"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-[11px] uppercase tracking-[0.28em] text-[#5f7e64]">Ritual sugerido</div>
                        <div className="rounded-full border border-[#dce8db] bg-white px-3 py-1 text-[11px] text-[#47654b]">
                          {formatDate(entry.unlockedAt)}
                        </div>
                      </div>
                      <div className="mt-3 text-lg font-semibold text-slate-900">{entry.title}</div>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{entry.body}</p>
                      <div className="mt-3 text-xs text-[var(--lv-text-muted)]">Inspirado en: {entry.sourceTitle}</div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {entry.href && entry.cta ? (
                          <button
                            className="rounded-full border border-[#c9dec8] bg-[#eefaf0] px-4 py-2 text-sm text-slate-800"
                            onClick={() => router.push(entry.href!)}
                          >
                            {entry.cta}
                          </button>
                        ) : null}
                        <button
                          className="rounded-full border bg-white px-4 py-2 text-sm text-slate-800"
                          onClick={() => void copyRitual(entry)}
                        >
                          {copiedRitualId === entry.unlockId ? "Copiado" : "Copiar ritual"}
                        </button>
                      </div>
                    </article>
                  ),
                )}
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-[var(--lv-text-muted)]">Lectura actual</div>
              <h2 className="mt-1 text-2xl font-semibold">
                {tab === "pending" ? "Pendientes de reclamar" : tab === "claimed" ? "Ya vividos" : "Todos los hitos"}
              </h2>
              <p className="mt-2 text-sm text-[var(--lv-text-muted)]">
                {tab === "pending"
                  ? "Aqui solo ves lo ya desbloqueado que todavia sigue abierto."
                  : tab === "claimed"
                    ? "Aqui queda lo que ya reclamaste y ya forma parte del recorrido."
                    : "Aqui puedes revisar todo lo desbloqueado sin separar por estado."}
              </p>
            </div>
            <div className="text-sm text-[var(--lv-text-muted)]">{sortedRows.length} visibles</div>
          </div>

          {sortedRows.length === 0 ? (
            <div className="rounded-[28px] border bg-white p-6 text-sm shadow-sm">
              No hay hitos para este filtro.
            </div>
          ) : (
            <div className="space-y-3">
              {visibleRows.map((row) => {
                const claimed = Boolean(row.claimed_at);
                const unlockedYear = yearFromIso(row.unlocked_at);
                return (
                  <article key={row.id} className="rounded-[28px] border bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex min-w-0 flex-1 items-start gap-4">
                        <div className={`mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border ${rankTone(row.rule.rank)} ${claimed ? "lvTreeClaimed" : "lvTreePending"}`}>
                          <ProgressionMilestoneTree
                            size={44}
                            rank={row.rule.rank}
                            importance={row.rule.importance}
                            rarity={row.rule.rarity}
                            leafVariant={row.rule.leafVariant}
                            accentColor={row.rule.accentColor}
                            claimed={claimed}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap gap-2">
                            <div className="inline-flex rounded-full border bg-[#fbfcfb] px-3 py-1 text-xs">
                              {importanceLabel(row.rule.importance)}
                            </div>
                            <div
                              className={`inline-flex rounded-full border px-3 py-1 text-xs ${
                                claimed ? "border-[#c9dec8] bg-[#eefaf0]" : "border-[#dfd7b5] bg-[#fffdf5]"
                              }`}
                            >
                              {claimed ? "Reclamado" : "Pendiente"}
                            </div>
                          </div>
                          <h3 className="mt-3 text-xl font-semibold">{row.rule.title}</h3>
                          {row.rule.description ? (
                            <p className="mt-2 text-sm text-[var(--lv-text-muted)]">{row.rule.description}</p>
                          ) : null}
                          {row.reasons.length ? (
                            <div className="mt-4 rounded-[20px] border border-[#e2ebdc] bg-[#fbfcf9] px-4 py-3">
                              <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--lv-text-muted)]">
                                Se desbloqueo por
                              </div>
                              <div className="mt-2 space-y-2">
                                {row.reasons.slice(0, 2).map((reason) => (
                                  <div key={`${row.id}-${reason.title}`} className="rounded-2xl border bg-white px-3 py-2">
                                    <div className="text-sm font-medium text-slate-800">{reason.title}</div>
                                    {reason.description ? (
                                      <div className="mt-1 text-xs text-[var(--lv-text-muted)]">{reason.description}</div>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          <div className="mt-4 rounded-[20px] border border-[#e2ebdc] bg-[#fafcf8] px-4 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--lv-text-muted)]">
                                Recompensa
                              </div>
                              <div
                                className={`rounded-full border px-3 py-1 text-[11px] ${
                                  claimed
                                    ? "border-[#c9dec8] bg-[#eefaf0]"
                                    : "border-[#dfd7b5] bg-[#fffdf5]"
                                }`}
                              >
                                {claimed ? "Ya activa" : "Se activa al reclamar"}
                              </div>
                            </div>
                            {row.rewards.length ? (
                              <>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {row.rewards.slice(0, 3).map((reward) => (
                                    <div
                                      key={reward.id}
                                      className="inline-flex rounded-full border bg-white px-3 py-1 text-xs"
                                    >
                                      {rewardKindLabel(reward.kind)}
                                    </div>
                                  ))}
                                  {row.rewards.length > 3 ? (
                                    <div className="inline-flex rounded-full border bg-white px-3 py-1 text-xs">
                                      +{row.rewards.length - 3}
                                    </div>
                                  ) : null}
                                </div>
                                <div className="mt-3 space-y-2 text-sm text-slate-700">
                                  {row.rewards.slice(0, 2).map((reward) => {
                                    const visibility = rewardVisibilitySummary(reward, unlockedYear);
                                    const rewardHref = visibility.href;
                                    const rewardCta = visibility.cta;
                                    return (
                                      <div key={`${row.id}-${reward.id}`} className="rounded-2xl border bg-white px-3 py-2">
                                        <div>{rewardHeadline(reward, row)}</div>
                                        <div className="mt-1 text-xs text-[var(--lv-text-muted)]">{visibility.where}</div>
                                        {claimed ? (
                                          <div className="mt-2 flex flex-wrap gap-2">
                                            {reward.kind === "message" ? (
                                              <button
                                                className="rounded-full border px-3 py-1 text-xs text-slate-700"
                                                onClick={() => openRewardCollection(reward)}
                                              >
                                                Abrir carta
                                              </button>
                                            ) : null}
                                            {reward.kind === "gift" ? (
                                              <button
                                                className="rounded-full border px-3 py-1 text-xs text-slate-700"
                                                onClick={() => openRewardCollection(reward)}
                                              >
                                                Abrir ritual
                                              </button>
                                            ) : null}
                                            {rewardHref && rewardCta ? (
                                              <button
                                                className="rounded-full border px-3 py-1 text-xs text-slate-700"
                                                onClick={() => router.push(rewardHref)}
                                              >
                                                {rewardCta}
                                              </button>
                                            ) : null}
                                          </div>
                                        ) : null}
                                      </div>
                                    );
                                  })}
                                  {row.rewards.length > 2 ? (
                                    <div className="text-xs text-[var(--lv-text-muted)]">
                                      {rewardSummary(row)}
                                    </div>
                                  ) : null}
                                </div>
                              </>
                            ) : (
                              <div className="mt-2 text-sm text-[var(--lv-text-muted)]">
                                Este hito celebra el avance, pero no abre un recurso aparte.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-sm text-[var(--lv-text-muted)]">
                        <div>{formatDate(row.unlocked_at)}</div>
                        {unlockedYear ? (
                          <div className="mt-1 text-xs">
                            {decodeEscapedUnicode("A\\u00f1o")} {unlockedYear}
                          </div>
                        ) : null}
                        <div className="mt-2 text-xs">{claimed ? "Ya forma parte del recorrido." : "Aun esta pendiente de reclamar."}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        className="rounded-2xl border bg-white px-4 py-2 text-sm"
                        onClick={() => router.push(getProductSurfaceHref("forest"))}
                      >
                        Ver bosque
                      </button>
                      {unlockedYear ? (
                        <button
                          className="rounded-2xl border bg-white px-4 py-2 text-sm"
                          onClick={() => router.push(getYearBookHref(unlockedYear))}
                        >
                          {decodeEscapedUnicode("Ver a\\u00f1o")} {unlockedYear}
                        </button>
                      ) : null}
                      {!claimed ? (
                        <button
                          className="rounded-2xl border border-[#c9dec8] bg-[#eefaf0] px-4 py-2 text-sm disabled:opacity-50"
                          disabled={claimingId === row.id || claimingBulk}
                          onClick={async () => {
                            try {
                              setClaimingId(row.id);
                              setMsg(null);
                              await claimRows([row.id]);
                            } catch (error) {
                              setMsg(toErrorMessage(error, "No se pudo reclamar este hito."));
                            } finally {
                              setClaimingId(null);
                            }
                          }}
                        >
                          {claimingId === row.id ? "Reclamando..." : "Reclamar"}
                        </button>
                      ) : (
                        <div className="rounded-2xl border border-[#c9dec8] bg-[#eefaf0] px-4 py-2 text-sm lvClaimBadge">
                          Completado
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}

              {hiddenRowsCount > 0 ? (
                <div className="flex justify-center pt-2">
                  <button
                    className="rounded-2xl border bg-white px-4 py-2 text-sm"
                    onClick={() => setShowAllRows((prev) => !prev)}
                  >
                    {showAllRows ? "Ver menos" : `Ver mas (${hiddenRowsCount})`}
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>

      <style jsx>{`
        @keyframes lvRewardEntrance {
          0% {
            opacity: 0;
            transform: translateY(18px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes lvRewardOrbFloat {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 0.72;
          }
          50% {
            transform: translate3d(0, -10px, 0) scale(1.06);
            opacity: 1;
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 0.74;
          }
        }
        @keyframes lvRewardTreePulse {
          0% {
            transform: scale(0.96);
          }
          50% {
            transform: scale(1.04);
          }
          100% {
            transform: scale(1);
          }
        }
        @keyframes lvTreePulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.07);
          }
          100% {
            transform: scale(1);
          }
        }
        @keyframes lvTreeGlow {
          0% {
            filter: drop-shadow(0 0 0 rgba(80, 170, 120, 0));
          }
          50% {
            filter: drop-shadow(0 0 8px rgba(80, 170, 120, 0.35));
          }
          100% {
            filter: drop-shadow(0 0 0 rgba(80, 170, 120, 0));
          }
        }
        .lvTreePending {
          animation: lvTreePulse 2.4s ease-in-out infinite;
        }
        .lvTreeClaimed {
          animation: lvTreeGlow 3s ease-in-out infinite;
        }
        .lvClaimBadge {
          animation: lvTreeGlow 3.4s ease-in-out infinite;
        }
        .lvRewardCelebration {
          animation: lvRewardEntrance 280ms ease-out;
        }
        .lvRewardOrb {
          animation: lvRewardOrbFloat 3.4s ease-in-out infinite;
        }
        .lvRewardOrbDelay {
          animation-delay: 0.55s;
        }
        .lvRewardTreeWrap {
          animation: lvRewardTreePulse 640ms ease-out;
        }
      `}</style>
    </div>
  );
}
