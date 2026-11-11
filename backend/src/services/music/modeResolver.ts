import type { AppConfig } from "../../config/env.js";
import type { CredentialState } from "../credentialState.js";
import type { SpotifyAuth } from "../spotify/spotifyAuth.js";
import type { AppMode, StatusResponse } from "../../types/api.js";

export interface ModeResolution {
  searchMode: AppMode;
  interpretMode: AppMode;
  status: StatusResponse;
}

export function resolveAppMode(
  config: AppConfig,
  credState: CredentialState,
  spotifyAuth: SpotifyAuth | null,
  youtubeMusicAvailable = false,
): ModeResolution {
  const geminiConfigured = Boolean(config.geminiApiKey);
  const openRouterConfigured = Boolean(config.openRouterApiKey);
  const aiReady = (geminiConfigured && credState.geminiValid !== false) || (openRouterConfigured && credState.openRouterValid !== false);
  const spotifyConfigured = Boolean(config.spotifyClientId && config.spotifyClientSecret);
  const spotifyAuthorized = Boolean(spotifyAuth?.isAuthorized());

  const missing: string[] = [];
  if (!aiReady) {
    if (!geminiConfigured) missing.push("Gemini API key is not configured.");
    if (!openRouterConfigured) missing.push("OpenRouter API key is not configured.");
    if (geminiConfigured && credState.geminiValid === false) missing.push("Gemini API key was rejected by the API.");
    if (openRouterConfigured && credState.openRouterValid === false) missing.push("OpenRouter API key was rejected by the API.");
  }

  if (!spotifyConfigured && !youtubeMusicAvailable) {
    missing.push("Spotify Client ID / Secret are not configured.");
  } else if (spotifyConfigured && credState.spotifyValid === false && !youtubeMusicAvailable) {
    missing.push("Spotify credentials were rejected by Spotify.");
  } else if (spotifyConfigured && !spotifyAuthorized && !youtubeMusicAvailable) {
    missing.push("Spotify authorization required. Click 'Connect Spotify'.");
  }

  const geminiReady = aiReady;
  const spotifyReady = spotifyConfigured && credState.spotifyValid !== false && spotifyAuthorized;

  const interpretMode: AppMode = geminiReady ? "live" : "mock";
  const searchMode: AppMode = geminiReady && (spotifyReady || youtubeMusicAvailable) ? "live" : "mock";

  const status: StatusResponse = {
    mode: searchMode,
    interpretMode,
    gemini: {
      configured: geminiConfigured,
      valid: credState.geminiValid,
    },
    openRouter: { configured: openRouterConfigured, valid: credState.openRouterValid },
    aiProviders: {
      priority: ["gemini", "openRouter"],
      lastUsed: credState.lastAiProvider,
    },
    spotify: {
      configured: spotifyConfigured,
      valid: credState.spotifyValid,
      authorized: spotifyAuthorized,
    },
    youtubeMusic: { available: youtubeMusicAvailable },
    missing,
  };

  return {
    searchMode,
    interpretMode,
    status,
  };
}
