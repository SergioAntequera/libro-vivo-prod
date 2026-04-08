import { useCallback, useMemo, useState } from "react";
import { annualTreeMilestoneStorageKey } from "@/lib/annualTreeNarrative";

type Input = {
  profileId: string | null | undefined;
  gardenId: string | null | undefined;
  year: number;
  milestoneStage: number | null;
};

function shouldShowMilestoneOverlay(storageKey: string | null) {
  if (!storageKey || typeof window === "undefined") return false;

  try {
    return !window.localStorage.getItem(storageKey);
  } catch {
    return true;
  }
}

export function useAnnualTreeMilestoneOverlay(input: Input) {
  const storageKey = useMemo(() => {
    if (typeof input.milestoneStage !== "number") return null;
    return annualTreeMilestoneStorageKey({
      profileId: input.profileId,
      gardenId: input.gardenId,
      year: input.year,
      milestoneStage: input.milestoneStage,
    });
  }, [input.gardenId, input.milestoneStage, input.profileId, input.year]);

  const [dismissedStorageKey, setDismissedStorageKey] = useState<string | null>(null);
  const visible = useMemo(() => {
    if (!storageKey) return false;
    if (dismissedStorageKey === storageKey) return false;
    return shouldShowMilestoneOverlay(storageKey);
  }, [dismissedStorageKey, storageKey]);

  const dismiss = useCallback(() => {
    if (storageKey && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(storageKey, new Date().toISOString());
      } catch {
        // ignore storage failures; the overlay is UX-only
      }
    }
    setDismissedStorageKey(storageKey);
  }, [storageKey]);

  return {
    showMilestoneOverlay: visible,
    dismissMilestoneOverlay: dismiss,
  };
}
