import type { CatalogItemConfig } from "@/lib/appConfig";
import type { CanvasObject } from "@/lib/canvasTypes";
import type { CareMood } from "@/lib/careTypes";
import { getDefaultMoodThresholds, type MoodThreshold } from "@/lib/careLogic";
import type { UploadQueueSnapshotItem } from "@/lib/persistentUploadQueue";

export type PageAudioQueueItem = {
  id: string;
  file: File;
};

export type PageAudioQueueMeta = Record<string, never>;

type ErrorLike = {
  name?: unknown;
  message?: unknown;
};

type SelectErrorLike = {
  message?: unknown;
};

type PageSelectResponse = {
  data: unknown;
  error: SelectErrorLike | null;
};

export type SelectPageByColumns = (columns: string) => Promise<PageSelectResponse>;

export type PageRecordLoadResult = {
  row: Record<string, unknown> | null;
  locationReady: boolean;
  audioReady: boolean;
  errorMessage: string | null;
};

export function isCareMood(value: unknown): value is CareMood {
  return value === "wilted" || value === "healthy" || value === "shiny";
}

export function asObjectRecord(value: unknown) {
  if (typeof value !== "object" || value === null) return null;
  return value as Record<string, unknown>;
}

export function getErrorName(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    typeof (error as ErrorLike).name === "string"
  ) {
    const name = String((error as ErrorLike).name ?? "").trim();
    if (name) return name;
  }
  return "";
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    typeof (error as ErrorLike).message === "string"
  ) {
    const message = String((error as ErrorLike).message ?? "").trim();
    if (message) return message;
  }
  if (typeof error === "string" && error.trim()) return error.trim();
  return fallback;
}

export function isAbortError(error: unknown) {
  return getErrorName(error) === "AbortError";
}

export function toMoodThresholds(rows: CatalogItemConfig[]) {
  const parsed: MoodThreshold[] = [];
  for (const row of rows) {
    if (!isCareMood(row.code)) continue;
    const min = Number(row.metadata?.min_score);
    const max = Number(row.metadata?.max_score);
    const anchor = Number(row.metadata?.anchor_score);
    if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(anchor)) {
      continue;
    }
    parsed.push({
      mood: row.code,
      minScore: min,
      maxScore: max,
      anchorScore: anchor,
      sortOrder: row.sortOrder,
    });
  }
  return parsed.length ? parsed : getDefaultMoodThresholds();
}

export function isMissingCareColumnsError(message: string) {
  const text = message.toLowerCase();
  return (
    text.includes("care_score") ||
    text.includes("care_needs") ||
    text.includes("schema cache")
  );
}

export function isMissingLocationColumnsError(message: string) {
  const text = message.toLowerCase();
  return (
    text.includes("location_lat") ||
    text.includes("location_lng") ||
    text.includes("location_label") ||
    text.includes("schema cache")
  );
}

export function isMissingAudioColumnsError(message: string) {
  const text = message.toLowerCase();
  return (
    text.includes("audio_url") ||
    text.includes("audio_label") ||
    text.includes("schema cache")
  );
}

export function isMissingPlanSummaryError(message: string) {
  const text = message.toLowerCase();
  return text.includes("plan_summary") || text.includes("schema cache");
}

function buildPageSelectColumns(input: {
  includeCare: boolean;
  includeLocation: boolean;
  includeAudio: boolean;
  includePlanSummary: boolean;
}) {
  const columns = [
    "id",
    "garden_id",
    "title",
    ...(input.includePlanSummary ? ["plan_summary"] : []),
    "date",
    "element",
    "plan_type_id",
    "rating",
    "mood_state",
    ...(input.includeCare ? ["care_score", "care_needs"] : []),
    "care_log",
    "canvas_objects",
    "created_by",
    "planned_from_seed_id",
    ...(input.includeLocation ? ["location_lat", "location_lng", "location_label"] : []),
    ...(input.includeAudio ? ["audio_url", "audio_label"] : []),
    "cover_photo_url",
    "thumbnail_url",
    "is_favorite",
  ];

  return columns.join(",");
}

