"use client";

import { useCallback } from "react";
import { deleteManagedMediaBatchForPage } from "@/lib/deleteManagedMedia";
import { buildGardenChatPageReference } from "@/lib/gardenChatReferences";
import { sendGardenChatReferenceMessage } from "@/lib/gardenChatMutations";
import { isSchemaNotReadyError, withGardenScope } from "@/lib/gardens";
import { getErrorMessage } from "@/lib/pageDetailUtils";
import { collectManagedPageMediaUrls } from "@/lib/pageManagedMedia";
import type { PlanTypeOption } from "@/lib/planTypeCatalog";
import { supabase } from "@/lib/supabase";
import type { CanvasObject } from "@/lib/canvasTypes";
import type { PageRow } from "@/lib/pageDetailTypes";
import type { FlowerPagePersistedSnapshot } from "@/lib/flowerPageRevision";
import type { PageSeedContext } from "@/components/pageDetail/usePageSeedContext";

type PageSavedSnapshot = {
  canvasObjectsJson: string;
  rating: number;
  planSummary: string;
  planTypeId: string;
  isFavorite: boolean;
  isYearHighlight: boolean;
  locationLabel: string;
  locationLat: string;
  locationLng: string;
  audioUrl: string;
  audioLabel: string;
  coverPhotoUrl: string;
  managedMediaUrls: string[];
};

type UsePageDetailMutationsParams = {
  activeGardenId: string | null;
  audioUrl: string;
  currentRevisionSnapshot: FlowerPagePersistedSnapshot | null;
  myProfileId: string;
  objects: CanvasObject[];
  onNavigateHome: () => void;
  page: PageRow | null;
  planTypeLabel: string | null;
  planTypeOptions: PlanTypeOption[];
  pulseSharedTarget: (target: "favorite" | "highlight") => void;
  setChangingPlanType: (value: boolean) => void;
  setDeletingPage: (value: boolean) => void;
  setMessage: (value: string | null) => void;
  setPage: (
    next: PageRow | null | ((prev: PageRow | null) => PageRow | null),
  ) => void;
  setSavedSnapshot: (
    next:
      | PageSavedSnapshot
      | null
      | ((prev: PageSavedSnapshot | null) => PageSavedSnapshot | null),
  ) => void;
  setSeedContext: (
    next:
      | PageSeedContext
      | ((prev: PageSeedContext) => PageSeedContext),
  ) => void;
  setSharingToChat: (value: boolean) => void;
  setShowDeleteConfirmModal: (value: boolean) => void;
  recordFlowerRevision: (
    previousSnapshot: FlowerPagePersistedSnapshot | null,
    nextSnapshot: FlowerPagePersistedSnapshot,
  ) => Promise<void>;
};

function parseSnapshotCanvasObjects(snapshot: PageSavedSnapshot | null) {
  if (!snapshot?.canvasObjectsJson) return [];
  try {
    const parsed = JSON.parse(snapshot.canvasObjectsJson);
    return Array.isArray(parsed) ? (parsed as CanvasObject[]) : [];
  } catch {
    return [];
  }
}

function patchSavedSnapshot(
  snapshot: PageSavedSnapshot | null,
  patch: Partial<
    Pick<
      PageSavedSnapshot,
      "audioUrl" | "audioLabel" | "coverPhotoUrl" | "isFavorite" | "isYearHighlight" | "planTypeId"
    >
  >,
) {
  if (!snapshot) return snapshot;

  const nextSnapshot: PageSavedSnapshot = {
    ...snapshot,
    ...patch,
  };
  const savedObjects = parseSnapshotCanvasObjects(snapshot);

  nextSnapshot.managedMediaUrls = collectManagedPageMediaUrls({
    audioUrl: nextSnapshot.audioUrl,
    coverPhotoUrl: nextSnapshot.coverPhotoUrl,
    canvasObjects: savedObjects,
  }).sort();

  return nextSnapshot;
}

