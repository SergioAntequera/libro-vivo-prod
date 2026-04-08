import { FLOWER_PAGE_BLOCK_IDS } from "@/lib/flowerPageLayoutConfig";
import { ANNUAL_TREE_PHASES } from "@/lib/homeTrailCatalog";
import { SCENE_REGION_KIND_OPTIONS } from "@/lib/homeSceneRegions";
import { SEED_COMPOSER_BLOCK_IDS } from "@/lib/seedComposerLayoutConfig";
import { supabase } from "@/lib/supabase";

export type DiagnosticsTone = "error" | "warning" | "info";

export type ValidationDomain = "flowers" | "map" | "trail" | "progression" | "seeds";

export type ValidationRuleKind =
  | "flower_required_blocks"
  | "flower_bounds"
  | "flower_overlap"
  | "flower_low_max_chars"
  | "flower_sample_overflow"
  | "flower_enabled_blocks_min_count"
  | "flower_required_specific_blocks"
  | "flower_specific_blocks_min_chars_floor"
  | "flower_specific_blocks_max_chars_ceiling"
  | "seed_required_blocks"
  | "seed_bounds"
  | "seed_overlap"
  | "seed_enabled_blocks_min_count"
  | "seed_required_specific_blocks"
  | "map_place_visible_context"
  | "map_custom_place_icon"
  | "map_place_narrative_context"
  | "map_route_geometry"
  | "map_route_labels"
  | "map_route_color"
  | "map_zone_geometry"
  | "map_zone_centroid"
  | "map_system_semantics"
  | "map_places_min_count"
  | "map_routes_min_count"
  | "map_zones_min_count"
  | "map_required_place_kind_count"
  | "map_required_route_kind_count"
  | "map_required_zone_kind_count"
  | "trail_background"
  | "trail_path_geometry"
  | "trail_runtime_width_order"
  | "trail_solid_background"
  | "trail_summit_label"
  | "trail_annual_tree_assets"
  | "trail_regions_exist"
  | "trail_region_shape"
  | "trail_base_assets"
  | "trail_flower_library"
  | "trail_tree_library"
  | "trail_annual_phases"
  | "trail_public_assets"
  | "trail_regions_min_count"
  | "trail_required_flower_codes_specific"
  | "trail_required_tree_codes_specific"
  | "trail_required_annual_phases_specific"
  | "trail_named_regions_min_count"
  | "trail_region_kind_min_count"
  | "progression_trees_min_count"
  | "progression_conditions_min_count"
  | "progression_rewards_min_count"
  | "progression_tree_has_zone"
  | "progression_tree_has_input_link"
  | "progression_condition_has_template"
  | "progression_condition_has_output_link"
  | "progression_reward_has_tree_link"
  | "progression_reward_reference_required"
  | "progression_reward_items_required"
  | "progression_graph_dangling_links"
  | "progression_tree_dependency_cycle"
  | "progression_required_reward_kind_count"
  | "progression_required_tree_importance_count";

export type ValidationRuleParamValue = number | string | boolean | string[];

type ValidationFieldBase = {
  key: string;
  label: string;
  hint?: string;
};

type ValidationRuleNumberField = ValidationFieldBase & {
  type: "number";
  min?: number;
  step?: number;
  defaultValue: number;
};

type ValidationRuleTextField = ValidationFieldBase & {
  type: "text" | "textarea";
  defaultValue: string;
  placeholder?: string;
};

type ValidationRuleSelectField = ValidationFieldBase & {
  type: "select";
  defaultValue: string;
  options: Array<{ value: string; label: string }>;
};

type ValidationRuleMultiselectField = ValidationFieldBase & {
  type: "multiselect";
  defaultValue: string[];
  options: Array<{ value: string; label: string }>;
};

export type ValidationRuleFieldDefinition =
  | ValidationRuleNumberField
  | ValidationRuleTextField
  | ValidationRuleSelectField
  | ValidationRuleMultiselectField;

export type ValidationRuleTemplate = {
  domain: ValidationDomain;
  kind: ValidationRuleKind;
  label: string;
  description: string;
  tone: DiagnosticsTone;
  target: string | null;
  enabledByDefault: boolean;
  includeByDefault?: boolean;
  allowMultiple?: boolean;
  fields?: ValidationRuleFieldDefinition[];
};

export type ValidationRuleDefinition = {
  id: string;
  domain: ValidationDomain;
  kind: ValidationRuleKind;
  label: string;
  description: string;
  tone: DiagnosticsTone;
  enabled: boolean;
  target: string | null;
  sortOrder: number;
  params: Record<string, ValidationRuleParamValue>;
  source: "default" | "catalog";
};

type CatalogRow = {
  key: string;
  label: string;
  description: string;
};

type CatalogItemRow = {
  code: string | null;
  label: string | null;
  sort_order: number | null;
  enabled: boolean | null;
  metadata: Record<string, unknown> | null;
};

const TRAIL_FLOWER_CODE_OPTIONS = [
  "fire",
  "water",
  "air",
  "earth",
  "aether",
  "default",
].map((value) => ({ value, label: value }));

const TRAIL_TREE_CODE_OPTIONS = [
  "bronze",
  "silver",
  "gold",
  "diamond",
  "default",
].map((value) => ({ value, label: value }));

const MAP_ROUTE_KIND_OPTIONS = [
  "walk",
  "drive",
  "date_route",
  "trip",
  "ritual",
  "custom",
].map((value) => ({ value, label: value }));

