import {
  ELEMENT_ORDER,
  getElementLabel,
  getElementToken,
} from "@/lib/narrativeTaxonomy";

type ElementLegendChipsProps = {
  className?: string;
  includeAether?: boolean;
};

export default function ElementLegendChips(props: ElementLegendChipsProps) {
  const { className, includeAether = true } = props;
  const elements = includeAether
    ? ELEMENT_ORDER
    : ELEMENT_ORDER.filter((element) => element !== "aether");

  return (
    <div className={`flex flex-wrap gap-2 text-xs ${className ?? ""}`.trim()}>
      {elements.map((element) => (
        <span
          key={`element-legend-${element}`}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-1 text-[var(--lv-text)]"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--lv-border)] bg-[var(--lv-bg-soft)] text-[11px] font-semibold text-[var(--lv-text-muted)]">
            {getElementToken(element)}
          </span>
          {getElementLabel(element, "Otro")}
        </span>
      ))}
    </div>
  );
}
