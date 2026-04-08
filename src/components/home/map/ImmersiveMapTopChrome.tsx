"use client";

import type { MapLensId } from "@/lib/homeMapExperience";
import type { MapLensCatalogItem } from "@/lib/mapCatalogConfig";

type SelectionMode = "seed_place" | "ritual_place" | null;

export default function ImmersiveMapTopChrome({
  activeLens,
  authoringMode: _authoringMode,
  lensCounts,
  lensOptions,
  onLensChange,
  onOpenSearch,
  onQueryChange,
  query,
  onClearQuery,
  onClose,
  selectionMode = null,
}: {
  activeLens: MapLensId;
  authoringMode: "none" | "route" | "zone" | "place";
  lensCounts: Record<MapLensId, number>;
  lensOptions: MapLensCatalogItem[];
  onLensChange: (lens: MapLensId) => void;
  onOpenSearch: () => void;
  onQueryChange: (value: string) => void;
  query: string;
  onClearQuery: () => void;
  onClose: () => void;
  selectionMode?: SelectionMode;
}) {
  const searchIcon = String.fromCodePoint(0x1f50e);
  const primaryLenses = lensOptions.filter((lens) => lens.group === "primary");
  const activeIsPrimary = primaryLenses.some((lens) => lens.id === activeLens);
  const activeMeta = lensOptions.find((lens) => lens.id === activeLens) ?? lensOptions[0];
  const visibleLenses = activeIsPrimary ? primaryLenses : [...primaryLenses, activeMeta];

  const legacySearchPlaceholder =
    selectionMode === "seed_place" || selectionMode === "ritual_place"
      ? "Buscar calle, número, ciudad o lugar"
      : "Buscar calle, número o lugar";

  const searchPlaceholder =
    selectionMode === "seed_place" || selectionMode === "ritual_place"
      ? "Buscar calle, número, ciudad o lugar"
      : "Buscar calle, número o lugar";

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[4000]"
      style={{
        paddingTop: "max(0.65rem, env(safe-area-inset-top) + 0.25rem)",
      }}
    >
      <div className="pointer-events-auto px-3 sm:px-4">
        <div className="mx-auto flex max-w-4xl items-start gap-2.5">
          <button
            type="button"
            className="shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium backdrop-blur-md"
            style={{
              borderColor: "var(--lv-map-chrome-border)",
              background: "var(--lv-map-chrome-bg)",
              color: "var(--lv-map-chrome-text)",
              boxShadow: "var(--lv-map-chrome-shadow)",
            }}
            onClick={onClose}
          >
            Volver
          </button>

          <div className="min-w-0 flex-1">
            <div
              className="rounded-full border px-4 py-2.5 backdrop-blur-xl"
              style={{
                borderColor: "var(--lv-map-chrome-border)",
                background: "var(--lv-map-chrome-bg)",
                boxShadow: "var(--lv-map-chrome-shadow)",
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg" aria-hidden="true">
                  {searchIcon}
                </span>
                <input
                  type="search"
                  value={query}
                  onFocus={onOpenSearch}
                  onChange={(event) => onQueryChange(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-[var(--lv-text)] outline-none placeholder:text-[var(--lv-text-muted)]"
                />
                {query ? (
                  <button
                    type="button"
                    className="rounded-full border px-2.5 py-1 text-xs font-medium"
                    style={{
                      borderColor: "var(--lv-map-chrome-border)",
                      background: "var(--lv-surface)",
                      color: "var(--lv-map-chrome-text)",
                    }}
                    onClick={onClearQuery}
                  >
                    Limpiar
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex gap-2">
                {visibleLenses.map((lens) => {
                  const active = activeLens === lens.id;
                  const count = lensCounts[lens.id];
                  const showCount = lens.id !== "explore" && count > 0;
                  return (
                    <button
                      key={lens.id}
                      type="button"
                      className="shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition"
                      style={
                        active
                          ? {
                              borderColor: "color-mix(in srgb, var(--lv-primary) 26%, white)",
                              background: "var(--lv-surface)",
                              color: "var(--lv-primary-strong)",
                              boxShadow: "var(--lv-map-chrome-shadow)",
                            }
                          : {
                              borderColor: "var(--lv-map-chrome-border)",
                              background:
                                "color-mix(in srgb, var(--lv-map-chrome-bg) 96%, transparent)",
                              color: "var(--lv-map-chrome-text)",
                              boxShadow: "var(--lv-shadow-sm)",
                            }
                      }
                      onClick={() => onLensChange(lens.id)}
                      aria-pressed={active}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="text-base">{lens.icon}</span>
                        <span>{lens.label}</span>
                        {showCount ? (
                          <span className="rounded-full bg-[var(--lv-primary-soft)] px-2 py-0.5 text-[11px] text-[var(--lv-primary-strong)]">
                            {count}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
