"use client";

import type { GardenChatMessageAttachmentRow } from "@/lib/gardenChatMedia";

export type GardenChatRoomKind = "main" | "topic" | "system";
export type GardenChatMessageKind =
  | "text"
  | "voice_note"
  | "attachment"
  | "reference"
  | "system"
  | "audio_session_event";

export type GardenChatRoomRow = {
  id: string;
  garden_id: string;
  slug: string;
  title: string;
  room_kind: GardenChatRoomKind;
  sort_order: number;
  archived_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type GardenChatMessageRow = {
  id: string;
  room_id: string;
  garden_id: string;
  author_user_id: string;
  client_message_id: string;
  kind: GardenChatMessageKind;
  body_text: string | null;
  reply_to_message_id: string | null;
  metadata: Record<string, unknown> | null;
  edited_at: string | null;
  deleted_at: string | null;
  deleted_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type GardenChatAttachmentMap = Map<string, GardenChatMessageAttachmentRow[]>;
export type GardenChatDeliveryStatus = "sent" | "delivered" | "read";
export type GardenChatReactionRow = {
  message_id: string;
  room_id: string;
  garden_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};
export type GardenChatReactionMap = Map<string, GardenChatReactionRow[]>;

export type GardenChatReadStateRow = {
  room_id: string;
  garden_id: string;
  user_id: string;
  last_read_message_id: string | null;
  last_read_at: string;
  updated_at: string;
};

export type GardenChatMember = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  memberRole: string;
};

export type GardenChatPresence = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  inChat: boolean;
  updatedAt: string;
};

export function gardenChatLiveChannelName(input: {
  gardenId: string | null | undefined;
  roomId: string | null | undefined;
}) {
  const gardenId = String(input.gardenId ?? "").trim();
  const roomId = String(input.roomId ?? "").trim();
  if (!gardenId || !roomId) return null;
  return `garden-chat-live:${gardenId}:${roomId}`;
}

export function gardenChatDbChannelName(input: {
  roomId: string | null | undefined;
}) {
  const roomId = String(input.roomId ?? "").trim();
  if (!roomId) return null;
  return `garden-chat-db:${roomId}`;
}

export function normalizeGardenChatBody(value: string) {
  const lines = value.replace(/\r\n/g, "\n").split("\n");
  const trimmedLines = lines.map((line) => line.trimEnd());
  return trimmedLines.join("\n").trim();
}

export function isGardenChatSchemaMissingMessage(message: string | null | undefined) {
  const text = String(message ?? "").trim().toLowerCase();
  if (!text) return false;
  return (
    text.includes("garden_chat_") ||
    text.includes("garden audio") ||
    text.includes("does not exist") ||
    text.includes("relation") ||
    text.includes("column")
  );
}

export function formatGardenChatTime(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatGardenChatDay(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
}

export function buildGardenChatPresenceList(
  input: Record<string, Array<Partial<GardenChatPresence>>>,
) {
  const latestByUserId = new Map<string, GardenChatPresence>();

  for (const entries of Object.values(input)) {
    for (const entry of entries) {
      const userId = String(entry.userId ?? "").trim();
      if (!userId) continue;
      const candidate: GardenChatPresence = {
        userId,
        name: String(entry.name ?? "Sin nombre").trim() || "Sin nombre",
        avatarUrl:
          typeof entry.avatarUrl === "string" && entry.avatarUrl.trim()
            ? entry.avatarUrl.trim()
            : null,
        inChat: Boolean(entry.inChat),
        updatedAt: String(entry.updatedAt ?? new Date(0).toISOString()),
      };
      const existing = latestByUserId.get(userId);
      if (!existing || candidate.updatedAt >= existing.updatedAt) {
        latestByUserId.set(userId, candidate);
      }
    }
  }

  return [...latestByUserId.values()].sort(
    (left, right) => left.name.localeCompare(right.name, "es") || left.userId.localeCompare(right.userId),
  );
}

export function buildGardenChatAttachmentMap(rows: GardenChatMessageAttachmentRow[]) {
  const grouped = new Map<string, GardenChatMessageAttachmentRow[]>();
  for (const row of rows) {
    const existing = grouped.get(row.message_id) ?? [];
    existing.push(row);
    grouped.set(row.message_id, existing);
  }
  return grouped;
}

export function buildGardenChatReactionMap(rows: GardenChatReactionRow[]) {
  const grouped = new Map<string, GardenChatReactionRow[]>();
  for (const row of rows) {
    const existing = grouped.get(row.message_id) ?? [];
    existing.push(row);
    grouped.set(row.message_id, existing);
  }
  return grouped;
}

export function isPersistedGardenChatMessageId(value: string | null | undefined) {
  const id = String(value ?? "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export function resolveGardenChatDeliveryStatus(input: {
  message: GardenChatMessageRow;
  myProfileId: string | null | undefined;
  latestOtherReadAt: string | null | undefined;
  latestOtherReadStateUpdatedAt: string | null | undefined;
  hasOtherPresence: boolean;
}) {
  const myProfileId = String(input.myProfileId ?? "").trim();
  if (!myProfileId) return null;
  if (input.message.author_user_id !== myProfileId) return null;

  const latestOtherReadAt = String(input.latestOtherReadAt ?? "").trim();
  if (latestOtherReadAt && input.message.created_at <= latestOtherReadAt) {
    return "read" satisfies GardenChatDeliveryStatus;
  }

  const latestOtherReadStateUpdatedAt = String(input.latestOtherReadStateUpdatedAt ?? "").trim();
  if (
    input.hasOtherPresence ||
    (latestOtherReadStateUpdatedAt && latestOtherReadStateUpdatedAt > input.message.created_at)
  ) {
    return "delivered" satisfies GardenChatDeliveryStatus;
  }

  return "sent" satisfies GardenChatDeliveryStatus;
}
