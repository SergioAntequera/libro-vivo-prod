import type { ReactNode } from "react";

type AdminWorkspaceProps = {
  sidebar: ReactNode;
  children: ReactNode;
};

type AdminPanelProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AdminWorkspace({ sidebar, children }: AdminWorkspaceProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="space-y-4">{sidebar}</aside>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export function AdminPanel({
  title,
  description,
  actions,
  children,
  className,
}: AdminPanelProps) {
  return (
    <section
      className={`rounded-[28px] border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5 shadow-[var(--lv-shadow-sm)] ${
        className ?? ""
      }`}
    >
      {title || description || actions ? (
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            {title ? <h2 className="text-lg font-semibold text-[var(--lv-text)]">{title}</h2> : null}
            {description ? (
              <p className="text-sm leading-6 text-[var(--lv-text-muted)]">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

type AdminToggleOption<T extends string> = {
  key: T;
  label: string;
};

type AdminToggleGroupProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: Array<AdminToggleOption<T>>;
  className?: string;
};

export function AdminToggleGroup<T extends string>({
  value,
  onChange,
  options,
  className,
}: AdminToggleGroupProps<T>) {
  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ""}`}>
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
          className={`rounded-full border px-3 py-2 text-sm transition ${
            value === option.key
              ? "border-[var(--lv-primary)] bg-[var(--lv-primary-soft)] text-[var(--lv-primary-strong)]"
              : "border-[var(--lv-border)] bg-[var(--lv-surface)] text-[var(--lv-text-muted)] hover:bg-[var(--lv-surface-soft)]"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function AdminInlineNote({
  tone = "default",
  children,
}: {
  tone?: "default" | "warning" | "success";
  children: ReactNode;
}) {
  const className =
    tone === "warning"
      ? "border-[var(--lv-warning)] bg-[var(--lv-warning-soft)] text-[var(--lv-warning)]"
      : tone === "success"
        ? "border-[var(--lv-success)] bg-[var(--lv-success-soft)] text-[var(--lv-success)]"
        : "border-[var(--lv-border)] bg-[var(--lv-surface-soft)] text-[var(--lv-text-muted)]";

  return <div className={`rounded-[20px] border p-3 text-sm leading-6 ${className}`}>{children}</div>;
}