const MAP_ZONE_KIND_OPTIONS = [
  "symbolic",
  "favorite_area",
  "memory_area",
  "meeting_area",
  "avoid_area",
  "custom",
].map((value) => ({ value, label: value }));

const FLOWER_BLOCK_OPTIONS = FLOWER_PAGE_BLOCK_IDS.map((value) => ({
  value,
  label: value.replaceAll("_", " "),
}));

const SEED_BLOCK_OPTIONS = SEED_COMPOSER_BLOCK_IDS.map((value) => ({
  value,
  label: value.replaceAll("_", " "),
}));

const ANNUAL_PHASE_OPTIONS = ANNUAL_TREE_PHASES.map((value) => ({
  value,
  label: value,
}));

const TRAIL_REGION_KIND_OPTIONS = SCENE_REGION_KIND_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label,
}));

const PROGRESSION_REWARD_KIND_OPTIONS = [
  "message",
  "gift",
  "sticker_pack",
  "canvas_tool",
  "canvas_template",
  "canvas_effect",
  "page_frame",
  "page_background",
  "year_chapter",
  "pdf_detail",
].map((value) => ({ value, label: value.replaceAll("_", " ") }));

const PROGRESSION_TREE_IMPORTANCE_OPTIONS = [
  "paso",
  "importante",
  "mayor",
  "anual",
].map((value) => ({ value, label: value }));

export const VALIDATION_RULE_DOMAINS: ValidationDomain[] = [
  "flowers",
  "map",
  "trail",
  "progression",
  "seeds",
];

export const VALIDATION_RULE_CATALOGS: Record<ValidationDomain, CatalogRow> = {
  flowers: {
    key: "admin_validation_rules_flowers",
    label: "Validacion admin flowers",
    description:
      "Reglas de validación configurables para la superficie flowers y memorias.",
  },
  map: {
    key: "admin_validation_rules_map",
    label: "Validacion admin map",
    description:
      "Reglas de validación configurables para el dominio espacial del mapa.",
  },
  trail: {
    key: "admin_validation_rules_trail",
    label: "Validacion admin trail",
    description:
      "Reglas de validación configurables para home, sendero y cima anual.",
  },
  progression: {
    key: "admin_validation_rules_progression",
    label: "Validacion admin progression",
    description:
      "Reglas de validación configurables para el árbol de hitos, sus condiciones y rewards.",
  },
  seeds: {
    key: "admin_validation_rules_seeds",
    label: "Validacion admin seeds",
    description:
      "Reglas de validación configurables para la superficie de nueva semilla.",
  },
};