export function usePageDetailMutations({
  activeGardenId,
  audioUrl,
  currentRevisionSnapshot,
  myProfileId,
  objects,
  onNavigateHome,
  page,
  planTypeLabel,
  planTypeOptions,
  pulseSharedTarget,
  recordFlowerRevision,
  setChangingPlanType,
  setDeletingPage,
  setMessage,
  setPage,
  setSavedSnapshot,
  setSeedContext,
  setSharingToChat,
  setShowDeleteConfirmModal,
}: UsePageDetailMutationsParams) {
  const toggleFavorite = useCallback(async () => {
    if (!page) return;

    const next = !page.is_favorite;
    pulseSharedTarget("favorite");

    const { error } = await withGardenScope(supabase.from("pages"), activeGardenId)
      .update({ is_favorite: next })
      .eq("id", page.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setPage((prev) => (prev ? { ...prev, is_favorite: next } : prev));
    setSavedSnapshot((prev) =>
      patchSavedSnapshot(prev, {
        isFavorite: next,
      }),
    );
    if (currentRevisionSnapshot) {
      const nextRevisionSnapshot: FlowerPagePersistedSnapshot = {
        ...currentRevisionSnapshot,
        isFavorite: next,
      };
      await recordFlowerRevision(currentRevisionSnapshot, nextRevisionSnapshot);
    }
  }, [
    activeGardenId,
    currentRevisionSnapshot,
    page,
    pulseSharedTarget,
    recordFlowerRevision,
    setMessage,
    setPage,
    setSavedSnapshot,
  ]);

  const updatePlanType = useCallback(
    async (nextPlanTypeId: string) => {
      if (!page || !activeGardenId) return;

      const normalizedPlanTypeId = String(nextPlanTypeId ?? "").trim() || null;
      setChangingPlanType(true);
      setMessage(null);

      try {
        let persistedSomewhere = false;
        const pageUpdate = await withGardenScope(supabase.from("pages"), activeGardenId)
          .update({ plan_type_id: normalizedPlanTypeId })
          .eq("id", page.id);

        if (pageUpdate.error) {
          if (!isSchemaNotReadyError(pageUpdate.error)) {
            throw pageUpdate.error;
          }
        } else {
          persistedSomewhere = true;
          setPage((prev) => (prev ? { ...prev, plan_type_id: normalizedPlanTypeId } : prev));
        }

        if (page.planned_from_seed_id) {
          const seedUpdate = await withGardenScope(supabase.from("seeds"), activeGardenId)
            .update({ plan_type_id: normalizedPlanTypeId })
            .eq("id", page.planned_from_seed_id);
          if (seedUpdate.error) throw seedUpdate.error;
          persistedSomewhere = true;
        }

        if (!persistedSomewhere) {
          throw new Error(
            "Falta la columna plan_type_id en pages. Ejecuta la migracion nueva antes de cambiar el tipo de plan aqui.",
          );
        }

        const selectedPlanType =
          planTypeOptions.find((item) => item.id === normalizedPlanTypeId) ?? null;

        setSeedContext((prev) => ({
          ...prev,
          planTypeId: normalizedPlanTypeId,
          planTypeLabel: selectedPlanType?.label ?? null,
          planTypeCategory: selectedPlanType?.category ?? null,
          planTypeFlowerFamily: selectedPlanType?.flowerFamily ?? null,
          planTypeFlowerAssetPath: selectedPlanType?.flowerAssetPath ?? null,
          planTypeFlowerBuilderConfig: selectedPlanType?.flowerBuilderConfig ?? null,
          planTypeSuggestedElement: selectedPlanType?.suggestedElement ?? null,
        }));
        setSavedSnapshot((prev) =>
          patchSavedSnapshot(prev, {
            planTypeId: normalizedPlanTypeId ?? "",
          }),
        );
        if (currentRevisionSnapshot) {
          const nextRevisionSnapshot: FlowerPagePersistedSnapshot = {
            ...currentRevisionSnapshot,
            planTypeId: normalizedPlanTypeId ?? "",
          };
          await recordFlowerRevision(currentRevisionSnapshot, nextRevisionSnapshot);
        }

        setMessage("Tipo de plan actualizado");
      } catch (error: unknown) {
        setMessage(getErrorMessage(error, "No se pudo actualizar el tipo de plan."));
      } finally {
        setChangingPlanType(false);
      }
    },
    [
      activeGardenId,
      currentRevisionSnapshot,
      page,
      planTypeOptions,
      recordFlowerRevision,
      setChangingPlanType,
      setMessage,
      setPage,
      setSavedSnapshot,
      setSeedContext,
    ],
  );

  const shareCurrentPageToChat = useCallback(async () => {
    const gardenId = String(activeGardenId ?? "").trim();
    const currentProfileId = String(myProfileId ?? "").trim();
    if (!page || !gardenId || !currentProfileId) {
      setMessage("Necesitamos la flor cargada, jardin activo y sesion valida para compartirla.");
      return;
    }

    setSharingToChat(true);
    setMessage(null);
    try {
      await sendGardenChatReferenceMessage({
        gardenId,
        authorUserId: currentProfileId,
        reference: buildGardenChatPageReference({
          page,
          planTypeLabel,
        }),
      });
      setMessage(`"${page.title?.trim() || "La flor"}" ya esta compartida en el chat.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo compartir la flor en el chat.");
    } finally {
      setSharingToChat(false);
    }
  }, [activeGardenId, myProfileId, page, planTypeLabel, setMessage, setSharingToChat]);

  const confirmDeleteCurrentPage = useCallback(async () => {
    if (!page) return;

    setShowDeleteConfirmModal(false);
    setDeletingPage(true);
    setMessage(null);

    try {
      const managedMediaUrls = collectManagedPageMediaUrls({
        audioUrl,
        coverPhotoUrl: page.cover_photo_url ?? null,
        canvasObjects: objects,
      });

      const deleteRes = await supabase.rpc("delete_garden_page", {
        p_page_id: page.id,
      });
      if (deleteRes.error) {
        if (isSchemaNotReadyError(deleteRes.error)) {
          throw new Error(
            "Falta la funcion delete_garden_page. Ejecuta la migracion 2026-03-25_page_delete_member_rpc.sql antes de borrar flores.",
          );
        }
        throw deleteRes.error;
      }

      const cleanup = await deleteManagedMediaBatchForPage(page.id, managedMediaUrls);
      if (cleanup.failed.length && typeof window !== "undefined") {
        window.alert(
          `La pagina se borro, pero ${cleanup.failed.length} archivo(s) no pudieron borrarse de Drive.`,
        );
      }

      onNavigateHome();
    } catch (error: unknown) {
      setMessage(getErrorMessage(error, "No se pudo borrar la pagina."));
    } finally {
      setDeletingPage(false);
    }
  }, [
    audioUrl,
    objects,
    onNavigateHome,
    page,
    setDeletingPage,
    setMessage,
    setShowDeleteConfirmModal,
  ]);

  return {
    confirmDeleteCurrentPage,
    shareCurrentPageToChat,
    toggleFavorite,
    updatePlanType,
  };
}
