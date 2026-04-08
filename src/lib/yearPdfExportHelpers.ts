import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import type { CanvasObject } from "@/lib/canvasTypes";
import {
  importanceScaleForMilestoneTree,
  normalizeProgressionTreeRank,
  normalizeProgressionTreeRarity,
  progressionTreeRankPalette,
  progressionTreeRarityConfig,
} from "@/lib/progressionTreeVisuals";
import type { ProgressionTreeImportance } from "@/lib/progressionGraph";
import type {
  ProgressionTreeRank,
  ProgressionTreeRarity,
} from "@/lib/progressionTreeVisuals";
export type Season = "spring" | "summer" | "autumn" | "winter";

export type ExportItem = {
  id: string;
  title: string | null;
  date: string;
  element: "fire" | "water" | "air" | "earth" | "aether" | string;
  plan_type_id?: string | null;
  plan_summary?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  location_label?: string | null;
  rating: number | null;
  mood_state: "wilted" | "healthy" | "shiny" | string;
  thumbnail_url: string | null;
  cover_photo_url: string | null;
  canvas_objects: CanvasObject[] | null;
  audio_url: string | null;
  audio_label?: string | null;
  is_favorite: boolean | null;
};

export type CanvasSummary = {
  photoCount: number;
  videoCount: number;
  stickerCount: number;
  textCount: number;
  textSnippets: string[];
  photoCaptions: string[];
  videoCaptions: string[];
};

export type ImageAsset = {
  bytes: Uint8Array;
  contentType: string;
};

export type YearNoteRow = {
  note: string | null;
  cover_url: string | null;
};

export type SeasonNoteRow = {
  season: Season;
  note: string | null;
};

export const PAGE_W = 595.28;
export const PAGE_H = 841.89;
export const MARGIN = 40;

export { toErrorMessage } from "@/lib/errorMessage";

export function hexToRgb(value: string) {
  const v = value.trim();
  const m = /^#([0-9a-fA-F]{6})$/.exec(v);
  if (!m) return rgb(1, 1, 1);
  const n = m[1];
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

export function pickHexColor(value: string | undefined, fallback: string) {
  if (typeof value !== "string") return fallback;
  const next = value.trim();
  return /^#([0-9a-fA-F]{6})$/.test(next) ? next : fallback;
}

export function assetColor(
  assets: Record<string, string>,
  assetKey: string,
  fallback: string,
) {
  return hexToRgb(pickHexColor(assets[assetKey], fallback));
}

export function resolveThemeFontPath(raw: string | undefined, fallbackRelativePublicPath: string) {
  const fallbackPath = path.join(process.cwd(), "public", fallbackRelativePublicPath);
  const value = String(raw ?? "").trim();
  if (!value) return fallbackPath;

  if (path.isAbsolute(value)) return value;

  const normalized = value.replace(/\//g, path.sep).replace(/\\/g, path.sep);
  if (normalized.startsWith(`public${path.sep}`)) {
    return path.join(process.cwd(), normalized);
  }

  return path.join(process.cwd(), "public", normalized.replace(/^[\\/]+/, ""));
}

export async function loadPdfFonts(
  pdf: PDFDocument,
  themeMetadata?: { font_regular?: string; font_bold?: string },
) {
  try {
    pdf.registerFontkit(fontkit);
    const regularPath = resolveThemeFontPath(
      themeMetadata?.font_regular,
      path.join("fonts", "Lato-Regular.ttf"),
    );
    const boldPath = resolveThemeFontPath(
      themeMetadata?.font_bold,
      path.join("fonts", "Lato-Bold.ttf"),
    );
    const [regularBytes, boldBytes] = await Promise.all([
      readFile(regularPath),
      readFile(boldPath),
    ]);
    const font = await pdf.embedFont(regularBytes, { subset: true });
    const fontBold = await pdf.embedFont(boldBytes, { subset: true });
    return { font, fontBold };
  } catch {
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
    return { font, fontBold };
  }
}

export function getSeason(dateStr: string): Season {
  const m = Number(dateStr.slice(5, 7));
  const d = Number(dateStr.slice(8, 10));
  const mmdd = m * 100 + d;
  if (mmdd >= 321 && mmdd <= 620) return "spring";
  if (mmdd >= 621 && mmdd <= 922) return "summer";
  if (mmdd >= 923 && mmdd <= 1220) return "autumn";
  return "winter";
}

export function seasonLabel(s: Season, labels?: Partial<Record<Season, string>>) {
  if (labels?.[s]) return labels[s] as string;
  if (s === "spring") return "Primavera";
  if (s === "summer") return "Verano";
  if (s === "autumn") return "Otoño";
  return "Invierno";
}

export function seasonPalette(
  s: Season,
  palettes?: Partial<
    Record<
      Season,
      {
        bg: ReturnType<typeof rgb>;
        accent: ReturnType<typeof rgb>;
        soft: ReturnType<typeof rgb>;
      }
    >
  >,
) {
  if (palettes?.[s]) return palettes[s] as { bg: ReturnType<typeof rgb>; accent: ReturnType<typeof rgb>; soft: ReturnType<typeof rgb> };
  if (s === "spring") {
    return {
      bg: rgb(0.95, 1, 0.96),
      accent: rgb(0.2, 0.55, 0.32),
      soft: rgb(0.88, 0.97, 0.9),
    };
  }
  if (s === "summer") {
    return {
      bg: rgb(1, 0.98, 0.9),
      accent: rgb(0.72, 0.5, 0.12),
      soft: rgb(0.98, 0.93, 0.74),
    };
  }
  if (s === "autumn") {
    return {
      bg: rgb(1, 0.95, 0.91),
      accent: rgb(0.62, 0.34, 0.15),
      soft: rgb(0.98, 0.88, 0.8),
    };
  }
  return {
    bg: rgb(0.93, 0.97, 1),
    accent: rgb(0.2, 0.36, 0.62),
    soft: rgb(0.86, 0.92, 0.99),
  };
}

export function elementLabel(el: string) {
  if (el === "fire") return "Fuego";
  if (el === "water") return "Agua";
  if (el === "air") return "Aire";
  if (el === "earth") return "Tierra";
  if (el === "aether") return "Eter";
  return el;
}

export function moodLabel(mood: string) {
  if (mood === "wilted") return "Mustia";
  if (mood === "healthy") return "Sana";
  if (mood === "shiny") return "Brillante";
  return mood;
}

export function drawPageBg(page: PDFPage, color = rgb(1, 1, 1)) {
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color });
}

