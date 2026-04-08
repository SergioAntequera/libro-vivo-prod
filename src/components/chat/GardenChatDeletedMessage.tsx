"use client";

type GardenChatDeletedMessageProps = {
  mine: boolean;
};

export function GardenChatDeletedMessage({
  mine,
}: GardenChatDeletedMessageProps) {
  return (
    <div
      className={`italic text-[14px] ${
        mine ? "text-white/78" : "text-[#85786c]"
      }`}
      data-testid="garden-chat-deleted-message"
    >
      {mine ? "Eliminaste este mensaje" : "Este mensaje fue eliminado"}
    </div>
  );
}
