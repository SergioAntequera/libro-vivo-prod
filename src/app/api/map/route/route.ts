import { NextRequest, NextResponse } from "next/server";

type OsrmRouteResponse = {
  code?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: {
      coordinates?: Array<[number, number]>;
    };
  }>;
};

function parseCoord(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function isValidLat(value: number) {
  return value >= -90 && value <= 90;
}

function isValidLng(value: number) {
  return value >= -180 && value <= 180;
}

function haversineMeters(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
) {
  const earthRadiusMeters = 6371000;
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(destination.lat - origin.lat);
  const dLng = toRad(destination.lng - origin.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(origin.lat)) *
      Math.cos(toRad(destination.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

function buildFallbackRoute(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) {
  const distanceMeters = haversineMeters(origin, destination);
  const durationSeconds = distanceMeters / 13.9;
  return {
    origin,
    destination,
    coordinates: [origin, destination],
    distanceMeters,
    durationSeconds,
    source: "fallback" as const,
  };
}

export async function GET(req: NextRequest) {
  const originLat = parseCoord(req.nextUrl.searchParams.get("originLat"));
  const originLng = parseCoord(req.nextUrl.searchParams.get("originLng"));
  const destinationLat = parseCoord(req.nextUrl.searchParams.get("destinationLat"));
  const destinationLng = parseCoord(req.nextUrl.searchParams.get("destinationLng"));

  if (
    originLat === null ||
    originLng === null ||
    destinationLat === null ||
    destinationLng === null ||
    !isValidLat(originLat) ||
    !isValidLng(originLng) ||
    !isValidLat(destinationLat) ||
    !isValidLng(destinationLng)
  ) {
    return NextResponse.json({ error: "Coordenadas invalidas." }, { status: 400 });
  }

  const origin = { lat: originLat, lng: originLng };
  const destination = { lat: destinationLat, lng: destinationLng };
  const fallback = buildFallbackRoute(origin, destination);

  try {
    const url = new URL(
      `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`,
    );
    url.searchParams.set("overview", "full");
    url.searchParams.set("geometries", "geojson");
    url.searchParams.set("steps", "false");

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "libro-vivo/1.0 (map route preview)",
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return NextResponse.json({ route: fallback });
    }

    const payload = (await response.json()) as OsrmRouteResponse;
    const route = payload.routes?.[0];
    const coordinates =
      route?.geometry?.coordinates
        ?.map((pair) => {
          const [lng, lat] = pair;
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
          return { lat, lng };
        })
        .filter(Boolean) ?? [];

    if (!coordinates.length) {
      return NextResponse.json({ route: fallback });
    }

    return NextResponse.json({
      route: {
        origin,
        destination,
        coordinates,
        distanceMeters: Number(route?.distance) || fallback.distanceMeters,
        durationSeconds: Number(route?.duration) || fallback.durationSeconds,
        source: "osrm" as const,
      },
    });
  } catch {
    return NextResponse.json({ route: fallback });
  }
}
