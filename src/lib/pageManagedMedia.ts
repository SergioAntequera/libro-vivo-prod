import type { CanvasObject } from "@/lib/canvasTypes";

function pushUrl(target: string[], value: string | null | undefined) {
  const text = String(value ?? "").trim();
  if (!text) return;
  target.push(text);
}

export function collectManagedPageMediaUrls(input: {
  audioUrl?: string | null;
  coverPhotoUrl?: string | null;
  thumbnailUrl?: string | null;
  canvasObjects?: CanvasObject[] | null;
}) {
  const urls: string[] = [];
  pushUrl(urls, input.audioUrl);
  pushUrl(urls, input.coverPhotoUrl);
  pushUrl(urls, input.thumbnailUrl);

  const objects = Array.isArray(input.canvasObjects) ? input.canvasObjects : [];
  for (const object of objects) {
    if (!object || (object.type !== "photo" && object.type !== "video")) continue;
    pushUrl(urls, object.src ?? null);
  }

  return Array.from(new Set(urls));
}
