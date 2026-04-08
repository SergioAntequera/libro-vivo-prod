"use client";

const QUICK_REACTION_EMOJIS = [
  "\u2764\uFE0F",
  "\u{1F602}",
  "\u{1F44D}",
  "\u{1F60D}",
  "\u{1F62E}",
  "\u{1F64F}",
] as const;

export type GardenChatGroupedReaction = {
  emoji: string;
  count: number;
  mine: boolean;
};

type GardenChatReactionBarProps = {
  groupedReactions: GardenChatGroupedReaction[];
  pickerOpen: boolean;
  pendingKeys: Record<string, true>;
  messageId: string;
  currentUserId: string;
  mine: boolean;
  onTogglePicker: () => void;
  onToggleReaction: (emoji: string) => void;
};

export function GardenChatReactionBar({
  groupedReactions,
  pickerOpen,
  pendingKeys,
  messageId,
  currentUserId,
  mine,
  onTogglePicker,
  onToggleReaction,
}: GardenChatReactionBarProps) {
  return (
    <div
      className={`pointer-events-none absolute -bottom-4 z-10 ${
        mine ? "right-3" : "left-3"
      }`}
      data-garden-chat-reaction-root="true"
    >
      <div
        className={`pointer-events-auto flex items-center gap-1.5 ${
          mine ? "justify-end" : "justify-start"
        }`}
      >
        {groupedReactions.map((reaction) => {
          const pending = Boolean(pendingKeys[`${messageId}:${currentUserId}:${reaction.emoji}`]);
          return (
            <button
              key={`${reaction.emoji}-${reaction.count}`}
              type="button"
              className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium shadow-[0_8px_18px_rgba(30,25,19,0.12)] transition ${
                reaction.mine
                  ? "border-[#c7dfcf] bg-[#eef7f0] text-[#355946]"
                  : "border-[#e5dacd] bg-white text-[#6c5f54] hover:bg-[#faf4ea]"
              }`}
              onClick={() => onToggleReaction(reaction.emoji)}
              disabled={pending}
              data-testid="garden-chat-reaction-chip"
            >
              <span className="text-[15px] leading-none">{reaction.emoji}</span>
              <span>{reaction.count}</span>
            </button>
          );
        })}

        <div className="relative">
          <button
            type="button"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white text-sm font-semibold shadow-[0_8px_18px_rgba(30,25,19,0.12)] transition ${
              pickerOpen
                ? "border-[#c7dfcf] text-[#355946]"
                : "border-[#e3d7ca] text-[#7a6b5b] hover:bg-[#faf4ea]"
            }`}
            onClick={onTogglePicker}
            aria-label="Abrir reacciones"
            data-testid="garden-chat-open-reactions"
          >
            +
          </button>

          {pickerOpen ? (
            <div
              className={`absolute bottom-full z-20 mb-2 flex items-center gap-1 rounded-full border border-[#ddd1c4] bg-white px-2 py-1.5 shadow-[0_12px_26px_rgba(30,25,19,0.14)] ${
                mine ? "right-0" : "left-0"
              }`}
            >
              {QUICK_REACTION_EMOJIS.map((emoji) => {
                const pending = Boolean(pendingKeys[`${messageId}:${currentUserId}:${emoji}`]);
                return (
                  <button
                    key={emoji}
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[20px] transition hover:bg-[#f7efe4]"
                    onClick={() => onToggleReaction(emoji)}
                    disabled={pending}
                    data-testid="garden-chat-quick-reaction"
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
