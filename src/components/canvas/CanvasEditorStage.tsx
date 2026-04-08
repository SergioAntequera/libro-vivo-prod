"use client";

import type Konva from "konva";
import type { MutableRefObject, ReactNode } from "react";
import { Circle, Group, Layer, Rect, Stage, Text as KText, Transformer } from "react-konva";
import type { GuideLine } from "@/components/canvas/canvasDragSnap";

type SelectedKind = "none" | "sticker" | "text" | "photo" | "video";

type CanvasEditorStageProps = {
  stageSize: { width: number; height: number };
  stageScale: number;
  stagePos: { x: number; y: number };
  stageRef: MutableRefObject<Konva.Stage | null>;
  transformerRef: MutableRefObject<Konva.Transformer | null>;
  onWheel: (event: Konva.KonvaEventObject<WheelEvent>) => void;
  onStageMouseDown: (
    event: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => void;
  onStageMouseMove: () => void;
  onStageMouseUp: (
    event: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => void;
  onStageMouseLeave: () => void;
  showGrid: boolean;
  gridSize: number;
  guides: GuideLine[];
  marquee: {
    active: boolean;
    x: number;
    y: number;
    w: number;
    h: number;
  };
  objectNodes: ReactNode;
  remotePointers?: Array<{
    userId: string;
    name: string;
    x: number;
    y: number;
    color: string;
  }>;
  isMultiTransform: boolean;
  transformerKind: SelectedKind;
  onTransformEnd: () => void;
};

export function CanvasEditorStage(props: CanvasEditorStageProps) {
  const {
    stageSize,
    stageScale,
    stagePos,
    stageRef,
    transformerRef,
    onWheel,
    onStageMouseDown,
    onStageMouseMove,
    onStageMouseUp,
    onStageMouseLeave,
    showGrid,
    gridSize,
    guides,
    marquee,
    objectNodes,
    remotePointers = [],
    isMultiTransform,
    transformerKind,
    onTransformEnd,
  } = props;

  return (
    <div className="rounded-3xl border bg-white p-4 shadow-sm">
      <div className="overflow-auto rounded-3xl border bg-[#fffdf5]">
        <div
          style={{ width: stageSize.width, height: stageSize.height }}
          className="min-w-max"
        >
          <Stage
            width={stageSize.width}
            height={stageSize.height}
            ref={(node) => {
              stageRef.current = node;
            }}
            scaleX={stageScale}
            scaleY={stageScale}
            x={stagePos.x}
            y={stagePos.y}
            onWheel={onWheel}
            onMouseDown={onStageMouseDown}
            onTouchStart={onStageMouseDown}
            onMouseMove={onStageMouseMove}
            onTouchMove={onStageMouseMove}
            onMouseUp={onStageMouseUp}
            onTouchEnd={onStageMouseUp}
            onMouseLeave={onStageMouseLeave}
            onTouchCancel={onStageMouseLeave}
          >
            <Layer>
              {showGrid ? (
                <Group listening={false} opacity={0.14}>
                  {Array.from({
                    length: Math.floor(stageSize.width / gridSize) + 1,
                  }).map((_, index) => (
                    <Rect
                      key={`vx${index}`}
                      x={index * gridSize}
                      y={0}
                      width={1}
                      height={stageSize.height}
                      fill="black"
                    />
                  ))}
                  {Array.from({
                    length: Math.floor(stageSize.height / gridSize) + 1,
                  }).map((_, index) => (
                    <Rect
                      key={`hy${index}`}
                      x={0}
                      y={index * gridSize}
                      width={stageSize.width}
                      height={1}
                      fill="black"
                    />
                  ))}
                </Group>
              ) : null}

              {guides.map((guide, index) => (
                <Rect
                  key={`${guide.x1}:${guide.y1}:${guide.x2}:${guide.y2}:${index}`}
                  x={Math.min(guide.x1, guide.x2)}
                  y={Math.min(guide.y1, guide.y2)}
                  width={Math.max(1, Math.abs(guide.x2 - guide.x1))}
                  height={Math.max(1, Math.abs(guide.y2 - guide.y1))}
                  fill="rgba(0,0,0,0.45)"
                  listening={false}
                />
              ))}

              {marquee.active ? (
                <Rect
                  x={marquee.x}
                  y={marquee.y}
                  width={marquee.w}
                  height={marquee.h}
                  fill="rgba(99, 102, 241, 0.10)"
                  stroke="rgba(99, 102, 241, 0.55)"
                  strokeWidth={2}
                  listening={false}
                />
              ) : null}

              {objectNodes}

              {remotePointers.map((pointer) => (
                <Group key={`pointer:${pointer.userId}`} x={pointer.x} y={pointer.y} listening={false}>
                  <Circle radius={11} fill={pointer.color} opacity={0.18} />
                  <Circle radius={4.5} fill={pointer.color} />
                  <Rect
                    x={12}
                    y={-14}
                    width={Math.max(78, pointer.name.length * 7.6)}
                    height={26}
                    cornerRadius={999}
                    fill="rgba(255,255,255,0.92)"
                    stroke={pointer.color}
                    strokeWidth={1.5}
                    shadowColor="rgba(15,23,42,0.12)"
                    shadowBlur={8}
                    shadowOffset={{ x: 0, y: 3 }}
                    shadowOpacity={0.55}
                  />
                  <KText
                    x={24}
                    y={-7.5}
                    text={pointer.name}
                    fontSize={12}
                    fontStyle="bold"
                    fill="#0f172a"
                  />
                </Group>
              ))}

              <Transformer
                ref={transformerRef}
                rotateEnabled={
                  isMultiTransform ||
                  transformerKind === "sticker" ||
                  transformerKind === "photo" ||
                  transformerKind === "video"
                }
                enabledAnchors={
                  !isMultiTransform && transformerKind === "text"
                    ? ["middle-left", "middle-right"]
                    : [
                        "top-left",
                        "top-right",
                        "bottom-left",
                        "bottom-right",
                        "middle-left",
                        "middle-right",
                        "top-center",
                        "bottom-center",
                      ]
                }
                flipEnabled={false}
                boundBoxFunc={(_, newBox) => {
                  if (isMultiTransform) return newBox;
                  const minWidth =
                    transformerKind === "photo"
                      ? 140
                      : transformerKind === "video"
                        ? 180
                        : transformerKind === "text"
                          ? 60
                          : 60;
                  const minHeight =
                    transformerKind === "photo"
                      ? 120
                      : transformerKind === "video"
                        ? 120
                        : transformerKind === "text"
                          ? 30
                          : 60;

                  if (newBox.width < minWidth) return { ...newBox, width: minWidth };
                  if (newBox.height < minHeight) return { ...newBox, height: minHeight };
                  return newBox;
                }}
                onTransformEnd={onTransformEnd}
              />
            </Layer>
          </Stage>
        </div>
      </div>
    </div>
  );
}
