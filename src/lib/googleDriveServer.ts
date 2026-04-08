import { createHmac, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { extractDriveFileIdFromMediaUrl } from "@/lib/driveMediaUrl";
import { toErrorMessage } from "@/lib/errorMessage";

export type DriveMediaKind = "photo" | "audio" | "video";
export type DriveChatMediaKind = "image" | "audio" | "video" | "file";
export type DriveManagedAssetScope = "home_trail_background";

type DriveConfig = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  rootFolderId: string;
  mediaProxySecret: string;
};

type DriveAccessToken = {
  accessToken: string;
};

type DrivePageRow = {
  id: string;
  title: string | null;
  date: string | null;
  garden_id: string | null;
};

type DriveSeedRow = {
  id: string;
  title: string | null;
  garden_id: string | null;
};

type DriveFileUploadResult = {
  fileId: string;
  fileName: string;
  folderId: string;
  url: string;
};

type DriveFileMetadata = {
  id?: unknown;
  trashed?: unknown;
  appProperties?: Record<string, unknown> | null;
};

export type GoogleDriveHealthReport = {
  provider: "gdrive";
  configured: boolean;
  reachable: boolean;
  reconnectRequired: boolean;
  rootFolderAccessible: boolean;
  rootFolderId: string | null;
  rootFolderName: string | null;
  message: string;
};

const DRIVE_FOLDER_NAMES: Record<DriveMediaKind, string> = {
  photo: "Fotos",
  audio: "Audios",
  video: "Videos",
};

const DRIVE_MANAGED_ASSET_FOLDER_NAMES: Record<DriveManagedAssetScope, string[]> = {
  home_trail_background: ["Escenas", "Home"],
};

const DRIVE_CAPSULE_MEDIA_FOLDER_NAMES: Record<DriveMediaKind, string[]> = {
  photo: ["Capsulas del tiempo", "Fotos"],
  audio: ["Capsulas del tiempo", "Audios"],
  video: ["Capsulas del tiempo", "Videos"],
};

const DRIVE_CHAT_MEDIA_FOLDER_NAMES: Record<DriveChatMediaKind, string[]> = {
  image: ["Chat del jardin", "Imagenes"],
  audio: ["Chat del jardin", "Audios"],
  video: ["Chat del jardin", "Videos"],
  file: ["Chat del jardin", "Archivos"],
};

function getDriveConfig(): DriveConfig | null {
  const clientId = String(process.env.GOOGLE_DRIVE_CLIENT_ID ?? "").trim();
  const clientSecret = String(process.env.GOOGLE_DRIVE_CLIENT_SECRET ?? "").trim();
  const refreshToken = String(process.env.GOOGLE_DRIVE_REFRESH_TOKEN ?? "").trim();
  const rootFolderId = String(process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ?? "").trim();
  const mediaProxySecret = String(process.env.MEDIA_PROXY_SECRET ?? "").trim();

  if (!clientId || !clientSecret || !refreshToken || !rootFolderId || !mediaProxySecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    refreshToken,
    rootFolderId,
    mediaProxySecret,
  };
}

export function isGoogleDriveStorageConfigured() {
  return getDriveConfig() !== null;
}

function normalizeGoogleDriveConfigErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("invalid_grant") ||
    normalized.includes("expired or revoked") ||
    normalized.includes("token has been expired") ||
    normalized.includes("token has been revoked")
  ) {
    return [
      "Google Drive ha rechazado el refresh token configurado.",
      "Suele pasar cuando el token ha caducado o fue revocado.",
      "Necesitas generar un nuevo GOOGLE_DRIVE_REFRESH_TOKEN y actualizar la configuración del proyecto.",
    ].join(" ");
  }
  return message;
}

function isGoogleDriveReconnectRequiredErrorMessage(message: string | null | undefined) {
  const normalized = String(message ?? "").trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes("invalid_grant") ||
    normalized.includes("expired or revoked") ||
    normalized.includes("token has been expired") ||
    normalized.includes("token has been revoked")
  );
}

