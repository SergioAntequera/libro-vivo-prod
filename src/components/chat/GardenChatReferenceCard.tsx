"use client";

import { gardenChatReferenceEntityLabel, type GardenChatReferenceMetadata } from "@/lib/gardenChatReferences";

type GardenChatReferenceCardProps = {
  reference: GardenChatReferenceMetadata;
  mine: boolean;
  onOpen: () => void;
};

export function GardenChatReferenceCard({
  reference,
  mine,
  onOpen,
}: GardenChatReferenceCardProps) {
  return (
    <div
      className={`rounded-[20px] border p-3 ${
        mine
          ? "border-white/20 bg-white/10 text-white"
          : "border-[#e8ddd0] bg-[#fffaf4] text-[#2e271f]"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
            mine ? "bg-white/15 text-white/90" : "bg-[#f1e5d5] text-[#7a6149]"
          }`}
        >
          {gardenChatReferenceEntityLabel(reference.entity_kind)}
        </span>
        {reference.meta_label ? (
          <span className={`text-[11px] ${mine ? "text-white/75" : "text-[#8b7b6a]"}`}>
            {reference.meta_label}
          </span>
        ) : null}
      </div>

      <div className="mt-3">
        <div className="text-sm font-semibold leading-5">{reference.title}</div>
        <div className={`mt-1 text-sm leading-5 ${mine ? "text-white/82" : "text-[#5f5347]"}`}>
          {reference.snippet}
        </div>
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={onOpen}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            mine
              ? "border-white/50 bg-[#f6fbf8] hover:bg-white"
              : "border-[#2f5a43] bg-[#2f5a43] hover:bg-[#274c38]"
          }`}
        >
          <span style={{ color: mine ? "#315847" : "#ffffff" }}>Abrir referencia</span>
        </button>
      </div>
    </div>
  );
}
