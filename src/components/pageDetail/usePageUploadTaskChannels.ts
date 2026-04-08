"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  CanvasPhotoUploadState,
  CanvasVideoUploadState,
} from "@/components/canvas/CanvasEditor";
import type { UploadTaskChannel } from "@/components/ui/UploadTaskCenter";

type UsePageUploadTaskChannelsParams = {
  uploadingAudio: boolean;
  audioUploadPercent: number;
  audioUploadLoaded: number;
  audioUploadTotal: number;
  audioUploadEtaMs: number | null;
  activeAudioFileName: string | null;
  audioQueueLength: number;
  failedAudioFileName: string | null;
  audioUploadError: string | null;
  audioQueueInfo: string | null;
  audioUploadStatusLabel: string | null;
  cancelCurrentAudioUpload: (() => void) | undefined;
  retryFailedAudioUpload: (() => void) | undefined;
  clearAudioUploadQueue: (() => void) | undefined;
};

function isSameCanvasUploadState(
  prev: CanvasPhotoUploadState | CanvasVideoUploadState | null,
  next: CanvasPhotoUploadState | CanvasVideoUploadState | null,
) {
  if (prev === next) return true;
  if (!prev || !next) return false;
  return (
    prev.uploading === next.uploading &&
    prev.uploadPercent === next.uploadPercent &&
    prev.uploadLoaded === next.uploadLoaded &&
    prev.uploadTotal === next.uploadTotal &&
    prev.uploadEtaMs === next.uploadEtaMs &&
    prev.activeFileName === next.activeFileName &&
    prev.queueLength === next.queueLength &&
    prev.failedFileName === next.failedFileName &&
    prev.errorMessage === next.errorMessage &&
    prev.infoMessage === next.infoMessage &&
    prev.statusLabel === next.statusLabel &&
    prev.onCancel === next.onCancel &&
    prev.onRetry === next.onRetry &&
    prev.onClear === next.onClear
  );
}

export function usePageUploadTaskChannels({
  uploadingAudio,
  audioUploadPercent,
  audioUploadLoaded,
  audioUploadTotal,
  audioUploadEtaMs,
  activeAudioFileName,
  audioQueueLength,
  failedAudioFileName,
  audioUploadError,
  audioQueueInfo,
  audioUploadStatusLabel,
  cancelCurrentAudioUpload,
  retryFailedAudioUpload,
  clearAudioUploadQueue,
}: UsePageUploadTaskChannelsParams) {
  const [canvasPhotoUploadState, setCanvasPhotoUploadState] =
    useState<CanvasPhotoUploadState | null>(null);
  const [canvasVideoUploadState, setCanvasVideoUploadState] =
    useState<CanvasVideoUploadState | null>(null);

  const uploadTaskChannels = useMemo(() => {
    const channels: UploadTaskChannel[] = [
      {
        id: "audio",
        label: "Audio",
        uploading: uploadingAudio,
        uploadPercent: audioUploadPercent,
        uploadLoaded: audioUploadLoaded,
        uploadTotal: audioUploadTotal,
        uploadEtaMs: audioUploadEtaMs,
        activeFileName: activeAudioFileName,
        queueLength: audioQueueLength,
        failedFileName: failedAudioFileName,
        errorMessage: audioUploadError,
        infoMessage: audioQueueInfo,
        statusLabel: audioUploadStatusLabel,
        onCancel: cancelCurrentAudioUpload,
        onRetry: retryFailedAudioUpload,
        onClear: clearAudioUploadQueue,
      },
    ];

    if (canvasPhotoUploadState) {
      channels.push({
        id: "photo",
        label: "Foto",
        uploading: canvasPhotoUploadState.uploading,
        uploadPercent: canvasPhotoUploadState.uploadPercent,
        uploadLoaded: canvasPhotoUploadState.uploadLoaded,
        uploadTotal: canvasPhotoUploadState.uploadTotal,
        uploadEtaMs: canvasPhotoUploadState.uploadEtaMs,
        activeFileName: canvasPhotoUploadState.activeFileName,
        queueLength: canvasPhotoUploadState.queueLength,
        failedFileName: canvasPhotoUploadState.failedFileName,
        errorMessage: canvasPhotoUploadState.errorMessage,
        infoMessage: canvasPhotoUploadState.infoMessage,
        statusLabel: canvasPhotoUploadState.statusLabel,
        onCancel: canvasPhotoUploadState.onCancel,
        onRetry: canvasPhotoUploadState.onRetry,
        onClear: canvasPhotoUploadState.onClear,
      });
    }

    if (canvasVideoUploadState) {
      channels.push({
        id: "video",
        label: "Video",
        uploading: canvasVideoUploadState.uploading,
        uploadPercent: canvasVideoUploadState.uploadPercent,
        uploadLoaded: canvasVideoUploadState.uploadLoaded,
        uploadTotal: canvasVideoUploadState.uploadTotal,
        uploadEtaMs: canvasVideoUploadState.uploadEtaMs,
        activeFileName: canvasVideoUploadState.activeFileName,
        queueLength: canvasVideoUploadState.queueLength,
        failedFileName: canvasVideoUploadState.failedFileName,
        errorMessage: canvasVideoUploadState.errorMessage,
        infoMessage: canvasVideoUploadState.infoMessage,
        statusLabel: canvasVideoUploadState.statusLabel,
        onCancel: canvasVideoUploadState.onCancel,
        onRetry: canvasVideoUploadState.onRetry,
        onClear: canvasVideoUploadState.onClear,
      });
    }

    return channels;
  }, [
    activeAudioFileName,
    audioQueueInfo,
    audioQueueLength,
    audioUploadError,
    audioUploadEtaMs,
    audioUploadLoaded,
    audioUploadPercent,
    audioUploadStatusLabel,
    audioUploadTotal,
    cancelCurrentAudioUpload,
    canvasPhotoUploadState,
    canvasVideoUploadState,
    clearAudioUploadQueue,
    failedAudioFileName,
    retryFailedAudioUpload,
    uploadingAudio,
  ]);

  const handleCanvasPhotoUploadStateChange = useCallback(
    (nextState: CanvasPhotoUploadState | null) => {
      setCanvasPhotoUploadState((prev) => {
        if (isSameCanvasUploadState(prev, nextState)) return prev;
        return nextState;
      });
    },
    [],
  );

  const handleCanvasVideoUploadStateChange = useCallback(
    (nextState: CanvasVideoUploadState | null) => {
      setCanvasVideoUploadState((prev) => {
        if (isSameCanvasUploadState(prev, nextState)) return prev;
        return nextState;
      });
    },
    [],
  );

  return {
    canvasPhotoUploadState,
    canvasVideoUploadState,
    uploadTaskChannels,
    handleCanvasPhotoUploadStateChange,
    handleCanvasVideoUploadStateChange,
  };
}
