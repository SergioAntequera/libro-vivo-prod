"use client";

import { useMemo } from "react";

type UsePageSharedPresenceLabelsParams = {
  activeSharedTarget: string | null;
  saving: boolean;
  changingPlanType: boolean;
  uploadingCoverPhoto: boolean;
  uploadingAudio: boolean;
  uploadingCanvasPhoto: boolean;
  uploadingCanvasVideo: boolean;
};

export function usePageSharedPresenceLabels({
  activeSharedTarget,
  saving,
  changingPlanType,
  uploadingCoverPhoto,
  uploadingAudio,
  uploadingCanvasPhoto,
  uploadingCanvasVideo,
}: UsePageSharedPresenceLabelsParams) {
  const localSharedFocusLabel = useMemo(() => {
    if (activeSharedTarget === "summary") return "Texto principal";
    if (activeSharedTarget === "plan_type") return "Tipo de plan";
    if (activeSharedTarget === "favorite") return "Favorita";
    if (activeSharedTarget === "highlight") return "Destacado del año";
    if (activeSharedTarget === "rating") return "Valoracion";
    if (activeSharedTarget === "location") return "Lugar";
    if (activeSharedTarget === "audio") return "Audio";
    if (activeSharedTarget === "cover") return "Portada";
    if (activeSharedTarget === "canvas") return "Lienzo";
    return null;
  }, [activeSharedTarget]);

  const localSharedActivityLabel = useMemo(() => {
    if (saving) return "Guardando";
    if (changingPlanType) return "Cambiando el tipo de plan";
    if (uploadingCoverPhoto) return "Subiendo portada";
    if (uploadingAudio) return "Subiendo audio";
    if (uploadingCanvasPhoto) return "Subiendo foto al lienzo";
    if (uploadingCanvasVideo) return "Subiendo video al lienzo";
    if (activeSharedTarget === "summary") return "Escribiendo";
    if (activeSharedTarget === "plan_type") return "Cambiando el tipo de plan";
    if (activeSharedTarget === "favorite") return "Marcando favorita";
    if (activeSharedTarget === "highlight") return "Ajustando destacado";
    if (activeSharedTarget === "rating") return "Valorando";
    if (activeSharedTarget === "location") return "Ajustando el lugar";
    if (activeSharedTarget === "audio") return "Ajustando el audio";
    if (activeSharedTarget === "cover") return "Cambiando la portada";
    if (activeSharedTarget === "canvas") return "Moviendose por el lienzo";
    return null;
  }, [
    activeSharedTarget,
    changingPlanType,
    saving,
    uploadingAudio,
    uploadingCanvasPhoto,
    uploadingCanvasVideo,
    uploadingCoverPhoto,
  ]);

  return {
    localSharedFocusLabel,
    localSharedActivityLabel,
  };
}