export const VALIDATION_RULE_TEMPLATES: ValidationRuleTemplate[] = [
  {
    domain: "flowers",
    kind: "flower_required_blocks",
    label: "Bloques base obligatorios",
    description:
      "Si un bloque base esta marcado como obligatorio, no debería quedar apagado en la superficie.",
    tone: "error",
    target: "Layout",
    enabledByDefault: true,
  },
  {
    domain: "flowers",
    kind: "flower_bounds",
    label: "Bloques dentro del stage",
    description:
      "Los bloques visibles deben quedarse dentro del stage y no desbordarse fuera del área útil.",
    tone: "error",
    target: "Layout",
    enabledByDefault: true,
  },
  {
    domain: "flowers",
    kind: "flower_overlap",
    label: "Cruces entre bloques",
    description:
      "Cuando dos bloques visibles se pisan, conviene avisar para revisar si el solapamiento es intencional.",
    tone: "warning",
    target: "Layout",
    enabledByDefault: true,
  },
  {
    domain: "flowers",
    kind: "flower_low_max_chars",
    label: "Limites de texto demasiado bajos",
    description:
      "Si un bloque editable tiene un límite de caracteres muy bajo, puede quedarse corto para una escritura normal.",
    tone: "info",
    target: "Copy",
    enabledByDefault: true,
    fields: [
      {
        key: "minCharsFloor",
        label: "Mínimo razonable",
        type: "number",
        min: 1,
        step: 1,
        hint: "Por debajo de este valor se considera un límite demasiado corto.",
        defaultValue: 24,
      },
    ],
  },
  {
    domain: "flowers",
    kind: "flower_sample_overflow",
    label: "Demo que desborda",
    description:
      "Si el texto de demo ya rebasa el límite del bloque, la validación local debe avisarlo.",
    tone: "warning",
    target: "Preview",
    enabledByDefault: true,
  },
  {
    domain: "flowers",
    kind: "flower_enabled_blocks_min_count",
    label: "Mínimo de bloques activos",
    description:
      "Ayuda a evitar una superficie demasiado vaciada cuando se apagan demasiadas piezas visibles.",
    tone: "warning",
    target: "Layout",
    enabledByDefault: false,
    fields: [
      {
        key: "minCount",
        label: "Mínimo de bloques activos",
        type: "number",
        min: 1,
        step: 1,
        hint: "Si hay menos bloques activos que este mínimo, se dispara la regla.",
        defaultValue: 8,
      },
    ],
  },
  {
    domain: "flowers",
    kind: "flower_required_specific_blocks",
    label: "Bloques concretos obligatorios",
    description:
      "Exige que los bloques elegidos permanezcan activos en la superficie.",
    tone: "error",
    target: "Layout",
    enabledByDefault: true,
    includeByDefault: false,
    allowMultiple: true,
    fields: [
      {
        key: "blockIds",
        label: "Bloques obligatorios",
        type: "multiselect",
        defaultValue: [],
        options: FLOWER_BLOCK_OPTIONS,
        hint: "Si cualquiera de estos bloques se apaga, la regla se dispara.",
      },
    ],
  },
  {
    domain: "flowers",
    kind: "flower_specific_blocks_min_chars_floor",
    label: "Mínimo de caracteres por bloque",
    description:
      "Exige que los bloques elegidos no se queden por debajo de un límite de caracteres configurado.",
    tone: "warning",
    target: "Copy",
    enabledByDefault: true,
    includeByDefault: false,
    allowMultiple: true,
    fields: [
      {
        key: "blockIds",
        label: "Bloques a vigilar",
        type: "multiselect",
        defaultValue: [],
        options: FLOWER_BLOCK_OPTIONS,
      },
      {
        key: "minCharsFloor",
        label: "Mínimo de caracteres",
        type: "number",
        min: 1,
        step: 1,
        defaultValue: 40,
      },
    ],
  },
  {
    domain: "flowers",
    kind: "flower_specific_blocks_max_chars_ceiling",
    label: "Techo de caracteres por bloque",
    description:
      "Exige que los bloques elegidos no superen un techo configurado de caracteres.",
    tone: "warning",
    target: "Copy",
    enabledByDefault: true,
    includeByDefault: false,
    allowMultiple: true,
    fields: [
      {
        key: "blockIds",
        label: "Bloques a vigilar",
        type: "multiselect",
        defaultValue: [],
        options: FLOWER_BLOCK_OPTIONS,
      },
      {
        key: "maxCharsCeiling",
        label: "Techo de caracteres",
        type: "number",
        min: 1,
        step: 1,
        defaultValue: 160,
      },
    ],
  },
  {
    domain: "seeds",
    kind: "seed_required_blocks",
    label: "Bloques base obligatorios",
    description:
      "Si un bloque base esta marcado como obligatorio, no debería quedar apagado en la superficie de nueva semilla.",
    tone: "error",
    target: "Layout",
    enabledByDefault: true,
  },
  {
    domain: "seeds",
    kind: "seed_bounds",
    label: "Bloques dentro del stage",
    description:
      "Los bloques visibles deben quedarse dentro del área útil del compositor.",
    tone: "error",
    target: "Layout",
    enabledByDefault: true,
  },
  {
    domain: "seeds",
    kind: "seed_overlap",
    label: "Cruces entre bloques",
    description:
      "Cuando dos bloques visibles se pisan, conviene avisar para revisar si el solapamiento es intencional.",
    tone: "warning",
    target: "Layout",
    enabledByDefault: true,
  },
  {
    domain: "seeds",
    kind: "seed_enabled_blocks_min_count",
    label: "Mínimo de bloques activos",
    description:
      "Ayuda a evitar una superficie demasiado vaciada cuando se apagan demasiadas piezas visibles.",
    tone: "warning",
    target: "Layout",
    enabledByDefault: false,
    fields: [
      {
        key: "minCount",
        label: "Mínimo de bloques activos",
        type: "number",
        min: 1,
        step: 1,
        hint: "Si hay menos bloques activos que este mínimo, se dispara la regla.",
        defaultValue: 7,
      },
    ],
  },
  {
    domain: "seeds",
    kind: "seed_required_specific_blocks",
    label: "Bloques concretos obligatorios",
    description:
      "Exige que los bloques elegidos permanezcan activos en la superficie.",
    tone: "error",
    target: "Layout",
    enabledByDefault: true,
    includeByDefault: false,
    allowMultiple: true,
    fields: [
      {
        key: "blockIds",
        label: "Bloques obligatorios",
        type: "multiselect",
        defaultValue: [],
        options: SEED_BLOCK_OPTIONS,
        hint: "Si cualquiera de estos bloques se apaga, la regla se dispara.",
      },
    ],
  },
  {
    domain: "map",
    kind: "map_place_visible_context",
    label: "Lugar con subtítulo visible",
    description:
      "Un lugar debería mostrar dirección o subtítulo claro para leerse bien en popup o bandeja.",
    tone: "warning",
    target: "Lugares",
    enabledByDefault: true,
  },
  {
    domain: "map",
    kind: "map_custom_place_icon",
    label: "Custom con icono propio",
    description:
      "Los lugares especiales de tipo custom deberian tener glifo o icono propio para no confundirse con el resto.",
    tone: "info",
    target: "Visual",
    enabledByDefault: true,
  },
  {
    domain: "map",
    kind: "map_place_narrative_context",
    label: "Lugar con contexto narrativo",
    description:
      "Los lugares guardados deberian tener notas o enlazar con una flor o semilla para no quedarse huecos.",
    tone: "info",
    target: "Avanzado",
    enabledByDefault: true,
  },
  {
    domain: "map",
    kind: "map_route_geometry",
    label: "Ruta con geometria valida",
    description:
      "Una ruta necesita suficiente geometria para poder mostrarse con fiabilidad.",
    tone: "error",
    target: "Rutas",
    enabledByDefault: true,
  },
  {
    domain: "map",
    kind: "map_route_labels",
    label: "Ruta con origen y destino",
    description:
      "Las rutas deberian tener etiquetas de origen y destino para leerse bien en el sistema.",
    tone: "warning",
    target: "Rutas",
    enabledByDefault: true,
  },
  {
    domain: "map",
    kind: "map_route_color",
    label: "Ruta con color propio",
    description:
      "Cuando una ruta no tiene color propio depende del fallback y pierde legibilidad en el mapa.",
    tone: "info",
    target: "Visual",
    enabledByDefault: true,
  },
  {
    domain: "map",
    kind: "map_zone_geometry",
    label: "Zona con geojson útil",
    description:
      "Las zonas activas necesitan una geometria que pueda leerse de verdad en el mapa.",
    tone: "error",
    target: "Avanzado",
    enabledByDefault: true,
  },
  {
    domain: "map",
    kind: "map_zone_centroid",
    label: "Zona con centro visible",
    description:
      "Las zonas deberian tener centro calculado para foco, resumen o interaccion.",
    tone: "warning",
    target: "Avanzado",
    enabledByDefault: true,
  },
  {
    domain: "map",
    kind: "map_system_semantics",
    label: "Semantica catalogada",
    description:
      "Tipos, estados y lentes del mapa deben seguir gobernandose desde catálogos y no desde formularios sueltos.",
    tone: "info",
    target: "Visual",
    enabledByDefault: true,
  },
  {
    domain: "map",
    kind: "map_places_min_count",
    label: "Mínimo de lugares",
    description:
      "Permite exigir una masa minima de lugares visibles antes de considerar el dominio suficientemente sembrado.",
    tone: "warning",
    target: "Lugares",
    enabledByDefault: false,
    fields: [
      {
        key: "minCount",
        label: "Mínimo de lugares",
        type: "number",
        min: 0,
        step: 1,
        hint: "Si hay menos lugares que este mínimo, se dispara la regla.",
        defaultValue: 1,
      },
    ],
  },
  {
    domain: "map",
    kind: "map_required_place_kind_count",
    label: "Mínimo por tipo de lugar",
    description:
      "Exige una cantidad minima de lugares para un tipo concreto del mapa.",
    tone: "warning",
    target: "Lugares",
    enabledByDefault: true,
    includeByDefault: false,
    allowMultiple: true,
    fields: [
      {
        key: "kindCode",
        label: "Código del tipo",
        type: "text",
        defaultValue: "custom",
        placeholder: "custom",
      },
      {
        key: "minCount",
        label: "Mínimo de lugares",
        type: "number",
        min: 0,
        step: 1,
        defaultValue: 1,
      },
    ],
  },
  {
    domain: "map",
    kind: "map_routes_min_count",
    label: "Mínimo de rutas",
    description:
      "Permite exigir una masa minima de rutas visibles antes de dar por maduro el dominio.",
    tone: "warning",
    target: "Rutas",
    enabledByDefault: false,
    fields: [
      {
        key: "minCount",
        label: "Mínimo de rutas",
        type: "number",
        min: 0,
        step: 1,
        defaultValue: 1,
      },
    ],
  },
  {
    domain: "map",
    kind: "map_required_route_kind_count",
    label: "Mínimo por tipo de ruta",
    description:
      "Exige una cantidad minima de rutas para un tipo concreto del mapa.",
    tone: "warning",
    target: "Rutas",
    enabledByDefault: true,
    includeByDefault: false,
    allowMultiple: true,
    fields: [
      {
        key: "kindCode",
        label: "Tipo de ruta",
        type: "select",
        defaultValue: "walk",
        options: MAP_ROUTE_KIND_OPTIONS,
      },
      {
        key: "minCount",
        label: "Mínimo de rutas",
        type: "number",
        min: 0,
        step: 1,
        defaultValue: 1,
      },
    ],
  },
  {
    domain: "map",
    kind: "map_zones_min_count",
    label: "Mínimo de zonas",
    description:
      "Permite exigir una masa minima de zonas visibles antes de considerar estable la semantica espacial.",
    tone: "warning",
    target: "Zonas",
    enabledByDefault: false,
    fields: [
      {
        key: "minCount",
        label: "Mínimo de zonas",
        type: "number",
        min: 0,
        step: 1,
        defaultValue: 1,
      },
    ],
  },
  {
    domain: "map",
    kind: "map_required_zone_kind_count",
    label: "Mínimo por tipo de zona",
    description:
      "Exige una cantidad minima de zonas para un tipo concreto del mapa.",
    tone: "warning",
    target: "Zonas",
    enabledByDefault: true,
    includeByDefault: false,
    allowMultiple: true,
    fields: [
      {
        key: "kindCode",
        label: "Tipo de zona",
        type: "select",
        defaultValue: "custom",
        options: MAP_ZONE_KIND_OPTIONS,
      },
      {
        key: "minCount",
        label: "Mínimo de zonas",
        type: "number",
        min: 0,
        step: 1,
        defaultValue: 1,
      },
    ],
  },
  {
    domain: "trail",
    kind: "trail_background",
    label: "Fondo base del sendero",
    description:
      "El lienzo principal debería tener imagen base para validar la colina real y no una escena demasiado abstracta.",
    tone: "warning",
    target: "Lienzo",
    enabledByDefault: true,
  },
  {
    domain: "trail",
    kind: "trail_path_geometry",
    label: "Trazado útil del sendero",
    description:
      "El sendero necesita al menos un tramo visible y una geometria minima para sostener la progresion anual.",
    tone: "error",
    target: "Recorrido",
    enabledByDefault: true,
    fields: [
      {
        key: "minAnchors",
        label: "Mínimo de anchors",
        type: "number",
        min: 2,
        step: 1,
        hint: "Numero mínimo de anchors para considerar útil el trazado.",
        defaultValue: 2,
      },
    ],
  },
  {
    domain: "trail",
    kind: "trail_runtime_width_order",
    label: "Orden de anchos runtime",
    description:
      "Desktop, tablet y mobile deben ir de mayor a menor para responder de forma coherente.",
    tone: "warning",
    target: "Avanzado",
    enabledByDefault: true,
  },
  {
    domain: "trail",
    kind: "trail_solid_background",
    label: "Color solido informado",
    description:
      "Si el modo de fondo es color solido, el valor del color no debería quedar vacío.",
    tone: "warning",
    target: "Vista",
    enabledByDefault: true,
  },
  {
    domain: "trail",
    kind: "trail_summit_label",
    label: "Texto visible de la cima",
    description:
      "La cima anual debería mantener un texto corto visible para seguir leyendose como hito.",
    tone: "warning",
    target: "Cima",
    enabledByDefault: true,
  },
  {
    domain: "trail",
    kind: "trail_annual_tree_assets",
    label: "Assets del árbol anual",
    description:
      "La cima anual debería disponer de al menos un asset visible para no quedarse muda.",
    tone: "warning",
    target: "Assets",
    enabledByDefault: true,
  },
  {
    domain: "trail",
    kind: "trail_regions_exist",
    label: "Regiones semanticas presentes",
    description:
      "Sin regiones activas, hitos, flores y capas narrativas pierden guia espacial dentro de la colina.",
    tone: "warning",
    target: "Regiones",
    enabledByDefault: true,
  },
  {
    domain: "trail",
    kind: "trail_region_shape",
    label: "Regiones con polígono útil",
    description:
      "Cada región activa debería tener un polígono suficientemente definido para ser útil.",
    tone: "error",
    target: "Regiones",
    enabledByDefault: true,
    fields: [
      {
        key: "minPoints",
        label: "Mínimo de vértices",
        type: "number",
        min: 3,
        step: 1,
        hint: "Numero mínimo de vértices para considerar una región útil.",
        defaultValue: 3,
      },
    ],
  },
  {
    domain: "trail",
    kind: "trail_base_assets",
    label: "Assets base del sendero",
    description:
      "Semilla y brote base deberian existir para que el sistema mínimo del sendero no quede roto.",
    tone: "warning",
    target: "Assets",
    enabledByDefault: true,
  },
  {
    domain: "trail",
    kind: "trail_flower_library",
    label: "Biblioteca completa de flores",
    description:
      "La biblioteca de flores debería cubrir todos los códigos visibles del sendero.",
    tone: "warning",
    target: "Assets",
    enabledByDefault: true,
  },
  {
    domain: "trail",
    kind: "trail_tree_library",
    label: "Fuente canónica de hitos disponible",
    description:
      "Trail-editor debe poder leer al menos un árbol de hito desde progression para que la demo y las previews no caigan al legado.",
    tone: "warning",
    target: "Demo",
    enabledByDefault: true,
  },
  {
    domain: "trail",
    kind: "trail_annual_phases",
    label: "Fases del árbol anual completas",
    description:
      "Las fases del árbol anual deberian quedar cubiertas para que el sistema no dependa de huecos.",
    tone: "warning",
    target: "Assets",
    enabledByDefault: true,
  },
  {
    domain: "trail",
    kind: "trail_public_assets",
    label: "Biblioteca pública minima",
    description:
      "El picker visual debería tener al menos una base reutilizable cuando se espera una libreria pública.",
    tone: "info",
    target: "Assets",
    enabledByDefault: true,
    fields: [
      {
        key: "minCount",
        label: "Mínimo de assets publicos",
        type: "number",
        min: 0,
        step: 1,
        hint: "Si la biblioteca pública tiene menos assets que este mínimo, se dispara la regla.",
        defaultValue: 1,
      },
    ],
  },
  {
    domain: "trail",
    kind: "trail_regions_min_count",
    label: "Mínimo de regiones",
    description:
      "Permite exigir una masa minima de regiones activas antes de dar por madura la semantica del sendero.",
    tone: "warning",
    target: "Regiones",
    enabledByDefault: false,
    fields: [
      {
        key: "minCount",
        label: "Mínimo de regiones",
        type: "number",
        min: 0,
        step: 1,
        hint: "Si hay menos regiones que este mínimo, se dispara la regla.",
        defaultValue: 3,
      },
    ],
  },
  {
    domain: "trail",
    kind: "trail_required_flower_codes_specific",
    label: "Flores concretas obligatorias",
    description:
      "Exige assets para un subconjunto concreto de flores del sendero.",
    tone: "warning",
    target: "Assets",
    enabledByDefault: true,
    includeByDefault: false,
    allowMultiple: true,
    fields: [
      {
        key: "codes",
        label: "Codigos de flor",
        type: "multiselect",
        defaultValue: [],
        options: TRAIL_FLOWER_CODE_OPTIONS,
      },
    ],
  },
  {
    domain: "trail",
    kind: "trail_required_tree_codes_specific",
    label: "Codigos concretos de hitos legacy",
    description:
      "Regla legacy para bibliotecas antiguas de árboles del sendero. Normalmente ya no hace falta si progression es la fuente de verdad.",
    tone: "warning",
    target: "Assets",
    enabledByDefault: false,
    includeByDefault: false,
    allowMultiple: true,
    fields: [
      {
        key: "codes",
        label: "Codigos de hito",
        type: "multiselect",
        defaultValue: [],
        options: TRAIL_TREE_CODE_OPTIONS,
      },
    ],
  },
  {
    domain: "trail",
    kind: "trail_required_annual_phases_specific",
    label: "Fases concretas obligatorias",
    description:
      "Exige assets para un subconjunto concreto de fases del árbol anual.",
    tone: "warning",
    target: "Assets",
    enabledByDefault: true,
    includeByDefault: false,
    allowMultiple: true,
    fields: [
      {
        key: "phases",
        label: "Fases obligatorias",
        type: "multiselect",
        defaultValue: [],
        options: ANNUAL_PHASE_OPTIONS,
      },
    ],
  },
  {
    domain: "trail",
    kind: "trail_named_regions_min_count",
    label: "Mínimo de regiones con nombre",
    description:
      "Exige una cantidad minima de regiones con nombre visible y no vacío.",
    tone: "warning",
    target: "Regiones",
    enabledByDefault: true,
    includeByDefault: false,
    allowMultiple: true,
    fields: [
      {
        key: "minCount",
        label: "Mínimo con nombre",
        type: "number",
        min: 1,
        step: 1,
        defaultValue: 1,
      },
    ],
  },
  {
    domain: "trail",
    kind: "trail_region_kind_min_count",
    label: "Mínimo por tipo de región",
    description:
      "Exige una cantidad minima de regiones activas para un tipo concreto del sendero.",
    tone: "warning",
    target: "Regiones",
    enabledByDefault: true,
    includeByDefault: false,
    allowMultiple: true,
    fields: [
      {
        key: "kindCode",
        label: "Tipo de región",
        type: "select",
        defaultValue: "flower_area",
        options: TRAIL_REGION_KIND_OPTIONS,
      },
      {
        key: "minCount",
        label: "Mínimo de regiones",
        type: "number",
        min: 0,
        step: 1,
        defaultValue: 1,
      },
    ],
  },
  {
    domain: "progression",
    kind: "progression_trees_min_count",
    label: "Mínimo de árboles",
    description:
      "El árbol de progression debería tener al menos {minCount} hito(s) visibles antes de considerarlo útil.",
    tone: "warning",
    target: "Árbol",
    enabledByDefault: true,
    fields: [
      {
        key: "minCount",
        label: "Mínimo de árboles",
        type: "number",
        min: 0,
        step: 1,
        defaultValue: 8,
      },
    ],
  },
  {
    domain: "progression",
    kind: "progression_conditions_min_count",
    label: "Mínimo de condiciones",
    description:
      "La biblioteca de condiciones debería tener al menos {minCount} condición(es) activas.",
    tone: "warning",
    target: "Condiciones",
    enabledByDefault: true,
    fields: [
      {
        key: "minCount",
        label: "Mínimo de condiciones",
        type: "number",
        min: 0,
        step: 1,
        defaultValue: 8,
      },
    ],
  },
  {
    domain: "progression",
    kind: "progression_rewards_min_count",
    label: "Mínimo de rewards",
    description:
      "La biblioteca de rewards debería tener al menos {minCount} reward(s) activas para que el sistema no se quede corto.",
    tone: "warning",
    target: "Rewards",
    enabledByDefault: true,
    fields: [
      {
        key: "minCount",
        label: "Mínimo de rewards",
        type: "number",
        min: 0,
        step: 1,
        defaultValue: 8,
      },
    ],
  },
  {
    domain: "progression",
    kind: "progression_tree_has_zone",
    label: "Árboles con zona valida",
    description:
      "Cada árbol visible debería apuntar a una zona milestone_tree valida del trail.",
    tone: "error",
    target: "Árbol",
    enabledByDefault: true,
  },
  {
    domain: "progression",
    kind: "progression_tree_has_input_link",
    label: "Árboles con activación",
    description:
      "Cada árbol debería tener al menos una condición o una dependencia previa que lo active.",
    tone: "warning",
    target: "Árbol",
    enabledByDefault: true,
  },
  {
    domain: "progression",
    kind: "progression_condition_has_template",
    label: "Condiciones con plantilla",
    description:
      "Cada condición activa debería apoyarse en una plantilla real del motor de desbloqueo.",
    tone: "error",
    target: "Condiciones",
    enabledByDefault: true,
  },
  {
    domain: "progression",
    kind: "progression_condition_has_output_link",
    label: "Condiciones con árbol destino",
    description:
      "Cada condición activa debería disparar al menos un árbol para que no quede aislada en el grafo.",
    tone: "warning",
    target: "Condiciones",
    enabledByDefault: true,
  },
  {
    domain: "progression",
    kind: "progression_reward_has_tree_link",
    label: "Rewards enlazadas a árboles",
    description:
      "Cada reward activa debería colgar de al menos un árbol del grafo.",
    tone: "warning",
    target: "Rewards",
    enabledByDefault: true,
  },
  {
    domain: "progression",
    kind: "progression_reward_reference_required",
    label: "Rewards con referencia útil",
    description:
      "Las rewards creativas o editoriales deberian definir una reference key o payload para que el runtime sepa que desbloquear.",
    tone: "warning",
    target: "Rewards",
    enabledByDefault: true,
    fields: [
      {
        key: "kinds",
        label: "Tipos que exigen referencia",
        type: "multiselect",
        defaultValue: [
          "sticker_pack",
          "canvas_tool",
          "canvas_template",
          "canvas_effect",
          "page_frame",
          "page_background",
          "year_chapter",
          "pdf_detail",
        ],
        options: PROGRESSION_REWARD_KIND_OPTIONS,
      },
    ],
  },
  {
    domain: "progression",
    kind: "progression_reward_items_required",
    label: "Rewards con items reales",
    description:
      "Las rewards que desbloquean recursos creativos deberian aportar items o stickers concretos en su payload.",
    tone: "warning",
    target: "Rewards",
    enabledByDefault: true,
    fields: [
      {
        key: "kinds",
        label: "Tipos que exigen items",
        type: "multiselect",
        defaultValue: [
          "sticker_pack",
          "canvas_tool",
          "canvas_template",
          "canvas_effect",
          "page_frame",
          "page_background",
        ],
        options: PROGRESSION_REWARD_KIND_OPTIONS,
      },
    ],
  },
  {
    domain: "progression",
    kind: "progression_graph_dangling_links",
    label: "Enlaces huerfanos en el grafo",
    description:
      "No deberian quedar enlaces apuntando a nodos borrados o inexistentes.",
    tone: "error",
    target: "Grafo",
    enabledByDefault: true,
  },
  {
    domain: "progression",
    kind: "progression_tree_dependency_cycle",
    label: "Ciclos imposibles entre árboles",
    description:
      "Las dependencias entre árboles no deberian formar ciclos cerrados porque bloquearian el avance real.",
    tone: "error",
    target: "Grafo",
    enabledByDefault: true,
  },
  {
    domain: "progression",
    kind: "progression_required_reward_kind_count",
    label: "Mínimo por tipo de reward",
    description:
      "Permite exigir una cantidad minima de rewards activas para un tipo concreto.",
    tone: "warning",
    target: "Rewards",
    enabledByDefault: true,
    includeByDefault: false,
    allowMultiple: true,
    fields: [
      {
        key: "kind",
        label: "Tipo de reward",
        type: "select",
        defaultValue: "canvas_tool",
        options: PROGRESSION_REWARD_KIND_OPTIONS,
      },
      {
        key: "minCount",
        label: "Mínimo de rewards",
        type: "number",
        min: 0,
        step: 1,
        defaultValue: 1,
      },
    ],
  },
  {
    domain: "progression",
    kind: "progression_required_tree_importance_count",
    label: "Mínimo por importancia de árbol",
    description:
      "Permite exigir una cantidad minima de árboles para un nivel de importancia concreto.",
    tone: "info",
    target: "Árbol",
    enabledByDefault: true,
    includeByDefault: false,
    allowMultiple: true,
    fields: [
      {
        key: "importance",
        label: "Importancia",
        type: "select",
        defaultValue: "mayor",
        options: PROGRESSION_TREE_IMPORTANCE_OPTIONS,
      },
      {
        key: "minCount",
        label: "Mínimo de árboles",
        type: "number",
        min: 0,
        step: 1,
        defaultValue: 1,
      },
    ],
  },
];

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeTone(value: unknown, fallback: DiagnosticsTone): DiagnosticsTone {
  const tone = normalizeText(value).toLowerCase();
  if (tone === "error" || tone === "warning" || tone === "info") return tone;
  return fallback;
}

