"use client";

type YearSelectorProps = {
  value: string;
  years: Array<string | number>;
  onChange: (value: string) => void;
  allLabel?: string;
  showAll?: boolean;
  className?: string;
  compact?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
};

export default function YearSelector({
  value,
  years,
  onChange,
  allLabel = "Todos los años",
  showAll = false,
  className = "",
  compact = false,
  onPrev,
  onNext,
  prevDisabled = false,
  nextDisabled = false,
}: YearSelectorProps) {
  const padding = compact ? "px-3 py-2 text-sm" : "px-4 py-2";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
      {onPrev ? (
        <button
          type="button"
          className={`lv-btn lv-btn-secondary ${padding}`}
          onClick={onPrev}
          disabled={prevDisabled}
        >
          Anterior
        </button>
      ) : null}

      <select
        className={`lv-select min-w-[120px] ${padding}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {showAll ? <option value="all">{allLabel}</option> : null}
        {years.map((year) => {
          const key = String(year);
          return (
            <option key={key} value={key}>
              {key}
            </option>
          );
        })}
      </select>

      {onNext ? (
        <button
          type="button"
          className={`lv-btn lv-btn-secondary ${padding}`}
          onClick={onNext}
          disabled={nextDisabled}
        >
          Siguiente
        </button>
      ) : null}
    </div>
  );
}
