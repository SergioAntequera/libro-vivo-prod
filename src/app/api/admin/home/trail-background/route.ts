import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireSuperadminRoute } from "@/lib/serverRouteAuth";
import {
  HOME_TRAIL_MANAGED_ASSET_PREFIX,
  buildManagedHomeTrailAssetUrl,
  extractManagedHomeTrailAssetFilename,
  isManagedHomeTrailProjectAssetUrl,
} from "@/lib/homeTrailBackgroundAsset";
import {
  deleteManagedAssetFromGoogleDrive,
  extractDriveFileIdFromProxyUrl,
} from "@/lib/googleDriveServer";

export const runtime = "nodejs";

const IMAGE_EXT_BY_TYPE: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
  "image/svg+xml": ".svg",
};

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

function resolveImageExtension(file: File) {
  const byType = IMAGE_EXT_BY_TYPE[file.type];
  if (byType) return byType;

  const fromName = path.extname(String(file.name ?? "").trim()).toLowerCase();
  if (fromName && Object.values(IMAGE_EXT_BY_TYPE).includes(fromName)) {
    return fromName;
  }

  return ".png";
}

function managedAssetsRoot() {
  return path.resolve(process.cwd(), "public", "assets");
}

async function deleteManagedProjectAsset(url: string) {
  const filename = extractManagedHomeTrailAssetFilename(url);
  if (!filename) return false;

  const targetPath = path.resolve(managedAssetsRoot(), filename);
  try {
    await unlink(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function deleteManagedDriveAsset(url: string) {
  const fileId = extractDriveFileIdFromProxyUrl(url);
  if (!fileId) return false;

  try {
    await deleteManagedAssetFromGoogleDrive({
      fileId,
      scope: "home_trail_background",
    });
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const auth = await requireSuperadminRoute(req);
  if (!auth.ok) return auth.response;

  try {
    const form = await req.formData();
    const fileValue = form.get("file");
    const replaceUrl = String(form.get("replaceUrl") ?? "").trim();

    if (!(fileValue instanceof File)) {
      return NextResponse.json(
        { error: "Falta la imagen a subir." },
        { status: 400 },
      );
    }
    if (!isImageFile(fileValue)) {
      return NextResponse.json(
        { error: "El archivo debe ser una imagen." },
        { status: 400 },
      );
    }

    const ext = resolveImageExtension(fileValue);
    const fileName = `${HOME_TRAIL_MANAGED_ASSET_PREFIX}${Date.now()}-${randomUUID()}${ext}`;
    const assetsRoot = managedAssetsRoot();
    const targetPath = path.resolve(assetsRoot, fileName);

    await mkdir(assetsRoot, { recursive: true });
    await writeFile(targetPath, Buffer.from(await fileValue.arrayBuffer()));

    if (replaceUrl) {
      if (isManagedHomeTrailProjectAssetUrl(replaceUrl)) {
        await deleteManagedProjectAsset(replaceUrl);
      } else {
        await deleteManagedDriveAsset(replaceUrl);
      }
    }

    return NextResponse.json({
      ok: true,
      provider: "project",
      fileName,
      url: buildManagedHomeTrailAssetUrl(fileName),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo guardar la imagen del sendero en el proyecto.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  const auth = await requireSuperadminRoute(req);
  if (!auth.ok) return auth.response;

  try {
    const payload = (await req.json().catch(() => null)) as
      | { url?: unknown }
      | null;
    const url = String(payload?.url ?? "").trim();
    if (!url) {
      return NextResponse.json(
        { error: "Falta la URL de la imagen." },
        { status: 400 },
      );
    }

    if (isManagedHomeTrailProjectAssetUrl(url)) {
      await deleteManagedProjectAsset(url);
      return NextResponse.json({ ok: true, provider: "project", url });
    }

    if (extractDriveFileIdFromProxyUrl(url)) {
      await deleteManagedDriveAsset(url);
      return NextResponse.json({ ok: true, provider: "gdrive", url });
    }

    return NextResponse.json(
      { error: "La URL no corresponde a un fondo gestionado por el proyecto." },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo borrar la imagen del sendero.",
      },
      { status: 500 },
    );
  }
}
