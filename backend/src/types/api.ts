import type { MusicIntent } from "./intent.js";
import type { Track } from "./track.js";
import type { DiscoveryMode } from "./discovery.js";

export type AppMode = "mock" | "live";

export interface SearchQueries {
  primary: string;
  alternatives: string[];
}

export interface InterpretResponse {
  mode: AppMode;
  intent: MusicIntent;
  notice?: string;
}

export interface SearchResponse {
  mode: AppMode;
  discoveryMode?: DiscoveryMode;
  intent: MusicIntent;
  queries: SearchQueries;
  tracks: Track[];
  /** Mean per-track Gemini confidence for the final result set, when scores are available. */
  resultConfidence?: number | null;
  /** Number of catalog-verified Gemini recommendations included in the result set. */
  aiRecommendationsAdded?: number;
  notice?: string;
  hasMore?: boolean;
}

export interface StatusResponse {
  /** Mode used by POST /api/music/search. */
  mode: AppMode;
  /** Mode used by POST /api/music/interpret (only needs Gemini). */
  interpretMode: AppMode;
  gemini: { configured: boolean; valid: boolean | null };
  openRouter: { configured: boolean; valid: boolean | null };
  aiProviders: {
    priority: Array<"gemini" | "openRouter">;
    lastUsed: "gemini" | "openRouter" | null;
  };
  spotify: { configured: boolean; valid: boolean | null; authorized: boolean };
  youtubeMusic?: { available: boolean };
  /** Human-readable list of missing credentials / steps. Empty in live mode. */
  missing: string[];
}

export interface ErrorResponse {
  error: { code: string; message: string };
}

