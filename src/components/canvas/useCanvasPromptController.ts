"use client";

import { useCallback, useState } from "react";

export type CanvasPromptKind =
  | "none"
  | "video_url"
  | "text_body"
  | "photo_caption"
  | "video_caption";

export type CanvasPromptState = {
  kind: CanvasPromptKind;
  targetId: string | null;
  title: string;
  description: string;
  placeholder: string;
  confirmLabel: string;
  value: string;
  initialValue: string;
};

type CanvasObjectPatch = Record<string, unknown>;

type OpenCanvasPromptInput = Omit<CanvasPromptState, "kind" | "initialValue"> & {
  kind: Exclude<CanvasPromptKind, "none">;
};

type UseCanvasPromptControllerParams = {
  updateById: (id: string, patch: CanvasObjectPatch) => void;
  clearPlayingVideoForTarget: (targetId: string) => void;
  clearManagedVideoSourceForTarget: (targetId: string) => Promise<boolean>;
  setVideoUploadError: (error: string | null) => void;
};

const EMPTY_PROMPT_STATE: CanvasPromptState = {
  kind: "none",
  targetId: null,
  title: "",
  description: "",
  placeholder: "",
  confirmLabel: "Guardar",
  value: "",
  initialValue: "",
};

export function useCanvasPromptController(
  params: UseCanvasPromptControllerParams,
) {
  const {
    updateById,
    clearPlayingVideoForTarget,
    clearManagedVideoSourceForTarget,
    setVideoUploadError,
  } = params;

  const [promptState, setPromptState] = useState<CanvasPromptState>(
    EMPTY_PROMPT_STATE,
  );

  const openCanvasPrompt = useCallback((nextState: OpenCanvasPromptInput) => {
    setPromptState({
      ...nextState,
      initialValue: nextState.value,
    });
  }, []);

  const closeCanvasPrompt = useCallback(() => {
    setPromptState(EMPTY_PROMPT_STATE);
  }, []);

  const cancelCanvasPrompt = useCallback(() => {
    if (
      promptState.targetId &&
      (promptState.kind === "text_body" ||
        promptState.kind === "photo_caption" ||
        promptState.kind === "video_caption")
    ) {
      const revertValue = promptState.initialValue;
      if (promptState.kind === "text_body") {
        updateById(promptState.targetId, { text: revertValue });
      } else {
        updateById(promptState.targetId, { caption: revertValue });
      }
    }
    closeCanvasPrompt();
  }, [closeCanvasPrompt, promptState, updateById]);

  const submitCanvasPrompt = useCallback(async () => {
    if (promptState.kind === "none" || !promptState.targetId) {
      closeCanvasPrompt();
      return;
    }

    const targetId = promptState.targetId;
    const nextValue = promptState.value;

    if (promptState.kind === "video_url") {
      const next = nextValue.trim();
      if (!next) {
        const cleared = await clearManagedVideoSourceForTarget(targetId);
        if (cleared) closeCanvasPrompt();
        if (!cleared) return;
        return;
      }
      if (!/^https?:\/\//i.test(next)) {
        setVideoUploadError("La URL debe empezar por http:// o https://");
        return;
      }
      clearPlayingVideoForTarget(targetId);
      updateById(targetId, { src: next });
      setVideoUploadError(null);
      closeCanvasPrompt();
      return;
    }

    if (promptState.kind === "text_body") {
      closeCanvasPrompt();
      return;
    }

    if (promptState.kind === "photo_caption") {
      closeCanvasPrompt();
      return;
    }

    if (promptState.kind === "video_caption") {
      closeCanvasPrompt();
    }
  }, [
    clearPlayingVideoForTarget,
    clearManagedVideoSourceForTarget,
    closeCanvasPrompt,
    promptState,
    setVideoUploadError,
    updateById,
  ]);

  const setPromptValue = useCallback((nextValue: string) => {
    setPromptState((prev) => ({
      ...prev,
      value: nextValue,
    }));
    if (!promptState.targetId) return;
    if (promptState.kind === "text_body") {
      updateById(promptState.targetId, { text: nextValue });
      return;
    }
    if (promptState.kind === "photo_caption" || promptState.kind === "video_caption") {
      updateById(promptState.targetId, { caption: nextValue });
    }
  }, [promptState.kind, promptState.targetId, updateById]);

  return {
    promptState,
    openCanvasPrompt,
    closeCanvasPrompt,
    cancelCanvasPrompt,
    submitCanvasPrompt,
    setPromptValue,
  };
}
