"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { uploadPageAudio } from "@/lib/uploadAudio";
import { UPLOAD_ABORTED_CODE } from "@/lib/storageUploadWithProgress";
import {
  loadUploadQueueSnapshot,
  newUploadQueueItemId,
  saveUploadQueueSnapshot,
} from "@/lib/persistentUploadQueue";
import {
  buildAudioQueueSnapshot,
  fileExtensionFromMimeType,
  getAudioValidationError,
  getErrorMessage,
  getErrorName,
  isMissingAudioColumnsError,
  parseAudioQueueSnapshot,
  pickRecordingMimeType,
  type PageAudioQueueItem,
  type PageAudioQueueMeta,
} from "@/lib/pageDetailUtils";
import { getUploadStatusLabel, type UploadPhase } from "@/lib/uploadStatus";
import {
  deleteManagedMediaForPage,
  describeManagedMediaDeleteError,
} from "@/lib/deleteManagedMedia";
import { parseYouTubeVideoId } from "@/lib/youtubeUtils";

const MISSING_AUDIO_COLUMNS_MSG =
  "Faltan columnas de audio en pages. Ejecuta: supabase/sql/2026-03-06_page_audio_support.sql";

type PageAudioPatch = {
  audio_url: string | null;
  audio_label: string | null;
};

type UpdatePageFn = (
  payload: Record<string, unknown>,
) => Promise<{ error: { message: string } | null }>;

type UsePageAudioControllerParams = {
  pageId: string;
  hasPage: boolean;
  updatePage: UpdatePageFn;
  onPatchPage: (patch: PageAudioPatch) => void;
  onMessage: (message: string | null) => void;
};

type LoadedAudioState = {
  audioReady: boolean;
  audioUrl: string;
  audioLabel: string;
};

async function verifyExternalAudioUrl(nextUrl: string) {
  if (typeof window === "undefined") return true;
  if (parseYouTubeVideoId(nextUrl)) return true;

  await new Promise<void>((resolve, reject) => {
    const audio = new Audio();
    const cleanup = () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    };
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(
        new Error(
          "No hemos podido cargar esa URL directamente. Usa un enlace directo a .mp3/.wav/.m4a o una URL de YouTube.",
        ),
      );
    }, 5000);

    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      window.clearTimeout(timeout);
      cleanup();
      resolve();
    };
    audio.onerror = () => {
      window.clearTimeout(timeout);
      cleanup();
      reject(
        new Error(
          "La URL no parece reproducible desde el navegador. Necesitamos un archivo de audio directo o una URL de YouTube.",
        ),
      );
    };
    audio.src = nextUrl;
    audio.load();
  });
}

