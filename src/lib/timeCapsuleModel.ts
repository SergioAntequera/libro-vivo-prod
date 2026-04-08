import type { CanvasObject } from "@/lib/canvasTypes";
import type { FlowerFamily } from "@/lib/productDomainContracts";

export type TimeCapsuleStatus = "sealed" | "ready" | "opened";

export type TimeCapsuleWindow = "1y" | "3y" | "5y" | "10y" | "custom";

export const TIME_CAPSULE_WINDOWS: readonly {
  code: TimeCapsuleWindow;
  label: string;
  years: number;
}[] = [
  { code: "1y", label: "1 a\u00f1o", years: 1 },
  { code: "3y", label: "3 a\u00f1os", years: 3 },
  { code: "5y", label: "5 a\u00f1os", years: 5 },
  { code: "10y", label: "10 a\u00f1os", years: 10 },
] as const;

export const TIME_CAPSULE_CONTENT_BLOCK_DEFINITIONS = [
  {
    kind: "letter",
    label: "Carta",
    description: "Una carta para vuestro yo futuro.",
    placeholder: "Querido futuro nuestro...",
  },
  {
    kind: "text",
    label: "Texto libre",
    description: "Una idea, un recuerdo o algo que no cabe en otra categoria.",
    placeholder: "Escribe aqui lo que no quieres perder...",
  },
  {
    kind: "promise",
    label: "Promesa",
    description: "Algo que quereis recordaros cuando esto se abra.",
    placeholder: "Prometemos que...",
  },
  {
    kind: "prediction",
    label: "Prediccion",
    description: "Una intuicion o apuesta sobre lo que vendra.",
    placeholder: "Dentro de unos años creemos que...",
  },
  {
    kind: "wish",
    label: "Deseo",
    description: "Un deseo que merezca esperar sellado.",
    placeholder: "Deseamos que...",
  },
  {
    kind: "question",
    label: "Pregunta",
    description: "Algo que os gustara responder cuando llegue el dia.",
    placeholder: "Nos preguntamos si...",
  },
  {
    kind: "photo_url",
    label: "Imagen",
    description: "Una foto o collage guardado como URL.",
    placeholder: "Pega aqui la URL de una imagen especial",
  },
  {
    kind: "audio_url",
    label: "Audio",
    description: "Una voz, una nota o un sonido que viaje en la capsula.",
    placeholder: "Sube un audio o pega aqui su URL",
  },
  {
    kind: "video_url",
    label: "Video",
    description: "Un video breve que merezca volver a mirar cuando se abra.",
    placeholder: "Sube un video o pega aqui su URL",
  },
  {
    kind: "canvas_note",
    label: "Canvas",
    description: "Una escena simbolica creada con el canvas del jardin.",
    placeholder: "Cuenta que representa esta escena...",
  },
  {
    kind: "flower",
    label: "Flor simbolica",
    description: "Una flor o simbolo que represente este año.",
    placeholder: "Que flor o simbolo guardais aqui y por que...",
  },
  {
    kind: "keepsake",
    label: "Objeto",
    description: "Una entrada, una flor seca, una nota o algo fisico pequeno.",
    placeholder: "Que objeto real companionaria esta capsula...",
  },
] as const;

export type TimeCapsuleContentBlockKind =
  (typeof TIME_CAPSULE_CONTENT_BLOCK_DEFINITIONS)[number]["kind"];

export type TimeCapsuleContentBlock = {
  kind: TimeCapsuleContentBlockKind;
  value: string;
  caption?: string;
  mediaUrl?: string;
  canvasObjects?: CanvasObject[];
};

export type TimeCapsuleDraftBlock = {
  id: string;
  kind: TimeCapsuleContentBlockKind;
  value: string;
  caption: string;
  mediaUrl: string | null;
  canvasObjects: CanvasObject[];
};

export type TimeCapsuleDraftPersistedSnapshot = {
  title: string;
  windowCode: TimeCapsuleWindow;
  blocks: TimeCapsuleDraftBlock[];
};

export type TimeCapsuleDraftRevisionChangeField =
  | "value"
  | "caption"
  | "media"
  | "canvas"
  | "kind"
  | "order";

export type TimeCapsuleDraftRevisionItem = {
  id: string;
  kind: TimeCapsuleContentBlockKind;
  label: string;
  fields: TimeCapsuleDraftRevisionChangeField[];
};

export type TimeCapsuleDraftRevisionSummary = {
  titleChanged: boolean;
  windowChanged: boolean;
  added: TimeCapsuleDraftRevisionItem[];
  removed: TimeCapsuleDraftRevisionItem[];
  changed: TimeCapsuleDraftRevisionItem[];
};

