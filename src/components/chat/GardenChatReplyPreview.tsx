"use client";

import type { GardenChatMessageRow } from "@/lib/gardenChat";
import type { GardenChatMessageAttachmentRow } from "@/lib/gardenChatMedia";
import { normalizeGardenChatReferenceMetadata } from "@/lib/gardenChatReferences";

type GardenChatReplyPreviewProps = {
  mode: "composer" | "message";
  message: GardenChatMessageRow | null;
  attachments: GardenChatMessageAttachmentRow[];
  authorName: string;
  mine: boolean;
  onCancel?: () => void;
};

function resolveReplySummary(input: {
  message: GardenChatMessageRow | null;
  attachments: GardenChatMessageAttachmentRow[];
}) {
  if (!input.message) {
    return {
      title: "Mensaje no disponible",
      body: "La referencia de respuesta ya no esta disponible.",
    };
  }

  if (input.message.deleted_at) {
    return {
      title: "Mensaje eliminado",
      body: "La respuesta apunta a un mensaje que ya fue eliminado.",
    };
  }

  const reference =
    input.message.kind === "reference"
      ? normalizeGardenChatReferenceMetadata(input.message.metadata)
      : null;

  if (reference) {
    return {
      title: reference.title,
      body: reference.snippet,
    };
  }

  if (input.attachments.length) {
    const first = input.attachments[0];
    const label =
      first.attachment_kind === "audio"
        ? "Nota de voz"
        : first.attachment_kind === "image"
          ? "Imagen"
          : first.attachment_kind === "video"
            ? "Video"
            : "Archivo";
    return {
      title: label,
      body: first.preview_text?.trim() || "Adjunto privado",
    };
  }

  return {
    title: input.message.kind === "text" ? "Mensaje" : "Contenido",
    body: input.message.body_text?.trim() || "Sin texto",
  };
}

export function GardenChatReplyPreview({
  mode,
  message,
  attachments,
  authorName,
  mine,
  onCancel,
}: GardenChatReplyPreviewProps) {
  const summary = resolveReplySummary({ message, attachments });
  const baseClassName =
    mode === "composer"
      ? "mb-2 rounded-[18px] border border-[#e2d6c8] bg-[#fffaf2] px-3 py-2"
      : mine
        ? "mb-2 rounded-[18px] border border-white/18 bg-white/10 px-3 py-2"
        : "mb-2 rounded-[18px] border border-[#eadfce] bg-[#fff7ee] px-3 py-2";

  const titleClassName =
    mode === "composer"
      ? "text-[#5f5448]"
      : mine
        ? "text-white/82"
        : "text-[#6e6052]";

  const bodyClassName =
    mode === "composer"
      ? "text-[#8a7a69]"
      : mine
        ? "text-white/72"
        : "text-[#8a7a69]";

  return (
    <div className={baseClassName} data-testid={mode === "composer" ? "garden-chat-reply-composer" : "garden-chat-reply-preview"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`truncate text-[11px] font-semibold uppercase tracking-[0.12em] ${titleClassName}`}>
            Respondiendo a {authorName}
          </div>
          <div className={`mt-1 truncate text-sm font-medium ${titleClassName}`}>
            {summary.title}
          </div>
          <div className={`truncate text-[13px] ${bodyClassName}`}>{summary.body}</div>
        </div>
        {mode === "composer" && onCancel ? (
          <button
            type="button"
            className="rounded-full border border-[#dccfbe] px-2.5 py-1 text-[11px] font-semibold text-[#7d6b59] transition hover:bg-white"
            onClick={onCancel}
          >
            Quitar
          </button>
        ) : null}
      </div>
    </div>
  );
}
