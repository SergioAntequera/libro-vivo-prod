"use client";

import type { Tier } from "@/lib/forestTiers";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Season } from "@/lib/forestLogic";
import { useForestViewportController } from "@/components/forest/useForestViewportController";
import { useForestBootstrapData } from "@/components/forest/useForestBootstrapData";
import { useForestOverviewData } from "@/components/forest/useForestOverviewData";
import ForestAnnualCanvasSection from "@/components/forest/ForestAnnualCanvasSection";
import {
  annualTreePhaseLabel,
  type AnnualTreeGrowth,
  type AnnualTreeMetrics,
} from "@/lib/annualTreeEngine";
import { buildCanonicalAnnualTreeSnapshot } from "@/lib/annualTreeCanonical";
import { type GardenYearTreeState } from "@/lib/annualTreeState";
import ForestHeaderPanel from "@/components/forest/ForestHeaderPanel";
import ForestInsightsSection from "@/components/forest/ForestInsightsSection";
import ForestPagesSection from "@/components/forest/ForestPagesSection";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { StatusNotice } from "@/components/ui/StatusNotice";
import {
  annualTreePhaseTone,
  clampNumber,
  distributeIntoBands,
  lerpNumber,
  parseYearToken,
  seededUnit,
} from "@/lib/forestPageUtils";
import {
  buildBlossomScatter,
  buildFlowerDecor,
  buildGladeDecor,
  buildMossPatches,
} from "@/lib/forestCanvasDecor";
import type { ForestItem } from "@/lib/forestDataTypes";
import {
  getPageDetailHref,
  getProductSurfaceHref,
  getYearBookHref,
} from "@/lib/productSurfaces";

type AnnualForestTree = {
  year: number;
  metrics: AnnualTreeMetrics;
  growth: AnnualTreeGrowth;
  pageCount: number;
  milestoneCount: number;
};

type PlacedForestTree = AnnualForestTree & {
  x: number;
  y: number;
  treeSize: number;
  bandIndex: number;
};

const ALL_SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];
const TIER_ORDER: Tier[] = ["bronze", "silver", "gold", "diamond"];
const SHOW_FOREST_DEBUG_GRID = false;
const FOREST_ZOOM_MIN = 0.72;
const FOREST_ZOOM_MAX = 1.85;