function templateForKind(kind: ValidationRuleKind) {
  return VALIDATION_RULE_TEMPLATES.find((template) => template.kind === kind) ?? null;
}

function fieldDefaultValue(field: ValidationRuleFieldDefinition): ValidationRuleParamValue {
  return field.defaultValue;
}

function defaultParamsForTemplate(template: ValidationRuleTemplate) {
  return Object.fromEntries(
    (template.fields ?? []).map((field) => [field.key, fieldDefaultValue(field)]),
  ) as Record<string, ValidationRuleParamValue>;
}

function buildDefaultRule(
  template: ValidationRuleTemplate,
  index: number,
): ValidationRuleDefinition {
  return {
    id: template.kind,
    domain: template.domain,
    kind: template.kind,
    label: template.label,
    description: template.description,
    tone: template.tone,
    enabled: template.enabledByDefault,
    target: template.target,
    sortOrder: (index + 1) * 10,
    params: defaultParamsForTemplate(template),
    source: "default",
  };
}

function normalizeMultiselectValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeText(entry)).filter(Boolean);
  }
  const text = normalizeText(value);
  if (!text) return [] as string[];
  return text
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeRuleParams(
  template: ValidationRuleTemplate,
  value: unknown,
) {
  const base = defaultParamsForTemplate(template);
  if (!value || typeof value !== "object" || Array.isArray(value)) return base;
  const raw = value as Record<string, unknown>;
  const next: Record<string, ValidationRuleParamValue> = { ...base };
  for (const field of template.fields ?? []) {
    if (field.type === "number") {
      const parsed = Number(raw[field.key]);
      next[field.key] = Number.isFinite(parsed) ? parsed : field.defaultValue;
      continue;
    }
    if (field.type === "multiselect") {
      next[field.key] = normalizeMultiselectValue(raw[field.key]);
      continue;
    }
    next[field.key] = normalizeText(raw[field.key]) || field.defaultValue;
  }
  return next;
}

