"use client";

import { useEffect, useMemo, useState } from "react";
import { getUnlockedStickers } from "@/lib/stickers";
import {
  getCanvasStickerCatalog,
  getCanvasTemplatesCatalog,
  getFallbackCanvasStickers,
  getFallbackCanvasTemplates,
  type CanvasTemplateConfig,
} from "@/lib/canvasCatalog";

export type LibraryPanel = "none" | "stickers" | "templates";

type UseCanvasAssetsLibraryParams = {
  activeGardenId?: string | null;
};

export function useCanvasAssetsLibrary({
  activeGardenId,
}: UseCanvasAssetsLibraryParams) {
  const fallbackStickerSources = useMemo(
    () => getFallbackCanvasStickers().map((item) => item.src),
    [],
  );
  const [availableStickers, setAvailableStickers] =
    useState<string[]>(fallbackStickerSources);
  const [templatePresets, setTemplatePresets] = useState<CanvasTemplateConfig[]>(
    getFallbackCanvasTemplates(),
  );
  const [activeLibraryPanel, setActiveLibraryPanel] =
    useState<LibraryPanel>("none");
  const [stickerQuery, setStickerQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [catalogStickers, catalogTemplates, unlocked] = await Promise.all([
          getCanvasStickerCatalog(activeGardenId),
          getCanvasTemplatesCatalog(activeGardenId),
          getUnlockedStickers(activeGardenId),
        ]);

        const stickerSources = catalogStickers
          .map((item) => item.src)
          .filter((src) => typeof src === "string" && src.trim());
        const merged = Array.from(new Set([...stickerSources, ...unlocked]));
        setAvailableStickers(
          merged.length ? merged : [...fallbackStickerSources],
        );

        if (catalogTemplates.length) {
          setTemplatePresets(catalogTemplates);
        } else {
          setTemplatePresets(getFallbackCanvasTemplates());
        }
      } catch {
        setAvailableStickers([...fallbackStickerSources]);
        setTemplatePresets(getFallbackCanvasTemplates());
      }
    })();
  }, [activeGardenId, fallbackStickerSources]);

  const filteredStickerSources = useMemo(() => {
    const query = stickerQuery.trim().toLowerCase();
    if (!query) return availableStickers;
    return availableStickers.filter((src) => src.toLowerCase().includes(query));
  }, [availableStickers, stickerQuery]);

  return {
    availableStickers,
    templatePresets,
    activeLibraryPanel,
    setActiveLibraryPanel,
    stickerQuery,
    setStickerQuery,
    filteredStickerSources,
  };
}
