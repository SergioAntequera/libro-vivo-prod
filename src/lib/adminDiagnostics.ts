import { formatTemplate } from "@/lib/appConfig";
import type { FlowerPageLayoutConfig, FlowerPageLayoutIssue } from "@/lib/flowerPageLayoutConfig";
import { validateFlowerPageLayoutConfig } from "@/lib/flowerPageLayoutConfig";
import type { SeedComposerLayoutConfig, SeedComposerLayoutIssue } from "@/lib/seedComposerLayoutConfig";
import { validateSeedComposerLayoutConfig } from "@/lib/seedComposerLayoutConfig";
import {
  getDefaultValidationRules,
  type DiagnosticsTone,
  type ValidationRuleDefinition,
  type ValidationRuleKind,
} from "@/lib/adminValidationRules";
import { ANNUAL_TREE_PHASES, type HomeTrailRuntimeConfig } from "@/lib/homeTrailCatalog";
import { resolveTrailGeometry } from "@/lib/homeTrailGeometry";
import type { SceneRegion } from "@/lib/homeSceneRegions";
import type {
  MapPlaceRecord,
  MapRouteRecord,
  MapZoneRecord,
} from "@/lib/mapDomainTypes";
import type {
  ProgressionConditionRow,
  ProgressionRewardRow,
  ProgressionTreeRow,
} from "@/lib/progressionDomain";
import {
  canLinkProgressionNodes,
  makeProgressionGraphNodeKey,
  normalizeProgressionGraphDraft,
  splitProgressionGraphNodeKey,
  type ProgressionGraphDraft,
} from "@/lib/progressionGraph";

export type { DiagnosticsTone } from "@/lib/adminValidationRules";

export type SeedsValidationIssue = SeedComposerLayoutIssue;

export type MapValidationTargetMode =
  | "preview"
  | "places"
  | "routes"
  | "visual"
  | "validation"
  | "advanced";

export type MapValidationIssue = {
  id: string;
  tone: DiagnosticsTone;
  title: string;
  detail: string;
  targetKind: "place" | "route" | "zone" | "system";
  targetId: string | null;
  targetMode: MapValidationTargetMode;
  focus: { lat: number; lng: number; zoom?: number } | null;
};

export type TrailEditorTab =
  | "canvas"
  | "path"
  | "view"
  | "summit"
  | "regions"
  | "demo"
  | "assets";

export type AssetWorkspaceTab = "base" | "flowers" | "trees" | "annual";

export type TrailValidationIssue = {
  id: string;
  tone: DiagnosticsTone;
  title: string;
  detail: string;
  targetTab: TrailEditorTab | null;
  targetAssetWorkspace?: AssetWorkspaceTab | null;
  targetRegionId?: string | null;
  openAdvanced?: boolean;
};

export type ProgressionValidationPanel = "tree" | "conditions" | "rewards";

export type ProgressionValidationIssue = {
  id: string;
  tone: DiagnosticsTone;
  title: string;
  detail: string;
  targetPanel: ProgressionValidationPanel | null;
  targetNodeKey?: string | null;
};

export const HOME_TRAIL_FLOWER_CODES = [
  "fire",
  "water",
  "air",
  "earth",
  "aether",
  "default",
] as const;

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function sortIssues<T extends { tone: DiagnosticsTone }>(issues: T[]) {
  const rank = { error: 0, warning: 1, info: 2 };
  return [...issues].sort((left, right) => rank[left.tone] - rank[right.tone]);
}

function findEnabledRule(
  rules: ValidationRuleDefinition[],
  kind: ValidationRuleKind,
) {
  return rules.find((rule) => rule.kind === kind && rule.enabled) ?? null;
}

function findEnabledRules(
  rules: ValidationRuleDefinition[],
  kind: ValidationRuleKind,
) {
  return rules.filter((rule) => rule.kind === kind && rule.enabled);
}

function ruleParam(
  rule: ValidationRuleDefinition | null,
  key: string,
  fallback: number,
) {
  const value = Number(rule?.params[key]);
  return Number.isFinite(value) ? value : fallback;
}

function ruleStringParam(
  rule: ValidationRuleDefinition | null,
  key: string,
  fallback = "",
) {
  const value = normalizeText(rule?.params[key]);
  return value || fallback;
}

function ruleStringListParam(
  rule: ValidationRuleDefinition | null,
  key: string,
) {
  const value = rule?.params[key];
  if (!Array.isArray(value)) return [] as string[];
  return value.map((entry) => normalizeText(entry)).filter(Boolean);
}

function ruleText(
  rule: ValidationRuleDefinition | null,
  fallback: string,
  vars?: Record<string, string | number>,
) {
  const template = normalizeText(rule?.description) || fallback;
  return vars ? formatTemplate(template, vars) : template;
}

function ruleTitle(
  rule: ValidationRuleDefinition | null,
  fallback: string,
  vars?: Record<string, string | number>,
) {
  const template = normalizeText(rule?.label) || fallback;
  return vars ? formatTemplate(template, vars) : template;
}

function geometryCoordinates(value: unknown): Array<[number, number]> {
  if (!value || typeof value !== "object") return [];
  const raw = value as { coordinates?: unknown };
  if (!Array.isArray(raw.coordinates)) return [];
  return raw.coordinates.filter((entry): entry is [number, number] => {
    return (
      Array.isArray(entry) &&
      entry.length >= 2 &&
      Number.isFinite(Number(entry[0])) &&
      Number.isFinite(Number(entry[1]))
    );
  });
}

function routeFocusTarget(route: MapRouteRecord) {
  if (
    route.originLat != null &&
    route.originLng != null &&
    Number.isFinite(route.originLat) &&
    Number.isFinite(route.originLng)
  ) {
    return { lat: route.originLat, lng: route.originLng, zoom: 12 };
  }
  if (
    route.destinationLat != null &&
    route.destinationLng != null &&
    Number.isFinite(route.destinationLat) &&
    Number.isFinite(route.destinationLng)
  ) {
    return { lat: route.destinationLat, lng: route.destinationLng, zoom: 12 };
  }
  const routeGeometry = geometryCoordinates(route.geometry);
  if (routeGeometry.length > 0) {
    const [lng, lat] = routeGeometry[0];
    return { lat, lng, zoom: 12 };
  }
  return null;
}

function zoneFocusTarget(zone: MapZoneRecord) {
  if (
    zone.centroidLat != null &&
    zone.centroidLng != null &&
    Number.isFinite(zone.centroidLat) &&
    Number.isFinite(zone.centroidLng)
  ) {
    return { lat: zone.centroidLat, lng: zone.centroidLng, zoom: 12 };
  }
  const coords = geometryCoordinates(zone.geojson);
  if (coords.length > 0) {
    const [lng, lat] = coords[0];
    return { lat, lng, zoom: 11 };
  }
  return null;
}

