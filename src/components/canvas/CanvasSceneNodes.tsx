"use client";

import type Konva from "konva";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Group,
  Image as KImage,
  Rect,
  Text as KText,
} from "react-konva";
import type {
  CanvasSticker,
  CanvasVideoFrame,
} from "@/lib/canvasTypes";
import { useImage } from "@/lib/useImage";
import { eventShiftKey } from "@/components/canvas/canvasEditorUtils";

type DragMoveHandler = (
  x: number,
  y: number,
  w: number,
  h: number,
  setPos: (nx: number, ny: number) => void,
) => void;

export function PhotoFill({ src, w, h }: { src: string; w: number; h: number }) {
  const img = useImage(src);

  const [dw, dh, dx, dy] = (() => {
    const iw = img?.width ?? 1;
    const ih = img?.height ?? 1;
    const scale = Math.max(w / iw, h / ih);
    const sw = iw * scale;
    const sh = ih * scale;
    return [sw, sh, (w - sw) / 2, (h - sh) / 2] as const;
  })();

  return (
    <KImage
      image={img ?? undefined}
      x={14 + dx}
      y={14 + dy}
      width={dw}
      height={dh}
      listening={false}
    />
  );
}

function cleanupVideoElement(el: HTMLVideoElement) {
  el.pause();
  el.removeAttribute("src");
  try {
    el.load();
  } catch {
    // noop
  }
}

function setVideoMuted(el: HTMLVideoElement, muted: boolean) {
  el.muted = muted;
}

function useVideoElement(src?: string | null) {
  const video = useMemo(() => {
    if (!src || typeof document === "undefined") return null;
    const el = document.createElement("video");
    el.src = src;
    el.preload = "metadata";
    el.crossOrigin = "anonymous";
    el.muted = true;
    el.loop = false;
    el.playsInline = true;
    el.setAttribute("playsinline", "true");
    el.load();
    return el;
  }, [src]);

  useEffect(() => {
    return () => {
      if (video) cleanupVideoElement(video);
    };
  }, [video]);

  return video;
}

function VideoFill(props: {
  src: string;
  w: number;
  h: number;
  isPlaying: boolean;
  onPlaybackEnd: () => void;
}) {
  const { src, w, h, isPlaying, onPlaybackEnd } = props;
  const video = useVideoElement(src);
  const imageRef = useRef<Konva.Image | null>(null);
  const [videoSize, setVideoSize] = useState({ width: 1, height: 1 });

  useEffect(() => {
    if (!video) return;

    const handleLoadedMetadata = () => {
      setVideoSize({
        width: Math.max(1, video.videoWidth || 1),
        height: Math.max(1, video.videoHeight || 1),
      });
    };

    const handleEnded = () => {
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        // noop
      }
      onPlaybackEnd();
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("ended", handleEnded);
    handleLoadedMetadata();

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("ended", handleEnded);
    };
  }, [onPlaybackEnd, video]);

  useEffect(() => {
    if (!video) return;

    let raf = 0;
    if (isPlaying) {
      setVideoMuted(video, false);
      const maybePromise = video.play();
      if (maybePromise && typeof maybePromise.catch === "function") {
        maybePromise.catch(() => {
          // Fallback muted playback if browser blocks audio autoplay.
          setVideoMuted(video, true);
          const fallback = video.play();
          if (fallback && typeof fallback.catch === "function") {
            fallback.catch(() => {
              // noop
            });
          }
        });
      }

      const drawLoop = () => {
        imageRef.current?.getLayer()?.batchDraw();
        raf = window.requestAnimationFrame(drawLoop);
      };
      raf = window.requestAnimationFrame(drawLoop);
    } else {
      video.pause();
      imageRef.current?.getLayer()?.batchDraw();
    }

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [isPlaying, video]);

  if (!video) return null;

  const iw = videoSize.width;
  const ih = videoSize.height;
  const scale = Math.max(w / iw, h / ih);
  const sw = iw * scale;
  const sh = ih * scale;
  const dx = (w - sw) / 2;
  const dy = (h - sh) / 2;

  return (
    <KImage
      ref={(node) => {
        imageRef.current = node;
      }}
      image={video}
      x={14 + dx}
      y={14 + dy}
      width={sw}
      height={sh}
      listening={false}
    />
  );
}

