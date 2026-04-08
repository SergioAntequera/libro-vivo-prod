type ShiftKeyEvent = Event & { shiftKey?: boolean };

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function snapToGrid(v: number, grid: number) {
  return Math.round(v / grid) * grid;
}

export function eventShiftKey(evt: { evt: ShiftKeyEvent }) {
  return Boolean(evt.evt.shiftKey);
}

export function isLocked(o: { locked?: boolean } | null | undefined) {
  return !!o?.locked;
}

function normalizeRotationDeg(v: number) {
  return ((v % 360) + 360) % 360;
}

export function isAxisAlignedRotation(v: number, tol = 4) {
  const d = normalizeRotationDeg(v);
  const mod90 = d % 90;
  const dist = Math.min(mod90, 90 - mod90);
  return dist <= tol;
}

export function getObjectRotation(
  o: { rotation?: unknown } | null | undefined,
) {
  const n = Number(o?.rotation ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function shouldCenterSnapForObject(
  o: { rotation?: unknown } | null | undefined,
) {
  return !isAxisAlignedRotation(getObjectRotation(o));
}
