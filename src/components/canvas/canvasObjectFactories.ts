import type {
  CanvasObject,
  CanvasPhotoFrame,
  CanvasSticker,
  CanvasText,
  CanvasVideoFrame,
} from "@/lib/canvasTypes";
import type { CanvasTemplateObjectInput } from "@/lib/canvasCatalog";
import { uid } from "@/components/canvas/canvasEditorUtils";

export function createObjectFromTemplateInput(
  input: CanvasTemplateObjectInput,
): CanvasObject | null {
  const base = {
    id: uid(),
    x: Number.isFinite(input.x) ? Number(input.x) : 120,
    y: Number.isFinite(input.y) ? Number(input.y) : 120,
    rotation: Number.isFinite(input.rotation) ? Number(input.rotation) : 0,
    locked: input.locked === true,
  };

  if (input.type === "sticker") {
    return {
      ...base,
      type: "sticker",
      src: input.src || "/stickers/sticker_star.svg",
      scale: Number.isFinite(input.scale) ? Number(input.scale) : 1,
    };
  }

  if (input.type === "text") {
    return {
      ...base,
      type: "text",
      text: input.text ?? "Escribe aquí",
      width: Number.isFinite(input.width) ? Number(input.width) : 260,
      fontSize: Number.isFinite(input.fontSize) ? Number(input.fontSize) : 28,
      fill: input.fill ?? "#1f2937",
    };
  }

  if (input.type === "photo") {
    return {
      ...base,
      type: "photo",
      width: Number.isFinite(input.width) ? Number(input.width) : 300,
      height: Number.isFinite(input.height) ? Number(input.height) : 200,
      src: input.src ?? null,
      caption: input.caption ?? "Nuestro momento",
      washi: input.washi ?? "none",
      stamp: input.stamp ?? "none",
    };
  }

  if (input.type === "video") {
    return {
      ...base,
      type: "video",
      width: Number.isFinite(input.width) ? Number(input.width) : 320,
      height: Number.isFinite(input.height) ? Number(input.height) : 220,
      src: input.src ?? null,
      caption: input.caption ?? "Nuestro video",
    };
  }

  return null;
}

export function createStickerObject(src: string): CanvasSticker {
  return {
    id: uid(),
    type: "sticker",
    src,
    x: 80 + Math.random() * 200,
    y: 80 + Math.random() * 160,
    rotation: 0,
    scale: 1,
    locked: false,
  };
}

export function createTextObject(): CanvasText {
  return {
    id: uid(),
    type: "text",
    text: "Escribe aquí",
    x: 120,
    y: 120,
    width: 260,
    fontSize: 28,
    rotation: 0,
    fill: "#1f2937",
    locked: false,
  };
}

export function createPhotoFrameObject(): CanvasPhotoFrame {
  return {
    id: uid(),
    type: "photo",
    x: 140,
    y: 90,
    width: 300,
    height: 200,
    rotation: 0,
    src: null,
    caption: "Nuestro momento",
    washi: "none",
    stamp: "none",
    locked: false,
  };
}

export function createVideoFrameObject(): CanvasVideoFrame {
  return {
    id: uid(),
    type: "video",
    x: 150,
    y: 100,
    width: 320,
    height: 220,
    rotation: 0,
    src: null,
    caption: "Nuestro video",
    locked: false,
  };
}
