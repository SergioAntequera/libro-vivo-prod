import { SEASON_ORDER, getSeasonLabel } from "@/lib/narrativeTaxonomy";

type SeasonLegendChipsProps = {
  className?: string;
};

const SEASON_TONES: Record<
  (typeof SEASON_ORDER)[number],
  { backgroundColor: string; borderColor: string; color: string }
> = {
  spring: {
    backgroundColor: "var(--lv-success-soft)",
    borderColor: "color-mix(in srgb, var(--lv-success) 28%, white)",
    color: "var(--lv-success)",
  },
  summer: {
    backgroundColor: "var(--lv-warning-soft)",
    borderColor: "color-mix(in srgb, var(--lv-warning) 28%, white)",
    color: "var(--lv-warning)",
  },
  autumn: {
    backgroundColor: "color-mix(in srgb, var(--lv-primary-soft) 72%, var(--lv-surface))",
    borderColor: "color-mix(in srgb, var(--lv-primary) 22%, var(--lv-surface))",
    color: "var(--lv-primary-strong)",
  },
  winter: {
    backgroundColor: "var(--lv-info-soft)",
    borderColor: "color-mix(in srgb, var(--lv-info) 28%, white)",
    color: "var(--lv-info)",
  },
};

export default function SeasonLegendChips(props: SeasonLegendChipsProps) {
  const { className } = props;
  return (
    <div className={`flex flex-wrap gap-2 text-xs ${className ?? ""}`.trim()}>
      {SEASON_ORDER.map((season) => (
        <span
          key={`season-legend-${season}`}
          className="rounded-full border px-3 py-1"
          style={SEASON_TONES[season]}
        >
          {getSeasonLabel(season)}
        </span>
      ))}
    </div>
  );
}
