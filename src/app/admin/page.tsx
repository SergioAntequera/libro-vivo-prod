"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureSuperadminOrRedirect } from "@/lib/auth";
import {
  resolveActiveGardenIdForUser,
  withGardenScope,
} from "@/lib/gardens";
import { supabase } from "@/lib/supabase";
import {
  AdminControlPlaneHome,
  type AdminControlPlaneStats,
} from "@/components/admin/AdminControlPlaneHome";

type YearNoteRow = {
  note?: unknown;
  cover_url?: unknown;
  highlight_page_ids?: unknown;
};

type ThemeKeyRow = {
  key?: unknown;
};

const EMPTY_STATS: AdminControlPlaneStats = {
  activeGardenTitle: null,
  planTypesTotal: 0,
  planTypesWithoutCanonicalVisuals: 0,
  pagesTotal: 0,
  reflectionsTotal: 0,
  seedsTotal: 0,
  seedFlowRules: 0,
  achievementsUnlockedTotal: 0,
  mapPlacesTotal: 0,
  mapRoutesTotal: 0,
  mapZonesTotal: 0,
  currentYear: new Date().getFullYear(),
  currentYearPagesTotal: 0,
  currentYearHasNote: false,
  currentYearHasCover: false,
  currentYearHighlightCount: 0,
  seasonNotesTotal: 0,
  activeForestThemeKey: null,
  activePdfThemeKey: null,
};

function normalizeText(value: unknown) {
  const next = String(value ?? "").trim();
  return next || null;
}

async function safeExactCount(
  queryPromise: PromiseLike<{
    count: number | null;
    error: { message?: string | null } | null;
  }>,
) {
  const { count, error } = await queryPromise;
  if (error) return 0;
  return count ?? 0;
}

async function safeRows<T>(
  queryPromise: PromiseLike<{
    data: T[] | null;
    error: { message?: string | null } | null;
  }>,
) {
  const { data, error } = await queryPromise;
  if (error) return [] as T[];
  return data ?? [];
}

async function safeMaybeSingle<T>(
  queryPromise: PromiseLike<{
    data: T | null;
    error: { message?: string | null } | null;
  }>,
) {
  const { data, error } = await queryPromise;
  if (error) return null;
  return data ?? null;
}

function countHighlightIds(value: unknown) {
  if (!Array.isArray(value)) return 0;
  return value.map((entry) => String(entry ?? "").trim()).filter(Boolean).length;
}

