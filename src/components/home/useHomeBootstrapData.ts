"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getMyProfile, getSessionUser, getSettings } from "@/lib/auth";
import { isSchemaNotReadyError, resolveActiveGardenIdForUser, withGardenScope } from "@/lib/gardens";
import { getManyCatalogItems } from "@/lib/appConfig";
import type { MapPointItem } from "@/lib/homeMapTypes";
import {
  mapPlaceRowToRecord,
  mapRouteRowToRecord,
  mapZoneRowToRecord,
} from "@/lib/mapDomainTypes";
import {
  getFallbackSeedCalendarConfig,
  getSeedCalendarConfig,
} from "@/lib/seedCalendarConfig";
import {
  extractPageSnippet,
  getCatalogAssetPath,
  getCatalogTokenValue,
  hasPhotoInCanvas,
  isMissingLocationColumnsError,
  toErrorMessage,
} from "@/lib/homePageUtils";
import {
  DEFAULT_FLOWER_ICON,
  DEFAULT_FLOWER_ICON_BY_ELEMENT,
  DEFAULT_HOME_SCENE,
  DEFAULT_TREE_ICON,
  DEFAULT_TREE_ICON_BY_TIER,
  type HomeSceneTokens,
} from "@/lib/homeSceneDefaults";
import { mapGardenPlanTypeRow } from "@/lib/planTypeCatalog";
import { PROGRESSION_GRAPH_DB_KEY } from "@/lib/progressionGraph";
import {
  buildLegacyCompatibleProgressionRules,
  buildLegacyCompatibleProgressionUnlocks,
} from "@/lib/progressionRuntime";
import { syncProgressionUnlocks } from "@/lib/progressionUnlocks";
import { getFlowerFamilyFromLegacyElement } from "@/lib/productDomainContracts";
import { SEED_PLANNING_DRAFT_STATUS } from "@/lib/seedPreparationTypes";
import {
  DEFAULT_HOME_TRAIL_RUNTIME_CONFIG,
  resolveHomeTrailConfigFromSceneCatalog,
} from "@/lib/homeTrailCatalog";
import { loadGardenYearTreeStates } from "@/lib/annualTreeState";
import {
  indexPageVisualStatesByPageId,
  loadPageVisualStates,
} from "@/lib/pageVisualState";
import type {
  BloomPagePreview,
  HomeBootstrapData,
  HomePageRow,
  HomeProfile,
  HomeSettings,
  SeedStatusRow,
} from "@/lib/homeDataTypes";

type UseHomeBootstrapDataParams = {
  homeBootstrapReloadTick: number;
  onRequireLogin: () => void;
};

type MapPlaceRow = Record<string, unknown>;
type MapRouteRow = Record<string, unknown>;
type MapZoneRow = Record<string, unknown>;

const INITIAL_STATE: HomeBootstrapData = {
  profile: null,
  activeGardenId: null,
  settings: null,
  loading: true,
  hasGarden: false,
  fetchWarning: null,
  bloomedStatusCode: "bloomed",
  seedRows: [],
  unlocks: [],
  rulesById: {},
  pageRows: [],
  pageElementById: {},
  pagePlanVisualById: {},
  pageVisualStateById: {},
  bloomPagePreviewById: {},
  mapMemories: [],
  mapPlaces: [],
  mapRoutes: [],
  mapZones: [],
  flowerIconByElement: DEFAULT_FLOWER_ICON_BY_ELEMENT,
  treeIconByTier: DEFAULT_TREE_ICON_BY_TIER,
  defaultFlowerIcon: DEFAULT_FLOWER_ICON,
  defaultTreeIcon: DEFAULT_TREE_ICON,
  sceneTokens: DEFAULT_HOME_SCENE,
  homeTrailConfig: DEFAULT_HOME_TRAIL_RUNTIME_CONFIG,
  annualTreeStates: [],
};

function buildHomePagesQuery(input: { gardenId: string | null; includeLocationFields: boolean }) {
  const selectColumns = [
    "id",
    "element",
    "title",
    "date",
    "rating",
    "plan_type_id",
    "cover_photo_url",
    "thumbnail_url",
    "canvas_objects",
    "mood_state",
    ...(input.includeLocationFields ? ["location_lat", "location_lng"] : []),
    "location_label",
    "is_favorite",
    "planned_from_seed_id",
  ].join(",");

  return withGardenScope(
    supabase
      .from("pages")
      .select(selectColumns)
      .order("date", { ascending: true })
      .limit(500),
    input.gardenId,
  );
}