export async function loadPageRecordWithFallback(
  selectPage: SelectPageByColumns,
): Promise<PageRecordLoadResult> {
  let includeCare = true;
  let locationReady = true;
  let audioReady = true;
  let includeLocation = true;
  let includeAudio = true;
  let includePlanSummary = true;
  const attemptedSignatures = new Set<string>();

  while (true) {
    const signature = JSON.stringify({
      includeCare,
      includeLocation,
      includeAudio,
      includePlanSummary,
    });

    if (attemptedSignatures.has(signature)) {
      return {
        row: null,
        locationReady,
        audioReady,
        errorMessage: "No se pudo cargar la página.",
      };
    }
    attemptedSignatures.add(signature);

    const response = await selectPage(
      buildPageSelectColumns({
        includeCare,
        includeLocation,
        includeAudio,
        includePlanSummary,
      }),
    );
    const row = asObjectRecord(response.data);

    if (!response.error) {
      return {
        row,
        locationReady,
        audioReady,
        errorMessage: row ? null : "No se pudo cargar la página.",
      };
    }

    const message = getErrorMessage(response.error, "");
    let relaxedSchema = false;

    if (includePlanSummary && isMissingPlanSummaryError(message)) {
      includePlanSummary = false;
      relaxedSchema = true;
    }
    if (includeAudio && isMissingAudioColumnsError(message)) {
      includeAudio = false;
      audioReady = false;
      relaxedSchema = true;
    }
    if (includeLocation && isMissingLocationColumnsError(message)) {
      includeLocation = false;
      locationReady = false;
      relaxedSchema = true;
    }
    if (includeCare && isMissingCareColumnsError(message)) {
      includeCare = false;
      relaxedSchema = true;
    }

    if (!relaxedSchema) {
      return {
        row: null,
        locationReady,
        audioReady,
        errorMessage: getErrorMessage(response.error, "No se pudo cargar la página."),
      };
    }
  }
}

export function pickRecordingMimeType() {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) {
    return "";
  }
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mpeg",
  ];
  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return "";
}

