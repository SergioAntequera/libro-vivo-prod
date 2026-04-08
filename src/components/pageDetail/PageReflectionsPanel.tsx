"use client";

import { useMemo, useState } from "react";
import { StatusNotice } from "@/components/ui/StatusNotice";
import {
  buildFlowerReflectionGroups,
  formatFlowerText,
  getFallbackFlowerRuntimeConfig,
  resolveFlowerText,
  type FlowerReflectionFieldConfig,
  type FlowerReflectionFieldId,
  type FlowerRuntimeConfig,
} from "@/lib/flowerRuntimeConfig";

type ReflectionDraft = Record<FlowerReflectionFieldId, string>;

type ReflectionCard = ReflectionDraft & {
  id: string;
  userId: string;
  authorLabel: string;
};

type PageReflectionsPanelProps = {
  mode?: "read" | "edit";
  reflectionsAvailable: boolean;
  myDraft: ReflectionDraft;
  onDraftChange: (patch: Partial<ReflectionDraft>) => void;
  otherReflections: ReflectionCard[];
  className?: string;
  config?: FlowerRuntimeConfig | null;
};

function ReflectionField(props: {
  field: FlowerReflectionFieldConfig;
  value: string;
  onChange: (value: string) => void;
}) {
  const { field, value, onChange } = props;
  return (
    <label className="space-y-1.5">
      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
        {field.label}
      </div>
      <textarea
        className="lv-textarea min-h-[96px] text-sm"
        rows={field.rows}
        value={value}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ReflectionGroupEditor(props: {
  title: string;
  description: string;
  fields: FlowerReflectionFieldConfig[];
  draft: ReflectionDraft;
  onDraftChange: (patch: Partial<ReflectionDraft>) => void;
}) {
  const { title, description, fields, draft, onDraftChange } = props;

  return (
    <section className="lv-card-soft p-4">
      <div className="mb-3">
        <div className="text-xs uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
          {title}
        </div>
        <p className="mt-1 text-sm text-[var(--lv-text-muted)]">{description}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {fields.map((field) => (
          <ReflectionField
            key={field.id}
            field={field}
            value={draft[field.id]}
            onChange={(value) => onDraftChange({ [field.id]: value })}
          />
        ))}
      </div>
    </section>
  );
}

function ReflectionReadGroup(props: {
  title: string;
  description: string;
  fields: FlowerReflectionFieldConfig[];
  reflection: ReflectionCard;
}) {
  const { title, description, fields, reflection } = props;
  const entries = fields
    .map((field) => ({
      label: field.label,
      value: reflection[field.id].trim(),
    }))
    .filter((entry) => entry.value.length > 0);

  if (!entries.length) return null;

  return (
    <section className="lv-card-soft p-4">
      <div className="mb-3">
        <div className="text-xs uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
          {title}
        </div>
        <p className="mt-1 text-sm text-[var(--lv-text-muted)]">{description}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {entries.map((entry) => (
          <div
            key={entry.label}
            className="rounded-[22px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-3"
          >
            <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
              {entry.label}
            </div>
            <div className="mt-2 text-sm leading-relaxed text-[var(--lv-text)]">
              {entry.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PageReflectionsPanel(props: PageReflectionsPanelProps) {
  const {
    mode = "edit",
    reflectionsAvailable,
    myDraft,
    onDraftChange,
    otherReflections,
    className = "",
    config,
  } = props;

  const runtimeConfig = config ?? getFallbackFlowerRuntimeConfig();
  const groups = useMemo(
    () => buildFlowerReflectionGroups(runtimeConfig.reflectionFields),
    [runtimeConfig.reflectionFields],
  );
  const tabs = useMemo(
    () => [
      { key: "mine", label: resolveFlowerText(runtimeConfig, "reflections_tab_mine") },
      ...otherReflections.map((reflection) => ({
        key: reflection.id,
        label: reflection.authorLabel,
      })),
    ],
    [otherReflections, runtimeConfig],
  );
  const [activeTab, setActiveTab] = useState("mine");
  const normalizedActiveTab = tabs.some((tab) => tab.key === activeTab) ? activeTab : "mine";

  const selectedOtherReflection =
    normalizedActiveTab === "mine"
      ? null
      : otherReflections.find((reflection) => reflection.id === normalizedActiveTab) ?? null;

  const completedCount = useMemo(() => {
    return runtimeConfig.reflectionFields.filter(
      (field) => field.enabled && myDraft[field.id].trim().length > 0,
    ).length;
  }, [myDraft, runtimeConfig.reflectionFields]);

  const totalEnabledFields = useMemo(
    () => runtimeConfig.reflectionFields.filter((field) => field.enabled).length,
    [runtimeConfig.reflectionFields],
  );

  return (
    <section className={`lv-card space-y-4 p-5 ${className}`.trim()}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
            {resolveFlowerText(runtimeConfig, "reflections_eyebrow")}
          </div>
          <h2 className="mt-1 text-xl font-semibold text-[var(--lv-text)]">
            {resolveFlowerText(runtimeConfig, "reflections_title")}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--lv-text-muted)]">
            {mode === "read"
              ? resolveFlowerText(runtimeConfig, "reflections_description_read")
              : resolveFlowerText(runtimeConfig, "reflections_description_edit")}
          </p>
        </div>
        {normalizedActiveTab === "mine" && mode === "edit" ? (
          <div className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-1 text-xs text-[var(--lv-text-muted)]">
            {formatFlowerText(resolveFlowerText(runtimeConfig, "reflections_progress_template"), {
              count: completedCount,
              total: totalEnabledFields,
            })}
          </div>
        ) : null}
      </div>

      {!reflectionsAvailable ? (
        <StatusNotice
          tone="warning"
          message={resolveFlowerText(runtimeConfig, "reflections_unavailable")}
        />
      ) : null}

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`lv-btn px-4 py-2 text-sm ${
              normalizedActiveTab === tab.key ? "lv-tone-info" : "lv-btn-secondary"
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {normalizedActiveTab === "mine" && mode === "edit" ? (
        <div className="space-y-4">
          {groups.map((group) => (
            <ReflectionGroupEditor
              key={group.id}
              title={group.title}
              description={group.description}
              fields={group.fields}
              draft={myDraft}
              onDraftChange={onDraftChange}
            />
          ))}
        </div>
      ) : normalizedActiveTab === "mine" ? (
        Object.values(myDraft).some((value) => value.trim().length > 0) ? (
          <div className="space-y-4">
            {groups.map((group) => (
              <ReflectionReadGroup
                key={group.id}
                title={group.title}
                description={group.description}
                fields={group.fields}
                reflection={{
                  id: "mine",
                  userId: "mine",
                  authorLabel: resolveFlowerText(runtimeConfig, "reflections_tab_mine"),
                  ...myDraft,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-6 text-sm text-[var(--lv-text-muted)]">
            {resolveFlowerText(runtimeConfig, "reflections_empty_mine")}
          </div>
        )
      ) : selectedOtherReflection ? (
        <div className="space-y-4">
          {groups.map((group) => (
            <ReflectionReadGroup
              key={group.id}
              title={group.title}
              description={group.description}
              fields={group.fields}
              reflection={selectedOtherReflection}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[24px] border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-6 text-sm text-[var(--lv-text-muted)]">
          {resolveFlowerText(runtimeConfig, "reflections_empty_other")}
        </div>
      )}
    </section>
  );
}
