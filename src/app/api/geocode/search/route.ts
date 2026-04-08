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

type NominatimSearchRow = {
  place_id?: number | string;
  display_name?: string;
  name?: string;
  lat?: string;
  lon?: string;
  importance?: number | string;
  address?: NominatimAddress;
};

type PhotonFeature = {
  geometry?: {
    coordinates?: [number, number];
  };
  properties?: {
    osm_id?: number | string;
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    state?: string;
    country?: string;
  };
};

type GeocodeSearchResult = {
  id: string;
  label: string;
  fullLabel: string;
  lat: number;
  lng: number;
  score: number;
};

type ParsedAddressHint = {
  street: string;
  city: string;
  postcode: string;
  country: string;
  looksAddressLike: boolean;
};

function compactSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeSearchText(value: string) {
  return compactSpaces(String(value ?? ""))
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function tokenizeQuery(value: string) {
  return normalizeSearchText(value)
    .split(/[\s,;/\-]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function joinParts(parts: Array<string | undefined>) {
  return parts.map((part) => compactSpaces(String(part ?? ""))).filter(Boolean);
}

function pickTown(addr: NominatimAddress | undefined) {
  if (!addr) return "";
  return (
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.county ||
    ""
  );
}

function buildNominatimLabels(row: NominatimSearchRow) {
  const fullLabel = compactSpaces(String(row.display_name ?? ""));
  const addr = row.address;
  const roadLine = joinParts([addr?.road, addr?.house_number]).join(" ");
  const town = pickTown(addr);
  const shortParts = joinParts([roadLine || row.name, town, addr?.country]);
  const shortLabel =
    shortParts.length > 0
      ? shortParts.slice(0, 3).join(", ")
      : fullLabel.split(",").slice(0, 3).join(", ");
  return {
    label: compactSpaces(shortLabel || fullLabel),
    fullLabel,
  };
}

function toResultKey(lat: number, lng: number, label: string) {
  return `${lat.toFixed(5)}|${lng.toFixed(5)}|${label.toLowerCase()}`;
}

function parseAddressHint(query: string): ParsedAddressHint {
  const compact = compactSpaces(query);
  const parts = compact
    .split(",")
    .map((part) => compactSpaces(part))
    .filter(Boolean);
  const streetKeywords =
    /\b(calle|c\/|avenida|avda|av\.|plaza|paseo|camino|ronda|travesia|travessera|carretera|via|gran via)\b/i;
  const hasHouseNumber = /\b\d+[a-zA-Z]?\b/.test(compact);
  const postcode = parts.find((part) => /\b\d{5}\b/.test(part)) ?? "";
  const country =
    parts.find((part) => /\b(espana|españa|spain|france|francia|portugal|italia|italy)\b/i.test(part)) ??
    "";

  let street = "";
  let city = "";

  if (parts.length >= 2) {
    street = parts[0] ?? "";
    city = parts.find((part, index) => index > 0 && part !== postcode && part !== country) ?? "";
  } else if (streetKeywords.test(compact) || hasHouseNumber) {
    street = compact;
  } else {
    city = compact;
  }

  return {
    street,
    city,
    postcode,
    country,
    looksAddressLike: Boolean(streetKeywords.test(compact) || hasHouseNumber || parts.length >= 2),
  };
}

function buildQueryVariants(query: string) {
  const out = new Set<string>([query]);
  const hint = parseAddressHint(query);
  const normalized = normalizeSearchText(query);
  const hasCountry = /\b(espana|españa|spain|france|francia|portugal|italia|italy)\b/.test(
    normalized,
  );

  if (hint.looksAddressLike && !hasCountry) {
    out.add(`${query}, España`);
  }

  if (hint.street && hint.city) {
    out.add(`${hint.street}, ${hint.city}`);
    if (!hasCountry) {
      out.add(`${hint.street}, ${hint.city}, España`);
    }
  }

  return Array.from(out).map(compactSpaces).filter(Boolean);
}

function rankResultForQuery(result: GeocodeSearchResult, query: string) {
  const tokens = tokenizeQuery(query);
  const clean = tokens.join(" ");
  const label = normalizeSearchText(result.label);
  const full = normalizeSearchText(result.fullLabel);
  const haystack = `${label} ${full}`.trim();
  const digitTokens = tokens.filter((token) => /\d/.test(token));

  let score = result.score;
  if (clean && label.startsWith(clean)) score += 4;
  if (clean && haystack.includes(clean)) score += 3;
  if (tokens.length && tokens.every((token) => haystack.includes(token))) score += 2.5;
  if (digitTokens.length && digitTokens.every((token) => haystack.includes(token))) score += 1.8;
  score += tokens.filter((token) => label.includes(token)).length * 0.35;
  score += tokens.filter((token) => full.includes(token)).length * 0.2;
  return score;
}

async function fetchNominatim(q: string) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "10");
  url.searchParams.set("accept-language", "es,en");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("dedupe", "1");
  url.searchParams.set("q", q);

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "libro-vivo/1.0 (memories geocode search)",
    },
    next: { revalidate: 30 },
  });
  if (!res.ok) return [];

  const raw = (await res.json()) as NominatimSearchRow[];
  const out: GeocodeSearchResult[] = [];
  for (const row of raw ?? []) {
    const lat = Number(row.lat);
    const lng = Number(row.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
    const labels = buildNominatimLabels(row);
    if (!labels.fullLabel) continue;
    const importance = Number(row.importance);
    out.push({
      id: String(row.place_id ?? `${lat},${lng}`),
      label: labels.label,
      fullLabel: labels.fullLabel,
      lat,
      lng,
      score: Number.isFinite(importance) ? importance : 0,
    });
  }
  return out;
}

