import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Track } from "../../types/track.js";
import { logger } from "../../utils/logger.js";

const SCRIPT_PATH = fileURLToPath(new URL("../../../scripts/ytmusic_search.py", import.meta.url));
const BACKEND_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const WINDOWS_VENV_PYTHON = path.join(BACKEND_ROOT, ".venv", "Scripts", "python.exe");
const POSIX_VENV_PYTHON = path.join(BACKEND_ROOT, ".venv", "bin", process.platform === "win32" ? "python.exe" : "python");
const VENV_PYTHON = existsSync(WINDOWS_VENV_PYTHON) ? WINDOWS_VENV_PYTHON : POSIX_VENV_PYTHON;
const SEARCH_TIMEOUT_MS = 12_000;

interface YTMusicSearchResult {
  videoId?: unknown;
  title?: unknown;
  artists?: Array<{ name?: unknown } | string>;
  album?: unknown;
  thumbnails?: Array<{ url?: unknown; width?: unknown }>;
  duration?: unknown;
  year?: unknown;
}

export interface YouTubeMusicSearch {
  searchTracks(query: string, maxResults: number, signal?: AbortSignal): Promise<Track[]>;
}

function parseDurationMs(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const parts = value.split(":").map(Number);
  if (!parts.length || parts.some((part) => !Number.isFinite(part))) return null;
  return parts.reduce((total, part) => total * 60 + part, 0) * 1000;
}

function mapResult(raw: YTMusicSearchResult): Track | null {
  if (typeof raw.videoId !== "string" || !raw.videoId.trim()) return null;
  const id = raw.videoId.trim();
  const name = typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : "Unknown title";
  const artists = (raw.artists ?? [])
    .map((artist) => (typeof artist === "string" ? artist.trim() : typeof artist?.name === "string" ? artist.name.trim() : ""))
    .filter(Boolean);
  const album = typeof raw.album === "string" ? raw.album : "YouTube Music";
  const thumbnails = (raw.thumbnails ?? []).filter(
    (thumbnail): thumbnail is { url: string; width?: number } => typeof thumbnail?.url === "string",
  );
  const albumArtUrl = thumbnails.sort(
    (a, b) => Math.abs(Number(a.width ?? 300) - 300) - Math.abs(Number(b.width ?? 300) - 300),
  )[0]?.url ?? null;
  const yearMatch = typeof raw.year === "string" ? raw.year.match(/(?:19|20)\d{2}/) : null;
  const searchTerm = encodeURIComponent(`${name} ${artists[0] ?? ""}`.trim());

  return {
    id: `ytmusic:${id}`,
    name,
    artists,
    album: album || "YouTube Music",
    albumArtUrl,
    durationMs: parseDurationMs(raw.duration),
    spotifyUrl: `https://open.spotify.com/search/${searchTerm}`,
    catalogSource: "youtube_music",
    catalogUrl: `https://music.youtube.com/watch?v=${encodeURIComponent(id)}`,
    previewUrl: null,
    releaseYear: yearMatch ? Number(yearMatch[0]) : null,
  };
}

export function createYouTubeMusicSearch(
  pythonExecutable = process.env.YT_MUSIC_PYTHON || (existsSync(VENV_PYTHON) ? VENV_PYTHON : "python"),
): YouTubeMusicSearch {
  return {
    async searchTracks(query, maxResults, signal) {
      const cleanQuery = query.trim();
      if (!cleanQuery) return [];

      return new Promise<Track[]>((resolve, reject) => {
        if (signal?.aborted) {
          reject(signal.reason ?? new Error("YouTube Music search was cancelled"));
          return;
        }

        const child = spawn(pythonExecutable, ["-u", SCRIPT_PATH], { stdio: ["pipe", "pipe", "pipe"] });
        let stdout = "";
        let stderr = "";
        let settled = false;
        const finish = (fn: () => void) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          signal?.removeEventListener("abort", abort);
          fn();
        };
        const abort = () => child.kill();
        const timeout = setTimeout(() => child.kill(), SEARCH_TIMEOUT_MS);

        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", (chunk: string) => {
          stdout += chunk;
          if (stdout.length > 2_000_000) child.kill();
        });
        child.stderr.on("data", (chunk: string) => {
          stderr += chunk;
          if (stderr.length > 16_000) stderr = stderr.slice(-16_000);
        });
        child.once("error", (error) => finish(() => reject(error)));
        child.once("close", (code) => {
          if (signal?.aborted) {
            finish(() => reject(signal.reason ?? new Error("YouTube Music search was cancelled")));
            return;
          }
          if (code !== 0) {
            finish(() => reject(new Error(stderr.trim() || `ytmusicapi exited with code ${code}`)));
            return;
          }
          try {
            const rows = JSON.parse(stdout) as YTMusicSearchResult[];
            const seen = new Set<string>();
            const tracks = rows
              .map(mapResult)
              .filter((track): track is Track => Boolean(track))
              .filter((track) => {
                if (seen.has(track.id)) return false;
                seen.add(track.id);
                return true;
              });
            finish(() => resolve(tracks.slice(0, Math.min(Math.max(1, maxResults), 25))));
          } catch (error) {
            logger.warn("Could not parse ytmusicapi search response");
            finish(() => reject(error));
          }
        });
        signal?.addEventListener("abort", abort, { once: true });
        child.stdin.end(JSON.stringify({ query: cleanQuery, limit: Math.min(Math.max(1, maxResults), 25) }));
      });
    },
  };
}
