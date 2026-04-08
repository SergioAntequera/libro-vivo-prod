export type PathAnchor = {
  x: number;
  y: number;
};

export type CubicPathSegment = {
  d: string;
  start: PathAnchor;
  controlStart: PathAnchor;
  controlEnd: PathAnchor;
  end: PathAnchor;
  avgY: number;
  length: number;
};

export type PathSamplePoint = {
  x: number;
  y: number;
  segmentIndex: number;
  t: number;
  normalX: number;
  normalY: number;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function clonePoint(point: PathAnchor): PathAnchor {
  return { x: point.x, y: point.y };
}

function cubicPoint(
  start: PathAnchor,
  controlStart: PathAnchor,
  controlEnd: PathAnchor,
  end: PathAnchor,
  t: number,
) {
  const safeT = clamp01(t);
  const invT = 1 - safeT;
  const invT2 = invT * invT;
  const invT3 = invT2 * invT;
  const t2 = safeT * safeT;
  const t3 = t2 * safeT;
  return {
    x:
      invT3 * start.x +
      3 * invT2 * safeT * controlStart.x +
      3 * invT * t2 * controlEnd.x +
      t3 * end.x,
    y:
      invT3 * start.y +
      3 * invT2 * safeT * controlStart.y +
      3 * invT * t2 * controlEnd.y +
      t3 * end.y,
  };
}

function cubicDerivative(
  start: PathAnchor,
  controlStart: PathAnchor,
  controlEnd: PathAnchor,
  end: PathAnchor,
  t: number,
) {
  const safeT = clamp01(t);
  const invT = 1 - safeT;
  return {
    x:
      3 * invT * invT * (controlStart.x - start.x) +
      6 * invT * safeT * (controlEnd.x - controlStart.x) +
      3 * safeT * safeT * (end.x - controlEnd.x),
    y:
      3 * invT * invT * (controlStart.y - start.y) +
      6 * invT * safeT * (controlEnd.y - controlStart.y) +
      3 * safeT * safeT * (end.y - controlEnd.y),
  };
}

function cubicLength(
  start: PathAnchor,
  controlStart: PathAnchor,
  controlEnd: PathAnchor,
  end: PathAnchor,
  steps = 36,
) {
  let total = 0;
  let previous = cubicPoint(start, controlStart, controlEnd, end, 0);
  for (let index = 1; index <= steps; index += 1) {
    const current = cubicPoint(start, controlStart, controlEnd, end, index / steps);
    total += Math.hypot(current.x - previous.x, current.y - previous.y);
    previous = current;
  }
  return total;
}

function straightSegmentControls(start: PathAnchor, end: PathAnchor) {
  return {
    controlStart: {
      x: start.x + (end.x - start.x) / 3,
      y: start.y + (end.y - start.y) / 3,
    },
    controlEnd: {
      x: start.x + ((end.x - start.x) * 2) / 3,
      y: start.y + ((end.y - start.y) * 2) / 3,
    },
  };
}

function makeSegment(
  start: PathAnchor,
  controlStart: PathAnchor,
  controlEnd: PathAnchor,
  end: PathAnchor,
): CubicPathSegment {
  return {
    d: `M ${round2(start.x)} ${round2(start.y)} C ${round2(controlStart.x)} ${round2(controlStart.y)} ${round2(controlEnd.x)} ${round2(controlEnd.y)} ${round2(end.x)} ${round2(end.y)}`,
    start: clonePoint(start),
    controlStart: clonePoint(controlStart),
    controlEnd: clonePoint(controlEnd),
    end: clonePoint(end),
    avgY: (start.y + controlStart.y + controlEnd.y + end.y) / 4,
    length: cubicLength(start, controlStart, controlEnd, end),
  };
}

function reflectPoint(point: PathAnchor, pivot: PathAnchor) {
  return {
    x: pivot.x * 2 - point.x,
    y: pivot.y * 2 - point.y,
  };
}

function tokenizePathData(pathData: string) {
  const tokens = String(pathData ?? "").match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g);
  return tokens ?? [];
}

function isCommandToken(token: string | undefined) {
  return Boolean(token && /^[a-zA-Z]$/.test(token));
}