function escapeDriveQuery(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function sanitizeFileNamePart(value: string | null | undefined, fallback: string) {
  const raw = String(value ?? "")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return raw || fallback;
}

function extractFileExtension(fileName: string, fallback: string) {
  const ext = fileName.split(".").pop()?.trim().toLowerCase();
  if (!ext) return fallback;
  return ext.replace(/[^a-z0-9]/g, "") || fallback;
}

function proxyToken(fileId: string, secret: string) {
  return createHmac("sha256", secret).update(fileId).digest("hex");
}

export function verifyDriveProxyToken(fileId: string, token: string | null | undefined) {
  const config = getDriveConfig();
  if (!config) return false;
  const provided = String(token ?? "").trim();
  if (!provided) return false;
  return proxyToken(fileId, config.mediaProxySecret) === provided;
}

export function buildDriveProxyUrl(fileId: string) {
  const config = getDriveConfig();
  if (!config) {
    throw new Error(
      "Faltan GOOGLE_DRIVE_* o MEDIA_PROXY_SECRET para construir la URL de proxy.",
    );
  }
  const token = proxyToken(fileId, config.mediaProxySecret);
  return `/api/media/drive/${encodeURIComponent(fileId)}?token=${encodeURIComponent(token)}`;
}

async function fetchDriveAccessToken(config: DriveConfig): Promise<DriveAccessToken> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `No se pudo refrescar el token de Google Drive (${response.status}): ${text || "sin detalle"}`,
    );
  }

  const payload = (await response.json()) as {
    access_token?: unknown;
  };
  const accessToken = String(payload.access_token ?? "").trim();
  if (!accessToken) {
    throw new Error("Google no devolvio access_token para Drive.");
  }

  return { accessToken };
}

async function driveApiJson<T>(
  config: DriveConfig,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const { accessToken } = await fetchDriveAccessToken(config);
  const response = await fetch(`https://www.googleapis.com/drive/v3${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Google Drive API fallo (${response.status}) en ${path}: ${text || "sin detalle"}`,
    );
  }

  return (await response.json()) as T;
}

async function driveApiRequest(
  config: DriveConfig,
  path: string,
  init?: RequestInit,
) {
  const { accessToken } = await fetchDriveAccessToken(config);
  return fetch(`https://www.googleapis.com/drive/v3${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });
}

async function loadDriveFolderMetadata(config: DriveConfig, folderId: string) {
  return driveApiJson<{
    id?: unknown;
    name?: unknown;
    trashed?: unknown;
  }>(
    config,
    `/files/${encodeURIComponent(folderId)}?fields=id,name,trashed`,
  );
}

export async function createDriveDownloadResponse(
  fileId: string,
  rangeHeader: string | null,
): Promise<Response> {
  const config = getDriveConfig();
  if (!config) {
    return new Response("Drive no configurado.", { status: 500 });
  }

  const { accessToken } = await fetchDriveAccessToken(config);
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(rangeHeader ? { Range: rangeHeader } : {}),
      },
    },
  );

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "");
    return new Response(
      text || `No se pudo leer el archivo de Google Drive (${response.status}).`,
      { status: response.status || 502 },
    );
  }

  const headers = new Headers();
  const forwardHeaders = [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "etag",
    "last-modified",
  ];
  for (const key of forwardHeaders) {
    const value = response.headers.get(key);
    if (value) headers.set(key, value);
  }
  headers.set("cache-control", "private, max-age=3600");

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

async function ensureDriveFolder(
  config: DriveConfig,
  parentId: string,
  folderName: string,
) {
  const query = [
    `'${escapeDriveQuery(parentId)}' in parents`,
    `name = '${escapeDriveQuery(folderName)}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
  ].join(" and ");

  const existing = await driveApiJson<{
    files?: Array<{ id?: unknown }>;
  }>(
    config,
    `/files?q=${encodeURIComponent(query)}&spaces=drive&fields=files(id)&pageSize=1`,
  );

  const existingId = String(existing.files?.[0]?.id ?? "").trim();
  if (existingId) return existingId;

  const created = await driveApiJson<{ id?: unknown }>(config, "/files?fields=id", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });

  const createdId = String(created.id ?? "").trim();
  if (!createdId) {
    throw new Error(`No se pudo crear la carpeta Drive '${folderName}'.`);
  }
  return createdId;
}

async function ensureNestedDriveFolders(
  config: DriveConfig,
  rootId: string,
  folderNames: string[],
) {
  let currentParentId = rootId;
  for (const folderName of folderNames) {
    currentParentId = await ensureDriveFolder(config, currentParentId, folderName);
  }
  return currentParentId;
}