export function drawTopBand(
  page: PDFPage,
  color = rgb(0.9, 0.95, 1),
  height = 120,
) {
  page.drawRectangle({
    x: 0,
    y: PAGE_H - height,
    width: PAGE_W,
    height,
    color,
  });
}

export function drawCard(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  fill = rgb(1, 1, 1),
  border = rgb(0.88, 0.88, 0.88),
) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: fill,
    borderColor: border,
    borderWidth: 1,
  });
}

export function drawFlower(
  page: PDFPage,
  x: number,
  y: number,
  size: number,
  petalColor: ReturnType<typeof rgb>,
  centerColor: ReturnType<typeof rgb>,
) {
  const r = Math.max(2, size * 0.22);
  const d = size * 0.36;
  const petals = [
    [x, y + d],
    [x + d, y],
    [x, y - d],
    [x - d, y],
    [x + d * 0.72, y + d * 0.72],
    [x - d * 0.72, y + d * 0.72],
  ];
  for (const [px, py] of petals) {
    page.drawCircle({
      x: px,
      y: py,
      size: r,
      color: petalColor,
      borderColor: rgb(0.85, 0.85, 0.85),
      borderWidth: 0.5,
    });
  }
  page.drawCircle({
    x,
    y,
    size: Math.max(1.8, size * 0.18),
    color: centerColor,
    borderColor: rgb(0.75, 0.75, 0.75),
    borderWidth: 0.4,
  });
}

export function drawSprout(
  page: PDFPage,
  x: number,
  y: number,
  size: number,
  leafColor: ReturnType<typeof rgb>,
  stemColor: ReturnType<typeof rgb>,
) {
  const h = size * 1.3;
  page.drawLine({
    start: { x, y },
    end: { x, y: y + h },
    thickness: Math.max(0.8, size * 0.14),
    color: stemColor,
  });
  page.drawCircle({
    x: x - size * 0.34,
    y: y + h * 0.58,
    size: Math.max(1.6, size * 0.3),
    color: leafColor,
    borderColor: rgb(0.8, 0.88, 0.8),
    borderWidth: 0.5,
  });
  page.drawCircle({
    x: x + size * 0.34,
    y: y + h * 0.7,
    size: Math.max(1.6, size * 0.28),
    color: leafColor,
    borderColor: rgb(0.8, 0.88, 0.8),
    borderWidth: 0.5,
  });
}

export function drawSpark(
  page: PDFPage,
  x: number,
  y: number,
  size: number,
  color: ReturnType<typeof rgb>,
) {
  const d = size * 0.5;
  page.drawLine({
    start: { x: x - d, y },
    end: { x: x + d, y },
    thickness: 0.9,
    color,
  });
  page.drawLine({
    start: { x, y: y - d },
    end: { x, y: y + d },
    thickness: 0.9,
    color,
  });
}

