"use client";

import type { CSSProperties } from "react";
import type { Season } from "@/lib/forestLogic";
import { buildPageVisualSnapshot } from "@/lib/pageVisualSnapshot";
import { PageStateCard } from "@/components/ui/PageStateCard";
import {
  FLOWER_FAMILY_LABELS,
  getFlowerFamilyFromLegacyElement,
  normalizeFlowerFamily,
} from "@/lib/productDomainContracts";

type ForestPreviewMood = "wilted" | "healthy" | "shiny";

type ForestPreviewItem = {
  id: string;
  title: string | null;
  date: string;
  element: string;
  plan_type_label?: string | null;
  plan_category?: string | null;
  flower_family?: string | null;
  flower_asset_path?: string | null;
  flower_builder_config?: import("@/lib/planTypeFlowerComposer").PlanFlowerComposerConfig | null;
  suggested_element?: string | null;
  rating: number | null;
  mood_state: ForestPreviewMood;
  is_favorite?: boolean | null;
  cover_photo_url?: string | null;
  thumbnail_url?: string | null;
};

type SeasonStats = {
  total: number;
  avgStars: number;
};

type ForestPagesSectionProps = {
  shouldShowForestPagePreviews: boolean;
  yearFilter: "all" | string;
  seasonFilter: Season | "all";
  seasonLabel: (season: Season) => string;
  activeYearForBook: number;
  onOpenYearBook: () => void;
  visibleItems: ForestPreviewItem[];
  emptyMessage: string;
  visibleSeasons: Season[];
  grouped: Record<Season, ForestPreviewItem[]>;
  seasonStats: Record<Season, SeasonStats>;
  seasonCardStyle: (season: Season) => CSSProperties;
  onOpenPage: (id: string) => void;
};

const FOREST_PAGE_PREVIEW_LIMIT = 8;

function renderRatingStars(rating: number | null) {
  if (rating == null || rating <= 0) return null;
  const normalized = Math.max(0, Math.min(5, Math.round(rating)));
  return `${"★".repeat(normalized)}${"☆".repeat(5 - normalized)}`;
}

