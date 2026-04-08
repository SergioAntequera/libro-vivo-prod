import {
  getFallbackCatalogItems,
  getManyCatalogItems,
  type CatalogItemConfig,
} from "@/lib/appConfig";
import type { MapPlaceKind, MapPlaceState } from "@/lib/mapDomainTypes";

export const MAP_RUNTIME_LENS_IDS = [
  "explore",
  "lived",
  "saved",
  "routes",
  "symbolic",
  "favorites",
  "restaurants",
] as const;

export type MapRuntimeLensId = (typeof MAP_RUNTIME_LENS_IDS)[number];

export type MapPlaceKindCatalogItem = {
  code: string;
  label: string;
  icon: string;
  glyph: string;
  assetPath: string | null;
  color: string | null;
  description: string | null;
  enabled: boolean;
  sortOrder: number;
};

export type MapPlaceStateCatalogItem = {
  code: string;
  label: string;
  icon: string | null;
  color: string | null;
  description: string | null;
  enabled: boolean;
  sortOrder: number;
};

export type MapLensCatalogItem = {
  id: MapRuntimeLensId;
  label: string;
  icon: string;
  description: string;
  color: string | null;
  enabled: boolean;
  sortOrder: number;
  group: "primary" | "secondary";
};

export type MapRuntimeConfig = {
  placeKinds: MapPlaceKindCatalogItem[];
  placeStates: MapPlaceStateCatalogItem[];
  lenses: MapLensCatalogItem[];
};

const MAP_LENS_PRESENTATION: Record<
  MapRuntimeLensId,
  Pick<MapLensCatalogItem, "label" | "description" | "group">
> = {
  explore: {
    label: "Explorar",
    description: "Recuerdos vividos, lugares guardados, rutas y zonas en una sola vista.",
    group: "primary",
  },
  lived: {
    label: "Recuerdos",
    description: "Flores y recuerdos que ya tienen lugar propio dentro de vuestra historia.",
    group: "primary",
  },
  saved: {
    label: "Lugares",
    description: "Sitios guardados para volver, revisar, visitar o reutilizar sin crear una flor.",
    group: "primary",
  },
  routes: {
    label: "Rutas",
    description: "Paseos y recorridos que ya forman parte del mapa del jardín.",
    group: "primary",
  },
  symbolic: {
    label: "Zonas",
    description: "Áreas simbólicas, emocionales o rituales que viven como capas del jardín.",
    group: "primary",
  },
  favorites: {
    label: "Favoritos",
    description: "Lugares guardados que queréis cuidar como especialmente vuestros.",
    group: "secondary",
  },
  restaurants: {
    label: "Restaurantes",
    description: "Comida, cafés y cenas que merece la pena repetir.",
    group: "secondary",
  },
};

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function metadataText(item: CatalogItemConfig, key: string) {
  const value = item.metadata?.[key];
  return normalizeText(value) || null;
}

export function isMapCatalogAssetPath(value: string | null | undefined) {
  const text = normalizeText(value);
  if (!text) return false;
  return (
    text.startsWith("/") ||
    text.startsWith("./") ||
    text.startsWith("../") ||
    /^https?:\/\//i.test(text) ||
    /\.(svg|png|jpe?g|webp|avif)$/i.test(text)
  );
}

function parsePlaceKindItems(items: CatalogItemConfig[]): MapPlaceKindCatalogItem[] {
  return items
    .filter((item) => item.enabled)
    .map((item) => {
      const icon = normalizeText(item.icon);
      const assetPath = metadataText(item, "asset_path") || (isMapCatalogAssetPath(icon) ? icon : null);
      const glyph =
        metadataText(item, "glyph") ||
        (assetPath ? "" : icon) ||
        "\u273f";
      return {
        code: item.code,
        label: item.label,
        icon: icon || assetPath || glyph,
        glyph,
        assetPath,
        color: item.color,
        description: metadataText(item, "description"),
        enabled: item.enabled,
        sortOrder: item.sortOrder,
      };
    })
    .sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label));
}