export function drawProgressionMilestoneTreePdf(
  page: PDFPage,
  x: number,
  y: number,
  size: number,
  params: {
    rank: ProgressionTreeRank;
    rarity: ProgressionTreeRarity;
    importance: ProgressionTreeImportance;
    accentColor?: string | null;
    claimed?: boolean;
  },
) {
  const rank = normalizeProgressionTreeRank(params.rank);
  const rarity = normalizeProgressionTreeRarity(params.rarity);
  const importance = params.importance;
  const claimed = params.claimed !== false;
  const palette = progressionTreeRankPalette(rank);
  const rarityCfg = progressionTreeRarityConfig(rarity);
  const scale = importanceScaleForMilestoneTree(importance);
  const centerX = x + size / 2;
  const centerY = y + size * 0.46;
  const trunkWidth = size * 0.12 * scale;
  const trunkHeight = size * 0.24 * scale;
  const canopyRx = size * 0.22 * scale;
  const canopyRy = size * 0.16 * scale;
  const haloRx = canopyRx * (1.45 * rarityCfg.haloScale);
  const haloRy = canopyRy * (1.45 * rarityCfg.haloScale);
  const canopyFill = params.accentColor?.trim()
    ? hexToRgb(params.accentColor)
    : hexToRgb(palette.canopy);

  page.drawEllipse({
    xScale: size * 0.16 * scale,
    yScale: size * 0.05 * scale,
    x: centerX,
    y: y + size * 0.12,
    color: rgb(0.17, 0.25, 0.18),
    opacity: 0.12,
  });
  page.drawEllipse({
    xScale: haloRx,
    yScale: haloRy,
    x: centerX,
    y: centerY,
    color: canopyFill,
    opacity: claimed ? 0.16 : 0.1,
  });
  page.drawRectangle({
    x: centerX - trunkWidth / 2,
    y: centerY - size * 0.24,
    width: trunkWidth,
    height: trunkHeight,
    color: hexToRgb(palette.trunk),
    borderColor: hexToRgb(palette.outline),
    borderWidth: 0.6,
  });
  page.drawEllipse({
    xScale: canopyRx,
    yScale: canopyRy,
    x: centerX,
    y: centerY,
    color: canopyFill,
    borderColor: hexToRgb(palette.outline),
    borderWidth: 0.8,
  });
  page.drawEllipse({
    xScale: canopyRx * 0.62,
    yScale: canopyRy * 0.62,
    x: centerX - canopyRx * 0.24,
    y: centerY + canopyRy * 0.12,
    color: hexToRgb(palette.canopyShade),
    opacity: 0.7,
  });

  const fruitCount = Math.min(4, rarityCfg.fruitCount);
  for (let index = 0; index < fruitCount; index += 1) {
    const angle = (Math.PI * 2 * index) / Math.max(1, fruitCount) + Math.PI / 6;
    const radialX = canopyRx * 0.56;
    const radialY = canopyRy * 0.56;
    page.drawCircle({
      x: centerX + Math.cos(angle) * radialX,
      y: centerY + Math.sin(angle) * radialY,
      size: Math.max(1.3, size * 0.02 * scale),
      color: hexToRgb(palette.fruit),
      borderColor: hexToRgb(palette.outline),
      borderWidth: 0.4,
      opacity: claimed ? 1 : 0.84,
    });
  }
}

export function drawAnnualIllustrations(
  page: PDFPage,
  palette?: Partial<{
    primaryPetal: ReturnType<typeof rgb>;
    primaryCenter: ReturnType<typeof rgb>;
    secondaryPetal: ReturnType<typeof rgb>;
    secondaryCenter: ReturnType<typeof rgb>;
    sproutLeaf: ReturnType<typeof rgb>;
    sproutStem: ReturnType<typeof rgb>;
    spark: ReturnType<typeof rgb>;
  }>,
) {
  const colors = {
    primaryPetal: rgb(1, 0.87, 0.64),
    primaryCenter: rgb(0.98, 0.7, 0.26),
    secondaryPetal: rgb(0.83, 0.92, 1),
    secondaryCenter: rgb(0.45, 0.68, 0.9),
    sproutLeaf: rgb(0.68, 0.9, 0.73),
    sproutStem: rgb(0.35, 0.65, 0.39),
    spark: rgb(0.66, 0.74, 0.86),
    ...palette,
  };

  drawFlower(
    page,
    PAGE_W - 62,
    PAGE_H - 52,
    18,
    colors.primaryPetal,
    colors.primaryCenter,
  );
  drawFlower(
    page,
    PAGE_W - 98,
    PAGE_H - 74,
    14,
    colors.secondaryPetal,
    colors.secondaryCenter,
  );
  drawSprout(
    page,
    PAGE_W - 132,
    PAGE_H - 104,
    9,
    colors.sproutLeaf,
    colors.sproutStem,
  );
  drawSpark(page, PAGE_W - 154, PAGE_H - 66, 12, colors.spark);

  drawFlower(
    page,
    MARGIN + 14,
    154,
    12,
    colors.primaryPetal,
    colors.primaryCenter,
  );
  drawSprout(page, MARGIN + 34, 132, 9, colors.sproutLeaf, colors.sproutStem);
  drawSpark(page, MARGIN + 56, 146, 10, colors.spark);
}