async function fetchStructuredNominatim(query: string) {
  const hint = parseAddressHint(query);
  if (!hint.looksAddressLike || (!hint.street && !hint.city)) return [];

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "8");
  url.searchParams.set("accept-language", "es,en");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("dedupe", "1");
  if (hint.street) url.searchParams.set("street", hint.street);
  if (hint.city) url.searchParams.set("city", hint.city);
  if (hint.postcode) url.searchParams.set("postalcode", hint.postcode);
  if (hint.country) {
    url.searchParams.set("country", hint.country);
  } else {
    url.searchParams.set("countrycodes", "es");
  }

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "libro-vivo/1.0 (memories geocode structured search)",
    },
    next: { revalidate: 30 },
  });
  if (!res.ok) return [];

  const raw = (await res.json()) as NominatimSearchRow[];
  const out: GeocodeSearchResult[] = [];
  for (const row of raw ?? []) {
    const lat = Number(row.lat);
    const lng = Number(row.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
    const labels = buildNominatimLabels(row);
    if (!labels.fullLabel) continue;
    const importance = Number(row.importance);
    out.push({
      id: `structured-${String(row.place_id ?? `${lat},${lng}`)}`,
      label: labels.label,
      fullLabel: labels.fullLabel,
      lat,
      lng,
      score: (Number.isFinite(importance) ? importance : 0) + 0.75,
    });
  }
  return out;
}

async function fetchPhoton(q: string) {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", q);
  url.searchParams.set("lang", "es");
  url.searchParams.set("limit", "8");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "libro-vivo/1.0 (memories geocode search)",
    },
    next: { revalidate: 30 },
  });
  if (!res.ok) return [];

  const payload = (await res.json()) as { features?: PhotonFeature[] };
  const out: GeocodeSearchResult[] = [];
  for (const feature of payload.features ?? []) {
    const coords = feature.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;

    const p = feature.properties ?? {};
    const roadLine = joinParts([p.street, p.housenumber]).join(" ");
    const labelParts = joinParts([roadLine || p.name, p.city || p.state, p.country]);
    const fullParts = joinParts([
      roadLine || p.name,
      p.city,
      p.state,
      p.country,
    ]);
    const label = labelParts.slice(0, 3).join(", ");
    const fullLabel = fullParts.join(", ");
    if (!label && !fullLabel) continue;

    out.push({
      id: `photon-${String(p.osm_id ?? `${lat},${lng}`)}`,
      label: label || fullLabel,
      fullLabel: fullLabel || label,
      lat,
      lng,
      score: 0.2,
    });
  }
  return out;
}

export async function GET(req: NextRequest) {
  const q = compactSpaces(req.nextUrl.searchParams.get("q") ?? "");
  if (!q) return NextResponse.json({ results: [] });
  if (q.length < 2) return NextResponse.json({ results: [] });
  if (q.length > 120) {
    return NextResponse.json(
      { results: [], error: "Query demasiado larga." },
      { status: 400 },
    );
  }

  try {
    const queryVariants = buildQueryVariants(q);
    const nominatimResponses = await Promise.all(queryVariants.map((variant) => fetchNominatim(variant)));
    const structuredResponses = await Promise.all(
      queryVariants.map((variant) => fetchStructuredNominatim(variant)),
    );
    const nominatim = [...nominatimResponses.flat(), ...structuredResponses.flat()];
    const needsFallback = nominatim.length < 6;
    const photonResponses = needsFallback ? await Promise.all(queryVariants.map((variant) => fetchPhoton(variant))) : [];
    const photon = photonResponses.flat();

    const byKey = new Map<string, GeocodeSearchResult>();
    for (const row of [...nominatim, ...photon]) {
      const key = toResultKey(row.lat, row.lng, row.fullLabel || row.label);
      const existing = byKey.get(key);
      const next = {
        ...row,
        score: rankResultForQuery(row, q),
      };
      if (!existing || next.score > existing.score) {
        byKey.set(key, next);
      }
    }

    const merged = [...byKey.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(({ id, label, fullLabel, lat, lng }) => ({
        id,
        label,
        fullLabel,
        lat,
        lng,
      }));

    return NextResponse.json({ results: merged });
  } catch {
    return NextResponse.json(
      { results: [], error: "No se pudo buscar ubicaciones." },
      { status: 500 },
    );
  }
}