export function fileExtensionFromMimeType(mimeType: string) {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

export function getAudioValidationError(file: File, maxBytes = 30 * 1024 * 1024) {
  if (!file.type.startsWith("audio/")) {
    return "El archivo debe ser de audio (mp3, m4a, wav, etc).";
  }
  if (file.size > maxBytes) {
    return "El audio supera 30MB. Sube un archivo mas pequeño.";
  }
  return null;
}

export function extractPhotoUrlsFromCanvasObjects(canvasObjects: CanvasObject[]) {
  const urls: string[] = [];
  for (const obj of canvasObjects) {
    if (obj.type !== "photo") continue;
    const src = typeof obj.src === "string" ? obj.src.trim() : "";
    if (!src) continue;
    urls.push(src);
  }
  return Array.from(new Set(urls));
}

export function parseAudioQueueSnapshot(
  restored: UploadQueueSnapshotItem<PageAudioQueueMeta>[],
) {
  const pending: PageAudioQueueItem[] = [];
  let failed: PageAudioQueueItem | null = null;

  for (const entry of restored) {
    const item: PageAudioQueueItem = { id: entry.id, file: entry.file };
    if (entry.status === "failed" && !failed) {
      failed = item;
    } else {
      pending.push(item);
    }
  }

  return {
    pending,
    failed,
    recoveredCount: pending.length + (failed ? 1 : 0),
  };
}

export function buildAudioQueueSnapshot(
  activeAudioItem: PageAudioQueueItem | null,
  audioQueue: PageAudioQueueItem[],
  failedAudioItem: PageAudioQueueItem | null,
) {
  const snapshot: UploadQueueSnapshotItem<PageAudioQueueMeta>[] = [];
  if (activeAudioItem) {
    snapshot.push({
      id: activeAudioItem.id,
      status: "pending",
      file: activeAudioItem.file,
      meta: {},
    });
  }
  for (const item of audioQueue) {
    snapshot.push({
      id: item.id,
      status: "pending",
      file: item.file,
      meta: {},
    });
  }
  if (failedAudioItem) {
    snapshot.push({
      id: failedAudioItem.id,
      status: "failed",
      file: failedAudioItem.file,
      meta: {},
    });
  }
  return snapshot;
}

export function resolveLocationPayload(input: {
  locationFieldsAvailable: boolean;
  locationLabel: string;
  locationLat: string;
  locationLng: string;
}) {
  const { locationFieldsAvailable, locationLabel, locationLat, locationLng } = input;
  const latRaw = locationLat.trim();
  const lngRaw = locationLng.trim();
  let parsedLat: number | null = null;
  let parsedLng: number | null = null;

  if (locationFieldsAvailable) {
    if ((latRaw && !lngRaw) || (!latRaw && lngRaw)) {
      throw new Error(
        "Debes rellenar latitud y longitud juntas, o dejar ambas vacias.",
      );
    }
    if (latRaw && lngRaw) {
      parsedLat = Number(latRaw);
      parsedLng = Number(lngRaw);
      if (!Number.isFinite(parsedLat) || parsedLat < -90 || parsedLat > 90) {
        throw new Error("Latitud invalida. Usa un valor entre -90 y 90.");
      }
      if (!Number.isFinite(parsedLng) || parsedLng < -180 || parsedLng > 180) {
        throw new Error("Longitud invalida. Usa un valor entre -180 y 180.");
      }
    }
  }

  const locationPayload = locationFieldsAvailable
    ? {
        location_label: locationLabel.trim() || null,
        location_lat: parsedLat,
        location_lng: parsedLng,
      }
    : {};

  return {
    locationPayload,
    parsedLat,
    parsedLng,
  };
}

type PageUpdateAttempt = {
  payload: Record<string, unknown>;
  usesCare: boolean;
  usesLocation: boolean;
  usesAudio: boolean;
};

export function buildPageUpdateAttempts(input: {
  basePayload: Record<string, unknown>;
  fullPayload: Record<string, unknown>;
  locationPayload: Record<string, unknown>;
  audioPayload: Record<string, unknown>;
  locationFieldsAvailable: boolean;
  audioFieldsAvailable: boolean;
}) {
  const {
    basePayload,
    fullPayload,
    locationPayload,
    audioPayload,
    locationFieldsAvailable,
    audioFieldsAvailable,
  } = input;

  const attempts: PageUpdateAttempt[] = [
    {
      payload: { ...fullPayload, ...locationPayload, ...audioPayload },
      usesCare: true,
      usesLocation: locationFieldsAvailable,
      usesAudio: audioFieldsAvailable,
    },
    {
      payload: { ...basePayload, ...locationPayload, ...audioPayload },
      usesCare: false,
      usesLocation: locationFieldsAvailable,
      usesAudio: audioFieldsAvailable,
    },
    {
      payload: { ...fullPayload, ...locationPayload },
      usesCare: true,
      usesLocation: locationFieldsAvailable,
      usesAudio: false,
    },
    {
      payload: { ...basePayload, ...locationPayload },
      usesCare: false,
      usesLocation: locationFieldsAvailable,
      usesAudio: false,
    },
    {
      payload: { ...fullPayload, ...audioPayload },
      usesCare: true,
      usesLocation: false,
      usesAudio: audioFieldsAvailable,
    },
    {
      payload: { ...basePayload, ...audioPayload },
      usesCare: false,
      usesLocation: false,
      usesAudio: audioFieldsAvailable,
    },
    {
      payload: fullPayload,
      usesCare: true,
      usesLocation: false,
      usesAudio: false,
    },
    {
      payload: basePayload,
      usesCare: false,
      usesLocation: false,
      usesAudio: false,
    },
  ];

  const unique: PageUpdateAttempt[] = [];
  const seenSignatures = new Set<string>();
  for (const attempt of attempts) {
    const signature = JSON.stringify(attempt.payload);
    if (seenSignatures.has(signature)) continue;
    seenSignatures.add(signature);
    unique.push(attempt);
  }
  return unique;
}
