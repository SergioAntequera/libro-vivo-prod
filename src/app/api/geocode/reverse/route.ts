import { NextRequest, NextResponse } from "next/server";

type NominatimAddress = {
  road?: string;
  house_number?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  country?: string;
  postcode?: string;
};

type NominatimReverseRow = {
  display_name?: string;
  name?: string;
  lat?: string;
  lon?: string;
  address?: NominatimAddress;
};

function compactSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function joinParts(parts: Array<string | undefined>) {
  return parts.map((part) => compactSpaces(String(part ?? ""))).filter(Boolean);
}

function pickTown(addr: NominatimAddress | undefined) {
  if (!addr) return "";
  return addr.city || addr.town || addr.village || addr.municipality || addr.county || "";
}

function buildLabels(row: NominatimReverseRow) {
  const fullLabel = compactSpaces(String(row.display_name ?? ""));
  const addr = row.address;
  const roadLine = joinParts([addr?.road, addr?.house_number]).join(" ");
  const town = pickTown(addr);
  const shortParts = joinParts([roadLine || row.name, town, addr?.country]);
  const label =
    shortParts.length > 0
      ? shortParts.slice(0, 3).join(", ")
      : fullLabel.split(",").slice(0, 3).join(", ");

  return {
    label: compactSpaces(label || "Lugar marcado en el mapa"),
    fullLabel: compactSpaces(fullLabel || label || "Lugar marcado en el mapa"),
  };
}

async function fetchNominatimReverse(lat: number, lng: number) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("accept-language", "es,en");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "18");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "libro-vivo/1.0 (memories reverse geocode)",
    },
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    throw new Error("No se pudo resolver el lugar.");
  }

  const raw = (await res.json()) as NominatimReverseRow;
  return buildLabels(raw);
}

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Coordenadas invalidas." }, { status: 400 });
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "Coordenadas fuera de rango." }, { status: 400 });
  }

  try {
    const result = await fetchNominatimReverse(lat, lng);
    return NextResponse.json({ result });
  } catch {
    return NextResponse.json({
      result: {
        label: "Lugar marcado en el mapa",
        fullLabel: "Lugar marcado en el mapa",
      },
    });
  }
}