async function loadHomePages(gardenId: string | null) {
  const withLocationRes = await buildHomePagesQuery({
    gardenId,
    includeLocationFields: true,
  });
  if (!withLocationRes.error || !isMissingLocationColumnsError(withLocationRes.error.message)) {
    return withLocationRes;
  }

  return buildHomePagesQuery({
    gardenId,
    includeLocationFields: false,
  });
}

export function useHomeBootstrapData({
  homeBootstrapReloadTick,
  onRequireLogin,
}: UseHomeBootstrapDataParams) {
  const [state, setState] = useState<HomeBootstrapData>(INITIAL_STATE);

  const refreshProfile = useCallback(async () => {
    try {
      const user = await getSessionUser();
      if (!user) {
        onRequireLogin();
        return;
      }

      const profileRes = await getMyProfile(user.id);
      setState((prev) => ({
        ...prev,
        profile: profileRes as HomeProfile,
      }));
    } catch {
      // We keep the current home state if the lightweight refresh fails.
    }
  }, [onRequireLogin]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setState((prev) => ({
          ...prev,
          loading: prev.profile == null && prev.settings == null,
          fetchWarning: null,
        }));
        const user = await getSessionUser();
        if (!user) {
          onRequireLogin();
          return;
        }

        const fallbackCfg = getFallbackSeedCalendarConfig();
        const settingsPromise = getSettings();
        const seedConfigPromise = getSeedCalendarConfig();
        const progressionTreePromise = supabase
          .from("progression_tree_nodes")
          .select("*")
          .order("code", { ascending: true });
        const progressionGraphPromise = supabase
          .from("progression_graph_state")
          .select("tree_settings")
          .eq("key", PROGRESSION_GRAPH_DB_KEY)
          .maybeSingle();
        const visualCatalogsPromise = getManyCatalogItems([
          "home_flower_species",
          "home_tree_species",
          "home_scene_theme",
        ]);
        const profileRes = await getMyProfile(user.id);
        const resolvedGardenId = await resolveActiveGardenIdForUser({
          userId: profileRes.id,
          forceRefresh: true,
        }).catch(() => null);
        void syncProgressionUnlocks(resolvedGardenId).catch(() => null);

        const [
          settingsRes,
          seedCfgRes,
          seedListRes,
          allPagesRes,
          progressionUnlockRes,
          progressionTreeRes,
          progressionGraphRes,
          visualCatalogs,
          annualTreeStatesRes,
          pageVisualStatesRes,
          planTypesRes,
          mapPlacesRes,
          mapRoutesRes,
          mapZonesRes,
        ] = await Promise.all([
          settingsPromise,
          seedConfigPromise,
          withGardenScope(
            supabase
              .from("seeds")
              .select("id,title,element,status,scheduled_date,bloomed_page_id,created_at")
              .neq("status", SEED_PLANNING_DRAFT_STATUS)
              .order("created_at", { ascending: true })
              .limit(200),
            resolvedGardenId,
          ),
          loadHomePages(resolvedGardenId),
          withGardenScope(
            supabase
              .from("progression_tree_unlocks")
              .select("id,tree_id,unlocked_at,claimed_at")
              .order("unlocked_at", { ascending: true }),
            resolvedGardenId,
          ),
          progressionTreePromise,
          progressionGraphPromise,
          visualCatalogsPromise,
          loadGardenYearTreeStates(supabase, { gardenId: resolvedGardenId }),
          loadPageVisualStates(supabase, { gardenId: resolvedGardenId }),
          withGardenScope(
            supabase
              .from("garden_plan_types")
              .select(
                "id,code,label,category,description,flower_family,suggested_element,icon_emoji,flower_asset_path,seed_asset_path,flower_builder_config,is_custom,sort_order,archived_at",
              )
              .is("archived_at", null),
            resolvedGardenId,
          ),
          withGardenScope(
            supabase
              .from("map_places")
              .select("*")
              .is("archived_at", null)
              .order("created_at", { ascending: false })
              .limit(200),
            resolvedGardenId,
          ),
          withGardenScope(
            supabase
              .from("map_routes")
              .select("*")
              .is("archived_at", null)
              .order("created_at", { ascending: false })
              .limit(100),
            resolvedGardenId,
          ),
          withGardenScope(
            supabase
              .from("map_zones")
              .select("*")
              .eq("status", "active")
              .order("created_at", { ascending: false })
              .limit(50),
            resolvedGardenId,
          ),
        ]);

        if (cancelled) return;

        const next: HomeBootstrapData = {
          ...INITIAL_STATE,
          loading: false,
          hasGarden: resolvedGardenId != null,
          profile: profileRes as HomeProfile,
          activeGardenId: resolvedGardenId,
          settings: settingsRes as HomeSettings,
          bloomedStatusCode: (seedCfgRes ?? fallbackCfg).defaults.bloomedStatus,
          seedRows: (seedListRes.data as SeedStatusRow[] | null) ?? [],
          annualTreeStates: annualTreeStatesRes.states,
          fetchWarning: null,
        };

        if (annualTreeStatesRes.errorMessage && !annualTreeStatesRes.schemaMissing && !next.fetchWarning) {
          next.fetchWarning = `Aviso: ${annualTreeStatesRes.errorMessage}`;
        }
        if (pageVisualStatesRes.errorMessage && !pageVisualStatesRes.schemaMissing && !next.fetchWarning) {
          next.fetchWarning = `Aviso: ${pageVisualStatesRes.errorMessage}`;
        }

        next.pageVisualStateById = Object.fromEntries(
          indexPageVisualStatesByPageId(pageVisualStatesRes.states),
        );

        const planTypeById = new Map<string, ReturnType<typeof mapGardenPlanTypeRow>>();
        if (!planTypesRes.error) {
          for (const row of ((planTypesRes.data as Record<string, unknown>[] | null) ?? [])) {
            const mapped = mapGardenPlanTypeRow(row);
            planTypeById.set(mapped.id, mapped);
          }
        } else if (!next.fetchWarning) {
          next.fetchWarning =
            `Aviso: no se pudo cargar la biblioteca de tipos de plan (${planTypesRes.error.message}).`;
        }

        const allPageData = (allPagesRes.data as HomePageRow[] | null) ?? [];
        const pageData = allPageData.slice(0, 300);
        if (allPagesRes.error) {
          next.fetchWarning =
            `Aviso: no se pudieron cargar las páginas del sendero (${allPagesRes.error.message}).`;
        } else {
          next.pageRows = pageData;
          const pageElementById: Record<string, string> = {};
          const pagePlanVisualById: HomeBootstrapData["pagePlanVisualById"] = {};
          const previewById: Record<string, BloomPagePreview> = {};
          for (const row of pageData) {
            if (row.id && row.element) pageElementById[row.id] = row.element;
            if (!row.id) continue;
            const pageVisualState = next.pageVisualStateById[row.id] ?? null;
            const planType = row.plan_type_id ? planTypeById.get(row.plan_type_id) ?? null : null;
            pagePlanVisualById[row.id] = {
              category: pageVisualState?.planCategory ?? planType?.category ?? null,
              flowerFamily: pageVisualState?.planFlowerFamily ?? planType?.flowerFamily ?? null,
              flowerAssetPath:
                pageVisualState?.planFlowerAssetPath ?? planType?.flowerAssetPath ?? null,
              flowerBuilderConfig:
                pageVisualState?.planFlowerBuilderConfig ??
                planType?.flowerBuilderConfig ??
                null,
              suggestedElement:
                pageVisualState?.planSuggestedElement ?? planType?.suggestedElement ?? null,
            };
            const snippet = extractPageSnippet(row.canvas_objects);
            const hasText = Boolean(snippet);
            const hasPhoto = Boolean(
              row.cover_photo_url || row.thumbnail_url || hasPhotoInCanvas(row.canvas_objects),
            );
            const location = String(row.location_label ?? "").trim() || null;
            const hasMetadata = Boolean(location || (row.rating ?? 0) > 0 || row.mood_state);
            previewById[row.id] = {
              id: row.id,
              title: String(row.title ?? "").trim() || "Página sin título",
              date: String(row.date ?? "").slice(0, 10) || "",
              element: row.element ?? null,
              rating: row.rating ?? null,
              coverPhotoUrl: row.cover_photo_url ?? null,
              thumbnailUrl: row.thumbnail_url ?? null,
              snippet,
              location,
              mood: row.mood_state ?? null,
              isFavorite: Boolean(row.is_favorite),
              hasPhoto,
              hasText,
              hasMetadata,
            };
          }
          next.pageElementById = pageElementById;
          next.pagePlanVisualById = pagePlanVisualById;
          next.bloomPagePreviewById = previewById;
        }

        const parsed: MapPointItem[] = [];
        for (const row of allPageData) {
            const lat = Number(row.location_lat);
            const lng = Number(row.location_lng);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
            if (!row.id) continue;
            const planType = row.plan_type_id ? planTypeById.get(row.plan_type_id) ?? null : null;
            const legacyElement = String(row.element ?? "").trim() || null;
            parsed.push({
              id: row.id,
              sourceType: "memory",
              sourceId: row.id,
              title: String(row.title ?? "").trim() || "Página sin título",
              date: String(row.date ?? "").slice(0, 10) || "",
              element: legacyElement,
              flowerFamily: planType?.flowerFamily ?? getFlowerFamilyFromLegacyElement(legacyElement),
              planTypeLabel: planType?.label ?? null,
              rating: row.rating ?? null,
              lat,
              lng,
              href: `/page/${row.id}`,
              linkedPageId: row.id,
              linkedSeedId: null,
              locationLabel:
                String(row.location_label ?? "").trim() ||
                String(row.title ?? "").trim() ||
                "Recuerdo sin lugar",
              photoUrl: row.cover_photo_url ?? row.thumbnail_url ?? null,
              snippet: extractPageSnippet(row.canvas_objects),
              isFavorite: Boolean(row.is_favorite),
              placeKind: null,
              placeState: null,
              iconCode: null,
              colorToken: null,
              addressLabel: String(row.location_label ?? "").trim() || null,
              notes: null,
              tags: [],
            });
          }
        next.mapMemories = parsed;

        if (mapPlacesRes.error) {
          if (!isSchemaNotReadyError(mapPlacesRes.error) && !next.fetchWarning) {
            next.fetchWarning =
              `Aviso: no se pudieron cargar los lugares guardados del mapa (${mapPlacesRes.error.message}).`;
          }
          next.mapPlaces = [];
        } else {
          next.mapPlaces = ((mapPlacesRes.data as MapPlaceRow[] | null) ?? []).map((row) =>
            mapPlaceRowToRecord(row),
          );
        }

        if (mapRoutesRes.error) {
          if (!isSchemaNotReadyError(mapRoutesRes.error) && !next.fetchWarning) {
            next.fetchWarning =
              `Aviso: no se pudieron cargar las rutas guardadas del mapa (${mapRoutesRes.error.message}).`;
          }
          next.mapRoutes = [];
        } else {
          next.mapRoutes = ((mapRoutesRes.data as MapRouteRow[] | null) ?? []).map((row) =>
            mapRouteRowToRecord(row),
          );
        }

        if (mapZonesRes.error) {
          if (!isSchemaNotReadyError(mapZonesRes.error) && !next.fetchWarning) {
            next.fetchWarning =
              `Aviso: no se pudieron cargar las zonas simbolicas del mapa (${mapZonesRes.error.message}).`;
          }
          next.mapZones = [];
        } else {
          next.mapZones = ((mapZonesRes.data as MapZoneRow[] | null) ?? []).map((row) =>
            mapZoneRowToRecord(row),
          );
        }

        next.unlocks = progressionUnlockRes.error
          ? []
          : buildLegacyCompatibleProgressionUnlocks(
              ((progressionUnlockRes.data as Array<{
                id: string | null;
                tree_id: string;
                unlocked_at: string | null;
                claimed_at: string | null;
              }> | null) ?? []),
            );


        if (
          progressionUnlockRes.error &&
          !isSchemaNotReadyError(progressionUnlockRes.error) &&
          !next.fetchWarning
        ) {
          next.fetchWarning =
            `Aviso: no se pudieron cargar desbloqueos de progression (${progressionUnlockRes.error.message}).`;
        }

        const flowerCatalog = visualCatalogs.home_flower_species ?? [];
        const treeCatalog = visualCatalogs.home_tree_species ?? [];
        const sceneCatalog = visualCatalogs.home_scene_theme ?? [];
        next.homeTrailConfig = resolveHomeTrailConfigFromSceneCatalog(sceneCatalog);

        const nextFlowerMap: Record<string, string> = {
          ...DEFAULT_FLOWER_ICON_BY_ELEMENT,
        };
        let nextDefaultFlower = DEFAULT_FLOWER_ICON;
        for (const item of flowerCatalog) {
          const meta = item.metadata ?? {};
          const elementCode =
            typeof meta.element === "string" && meta.element.trim()
              ? String(meta.element).trim()
              : item.code;
          const iconPath = getCatalogAssetPath(item, DEFAULT_FLOWER_ICON);
          if (elementCode === "default") {
            nextDefaultFlower = iconPath;
            continue;
          }
          nextFlowerMap[elementCode] = iconPath;
        }
        next.flowerIconByElement = nextFlowerMap;
        next.defaultFlowerIcon = nextDefaultFlower;

        const nextTreeMap: Record<string, string> = {
          ...DEFAULT_TREE_ICON_BY_TIER,
        };
        let nextDefaultTree = DEFAULT_TREE_ICON;
        for (const item of treeCatalog) {
          const meta = item.metadata ?? {};
          const tierCode =
            typeof meta.tier === "string" && meta.tier.trim()
              ? String(meta.tier).trim()
              : item.code;
          const iconPath = getCatalogAssetPath(item, DEFAULT_TREE_ICON);
          if (tierCode === "default") {
            nextDefaultTree = iconPath;
            continue;
          }
          nextTreeMap[tierCode] = iconPath;
        }
        next.treeIconByTier = nextTreeMap;
        next.defaultTreeIcon = nextDefaultTree;

        const sceneTokens: HomeSceneTokens = { ...DEFAULT_HOME_SCENE };
        for (const item of sceneCatalog) {
          const code = item.code;
          if (!code) continue;
          if (code === "sky_top") sceneTokens.skyTop = getCatalogTokenValue(item, sceneTokens.skyTop);
          if (code === "sky_mid") sceneTokens.skyMid = getCatalogTokenValue(item, sceneTokens.skyMid);
          if (code === "sky_bottom") sceneTokens.skyBottom = getCatalogTokenValue(item, sceneTokens.skyBottom);
          if (code === "hill_left") sceneTokens.hillLeft = getCatalogTokenValue(item, sceneTokens.hillLeft);
          if (code === "hill_right") sceneTokens.hillRight = getCatalogTokenValue(item, sceneTokens.hillRight);
          if (code === "meadow") sceneTokens.meadow = getCatalogTokenValue(item, sceneTokens.meadow);
          if (code === "meadow_shadow") sceneTokens.meadowShadow = getCatalogTokenValue(item, sceneTokens.meadowShadow);
          if (code === "path_outer") sceneTokens.pathOuter = getCatalogTokenValue(item, sceneTokens.pathOuter);
          if (code === "path_inner") sceneTokens.pathInner = getCatalogTokenValue(item, sceneTokens.pathInner);
          if (code === "event_seed_bg") sceneTokens.eventSeedBg = getCatalogTokenValue(item, sceneTokens.eventSeedBg);
          if (code === "event_sprout_bg") sceneTokens.eventSproutBg = getCatalogTokenValue(item, sceneTokens.eventSproutBg);
          if (code === "event_flower_bg") sceneTokens.eventFlowerBg = getCatalogTokenValue(item, sceneTokens.eventFlowerBg);
          if (code === "event_tree_bg") sceneTokens.eventTreeBg = getCatalogTokenValue(item, sceneTokens.eventTreeBg);
          if (code === "landscape_asset") sceneTokens.landscapeAsset = getCatalogTokenValue(item, sceneTokens.landscapeAsset);
          if (code === "cloud_left_asset") sceneTokens.cloudLeftAsset = getCatalogTokenValue(item, sceneTokens.cloudLeftAsset);
          if (code === "cloud_right_asset") sceneTokens.cloudRightAsset = getCatalogTokenValue(item, sceneTokens.cloudRightAsset);
          if (code === "deco_flower_left_asset") sceneTokens.decoFlowerLeftAsset = getCatalogTokenValue(item, sceneTokens.decoFlowerLeftAsset);
          if (code === "deco_flower_center_asset") sceneTokens.decoFlowerCenterAsset = getCatalogTokenValue(item, sceneTokens.decoFlowerCenterAsset);
          if (code === "deco_flower_right_asset") sceneTokens.decoFlowerRightAsset = getCatalogTokenValue(item, sceneTokens.decoFlowerRightAsset);
          if (code === "seed_asset") sceneTokens.seedAsset = getCatalogTokenValue(item, sceneTokens.seedAsset);
          if (code === "sprout_asset") sceneTokens.sproutAsset = getCatalogTokenValue(item, sceneTokens.sproutAsset);
        }
        next.sceneTokens = sceneTokens;

        next.rulesById = progressionTreeRes.error
          ? {}
          : buildLegacyCompatibleProgressionRules({
              trees:
                ((progressionTreeRes.data as Array<{
                  id: string;
                  title: string;
                  enabled?: boolean | null;
                }> | null) ?? []),
              graphStateRow:
                ((progressionGraphRes.data as { tree_settings?: unknown } | null) ?? null),
            });
        if (
          progressionTreeRes.error &&
          !isSchemaNotReadyError(progressionTreeRes.error) &&
          !next.fetchWarning
        ) {
          next.fetchWarning =
            `Aviso: no se pudieron cargar los hitos de progression (${progressionTreeRes.error.message}).`;
        }

        if (cancelled) return;
        setState(next);
      } catch (error) {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          fetchWarning: `Aviso: ${toErrorMessage(error, "No se pudo cargar el jardín completo.")}`,
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [homeBootstrapReloadTick, onRequireLogin]);

  return {
    ...state,
    refreshProfile,
  };
}
