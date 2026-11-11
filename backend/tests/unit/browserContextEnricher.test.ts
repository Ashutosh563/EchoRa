import { describe, expect, it } from "vitest";
import type { MusicIntent } from "../../src/types/intent.js";
import { contextualSearchQuery, enrichListeningContext } from "../../src/services/music/browserContextEnricher.js";

const intent = (overrides: Partial<MusicIntent> = {}): MusicIntent => ({
  mood: "calm",
  activity: null,
  energy: "low",
  tempo: "slow",
  genre: [],
  vocals: "any",
  time_context: "any",
  ...overrides,
});

describe("browser listening context", () => {
  it("adds a compatible day period as a weak cue for a calm request", () => {
    const signals = enrichListeningContext(intent(), { dayPeriod: "late_night" });
    expect(signals?.dayPeriod).toBe("late_night");
    expect(contextualSearchQuery(signals)).toContain("late night");
  });

  it("keeps explicit energetic and time requests authoritative", () => {
    expect(enrichListeningContext(intent({ mood: "energetic", energy: "high" }), { dayPeriod: "late_night" })).toBeUndefined();
    expect(enrichListeningContext(intent({ time_context: "morning" }), { dayPeriod: "late_night" })).toBeUndefined();
  });

  it("uses browser language only when NLP did not find one and never infers it from region", () => {
    expect(enrichListeningContext(intent(), { languages: ["en-IN"] })?.preferredLanguage).toBe("english");
    expect(enrichListeningContext(intent({ language: "punjabi" }), { languages: ["en-IN"] })?.preferredLanguage).toBeUndefined();
    expect(enrichListeningContext(intent(), { languages: ["en-IN"] })?.preferredLanguage).not.toBe("hindi");
  });

  it("ignores weekday and online status as recommendation signals", () => {
    expect(enrichListeningContext(intent(), { dayOfWeek: "Saturday", online: true })).toBeUndefined();
  });
});
