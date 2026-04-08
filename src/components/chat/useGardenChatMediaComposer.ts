"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type RefObject,
} from "react";
import { toErrorMessage } from "@/lib/errorMessage";
import {
  classifyGardenChatAttachmentKind,
  readGardenChatMediaDurationMs,
  type GardenChatAttachmentKind,
} from "@/lib/gardenChatMedia";
import { uploadGardenChatMedia } from "@/lib/gardenChatMediaUpload";
import { sendGardenChatUploadedMediaMessage } from "@/lib/gardenChatMutations";
import { UPLOAD_ABORTED_CODE, type UploadProgress } from "@/lib/storageUploadWithProgress";
import { getUploadStatusLabel, type UploadPhase } from "@/lib/uploadStatus";

type QueueItem = {
  id: string;
  file: File;
  messageKind: "voice_note" | "attachment";
  attachmentKind: GardenChatAttachmentKind;
};

type UseGardenChatMediaComposerParams = {
  roomId: string | null;
  gardenId: string | null;
  myProfileId: string | null;
};

type UseGardenChatMediaComposerResult = {
  fileInputRef: RefObject<HTMLInputElement | null>;
  canRecordAudio: boolean;
  isRecordingAudio: boolean;
  uploadingMedia: boolean;
  mediaStatusLabel: string | null;
  mediaError: string | null;
  queuedItems: number;
  pendingQueueItems: number;
  failedMediaLabel: string | null;
  canRetryFailedMedia: boolean;
  canCancelUpload: boolean;
  openFilePicker: () => void;
  handleFileInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  startVoiceRecording: () => Promise<void>;
  stopVoiceRecording: () => void;
  cancelVoiceRecording: () => void;
  cancelCurrentUpload: () => void;
  retryFailedMedia: () => void;
  clearPendingQueue: () => void;
  clearMediaError: () => void;
};

function buildQueueItemId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `chat-media-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildVoiceRecordingFile(blob: Blob, mimeType: string) {
  const extension =
    mimeType.includes("ogg")
      ? "ogg"
      : mimeType.includes("mpeg")
        ? "mp3"
        : mimeType.includes("mp4") || mimeType.includes("aac")
          ? "m4a"
          : "webm";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return new File([blob], `voice-note-${stamp}.${extension}`, { type: mimeType });
}

function pickRecordingMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/mp4",
    "audio/webm",
    "audio/ogg;codecs=opus",
  ];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
}

function formatCompactRemainingTime(remainingMs: number | null) {
  if (remainingMs == null || remainingMs <= 0) return null;
  const totalSeconds = Math.max(1, Math.round(remainingMs / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s restantes`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")} restantes`;
}

function buildUploadStatusLabel(input: {
  activeItem: QueueItem | null;
  phase: UploadPhase | null;
  progress: UploadProgress | null;
}) {
  const item = input.activeItem;
  if (!item) return null;

  const baseLabel =
    item.messageKind === "voice_note"
      ? "nota de voz"
      : item.file.name;

  const phaseLabel = getUploadStatusLabel(
    input.phase,
    item.messageKind === "voice_note"
      ? "Subiendo nota de voz..."
      : `Subiendo ${baseLabel}...`,
  );

  if (input.phase === "processing") {
    return phaseLabel;
  }

  const progress = input.progress;
  if (!progress) return phaseLabel;

  const parts = [`${Math.round(progress.percent)}%`];
  const remaining = formatCompactRemainingTime(progress.remainingMs);
  if (remaining) parts.push(remaining);

  return `${phaseLabel.replace(/\.\.\.$/, "")} · ${parts.join(" · ")}`;
}

