"use client";

import { useMemo, useState } from "react";
import { Clock3, Search } from "lucide-react";
import {
  GARDEN_CHAT_EMOJI_CATEGORIES,
  GARDEN_CHAT_EMOJI_RECENT_LIMIT,
  GARDEN_CHAT_EMOJI_STORAGE_KEY,
  normalizeRecentGardenChatEmojis,
  resolveGardenChatEmojiEntry,
  searchGardenChatEmojiEntries,
  type GardenChatEmojiCategoryId,
} from "@/lib/gardenChatEmojiCatalog";

type GardenChatEmojiPickerProps = {
  onSelect: (emoji: string) => void;
};

function readInitialRecentGardenChatEmojis() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GARDEN_CHAT_EMOJI_STORAGE_KEY);
    return raw ? normalizeRecentGardenChatEmojis(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function GardenChatEmojiPicker({
  onSelect,
}: GardenChatEmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState<GardenChatEmojiCategoryId>("recent");
  const [recentEmojis, setRecentEmojis] = useState<string[]>(readInitialRecentGardenChatEmojis);
  const [query, setQuery] = useState("");

  const visibleCategories = useMemo(() => {
    const recentEntries = recentEmojis
      .map((emoji) => resolveGardenChatEmojiEntry(emoji))
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

    return [
      {
        id: "recent" as const,
        label: "Recientes",
        icon: "🕘",
        emojis: recentEntries,
      },
      ...GARDEN_CHAT_EMOJI_CATEGORIES,
    ];
  }, [recentEmojis]);

  const activeSet = useMemo(
    () =>
      visibleCategories.find((category) => category.id === activeCategory) ??
      visibleCategories[0],
    [activeCategory, visibleCategories],
  );

  const searchResults = useMemo(
    () => searchGardenChatEmojiEntries(query),
    [query],
  );

  const visibleEntries = query.trim() ? searchResults : activeSet.emojis;

  const handleSelect = (emoji: string) => {
    const nextRecents = [emoji, ...recentEmojis.filter((item) => item !== emoji)].slice(
      0,
      GARDEN_CHAT_EMOJI_RECENT_LIMIT,
    );
    setRecentEmojis(nextRecents);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          GARDEN_CHAT_EMOJI_STORAGE_KEY,
          JSON.stringify(nextRecents),
        );
      } catch {
        // ignore localStorage failures
      }
    }
    onSelect(emoji);
  };

  return (
    <div
      className="w-[min(352px,calc(100vw-2.25rem))] overflow-hidden rounded-[22px] border border-[#e3dbcf] bg-[#f7f5f1] shadow-[0_18px_42px_rgba(29,24,18,0.18)]"
      data-testid="garden-chat-emoji-picker"
    >
      <div className="border-b border-[#e8e1d7] bg-white/80 px-3 py-3">
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#938475]"
          />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar emoji"
            className="h-10 w-full rounded-full border border-[#e2d9cd] bg-[#fbfaf7] pl-10 pr-4 text-sm text-[#3a3027] outline-none placeholder:text-[#9e9184]"
          />
        </div>
      </div>

      {!query.trim() && recentEmojis.length ? (
        <div className="border-b border-[#ece4da] bg-[#fcfaf6] px-3 py-2">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8c7d6e]">
            <Clock3 size={12} />
            Recientes
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recentEmojis.slice(0, 8).map((emoji) => (
              <button
                key={`recent-${emoji}`}
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[22px] shadow-[0_4px_12px_rgba(54,42,31,0.08)] transition hover:bg-[#f5eee4]"
                onClick={() => handleSelect(emoji)}
                aria-label={`Insertar ${emoji}`}
                title={emoji}
              >
                <span aria-hidden>{emoji}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="max-h-[276px] overflow-y-auto px-3 py-3">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8c7d6e]">
          {query.trim() ? "Resultados" : activeSet.label}
        </div>
        {visibleEntries.length ? (
          <div className="grid grid-cols-8 gap-1.5">
            {visibleEntries.map((entry) => (
              <button
                key={`${activeSet.id}-${entry.emoji}`}
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] text-[24px] transition hover:bg-[#efe8de]"
                onClick={() => handleSelect(entry.emoji)}
                aria-label={`Insertar ${entry.label}`}
                title={entry.label}
              >
                <span aria-hidden>{entry.emoji}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-[18px] bg-[#f3ece2] px-3 py-4 text-sm text-[#7a6d60]">
            {query.trim()
              ? "No he encontrado emojis para esa busqueda."
              : "Aun no hay emojis recientes. Elige uno y aparecera aqui."}
          </div>
        )}
      </div>

      <div className="grid grid-cols-5 gap-1 border-t border-[#e8e1d7] bg-white/75 px-2 py-2">
        {visibleCategories.map((category) => {
          const active = category.id === activeSet.id;
          return (
            <button
              key={category.id}
              type="button"
              className={`rounded-[14px] px-2 py-2 text-center transition ${
                active
                  ? "bg-white shadow-[0_6px_14px_rgba(40,33,24,0.08)]"
                  : "hover:bg-white/70"
              }`}
              onClick={() => {
                setQuery("");
                setActiveCategory(category.id);
              }}
              aria-label={category.label}
              title={category.label}
            >
              <div className="text-lg leading-none">{category.icon}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
