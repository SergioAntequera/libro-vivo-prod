"use client";

type ChatShareButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  label?: string;
  busyLabel?: string;
  recipientLabel?: string | null;
  className?: string;
};

export function ChatShareButton({
  onClick,
  disabled = false,
  busy = false,
  label = "Compartir en chat",
  busyLabel = "Compartiendo...",
  recipientLabel = null,
  className = "",
}: ChatShareButtonProps) {
  const normalizedRecipient = String(recipientLabel ?? "").trim();
  const resolvedLabel = normalizedRecipient ? `Compartir con ${normalizedRecipient}` : label;
  const resolvedBusyLabel = normalizedRecipient ? `Compartiendo con ${normalizedRecipient}...` : busyLabel;

  return (
    <button
      type="button"
      className={`lv-btn lv-btn-secondary ${className}`.trim()}
      onClick={onClick}
      disabled={disabled || busy}
    >
      {busy ? resolvedBusyLabel : resolvedLabel}
    </button>
  );
}
