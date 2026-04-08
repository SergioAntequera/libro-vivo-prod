"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SendHorizontal } from "lucide-react";
import ActiveGardenSwitcher from "@/components/shared/ActiveGardenSwitcher";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { PageStateCard } from "@/components/ui/PageStateCard";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { GardenChatDeletedMessage } from "./GardenChatDeletedMessage";
import { GardenChatComposerMediaTray } from "./GardenChatComposerMediaTray";
import { GardenChatEmojiPicker } from "./GardenChatEmojiPicker";
import { GardenChatMessageActionBar } from "./GardenChatMessageActionBar";
import { GardenChatMessageDeliveryStatus } from "./GardenChatMessageDeliveryStatus";
import { GardenChatMessageAttachmentList } from "./GardenChatMessageAttachmentList";
import { GardenChatMessageEditor } from "./GardenChatMessageEditor";
import { GardenChatReactionBar } from "./GardenChatReactionBar";
import { GardenChatReplyPreview } from "./GardenChatReplyPreview";
import { GardenChatTypingIndicator } from "./GardenChatTypingIndicator";
import { GardenChatReferenceCard } from "./GardenChatReferenceCard";
import { useGardenCompanionLabel } from "./useGardenCompanionLabel";
import { useGardenChatMediaComposer } from "./useGardenChatMediaComposer";
import {
  formatGardenChatDay,
  formatGardenChatTime,
  isPersistedGardenChatMessageId,
  normalizeGardenChatBody,
  resolveGardenChatDeliveryStatus,
  type GardenChatMessageRow,
} from "@/lib/gardenChat";
import { normalizeGardenChatReferenceMetadata } from "@/lib/gardenChatReferences";
import { getProductSurface, getProductSurfaceHref } from "@/lib/productSurfaces";
import { useGardenChatRoom } from "./useGardenChatRoom";
import {
  useGardenChatBootstrap,
  type GardenChatBootstrapProfile,
} from "./useGardenChatBootstrap";

const CHAT_SURFACE = getProductSurface("chat");

type GardenChatSurfaceMode = "page" | "launcher";

type GardenChatSurfaceProps = {
  mode?: GardenChatSurfaceMode;
};

