"use client";

type PageLoadingStateProps = {
  message?: string;
  className?: string;
};

export function PageLoadingState({
  message = "Cargando...",
  className,
}: PageLoadingStateProps) {
  return (
    <div className={`lv-page flex min-h-screen items-center justify-center p-6 ${className ?? ""}`}>
      <div className="lv-state-panel lv-tone-info flex items-center gap-2 shadow-[var(--lv-shadow-sm)]">
        <span
          className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--lv-primary)]"
          aria-hidden
        />
        {message}
      </div>
    </div>
  );
}
