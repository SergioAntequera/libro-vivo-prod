"use client";

import type Konva from "konva";
import { Group, Rect, Text as KText } from "react-konva";
import type { CanvasObject } from "@/lib/canvasTypes";
import {
  PhotoFill,
  StickerNode,
  VideoNode,
} from "@/components/canvas/CanvasSceneNodes";
import { eventShiftKey, isLocked } from "@/components/canvas/canvasEditorUtils";

type PositionSetter = (x: number, y: number) => void;

type CanvasEditorObjectNodesProps = {
  objects: CanvasObject[];
  selectedIds: string[];
  playingVideoId: string | null;
  onClearPlayingVideo: () => void;
  onToggleVideoPlayback: (id: string) => void;
  selectOne: (id: string, additive: boolean) => void;
  startMultiDrag: (id: string, x: number, y: number) => void;
  handleDragMoveMaybeMulti: (
    id: string,
    x: number,
    y: number,
    setPos: PositionSetter,
  ) => boolean;
  handleDragMoveGeneric: (
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    setPos: PositionSetter,
  ) => void;
  finishDragMaybeMulti: (id: string, x: number, y: number) => boolean;
  finishDragGeneric: (
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ) => void;
  removeIds: (ids: string[]) => void;
  onEditText: (id: string, value: string) => void;
  onEditPhotoCaption: (id: string, value: string) => void;
  onEditVideoCaption: (id: string, value: string) => void;
};