function sortRules(rules: ValidationRuleDefinition[]) {
  return [...rules].sort(
    (left, right) =>
      left.sortOrder - right.sortOrder || left.label.localeCompare(right.label),
  );
}

export function getValidationRuleTemplates(domain: ValidationDomain) {
  return VALIDATION_RULE_TEMPLATES.filter((template) => template.domain === domain);
}

export function getCreatableValidationRuleTemplates(domain: ValidationDomain) {
  return getValidationRuleTemplates(domain).filter((template) => template.allowMultiple);
}

export function getDefaultValidationRules(domain: ValidationDomain) {
  return sortRules(
    getValidationRuleTemplates(domain)
      .filter((template) => template.includeByDefault !== false)
      .map((template, index) => buildDefaultRule(template, index)),
  );
}

export function createValidationRuleFromTemplate(
  domain: ValidationDomain,
  kind: ValidationRuleKind,
  existingRules: ValidationRuleDefinition[],
) {
  const template = templateForKind(kind);
  if (!template || template.domain !== domain || !template.allowMultiple) return null;

  let suffix = 1;
  let candidate = `${template.kind}-${suffix}`;
  const usedIds = new Set(existingRules.map((rule) => rule.id));
  while (usedIds.has(candidate)) {
    suffix += 1;
    candidate = `${template.kind}-${suffix}`;
  }

  const lastSortOrder =
    existingRules.reduce((max, rule) => Math.max(max, rule.sortOrder), 0) || 0;

  return {
    id: candidate,
    domain,
    kind: template.kind,
    label: template.label,
    description: template.description,
    tone: template.tone,
    enabled: template.enabledByDefault,
    target: template.target,
    sortOrder: lastSortOrder + 10,
    params: defaultParamsForTemplate(template),
    source: "catalog",
  } satisfies ValidationRuleDefinition;
}

