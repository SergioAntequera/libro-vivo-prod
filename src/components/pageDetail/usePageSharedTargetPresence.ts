"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type DetailSection = "canvas" | "reflections" | "context";
type ContextSection = "location" | "audio" | "video";

type PageSharedTarget =
  | "summary"
  | "plan_type"
  | "favorite"
  | "highlight"
  | "rating"
  | "location"
  | "audio"
  | "cover"
  | "canvas";

type UsePageSharedTargetPresenceParams = {
  contextSection: ContextSection;
  detailSection: DetailSection;
  flowerBirthRitualPending: boolean;
  showExternalAudioModal: boolean;
  showLocationMapPicker: boolean;
};

function clearTimer(timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) {
  if (!timerRef.current) return;
  clearTimeout(timerRef.current);
  timerRef.current = null;
}

export function usePageSharedTargetPresence({
  contextSection,
  detailSection,
  flowerBirthRitualPending,
  showExternalAudioModal,
  showLocationMapPicker,
}: UsePageSharedTargetPresenceParams) {
  const [activeSharedTarget, setActiveSharedTarget] = useState<PageSharedTarget | null>(null);

  const ratingPresenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasPresenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const togglePresenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activateSharedTarget = useCallback(
    (target: PageSharedTarget) => {
      if (!flowerBirthRitualPending) return;
      setActiveSharedTarget(target);
    },
    [flowerBirthRitualPending],
  );

  const clearSharedTarget = useCallback(
    (target: PageSharedTarget) => {
      if (!flowerBirthRitualPending) return;
      setActiveSharedTarget((prev) => (prev === target ? null : prev));
    },
    [flowerBirthRitualPending],
  );

  const pulseSharedTarget = useCallback(
    (target: "favorite" | "highlight") => {
      if (!flowerBirthRitualPending) return;
      clearTimer(togglePresenceTimerRef);
      setActiveSharedTarget(target);
      togglePresenceTimerRef.current = setTimeout(() => {
        setActiveSharedTarget((prev) => (prev === target ? null : prev));
        togglePresenceTimerRef.current = null;
      }, 1200);
    },
    [flowerBirthRitualPending],
  );

  const markCanvasInteraction = useCallback(() => {
    if (!flowerBirthRitualPending) return;
    clearTimer(canvasPresenceTimerRef);
    setActiveSharedTarget("canvas");
    canvasPresenceTimerRef.current = setTimeout(() => {
      setActiveSharedTarget((prev) => (prev === "canvas" ? null : prev));
      canvasPresenceTimerRef.current = null;
    }, 1200);
  }, [flowerBirthRitualPending]);

  const markRatingInteraction = useCallback(() => {
    if (!flowerBirthRitualPending) return;
    clearTimer(ratingPresenceTimerRef);
    setActiveSharedTarget("rating");
    ratingPresenceTimerRef.current = setTimeout(() => {
      setActiveSharedTarget((prev) => (prev === "rating" ? null : prev));
      ratingPresenceTimerRef.current = null;
    }, 1200);
  }, [flowerBirthRitualPending]);

  useEffect(() => {
    return () => {
      clearTimer(ratingPresenceTimerRef);
      clearTimer(canvasPresenceTimerRef);
      clearTimer(togglePresenceTimerRef);
    };
  }, []);

  useEffect(() => {
    if (flowerBirthRitualPending) return;
    const frameId = window.requestAnimationFrame(() => {
      setActiveSharedTarget(null);
    });
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [flowerBirthRitualPending]);

  useEffect(() => {
    if (!flowerBirthRitualPending) return;
    const frameId = window.requestAnimationFrame(() => {
      if (showLocationMapPicker) {
        activateSharedTarget("location");
        return;
      }
      clearSharedTarget("location");
    });
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [
    activateSharedTarget,
    clearSharedTarget,
    flowerBirthRitualPending,
    showLocationMapPicker,
  ]);

  useEffect(() => {
    if (!flowerBirthRitualPending) return;
    const frameId = window.requestAnimationFrame(() => {
      if (showExternalAudioModal) {
        activateSharedTarget("audio");
        return;
      }
      clearSharedTarget("audio");
    });
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [
    activateSharedTarget,
    clearSharedTarget,
    flowerBirthRitualPending,
    showExternalAudioModal,
  ]);

  useEffect(() => {
    if (!flowerBirthRitualPending) return;

    const audioContextVisible =
      detailSection === "context" && (contextSection === "audio" || contextSection === "video");
    const locationContextVisible =
      detailSection === "context" && contextSection === "location";

    const frameId = window.requestAnimationFrame(() => {
      if (!locationContextVisible && !showLocationMapPicker) {
        clearSharedTarget("location");
      }
      if (!audioContextVisible && !showExternalAudioModal) {
        clearSharedTarget("audio");
      }
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [
    clearSharedTarget,
    contextSection,
    detailSection,
    flowerBirthRitualPending,
    showExternalAudioModal,
    showLocationMapPicker,
  ]);

  return {
    activateSharedTarget,
    activeSharedTarget,
    clearSharedTarget,
    markCanvasInteraction,
    markRatingInteraction,
    pulseSharedTarget,
  };
}
