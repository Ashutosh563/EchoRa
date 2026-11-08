import { describe, it, expect, vi } from "vitest";
import { createPlaylistAssembler } from "../../src/services/transition/playlistAssembler.js";
import type { SpotifySearch } from "../../src/services/spotify/spotifySearch.js";
import type { MoodStage, StageSearchIntent } from "../../src/types/transition.js";
import type { Track } from "../../src/types/track.js";

describe("PlaylistAssembler", () => {
  const sampleStages: MoodStage[] = [
    { stage: 1, mood: "Sad", description: "desc", musicalCharacteristics: ["acoustic"] },
    { stage: 2, mood: "Reflective", description: "desc", musicalCharacteristics: ["mellow"] },
    { stage: 3, mood: "Hopeful", description: "desc", musicalCharacteristics: ["uplifting"] },
    { stage: 4, mood: "Happy", description: "desc", musicalCharacteristics: ["upbeat"] },
  ];

  const sampleIntents: StageSearchIntent[] = [
    { stage: 1, query: "sad acoustic songs" },
    { stage: 2, query: "reflective mellow songs" },
    { stage: 3, query: "hopeful uplifting songs" },
    { stage: 4, query: "happy upbeat songs" },
  ];

  function makeTrack(id: string, name: string, artist?: string): Track {
    return {
      id,
      name,
      artists: [artist || `Artist-${id}`],
      album: "Album",
      albumArtUrl: null,
      durationMs: 180000,
      spotifyUrl: `https://spotify.com/${id}`,
      previewUrl: null,
    };
  }

  it("makes exactly 4 Spotify search calls (one per stage)", async () => {
    const mockSpotifySearch: SpotifySearch = {
      searchTracks: vi.fn().mockImplementation((query: string) => {
        return Promise.resolve([
          makeTrack(`${query}-1`, `${query} Track 1`, `${query} Artist 1`),
          makeTrack(`${query}-2`, `${query} Track 2`, `${query} Artist 2`),
          makeTrack(`${query}-3`, `${query} Track 3`, `${query} Artist 3`),
        ]);
      }),
    };

    const assembler = createPlaylistAssembler(mockSpotifySearch);
    const result = await assembler.assemble("Sad", "Happy", sampleStages, sampleIntents);

    // Exactly four Spotify search requests
    expect(mockSpotifySearch.searchTracks).toHaveBeenCalledTimes(4);
    expect(result.stages).toHaveLength(4);
    expect(result.totalTracks).toBe(12);
  });

  it("caps tracks at 5 per stage and prevents duplicate tracks across the complete journey", async () => {
    // Simulate Spotify returning duplicate tracks across stages
    const mockSpotifySearch: SpotifySearch = {
      searchTracks: vi.fn().mockImplementation((query: string) => {
        // Track 'dup-universal' appears in every stage search
        return Promise.resolve([
          makeTrack("dup-universal", "Universal Hit"),
          makeTrack(`${query}-a`, "Song A"),
          makeTrack(`${query}-b`, "Song B"),
          makeTrack(`${query}-c`, "Song C"),
          makeTrack(`${query}-d`, "Song D"),
          makeTrack(`${query}-e`, "Song E"),
          makeTrack(`${query}-f`, "Song F"),
        ]);
      }),
    };

    const assembler = createPlaylistAssembler(mockSpotifySearch);
    const result = await assembler.assemble("Sad", "Happy", sampleStages, sampleIntents);

    // Stage 1 gets dup-universal and 4 others (total 5)
    expect(result.stages[0].tracks).toHaveLength(5);
    expect(result.stages[0].tracks[0].id).toBe("dup-universal");

    // Stages 2, 3, 4 must NOT contain dup-universal
    for (let i = 1; i < 4; i++) {
      const stageTrackIds = result.stages[i].tracks.map((t) => t.id);
      expect(stageTrackIds).not.toContain("dup-universal");
      expect(result.stages[i].tracks.length).toBeLessThanOrEqual(5);
    }

    // Verify all track IDs across all stages are unique
    const allIds = result.stages.flatMap((s) => s.tracks.map((t) => t.id));
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
    expect(result.totalTracks).toBeLessThanOrEqual(20);
  });

  it("handles empty or failed stage searches gracefully without breaking other stages", async () => {
    const mockSpotifySearch: SpotifySearch = {
      searchTracks: vi.fn().mockImplementation((query: string) => {
        if (query.includes("reflective")) {
          return Promise.reject(new Error("Spotify network failure"));
        }
        return Promise.resolve([makeTrack(`${query}-1`, `${query} Track 1`)]);
      }),
    };

    const assembler = createPlaylistAssembler(mockSpotifySearch);
    const result = await assembler.assemble("Sad", "Happy", sampleStages, sampleIntents);

    expect(result.stages).toHaveLength(4);
    // Stage 2 failed gracefully -> empty array
    expect(result.stages[1].tracks).toHaveLength(0);
    // Other stages still populated
    expect(result.stages[0].tracks).toHaveLength(1);
    expect(result.stages[2].tracks).toHaveLength(1);
    expect(result.stages[3].tracks).toHaveLength(1);
  });
});

