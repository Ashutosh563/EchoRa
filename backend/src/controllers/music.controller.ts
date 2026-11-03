import type { Request, Response, NextFunction } from "express";
import type { MusicPromptBody } from "../middleware/validateMusicPrompt.js";
import type { SearchPipelineOptions } from "../services/music/searchPipeline.js";
import { createSearchPipeline } from "../services/music/searchPipeline.js";
import type { AppConfig } from "../config/env.js";
import type { CredentialState } from "../services/credentialState.js";
import type { SpotifyAuth } from "../services/spotify/spotifyAuth.js";
import { resolveAppMode } from "../services/music/modeResolver.js";

export function createMusicController(
  config: AppConfig,
  credState: CredentialState,
  spotifyAuth: SpotifyAuth | null,
  pipelineOptions: SearchPipelineOptions,
) {
  const pipeline = createSearchPipeline(pipelineOptions);

  return {
    async interpret(req: Request<unknown, unknown, MusicPromptBody>, res: Response, next: NextFunction) {
      try {
        const { prompt } = req.body;
        const resolution = resolveAppMode(config, credState, spotifyAuth);
        const result = await pipeline.interpret(prompt, resolution.interpretMode);
        res.json(result);
      } catch (err) {
        next(err);
      }
    },

    async search(req: Request<unknown, unknown, MusicPromptBody>, res: Response, next: NextFunction) {
      try {
        const { prompt } = req.body;
        const resolution = resolveAppMode(config, credState, spotifyAuth);
        const result = await pipeline.search(prompt, resolution.searchMode, resolution.status.missing);
        res.json(result);
      } catch (err) {
        next(err);
      }
    },
  };
}

