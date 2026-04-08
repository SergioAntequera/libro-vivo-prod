"use client";

type PageStateTone = "info" | "success" | "warning" | "error";

type PageStateAction = {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "primary" | "secondary" | "ghost" | "danger";
};

type PageStateCardProps = {
  title: string;
  message?: string;
  tone?: PageStateTone;
  className?: string;
  actions?: PageStateAction[];
};

function toneClass(tone: PageStateTone) {
  if (tone === "error") return "lv-tone-error";
  if (tone === "warning") return "lv-tone-warning";
  if (tone === "success") return "lv-tone-success";
  return "lv-tone-info";
}

function actionClass(tone: NonNullable<PageStateAction["tone"]>) {
  if (tone === "danger") return "lv-btn lv-btn-danger";
  if (tone === "ghost") return "lv-btn lv-btn-ghost";
  if (tone === "secondary") return "lv-btn lv-btn-secondary";
  return "lv-btn lv-btn-primary";
}

export function PageStateCard({
  title,
  message,
  tone = "info",
  className,
  actions,
}: PageStateCardProps) {
  return (
    <section className={`lv-card p-4 ${className ?? ""}`} role="status">
      <div className={`lv-state-panel ${toneClass(tone)}`}>
        <div className="font-semibold">{title}</div>
        {message ? <div className="mt-1 text-sm">{message}</div> : null}
      </div>
      {actions?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((action, index) => (
            <button
              key={`${action.label}-${index}`}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              className={`${actionClass(action.tone ?? "primary")} disabled:opacity-50`}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
