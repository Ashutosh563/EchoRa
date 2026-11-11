import type { SearchResponse, StatusResponse } from "../types/api";
import { MusicApiError, type MusicApi, type SearchOptions } from "./musicApi";

export interface FullMusicApi extends MusicApi {
  getStatus(signal?: AbortSignal): Promise<StatusResponse>;
}

export function createHttpMusicClient(): FullMusicApi {
  return {
    async search(
      prompt: string,
      optionsOrSignal?: SearchOptions | AbortSignal,
      signal?: AbortSignal,
    ): Promise<SearchResponse> {
      const activeSignal =
        optionsOrSignal instanceof AbortSignal || (optionsOrSignal && typeof (optionsOrSignal as any).aborted === "boolean")
          ? (optionsOrSignal as AbortSignal)
          : signal;
      const options =
        optionsOrSignal instanceof AbortSignal || (optionsOrSignal && typeof (optionsOrSignal as any).aborted === "boolean")
          ? undefined
          : (optionsOrSignal as SearchOptions | undefined);

      let res: Response;
      try {
        res = await fetch("/api/music/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            discoveryMode: options?.discoveryMode,
            preferences: options?.preferences,
            historySignals: options?.historySignals,
            browserContext: options?.browserContext,
          }),
          signal: activeSignal,
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          throw err;
        }
        throw new MusicApiError(
          "NETWORK_ERROR",
          "Could not reach the ECHORA server. Make sure the backend is running.",
        );
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const code = errorData?.error?.code || "SEARCH_FAILED";
        const message = errorData?.error?.message || "An unexpected error occurred while searching.";
        throw new MusicApiError(code, message);
      }

      return (await res.json()) as SearchResponse;
    },

    async getStatus(signal?: AbortSignal): Promise<StatusResponse> {
      try {
        const res = await fetch("/api/status", { signal });
        if (!res.ok) throw new Error("Status check failed");
        return (await res.json()) as StatusResponse;
      } catch {
        // Fallback default status
        return {
          mode: "mock",
          interpretMode: "mock",
          gemini: { configured: false, valid: null },
          openai: { configured: false, valid: null },
          spotify: { configured: false, valid: null, authorized: false },
          missing: ["Backend server unavailable."],
        };
      }
    },
  };
}

