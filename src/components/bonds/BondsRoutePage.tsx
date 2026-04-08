"use client";

import { Suspense } from "react";
import { BondsSurface, type BondsView } from "@/components/bonds/BondsSurface";
import { useBondsPageController } from "@/components/bonds/useBondsPageController";
import { PageLoadingState } from "@/components/ui/PageLoadingState";

function BondsRoutePageContent({ view }: { view: BondsView }) {
  const controller = useBondsPageController();
  return <BondsSurface {...controller} view={view} />;
}

export function BondsRoutePage({ view }: { view: BondsView }) {
  return (
    <Suspense fallback={<PageLoadingState message="Cargando vinculos..." />}>
      <BondsRoutePageContent view={view} />
    </Suspense>
  );
}