export function useGardenChatMediaComposer({
  roomId,
  gardenId,
  myProfileId,
}: UseGardenChatMediaComposerParams): UseGardenChatMediaComposerResult {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const uploadAbortRef = useRef<(() => void) | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const shouldEnqueueRecordedAudioRef = useRef(true);

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activeItem, setActiveItem] = useState<QueueItem | null>(null);
  const [failedItem, setFailedItem] = useState<QueueItem | null>(null);
  const [activeProgress, setActiveProgress] = useState<UploadProgress | null>(null);
  const [activeUploadPhase, setActiveUploadPhase] = useState<UploadPhase | null>(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [canRecordAudio, setCanRecordAudio] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaStatusLabel, setMediaStatusLabel] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const stopRecordingStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
  }, []);

  const enqueueFiles = useCallback((files: File[], messageKind: QueueItem["messageKind"]) => {
    const nextItems = files
      .filter((file) => file.size > 0)
      .map((file) => ({
        id: buildQueueItemId(),
        file,
        messageKind,
        attachmentKind:
          messageKind === "voice_note" ? "audio" : classifyGardenChatAttachmentKind(file),
      }));

    if (!nextItems.length) return;
    setMediaError(null);
    setFailedItem(null);
    setMediaStatusLabel(null);
    setQueue((current) => [...current, ...nextItems]);
  }, []);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = [...(event.target.files ?? [])];
      enqueueFiles(files, "attachment");
      event.target.value = "";
    },
    [enqueueFiles],
  );

  const startVoiceRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaError("Tu navegador no soporta grabacion directa.");
      return;
    }
    if (uploadingMedia) return;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") return;

    setMediaError(null);
    setFailedItem(null);
    setMediaStatusLabel(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMimeType = pickRecordingMimeType();
      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      shouldEnqueueRecordedAudioRef.current = true;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setIsRecordingAudio(false);
        stopRecordingStream();
        setMediaError("No se pudo completar la grabacion.");
      };

      recorder.onstop = () => {
        const shouldEnqueue = shouldEnqueueRecordedAudioRef.current;
        const chunks = [...audioChunksRef.current];
        audioChunksRef.current = [];
        setIsRecordingAudio(false);

        const finalMimeType = recorder.mimeType || preferredMimeType || "audio/webm";
        stopRecordingStream();

        if (!shouldEnqueue) {
          setMediaStatusLabel("Grabacion descartada.");
          return;
        }
        if (!chunks.length) return;
        const blob = new Blob(chunks, { type: finalMimeType });
        if (!blob.size) return;
        enqueueFiles([buildVoiceRecordingFile(blob, finalMimeType)], "voice_note");
      };

      recorder.start(250);
      setIsRecordingAudio(true);
      setMediaStatusLabel("Grabando nota de voz...");
    } catch (error) {
      stopRecordingStream();
      setIsRecordingAudio(false);
      setMediaError(toErrorMessage(error, "No se pudo iniciar la grabacion."));
    }
  }, [enqueueFiles, stopRecordingStream, uploadingMedia]);

  const stopVoiceRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    shouldEnqueueRecordedAudioRef.current = true;
    recorder.stop();
    setMediaStatusLabel("Procesando nota de voz...");
  }, []);

  const cancelVoiceRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    shouldEnqueueRecordedAudioRef.current = false;
    recorder.stop();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCanRecordAudio(
      typeof MediaRecorder !== "undefined" &&
        Boolean(navigator.mediaDevices?.getUserMedia),
    );

    return () => {
      shouldEnqueueRecordedAudioRef.current = false;
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      uploadAbortRef.current?.();
      uploadAbortRef.current = null;
      stopRecordingStream();
      audioChunksRef.current = [];
    };
  }, [stopRecordingStream]);

  useEffect(() => {
    if (activeItem || !queue.length || failedItem) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    setActiveItem(next);
  }, [activeItem, failedItem, queue]);

  useEffect(() => {
    const resolvedRoomId = String(roomId ?? "").trim();
    const resolvedGardenId = String(gardenId ?? "").trim();
    const resolvedProfileId = String(myProfileId ?? "").trim();
    if (!activeItem || !resolvedRoomId || !resolvedGardenId || !resolvedProfileId) return;

    let cancelled = false;

    const run = async () => {
      setUploadingMedia(true);
      setActiveProgress(null);
      setActiveUploadPhase("uploading");
      setMediaError(null);
      setMediaStatusLabel(null);

      try {
        const durationMs =
          activeItem.attachmentKind === "audio" || activeItem.attachmentKind === "video"
            ? await readGardenChatMediaDurationMs(activeItem.file)
            : null;

        const uploaded = await uploadGardenChatMedia(
          resolvedGardenId,
          resolvedRoomId,
          activeItem.attachmentKind,
          activeItem.file,
          {
            onProgress: (progress) => {
              setActiveProgress(progress);
            },
            onAbortReady: (abortFn) => {
              uploadAbortRef.current = abortFn;
            },
            onPhaseChange: (phase) => {
              setActiveUploadPhase(phase);
            },
          },
        );

        if (cancelled) return;

        await sendGardenChatUploadedMediaMessage({
          roomId: resolvedRoomId,
          gardenId: resolvedGardenId,
          authorUserId: resolvedProfileId,
          messageKind: activeItem.messageKind,
          attachmentKind: activeItem.attachmentKind,
          upload: uploaded,
          durationMs,
          previewText: activeItem.file.name,
        });

        if (cancelled) return;
        setFailedItem(null);
        setMediaStatusLabel(
          activeItem.messageKind === "voice_note"
            ? "Nota de voz enviada."
            : `${activeItem.file.name} enviado.`,
        );
      } catch (error) {
        if (cancelled) return;
        const message = toErrorMessage(error, "No se pudo enviar el adjunto del chat.");
        if (message.includes(UPLOAD_ABORTED_CODE)) {
          setMediaError("Subida cancelada por el usuario.");
          setMediaStatusLabel("Subida cancelada.");
        } else {
          setMediaError(message);
          setFailedItem(activeItem);
        }
      } finally {
        if (cancelled) return;
        setUploadingMedia(false);
        setActiveProgress(null);
        setActiveUploadPhase(null);
        setActiveItem(null);
        uploadAbortRef.current = null;
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [activeItem, gardenId, myProfileId, roomId]);

  useEffect(() => {
    if (uploadingMedia || isRecordingAudio || failedItem) return;
    if (!mediaStatusLabel || mediaError) return;
    const timer = window.setTimeout(() => setMediaStatusLabel(null), 3200);
    return () => window.clearTimeout(timer);
  }, [failedItem, isRecordingAudio, mediaError, mediaStatusLabel, uploadingMedia]);

  const cancelCurrentUpload = useCallback(() => {
    uploadAbortRef.current?.();
    uploadAbortRef.current = null;
  }, []);

  const retryFailedMedia = useCallback(() => {
    if (!failedItem || activeItem || uploadingMedia) return;
    const retryItem = failedItem;
    setFailedItem(null);
    setMediaError(null);
    setMediaStatusLabel(`Reintentando ${retryItem.file.name}...`);
    setActiveItem(retryItem);
  }, [activeItem, failedItem, uploadingMedia]);

  const clearPendingQueue = useCallback(() => {
    if (!queue.length) return;
    const removed = queue.length;
    setQueue([]);
    setMediaStatusLabel(
      removed === 1 ? "Se elimino 1 adjunto en espera." : `Se eliminaron ${removed} adjuntos en espera.`,
    );
  }, [queue.length]);

  const clearMediaError = useCallback(() => {
    setMediaError(null);
    setFailedItem(null);
  }, []);

  const queuedItems = useMemo(
    () => queue.length + (activeItem ? 1 : 0),
    [activeItem, queue.length],
  );

  const mediaStatusSummary = useMemo(() => {
    if (uploadingMedia && activeItem) {
      return buildUploadStatusLabel({
        activeItem,
        phase: activeUploadPhase,
        progress: activeProgress,
      });
    }

    if (mediaStatusLabel) return mediaStatusLabel;
    if (queue.length > 0) {
      return queue.length === 1 ? "1 adjunto esperando turno." : `${queue.length} adjuntos esperando turno.`;
    }
    return null;
  }, [activeItem, activeProgress, activeUploadPhase, mediaStatusLabel, queue.length, uploadingMedia]);

  return {
    fileInputRef,
    canRecordAudio,
    isRecordingAudio,
    uploadingMedia,
    mediaStatusLabel: mediaStatusSummary,
    mediaError,
    queuedItems,
    pendingQueueItems: queue.length,
    failedMediaLabel: failedItem?.file.name ?? null,
    canRetryFailedMedia: Boolean(failedItem),
    canCancelUpload: uploadingMedia && Boolean(uploadAbortRef.current),
    openFilePicker,
    handleFileInputChange,
    startVoiceRecording,
    stopVoiceRecording,
    cancelVoiceRecording,
    cancelCurrentUpload,
    retryFailedMedia,
    clearPendingQueue,
    clearMediaError,
  };
}
