"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { withGardenIdOnInsert, withGardenScope } from "@/lib/gardens";
import { getErrorMessage } from "@/lib/pageDetailUtils";
import {
  isMissingYearHighlightPageIdsError,
  normalizeYearHighlightPageIds,
  MAX_YEAR_HIGHLIGHTS,
} from "@/lib/yearHighlightSelection";

type YearHighlightPagePreview = {
  id: string;
  title: string | null;
  date: string;
  cover_photo_url: string | null;
  thumbnail_url: string | null;
};

type YearHighlightDialogItem = {
  id: string;
  title: string | null;
  date: string;
  coverPhotoUrl: string | null;
  thumbnailUrl: string | null;
};

type UsePageYearHighlightsParams = {
  activeGardenId: string | null;
  enabled?: boolean;
  pageId: string | null;
  pageDate: string | null | undefined;
  pageTitle: string | null | undefined;
  onSetMessage: (message: string | null) => void;
  onBeforeToggleHighlight?: () => void;
  onPersistCurrentPageIsYearHighlight?: (nextIsYearHighlight: boolean) => void;
};

function toYearHighlightPreview(
  row: Partial<YearHighlightPagePreview> & Record<string, unknown>,
  fallbackId = "",
): YearHighlightPagePreview | null {
  const id = String(row.id ?? fallbackId ?? "").trim();
  if (!id) return null;

  return {
    id,
    title: typeof row.title === "string" ? row.title : null,
    date: typeof row.date === "string" ? row.date : "",
    cover_photo_url:
      typeof row.cover_photo_url === "string" ? row.cover_photo_url : null,
    thumbnail_url:
      typeof row.thumbnail_url === "string" ? row.thumbnail_url : null,
  };
}

function orderYearHighlightPreviews(
  rows: Array<Partial<YearHighlightPagePreview> & Record<string, unknown>>,
  orderedIds: string[],
) {
  const byId = new Map<string, YearHighlightPagePreview>();

  for (const row of rows) {
    const preview = toYearHighlightPreview(row);
    if (!preview) continue;
    byId.set(preview.id, preview);
  }

  return orderedIds
    .map((id) => byId.get(id) ?? toYearHighlightPreview({ id }, id))
    .filter((item): item is YearHighlightPagePreview => item !== null);
}

