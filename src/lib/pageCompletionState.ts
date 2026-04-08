import type { PageCompletionState } from "@/lib/productDomainContracts";
import { extractPageSnippet, hasPhotoInCanvas } from "@/lib/homePageUtils";

type PageCompletionInput = {
  canvasObjects: unknown;
  rating?: number | null;
  planSummary?: string | null;
  audioUrl?: string | null;
  coverPhotoUrl?: string | null;
  thumbnailUrl?: string | null;
};

function hasMeaningfulText(input: PageCompletionInput) {
  return Boolean(extractPageSnippet(input.canvasObjects) || String(input.planSummary ?? "").trim());
}

function hasMeaningfulPhoto(input: PageCompletionInput) {
  return Boolean(
    String(input.coverPhotoUrl ?? "").trim() ||
      String(input.thumbnailUrl ?? "").trim() ||
      hasPhotoInCanvas(input.canvasObjects),
  );
}

function hasMeaningfulRating(input: PageCompletionInput) {
  return Number.isFinite(input.rating) && Number(input.rating) > 0;
}

function hasMeaningfulAudio(input: PageCompletionInput) {
  return Boolean(String(input.audioUrl ?? "").trim());
}

export function derivePageCompletionState(input: PageCompletionInput): PageCompletionState {
  const score = [
    hasMeaningfulText(input),
    hasMeaningfulPhoto(input),
    hasMeaningfulRating(input),
    hasMeaningfulAudio(input),
  ].filter(Boolean).length;

  if (score <= 0) return "pending_capture";
  if (score === 1) return "captured";
  if (score <= 3) return "enriched";
  return "complete";
}

export function isPagePendingCompletion(input: PageCompletionInput) {
  return derivePageCompletionState(input) === "pending_capture";
}
