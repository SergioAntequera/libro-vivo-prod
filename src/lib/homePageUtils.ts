import type { CatalogItemConfig } from "@/lib/appConfig";
export { toErrorMessage } from "@/lib/errorMessage";

export type HomeSeasonTone = "spring" | "summer" | "autumn" | "winter";
export type HomeEventKind = "seed" | "sprout" | "flower" | "tree";

type HomeTrailPointLike = {
  x: number;
  y: number;
  normalX?: number;
  normalY?: number;
};

type HomeSceneTokenLike = {
  landscapeAsset: string;
  seedAsset: string;
  cloudLeftAsset: string;
  cloudRightAsset: string;
  decoFlowerLeftAsset: string;
  decoFlowerCenterAsset: string;
  decoFlowerRightAsset: string;
};

export function toIsoLocal(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayIsoLocal() {
  return toIsoLocal(new Date());
}

export function parseIsoLocal(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addIsoDays(iso: string, deltaDays: number) {
  const d = parseIsoLocal(iso);
  d.setDate(d.getDate() + deltaDays);
  return toIsoLocal(d);
}

export function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function buildDateRange(startIso: string, endIso: string) {
  const out: string[] = [];
  let cursor = startIso;
  let guard = 0;
  while (cursor <= endIso && guard < 2000) {
    out.push(cursor);
    cursor = addIsoDays(cursor, 1);
    guard += 1;
  }
  return out;
}

export function clampIsoToRange(iso: string, startIso: string, endIso: string) {
  if (iso < startIso) return startIso;
  if (iso > endIso) return endIso;
  return iso;
}

export function formatFocusDate(iso: string) {
  return parseIsoLocal(iso).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function seasonFromIso(iso: string): HomeSeasonTone {
  const month = Number(iso.slice(5, 7));
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

export function getCatalogAssetPath(item: CatalogItemConfig, fallback: string) {
  const meta = item.metadata ?? {};
  const raw =
    typeof meta.asset_path === "string"
      ? meta.asset_path
      : typeof meta.icon_src === "string"
        ? meta.icon_src
        : item.icon;
  if (typeof raw === "string" && raw.startsWith("/")) return raw;
  return fallback;
}

export function getCatalogTokenValue(item: CatalogItemConfig, fallback: string) {
  const meta = item.metadata ?? {};
  const raw =
    typeof meta.value === "string"
      ? meta.value
      : typeof meta.hex === "string"
        ? meta.hex
        : item.color ?? item.icon;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return fallback;
}

export function sortEventsForDisplay<T extends { kind: HomeEventKind; title: string }>(events: T[]) {
  const rank: Record<HomeEventKind, number> = {
    flower: 0,
    sprout: 1,
    seed: 2,
    tree: 3,
  };
  return [...events].sort((a, b) => {
    if (rank[a.kind] !== rank[b.kind]) return rank[a.kind] - rank[b.kind];
    return a.title.localeCompare(b.title, "es");
  });
}

export function trailEventAnchor(
  point: HomeTrailPointLike,
  kind: HomeEventKind,
  lateralOffset = 0,
) {
  const baseYOffset = kind === "seed" ? 1 : 0;
  const normalX = Number.isFinite(point.normalX) ? Number(point.normalX) : 0;
  const normalY = Number.isFinite(point.normalY) ? Number(point.normalY) : 0;
  return {
    x: point.x + normalX * lateralOffset,
    y: point.y + normalY * lateralOffset + baseYOffset,
  };
}

export function trailMarkerIconSize(
  event: Pick<{ kind: HomeEventKind; rating?: number | null; isFavorite?: boolean }, "kind" | "rating" | "isFavorite">,
  isSparseCanvas: boolean,
) {
  const kind = event.kind;
  let base = kind === "tree" ? 28 : kind === "flower" ? 27 : kind === "sprout" ? 20 : 17;

  if (kind === "flower") {
    const safeRating = Math.max(
      1,
      Math.min(5, Number.isFinite(event.rating) ? Number(event.rating) : 3),
    );
    base += (safeRating - 1) * 2.3;
    if (event.isFavorite) base += 4;
  }

  return Math.round(isSparseCanvas ? base + 1 : base);
}

export function trailMarkerFrameSize(
  event: Pick<{ kind: HomeEventKind; isFavorite?: boolean }, "kind" | "isFavorite">,
  iconSize: number,
) {
  if (event.kind === "tree") return { width: 46, height: 46 };
  const padding = event.kind === "flower" ? (event.isFavorite ? 17 : 14) : 12;
  const frameSize = Math.max(iconSize + padding, event.kind === "seed" ? 30 : 34);
  return { width: frameSize, height: frameSize };
}

export function buildIsoForYearAnchor(targetYear: number, sourceIso: string) {
  const [, sourceMonthStr, sourceDayStr] = sourceIso.split("-");
  const month = Number(sourceMonthStr ?? "1");
  const day = Number(sourceDayStr ?? "1");
  const lastDay = new Date(targetYear, month, 0).getDate();
  const safeDay = Math.max(1, Math.min(day, lastDay));
  return `${targetYear}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}

export function eventKindLabel(kind: HomeEventKind) {
  if (kind === "seed") return "Semilla";
  if (kind === "sprout") return "Brote";
  if (kind === "flower") return "Flor";
  return "Hito";
}

export function eventKindDetail(kind: HomeEventKind) {
  if (kind === "seed") return "Plan sembrado";
  if (kind === "sprout") return "Plan con fecha";
  if (kind === "flower") return "Página iniciada";
  return "Logro del camino";
}

export function starsLabel(rating: number | null) {
  const safe = Number.isFinite(rating) ? Math.max(0, Math.min(5, Number(rating))) : 0;
  if (safe <= 0) return "Sin estrellas";
  return "*".repeat(safe);
}

export function extractPageSnippet(canvasObjects: unknown) {
  if (!Array.isArray(canvasObjects)) return null;
  for (const raw of canvasObjects) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    if (row.type === "text") {
      const text = typeof row.text === "string" ? row.text.trim() : "";
      if (text) return text;
    }
    if (row.type === "photo") {
      const caption = typeof row.caption === "string" ? row.caption.trim() : "";
      if (caption) return caption;
    }
  }
  return null;
}

export function hasPhotoInCanvas(canvasObjects: unknown) {
  if (!Array.isArray(canvasObjects)) return false;
  return canvasObjects.some((raw) => {
    if (!raw || typeof raw !== "object") return false;
    const row = raw as Record<string, unknown>;
    if (row.type !== "photo") return false;
    return typeof row.src === "string" && row.src.trim().length > 0;
  });
}

export function isMissingLocationColumnsError(message: string) {
  const text = String(message ?? "").toLowerCase();
  return (
    text.includes("location_lat") ||
    text.includes("location_lng") ||
    text.includes("location_label") ||
    text.includes("schema cache")
  );
}

export function inferLandscapeAssetFromScene(scene: HomeSceneTokenLike) {
  const values = [
    scene.landscapeAsset,
    scene.seedAsset,
    scene.cloudLeftAsset,
    scene.cloudRightAsset,
    scene.decoFlowerLeftAsset,
    scene.decoFlowerCenterAsset,
    scene.decoFlowerRightAsset,
  ].join(" ");
  if (values.includes("/illustrations/packs/candy-garden/")) {
    return "/illustrations/packs/candy-garden/landscape.svg";
  }
  if (values.includes("/illustrations/packs/sunny-kids/")) {
    return "/illustrations/packs/sunny-kids/landscape.svg";
  }
  return "";
}

// toErrorMessage is now re-exported from @/lib/errorMessage (see top of file).
