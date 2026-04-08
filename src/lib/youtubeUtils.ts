/**
 * Extract a YouTube video ID from various URL formats.
 *
 * Supported patterns:
 *   - https://www.youtube.com/watch?v=VIDEO_ID
 *   - https://youtu.be/VIDEO_ID
 *   - https://www.youtube.com/embed/VIDEO_ID
 *   - Variants with extra query params, www prefix, etc.
 *
 * Returns the 11-char video ID or null if the URL is not a recognised YouTube link.
 */
export function parseYouTubeVideoId(url: string): string | null {
  if (!url) return null;

  const trimmed = url.trim();

  // youtube.com/watch?v=ID
  const watchMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*v=([A-Za-z0-9_-]{11})/,
  );
  if (watchMatch) return watchMatch[1];

  // youtu.be/ID
  const shortMatch = trimmed.match(
    /(?:https?:\/\/)?youtu\.be\/([A-Za-z0-9_-]{11})/,
  );
  if (shortMatch) return shortMatch[1];

  // youtube.com/embed/ID
  const embedMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
  );
  if (embedMatch) return embedMatch[1];

  return null;
}
