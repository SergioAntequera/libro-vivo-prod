"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  CareAction,
  CareLogItem,
  CareMood,
  CareNeedKey,
  CareNeedsState,
} from "@/lib/careTypes";
import {
  actionLabel,
  applyCareActionModel,
  careNeedHint,
  careNeedLabel,
  careNeedsAverage,
  careStreakDays,
  getDefaultMoodThresholds,
  lowestCareNeed,
  recommendCareAction,
  type CareActionModel,
  type MoodThreshold,
} from "@/lib/careLogic";
import {
  formatTemplate,
  getCatalogItems,
  getCatalogLabelWithEmoji,
  getFallbackCatalogItems,
  type CatalogItemConfig,
} from "@/lib/appConfig";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function moodTone(mood: CareMood) {
  if (mood === "wilted") return "bg-[#ffe8e8]";
  if (mood === "shiny") return "bg-[#fff7e6]";
  return "bg-[#f0fff4]";
}

function percentTone(score: number) {
  if (score < 35) return "bg-[#ff8a8a]";
  if (score < 75) return "bg-[#8fd8a5]";
  return "bg-[#f2cb6d]";
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

function numOrUndefined(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

const NEED_ORDER: CareNeedKey[] = ["water", "light", "soil", "air"];

const DEFAULT_COPY = {
  title: "Cuidar la flor",
  subtitle: "Rituales pequenos que suben la salud de la relación.",
  pulse_title: "Pulso de hoy",
  weakest_need_template:
    "Lo más flojo ahora es {needLabel} ({needValue}%). {needHint}",
  streak_template: "Racha actual: {days} {dayWord}",
  day_word_singular: "dia",
  day_word_plural: "días",
  suggestion_prefix: "Sugerencia:",
  history_title: "Historial de cuidado",
  history_empty: "Aún no hay rituales aquí. Cuando uno cuide, quedará registrado.",
  care_bar_title: "Barra de cuidado",
  avg_needs_template: "Media necesidades: {avg}%",
  note_placeholder: "Nota (opcional): que hiciste y como te sentiste...",
};

function NeedMeter(props: { need: CareNeedKey; value: number; label: string }) {
  const { need, value, label } = props;

  return (
    <div className="rounded-2xl border bg-white p-2 space-y-1" data-need={need}>
      <div className="text-xs font-medium flex items-center justify-between">
        <span>{label}</span>
        <span className="opacity-70">{value}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-black/10 overflow-hidden">
        <div
          className={`h-full transition-all ${percentTone(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function parseActionModel(item: CatalogItemConfig): CareActionModel {
  const meta = item.metadata ?? {};

  let targetNeed: CareNeedKey | undefined;
  if (isCareNeedKey(meta.target_need)) {
    targetNeed = meta.target_need;
  }

  const effects: Partial<Record<CareNeedKey, number>> = {};
  const rawEffects = meta.effects;
  if (rawEffects && typeof rawEffects === "object" && !Array.isArray(rawEffects)) {
    const obj = rawEffects as Record<string, unknown>;
    for (const key of NEED_ORDER) {
      const val = numOrUndefined(obj[key]);
      if (typeof val === "number") effects[key] = val;
    }
  }

  return {
    code: item.code,
    targetNeed,
    effects,
    decayAll: numOrUndefined(meta.decay_all),
    scoreBonus: numOrUndefined(meta.score_bonus),
    sortOrder: item.sortOrder,
  };
}

function parseMoodThreshold(item: CatalogItemConfig): MoodThreshold | null {
  if (!isCareMood(item.code)) return null;

  const minScore = numOrUndefined(item.metadata?.min_score);
  const maxScore = numOrUndefined(item.metadata?.max_score);
  const anchorScore = numOrUndefined(item.metadata?.anchor_score);

  if (
    typeof minScore !== "number" ||
    typeof maxScore !== "number" ||
    typeof anchorScore !== "number"
  ) {
    return null;
  }

  return {
    mood: item.code,
    minScore,
    maxScore,
    anchorScore,
    sortOrder: item.sortOrder,
  };
}

export function CareActions(props: {
  moodState: CareMood;
  careLog: CareLogItem[];
  myProfileId: string;
  careScore: number;
  careNeeds: CareNeedsState;
  onProposeUpdate: (update: {
    mood_state: CareMood;
    care_log: CareLogItem[];
    care_score: number;
    care_needs: CareNeedsState;
  }) => void;
}) {
  const {
    moodState,
    careLog,
    myProfileId,
    careScore,
    careNeeds,
    onProposeUpdate,
  } = props;

  const [note, setNote] = useState("");
  const [action, setAction] = useState<CareAction>("water");
  const [actionOptions, setActionOptions] = useState<CatalogItemConfig[]>(
    getFallbackCatalogItems("care_actions"),
  );
  const [needOptions, setNeedOptions] = useState<CatalogItemConfig[]>(
    getFallbackCatalogItems("care_needs"),
  );
  const [copyOptions, setCopyOptions] = useState<CatalogItemConfig[]>(
    getFallbackCatalogItems("care_texts"),
  );
  const [moodThresholdOptions, setMoodThresholdOptions] = useState<CatalogItemConfig[]>(
    getFallbackCatalogItems("mood_thresholds"),
  );

  useEffect(() => {
    (async () => {
      const [actions, needs, texts, moodThresholds] = await Promise.all([
        getCatalogItems("care_actions"),
        getCatalogItems("care_needs"),
        getCatalogItems("care_texts"),
        getCatalogItems("mood_thresholds"),
      ]);
      setActionOptions(actions);
      setNeedOptions(needs);
      setCopyOptions(texts);
      setMoodThresholdOptions(moodThresholds);
    })();
  }, []);

  const availableActions = useMemo(
    () =>
      actionOptions
        .map((opt) => String(opt.code || "").trim())
        .filter(Boolean) as CareAction[],
    [actionOptions],
  );
  const selectedAction =
    availableActions.includes(action) ? action : (availableActions[0] ?? "water");

  const actionModels = useMemo(
    () => actionOptions.map(parseActionModel),
    [actionOptions],
  );

  const moodThresholds = useMemo(() => {
    const parsed = moodThresholdOptions.map(parseMoodThreshold).filter(Boolean) as MoodThreshold[];
    if (!parsed.length) return getDefaultMoodThresholds();
    return parsed;
  }, [moodThresholdOptions]);

  const actionLabelByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const opt of actionOptions) {
      map.set(opt.code, getCatalogLabelWithEmoji(opt));
    }
    return (code: CareAction) => map.get(code) ?? actionLabel(code);
  }, [actionOptions]);

  const copy = useMemo(() => {
    const map = { ...DEFAULT_COPY };
    for (const item of copyOptions) {
      const key = String(item.code ?? "").trim();
      if (!key) continue;
      (map as Record<string, string>)[key] = item.label;
    }
    return map;
  }, [copyOptions]);

  const needUi = useMemo(() => {
    const out: Record<CareNeedKey, { label: string; hint: string }> = {
      water: { label: careNeedLabel("water"), hint: careNeedHint("water") },
      light: { label: careNeedLabel("light"), hint: careNeedHint("light") },
      soil: { label: careNeedLabel("soil"), hint: careNeedHint("soil") },
      air: { label: careNeedLabel("air"), hint: careNeedHint("air") },
    };

    for (const item of needOptions) {
      if (!isCareNeedKey(item.code)) continue;
      const hint =
        typeof item.metadata?.hint === "string"
          ? (item.metadata.hint as string)
          : out[item.code].hint;
      out[item.code] = {
        label: item.label,
        hint,
      };
    }

    return out;
  }, [needOptions]);

  const suggestion = useMemo(
    () => recommendCareAction(careNeeds, actionModels),
    [careNeeds, actionModels],
  );
  const avgNeeds = useMemo(() => careNeedsAverage(careNeeds), [careNeeds]);
  const weakestNeed = useMemo(() => lowestCareNeed(careNeeds), [careNeeds]);
  const streak = useMemo(() => careStreakDays(careLog ?? []), [careLog]);

  const weakestNeedText = useMemo(
    () =>
      formatTemplate(copy.weakest_need_template, {
        needLabel: needUi[weakestNeed].label,
        needValue: careNeeds[weakestNeed],
        needHint: needUi[weakestNeed].hint,
      }),
    [copy.weakest_need_template, needUi, weakestNeed, careNeeds],
  );

  const streakText = useMemo(
    () =>
      formatTemplate(copy.streak_template, {
        days: streak,
        dayWord: streak === 1 ? copy.day_word_singular : copy.day_word_plural,
      }),
    [copy.day_word_plural, copy.day_word_singular, copy.streak_template, streak],
  );

  function doAction() {
    const entry: CareLogItem = {
      id: uid(),
      action: selectedAction,
      by: myProfileId,
      at: new Date().toISOString(),
      note: note.trim() ? note.trim() : undefined,
    };

    const updatedLog = [entry, ...(careLog ?? [])];
    const result = applyCareActionModel({
      action: selectedAction,
      score: careScore,
      needs: careNeeds,
      actionModels,
      moodThresholds,
    });

    onProposeUpdate({
      mood_state: result.nextMood,
      care_log: updatedLog,
      care_score: result.nextScore,
      care_needs: result.nextNeeds,
    });

    setAction(result.suggested);
    setNote("");
  }

  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{copy.title}</h3>
          <p className="text-sm opacity-70">{copy.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`text-sm rounded-full border px-3 py-1 ${moodTone(moodState)}`}>
            {moodState === "wilted"
              ? "Mustia"
              : moodState === "shiny"
                ? "Brillante"
                : "Sana"}
          </div>
          <div className="text-sm rounded-full border px-3 py-1 bg-white">
            Salud {careScore}%
          </div>
        </div>
      </div>

      <div className="rounded-2xl border p-3 bg-[#fffdf5] space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{copy.care_bar_title}</span>
          <span className="opacity-70">
            {formatTemplate(copy.avg_needs_template, { avg: avgNeeds })}
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-black/10 overflow-hidden">
          <div
            className={`h-full transition-all ${percentTone(careScore)}`}
            style={{ width: `${careScore}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl border p-3 bg-[#f7fbff] space-y-2">
        <div className="text-sm font-medium">{copy.pulse_title}</div>
        <div className="text-sm opacity-80">{weakestNeedText}</div>
        <div className="text-xs opacity-70 flex flex-wrap gap-3">
          <span>{streakText}</span>
          <span>
            {copy.suggestion_prefix}{" "}
            <span className="font-medium">{actionLabelByCode(suggestion)}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {NEED_ORDER.map((need) => (
          <NeedMeter
            key={need}
            need={need}
            value={careNeeds[need]}
            label={needUi[need].label}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {actionOptions.map((opt) => {
          const code = opt.code;
          const active = selectedAction === code;
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => setAction(code)}
              className={`px-3 py-2 rounded-2xl border ${active ? "bg-[#eaf7ff]" : "bg-white"}`}
            >
              {getCatalogLabelWithEmoji(opt)}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        <input
          className="sm:col-span-4 rounded-2xl border p-3"
          placeholder={copy.note_placeholder}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          type="button"
          onClick={doAction}
          className="lv-btn lv-btn-primary"
        >
          {actionLabelByCode(selectedAction)}
        </button>
      </div>

      <div className="pt-2">
        <div className="text-sm font-medium">{copy.history_title}</div>
        {!careLog || careLog.length === 0 ? (
          <p className="text-sm opacity-70 mt-1">{copy.history_empty}</p>
        ) : (
          <div className="mt-2 space-y-2">
            {careLog.slice(0, 6).map((it) => (
              <div key={it.id} className="rounded-2xl border bg-[#fffdf5] p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{actionLabelByCode(it.action)}</div>
                  <div className="text-xs opacity-60">
                    {new Date(it.at).toLocaleString()}
                  </div>
                </div>
                {it.note && <div className="text-sm opacity-80 mt-1">{it.note}</div>}
              </div>
            ))}
            {careLog.length > 6 && (
              <div className="text-xs opacity-60">...y {careLog.length - 6} mas</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
