import { describe, it, expect } from "vitest";
import { mapSpotifyTrack } from "../../src/services/spotify/trackMapper.js";

describe("trackMapper", () => {
  it("maps complete Spotify track object", () => {
    const raw = {
      id: "track-123",
      name: "Starlight",
      duration_ms: 240000,
      preview_url: "https://p.scdn.co/preview.mp3",
      is_playable: true,
      external_urls: { spotify: "https://open.spotify.com/track/track-123" },
      artists: [{ name: "Muse" }],
      album: {
        name: "Black Holes and Revelations",
        images: [
          { url: "https://i.scdn.co/640", width: 640, height: 640 },
          { url: "https://i.scdn.co/300", width: 300, height: 300 },
        ],
      },
    };

    const mapped = mapSpotifyTrack(raw);
    expect(mapped).not.toBeNull();
    expect(mapped?.id).toBe("track-123");
    expect(mapped?.name).toBe("Starlight");
    expect(mapped?.artists).toEqual(["Muse"]);
    expect(mapped?.album).toBe("Black Holes and Revelations");
    expect(mapped?.albumArtUrl).toBe("https://i.scdn.co/300");
    expect(mapped?.durationMs).toBe(240000);
    expect(mapped?.spotifyUrl).toBe("https://open.spotify.com/track/track-123");
  });

  it("returns null if track id is missing or track is unplayable", () => {
    expect(mapSpotifyTrack(null)).toBeNull();
    expect(mapSpotifyTrack({ name: "No ID" })).toBeNull();
    expect(mapSpotifyTrack({ id: "t1", is_playable: false })).toBeNull();
  });

  it("handles missing artwork, artists or preview_url gracefully", () => {
    const raw = {
      id: "t2",
      name: "Minimal Track",
    };

    const mapped = mapSpotifyTrack(raw);
    expect(mapped).not.toBeNull();
    expect(mapped?.artists).toEqual([]);
    expect(mapped?.albumArtUrl).toBeNull();
    expect(mapped?.durationMs).toBeNull();
    expect(mapped?.previewUrl).toBeNull();
  });
});
