import { rgb, type PDFImage } from "pdf-lib";
import type { AnnualBookPageItem, AnnualBookReflection } from "@/lib/annualBookModel";
import { FLOWER_FAMILY_LABELS } from "@/lib/productDomainContracts";
import {
  drawCard,
  drawFlower,
  drawWrappedText,
} from "@/lib/yearPdfExportHelpers";

export function specialMomentTemplateKey(kind: AnnualBookPageItem["specialMomentKind"]) {
  if (kind === "anniversary") return "special_label_anniversary";
  if (kind === "valentine") return "special_label_valentine";
  if (kind === "birthday") return "special_label_birthday";
  if (kind === "trip") return "special_label_trip";
  if (kind === "first_date") return "special_label_first_date";
  if (kind === "moving") return "special_label_moving";
  if (kind === "new_year") return "special_label_new_year";
  return null;
}

export function joinMeta(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" - ");
}

export function editorialMemoryTitle(item: Pick<AnnualBookPageItem, "title" | "planTypeLabel" | "locationLabel" | "date">) {
  const raw = String(item.title ?? "").trim();
  const fallback =
    joinMeta([item.planTypeLabel, item.locationLabel]) || `Flor del ${item.date.slice(0, 10)}`;

  if (!raw) return fallback;
  if (/^\[(forest|home|map|page|seed|year|trail)/i.test(raw)) return fallback;
  if (/^20\d{2}\s*#\d+/i.test(raw)) return fallback;
  if (/^e2e[-_]/i.test(raw)) return fallback;
  if (/^[A-Z0-9_-]{16,}$/i.test(raw)) return fallback;
  if (/\d{10,}/.test(raw)) return fallback;
  return raw;
}

export function firstNonEmptyText(parts: Array<string | null | undefined>) {
  for (const part of parts) {
    const value = String(part ?? "").trim();
    if (value) return value;
  }
  return null;
}

export function buildReflectionExcerpt(reflection: AnnualBookReflection) {
  const pieces = [
    firstNonEmptyText([reflection.favoritePart, reflection.rememberedMoment]),
    firstNonEmptyText([
      reflection.whatIFelt,
      reflection.whatItMeantToMe,
      reflection.whatIDiscoveredAboutYou,
      reflection.smallPromise,
    ]),
  ].filter(Boolean) as string[];

  return pieces.join(" ");
}

export function buildCanvasSummaryCopy(item: AnnualBookPageItem) {
  const parts: string[] = [];
  if (item.canvasSummary.photoCount > 0) {
    parts.push(
      `${item.canvasSummary.photoCount} foto${item.canvasSummary.photoCount === 1 ? "" : "s"}`,
    );
  }
  if (item.canvasSummary.videoCount > 0) {
    parts.push(
      `${item.canvasSummary.videoCount} video${item.canvasSummary.videoCount === 1 ? "" : "s"}`,
    );
  }
  if (item.canvasSummary.stickerCount > 0) {
    parts.push(
      `${item.canvasSummary.stickerCount} sticker${item.canvasSummary.stickerCount === 1 ? "" : "s"}`,
    );
  }
  if (item.canvasSummary.textCount > 0) {
    parts.push(
      `${item.canvasSummary.textCount} texto${item.canvasSummary.textCount === 1 ? "" : "s"}`,
    );
  }

  const captions = [
    ...item.canvasSummary.photoCaptions,
    ...item.canvasSummary.videoCaptions,
    ...item.canvasSummary.textSnippets,
  ]
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean);

  return {
    counts:
      parts.join(" - ") ||
      "Lienzo sencillo, sin demasiadas capas, guardado como huella limpia del recuerdo.",
    excerpt: captions[0] ?? null,
    secondaryExcerpt: captions[1] ?? null,
  };
}

export function flowerFamilyPalette(family: AnnualBookPageItem["flowerFamily"]) {
  if (family === "agua") {
    return {
      card: rgb(0.95, 0.98, 1),
      border: rgb(0.83, 0.9, 0.97),
      petal: rgb(0.76, 0.9, 1),
      center: rgb(0.43, 0.67, 0.88),
      text: rgb(0.19, 0.32, 0.46),
    };
  }
  if (family === "fuego") {
    return {
      card: rgb(1, 0.96, 0.93),
      border: rgb(0.97, 0.86, 0.79),
      petal: rgb(0.99, 0.77, 0.62),
      center: rgb(0.87, 0.42, 0.18),
      text: rgb(0.43, 0.23, 0.15),
    };
  }
  if (family === "tierra") {
    return {
      card: rgb(0.97, 0.97, 0.93),
      border: rgb(0.87, 0.89, 0.8),
      petal: rgb(0.91, 0.84, 0.54),
      center: rgb(0.47, 0.34, 0.16),
      text: rgb(0.34, 0.27, 0.15),
    };
  }
  if (family === "aire") {
    return {
      card: rgb(0.95, 0.98, 1),
      border: rgb(0.85, 0.9, 0.96),
      petal: rgb(0.84, 0.93, 1),
      center: rgb(0.54, 0.67, 0.86),
      text: rgb(0.26, 0.35, 0.47),
    };
  }
  if (family === "luz") {
    return {
      card: rgb(1, 0.98, 0.92),
      border: rgb(0.96, 0.9, 0.72),
      petal: rgb(1, 0.89, 0.58),
      center: rgb(0.95, 0.71, 0.22),
      text: rgb(0.46, 0.33, 0.08),
    };
  }
  if (family === "luna") {
    return {
      card: rgb(0.96, 0.95, 1),
      border: rgb(0.87, 0.84, 0.96),
      petal: rgb(0.87, 0.82, 1),
      center: rgb(0.5, 0.45, 0.77),
      text: rgb(0.31, 0.24, 0.5),
    };
  }
  return {
    card: rgb(0.98, 0.97, 1),
    border: rgb(0.9, 0.86, 0.96),
    petal: rgb(0.95, 0.85, 1),
    center: rgb(0.62, 0.46, 0.86),
    text: rgb(0.34, 0.25, 0.53),
  };
}

export function drawFlowerFamilyCard(
  page: Parameters<typeof drawCard>[0],
  font: Parameters<typeof drawWrappedText>[1],
  fontBold: Parameters<typeof drawWrappedText>[1],
  family: AnnualBookPageItem["flowerFamily"],
  x: number,
  y: number,
  width: number,
  height: number,
  label: string | null,
  supportingText?: string | null,
) {
  const palette = flowerFamilyPalette(family);
  drawCard(page, x, y, width, height, palette.card, palette.border);
  drawFlower(
    page,
    x + width / 2,
    y + height / 2 + 6,
    Math.min(width, height) * 0.42,
    palette.petal,
    palette.center,
  );
  drawWrappedText(page, fontBold, `Flor ${FLOWER_FAMILY_LABELS[family]}`, {
    x: x + 14,
    y: y + height - 26,
    maxWidth: width - 28,
    fontSize: 12,
    lineHeight: 14,
    maxLines: 2,
    color: palette.text,
  });
  if (label) {
    drawWrappedText(page, font, label, {
      x: x + 14,
      y: y + 28,
      maxWidth: width - 28,
      fontSize: 9,
      lineHeight: 12,
      maxLines: 2,
      color: rgb(0.34, 0.36, 0.39),
    });
  } else if (supportingText) {
    drawWrappedText(page, font, supportingText, {
      x: x + 14,
      y: y + 28,
      maxWidth: width - 28,
      fontSize: 9,
      lineHeight: 12,
      maxLines: 2,
      color: rgb(0.34, 0.36, 0.39),
    });
  }
}

export function drawCompactQrCard(
  page: Parameters<typeof drawCard>[0],
  font: Parameters<typeof drawWrappedText>[1],
  qrImg: PDFImage,
  x: number,
  y: number,
  label: string,
) {
  drawCard(page, x, y, 112, 92, rgb(1, 1, 1), rgb(0.88, 0.88, 0.88));
  page.drawImage(qrImg, { x: x + 26, y: y + 22, width: 60, height: 60 });
  drawWrappedText(page, font, label, {
    x: x + 10,
    y: y + 14,
    maxWidth: 92,
    fontSize: 8,
    lineHeight: 10,
    maxLines: 2,
    color: rgb(0.33, 0.33, 0.33),
  });
}

export type GeoHighlight = {
  key: string;
  label: string;
  lat: number | null;
  lng: number | null;
  count: number;
  favoriteCount: number;
  firstDate: string;
  lastDate: string;
  planTypes: string[];
};

export function editorialLocationLabel(raw: string | null | undefined) {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return value;
  return parts.slice(0, Math.min(2, parts.length)).join(", ");
}

export function monthLabelFromIso(value: string) {
  const month = Number(String(value).slice(5, 7));
  const names = [
    "",
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  return names[month] || String(value).slice(5, 7);
}

export function shortClaimDate(value: string | null | undefined) {
  const safe = String(value ?? "").trim();
  return safe ? safe.slice(0, 10) : "Sin fecha";
}

export function buildGeoHighlights(items: AnnualBookPageItem[]): GeoHighlight[] {
  const map = new Map<string, GeoHighlight>();
  for (const item of items) {
    const label = editorialLocationLabel(item.locationLabel);
    const lat =
      typeof item.location_lat === "number" && Number.isFinite(item.location_lat)
        ? item.location_lat
        : null;
    const lng =
      typeof item.location_lng === "number" && Number.isFinite(item.location_lng)
        ? item.location_lng
        : null;
    if (!label && lat == null && lng == null) continue;
    const key =
      lat != null && lng != null
        ? `${lat.toFixed(3)}:${lng.toFixed(3)}`
        : `label:${String(label ?? "").toLowerCase()}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      if (item.is_favorite) existing.favoriteCount += 1;
      if (item.date < existing.firstDate) existing.firstDate = item.date;
      if (item.date > existing.lastDate) existing.lastDate = item.date;
      if (item.planTypeLabel && !existing.planTypes.includes(item.planTypeLabel)) {
        existing.planTypes.push(item.planTypeLabel);
      }
      continue;
    }
    map.set(key, {
      key,
      label: label || `Punto ${map.size + 1}`,
      lat,
      lng,
      count: 1,
      favoriteCount: item.is_favorite ? 1 : 0,
      firstDate: item.date,
      lastDate: item.date,
      planTypes: item.planTypeLabel ? [item.planTypeLabel] : [],
    });
  }

  return Array.from(map.values()).sort((left, right) => {
    const favoriteDelta = right.favoriteCount - left.favoriteCount;
    if (favoriteDelta !== 0) return favoriteDelta;
    const countDelta = right.count - left.count;
    if (countDelta !== 0) return countDelta;
    return left.firstDate.localeCompare(right.firstDate);
  });
}

export function drawGeoConstellation(
  page: Parameters<typeof drawCard>[0],
  points: GeoHighlight[],
  x: number,
  y: number,
  width: number,
  height: number,
  accent: ReturnType<typeof rgb>,
) {
  const valid = points.filter((point) => point.lat != null && point.lng != null);
  if (valid.length < 2) return false;
  const minLat = Math.min(...valid.map((point) => point.lat as number));
  const maxLat = Math.max(...valid.map((point) => point.lat as number));
  const minLng = Math.min(...valid.map((point) => point.lng as number));
  const maxLng = Math.max(...valid.map((point) => point.lng as number));
  const latSpan = Math.max(0.01, maxLat - minLat);
  const lngSpan = Math.max(0.01, maxLng - minLng);
  const coords = valid.map((point) => ({
    point,
    px: x + 18 + (((point.lng as number) - minLng) / lngSpan) * (width - 36),
    py: y + 18 + (((point.lat as number) - minLat) / latSpan) * (height - 36),
  }));

  for (let index = 1; index < coords.length; index += 1) {
    page.drawLine({
      start: { x: coords[index - 1].px, y: coords[index - 1].py },
      end: { x: coords[index].px, y: coords[index].py },
      thickness: 1,
      color: rgb(accent.red, accent.green, accent.blue),
      opacity: 0.3,
    });
  }

  coords.forEach(({ point, px, py }) => {
    const radius = Math.min(8, 3.6 + point.count * 0.6);
    page.drawCircle({
      x: px,
      y: py,
      size: radius,
      color: rgb(1, 1, 1),
      borderColor: accent,
      borderWidth: 1.2,
    });
    if (point.favoriteCount > 0) {
      page.drawCircle({
        x: px,
        y: py,
        size: Math.max(1.4, radius / 3),
        color: accent,
      });
    }
  });

  return true;
}

export function specialMomentPalette(kind: AnnualBookPageItem["specialMomentKind"]) {
  if (kind === "anniversary") {
    return {
      soft: rgb(1, 0.96, 0.92),
      accent: rgb(0.67, 0.46, 0.24),
      ink: rgb(0.32, 0.24, 0.18),
    };
  }
  if (kind === "valentine") {
    return {
      soft: rgb(1, 0.94, 0.95),
      accent: rgb(0.71, 0.3, 0.38),
      ink: rgb(0.34, 0.2, 0.24),
    };
  }
  if (kind === "birthday") {
    return {
      soft: rgb(1, 0.97, 0.9),
      accent: rgb(0.73, 0.5, 0.18),
      ink: rgb(0.35, 0.26, 0.16),
    };
  }
  if (kind === "trip") {
    return {
      soft: rgb(0.93, 0.97, 1),
      accent: rgb(0.29, 0.47, 0.7),
      ink: rgb(0.19, 0.27, 0.36),
    };
  }
  if (kind === "first_date") {
    return {
      soft: rgb(0.95, 0.93, 1),
      accent: rgb(0.52, 0.38, 0.72),
      ink: rgb(0.28, 0.22, 0.38),
    };
  }
  if (kind === "moving") {
    return {
      soft: rgb(0.97, 0.95, 0.9),
      accent: rgb(0.58, 0.44, 0.24),
      ink: rgb(0.32, 0.26, 0.18),
    };
  }
  if (kind === "new_year") {
    return {
      soft: rgb(0.93, 0.94, 1),
      accent: rgb(0.34, 0.38, 0.65),
      ink: rgb(0.2, 0.22, 0.36),
    };
  }
  return {
    soft: rgb(0.94, 0.96, 0.95),
    accent: rgb(0.38, 0.52, 0.42),
    ink: rgb(0.22, 0.28, 0.24),
  };
}
