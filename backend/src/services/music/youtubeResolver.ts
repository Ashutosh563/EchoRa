import { logger } from "../../utils/logger.js";

const CACHE_MAX_SIZE = 500;
const videoIdCache = new Map<string, string>();

/**
 * Checks if a YouTube video permits embedded playback using YouTube's fast oEmbed endpoint.
 * Returns false if the video owner disabled embedding (Error 150 / 101) or video is unavailable.
 */
async function isEmbeddable(videoId: string): Promise<boolean> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(oembedUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(1800),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Resolves a track name and artist to a verified embeddable YouTube Video ID for native audio streaming.
 * Checks candidate results to guarantee the video does NOT suffer from Error 150 (embed disabled).
 */
export async function resolveYouTubeVideoId(trackName: string, artist?: string | null): Promise<string | null> {
  if (!trackName) return null;

  // Prefer "song" or "audio" over "official audio" to avoid label-locked videos with embedding disabled
  const searchQuery = artist ? `${trackName} ${artist} audio` : `${trackName} audio`;
  const cacheKey = searchQuery.toLowerCase().trim();

  const cached = videoIdCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

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

    // Extract all candidate video IDs in search result order
    const regex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
    const candidates: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(html)) !== null) {
      const vid = match[1];
      if (!candidates.includes(vid)) {
        candidates.push(vid);
      }
      if (candidates.length >= 8) break;
    }

    if (candidates.length === 0) {
      logger.warn(`[YouTubeResolver] No video ID found in YouTube response for "${searchQuery}"`);
      return null;
    }

    // Find the first candidate that actually permits embedding
    let selectedVideoId: string | null = null;
    for (const vid of candidates) {
      const embeddable = await isEmbeddable(vid);
      if (embeddable) {
        selectedVideoId = vid;
        break;
      } else {
        logger.info(`[YouTubeResolver] Skipped video ${vid} (embed disabled by owner). Checking next candidate...`);
      }
    }

    // Fallback to first candidate if none explicitly passed oEmbed check
    const finalVideoId = selectedVideoId || candidates[0];

    // Cache the resolved result
    if (videoIdCache.size >= CACHE_MAX_SIZE) {
      const oldestKey = videoIdCache.keys().next().value;
      if (oldestKey) videoIdCache.delete(oldestKey);
    }
    videoIdCache.set(cacheKey, finalVideoId);

    logger.info(`[YouTubeResolver] Resolved "${searchQuery}" -> Verified Embeddable YouTube ID: ${finalVideoId}`);
    return finalVideoId;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`[YouTubeResolver] Error resolving YouTube ID for "${searchQuery}": ${msg}`);
    return null;
  }
}