export function StickerNode(props: {
  st: CanvasSticker;
  isSelected: boolean;
  locked: boolean;
  onSelect: (additive: boolean) => void;
  onDragStart?: (x: number, y: number) => void;
  onDragMove?: DragMoveHandler;
  onDragEnd: (x: number, y: number) => void;
  onDblClick: () => void;
}) {
  const {
    st,
    isSelected,
    locked,
    onSelect,
    onDragStart,
    onDragMove,
    onDragEnd,
    onDblClick,
  } = props;

  const img = useImage(st.src);
  const size = 96;

  return (
    <KImage
      id={st.id}
      image={img ?? undefined}
      x={st.x}
      y={st.y}
      width={size}
      height={size}
      draggable={!locked}
      rotation={st.rotation ?? 0}
      scaleX={st.scale ?? 1}
      scaleY={st.scale ?? 1}
      opacity={isSelected ? 0.92 : 1}
      onClick={(evt) => onSelect(evt.evt.shiftKey)}
      onTap={(evt) => onSelect(eventShiftKey(evt))}
      onDragStart={(evt) => {
        if (locked) return;
        onDragStart?.(evt.target.x(), evt.target.y());
      }}
      onDragMove={(evt) => {
        if (!onDragMove || locked) return;
        const node = evt.target;
        const x = node.x();
        const y = node.y();
        const sc = st.scale ?? 1;
        onDragMove(x, y, size * sc, size * sc, (nx, ny) =>
          node.position({ x: nx, y: ny }),
        );
      }}
      onDragEnd={(evt) => {
        if (locked) return;
        onDragEnd(evt.target.x(), evt.target.y());
      }}
      onDblClick={() => {
        if (locked) return;
        onDblClick();
      }}
    />
  );
}

export function VideoNode(props: {
  vd: CanvasVideoFrame;
  isSelected: boolean;
  locked: boolean;
  isPlaying: boolean;
  onTogglePlayback: () => void;
  onPlaybackEnd: () => void;
  onSelect: (additive: boolean) => void;
  onDragStart?: (x: number, y: number) => void;
  onDragMove?: DragMoveHandler;
  onDragEnd: (x: number, y: number) => void;
  onDblClick: () => void;
}) {
  const {
    vd,
    isSelected,
    locked,
    isPlaying,
    onTogglePlayback,
    onPlaybackEnd,
    onSelect,
    onDragStart,
    onDragMove,
    onDragEnd,
    onDblClick,
  } = props;
  const w = vd.width ?? 300;
  const h = vd.height ?? 200;

  return (
    <Group
      id={vd.id}
      x={vd.x}
      y={vd.y}
      draggable={!locked}
      rotation={vd.rotation ?? 0}
      opacity={isSelected ? 0.98 : 1}
      onClick={(e) => onSelect(e.evt.shiftKey)}
      onTap={(e) => onSelect(eventShiftKey(e))}
      onDragStart={(e) => {
        if (locked) return;
        onDragStart?.(e.target.x(), e.target.y());
      }}
      onDragMove={(e) => {
        if (!onDragMove || locked) return;
        const node = e.target as Konva.Group;
        onDragMove(node.x(), node.y(), w, h, (nx, ny) =>
          node.position({ x: nx, y: ny }),
        );
      }}
      onDragEnd={(e) => {
        if (locked) return;
        onDragEnd(e.target.x(), e.target.y());
      }}
      onDblClick={() => {
        if (locked) return;
        onDblClick();
      }}
    >
      <Rect
        width={w}
        height={h}
        cornerRadius={24}
        fill="#ffffff"
        stroke="#111827"
        strokeWidth={3}
        shadowColor="rgba(0,0,0,0.10)"
        shadowBlur={10}
        shadowOffset={{ x: 0, y: 6 }}
        shadowOpacity={0.6}
      />

      <Rect
        x={14}
        y={14}
        width={w - 28}
        height={h - 58}
        cornerRadius={18}
        fill="#f2f8ff"
        stroke="rgba(17,24,39,0.20)"
        strokeWidth={2}
        dash={[8, 6]}
      />

      {vd.src ? (
        <Group
          clipFunc={(ctx) => {
            const x = 14;
            const y = 14;
            const ww = w - 28;
            const hh = h - 58;
            const r = 18;
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + ww, y, x + ww, y + hh, r);
            ctx.arcTo(x + ww, y + hh, x, y + hh, r);
            ctx.arcTo(x, y + hh, x, y, r);
            ctx.arcTo(x, y, x + ww, y, r);
            ctx.closePath();
          }}
        >
          <VideoFill
            src={vd.src}
            w={w - 28}
            h={h - 58}
            isPlaying={isPlaying}
            onPlaybackEnd={onPlaybackEnd}
          />
        </Group>
      ) : (
        <KText
          x={0}
          y={h / 2 - 16}
          width={w}
          align="center"
          text="Aquí va un video"
          fontSize={18}
          fill="rgba(31,41,55,0.55)"
        />
      )}

      <KText
        x={16}
        y={h - 38}
        width={w - 32}
        align="center"
        text={vd.caption ?? ""}
        fontSize={16}
        fill="rgba(31,41,55,0.85)"
      />

      {vd.src && (
        <Group
          x={w - 72}
          y={18}
          onClick={(evt) => {
            evt.cancelBubble = true;
            onTogglePlayback();
          }}
          onTap={(evt) => {
            evt.cancelBubble = true;
            onTogglePlayback();
          }}
        >
          <Rect
            width={48}
            height={34}
            cornerRadius={12}
            fill="rgba(255,255,255,0.92)"
            stroke="rgba(17,24,39,0.35)"
            strokeWidth={2}
          />
          <KText
            x={0}
            y={7}
            width={48}
            align="center"
            text={isPlaying ? "||" : ">"}
            fontSize={16}
            fill="rgba(17,24,39,0.9)"
          />
        </Group>
      )}
    </Group>
  );
}
