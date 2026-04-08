"use client";

import { Check, X } from "lucide-react";

type GardenChatMessageEditorProps = {
  value: string;
  mine: boolean;
  saving: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
};

export function GardenChatMessageEditor({
  value,
  mine,
  saving,
  onChange,
  onSave,
  onCancel,
}: GardenChatMessageEditorProps) {
  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.shiftKey) return;
          event.preventDefault();
          onSave();
        }}
        rows={3}
        className={`min-h-[88px] w-full resize-none rounded-[16px] border px-3 py-2.5 text-[15px] leading-6 outline-none ${
          mine
            ? "border-white/30 bg-white/10 text-white placeholder:text-white/60"
            : "border-[#e0d2c1] bg-white text-[#2e271f] placeholder:text-[#9c8e82]"
        }`}
        placeholder="Editar mensaje"
        data-testid="garden-chat-edit-draft"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
            mine
              ? "border-white/24 bg-white/8 text-white hover:bg-white/14"
              : "border-[#e0d2c1] bg-white text-[#715c4b] hover:bg-[#f7efe4]"
          }`}
          onClick={onCancel}
          aria-label="Cancelar edicion"
          data-testid="garden-chat-cancel-edit"
          disabled={saving}
        >
          <X size={16} />
        </button>
        <button
          type="button"
          className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition ${
            mine
              ? "bg-white text-[#355d4d] hover:bg-[#f2fbf5]"
              : "bg-[#355d4d] text-white hover:bg-[#2d5042]"
          }`}
          onClick={onSave}
          aria-label="Guardar edicion"
          data-testid="garden-chat-save-edit"
          disabled={saving || !value.trim()}
        >
          <Check size={16} />
        </button>
      </div>
    </div>
  );
}
