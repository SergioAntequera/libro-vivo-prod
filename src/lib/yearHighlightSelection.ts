export const MAX_YEAR_HIGHLIGHTS = 3;

export function isMissingYearHighlightPageIdsError(message: string) {
  const text = String(message ?? "").toLowerCase();
  return text.includes("highlight_page_ids") || text.includes("schema cache");
}

export function normalizeYearHighlightPageIds(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];

  const next: string[] = [];
  for (const entry of value) {
    const id = String(entry ?? "").trim();
    if (!id || next.includes(id)) continue;
    next.push(id);
    if (next.length >= MAX_YEAR_HIGHLIGHTS) break;
  }
  return next;
}

export function resolveExplicitYearHighlights<T extends { id: string }>(
  items: T[],
  highlightPageIds: string[],
) {
  const byId = new Map(items.map((item) => [item.id, item] as const));
  return normalizeYearHighlightPageIds(highlightPageIds)
    .map((id) => byId.get(id) ?? null)
    .filter((item): item is T => item != null);
}