export default function AdminPage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const [loading, setLoading] = useState(true);
  const [fetchMessage, setFetchMessage] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminControlPlaneStats>(EMPTY_STATS);
  const [gardenReloadTick, setGardenReloadTick] = useState(0);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setFetchMessage(null);

    const session = await ensureSuperadminOrRedirect(router);
    if (!session) {
      setLoading(false);
      return;
    }

    try {
      const resolvedGardenId = await resolveActiveGardenIdForUser({
        userId: session.profile.id,
        forceRefresh: true,
      }).catch(() => null);

      const yearFrom = `${currentYear}-01-01`;
      const nextYearFrom = `${currentYear + 1}-01-01`;

      const planTypesQuery = withGardenScope(
        supabase
          .from("garden_plan_types")
          .select("id,seed_asset_path,flower_asset_path")
          .is("archived_at", null),
        resolvedGardenId,
      );

      const [
        gardenRow,
        planTypeRows,
        pagesTotal,
        reflectionsTotal,
        seedsTotal,
        achievementsUnlockedTotal,
        mapPlacesTotal,
        mapRoutesTotal,
        mapZonesTotal,
        currentYearPagesTotal,
        yearNoteRow,
        seasonNotesTotal,
        activeForestTheme,
        activePdfTheme,
        seedFlowRules,
      ] = await Promise.all([
        resolvedGardenId
          ? safeMaybeSingle<{ title?: unknown }>(
              supabase.from("gardens").select("title").eq("id", resolvedGardenId).maybeSingle(),
            )
          : Promise.resolve(null),
        safeRows<Array<{ id: string; seed_asset_path?: unknown; flower_asset_path?: unknown }>[number]>(
          planTypesQuery,
        ),
        safeExactCount(
          withGardenScope(
            supabase.from("pages").select("*", { count: "exact", head: true }),
            resolvedGardenId,
          ),
        ),
        safeExactCount(
          withGardenScope(
            supabase.from("memory_reflections").select("*", { count: "exact", head: true }),
            resolvedGardenId,
          ),
        ),
        safeExactCount(
          withGardenScope(
            supabase.from("seeds").select("*", { count: "exact", head: true }),
            resolvedGardenId,
          ),
        ),
        safeExactCount(
          withGardenScope(
            supabase
              .from("progression_tree_unlocks")
              .select("*", { count: "exact", head: true }),
            resolvedGardenId,
          ),
        ),
        safeExactCount(
          withGardenScope(
            supabase
              .from("map_places")
              .select("*", { count: "exact", head: true })
              .is("archived_at", null),
            resolvedGardenId,
          ),
        ),
        safeExactCount(
          withGardenScope(
            supabase
              .from("map_routes")
              .select("*", { count: "exact", head: true })
              .is("archived_at", null),
            resolvedGardenId,
          ),
        ),
        safeExactCount(
          withGardenScope(
            supabase
              .from("map_zones")
              .select("*", { count: "exact", head: true })
              .is("archived_at", null),
            resolvedGardenId,
          ),
        ),
        safeExactCount(
          withGardenScope(
            supabase
              .from("pages")
              .select("*", { count: "exact", head: true })
              .gte("date", yearFrom)
              .lt("date", nextYearFrom),
            resolvedGardenId,
          ),
        ),
        safeMaybeSingle<YearNoteRow>(
          withGardenScope(
            supabase
              .from("year_notes")
              .select("note,cover_url,highlight_page_ids")
              .eq("year", currentYear)
              .maybeSingle(),
            resolvedGardenId,
          ),
        ),
        safeExactCount(
          withGardenScope(
            supabase
              .from("season_notes")
              .select("*", { count: "exact", head: true })
              .eq("year", currentYear),
            resolvedGardenId,
          ),
        ),
        safeMaybeSingle<ThemeKeyRow>(
          supabase
            .from("forest_theme")
            .select("key")
            .eq("is_active", true)
            .order("priority", { ascending: true })
            .limit(1)
            .maybeSingle(),
        ),
        safeMaybeSingle<ThemeKeyRow>(
          supabase
            .from("pdf_themes")
            .select("key")
            .eq("is_active", true)
            .order("priority", { ascending: true })
            .limit(1)
            .maybeSingle(),
        ),
        safeExactCount(
          supabase
            .from("seed_status_flow")
            .select("*", { count: "exact", head: true })
            .eq("enabled", true),
        ),
      ]);

      const planTypesWithoutCanonicalVisuals = planTypeRows.filter((row) => {
        const seedAsset = normalizeText(row.seed_asset_path);
        const flowerAsset = normalizeText(row.flower_asset_path);
        return !seedAsset && !flowerAsset;
      }).length;

      setStats({
        activeGardenTitle: normalizeText(gardenRow?.title),
        planTypesTotal: planTypeRows.length,
        planTypesWithoutCanonicalVisuals,
        pagesTotal,
        reflectionsTotal,
        seedsTotal,
        seedFlowRules,
        achievementsUnlockedTotal,
        mapPlacesTotal,
        mapRoutesTotal,
        mapZonesTotal,
        currentYear,
        currentYearPagesTotal,
        currentYearHasNote: Boolean(normalizeText(yearNoteRow?.note)),
        currentYearHasCover: Boolean(normalizeText(yearNoteRow?.cover_url)),
        currentYearHighlightCount: countHighlightIds(yearNoteRow?.highlight_page_ids),
        seasonNotesTotal,
        activeForestThemeKey: normalizeText(activeForestTheme?.key),
        activePdfThemeKey: normalizeText(activePdfTheme?.key),
      });

      if (!resolvedGardenId) {
        setFetchMessage("No se pudo resolver un jardín activo para este usuario.");
      }
    } catch (error) {
      const fallback =
        error instanceof Error && error.message.trim()
          ? error.message
          : "No se pudo cargar la portada operativa del admin.";
      setFetchMessage(fallback);
    } finally {
      setLoading(false);
    }
  }, [currentYear, router]);

  useEffect(() => {
    void loadDashboard();
  }, [gardenReloadTick, loadDashboard]);

  return (
    <AdminControlPlaneHome
      stats={stats}
      loading={loading}
      fetchMessage={fetchMessage}
      onGardenChanged={() => {
        setGardenReloadTick((prev) => prev + 1);
      }}
    />
  );
}
