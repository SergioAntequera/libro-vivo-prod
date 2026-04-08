import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { loadPdfFonts, MARGIN, PAGE_H, PAGE_W } from "@/lib/yearPdfExportHelpers";
import type { SeedEventSummaryModel } from "@/lib/seedEventReminderTypes";

type Cursor = {
  page: PDFPage;
  y: number;
};

function formatDate(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  try {
    return new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(`${raw}T12:00:00Z`));
  } catch {
    return raw;
  }
}

function formatDateTime(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  try {
    return new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(raw));
  } catch {
    return raw;
  }
}

function formatDateRange(start: string | null | undefined, end: string | null | undefined) {
  const from = formatDate(start);
  const to = formatDate(end);
  if (from && to && from !== to) return `${from} - ${to}`;
  return from ?? to;
}

function formatMoney(amount: number | null | undefined, currency: string | null | undefined) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return null;
  const resolvedCurrency = String(currency ?? "").trim() || "EUR";
  try {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: resolvedCurrency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${resolvedCurrency}`;
  }
}

function formatTripDurationDays(start: string | null | undefined, end: string | null | undefined) {
  const from = String(start ?? "").trim();
  const to = String(end ?? "").trim();
  if (!from || !to) return null;
  const startDate = new Date(`${from}T12:00:00Z`);
  const endDate = new Date(`${to}T12:00:00Z`);
  const diff = Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
  if (!Number.isFinite(diff) || diff <= 0) return null;
  return diff === 1 ? "1 dia" : `${diff} dias`;
}

function formatDuration(minutes: number | null | undefined) {
  if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines.length ? lines : [text];
}

function ensureSpace(params: {
  pdf: PDFDocument;
  cursor: Cursor;
  needed: number;
  font: PDFFont;
  fontBold: PDFFont;
}) {
  if (params.cursor.y - params.needed >= MARGIN) return params.cursor;
  const page = params.pdf.addPage([PAGE_W, PAGE_H]);
  return { page, y: PAGE_H - MARGIN };
}

function drawTextBlock(params: {
  pdf: PDFDocument;
  cursor: Cursor;
  text: string;
  font: PDFFont;
  size: number;
  color?: ReturnType<typeof rgb>;
  gapAfter?: number;
}) {
  const maxWidth = PAGE_W - MARGIN * 2;
  const lines = wrapText(params.text, params.font, params.size, maxWidth);
  const needed = lines.length * (params.size + 4) + (params.gapAfter ?? 10);
  const cursor = ensureSpace({
    pdf: params.pdf,
    cursor: params.cursor,
    needed,
    font: params.font,
    fontBold: params.font,
  });
  let y = cursor.y;
  for (const line of lines) {
    cursor.page.drawText(line, {
      x: MARGIN,
      y,
      size: params.size,
      font: params.font,
      color: params.color ?? rgb(0.18, 0.21, 0.2),
    });
    y -= params.size + 4;
  }
  return { page: cursor.page, y: y - (params.gapAfter ?? 10) };
}

function drawSectionTitle(params: {
  pdf: PDFDocument;
  cursor: Cursor;
  title: string;
  fontBold: PDFFont;
}) {
  return drawTextBlock({
    pdf: params.pdf,
    cursor: params.cursor,
    text: params.title,
    font: params.fontBold,
    size: 16,
    color: rgb(0.15, 0.34, 0.23),
    gapAfter: 8,
  });
}

function drawBulletLines(params: {
  pdf: PDFDocument;
  cursor: Cursor;
  lines: string[];
  font: PDFFont;
}) {
  let cursor = params.cursor;
  for (const line of params.lines.filter(Boolean)) {
    cursor = drawTextBlock({
      pdf: params.pdf,
      cursor,
      text: `- ${line}`,
      font: params.font,
      size: 11,
      gapAfter: 3,
    });
  }
  return { page: cursor.page, y: cursor.y - 6 };
}

export async function buildSeedEventPdfBytes(summary: SeedEventSummaryModel) {
  const pdf = await PDFDocument.create();
  const { font, fontBold } = await loadPdfFonts(pdf);
  let cursor: Cursor = {
    page: pdf.addPage([PAGE_W, PAGE_H]),
    y: PAGE_H - MARGIN,
  };

  cursor = drawTextBlock({
    pdf,
    cursor,
    text: summary.seed.title || "Semilla",
    font: fontBold,
    size: 24,
    color: rgb(0.11, 0.25, 0.18),
    gapAfter: 10,
  });

  const heroLines = [
    summary.planTypeLabel ? `Tipo: ${summary.planTypeLabel}` : "",
    summary.tripBrief?.destinationLabel
      ? `Destino: ${summary.tripBrief.destinationLabel}`
      : summary.linkedPlace?.label
        ? `Lugar: ${summary.linkedPlace.label}`
        : "",
    summary.tripBrief?.dateMode === "date_range" &&
    summary.tripBrief.startsOn &&
    summary.tripBrief.endsOn
      ? `Fechas: ${formatDate(summary.tripBrief.startsOn)} - ${formatDate(summary.tripBrief.endsOn)}`
      : summary.seed.scheduledDate
        ? `Fecha: ${formatDate(summary.seed.scheduledDate)}`
        : "",
    formatTripDurationDays(summary.tripBrief?.startsOn, summary.tripBrief?.endsOn)
      ? `Duracion: ${formatTripDurationDays(summary.tripBrief?.startsOn, summary.tripBrief?.endsOn)}`
      : "",
    summary.linkedRoute?.label ? `Ruta principal: ${summary.linkedRoute.label}` : "",
    summary.tripBrief?.sharedIntention ? `Intencion: ${summary.tripBrief.sharedIntention}` : "",
  ].filter(Boolean);

  cursor = drawBulletLines({ pdf, cursor, lines: heroLines, font });

  if (summary.tripBrief?.summary) {
    cursor = drawSectionTitle({ pdf, cursor, title: "Resumen", fontBold });
    cursor = drawTextBlock({
      pdf,
      cursor,
      text: summary.tripBrief.summary,
      font,
      size: 11,
    });
  } else if (summary.seed.notes) {
    cursor = drawSectionTitle({ pdf, cursor, title: "Notas", fontBold });
    cursor = drawTextBlock({
      pdf,
      cursor,
      text: summary.seed.notes,
      font,
      size: 11,
    });
  }

  if (summary.tripBrief) {
    const tripMeta = [
      summary.tripBrief.destinationKind ? `Tipo de destino: ${summary.tripBrief.destinationKind}` : "",
      formatMoney(summary.tripBrief.budgetAmount, summary.tripBrief.budgetCurrency)
        ? `Presupuesto aproximado: ${formatMoney(summary.tripBrief.budgetAmount, summary.tripBrief.budgetCurrency)}`
        : "",
      summary.tripBrief.budgetNotes ? `Matiz del presupuesto: ${summary.tripBrief.budgetNotes}` : "",
      summary.tripBrief.goalTags.length ? `Objetivos: ${summary.tripBrief.goalTags.join(", ")}` : "",
      summary.tripBrief.whyThisTrip ? `Por que apetece: ${summary.tripBrief.whyThisTrip}` : "",
      summary.tripBrief.climateContext ? `Clima orientativo: ${summary.tripBrief.climateContext}` : "",
      summary.tripBrief.primaryPlace?.label
        ? `Lugar base principal: ${summary.tripBrief.primaryPlace.label}`
        : "",
      summary.tripBrief.primaryRoute?.label
        ? `Ruta base principal: ${summary.tripBrief.primaryRoute.label}`
        : "",
    ].filter(Boolean);

    if (tripMeta.length) {
      cursor = drawSectionTitle({ pdf, cursor, title: "Base del viaje", fontBold });
      cursor = drawBulletLines({ pdf, cursor, lines: tripMeta, font });
    }
  }

  if (summary.stops.length) {
    cursor = drawSectionTitle({ pdf, cursor, title: "Etapas", fontBold });
    cursor = drawBulletLines({
      pdf,
      cursor,
      font,
      lines: summary.stops.map((stop) => {
        const parts = [
          stop.title,
          stop.basePlace?.label ?? "",
          stop.startsOn || stop.endsOn
            ? [formatDate(stop.startsOn), formatDate(stop.endsOn)].filter(Boolean).join(" - ")
            : "",
          stop.notes ?? "",
        ].filter(Boolean);
        return parts.join(" | ");
      }),
    });
  }

  if (summary.transportLegs.length) {
    cursor = drawSectionTitle({ pdf, cursor, title: "Trayectos", fontBold });
    cursor = drawBulletLines({
      pdf,
      cursor,
      font,
      lines: summary.transportLegs.map((item) =>
        [
          item.title ?? `${item.fromLabel ?? "Origen"} -> ${item.toLabel ?? "Destino"}`,
          item.transportKind,
          item.fromLabel || item.toLabel
            ? `${item.fromLabel ?? "Origen"} -> ${item.toLabel ?? "Destino"}`
            : "",
          item.providerName ?? "",
          item.startsAt || item.endsAt
            ? [formatDateTime(item.startsAt), formatDateTime(item.endsAt)].filter(Boolean).join(" - ")
            : "",
          item.originPlace?.label ?? "",
          item.destinationPlace?.label ?? "",
          item.originStopTitle ? `Sale desde ${item.originStopTitle}` : "",
          item.destinationStopTitle ? `Llega a ${item.destinationStopTitle}` : "",
          item.route?.label ?? "",
          item.bookingUrl ? "Enlace guardado" : "",
          item.referenceCodeMasked ? `Ref: ${item.referenceCodeMasked}` : "",
          item.notes ?? "",
        ]
          .filter(Boolean)
          .join(" | "),
      ),
    });
  }

  if (summary.stays.length) {
    cursor = drawSectionTitle({ pdf, cursor, title: "Alojamientos", fontBold });
    cursor = drawBulletLines({
      pdf,
      cursor,
      font,
      lines: summary.stays.map((item) =>
        [
          item.name,
          item.stayKind,
          item.providerName ?? "",
          item.place?.label ?? item.addressLabel ?? "",
          item.checkInDate || item.checkOutDate
            ? formatDateRange(item.checkInDate, item.checkOutDate)
            : "",
          item.stopTitle ? `Etapa: ${item.stopTitle}` : "",
          item.bookingUrl ? "Enlace guardado" : "",
          item.confirmationCodeMasked ? `Confirmacion: ${item.confirmationCodeMasked}` : "",
          item.notes ?? "",
        ]
          .filter(Boolean)
          .join(" | "),
      ),
    });
  }

  if (summary.placeLinks.length) {
    cursor = drawSectionTitle({ pdf, cursor, title: "Lugares a ver", fontBold });
    cursor = drawBulletLines({
      pdf,
      cursor,
      font,
      lines: summary.placeLinks.map((item) =>
        [
          item.title,
          item.place?.label ?? "",
          item.priority,
          item.planningState,
          item.dayDate ? formatDate(item.dayDate) : "",
          item.stopTitle ?? "",
          item.route?.label ?? "",
          item.linkedTransportTitle ? `Trayecto: ${item.linkedTransportTitle}` : "",
          item.notes ?? "",
        ]
          .filter(Boolean)
          .join(" | "),
      ),
    });
  }

  if (summary.itineraryItems.length) {
    cursor = drawSectionTitle({ pdf, cursor, title: "Itinerario", fontBold });
    cursor = drawBulletLines({
      pdf,
      cursor,
      font,
      lines: summary.itineraryItems.map((item) =>
        [
          item.title,
          item.dayDate ? formatDate(item.dayDate) : "",
          item.timeLabel ?? "",
          formatDuration(item.durationMinutes) ?? "",
          item.place?.label ?? "",
          item.route?.label ?? "",
          item.transportTitle ? `Trayecto: ${item.transportTitle}` : "",
          item.stopTitle ? `Etapa: ${item.stopTitle}` : "",
          item.description ?? "",
          item.status,
        ]
          .filter(Boolean)
          .join(" | "),
      ),
    });
  }

  if (summary.reservations.length) {
    cursor = drawSectionTitle({ pdf, cursor, title: "Reservas", fontBold });
    cursor = drawBulletLines({
      pdf,
      cursor,
      font,
      lines: summary.reservations.map((item) =>
        [
          item.title,
          item.reservationKind,
          item.providerName ?? "",
          formatMoney(item.amount, item.currency) ?? "",
          item.startsAt ? formatDateTime(item.startsAt) : "",
          item.referenceCodeMasked ? `Ref: ${item.referenceCodeMasked}` : "",
          item.place?.label ?? "",
          item.stopTitle ? `Etapa: ${item.stopTitle}` : "",
          item.reservationUrl ? "Enlace guardado" : "",
          item.notes ?? "",
          item.status,
        ]
          .filter(Boolean)
          .join(" | "),
      ),
    });
  }

  if (summary.checklistItems.length) {
    cursor = drawSectionTitle({ pdf, cursor, title: "Checklist", fontBold });
    cursor = drawBulletLines({
      pdf,
      cursor,
      font,
      lines: summary.checklistItems.map((item) =>
        [
          item.label,
          item.category,
          item.owner,
          item.completedAt ? "hecho" : "pendiente",
          item.isRequired ? "obligatorio" : "",
        ]
          .filter(Boolean)
          .join(" | "),
      ),
    });
  }

  if (summary.attachments.length) {
    cursor = drawSectionTitle({ pdf, cursor, title: "Documentos guardados", fontBold });
    cursor = drawBulletLines({
      pdf,
      cursor,
      font,
      lines: summary.attachments.map((item) =>
        [
          item.titleMasked,
          item.linkedKind !== "seed" ? `Ligado a ${item.linkedKind}` : "",
          item.fileName ?? "",
          item.notes ?? "",
        ]
          .filter(Boolean)
          .join(" | "),
      ),
    });
  }

  cursor = drawTextBlock({
    pdf,
    cursor,
    text: "Ya queda poco para vivirlo. Que este resumen os deje lo importante a mano y os acerque un poco mas al momento que vais a compartir.",
    font,
    size: 11,
    color: rgb(0.27, 0.31, 0.3),
    gapAfter: 0,
  });

  return await pdf.save();
}