export function buildFlowerValidationIssues(args: {
  config: FlowerPageLayoutConfig;
  sampleLengths: { title: number; summary: number };
  rules?: ValidationRuleDefinition[];
}) {
  const rules = args.rules ?? getDefaultValidationRules("flowers");
  const base = validateFlowerPageLayoutConfig(args.config);
  const issues: FlowerPageLayoutIssue[] = [];
  const requiredRule = findEnabledRule(rules, "flower_required_blocks");
  const boundsRule = findEnabledRule(rules, "flower_bounds");
  const overlapRule = findEnabledRule(rules, "flower_overlap");
  const lowCharsRule = findEnabledRule(rules, "flower_low_max_chars");

  for (const issue of base) {
    const kind =
      issue.id.includes("-required-disabled")
        ? "flower_required_blocks"
        : issue.id.includes("-overlap-")
          ? "flower_overlap"
          : issue.id.includes("-chars-low")
            ? "flower_low_max_chars"
            : "flower_bounds";

    const rule =
      kind === "flower_required_blocks"
        ? requiredRule
        : kind === "flower_overlap"
          ? overlapRule
          : kind === "flower_low_max_chars"
            ? lowCharsRule
            : boundsRule;

    if (!rule) continue;
    issues.push({
      ...issue,
      tone: rule.tone,
      title: ruleTitle(rule, issue.title),
      detail: ruleText(rule, issue.detail),
    });
  }

  const sampleOverflowRule = findEnabledRule(rules, "flower_sample_overflow");
  if (sampleOverflowRule) {
    for (const block of args.config.blocks) {
      if (!block.enabled || block.maxChars == null || !block.sampleField) continue;
      const count = args.sampleLengths[block.sampleField];
      if (count <= block.maxChars) continue;
      issues.push({
        id: `${block.id}-sample-overflow`,
        tone: sampleOverflowRule.tone,
        title: ruleTitle(sampleOverflowRule, `${block.label} se queda corto en demo`, {
          blockLabel: block.label,
        }),
        detail: ruleText(
          sampleOverflowRule,
          "Ahora mismo usa {count}/{maxChars} caracteres.",
          {
            count,
            maxChars: block.maxChars,
            blockLabel: block.label,
          },
        ),
        blockId: block.id,
      });
    }
  }

  const minEnabledBlocksRule = findEnabledRule(rules, "flower_enabled_blocks_min_count");
  if (minEnabledBlocksRule) {
    const enabledCount = args.config.blocks.filter((block) => block.enabled).length;
    const minCount = Math.max(1, Math.round(ruleParam(minEnabledBlocksRule, "minCount", 8)));
    if (enabledCount < minCount) {
      issues.push({
        id: "flower-enabled-blocks-min-count",
        tone: minEnabledBlocksRule.tone,
        title: ruleTitle(minEnabledBlocksRule, "Pocos bloques activos"),
        detail: ruleText(
          minEnabledBlocksRule,
          "Solo hay {enabledCount} bloques activos y el mínimo configurado es {minCount}.",
          { enabledCount, minCount },
        ),
      });
    }
  }

  for (const rule of findEnabledRules(rules, "flower_required_specific_blocks")) {
    const blockIds = ruleStringListParam(rule, "blockIds");
    if (!blockIds.length) continue;
    const missingBlocks = blockIds.filter((blockId) => {
      const block = args.config.blocks.find((candidate) => candidate.id === blockId);
      return !block || !block.enabled;
    });
    if (!missingBlocks.length) continue;
    issues.push({
      id: `${rule.id}-specific-required-blocks`,
      tone: rule.tone,
      title: ruleTitle(rule, "Bloques concretos apagados"),
      detail: ruleText(
        rule,
        "Faltan bloques obligatorios activos: {blocks}.",
        { blocks: missingBlocks.join(", ") },
      ),
    });
  }

  for (const rule of findEnabledRules(rules, "flower_specific_blocks_min_chars_floor")) {
    const blockIds = ruleStringListParam(rule, "blockIds");
    const minCharsFloor = Math.max(1, Math.round(ruleParam(rule, "minCharsFloor", 40)));
    if (!blockIds.length) continue;
    const offenders = args.config.blocks.filter(
      (block) =>
        blockIds.includes(block.id) &&
        block.enabled &&
        block.maxChars != null &&
        block.maxChars < minCharsFloor,
    );
    if (!offenders.length) continue;
    issues.push({
      id: `${rule.id}-specific-min-chars-floor`,
      tone: rule.tone,
      title: ruleTitle(rule, "Bloques con límite demasiado corto"),
      detail: ruleText(
        rule,
        "Estos bloques estan por debajo del mínimo de {minCharsFloor}: {blocks}.",
        {
          minCharsFloor,
          blocks: offenders.map((block) => block.label).join(", "),
        },
      ),
      blockId: offenders[0]?.id,
    });
  }

  for (const rule of findEnabledRules(rules, "flower_specific_blocks_max_chars_ceiling")) {
    const blockIds = ruleStringListParam(rule, "blockIds");
    const maxCharsCeiling = Math.max(
      1,
      Math.round(ruleParam(rule, "maxCharsCeiling", 160)),
    );
    if (!blockIds.length) continue;
    const offenders = args.config.blocks.filter(
      (block) =>
        blockIds.includes(block.id) &&
        block.enabled &&
        block.maxChars != null &&
        block.maxChars > maxCharsCeiling,
    );
    if (!offenders.length) continue;
    issues.push({
      id: `${rule.id}-specific-max-chars-ceiling`,
      tone: rule.tone,
      title: ruleTitle(rule, "Bloques con límite demasiado amplio"),
      detail: ruleText(
        rule,
        "Estos bloques superan el techo configurado de {maxCharsCeiling}: {blocks}.",
        {
          maxCharsCeiling,
          blocks: offenders.map((block) => block.label).join(", "),
        },
      ),
      blockId: offenders[0]?.id,
    });
  }

  return sortIssues(issues);
}

export function buildSeedsValidationIssues(args: {
  config: SeedComposerLayoutConfig;
  rules?: ValidationRuleDefinition[];
}) {
  const rules = args.rules ?? getDefaultValidationRules("seeds");
  const base = validateSeedComposerLayoutConfig(args.config);
  const issues: SeedsValidationIssue[] = [];
  const requiredRule = findEnabledRule(rules, "seed_required_blocks");
  const boundsRule = findEnabledRule(rules, "seed_bounds");
  const overlapRule = findEnabledRule(rules, "seed_overlap");

  for (const issue of base) {
    const kind =
      issue.id.includes("-required-disabled")
        ? "seed_required_blocks"
        : issue.id.includes("-overlap-")
          ? "seed_overlap"
          : "seed_bounds";
    const rule =
      kind === "seed_required_blocks"
        ? requiredRule
        : kind === "seed_overlap"
          ? overlapRule
          : boundsRule;
    if (!rule) continue;
    issues.push({
      ...issue,
      tone: rule.tone,
      title: ruleTitle(rule, issue.title),
      detail: ruleText(rule, issue.detail),
    });
  }

  const minEnabledBlocksRule = findEnabledRule(rules, "seed_enabled_blocks_min_count");
  if (minEnabledBlocksRule) {
    const enabledCount = args.config.blocks.filter((block) => block.enabled).length;
    const minCount = Math.max(1, Math.round(ruleParam(minEnabledBlocksRule, "minCount", 7)));
    if (enabledCount < minCount) {
      issues.push({
        id: "seed-enabled-blocks-min-count",
        tone: minEnabledBlocksRule.tone,
        title: ruleTitle(minEnabledBlocksRule, "Pocos bloques activos"),
        detail: ruleText(
          minEnabledBlocksRule,
          "Solo hay {enabledCount} bloques activos y el mínimo configurado es {minCount}.",
          { enabledCount, minCount },
        ),
      });
    }
  }

  for (const rule of findEnabledRules(rules, "seed_required_specific_blocks")) {
    const blockIds = ruleStringListParam(rule, "blockIds");
    if (!blockIds.length) continue;
    const missingBlocks = blockIds.filter((blockId) => {
      const block = args.config.blocks.find((candidate) => candidate.id === blockId);
      return !block || !block.enabled;
    });
    if (!missingBlocks.length) continue;
    issues.push({
      id: `${rule.id}-specific-required-blocks`,
      tone: rule.tone,
      title: ruleTitle(rule, "Bloques concretos apagados"),
      detail: ruleText(
        rule,
        "Faltan estos bloques: {missingBlocks}.",
        { missingBlocks: missingBlocks.join(", ") },
      ),
      blockId:
        args.config.blocks.find((candidate) => candidate.id === missingBlocks[0])?.id ?? undefined,
    });
  }

  return sortIssues(issues);
}