export type TimeCapsuleDraftRow = {
  id: string;
  garden_id: string;
  capsule_year: number;
  title: string;
  window_code: TimeCapsuleWindow;
  content_blocks: TimeCapsuleDraftBlock[];
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TimeCapsuleDraftRevisionRow = {
  id: string;
  draft_id: string;
  garden_id: string;
  capsule_year: number;
  snapshot: TimeCapsuleDraftPersistedSnapshot;
  summary: TimeCapsuleDraftRevisionSummary;
  actor_user_id: string | null;
  actor_name: string | null;
  created_at: string;
};

export type TimeCapsuleRow = {
  id: string;
  garden_id: string;
  title: string;
  sealed_at: string;
  opens_at: string;
  opened_at: string | null;
  status: TimeCapsuleStatus;
  window_code: TimeCapsuleWindow;
  content_blocks: TimeCapsuleContentBlock[];
  sealed_by: string;
  flower_family: FlowerFamily | null;
  location_lat: number | null;
  location_lng: number | null;
  location_label: string | null;
  created_at: string;
};

export function capsuleStatusLabel(status: TimeCapsuleStatus): string {
  if (status === "sealed") return "Sellada";
  if (status === "ready") return "Lista para abrir";
  if (status === "opened") return "Abierta";
  return status;
}

export function capsuleWindowLabel(code: TimeCapsuleWindow): string {
  const entry = TIME_CAPSULE_WINDOWS.find((window) => window.code === code);
  return entry?.label ?? code;
}

export function getTimeCapsuleContentBlockDefinition(kind: TimeCapsuleContentBlockKind) {
  return (
    TIME_CAPSULE_CONTENT_BLOCK_DEFINITIONS.find((item) => item.kind === kind) ??
    TIME_CAPSULE_CONTENT_BLOCK_DEFINITIONS[0]
  );
}

export function isTimeCapsuleMediaBlockKind(kind: TimeCapsuleContentBlockKind) {
  return kind === "photo_url" || kind === "audio_url" || kind === "video_url";
}

export function getTimeCapsuleContentBlockMediaUrl(block: TimeCapsuleContentBlock) {
  if (!isTimeCapsuleMediaBlockKind(block.kind)) return null;
  const mediaUrl = String(block.mediaUrl ?? "").trim();
  if (mediaUrl) return mediaUrl;
  const legacyValue = String(block.value ?? "").trim();
  return legacyValue || null;
}

export function normalizeTimeCapsuleContentBlock(
  raw: Partial<TimeCapsuleContentBlock> & Record<string, unknown>,
): TimeCapsuleContentBlock {
  const rawKind = typeof raw.kind === "string" ? raw.kind : "text";
  const kind = TIME_CAPSULE_CONTENT_BLOCK_DEFINITIONS.some((item) => item.kind === rawKind)
    ? (rawKind as TimeCapsuleContentBlockKind)
    : "text";
  const rawCaption =
    typeof raw.caption === "string"
      ? raw.caption
      : typeof raw.caption_text === "string"
        ? raw.caption_text
        : "";
  const rawMediaUrl =
    typeof raw.mediaUrl === "string"
      ? raw.mediaUrl
      : typeof raw.media_url === "string"
        ? raw.media_url
        : "";
  const rawCanvasObjects =
    Array.isArray(raw.canvasObjects)
      ? raw.canvasObjects
      : Array.isArray(raw.canvas_objects)
        ? raw.canvas_objects
        : [];

  return {
    kind,
    value: typeof raw.value === "string" ? raw.value : "",
    ...(rawCaption.trim() ? { caption: rawCaption.trim() } : {}),
    ...(rawMediaUrl.trim() ? { mediaUrl: rawMediaUrl.trim() } : {}),
    ...(rawCanvasObjects.length ? { canvasObjects: rawCanvasObjects as CanvasObject[] } : {}),
  };
}

export function normalizeTimeCapsuleContentBlocks(raw: unknown): TimeCapsuleContentBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === "object")
    .map((item) =>
      normalizeTimeCapsuleContentBlock(item as Partial<TimeCapsuleContentBlock> & Record<string, unknown>),
    );
}