async function uploadDriveFileContent(params: {
  config: DriveConfig;
  parentId: string;
  fileName: string;
  file: File;
  appProperties: Record<string, string>;
}) {
  const { config, parentId, fileName, file, appProperties } = params;
  const { accessToken } = await fetchDriveAccessToken(config);

  const session = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "content-type": "application/json; charset=UTF-8",
        "x-upload-content-type": file.type || "application/octet-stream",
      },
      body: JSON.stringify({
        name: fileName,
        parents: [parentId],
        appProperties,
      }),
    },
  );

  const uploadUrl = String(session.headers.get("location") ?? "").trim();
  if (!session.ok || !uploadUrl) {
    const text = await session.text().catch(() => "");
    throw new Error(
      `No se pudo iniciar la subida resumible a Drive (${session.status}): ${text || "sin detalle"}`,
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "content-type": file.type || "application/octet-stream",
      "content-length": String(buffer.byteLength),
    },
    body: buffer,
  });

  if (!uploaded.ok) {
    const text = await uploaded.text().catch(() => "");
    throw new Error(
      `La subida del archivo a Drive fallo (${uploaded.status}): ${text || "sin detalle"}`,
    );
  }

  const payload = (await uploaded.json()) as {
    id?: unknown;
    name?: unknown;
  };
  const fileId = String(payload.id ?? "").trim();
  if (!fileId) {
    throw new Error("Drive no devolvio fileId tras la subida.");
  }

  return fileId;
}

async function loadPageForDriveNaming(
  client: SupabaseClient,
  pageId: string,
) {
  // multigarden-smoke: allow-unscoped pages -- auth client + RLS limit access to the requested page id.
  const { data, error } = await client
    .from("pages")
    .select("id,title,date,garden_id")
    .eq("id", pageId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `No se pudo cargar metadata de la página para Drive: ${error.message}`,
    );
  }

  const row = (data as DrivePageRow | null) ?? null;
  if (!row?.id) {
    throw new Error("La página no existe o no esta accesible para esta sesión.");
  }

  return row;
}

async function loadSeedForDriveNaming(
  client: SupabaseClient,
  seedId: string,
) {
  // multigarden-smoke: allow-unscoped seeds -- auth client + RLS limit access to the requested seed id.
  const { data, error } = await client
    .from("seeds")
    .select("id,title,garden_id")
    .eq("id", seedId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `No se pudo cargar metadata de la semilla para Drive: ${error.message}`,
    );
  }

  const row = (data as DriveSeedRow | null) ?? null;
  if (!row?.id) {
    throw new Error("La semilla no existe o no esta accesible para esta sesion.");
  }

  return row;
}

function buildDriveFileName(kind: DriveMediaKind, page: DrivePageRow, file: File) {
  const datePart = /^\d{4}-\d{2}-\d{2}$/.test(String(page.date ?? ""))
    ? String(page.date)
    : new Date().toISOString().slice(0, 10);
  const titlePart = sanitizeFileNamePart(page.title, "página");
  const pagePart = sanitizeFileNamePart(page.id, "page").slice(0, 8);
  const kindPart = kind === "photo" ? "foto" : kind === "audio" ? "audio" : "video";
  const extFallback = kind === "photo" ? "jpg" : kind === "audio" ? "mp3" : "mp4";
  const ext = extractFileExtension(file.name, extFallback);
  const nonce = randomUUID().slice(0, 8);
  return `${datePart}__${titlePart}__${pagePart}__${kindPart}_${nonce}.${ext}`;
}

export async function uploadPageMediaToGoogleDrive(params: {
  client: SupabaseClient;
  userId: string;
  pageId: string;
  kind: DriveMediaKind;
  file: File;
}): Promise<DriveFileUploadResult> {
  const config = getDriveConfig();
  if (!config) {
    throw new Error(
      "Google Drive no esta configurado. Revisa GOOGLE_DRIVE_* y MEDIA_PROXY_SECRET.",
    );
  }

  const page = await loadPageForDriveNaming(params.client, params.pageId);
  const folderId = await ensureDriveFolder(
    config,
    config.rootFolderId,
    DRIVE_FOLDER_NAMES[params.kind],
  );
  const fileName = buildDriveFileName(params.kind, page, params.file);
  const fileId = await uploadDriveFileContent({
    config,
    parentId: folderId,
    fileName,
    file: params.file,
    appProperties: {
      libro_vivo_kind: params.kind,
      libro_vivo_page_id: page.id,
      libro_vivo_garden_id: String(page.garden_id ?? ""),
      libro_vivo_owner_user_id: params.userId,
    },
  });

  return {
    fileId,
    fileName,
    folderId,
    url: buildDriveProxyUrl(fileId),
  };
}