function parsePlaceStateItems(items: CatalogItemConfig[]): MapPlaceStateCatalogItem[] {
  return items
    .filter((item) => item.enabled)
    .map((item) => ({
      code: item.code,
      label: item.label,
      icon: normalizeText(item.icon) || null,
      color: item.color,
      description: metadataText(item, "description"),
      enabled: item.enabled,
      sortOrder: item.sortOrder,
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label));
}

function parseLensItems(items: CatalogItemConfig[]): MapLensCatalogItem[] {
  const knownIds = new Set<string>(MAP_RUNTIME_LENS_IDS);
  const parsed = items
    .filter((item) => item.enabled && knownIds.has(item.code))
    .map((item) => {
      const id = item.code as MapRuntimeLensId;
      const presentation = MAP_LENS_PRESENTATION[id];
      return {
        id,
        label: presentation.label,
        icon: normalizeText(item.icon) || "\u2728",
        description: presentation.description,
        color: item.color,
        enabled: item.enabled,
        sortOrder: item.sortOrder,
        group: presentation.group,
      };
    })
    .sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label));

  const byId = new Map(parsed.map((item) => [item.id, item]));
  return MAP_RUNTIME_LENS_IDS.map((id) => byId.get(id)).filter(
    (item): item is MapLensCatalogItem => item !== undefined,
  );
}

export function getFallbackMapRuntimeConfig(): MapRuntimeConfig {
  return {
    placeKinds: parsePlaceKindItems(getFallbackCatalogItems("map_place_kinds")),
    placeStates: parsePlaceStateItems(getFallbackCatalogItems("map_place_states")),
    lenses: parseLensItems(getFallbackCatalogItems("map_lenses")),
  };
}

export async function getMapRuntimeConfig(): Promise<MapRuntimeConfig> {
  const fallback = getFallbackMapRuntimeConfig();
  const catalogs = await getManyCatalogItems([
    "map_place_kinds",
    "map_place_states",
    "map_lenses",
  ]);

  return {
    placeKinds: parsePlaceKindItems(catalogs.map_place_kinds ?? []).length
      ? parsePlaceKindItems(catalogs.map_place_kinds ?? [])
      : fallback.placeKinds,
    placeStates: parsePlaceStateItems(catalogs.map_place_states ?? []).length
      ? parsePlaceStateItems(catalogs.map_place_states ?? [])
      : fallback.placeStates,
    lenses: parseLensItems(catalogs.map_lenses ?? []).length
      ? parseLensItems(catalogs.map_lenses ?? [])
      : fallback.lenses,
  };
}

export function getMapPlaceKindCatalogItem(
  kind: MapPlaceKind | null | undefined,
  config: MapRuntimeConfig,
) {
  const code = normalizeText(kind);
  if (!code) return null;
  return config.placeKinds.find((item) => item.code === code) ?? null;
}

export function getMapPlaceStateCatalogItem(
  state: MapPlaceState | null | undefined,
  config: MapRuntimeConfig,
) {
  const code = normalizeText(state);
  if (!code) return null;
  return config.placeStates.find((item) => item.code === code) ?? null;
}

export function resolveMapPlaceKindLabel(
  kind: MapPlaceKind | null | undefined,
  config: MapRuntimeConfig,
) {
  return getMapPlaceKindCatalogItem(kind, config)?.label ?? "Lugar";
}

export function resolveMapPlaceKindGlyph(
  kind: MapPlaceKind | null | undefined,
  config: MapRuntimeConfig,
) {
  return getMapPlaceKindCatalogItem(kind, config)?.glyph ?? "\u273f";
}

export function resolveMapPlaceKindAssetPath(
  kind: MapPlaceKind | null | undefined,
  config: MapRuntimeConfig,
) {
  return getMapPlaceKindCatalogItem(kind, config)?.assetPath ?? null;
}

export function resolveMapPlaceStateLabel(
  state: MapPlaceState | null | undefined,
  config: MapRuntimeConfig,
) {
  return getMapPlaceStateCatalogItem(state, config)?.label ?? null;
}

export function resolveMapLensMeta(
  lensId: MapRuntimeLensId,
  config: MapRuntimeConfig,
) {
  return config.lenses.find((item) => item.id === lensId) ?? config.lenses[0];
}

export function getPrimaryMapLenses(config: MapRuntimeConfig) {
  return config.lenses.filter((item) => item.group === "primary");
}

export function getSecondaryMapLenses(config: MapRuntimeConfig) {
  return config.lenses.filter((item) => item.group === "secondary");
}
