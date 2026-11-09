import { Ytdl } from "@distube/ytdl-core";
import { logger } from "../../utils/logger.js";
import { resolveYouTubeVideoId } from "./youtubeResolver.js";

const ytdl = new Ytdl();

interface CachedAudioUrl {
  url: string;
  expiresAt: number;
}
const audioUrlCache = new Map<string, CachedAudioUrl>();

/**
 * Resolves a track to its direct Google Video audio stream URL.
 * Caches the URL for fast repeated seek/playback requests.
 */
export async function getDirectAudioStreamUrl(
  trackName: string,
  artist?: string | null,
  directVideoId?: string | null,
): Promise<string | null> {
  const videoId = directVideoId || (await resolveYouTubeVideoId(trackName, artist));

  if (!videoId) {
    logger.warn(`[AudioStream] No video ID found for "${trackName}" by "${artist || "Unknown"}"`);
    return null;
  }

  const cached = audioUrlCache.get(videoId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  try {
    logger.info(`[AudioStream] Extracting direct audio stream URL for videoId: ${videoId}`);
    const info = await ytdl.getInfo(videoId);
    const audioFormats = info.formats.filter((f: any) => f.hasAudio && !f.hasVideo);

    if (!audioFormats || audioFormats.length === 0) {
      logger.warn(`[AudioStream] No audio format found for videoId: ${videoId}`);
      return null;
    }

    // Select the best quality audio format
    const bestFormat = audioFormats[0];
    const url = bestFormat?.url;

    if (!url) {
      logger.warn(`[AudioStream] No direct URL found on audio format for videoId: ${videoId}`);
      return null;
    }

    // Cache the direct URL for 3 hours
    audioUrlCache.set(videoId, {
      url,
      expiresAt: Date.now() + 3 * 3600 * 1000,
    });

    return url;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[AudioStream] Failed to get audio URL for videoId ${videoId}: ${msg}`);
    return null;
  }
}
