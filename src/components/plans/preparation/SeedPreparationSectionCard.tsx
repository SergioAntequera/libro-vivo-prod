import type { ReactNode } from "react";

type SeedPreparationSectionCardProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function SeedPreparationSectionCard({
  eyebrow,
  title,
  description,
  action,
  children,
}: SeedPreparationSectionCardProps) {
  return (
    <section className="min-w-0 space-y-4 overflow-hidden rounded-[28px] border border-[var(--lv-border)] bg-white/92 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          {eyebrow ? (
            <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--lv-text-muted)]">
              {eyebrow}
            </div>
          ) : null}
          <div className="space-y-1">
            <h3 className="break-words text-lg font-semibold text-[var(--lv-text)]">{title}</h3>
            {description ? (
              <p className="max-w-3xl text-sm leading-6 text-[var(--lv-text-muted)]">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {action ? <div className="min-w-0">{action}</div> : null}
      </div>

      {children}
    </section>
  );
}