export default function ForestPage() {
  const router = useRouter();
  const [seasonFilter, setSeasonFilter] = useState<Season | "all">("all");
  const [yearFilter, setYearFilter] = useState<"all" | string>("all");
  const [gardenReloadTick, setGardenReloadTick] = useState(0);
  const [showForestInsights, setShowForestInsights] = useState(false);

  const requireLogin = useCallback(() => {
    router.push(getProductSurfaceHref("login"));
  }, [router]);

  const {
    forestConfig,
    items,
    loading,
    tiers,
    rules,
    unlockedRuleIds,
    unlockedEntries,
    claimedMilestoneTrees,
    annualTreeStates,
    seedsBloomed,
    fetchWarning,
    homeTrailConfig,
  } = useForestBootstrapData({
    gardenReloadTick,
    onRequireLogin: requireLogin,
  });

  const {
    yearOptions,
    visibleItems,
    grouped,
    stats,
    visibleSeedsBloomed,
    activeYearForBook,
    seasonStats,
    tierSet,
    activeTierSummary,
    seasonLabelUi,
    seasonCardStyle,
    kindLabelUi,
    dominantFlowerFamilies,
    milestoneCards,
    nextMilestone,
    unlockedMilestoneCount,
  } = useForestOverviewData({
    items,
    yearFilter,
    seedsBloomed,
    tiers,
    rules,
    unlockedRuleIds,
    unlockedEntries,
    forestConfig,
    allSeasons: ALL_SEASONS,
    tierOrder: TIER_ORDER,
  });
  const effectiveYearFilter =
    yearFilter === "all" || yearOptions.includes(yearFilter) ? yearFilter : "all";

  const annualTrees = useMemo<AnnualForestTree[]>(() => {
    const stateRows = annualTreeStates.filter((state) => {
      if (effectiveYearFilter === "all") return true;
      return String(state.year) === effectiveYearFilter;
    });
    if (stateRows.length > 0) {
      return stateRows.map((state: GardenYearTreeState) => ({
        year: state.year,
        metrics: state.metrics,
        growth: state.growth,
        pageCount: state.metrics.totalEvents,
        milestoneCount: state.metrics.milestonesUnlocked,
      }));
    }

    const pagesByYear = new Map<number, ForestItem[]>();
    for (const item of items) {
      const year = parseYearToken(item.date);
      if (!year) continue;
      if (!pagesByYear.has(year)) pagesByYear.set(year, []);
      pagesByYear.get(year)!.push(item);
    }

    const milestonesByYear = new Map<number, number>();
    for (const unlock of unlockedEntries) {
      const year = parseYearToken(unlock.created_at);
      if (!year) continue;
      milestonesByYear.set(year, (milestonesByYear.get(year) ?? 0) + 1);
    }

    let years = Array.from(
      new Set<number>([
        ...Array.from(pagesByYear.keys()),
        ...Array.from(milestonesByYear.keys()),
      ]),
    ).sort((a, b) => a - b);

    if (effectiveYearFilter !== "all" && /^\d{4}$/.test(effectiveYearFilter)) {
      years = [Number(effectiveYearFilter)];
    }

    if (!years.length) {
      years = [new Date().getFullYear()];
    }

    return years.map((year) => {
      const yearPages = pagesByYear.get(year) ?? [];
      const milestoneCount = milestonesByYear.get(year) ?? 0;
      const snapshot = buildCanonicalAnnualTreeSnapshot({
        year,
        pages: yearPages,
        milestonesUnlocked: milestoneCount,
        annualTreeAssets: homeTrailConfig.annualTreeAssets,
        idPrefix: "forest-page",
        titleFallback: "Recuerdo del bosque",
      });
      return {
        year,
        metrics: snapshot.metrics,
        growth: snapshot.growth,
        pageCount: yearPages.length,
        milestoneCount,
      };
    });
  }, [annualTreeStates, effectiveYearFilter, homeTrailConfig.annualTreeAssets, items, unlockedEntries]);

  const visibleClaimedMilestoneTrees = useMemo(() => {
    if (effectiveYearFilter === "all") return claimedMilestoneTrees;
    return claimedMilestoneTrees.filter((tree) => {
      const claimedYear = parseYearToken(tree.claimedAt);
      return claimedYear != null && String(claimedYear) === effectiveYearFilter;
    });
  }, [claimedMilestoneTrees, effectiveYearFilter]);

  const forestVisibleYearRangeLabel = useMemo(() => {
    if (!annualTrees.length) return "Sin años";
    const firstYear = annualTrees[0]?.year ?? null;
    const lastYear = annualTrees[annualTrees.length - 1]?.year ?? null;
    if (firstYear == null || lastYear == null) return "Sin años";
    return firstYear === lastYear ? String(firstYear) : `${firstYear}-${lastYear}`;
  }, [annualTrees]);

  const forestZoneCapacity = 6;
  const forestZoneWidth = 980;
  const forestZoneGap = 160;
  const forestCanvasPaddingX = 120;
  const forestZoneCount = useMemo(
    () => Math.max(1, Math.ceil(annualTrees.length / forestZoneCapacity)),
    [annualTrees.length],
  );

  const forestCanvasWidth = useMemo(() => {
    return (
      forestCanvasPaddingX * 2 +
      forestZoneCount * forestZoneWidth +
      Math.max(0, forestZoneCount - 1) * forestZoneGap
    );
  }, [forestZoneCount]);

  const forestCanvasHeight = useMemo(() => {
    return clampNumber(620 + Math.max(0, forestZoneCount - 1) * 36, 620, 920);
  }, [forestZoneCount]);

  const forestViewportHeight = useMemo(() => {
    return clampNumber(530 + Math.min(2, forestZoneCount - 1) * 48, 530, 680);
  }, [forestZoneCount]);

  const orchardPlacements = useMemo<PlacedForestTree[]>(() => {
    if (!annualTrees.length) return [];

    const globalEdgePaddingX = 110;
    const globalEdgePaddingY = 72;
    const placements: PlacedForestTree[] = [];

    for (let zoneIndex = 0; zoneIndex < forestZoneCount; zoneIndex += 1) {
      const zoneTrees = annualTrees.slice(
        zoneIndex * forestZoneCapacity,
        zoneIndex * forestZoneCapacity + forestZoneCapacity,
      );
      if (!zoneTrees.length) continue;

      const laneCount = zoneTrees.length >= 6 ? 3 : zoneTrees.length >= 4 ? 2 : 1;
      const laneSizes = distributeIntoBands(zoneTrees.length, laneCount);
      const zoneStartX =
        forestCanvasPaddingX + zoneIndex * (forestZoneWidth + forestZoneGap);
      const zoneEndX = zoneStartX + forestZoneWidth;
      const zoneVerticalShift =
        (seededUnit(9300 + zoneIndex * 17) - 0.5) * forestCanvasHeight * 0.04;
      const laneStartRatios =
        laneCount === 1 ? [0.18] : laneCount === 2 ? [0.14, 0.11] : [0.12, 0.18, 0.12];
      const laneEndRatios =
        laneCount === 1 ? [0.82] : laneCount === 2 ? [0.86, 0.89] : [0.88, 0.82, 0.88];
      const laneDirections = laneCount === 3 ? [-1, 1, -1] : laneCount === 2 ? [-1, 1] : [-1];

      let cursor = 0;
      for (let bandIndex = 0; bandIndex < laneCount; bandIndex += 1) {
        const bandSize = laneSizes[bandIndex] ?? 0;
        const bandTrees = zoneTrees.slice(cursor, cursor + bandSize);
        cursor += bandSize;

        const bandProgress = laneCount === 1 ? 0.5 : bandIndex / (laneCount - 1);
        const yBase =
          lerpNumber(forestCanvasHeight * 0.35, forestCanvasHeight * 0.79, bandProgress) +
          zoneVerticalShift;
        const xStart =
          zoneStartX + forestZoneWidth * (laneStartRatios[bandIndex] ?? 0.14);
        const xEnd =
          zoneStartX + forestZoneWidth * (laneEndRatios[bandIndex] ?? 0.86);
        const curveDirection = laneDirections[bandIndex] ?? -1;

        for (const [rowIndex, tree] of bandTrees.entries()) {
          const rowProgress =
            bandTrees.length === 1 ? 0.5 : rowIndex / (bandTrees.length - 1);
          const stageRatio = clampNumber(tree.growth.stage / 100, 0, 1);
          const sparseBoost = zoneTrees.length <= 4 ? 1.08 : 1;
          const baseSize = forestZoneWidth * (0.146 + stageRatio * 0.052);
          const treeSize = clampNumber(baseSize * sparseBoost, 130, 196);
          const leftBound = Math.max(globalEdgePaddingX + treeSize * 0.62, zoneStartX + treeSize * 0.68);
          const rightBound = Math.min(
            forestCanvasWidth - globalEdgePaddingX - treeSize * 0.62,
            zoneEndX - treeSize * 0.68,
          );
          const topBound = globalEdgePaddingY + treeSize * 0.72;
          const bottomBound = forestCanvasHeight - 42 - treeSize * 0.42;

          const curveY =
            Math.sin(rowProgress * Math.PI * 1.18 + zoneIndex * 0.56) *
            forestCanvasHeight *
            0.03 *
            curveDirection;
          const baseX = lerpNumber(xStart, xEnd, rowProgress);
          const baseY = yBase + curveY + stageRatio * forestCanvasHeight * 0.05;

          let x = baseX;
          let y = baseY;
          let placed = false;

          for (let attempt = 0; attempt < 28; attempt += 1) {
            const nudgeX =
              (seededUnit(tree.year * 37 + attempt * 17) - 0.5) *
              Math.min(forestZoneWidth * 0.052, treeSize * 0.84);
            const nudgeY =
              (seededUnit(tree.year * 41 + attempt * 13) - 0.5) *
              Math.min(forestCanvasHeight * 0.042, treeSize * 0.48);
            const spreadX =
              (attempt % 2 === 0 ? -1 : 1) * Math.floor(attempt / 2) * treeSize * 0.2;
            const spreadY =
              Math.floor(attempt / 3) * treeSize * 0.1 * curveDirection;

            const candX = clampNumber(
              baseX + nudgeX + spreadX,
              leftBound,
              rightBound,
            );
            const candY = clampNumber(
              baseY + nudgeY + spreadY,
              topBound,
              bottomBound,
            );

            const overlaps = placements.some((placedTree) => {
              const dx = placedTree.x - candX;
              const dy = placedTree.y - candY;
              return Math.hypot(dx, dy * 1.16) < (treeSize + placedTree.treeSize) * 0.54;
            });

            if (!overlaps) {
              x = candX;
              y = candY;
              placed = true;
              break;
            }
          }

          if (!placed) {
            x = clampNumber(
              baseX,
              leftBound,
              rightBound,
            );
            y = clampNumber(
              baseY,
              topBound,
              bottomBound,
            );
          }

          placements.push({
            ...tree,
            x,
            y,
            treeSize,
            bandIndex: zoneIndex * 10 + bandIndex,
          });
        }
      }
    }

    return placements.sort((a, b) => (a.y === b.y ? a.year - b.year : a.y - b.y));
  }, [annualTrees, forestCanvasHeight, forestCanvasWidth, forestZoneCount]);

  const orchardTimeline = useMemo(() => {
    return [...orchardPlacements].sort((a, b) => a.year - b.year);
  }, [orchardPlacements]);

  const forestZones = useMemo(() => {
    return Array.from({ length: forestZoneCount }, (_, zoneIndex) => {
      const trees = annualTrees.slice(
        zoneIndex * forestZoneCapacity,
        zoneIndex * forestZoneCapacity + forestZoneCapacity,
      );
      const zoneYearSet = new Set(trees.map((tree) => tree.year));
      const placedTrees = orchardPlacements.filter((tree) => zoneYearSet.has(tree.year));
      const firstYear = trees[0]?.year ?? null;
      const lastYear = trees[trees.length - 1]?.year ?? null;
      const startX = forestCanvasPaddingX + zoneIndex * (forestZoneWidth + forestZoneGap);
      let left = startX + forestZoneWidth * 0.16;
      let right = startX + forestZoneWidth * 0.84;
      let top = forestCanvasHeight * 0.26;
      let bottom = forestCanvasHeight * 0.84;

      if (placedTrees.length) {
        left = Number.POSITIVE_INFINITY;
        right = Number.NEGATIVE_INFINITY;
        top = Number.POSITIVE_INFINITY;
        bottom = Number.NEGATIVE_INFINITY;
        for (const tree of placedTrees) {
          left = Math.min(left, tree.x - tree.treeSize * 0.66);
          right = Math.max(right, tree.x + tree.treeSize * 0.66);
          top = Math.min(top, tree.y - tree.treeSize * 0.78);
          bottom = Math.max(bottom, tree.y + tree.treeSize * 0.74);
        }
      }

      left = clampNumber(left - 40, startX + 16, startX + forestZoneWidth - 180);
      right = clampNumber(right + 40, startX + 180, startX + forestZoneWidth - 16);
      top = clampNumber(top - 32, 48, forestCanvasHeight - 240);
      bottom = clampNumber(bottom + 46, 240, forestCanvasHeight - 18);
      const yearsLabel =
        firstYear == null
          ? "Sin años"
          : firstYear === lastYear
            ? `${firstYear}`
            : `${firstYear}-${lastYear}`;
      return {
        zoneIndex,
        startX,
        left,
        right,
        top,
        bottom,
        centerX: (left + right) / 2,
        centerY: (top + bottom) / 2,
        yearsLabel,
      };
    });
  }, [annualTrees, forestCanvasHeight, forestZoneCount, orchardPlacements]);

  const forestContentBounds = useMemo(() => {
    if (!orchardPlacements.length) {
      const left = forestCanvasPaddingX * 0.7;
      const right = forestCanvasWidth - forestCanvasPaddingX * 0.7;
      const top = 96;
      const bottom = forestCanvasHeight - 56;
      return {
        left,
        right,
        top,
        bottom,
        width: right - left,
        height: bottom - top,
        centerX: (left + right) / 2,
        centerY: (top + bottom) / 2,
      };
    }

    let left = Number.POSITIVE_INFINITY;
    let right = Number.NEGATIVE_INFINITY;
    let top = Number.POSITIVE_INFINITY;
    let bottom = Number.NEGATIVE_INFINITY;

    for (const tree of orchardPlacements) {
      left = Math.min(left, tree.x - tree.treeSize * 0.68);
      right = Math.max(right, tree.x + tree.treeSize * 0.68);
      top = Math.min(top, tree.y - tree.treeSize * 0.8);
      bottom = Math.max(bottom, tree.y + tree.treeSize * 0.76);
    }

    left = clampNumber(left - 40, 26, forestCanvasWidth - 260);
    right = clampNumber(right + 40, 260, forestCanvasWidth - 26);
    top = clampNumber(top - 30, 40, forestCanvasHeight - 280);
    bottom = clampNumber(bottom + 48, 260, forestCanvasHeight - 18);

    return {
      left,
      right,
      top,
      bottom,
      width: right - left,
      height: bottom - top,
      centerX: (left + right) / 2,
      centerY: (top + bottom) / 2,
    };
  }, [forestCanvasHeight, forestCanvasWidth, orchardPlacements]);

  const {
    forestViewportRef,
    forestZoom,
    setForestZoom,
    forestActiveZone,
    setForestActiveZone,
    highlightedTreeYears,
    clearForestHighlights,
    forestScaledWidth,
    forestScaledHeight,
    computeForestZoneFitZoom,
    focusForestZone,
    focusForestYear,
    fitForestViewport,
    onForestPointerDown,
    onForestPointerMove,
    finishForestDrag,
    isForestTreeClickSuppressed,
  } = useForestViewportController({
    forestCanvasWidth,
    forestCanvasHeight,
    forestContentBounds,
    forestZones,
    forestZoneCount,
    forestZoneCapacity,
    annualTreeYears: annualTrees.map((tree) => tree.year),
    orchardPlacements,
    minZoom: FOREST_ZOOM_MIN,
    maxZoom: FOREST_ZOOM_MAX,
  });

  const highlightedTreeYearSet = useMemo(
    () => new Set(highlightedTreeYears),
    [highlightedTreeYears],
  );

  const showTreeLabels = annualTrees.length <= 16 && forestZoom <= 1.32;

  const forestPathD = useMemo(() => {
    if (orchardTimeline.length < 2) return null;
    return orchardTimeline
      .map((tree, index) => {
        const x = tree.x;
        const y = tree.y + tree.treeSize * 0.18;
        if (index === 0) return `M ${x} ${y}`;
        const prev = orchardTimeline[index - 1];
        const prevX = prev.x;
        const prevY = prev.y + prev.treeSize * 0.18;
        const mx = (prevX + x) / 2;
        const my =
          (prevY + y) / 2 +
          (index % 2 === 0 ? forestCanvasHeight * 0.045 : -forestCanvasHeight * 0.045);
        return `Q ${mx} ${my} ${x} ${y}`;
      })
      .join(" ");
  }, [orchardTimeline, forestCanvasHeight]);

  const gladeDecor = useMemo(
    () =>
      buildGladeDecor({
        annualTreeCount: annualTrees.length,
        forestCanvasWidth,
        forestCanvasHeight,
      }),
    [annualTrees.length, forestCanvasHeight, forestCanvasWidth],
  );

  const mossPatches = useMemo(
    () =>
      buildMossPatches({
        annualTreeCount: annualTrees.length,
        forestCanvasWidth,
        forestCanvasHeight,
      }),
    [annualTrees.length, forestCanvasHeight, forestCanvasWidth],
  );

  const flowerDecor = useMemo(
    () =>
      buildFlowerDecor({
        annualTreeCount: annualTrees.length,
        forestCanvasWidth,
        forestCanvasHeight,
      }),
    [annualTrees.length, forestCanvasHeight, forestCanvasWidth],
  );

  const blossomScatter = useMemo(
    () => buildBlossomScatter(orchardTimeline),
    [orchardTimeline],
  );

  function openForestYear(year: number) {
    if (isForestTreeClickSuppressed()) return;
    router.push(getYearBookHref(year));
  }

  function clearForestFilters() {
    setYearFilter("all");
    setSeasonFilter("all");
    setForestActiveZone(0);
    clearForestHighlights();
  }

  function visibleSeasons(): Season[] {
    if (seasonFilter === "all") return ALL_SEASONS;
    return [seasonFilter];
  }

  const hasActiveFilters = effectiveYearFilter !== "all" || seasonFilter !== "all";
  const shouldShowForestPagePreviews = effectiveYearFilter !== "all";

  if (loading) {
    return <PageLoadingState message="Dibujando el bosque..." />;
  }

  return (
    <div className="lv-page p-6">
      <div className="lv-shell max-w-6xl space-y-4">
        <ForestHeaderPanel
          forestTitle={forestConfig.title}
          forestSubtitle={forestConfig.subtitle}
          hasActiveFilters={hasActiveFilters}
          yearFilter={effectiveYearFilter}
          yearOptions={yearOptions}
          onYearFilterChange={setYearFilter}
          seasonFilter={seasonFilter}
          onSeasonFilterChange={setSeasonFilter}
          seasonLabel={seasonLabelUi}
          onOpenYearBook={() => router.push(getYearBookHref(activeYearForBook))}
          yearBookButtonLabel={
            effectiveYearFilter === "all"
              ? `Continuar ${activeYearForBook}`
              : `Abrir libro ${activeYearForBook}`
          }
          onOpenAchievements={() => router.push(getProductSurfaceHref("achievements"))}
          onClearFilters={clearForestFilters}
          onBackHome={() => router.push(getProductSurfaceHref("home"))}
          onGardenChanged={() => {
            setGardenReloadTick((prev) => prev + 1);
          }}
          forestVisibleYearRangeLabel={forestVisibleYearRangeLabel}
          statsTotal={stats.total}
          forestZoneCount={forestZoneCount}
          annualTreeCount={annualTrees.length}
          nextMilestoneLabel={
            nextMilestone
              ? nextMilestone.title ||
                `${kindLabelUi(nextMilestone.kind)} ${nextMilestone.threshold}`
              : "Todo completado"
          }
        />

        {fetchWarning ? <StatusNotice message={fetchWarning} tone="warning" className="text-sm" /> : null}

        <ForestAnnualCanvasSection
          annualTreeCount={annualTrees.length}
          forestZoneCount={forestZoneCount}
          forestZoneCapacity={forestZoneCapacity}
          onFitZone={() => fitForestViewport(forestZoneCount > 1 ? "zone" : "overview")}
          onFitOverview={() => fitForestViewport("overview")}
          showOverviewButton={forestZoneCount > 1}
          zones={forestZones.map((zone) => ({
            zoneIndex: zone.zoneIndex,
            yearsLabel: zone.yearsLabel,
          }))}
          activeZone={forestActiveZone}
          onZoneClick={(zoneIndex) =>
            focusForestZone(
              zoneIndex,
              computeForestZoneFitZoom(zoneIndex),
              annualTrees
                .slice(
                  zoneIndex * forestZoneCapacity,
                  zoneIndex * forestZoneCapacity + forestZoneCapacity,
                )
                .map((tree) => tree.year),
            )
          }
          viewportRef={forestViewportRef}
          onPointerDown={onForestPointerDown}
          onPointerMove={onForestPointerMove}
          onPointerUp={finishForestDrag}
          viewportHeight={forestViewportHeight}
          scaledWidth={forestScaledWidth}
          scaledHeight={forestScaledHeight}
          canvasWidth={forestCanvasWidth}
          canvasHeight={forestCanvasHeight}
          zoom={forestZoom}
          showDebugGrid={SHOW_FOREST_DEBUG_GRID}
          forestPathD={forestPathD}
          orchardTimeline={orchardTimeline}
          gladeDecor={gladeDecor}
          mossPatches={mossPatches}
          flowerDecor={flowerDecor}
          blossomScatter={blossomScatter}
          orchardPlacements={orchardPlacements}
          annualTreeAssets={homeTrailConfig.annualTreeAssets}
          highlightedTreeYearSet={highlightedTreeYearSet}
          showTreeLabels={showTreeLabels}
          onOpenForestYear={openForestYear}
          treeChips={annualTrees.map((tree) => ({
            year: tree.year,
            label: `${tree.year} - ${annualTreePhaseLabel(tree.growth.phase)} - ${tree.growth.stage}/100`,
            style: annualTreePhaseTone(tree.growth.phase),
          }))}
          onTreeChipClick={focusForestYear}
        />

        <ForestInsightsSection
          showForestInsights={showForestInsights}
          onToggleInsights={() => setShowForestInsights((prev) => !prev)}
          statsTotal={stats.total}
          statsAvgStars={stats.avgStars}
          unlockedMilestoneCount={unlockedMilestoneCount}
          milestoneCardCount={milestoneCards.length}
          tierCount={tierSet.size}
          maxTierCount={TIER_ORDER.length}
          visibleSeedsBloomed={visibleSeedsBloomed}
          nextMilestoneLabel={
            nextMilestone
              ? nextMilestone.title ||
                `${kindLabelUi(nextMilestone.kind)} ${nextMilestone.threshold}`
              : "Todo completado"
          }
          nextMilestoneRemaining={
            nextMilestone ? nextMilestone.threshold - nextMilestone.current : null
          }
          activeTierSummary={activeTierSummary}
          dominantFlowerFamilies={dominantFlowerFamilies}
          claimedMilestoneTrees={visibleClaimedMilestoneTrees}
          seasons={ALL_SEASONS}
          seasonLabel={seasonLabelUi}
          seasonStats={seasonStats}
        />

        <ForestPagesSection
          shouldShowForestPagePreviews={shouldShowForestPagePreviews}
          yearFilter={effectiveYearFilter}
          seasonFilter={seasonFilter}
          seasonLabel={seasonLabelUi}
          activeYearForBook={activeYearForBook}
          onOpenYearBook={() => router.push(getYearBookHref(activeYearForBook))}
          visibleItems={visibleItems}
          emptyMessage={forestConfig.emptyMessage}
          visibleSeasons={visibleSeasons()}
          grouped={grouped}
          seasonStats={seasonStats}
          seasonCardStyle={seasonCardStyle}
          onOpenPage={(id) => router.push(getPageDetailHref(id))}
        />
      </div>
    </div>
  );
}