function catalogKeyForDomain(domain: ValidationDomain) {
  return VALIDATION_RULE_CATALOGS[domain].key;
}

function catalogItemToRule(
  domain: ValidationDomain,
  row: CatalogItemRow,
  fallbackIndex: number,
) {
  const code = normalizeText(row.code);
  if (!code) return null;
  const metadata =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};
  const kind = normalizeText(metadata.kind || code) as ValidationRuleKind;
  const template = templateForKind(kind);
  if (!template || template.domain !== domain) return null;
  if (!template.allowMultiple && code !== template.kind) return null;

  return {
    id: code,
    domain,
    kind,
    label: normalizeText(row.label) || template.label,
    description: normalizeText(metadata.description) || template.description,
    tone: normalizeTone(metadata.tone, template.tone),
    enabled: typeof row.enabled === "boolean" ? row.enabled : template.enabledByDefault,
    target: normalizeText(metadata.target) || template.target,
    sortOrder:
      typeof row.sort_order === "number" && Number.isFinite(row.sort_order)
        ? row.sort_order
        : (fallbackIndex + 1) * 10,
    params: normalizeRuleParams(template, metadata.params),
    source: "catalog",
  } satisfies ValidationRuleDefinition;
}

function mergeDomainRules(
  domain: ValidationDomain,
  rows: CatalogItemRow[],
) {
  const defaults = getDefaultValidationRules(domain);
  const rowByCode = new Map<string, ValidationRuleDefinition>();
  rows.forEach((row, index) => {
    const code = normalizeText(row.code);
    const rule = catalogItemToRule(domain, row, index);
    if (!code || !rule) return;
    rowByCode.set(code, rule);
  });

  const merged = defaults.map((rule) => rowByCode.get(rule.id) ?? rule);
  const extra = [...rowByCode.values()].filter(
    (rule) => !defaults.some((defaultRule) => defaultRule.id === rule.id),
  );
  return sortRules([...merged, ...extra]);
}