function readNumber(tokens: string[], state: { index: number }) {
  const token = tokens[state.index];
  if (!token || isCommandToken(token)) {
    throw new Error(`SVG path invalido cerca de token ${state.index}.`);
  }
  state.index += 1;
  const value = Number(token);
  if (!Number.isFinite(value)) {
    throw new Error(`Numero invalido en SVG path: ${token}`);
  }
  return value;
}

export function cubicSegmentsFromSvgPath(pathData: string) {
  const tokens = tokenizePathData(pathData);
  if (!tokens.length) return [] as CubicPathSegment[];

  const state = { index: 0 };
  const segments: CubicPathSegment[] = [];
  let current: PathAnchor = { x: 0, y: 0 };
  let subpathStart: PathAnchor = { x: 0, y: 0 };
  let currentCommand = "";
  let previousCubicControlEnd: PathAnchor | null = null;

  while (state.index < tokens.length) {
    const token = tokens[state.index];
    if (!token) break;

    if (isCommandToken(token)) {
      currentCommand = token;
      state.index += 1;
    } else if (!currentCommand) {
      throw new Error("SVG path invalido: falta comando inicial.");
    }

    switch (currentCommand) {
      case "M":
      case "m": {
        const isRelative = currentCommand === "m";
        const x = readNumber(tokens, state);
        const y = readNumber(tokens, state);
        current = {
          x: isRelative ? current.x + x : x,
          y: isRelative ? current.y + y : y,
        };
        subpathStart = clonePoint(current);
        previousCubicControlEnd = null;

        while (state.index < tokens.length && !isCommandToken(tokens[state.index])) {
          const lineX = readNumber(tokens, state);
          const lineY = readNumber(tokens, state);
          const end = {
            x: isRelative ? current.x + lineX : lineX,
            y: isRelative ? current.y + lineY : lineY,
          };
          const { controlStart, controlEnd } = straightSegmentControls(current, end);
          segments.push(makeSegment(current, controlStart, controlEnd, end));
          current = end;
        }
        break;
      }

      case "L":
      case "l": {
        const isRelative = currentCommand === "l";
        while (state.index < tokens.length && !isCommandToken(tokens[state.index])) {
          const x = readNumber(tokens, state);
          const y = readNumber(tokens, state);
          const end = {
            x: isRelative ? current.x + x : x,
            y: isRelative ? current.y + y : y,
          };
          const { controlStart, controlEnd } = straightSegmentControls(current, end);
          segments.push(makeSegment(current, controlStart, controlEnd, end));
          current = end;
          previousCubicControlEnd = controlEnd;
        }
        break;
      }

      case "C":
      case "c": {
        const isRelative = currentCommand === "c";
        while (state.index < tokens.length && !isCommandToken(tokens[state.index])) {
          const controlStart = {
            x: readNumber(tokens, state),
            y: readNumber(tokens, state),
          };
          const controlEnd = {
            x: readNumber(tokens, state),
            y: readNumber(tokens, state),
          };
          const end = {
            x: readNumber(tokens, state),
            y: readNumber(tokens, state),
          };
          const resolvedControlStart = isRelative
            ? { x: current.x + controlStart.x, y: current.y + controlStart.y }
            : controlStart;
          const resolvedControlEnd = isRelative
            ? { x: current.x + controlEnd.x, y: current.y + controlEnd.y }
            : controlEnd;
          const resolvedEnd = isRelative
            ? { x: current.x + end.x, y: current.y + end.y }
            : end;

          segments.push(
            makeSegment(current, resolvedControlStart, resolvedControlEnd, resolvedEnd),
          );
          current = resolvedEnd;
          previousCubicControlEnd = resolvedControlEnd;
        }
        break;
      }

      case "S":
      case "s": {
        const isRelative = currentCommand === "s";
        while (state.index < tokens.length && !isCommandToken(tokens[state.index])) {
          const controlEnd = {
            x: readNumber(tokens, state),
            y: readNumber(tokens, state),
          };
          const end = {
            x: readNumber(tokens, state),
            y: readNumber(tokens, state),
          };
          const resolvedControlStart = previousCubicControlEnd
            ? reflectPoint(previousCubicControlEnd, current)
            : clonePoint(current);
          const resolvedControlEnd = isRelative
            ? { x: current.x + controlEnd.x, y: current.y + controlEnd.y }
            : controlEnd;
          const resolvedEnd = isRelative
            ? { x: current.x + end.x, y: current.y + end.y }
            : end;

          segments.push(
            makeSegment(current, resolvedControlStart, resolvedControlEnd, resolvedEnd),
          );
          current = resolvedEnd;
          previousCubicControlEnd = resolvedControlEnd;
        }
        break;
      }

      case "Z":
      case "z": {
        if (current.x !== subpathStart.x || current.y !== subpathStart.y) {
          const { controlStart, controlEnd } = straightSegmentControls(current, subpathStart);
          segments.push(makeSegment(current, controlStart, controlEnd, subpathStart));
          current = clonePoint(subpathStart);
          previousCubicControlEnd = controlEnd;
        }
        break;
      }

      default:
        throw new Error(
          `Comando SVG path no soportado: ${currentCommand}. Usa M, L, C, S o Z.`,
        );
    }
  }

  return segments;
}

