import type { Track } from "../../types/track.js";
import { logger } from "../../utils/logger.js";

const previewCache = new Map<string, string | null>();

/**
 * Resolves a 30-second audio preview stream URL for a given track.
 * Checks an in-memory cache, then queries iTunes Search API, then falls back to Spotify embed state.
 */
export async function resolveTrackPreview(
  trackId: string,
  trackName: string,
  artistName?: string | null,
): Promise<string | null> {
  if (previewCache.has(trackId)) {
    return previewCache.get(trackId) ?? null;
  }

  const cleanArtist = (artistName || "").replace(/feat\..*$/i, "").trim();
  const searchTerm = `${cleanArtist} ${trackName}`.trim();

  // 1. Try iTunes Search API
  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=song&limit=1`;
    const res = await fetch(itunesUrl, {
      signal: AbortSignal.timeout(1800),
      headers: { "User-Agent": "EchoRa/1.0" },
    });

    if (res.ok) {
      const data = (await res.json()) as { results?: Array<{ previewUrl?: string }> };
      const preview = data.results?.[0]?.previewUrl;
      if (preview && typeof preview === "string") {
        previewCache.set(trackId, preview);
        return preview;
      }
    }
  } catch {
    // Non-fatal, try fallback
  }

  // 2. Fallback to Spotify Embed Page audioPreview
  if (trackId) {
    try {
      const embedUrl = `https://open.spotify.com/embed/track/${encodeURIComponent(trackId)}`;
      const res = await fetch(embedUrl, {
        signal: AbortSignal.timeout(1800),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (res.ok) {
        const html = await res.text();
        const match = html.match(/"audioPreview":\s*\{\s*"url":\s*"([^"]+)"/);
        if (match?.[1]) {
          const preview = match[1].replace(/\\u002F/g, "/");
          previewCache.set(trackId, preview);
          return preview;
        }
      }
    } catch {
      // Non-fatal
    }
  }

  // Cache null result to prevent repeated failed lookups
  previewCache.set(trackId, null);
  return null;
}

/**
 * Enriches a collection of tracks with playable 30-second preview URLs.
 * Resolves lookups concurrently with a safety boundary so searches never fail.
 */
export async function enrichTracksWithPreviews(tracks: Track[]): Promise<Track[]> {
  if (!tracks || tracks.length === 0) return tracks;

  const enrichedPromises = tracks.map(async (track) => {
    if (track.previewUrl) return track;
    if (track.catalogSource === "youtube_music") return track;

    try {
      const previewUrl = await resolveTrackPreview(track.id, track.name, track.artists?.[0]);
      if (previewUrl) {
        return { ...track, previewUrl };
      }
    } catch (err) {
      logger.warn(`Failed preview lookup for ${track.name}:`, err);
    }
    return track;
  });

  return Promise.all(enrichedPromises);
}
