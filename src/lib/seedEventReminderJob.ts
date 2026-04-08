import { createHash } from "node:crypto";
import { toErrorMessage } from "@/lib/errorMessage";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import {
  loadSeedEventReminderRecipients,
  loadSeedEventSummaryModel,
} from "@/lib/seedEventReminderData";
import { buildSeedEventReminderEmailModel } from "@/lib/seedEventReminderCopy";
import { buildSeedEventCalendarText, buildSeedEventCalendarUid } from "@/lib/seedEventCalendar";
import { buildSeedEventPdfBytes } from "@/lib/seedEventPdfDocumentBuilder";
import { sendSeedEventReminderEmail } from "@/lib/seedEventReminderMailer";

type SeedReminderRunResult = {
  checked: number;
  sent: number;
  skipped: number;
  failed: number;
  details: Array<{
    seedId: string;
    title: string;
    status: "sent" | "skipped" | "failed";
    reason?: string;
    recipients?: string[];
    recipientMode?: "garden" | "override";
    subject?: string;
  }>;
};

function todayInTimeZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  return `${byType.get("year")}-${byType.get("month")}-${byType.get("day")}`;
}

function addDays(dateLike: string, amount: number) {
  const base = new Date(`${dateLike}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + amount);
  return base.toISOString().slice(0, 10);
}

function buildWindowKey(eventDate: string) {
  return `fixed_3d:${eventDate}`;
}

function safeFileStem(value: string) {
  return value.replace(/[^\w\s-]+/g, "").trim().replace(/\s+/g, "_").slice(0, 48) || "semilla";
}

export async function runSeedEventReminderJob(params?: {
  dryRun?: boolean;
  timeZone?: string;
  targetSendDate?: string;
  siteUrl?: string;
  seedId?: string;
  recipientOverride?: string[];
}) {
  const client = getSupabaseAdminClient();
  const dryRun = params?.dryRun === true;
  const timeZone = params?.timeZone ?? "Europe/Madrid";
  const today = params?.targetSendDate ?? todayInTimeZone(timeZone);
  const targetEventDate = addDays(today, 3);
  const siteUrl = params?.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const specificSeedId = String(params?.seedId ?? "").trim();
  const overrideRecipients = Array.from(
    new Set(
      ((params?.recipientOverride ?? []) as string[])
        .map((entry) => String(entry ?? "").trim().toLowerCase())
        .filter(Boolean),
    ),
  );

  let seedQuery = client
    // multigarden-smoke: allow-unscoped seeds -- service-role reminder job intentionally scans due seeds across all gardens.
    .from("seeds")
    .select("id,title,garden_id,scheduled_date,status,bloomed_page_id,created_at");

  if (specificSeedId) {
    seedQuery = seedQuery.eq("id", specificSeedId);
  } else {
    seedQuery = seedQuery
      .eq("scheduled_date", targetEventDate)
      .is("bloomed_page_id", null)
      .neq("status", "planning_draft")
      .order("created_at", { ascending: false });
  }

  const { data: dueSeeds, error: seedError } = await seedQuery;

  if (seedError) {
    throw new Error(toErrorMessage(seedError, "No se pudieron leer semillas para recordatorio."));
  }

  const result: SeedReminderRunResult = {
    checked: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  for (const row of ((dueSeeds as Array<Record<string, unknown>> | null) ?? [])) {
    const seedId = String(row.id ?? "").trim();
    const title = String(row.title ?? "Semilla").trim() || "Semilla";
    const gardenId = String(row.garden_id ?? "").trim();
    const scheduledDate = String(row.scheduled_date ?? "").trim();
    const status = String(row.status ?? "").trim();
    const bloomedPageId = String(row.bloomed_page_id ?? "").trim();
    if (!seedId || !gardenId) continue;

    result.checked += 1;

    if (!scheduledDate) {
      result.skipped += 1;
      result.details.push({
        seedId,
        title,
        status: "skipped",
        reason: "La semilla no tiene fecha programada.",
      });
      continue;
    }

    if (status === "planning_draft") {
      result.skipped += 1;
      result.details.push({
        seedId,
        title,
        status: "skipped",
        reason: "La semilla sigue en preparacion y no puede recordarse por email.",
      });
      continue;
    }

    if (bloomedPageId) {
      result.skipped += 1;
      result.details.push({
        seedId,
        title,
        status: "skipped",
        reason: "La semilla ya florecio.",
      });
      continue;
    }

    if (!specificSeedId && scheduledDate !== targetEventDate) {
      result.skipped += 1;
      result.details.push({
        seedId,
        title,
        status: "skipped",
        reason: `No entra en la ventana fija de 3 dias (${targetEventDate}).`,
      });
      continue;
    }

    let deliveryWindowKey = buildWindowKey(scheduledDate);
    let reminderKind = "seed_event_email";
    let targetRecipientEmails: string[] = [];
    let detailRecipientMode: "garden" | "override" = overrideRecipients.length
      ? "override"
      : "garden";

    try {
      const summary = await loadSeedEventSummaryModel({
        client,
        seedId,
        gardenId,
      });

      if (!summary) {
        result.skipped += 1;
        result.details.push({
          seedId,
          title,
          status: "skipped",
          reason: "No se pudo construir el resumen de la semilla.",
        });
        continue;
      }

      const recipients = await loadSeedEventReminderRecipients({ client, gardenId });
      if (!recipients.length) {
        result.skipped += 1;
        result.details.push({
          seedId,
          title,
          status: "skipped",
          reason: "No hay destinatarios con email.",
        });
        continue;
      }

      const recipientEmails = overrideRecipients.length
        ? overrideRecipients
        : recipients.map((recipient) => recipient.email);
      const recipientMode = overrideRecipients.length ? "override" : "garden";
      const windowKeyBase = buildWindowKey(scheduledDate);
      deliveryWindowKey = overrideRecipients.length
        ? `${windowKeyBase}:override:${createHash("sha1").update(recipientEmails.join(",")).digest("hex").slice(0, 12)}`
        : windowKeyBase;
      reminderKind = overrideRecipients.length
        ? "seed_event_email_override"
        : "seed_event_email";
      targetRecipientEmails = recipientEmails;
      detailRecipientMode = recipientMode;

      const { data: existingDelivery, error: deliveryError } = await client
        .from("seed_event_reminder_deliveries")
        .select("id,status")
        .eq("seed_id", seedId)
        .eq("delivery_window_key", deliveryWindowKey)
        .maybeSingle();

      if (deliveryError) {
        throw new Error(
          toErrorMessage(deliveryError, `No se pudo revisar el log de recordatorio para ${title}.`),
        );
      }

      const previousStatus = String(
        (existingDelivery as { status?: unknown } | null)?.status ?? "",
      ).trim();
      if (previousStatus === "sent") {
        result.skipped += 1;
        result.details.push({
          seedId,
          title,
          status: "skipped",
          reason:
            recipientMode === "override"
              ? "Ya se envio a este override en esta ventana."
              : "Ya se envio en esta ventana.",
          recipients: recipientEmails,
          recipientMode,
        });
        continue;
      }

      const emailModel = buildSeedEventReminderEmailModel(summary, { siteUrl });
      const pdfBytes = await buildSeedEventPdfBytes(summary);
      const icsContent = buildSeedEventCalendarText(summary);
      const snapshotHash = createHash("sha256")
        .update(JSON.stringify(summary))
        .digest("hex");
      const calendarUid = buildSeedEventCalendarUid(seedId);

      if (dryRun) {
        result.skipped += 1;
        result.details.push({
          seedId,
          title,
          status: "skipped",
          reason: "Dry run: envio no ejecutado.",
          recipients: recipientEmails,
          recipientMode,
          subject: emailModel.subject,
        });
        continue;
      }

      const fileStem = safeFileStem(summary.seed.title);
      const sendResult = await sendSeedEventReminderEmail({
        to: recipientEmails,
        model: emailModel,
        pdfBytes,
        icsContent,
        pdfFileName: `LibroVivo_${fileStem}.pdf`,
        icsFileName: `LibroVivo_${fileStem}.ics`,
      });

      const deliveryPayload = {
        seed_id: seedId,
        garden_id: gardenId,
        reminder_kind: reminderKind,
        delivery_window_key: deliveryWindowKey,
        scheduled_for: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        status: "sent",
        provider_message_id: sendResult.providerMessageId,
        recipient_emails: recipientEmails,
        seed_snapshot_hash: snapshotHash,
        calendar_uid: calendarUid,
        error_message: null,
      };

      const { error: upsertError } = await client
        .from("seed_event_reminder_deliveries")
        .upsert(deliveryPayload, { onConflict: "seed_id,delivery_window_key" });

      if (upsertError) {
        throw new Error(
          toErrorMessage(upsertError, `No se pudo registrar el envio de ${title}.`),
        );
      }

      result.sent += 1;
      result.details.push({
        seedId,
        title,
        status: "sent",
        recipients: recipientEmails,
        recipientMode,
        subject: emailModel.subject,
      });
    } catch (error: unknown) {
      const errorMessage = toErrorMessage(error, "Fallo enviando recordatorio.");
      const { error: logError } = await client
        .from("seed_event_reminder_deliveries")
        .upsert(
          {
            seed_id: seedId,
            garden_id: gardenId,
            reminder_kind: reminderKind,
            delivery_window_key: deliveryWindowKey,
            scheduled_for: new Date().toISOString(),
            sent_at: null,
            status: "failed",
            provider_message_id: null,
            recipient_emails: targetRecipientEmails,
            seed_snapshot_hash: null,
            calendar_uid: buildSeedEventCalendarUid(seedId),
            error_message: errorMessage,
          },
          { onConflict: "seed_id,delivery_window_key" },
        );

      if (logError) {
        throw new Error(
          `${errorMessage} Ademas, no se pudo registrar el fallo: ${toErrorMessage(logError, "")}`,
        );
      }

      result.failed += 1;
      result.details.push({
        seedId,
        title,
        status: "failed",
        reason: errorMessage,
        recipients: targetRecipientEmails,
        recipientMode: detailRecipientMode,
      });
    }
  }

  return result;
}