function normalizeVector(x: number, y: number) {
  const length = Math.hypot(x, y);
  if (!length) return { x: 0, y: -1 };
  return {
    x: x / length,
    y: y / length,
  };
}

export function pathPointAtRatioOnSegments(
  segments: CubicPathSegment[],
  ratio: number,
): PathSamplePoint {
  if (!segments.length) {
    return {
      x: 0,
      y: 0,
      segmentIndex: 0,
      t: 0,
      normalX: 0,
      normalY: -1,
    };
  }

  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
  if (totalLength <= 0) {
    const first = segments[0];
    return {
      x: first.start.x,
      y: first.start.y,
      segmentIndex: 0,
      t: 0,
      normalX: 0,
      normalY: -1,
    };
  }

  let targetLength = clamp01(ratio) * totalLength;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (targetLength <= segment.length || index === segments.length - 1) {
      const localT = segment.length <= 0 ? 0 : clamp01(targetLength / segment.length);
      const point = cubicPoint(
        segment.start,
        segment.controlStart,
        segment.controlEnd,
        segment.end,
        localT,
      );
      const derivative = cubicDerivative(
        segment.start,
        segment.controlStart,
        segment.controlEnd,
        segment.end,
        localT,
      );
      const tangent = normalizeVector(derivative.x, derivative.y);
      return {
        x: point.x,
        y: point.y,
        segmentIndex: index,
        t: clamp01(ratio),
        normalX: -tangent.y,
        normalY: tangent.x,
      };
    }
    targetLength -= segment.length;
  }

  const last = segments[segments.length - 1];
  const derivative = cubicDerivative(
    last.start,
    last.controlStart,
    last.controlEnd,
    last.end,
    1,
  );
  const tangent = normalizeVector(derivative.x, derivative.y);
  return {
    x: last.end.x,
    y: last.end.y,
    segmentIndex: segments.length - 1,
    t: 1,
    normalX: -tangent.y,
    normalY: tangent.x,
  };
}

export function resamplePathEquidistantPoints(
  segments: CubicPathSegment[],
  count: number,
) {
  const safeCount = Math.max(0, Math.floor(count));
  if (safeCount <= 0) return [] as PathSamplePoint[];
  if (safeCount === 1) return [pathPointAtRatioOnSegments(segments, 0)];

  return Array.from({ length: safeCount }, (_, index) =>
    pathPointAtRatioOnSegments(segments, index / Math.max(safeCount - 1, 1)),
  );
}

export function cubicSegmentsToSvgPath(segments: CubicPathSegment[]) {
  if (!segments.length) return "";
  return segments
    .map((segment, index) => {
      const prefix = index === 0 ? `M ${round2(segment.start.x)} ${round2(segment.start.y)} ` : "";
      return `${prefix}C ${round2(segment.controlStart.x)} ${round2(segment.controlStart.y)} ${round2(segment.controlEnd.x)} ${round2(segment.controlEnd.y)} ${round2(segment.end.x)} ${round2(segment.end.y)}`;
    })
    .join(" ");
}
