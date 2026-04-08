"use client";

import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { CanvasObject } from "@/lib/canvasTypes";
import type { CanvasTemplateConfig } from "@/lib/canvasCatalog";
import {
  createObjectFromTemplateInput,
  createPhotoFrameObject,
  createStickerObject,
  createTextObject,
  createVideoFrameObject,
} from "@/components/canvas/canvasObjectFactories";
import {
  bringCanvasObjectsForwardOne,
  bringCanvasObjectsToFront,
  duplicateEditableCanvasObjects,
  removeCanvasObjectIds,
  sendCanvasObjectsBackwardOne,
  sendCanvasObjectsToBack,
  toggleCanvasObjectLock,
} from "@/components/canvas/canvasObjectOps";

type SetObjectsFn = (next: CanvasObject[]) => void;

type UseCanvasObjectActionsParams = {
  objects: CanvasObject[];
  setObjects: SetObjectsFn;
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  onRemoveObjects?: (
    removedObjects: CanvasObject[],
    nextObjects: CanvasObject[],
  ) => void | Promise<void>;
};

export function useCanvasObjectActions(params: UseCanvasObjectActionsParams) {
  const { objects, setObjects, setSelectedIds, onRemoveObjects } = params;

  const removeIds = useCallback(
    (ids: string[]) => {
      if (!ids.length) return;
      const targetIds = new Set(ids);
      const removedObjects = objects.filter((object) => targetIds.has(object.id));
      const nextObjects = removeCanvasObjectIds(objects, ids);
      if (removedObjects.length) {
        void onRemoveObjects?.(removedObjects, nextObjects);
      }
      setObjects(nextObjects);
      setSelectedIds((prev) => prev.filter((id) => !targetIds.has(id)));
    },
    [objects, onRemoveObjects, setObjects, setSelectedIds],
  );

  const removeSelected = useCallback(
    (selectedUnlockedIds: string[]) => {
      removeIds(selectedUnlockedIds);
    },
    [removeIds],
  );

  const toggleLock = useCallback(
    (ids: string[]) => {
      if (!ids.length) return;
      setObjects(toggleCanvasObjectLock(objects, ids));
    },
    [objects, setObjects],
  );

  const bringToFront = useCallback(
    (ids: string[]) => {
      if (!ids.length) return;
      setObjects(bringCanvasObjectsToFront(objects, ids));
    },
    [objects, setObjects],
  );

  const sendBackwardOne = useCallback(
    (ids: string[]) => {
      if (!ids.length) return;
      setObjects(sendCanvasObjectsBackwardOne(objects, ids));
    },
    [objects, setObjects],
  );

  const bringForwardOne = useCallback(
    (ids: string[]) => {
      if (!ids.length) return;
      setObjects(bringCanvasObjectsForwardOne(objects, ids));
    },
    [objects, setObjects],
  );

  const sendToBack = useCallback(
    (ids: string[]) => {
      if (!ids.length) return;
      setObjects(sendCanvasObjectsToBack(objects, ids));
    },
    [objects, setObjects],
  );

  const duplicateIds = useCallback(
    (ids: string[]) => {
      if (!ids.length) return;
      const { nextObjects, duplicatedIds } = duplicateEditableCanvasObjects(
        objects,
        ids,
      );
      if (!duplicatedIds.length) return;
      setObjects(nextObjects);
      setSelectedIds(duplicatedIds);
    },
    [objects, setObjects, setSelectedIds],
  );

  const addTemplate = useCallback(
    (template: CanvasTemplateConfig) => {
      const created = template.objects
        .map((obj) => createObjectFromTemplateInput(obj))
        .filter(Boolean) as CanvasObject[];

      if (!created.length) return;
      setObjects([...objects, ...created]);
      setSelectedIds([created[0].id]);
    },
    [objects, setObjects, setSelectedIds],
  );

  const addSticker = useCallback(
    (src: string) => {
      const next = createStickerObject(src);
      setObjects([...objects, next]);
      setSelectedIds([next.id]);
    },
    [objects, setObjects, setSelectedIds],
  );

  const addText = useCallback(() => {
    const next = createTextObject();
    setObjects([...objects, next]);
    setSelectedIds([next.id]);
  }, [objects, setObjects, setSelectedIds]);

  const addPhoto = useCallback(() => {
    const next = createPhotoFrameObject();
    setObjects([...objects, next]);
    setSelectedIds([next.id]);
  }, [objects, setObjects, setSelectedIds]);

  const addVideo = useCallback(() => {
    const next = createVideoFrameObject();
    setObjects([...objects, next]);
    setSelectedIds([next.id]);
  }, [objects, setObjects, setSelectedIds]);

  return {
    removeIds,
    removeSelected,
    toggleLock,
    bringToFront,
    sendBackwardOne,
    bringForwardOne,
    sendToBack,
    duplicateIds,
    addTemplate,
    addSticker,
    addText,
    addPhoto,
    addVideo,
  };
}