export function buildMapValidationIssues(
  args: {
    places: MapPlaceRecord[];
    routes: MapRouteRecord[];
    zones: MapZoneRecord[];
  },
  rules = getDefaultValidationRules("map"),
) {
  const issues: MapValidationIssue[] = [];
  const placeVisibleRule = findEnabledRule(rules, "map_place_visible_context");
  const placeCustomIconRule = findEnabledRule(rules, "map_custom_place_icon");
  const placeNarrativeRule = findEnabledRule(rules, "map_place_narrative_context");
  const routeGeometryRule = findEnabledRule(rules, "map_route_geometry");
  const routeLabelsRule = findEnabledRule(rules, "map_route_labels");
  const routeColorRule = findEnabledRule(rules, "map_route_color");
  const zoneGeometryRule = findEnabledRule(rules, "map_zone_geometry");
  const zoneCentroidRule = findEnabledRule(rules, "map_zone_centroid");
  const semanticsRule = findEnabledRule(rules, "map_system_semantics");
  const minPlacesRule = findEnabledRule(rules, "map_places_min_count");
  const minRoutesRule = findEnabledRule(rules, "map_routes_min_count");
  const minZonesRule = findEnabledRule(rules, "map_zones_min_count");

  if (minPlacesRule) {
    const minCount = Math.max(0, Math.round(ruleParam(minPlacesRule, "minCount", 1)));
    if (args.places.length < minCount) {
      issues.push({
        id: "map-places-min-count",
        tone: minPlacesRule.tone,
        title: ruleTitle(minPlacesRule, "Pocos lugares visibles"),
        detail: ruleText(
          minPlacesRule,
          "El mapa solo tiene {count} lugar(es) y el mínimo configurado es {minCount}.",
          { count: args.places.length, minCount },
        ),
        targetKind: "system",
        targetId: null,
        targetMode: "places",
        focus: null,
      });
    }
  }

  if (minRoutesRule) {
    const minCount = Math.max(0, Math.round(ruleParam(minRoutesRule, "minCount", 1)));
    if (args.routes.length < minCount) {
      issues.push({
        id: "map-routes-min-count",
        tone: minRoutesRule.tone,
        title: ruleTitle(minRoutesRule, "Pocas rutas visibles"),
        detail: ruleText(
          minRoutesRule,
          "El mapa solo tiene {count} ruta(s) y el mínimo configurado es {minCount}.",
          { count: args.routes.length, minCount },
        ),
        targetKind: "system",
        targetId: null,
        targetMode: "routes",
        focus: null,
      });
    }
  }

  if (minZonesRule) {
    const minCount = Math.max(0, Math.round(ruleParam(minZonesRule, "minCount", 1)));
    if (args.zones.length < minCount) {
      issues.push({
        id: "map-zones-min-count",
        tone: minZonesRule.tone,
        title: ruleTitle(minZonesRule, "Pocas zonas visibles"),
        detail: ruleText(
          minZonesRule,
          "El mapa solo tiene {count} zona(s) y el mínimo configurado es {minCount}.",
          { count: args.zones.length, minCount },
        ),
        targetKind: "system",
        targetId: null,
        targetMode: "advanced",
        focus: null,
      });
    }
  }

  for (const rule of findEnabledRules(rules, "map_required_place_kind_count")) {
    const kindCode = ruleStringParam(rule, "kindCode");
    const minCount = Math.max(0, Math.round(ruleParam(rule, "minCount", 1)));
    if (!kindCode) continue;
    const count = args.places.filter((place) => place.kind === kindCode).length;
    if (count >= minCount) continue;
    issues.push({
      id: `${rule.id}-place-kind-count`,
      tone: rule.tone,
      title: ruleTitle(rule, "Tipo de lugar por debajo del mínimo"),
      detail: ruleText(
        rule,
        "El tipo `{kindCode}` solo tiene {count} lugar(es) y el mínimo configurado es {minCount}.",
        { kindCode, count, minCount },
      ),
      targetKind: "system",
      targetId: null,
      targetMode: "places",
      focus: null,
    });
  }

  for (const rule of findEnabledRules(rules, "map_required_route_kind_count")) {
    const kindCode = ruleStringParam(rule, "kindCode");
    const minCount = Math.max(0, Math.round(ruleParam(rule, "minCount", 1)));
    if (!kindCode) continue;
    const count = args.routes.filter((route) => route.kind === kindCode).length;
    if (count >= minCount) continue;
    issues.push({
      id: `${rule.id}-route-kind-count`,
      tone: rule.tone,
      title: ruleTitle(rule, "Tipo de ruta por debajo del mínimo"),
      detail: ruleText(
        rule,
        "El tipo de ruta `{kindCode}` solo tiene {count} elemento(s) y el mínimo configurado es {minCount}.",
        { kindCode, count, minCount },
      ),
      targetKind: "system",
      targetId: null,
      targetMode: "routes",
      focus: null,
    });
  }

  for (const rule of findEnabledRules(rules, "map_required_zone_kind_count")) {
    const kindCode = ruleStringParam(rule, "kindCode");
    const minCount = Math.max(0, Math.round(ruleParam(rule, "minCount", 1)));
    if (!kindCode) continue;
    const count = args.zones.filter((zone) => zone.kind === kindCode).length;
    if (count >= minCount) continue;
    issues.push({
      id: `${rule.id}-zone-kind-count`,
      tone: rule.tone,
      title: ruleTitle(rule, "Tipo de zona por debajo del mínimo"),
      detail: ruleText(
        rule,
        "El tipo de zona `{kindCode}` solo tiene {count} elemento(s) y el mínimo configurado es {minCount}.",
        { kindCode, count, minCount },
      ),
      targetKind: "system",
      targetId: null,
      targetMode: "advanced",
      focus: null,
    });
  }

  for (const place of args.places) {
    if (placeVisibleRule && !normalizeText(place.subtitle) && !normalizeText(place.addressLabel)) {
      issues.push({
        id: `place-subtitle-${place.id}`,
        tone: placeVisibleRule.tone,
        title: ruleTitle(placeVisibleRule, "Lugar sin subtítulo visible", {
          title: place.title,
        }),
        detail: ruleText(
          placeVisibleRule,
          "{title} no muestra dirección ni subtítulo claro en popup o bandeja.",
          { title: place.title },
        ),
        targetKind: "place",
        targetId: place.id,
        targetMode: "places",
        focus: { lat: place.lat, lng: place.lng, zoom: 13 },
      });
    }
    if (placeCustomIconRule && place.kind === "custom" && !normalizeText(place.iconCode)) {
      issues.push({
        id: `place-custom-icon-${place.id}`,
        tone: placeCustomIconRule.tone,
        title: ruleTitle(placeCustomIconRule, "Lugar especial sin icono propio", {
          title: place.title,
        }),
        detail: ruleText(
          placeCustomIconRule,
          "{title} usa tipo custom pero todavía no tiene icono o glifo propio.",
          { title: place.title },
        ),
        targetKind: "place",
        targetId: place.id,
        targetMode: "visual",
        focus: { lat: place.lat, lng: place.lng, zoom: 13 },
      });
    }
    if (
      placeNarrativeRule &&
      !normalizeText(place.notes) &&
      !place.links.pageId &&
      !place.links.seedId
    ) {
      issues.push({
        id: `place-context-${place.id}`,
        tone: placeNarrativeRule.tone,
        title: ruleTitle(placeNarrativeRule, "Lugar sin contexto narrativo", {
          title: place.title,
        }),
        detail: ruleText(
          placeNarrativeRule,
          "{title} no tiene notas ni enlace a flor o semilla.",
          { title: place.title },
        ),
        targetKind: "place",
        targetId: place.id,
        targetMode: "advanced",
        focus: { lat: place.lat, lng: place.lng, zoom: 13 },
      });
    }
  }

  for (const route of args.routes) {
    const routeGeometry = geometryCoordinates(route.geometry);
    if (routeGeometryRule && routeGeometry.length < 2) {
      issues.push({
        id: `route-geometry-${route.id}`,
        tone: routeGeometryRule.tone,
        title: ruleTitle(routeGeometryRule, "Ruta sin trazado válido", {
          title: route.title,
        }),
        detail: ruleText(
          routeGeometryRule,
          "{title} no tiene suficiente geometria para mostrarse de forma fiable.",
          { title: route.title },
        ),
        targetKind: "route",
        targetId: route.id,
        targetMode: "routes",
        focus: routeFocusTarget(route),
      });
    }
    if (
      routeLabelsRule &&
      (!normalizeText(route.originLabel) || !normalizeText(route.destinationLabel))
    ) {
      issues.push({
        id: `route-labels-${route.id}`,
        tone: routeLabelsRule.tone,
        title: ruleTitle(routeLabelsRule, "Ruta sin origen o destino claro", {
          title: route.title,
        }),
        detail: ruleText(
          routeLabelsRule,
          "{title} necesita etiquetas de origen y destino para leerse bien en el sistema.",
          { title: route.title },
        ),
        targetKind: "route",
        targetId: route.id,
        targetMode: "routes",
        focus: routeFocusTarget(route),
      });
    }
    if (routeColorRule && !route.colorToken) {
      issues.push({
        id: `route-color-${route.id}`,
        tone: routeColorRule.tone,
        title: ruleTitle(routeColorRule, "Ruta sin color propio", {
          title: route.title,
        }),
        detail: ruleText(
          routeColorRule,
          "{title} depende del color por defecto y no destaca en el mapa.",
          { title: route.title },
        ),
        targetKind: "route",
        targetId: route.id,
        targetMode: "visual",
        focus: routeFocusTarget(route),
      });
    }
  }

  for (const zone of args.zones) {
    const coords = geometryCoordinates(zone.geojson);
    if (zoneGeometryRule && !coords.length) {
      issues.push({
        id: `zone-geometry-${zone.id}`,
        tone: zoneGeometryRule.tone,
        title: ruleTitle(zoneGeometryRule, "Zona sin geojson útil", {
          title: zone.title,
        }),
        detail: ruleText(
          zoneGeometryRule,
          "{title} existe, pero no tiene una geometria que pueda leerse en el mapa.",
          { title: zone.title },
        ),
        targetKind: "zone",
        targetId: zone.id,
        targetMode: "advanced",
        focus: zoneFocusTarget(zone),
      });
    }
    if (zoneCentroidRule && (zone.centroidLat == null || zone.centroidLng == null)) {
      issues.push({
        id: `zone-centroid-${zone.id}`,
        tone: zoneCentroidRule.tone,
        title: ruleTitle(zoneCentroidRule, "Zona sin centro visible", {
          title: zone.title,
        }),
        detail: ruleText(
          zoneCentroidRule,
          "{title} no tiene centro calculado para foco o resumen.",
          { title: zone.title },
        ),
        targetKind: "zone",
        targetId: zone.id,
        targetMode: "advanced",
        focus: zoneFocusTarget(zone),
      });
    }
  }

  if (semanticsRule) {
    issues.push({
      id: "system-visual-config",
      tone: semanticsRule.tone,
      title: ruleTitle(semanticsRule, "Semantica global ya catalogada"),
      detail: ruleText(
        semanticsRule,
        "Tipos, estados y lentes del mapa deben gobernarse desde catálogos. Si algo sigue viendose raro en preview, ya no es un problema de formulario sino de semantica o de datos.",
      ),
      targetKind: "system",
      targetId: null,
      targetMode: "visual",
      focus: null,
    });
  }

  return sortIssues(issues);
}

