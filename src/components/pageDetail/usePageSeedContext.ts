"use client";

import { useEffect, useState } from "react";
import { withGardenScope } from "@/lib/gardens";
import type { PageRow } from "@/lib/pageDetailTypes";
import {
  normalizePlanFlowerComposerConfig,
  type PlanFlowerComposerConfig,
} from "@/lib/planTypeFlowerComposer";
import { supabase } from "@/lib/supabase";

export type PageSeedContext = {
  seedTitle: string | null;
  planTypeId: string | null;
  planTypeLabel: string | null;
  planTypeCategory: string | null;
  planTypeFlowerFamily: string | null;
  planTypeFlowerAssetPath: string | null;
  planTypeFlowerBuilderConfig: PlanFlowerComposerConfig | null;
  planTypeSuggestedElement: string | null;
  linkedPlaceLabel: string | null;
  linkedPlaceKind: string | null;
  linkedRouteLabel: string | null;
};

type UsePageSeedContextParams = {
  activeGardenId: string | null;
  enabled?: boolean;
  page: PageRow | null;
};

function createEmptyPageSeedContext(): PageSeedContext {
  return {
    seedTitle: null,
    planTypeId: null,
    planTypeLabel: null,
    planTypeCategory: null,
    planTypeFlowerFamily: null,
    planTypeFlowerAssetPath: null,
    planTypeFlowerBuilderConfig: null,
    planTypeSuggestedElement: null,
    linkedPlaceLabel: null,
    linkedPlaceKind: null,
    linkedRouteLabel: null,
  };
}

export function usePageSeedContext({
  activeGardenId,
  enabled = true,
  page,
}: UsePageSeedContextParams) {
  const [seedContext, setSeedContext] = useState<PageSeedContext>(createEmptyPageSeedContext);
  const pageId = page?.id ?? null;
  const pagePlanTypeId = page?.plan_type_id ?? null;
  const plannedFromSeedId = page?.planned_from_seed_id ?? null;

  useEffect(() => {
    let active = true;

    void (async () => {
      if (!enabled || !pageId || !activeGardenId) {
        if (active) {
          setSeedContext(createEmptyPageSeedContext());
        }
        return;
      }

      const seedResponse = plannedFromSeedId
        ? await withGardenScope(
            supabase
              .from("seeds")
              .select("title,map_place_id,map_route_id")
              .eq("id", plannedFromSeedId)
              .maybeSingle(),
            activeGardenId,
          )
        : { data: null, error: null };

      const seedRow = seedResponse.data as
        | {
            title?: string | null;
            map_place_id?: string | null;
            map_route_id?: string | null;
          }
        | null;
      const seedError = seedResponse.error;

      if (!active) return;

      const placeId = String(seedRow?.map_place_id ?? "").trim();
      const routeId = String(seedRow?.map_route_id ?? "").trim();
      const planTypeId = String(pagePlanTypeId ?? "").trim();

      const [placeRes, routeRes, planTypeRes] = await Promise.all([
        placeId
          ? withGardenScope(
              supabase
                .from("map_places")
                .select("title,subtitle,kind,address_label")
                .eq("id", placeId)
                .maybeSingle(),
              activeGardenId,
            )
          : Promise.resolve({ data: null, error: null }),
        routeId
          ? withGardenScope(
              supabase
                .from("map_routes")
                .select("title,subtitle")
                .eq("id", routeId)
                .maybeSingle(),
              activeGardenId,
            )
          : Promise.resolve({ data: null, error: null }),
        planTypeId
          ? withGardenScope(
              supabase
                .from("garden_plan_types")
                .select(
                  "label,category,flower_family,flower_asset_path,flower_builder_config,suggested_element",
                )
                .eq("id", planTypeId)
                .maybeSingle(),
              activeGardenId,
            )
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (!active) return;

      const placeRow = placeRes.data as
        | {
            title?: string | null;
            subtitle?: string | null;
            kind?: string | null;
            address_label?: string | null;
          }
        | null;
      const routeRow = routeRes.data as
        | {
            title?: string | null;
            subtitle?: string | null;
          }
        | null;
      const planTypeRow = planTypeRes.data as
        | {
            label?: string | null;
            category?: string | null;
            flower_family?: string | null;
            flower_asset_path?: string | null;
            flower_builder_config?: unknown;
            suggested_element?: string | null;
          }
        | null;

      setSeedContext({
        seedTitle: seedError ? null : String(seedRow?.title ?? "").trim() || null,
        planTypeId: planTypeId || null,
        planTypeLabel: String(planTypeRow?.label ?? "").trim() || null,
        planTypeCategory: String(planTypeRow?.category ?? "").trim() || null,
        planTypeFlowerFamily: String(planTypeRow?.flower_family ?? "").trim() || null,
        planTypeFlowerAssetPath: String(planTypeRow?.flower_asset_path ?? "").trim() || null,
        planTypeFlowerBuilderConfig: normalizePlanFlowerComposerConfig(
          planTypeRow?.flower_builder_config ?? null,
        ),
        planTypeSuggestedElement: String(planTypeRow?.suggested_element ?? "").trim() || null,
        linkedPlaceLabel:
          String(placeRow?.title ?? "").trim() ||
          String(placeRow?.subtitle ?? "").trim() ||
          String(placeRow?.address_label ?? "").trim() ||
          null,
        linkedPlaceKind: String(placeRow?.kind ?? "").trim() || null,
        linkedRouteLabel:
          String(routeRow?.title ?? "").trim() || String(routeRow?.subtitle ?? "").trim() || null,
      });
    })();

    return () => {
      active = false;
    };
  }, [activeGardenId, enabled, pageId, pagePlanTypeId, plannedFromSeedId]);

  return {
    seedContext,
    setSeedContext,
  };
}
