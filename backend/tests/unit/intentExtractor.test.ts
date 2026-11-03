import { describe, it, expect } from "vitest";
import { parseIntent } from "../../src/services/gemini/intentExtractor.js";

describe("intentExtractor - parseIntent", () => {
  it("parses valid JSON structured intent", () => {
    const raw = JSON.stringify({
      mood: "calm",
      activity: "studying",
      energy: "low",
      tempo: "slow",
      genre: ["ambient", "lofi"],
      vocals: "instrumental_preferred",
      time_context: "late_night",
    });

    const parsed = parseIntent(raw);
    expect(parsed.mood).toBe("calm");
    expect(parsed.activity).toBe("studying");
    expect(parsed.energy).toBe("low");
    expect(parsed.genre).toEqual(["ambient", "lofi"]);
  });

  it("handles markdown code fences around JSON", () => {
    const raw = "```json\n{\"mood\": \"happy\", \"activity\": null, \"energy\": \"high\", \"tempo\": \"fast\", \"genre\": [\"pop\"], \"vocals\": \"any\", \"time_context\": \"morning\"}\n```";
    const parsed = parseIntent(raw);
    expect(parsed.mood).toBe("happy");
    expect(parsed.energy).toBe("high");
  });

  it("normalizes invalid or missing enum fields to defaults", () => {
    const raw = JSON.stringify({
      mood: "CHILL",
      energy: "unknown_energy",
      genre: "not an array",
    });

    const parsed = parseIntent(raw);
    expect(parsed.mood).toBe("chill");
    expect(parsed.energy).toBe("medium"); // default
    expect(parsed.genre).toEqual([]);
    expect(parsed.vocals).toBe("any");
  });

  it("throws on completely malformed non-JSON output", () => {
    expect(() => parseIntent("Here are some songs for you")).toThrow();
  });
});