export function summitPreviewTreeAsset(
  annualTreeAssets: Record<(typeof ANNUAL_TREE_PHASES)[number], string | null>,
) {
  return (
    annualTreeAssets.germination?.trim() ||
    annualTreeAssets.seed?.trim() ||
    annualTreeAssets.sprout?.trim() ||
    annualTreeAssets.sapling?.trim() ||
    annualTreeAssets.young?.trim() ||
    annualTreeAssets.mature?.trim() ||
    annualTreeAssets.blooming?.trim() ||
    annualTreeAssets.legacy?.trim() ||
    null
  );
}

function hasCompleteRegionShape(region: SceneRegion, minPoints: number) {
  return region.points.length >= minPoints;
}

export function buildHomeTrailValidationIssues(
  args: {
    config: HomeTrailRuntimeConfig;
    seedAsset: string;
    sproutAsset: string;
    flowerAssetMap: Record<string, string>;
    canonicalTreeCount: number;
    publicAssets: string[];
  },
  rules = getDefaultValidationRules("trail"),
) {
  const { config } = args;
  const geometry = resolveTrailGeometry(config);
  const issues: TrailValidationIssue[] = [];
  const minAnchors = Math.max(2, Math.round(ruleParam(findEnabledRule(rules, "trail_path_geometry"), "minAnchors", 2)));
  const minRegionPoints = Math.max(3, Math.round(ruleParam(findEnabledRule(rules, "trail_region_shape"), "minPoints", 3)));

  const backgroundRule = findEnabledRule(rules, "trail_background");
  if (backgroundRule && !(config.sourceAsset?.trim() ?? "")) {
    issues.push({
      id: "canvas-background-missing",
      tone: backgroundRule.tone,
      title: ruleTitle(backgroundRule, "Falta imagen base del sendero"),
      detail: ruleText(
        backgroundRule,
        "El lienzo no tiene fondo principal. La escena puede quedar demasiado abstracta para validar la colina real.",
      ),
      targetTab: "canvas",
    });
  }

  const pathRule = findEnabledRule(rules, "trail_path_geometry");
  if (pathRule && (geometry.anchors.length < minAnchors || geometry.segments.length === 0)) {
    issues.push({
      id: "path-geometry-invalid",
      tone: pathRule.tone,
      title: ruleTitle(pathRule, "Recorrido sin trazado útil"),
      detail: ruleText(
        pathRule,
        "El sendero necesita al menos un tramo visible para que Home pueda leer la progresion anual.",
      ),
      targetTab: "path",
    });
  }

  const widthRule = findEnabledRule(rules, "trail_runtime_width_order");
  if (
    widthRule &&
    (config.displayDesktopWidth < config.displayTabletWidth ||
      config.displayTabletWidth < config.displayMobileWidth)
  ) {
    issues.push({
      id: "view-runtime-width-order",
      tone: widthRule.tone,
      title: ruleTitle(widthRule, "Anchos runtime fuera de orden"),
      detail: ruleText(
        widthRule,
        "Desktop, tablet y mobile deben ir de mayor a menor para que la escena responda de forma coherente.",
      ),
      targetTab: "view",
      openAdvanced: true,
    });
  }

  const solidRule = findEnabledRule(rules, "trail_solid_background");
  if (solidRule && config.sceneBackgroundMode === "solid" && !config.sceneBackgroundSolid.trim()) {
    issues.push({
      id: "view-solid-background-empty",
      tone: solidRule.tone,
      title: ruleTitle(solidRule, "Color solido vacío"),
      detail: ruleText(
        solidRule,
        "La vista esta en modo color solido, pero el valor del color esta vacío. Conviene fijarlo o volver al gradiente estacional.",
      ),
      targetTab: "view",
    });
  }

  const summitLabelRule = findEnabledRule(rules, "trail_summit_label");
  if (summitLabelRule && !config.summitLabelText.trim()) {
    issues.push({
      id: "summit-label-empty",
      tone: summitLabelRule.tone,
      title: ruleTitle(summitLabelRule, "La cima no tiene texto visible"),
      detail: ruleText(
        summitLabelRule,
        "La etiqueta superior se queda muda. Conviene mantener un texto corto para que el hito anual siga leyendose.",
      ),
      targetTab: "summit",
    });
  }

  const annualTreeRule = findEnabledRule(rules, "trail_annual_tree_assets");
  if (annualTreeRule && !summitPreviewTreeAsset(config.annualTreeAssets)) {
    issues.push({
      id: "annual-tree-assets-missing",
      tone: annualTreeRule.tone,
      title: ruleTitle(annualTreeRule, "Faltan assets del árbol anual"),
      detail: ruleText(
        annualTreeRule,
        "La cima no tiene un asset anual visible. Revisa las fases del árbol antes de publicar.",
      ),
      targetTab: "assets",
      targetAssetWorkspace: "annual",
    });
  }

  const regionsRule = findEnabledRule(rules, "trail_regions_exist");
  if (regionsRule && config.regions.length === 0) {
    issues.push({
      id: "regions-empty",
      tone: regionsRule.tone,
      title: ruleTitle(regionsRule, "No hay regiones semanticas"),
      detail: ruleText(
        regionsRule,
        "Sin regiones activas, hitos, flores y capas narrativas pierden una guia espacial clara dentro de la colina.",
      ),
      targetTab: "regions",
    });
  }

  const minRegionsRule = findEnabledRule(rules, "trail_regions_min_count");
  if (minRegionsRule) {
    const minCount = Math.max(0, Math.round(ruleParam(minRegionsRule, "minCount", 3)));
    if (config.regions.length < minCount) {
      issues.push({
        id: "regions-min-count",
        tone: minRegionsRule.tone,
        title: ruleTitle(minRegionsRule, "Pocas regiones activas"),
        detail: ruleText(
          minRegionsRule,
          "Solo hay {count} regiones y el mínimo configurado es {minCount}.",
          { count: config.regions.length, minCount },
        ),
        targetTab: "regions",
      });
    }
  }

  for (const rule of findEnabledRules(rules, "trail_region_kind_min_count")) {
    const kindCode = ruleStringParam(rule, "kindCode");
    const minCount = Math.max(0, Math.round(ruleParam(rule, "minCount", 1)));
    if (!kindCode) continue;
    const count = config.regions.filter(
      (region) => region.enabled && region.kind === kindCode,
    ).length;
    if (count >= minCount) continue;
    issues.push({
      id: `${rule.id}-region-kind-count`,
      tone: rule.tone,
      title: ruleTitle(rule, "Tipo de región por debajo del mínimo"),
      detail: ruleText(
        rule,
        "Solo hay {count} región(es) activas del tipo `{kindCode}` y el mínimo configurado es {minCount}.",
        { kindCode, count, minCount },
      ),
      targetTab: "regions",
    });
  }

  const regionShapeRule = findEnabledRule(rules, "trail_region_shape");
  if (regionShapeRule) {
    for (const region of config.regions) {
      if (hasCompleteRegionShape(region, minRegionPoints)) continue;
      issues.push({
        id: `region-shape-${region.id}`,
        tone: region.points.length === 0 && regionShapeRule.tone === "error" ? "warning" : regionShapeRule.tone,
        title: ruleTitle(regionShapeRule, `Región incompleta: ${region.name || "sin nombre"}`, {
          regionName: region.name || "sin nombre",
          points: region.points.length,
          minPoints: minRegionPoints,
        }),
        detail: ruleText(
          regionShapeRule,
          region.points.length === 0
            ? "La región existe, pero todavía no tiene polígono dibujado."
            : "La región solo tiene {points} vértices y todavía no define un área útil.",
          {
            regionName: region.name || "sin nombre",
            points: region.points.length,
            minPoints: minRegionPoints,
          },
        ),
        targetTab: "regions",
        targetRegionId: region.id,
      });
    }
  }

  const baseAssetsRule = findEnabledRule(rules, "trail_base_assets");
  const missingBaseAssets = [
    !args.seedAsset.trim() ? "semilla" : null,
    !args.sproutAsset.trim() ? "brote" : null,
  ].filter((value): value is string => Boolean(value));
  if (baseAssetsRule && missingBaseAssets.length > 0) {
    issues.push({
      id: "assets-base-missing",
      tone: baseAssetsRule.tone,
      title: ruleTitle(baseAssetsRule, "Faltan assets base del sendero"),
      detail: ruleText(
        baseAssetsRule,
        "Siguen sin asset visible: {assets}.",
        { assets: missingBaseAssets.join(", ") },
      ),
      targetTab: "assets",
      targetAssetWorkspace: "base",
    });
  }

  const flowerLibraryRule = findEnabledRule(rules, "trail_flower_library");
  const missingFlowerCodes = HOME_TRAIL_FLOWER_CODES.filter(
    (code) => !args.flowerAssetMap[code]?.trim(),
  );
  if (flowerLibraryRule && missingFlowerCodes.length > 0) {
    issues.push({
      id: "assets-flowers-missing",
      tone: flowerLibraryRule.tone,
      title: ruleTitle(flowerLibraryRule, "Biblioteca de flores incompleta"),
      detail: ruleText(
        flowerLibraryRule,
        "Faltan {count} asset(s) de flor: {codes}.",
        {
          count: missingFlowerCodes.length,
          codes: `${missingFlowerCodes.slice(0, 3).join(", ")}${missingFlowerCodes.length > 3 ? "..." : ""}`,
        },
      ),
      targetTab: "assets",
      targetAssetWorkspace: "flowers",
    });
  }

  const treeLibraryRule = findEnabledRule(rules, "trail_tree_library");
  if (treeLibraryRule && args.canonicalTreeCount <= 0) {
    issues.push({
      id: "progression-trees-missing",
      tone: treeLibraryRule.tone,
      title: ruleTitle(treeLibraryRule, "Faltan árboles canónicos de hitos"),
      detail: ruleText(
        treeLibraryRule,
        "Trail-editor ya no usa una biblioteca propia de árboles. Necesitas al menos un árbol activo en progression para previsualizar hitos aquí.",
      ),
      targetTab: "demo",
    });
  }

  const annualPhasesRule = findEnabledRule(rules, "trail_annual_phases");
  const missingAnnualPhases = ANNUAL_TREE_PHASES.filter(
    (phase) => !config.annualTreeAssets[phase]?.trim(),
  );
  if (annualPhasesRule && missingAnnualPhases.length > 0) {
    issues.push({
      id: "assets-annual-phases-missing",
      tone: annualPhasesRule.tone,
      title: ruleTitle(annualPhasesRule, "Fases del árbol anual sin cubrir"),
      detail: ruleText(
        annualPhasesRule,
        "Faltan {count} fase(s): {phases}.",
        {
          count: missingAnnualPhases.length,
          phases: `${missingAnnualPhases.slice(0, 3).join(", ")}${missingAnnualPhases.length > 3 ? "..." : ""}`,
        },
      ),
      targetTab: "assets",
      targetAssetWorkspace: "annual",
    });
  }

  const publicAssetsRule = findEnabledRule(rules, "trail_public_assets");
  const minPublicAssets = Math.max(0, Math.round(ruleParam(publicAssetsRule, "minCount", 1)));
  if (publicAssetsRule && args.publicAssets.length < minPublicAssets) {
    issues.push({
      id: "assets-library-empty",
      tone: publicAssetsRule.tone,
      title: ruleTitle(publicAssetsRule, "Biblioteca pública vacía"),
      detail: ruleText(
        publicAssetsRule,
        "La biblioteca pública solo tiene {count} asset(s) y el mínimo configurado es {minCount}.",
        { count: args.publicAssets.length, minCount: minPublicAssets },
      ),
      targetTab: "assets",
    });
  }

  for (const rule of findEnabledRules(rules, "trail_required_flower_codes_specific")) {
    const codes = ruleStringListParam(rule, "codes");
    if (!codes.length) continue;
    const missingCodes = codes.filter((code) => !args.flowerAssetMap[code]?.trim());
    if (!missingCodes.length) continue;
    issues.push({
      id: `${rule.id}-required-flower-codes`,
      tone: rule.tone,
      title: ruleTitle(rule, "Flores concretas sin asset"),
      detail: ruleText(
        rule,
        "Faltan assets para estas flores concretas: {codes}.",
        { codes: missingCodes.join(", ") },
      ),
      targetTab: "assets",
      targetAssetWorkspace: "flowers",
    });
  }

  for (const rule of findEnabledRules(rules, "trail_required_annual_phases_specific")) {
    const phases = ruleStringListParam(rule, "phases");
    if (!phases.length) continue;
    const missingPhases = phases.filter((phase) => !config.annualTreeAssets[phase as keyof typeof config.annualTreeAssets]?.trim());
    if (!missingPhases.length) continue;
    issues.push({
      id: `${rule.id}-required-annual-phases`,
      tone: rule.tone,
      title: ruleTitle(rule, "Fases concretas sin asset"),
      detail: ruleText(
        rule,
        "Faltan assets para estas fases concretas: {phases}.",
        { phases: missingPhases.join(", ") },
      ),
      targetTab: "assets",
      targetAssetWorkspace: "annual",
    });
  }

  for (const rule of findEnabledRules(rules, "trail_named_regions_min_count")) {
    const minCount = Math.max(1, Math.round(ruleParam(rule, "minCount", 1)));
    const namedRegions = config.regions.filter((region) => normalizeText(region.name)).length;
    if (namedRegions >= minCount) continue;
    issues.push({
      id: `${rule.id}-named-regions-min-count`,
      tone: rule.tone,
      title: ruleTitle(rule, "Pocas regiones con nombre"),
      detail: ruleText(
        rule,
        "Solo hay {count} regiones con nombre y el mínimo configurado es {minCount}.",
        { count: namedRegions, minCount },
      ),
      targetTab: "regions",
    });
  }

  return sortIssues(issues);
}