export function CanvasEditorObjectNodes(props: CanvasEditorObjectNodesProps) {
  const {
    objects,
    selectedIds,
    playingVideoId,
    onClearPlayingVideo,
    onToggleVideoPlayback,
    selectOne,
    startMultiDrag,
    handleDragMoveMaybeMulti,
    handleDragMoveGeneric,
    finishDragMaybeMulti,
    finishDragGeneric,
    removeIds,
    onEditText,
    onEditPhotoCaption,
    onEditVideoCaption,
  } = props;

  return (
    <>
      {objects.map((object) => {
        if (object.type === "sticker") {
          const locked = isLocked(object);
          const sticker = object;

          return (
            <StickerNode
              key={sticker.id}
              st={sticker}
              locked={locked}
              isSelected={selectedIds.includes(sticker.id)}
              onSelect={(additive) => selectOne(sticker.id, additive)}
              onDragStart={(x, y) => startMultiDrag(sticker.id, x, y)}
              onDragMove={(x, y, width, height, setPos) =>
                handleDragMoveMaybeMulti(sticker.id, x, y, setPos) ||
                handleDragMoveGeneric(sticker.id, x, y, width, height, setPos)
              }
              onDragEnd={(x, y) => {
                if (finishDragMaybeMulti(sticker.id, x, y)) return;
                const scale = sticker.scale ?? 1;
                finishDragGeneric(sticker.id, x, y, 96 * scale, 96 * scale);
              }}
              onDblClick={() => removeIds([sticker.id])}
            />
          );
        }

        if (object.type === "text") {
          const locked = isLocked(object);
          const textObject = object;
          const width = textObject.width ?? 260;
          const height = (textObject.fontSize ?? 28) * 1.4;

          return (
            <KText
              key={textObject.id}
              id={textObject.id}
              x={textObject.x}
              y={textObject.y}
              width={width}
              text={textObject.text}
              fontSize={textObject.fontSize}
              fill={textObject.fill}
              rotation={textObject.rotation ?? 0}
              draggable={!locked}
              opacity={selectedIds.includes(textObject.id) ? 0.95 : 1}
              onClick={(event) => selectOne(textObject.id, event.evt.shiftKey)}
              onTap={(event) => selectOne(textObject.id, eventShiftKey(event))}
              onDragStart={(event) => {
                if (locked) return;
                startMultiDrag(textObject.id, event.target.x(), event.target.y());
              }}
              onDragMove={(event) => {
                if (locked) return;
                const node = event.target as Konva.Text;
                const x = node.x();
                const y = node.y();
                if (
                  handleDragMoveMaybeMulti(textObject.id, x, y, (nx, ny) =>
                    node.position({ x: nx, y: ny }),
                  )
                ) {
                  return;
                }
                handleDragMoveGeneric(textObject.id, x, y, width, height, (nx, ny) =>
                  node.position({ x: nx, y: ny }),
                );
              }}
              onDragEnd={(event) => {
                if (locked) return;
                if (finishDragMaybeMulti(textObject.id, event.target.x(), event.target.y())) {
                  return;
                }
                finishDragGeneric(
                  textObject.id,
                  event.target.x(),
                  event.target.y(),
                  width,
                  height,
                );
              }}
              onDblClick={() => {
                if (locked) return;
                onEditText(textObject.id, String(textObject.text ?? ""));
              }}
            />
          );
        }

        if (object.type === "photo") {
          const locked = isLocked(object);
          const photo = object;
          const width = photo.width ?? 300;
          const height = photo.height ?? 200;
          const washi = photo.washi ?? "none";
          const stamp = photo.stamp ?? "none";

          return (
            <Group
              key={photo.id}
              id={photo.id}
              x={photo.x}
              y={photo.y}
              draggable={!locked}
              rotation={photo.rotation ?? 0}
              opacity={selectedIds.includes(photo.id) ? 0.98 : 1}
              onClick={(event) => selectOne(photo.id, event.evt.shiftKey)}
              onTap={(event) => selectOne(photo.id, eventShiftKey(event))}
              onDragStart={(event) => {
                if (locked) return;
                startMultiDrag(photo.id, event.target.x(), event.target.y());
              }}
              onDragMove={(event) => {
                if (locked) return;
                const node = event.target as Konva.Group;
                const x = node.x();
                const y = node.y();
                if (
                  handleDragMoveMaybeMulti(photo.id, x, y, (nx, ny) =>
                    node.position({ x: nx, y: ny }),
                  )
                ) {
                  return;
                }
                handleDragMoveGeneric(photo.id, x, y, width, height, (nx, ny) =>
                  node.position({ x: nx, y: ny }),
                );
              }}
              onDragEnd={(event) => {
                if (locked) return;
                const node = event.target as Konva.Group;
                if (finishDragMaybeMulti(photo.id, node.x(), node.y())) return;
                finishDragGeneric(photo.id, node.x(), node.y(), width, height);
              }}
              onDblClick={() => {
                if (locked) return;
                onEditPhotoCaption(photo.id, String(photo.caption ?? ""));
              }}
            >
              <Rect
                width={width}
                height={height}
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
                width={width - 28}
                height={height - 58}
                cornerRadius={18}
                fill="#fffdf5"
                stroke="rgba(17,24,39,0.20)"
                strokeWidth={2}
                dash={[8, 6]}
              />

              {photo.src ? (
                <Group
                  clipFunc={(ctx) => {
                    const x = 14;
                    const y = 14;
                    const ww = width - 28;
                    const hh = height - 58;
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
                  <PhotoFill src={photo.src} w={width - 28} h={height - 58} />
                </Group>
              ) : (
                <KText
                  x={0}
                  y={height / 2 - 16}
                  width={width}
                  align="center"
                  text="Aquí va una foto"
                  fontSize={18}
                  fill="rgba(31,41,55,0.55)"
                />
              )}

              <KText
                x={16}
                y={height - 38}
                width={width - 32}
                align="center"
                text={photo.caption ?? ""}
                fontSize={16}
                fill="rgba(31,41,55,0.85)"
              />

              {washi === "top" && (
                <Rect
                  x={width * 0.18}
                  y={-10}
                  width={width * 0.64}
                  height={26}
                  cornerRadius={12}
                  fill="rgba(255, 210, 90, 0.85)"
                  stroke="rgba(17,24,39,0.25)"
                  strokeWidth={2}
                  rotation={-3}
                />
              )}

              {stamp !== "none" && (
                <Group x={width - 84} y={height - 84} rotation={-8}>
                  <Rect
                    width={64}
                    height={64}
                    cornerRadius={18}
                    fill="rgba(255,255,255,0.95)"
                    stroke="rgba(17,24,39,0.25)"
                    strokeWidth={2}
                  />
                  <KText
                    x={0}
                    y={18}
                    width={64}
                    align="center"
                    text={stamp === "love" ? "LOVE" : "DONE"}
                    fontSize={14}
                    fill="rgba(17,24,39,0.8)"
                  />
                </Group>
              )}
            </Group>
          );
        }

        if (object.type === "video") {
          const locked = isLocked(object);
          const video = object;
          const width = video.width ?? 320;
          const height = video.height ?? 220;

          return (
            <VideoNode
              key={video.id}
              vd={video}
              locked={locked}
              isSelected={selectedIds.includes(video.id)}
              isPlaying={playingVideoId === video.id}
              onPlaybackEnd={() => {
                if (playingVideoId === video.id) onClearPlayingVideo();
              }}
              onTogglePlayback={() => onToggleVideoPlayback(video.id)}
              onSelect={(additive) => selectOne(video.id, additive)}
              onDragStart={(x, y) => {
                if (locked) return;
                startMultiDrag(video.id, x, y);
              }}
              onDragMove={(x, y, _, __, setPos) => {
                if (locked) return;
                if (handleDragMoveMaybeMulti(video.id, x, y, setPos)) return;
                handleDragMoveGeneric(video.id, x, y, width, height, setPos);
              }}
              onDragEnd={(x, y) => {
                if (locked) return;
                if (finishDragMaybeMulti(video.id, x, y)) return;
                finishDragGeneric(video.id, x, y, width, height);
              }}
              onDblClick={() => {
                if (locked) return;
                onEditVideoCaption(video.id, String(video.caption ?? ""));
              }}
            />
          );
        }

        return null;
      })}
    </>
  );
}
