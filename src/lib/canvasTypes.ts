export type ElementKind = string;

type CanvasBase = {
  id: string;
  x: number;
  y: number;
  rotation: number;
  locked?: boolean;
};

export type CanvasSticker = CanvasBase & {
  type: "sticker";
  src: string; // URL del sticker (svg)
  scale: number;
};

export type CanvasText = CanvasBase & {
  type: "text";
  text: string;
  width: number;
  fontSize: number;
  fill: string;
};

export type CanvasPhotoFrame = CanvasBase & {
  type: "photo";
  width: number;
  height: number;
  src?: string | null;
  caption?: string | null;
  washi?: "none" | "top" | "corner";
  stamp?: "none" | "love" | "done";
};

export type CanvasVideoFrame = CanvasBase & {
  type: "video";
  width: number;
  height: number;
  src?: string | null;
  caption?: string | null;
};

export type CanvasObject =
  | CanvasSticker
  | CanvasText
  | CanvasPhotoFrame
  | CanvasVideoFrame;
