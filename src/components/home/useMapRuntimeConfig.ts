"use client";

import { useEffect, useState } from "react";
import {
  getFallbackMapRuntimeConfig,
  getMapRuntimeConfig,
  type MapRuntimeConfig,
} from "@/lib/mapCatalogConfig";

export function useMapRuntimeConfig() {
  const [config, setConfig] = useState<MapRuntimeConfig>(() => getFallbackMapRuntimeConfig());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await getMapRuntimeConfig();
        if (!cancelled) setConfig(next);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    config,
    loading,
    refresh: async () => {
      const next = await getMapRuntimeConfig();
      setConfig(next);
      return next;
    },
  };
}
