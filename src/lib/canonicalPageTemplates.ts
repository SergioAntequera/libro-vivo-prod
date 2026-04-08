import type { FlowerFamily } from "@/lib/productDomainContracts";

export type CanonicalPageTemplateCategory = "milestone" | "seasonal" | "personal";

export type CanonicalPageTemplate = {
  code: string;
  label: string;
  emoji: string;
  category: CanonicalPageTemplateCategory;
  suggestedElement: FlowerFamily | null;
  promptHints: string[];
  visualAccent: string;
};

export const CANONICAL_PAGE_TEMPLATES: readonly CanonicalPageTemplate[] = [
  {
    code: "aniversario",
    label: "Aniversario",
    emoji: "\u{1F48D}",
    category: "milestone",
    suggestedElement: "luz",
    promptHints: [
      "\u00BFQu\u00E9 ha cambiado desde el \u00FAltimo aniversario?",
      "\u00BFCu\u00E1l es vuestro mejor recuerdo juntos este a\u00F1o?",
    ],
    visualAccent: "#fff1c5",
  },
  {
    code: "cumpleaños",
    label: "Cumplea\u00F1os",
    emoji: "\u{1F382}",
    category: "milestone",
    suggestedElement: "luz",
    promptHints: [
      "\u00BFC\u00F3mo hab\u00E9is celebrado?",
      "\u00BFQu\u00E9 deseo pediste?",
    ],
    visualAccent: "#ffe8f0",
  },
  {
    code: "san_valentin",
    label: "San Valent\u00EDn",
    emoji: "\u{1F498}",
    category: "seasonal",
    suggestedElement: "fuego",
    promptHints: [
      "\u00BFQu\u00E9 hab\u00E9is hecho hoy?",
      "\u00BFQu\u00E9 es lo que m\u00E1s valoras de vuestra relaci\u00F3n?",
    ],
    visualAccent: "#ffe0e0",
  },
  {
    code: "primera_cita",
    label: "Primera cita",
    emoji: "\u{2728}",
    category: "personal",
    suggestedElement: "estrella",
    promptHints: [
      "\u00BFD\u00F3nde fue?",
      "\u00BFQu\u00E9 sentiste?",
      "\u00BFQu\u00E9 recuerdas m\u00E1s?",
    ],
    visualAccent: "#eadfff",
  },
  {
    code: "primer_viaje",
    label: "Primer viaje juntos",
    emoji: "\u{2708}\uFE0F",
    category: "personal",
    suggestedElement: "aire",
    promptHints: [
      "\u00BFA d\u00F3nde fuisteis?",
      "\u00BFQu\u00E9 descubristeis juntos?",
    ],
    visualAccent: "#e7f5ff",
  },
  {
    code: "mudanza",
    label: "Mudanza",
    emoji: "\u{1F3E0}",
    category: "milestone",
    suggestedElement: "tierra",
    promptHints: [
      "\u00BFC\u00F3mo fue el primer d\u00EDa?",
      "\u00BFQu\u00E9 significa este nuevo hogar?",
    ],
    visualAccent: "#f6e7d1",
  },
  {
    code: "nochevieja",
    label: "Nochevieja",
    emoji: "\u{1F386}",
    category: "seasonal",
    suggestedElement: "luna",
    promptHints: [
      "\u00BFCon qui\u00E9n lo celebrasteis?",
      "\u00BFQu\u00E9 prop\u00F3sitos ten\u00E9is?",
    ],
    visualAccent: "#eef0ff",
  },
] as const;

const templatesByCode = new Map<string, CanonicalPageTemplate>(
  CANONICAL_PAGE_TEMPLATES.map((t) => [t.code, t]),
);

export function getCanonicalPageTemplate(
  code: string,
): CanonicalPageTemplate | null {
  return templatesByCode.get(code.trim().toLowerCase()) ?? null;
}

export function getAllCanonicalPageTemplates(): CanonicalPageTemplate[] {
  return [...CANONICAL_PAGE_TEMPLATES];
}

export function getTemplatesByCategory(
  category: CanonicalPageTemplateCategory,
): CanonicalPageTemplate[] {
  return CANONICAL_PAGE_TEMPLATES.filter((t) => t.category === category);
}

/* ------------------------------------------------------------------ */
/*  Date-based keyword maps for auto-detection                        */
/* ------------------------------------------------------------------ */

const DATE_BASED_TEMPLATES: ReadonlyArray<{
  monthDay: string;
  code: string;
}> = [
  { monthDay: "02-14", code: "san_valentin" },
  { monthDay: "12-31", code: "nochevieja" },
];

const TITLE_KEYWORD_TEMPLATES: ReadonlyArray<{
  keywords: string[];
  code: string;
}> = [
  { keywords: ["aniversario"], code: "aniversario" },
  { keywords: ["cumple", "cumpleaños", "cumplea\u00F1os"], code: "cumpleaños" },
  { keywords: ["san valentin", "san valent\u00EDn", "valent\u00EDn"], code: "san_valentin" },
  { keywords: ["primera cita"], code: "primera_cita" },
  { keywords: ["primer viaje"], code: "primer_viaje" },
  { keywords: ["mudanza", "nuevo hogar", "nueva casa"], code: "mudanza" },
  { keywords: ["nochevieja", "fin de a\u00F1o", "fin de año"], code: "nochevieja" },
];

/**
 * Auto-detect a canonical page template from a date string (YYYY-MM-DD)
 * and/or the page title. Date-based matches take priority.
 */
export function detectCanonicalTemplate(
  date: string,
  title: string,
): CanonicalPageTemplate | null {
  const monthDay = String(date ?? "").slice(5, 10);
  const normalizedTitle = String(title ?? "").trim().toLowerCase();

  // 1. Date-based detection (highest priority)
  for (const entry of DATE_BASED_TEMPLATES) {
    if (monthDay === entry.monthDay) {
      return templatesByCode.get(entry.code) ?? null;
    }
  }

  // 2. Title keyword detection
  if (normalizedTitle) {
    for (const entry of TITLE_KEYWORD_TEMPLATES) {
      for (const keyword of entry.keywords) {
        if (normalizedTitle.includes(keyword)) {
          return templatesByCode.get(entry.code) ?? null;
        }
      }
    }
  }

  return null;
}
