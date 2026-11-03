import type { MusicIntent, SearchResponse } from "../types/api";
import { MusicApiError, type MusicApi } from "./musicApi";
import {
  DEFAULT_MOCK_INTENT,
  MOCK_INTENT_RULES,
  MOCK_TIME_RULES,
  MOCK_TRACKS,
} from "../mocks/mockData";

const SIMULATED_DELAY_MS = 700;

/** Simulates AI interpretation with simple keyword matching. */
export function simulateInterpretation(prompt: string): MusicIntent {
  const text = prompt.toLowerCase();
  const matched = MOCK_INTENT_RULES.find((rule) => rule.keywords.some((k) => text.includes(k)));
  const time = MOCK_TIME_RULES.find((rule) => rule.keywords.some((k) => text.includes(k)));

  return {
    ...DEFAULT_MOCK_INTENT,
    ...(matched?.intent ?? {}),
    time_context: time?.time_context ?? (matched ? "any" : DEFAULT_MOCK_INTENT.time_context),
  };
}

/** Builds a mock search query from the intent (real logic lives on the backend). */
function mockQuery(intent: MusicIntent): string {
  return [intent.mood, ...intent.genre, intent.activity].filter(Boolean).join(" ");
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

/**
 * Frontend-only mock client. Lets the UI be tested without a backend.
 * Special prompts help exercise UI states manually:
 *   - containing "simulate error" -> error message
 *   - containing "simulate empty" -> empty results
 */
export function createMockClient(delayMs = SIMULATED_DELAY_MS): MusicApi {
  return {
    async search(prompt: string, signal?: AbortSignal): Promise<SearchResponse> {
      await wait(delayMs, signal);
      const text = prompt.toLowerCase();

      if (text.includes("simulate error")) {
        throw new MusicApiError("MOCK_ERROR", "Something went wrong while searching. Please try again.");
      }

      const intent = simulateInterpretation(prompt);
      return {
        mode: "mock",
        intent,
        queries: { primary: mockQuery(intent), alternatives: [] },
        tracks: text.includes("simulate empty") ? [] : MOCK_TRACKS,
        notice: "Showing mock data. Live AI and Spotify search are not connected yet.",
      };
    },
  };
}