export function usePageAudioController({
  pageId,
  hasPage,
  updatePage,
  onPatchPage,
  onMessage,
}: UsePageAudioControllerParams) {
  const [audioUrl, setAudioUrl] = useState("");
  const [audioLabel, setAudioLabel] = useState("");
  const [audioFieldsAvailable, setAudioFieldsAvailable] = useState(true);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [audioUploadPercent, setAudioUploadPercent] = useState(0);
  const [audioUploadLoaded, setAudioUploadLoaded] = useState(0);
  const [audioUploadTotal, setAudioUploadTotal] = useState(0);
  const [audioUploadEtaMs, setAudioUploadEtaMs] = useState<number | null>(null);
  const [audioUploadPhase, setAudioUploadPhase] = useState<UploadPhase | null>(null);
  const [audioQueue, setAudioQueue] = useState<PageAudioQueueItem[]>([]);
  const [activeAudioItem, setActiveAudioItem] = useState<PageAudioQueueItem | null>(null);
  const [failedAudioItem, setFailedAudioItem] = useState<PageAudioQueueItem | null>(null);
  const [audioUploadError, setAudioUploadError] = useState<string | null>(null);
  const [audioQueueInfo, setAudioQueueInfo] = useState<string | null>(null);
  const [audioQueueHydrated, setAudioQueueHydrated] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [canRecordAudio, setCanRecordAudio] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const shouldUploadRecordedAudioRef = useRef(true);
  const audioAbortRef = useRef<(() => void) | null>(null);
  const updatePageRef = useRef(updatePage);
  const onPatchPageRef = useRef(onPatchPage);
  const onMessageRef = useRef(onMessage);
  const audioLabelRef = useRef(audioLabel);
  const audioUrlRef = useRef(audioUrl);

  const audioQueueStorageKey = useMemo(() => `page:${pageId}:audio_upload_queue`, [pageId]);

  const applyLoadedAudio = useCallback((input: LoadedAudioState) => {
    const { audioReady, audioUrl: nextUrl, audioLabel: nextLabel } = input;
    setAudioFieldsAvailable(audioReady);
    setAudioUrl(audioReady ? nextUrl : "");
    setAudioLabel(audioReady ? nextLabel : "");
  }, []);

  function stopRecordingStream() {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
  }

  function resetUploadProgress() {
    setAudioUploadPercent(0);
    setAudioUploadLoaded(0);
    setAudioUploadTotal(0);
    setAudioUploadEtaMs(null);
    setAudioUploadPhase(null);
  }

  useEffect(() => {
    updatePageRef.current = updatePage;
  }, [updatePage]);

  useEffect(() => {
    onPatchPageRef.current = onPatchPage;
  }, [onPatchPage]);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    audioLabelRef.current = audioLabel;
  }, [audioLabel]);

  useEffect(() => {
    audioUrlRef.current = audioUrl;
  }, [audioUrl]);

  const deleteManagedAudioIfNeeded = useCallback(
    async (url: string | null | undefined) => {
      const nextUrl = String(url ?? "").trim();
      if (!nextUrl) return true;
      try {
        await deleteManagedMediaForPage(pageId, nextUrl);
        return true;
      } catch (error) {
        onMessageRef.current(describeManagedMediaDeleteError(error));
        return false;
      }
    },
    [pageId],
  );

  const enqueueAudioFiles = useCallback((files: File[]) => {
    if (!hasPage) return;
    if (!audioFieldsAvailable) {
      onMessage(MISSING_AUDIO_COLUMNS_MSG);
      return;
    }

    const accepted: PageAudioQueueItem[] = [];
    for (const file of files) {
      const validationError = getAudioValidationError(file);
      if (validationError) {
        onMessage(validationError);
        continue;
      }
      accepted.push({
        id: newUploadQueueItemId("audio"),
        file,
      });
    }
    if (!accepted.length) return;

    setAudioQueueInfo(null);
    setAudioUploadError(null);
    setFailedAudioItem(null);
    setAudioQueue((prev) => [...prev, ...accepted]);
  }, [audioFieldsAvailable, hasPage, onMessage]);

  const startAudioRecording = useCallback(async () => {
    if (!hasPage) return;
    if (!audioFieldsAvailable) {
      onMessage(MISSING_AUDIO_COLUMNS_MSG);
      return;
    }
    if (!canRecordAudio || !navigator.mediaDevices?.getUserMedia) {
      onMessage("Tu navegador no soporta grabacion directa. Usa el selector de archivo.");
      return;
    }
    if (uploadingAudio) return;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") return;

    onMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMimeType = pickRecordingMimeType();
      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      shouldUploadRecordedAudioRef.current = true;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setIsRecordingAudio(false);
        stopRecordingStream();
        onMessage("Error grabando audio.");
      };

      recorder.onstop = async () => {
        const shouldUpload = shouldUploadRecordedAudioRef.current;
        const chunks = [...audioChunksRef.current];
        audioChunksRef.current = [];
        setIsRecordingAudio(false);

        const finalMimeType = recorder.mimeType || preferredMimeType || "audio/webm";
        stopRecordingStream();

        if (!shouldUpload || chunks.length === 0) return;
        const blob = new Blob(chunks, { type: finalMimeType });
        if (!blob.size) return;

        const ext = fileExtensionFromMimeType(blob.type || finalMimeType);
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const file = new File([blob], `recording_${stamp}.${ext}`, {
          type: blob.type || finalMimeType,
        });
        enqueueAudioFiles([file]);
      };

      recorder.start(250);
      setIsRecordingAudio(true);
      onMessage("Grabando audio...");
    } catch (error: unknown) {
      setIsRecordingAudio(false);
      stopRecordingStream();
      const errorName = getErrorName(error);
      if (errorName === "NotAllowedError") {
        onMessage("Permiso de microfono denegado.");
      } else if (errorName === "NotFoundError") {
        onMessage("No se encontro microfono en el dispositivo.");
      } else {
        onMessage(getErrorMessage(error, "No se pudo iniciar la grabacion."));
      }
    }
  }, [
    audioFieldsAvailable,
    canRecordAudio,
    enqueueAudioFiles,
    hasPage,
    onMessage,
    uploadingAudio,
  ]);

  const stopAudioRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    shouldUploadRecordedAudioRef.current = true;
    recorder.stop();
    onMessage("Procesando grabacion...");
  }, [onMessage]);

  const cancelCurrentAudioUpload = useCallback(() => {
    audioAbortRef.current?.();
    audioAbortRef.current = null;
  }, []);

  const retryFailedAudioUpload = useCallback(() => {
    if (!failedAudioItem) return;
    setAudioQueueInfo(null);
    setAudioUploadError(null);
    setAudioQueue((prev) => [failedAudioItem, ...prev]);
    setFailedAudioItem(null);
  }, [failedAudioItem]);

  const clearAudioUploadQueue = useCallback(() => {
    setAudioQueueInfo(null);
    setAudioQueue([]);
    setFailedAudioItem(null);
    setAudioUploadError(null);
  }, []);

  const clearAudio = useCallback(async () => {
    onMessage(null);
    if (!audioFieldsAvailable) {
      setAudioUrl("");
      setAudioLabel("");
      return;
    }

    const { error } = await updatePage({
      audio_url: null,
      audio_label: null,
    });

    if (error && isMissingAudioColumnsError(error.message)) {
      setAudioFieldsAvailable(false);
      setAudioUrl("");
      setAudioLabel("");
      return;
    }
    if (error) {
      onMessage(error.message);
      return;
    }

    setAudioUrl("");
    setAudioLabel("");
    onPatchPage({
      audio_url: null,
      audio_label: null,
    });
    void deleteManagedAudioIfNeeded(audioUrlRef.current);
  }, [audioFieldsAvailable, deleteManagedAudioIfNeeded, onMessage, onPatchPage, updatePage]);

  const saveExternalAudioUrl = useCallback(async (externalUrl: string) => {
    onMessage(null);

    if (!audioFieldsAvailable) {
      onMessage(MISSING_AUDIO_COLUMNS_MSG);
      return false;
    }

    const nextUrl = externalUrl.trim();
    if (!nextUrl) {
      await clearAudio();
      return true;
    }
    if (!/^https?:\/\//i.test(nextUrl)) {
      onMessage("La URL de audio debe empezar por http:// o https://");
      return false;
    }

    const isYouTube = parseYouTubeVideoId(nextUrl) !== null;
    if (!isYouTube) {
      const AUDIO_EXTENSIONS = /\.(mp3|wav|ogg|m4a|aac|webm|flac)(\?.*)?$/i;
      if (!AUDIO_EXTENSIONS.test(nextUrl)) {
        onMessage(
          "Aviso: la URL no parece apuntar a un archivo de audio conocido (.mp3, .wav, .ogg, etc.). La comprobaremos antes de guardarla.",
        );
      }
      await verifyExternalAudioUrl(nextUrl);
    }

    setUploadingAudio(true);
    resetUploadProgress();
    setAudioUploadPhase("uploading");
    try {
      const nextLabel = audioLabel.trim() || "Audio externo";
      const { error } = await updatePage({
        audio_url: nextUrl,
        audio_label: nextLabel,
      });

      if (error && isMissingAudioColumnsError(error.message)) {
        setAudioFieldsAvailable(false);
        throw new Error(MISSING_AUDIO_COLUMNS_MSG);
      }
      if (error) throw error;

      setAudioUrl(nextUrl);
      setAudioLabel(nextLabel);
      onPatchPage({
        audio_url: nextUrl,
        audio_label: nextLabel,
      });
      if (audioUrlRef.current && audioUrlRef.current !== nextUrl) {
        void deleteManagedAudioIfNeeded(audioUrlRef.current);
      }
      onMessage("URL de audio guardada OK");
      return true;
    } catch (error: unknown) {
      onMessage(getErrorMessage(error, "No se pudo guardar la URL de audio."));
      return false;
    } finally {
      setUploadingAudio(false);
    }
  }, [
    audioFieldsAvailable,
    audioLabel,
    clearAudio,
    deleteManagedAudioIfNeeded,
    onMessage,
    onPatchPage,
    updatePage,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCanRecordAudio(
      typeof MediaRecorder !== "undefined" &&
        Boolean(navigator.mediaDevices?.getUserMedia),
    );

    return () => {
      shouldUploadRecordedAudioRef.current = false;
      audioAbortRef.current?.();
      audioAbortRef.current = null;
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      mediaRecorderRef.current = null;
      mediaStreamRef.current = null;
      audioChunksRef.current = [];
    };
  }, []);

  useEffect(() => {
    let active = true;

    setAudioQueue([]);
    setActiveAudioItem(null);
    setFailedAudioItem(null);
    setAudioQueueInfo(null);
    setAudioQueueHydrated(false);

    (async () => {
      try {
        const restored =
          await loadUploadQueueSnapshot<PageAudioQueueMeta>(audioQueueStorageKey);
        if (!active) return;

        const { pending, failed, recoveredCount } = parseAudioQueueSnapshot(
          restored,
        );

        setAudioQueue(pending);
        setFailedAudioItem(failed);

        if (recoveredCount > 0) {
          setAudioQueueInfo(
            `Se recuperaron ${recoveredCount} audio(s) pendiente(s) tras recargar.`,
          );
        }
      } catch {
        if (!active) return;
        setAudioQueueInfo("Aviso: no se pudo restaurar la cola local de audio.");
      } finally {
        if (active) setAudioQueueHydrated(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [audioQueueStorageKey]);

  useEffect(() => {
    if (!audioQueueHydrated) return;

    const snapshot = buildAudioQueueSnapshot(
      activeAudioItem,
      audioQueue,
      failedAudioItem,
    );

    const timer = window.setTimeout(() => {
      void saveUploadQueueSnapshot(audioQueueStorageKey, snapshot);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [
    audioQueueHydrated,
    audioQueueStorageKey,
    activeAudioItem,
    audioQueue,
    failedAudioItem,
  ]);

  useEffect(() => {
    if (!audioQueueInfo) return;
    const timer = window.setTimeout(() => setAudioQueueInfo(null), 5200);
    return () => window.clearTimeout(timer);
  }, [audioQueueInfo]);

  useEffect(() => {
    if (!hasPage) return;
    if (uploadingAudio) return;
    if (activeAudioItem) return;
    if (!audioQueue.length) return;

    const [next, ...rest] = audioQueue;
    setAudioQueue(rest);
    setActiveAudioItem(next);
  }, [activeAudioItem, audioQueue, hasPage, uploadingAudio]);

  useEffect(() => {
    if (!pageId) return;
    if (!activeAudioItem) return;

    let cancelled = false;
    const run = async () => {
      const file = activeAudioItem.file;
      setUploadingAudio(true);
      setAudioUploadPercent(0);
      setAudioUploadLoaded(0);
      setAudioUploadTotal(file.size);
      setAudioUploadEtaMs(null);
      setAudioUploadPhase("uploading");
      onMessageRef.current(null);
      setAudioUploadError(null);

      try {
        const url = await uploadPageAudio(pageId, file, {
          onProgress: (progress) => {
            setAudioUploadPercent(Math.max(0, Math.min(100, progress.percent)));
            setAudioUploadLoaded(progress.loaded);
            setAudioUploadTotal(progress.total || file.size);
            setAudioUploadEtaMs(progress.remainingMs);
          },
          onAbortReady: (abortFn) => {
            audioAbortRef.current = abortFn;
          },
          onPhaseChange: (phase) => {
            setAudioUploadPhase(phase);
          },
        });
        if (cancelled) return;

        const nextLabel = audioLabelRef.current.trim() || file.name;
        const { error } = await updatePageRef.current({
          audio_url: url,
          audio_label: nextLabel,
        });

        if (error && isMissingAudioColumnsError(error.message)) {
          setAudioFieldsAvailable(false);
          throw new Error(MISSING_AUDIO_COLUMNS_MSG);
        }
        if (error) throw error;

        setAudioUrl(url);
        setAudioLabel(nextLabel);
        onPatchPageRef.current({
          audio_url: url,
          audio_label: nextLabel,
        });
        if (audioUrlRef.current && audioUrlRef.current !== url) {
          void deleteManagedAudioIfNeeded(audioUrlRef.current);
        }
        onMessageRef.current("Audio subido OK");
      } catch (error: unknown) {
        if (cancelled) return;
        const message = getErrorMessage(error, "No se pudo subir el audio.");
        if (message.includes(UPLOAD_ABORTED_CODE)) {
          setAudioUploadError("Subida cancelada por el usuario.");
          onMessageRef.current("Subida cancelada.");
        } else {
          setAudioUploadError(message);
          setFailedAudioItem(activeAudioItem);
          onMessageRef.current(message);
        }
      } finally {
        if (cancelled) return;
        setUploadingAudio(false);
        resetUploadProgress();
        setActiveAudioItem(null);
        audioAbortRef.current = null;
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [activeAudioItem, deleteManagedAudioIfNeeded, pageId]);

  return {
    audioUrl,
    audioLabel,
    setAudioLabel,
    audioFieldsAvailable,
    setAudioFieldsAvailable,
    uploadingAudio,
    audioUploadPercent,
    audioUploadLoaded,
    audioUploadTotal,
    audioUploadEtaMs,
    audioUploadPhase,
    audioUploadStatusLabel: getUploadStatusLabel(audioUploadPhase, "Subiendo audio..."),
    audioQueue,
    activeAudioItem,
    failedAudioItem,
    audioUploadError,
    audioQueueInfo,
    isRecordingAudio,
    canRecordAudio,
    applyLoadedAudio,
    enqueueAudioFiles,
    startAudioRecording,
    stopAudioRecording,
    cancelCurrentAudioUpload,
    retryFailedAudioUpload,
    clearAudioUploadQueue,
    clearAudio,
    saveExternalAudioUrl,
  };
}
