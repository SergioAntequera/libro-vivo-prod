"use client";

import { useCallback, useEffect, useRef } from "react";
import type { CanvasUploadState } from "@/components/canvas/canvasUploadState";

type UseCanvasUploadStateEmitterParams = {
  onUploadStateChange?: ((state: CanvasUploadState | null) => void) | null;
  uploading: boolean;
  uploadPercent: number;
  uploadLoaded: number;
  uploadTotal: number;
  uploadEtaMs: number | null;
  activeFileName: string | null;
  queueLength: number;
  failedFileName: string | null;
  errorMessage: string | null;
  infoMessage: string | null;
  statusLabel: string | null;
  onCancel: () => void;
  onRetry: () => void;
  onClear: () => void;
};

export function useCanvasUploadStateEmitter(
  params: UseCanvasUploadStateEmitterParams,
) {
  const {
    onUploadStateChange,
    uploading,
    uploadPercent,
    uploadLoaded,
    uploadTotal,
    uploadEtaMs,
    activeFileName,
    queueLength,
    failedFileName,
    errorMessage,
    infoMessage,
    statusLabel,
    onCancel,
    onRetry,
    onClear,
  } = params;

  const cancelRef = useRef(onCancel);
  const retryRef = useRef(onRetry);
  const clearRef = useRef(onClear);
  const listenerRef = useRef(onUploadStateChange);

  useEffect(() => {
    cancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    retryRef.current = onRetry;
  }, [onRetry]);

  useEffect(() => {
    clearRef.current = onClear;
  }, [onClear]);

  useEffect(() => {
    listenerRef.current = onUploadStateChange;
  }, [onUploadStateChange]);

  const emitCancel = useCallback(() => {
    cancelRef.current();
  }, []);

  const emitRetry = useCallback(() => {
    retryRef.current();
  }, []);

  const emitClear = useCallback(() => {
    clearRef.current();
  }, []);

  useEffect(() => {
    const listener = listenerRef.current;
    if (!listener) return;
    listener({
      uploading,
      uploadPercent,
      uploadLoaded,
      uploadTotal,
      uploadEtaMs,
      activeFileName,
      queueLength,
      failedFileName,
      errorMessage,
      infoMessage,
      statusLabel,
      onCancel: emitCancel,
      onRetry: emitRetry,
      onClear: emitClear,
    });
  }, [
    activeFileName,
    emitCancel,
    emitClear,
    emitRetry,
    errorMessage,
    failedFileName,
    infoMessage,
    queueLength,
    statusLabel,
    uploadEtaMs,
    uploadLoaded,
    uploadPercent,
    uploadTotal,
    uploading,
  ]);

  useEffect(() => {
    return () => {
      listenerRef.current?.(null);
    };
  }, []);
}