export function drawSeasonIllustrations(
  page: PDFPage,
  season: Season,
  accent: ReturnType<typeof rgb>,
  palette?: Partial<{
    primary: ReturnType<typeof rgb>;
    secondary: ReturnType<typeof rgb>;
    spark: ReturnType<typeof rgb>;
    leaf: ReturnType<typeof rgb>;
    stem: ReturnType<typeof rgb>;
    winterLine: ReturnType<typeof rgb>;
  }>,
) {
  const defaults =
    season === "spring"
      ? {
          primary: rgb(0.86, 0.96, 0.85),
          secondary: rgb(0.93, 0.88, 1),
          spark: rgb(0.62, 0.53, 0.84),
          leaf: rgb(0.72, 0.92, 0.74),
          stem: rgb(0.35, 0.66, 0.39),
          winterLine: accent,
        }
      : season === "summer"
        ? {
            primary: rgb(1, 0.92, 0.72),
            secondary: rgb(0.95, 0.64, 0.22),
            spark: rgb(0.87, 0.68, 0.26),
            leaf: rgb(0.95, 0.64, 0.22),
            stem: accent,
            winterLine: accent,
          }
        : season === "autumn"
          ? {
              primary: rgb(0.99, 0.84, 0.7),
              secondary: rgb(0.86, 0.47, 0.24),
              spark: rgb(0.74, 0.46, 0.28),
              leaf: rgb(0.91, 0.76, 0.56),
              stem: rgb(0.66, 0.36, 0.2),
              winterLine: accent,
            }
          : {
              primary: rgb(0.86, 0.93, 1),
              secondary: rgb(0.42, 0.62, 0.9),
              spark: rgb(0.46, 0.62, 0.86),
              leaf: rgb(0.86, 0.93, 1),
              stem: accent,
              winterLine: accent,
            };
  const colors = { ...defaults, ...palette };

  if (season === "spring") {
    drawFlower(page, PAGE_W - 68, PAGE_H - 62, 16, colors.primary, colors.secondary);
    drawFlower(page, PAGE_W - 98, PAGE_H - 82, 12, colors.secondary, colors.spark);
    drawSprout(page, PAGE_W - 130, PAGE_H - 108, 9, colors.leaf, colors.stem);
    return;
  }
  if (season === "summer") {
    drawFlower(page, PAGE_W - 68, PAGE_H - 62, 16, colors.primary, colors.secondary);
    drawSpark(page, PAGE_W - 102, PAGE_H - 72, 12, colors.spark);
    drawSpark(page, PAGE_W - 126, PAGE_H - 94, 9, colors.spark);
    return;
  }
  if (season === "autumn") {
    drawFlower(page, PAGE_W - 68, PAGE_H - 62, 16, colors.primary, colors.secondary);
    drawSprout(page, PAGE_W - 100, PAGE_H - 98, 9, colors.leaf, colors.stem);
    drawSpark(page, PAGE_W - 126, PAGE_H - 78, 10, colors.spark);
    return;
  }
  drawFlower(page, PAGE_W - 68, PAGE_H - 62, 16, colors.primary, colors.secondary);
  drawSpark(page, PAGE_W - 98, PAGE_H - 84, 11, colors.spark);
  drawSpark(page, PAGE_W - 126, PAGE_H - 98, 8, colors.secondary);

  page.drawLine({
    start: { x: MARGIN + 20, y: 248 },
    end: { x: MARGIN + 42, y: 248 },
    thickness: 1,
    color: colors.winterLine,
  });
}

export function drawFrameOrnaments(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  color: ReturnType<typeof rgb>,
) {
  const r = 5;
  const points = [
    { x: x + 12, y: y + height - 12 },
    { x: x + width - 12, y: y + height - 12 },
    { x: x + 12, y: y + 12 },
    { x: x + width - 12, y: y + 12 },
  ];
  for (const p of points) {
    page.drawCircle({
      x: p.x,
      y: p.y,
      size: r,
      color,
      borderColor: rgb(0.82, 0.82, 0.82),
      borderWidth: 0.5,
    });
  }
}

export function fitInside(maxW: number, maxH: number, w: number, h: number) {
  const safeMaxW = Number.isFinite(maxW) && maxW > 0 ? maxW : 1;
  const safeMaxH = Number.isFinite(maxH) && maxH > 0 ? maxH : 1;
  const safeW = Number.isFinite(w) && w > 0 ? w : 1;
  const safeH = Number.isFinite(h) && h > 0 ? h : 1;
  const scale = Math.min(safeMaxW / safeW, safeMaxH / safeH);
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  return { w: safeW * safeScale, h: safeH * safeScale };
}

export function drawWrappedText(
  page: PDFPage,
  font: PDFFont,
  text: string,
  opts: {
    x: number;
    y: number;
    maxWidth: number;
    fontSize: number;
    lineHeight: number;
    maxLines?: number;
    color?: ReturnType<typeof rgb>;
  },
) {
  const safe = safePdfText(font, text);
  const lines = wrapTextByWidth(font, safe, opts.fontSize, opts.maxWidth);
  const limit = opts.maxLines ? Math.min(lines.length, opts.maxLines) : lines.length;
  for (let i = 0; i < limit; i++) {
    page.drawText(lines[i], {
      x: opts.x,
      y: opts.y - i * opts.lineHeight,
      size: opts.fontSize,
      font,
      color: opts.color ?? rgb(0.22, 0.22, 0.24),
    });
  }
  return lines.length;
}

