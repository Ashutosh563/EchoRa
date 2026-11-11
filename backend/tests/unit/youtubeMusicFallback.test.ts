import { describe, expect, it, vi } from "vitest";
import { createSearchPipeline } from "../../src/services/music/searchPipeline.js";
import { getMockIntent } from "../../src/services/music/mockMusic.js";
import type { Track } from "../../src/types/track.js";

function makeYouTubeTrack(id: string, name: string): Track {
  return {
    id: `ytmusic:${id}`,
    name,
    artists: ["Arijit Singh"],
    album: "Songs",
    albumArtUrl: null,
    durationMs: 210_000,
    spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(name)}`,
    catalogSource: "youtube_music",
    catalogUrl: `https://music.youtube.com/watch?v=${id}`,
    previewUrl: "https://preview.example/track.m4a",
  };
}

describe("YouTube Music catalog fallback", () => {
  it("uses ytmusicapi results when every Spotify search fails", async () => {
    const prompt = "Arijit Singh sad slow songs";
    const track = makeYouTubeTrack("video-1", "Channa Mereya");
    const spotifySearch = { searchTracks: vi.fn().mockRejectedValue(new Error("Spotify unavailable")) };
    const youtubeMusicSearch = { searchTracks: vi.fn().mockResolvedValue([track]) };
    const pipeline = createSearchPipeline({
      intentExtractor: vi.fn().mockResolvedValue(getMockIntent(prompt)),
      spotifySearch,
      youtubeMusicSearch,
      reranker: { rerank: vi.fn().mockImplementation(async (_prompt: string, _intent: unknown, candidates: Track[]) => candidates.map((candidate) => ({ ...candidate, matchScore: 82 }))) },
    });

    const result = await pipeline.search(prompt, "live", []);

    expect(spotifySearch.searchTracks).toHaveBeenCalled();
    expect(youtubeMusicSearch.searchTracks).toHaveBeenCalled();
    expect(result.mode).toBe("live");
    expect(result.tracks[0]).toMatchObject({
      id: "ytmusic:video-1",
      catalogSource: "youtube_music",
      catalogUrl: "https://music.youtube.com/watch?v=video-1",
      matchScore: 82,
    });
    expect(result.notice).toContain("YouTube Music");
    expect(result.hasMore).toBe(true);
  });

  it("retrieves again when Gemini scores the first catalog set poorly", async () => {
    const prompt = "Arijit Singh sad slow songs";
    const firstTrack = makeYouTubeTrack("first", "First Candidate");
    firstTrack.catalogSource = "spotify";
    firstTrack.catalogUrl = firstTrack.spotifyUrl;
    const refinedTrack = makeYouTubeTrack("refined", "Closer Candidate");
    const spotifySearch = {
      searchTracks: vi.fn(async (query: string) => (query.includes("melancholic acoustic Hindi") ? [refinedTrack] : [firstTrack])),
    };
    let rerankPass = 0;
    const reranker = {
      rerank: vi.fn(async (_prompt: string, _intent: unknown, candidates: Track[]) => {
        rerankPass++;
        return candidates.map((track) => ({ ...track, matchScore: rerankPass === 1 ? 48 : 88 }));
      }),
      suggestRefinementQueries: vi.fn().mockResolvedValue(["melancholic acoustic Hindi"]),
    };
    const pipeline = createSearchPipeline({
      intentExtractor: vi.fn().mockResolvedValue(getMockIntent(prompt)),
      spotifySearch,
      youtubeMusicSearch: { searchTracks: vi.fn().mockResolvedValue([]) },
      reranker,
    });

    const result = await pipeline.search(prompt, "live", []);

    expect(reranker.suggestRefinementQueries).toHaveBeenCalledOnce();
    expect(reranker.rerank).toHaveBeenCalledTimes(2);
    expect(result.queries.alternatives).toContain("melancholic acoustic Hindi");
    expect(result.tracks.some((track) => track.id === refinedTrack.id)).toBe(true);
    expect(result.tracks[0]?.matchScore).toBe(88);
  });

  it("keeps explicit Karan Aujla results only when local artist and vibe confidence pass", async () => {
    const prompt = "Karan Aujla guilty songs";
    const matching = { ...makeYouTubeTrack("match", "Guilty Song"), artists: ["Karan Aujla"] };
    const wrongArtist = { ...makeYouTubeTrack("artist", "Guilty Song 2"), artists: ["Another Artist"] };
    const wrongVibe = { ...makeYouTubeTrack("vibe", "Happy Song"), artists: ["Karan Aujla"] };
    const pipeline = createSearchPipeline({
      intentExtractor: vi.fn().mockResolvedValue({ ...getMockIntent(prompt), artist: "Karan Aujla", mood: "guilty" }),
      spotifySearch: null,
      youtubeMusicSearch: { searchTracks: vi.fn().mockResolvedValue([matching, wrongArtist, wrongVibe]) },
      reranker: {
        rerank: vi.fn().mockImplementation(async (_prompt: string, _intent: unknown, candidates: Track[]) => candidates.map((track) => ({
          ...track,
          matchScore: track.id === "ytmusic:match" ? 91 : track.id === "ytmusic:artist" ? 94 : 42,
        }))),
      },
    });

    const result = await pipeline.search(prompt, "live", []);

    expect(result.tracks.map((track) => track.id)).toEqual(["ytmusic:match"]);
    expect(result.tracks[0]?.matchScore).toBe(91);
  });
});
