"use client";

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { supabase } from "@/lib/supabase";
import { withGardenIdOnInsert, withGardenScope } from "@/lib/gardens";
import type { SeasonCode } from "@/lib/timelineConfig";

type SaveSeasonChapterNoteInput = {
  year: number;
  season: SeasonCode;
  note: string;
  noteKey: string;
};

type UseTimelineSeasonChapterNotesParams = {
  activeGardenId: string | null;
  setSeasonNotes: Dispatch<SetStateAction<Record<string, string>>>;
};

type UseTimelineSeasonChapterNotesResult = {
  editingKey: string | null;
  editingText: string;
  chapterNoteStatus: string | null;
  setEditingText: Dispatch<SetStateAction<string>>;
  startEditing: (noteKey: string, note: string) => void;
  cancelEditing: () => void;
  saveSeasonChapterNote: (input: SaveSeasonChapterNoteInput) => Promise<void>;
};

export function useTimelineSeasonChapterNotes({
  activeGardenId,
  setSeasonNotes,
}: UseTimelineSeasonChapterNotesParams): UseTimelineSeasonChapterNotesResult {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [chapterNoteStatus, setChapterNoteStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!chapterNoteStatus) return;
    const timer = window.setTimeout(() => setChapterNoteStatus(null), 4200);
    return () => window.clearTimeout(timer);
  }, [chapterNoteStatus]);

  const startEditing = useCallback((noteKey: string, note: string) => {
    setEditingKey(noteKey);
    setEditingText(note);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingKey(null);
  }, []);

  const saveSeasonChapterNote = useCallback(
    async (input: SaveSeasonChapterNoteInput) => {
      const { year: noteYear, season: noteSeason, note, noteKey } = input;
      setChapterNoteStatus(null);

      const updateRes = await withGardenScope(
        supabase
          .from("season_notes")
          .update({ note })
          .eq("year", noteYear)
          .eq("season", noteSeason)
          .select("year")
          .limit(1),
        activeGardenId,
      );

      if (updateRes.error) {
        setChapterNoteStatus(
          `No se pudo guardar la frase del capítulo: ${updateRes.error.message}`,
        );
        return;
      }

      const hasUpdated =
        ((updateRes.data as Array<{ year: number }> | null) ?? []).length > 0;

      if (!hasUpdated) {
        const insertRes = await supabase
          .from("season_notes")
          .insert(
            withGardenIdOnInsert(
              {
                year: noteYear,
                season: noteSeason,
                note,
              },
              activeGardenId,
            ),
          );
        if (insertRes.error) {
          setChapterNoteStatus(
            `No se pudo guardar la frase del capítulo: ${insertRes.error.message}`,
          );
          return;
        }
      }

      setSeasonNotes((prev) => ({
        ...prev,
        [noteKey]: note,
      }));
      setEditingKey(null);
      setChapterNoteStatus("Frase del capítulo guardada.");
    },
    [activeGardenId, setSeasonNotes],
  );

  return {
    editingKey,
    editingText,
    chapterNoteStatus,
    setEditingText,
    startEditing,
    cancelEditing,
    saveSeasonChapterNote,
  };
}