export function normalizeTimeCapsuleDraftBlock(
  raw: Partial<TimeCapsuleDraftBlock> & Record<string, unknown>,
): TimeCapsuleDraftBlock {
  const rawKind = typeof raw.kind === "string" ? raw.kind : "text";
  const kind = TIME_CAPSULE_CONTENT_BLOCK_DEFINITIONS.some((item) => item.kind === rawKind)
    ? (rawKind as TimeCapsuleContentBlockKind)
    : "text";
  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : crypto.randomUUID();
  const rawCanvasObjects =
    Array.isArray(raw.canvasObjects)
      ? raw.canvasObjects
      : Array.isArray(raw.canvas_objects)
        ? raw.canvas_objects
        : [];
  const rawMediaUrl =
    typeof raw.mediaUrl === "string"
      ? raw.mediaUrl
      : typeof raw.media_url === "string"
        ? raw.media_url
        : "";
  return {
    id,
    kind,
    value: typeof raw.value === "string" ? raw.value : "",
    caption: typeof raw.caption === "string" ? raw.caption : "",
    mediaUrl: rawMediaUrl.trim() || null,
    canvasObjects: rawCanvasObjects as CanvasObject[],
  };
}

export function normalizeTimeCapsuleDraftBlocks(raw: unknown): TimeCapsuleDraftBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === "object")
    .map((item) =>
      normalizeTimeCapsuleDraftBlock(
        item as Partial<TimeCapsuleDraftBlock> & Record<string, unknown>,
      ),
    );
}

export function normalizeTimeCapsuleDraftPersistedSnapshot(
  raw: Partial<TimeCapsuleDraftPersistedSnapshot> & Record<string, unknown>,
): TimeCapsuleDraftPersistedSnapshot {
  const windowCode =
    typeof raw.windowCode === "string"
      ? raw.windowCode
      : typeof raw.window_code === "string"
        ? raw.window_code
        : "1y";
  return {
    title: typeof raw.title === "string" ? raw.title : "",
    windowCode:
      TIME_CAPSULE_WINDOWS.some((window) => window.code === windowCode)
        ? (windowCode as TimeCapsuleWindow)
        : "1y",
    blocks: normalizeTimeCapsuleDraftBlocks(raw.blocks ?? raw.content_blocks),
  };
}

export function normalizeTimeCapsuleDraftRevisionItem(
  raw: Partial<TimeCapsuleDraftRevisionItem> & Record<string, unknown>,
): TimeCapsuleDraftRevisionItem {
  const rawKind = typeof raw.kind === "string" ? raw.kind : "text";
  const kind = TIME_CAPSULE_CONTENT_BLOCK_DEFINITIONS.some((item) => item.kind === rawKind)
    ? (rawKind as TimeCapsuleContentBlockKind)
    : "text";
  const rawFields = Array.isArray(raw.fields) ? raw.fields : [];
  const fields = rawFields
    .filter((field) =>
      typeof field === "string" &&
      ["value", "caption", "media", "canvas", "kind", "order"].includes(field),
    )
    .map((field) => field as TimeCapsuleDraftRevisionChangeField);
  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : crypto.randomUUID(),
    kind,
    label:
      typeof raw.label === "string" && raw.label.trim()
        ? raw.label.trim()
        : getTimeCapsuleContentBlockDefinition(kind).label,
    fields,
  };
}

export function normalizeTimeCapsuleDraftRevisionSummary(
  raw: Partial<TimeCapsuleDraftRevisionSummary> & Record<string, unknown>,
): TimeCapsuleDraftRevisionSummary {
  const normalizeItems = (value: unknown) =>
    Array.isArray(value)
      ? value
          .filter((item) => item && typeof item === "object")
          .map((item) =>
            normalizeTimeCapsuleDraftRevisionItem(
              item as Partial<TimeCapsuleDraftRevisionItem> & Record<string, unknown>,
            ),
          )
      : [];

  return {
    titleChanged: Boolean(raw.titleChanged ?? raw.title_changed),
    windowChanged: Boolean(raw.windowChanged ?? raw.window_changed),
    added: normalizeItems(raw.added),
    removed: normalizeItems(raw.removed),
    changed: normalizeItems(raw.changed),
  };
}

export function isCapsuleReady(capsule: Pick<TimeCapsuleRow, "opens_at" | "status">): boolean {
  if (capsule.status === "opened") return false;
  return new Date(capsule.opens_at) <= new Date();
}

export function computeOpensAtDate(sealedAt: string, window: TimeCapsuleWindow): string {
  const date = new Date(sealedAt);
  const entry = TIME_CAPSULE_WINDOWS.find((item) => item.code === window);
  date.setFullYear(date.getFullYear() + (entry?.years ?? 1));
  return date.toISOString().slice(0, 10);
}

