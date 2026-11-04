import type { MusicIntent } from "../../types/intent.js";
import type { Track } from "../../types/track.js";
import type { SearchResponse } from "../../types/api.js";
import type { DiscoveryContext } from "../../types/discovery.js";
import type { IntentExtractor } from "../gemini/intentExtractor.js";
import type { SpotifySearch } from "../spotify/spotifySearch.js";
import { generateQueries } from "./queryGenerator.js";
import { defaultDiscoveryProcessor } from "./discoveryProcessor.js";
import { BACKEND_MOCK_TRACKS, getMockIntent } from "./mockMusic.js";

export interface SearchPipelineOptions {
  intentExtractor: IntentExtractor | null;
  spotifySearch: SpotifySearch | null;
}

export function createSearchPipeline({ intentExtractor, spotifySearch }: SearchPipelineOptions) {
  return {
    async interpret(
      prompt: string,
      mode: "mock" | "live",
      discoveryContext?: DiscoveryContext,
      signal?: AbortSignal,
    ): Promise<{ mode: "mock" | "live"; intent: MusicIntent; notice?: string }> {
      const fallbackContext: DiscoveryContext = discoveryContext ?? {
        discoveryMode: "FAMILIAR",
        preferences: { favoriteGenres: [], favoriteArtists: [], dislikedGenres: [], dislikedArtists: [] },
        rawPrompt: prompt,
      };

      if (mode === "mock" || !intentExtractor) {
        const rawIntent = getMockIntent(prompt);
        const discoveryResult = defaultDiscoveryProcessor.process(fallbackContext, rawIntent);
        return {
          mode: "mock",
          intent: discoveryResult.adjustedIntent,
          notice: "Interpreted using mock simulation (Gemini not configured or unavailable).",
        };
      }
      const rawIntent = await intentExtractor(prompt, signal);
      const discoveryResult = defaultDiscoveryProcessor.process(fallbackContext, rawIntent);
      return {
        mode: "live",
        intent: discoveryResult.adjustedIntent,
      };
    },

    async search(
      prompt: string,
      mode: "mock" | "live",
      missingReasons: string[],
      discoveryContext?: DiscoveryContext,
      signal?: AbortSignal,
    ): Promise<SearchResponse> {
      const fallbackContext: DiscoveryContext = discoveryContext ?? {
        discoveryMode: "FAMILIAR",
        preferences: { favoriteGenres: [], favoriteArtists: [], dislikedGenres: [], dislikedArtists: [] },
        rawPrompt: prompt,
      };

      if (mode === "mock" || !intentExtractor || !spotifySearch) {
        const rawIntent = getMockIntent(prompt);
        const discoveryResult = defaultDiscoveryProcessor.process(fallbackContext, rawIntent);
        const queries = generateQueries(discoveryResult.adjustedIntent, discoveryResult);
        const notice = missingReasons.length > 0 
          ? `Operating in Mock Mode: ${missingReasons.join(" ")}`
          : "Operating in Mock Mode with sample tracks.";
        return {
          mode: "mock",
          discoveryMode: discoveryResult.mode,
          intent: discoveryResult.adjustedIntent,
          queries,
          tracks: BACKEND_MOCK_TRACKS,
          notice,
        };
      }

      // Live mode
      // 1. Gemini extracts intent from the user's prompt ONLY (COMPLIANCE: no Spotify data sent to Gemini)
      const rawIntent = await intentExtractor(prompt, signal);

      // 2. Discovery Preference Processor processes preferences & mode (COMPLIANCE: zero extra Gemini calls)
      const discoveryResult = defaultDiscoveryProcessor.process(fallbackContext, rawIntent);

      // 3. Pure semantic query generator (generates EXACTLY ONE search query)
      const queries = generateQueries(discoveryResult.adjustedIntent, discoveryResult);

      // 4. Search Spotify tracks using EXACTLY ONE Spotify search request
      const tracks: Track[] = await spotifySearch.searchTracks(queries.primary, 10, signal);

      return {
        mode: "live",
        discoveryMode: discoveryResult.mode,
        intent: discoveryResult.adjustedIntent,
        queries,
        tracks,
      };
    },
  };
}
