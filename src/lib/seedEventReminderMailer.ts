import type { SeedEventReminderEmailModel } from "@/lib/seedEventReminderTypes";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderSeedEventReminderHtml(model: SeedEventReminderEmailModel) {
  const sectionHtml = model.sections
    .map(
      (section) => `
        <div style="margin:0 0 20px 0;">
          <div style="font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#5f7168;margin:0 0 8px 0;">${escapeHtml(section.title)}</div>
          ${section.lines
            .map(
              (line) => `<div style="font-size:15px;line-height:1.6;color:#203129;margin:0 0 6px 0;">${escapeHtml(line)}</div>`,
            )
            .join("")}
        </div>`,
    )
    .join("");

  return `
    <div style="background:#f5f7f2;padding:24px;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #d6dfd4;border-radius:24px;padding:28px;">
        <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#687c73;margin:0 0 10px 0;">Libro Vivo</div>
        <h1 style="margin:0 0 14px 0;font-size:28px;line-height:1.2;color:#1b2d24;">${escapeHtml(model.subject)}</h1>
        <p style="margin:0 0 18px 0;font-size:16px;line-height:1.7;color:#35463d;">${escapeHtml(model.introLine)}</p>
        ${sectionHtml}
        <div style="margin:26px 0;">
          <a href="${escapeHtml(model.ctaUrl)}" style="display:inline-block;background:#2f6c4a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:600;">
            ${escapeHtml(model.ctaLabel)}
          </a>
        </div>
        <p style="margin:0;font-size:15px;line-height:1.7;color:#52645b;">${escapeHtml(model.closingLine)}</p>
      </div>
    </div>
  `;
}

export function renderSeedEventReminderText(model: SeedEventReminderEmailModel) {
  return [
    model.subject,
    "",
    model.introLine,
    "",
    ...model.sections.flatMap((section) => [
      section.title.toUpperCase(),
      ...section.lines.map((line) => `- ${line}`),
      "",
    ]),
    model.closingLine,
    "",
    `${model.ctaLabel}: ${model.ctaUrl}`,
  ].join("\n");
}

export async function sendSeedEventReminderEmail(params: {
  to: string[];
  model: SeedEventReminderEmailModel;
  pdfBytes: Uint8Array;
  icsContent: string;
  pdfFileName: string;
  icsFileName: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SEED_EVENT_REMINDER_FROM_EMAIL;
  const replyTo = String(process.env.SEED_EVENT_REMINDER_REPLY_TO ?? "").trim();

  if (!apiKey || !from) {
    throw new Error(
      "Falta RESEND_API_KEY o SEED_EVENT_REMINDER_FROM_EMAIL para enviar recordatorios.",
    );
  }

  const html = renderSeedEventReminderHtml(params.model);
  const text = renderSeedEventReminderText(params.model);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: params.to,
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject: params.model.subject,
      html,
      text,
      attachments: [
        {
          filename: params.pdfFileName,
          content: Buffer.from(params.pdfBytes).toString("base64"),
        },
        {
          filename: params.icsFileName,
          content: Buffer.from(params.icsContent, "utf8").toString("base64"),
        },
      ],
    }),
  });

  const body = (await response.json().catch(() => null)) as
    | { id?: string; message?: string; error?: unknown }
    | null;

  if (!response.ok) {
    throw new Error(
      String(body?.message ?? body?.error ?? "No se pudo enviar el recordatorio por email."),
    );
  }

  return {
    providerMessageId: String(body?.id ?? "").trim() || null,
  };
}
