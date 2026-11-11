import { Ytdl } from "@distube/ytdl-core";
import { logger } from "../../utils/logger.js";
import { resolveYouTubeVideoId } from "./youtubeResolver.js";
import { resolveTrackPreview } from "../spotify/previewEnricher.js";

const ytdl = new Ytdl();

interface CachedAudioUrl {
  url: string;
  expiresAt: number;
}
const audioUrlCache = new Map<string, CachedAudioUrl>();

/**
 * Resolves a track to its direct playable audio stream URL.
 * First tries YouTube direct audio with a strict safety timeout,
 * then seamlessly falls back to high-fidelity 30s public preview streams (iTunes/embed).
 * Caches the URL for fast repeated seek/playback requests.
 */
export async function getDirectAudioStreamUrl(
  trackName: string,
  artist?: string | null,
  directVideoId?: string | null,
): Promise<string | null> {
  const cacheKey = `${artist || ""}:${trackName}:${directVideoId || ""}`.toLowerCase();
  const cached = audioUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  // 1. Try YouTube stream extraction with a 3.5s timeout guard
  const videoId = directVideoId || (await resolveYouTubeVideoId(trackName, artist));
  if (videoId) {
    try {
      logger.info(`[AudioStream] Attempting direct audio stream for videoId: ${videoId}`);
      const infoPromise = ytdl.getInfo(videoId);
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error("ytdl timeout after 3500ms")), 3500),
      );

      const info = (await Promise.race([infoPromise, timeoutPromise])) as any;
      const audioFormats = info?.formats?.filter((f: any) => f.hasAudio && !f.hasVideo);

      if (audioFormats && audioFormats.length > 0) {
        const bestFormat = audioFormats[0];
        const url = bestFormat?.url;
        if (url) {
          audioUrlCache.set(cacheKey, {
            url,
            expiresAt: Date.now() + 3 * 3600 * 1000,
          });
          return url;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`[AudioStream] YouTube stream extraction skipped/failed (${msg}), falling back to preview stream`);
    }
  }

  // 2. Seamless fallback: Public audio preview stream (iTunes / Apple Music 30s m4a stream)
  try {
    logger.info(`[AudioStream] Resolving public preview audio for "${trackName}" by "${artist || "Unknown"}"`);
    const previewUrl = await resolveTrackPreview("", trackName, artist);
    if (previewUrl) {
      audioUrlCache.set(cacheKey, {
        url: previewUrl,
        expiresAt: Date.now() + 24 * 3600 * 1000,
      });
      return previewUrl;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`[AudioStream] Public preview fallback failed: ${msg}`);
  }

  logger.warn(`[AudioStream] No audio stream found for "${trackName}" by "${artist || "Unknown"}"`);
  return null;
}
