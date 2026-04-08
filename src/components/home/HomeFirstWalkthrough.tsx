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

export default function HomeFirstWalkthrough(props: Props) {
  return (
    <SurfaceSpotlightWalkthrough
      {...props}
      targetAttribute="data-home-tour"
      dialogLabel="Primer paseo por home"
      testId="home-first-walkthrough"
      eyebrow="Primer paseo"
    />
  );
}
