import type { Request, Response, NextFunction } from "express";
import type { MusicPromptBody } from "../middleware/validateMusicPrompt.js";
import type { SearchPipelineOptions } from "../services/music/searchPipeline.js";
import { createSearchPipeline } from "../services/music/searchPipeline.js";
import type { AppConfig } from "../config/env.js";
import type { CredentialState } from "../services/credentialState.js";
import type { SpotifyAuth } from "../services/spotify/spotifyAuth.js";
import type { DiscoveryContext } from "../types/discovery.js";
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
        const { prompt, discoveryMode, preferences, historySignals } = req.body;
        const resolution = resolveAppMode(config, credState, spotifyAuth, Boolean(pipelineOptions.youtubeMusicSearch));
        const discoveryContext: DiscoveryContext = {
          discoveryMode,
          preferences,
          historySignals,
          rawPrompt: prompt,
        };
        const result = await pipeline.interpret(prompt, resolution.interpretMode, discoveryContext);
        res.json(result);
      } catch (err) {
        next(err);
      }
    },

    async search(req: Request<unknown, unknown, MusicPromptBody>, res: Response, next: NextFunction) {
      try {
        const { prompt, discoveryMode, preferences, historySignals, browserContext } = req.body;
        const resolution = resolveAppMode(config, credState, spotifyAuth, Boolean(pipelineOptions.youtubeMusicSearch));
        const discoveryContext: DiscoveryContext = {
          discoveryMode,
          preferences,
          historySignals,
          browserContext,
          rawPrompt: prompt,
        };
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
          discoveryMode,
          preferences,
          historySignals,
          browserContext,
        } = req.body;

        const resolution = resolveAppMode(config, credState, spotifyAuth, Boolean(pipelineOptions.youtubeMusicSearch));
        const discoveryContext: DiscoveryContext = {
          discoveryMode: discoveryMode ?? "FAMILIAR",
          preferences: preferences ?? {
            favoriteGenres: [],
            favoriteArtists: [],
            dislikedGenres: [],
            dislikedArtists: [],
          },
          historySignals: historySignals ?? [],
          rawPrompt: prompt || "",
          browserContext,
        };

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
        const { prompt, intent, refinement, discoveryMode, preferences, historySignals, browserContext } = req.body;
        const resolution = resolveAppMode(config, credState, spotifyAuth, Boolean(pipelineOptions.youtubeMusicSearch));
        const discoveryContext: DiscoveryContext = {
          discoveryMode: discoveryMode ?? "FAMILIAR",
          preferences: preferences ?? {
            favoriteGenres: [],
            favoriteArtists: [],
            dislikedGenres: [],
            dislikedArtists: [],
          },
          historySignals: historySignals ?? [],
          rawPrompt: prompt || "",
          browserContext,
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
