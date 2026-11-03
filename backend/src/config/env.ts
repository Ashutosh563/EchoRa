import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

/** Absolute path of the backend package root (works from src/ and dist/). */
export const BACKEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const ENV_FILE = path.join(BACKEND_ROOT, ".env");
export const DATA_DIR = path.join(BACKEND_ROOT, ".data");
export const SPOTIFY_TOKEN_FILE = path.join(DATA_DIR, "spotify-token.json");

/** Fixed local addresses. Loopback IP (not "localhost") per Spotify redirect URI rules. */
export const HOST = "127.0.0.1";
export const PORT = 4000;
export const BACKEND_URL = `http://${HOST}:${PORT}`;
export const FRONTEND_URL = `http://${HOST}:5173`;
export const SPOTIFY_REDIRECT_URI = `${BACKEND_URL}/api/spotify/callback`;

/** Default model alias; always points at the current Gemini Flash model. Override with GEMINI_MODEL. */
export const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";

export interface AppConfig {
  geminiApiKey: string | null;
  geminiModel: string;
  spotifyClientId: string | null;
  spotifyClientSecret: string | null;
  spotifyRedirectUri: string;
  frontendUrl: string;
  spotifyTokenFile: string;
}

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Builds configuration from an environment map (pure; easy to test). */
export function buildConfig(env: NodeJS.ProcessEnv): AppConfig {
  return {
    geminiApiKey: clean(env.GEMINI_API_KEY),
    geminiModel: clean(env.GEMINI_MODEL) ?? DEFAULT_GEMINI_MODEL,
    spotifyClientId: clean(env.SPOTIFY_CLIENT_ID),
    spotifyClientSecret: clean(env.SPOTIFY_CLIENT_SECRET),
    spotifyRedirectUri: SPOTIFY_REDIRECT_URI,
    frontendUrl: FRONTEND_URL,
    spotifyTokenFile: SPOTIFY_TOKEN_FILE,
  };
}

/** Loads backend/.env (if present) and returns the configuration. Missing values are allowed. */
export function loadConfig(): AppConfig {
  dotenv.config({ path: ENV_FILE, quiet: true });
  return buildConfig(process.env);
}