export function usePageYearHighlights({
  activeGardenId,
  enabled = true,
  pageId,
  pageDate,
  pageTitle,
  onSetMessage,
  onBeforeToggleHighlight,
  onPersistCurrentPageIsYearHighlight,
}: UsePageYearHighlightsParams) {
  const [yearHighlightPageIds, setYearHighlightPageIds] = useState<string[]>([]);
  const [yearHighlightCandidates, setYearHighlightCandidates] = useState<
    YearHighlightPagePreview[]
  >([]);
  const [showYearHighlightReplaceModal, setShowYearHighlightReplaceModal] = useState(false);
  const [updatingYearHighlight, setUpdatingYearHighlight] = useState(false);

  const pageYear = useMemo(() => {
    const raw = String(pageDate ?? "").slice(0, 4);
    const year = Number(raw);
    return Number.isInteger(year) ? year : null;
  }, [pageDate]);

  const isYearHighlight = useMemo(
    () => Boolean(pageId) && yearHighlightPageIds.includes(String(pageId ?? "")),
    [pageId, yearHighlightPageIds],
  );

  const canToggleYearHighlight = enabled && pageYear != null;
  const currentPageHighlightTitle =
    String(pageTitle ?? "").trim() || "Pagina sin titulo";

  const loadYearHighlightCandidates = useCallback(
    async (highlightIds: string[]) => {
      const normalizedIds = normalizeYearHighlightPageIds(highlightIds);
      if (!activeGardenId || !normalizedIds.length) {
        setYearHighlightCandidates([]);
        return [] as YearHighlightPagePreview[];
      }

      const response = await withGardenScope(
        supabase
          .from("pages")
          .select("id,title,date,cover_photo_url,thumbnail_url")
          .in("id", normalizedIds),
        activeGardenId,
      );

      if (response.error) {
        throw response.error;
      }

      const ordered = orderYearHighlightPreviews(
        ((response.data as Array<Record<string, unknown>> | null) ?? []),
        normalizedIds,
      );
      setYearHighlightCandidates(ordered);
      return ordered;
    },
    [activeGardenId],
  );

  const refreshYearHighlightState = useCallback(async () => {
    if (!activeGardenId || pageYear == null) {
      setYearHighlightPageIds([]);
      setYearHighlightCandidates([]);
      setShowYearHighlightReplaceModal(false);
      return [] as string[];
    }

    const response = await withGardenScope(
      supabase
        .from("year_notes")
        .select("highlight_page_ids")
        .eq("year", pageYear),
      activeGardenId,
    ).maybeSingle();

    if (response.error) {
      if (isMissingYearHighlightPageIdsError(response.error.message)) {
        setYearHighlightPageIds([]);
        setYearHighlightCandidates([]);
        return [];
      }
      throw response.error;
    }

    const normalizedIds = normalizeYearHighlightPageIds(
      (response.data as { highlight_page_ids?: unknown } | null)?.highlight_page_ids,
    );
    setYearHighlightPageIds(normalizedIds);
    setYearHighlightCandidates((prev) => orderYearHighlightPreviews(prev, normalizedIds));
    return normalizedIds;
  }, [activeGardenId, pageYear]);

  const persistYearHighlightPageIds = useCallback(
    async (nextIds: string[], successMessage: string) => {
      if (!activeGardenId || pageYear == null) {
        onSetMessage("Esta flor necesita un jardin activo y una fecha valida para entrar en destacados.");
        return false;
      }

      const normalizedIds = normalizeYearHighlightPageIds(nextIds);
      setUpdatingYearHighlight(true);
      onSetMessage(null);

      try {
        const updateRes = await withGardenScope(
          supabase
            .from("year_notes")
            .update({ highlight_page_ids: normalizedIds })
            .eq("year", pageYear)
            .select("year")
            .limit(1),
          activeGardenId,
        );

        if (updateRes.error) {
          if (isMissingYearHighlightPageIdsError(updateRes.error.message)) {
            throw new Error(
              "Falta aplicar la migracion 2026-03-20_year_notes_highlight_page_ids.sql para usar destacados editoriales.",
            );
          }
          throw updateRes.error;
        }

        const hasUpdatedRow = ((updateRes.data as Array<{ year: number }> | null) ?? []).length > 0;
        if (!hasUpdatedRow) {
          const insertRes = await supabase.from("year_notes").insert(
            withGardenIdOnInsert(
              {
                year: pageYear,
                note: "",
                cover_url: null,
                highlight_page_ids: normalizedIds,
              },
              activeGardenId,
            ),
          );

          if (insertRes.error) {
            if (isMissingYearHighlightPageIdsError(insertRes.error.message)) {
              throw new Error(
                "Falta aplicar la migracion 2026-03-20_year_notes_highlight_page_ids.sql para usar destacados editoriales.",
              );
            }
            throw insertRes.error;
          }
        }

        setYearHighlightPageIds(normalizedIds);
        setYearHighlightCandidates((prev) => orderYearHighlightPreviews(prev, normalizedIds));
        onPersistCurrentPageIsYearHighlight?.(
          Boolean(pageId) && normalizedIds.includes(String(pageId ?? "")),
        );
        onSetMessage(successMessage);
        return true;
      } catch (error: unknown) {
        onSetMessage(getErrorMessage(error, "No se pudieron guardar los destacados del año."));
        return false;
      } finally {
        setUpdatingYearHighlight(false);
      }
    },
    [
      activeGardenId,
      onPersistCurrentPageIsYearHighlight,
      onSetMessage,
      pageId,
      pageYear,
    ],
  );

  const toggleYearHighlight = useCallback(async () => {
    if (!pageId) return;
    if (updatingYearHighlight) return;
    if (!enabled) return;
    onBeforeToggleHighlight?.();

    if (pageYear == null) {
      onSetMessage("Esta flor necesita una fecha valida para entrar en destacados.");
      return;
    }

    if (isYearHighlight) {
      setShowYearHighlightReplaceModal(false);
      await persistYearHighlightPageIds(
        yearHighlightPageIds.filter((entryId) => entryId !== pageId),
        "La flor ya no forma parte de los destacados del año.",
      );
      return;
    }

    if (yearHighlightPageIds.length < MAX_YEAR_HIGHLIGHTS) {
      await persistYearHighlightPageIds(
        [...yearHighlightPageIds, pageId],
        "Flor añadida a los destacados del año.",
      );
      return;
    }

    try {
      await loadYearHighlightCandidates(yearHighlightPageIds);
      setShowYearHighlightReplaceModal(true);
    } catch (error: unknown) {
      onSetMessage(getErrorMessage(error, "No se pudieron cargar los destacados actuales."));
    }
  }, [
    isYearHighlight,
    loadYearHighlightCandidates,
    onBeforeToggleHighlight,
    enabled,
    onSetMessage,
    pageId,
    pageYear,
    persistYearHighlightPageIds,
    updatingYearHighlight,
    yearHighlightPageIds,
  ]);

  const replaceYearHighlightWithCurrentPage = useCallback(
    async (replacedPageId: string) => {
      if (!pageId || updatingYearHighlight) return;

      const nextIds = yearHighlightPageIds.map((entryId) =>
        entryId === replacedPageId ? pageId : entryId,
      );
      const didPersist = await persistYearHighlightPageIds(
        nextIds,
        "Destacado anual actualizado.",
      );

      if (didPersist) {
        setShowYearHighlightReplaceModal(false);
      }
    },
    [pageId, persistYearHighlightPageIds, updatingYearHighlight, yearHighlightPageIds],
  );

  const closeYearHighlightReplaceModal = useCallback(() => {
    if (updatingYearHighlight) return;
    setShowYearHighlightReplaceModal(false);
  }, [updatingYearHighlight]);

  const applyCurrentPageYearHighlight = useCallback(
    (nextIsYearHighlight: boolean) => {
      setYearHighlightPageIds((prev) => {
        if (!pageId) return prev;
        const targetId = String(pageId);
        const filtered = prev.filter((entryId) => entryId !== targetId);
        return nextIsYearHighlight ? [...filtered, targetId] : filtered;
      });
    },
    [pageId],
  );

  const yearHighlightDialogItems = useMemo<YearHighlightDialogItem[]>(
    () =>
      yearHighlightCandidates.map((item) => ({
        id: item.id,
        title: item.title,
        date: item.date,
        coverPhotoUrl: item.cover_photo_url,
        thumbnailUrl: item.thumbnail_url,
      })),
    [yearHighlightCandidates],
  );

  useEffect(() => {
    if (!enabled || !activeGardenId || pageYear == null) {
      setYearHighlightPageIds([]);
      setYearHighlightCandidates([]);
      setShowYearHighlightReplaceModal(false);
      return;
    }

    let active = true;

    (async () => {
      try {
        await refreshYearHighlightState();
      } catch (error) {
        if (!active) return;
        console.warn("[page/detail] no se pudieron cargar los destacados anuales:", error);
      }
    })();

    return () => {
      active = false;
    };
  }, [activeGardenId, enabled, pageYear, refreshYearHighlightState]);

  useEffect(() => {
    if (!enabled || !activeGardenId || pageYear == null) return;

    const channel = supabase
      .channel(`year-highlights:${activeGardenId}:${pageYear}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "year_notes",
        },
        (payload) => {
          const nextGardenId = String(
            (payload.new as { garden_id?: unknown } | null)?.garden_id ??
              (payload.old as { garden_id?: unknown } | null)?.garden_id ??
              "",
          ).trim();
          const nextYear = Number(
            (payload.new as { year?: unknown } | null)?.year ??
              (payload.old as { year?: unknown } | null)?.year ??
              NaN,
          );
          if (nextGardenId !== activeGardenId || nextYear !== pageYear) return;
          void refreshYearHighlightState().catch((error) => {
            console.warn("[page/detail] no se pudieron refrescar los destacados anuales:", error);
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeGardenId, enabled, pageYear, refreshYearHighlightState]);

  return {
    applyCurrentPageYearHighlight,
    canToggleYearHighlight,
    closeYearHighlightReplaceModal,
    currentPageHighlightTitle,
    isYearHighlight,
    pageYear,
    refreshYearHighlightState,
    replaceYearHighlightWithCurrentPage,
    showYearHighlightReplaceModal,
    toggleYearHighlight,
    updatingYearHighlight,
    yearHighlightDialogItems,
  };
}
