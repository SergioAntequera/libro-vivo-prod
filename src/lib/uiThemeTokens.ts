import type { CatalogItemConfig } from "@/lib/appConfig";

export const UI_THEME_TOKEN_CATALOG_KEY = "ui_theme_tokens";

export const UI_THEME_TOKEN_GROUPS = [
  { key: "surface", label: "Superficie" },
  { key: "text", label: "Texto" },
  { key: "primary", label: "Primario" },
  { key: "semantic", label: "Estados" },
  { key: "shape", label: "Forma" },
  { key: "depth", label: "Profundidad" },
  { key: "feedback", label: "Feedback" },
  { key: "map", label: "Mapa" },
] as const;

export type UiThemeTokenGroupKey = (typeof UI_THEME_TOKEN_GROUPS)[number]["key"];
export type UiThemeTokenKind = "color" | "length" | "shadow";

type UiThemeTokenDefinition = {
  code: string;
  cssVar: string;
  label: string;
  group: UiThemeTokenGroupKey;
  kind: UiThemeTokenKind;
  defaultValue: string;
  hint: string;
};

export const UI_THEME_TOKEN_DEFINITIONS = [
  {
    code: "lv_bg",
    cssVar: "--lv-bg",
    label: "Fondo base",
    group: "surface",
    kind: "color",
    defaultValue: "#f7f9f4",
    hint: "Color principal del fondo global.",
  },
  {
    code: "lv_bg_soft",
    cssVar: "--lv-bg-soft",
    label: "Fondo suave",
    group: "surface",
    kind: "color",
    defaultValue: "#edf3e8",
    hint: "Fondo alternativo para secciones blandas.",
  },
  {
    code: "lv_surface",
    cssVar: "--lv-surface",
    label: "Superficie principal",
    group: "surface",
    kind: "color",
    defaultValue: "#ffffff",
    hint: "Tarjetas, paneles y modales principales.",
  },
  {
    code: "lv_surface_soft",
    cssVar: "--lv-surface-soft",
    label: "Superficie secundaria",
    group: "surface",
    kind: "color",
    defaultValue: "#f7fbff",
    hint: "Variantes suaves para bloques secundarios.",
  },
  {
    code: "lv_border",
    cssVar: "--lv-border",
    label: "Borde base",
    group: "surface",
    kind: "color",
    defaultValue: "#cfd9cb",
    hint: "Contornos por defecto del shell.",
  },
  {
    code: "lv_border_strong",
    cssVar: "--lv-border-strong",
    label: "Borde fuerte",
    group: "surface",
    kind: "color",
    defaultValue: "#aebca8",
    hint: "Bordes de inputs y acciones secundarias.",
  },
  {
    code: "lv_text",
    cssVar: "--lv-text",
    label: "Texto principal",
    group: "text",
    kind: "color",
    defaultValue: "#1b2518",
    hint: "Titulares y contenido principal.",
  },
  {
    code: "lv_text_muted",
    cssVar: "--lv-text-muted",
    label: "Texto secundario",
    group: "text",
    kind: "color",
    defaultValue: "#5c685a",
    hint: "Ayudas, subtitulos y copy auxiliar.",
  },
  {
    code: "lv_focus",
    cssVar: "--lv-focus",
    label: "Focus",
    group: "text",
    kind: "color",
    defaultValue: "#4f76cf",
    hint: "Anillo visible al enfocar elementos interactivos.",
  },
  {
    code: "lv_primary",
    cssVar: "--lv-primary",
    label: "Primario",
    group: "primary",
    kind: "color",
    defaultValue: "#2f5f44",
    hint: "Acción principal compartida.",
  },
  {
    code: "lv_primary_strong",
    cssVar: "--lv-primary-strong",
    label: "Primario fuerte",
    group: "primary",
    kind: "color",
    defaultValue: "#214530",
    hint: "Hover o variante intensa del primario.",
  },
  {
    code: "lv_primary_soft",
    cssVar: "--lv-primary-soft",
    label: "Primario suave",
    group: "primary",
    kind: "color",
    defaultValue: "#e6f2eb",
    hint: "Fondos suaves ligados al primario.",
  },
  {
    code: "lv_success",
    cssVar: "--lv-success",
    label: "Exito",
    group: "semantic",
    kind: "color",
    defaultValue: "#1f6b36",
    hint: "Mensajes y estados positivos.",
  },
  {
    code: "lv_success_soft",
    cssVar: "--lv-success-soft",
    label: "Exito suave",
    group: "semantic",
    kind: "color",
    defaultValue: "#effbf2",
    hint: "Fondo suave de éxito.",
  },
  {
    code: "lv_info",
    cssVar: "--lv-info",
    label: "Info",
    group: "semantic",
    kind: "color",
    defaultValue: "#1f4e84",
    hint: "Mensajes informativos y estado neutro.",
  },
  {
    code: "lv_info_soft",
    cssVar: "--lv-info-soft",
    label: "Info suave",
    group: "semantic",
    kind: "color",
    defaultValue: "#f1f7ff",
    hint: "Fondo suave de información.",
  },
  {
    code: "lv_warning",
    cssVar: "--lv-warning",
    label: "Warning",
    group: "semantic",
    kind: "color",
    defaultValue: "#8f6b1f",
    hint: "Avisos o situaciones a revisar.",
  },
  {
    code: "lv_warning_soft",
    cssVar: "--lv-warning-soft",
    label: "Warning suave",
    group: "semantic",
    kind: "color",
    defaultValue: "#fff8e9",
    hint: "Fondo suave de warning.",
  },
  {
    code: "lv_danger",
    cssVar: "--lv-danger",
    label: "Peligro",
    group: "semantic",
    kind: "color",
    defaultValue: "#b33d3d",
    hint: "Errores, borrado y alertas criticas.",
  },
  {
    code: "lv_danger_soft",
    cssVar: "--lv-danger-soft",
    label: "Peligro suave",
    group: "semantic",
    kind: "color",
    defaultValue: "#fff4f4",
    hint: "Fondo suave de peligro.",
  },
  {
    code: "lv_radius_xs",
    cssVar: "--lv-radius-xs",
    label: "Radio XS",
    group: "shape",
    kind: "length",
    defaultValue: "10px",
    hint: "Detalles compactos, chips o mini indicadores.",
  },
  {
    code: "lv_radius_sm",
    cssVar: "--lv-radius-sm",
    label: "Radio SM",
    group: "shape",
    kind: "length",
    defaultValue: "14px",
    hint: "Inputs, botones y paneles pequenos.",
  },
  {
    code: "lv_radius_md",
    cssVar: "--lv-radius-md",
    label: "Radio MD",
    group: "shape",
    kind: "length",
    defaultValue: "18px",
    hint: "Cards medias, overlays y popups.",
  },
  {
    code: "lv_radius_lg",
    cssVar: "--lv-radius-lg",
    label: "Radio LG",
    group: "shape",
    kind: "length",
    defaultValue: "24px",
    hint: "Cards grandes, modales y shell protagonista.",
  },
  {
    code: "lv_shadow_sm",
    cssVar: "--lv-shadow-sm",
    label: "Sombra suave",
    group: "depth",
    kind: "shadow",
    defaultValue: "0 6px 16px rgba(28, 52, 39, 0.08)",
    hint: "Elevacion ligera para botones y tarjetas base.",
  },
  {
    code: "lv_shadow_md",
    cssVar: "--lv-shadow-md",
    label: "Sombra media",
    group: "depth",
    kind: "shadow",
    defaultValue: "0 12px 30px rgba(28, 52, 39, 0.14)",
    hint: "Elevacion de modales, paneles y popups.",
  },
  {
    code: "lv_overlay_scrim",
    cssVar: "--lv-overlay-scrim",
    label: "Overlay modal",
    group: "feedback",
    kind: "color",
    defaultValue: "rgba(12, 18, 14, 0.52)",
    hint: "Cortina de fondo de modales y capas bloqueantes.",
  },
  {
    code: "lv_progress_track",
    cssVar: "--lv-progress-track",
    label: "Track de progreso",
    group: "feedback",
    kind: "color",
    defaultValue: "#d5e3f6",
    hint: "Base de barras de progreso y cargas.",
  },
  {
    code: "lv_progress_fill",
    cssVar: "--lv-progress-fill",
    label: "Fill de progreso",
    group: "feedback",
    kind: "color",
    defaultValue: "#6ca8f0",
    hint: "Relleno activo de barras de progreso.",
  },
  {
    code: "lv_map_chrome_bg",
    cssVar: "--lv-map-chrome-bg",
    label: "Chrome mapa fondo",
    group: "map",
    kind: "color",
    defaultValue: "rgba(255, 255, 255, 0.92)",
    hint: "Fondo de controles y overlays de mapa.",
  },
  {
    code: "lv_map_chrome_border",
    cssVar: "--lv-map-chrome-border",
    label: "Chrome mapa borde",
    group: "map",
    kind: "color",
    defaultValue: "rgba(255, 255, 255, 0.72)",
    hint: "Borde del chrome del mapa.",
  },
  {
    code: "lv_map_chrome_text",
    cssVar: "--lv-map-chrome-text",
    label: "Chrome mapa texto",
    group: "map",
    kind: "color",
    defaultValue: "#566259",
    hint: "Texto de controles y atribucion del mapa.",
  },
  {
    code: "lv_map_chrome_shadow",
    cssVar: "--lv-map-chrome-shadow",
    label: "Chrome mapa sombra",
    group: "map",
    kind: "shadow",
    defaultValue: "0 10px 24px rgba(15, 23, 42, 0.14)",
    hint: "Sombra del chrome del mapa y overlays flotantes.",
  },
] as const satisfies readonly UiThemeTokenDefinition[];