function rewardNeedsReference(
  reward: ProgressionRewardRow,
  requiredKinds: string[],
) {
  if (!requiredKinds.includes(normalizeText(reward.kind))) return false;
  if (normalizeText(reward.reference_key)) return false;
  if (
    reward.payload &&
    typeof reward.payload === "object" &&
    Object.keys(reward.payload).length > 0
  ) {
    return false;
  }
  return true;
}

function rewardNeedsItems(
  reward: ProgressionRewardRow,
  requiredKinds: string[],
) {
  if (!requiredKinds.includes(normalizeText(reward.kind))) return false;
  if (!reward.payload || typeof reward.payload !== "object") return true;
  const payload = reward.payload as Record<string, unknown>;
  const stickers = Array.isArray(payload.stickers)
    ? payload.stickers.filter((entry) => normalizeText(entry)).length
    : 0;
  const items = Array.isArray(payload.items)
    ? payload.items.filter((entry) => normalizeText(entry)).length
    : 0;
  return stickers + items <= 0;
}

function detectTreeDependencyCycles(links: ProgressionGraphDraft["links"]) {
  const adjacency = new Map<string, string[]>();
  for (const link of links) {
    const source = splitProgressionGraphNodeKey(link.source);
    const target = splitProgressionGraphNodeKey(link.target);
    if (source.kind !== "tree" || target.kind !== "tree") continue;
    const current = adjacency.get(link.source) ?? [];
    current.push(link.target);
    adjacency.set(link.source, current);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const cyclic = new Set<string>();

  function visit(node: string) {
    if (visiting.has(node)) {
      cyclic.add(node);
      return;
    }
    if (visited.has(node)) return;
    visiting.add(node);
    for (const next of adjacency.get(node) ?? []) {
      visit(next);
      if (cyclic.has(next)) cyclic.add(node);
    }
    visiting.delete(node);
    visited.add(node);
  }

  for (const node of adjacency.keys()) visit(node);
  return cyclic;
}

export function buildProgressionValidationIssues(args: {
  trees: ProgressionTreeRow[];
  conditions: ProgressionConditionRow[];
  rewards: ProgressionRewardRow[];
  graphDraft: unknown;
  trailRegions?: SceneRegion[];
  rules?: ValidationRuleDefinition[];
}) {
  const rules = args.rules ?? getDefaultValidationRules("progression");
  const graphDraft = normalizeProgressionGraphDraft(args.graphDraft);
  const issues: ProgressionValidationIssue[] = [];
  const enabledTrees = args.trees.filter((tree) => tree.enabled);
  const enabledConditions = args.conditions.filter((condition) => condition.enabled);
  const enabledRewards = args.rewards.filter((reward) => reward.enabled);
  const trailRegionById = new Map((args.trailRegions ?? []).map((region) => [region.id, region]));
  const milestoneRegionIds = new Set(
    (args.trailRegions ?? [])
      .filter((region) => region.kind === "milestone_tree")
      .map((region) => region.id),
  );
  const validNodeKeys = new Set<string>([
    ...args.conditions.map((condition) =>
      makeProgressionGraphNodeKey("condition", condition.id),
    ),
    ...args.trees.map((tree) => makeProgressionGraphNodeKey("tree", tree.id)),
    ...args.rewards.map((reward) => makeProgressionGraphNodeKey("reward", reward.id)),
  ]);
  const incomingLinks = new Map<string, string[]>();
  const outgoingLinks = new Map<string, string[]>();

  for (const link of graphDraft.links) {
    if (!validNodeKeys.has(link.source) || !validNodeKeys.has(link.target)) continue;
    const source = splitProgressionGraphNodeKey(link.source);
    const target = splitProgressionGraphNodeKey(link.target);
    if (!canLinkProgressionNodes(source.kind, target.kind)) continue;
    const nextIncoming = incomingLinks.get(link.target) ?? [];
    nextIncoming.push(link.source);
    incomingLinks.set(link.target, nextIncoming);
    const nextOutgoing = outgoingLinks.get(link.source) ?? [];
    nextOutgoing.push(link.target);
    outgoingLinks.set(link.source, nextOutgoing);
  }

  const treesMinRule = findEnabledRule(rules, "progression_trees_min_count");
  if (treesMinRule) {
    const minCount = Math.max(0, Math.round(ruleParam(treesMinRule, "minCount", 8)));
    if (enabledTrees.length < minCount) {
      issues.push({
        id: "progression-trees-min-count",
        tone: treesMinRule.tone,
        title: ruleTitle(treesMinRule, "Pocos árboles canónicos"),
        detail: ruleText(
          treesMinRule,
          "Solo hay {count} árbol(es) activos y el mínimo configurado es {minCount}.",
          { count: enabledTrees.length, minCount },
        ),
        targetPanel: "tree",
      });
    }
  }

  const conditionsMinRule = findEnabledRule(rules, "progression_conditions_min_count");
  if (conditionsMinRule) {
    const minCount = Math.max(0, Math.round(ruleParam(conditionsMinRule, "minCount", 8)));
    if (enabledConditions.length < minCount) {
      issues.push({
        id: "progression-conditions-min-count",
        tone: conditionsMinRule.tone,
        title: ruleTitle(conditionsMinRule, "Pocas condiciones activas"),
        detail: ruleText(
          conditionsMinRule,
          "Solo hay {count} condición(es) activas y el mínimo configurado es {minCount}.",
          { count: enabledConditions.length, minCount },
        ),
        targetPanel: "conditions",
      });
    }
  }

  const rewardsMinRule = findEnabledRule(rules, "progression_rewards_min_count");
  if (rewardsMinRule) {
    const minCount = Math.max(0, Math.round(ruleParam(rewardsMinRule, "minCount", 8)));
    if (enabledRewards.length < minCount) {
      issues.push({
        id: "progression-rewards-min-count",
        tone: rewardsMinRule.tone,
        title: ruleTitle(rewardsMinRule, "Pocas rewards activas"),
        detail: ruleText(
          rewardsMinRule,
          "Solo hay {count} reward(s) activas y el mínimo configurado es {minCount}.",
          { count: enabledRewards.length, minCount },
        ),
        targetPanel: "rewards",
      });
    }
  }

  const treeHasZoneRule = findEnabledRule(rules, "progression_tree_has_zone");
  if (treeHasZoneRule) {
    for (const tree of enabledTrees) {
      const nodeKey = makeProgressionGraphNodeKey("tree", tree.id);
      const regionId = normalizeText(graphDraft.treeSettings[nodeKey]?.regionId);
      const region = regionId ? trailRegionById.get(regionId) : null;
      const regionLooksValid = region && milestoneRegionIds.has(region.id);
      if (regionLooksValid) continue;
      issues.push({
        id: `${treeHasZoneRule.id}-${tree.id}`,
        tone: treeHasZoneRule.tone,
        title: ruleTitle(treeHasZoneRule, "Árbol sin zona valida", {
          title: tree.title,
        }),
        detail: ruleText(
          treeHasZoneRule,
          "{title} sigue sin una zona milestone_tree valida del trail.",
          { title: tree.title },
        ),
        targetPanel: "tree",
        targetNodeKey: nodeKey,
      });
    }
  }

  const treeHasInputRule = findEnabledRule(rules, "progression_tree_has_input_link");
  if (treeHasInputRule) {
    for (const tree of enabledTrees) {
      const nodeKey = makeProgressionGraphNodeKey("tree", tree.id);
      if ((incomingLinks.get(nodeKey) ?? []).length > 0) continue;
      issues.push({
        id: `${treeHasInputRule.id}-${tree.id}`,
        tone: treeHasInputRule.tone,
        title: ruleTitle(treeHasInputRule, "Árbol sin activación", {
          title: tree.title,
        }),
        detail: ruleText(
          treeHasInputRule,
          "{title} no recibe ninguna condición ni dependencia previa en el grafo.",
          { title: tree.title },
        ),
        targetPanel: "tree",
        targetNodeKey: nodeKey,
      });
    }
  }

  const conditionTemplateRule = findEnabledRule(rules, "progression_condition_has_template");
  if (conditionTemplateRule) {
    for (const condition of enabledConditions) {
      const nodeKey = makeProgressionGraphNodeKey("condition", condition.id);
      const templateId =
        normalizeText(graphDraft.conditionSettings[nodeKey]?.templateId) ||
        normalizeText(condition.template_id);
      if (templateId) continue;
      issues.push({
        id: `${conditionTemplateRule.id}-${condition.id}`,
        tone: conditionTemplateRule.tone,
        title: ruleTitle(conditionTemplateRule, "Condicion sin plantilla", {
          title: condition.title,
        }),
        detail: ruleText(
          conditionTemplateRule,
          "{title} no tiene una plantilla real del motor de progression.",
          { title: condition.title },
        ),
        targetPanel: "conditions",
        targetNodeKey: nodeKey,
      });
    }
  }

  const conditionOutputRule = findEnabledRule(rules, "progression_condition_has_output_link");
  if (conditionOutputRule) {
    for (const condition of enabledConditions) {
      const nodeKey = makeProgressionGraphNodeKey("condition", condition.id);
      const hasOutputTree = (outgoingLinks.get(nodeKey) ?? []).some((targetKey) => {
        return splitProgressionGraphNodeKey(targetKey).kind === "tree";
      });
      if (hasOutputTree) continue;
      issues.push({
        id: `${conditionOutputRule.id}-${condition.id}`,
        tone: conditionOutputRule.tone,
        title: ruleTitle(conditionOutputRule, "Condicion sin árbol destino", {
          title: condition.title,
        }),
        detail: ruleText(
          conditionOutputRule,
          "{title} no dispara ningún árbol visible del grafo.",
          { title: condition.title },
        ),
        targetPanel: "conditions",
        targetNodeKey: nodeKey,
      });
    }
  }

  const rewardHasTreeRule = findEnabledRule(rules, "progression_reward_has_tree_link");
  if (rewardHasTreeRule) {
    for (const reward of enabledRewards) {
      const nodeKey = makeProgressionGraphNodeKey("reward", reward.id);
      if ((incomingLinks.get(nodeKey) ?? []).length > 0) continue;
      issues.push({
        id: `${rewardHasTreeRule.id}-${reward.id}`,
        tone: rewardHasTreeRule.tone,
        title: ruleTitle(rewardHasTreeRule, "Reward sin árbol origen", {
          title: reward.title,
        }),
        detail: ruleText(
          rewardHasTreeRule,
          "{title} no cuelga de ningún árbol y no podrá desbloquearse desde el grafo.",
          { title: reward.title },
        ),
        targetPanel: "rewards",
        targetNodeKey: nodeKey,
      });
    }
  }

  const rewardReferenceRule = findEnabledRule(rules, "progression_reward_reference_required");
  if (rewardReferenceRule) {
    const requiredKinds = ruleStringListParam(rewardReferenceRule, "kinds");
    for (const reward of enabledRewards) {
      if (!rewardNeedsReference(reward, requiredKinds)) continue;
      issues.push({
        id: `${rewardReferenceRule.id}-${reward.id}`,
        tone: rewardReferenceRule.tone,
        title: ruleTitle(rewardReferenceRule, "Reward sin referencia útil", {
          title: reward.title,
        }),
        detail: ruleText(
          rewardReferenceRule,
          "{title} necesita una reference key o payload para que runtime sepa que desbloquear.",
          { title: reward.title },
        ),
        targetPanel: "rewards",
        targetNodeKey: makeProgressionGraphNodeKey("reward", reward.id),
      });
    }
  }

  const rewardItemsRule = findEnabledRule(rules, "progression_reward_items_required");
  if (rewardItemsRule) {
    const requiredKinds = ruleStringListParam(rewardItemsRule, "kinds");
    for (const reward of enabledRewards) {
      if (!rewardNeedsItems(reward, requiredKinds)) continue;
      issues.push({
        id: `${rewardItemsRule.id}-${reward.id}`,
        tone: rewardItemsRule.tone,
        title: ruleTitle(rewardItemsRule, "Reward sin items reales", {
          title: reward.title,
        }),
        detail: ruleText(
          rewardItemsRule,
          "{title} necesita items o stickers concretos en su payload para que el desbloqueo tenga efecto.",
          { title: reward.title },
        ),
        targetPanel: "rewards",
        targetNodeKey: makeProgressionGraphNodeKey("reward", reward.id),
      });
    }
  }

  const danglingLinksRule = findEnabledRule(rules, "progression_graph_dangling_links");
  if (danglingLinksRule) {
    for (const link of graphDraft.links) {
      if (validNodeKeys.has(link.source) && validNodeKeys.has(link.target)) continue;
      issues.push({
        id: `${danglingLinksRule.id}-${link.id}`,
        tone: danglingLinksRule.tone,
        title: ruleTitle(danglingLinksRule, "Enlace huerfano en el grafo"),
        detail: ruleText(
          danglingLinksRule,
          "Existe un enlace que sigue apuntando a un nodo borrado o inexistente.",
        ),
        targetPanel: null,
      });
    }
  }

  const cycleRule = findEnabledRule(rules, "progression_tree_dependency_cycle");
  if (cycleRule) {
    const cyclicNodes = detectTreeDependencyCycles(graphDraft.links);
    for (const nodeKey of cyclicNodes) {
      const entityId = splitProgressionGraphNodeKey(nodeKey).entityId;
      const tree = args.trees.find((entry) => entry.id === entityId);
      issues.push({
        id: `${cycleRule.id}-${entityId}`,
        tone: cycleRule.tone,
        title: ruleTitle(cycleRule, "Ciclo entre árboles", {
          title: tree?.title ?? entityId,
        }),
        detail: ruleText(
          cycleRule,
          "{title} participa en una dependencia circular con otro árbol.",
          { title: tree?.title ?? entityId },
        ),
        targetPanel: "tree",
        targetNodeKey: nodeKey,
      });
    }
  }

  for (const rule of findEnabledRules(rules, "progression_required_reward_kind_count")) {
    const kind = normalizeText(rule.params.kind);
    const minCount = Math.max(0, Math.round(ruleParam(rule, "minCount", 1)));
    const count = enabledRewards.filter((reward) => reward.kind === kind).length;
    if (count >= minCount) continue;
    issues.push({
      id: `${rule.id}-${kind}`,
      tone: rule.tone,
      title: ruleTitle(rule, "Pocas rewards de un tipo concreto"),
      detail: ruleText(
        rule,
        "Solo hay {count} reward(s) del tipo {kind} y el mínimo configurado es {minCount}.",
        { count, kind, minCount },
      ),
      targetPanel: "rewards",
    });
  }

  for (const rule of findEnabledRules(rules, "progression_required_tree_importance_count")) {
    const importance = normalizeText(rule.params.importance);
    const minCount = Math.max(0, Math.round(ruleParam(rule, "minCount", 1)));
    const count = enabledTrees.filter((tree) => {
      const nodeKey = makeProgressionGraphNodeKey("tree", tree.id);
      return normalizeText(graphDraft.treeSettings[nodeKey]?.importance) === importance;
    }).length;
    if (count >= minCount) continue;
    issues.push({
      id: `${rule.id}-${importance}`,
      tone: rule.tone,
      title: ruleTitle(rule, "Pocos árboles de una importancia concreta"),
      detail: ruleText(
        rule,
        "Solo hay {count} árbol(es) con importancia {importance} y el mínimo configurado es {minCount}.",
        { count, importance, minCount },
      ),
      targetPanel: "tree",
    });
  }

  return sortIssues(issues);
}
