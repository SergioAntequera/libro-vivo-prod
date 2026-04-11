"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getSessionAccessToken } from "@/lib/auth";
import { isSchemaNotReadyError } from "@/lib/gardens";
import { toErrorMessage } from "@/lib/errorMessage";
import { useSharedPresenceSessions } from "@/lib/useSharedPresenceSessions";
import {
  buildGardenChatAttachmentMap,
  buildGardenChatReactionMap,
  gardenChatDbChannelName,
  gardenChatLiveChannelName,
  isPersistedGardenChatMessageId,
  normalizeGardenChatBody,
  type GardenChatMember,
  type GardenChatMessageRow,
  type GardenChatPresence,
  type GardenChatReactionRow,
  type GardenChatReadStateRow,
  type GardenChatRoomRow,
} from "@/lib/gardenChat";
import type { GardenChatMessageAttachmentRow } from "@/lib/gardenChatMedia";
import {
  GARDEN_CHAT_ATTACHMENT_SELECT,
  ensureGardenChatMainRoom,
  GARDEN_CHAT_MESSAGE_SELECT,
  GARDEN_CHAT_REACTION_SELECT,
  addGardenChatMessageReaction,
  insertGardenChatMessage,
  removeGardenChatMessageReaction,
  softDeleteOwnGardenChatMessage,
  updateGardenChatMessageBody,
} from "@/lib/gardenChatMutations";

type UseGardenChatRoomParams = {
  gardenId: string | null;
  myProfileId: string | null;
  myDisplayName: string;
  myAvatarUrl: string | null;
  reloadTick?: number;
  liveEnabled?: boolean;
  isViewingThread?: boolean;
};

