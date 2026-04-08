import type { CanvasObject } from "@/lib/canvasTypes";
import { isLocked, uid } from "@/components/canvas/canvasEditorUtils";

export function removeCanvasObjectIds(
  objects: CanvasObject[],
  ids: string[],
): CanvasObject[] {
  if (!ids.length) return objects;
  const targetIds = new Set(ids);
  return objects.filter((object) => !targetIds.has(object.id));
}

export function toggleCanvasObjectLock(
  objects: CanvasObject[],
  ids: string[],
): CanvasObject[] {
  if (!ids.length) return objects;
  const targetIds = new Set(ids);
  const allLocked = objects
    .filter((object) => targetIds.has(object.id))
    .every((object) => isLocked(object));
  const nextLocked = !allLocked;
  return objects.map((object) =>
    targetIds.has(object.id) ? { ...object, locked: nextLocked } : object,
  );
}

export function bringCanvasObjectsToFront(
  objects: CanvasObject[],
  ids: string[],
): CanvasObject[] {
  if (!ids.length) return objects;
  const targetIds = new Set(ids);
  const rest = objects.filter((object) => !targetIds.has(object.id));
  const picked = objects.filter((object) => targetIds.has(object.id));
  return [...rest, ...picked];
}

export function sendCanvasObjectsToBack(
  objects: CanvasObject[],
  ids: string[],
): CanvasObject[] {
  if (!ids.length) return objects;
  const targetIds = new Set(ids);
  const picked = objects.filter((object) => targetIds.has(object.id));
  const rest = objects.filter((object) => !targetIds.has(object.id));
  return [...picked, ...rest];
}

export function bringCanvasObjectsForwardOne(
  objects: CanvasObject[],
  ids: string[],
): CanvasObject[] {
  if (!ids.length) return objects;
  const targetIds = new Set(ids);
  const next = [...objects];
  for (let index = next.length - 2; index >= 0; index -= 1) {
    if (targetIds.has(next[index].id) && !targetIds.has(next[index + 1].id)) {
      const tmp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = tmp;
    }
  }
  return next;
}

export function sendCanvasObjectsBackwardOne(
  objects: CanvasObject[],
  ids: string[],
): CanvasObject[] {
  if (!ids.length) return objects;
  const targetIds = new Set(ids);
  const next = [...objects];
  for (let index = 1; index < next.length; index += 1) {
    if (targetIds.has(next[index].id) && !targetIds.has(next[index - 1].id)) {
      const tmp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = tmp;
    }
  }
  return next;
}

export function duplicateEditableCanvasObjects(
  objects: CanvasObject[],
  ids: string[],
): { nextObjects: CanvasObject[]; duplicatedIds: string[] } {
  if (!ids.length) {
    return { nextObjects: objects, duplicatedIds: [] };
  }
  const targetIds = new Set(ids);
  const originals = objects.filter(
    (object) => targetIds.has(object.id) && !isLocked(object),
  );
  if (!originals.length) {
    return { nextObjects: objects, duplicatedIds: [] };
  }

  const copies = originals.map((object) => ({
    ...object,
    id: uid(),
    x: (object.x ?? 0) + 24,
    y: (object.y ?? 0) + 24,
    locked: false,
  }));

  return {
    nextObjects: [...objects, ...copies],
    duplicatedIds: copies.map((copy) => copy.id),
  };
}
