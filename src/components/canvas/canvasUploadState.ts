"use client";

export type CanvasUploadState = {
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