export type UiThemeTokenCode = (typeof UI_THEME_TOKEN_DEFINITIONS)[number]["code"];

export const UI_THEME_TOKEN_TO_CSS_VAR = Object.fromEntries(
  UI_THEME_TOKEN_DEFINITIONS.map((definition) => [definition.code, definition.cssVar]),
) as Record<UiThemeTokenCode, string>;

export const UI_THEME_TOKEN_DEFAULTS = Object.fromEntries(
  UI_THEME_TOKEN_DEFINITIONS.map((definition) => [definition.code, definition.defaultValue]),
) as Record<UiThemeTokenCode, string>;

export const UI_THEME_TOKEN_LABELS = Object.fromEntries(
  UI_THEME_TOKEN_DEFINITIONS.map((definition) => [definition.code, definition.label]),
) as Record<UiThemeTokenCode, string>;

export const UI_THEME_TOKEN_KINDS = Object.fromEntries(
  UI_THEME_TOKEN_DEFINITIONS.map((definition) => [definition.code, definition.kind]),
) as Record<UiThemeTokenCode, UiThemeTokenKind>;

export const UI_THEME_TOKEN_HINTS = Object.fromEntries(
  UI_THEME_TOKEN_DEFINITIONS.map((definition) => [definition.code, definition.hint]),
) as Record<UiThemeTokenCode, string>;

