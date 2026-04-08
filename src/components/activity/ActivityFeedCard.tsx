"use client";

import type { ActivityItem } from "@/lib/productDomainContracts";

type ActivityFeedCardProps = {
  item: ActivityItem;
  seen: boolean;
  actionLabel?: string | null;
  actionTone?: "primary" | "secondary";
  onAction?: (() => void) | null;
  createdAtLabel?: string | null;
  dueDateLabel?: string | null;
};

function toneBadgeClass(tone: ActivityItem["tone"]) {
  if (tone === "special") return "bg-[#f8f1ff] text-[#6a4e8a]";
  if (tone === "news") return "bg-[#eef3ff] text-[#36538c]";
  return "bg-[#eef6ea] text-[#2f5137]";
}

function toneBadgeLabel(tone: ActivityItem["tone"]) {
  if (tone === "special") return "Aviso";
  if (tone === "news") return "Cambio";
  return "Accion";
}

export function ActivityFeedCard({
  item,
  seen,
  actionLabel,
  actionTone = "primary",
  onAction,
  createdAtLabel,
  dueDateLabel,
}: ActivityFeedCardProps) {
  return (
    <article
      className={`rounded-[24px] border p-4 shadow-sm transition ${
        seen ? "border-[#d9ddd3] bg-[#f5f6f2]" : "border-[var(--lv-border)] bg-white"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneBadgeClass(item.tone)}`}
            >
              {toneBadgeLabel(item.tone)}
            </span>
            {seen ? (
              <span className="rounded-full bg-[#ebece7] px-2.5 py-1 text-xs font-medium text-[#70756a]">
                Ya visto
              </span>
            ) : null}
            {dueDateLabel ? (
              <span className="lv-badge bg-white">Para {dueDateLabel}</span>
            ) : null}
          </div>

          <div className={`text-base font-semibold ${seen ? "text-[#4f554b]" : "text-[var(--lv-text)]"}`}>
            {item.title}
          </div>
          {item.message ? (
            <p className={`text-sm ${seen ? "text-[#6f746a]" : "text-[var(--lv-text-muted)]"}`}>
              {item.message}
            </p>
          ) : null}

          {createdAtLabel ? (
            <div className="text-xs text-[var(--lv-text-muted)]">Registrado: {createdAtLabel}</div>
          ) : null}
        </div>

        {actionLabel && onAction ? (
          <button
            type="button"
            className={actionTone === "primary" ? "lv-btn lv-btn-primary" : "lv-btn lv-btn-secondary"}
            onClick={onAction}
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </article>
  );
}
