import type { SeedEventReminderEmailModel, SeedEventSummaryModel } from "@/lib/seedEventReminderTypes";

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

function compactText(value: string | null | undefined, fallback: string) {
  const next = String(value ?? "").trim();
  return next || fallback;
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

function formatDuration(minutes: number | null | undefined) {
  if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
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

function takeNonEmpty(lines: Array<string | null | undefined>, limit: number) {
  return lines.map((line) => String(line ?? "").trim()).filter(Boolean).slice(0, limit);
}

export function buildSeedEventReminderEmailModel(
  summary: SeedEventSummaryModel,
  params: { siteUrl: string },
): SeedEventReminderEmailModel {
  const tripDuration = formatTripDurationDays(summary.tripBrief?.startsOn, summary.tripBrief?.endsOn);
  const whenLabel =
    formatDateRange(summary.tripBrief?.startsOn, summary.tripBrief?.endsOn) ??
    formatDate(summary.seed.scheduledDate) ??
    "muy pronto";
  const title = compactText(summary.seed.title, "Este plan");
  const subject = summary.isTripPreparation
    ? `${title} ya esta cerca`
    : `${title} ya mismo sucede`;

  const introLine = summary.isTripPreparation
    ? `Queda poco para ${title}. Os dejamos el resumen del viaje para tenerlo a mano.`
    : `Queda poco para ${title}. Os dejamos el resumen del plan para tenerlo a mano.`;

  const closingLine = summary.isTripPreparation
    ? `Que estos dias previos os ayuden a llegar con calma y con ganas de vivirlo.`
    : `Que este recordatorio os acerque un poco mas al momento que ya esta por llegar.`;

  const sections: SeedEventReminderEmailModel["sections"] = [
    {
      title: "Resumen",
      lines: [
        `Fecha: ${whenLabel}`,
        tripDuration ? `Duracion: ${tripDuration}` : "",
        summary.planTypeLabel ? `Tipo: ${summary.planTypeLabel}` : "",
        summary.tripBrief?.destinationLabel
          ? `Destino: ${summary.tripBrief.destinationLabel}`
          : summary.linkedPlace?.label
            ? `Lugar: ${summary.linkedPlace.label}`
            : "",
        formatMoney(summary.tripBrief?.budgetAmount, summary.tripBrief?.budgetCurrency)
          ? `Presupuesto aproximado: ${formatMoney(summary.tripBrief?.budgetAmount, summary.tripBrief?.budgetCurrency)}`
          : "",
        summary.tripBrief?.goalTags.length
          ? `Objetivos: ${summary.tripBrief.goalTags.join(", ")}`
          : "",
        summary.tripBrief?.climateContext
          ? `Clima orientativo: ${summary.tripBrief.climateContext}`
          : "",
      ].filter(Boolean),
    },
  ];

  if (summary.isTripPreparation) {
    const pendingChecklist = summary.checklistItems.filter((item) => !item.completedAt);
    const highlightedTransport = takeNonEmpty(
      summary.transportLegs.map((item) =>
        [
          item.title ?? `${compactText(item.fromLabel, "origen")} -> ${compactText(item.toLabel, "destino")}`,
          item.transportKind,
          item.startsAt ? formatDateTime(item.startsAt) : "",
          item.providerName ?? "",
          item.referenceCodeMasked ? `Ref ${item.referenceCodeMasked}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
      ),
      2,
    );
    const highlightedStays = takeNonEmpty(
      summary.stays.map((item) =>
        [
          item.name,
          item.place?.label ?? item.addressLabel ?? "",
          formatDateRange(item.checkInDate, item.checkOutDate),
          item.confirmationCodeMasked ? `Confirmacion ${item.confirmationCodeMasked}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
      ),
      2,
    );
    const highlightedPlaces = takeNonEmpty(
      summary.placeLinks.map((item) =>
        [
          item.title,
          item.dayDate ? formatDate(item.dayDate) : "",
          item.stopTitle ?? "",
          item.priority,
          item.planningState,
        ]
          .filter(Boolean)
          .join(" · "),
      ),
      4,
    );
    const highlightedReservations = takeNonEmpty(
      summary.reservations.map((item) =>
        [
          item.title,
          item.startsAt ? formatDateTime(item.startsAt) : "",
          item.place?.label ?? "",
          item.referenceCodeMasked ? `Ref ${item.referenceCodeMasked}` : "",
          item.status,
        ]
          .filter(Boolean)
          .join(" · "),
      ),
      3,
    );
    const highlightedActivities = takeNonEmpty(
      summary.itineraryItems.map((item) =>
        [
          item.title,
          item.dayDate ? formatDate(item.dayDate) : "",
          item.timeLabel ?? "",
          formatDuration(item.durationMinutes) ?? "",
          item.place?.label ?? "",
        ]
          .filter(Boolean)
          .join(" · "),
      ),
      3,
    );

    sections.push({
      title: "Base del viaje",
      lines: [
        summary.tripBrief?.summary ?? "",
        summary.tripBrief?.sharedIntention
          ? `Intencion: ${summary.tripBrief.sharedIntention}`
          : "",
        summary.tripBrief?.whyThisTrip
          ? `Motivo: ${summary.tripBrief.whyThisTrip}`
          : "",
        summary.stops.length ? `Etapas previstas: ${summary.stops.length}` : "",
      ].filter(Boolean),
    });

    if (highlightedTransport.length) {
      sections.push({
        title: "Moverse",
        lines: highlightedTransport,
      });
    }

    if (highlightedStays.length) {
      sections.push({
        title: "Dormir",
        lines: highlightedStays,
      });
    }

    if (highlightedPlaces.length || highlightedActivities.length) {
      sections.push({
        title: "Ver y hacer",
        lines: [...highlightedPlaces, ...highlightedActivities].slice(0, 5),
      });
    }

    if (highlightedReservations.length) {
      sections.push({
        title: "Reservas",
        lines: highlightedReservations,
      });
    }

    if (pendingChecklist.length || summary.attachments.length) {
      sections.push({
        title: "Preparativos",
        lines: [
          ...takeNonEmpty(
            pendingChecklist.map((item) =>
              [
                item.label,
                item.owner,
                item.category,
                item.isRequired ? "obligatorio" : "",
              ]
                .filter(Boolean)
                .join(" · "),
            ),
            4,
          ),
          summary.attachments.length
            ? `Documentos resumidos guardados: ${summary.attachments.length}`
            : "",
        ].filter(Boolean),
      });
    }
  } else {
    const pendingChecklist = summary.checklistItems.filter((item) => !item.completedAt);
    if (summary.seed.notes) {
      sections.push({
        title: "Notas",
        lines: [summary.seed.notes],
      });
    }
    if (summary.linkedRoute?.label) {
      sections.push({
        title: "Ruta",
        lines: [summary.linkedRoute.label],
      });
    }
    if (pendingChecklist.length || summary.attachments.length) {
      sections.push({
        title: "A mano",
        lines: [
          ...takeNonEmpty(
            pendingChecklist.map((item) =>
              [
                item.label,
                item.owner,
                item.category,
                item.isRequired ? "obligatorio" : "",
              ]
                .filter(Boolean)
                .join(" · "),
            ),
            4,
          ),
          summary.attachments.length ? `Documentos resumidos: ${summary.attachments.length}` : "",
        ].filter(Boolean),
      });
    }
  }

  return {
    subject,
    previewText: `${title} llega el ${whenLabel}.`,
    introLine,
    closingLine,
    ctaUrl: `${params.siteUrl.replace(/\/$/, "")}/plans?seed=${encodeURIComponent(summary.seed.id)}`,
    ctaLabel: "Abrir en Libro Vivo",
    sections,
  };
}
