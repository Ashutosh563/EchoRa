import { describe, it, expect } from "vitest";
import { getSongSignature } from "../../src/services/music/fusion.js";
import { balanceTracks } from "../../src/services/gemini/reranker.js";
import type { Track } from "../../src/types/track.js";

function makeTrack(id: string, name: string, artist = "Molchat Doma"): Track {
  return {
    id,
    name,
    artists: [artist],
    album: "Album",
    albumArtUrl: "https://example.com/art.jpg",
    previewUrl: null,
    durationMs: 180000,
    spotifyUrl: `https://open.spotify.com/track/${id}`,
  };
}

describe("Continuous Discovery: Song Signature & Deduplication", () => {
  it("normalizes cross-release duplicates to identical song signature", () => {
    const original = makeTrack("t1", 'Tujhe Dekha To', "Lata Mangeshkar");
    const soundtrack = makeTrack("t2", 'Tujhe Dekha To (From "Dilwale Dulhania Le Jayenge")', "Lata Mangeshkar");
    const remastered = makeTrack("t3", 'Tujhe Dekha To [Remastered 2021]', "Lata Mangeshkar");

    expect(getSongSignature(soundtrack)).toBe(getSongSignature(original));
    expect(getSongSignature(remastered)).toBe(getSongSignature(original));
  });

  it("differentiates different songs by the same artist", () => {
    const song1 = makeTrack("t1", "Sudno", "Molchat Doma");
    const song2 = makeTrack("t2", "Toska", "Molchat Doma");

    expect(getSongSignature(song1)).not.toBe(getSongSignature(song2));
  });
});

describe("Continuous Discovery: Artist Distribution Caps", () => {
  it("strictly enforces max 2 tracks per artist on page 1 batch", () => {
    const tracks: Track[] = [
      makeTrack("1", "Song 1", "Artist A"),
      makeTrack("2", "Song 2", "Artist A"),
      makeTrack("3", "Song 3", "Artist A"), // should be filtered out (limit 2)
      makeTrack("4", "Song 4", "Artist B"),
    ];

    const balanced = balanceTracks(tracks, 2, null, null, true, 2);
    const artistACount = balanced.filter((t) => t.artists[0] === "Artist A").length;
    expect(artistACount).toBe(2);
    expect(balanced.some((t) => t.id === "3")).toBe(false);
  });

  it("strictly enforces cumulative cap of 6 tracks per artist across all pages", () => {
    // Artist A already has 5 tracks across prior pages
    const cumulativeArtistCounts = {
      "artist a": 5,
    };

    const newCandidates: Track[] = [
      makeTrack("10", "Song 10", "Artist A"), // allowed (makes 6)
      makeTrack("11", "Song 11", "Artist A"), // rejected (would make 7)
      makeTrack("12", "Song 12", "Artist B"), // allowed
    ];

    const balanced = balanceTracks(
      newCandidates,
      2,
      null,
      null,
      true,
      2,
      undefined,
      {
        cumulativeArtistCounts,
        maxCumulativePerArtist: 6,
        maxPerArtist: 2,
      },
    );

    const artistACount = balanced.filter((t) => t.artists[0] === "Artist A").length;
    expect(artistACount).toBe(1); // only 1 allowed because 5 + 1 = 6 max
    expect(balanced.some((t) => t.id === "11")).toBe(false);
  });

  it("rejects tracks with IDs in excludeTrackIds", () => {
    const tracks = [makeTrack("1", "Song 1"), makeTrack("2", "Song 2")];
    const balanced = balanceTracks(
      tracks,
      2,
      null,
      null,
      true,
      2,
      undefined,
      {
        excludeTrackIds: new Set(["1"]),
      },
    );

    expect(balanced.some((t) => t.id === "1")).toBe(false);
    expect(balanced.some((t) => t.id === "2")).toBe(true);
  });
});