function buildCapsuleDriveFileName(
  kind: DriveMediaKind,
  gardenId: string,
  file: File,
) {
  const datePart = new Date().toISOString().slice(0, 10);
  const gardenPart = sanitizeFileNamePart(gardenId, "garden").slice(0, 8);
  const kindPart = kind === "photo" ? "foto" : kind === "audio" ? "audio" : "video";
  const extFallback = kind === "photo" ? "jpg" : kind === "audio" ? "mp3" : "mp4";
  const ext = extractFileExtension(file.name, extFallback);
  const nonce = randomUUID().slice(0, 8);
  return `${datePart}__capsula__${gardenPart}__${kindPart}_${nonce}.${ext}`;
}

function buildGardenChatDriveFileName(
  kind: DriveChatMediaKind,
  gardenId: string,
  roomId: string,
  file: File,
) {
  const datePart = new Date().toISOString().slice(0, 10);
  const gardenPart = sanitizeFileNamePart(gardenId, "garden").slice(0, 8);
  const roomPart = sanitizeFileNamePart(roomId, "room").slice(0, 8);
  const kindPart =
    kind === "image"
      ? "imagen"
      : kind === "audio"
        ? "audio"
        : kind === "video"
          ? "video"
          : "archivo";
  const extFallback =
    kind === "image"
      ? "jpg"
      : kind === "audio"
        ? "mp3"
        : kind === "video"
          ? "mp4"
          : "bin";
  const ext = extractFileExtension(file.name, extFallback);
  const nonce = randomUUID().slice(0, 8);
  return `${datePart}__chat__${gardenPart}__${roomPart}__${kindPart}_${nonce}.${ext}`;
}

function buildSeedPreparationDriveFileName(seed: DriveSeedRow, file: File) {
  const datePart = new Date().toISOString().slice(0, 10);
  const seedPart = sanitizeFileNamePart(seed.id, "seed").slice(0, 8);
  const titlePart = sanitizeFileNamePart(seed.title, "plan");
  const ext = extractFileExtension(file.name, "pdf");
  const nonce = randomUUID().slice(0, 8);
  return `${datePart}__preparacion__${titlePart}__${seedPart}_${nonce}.${ext}`;
}

function buildSeedPreparationDriveFolderNames(seed: DriveSeedRow) {
  const seedPart = sanitizeFileNamePart(seed.id, "seed").slice(0, 8);
  const titlePart = sanitizeFileNamePart(seed.title, "plan");
  return ["Semillas preparadas", "Viajes", `${titlePart}__${seedPart}`, "Documentos"];
}

export async function uploadCapsuleMediaToGoogleDrive(params: {
  userId: string;
  gardenId: string;
  kind: DriveMediaKind;
  file: File;
}): Promise<DriveFileUploadResult> {
  const config = getDriveConfig();
  if (!config) {
    throw new Error(
      "Google Drive no esta configurado. Revisa GOOGLE_DRIVE_* y MEDIA_PROXY_SECRET.",
    );
  }

  const folderId = await ensureNestedDriveFolders(
    config,
    config.rootFolderId,
    DRIVE_CAPSULE_MEDIA_FOLDER_NAMES[params.kind],
  );
  const fileName = buildCapsuleDriveFileName(params.kind, params.gardenId, params.file);
  const fileId = await uploadDriveFileContent({
    config,
    parentId: folderId,
    fileName,
    file: params.file,
    appProperties: {
      libro_vivo_kind: `capsule_${params.kind}`,
      libro_vivo_scope: "time_capsule",
      libro_vivo_garden_id: params.gardenId,
      libro_vivo_owner_user_id: params.userId,
    },
  });

  return {
    fileId,
    fileName,
    folderId,
    url: buildDriveProxyUrl(fileId),
  };
}

