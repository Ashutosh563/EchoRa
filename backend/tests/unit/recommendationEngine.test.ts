import { describe, it, expect } from "vitest";
import { generateQueries } from "../../src/services/music/queryGenerator.js";
import { parseIntent } from "../../src/services/gemini/intentExtractor.js";
import type { MusicIntent } from "../../src/types/intent.js";
import { RECOMMENDATION_TEST_PROMPTS } from "../fixtures/recommendationPrompts.js";

describe("Improved Recommendation Engine - Query Generation", () => {
  it("generates exactly ONE query per request (alternatives array must be empty)", () => {
    const intent: MusicIntent = {
      mood: "peaceful",
      activity: "studying",
      energy: "low",
      tempo: "slow",
      genre: ["ambient", "lofi"],
      vocals: "instrumental_preferred",
      time_context: "late_night",
      breakdown: {
        mood: { value: "peaceful", source: "explicit", priority: "high" },
        activity: { value: "studying", source: "explicit", priority: "high" },
        vocals: { value: "instrumental_preferred", source: "explicit", priority: "medium_high" },
        energy: { value: "low", source: "inferred", priority: "low" },
        tempo: { value: "slow", source: "inferred", priority: "low" },
        genre: { value: ["ambient", "lofi"], source: "optional", priority: "low" },
        time_context: { value: "late_night", source: "inferred", priority: "low" },
      },
    };

    const queries = generateQueries(intent);
    expect(queries.primary).toBeTruthy();
    expect(queries.alternatives).toEqual([]); // STRICT requirement: exactly ONE query
  });

  it("prioritizes explicit constraints over optional genre suggestions", () => {
    // "Peaceful music for studying, preferably without lyrics"
    const intent: MusicIntent = {
      mood: "peaceful",
      activity: "studying",
      energy: "low",
      tempo: "slow",
      genre: ["ambient", "lofi", "classical"],
      vocals: "instrumental_preferred",
      time_context: "late_night",
      breakdown: {
        mood: { value: "peaceful", source: "explicit", priority: "high" },
        activity: { value: "studying", source: "explicit", priority: "high" },
        vocals: { value: "instrumental_preferred", source: "explicit", priority: "medium_high" },
        energy: { value: "low", source: "inferred", priority: "low" },
        tempo: { value: "slow", source: "inferred", priority: "low" },
        genre: { value: ["ambient", "lofi"], source: "optional", priority: "low" },
        time_context: { value: "late_night", source: "inferred", priority: "low" },
      },
    };

    const { primary } = generateQueries(intent);
    // Explicit preferences: peaceful, study, instrumental must be present
    expect(primary).toContain("peaceful");
    expect(primary).toContain("study");
    expect(primary).toContain("instrumental");
    // Should NOT overload with all optional genres
    const wordCount = primary.split(" ").length;
    expect(wordCount).toBeLessThanOrEqual(4);
  });

  it("handles ambiguous prompts without inventing fake preferences", () => {
    // "Something good to listen to"
    const intent: MusicIntent = {
      mood: "any",
      activity: null,
      energy: "medium",
      tempo: "any",
      genre: [],
      vocals: "any",
      time_context: "any",
      breakdown: {
        mood: { value: null, source: "unspecified", priority: "none" },
        activity: { value: null, source: "unspecified", priority: "none" },
        vocals: { value: null, source: "unspecified", priority: "none" },
        energy: { value: null, source: "unspecified", priority: "none" },
        tempo: { value: null, source: "unspecified", priority: "none" },
        genre: { value: [], source: "unspecified", priority: "none" },
        time_context: { value: null, source: "unspecified", priority: "none" },
      },
    };

    const { primary } = generateQueries(intent);
    expect(primary).toBe("good music");
    expect(primary).not.toContain("chill");
    expect(primary).not.toContain("ambient");
  });

  it("handles sad music prompt concisely", () => {
    // "Sad music"
    const intent: MusicIntent = {
      mood: "sad",
      activity: null,
      energy: "low",
      tempo: "slow",
      genre: [],
      vocals: "any",
      time_context: "any",
      breakdown: {
        mood: { value: "sad", source: "explicit", priority: "high" },
        activity: { value: null, source: "unspecified", priority: "none" },
        vocals: { value: null, source: "unspecified", priority: "none" },
        energy: { value: "low", source: "inferred", priority: "low" },
        tempo: { value: "slow", source: "inferred", priority: "low" },
        genre: { value: [], source: "unspecified", priority: "none" },
        time_context: { value: null, source: "unspecified", priority: "none" },
      },
    };

    const { primary } = generateQueries(intent);
    expect(primary).toBe("sad");
  });

  it("evaluates query generation for fixtures dataset", () => {
    expect(RECOMMENDATION_TEST_PROMPTS.length).toBeGreaterThanOrEqual(50);
  });
});

describe("Improved Semantic Understanding - Categorized Intent Parsing", () => {
  it("parses new categorized schema correctly into explicit, inferred, and optional", () => {
    const raw = JSON.stringify({
      explicit: {
        mood: "peaceful",
        activity: "studying",
        energy: null,
        tempo: null,
        genre: [],
        vocals: "instrumental_preferred",
        time_context: null,
      },
      inferred: {
        mood: null,
        activity: null,
        energy: "low",
        tempo: "slow",
        vocals: null,
        time_context: "late_night",
      },
      optional: {
        genre: ["ambient", "lofi"],
      },
    });

    const parsed = parseIntent(raw);

    expect(parsed.mood).toBe("peaceful");
    expect(parsed.activity).toBe("studying");
    expect(parsed.vocals).toBe("instrumental_preferred");
    expect(parsed.energy).toBe("low");
    expect(parsed.tempo).toBe("slow");
    expect(parsed.genre).toEqual(["ambient", "lofi"]);

    // Breakdown check
    expect(parsed.breakdown?.mood).toEqual({ value: "peaceful", source: "explicit", priority: "high" });
    expect(parsed.breakdown?.activity).toEqual({ value: "studying", source: "explicit", priority: "high" });
    expect(parsed.breakdown?.vocals).toEqual({
      value: "instrumental_preferred",
      source: "explicit",
      priority: "medium_high",
    });
    expect(parsed.breakdown?.energy).toEqual({ value: "low", source: "inferred", priority: "low" });
    expect(parsed.breakdown?.genre).toEqual({ value: ["ambient", "lofi"], source: "optional", priority: "low" });
  });

  it("remains backwards compatible with legacy flat intent JSON", () => {
    const legacyRaw = JSON.stringify({
      mood: "calm",
      activity: "reading",
      energy: "low",
      tempo: "slow",
      genre: ["classical"],
      vocals: "instrumental_preferred",
      time_context: "evening",
    });

    const parsed = parseIntent(legacyRaw);
    expect(parsed.mood).toBe("calm");
    expect(parsed.activity).toBe("reading");
    expect(parsed.genre).toEqual(["classical"]);
    expect(parsed.breakdown).toBeDefined();
  });
});
