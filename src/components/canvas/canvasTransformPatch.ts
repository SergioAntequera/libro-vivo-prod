type CanvasObjectLike = {
  type?: unknown;
  width?: unknown;
  height?: unknown;
  fontSize?: unknown;
  rotation?: unknown;
};

type TransformNodeLike = {
  id?: () => string;
  x: () => number;
  y: () => number;
  scaleX: ((value?: number) => number);
  scaleY: ((value?: number) => number);
  rotation?: () => number;
};

export type { TransformNodeLike };

export type TransformPatch = Record<string, unknown> | null;

export function buildTransformPatchForObject(
  object: CanvasObjectLike,
  node: TransformNodeLike,
  opts?: { fromMulti?: boolean },
): TransformPatch {
  const x = node.x();
  const y = node.y();
  const rotation = node.rotation?.() ?? Number(object.rotation ?? 0) ?? 0;
  const type = String(object.type ?? "");

  if (type === "sticker") {
    const sx = Math.abs(node.scaleX());
    const sy = Math.abs(node.scaleY());
    const nextScale = Math.max(0.2, (sx + sy) / 2);

    node.scaleX(1);
    node.scaleY(1);

    return { x, y, rotation, scale: nextScale };
  }

  if (type === "text") {
    const sx = Math.abs(node.scaleX());
    const sy = Math.abs(node.scaleY());
    const patch: Record<string, unknown> = {
      x,
      y,
      rotation,
      width: Math.max(60, Number(object.width ?? 260) * sx),
    };

    // In multi-transform we also scale text size to preserve visual result.
    if (opts?.fromMulti) {
      patch.fontSize = Math.max(10, Number(object.fontSize ?? 28) * sy);
    }

    node.scaleX(1);
    node.scaleY(1);

    return patch;
  }

  if (type === "photo") {
    const sx = Math.abs(node.scaleX());
    const sy = Math.abs(node.scaleY());
    const nextW = Math.max(140, Number(object.width ?? 300) * sx);
    const nextH = Math.max(120, Number(object.height ?? 200) * sy);

    node.scaleX(1);
    node.scaleY(1);

    return { x, y, rotation, width: nextW, height: nextH };
  }

  if (type === "video") {
    const sx = Math.abs(node.scaleX());
    const sy = Math.abs(node.scaleY());
    const nextW = Math.max(180, Number(object.width ?? 320) * sx);
    const nextH = Math.max(120, Number(object.height ?? 220) * sy);

    node.scaleX(1);
    node.scaleY(1);

    return { x, y, rotation, width: nextW, height: nextH };
  }

  return null;
}
