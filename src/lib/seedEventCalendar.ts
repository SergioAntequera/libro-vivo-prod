import type { SeedEventSummaryModel } from "@/lib/seedEventReminderTypes";

function cleanLine(value: string) {
  return value.replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function formatDateValue(dateLike: string) {
  return dateLike.replace(/-/g, "");
}

function addDays(dateLike: string, amount: number) {
  const base = new Date(`${dateLike}T12:00:00Z`);
  if (Number.isNaN(base.getTime())) return dateLike;
  base.setUTCDate(base.getUTCDate() + amount);
  return base.toISOString().slice(0, 10);
}

function resolveEventRange(summary: SeedEventSummaryModel) {
  const tripBrief = summary.tripBrief;
  if (tripBrief?.dateMode === "date_range" && tripBrief.startsOn && tripBrief.endsOn) {
    return {
      start: tripBrief.startsOn,
      endExclusive: addDays(tripBrief.endsOn, 1),
    };
  }

  const singleDate = tripBrief?.startsOn ?? summary.seed.scheduledDate;
  if (singleDate) {
    return {
      start: singleDate,
      endExclusive: addDays(singleDate, 1),
    };
  }

  return null;
}

export function buildSeedEventCalendarUid(seedId: string) {
  return `seed-event-${seedId}@librovivo.local`;
}

export function buildSeedEventCalendarText(summary: SeedEventSummaryModel) {
  const range = resolveEventRange(summary);
  if (!range) {
    throw new Error("La semilla no tiene una fecha suficiente para generar el calendario.");
  }

  const now = new Date();
  const dtStamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const title = cleanLine(summary.seed.title || "Evento del jardin");
  const descriptionLines = [
    summary.tripBrief?.summary ?? summary.seed.notes ?? "",
    summary.tripBrief?.destinationLabel ? `Destino: ${summary.tripBrief.destinationLabel}` : "",
    summary.planTypeLabel ? `Tipo: ${summary.planTypeLabel}` : "",
  ].filter(Boolean);
  const description = cleanLine(descriptionLines.join("\n"));
  const location = cleanLine(
    summary.tripBrief?.primaryPlace?.label ??
      summary.linkedPlace?.label ??
      summary.tripBrief?.destinationLabel ??
      "",
  );

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Libro Vivo//Seed Event Reminder//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${buildSeedEventCalendarUid(summary.seed.id)}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;VALUE=DATE:${formatDateValue(range.start)}`,
    `DTEND;VALUE=DATE:${formatDateValue(range.endExclusive)}`,
    `SUMMARY:${title}`,
    description ? `DESCRIPTION:${description}` : "",
    location ? `LOCATION:${location}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}
