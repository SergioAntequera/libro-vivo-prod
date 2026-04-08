"use client";

import { Check, CheckCheck } from "lucide-react";
import type { GardenChatDeliveryStatus } from "@/lib/gardenChat";

type GardenChatMessageDeliveryStatusProps = {
  status: GardenChatDeliveryStatus;
  otherPersonLabel?: string | null;
};

export function GardenChatMessageDeliveryStatus({
  status,
  otherPersonLabel,
}: GardenChatMessageDeliveryStatusProps) {
  const readLabel = String(otherPersonLabel ?? "").trim() || "la otra persona";

  if (status === "read") {
    return (
      <span
        className="inline-flex items-center text-[#89d0ff]"
        aria-label={`Leido por ${readLabel}`}
        title={`Leido por ${readLabel}`}
        data-testid="garden-chat-delivery-status"
        data-status={status}
      >
        <CheckCheck size={14} strokeWidth={2.2} />
      </span>
    );
  }

  if (status === "delivered") {
    return (
      <span
        className="inline-flex items-center text-white/72"
        aria-label={`Entregado a ${readLabel}`}
        title={`Entregado a ${readLabel}`}
        data-testid="garden-chat-delivery-status"
        data-status={status}
      >
        <CheckCheck size={14} strokeWidth={2.2} />
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center text-white/72"
      aria-label="Mensaje enviado"
      title="Mensaje enviado"
      data-testid="garden-chat-delivery-status"
      data-status={status}
    >
      <Check size={14} strokeWidth={2.2} />
    </span>
  );
}
