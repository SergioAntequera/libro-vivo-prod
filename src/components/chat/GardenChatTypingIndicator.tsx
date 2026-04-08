"use client";

export function GardenChatTypingIndicator({
  label,
  align = "left",
}: {
  label: string;
  align?: "left" | "right";
}) {
  const justifyClass = align === "right" ? "justify-end" : "justify-start";
  const bubbleClass =
    align === "right"
      ? "rounded-br-[10px] bg-[#f0f5f1] text-[#486252]"
      : "rounded-bl-[10px] bg-white text-[#5f554b] border border-[#e8ddd0]";

  return (
    <div className={`flex ${justifyClass}`} data-testid="garden-chat-typing">
      <div
        className={`inline-flex max-w-[86%] items-center gap-3 rounded-[22px] px-4 py-3 text-[13px] shadow-[0_10px_24px_rgba(33,30,21,0.05)] ${bubbleClass}`}
        aria-live="polite"
      >
        <span className="inline-flex items-center gap-1.5" aria-hidden>
          <span className="h-2 w-2 animate-bounce rounded-full bg-[#c7b29a] [animation-delay:-0.2s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-[#c7b29a] [animation-delay:-0.1s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-[#c7b29a]" />
        </span>
        <span>{label}</span>
      </div>
    </div>
  );
}
