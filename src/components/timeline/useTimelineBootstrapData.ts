"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { supabase } from "@/lib/supabase";
import { getSessionAccessToken, getSessionUser } from "@/lib/auth";
import { resolveActiveGardenIdForUser, withGardenScope } from "@/lib/gardens";
import {
  indexPageVisualStatesByPageId,
  loadPageVisualStates,
} from "@/lib/pageVisualState";
import {
  normalizeText,
  parseTimelinePageItem,
  type PageItem,
  type TimelineLifeEventsResponse,
} from "@/lib/timelinePageUtils";

type UseTimelineBootstrapDataParams = {
  gardenReloadTick: number;
  onRequireLogin: () => void;
};

type UseTimelineBootstrapDataResult = {
  items: PageItem[];
  loading: boolean;
  activeGardenId: string | null;
  setActiveGardenId: Dispatch<SetStateAction<string | null>>;
  seasonNotes: Record<string, string>;
  setSeasonNotes: Dispatch<SetStateAction<Record<string, string>>>;
};

export function useTimelineBootstrapData({
  gardenReloadTick,
  onRequireLogin,
}: UseTimelineBootstrapDataParams): UseTimelineBootstrapDataResult {
  const [items, setItems] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [seasonNotes, setSeasonNotes] = useState<Record<string, string>>({});
  const [activeGardenId, setActiveGardenId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      const [user, accessToken] = await Promise.all([
        getSessionUser(),
        getSessionAccessToken(),
      ]);
      if (!user) {
        onRequireLogin();
        return;
      }

      const resolvedGardenId = await resolveActiveGardenIdForUser({
        userId: user.id,
        forceRefresh: true,
      }).catch(() => null);
      if (!active) return;
      setActiveGardenId(resolvedGardenId);
      const pageVisualStatesRes = await loadPageVisualStates(supabase, {
        gardenId: resolvedGardenId,
      });
      const pageVisualStateById = indexPageVisualStatesByPageId(pageVisualStatesRes.states);

      const { data: notes } = await withGardenScope(
        supabase
          .from("season_notes")
          .select("year,season,note"),
        resolvedGardenId,
      );
      if (!active) return;

      const notesMap: Record<string, string> = {};
      for (const row of notes ?? []) {
        const noteRow = row as {
          year?: unknown;
          season?: unknown;
          note?: unknown;
        };
        const year = String(noteRow.year ?? "").trim();
        const seasonCode = String(noteRow.season ?? "").trim();
        if (!year || !seasonCode) continue;
        notesMap[`${year}-${seasonCode}`] = String(noteRow.note ?? "");
      }
      setSeasonNotes(notesMap);

      const fetchUrl =
        "/api/life/events" +
        "?from=1970-01-01" +
        "&to=3000-12-31" +
        "&order=desc" +
        "&limit=5000" +
        "&sources=page" +
        "&dedupeBloomedPages=0";

      let nextItems: PageItem[] | null = null;
      try {
        if (!accessToken) {
          throw new Error("No hay token de sesión para consultar eventos.");
        }

        const res = await fetch(fetchUrl, {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const payload: TimelineLifeEventsResponse | null = await res
          .json()
          .catch(() => null);

        if (!res.ok) {
          const apiError = normalizeText(payload?.error);
          throw new Error(apiError || "No se pudieron cargar recuerdos de timeline.");
        }

        const events = Array.isArray(payload?.events) ? payload.events : [];
        const parsed = events
          .map(parseTimelinePageItem)
          .filter((item): item is PageItem => Boolean(item))
          .map((item) => ({
            ...item,
            visual: pageVisualStateById.get(item.id) ?? null,
          }));

        const apiGardenId = normalizeText(payload?.activeGardenId);
        if (apiGardenId) setActiveGardenId(apiGardenId);
        nextItems = parsed;
      } catch {
        const { data, error } = await withGardenScope(
          supabase
            .from("pages")
            .select(
              "id,title,date,element,rating,mood_state,thumbnail_url,cover_photo_url",
            )
            .order("date", { ascending: false }),
          resolvedGardenId,
        );
        if (!error) {
          nextItems = (((data as PageItem[] | null) ?? []).map((item) => ({
            ...item,
            visual: pageVisualStateById.get(item.id) ?? null,
          })));
        }
      }

      if (active && nextItems) setItems(nextItems);
      if (active) setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [gardenReloadTick, onRequireLogin]);

  return {
    items,
    loading,
    activeGardenId,
    setActiveGardenId,
    seasonNotes,
    setSeasonNotes,
  };
}
