"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isSchemaNotReadyError, withGardenScope } from "@/lib/gardens";
import {
  normalizeFlowerBirthRitualRatingRow,
  normalizeFlowerBirthRitualRow,
  type FlowerBirthRitualRatingRow,
  type FlowerBirthRitualRow,
} from "@/lib/flowerBirthRitual";
import {
  normalizeFlowerPageRevisionRow,
  type FlowerPageRevisionRow,
} from "@/lib/flowerPageRevision";

type UsePageFlowerBirthDataParams = {
  activeGardenId: string | null;
  loadRitualData?: boolean;
  loadSecondaryData?: boolean;
  myProfileId: string;
  pageId: string | null | undefined;
};

export function usePageFlowerBirthData({
  activeGardenId,
  loadRitualData = true,
  loadSecondaryData = false,
  myProfileId,
  pageId,
}: UsePageFlowerBirthDataParams) {
  const [flowerBirthRitual, setFlowerBirthRitual] = useState<FlowerBirthRitualRow | null>(null);
  const [flowerBirthRitualAvailable, setFlowerBirthRitualAvailable] = useState(true);
  const [flowerBirthRatingsAvailable, setFlowerBirthRatingsAvailable] = useState(true);
  const [flowerBirthRatings, setFlowerBirthRatings] = useState<FlowerBirthRitualRatingRow[]>([]);
  const [savedFlowerBirthRating, setSavedFlowerBirthRating] = useState(0);
  const [flowerRevisionsAvailable, setFlowerRevisionsAvailable] = useState(true);
  const [flowerRevisions, setFlowerRevisions] = useState<FlowerPageRevisionRow[]>([]);

  const refreshFlowerRevisions = useCallback(async () => {
    if (!pageId || !activeGardenId) {
      setFlowerRevisions([]);
      return;
    }

    const { data, error } = await withGardenScope(
      supabase
        .from("flower_page_revisions")
        .select("*")
        .eq("page_id", pageId)
        .order("created_at", { ascending: false })
        .limit(10),
      activeGardenId,
    );

    if (error) {
      if (isSchemaNotReadyError(error)) {
        setFlowerRevisionsAvailable(false);
        setFlowerRevisions([]);
        return;
      }
      console.warn("[page/detail] no se pudo cargar flower_page_revisions:", error);
      return;
    }

    setFlowerRevisionsAvailable(true);
    setFlowerRevisions(
      (((data as Array<Record<string, unknown>> | null) ?? [])
        .map((row) => normalizeFlowerPageRevisionRow(row, String(row.id ?? "")))
        .filter((row) => row.id && row.page_id)),
    );
  }, [activeGardenId, pageId]);

  const refreshFlowerBirthRatings = useCallback(async () => {
    if (!pageId || !activeGardenId) {
      setFlowerBirthRatings([]);
      setSavedFlowerBirthRating(0);
      return;
    }

    const { data, error } = await withGardenScope(
      supabase
        .from("flower_birth_ritual_ratings")
        .select("page_id,garden_id,user_id,rating,ready_at,created_at,updated_at")
        .eq("page_id", pageId),
      activeGardenId,
    );

    if (error) {
      if (isSchemaNotReadyError(error)) {
        setFlowerBirthRatingsAvailable(false);
        setFlowerBirthRatings([]);
        setSavedFlowerBirthRating(0);
        return;
      }
      console.warn("[page/detail] no se pudo refrescar flower_birth_ritual_ratings:", error);
      return;
    }

    setFlowerBirthRatingsAvailable(true);
    const normalizedRatings = (
      ((data as Array<Record<string, unknown>> | null) ?? [])
        .map((row) => normalizeFlowerBirthRitualRatingRow(row))
        .filter((row): row is FlowerBirthRitualRatingRow => row !== null)
    );
    setFlowerBirthRatings(normalizedRatings);
    setSavedFlowerBirthRating(
      normalizedRatings.find((entry) => entry.user_id === myProfileId)?.rating ?? 0,
    );
  }, [activeGardenId, myProfileId, pageId]);

  const refreshFlowerBirthRitual = useCallback(async () => {
    if (!pageId || !activeGardenId || !loadRitualData) {
      setFlowerBirthRitual(null);
      return;
    }

    const { data, error } = await withGardenScope(
      supabase
        .from("flower_birth_rituals")
        .select("*")
        .eq("page_id", pageId)
        .maybeSingle(),
      activeGardenId,
    );

    if (error) {
      if (isSchemaNotReadyError(error)) {
        setFlowerBirthRitualAvailable(false);
        setFlowerBirthRitual(null);
        return;
      }
      console.warn("[page/detail] no se pudo cargar flower_birth_rituals:", error);
      return;
    }

    setFlowerBirthRitualAvailable(true);
    setFlowerBirthRitual(
      normalizeFlowerBirthRitualRow((data as Record<string, unknown> | null) ?? null),
    );
  }, [activeGardenId, loadRitualData, pageId]);

  useEffect(() => {
    void refreshFlowerBirthRitual();
  }, [refreshFlowerBirthRitual]);

  useEffect(() => {
    const shouldLoadSecondaryData =
      loadSecondaryData || Boolean(flowerBirthRitual && !flowerBirthRitual.completed_at);
    if (!pageId || !activeGardenId || !shouldLoadSecondaryData) {
      const frameId = window.requestAnimationFrame(() => {
        setFlowerBirthRatings([]);
        setSavedFlowerBirthRating(0);
      });
      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }
    const frameId = window.requestAnimationFrame(() => {
      void refreshFlowerBirthRatings();
    });
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [activeGardenId, flowerBirthRitual, loadSecondaryData, pageId, refreshFlowerBirthRatings]);

  useEffect(() => {
    const shouldLoadSecondaryData =
      loadSecondaryData || Boolean(flowerBirthRitual && !flowerBirthRitual.completed_at);
    if (!pageId || !activeGardenId || !shouldLoadSecondaryData) {
      const frameId = window.requestAnimationFrame(() => {
        setFlowerRevisions([]);
      });
      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }
    const frameId = window.requestAnimationFrame(() => {
      void refreshFlowerRevisions();
    });
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [activeGardenId, flowerBirthRitual, loadSecondaryData, pageId, refreshFlowerRevisions]);

  return {
    flowerBirthRatings,
    flowerBirthRatingsAvailable,
    flowerBirthRitual,
    flowerBirthRitualAvailable,
    flowerRevisions,
    flowerRevisionsAvailable,
    refreshFlowerBirthRatings,
    refreshFlowerBirthRitual,
    refreshFlowerRevisions,
    savedFlowerBirthRating,
    setFlowerBirthRatings,
    setFlowerBirthRatingsAvailable,
    setFlowerBirthRitual,
    setFlowerRevisionsAvailable,
    setSavedFlowerBirthRating,
  };
}
