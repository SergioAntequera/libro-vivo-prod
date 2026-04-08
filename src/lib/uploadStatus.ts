export type UploadPhase = "uploading" | "processing";

export function getUploadStatusLabel(
  phase: UploadPhase | null | undefined,
  fallback = "Subiendo archivo...",
) {
  if (phase === "processing") return "Procesando en Drive...";
  return fallback;
}
