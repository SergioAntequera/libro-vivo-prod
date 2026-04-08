"use client";

import {
  SurfaceSpotlightWalkthrough,
  type SurfaceSpotlightWalkthroughStep,
} from "@/components/ui/SurfaceSpotlightWalkthrough";

type Props = {
  open: boolean;
  steps: SurfaceSpotlightWalkthroughStep[];
  onDismiss: () => void;
  onComplete: () => void;
};

export default function PlansFirstWalkthrough(props: Props) {
  return (
    <SurfaceSpotlightWalkthrough
      {...props}
      targetAttribute="data-plans-tour"
      dialogLabel="Primer paseo por planes"
      testId="plans-first-walkthrough"
      eyebrow="Planes"
    />
  );
}
