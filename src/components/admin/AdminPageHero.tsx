"use client";

import type { ReactNode } from "react";

type AdminPageHeroStat = {
  label: string;
  value: string;
};

type AdminPageHeroProps = {
  title: string;
  description: string;
  actions?: ReactNode;
  message?: ReactNode;
  noticeTitle?: string;
  noticeBody?: ReactNode;
  noticeHint?: ReactNode;
  stats?: AdminPageHeroStat[];
};

export function AdminPageHero({
  title,
  description,
  actions,
  message,
  noticeTitle,
  noticeBody,
  noticeHint,
  stats,
}: AdminPageHeroProps) {
  return (
    <div className="rounded-[28px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5 shadow-[var(--lv-shadow-sm)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold text-[var(--lv-text)]">{title}</h1>
          <p className="max-w-3xl text-sm leading-6 text-[var(--lv-text-muted)]">{description}</p>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 lg:max-w-xl lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>

      {message ? <div className="mt-3">{message}</div> : null}

      {stats && stats.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-3 py-1.5 text-sm"
            >
              <span className="text-[var(--lv-text-muted)]">{stat.label}:</span>{" "}
              <span className="font-medium text-[var(--lv-text)]">{stat.value}</span>
            </div>
          ))}
        </div>
      ) : null}

      {noticeTitle || noticeBody || noticeHint ? (
        <div className="mt-3 text-sm leading-6 text-[var(--lv-text-muted)]">
          {noticeTitle ? (
            <span className="font-medium text-[var(--lv-text)]">{noticeTitle}: </span>
          ) : null}
          {noticeBody ? <span>{noticeBody}</span> : null}
          {noticeHint ? (
            <div className="mt-1 text-xs leading-5 text-[var(--lv-text-muted)]">{noticeHint}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
