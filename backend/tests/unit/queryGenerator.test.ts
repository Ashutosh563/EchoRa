import { describe, it, expect } from "vitest";
import { generateQueries } from "../../src/services/music/queryGenerator.js";
import type { MusicIntent } from "../../src/types/intent.js";

describe("queryGenerator", () => {
  it("generates effective queries for a late-night study session", () => {
    const intent: MusicIntent = {
      mood: "calm",
      activity: "studying",
      energy: "low",
      tempo: "slow",
      genre: ["ambient", "lofi"],
      vocals: "instrumental_preferred",
      time_context: "late_night",
    };

    const { primary, alternatives } = generateQueries(intent);
    expect(primary).toContain("calm");
    expect(primary).toContain("ambient");
    expect(primary).toContain("study");
    expect(primary.split(" ").length).toBeLessThanOrEqual(6);

    expect(alternatives.length).toBeGreaterThan(0);
    expect(alternatives.length).toBeLessThanOrEqual(2);
  });

  it("handles high energy workout intent", () => {
    const intent: MusicIntent = {
      mood: "energetic",
      activity: "workout",
      energy: "high",
      tempo: "fast",
      genre: ["edm"],
      vocals: "any",
      time_context: "any",
    };

    const { primary } = generateQueries(intent);
    expect(primary).toContain("energetic");
    expect(primary).toContain("workout");
  });

  it("falls back gracefully when fields are sparse or empty", () => {
    const intent: MusicIntent = {
      mood: "any",
      activity: null,
      energy: "medium",
      tempo: "any",
      genre: [],
      vocals: "any",
      time_context: "any",
    };

    const { primary } = generateQueries(intent);
    expect(primary.length).toBeGreaterThan(0);
  });
});

