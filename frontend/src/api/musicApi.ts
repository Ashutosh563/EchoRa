import type { SearchResponse } from "../types/api";
import type { BrowserContext, DiscoveryMode, HistorySignal, UserPreferences } from "../types/discovery";

export interface SearchOptions {
  discoveryMode?: DiscoveryMode;
  preferences?: UserPreferences;
  historySignals?: HistorySignal[];
  browserContext?: BrowserContext;
}

/**
 * Abstraction over the data source used by the UI.
 * The UI depends only on this interface, so the mock client can be
 * replaced by the HTTP client without changing any components.
 */
export interface MusicApi {
  search(
    prompt: string,
    optionsOrSignal?: SearchOptions | AbortSignal,
    signal?: AbortSignal,
  ): Promise<SearchResponse>;
}

/** Error carrying a user-friendly message that is safe to display. */
export class MusicApiError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "MusicApiError";
    this.code = code;
  }
}