export const UI_THEME_TOKEN_GROUP_BY_CODE = Object.fromEntries(
  UI_THEME_TOKEN_DEFINITIONS.map((definition) => [definition.code, definition.group]),
) as Record<UiThemeTokenCode, UiThemeTokenGroupKey>;

const UI_THEME_TOKEN_DEFINITION_BY_CODE = Object.fromEntries(
  UI_THEME_TOKEN_DEFINITIONS.map((definition) => [definition.code, definition]),
) as Record<UiThemeTokenCode, (typeof UI_THEME_TOKEN_DEFINITIONS)[number]>;

function isUiThemeTokenCode(value: string): value is UiThemeTokenCode {
  return Object.prototype.hasOwnProperty.call(UI_THEME_TOKEN_TO_CSS_VAR, value);
}

function supportsCssProperty(property: string, value: string) {
  if (typeof CSS === "undefined" || typeof CSS.supports !== "function") return null;
  return CSS.supports(property, value);
}

function isSafeCssValue(kind: UiThemeTokenKind, value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 180) return false;

  if (kind === "color") {
    const supported = supportsCssProperty("color", trimmed);
    if (supported !== null) return supported;
    return (
      /^#[0-9a-fA-F]{3,8}$/.test(trimmed) ||
      /^rgba?\(([^)]+)\)$/.test(trimmed) ||
      /^hsla?\(([^)]+)\)$/.test(trimmed) ||
      /^var\(--[a-z0-9-]+\)$/i.test(trimmed) ||
      /^[a-zA-Z][a-zA-Z0-9-]{1,40}$/.test(trimmed)
    );
  }

  if (kind === "length") {
    const supported = supportsCssProperty("border-radius", trimmed);
    if (supported !== null) return supported;
    return /^0$|^-?\d*\.?\d+(px|rem|em|%)$/i.test(trimmed);
  }

  const supported = supportsCssProperty("box-shadow", trimmed);
  if (supported !== null) return supported;
  return trimmed === "none" || /^[#(),.%\sa-zA-Z0-9-]+$/.test(trimmed);
}

function extractTokenRawValue(item: CatalogItemConfig) {
  if (typeof item.color === "string" && item.color.trim()) return item.color.trim();

  const metadataValue =
    item.metadata && typeof item.metadata === "object"
      ? (item.metadata as Record<string, unknown>).value
      : null;
  if (typeof metadataValue === "string" && metadataValue.trim()) {
    return metadataValue.trim();
  }

  if (typeof item.icon === "string" && item.icon.trim()) return item.icon.trim();
  return null;
}

export function getUiThemeTokenDefinition(code: UiThemeTokenCode) {
  return UI_THEME_TOKEN_DEFINITION_BY_CODE[code];
}

export function resolveUiThemeCssVars(items: CatalogItemConfig[]) {
  const out: Record<string, string> = {};

  for (const item of items ?? []) {
    const code = String(item.code ?? "").trim().toLowerCase();
    if (!isUiThemeTokenCode(code)) continue;

    const rawValue = extractTokenRawValue(item);
    const definition = getUiThemeTokenDefinition(code);
    if (!rawValue || !isSafeCssValue(definition.kind, rawValue)) continue;

    const cssVar = UI_THEME_TOKEN_TO_CSS_VAR[code];
    out[cssVar] = rawValue;
  }

  return out;
}

export function getUiThemeTokenCatalogCodeHints() {
  return UI_THEME_TOKEN_DEFINITIONS.map((definition) => definition.code);
}
