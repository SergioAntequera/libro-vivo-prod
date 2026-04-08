"use client";

import { useEffect, useState } from "react";
import type { RoutePreview } from "@/lib/homeMapExperience";

export function useHomeMapRoutePreview({
  enabled,
  origin,
  destination,
}: {
  enabled: boolean;
  origin: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
}) {
  const [route, setRoute] = useState<RoutePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !origin || !destination) {
      setRoute(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const url = new URL("/api/map/route", window.location.origin);
    url.searchParams.set("originLat", String(origin.lat));
    url.searchParams.set("originLng", String(origin.lng));
    url.searchParams.set("destinationLat", String(destination.lat));
    url.searchParams.set("destinationLng", String(destination.lng));

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(url.toString(), {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          route?: RoutePreview;
          error?: string;
        };
        if (!response.ok || !payload.route) {
          setRoute(null);
          setError(payload.error ?? "No se pudo calcular el trayecto.");
          return;
        }
        setRoute(payload.route);
      } catch (errorValue) {
        if ((errorValue as { name?: string }).name === "AbortError") return;
        setRoute(null);
        setError("No se pudo calcular el trayecto.");
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [destination, enabled, origin]);

  return {
    route,
    loading,
    error,
  };
}