export function drawFooter(
  page: PDFPage,
  font: PDFFont,
  footerBrandText: string,
  pageCounterText: string,
) {
  page.drawRectangle({
    x: MARGIN,
    y: 34,
    width: PAGE_W - MARGIN * 2,
    height: 1,
    color: rgb(0.86, 0.86, 0.88),
  });

  page.drawText(footerBrandText, {
    x: MARGIN,
    y: 18,
    size: 9,
    font,
    color: rgb(0.42, 0.42, 0.45),
  });
  const counterWidth = font.widthOfTextAtSize(pageCounterText, 9);
  page.drawText(pageCounterText, {
    x: PAGE_W - MARGIN - counterWidth,
    y: 18,
    size: 9,
    font,
    color: rgb(0.42, 0.42, 0.45),
  });
}

export function wrapTextByWidth(
  font: PDFFont,
  text: string,
  fontSize: number,
  maxWidth: number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      line = candidate;
      continue;
    }

    if (line) {
      out.push(line);
      line = "";
    }

    // If one word is still wider than the area, split by chars.
    if (font.widthOfTextAtSize(word, fontSize) <= maxWidth) {
      line = word;
      continue;
    }

    let chunk = "";
    for (const ch of word) {
      const next = chunk + ch;
      if (font.widthOfTextAtSize(next, fontSize) <= maxWidth) {
        chunk = next;
        continue;
      }
      if (chunk) out.push(chunk);
      chunk = ch;
    }
    line = chunk;
  }

  if (line) out.push(line);
  return out;
}

export function buildNotesLines(
  font: PDFFont,
  texts: string[],
  fontSize: number,
  maxWidth: number,
  emptyNoteTemplate = "- Sin notas en esta página",
) {
  const out: string[] = [];
  const filtered = texts.map((t) => String(t ?? "").trim()).filter(Boolean);

  if (!filtered.length) {
    return [emptyNoteTemplate];
  }

  for (const raw of filtered) {
    const safe = safePdfText(font, raw);
    if (!safe.trim()) continue;

    const wrapped = wrapTextByWidth(font, safe, fontSize, maxWidth);
    if (!wrapped.length) continue;

    wrapped.forEach((line, idx) => out.push(idx === 0 ? `- ${line}` : `  ${line}`));
    out.push("");
  }

  while (out.length && !out[out.length - 1]) out.pop();
  return out.length ? out : [emptyNoteTemplate];
}

export type NotesLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  titleY: number;
  firstLineY: number;
  minLineY: number;
  lineHeight: number;
  fontSize: number;
};

export function drawNotesSection(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  lines: string[],
  startIndex: number,
  layout: NotesLayout,
) {
  drawCard(
    page,
    layout.x,
    layout.y,
    layout.width,
    layout.height,
    rgb(1, 1, 1),
    rgb(0.88, 0.88, 0.88),
  );

  page.drawText(layout.title, {
    x: layout.x + 12,
    y: layout.titleY,
    size: 12,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.24),
  });

  let idx = startIndex;
  let lineY = layout.firstLineY;

  while (idx < lines.length && lineY >= layout.minLineY) {
    const line = lines[idx];
    idx += 1;

    if (!line.trim()) {
      lineY -= Math.max(6, layout.lineHeight - 7);
      continue;
    }

    page.drawText(line, {
      x: layout.x + 12,
      y: lineY,
      size: layout.fontSize,
      font,
      color: rgb(0.2, 0.2, 0.24),
    });
    lineY -= layout.lineHeight;
  }

  return idx;
}

export function safePdfText(font: PDFFont, text: string) {
  const input = String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  let out = "";
  for (const ch of input) {
    if (ch === "\n" || ch === "\t") {
      out += " ";
      continue;
    }

    try {
      font.encodeText(ch);
      out += ch;
    } catch {
      // skip unsupported glyphs (emoji, rare unicode, etc.)
    }
  }
  return out;
}