export function normalizeCapsuleRow(
  raw: Partial<TimeCapsuleRow> & Record<string, unknown>,
  fallbackId: string,
): TimeCapsuleRow {
  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id : fallbackId,
    garden_id: typeof raw.garden_id === "string" ? raw.garden_id : "",
    title: typeof raw.title === "string" ? raw.title : "Capsula sin titulo",
    sealed_at: typeof raw.sealed_at === "string" ? raw.sealed_at : new Date().toISOString(),
    opens_at: typeof raw.opens_at === "string" ? raw.opens_at : new Date().toISOString(),
    opened_at: typeof raw.opened_at === "string" ? raw.opened_at : null,
    status:
      raw.status === "sealed" || raw.status === "ready" || raw.status === "opened"
        ? raw.status
        : "sealed",
    window_code:
      typeof raw.window_code === "string" &&
      TIME_CAPSULE_WINDOWS.some((window) => window.code === raw.window_code)
        ? (raw.window_code as TimeCapsuleWindow)
        : "1y",
    content_blocks: normalizeTimeCapsuleContentBlocks(raw.content_blocks),
    sealed_by: typeof raw.sealed_by === "string" ? raw.sealed_by : "",
    flower_family:
      typeof raw.flower_family === "string" ? (raw.flower_family as FlowerFamily) : null,
    location_lat:
      typeof raw.location_lat === "number" && Number.isFinite(raw.location_lat)
        ? raw.location_lat
        : null,
    location_lng:
      typeof raw.location_lng === "number" && Number.isFinite(raw.location_lng)
        ? raw.location_lng
        : null,
    location_label: typeof raw.location_label === "string" ? raw.location_label : null,
    created_at: typeof raw.created_at === "string" ? raw.created_at : new Date().toISOString(),
  };
}

export function normalizeTimeCapsuleDraftRow(
  raw: Partial<TimeCapsuleDraftRow> & Record<string, unknown>,
  fallbackId: string,
): TimeCapsuleDraftRow {
  const capsuleYear = Number(raw.capsule_year);
  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id : fallbackId,
    garden_id: typeof raw.garden_id === "string" ? raw.garden_id : "",
    capsule_year:
      Number.isFinite(capsuleYear) && capsuleYear >= 2000
        ? Math.round(capsuleYear)
        : new Date().getUTCFullYear(),
    title: typeof raw.title === "string" ? raw.title : "",
    window_code:
      typeof raw.window_code === "string" &&
      TIME_CAPSULE_WINDOWS.some((window) => window.code === raw.window_code)
        ? (raw.window_code as TimeCapsuleWindow)
        : "1y",
    content_blocks: normalizeTimeCapsuleDraftBlocks(raw.content_blocks),
    created_by: typeof raw.created_by === "string" ? raw.created_by : null,
    updated_by: typeof raw.updated_by === "string" ? raw.updated_by : null,
    created_at: typeof raw.created_at === "string" ? raw.created_at : new Date().toISOString(),
    updated_at: typeof raw.updated_at === "string" ? raw.updated_at : new Date().toISOString(),
  };
}

export function normalizeTimeCapsuleDraftRevisionRow(
  raw: Partial<TimeCapsuleDraftRevisionRow> & Record<string, unknown>,
  fallbackId: string,
): TimeCapsuleDraftRevisionRow {
  const capsuleYear = Number(raw.capsule_year);
  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id : fallbackId,
    draft_id: typeof raw.draft_id === "string" ? raw.draft_id : "",
    garden_id: typeof raw.garden_id === "string" ? raw.garden_id : "",
    capsule_year:
      Number.isFinite(capsuleYear) && capsuleYear >= 2000
        ? Math.round(capsuleYear)
        : new Date().getUTCFullYear(),
    snapshot: normalizeTimeCapsuleDraftPersistedSnapshot(
      ((raw.snapshot ?? raw.draft_snapshot) as
        | Partial<TimeCapsuleDraftPersistedSnapshot>
        | Record<string, unknown>
        | undefined) ?? {},
    ),
    summary: normalizeTimeCapsuleDraftRevisionSummary(
      ((raw.summary ?? raw.change_summary) as
        | Partial<TimeCapsuleDraftRevisionSummary>
        | Record<string, unknown>
        | undefined) ?? {},
    ),
    actor_user_id: typeof raw.actor_user_id === "string" ? raw.actor_user_id : null,
    actor_name: typeof raw.actor_name === "string" ? raw.actor_name : null,
    created_at: typeof raw.created_at === "string" ? raw.created_at : new Date().toISOString(),
  };
}
