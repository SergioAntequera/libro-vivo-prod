import type { SupabaseClient } from "@supabase/supabase-js";
import { getFallbackMapRuntimeConfig } from "@/lib/mapCatalogConfig";

type SupabaseLikeClient = Pick<SupabaseClient, "from">;

async function getEnabledCatalogCodes(
  client: SupabaseLikeClient,
  catalogKey: "map_place_kinds" | "map_place_states",
  fallbackCodes: string[],
) {
  try {
    const { data, error } = await client
      .from("catalog_items")
      .select("code")
      .eq("catalog_key", catalogKey)
      .eq("enabled", true)
      .order("sort_order", { ascending: true })
      .order("code", { ascending: true });

    if (error) return new Set(fallbackCodes);
    const codes = ((data as Array<{ code?: string | null }> | null) ?? [])
      .map((row) => String(row.code ?? "").trim().toLowerCase())
      .filter(Boolean);
    return new Set(codes.length ? codes : fallbackCodes);
  } catch {
    return new Set(fallbackCodes);
  }
}

export async function getAllowedMapPlaceKinds(client: SupabaseLikeClient) {
  const fallback = getFallbackMapRuntimeConfig().placeKinds.map((item) => item.code);
  return getEnabledCatalogCodes(client, "map_place_kinds", fallback);
}

export async function getAllowedMapPlaceStates(client: SupabaseLikeClient) {
  const fallback = getFallbackMapRuntimeConfig().placeStates.map((item) => item.code);
  return getEnabledCatalogCodes(client, "map_place_states", fallback);
}
