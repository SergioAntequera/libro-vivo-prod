"use client";

import type { PlansPendingFlowerBirth } from "@/lib/plansTypes";

type PlansPendingFlowerBirthPanelProps = {
  entries: PlansPendingFlowerBirth[];
  onOpenPage: (pageId: string) => void;
};

function formatActivationLabel(value: string) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "Nacimiento pendiente";
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export default function PlansPendingFlowerBirthPanel({
  entries,
  onOpenPage,
}: PlansPendingFlowerBirthPanelProps) {
  if (!entries.length) return null;

  return (
    <section className="rounded-[28px] border border-[#d8d7be] bg-[linear-gradient(135deg,#fffdf7_0%,#f6f3e7_100%)] p-5 shadow-[0_14px_36px_rgba(48,45,31,0.08)]">
      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-[0.18em] text-[#6f6a4a]">
          Nacimiento pendiente
        </div>
        <h2 className="text-lg font-semibold text-[#2f3024]">
          Ya hay una flor esperando el nacimiento compartido.
        </h2>
        <p className="text-sm leading-6 text-[#6d6755]">
          El riego ya se completo. El siguiente paso es entrar en la flor y coincidir alli para
          empezar su nacimiento.
        </p>
      </div>

      <div className="mt-4 grid gap-3">
        {entries.map((entry) => (
          <article
            key={entry.pageId}
            className="rounded-[22px] border border-[#d8d2c4] bg-white/88 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold text-[#2f3024]">
                  {entry.title?.trim() || "Flor compartida sin titulo"}
                </div>
                <div className="mt-1 text-xs text-[#817868]">
                  {formatActivationLabel(entry.activatedAt)}
                </div>
              </div>

              <button
                type="button"
                className="lv-btn lv-btn-primary"
                onClick={() => onOpenPage(entry.pageId)}
              >
                Entrar al nacimiento
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
