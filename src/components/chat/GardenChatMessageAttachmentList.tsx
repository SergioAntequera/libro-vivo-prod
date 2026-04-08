"use client";

import type { ReactNode } from "react";
import { AudioLines, ExternalLink, FileText, ImageIcon, Video } from "lucide-react";
import {
  formatGardenChatAttachmentSize,
  formatGardenChatDurationMs,
  type GardenChatMessageAttachmentRow,
} from "@/lib/gardenChatMedia";
import { useGardenChatAttachmentUrls } from "@/components/chat/useGardenChatAttachmentUrls";

type GardenChatMessageAttachmentListProps = {
  attachments: GardenChatMessageAttachmentRow[];
  mine: boolean;
};

function resolveAttachmentLabel(attachment: GardenChatMessageAttachmentRow) {
  if (attachment.attachment_kind === "audio") return "Nota de voz";
  if (attachment.attachment_kind === "image") return "Imagen";
  if (attachment.attachment_kind === "video") return "Video";
  return "Archivo";
}

type AttachmentIconKey = "audio" | "image" | "video" | "file";

const ATTACHMENT_ICON_BY_KEY = {
  audio: AudioLines,
  image: ImageIcon,
  video: Video,
  file: FileText,
};

function resolveAttachmentIconKey(attachment: GardenChatMessageAttachmentRow): AttachmentIconKey {
  if (attachment.attachment_kind === "audio") return "audio";
  if (attachment.attachment_kind === "image") return "image";
  if (attachment.attachment_kind === "video") return "video";
  return "file";
}

function AttachmentIcon({ attachment }: { attachment: GardenChatMessageAttachmentRow }) {
  const IconComponent = ATTACHMENT_ICON_BY_KEY[resolveAttachmentIconKey(attachment)];
  return <IconComponent size={16} />;
}

function AttachmentMeta({
  attachment,
  mine,
}: {
  attachment: GardenChatMessageAttachmentRow;
  mine: boolean;
}) {
  const parts = [
    attachment.preview_text?.trim() || null,
    formatGardenChatAttachmentSize(attachment.size_bytes) || null,
    formatGardenChatDurationMs(attachment.duration_ms) || null,
  ].filter(Boolean);

  if (!parts.length) return null;

  return (
    <div className={`mt-2 text-[11px] ${mine ? "text-white/78" : "text-[#806f60]"}`}>
      {parts.join(" · ")}
    </div>
  );
}

function AttachmentShell({
  mine,
  attachment,
  children,
  actionHref,
}: {
  mine: boolean;
  attachment: GardenChatMessageAttachmentRow;
  children: ReactNode;
  actionHref?: string;
}) {
  return (
    <div
      className={
        mine
          ? "rounded-[20px] border border-white/18 bg-white/10 p-3"
          : "rounded-[20px] border border-[#eadfce] bg-[#fffaf4] p-3"
      }
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              mine ? "bg-white/14 text-white" : "bg-[#f2e7d7] text-[#6e5d4d]"
            }`}
          >
            <AttachmentIcon attachment={attachment} />
          </span>
          <div className="min-w-0">
            <div className={`truncate text-sm font-semibold ${mine ? "text-white" : "text-[#2f261d]"}`}>
              {resolveAttachmentLabel(attachment)}
            </div>
            <div className={`truncate text-[12px] ${mine ? "text-white/72" : "text-[#816f5e]"}`}>
              {attachment.mime_type || "Adjunto privado"}
            </div>
          </div>
        </div>
        {actionHref ? (
          <a
            href={actionHref}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition ${
              mine
                ? "border-white/28 bg-white/10 text-white hover:bg-white/16"
                : "border-[#d8cab8] bg-white text-[#4a5d52] hover:bg-[#f8f4ec]"
            }`}
            aria-label={`Abrir ${resolveAttachmentLabel(attachment)}`}
          >
            <ExternalLink size={14} />
          </a>
        ) : null}
      </div>
      {children}
      <AttachmentMeta attachment={attachment} mine={mine} />
    </div>
  );
}

function PendingPrivateAttachment({
  attachment,
  mine,
}: {
  attachment: GardenChatMessageAttachmentRow;
  mine: boolean;
}) {
  return (
    <AttachmentShell mine={mine} attachment={attachment}>
      <div className={`text-sm ${mine ? "text-white/84" : "text-[#5d5144]"}`}>
        Preparando adjunto privado...
      </div>
    </AttachmentShell>
  );
}

export function GardenChatMessageAttachmentList({
  attachments,
  mine,
}: GardenChatMessageAttachmentListProps) {
  const resolvedUrlsById = useGardenChatAttachmentUrls(attachments);

  if (!attachments.length) return null;

  return (
    <div className="mt-3 space-y-3">
      {attachments.map((attachment) => {
        const resolvedUrl = resolvedUrlsById[attachment.id] || "";

        if (!resolvedUrl) {
          return (
            <PendingPrivateAttachment
              key={attachment.id}
              attachment={attachment}
              mine={mine}
            />
          );
        }

        if (attachment.attachment_kind === "image") {
          return (
            <AttachmentShell
              key={attachment.id}
              mine={mine}
              attachment={attachment}
              actionHref={resolvedUrl}
            >
              <a href={resolvedUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-[16px]">
                <img
                  src={resolvedUrl}
                  alt={attachment.preview_text?.trim() || "Imagen del chat"}
                  className="max-h-[260px] w-full rounded-[16px] object-cover"
                />
              </a>
            </AttachmentShell>
          );
        }

        if (attachment.attachment_kind === "audio") {
          return (
            <AttachmentShell
              key={attachment.id}
              mine={mine}
              attachment={attachment}
              actionHref={resolvedUrl}
            >
              <audio
                controls
                preload="metadata"
                src={resolvedUrl}
                className="w-full"
                data-testid="garden-chat-audio-attachment"
              />
            </AttachmentShell>
          );
        }

        if (attachment.attachment_kind === "video") {
          return (
            <AttachmentShell
              key={attachment.id}
              mine={mine}
              attachment={attachment}
              actionHref={resolvedUrl}
            >
              <video
                controls
                preload="metadata"
                src={resolvedUrl}
                className="max-h-[280px] w-full rounded-[16px] bg-black/20"
              />
            </AttachmentShell>
          );
        }

        return (
          <AttachmentShell
            key={attachment.id}
            mine={mine}
            attachment={attachment}
            actionHref={resolvedUrl}
          >
            <div
              className={`rounded-[16px] border px-3 py-3 ${
                mine
                  ? "border-white/14 bg-black/10 text-white/88"
                  : "border-[#eadfce] bg-white text-[#3c3228]"
              }`}
            >
              <div className="truncate text-sm font-medium">
                {attachment.preview_text?.trim() || "Archivo privado"}
              </div>
              <div className={`mt-1 text-[12px] ${mine ? "text-white/72" : "text-[#857565]"}`}>
                Se abrira en una pestana nueva.
              </div>
            </div>
          </AttachmentShell>
        );
      })}
    </div>
  );
}
