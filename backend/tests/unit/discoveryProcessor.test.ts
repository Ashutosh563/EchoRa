import { describe, it, expect } from "vitest";
import { DiscoveryPreferenceProcessor } from "../../src/services/music/discoveryProcessor.js";
import type { MusicIntent } from "../../src/types/intent.js";
import type { DiscoveryContext } from "../../src/types/discovery.js";

describe("DiscoveryPreferenceProcessor", () => {
  const processor = new DiscoveryPreferenceProcessor();

  const baseIntent: MusicIntent = {
    mood: "calm",
    activity: "studying",
    energy: "low",
    tempo: "slow",
    genre: ["lo-fi"],
    vocals: "instrumental_preferred",
    time_context: "late_night",
  };

  it("defaults to FAMILIAR when discovery mode is missing or invalid", () => {
    const context: DiscoveryContext = {
      discoveryMode: "UNKNOWN_MODE" as any,
      preferences: { favoriteGenres: [], favoriteArtists: [], dislikedGenres: [], dislikedArtists: [] },
      rawPrompt: "chill night study",
    };

    const result = processor.process(context, baseIntent);
    expect(result.mode).toBe("FAMILIAR");
  });

  it("FAMILIAR mode prioritises established favorite genres when prompt does not specify one", () => {
    const context: DiscoveryContext = {
      discoveryMode: "FAMILIAR",
      preferences: {
        favoriteGenres: ["indie folk"],
        favoriteArtists: ["Bon Iver"],
        dislikedGenres: [],
        dislikedArtists: [],
      },
      rawPrompt: "chill night vibes",
    };

    const generalIntent: MusicIntent = {
      ...baseIntent,
      genre: [],
    };

    const result = processor.process(context, generalIntent);
    expect(result.mode).toBe("FAMILIAR");
    expect(result.injectedGenre).toBe("indie folk");
  });

  it("FAMILIAR mode falls back gracefully without preferences or history", () => {
    const context: DiscoveryContext = {
      discoveryMode: "FAMILIAR",
      preferences: {
        favoriteGenres: [],
        favoriteArtists: [],
        dislikedGenres: [],
        dislikedArtists: [],
      },
      rawPrompt: "peaceful music",
    };

    const result = processor.process(context, baseIntent);
    expect(result.mode).toBe("FAMILIAR");
    expect(result.injectedGenre).toBeUndefined();
    expect(result.injectedArtist).toBeUndefined();
    expect(result.adjustedIntent.mood).toBe("calm");
  });

  it("BALANCED mode blends preferences with complementary styles", () => {
    const context: DiscoveryContext = {
      discoveryMode: "BALANCED",
      preferences: {
        favoriteGenres: ["jazz"],
        favoriteArtists: [],
        dislikedGenres: [],
        dislikedArtists: [],
      },
      rawPrompt: "coffee shop music",
    };

    const jazzIntent: MusicIntent = {
      ...baseIntent,
      genre: ["jazz"],
    };

    const result = processor.process(context, jazzIntent);
    expect(result.mode).toBe("BALANCED");
    // Should inject a related genre like neo-soul, bossa nova, lo-fi jazz, etc.
    expect(["neo-soul", "bossa nova", "lo-fi jazz", "nu jazz"]).toContain(result.injectedGenre);
  });

  it("EXPLORE mode discovers novel genres matching mood without historical bias", () => {
    const context: DiscoveryContext = {
      discoveryMode: "EXPLORE",
      preferences: {
        favoriteGenres: ["pop"],
        favoriteArtists: ["Taylor Swift"],
        dislikedGenres: [],
        dislikedArtists: [],
      },
      rawPrompt: "energetic workout",
    };

    const workoutIntent: MusicIntent = {
      ...baseIntent,
      mood: "energetic",
      activity: "workout",
      genre: [],
    };

    const result = processor.process(context, workoutIntent);
    expect(result.mode).toBe("EXPLORE");
    // Should inject adventurous workout genres like synthwave, breakbeat, electro funk
    expect(["synthwave", "breakbeat", "garage rock", "electro funk", "drum and bass"]).toContain(result.injectedGenre);
    expect(result.injectedArtist).toBeUndefined();
  });

  it("filters out disliked genres and artists across modes", () => {
    const context: DiscoveryContext = {
      discoveryMode: "FAMILIAR",
      preferences: {
        favoriteGenres: ["rock"],
        favoriteArtists: [],
        dislikedGenres: ["metal"],
        dislikedArtists: ["Metallica"],
      },
      rawPrompt: "relaxing music for evening",
    };

    const intentWithMetal: MusicIntent = {
      ...baseIntent,
      genre: ["metal", "ambient"],
    };

    const result = processor.process(context, intentWithMetal);
    expect(result.excludedTerms.has("metal")).toBe(true);
    expect(result.excludedTerms.has("metallica")).toBe(true);
    expect(result.adjustedIntent.genre).toEqual(["ambient"]);
  });

  it("allows explicit prompt to override previously disliked items", () => {
    const context: DiscoveryContext = {
      discoveryMode: "FAMILIAR",
      preferences: {
        favoriteGenres: [],
        favoriteArtists: [],
        dislikedGenres: ["country"],
        dislikedArtists: [],
      },
      rawPrompt: "play some classic country music for a road trip",
    };

    const countryIntent: MusicIntent = {
      ...baseIntent,
      genre: ["country"],
    };

    const result = processor.process(context, countryIntent);
    // Because rawPrompt contains "country", country is not excluded
    expect(result.excludedTerms.has("country")).toBe(false);
    expect(result.adjustedIntent.genre).toContain("country");
  });
});

