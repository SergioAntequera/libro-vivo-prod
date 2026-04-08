import {
  FLOWER_FAMILY_LABELS,
  FLOWER_FAMILY_ORDER,
  type FlowerFamily,
} from "@/lib/productDomainContracts";

const FLOWER_FAMILY_TOKENS: Record<FlowerFamily, string> = {
  agua: "Ag",
  fuego: "Fu",
  tierra: "Ti",
  aire: "Ai",
  luz: "Lz",
  luna: "Ln",
  estrella: "Es",
};

type FlowerFamilyLegendChipsProps = {
  className?: string;
};

export default function FlowerFamilyLegendChips(props: FlowerFamilyLegendChipsProps) {
  const { className } = props;

  return (
    <div className={`flex flex-wrap gap-2 text-xs ${className ?? ""}`.trim()}>
      {FLOWER_FAMILY_ORDER.map((family) => (
        <span
          key={`flower-family-legend-${family}`}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-1 text-[var(--lv-text)]"
        >
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-[var(--lv-border)] bg-[var(--lv-bg-soft)] px-1 text-[10px] font-semibold text-[var(--lv-text-muted)]">
            {FLOWER_FAMILY_TOKENS[family]}
          </span>
          {FLOWER_FAMILY_LABELS[family]}
        </span>
      ))}
    </div>
  );
}
