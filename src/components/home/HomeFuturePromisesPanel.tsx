"use client";

type RitualSummary = {
  year: number;
  title: string;
  description: string;
  statusLabel: string;
  locationLabel?: string | null;
  actionLabel: string;
};

type CapsuleSummary = {
  title: string;
  description: string;
  statusLabel: string;
  actionLabel: string;
};

type Props = {
  ritual: RitualSummary | null;
  capsules: CapsuleSummary | null;
  onOpenRitual: () => void;
  onOpenCapsules: () => void;
};

function SummaryCard({
  eyebrow,
  title,
  description,
  statusLabel,
  actionLabel,
  onOpen,
  accent,
  locationLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  statusLabel: string;
  actionLabel: string;
  onOpen: () => void;
  accent: "ritual" | "capsule";
  locationLabel?: string | null;
}) {
  const accentStyle =
    accent === "ritual"
      ? {
          background: "linear-gradient(180deg, rgba(238,246,231,0.96), rgba(250,252,248,0.96))",
          borderColor: "#cfe0c8",
        }
      : {
          background: "linear-gradient(180deg, rgba(248,243,255,0.96), rgba(252,250,255,0.96))",
          borderColor: "#d9cdec",
        };

  return (
    <div className="rounded-[26px] border p-4 shadow-[var(--lv-shadow-sm)]" style={accentStyle}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
            {eyebrow}
          </div>
          <div className="mt-2 text-lg font-semibold text-[var(--lv-text)]">{title}</div>
          <div className="mt-2 text-sm leading-6 text-[var(--lv-text-muted)]">{description}</div>
          {locationLabel ? (
            <div className="mt-2 text-xs uppercase tracking-[0.14em] text-[var(--lv-text-muted)]">
              {locationLabel}
            </div>
          ) : null}
        </div>
        <div className="rounded-full border bg-white/90 px-3 py-1.5 text-xs font-medium text-[var(--lv-text)]">
          {statusLabel}
        </div>
      </div>

      <div className="mt-4">
        <button type="button" className="lv-btn lv-btn-secondary" onClick={onOpen}>
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

export default function HomeFuturePromisesPanel({
  ritual,
  capsules,
  onOpenRitual,
  onOpenCapsules,
}: Props) {
  if (!ritual && !capsules) return null;

  return (
    <section className="lv-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--lv-text-muted)]">
            Futuro y promesas
          </div>
          <p className="mt-1 text-sm text-[var(--lv-text-muted)]">
            Aqu&iacute; aparecen solo los momentos especiales que os piden actuar ahora.
          </p>
        </div>
      </div>

      <div className={`mt-4 grid gap-3 ${ritual && capsules ? "lg:grid-cols-2" : ""}`}>
        {ritual ? (
          <SummaryCard
            eyebrow={`Ritual ${ritual.year}`}
            title={ritual.title}
            description={ritual.description}
            statusLabel={ritual.statusLabel}
            locationLabel={ritual.locationLabel}
            actionLabel={ritual.actionLabel}
            onOpen={onOpenRitual}
            accent="ritual"
          />
        ) : null}
        {capsules ? (
          <SummaryCard
            eyebrow="Capsulas del tiempo"
            title={capsules.title}
            description={capsules.description}
            statusLabel={capsules.statusLabel}
            actionLabel={capsules.actionLabel}
            onOpen={onOpenCapsules}
            accent="capsule"
          />
        ) : null}
      </div>
    </section>
  );
}
