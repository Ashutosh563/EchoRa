import { logger } from "../../utils/logger.js";

const CACHE_MAX_SIZE = 500;
const videoIdCache = new Map<string, string>();

/**
 * Resolves a track name and artist to the top-matched YouTube Video ID for native audio streaming.
 * Uses lightweight HTML search parsing with in-memory caching for sub-millisecond repeated queries.
 */
export async function resolveYouTubeVideoId(trackName: string, artist?: string | null): Promise<string | null> {
  if (!trackName) return null;

  const searchQuery = artist ? `${trackName} ${artist} official audio` : `${trackName} audio`;
  const cacheKey = searchQuery.toLowerCase().trim();

  const cached = videoIdCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      logger.warn(`[YouTubeResolver] YouTube search returned HTTP ${res.status} for "${searchQuery}"`);
      return null;
    }

    const html = await res.text();

    // Match first videoId in YouTube initialData JSON
    const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    if (match && match[1]) {
      const videoId = match[1];

      // Keep cache size bounded
      if (videoIdCache.size >= CACHE_MAX_SIZE) {
        const oldestKey = videoIdCache.keys().next().value;
        if (oldestKey) videoIdCache.delete(oldestKey);
      }
      videoIdCache.set(cacheKey, videoId);
      logger.info(`[YouTubeResolver] Resolved "${searchQuery}" -> YouTube ID: ${videoId}`);
      return videoId;
    }

    logger.warn(`[YouTubeResolver] No video ID found in YouTube response for "${searchQuery}"`);
    return null;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`[YouTubeResolver] Error resolving YouTube ID for "${searchQuery}": ${msg}`);
    return null;
  }
}

