import type { Request, Response, NextFunction } from "express";
import type { AppConfig } from "../config/env.js";
import type { CredentialState } from "../services/credentialState.js";
import type { SpotifyAuth } from "../services/spotify/spotifyAuth.js";
import { resolveAppMode } from "../services/music/modeResolver.js";

export function createStatusController(
  config: AppConfig,
  credState: CredentialState,
  spotifyAuth: SpotifyAuth | null,
  youtubeMusicAvailable = false,
) {
  return {
    getStatus(_req: Request, res: Response, _next: NextFunction) {
      const resolution = resolveAppMode(config, credState, spotifyAuth, youtubeMusicAvailable);
      res.json(resolution.status);
    },
  };
}

