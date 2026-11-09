import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveYouTubeVideoId } from "../../src/services/music/youtubeResolver.js";

describe("youtubeResolver", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when trackName is empty", async () => {
    const res = await resolveYouTubeVideoId("");
    expect(res).toBeNull();
  });

  it("extracts videoId from YouTube search HTML", async () => {
    const mockHtml = `<html><body><script>var ytInitialData = {"contents":{"itemSectionRenderer":{"contents":[{"videoRenderer":{"videoId":"Umqb9KENgmk","title":{"runs":[{"text":"Tum Hi Ho"}]}}}]}}};</script></body></html>`;
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      text: async () => mockHtml,
    } as any);

    const videoId = await resolveYouTubeVideoId("Tum Hi Ho", "Arijit Singh");
    expect(videoId).toBe("Umqb9KENgmk");
  });

  it("serves repeated queries from cache", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    // "Tum Hi Ho" + "Arijit Singh" was cached in previous test
    const videoId = await resolveYouTubeVideoId("Tum Hi Ho", "Arijit Singh");
    expect(videoId).toBe("Umqb9KENgmk");
    // Fetch should not be called again because cache hit!
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("handles network failure gracefully", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Connection timeout"));
    const videoId = await resolveYouTubeVideoId("Unknown Track For Error Test 12345");
    expect(videoId).toBeNull();
  });
});

