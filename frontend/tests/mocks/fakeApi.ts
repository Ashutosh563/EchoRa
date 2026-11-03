import type { MusicApi } from "../../src/api/musicApi";
import type { SearchResponse } from "../../src/types/api";

export const SAMPLE_RESPONSE: SearchResponse = {
  mode: "mock",
  intent: {
    mood: "calm",
    activity: "studying",
    energy: "low",
    tempo: "slow",
    genre: ["ambient", "lofi"],
    vocals: "instrumental_preferred",
    time_context: "late_night",
  },
  queries: { primary: "calm ambient lofi study", alternatives: [] },
  tracks: [
    {
      id: "t1",
      name: "Test Song",
      artists: ["Test Artist", "Guest"],
      album: "Test Album",
      albumArtUrl: "https://example.com/art.jpg",
      durationMs: 185000,
      spotifyUrl: "https://open.spotify.com/track/t1",
      previewUrl: null,
    },
    {
      id: "t2",
      name: "No Art Song",
      artists: [],
      album: "Unknown",
      albumArtUrl: null,
      durationMs: null,
      spotifyUrl: "https://open.spotify.com/track/t2",
      previewUrl: null,
    },
  ],
  notice: "Showing mock data.",
};

/**
 * A controllable fake API: each call returns a promise that the test
 * resolves or rejects manually, so loading states can be asserted.
 */
export function createDeferredApi() {
  let resolveFn: (value: SearchResponse) => void = () => {};
  let rejectFn: (reason: unknown) => void = () => {};
  const calls: string[] = [];

  const api: MusicApi = {
    search: (prompt: string) => {
      calls.push(prompt);
      return new Promise<SearchResponse>((resolve, reject) => {
        resolveFn = resolve;
        rejectFn = reject;
      });
    },
  };

  return {
    api,
    calls,
    resolve: (value: SearchResponse = SAMPLE_RESPONSE) => resolveFn(value),
    reject: (reason: unknown) => rejectFn(reason),
  };
}

