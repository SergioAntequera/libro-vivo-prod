import {
  getElementLabel as getCanonicalElementLabel,
  getElementOrder,
  getElementToken as getCanonicalElementToken,
} from "@/lib/elementsCatalog";

export type SeasonCode = "spring" | "summer" | "autumn" | "winter";
export type ElementCode = string;

export const SEASON_ORDER: SeasonCode[] = [
  "spring",
  "summer",
  "autumn",
  "winter",
];

export const ELEMENT_ORDER: ElementCode[] = getElementOrder() as ElementCode[];

const SEASON_LABELS: Record<SeasonCode, string> = {
  spring: "Primavera",
  summer: "Verano",
  autumn: "Otoño",
  winter: "Invierno",
};

export function getSeasonLabel(code: SeasonCode) {
  return SEASON_LABELS[code];
}

export function getElementLabel(
  code: string | null | undefined,
  fallback = "Sin elemento",
) {
  return getCanonicalElementLabel(code, fallback);
}

export function getElementToken(
  code: string | null | undefined,
  fallback = "?",
) {
  return getCanonicalElementToken(code, fallback);
}
