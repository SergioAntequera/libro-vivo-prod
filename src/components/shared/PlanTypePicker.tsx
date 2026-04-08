"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PlanTypeOption } from "@/lib/planTypeCatalog";

type PlanTypePickerProps = {
  value: string;
  options: PlanTypeOption[];
  onChange: (value: string) => void;
  onFreeTextSelect?: (value: string) => void;
  testId?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  compact?: boolean;
};

function normalizeSearchText(value: string) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export default function PlanTypePicker(props: PlanTypePickerProps) {
  const {
    value,
    options,
    onChange,
    onFreeTextSelect,
    testId,
    placeholder = "Buscar tipo de plan",
    searchPlaceholder = "Buscar tipo de plan",
    disabled = false,
    onFocus,
    onBlur,
    compact = false,
  } = props;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const skipNextFocusPrefillRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [customLabel, setCustomLabel] = useState("");

  const selectedOption = useMemo(
    () => options.find((option) => option.id === value) ?? null,
    [options, value],
  );
  const normalizedQuery = useMemo(() => normalizeSearchText(query), [query]);
  const filteredOptions = useMemo(() => {
    const sorted = [...options].sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
      return left.label.localeCompare(right.label, "es");
    });
    if (!normalizedQuery) return sorted.slice(0, compact ? 5 : 8);
    return sorted.filter((item) => {
      const haystack = normalizeSearchText([item.label, item.description].join(" "));
      return haystack.includes(normalizedQuery);
    }).slice(0, compact ? 5 : 8);
  }, [compact, normalizedQuery, options]);
  const selectedLabel = selectedOption?.label ?? customLabel;
  const inputValue = open ? query : selectedLabel;

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (rootRef.current?.contains(target)) return;
      setOpen(false);
      onBlur?.();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      onBlur?.();
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onBlur, open]);

  function openPicker() {
    if (disabled) return;
    if (skipNextFocusPrefillRef.current) {
      skipNextFocusPrefillRef.current = false;
      setQuery("");
    } else {
      setQuery(selectedLabel);
    }
    setOpen(true);
    onFocus?.();
  }

  function handleInputChange(nextValue: string) {
    setQuery(nextValue);
    if (!open) {
      setOpen(true);
      onFocus?.();
    }
    if (selectedOption) {
      onChange("");
    }
  }

  function handleSelect(nextValue: string) {
    setCustomLabel("");
    onChange(nextValue);
    setOpen(false);
    onBlur?.();
  }

  function handleSelectFreeText() {
    const nextValue = query.trim();
    if (!nextValue) return;
    setCustomLabel(nextValue);
    onChange("");
    onFreeTextSelect?.(nextValue);
    setOpen(false);
    onBlur?.();
  }

  return (
    <div ref={rootRef} className={`relative ${open ? "z-[90] isolate" : ""}`}>
      <div className="relative">
        <input
          ref={inputRef}
          data-testid={testId ? `${testId}-input` : undefined}
          type="text"
          className={`lv-input ${compact ? "h-11 pr-10 text-sm" : "pr-11"} ${
            disabled ? "cursor-not-allowed opacity-60" : ""
          }`}
          placeholder={open ? searchPlaceholder : placeholder}
          value={inputValue}
          disabled={disabled}
          onFocus={() => {
            setQuery(selectedLabel);
            openPicker();
          }}
          onChange={(event) => handleInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            if (!filteredOptions.length) return;
            event.preventDefault();
            handleSelect(filteredOptions[0].id);
          }}
        />

        {selectedLabel ? (
          <button
            type="button"
            aria-label="Quitar clasificacion"
            className={`absolute top-1/2 -translate-y-1/2 rounded-full border border-[var(--lv-border)] text-[var(--lv-text-muted)] transition hover:border-[var(--lv-primary)] hover:text-[var(--lv-primary-strong)] ${
              compact
                ? "right-2 flex h-7 w-7 items-center justify-center text-base leading-none"
                : "right-3 px-2 py-1 text-[11px] font-medium"
            }`}
            onClick={() => {
              setQuery("");
              setCustomLabel("");
              skipNextFocusPrefillRef.current = true;
              onChange("");
              setOpen(false);
              onBlur?.();
              inputRef.current?.focus();
            }}
          >
            {compact ? <span aria-hidden="true">&times;</span> : "Quitar"}
          </button>
        ) : null}
      </div>

      {open ? (
        <div
          className={`absolute left-0 top-[calc(100%+0.45rem)] z-[95] w-full border border-[var(--lv-border)] bg-[var(--lv-surface)] shadow-[var(--lv-shadow-md)] ${
            compact ? "rounded-[20px] p-2.5" : "rounded-[24px] p-3"
          }`}
        >
          {filteredOptions.length ? (
            <div className={`space-y-2 overflow-auto pr-1 ${compact ? "max-h-[240px]" : "max-h-[280px]"}`}>
              {filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  data-testid={testId ? `${testId}-option` : undefined}
                  className={`w-full rounded-[18px] border text-left transition ${
                    value === option.id
                      ? "border-[#86b49d] bg-[#eef6ea] text-[#2f5137]"
                      : "border-[var(--lv-border)] bg-white text-[var(--lv-text)] hover:border-[#86b49d] hover:bg-[#f7fbf6]"
                  } ${compact ? "px-3 py-2.5" : "px-3 py-3"}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(option.id)}
                >
                  <div className="text-sm font-medium">{option.label}</div>
                  {option.description ? (
                    <div className={`mt-1 text-xs text-[var(--lv-text-muted)] ${compact ? "leading-4" : "leading-5"}`}>
                      {option.description}
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          ) : normalizedQuery ? (
            <div className="space-y-2">
              <div className="rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-3 py-3 text-sm text-[var(--lv-text-muted)]">
                No coincide ningun tipo.
              </div>
              <button
                type="button"
                data-testid={testId ? `${testId}-free-text` : undefined}
                className={`w-full rounded-[18px] border border-[var(--lv-border)] bg-white text-left text-sm font-medium text-[var(--lv-text)] transition hover:border-[#86b49d] hover:bg-[#f7fbf6] ${
                  compact ? "px-3 py-2.5" : "px-3 py-3"
                }`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={handleSelectFreeText}
              >
                Usar &quot;{query.trim()}&quot;
              </button>
            </div>
          ) : (
            <div className="rounded-[18px] border border-[var(--lv-border)] bg-[var(--lv-surface-soft)] px-3 py-3 text-sm text-[var(--lv-text-muted)]">
              Todavia no hay tipos de plan disponibles.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