async function fetchImageAsset(url: string): Promise<ImageAsset | null> {
  try {
    if (url.startsWith("/")) {
      const localPath = path.join(process.cwd(), "public", url.replace(/^\/+/, "").replace(/\//g, path.sep));
      const bytes = await readFile(localPath);
      return {
        bytes: new Uint8Array(bytes),
        contentType: url.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg",
      };
    }
    if (url.startsWith("public/") || url.startsWith("public\\")) {
      const localPath = path.join(
        process.cwd(),
        "public",
        url.replace(/^public[\\/]/, "").replace(/[\\/]/g, path.sep),
      );
      const bytes = await readFile(localPath);
      return {
        bytes: new Uint8Array(bytes),
        contentType: url.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg",
      };
    }
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return {
      bytes: new Uint8Array(buf),
      contentType: (res.headers.get("content-type") || "").toLowerCase(),
    };
  } catch {
    return null;
  }
}

async function embedImage(
  pdf: PDFDocument,
  asset: ImageAsset,
  urlHint: string,
) {
  const hint = urlHint.toLowerCase();
  const preferPng =
    asset.contentType.includes("png") || hint.endsWith(".png") || hint.includes(".png?");

  try {
    if (preferPng) return await pdf.embedPng(asset.bytes);
    return await pdf.embedJpg(asset.bytes);
  } catch {
    try {
      return await pdf.embedJpg(asset.bytes);
    } catch {
      try {
        return await pdf.embedPng(asset.bytes);
      } catch {
        return null;
      }
    }
  }
}

type CanvasPreviewItem = {
  kind: CanvasObject["type"];
  x: number;
  y: number;
  width: number;
  height: number;
  src: string | null;
  text: string;
  fill: string;
  fontSize: number;
};

function finiteNumber(value: unknown, fallback: number) {
  const next =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(next) ? next : fallback;
}

function positiveNumber(value: unknown, fallback: number, min = 1) {
  return Math.max(min, finiteNumber(value, fallback));
}

function normalizeCanvasPreviewItems(objects: CanvasObject[]) {
  return objects.map((object, index): CanvasPreviewItem => {
    const raw = object as unknown as Record<string, unknown>;
    const fallbackX = 24 + (index % 2) * 170;
    const fallbackY = 24 + Math.floor(index / 2) * 118;
    const x = finiteNumber(raw.x, fallbackX);
    const y = finiteNumber(raw.y, fallbackY);
    const kind =
      raw.type === "photo" || raw.type === "video" || raw.type === "text" || raw.type === "sticker"
        ? raw.type
        : "sticker";

    if (kind === "photo" || kind === "video") {
      return {
        kind,
        x,
        y,
        width: positiveNumber(raw.width, 180, 80),
        height: positiveNumber(raw.height, 120, 60),
        src: typeof raw.src === "string" && raw.src.trim() ? raw.src.trim() : null,
        text: typeof raw.caption === "string" ? raw.caption.trim() : "",
        fill: "#3a3a3a",
        fontSize: 12,
      };
    }

    if (kind === "text") {
      const text = typeof raw.text === "string" ? raw.text.trim() : "";
      const fontSize = positiveNumber(raw.fontSize, 18, 8);
      const width = positiveNumber(raw.width, 220, 120);
      const lines = Math.max(1, Math.ceil(text.length / 24));
      return {
        kind,
        x,
        y,
        width,
        height: Math.max(44, fontSize * Math.min(4, lines) + 20),
        src: null,
        text,
        fill: typeof raw.fill === "string" && raw.fill.trim() ? raw.fill.trim() : "#3a3a3a",
        fontSize,
      };
    }

    const stickerSize = Math.max(40, positiveNumber(raw.scale, 1, 0.2) * 62);
    return {
      kind,
      x,
      y,
      width: stickerSize,
      height: stickerSize,
      src: typeof raw.src === "string" && raw.src.trim() ? raw.src.trim() : null,
      text: "",
      fill: "#3a3a3a",
      fontSize: 12,
    };
  });
}

function fitCanvasBounds(items: CanvasPreviewItem[]) {
  if (!items.length) {
    return { minX: 0, minY: 0, width: 1, height: 1 };
  }
  const minX = Math.min(...items.map((item) => item.x));
  const minY = Math.min(...items.map((item) => item.y));
  const maxX = Math.max(...items.map((item) => item.x + item.width));
  const maxY = Math.max(...items.map((item) => item.y + item.height));
  return {
    minX,
    minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

export async function drawCanvasPreview(
  pdf: PDFDocument,
  page: PDFPage,
  canvasObjects: CanvasObject[] | null | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
  font: PDFFont,
) {
  const objects = (canvasObjects ?? []).filter(Boolean).slice(0, 8);
  drawCard(page, x, y, width, height, rgb(0.995, 0.995, 0.992), rgb(0.9, 0.9, 0.9));
  if (!objects.length) {
    page.drawText(safePdfText(font, "Sin lienzo visual guardado"), {
      x: x + 12,
      y: y + height / 2 - 6,
      size: 9,
      font,
      color: rgb(0.48, 0.48, 0.5),
    });
    return false;
  }

  const previewItems = normalizeCanvasPreviewItems(objects);
  const bounds = fitCanvasBounds(previewItems);
  const innerX = x + 10;
  const innerY = y + 10;
  const innerW = Math.max(10, width - 20);
  const innerH = Math.max(10, height - 20);
  const rawScale = Math.min(innerW / bounds.width, innerH / bounds.height);
  const scale = Number.isFinite(rawScale) && rawScale > 0 ? rawScale : 1;

  for (const item of previewItems) {
    const drawX = innerX + (item.x - bounds.minX) * scale;
    const drawY = innerY + innerH - (item.y - bounds.minY + item.height) * scale;
    const drawW = Math.max(12, item.width * scale);
    const drawH = Math.max(12, item.height * scale);
    if (![drawX, drawY, drawW, drawH].every(Number.isFinite)) continue;

    if ((item.kind === "photo" || item.kind === "video") && item.src) {
      drawCard(page, drawX, drawY, drawW, drawH, rgb(1, 1, 1), rgb(0.85, 0.85, 0.85));
      const asset = await fetchImageAsset(item.src);
      const image = asset ? await embedImage(pdf, asset, item.src) : null;
      if (image) {
        const fitted = fitInside(Math.max(10, drawW - 6), Math.max(10, drawH - 6), image.width, image.height);
        page.drawImage(image, {
          x: drawX + (drawW - fitted.w) / 2,
          y: drawY + (drawH - fitted.h) / 2,
          width: fitted.w,
          height: fitted.h,
        });
      } else {
        drawWrappedText(page, font, item.kind === "video" ? "Video" : "Foto", {
          x: drawX + 8,
          y: drawY + drawH / 2 + 4,
          maxWidth: Math.max(30, drawW - 16),
          fontSize: 9,
          lineHeight: 11,
          maxLines: 2,
          color: rgb(0.42, 0.42, 0.44),
        });
      }
      if (item.kind === "video") {
        page.drawCircle({
          x: drawX + drawW / 2,
          y: drawY + drawH / 2,
          size: Math.max(6, Math.min(drawW, drawH) / 7),
          color: rgb(1, 1, 1),
          borderColor: rgb(0.2, 0.2, 0.2),
          borderWidth: 0.8,
        });
      }
      continue;
    }

    if (item.kind === "photo" || item.kind === "video") {
      drawCard(page, drawX, drawY, drawW, drawH, rgb(1, 1, 1), rgb(0.85, 0.85, 0.85));
      drawWrappedText(page, font, item.kind === "video" ? "Video" : "Foto", {
        x: drawX + 8,
        y: drawY + drawH / 2 + 4,
        maxWidth: Math.max(30, drawW - 16),
        fontSize: 9,
        lineHeight: 11,
        maxLines: 2,
        color: rgb(0.42, 0.42, 0.44),
      });
      continue;
    }

    if (item.kind === "sticker" && item.src) {
      const asset = await fetchImageAsset(item.src);
      const image = asset ? await embedImage(pdf, asset, item.src) : null;
      if (image) {
        const fitted = fitInside(drawW, drawH, image.width, image.height);
        page.drawImage(image, {
          x: drawX + (drawW - fitted.w) / 2,
          y: drawY + (drawH - fitted.h) / 2,
          width: fitted.w,
          height: fitted.h,
        });
      } else {
        drawCard(page, drawX, drawY, drawW, drawH, rgb(1, 1, 1), rgb(0.88, 0.88, 0.88));
        drawWrappedText(page, font, "Sticker", {
          x: drawX + 6,
          y: drawY + drawH / 2 + 4,
          maxWidth: Math.max(20, drawW - 12),
          fontSize: 8,
          lineHeight: 10,
          maxLines: 2,
          color: rgb(0.42, 0.42, 0.44),
        });
      }
      continue;
    }

    if (item.kind === "text") {
      drawCard(page, drawX, drawY, drawW, drawH, rgb(1, 1, 1), rgb(0.86, 0.86, 0.86));
      const previewFontSize = Math.max(7, Math.min(11, item.fontSize * scale * 0.5));
      const shouldAbstractText = drawW < 110 || drawH < 46 || previewFontSize < 8.5;
      if (shouldAbstractText) {
        const lineColor = rgb(0.82, 0.85, 0.83);
        const innerWidth = Math.max(24, drawW - 16);
        const lineWidths = [innerWidth, innerWidth * 0.78, innerWidth * 0.56];
        lineWidths.forEach((lineWidth, index) => {
          page.drawRectangle({
            x: drawX + 8,
            y: drawY + drawH - 14 - index * 10,
            width: lineWidth,
            height: 3.5,
            color: lineColor,
          });
        });
      } else {
        drawWrappedText(page, font, item.text || "Texto", {
          x: drawX + 6,
          y: drawY + drawH - 12,
          maxWidth: Math.max(30, drawW - 12),
          fontSize: previewFontSize,
          lineHeight: 10,
          maxLines: 4,
          color: hexToRgb(item.fill),
        });
      }
    }
  }
  return true;
}

export async function drawImageBox(
  pdf: PDFDocument,
  page: PDFPage,
  imageUrl: string | null,
  x: number,
  y: number,
  width: number,
  height: number,
  placeholder = "Sin imagen",
  font?: PDFFont,
) {
  drawCard(page, x, y, width, height, rgb(1, 1, 1), rgb(0.86, 0.86, 0.86));

  if (!imageUrl) {
    if (font) {
      page.drawText(safePdfText(font, placeholder), {
        x: x + 12,
        y: y + height / 2 - 6,
        size: 11,
        font,
        color: rgb(0.45, 0.45, 0.45),
      });
    }
    return;
  }

  const asset = await fetchImageAsset(imageUrl);
  if (!asset) {
    if (font) {
      page.drawText(safePdfText(font, placeholder), {
        x: x + 12,
        y: y + height / 2 - 6,
        size: 11,
        font,
        color: rgb(0.45, 0.45, 0.45),
      });
    }
    return;
  }

  const image = await embedImage(pdf, asset, imageUrl);
  if (!image) return;

  const maxW = width - 12;
  const maxH = height - 12;
  const fitted = fitInside(maxW, maxH, image.width, image.height);

  page.drawImage(image, {
    x: x + (width - fitted.w) / 2,
    y: y + (height - fitted.h) / 2,
    width: fitted.w,
    height: fitted.h,
  });
}

export async function makeQrPngBytes(text: string): Promise<Uint8Array> {
  const dataUrl = await QRCode.toDataURL(text, { margin: 1, scale: 6 });
  const res = await fetch(dataUrl);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

export function extractTexts(canvasObjects: CanvasObject[]): string[] {
  return (canvasObjects ?? [])
    .filter(
      (object): object is Extract<CanvasObject, { type: "text" }> =>
        object.type === "text" &&
        typeof object.text === "string",
    )
    .map((object) => String(object.text).trim())
    .filter(Boolean);
}

export function summarizeCanvasObjects(
  canvasObjects: CanvasObject[] | null | undefined,
): CanvasSummary {
  const objects = canvasObjects ?? [];
  const photos = objects.filter(
    (object): object is Extract<CanvasObject, { type: "photo" }> => object.type === "photo",
  );
  const videos = objects.filter(
    (object): object is Extract<CanvasObject, { type: "video" }> => object.type === "video",
  );
  const stickers = objects.filter(
    (object): object is Extract<CanvasObject, { type: "sticker" }> => object.type === "sticker",
  );
  const textSnippets = extractTexts(objects).slice(0, 4);
  const photoCaptions = photos
    .map((object) => String(object.caption ?? "").trim())
    .filter(Boolean)
    .slice(0, 3);
  const videoCaptions = videos
    .map((object) => String(object.caption ?? "").trim())
    .filter(Boolean)
    .slice(0, 2);

  return {
    photoCount: photos.length,
    videoCount: videos.length,
    stickerCount: stickers.length,
    textCount: textSnippets.length,
    textSnippets,
    photoCaptions,
    videoCaptions,
  };
}

export function getPhotoSrcFromCanvas(
  canvasObjects: CanvasObject[] | null | undefined,
) {
  const photos = (canvasObjects ?? []).filter(
    (object): object is Extract<CanvasObject, { type: "photo" }> =>
      object.type === "photo" &&
      typeof object.src === "string" &&
      object.src.trim().length > 0,
  );
  if (!photos.length) return null;

  // Prefer the largest photo frame in the canvas as "main photo".
  photos.sort((left, right) => {
    const leftArea = (left.width ?? 0) * (left.height ?? 0);
    const rightArea = (right.width ?? 0) * (right.height ?? 0);
    return rightArea - leftArea;
  });
  return String(photos[0]?.src ?? "");
}

export function getVideoSrcFromCanvas(
  canvasObjects: CanvasObject[] | null | undefined,
) {
  const videos = (canvasObjects ?? []).filter(
    (object): object is Extract<CanvasObject, { type: "video" }> =>
      object.type === "video" &&
      typeof object.src === "string" &&
      object.src.trim().length > 0,
  );
  if (!videos.length) return null;

  // Prefer the largest video frame in the canvas.
  videos.sort((left, right) => {
    const leftArea = (left.width ?? 0) * (left.height ?? 0);
    const rightArea = (right.width ?? 0) * (right.height ?? 0);
    return rightArea - leftArea;
  });
  return String(videos[0]?.src ?? "");
}

export function toAbsoluteMediaUrl(raw: string | null | undefined, siteUrl: string) {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return `${siteUrl.replace(/\/+$/, "")}${value}`;
  return null;
}

export function buildMediaQrTargetsForPage(
  item: ExportItem,
  siteUrl: string,
  textTemplate: (key: string, fallback: string) => string,
) {
  const targets: Array<{ url: string; label: string }> = [];
  const seen = new Set<string>();

  const pushTarget = (url: string | null, label: string) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    targets.push({ url, label });
  };

  pushTarget(
    toAbsoluteMediaUrl(item.audio_url, siteUrl),
    textTemplate("qr_audio_label", "Abrir audio"),
  );
  pushTarget(
    toAbsoluteMediaUrl(getVideoSrcFromCanvas(item.canvas_objects), siteUrl),
    textTemplate("qr_video_label", "Abrir video"),
  );

  return targets.slice(0, 2);
}

export function drawQrBlock(
  page: PDFPage,
  qrImg: PDFImage,
  x: number,
  y: number,
  label: string,
  font: PDFFont,
) {
  const boxX = x - 10;
  const boxY = y - 34;
  const boxW = 118;
  const boxH = 152;
  drawCard(page, boxX, boxY, boxW, boxH, rgb(1, 1, 1), rgb(0.86, 0.86, 0.86));
  page.drawImage(qrImg, { x, y, width: 96, height: 96 });
  const safeLabel = safePdfText(font, label);
  const labelWidth = font.widthOfTextAtSize(safeLabel, 10);
  page.drawText(safeLabel, {
    x: boxX + Math.max(10, (boxW - labelWidth) / 2),
    y: boxY + 16,
    size: 10,
    font,
    color: rgb(0.33, 0.33, 0.33),
  });
}


