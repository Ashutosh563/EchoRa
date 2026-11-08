import { describe, it, expect, vi } from "vitest";
import {
  createTransitionReranker,
  balanceTransitionTracks,
  isHindiTrack,
  isInstrumentalTrack,
} from "../../src/services/transition/transitionReranker.js";
import type { GeminiClient } from "../../src/services/gemini/geminiClient.js";
import type { Track } from "../../src/types/track.js";

function makeTrack(id: string, name: string, artist: string = "Artist"): Track {
  return {
    id,
    name,
    artists: [artist],
    album: "Album",
    albumArtUrl: null,
    durationMs: 180000,
    spotifyUrl: `https://spotify.com/${id}`,
    previewUrl: null,
  };
}

describe("TransitionReranker & Balancer", () => {
  describe("Language and Instrumental Detection", () => {
    it("correctly identifies Hindi tracks by title and artist", () => {
      expect(isHindiTrack(makeTrack("h1", "Tum Hi Ho", "Arijit Singh"))).toBe(true);
      expect(isHindiTrack(makeTrack("h2", "Kesariya", "Pritam"))).toBe(true);
      expect(isHindiTrack(makeTrack("e1", "Fix You", "Coldplay"))).toBe(false);
      expect(isHindiTrack(makeTrack("e2", "Creep", "Radiohead"))).toBe(false);
    });

    it("correctly identifies instrumental tracks", () => {
      expect(isInstrumentalTrack(makeTrack("i1", "Peaceful Piano Instrumental", "Pianist"))).toBe(true);
      expect(isInstrumentalTrack(makeTrack("i2", "Original Motion Picture Score", "Composer"))).toBe(true);
      expect(isInstrumentalTrack(makeTrack("v1", "Tum Hi Ho", "Arijit Singh"))).toBe(false);
      expect(isInstrumentalTrack(makeTrack("v2", "Fix You", "Coldplay"))).toBe(false);
    });
  });

  describe("balanceTransitionTracks composition rules", () => {
    it("selects 2 Hindi songs, 2 English songs, and 1 choice song", () => {
      const candidates = [
        makeTrack("h1", "Tum Hi Ho", "Arijit Singh"),
        makeTrack("h2", "Kesariya", "Pritam"),
        makeTrack("h3", "Raataan Lambiyan", "Jubin Nautiyal"),
        makeTrack("e1", "Fix You", "Coldplay"),
        makeTrack("e2", "Yellow", "Parachutes"),
        makeTrack("e3", "Wonderwall", "Oasis"),
      ];

      const result = balanceTransitionTracks(candidates, 5, {
        maxPerArtist: 1,
        maxCumulativePerArtist: 2,
      });

      expect(result).toHaveLength(5);
      const hindiTracks = result.filter(isHindiTrack);
      const englishTracks = result.filter((t) => !isHindiTrack(t) && !isInstrumentalTrack(t));

      // Must have at least 2 Hindi and 2 English
      expect(hindiTracks.length).toBeGreaterThanOrEqual(2);
      expect(englishTracks.length).toBeGreaterThanOrEqual(2);
    });

    it("enforces max 1 instrumental song even if multiple instrumentals are present", () => {
      const candidates = [
        makeTrack("i1", "Solo Piano Instrumental", "Composer A"),
        makeTrack("i2", "Cello Score Suite", "Composer B"),
        makeTrack("i3", "Ambient Theme Instrumental", "Composer C"),
        makeTrack("h1", "Tum Hi Ho", "Arijit Singh"),
        makeTrack("h2", "Kesariya", "Pritam"),
        makeTrack("e1", "Fix You", "Coldplay"),
        makeTrack("e2", "Yellow", "Oasis"),
      ];

      const result = balanceTransitionTracks(candidates, 5, {
        maxPerArtist: 1,
        maxCumulativePerArtist: 2,
        allowInstrumental: true,
      });

      expect(result).toHaveLength(5);
      const instrumentals = result.filter(isInstrumentalTrack);
      expect(instrumentals.length).toBeLessThanOrEqual(1);
    });

    it("does not include any instrumental if allowInstrumental is false", () => {
      const candidates = [
        makeTrack("h1", "Tum Hi Ho", "Arijit Singh"),
        makeTrack("h2", "Kesariya", "Pritam"),
        makeTrack("h3", "Raataan Lambiyan", "Jubin Nautiyal"),
        makeTrack("e1", "Fix You", "Coldplay"),
        makeTrack("e2", "Yellow", "Oasis"),
        makeTrack("e3", "Creep", "Radiohead"),
        makeTrack("i1", "Solo Piano Instrumental", "Pianist"),
      ];

      const result = balanceTransitionTracks(candidates, 5, {
        allowInstrumental: false,
      });

      expect(result).toHaveLength(5);
      const instrumentals = result.filter(isInstrumentalTrack);
      expect(instrumentals).toHaveLength(0);
    });

    it("enforces max 1 track per artist in the stage", () => {
      const candidates = [
        makeTrack("t1", "Song 1", "Radiohead"),
        makeTrack("t2", "Song 2", "Radiohead"),
        makeTrack("t3", "Song 3", "Coldplay"),
        makeTrack("t4", "Song 4", "Oasis"),
        makeTrack("t5", "Song 5", "Blur"),
        makeTrack("t6", "Song 6", "Pulp"),
      ];

      const result = balanceTransitionTracks(candidates, 5, {
        maxPerArtist: 1,
        maxCumulativePerArtist: 2,
      });

      expect(result).toHaveLength(5);
      const radioheadTracks = result.filter((t) => t.artists[0] === "Radiohead");
      expect(radioheadTracks).toHaveLength(1);
    });

    it("respects cumulative artist limits across the entire 4-stage journey (max 2)", () => {
      const candidates = [
        makeTrack("t1", "Song 1", "Radiohead"),
        makeTrack("t2", "Song 2", "Coldplay"),
        makeTrack("t3", "Song 3", "Oasis"),
      ];

      const cumulative = { radiohead: 2 };

      const result = balanceTransitionTracks(candidates, 3, {
        cumulativeArtistCounts: cumulative,
        maxPerArtist: 1,
        maxCumulativePerArtist: 2,
      });

      const artists = result.map((t) => t.artists[0]);
      expect(artists).not.toContain("Radiohead");
      expect(artists).toContain("Coldplay");
      expect(artists).toContain("Oasis");
    });

    it("excludes tracks matching prior stage signatures", () => {
      const candidates = [
        makeTrack("t1", "Creep", "Radiohead"),
        makeTrack("t2", "Yellow", "Coldplay"),
        makeTrack("t3", "Wonderwall", "Oasis"),
      ];

      const excludeSignatures = new Set(["creep::radiohead"]);

      const result = balanceTransitionTracks(candidates, 3, {
        excludeSignatures,
      });

      const names = result.map((t) => t.name);
      expect(names).not.toContain("Creep");
      expect(names).toContain("Yellow");
      expect(names).toContain("Wonderwall");
    });
  });

  describe("createTransitionReranker", () => {
    it("uses Gemini to rerank candidates and respects composition constraints", async () => {
      const mockGemini: GeminiClient = {
        generateJson: vi.fn().mockResolvedValue(
          JSON.stringify({
            rankedTracks: [
              { id: "h1", reason: "Hindi acoustic match" },
              { id: "h2", reason: "Hindi emotional match" },
              { id: "e1", reason: "English acoustic match" },
              { id: "e2", reason: "English bridge match" },
              { id: "e3", reason: "English fifth choice" },
            ],
          }),
        ),
      };

      const reranker = createTransitionReranker(mockGemini);
      const candidates = [
        makeTrack("h1", "Tum Hi Ho", "Arijit Singh"),
        makeTrack("h2", "Kesariya", "Pritam"),
        makeTrack("e1", "Fix You", "Coldplay"),
        makeTrack("e2", "Yellow", "Parachutes Band"),
        makeTrack("e3", "Wonderwall", "Oasis"),
        makeTrack("e4", "Creep", "Radiohead"),
      ];

      const result = await reranker.rerankStage(candidates, {
        stage: 2,
        mood: "Reflective",
        description: "Contemplative acoustic sounds",
        musicalCharacteristics: ["acoustic guitar", "felt piano"],
        energy: 0.35,
        valence: 0.3,
      });

      expect(mockGemini.generateJson).toHaveBeenCalled();
      expect(result).toHaveLength(5);
    });

    it("falls back to balanced candidates when geminiClient is null", async () => {
      const reranker = createTransitionReranker(null);
      const candidates = [
        makeTrack("cand-1", "Track 1", "Artist A"),
        makeTrack("cand-2", "Track 2", "Artist B"),
      ];

      const result = await reranker.rerankStage(candidates, {
        stage: 1,
        mood: "Sad",
        description: "description",
        musicalCharacteristics: ["piano"],
      });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("cand-1");
    });
  });
});
