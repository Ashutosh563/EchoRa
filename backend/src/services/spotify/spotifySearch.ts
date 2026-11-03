import type { Track } from "../../types/track.js";
import { AppError } from "../../utils/AppError.js";
import { logger } from "../../utils/logger.js";
import { sleep as defaultSleep, type Sleep } from "../../utils/sleep.js";
import type { SpotifyAuth } from "./spotifyAuth.js";
import { mapSpotifyTrack, type SpotifyTrackObject } from "./trackMapper.js";

export const SPOTIFY_SEARCH_URL = "https://api.spotify.com/v1/search";
/** Spotify's current maximum page size for search (reduced from 50 to 10 in 2026). */
export const SEARCH_PAGE_LIMIT = 10;
/** Hard cap on pages per query to stay well within rate limits. */
export const MAX_PAGES_PER_QUERY = 3;
const MAX_RETRIES = 2;
/** Longer Retry-After values are reported to the user instead of blocking the request. */
const MAX_RETRY_WAIT_SECONDS = 10;
const REQUEST_TIMEOUT_MS = 10_000;

interface SearchPage {
  tracks?: { items?: Array<SpotifyTrackObject | null> | null; next?: string | null; total?: number } | null;
}

export interface SpotifySearchOptions {
  auth: SpotifyAuth;
  fetchFn?: typeof fetch;
  sleep?: Sleep;
}

export interface SpotifySearch {
  /** Searches tracks for one query, paging with offset until `maxResults` are collected. */
  searchTracks(query: string, maxResults: number, signal?: AbortSignal): Promise<Track[]>;
}

function parseRetryAfter(header: string | null): number {
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : 1;
}

export function createSpotifySearch({ auth, fetchFn = fetch, sleep = defaultSleep }: SpotifySearchOptions): SpotifySearch {
  async function fetchPage(query: string, offset: number, signal?: AbortSignal): Promise<SearchPage> {
    const url = new URL(SPOTIFY_SEARCH_URL);
    url.search = new URLSearchParams({
      q: query,
      type: "track",
      limit: String(SEARCH_PAGE_LIMIT),
      offset: String(offset),
    }).toString();

    let refreshed = false;
    let serverRetried = false;

    for (let attempt = 0; ; attempt++) {
      const token = await auth.getAccessToken({ forceRefresh: refreshed && attempt > 0 && !serverRetried });
      const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);

      let response: Response;
      try {
        response = await fetchFn(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        });
      } catch (err) {
        throw new AppError("NETWORK_ERROR", { detail: "Spotify search request failed", cause: err });
      }

      if (response.ok) return (await response.json()) as SearchPage;

      const body = (await response.json().catch(() => ({}))) as { error?: { message?: string; reason?: string } };
      const detail = `Spotify search ${response.status}: ${body.error?.message ?? ""} ${body.error?.reason ?? ""}`.trim();

      if (response.status === 401 && !refreshed) {
        // Access token expired or revoked: force a refresh once and retry.
        refreshed = true;
        continue;
      }
      if (response.status === 401) throw new AppError("SPOTIFY_AUTH_REQUIRED", { detail });
      if (response.status === 403) throw new AppError("SPOTIFY_FORBIDDEN", { detail });

      if (response.status === 429) {
        const waitSeconds = parseRetryAfter(response.headers.get("Retry-After"));
        if (body.error?.reason === "QUOTA_EXCEEDED" || waitSeconds > MAX_RETRY_WAIT_SECONDS || attempt >= MAX_RETRIES) {
          throw new AppError("SPOTIFY_RATE_LIMITED", {
            message:
              waitSeconds > MAX_RETRY_WAIT_SECONDS
                ? `Spotify's request limit was reached. Please try again in about ${Math.ceil(waitSeconds / 60)} minute(s).`
                : undefined,
            detail,
          });
        }
        logger.warn(`Spotify rate limited; waiting ${waitSeconds}s (Retry-After)`);
        await sleep(waitSeconds * 1000);
        continue;
      }

      if (response.status >= 500 && !serverRetried) {
        serverRetried = true;
        await sleep(500);
        continue;
      }
      if (response.status >= 500) throw new AppError("SPOTIFY_UNAVAILABLE", { detail });

      throw new AppError("SPOTIFY_UNAVAILABLE", {
        message: "Spotify could not process that search. Try rephrasing your request.",
        detail,
      });
    }
  }

  return {
    async searchTracks(query, maxResults, signal) {
      const results: Track[] = [];
      const seen = new Set<string>();

      for (let page = 0; page < MAX_PAGES_PER_QUERY && results.length < maxResults; page++) {
        const data = await fetchPage(query, page * SEARCH_PAGE_LIMIT, signal);
        const items = data.tracks?.items ?? [];

        for (const item of items) {
          const track = mapSpotifyTrack(item);
          if (track && !seen.has(track.id)) {
            seen.add(track.id);
            results.push(track);
          }
        }

        // Stop when Spotify reports no further pages.
        if (!data.tracks?.next || items.length < SEARCH_PAGE_LIMIT) break;
      }

      return results.slice(0, maxResults);
    },
  };
}

