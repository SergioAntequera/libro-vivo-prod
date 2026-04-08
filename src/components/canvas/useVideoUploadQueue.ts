"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { uploadPageVideo } from "@/lib/uploadVideo";
import { UPLOAD_ABORTED_CODE } from "@/lib/storageUploadWithProgress";
import {
  loadUploadQueueSnapshot,
  saveUploadQueueSnapshot,
  type UploadQueueSnapshotItem,
} from "@/lib/persistentUploadQueue";
import { getUploadStatusLabel, type UploadPhase } from "@/lib/uploadStatus";
import { toErrorMessage } from "@/lib/errorMessage";

export type VideoQueueItem = {
  id: string;
  targetId: string;
  file: File;
};

type VideoQueueMeta = {
  targetId: string;
};

type UseVideoUploadQueueParams = {
  pageId?: string;
  hasTarget: (targetId: string) => boolean;
  applyUploadedUrl: (targetId: string, url: string) => void;
  onUploaded?: (targetId: string) => void;
};

export function useVideoUploadQueue(params: UseVideoUploadQueueParams) {
  const { pageId, hasTarget, applyUploadedUrl, onUploaded } = params;

  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUploadPercent, setVideoUploadPercent] = useState(0);
  const [videoUploadLoaded, setVideoUploadLoaded] = useState(0);
  const [videoUploadTotal, setVideoUploadTotal] = useState(0);
  const [videoUploadEtaMs, setVideoUploadEtaMs] = useState<number | null>(null);
  const [videoUploadPhase, setVideoUploadPhase] = useState<UploadPhase | null>(null);
  const [videoQueue, setVideoQueue] = useState<VideoQueueItem[]>([]);
  const [activeVideoItem, setActiveVideoItem] = useState<VideoQueueItem | null>(null);
  const [failedVideoItem, setFailedVideoItem] = useState<VideoQueueItem | null>(null);
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);
  const [videoQueueInfo, setVideoQueueInfo] = useState<string | null>(null);
  const [videoQueueHydrated, setVideoQueueHydrated] = useState(false);
  const videoAbortRef = useRef<(() => void) | null>(null);
  const hasTargetRef = useRef(hasTarget);
  const applyUploadedUrlRef = useRef(applyUploadedUrl);
  const onUploadedRef = useRef(onUploaded);

  const videoQueueStorageKey = useMemo(
    () => (pageId ? `page:${pageId}:video_upload_queue` : null),
    [pageId],
  );

  useEffect(() => {
    hasTargetRef.current = hasTarget;
  }, [hasTarget]);

  useEffect(() => {
    applyUploadedUrlRef.current = applyUploadedUrl;
  }, [applyUploadedUrl]);

  useEffect(() => {
    onUploadedRef.current = onUploaded;
  }, [onUploaded]);

  useEffect(() => {
    return () => {
      videoAbortRef.current?.();
      videoAbortRef.current = null;
    };
  }, []);

  useEffect(() => {
    let active = true;

    setVideoQueue([]);
    setActiveVideoItem(null);
    setFailedVideoItem(null);
    setVideoQueueInfo(null);

    if (!videoQueueStorageKey) {
      setVideoQueueHydrated(false);
      return () => {
        active = false;
      };
    }

    setVideoQueueHydrated(false);
    (async () => {
      try {
        const restored =
          await loadUploadQueueSnapshot<VideoQueueMeta>(videoQueueStorageKey);
        if (!active) return;

        const pending: VideoQueueItem[] = [];
        let failed: VideoQueueItem | null = null;

        for (const entry of restored) {
          const targetIdRaw = entry.meta.targetId;
          const targetId =
            typeof targetIdRaw === "string" ? targetIdRaw.trim() : "";
          if (!targetId) continue;

          const item: VideoQueueItem = {
            id: entry.id,
            targetId,
            file: entry.file,
          };
          if (entry.status === "failed" && !failed) {
            failed = item;
          } else {
            pending.push(item);
          }
        }

        setVideoQueue(pending);
        setFailedVideoItem(failed);
        const recoveredCount = pending.length + (failed ? 1 : 0);
        if (recoveredCount > 0) {
          setVideoQueueInfo(
            `Se recuperaron ${recoveredCount} video(s) pendiente(s) tras recargar.`,
          );
        }
      } catch {
        if (!active) return;
        setVideoQueueInfo("Aviso: no se pudo restaurar la cola local de videos.");
      } finally {
        if (active) setVideoQueueHydrated(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [videoQueueStorageKey]);

  useEffect(() => {
    if (!videoQueueStorageKey || !videoQueueHydrated) return;

    const snapshot: UploadQueueSnapshotItem<VideoQueueMeta>[] = [];
    if (activeVideoItem) {
      snapshot.push({
        id: activeVideoItem.id,
        status: "pending",
        file: activeVideoItem.file,
        meta: { targetId: activeVideoItem.targetId },
      });
    }
    for (const item of videoQueue) {
      snapshot.push({
        id: item.id,
        status: "pending",
        file: item.file,
        meta: { targetId: item.targetId },
      });
    }
    if (failedVideoItem) {
      snapshot.push({
        id: failedVideoItem.id,
        status: "failed",
        file: failedVideoItem.file,
        meta: { targetId: failedVideoItem.targetId },
      });
    }

    const timer = window.setTimeout(() => {
      void saveUploadQueueSnapshot(videoQueueStorageKey, snapshot);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [
    videoQueueStorageKey,
    videoQueueHydrated,
    activeVideoItem,
    videoQueue,
    failedVideoItem,
  ]);

  useEffect(() => {
    if (!videoQueueInfo) return;
    const timer = window.setTimeout(() => setVideoQueueInfo(null), 5200);
    return () => window.clearTimeout(timer);
  }, [videoQueueInfo]);

  useEffect(() => {
    if (!pageId) return;
    if (uploadingVideo) return;
    if (activeVideoItem) return;
    if (!videoQueue.length) return;

    const [next, ...rest] = videoQueue;
    setVideoQueue(rest);
    setActiveVideoItem(next);
  }, [activeVideoItem, pageId, uploadingVideo, videoQueue]);

  useEffect(() => {
    if (!pageId) return;
    if (!activeVideoItem) return;

    let cancelled = false;
    const current = activeVideoItem;

    const run = async () => {
      try {
        setUploadingVideo(true);
        setVideoUploadPercent(0);
        setVideoUploadLoaded(0);
        setVideoUploadTotal(current.file.size);
        setVideoUploadEtaMs(null);
        setVideoUploadPhase("uploading");
        setVideoUploadError(null);

        const url = await uploadPageVideo(pageId, current.file, {
          onProgress: (progress) => {
            setVideoUploadPercent(Math.max(0, Math.min(100, progress.percent)));
            setVideoUploadLoaded(progress.loaded);
            setVideoUploadTotal(progress.total || current.file.size);
            setVideoUploadEtaMs(progress.remainingMs);
          },
          onAbortReady: (abortFn) => {
            videoAbortRef.current = abortFn;
          },
          onPhaseChange: (phase) => {
            setVideoUploadPhase(phase);
          },
        });

        if (cancelled) return;
        if (!hasTargetRef.current(current.targetId)) {
          throw new Error(
            "El card de video ya no existe. Vuelve a crear uno y reintenta.",
          );
        }

        applyUploadedUrlRef.current(current.targetId, url);
        onUploadedRef.current?.(current.targetId);
      } catch (error) {
        if (cancelled) return;
        const message = toErrorMessage(error, "No se pudo subir el video.");
        if (message.includes(UPLOAD_ABORTED_CODE)) {
          setVideoUploadError("Subida cancelada por el usuario.");
        } else {
          setVideoUploadError(message);
          setFailedVideoItem(current);
        }
      } finally {
        if (cancelled) return;
        setUploadingVideo(false);
        setVideoUploadPercent(0);
        setVideoUploadLoaded(0);
        setVideoUploadTotal(0);
        setVideoUploadEtaMs(null);
        setVideoUploadPhase(null);
        setActiveVideoItem(null);
        videoAbortRef.current = null;
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [activeVideoItem, pageId]);

  function enqueueItems(items: VideoQueueItem[]) {
    if (!items.length) return;
    setVideoQueueInfo(null);
    setVideoUploadError(null);
    setFailedVideoItem(null);
    setVideoQueue((prev) => [...prev, ...items]);
  }

  function cancelCurrentVideoUpload() {
    videoAbortRef.current?.();
    videoAbortRef.current = null;
  }

  function retryFailedVideoUpload() {
    if (!failedVideoItem) return;
    setVideoQueueInfo(null);
    setVideoUploadError(null);
    setVideoQueue((prev) => [failedVideoItem, ...prev]);
    setFailedVideoItem(null);
  }

  function clearPendingVideoQueue() {
    setVideoQueueInfo(null);
    setVideoQueue([]);
    setFailedVideoItem(null);
    setVideoUploadError(null);
  }

  return {
    uploadingVideo,
    videoUploadPercent,
    videoUploadLoaded,
    videoUploadTotal,
    videoUploadEtaMs,
    videoUploadPhase,
    videoUploadStatusLabel: getUploadStatusLabel(videoUploadPhase, "Subiendo video..."),
    videoQueue,
    activeVideoItem,
    failedVideoItem,
    videoUploadError,
    videoQueueInfo,
    setVideoUploadError,
    enqueueItems,
    cancelCurrentVideoUpload,
    retryFailedVideoUpload,
    clearPendingVideoQueue,
  };
}
