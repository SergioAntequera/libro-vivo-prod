"use client";

import { CornerUpLeft, Pencil, Trash2 } from "lucide-react";

type GardenChatMessageActionBarProps = {
  mine: boolean;
  canReply: boolean;
  canEdit: boolean;
  canDelete: boolean;
  pendingAction: "edit" | "delete" | null;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function GardenChatMessageActionBar({
  mine,
  canReply,
  canEdit,
  canDelete,
  pendingAction,
  onReply,
  onEdit,
  onDelete,
}: GardenChatMessageActionBarProps) {
  if (!canReply && !canEdit && !canDelete) return null;

  const baseClassName = mine
    ? "border-white/18 bg-white/10 text-white/82 hover:bg-white/16"
    : "border-[#e6d7c6] bg-[#fff8ef] text-[#735f4d] hover:bg-[#f8efdf]";

  return (
    <div className="ml-auto flex items-center gap-1">
      {canReply ? (
        <button
          type="button"
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full border transition ${baseClassName}`}
          onClick={onReply}
          aria-label="Responder mensaje"
          data-testid="garden-chat-reply-message"
          disabled={pendingAction != null}
        >
          <CornerUpLeft size={12} />
        </button>
      ) : null}
      {canEdit ? (
        <button
          type="button"
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full border transition ${baseClassName}`}
          onClick={onEdit}
          aria-label="Editar mensaje"
          data-testid="garden-chat-edit-message"
          disabled={pendingAction != null}
        >
          <Pencil size={12} />
        </button>
      ) : null}
      {canDelete ? (
        <button
          type="button"
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full border transition ${baseClassName}`}
          onClick={onDelete}
          aria-label="Eliminar mensaje"
          data-testid="garden-chat-delete-message"
          disabled={pendingAction != null}
        >
          <Trash2 size={12} />
        </button>
      ) : null}
    </div>
  );
}
