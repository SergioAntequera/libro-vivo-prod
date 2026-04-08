"use client";

import { useMemo } from "react";
import { withGardenScope } from "@/lib/gardens";
import { useGardenContext } from "./GardenContext";

/** Returns a function that applies garden scope to a Supabase query builder */
export function useGardenScoped() {
  const { activeGardenId } = useGardenContext();
  return useMemo(
    () =>
      <T,>(query: T) =>
        withGardenScope(query, activeGardenId),
    [activeGardenId],
  );
}
