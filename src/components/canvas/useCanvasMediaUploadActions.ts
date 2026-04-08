"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { CanvasObject } from "@/lib/canvasTypes";
import { newUploadQueueItemId } from "@/lib/persistentUploadQueue";
import type { VideoQueueItem } from "@/components/canvas/useVideoUploadQueue";
import { isLocked } from "@/components/canvas/canvasEditorUtils";

type UseCanvasMediaUploadActionsParams = {
  pageId?: string;
  selectedId: string | null;
  selectedObj: CanvasObject | null;
  objects: CanvasObject[];
  maxVideoBytes: number;
  uploadPhotoToTarget: (targetId: string, file: File) => Promise<void>;
  enqueueItems: (items: VideoQueueItem[]) => void;
  setPlayingVideoId: Dispatch<SetStateAction<string | null>>;
};

type UseCanvasMediaUploadActionsResult = {
  onPickPhoto: (file: File) => Promise<void>;
  enqueueVideoFiles: (files: File[]) => void;
  togglePlaybackForVideo: (id: string) => void;
};

export function useCanvasMediaUploadActions({
  pageId,
  selectedId,
  selectedObj,
  objects,
  maxVideoBytes,
  uploadPhotoToTarget,
  enqueueItems,
  setPlayingVideoId,
}: UseCanvasMediaUploadActionsParams): UseCanvasMediaUploadActionsResult {
  const onPickPhoto = useCallback(
    async (file: File) => {
      if (!selectedId) return;
      if (!pageId) return;
      const sel = objects.find((o) => o.id === selectedId);
      if (!sel || sel.type !== "photo" || isLocked(sel)) return;

      try {
        await uploadPhotoToTarget(selectedId, file);
      } catch {}
    },
    [selectedId, pageId, objects, uploadPhotoToTarget],
  );

  const enqueueVideoFiles = useCallback(
    (files: File[]) => {
      if (!pageId) return;
      if (selectedObj?.type !== "video") return;
      if (isLocked(selectedObj)) return;
      const targetId = selectedObj.id;
      if (!targetId) return;

      const accepted: VideoQueueItem[] = [];
      for (const file of files) {
        if (!file.type.startsWith("video/")) continue;
        if (file.size > maxVideoBytes) {
          const maxMb = (maxVideoBytes / (1024 * 1024)).toFixed(0);
          window.alert(
            `${file.name} supera el límite de este proyecto (${maxMb}MB). Comprime o recorta el video.`,
          );
          continue;
        }
        accepted.push({
          id: newUploadQueueItemId("video"),
          targetId,
          file,
        });
      }
      if (!accepted.length) return;
      enqueueItems(accepted);
    },
    [pageId, selectedObj, maxVideoBytes, enqueueItems],
  );

  const togglePlaybackForVideo = useCallback(
    (id: string) => {
      const item = objects.find((o) => o.id === id);
      if (!item || item.type !== "video" || !item.src) return;
      setPlayingVideoId((prev) => (prev === id ? null : id));
    },
    [objects, setPlayingVideoId],
  );

  return {
    onPickPhoto,
    enqueueVideoFiles,
    togglePlaybackForVideo,
  };
}
