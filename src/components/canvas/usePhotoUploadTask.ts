"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { uploadPagePhoto } from "@/lib/uploadPhoto";
import { UPLOAD_ABORTED_CODE } from "@/lib/storageUploadWithProgress";
import { getUploadStatusLabel, type UploadPhase } from "@/lib/uploadStatus";
import { toErrorMessage } from "@/lib/errorMessage";

type PhotoUploadItem = {
  targetId: string;
  file: File;
};

type UsePhotoUploadTaskParams = {
  pageId?: string;
  hasTarget: (targetId: string) => boolean;
  applyUploadedUrl: (targetId: string, url: string) => void;
};

export function usePhotoUploadTask(params: UsePhotoUploadTaskParams) {
  const { pageId, hasTarget, applyUploadedUrl } = params;

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUploadPercent, setPhotoUploadPercent] = useState(0);
  const [photoUploadLoaded, setPhotoUploadLoaded] = useState(0);
  const [photoUploadTotal, setPhotoUploadTotal] = useState(0);
  const [photoUploadEtaMs, setPhotoUploadEtaMs] = useState<number | null>(null);
  const [photoUploadPhase, setPhotoUploadPhase] = useState<UploadPhase | null>(null);
  const [activePhotoItem, setActivePhotoItem] = useState<PhotoUploadItem | null>(null);
  const [failedPhotoItem, setFailedPhotoItem] = useState<PhotoUploadItem | null>(null);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [photoUploadInfo, setPhotoUploadInfo] = useState<string | null>(null);

  const photoAbortRef = useRef<(() => void) | null>(null);
  const hasTargetRef = useRef(hasTarget);
  const applyUploadedUrlRef = useRef(applyUploadedUrl);

  useEffect(() => {
    hasTargetRef.current = hasTarget;
  }, [hasTarget]);

  useEffect(() => {
    applyUploadedUrlRef.current = applyUploadedUrl;
  }, [applyUploadedUrl]);

  useEffect(() => {
    if (!photoUploadInfo) return;
    const timer = window.setTimeout(() => setPhotoUploadInfo(null), 5200);
    return () => window.clearTimeout(timer);
  }, [photoUploadInfo]);

  useEffect(() => {
    return () => {
      photoAbortRef.current?.();
      photoAbortRef.current = null;
    };
  }, []);

  const resetProgress = useCallback(() => {
    setPhotoUploadPercent(0);
    setPhotoUploadLoaded(0);
    setPhotoUploadTotal(0);
    setPhotoUploadEtaMs(null);
    setPhotoUploadPhase(null);
  }, []);

  const uploadPhotoToTarget = useCallback(
    async (targetId: string, file: File) => {
      if (!pageId || !targetId || uploadingPhoto) return;

      const currentItem = { targetId, file };
      setPhotoUploadInfo(null);
      setPhotoUploadError(null);
      setFailedPhotoItem(null);
      setActivePhotoItem(currentItem);
      setUploadingPhoto(true);
      setPhotoUploadPercent(0);
      setPhotoUploadLoaded(0);
      setPhotoUploadTotal(file.size);
      setPhotoUploadEtaMs(null);
      setPhotoUploadPhase("uploading");

      try {
        const url = await uploadPagePhoto(pageId, file, {
          onProgress: (progress) => {
            setPhotoUploadPercent(Math.max(0, Math.min(100, progress.percent)));
            setPhotoUploadLoaded(progress.loaded);
            setPhotoUploadTotal(progress.total || file.size);
            setPhotoUploadEtaMs(progress.remainingMs);
          },
          onAbortReady: (abortFn) => {
            photoAbortRef.current = abortFn;
          },
          onPhaseChange: (phase) => {
            setPhotoUploadPhase(phase);
          },
        });

        if (!hasTargetRef.current(targetId)) {
          throw new Error("El marco de foto ya no existe. Vuelve a crearlo y reintenta.");
        }

        applyUploadedUrlRef.current(targetId, url);
        setPhotoUploadInfo("Foto subida OK");
      } catch (error) {
        const message = toErrorMessage(error, "No se pudo subir la foto.");
        if (message.includes(UPLOAD_ABORTED_CODE)) {
          setPhotoUploadError("Subida cancelada por el usuario.");
          setPhotoUploadInfo("Subida cancelada.");
        } else {
          setPhotoUploadError(message);
          setFailedPhotoItem(currentItem);
        }
      } finally {
        setUploadingPhoto(false);
        setActivePhotoItem(null);
        photoAbortRef.current = null;
        resetProgress();
      }
    },
    [pageId, resetProgress, uploadingPhoto],
  );

  const cancelCurrentPhotoUpload = useCallback(() => {
    photoAbortRef.current?.();
    photoAbortRef.current = null;
  }, []);

  const retryFailedPhotoUpload = useCallback(async () => {
    if (!failedPhotoItem) return;
    const retryItem = failedPhotoItem;
    setFailedPhotoItem(null);
    setPhotoUploadError(null);
    await uploadPhotoToTarget(retryItem.targetId, retryItem.file);
  }, [failedPhotoItem, uploadPhotoToTarget]);

  const clearPhotoUploadState = useCallback(() => {
    setPhotoUploadInfo(null);
    setPhotoUploadError(null);
    setFailedPhotoItem(null);
  }, []);

  return {
    uploadingPhoto,
    photoUploadPercent,
    photoUploadLoaded,
    photoUploadTotal,
    photoUploadEtaMs,
    photoUploadPhase,
    photoUploadStatusLabel: getUploadStatusLabel(photoUploadPhase, "Subiendo foto..."),
    activePhotoItem,
    failedPhotoItem,
    photoUploadError,
    photoUploadInfo,
    uploadPhotoToTarget,
    cancelCurrentPhotoUpload,
    retryFailedPhotoUpload,
    clearPhotoUploadState,
  };
}
