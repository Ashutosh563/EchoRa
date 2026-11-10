import type { Request, Response, NextFunction } from "express";
import type { MusicPromptBody } from "../middleware/validateMusicPrompt.js";
import type { SearchPipelineOptions } from "../services/music/searchPipeline.js";
import { createSearchPipeline } from "../services/music/searchPipeline.js";
import type { AppConfig } from "../config/env.js";
import type { CredentialState } from "../services/credentialState.js";
import type { SpotifyAuth } from "../services/spotify/spotifyAuth.js";
import type { DiscoveryContext } from "../types/discovery.js";
import { resolveAppMode } from "../services/music/modeResolver.js";

function extractDiscoveryContext(body: {
  discoveryMode?: any;
  preferences?: any;
  historySignals?: any;
  prompt?: string;
}): DiscoveryContext {
  return {
    discoveryMode: body.discoveryMode || "FAMILIAR",
    preferences: {
      favoriteGenres: body.preferences?.favoriteGenres || [],
      favoriteArtists: body.preferences?.favoriteArtists || [],
      dislikedGenres: body.preferences?.dislikedGenres || [],
      dislikedArtists: body.preferences?.dislikedArtists || [],
    },
    historySignals: body.historySignals,
    rawPrompt: body.prompt || "",
  };
}

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
        const discoveryContext = extractDiscoveryContext(req.body);
        const result = await pipeline.interpret(prompt, resolution.interpretMode, discoveryContext);
        res.json(result);
      } catch (err) {
        next(err);
      }
    },

    async search(req: Request<unknown, unknown, MusicPromptBody>, res: Response, next: NextFunction) {
      try {
        const { prompt } = req.body;
        const resolution = resolveAppMode(config, credState, spotifyAuth);
        const discoveryContext = extractDiscoveryContext(req.body);
        const result = await pipeline.search(
          prompt,
          resolution.searchMode,
          resolution.status.missing,
          discoveryContext,
        );
        res.json(result);
      } catch (err) {
        next(err);
      }
    },

    async loadMore(req: Request, res: Response, next: NextFunction) {
      try {
        const {
          prompt,
          intent,
          page,
          excludeTrackIds,
          excludeSongSignatures,
          cumulativeArtistCounts,
        } = req.body;

        const resolution = resolveAppMode(config, credState, spotifyAuth);
        const discoveryContext = extractDiscoveryContext(req.body);

        const result = await pipeline.loadMore({
          prompt: prompt || "",
          intent,
          page: Number(page) || 2,
          excludeTrackIds: Array.isArray(excludeTrackIds) ? excludeTrackIds : [],
          excludeSongSignatures: Array.isArray(excludeSongSignatures) ? excludeSongSignatures : [],
          cumulativeArtistCounts:
            cumulativeArtistCounts && typeof cumulativeArtistCounts === "object" ? cumulativeArtistCounts : {},
          mode: resolution.searchMode,
          discoveryContext,
        });

        res.json(result);
      } catch (err) {
        next(err);
      }
    },

    async refineVibe(req: Request, res: Response, next: NextFunction) {
      try {
        const { prompt, intent, refinement, discoveryMode, preferences, historySignals } = req.body;
        const resolution = resolveAppMode(config, credState, spotifyAuth);
        const discoveryContext: DiscoveryContext = {
          discoveryMode,
          preferences,
          historySignals,
          rawPrompt: prompt || "",
        };

        const result = await pipeline.refineVibe({
          prompt: prompt || "",
          intent,
          refinement: refinement || { type: "custom", label: "Custom" },
          mode: resolution.searchMode,
          discoveryContext,
        });

        res.json(result);
      } catch (err) {
        next(err);
      }
    },
  };
}