export default function ForestPagesSection(props: ForestPagesSectionProps) {
  const {
    shouldShowForestPagePreviews,
    yearFilter,
    seasonFilter,
    seasonLabel,
    activeYearForBook,
    onOpenYearBook,
    visibleItems,
    emptyMessage,
    visibleSeasons,
    grouped,
    seasonStats,
    seasonCardStyle,
    onOpenPage,
  } = props;

  return (
    <>
      <section className="lv-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              {shouldShowForestPagePreviews
                ? "Páginas del año filtrado"
                : "Antesala del libro anual"}
            </h2>
            <p className="mt-1 text-sm text-[var(--lv-text-muted)]">
              {shouldShowForestPagePreviews
                ? "Aquí solo asoma una muestra del año para que el bosque siga siendo lectura de patrón y no una lista eterna."
                : "El bosque sirve para orientarte por años. El detalle completo y la lectura editorial viven dentro de cada libro anual."}
            </p>
          </div>
          {shouldShowForestPagePreviews ? (
            <div className="text-sm text-[var(--lv-text-muted)]">
              Año {yearFilter} ·{" "}
              {seasonFilter === "all" ? "Todas las estaciones" : seasonLabel(seasonFilter)}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenYearBook}
              className="lv-btn lv-btn-primary"
            >
              Abrir libro {activeYearForBook}
            </button>
          )}
        </div>
        {!shouldShowForestPagePreviews ? (
          <div className="lv-card-soft mt-4 p-4 text-sm text-[var(--lv-text-muted)]">
            Elige un árbol o filtra un año para ver una muestra de sus páginas. Mantener
            esta puerta ligera ayuda a que el bosque siga leyendo patrones y no se vuelva
            un listado infinito.
          </div>
        ) : null}
      </section>

      {visibleItems.length === 0 ? (
        <PageStateCard title="Bosque sin páginas visibles" message={emptyMessage} tone="info" />
      ) : shouldShowForestPagePreviews ? (
        visibleSeasons.map((season) => {
          const list = grouped[season] ?? [];
          const stats = seasonStats[season];
          const previewList = list.slice(0, FOREST_PAGE_PREVIEW_LIMIT);
          const remainingCount = Math.max(0, list.length - previewList.length);

          return (
            <section
              key={season}
              className="lv-card p-5"
              style={seasonCardStyle(season)}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{seasonLabel(season)}</h2>
                <span className="text-sm text-[var(--lv-text-muted)]">
                  {list.length} páginas
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="lv-badge bg-white px-3 py-1">{stats.total} páginas</span>
                <span className="lv-badge bg-white px-3 py-1">
                  Media {stats.avgStars.toFixed(1)}/5
                </span>
              </div>

              {list.length === 0 ? (
                <div className="lv-card-soft mt-4 bg-white p-4 text-sm text-[var(--lv-text-muted)]">
                  Aún no hay páginas en esta estación.
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {previewList.map((item) => {
                    const primaryVisual = buildPageVisualSnapshot({
                      planCategory: item.plan_category ?? null,
                      planFlowerFamily: item.flower_family ?? null,
                      planFlowerAssetPath: item.flower_asset_path ?? null,
                      planFlowerBuilderConfig: item.flower_builder_config ?? null,
                      planSuggestedElement: item.suggested_element ?? null,
                      element: item.element,
                      rating: item.rating,
                      coverPhotoUrl: item.cover_photo_url ?? null,
                      thumbnailUrl: item.thumbnail_url ?? null,
                    }).primaryAssetPath;
                    const flowerFamily =
                      normalizeFlowerFamily(item.flower_family) ??
                      getFlowerFamilyFromLegacyElement(item.element);
                    const familyLabel = FLOWER_FAMILY_LABELS[flowerFamily];
                    const identityLabel = item.plan_type_label
                      ? `${item.plan_type_label} / ${familyLabel}`
                      : familyLabel;

                    return (
                      <button
                        key={item.id}
                        onClick={() => onOpenPage(item.id)}
                        className="lv-card p-3 text-left transition hover:shadow-md"
                        title="Abrir página"
                      >
                        {primaryVisual ? (
                          <div className="flex h-28 w-full items-center justify-center rounded-[18px] border bg-[linear-gradient(180deg,#f7f8f4_0%,#ebf1e2_100%)]">
                            <img
                              src={primaryVisual}
                              alt=""
                              className="h-16 w-16 object-contain"
                            />
                          </div>
                        ) : (
                          <div className="flex h-28 w-full items-center justify-center rounded-[18px] border bg-[linear-gradient(180deg,#f7f8f4_0%,#ebf1e2_100%)]">
                            <div className="lv-badge bg-white px-3 py-1 text-sm font-medium">
                              {identityLabel}
                            </div>
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="lv-badge bg-white px-2 py-1 text-[11px]">
                            {identityLabel}
                          </span>
                          {item.is_favorite ? (
                            <span className="lv-badge bg-[#fff7d6] px-2 py-1 text-[11px] text-[#7b5d14]">
                              Favorita
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-2 line-clamp-1 font-semibold">
                          {item.title ?? "Página sin título"}
                        </div>
                        <div className="text-sm text-[var(--lv-text-muted)]">{item.date}</div>

                        {item.rating ? (
                          <div className="mt-2 space-y-1 text-sm text-[var(--lv-text-muted)]">
                            <div className="text-[#7b6516]">{renderRatingStars(item.rating)}</div>
                            <div>{item.rating.toFixed(1)}/5 estrellas</div>
                          </div>
                        ) : (
                          <div className="mt-2 text-sm text-[var(--lv-text-muted)]">
                            Sin valoración
                          </div>
                        )}
                      </button>
                    );
                  })}
                  {remainingCount > 0 ? (
                    <button
                      type="button"
                      onClick={onOpenYearBook}
                      className="lv-card border-dashed bg-white/80 p-4 text-left transition hover:shadow-md"
                      title="Abrir libro anual"
                    >
                      <div className="text-xs uppercase tracking-[0.12em] text-[var(--lv-text-muted)]">
                        Más páginas
                      </div>
                      <div className="mt-2 font-semibold">
                        Ver {remainingCount} página(s) más en el libro anual
                      </div>
                      <div className="mt-2 text-sm text-[var(--lv-text-muted)]">
                        El bosque solo deja ver una muestra para no cargar demasiado la
                        página.
                      </div>
                    </button>
                  ) : null}
                </div>
              )}
            </section>
          );
        })
      ) : null}
    </>
  );
}