export async function uploadGardenChatMediaToGoogleDrive(params: {
  userId: string;
  gardenId: string;
  roomId: string;
  kind: DriveChatMediaKind;
  file: File;
}): Promise<DriveFileUploadResult> {
  const config = getDriveConfig();
  if (!config) {
    throw new Error(
      "Google Drive no esta configurado. Revisa GOOGLE_DRIVE_* y MEDIA_PROXY_SECRET.",
    );
  }

  const folderId = await ensureNestedDriveFolders(
    config,
    config.rootFolderId,
    DRIVE_CHAT_MEDIA_FOLDER_NAMES[params.kind],
  );
  const fileName = buildGardenChatDriveFileName(
    params.kind,
    params.gardenId,
    params.roomId,
    params.file,
  );
  const fileId = await uploadDriveFileContent({
    config,
    parentId: folderId,
    fileName,
    file: params.file,
    appProperties: {
      libro_vivo_kind: `chat_${params.kind}`,
      libro_vivo_scope: "garden_chat",
      libro_vivo_garden_id: params.gardenId,
      libro_vivo_room_id: params.roomId,
      libro_vivo_owner_user_id: params.userId,
    },
  });

  return {
    fileId,
    fileName,
    folderId,
    url: buildDriveProxyUrl(fileId),
  };
}

export async function uploadSeedPreparationAttachmentToGoogleDrive(params: {
  client: SupabaseClient;
  userId: string;
  seedId: string;
  file: File;
}): Promise<DriveFileUploadResult> {
  const config = getDriveConfig();
  if (!config) {
    throw new Error(
      "Google Drive no esta configurado. Revisa GOOGLE_DRIVE_* y MEDIA_PROXY_SECRET.",
    );
  }

    const seed = await loadSeedForDriveNaming(params.client, params.seedId);
    const folderId = await ensureNestedDriveFolders(
      config,
      config.rootFolderId,
      buildSeedPreparationDriveFolderNames(seed),
    );
  const fileName = buildSeedPreparationDriveFileName(seed, params.file);
  const fileId = await uploadDriveFileContent({
    config,
    parentId: folderId,
    fileName,
    file: params.file,
    appProperties: {
      libro_vivo_kind: "seed_preparation_document",
      libro_vivo_scope: "seed_preparation",
      libro_vivo_seed_id: seed.id,
      libro_vivo_garden_id: String(seed.garden_id ?? ""),
      libro_vivo_owner_user_id: params.userId,
    },
  });

  return {
    fileId,
    fileName,
    folderId,
    url: buildDriveProxyUrl(fileId),
  };
}

function buildManagedDriveAssetFileName(
  scope: DriveManagedAssetScope,
  file: File,
) {
  const prefix =
    scope === "home_trail_background" ? "home-trail-background" : "asset";
  const ext = extractFileExtension(file.name, "png");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const nonce = randomUUID().slice(0, 8);
  return `${prefix}__${stamp}__${nonce}.${ext}`;
}

function readDriveFileScope(metadata: DriveFileMetadata) {
  const raw = metadata.appProperties?.libro_vivo_scope;
  const value = String(raw ?? "").trim();
  return value || null;
}

export async function uploadManagedAssetToGoogleDrive(params: {
  file: File;
  userId: string;
  scope: DriveManagedAssetScope;
}): Promise<DriveFileUploadResult> {
  const config = getDriveConfig();
  if (!config) {
    throw new Error(
      "Google Drive no esta configurado. Revisa GOOGLE_DRIVE_* y MEDIA_PROXY_SECRET.",
    );
  }

  const folderId = await ensureNestedDriveFolders(
    config,
    config.rootFolderId,
    DRIVE_MANAGED_ASSET_FOLDER_NAMES[params.scope],
  );
  const fileName = buildManagedDriveAssetFileName(params.scope, params.file);
  const fileId = await uploadDriveFileContent({
    config,
    parentId: folderId,
    fileName,
    file: params.file,
    appProperties: {
      libro_vivo_kind: "scene_background",
      libro_vivo_scope: params.scope,
      libro_vivo_owner_user_id: params.userId,
    },
  });

  return {
    fileId,
    fileName,
    folderId,
    url: buildDriveProxyUrl(fileId),
  };
}

async function loadDriveFileMetadata(config: DriveConfig, fileId: string) {
  const response = await driveApiRequest(
    config,
    `/files/${encodeURIComponent(fileId)}?fields=id,trashed,appProperties`,
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `No se pudo leer metadata del archivo de Drive (${response.status}): ${text || "sin detalle"}`,
    );
  }
  return (await response.json()) as DriveFileMetadata;
}

