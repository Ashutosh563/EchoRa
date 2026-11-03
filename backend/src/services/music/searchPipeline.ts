import type { MusicIntent } from "../../types/intent.js";
import type { Track } from "../../types/track.js";
import type { SearchResponse } from "../../types/api.js";
import type { IntentExtractor } from "../gemini/intentExtractor.js";
import type { SpotifySearch } from "../spotify/spotifySearch.js";
import { generateQueries } from "./queryGenerator.js";
import { BACKEND_MOCK_TRACKS, getMockIntent } from "./mockMusic.js";

export interface SearchPipelineOptions {
  intentExtractor: IntentExtractor | null;
  spotifySearch: SpotifySearch | null;
}

export function createSearchPipeline({ intentExtractor, spotifySearch }: SearchPipelineOptions) {
  return {
    async interpret(prompt: string, mode: "mock" | "live", signal?: AbortSignal): Promise<{ mode: "mock" | "live"; intent: MusicIntent; notice?: string }> {
      if (mode === "mock" || !intentExtractor) {
        return {
          mode: "mock",
          intent: getMockIntent(prompt),
          notice: "Interpreted using mock simulation (Gemini not configured or unavailable).",
        };
      }
      const intent = await intentExtractor(prompt, signal);
      return {
        mode: "live",
        intent,
      };
    },

    async search(prompt: string, mode: "mock" | "live", missingReasons: string[], signal?: AbortSignal): Promise<SearchResponse> {
      if (mode === "mock" || !intentExtractor || !spotifySearch) {
        const intent = getMockIntent(prompt);
        const queries = generateQueries(intent);
        const notice = missingReasons.length > 0 
          ? `Operating in Mock Mode: ${missingReasons.join(" ")}`
          : "Operating in Mock Mode with sample tracks.";
        return {
          mode: "mock",
          intent,
          queries,
          tracks: BACKEND_MOCK_TRACKS,
          notice,
        };
      }

      // Live mode
      // 1. Gemini extracts intent from the user's prompt ONLY (COMPLIANCE: no Spotify data sent to Gemini)
      const intent = await intentExtractor(prompt, signal);

      // 2. Pure semantic query generator
      const queries = generateQueries(intent);

      // 3. Search Spotify tracks (targeting 10-15 tracks across primary + alternative queries)
      const tracks: Track[] = [];
      const seenIds = new Set<string>();

      const primaryTracks = await spotifySearch.searchTracks(queries.primary, 10, signal);
      for (const t of primaryTracks) {
        if (!seenIds.has(t.id)) {
          seenIds.add(t.id);
          tracks.push(t);
        }
      }

      // If needed, search alternative queries to enrich results
      for (const alt of queries.alternatives) {
        if (tracks.length >= 10) break;
        const altTracks = await spotifySearch.searchTracks(alt, 5, signal);
        for (const t of altTracks) {
          if (!seenIds.has(t.id)) {
            seenIds.add(t.id);
            tracks.push(t);
          }
        }
      }

      return {
        mode: "live",
        intent,
        queries,
        tracks,
      };
    },
  };
}
