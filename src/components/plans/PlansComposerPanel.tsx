"use client";

import { useEffect, useMemo, useState } from "react";
import { SeedComposerSurface } from "@/components/plans/SeedComposerSurface";
import {
  getFallbackSeedComposerLayoutConfig,
  getSeedComposerLayoutConfig,
  normalizeSeedComposerLayoutConfig,
  type SeedComposerLayoutConfig,
} from "@/lib/seedComposerLayoutConfig";
import type {
  SeedPlaceOption,
  SeedPlanTypeOption,
} from "@/lib/plansTypes";

type PlansComposerPanelProps = {
  title: string;
  notes: string;
  scheduledDate: string;
  selectedPlanTypeId: string;
  selectedPlaceId: string;
  selectedPlaceLabel: string | null;
  planTypeOptions: SeedPlanTypeOption[];
  placeOptions: SeedPlaceOption[];
  creating: boolean;
  onTitleChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onScheduledDateChange: (value: string) => void;
  onSelectedPlanTypeIdChange: (value: string) => void;
  onClearSelectedPlace: () => void;
  onOpenMap: () => void;
  onCreateSeed: () => void;
};

export default function PlansComposerPanel(props: PlansComposerPanelProps) {
  const [layoutConfig, setLayoutConfig] = useState<SeedComposerLayoutConfig>(
    getFallbackSeedComposerLayoutConfig(),
  );

  useEffect(() => {
    let cancelled = false;
    getSeedComposerLayoutConfig()
      .then((nextConfig) => {
        if (cancelled) return;
        setLayoutConfig(normalizeSeedComposerLayoutConfig(nextConfig));
      })
      .catch(() => {
        if (cancelled) return;
        setLayoutConfig(getFallbackSeedComposerLayoutConfig());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedConfig = useMemo(
    () => normalizeSeedComposerLayoutConfig(layoutConfig),
    [layoutConfig],
  );

  return (
    <SeedComposerSurface
      {...props}
      layoutConfig={normalizedConfig}
    />
  );
}