function readDriveFilePageId(metadata: DriveFileMetadata) {
  const raw = metadata.appProperties?.libro_vivo_page_id;
  const value = String(raw ?? "").trim();
  return value || null;
}

export async function deletePageMediaFromGoogleDrive(params: {
  client: SupabaseClient;
  pageId: string;
  fileId: string;
}) {
  const config = getDriveConfig();
  if (!config) {
    throw new Error(
      "Google Drive no esta configurado. Revisa GOOGLE_DRIVE_* y MEDIA_PROXY_SECRET.",
    );
  }

  const page = await loadPageForDriveNaming(params.client, params.pageId);
  const metadata = await loadDriveFileMetadata(config, params.fileId);
  if (!metadata) return;
  const metadataPageId = readDriveFilePageId(metadata);
  if (!metadataPageId) {
    throw new Error("El archivo de Drive no tiene metadata de página gestionada.");
  }
  if (metadataPageId !== page.id) {
    throw new Error("El archivo de Drive no pertenece a esta página.");
  }

  const response = await driveApiRequest(
    config,
    `/files/${encodeURIComponent(params.fileId)}`,
    { method: "DELETE" },
  );

  if (response.status === 404) return;
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `No se pudo borrar el archivo de Drive (${response.status}): ${text || "sin detalle"}`,
    );
  }
}

export async function deleteManagedAssetFromGoogleDrive(params: {
  fileId: string;
  scope: DriveManagedAssetScope;
}) {
  const config = getDriveConfig();
  if (!config) {
    throw new Error(
      "Google Drive no esta configurado. Revisa GOOGLE_DRIVE_* y MEDIA_PROXY_SECRET.",
    );
  }

  const metadata = await loadDriveFileMetadata(config, params.fileId);
  if (!metadata) return;
  const metadataScope = readDriveFileScope(metadata);
  if (metadataScope !== params.scope) {
    throw new Error("El archivo de Drive no pertenece a este asset gestionado.");
  }

  const response = await driveApiRequest(
    config,
    `/files/${encodeURIComponent(params.fileId)}`,
    { method: "DELETE" },
  );

  if (response.status === 404) return;
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `No se pudo borrar el asset de Drive (${response.status}): ${text || "sin detalle"}`,
    );
  }
}

export function extractDriveFileIdFromProxyUrl(url: string) {
  return extractDriveFileIdFromMediaUrl(url);
}

export function assertGoogleDriveConfigured() {
  if (getDriveConfig()) return;
  throw new Error(
    [
      "Falta configurar Google Drive.",
      "Necesitas GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN, GOOGLE_DRIVE_ROOT_FOLDER_ID y MEDIA_PROXY_SECRET.",
    ].join(" "),
  );
}

export function describeGoogleDriveConfigError(error: unknown) {
  return normalizeGoogleDriveConfigErrorMessage(
    toErrorMessage(error, "No se pudo usar Google Drive."),
  );
}

export async function getGoogleDriveHealthReport(): Promise<GoogleDriveHealthReport> {
  const config = getDriveConfig();
  if (!config) {
    return {
      provider: "gdrive",
      configured: false,
      reachable: false,
      reconnectRequired: false,
      rootFolderAccessible: false,
      rootFolderId: null,
      rootFolderName: null,
      message:
        "Google Drive no esta configurado. Faltan GOOGLE_DRIVE_* o MEDIA_PROXY_SECRET.",
    };
  }

  try {
    const folder = await loadDriveFolderMetadata(config, config.rootFolderId);
    const rootFolderName = String(folder.name ?? "").trim() || null;
    const rootFolderAccessible =
      String(folder.id ?? "").trim() === config.rootFolderId && !folder.trashed;

    return {
      provider: "gdrive",
      configured: true,
      reachable: true,
      reconnectRequired: false,
      rootFolderAccessible,
      rootFolderId: config.rootFolderId,
      rootFolderName,
      message: rootFolderAccessible
        ? "Google Drive esta operativo y la carpeta raiz responde."
        : "Google Drive responde, pero la carpeta raiz configurada no esta accesible.",
    };
  } catch (error) {
    const message = describeGoogleDriveConfigError(error);
    return {
      provider: "gdrive",
      configured: true,
      reachable: false,
      reconnectRequired: isGoogleDriveReconnectRequiredErrorMessage(message),
      rootFolderAccessible: false,
      rootFolderId: config.rootFolderId,
      rootFolderName: null,
      message,
    };
  }
}