export async function loadValidationRulesForDomain(domain: ValidationDomain) {
  const catalogKey = catalogKeyForDomain(domain);
  try {
    const { data, error } = await supabase
      .from("catalog_items")
      .select("code,label,sort_order,enabled,metadata")
      .eq("catalog_key", catalogKey)
      .order("sort_order", { ascending: true })
      .order("code", { ascending: true });

    if (error) return getDefaultValidationRules(domain);
    return mergeDomainRules(domain, (data as CatalogItemRow[] | null) ?? []);
  } catch {
    return getDefaultValidationRules(domain);
  }
}

export async function loadAllValidationRules() {
  const loaded = await Promise.all(
    VALIDATION_RULE_DOMAINS.map(async (domain) => [
      domain,
      await loadValidationRulesForDomain(domain),
    ] as const),
  );

  return Object.fromEntries(loaded) as Record<
    ValidationDomain,
    ValidationRuleDefinition[]
  >;
}

export async function saveValidationRules(
  rulesByDomain: Record<ValidationDomain, ValidationRuleDefinition[]>,
) {
  const catalogRows = VALIDATION_RULE_DOMAINS.map((domain) => ({
    ...VALIDATION_RULE_CATALOGS[domain],
    is_active: true,
  }));

  const itemRows = VALIDATION_RULE_DOMAINS.flatMap((domain) =>
    sortRules(rulesByDomain[domain] ?? []).map((rule) => ({
      catalog_key: catalogKeyForDomain(domain),
      code: rule.id,
      label: rule.label,
      sort_order: rule.sortOrder,
      enabled: rule.enabled,
      color: null as string | null,
      icon: null as string | null,
      metadata: {
        domain,
        kind: rule.kind,
        tone: rule.tone,
        description: rule.description,
        target: rule.target,
        params: rule.params,
      },
    })),
  );

  const { error: catalogError } = await supabase
    .from("catalogs")
    .upsert(catalogRows, { onConflict: "key" });
  if (catalogError) {
    throw new Error(catalogError.message);
  }

  const { error: itemsError } = await supabase
    .from("catalog_items")
    .upsert(itemRows, { onConflict: "catalog_key,code" });
  if (itemsError) {
    throw new Error(itemsError.message);
  }
}

export function restoreDefaultValidationRules(domain: ValidationDomain) {
  return getDefaultValidationRules(domain);
}