type UseGardenChatRoomResult = {
  loading: boolean;
  msg: string | null;
  setMsg: Dispatch<SetStateAction<string | null>>;
  schemaMissing: boolean;
  room: GardenChatRoomRow | null;
  members: GardenChatMember[];
  messages: GardenChatMessageRow[];
  attachmentsByMessageId: Map<string, GardenChatMessageAttachmentRow[]>;
  reactionsByMessageId: Map<string, GardenChatReactionRow[]>;
  readStates: GardenChatReadStateRow[];
  presence: GardenChatPresence[];
  liveConnected: boolean;
  draft: string;
  setDraft: Dispatch<SetStateAction<string>>;
  sending: boolean;
  composerFocused: boolean;
  setComposerFocused: Dispatch<SetStateAction<boolean>>;
  refreshRoom: () => Promise<void>;
  sendMessage: (options?: { replyToMessageId?: string | null }) => Promise<boolean>;
  editMessage: (messageId: string, nextBody: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  messageActionPendingById: Record<string, "edit" | "delete">;
  reactionPendingKeys: Record<string, true>;
  myUnreadCount: number;
  typingNames: string[];
};

type ProfileLookupRow = {
  id: string;
  name: string | null;
  avatar_url: string | null;
};

type GardenApiParticipantRow = {
  id?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
};

type GardensApiPayload = {
  gardens?: Array<{
    id?: string | null;
    participants?: GardenApiParticipantRow[] | null;
  }> | null;
};

function sortMessages(rows: GardenChatMessageRow[]) {
  return [...rows].sort((left, right) => {
    if (left.created_at === right.created_at) return left.id.localeCompare(right.id);
    return left.created_at.localeCompare(right.created_at);
  });
}

function mapChatMembers(rows: Array<{ user_id?: string; member_role?: string }>, profiles: ProfileLookupRow[]) {
  const profileById = new Map(profiles.map((row) => [row.id, row] as const));
  return rows
    .map((row) => {
      const userId = String(row.user_id ?? "").trim();
      if (!userId) return null;
      const profile = profileById.get(userId) ?? null;
      return {
        userId,
        name: String(profile?.name ?? "").trim() || "Sin nombre",
        avatarUrl: typeof profile?.avatar_url === "string" && profile.avatar_url.trim()
          ? profile.avatar_url.trim()
          : null,
        memberRole: String(row.member_role ?? "editor").trim() || "editor",
      } satisfies GardenChatMember;
    })
    .filter((row): row is GardenChatMember => row !== null)
    .sort((left, right) => left.name.localeCompare(right.name, "es") || left.userId.localeCompare(right.userId));
}

function mapGardenApiMembers(rows: GardenApiParticipantRow[]) {
  return rows
    .map((row) => {
      const userId = String(row.id ?? "").trim();
      if (!userId) return null;
      return {
        userId,
        name: String(row.name ?? "").trim() || "Sin nombre",
        avatarUrl:
          typeof row.avatarUrl === "string" && row.avatarUrl.trim()
            ? row.avatarUrl.trim()
            : null,
        memberRole: String(row.role ?? "editor").trim() || "editor",
      } satisfies GardenChatMember;
    })
    .filter((row): row is GardenChatMember => row !== null)
    .sort((left, right) => left.name.localeCompare(right.name, "es") || left.userId.localeCompare(right.userId));
}

function isGardenChatSchemaMissing(error: unknown) {
  if (isSchemaNotReadyError(error)) return true;
  const message = toErrorMessage(error, "").toLowerCase();
  return message.includes("garden_chat_") || message.includes("garden_audio_");
}

export function useGardenChatRoom({
  gardenId,
  myProfileId,
  myDisplayName,
  myAvatarUrl,
  reloadTick = 0,
  liveEnabled = true,
  isViewingThread = true,
}: UseGardenChatRoomParams): UseGardenChatRoomResult {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [room, setRoom] = useState<GardenChatRoomRow | null>(null);
  const [members, setMembers] = useState<GardenChatMember[]>([]);
  const [messages, setMessages] = useState<GardenChatMessageRow[]>([]);
  const [attachments, setAttachments] = useState<GardenChatMessageAttachmentRow[]>([]);
  const [reactions, setReactions] = useState<GardenChatReactionRow[]>([]);
  const [readStates, setReadStates] = useState<GardenChatReadStateRow[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [composerFocused, setComposerFocused] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);
  const [typingConnected, setTypingConnected] = useState(false);
  const [typingByUserId, setTypingByUserId] = useState<Record<string, string>>({});
  const [messageActionPendingById, setMessageActionPendingById] = useState<
    Record<string, "edit" | "delete">
  >({});
  const [reactionPendingKeys, setReactionPendingKeys] = useState<Record<string, true>>({});
  const liveChannelRef = useRef<RealtimeChannel | null>(null);
  const dbChannelRef = useRef<RealtimeChannel | null>(null);
  const lastReadMessageIdRef = useRef("");
  const roomId = String(room?.id ?? "").trim();
  const wantsTypingSignal = useMemo(
    () => composerFocused && normalizeGardenChatBody(draft).length > 0,
    [composerFocused, draft],
  );

  const sharedPresence = useSharedPresenceSessions({
    displayName: myDisplayName,
    enabled: liveEnabled && Boolean(roomId) && Boolean(myProfileId) && Boolean(gardenId),
    gardenId,
    localActivityLabel: wantsTypingSignal ? "Escribiendo" : isViewingThread ? "En el hilo" : "Fuera del hilo",
    localFocusKey: isViewingThread ? "thread" : "launcher",
    localFocusLabel: isViewingThread ? "Hilo principal" : "Chat minimizado",
    scopeKey: roomId,
    scopeKind: "garden_chat",
    userId: myProfileId,
  });

  const presence = useMemo<GardenChatPresence[]>(
    () =>
      sharedPresence.participants.map((participant) => ({
        avatarUrl: null,
        inChat: true,
        name: participant.name,
        updatedAt: participant.updatedAt,
        userId: participant.userId,
      })),
    [sharedPresence.participants],
  );

  const loadMembers = useCallback(async (targetGardenId: string) => {
    const accessToken = await getSessionAccessToken().catch(() => null);
    if (accessToken) {
      try {
        const response = await fetch("/api/gardens", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          credentials: "same-origin",
        });
        if (response.ok) {
          const payload = (await response.json().catch(() => null)) as GardensApiPayload | null;
          const apiGarden = (payload?.gardens ?? []).find(
            (garden) => String(garden?.id ?? "").trim() === targetGardenId,
          );
          const apiMembers = mapGardenApiMembers(apiGarden?.participants ?? []);
          if (apiMembers.length) {
            return apiMembers;
          }
        }
      } catch {
        // Fallback to the direct RLS-safe query below.
      }
    }

    const memberRes = await supabase
      .from("garden_members")
      .select("user_id,member_role")
      .eq("garden_id", targetGardenId)
      .is("left_at", null)
      .order("joined_at", { ascending: true });

    if (memberRes.error) {
      throw memberRes.error;
    }

    const membershipRows =
      ((memberRes.data as Array<{ user_id?: string; member_role?: string }> | null) ?? []);
    const profileIds = membershipRows
      .map((row) => String(row.user_id ?? "").trim())
      .filter(Boolean);

    if (!profileIds.length) {
      return [] as GardenChatMember[];
    }

    const profileRes = await supabase
      .from("profiles")
      .select("id,name,avatar_url")
      .in("id", profileIds);

    if (profileRes.error) {
      throw profileRes.error;
    }

    return mapChatMembers(
      membershipRows,
      ((profileRes.data as ProfileLookupRow[] | null) ?? []),
    );
  }, []);

  const loadRoomRecord = useCallback(
    async (targetGardenId: string, currentProfileId: string) =>
      ensureGardenChatMainRoom({
        gardenId: targetGardenId,
        currentProfileId,
      }),
    [],
  );

  const loadMessages = useCallback(async (roomId: string) => {
    const res = await supabase
      .from("garden_chat_messages")
      .select(GARDEN_CHAT_MESSAGE_SELECT)
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(300);

    if (res.error) {
      throw res.error;
    }

    const rows = ((res.data as GardenChatMessageRow[] | null) ?? []).filter(
      () => true,
    );
    return sortMessages(rows);
  }, []);

  const loadAttachments = useCallback(async (messageIds: string[]) => {
    const normalizedIds = messageIds.map((value) => String(value ?? "").trim()).filter(Boolean);
    if (!normalizedIds.length) {
      return [] as GardenChatMessageAttachmentRow[];
    }

    const res = await supabase
      .from("garden_chat_message_attachments")
      .select(GARDEN_CHAT_ATTACHMENT_SELECT)
      .in("message_id", normalizedIds)
      .order("created_at", { ascending: true });

    if (res.error) {
      throw res.error;
    }

    return (res.data as GardenChatMessageAttachmentRow[] | null) ?? [];
  }, []);

  const loadReadStates = useCallback(async (roomId: string) => {
    const res = await supabase
      .from("garden_chat_read_states")
      .select("room_id,garden_id,user_id,last_read_message_id,last_read_at,updated_at")
      .eq("room_id", roomId);

    if (res.error) {
      throw res.error;
    }

    return ((res.data as GardenChatReadStateRow[] | null) ?? []);
  }, []);

  const loadReactions = useCallback(async (roomId: string) => {
    const res = await supabase
      .from("garden_chat_message_reactions")
      .select(GARDEN_CHAT_REACTION_SELECT)
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    if (res.error) {
      throw res.error;
    }

    return ((res.data as GardenChatReactionRow[] | null) ?? []);
  }, []);

  const refreshRoom = useCallback(async () => {
    const targetGardenId = String(gardenId ?? "").trim();
    const currentProfileId = String(myProfileId ?? "").trim();
    if (!targetGardenId || !currentProfileId) {
      setRoom(null);
      setMembers([]);
      setMessages([]);
      setAttachments([]);
      setReactions([]);
      setReadStates([]);
      setTypingByUserId({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setSchemaMissing(false);
      setMsg(null);

      const [nextMembers, nextRoom] = await Promise.all([
        loadMembers(targetGardenId),
        loadRoomRecord(targetGardenId, currentProfileId),
      ]);
      const [nextMessages, nextReadStates] = await Promise.all([
        loadMessages(nextRoom.id),
        loadReadStates(nextRoom.id),
      ]);
      const [nextAttachments, nextReactions] = await Promise.all([
        loadAttachments(nextMessages.map((message) => message.id)),
        loadReactions(nextRoom.id),
      ]);

      setMembers(nextMembers);
      setRoom(nextRoom);
      setMessages(nextMessages);
      setAttachments(nextAttachments);
      setReactions(nextReactions);
      setReadStates(nextReadStates);
    } catch (error) {
      setRoom(null);
      setMembers([]);
      setMessages([]);
      setAttachments([]);
      setReactions([]);
      setReadStates([]);
      setTypingByUserId({});
      if (isGardenChatSchemaMissing(error)) {
        setSchemaMissing(true);
        setMsg(
          "La base canonica de chat todavia no esta aplicada en esta base de datos. Falta ejecutar las migraciones de chat.",
        );
      } else {
        setMsg(toErrorMessage(error, "No se pudo cargar el chat del jardin."));
      }
    } finally {
      setLoading(false);
    }
  }, [
    gardenId,
    loadMembers,
    loadAttachments,
    loadMessages,
    loadReactions,
    loadReadStates,
    loadRoomRecord,
    myProfileId,
  ]);

  useEffect(() => {
    void refreshRoom();
  }, [refreshRoom, reloadTick]);

  useEffect(() => {
    lastReadMessageIdRef.current = "";
  }, [room?.id]);

  const refreshMessages = useCallback(async () => {
    const roomId = String(room?.id ?? "").trim();
    if (!roomId) return;
    try {
      const next = await loadMessages(roomId);
      setMessages(next);
    } catch (error) {
      if (!isGardenChatSchemaMissing(error)) {
        setMsg((current) => current ?? toErrorMessage(error, "No se pudo refrescar el hilo."));
      }
    }
  }, [loadMessages, room?.id]);

  const refreshAttachments = useCallback(async () => {
    const messageIds = messages
      .map((message) => String(message.id ?? "").trim())
      .filter((id) => id && !id.startsWith("optimistic:"));
    try {
      const next = await loadAttachments(messageIds);
      setAttachments(next);
    } catch (error) {
      if (!isGardenChatSchemaMissing(error)) {
        setMsg((current) => current ?? toErrorMessage(error, "No se pudieron refrescar los adjuntos del chat."));
      }
    }
  }, [loadAttachments, messages]);

  const refreshReadStates = useCallback(async () => {
    const roomId = String(room?.id ?? "").trim();
    if (!roomId) return;
    try {
      const next = await loadReadStates(roomId);
      setReadStates(next);
    } catch (error) {
      if (!isGardenChatSchemaMissing(error)) {
        setMsg(
          (current) => current ?? toErrorMessage(error, "No se pudo refrescar la lectura del chat."),
        );
      }
    }
  }, [loadReadStates, room?.id]);

  const refreshReactions = useCallback(async () => {
    const roomId = String(room?.id ?? "").trim();
    if (!roomId) return;
    try {
      const next = await loadReactions(roomId);
      setReactions(next);
    } catch (error) {
      if (!isGardenChatSchemaMissing(error)) {
        setMsg(
          (current) => current ?? toErrorMessage(error, "No se pudieron refrescar las reacciones del chat."),
        );
      }
    }
  }, [loadReactions, room?.id]);

  useEffect(() => {
    void refreshAttachments();
  }, [refreshAttachments]);

  useEffect(() => {
    const roomId = String(room?.id ?? "").trim();
    if (!roomId || !isViewingThread) return;

    const timer = window.setInterval(() => {
      void refreshMessages();
      void refreshReadStates();
      void refreshReactions();
    }, dbConnected ? 3_000 : 2_000);

    return () => window.clearInterval(timer);
  }, [dbConnected, isViewingThread, refreshMessages, refreshReadStates, refreshReactions, room?.id]);

  useEffect(() => {
    const roomId = String(room?.id ?? "").trim();
    const targetGardenId = String(gardenId ?? "").trim();
    const channelName = gardenChatDbChannelName({ roomId });
    if (!channelName) return;

    const channel = supabase.channel(channelName);
    dbChannelRef.current = channel;

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "garden_chat_messages",
        filter: `room_id=eq.${roomId}`,
      },
      () => {
        void refreshMessages();
      },
    );

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "garden_chat_read_states",
        filter: `room_id=eq.${roomId}`,
      },
      () => {
        void refreshReadStates();
      },
    );

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "garden_chat_message_reactions",
        filter: `room_id=eq.${roomId}`,
      },
      () => {
        void refreshReactions();
      },
    );

    if (targetGardenId) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "garden_chat_message_attachments",
          filter: `garden_id=eq.${targetGardenId}`,
        },
        () => {
          void refreshAttachments();
        },
      );
    }

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setDbConnected(true);
        return;
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        setDbConnected(false);
      }
    });

    return () => {
      setDbConnected(false);
      dbChannelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [gardenId, refreshAttachments, refreshMessages, refreshReadStates, refreshReactions, room?.id]);

  useEffect(() => {
    const targetGardenId = String(gardenId ?? "").trim();
    const roomId = String(room?.id ?? "").trim();
    const currentProfileId = String(myProfileId ?? "").trim();
    const channelName = gardenChatLiveChannelName({
      gardenId: targetGardenId,
      roomId,
    });

    if (!channelName || !currentProfileId || !liveEnabled) {
      setTypingByUserId({});
      setTypingConnected(false);
      return;
    }

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
      },
    });
    liveChannelRef.current = channel;

    channel.on("broadcast", { event: "typing" }, ({ payload }) => {
      const payloadUserId = String(payload?.userId ?? "").trim();
      if (!payloadUserId || payloadUserId === currentProfileId) return;

      if (payload?.typing) {
        setTypingByUserId((prev) => ({
          ...prev,
          [payloadUserId]: String(payload?.sentAt ?? new Date().toISOString()),
        }));
        return;
      }

      setTypingByUserId((prev) => {
        if (!(payloadUserId in prev)) return prev;
        const next = { ...prev };
        delete next[payloadUserId];
        return next;
      });
    });

    channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setTypingConnected(false);
        }
        return;
      }

      setTypingConnected(true);
    });

    return () => {
      setTypingConnected(false);
      liveChannelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [gardenId, liveEnabled, myAvatarUrl, myDisplayName, myProfileId, room?.id]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTypingByUserId((prev) => {
        const now = Date.now();
        let changed = false;
        const next = Object.fromEntries(
          Object.entries(prev).filter(([, sentAt]) => {
            const parsed = new Date(sentAt).getTime();
            const keep = Number.isFinite(parsed) && now - parsed < 4500;
            if (!keep) changed = true;
            return keep;
          }),
        );
        return changed ? next : prev;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const sendTyping = useCallback(
    async (typing: boolean) => {
      const currentProfileId = String(myProfileId ?? "").trim();
      if (!liveChannelRef.current || !currentProfileId) return;
      await liveChannelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: {
          userId: currentProfileId,
          name: myDisplayName,
          typing,
          sentAt: new Date().toISOString(),
        },
      });
    },
    [myDisplayName, myProfileId],
  );

  useEffect(() => {
    if (!liveEnabled) return;
    if (!typingConnected) return;
    if (!liveChannelRef.current) return;

    if (!wantsTypingSignal) {
      void sendTyping(false);
      return;
    }

    void sendTyping(true);
    const timer = window.setInterval(() => {
      void sendTyping(true);
    }, 2500);

    return () => {
      window.clearInterval(timer);
      void sendTyping(false);
    };
  }, [liveEnabled, sendTyping, typingConnected, wantsTypingSignal]);

  useEffect(() => {
    const roomId = String(room?.id ?? "").trim();
    if (!roomId) return;

    const refreshEverything = () => {
      void refreshMessages();
      void refreshReadStates();
      void refreshReactions();
      void refreshAttachments();
      void sharedPresence.refresh();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      refreshEverything();
    };

    window.addEventListener("focus", refreshEverything);
    window.addEventListener("online", refreshEverything);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("focus", refreshEverything);
      window.removeEventListener("online", refreshEverything);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    refreshAttachments,
    refreshMessages,
    refreshReadStates,
    refreshReactions,
    room?.id,
    sharedPresence.refresh,
  ]);

  const persistReadState = useCallback(
    async (messageId: string, messageCreatedAt: string) => {
      const roomId = String(room?.id ?? "").trim();
      const targetGardenId = String(gardenId ?? "").trim();
      const currentProfileId = String(myProfileId ?? "").trim();
      if (!roomId || !targetGardenId || !currentProfileId || !messageId) return;
      if (!isPersistedGardenChatMessageId(messageId)) return;
      if (lastReadMessageIdRef.current === messageId) return;

      lastReadMessageIdRef.current = messageId;
      const { error } = await supabase.from("garden_chat_read_states").upsert(
        {
          room_id: roomId,
          garden_id: targetGardenId,
          user_id: currentProfileId,
          last_read_message_id: messageId,
          last_read_at: messageCreatedAt,
        },
        { onConflict: "room_id,user_id" },
      );

      if (error) {
        lastReadMessageIdRef.current = "";
        if (!isGardenChatSchemaMissing(error)) {
          setMsg(
            (current) => current ?? toErrorMessage(error, "No se pudo actualizar la lectura del chat."),
          );
        }
      }
    },
    [gardenId, myProfileId, room?.id],
  );

  const myReadState = useMemo(() => {
    const currentProfileId = String(myProfileId ?? "").trim();
    if (!currentProfileId) return null;
    return readStates.find((row) => row.user_id === currentProfileId) ?? null;
  }, [myProfileId, readStates]);

  const latestPersistedVisibleMessage = useMemo(
    () =>
      [...messages]
        .reverse()
        .find((row) => row.deleted_at == null && isPersistedGardenChatMessageId(row.id)) ?? null,
    [messages],
  );

  useEffect(() => {
    if (!isViewingThread) return;
    const latestVisible = latestPersistedVisibleMessage;
    if (!latestVisible) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    if (myReadState?.last_read_message_id === latestVisible.id) {
      lastReadMessageIdRef.current = latestVisible.id;
      return;
    }

    const timer = window.setTimeout(() => {
      void persistReadState(latestVisible.id, latestVisible.created_at);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [
    isViewingThread,
    latestPersistedVisibleMessage,
    myReadState?.last_read_message_id,
    persistReadState,
  ]);

  useEffect(() => {
    if (!isViewingThread) return;
    if (typeof document === "undefined") return;

    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      const latestVisible = latestPersistedVisibleMessage;
      if (!latestVisible) return;
      void persistReadState(latestVisible.id, latestVisible.created_at);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isViewingThread, latestPersistedVisibleMessage, persistReadState]);

  const sendMessage = useCallback(async (options?: { replyToMessageId?: string | null }) => {
    const roomId = String(room?.id ?? "").trim();
    const targetGardenId = String(gardenId ?? "").trim();
    const currentProfileId = String(myProfileId ?? "").trim();
    const body = normalizeGardenChatBody(draft);
    const replyToMessageId = isPersistedGardenChatMessageId(options?.replyToMessageId)
      ? String(options?.replyToMessageId ?? "").trim()
      : null;
    if (!roomId || !targetGardenId || !currentProfileId || !body || sending) return false;

    const clientMessageId = crypto.randomUUID();
    const optimisticMessage: GardenChatMessageRow = {
      id: `optimistic:${clientMessageId}`,
      room_id: roomId,
      garden_id: targetGardenId,
      author_user_id: currentProfileId,
      client_message_id: clientMessageId,
      kind: "text",
      body_text: body,
      reply_to_message_id: replyToMessageId,
      metadata: {},
      edited_at: null,
      deleted_at: null,
      deleted_by_user_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setSending(true);
    setMsg(null);
    setDraft("");
    setMessages((prev) => sortMessages([...prev, optimisticMessage]));

    try {
      const data = await insertGardenChatMessage({
        roomId,
        gardenId: targetGardenId,
        authorUserId: currentProfileId,
        clientMessageId,
        kind: "text",
        bodyText: body,
        metadata: {},
        replyToMessageId,
      });

      setMessages((prev) =>
        sortMessages([
          ...prev.filter((row) => row.id !== optimisticMessage.id),
          data,
        ]),
      );
      void sendTyping(false);
      return true;
    } catch (error) {
      setMessages((prev) => prev.filter((row) => row.id !== optimisticMessage.id));
      setDraft(body);
      setMsg(toErrorMessage(error, "No se pudo enviar el mensaje."));
      return false;
    } finally {
      setSending(false);
    }
  }, [draft, gardenId, myProfileId, room?.id, sending, sendTyping]);

  const editMessage = useCallback(
    async (messageId: string, nextBody: string) => {
      const normalizedId = String(messageId ?? "").trim();
      const currentProfileId = String(myProfileId ?? "").trim();
      const normalizedBody = normalizeGardenChatBody(nextBody);
      if (!normalizedId || !currentProfileId || !normalizedBody) return;

      let previousMessage: GardenChatMessageRow | null = null;
      const optimisticEditedAt = new Date().toISOString();

      setMessageActionPendingById((prev) => ({
        ...prev,
        [normalizedId]: "edit",
      }));
      setMessages((prev) =>
        sortMessages(
          prev.map((row) => {
            if (row.id !== normalizedId) return row;
            previousMessage = row;
            return {
              ...row,
              body_text: normalizedBody,
              edited_at: optimisticEditedAt,
              updated_at: optimisticEditedAt,
            };
          }),
        ),
      );

      try {
        const updated = await updateGardenChatMessageBody({
          messageId: normalizedId,
          currentProfileId,
          bodyText: normalizedBody,
        });
        setMessages((prev) =>
          sortMessages(prev.map((row) => (row.id === normalizedId ? updated : row))),
        );
      } catch (error) {
        if (previousMessage) {
          setMessages((prev) =>
            sortMessages(prev.map((row) => (row.id === normalizedId ? previousMessage! : row))),
          );
        }
        setMsg(toErrorMessage(error, "No se pudo editar el mensaje."));
        throw error;
      } finally {
        setMessageActionPendingById((prev) => {
          const next = { ...prev };
          delete next[normalizedId];
          return next;
        });
      }
    },
    [myProfileId],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      const normalizedId = String(messageId ?? "").trim();
      const currentProfileId = String(myProfileId ?? "").trim();
      if (!normalizedId || !currentProfileId) return;

      let previousMessage: GardenChatMessageRow | null = null;
      const optimisticDeletedAt = new Date().toISOString();

      setMessageActionPendingById((prev) => ({
        ...prev,
        [normalizedId]: "delete",
      }));
      setMessages((prev) =>
        sortMessages(
          prev.map((row) => {
            if (row.id !== normalizedId) return row;
            previousMessage = row;
            return {
              ...row,
              deleted_at: optimisticDeletedAt,
              deleted_by_user_id: currentProfileId,
              updated_at: optimisticDeletedAt,
            };
          }),
        ),
      );

      try {
        await softDeleteOwnGardenChatMessage({
          messageId: normalizedId,
          currentProfileId,
        });
      } catch (error) {
        if (previousMessage) {
          setMessages((prev) =>
            sortMessages(prev.map((row) => (row.id === normalizedId ? previousMessage! : row))),
          );
        }
        setMsg(toErrorMessage(error, "No se pudo eliminar el mensaje."));
        throw error;
      } finally {
        setMessageActionPendingById((prev) => {
          const next = { ...prev };
          delete next[normalizedId];
          return next;
        });
      }
    },
    [myProfileId],
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      const normalizedMessageId = String(messageId ?? "").trim();
      const currentProfileId = String(myProfileId ?? "").trim();
      const roomId = String(room?.id ?? "").trim();
      const targetGardenId = String(gardenId ?? "").trim();
      const normalizedEmoji = String(emoji ?? "").trim();
      if (!normalizedMessageId || !currentProfileId || !roomId || !targetGardenId || !normalizedEmoji) {
        return;
      }

      const key = `${normalizedMessageId}:${currentProfileId}:${normalizedEmoji}`;
      const existing = reactions.find(
        (row) =>
          row.message_id === normalizedMessageId &&
          row.user_id === currentProfileId &&
          row.emoji === normalizedEmoji,
      ) ?? null;

      setReactionPendingKeys((prev) => ({ ...prev, [key]: true }));
      setReactions((prev) =>
        existing
          ? prev.filter(
              (row) =>
                !(
                  row.message_id === normalizedMessageId &&
                  row.user_id === currentProfileId &&
                  row.emoji === normalizedEmoji
                ),
            )
          : [
              ...prev,
              {
                message_id: normalizedMessageId,
                room_id: roomId,
                garden_id: targetGardenId,
                user_id: currentProfileId,
                emoji: normalizedEmoji,
                created_at: new Date().toISOString(),
              },
            ],
      );

      try {
        if (existing) {
          await removeGardenChatMessageReaction({
            messageId: normalizedMessageId,
            userId: currentProfileId,
            emoji: normalizedEmoji,
          });
        } else {
          await addGardenChatMessageReaction({
            messageId: normalizedMessageId,
            roomId,
            gardenId: targetGardenId,
            userId: currentProfileId,
            emoji: normalizedEmoji,
          });
        }
      } catch (error) {
        setReactions((prev) =>
          existing
            ? [
                ...prev,
                existing,
              ]
            : prev.filter(
                (row) =>
                  !(
                    row.message_id === normalizedMessageId &&
                    row.user_id === currentProfileId &&
                    row.emoji === normalizedEmoji
                  ),
              ),
        );
        setMsg(toErrorMessage(error, "No se pudo actualizar la reaccion."));
        throw error;
      } finally {
        setReactionPendingKeys((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    },
    [gardenId, myProfileId, reactions, room?.id],
  );

  const myUnreadCount = useMemo(() => {
    const currentProfileId = String(myProfileId ?? "").trim();
    const lastReadAt = myReadState?.last_read_at ?? null;
    return messages.filter((row) => {
      if (row.deleted_at != null) return false;
      if (row.author_user_id === currentProfileId) return false;
      if (!lastReadAt) return true;
      return row.created_at > lastReadAt;
    }).length;
  }, [messages, myProfileId, myReadState?.last_read_at]);

  const typingNames = useMemo(() => {
    const currentProfileId = String(myProfileId ?? "").trim();
    return members
      .filter((member) => member.userId !== currentProfileId && member.userId in typingByUserId)
      .map((member) => member.name);
  }, [members, myProfileId, typingByUserId]);

  const attachmentsByMessageId = useMemo(
    () => buildGardenChatAttachmentMap(attachments),
    [attachments],
  );
  const reactionsByMessageId = useMemo(
    () => buildGardenChatReactionMap(reactions),
    [reactions],
  );

  return {
    loading,
    msg,
    setMsg,
    schemaMissing,
    room,
    members,
    messages,
    attachmentsByMessageId,
    reactionsByMessageId,
    readStates,
    presence,
    liveConnected: dbConnected,
    draft,
    setDraft,
    sending,
    composerFocused,
    setComposerFocused,
    refreshRoom,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    messageActionPendingById,
    reactionPendingKeys,
    myUnreadCount,
    typingNames,
  };
}
