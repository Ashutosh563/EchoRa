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
): ModeResolution {
  const geminiConfigured = Boolean(config.geminiApiKey);
  const openaiConfigured = Boolean(config.openaiApiKey);
  const aiReady = (geminiConfigured && credState.geminiValid !== false) || (openaiConfigured && credState.openaiValid !== false);
  const hasDedicatedSearch = Boolean(config.spotifySearchClientId && config.spotifySearchClientSecret);
  const spotifyConfigured = Boolean(config.spotifyClientId && config.spotifyClientSecret) || hasDedicatedSearch;
  const spotifyAuthorized = Boolean(spotifyAuth?.isAuthorized());

  const missing: string[] = [];
  if (!aiReady) {
    if (!geminiConfigured) missing.push("Gemini API key is not configured.");
    if (!openaiConfigured) missing.push("OpenAI API key is not configured.");
  }
  if (geminiConfigured && credState.geminiValid === false && !openaiConfigured) {
    missing.push("Gemini API key was rejected by the API.");
  }

  if (!spotifyConfigured) {
    missing.push("Spotify Client ID / Secret are not configured.");
  } else if (credState.spotifyValid === false) {
    missing.push("Spotify credentials were rejected by Spotify.");
  } else if (!hasDedicatedSearch && !spotifyAuthorized) {
    missing.push("Spotify authorization required. Click 'Connect Spotify'.");
  }

  const geminiReady = aiReady;
  const spotifyReady = hasDedicatedSearch || (spotifyConfigured && credState.spotifyValid !== false && spotifyAuthorized);

  const interpretMode: AppMode = geminiReady ? "live" : "mock";
  const searchMode: AppMode = geminiReady && spotifyReady ? "live" : "mock";

  const status: StatusResponse = {
    mode: searchMode,
    interpretMode,
    gemini: {
      configured: geminiConfigured,
      valid: credState.geminiValid,
    },
    openai: { configured: openaiConfigured, valid: credState.openaiValid },
    spotify: {
      configured: spotifyConfigured,
      valid: credState.spotifyValid,
      authorized: spotifyAuthorized,
    },
    missing,
  };

  return {
    searchMode,
    interpretMode,
    status,
  };
}
