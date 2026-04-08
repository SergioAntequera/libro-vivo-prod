import { getCatalogItems, getFallbackCatalogItems, type CatalogItemConfig } from "@/lib/appConfig";
import type { ElementKind } from "@/lib/canvasTypes";

export const KNOWN_ELEMENT_KINDS = [
  "fire",
  "water",
  "air",
  "earth",
  "aether",
] as const;

export type KnownElementKind = (typeof KNOWN_ELEMENT_KINDS)[number];

export type ElementCatalogItem = CatalogItemConfig & {
  code: ElementKind;
  emoji: string;
  token: string;
};

const DEFAULT_ELEMENT_TOKENS: Record<KnownElementKind, string> = {
  fire: "F",
  water: "A",
  air: "Ai",
  earth: "T",
  aether: "E",
};

const DEFAULT_ELEMENT_LABELS: Record<KnownElementKind, string> = {
  fire: "Fuego",
  water: "Agua",
  air: "Aire",
  earth: "Tierra",
  aether: "Eter",
};

const DEFAULT_ELEMENT_COLORS: Record<KnownElementKind, string> = {
  fire: "#ffd8d0",
  water: "#d8ecff",
  air: "#e7f5ff",
  earth: "#f6e7d1",
  aether: "#efe4ff",
};

const DEFAULT_ELEMENT_EMOJIS: Record<KnownElementKind, string> = {
  fire: "\uD83D\uDD25",
  water: "\uD83D\uDCA7",
  air: "\uD83C\uDF2C",
  earth: "\uD83C\uDF31",
  aether: "\uD83C\uDF0C",
};

export function isKnownElementKind(value: unknown): value is KnownElementKind {
  const raw = String(value ?? "").trim().toLowerCase();
  return KNOWN_ELEMENT_KINDS.some((item) => item === raw);
}

export function normalizeKnownElementKind(value: unknown): KnownElementKind {
  const raw = String(value ?? "").trim().toLowerCase();
  return isKnownElementKind(raw) ? raw : "aether";
}

export function normalizeElementCode(value: unknown): ElementKind {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "aether";
  return (
    raw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "aether"
  );
}

export function humanizeElementCode(value: string | null | undefined, fallback = "Sin elemento") {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function hslToHex(hue: number, saturation: number, lightness: number) {
  const sat = saturation / 100;
  const light = lightness / 100;
  const chroma = (1 - Math.abs(2 * light - 1)) * sat;
  const huePrime = hue / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime >= 0 && huePrime < 1) {
    red = chroma;
    green = x;
  } else if (huePrime < 2) {
    red = x;
    green = chroma;
  } else if (huePrime < 3) {
    green = chroma;
    blue = x;
  } else if (huePrime < 4) {
    green = x;
    blue = chroma;
  } else if (huePrime < 5) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  const match = light - chroma / 2;
  const toHex = (value: number) =>
    Math.round((value + match) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function buildDynamicElementColor(code: string) {
  const hue = hashString(code) % 360;
  return hslToHex(hue, 72, 84);
}

function getDefaultElementSortOrder(code: string) {
  const knownIndex = KNOWN_ELEMENT_KINDS.findIndex((item) => item === code);
  if (knownIndex >= 0) return (knownIndex + 1) * 10;
  return 100 + (hashString(code) % 900);
}

function normalizeElementCatalogItem(input: CatalogItemConfig): ElementCatalogItem | null {
  const code = normalizeElementCode(input.code);
  if (!code) return null;
  const known = isKnownElementKind(code) ? code : null;

  return {
    ...input,
    code,
    label:
      String(input.label ?? "").trim() ||
      (known ? DEFAULT_ELEMENT_LABELS[known] : humanizeElementCode(code, code)),
    sortOrder: Number.isFinite(Number(input.sortOrder))
      ? Number(input.sortOrder)
      : getDefaultElementSortOrder(code),
    enabled: typeof input.enabled === "boolean" ? input.enabled : true,
    color:
      String(input.color ?? "").trim() ||
      (known ? DEFAULT_ELEMENT_COLORS[known] : buildDynamicElementColor(code)),
    emoji:
      typeof input.metadata?.emoji === "string" && String(input.metadata.emoji).trim()
        ? String(input.metadata.emoji).trim()
        : known
          ? DEFAULT_ELEMENT_EMOJIS[known]
          : "\u2728",
    token:
      typeof input.metadata?.token === "string" && String(input.metadata.token).trim()
        ? String(input.metadata.token).trim()
        : known
          ? DEFAULT_ELEMENT_TOKENS[known]
          : humanizeElementCode(code, "")
              .slice(0, 2)
              .toUpperCase() || "?",
  };
}

export function getFallbackElementCatalogItems(): ElementCatalogItem[] {
  return getFallbackCatalogItems("elements")
    .map(normalizeElementCatalogItem)
    .filter(Boolean) as ElementCatalogItem[];
}

export async function getCanonicalElementCatalogItems(): Promise<ElementCatalogItem[]> {
  const rows = await getCatalogItems("elements");
  const normalized = rows
    .map(normalizeElementCatalogItem)
    .filter(Boolean) as ElementCatalogItem[];

  const merged = new Map<string, ElementCatalogItem>();
  for (const row of getFallbackElementCatalogItems()) {
    merged.set(row.code, row);
  }
  for (const row of normalized) {
    merged.set(row.code, row);
  }

  return [...merged.values()].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
    return left.label.localeCompare(right.label, "es");
  });
}

export function getElementOrder(options?: { includeAether?: boolean }) {
  const includeAether = options?.includeAether ?? true;
  return includeAether
    ? [...KNOWN_ELEMENT_KINDS]
    : KNOWN_ELEMENT_KINDS.filter((item) => item !== "aether");
}

export function getElementLabel(
  code: string | null | undefined,
  fallback = "Sin elemento",
) {
  if (!code) return fallback;
  if (isKnownElementKind(code)) return DEFAULT_ELEMENT_LABELS[code] ?? fallback;
  return humanizeElementCode(code, fallback);
}

export function getElementToken(
  code: string | null | undefined,
  fallback = "?",
) {
  if (!code) return fallback;
  if (isKnownElementKind(code)) return DEFAULT_ELEMENT_TOKENS[code] ?? fallback;
  const humanized = humanizeElementCode(code, "");
  return humanized ? humanized.slice(0, 2).toUpperCase() : fallback;
}

export function getElementColor(
  code: string | null | undefined,
  fallback = "#efe4ff",
) {
  if (!code) return fallback;
  if (isKnownElementKind(code)) return DEFAULT_ELEMENT_COLORS[code] ?? fallback;
  return buildDynamicElementColor(code);
}