function initialsFromName(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  if (!text) return "JV";
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

function resolveMessageAuthorName(
  message: GardenChatMessageRow,
  membersById: Map<string, { name: string; avatarUrl: string | null }>,
  myProfileId: string | null,
  myDisplayName: string,
  companionFallbackName: string,
) {
  if (message.author_user_id === myProfileId) return myDisplayName;
  return membersById.get(message.author_user_id)?.name ?? companionFallbackName;
}

function groupMessageReactions(
  emojis: Array<{ emoji: string; user_id: string }>,
  currentUserId: string,
) {
  const grouped = new Map<string, { emoji: string; count: number; mine: boolean }>();
  for (const row of emojis) {
    const existing = grouped.get(row.emoji);
    if (existing) {
      existing.count += 1;
      existing.mine = existing.mine || row.user_id === currentUserId;
      continue;
    }
    grouped.set(row.emoji, {
      emoji: row.emoji,
      count: 1,
      mine: row.user_id === currentUserId,
    });
  }
  return [...grouped.values()];
}

function CompactPresenceChips({
  profile,
  members,
  liveConnected,
  minimal = false,
}: {
  profile: GardenChatBootstrapProfile;
  members: Array<{ userId: string; name: string }>;
  liveConnected: boolean;
  minimal?: boolean;
}) {
  if (minimal) {
    return (
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-[#eef3ea] px-3 py-1 text-xs text-[#4c664c]">
          {members.length || 1} miembro(s)
        </span>
        {liveConnected ? null : (
          <span className="rounded-full bg-[#f4eadf] px-3 py-1 text-xs text-[#705e4d]">
            Conectando...
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full bg-[#f4eadf] px-3 py-1 text-xs text-[#705e4d]">
        {liveConnected ? "Realtime activo" : "Conectando..."}
      </span>
      <span className="rounded-full bg-[#eef3ea] px-3 py-1 text-xs text-[#4c664c]">
        {members.length || 1} miembro(s)
      </span>
      <span className="rounded-full bg-[#edf2fb] px-3 py-1 text-xs text-[#49658d]">
        {profile.name?.trim() || "Tu lado"} en esta sala
      </span>
    </div>
  );
}

export function GardenChatSurface({ mode = "page" }: GardenChatSurfaceProps) {
  const router = useRouter();
  const isLauncher = mode === "launcher";
  const [launcherOpenState, setLauncherOpenState] = useState(false);
  const [emojiPickerOpenState, setEmojiPickerOpenState] = useState(false);
  const [editingMessageIdState, setEditingMessageIdState] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [editMsgState, setEditMsgState] = useState<string | null>(null);
  const [replyTargetMessageId, setReplyTargetMessageId] = useState<string | null>(null);
  const [reactionPickerMessageIdState, setReactionPickerMessageIdState] = useState<string | null>(
    null,
  );
  const endRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const selectionRef = useRef({ start: 0, end: 0 });
  const shouldStickToBottomRef = useRef(true);

  const {
    loading: bootLoading,
    msg: bootMsg,
    profile,
    activeGardenId,
    setActiveGardenId,
    reload,
  } = useGardenChatBootstrap({ mode });
  const launcherOpen =
    launcherOpenState && (!isLauncher || Boolean(profile && activeGardenId));
  const { companionReference } = useGardenCompanionLabel(activeGardenId, profile?.id ?? null);

  const {
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
    liveConnected,
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
  } = useGardenChatRoom({
    gardenId: activeGardenId,
    myProfileId: profile?.id ?? null,
    myDisplayName: profile?.name?.trim() || "Tu lado",
    myAvatarUrl: profile?.avatar_url ?? null,
    liveEnabled: !isLauncher || launcherOpen,
    isViewingThread: !isLauncher || launcherOpen,
  });

  const {
    fileInputRef,
    canRecordAudio,
    isRecordingAudio,
    uploadingMedia,
    mediaStatusLabel,
    mediaError,
    queuedItems,
    pendingQueueItems,
    failedMediaLabel,
    canRetryFailedMedia,
    canCancelUpload,
    openFilePicker,
    handleFileInputChange,
    startVoiceRecording,
    stopVoiceRecording,
    cancelVoiceRecording,
    cancelCurrentUpload,
    retryFailedMedia,
    clearPendingQueue,
    clearMediaError,
  } = useGardenChatMediaComposer({
    roomId: room?.id ?? null,
    gardenId: activeGardenId,
    myProfileId: profile?.id ?? null,
  });

  const membersById = useMemo(
    () =>
      new Map(
        members.map((member) => [
          member.userId,
          { name: member.name, avatarUrl: member.avatarUrl },
        ] as const),
      ),
    [members],
  );

  const otherPresence = useMemo(
    () => presence.filter((item) => item.userId !== profile?.id),
    [presence, profile?.id],
  );
  const messagesById = useMemo(
    () => new Map(messages.map((message) => [message.id, message] as const)),
    [messages],
  );
  const emojiPickerOpen = emojiPickerOpenState && (!isLauncher || launcherOpen);
  const reactionPickerMessageId =
    !isLauncher || launcherOpen ? reactionPickerMessageIdState : null;
  const editingMessage = editingMessageIdState
    ? messagesById.get(editingMessageIdState) ?? null
    : null;
  const editingMessageId =
    editingMessage && !editingMessage.deleted_at ? editingMessage.id : null;
  const editMsg = editingMessageId ? editMsgState : null;

  const latestOtherReadAt = useMemo(() => {
    const candidates = readStates
      .filter((row) => row.user_id !== profile?.id)
      .map((row) => row.last_read_at)
      .filter(Boolean)
      .sort((left, right) => right.localeCompare(left));
    return candidates[0] ?? null;
  }, [profile?.id, readStates]);

  const latestOtherReadStateUpdatedAt = useMemo(() => {
    const candidates = readStates
      .filter((row) => row.user_id !== profile?.id)
      .map((row) => row.updated_at)
      .filter(Boolean)
      .sort((left, right) => right.localeCompare(left));
    return candidates[0] ?? null;
  }, [profile?.id, readStates]);

  const typingLabel = useMemo(() => {
    if (!typingNames.length) return null;
    if (typingNames.length === 1) return `${typingNames[0]} esta escribiendo...`;
    return "Hay alguien escribiendo...";
  }, [typingNames]);
  const typingNode = typingLabel ? <GardenChatTypingIndicator label={typingLabel} /> : null;

  const updateStickToBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      shouldStickToBottomRef.current = true;
      return;
    }
    const distanceToBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldStickToBottomRef.current = distanceToBottom <= 96;
  }, []);

  useEffect(() => {
    if (isLauncher && !launcherOpen) return;
    if (!shouldStickToBottomRef.current && messages.length > 0) return;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [isLauncher, launcherOpen, messages.length, typingLabel]);

  useEffect(() => {
    updateStickToBottom();
  }, [launcherOpen, updateStickToBottom]);

  useEffect(() => {
    if (!isLauncher || !launcherOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setLauncherOpenState(false);
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isLauncher, launcherOpen]);

  useEffect(() => {
    if (!emojiPickerOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (composerRef.current?.contains(target)) return;
      setEmojiPickerOpenState(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [emojiPickerOpen]);

  useEffect(() => {
    if (!reactionPickerMessageId) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[data-garden-chat-reaction-root="true"]')) return;
      setReactionPickerMessageIdState(null);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [reactionPickerMessageId]);

  const rememberDraftSelection = useCallback(() => {
    const input = textareaRef.current;
    if (!input) return;
    selectionRef.current = {
      start: input.selectionStart ?? 0,
      end: input.selectionEnd ?? input.selectionStart ?? 0,
    };
  }, []);

  const insertEmojiIntoDraft = useCallback(
    (emoji: string) => {
      const input = textareaRef.current;
      const fallbackPos = draft.length;
      const start = input?.selectionStart ?? selectionRef.current.start ?? fallbackPos;
      const end = input?.selectionEnd ?? selectionRef.current.end ?? start;
      const nextDraft = `${draft.slice(0, start)}${emoji}${draft.slice(end)}`;
      const nextCursor = start + emoji.length;

      setDraft(nextDraft);
      setEmojiPickerOpenState(false);

      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.focus();
        textarea.setSelectionRange(nextCursor, nextCursor);
        selectionRef.current = { start: nextCursor, end: nextCursor };
      });
    },
    [draft, setDraft],
  );

  const handleGardenChanged = (gardenId: string | null) => {
    setActiveGardenId(gardenId);
    setMsg(null);
  };

  const commitComposerMessage = useCallback(async () => {
    const ok = await sendMessage({
      replyToMessageId: replyTargetMessageId,
    });
    if (ok) {
      setReplyTargetMessageId(null);
    }
  }, [replyTargetMessageId, sendMessage]);

  const beginEditMessage = useCallback((message: GardenChatMessageRow) => {
    setEditingMessageIdState(message.id);
    setEditingDraft(message.body_text ?? "");
    setEditMsgState(null);
  }, []);

  const cancelEditingMessage = useCallback(() => {
    setEditingMessageIdState(null);
    setEditingDraft("");
    setEditMsgState(null);
  }, []);

  const beginReplyToMessage = useCallback((message: GardenChatMessageRow) => {
    setReplyTargetMessageId(message.id);
    setReactionPickerMessageIdState(null);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, []);

  const commitEditingMessage = useCallback(async () => {
    const messageId = String(editingMessageId ?? "").trim();
    const normalizedBody = normalizeGardenChatBody(editingDraft);
    if (!messageId || !normalizedBody) {
      setEditMsgState("Escribe algo antes de guardar la edicion.");
      return;
    }

    try {
      await editMessage(messageId, normalizedBody);
      setEditingMessageIdState(null);
      setEditingDraft("");
      setEditMsgState(null);
    } catch {
      setEditMsgState("No se pudo guardar la edicion. Intentalo otra vez.");
    }
  }, [editMessage, editingDraft, editingMessageId]);

  const handleDeleteMessage = useCallback(
    async (message: GardenChatMessageRow) => {
      const bodyPreview = normalizeGardenChatBody(message.body_text ?? "").slice(0, 72);
      const confirmed =
        typeof window === "undefined"
          ? false
          : window.confirm(
              bodyPreview
                ? `Se ocultara para ambas personas. ¿Quieres eliminar "${bodyPreview}"?`
                : "Se ocultara para ambas personas. ¿Quieres eliminar este mensaje?",
            );
      if (!confirmed) return;

      try {
        await deleteMessage(message.id);
        if (editingMessageId === message.id) {
          cancelEditingMessage();
        }
      } catch {
        // hook already surfaces the error banner
      }
    },
    [cancelEditingMessage, deleteMessage, editingMessageId],
  );

  const composerReplyTarget = replyTargetMessageId
    ? messagesById.get(replyTargetMessageId) ?? null
    : null;
  const composerReplyAttachments = composerReplyTarget
    ? attachmentsByMessageId.get(composerReplyTarget.id) ?? []
    : [];

  const conversationNode = profile ? (
    <>
      {!messages.length ? (
        <div className="rounded-[22px] border border-dashed border-[#dccdb8] bg-white/70 px-4 py-5 text-sm text-[#6f655c]">
          Este chat esta vacio. Empieza con algo pequeno: una idea, una coordenada para hoy o un
          mensaje que no tenga por que convertirse todavia en flor.
        </div>
      ) : null}

      {messages.map((message, index) => {
        const mine = message.author_user_id === profile.id;
        const deleted = message.deleted_at != null;
        const authorName = resolveMessageAuthorName(
          message,
          membersById,
          profile.id,
          profile.name?.trim() || "Tu lado",
          companionReference,
        );
        const reference = message.kind === "reference"
          ? normalizeGardenChatReferenceMetadata(message.metadata)
          : null;
        const attachments = attachmentsByMessageId.get(message.id) ?? [];
        const replyTarget = message.reply_to_message_id
          ? messagesById.get(message.reply_to_message_id) ?? null
          : null;
        const replyAttachments = replyTarget
          ? attachmentsByMessageId.get(replyTarget.id) ?? []
          : [];
        const canEdit =
          mine &&
          !deleted &&
          message.kind === "text" &&
          attachments.length === 0 &&
          isPersistedGardenChatMessageId(message.id);
        const canReply = !deleted && isPersistedGardenChatMessageId(message.id);
        const canDelete =
          mine &&
          !deleted &&
          isPersistedGardenChatMessageId(message.id);
        const isEditing = editingMessageId === message.id;
        const pendingAction = messageActionPendingById[message.id] ?? null;
        const groupedReactions = groupMessageReactions(
          reactionsByMessageId.get(message.id) ?? [],
          profile.id,
        );
        const deliveryStatus = resolveGardenChatDeliveryStatus({
          message,
          myProfileId: profile.id,
          latestOtherReadAt,
          latestOtherReadStateUpdatedAt,
          hasOtherPresence: otherPresence.length > 0,
        });
        const previousMessage = index > 0 ? messages[index - 1] : null;
        const showDayLabel =
          !previousMessage ||
          formatGardenChatDay(previousMessage.created_at) !== formatGardenChatDay(message.created_at);

        return (
          <div key={message.id}>
            {showDayLabel ? (
              <div className="my-4 text-center text-[11px] font-medium uppercase tracking-[0.14em] text-[#9b8c7a]">
                {formatGardenChatDay(message.created_at)}
              </div>
            ) : null}
            <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`relative max-w-[86%] ${deleted ? "" : "pb-5"} sm:max-w-[78%]`}
              >
                <div
                  data-testid="garden-chat-message"
                  data-message-id={message.id}
                  className={`rounded-[24px] px-4 py-3 shadow-[0_10px_24px_rgba(33,30,21,0.06)] ${
                    deleted
                      ? mine
                        ? "rounded-br-[8px] bg-[#5a6f65] text-white"
                        : "rounded-bl-[8px] border border-[#e4ddd4] bg-[#f7f2ec] text-[#5a5148]"
                      : mine
                      ? "rounded-br-[8px] bg-[#3f6f5b] text-white"
                      : "rounded-bl-[8px] border border-[#e8ddd0] bg-white text-[#2e271f]"
                  }`}
                >
                  <div
                    className={`mb-1 flex items-center gap-2 text-[11px] ${
                      mine ? "text-white/75" : "text-[#8b7b6a]"
                    }`}
                  >
                    <span className="font-semibold">{authorName}</span>
                    <span>{formatGardenChatTime(message.created_at)}</span>
                    {message.edited_at ? <span>editado</span> : null}
                    <GardenChatMessageActionBar
                      mine={mine}
                      canReply={canReply}
                      canEdit={canEdit && !isEditing}
                      canDelete={canDelete}
                      pendingAction={pendingAction}
                      onReply={() => beginReplyToMessage(message)}
                      onEdit={() => beginEditMessage(message)}
                      onDelete={() => void handleDeleteMessage(message)}
                    />
                  </div>
                  {deleted ? <GardenChatDeletedMessage mine={mine} /> : null}
                  {!deleted && replyTarget ? (
                    <GardenChatReplyPreview
                      mode="message"
                      message={replyTarget}
                      attachments={replyAttachments}
                      authorName={resolveMessageAuthorName(
                        replyTarget,
                        membersById,
                        profile.id,
                        profile.name?.trim() || "Tu lado",
                        companionReference,
                      )}
                      mine={mine}
                    />
                  ) : null}
                  {!deleted && reference ? (
                    <GardenChatReferenceCard
                      reference={reference}
                      mine={mine}
                      onOpen={() => router.push(reference.href)}
                    />
                  ) : null}
                  {!deleted ? (
                    <GardenChatMessageAttachmentList attachments={attachments} mine={mine} />
                  ) : null}
                  {isEditing ? (
                    <div className="mt-2">
                      <GardenChatMessageEditor
                        value={editingDraft}
                        mine={mine}
                        saving={pendingAction === "edit"}
                        onChange={setEditingDraft}
                        onSave={() => void commitEditingMessage()}
                        onCancel={cancelEditingMessage}
                      />
                      {editMsg ? (
                        <div
                          className={`mt-2 text-xs ${mine ? "text-white/80" : "text-[#8f5a50]"}`}
                        >
                          {editMsg}
                        </div>
                      ) : null}
                    </div>
                  ) : !deleted && message.body_text ? (
                    <div className="whitespace-pre-wrap break-words text-[15px] leading-6">
                      {message.body_text}
                    </div>
                  ) : null}
                  {mine && deliveryStatus && !deleted && !isEditing ? (
                    <div className="mt-2 flex justify-end">
                      <GardenChatMessageDeliveryStatus
                        status={deliveryStatus}
                        otherPersonLabel={companionReference}
                      />
                    </div>
                  ) : null}
                </div>
                {!deleted ? (
                  <GardenChatReactionBar
                    groupedReactions={groupedReactions}
                    pickerOpen={reactionPickerMessageId === message.id}
                    pendingKeys={reactionPendingKeys}
                    messageId={message.id}
                    currentUserId={profile.id}
                    mine={mine}
                    onTogglePicker={() =>
                      setReactionPickerMessageIdState((current) =>
                        current === message.id ? null : message.id,
                      )
                    }
                    onToggleReaction={(emoji) => {
                      setReactionPickerMessageIdState(null);
                      void toggleReaction(message.id, emoji);
                    }}
                  />
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </>
  ) : null;

  const composerNode = (
    <div
      ref={composerRef}
      className="relative rounded-[24px] border border-[#dfd4c7] bg-[#fcfaf6] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
    >
      {emojiPickerOpen ? (
        <div className="absolute bottom-full left-0 z-10 mb-2">
          <GardenChatEmojiPicker onSelect={insertEmojiIntoDraft} />
        </div>
      ) : null}
      <div className="relative">
        {composerReplyTarget ? (
          <GardenChatReplyPreview
            mode="composer"
            message={composerReplyTarget}
            attachments={composerReplyAttachments}
            authorName={resolveMessageAuthorName(
              composerReplyTarget,
              membersById,
              profile?.id ?? null,
              profile?.name?.trim() || "Tu lado",
              companionReference,
            )}
            mine={false}
            onCancel={() => setReplyTargetMessageId(null)}
          />
        ) : null}
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={() => setComposerFocused(true)}
          onBlur={() => setComposerFocused(false)}
          onClick={rememberDraftSelection}
          onKeyUp={rememberDraftSelection}
          onSelect={rememberDraftSelection}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey) return;
            event.preventDefault();
            void commitComposerMessage();
          }}
          placeholder="Escribe algo pequeno, humano y util para vuestro jardin..."
          rows={isLauncher ? 2 : 3}
          className="min-h-[96px] w-full resize-none rounded-[18px] border-0 bg-transparent px-3 py-3 pb-12 pr-16 text-[15px] leading-6 text-[#2f261d] outline-none placeholder:text-[#9d9083]"
          disabled={!room || sending}
          data-testid="garden-chat-draft"
        />
        <GardenChatComposerMediaTray
          disabled={!room || sending}
          canRecordAudio={canRecordAudio}
          isRecordingAudio={isRecordingAudio}
          uploadingMedia={uploadingMedia}
          mediaStatusLabel={mediaStatusLabel}
          mediaError={mediaError}
          queuedItems={queuedItems}
          pendingQueueItems={pendingQueueItems}
          failedMediaLabel={failedMediaLabel}
          canRetryFailedMedia={canRetryFailedMedia}
          canCancelUpload={canCancelUpload}
          emojiPickerOpen={emojiPickerOpen}
          fileInputRef={fileInputRef}
          onToggleEmojiPicker={() => setEmojiPickerOpenState((current) => !current)}
          onOpenFilePicker={openFilePicker}
          onFileInputChange={handleFileInputChange}
          onStartVoiceRecording={startVoiceRecording}
          onStopVoiceRecording={stopVoiceRecording}
          onCancelVoiceRecording={cancelVoiceRecording}
          onCancelCurrentUpload={cancelCurrentUpload}
          onRetryFailedMedia={retryFailedMedia}
          onClearPendingQueue={clearPendingQueue}
          onClearMediaError={clearMediaError}
        />
        <button
          type="button"
          className="absolute bottom-3 right-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#3f6f5b] text-white shadow-[0_12px_24px_rgba(41,81,65,0.22)] transition hover:bg-[#355d4d] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => void commitComposerMessage()}
          disabled={!draft.trim() || sending || !room}
          aria-label={sending ? "Enviando mensaje" : "Enviar mensaje"}
          data-testid="garden-chat-send"
        >
          <SendHorizontal size={18} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );

  if (isLauncher) {
    if (bootLoading || !profile || !activeGardenId) return null;

    return (
      <>
        {launcherOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-[69] cursor-default bg-transparent"
            onClick={() => setLauncherOpenState(false)}
            aria-label="Cerrar chat al pulsar fuera"
          />
        ) : null}

        {launcherOpen ? (
          <div className="fixed inset-x-3 bottom-20 top-4 z-[70] sm:inset-x-auto sm:bottom-24 sm:right-5 sm:top-5 sm:w-[min(420px,calc(100vw-2.5rem))]">
            <section
              className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-[#d9d4ca] bg-[#fffdf9] shadow-[0_18px_48px_rgba(20,18,14,0.24)]"
              data-testid="garden-chat-launcher-panel"
            >
              <div className="border-b border-[#efe7dc] bg-[linear-gradient(135deg,#fff8ee_0%,#fffdf8_100%)] px-4 py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="text-sm font-semibold text-[#2f261d]">Chat del jardin</div>
                    <CompactPresenceChips
                      profile={profile}
                      members={members}
                      liveConnected={liveConnected}
                      minimal
                    />
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      className="lv-btn lv-btn-secondary"
                      onClick={() => router.push(getProductSurfaceHref("chat"))}
                    >
                      Abrir
                    </button>
                    <button
                      type="button"
                      className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#d8ccbe] bg-white text-transparent transition hover:bg-[#f7f1e8] after:absolute after:inset-0 after:flex after:items-center after:justify-center after:text-[18px] after:font-medium after:leading-none after:text-[#715f4f] after:content-['x']"
                      onClick={() => setLauncherOpenState(false)}
                      aria-label="Cerrar chat"
                    >
                      <span aria-hidden>×</span>
                    </button>
                  </div>
                </div>
              </div>

              {bootMsg ? <StatusNotice message={bootMsg} className="m-3" /> : null}
              {msg ? <StatusNotice message={msg} tone={schemaMissing ? "warning" : undefined} className="m-3" /> : null}

              {schemaMissing ? (
                <div className="p-3">
                  <PageStateCard
                    title="Falta la base del chat"
                    message="La route completa ya existe, pero esta base de datos no tiene lista la fundacion del chat."
                    tone="warning"
                    actions={[
                      {
                        label: "Reintentar",
                        onClick: () => {
                          setMsg(null);
                          reload();
                        },
                      },
                    ]}
                  />
                </div>
              ) : (
                <>
                  <div
                    ref={scrollContainerRef}
                    onScroll={updateStickToBottom}
                    className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[linear-gradient(180deg,#fffdf9_0%,#f9f4ec_100%)] px-4 py-3"
                    data-testid="garden-chat-scroll"
                  >
                    {conversationNode}
                    {typingNode}
                  </div>
                  <div className="border-t border-[#efe7dc] bg-white px-4 py-2.5">
                    {composerNode}
                  </div>
                </>
              )}
            </section>
          </div>
        ) : null}

        <button
          type="button"
          className="fixed bottom-4 right-4 z-[68] flex items-center gap-3 rounded-full border border-[#d8ccbe] bg-[#fffaf1] px-4 py-3 text-[#2f261d] shadow-[0_16px_36px_rgba(21,18,14,0.2)] transition hover:-translate-y-[1px] hover:bg-white"
          onClick={() => setLauncherOpenState((current) => !current)}
          aria-expanded={launcherOpen}
          aria-label="Abrir chat del jardin"
          data-testid="garden-chat-launcher-toggle"
        >
          <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#3f6f5b] text-sm font-semibold text-white">
            Chat
            {myUnreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-h-[22px] min-w-[22px] items-center justify-center rounded-full bg-[#d6684d] px-1.5 text-[11px] font-semibold text-white">
                {myUnreadCount > 9 ? "9+" : myUnreadCount}
              </span>
            ) : null}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-semibold">Chat del jardin</span>
            <span className="block text-[11px] text-[#7c6e62]">
              {typingLabel ?? (myUnreadCount > 0 ? `${myUnreadCount} nuevo(s)` : "Abrir")}
            </span>
          </span>
        </button>
      </>
    );
  }

  if (bootLoading || (!profile && !bootMsg)) {
    return <PageLoadingState message="Preparando chat..." />;
  }

  if (!profile) {
    return (
      <div className="lv-page p-6">
        <div className="lv-shell max-w-4xl space-y-4">
          {bootMsg ? <StatusNotice message={bootMsg} /> : null}
          <PageStateCard
            title="No hemos podido resolver tu sesion"
            message="Necesitamos tu perfil y tu jardin activo para abrir el chat compartido."
            tone="warning"
            actions={[
              {
                label: "Ir a login",
                onClick: () => router.push(getProductSurfaceHref("login")),
              },
            ]}
          />
        </div>
      </div>
    );
  }

  if (!activeGardenId) {
    return (
      <div className="lv-page p-6">
        <div className="lv-shell max-w-4xl space-y-4">
          {bootMsg ? <StatusNotice message={bootMsg} /> : null}
          <PageStateCard
            title="Todavia no hay un jardin activo"
            message="El chat nace dentro de un jardin compartido. Primero necesitamos resolver o crear ese espacio."
            tone="info"
            actions={[
              {
                label: "Ir a vinculos",
                onClick: () => router.push(getProductSurfaceHref("bonds")),
              },
              {
                label: "Ir al welcome",
                tone: "secondary",
                onClick: () => router.push("/welcome"),
              },
            ]}
          />
        </div>
      </div>
    );
  }

  if (loading && !room && !schemaMissing) {
    return <PageLoadingState message="Cargando sala principal..." />;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f6efe4_0%,#f8f4ec_36%,#f6f7f4_100%)] p-4 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <section className="overflow-hidden rounded-[30px] border border-[#ddcfbe] bg-[linear-gradient(135deg,#fff8ee_0%,#fffdf8_48%,#f6f8fb_100%)] p-5 shadow-[0_18px_50px_rgba(36,30,18,0.09)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#e5d9ca] bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#746556]">
                <span>{CHAT_SURFACE.label}</span>
                <span className="h-1 w-1 rounded-full bg-[#c2b09a]" />
                <span>{liveConnected ? "Realtime activo" : "Conectando..."}</span>
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-[#2f261d] sm:text-3xl">
                  Chat del jardin
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-[#6d6258] sm:text-[15px]">
                  Esta es la vista amplia del chat: mejor para leer historial, revisar lectura y
                  moverte con calma por la conversacion. El uso ligero diario vive en el launcher
                  emergente.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-[#f4eadf] px-3 py-1 text-xs text-[#705e4d]">
                  Sala principal
                </span>
                <span className="rounded-full bg-[#eef3ea] px-3 py-1 text-xs text-[#4c664c]">
                  {members.length || 1} miembro(s) en este jardin
                </span>
                <span className="rounded-full bg-[#edf2fb] px-3 py-1 text-xs text-[#49658d]">
                  {myUnreadCount} mensaje(s) pendientes para ti
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <ActiveGardenSwitcher compact onChanged={handleGardenChanged} />
              <button
                type="button"
                className="lv-btn lv-btn-secondary"
                onClick={() => router.push(getProductSurfaceHref("home"))}
              >
                Volver
              </button>
            </div>
          </div>
        </section>

        {bootMsg ? <StatusNotice message={bootMsg} /> : null}
        {msg ? (
          <StatusNotice
            message={msg}
            tone={schemaMissing ? "warning" : undefined}
            className="shadow-[var(--lv-shadow-sm)]"
          />
        ) : null}

        {schemaMissing ? (
          <PageStateCard
            title="La base del chat aun no esta aplicada"
            message="La surface ya esta preparada, pero esta base de datos todavia no tiene ejecutadas las migraciones canonicas de chat y storage."
            tone="warning"
            actions={[
              {
                label: "Reintentar",
                onClick: () => {
                  setMsg(null);
                  reload();
                },
              },
            ]}
          />
        ) : null}

        {!schemaMissing ? (
          <section className="grid gap-4 lg:grid-cols-[1.2fr_0.46fr]">
            <div className="overflow-hidden rounded-[28px] border border-[#d9d4ca] bg-[#fffdf9] shadow-[0_14px_40px_rgba(33,30,21,0.07)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#efe7dc] px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#2f261d]">
                    {room?.title?.trim() || "Chat"}
                  </div>
                  <div className="mt-1 text-xs text-[#7a6e62]">
                    {otherPresence.length
                      ? `${otherPresence.length} persona(s) conectadas en esta sala`
                      : `${companionReference} no esta dentro ahora mismo`}
                  </div>
                </div>
                <button
                  type="button"
                  className="lv-btn lv-btn-ghost"
                  onClick={() => void refreshRoom()}
                >
                  Refrescar
                </button>
              </div>

              <div
                ref={scrollContainerRef}
                onScroll={updateStickToBottom}
                className="max-h-[62vh] space-y-3 overflow-y-auto bg-[linear-gradient(180deg,#fffdf9_0%,#f9f4ec_100%)] px-4 py-4 sm:px-5"
                data-testid="garden-chat-scroll"
              >
                {conversationNode}
                {typingNode}
              </div>

              <div className="border-t border-[#efe7dc] bg-white px-4 py-4 sm:px-5">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[#7a6d60]">
                  <span>
                    {composerFocused && draft.trim()
                      ? `El gesto de escritura ya es visible para ${companionReference}.`
                      : "Typing y presencia son efimeros. Los mensajes si quedan persistidos."}
                  </span>
                </div>
                {composerNode}
              </div>
            </div>

            <div className="space-y-4">
              <section className="rounded-[24px] border border-[#d9d4ca] bg-white p-4 shadow-[0_12px_32px_rgba(33,30,21,0.06)]">
                <div className="text-sm font-semibold text-[#2f261d]">Quien esta aqui</div>
                <div className="mt-3 space-y-3">
                  {members.map((member) => {
                    const online =
                      otherPresence.some((presenceItem) => presenceItem.userId === member.userId) ||
                      member.userId === profile.id;
                    return (
                      <div
                        key={member.userId}
                        className="flex items-center gap-3 rounded-[18px] border border-[#eee5da] bg-[#fffdf9] px-3 py-3"
                      >
                        <span className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-[16px] border border-[#ddd0c2] bg-[#f4eadf] text-sm font-semibold text-[#6f5d4d]">
                          {member.avatarUrl ? (
                            <img
                              src={member.avatarUrl}
                              alt={member.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            initialsFromName(member.name)
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-[#31281f]">
                            {member.name}
                            {member.userId === profile.id ? " (tu)" : ""}
                          </div>
                          <div className="mt-1 text-xs text-[#8b7b6c]">
                            {online ? "Dentro o reciente en esta sala" : "Ahora mismo fuera del chat"}
                          </div>
                        </div>
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            online ? "bg-[#72b56f]" : "bg-[#d3c8bb]"
                          }`}
                          aria-hidden
                        />
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[24px] border border-[#d9d4ca] bg-white p-4 shadow-[0_12px_32px_rgba(33,30,21,0.06)]">
                <div className="text-sm font-semibold text-[#2f261d]">Estado del hilo</div>
                <div className="mt-3 space-y-2 text-sm text-[#6c6155]">
                  <div className="rounded-[18px] bg-[#faf4ea] px-3 py-2">
                    {messages.length
                      ? `${messages.length} mensaje(s) persistidos en esta sala`
                      : "Todavia no hay ningun mensaje persistido"}
                  </div>
                  <div className="rounded-[18px] bg-[#eff3fb] px-3 py-2">
                    {latestOtherReadAt
                      ? `${companionReference} ha leido hasta las ${formatGardenChatTime(latestOtherReadAt)}`
                      : `Todavia no hay confirmacion de lectura de ${companionReference}`}
                  </div>
                  <div className="rounded-[18px] bg-[#edf4ec] px-3 py-2">
                    {liveConnected
                      ? "Presence y typing estan enlazados en tiempo real"
                      : "Realtime efimero conectando o en reconexion"}
                  </div>
                </div>
              </section>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
