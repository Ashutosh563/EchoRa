import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { buildConfig } from "../../src/config/env.js";

describe("Music Endpoints (Integration)", () => {
  // Use isolated unconfigured app to test mock mode defaults
  const mockConfig = buildConfig({});
  const app = createApp({ config: mockConfig, spotifyAuth: null });

  describe("POST /api/music/interpret", () => {
    it("returns structured intent (defaults to mock mode if unconfigured)", async () => {
      const res = await request(app)
        .post("/api/music/interpret")
        .send({ prompt: "peaceful music for studying" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("mode");
      expect(res.body.mode).toBe("mock");
      expect(res.body).toHaveProperty("intent");
      expect(res.body.intent.mood).toBe("calm");
    });

    it("fails with validation error on empty prompt", async () => {
      const res = await request(app).post("/api/music/interpret").send({ prompt: "   " });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /api/music/search", () => {
    it("returns intent, queries and track list", async () => {
      const res = await request(app)
        .post("/api/music/search")
        .send({ prompt: "calm study music" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("mode");
      expect(res.body).toHaveProperty("intent");
      expect(res.body).toHaveProperty("queries");
      expect(res.body).toHaveProperty("tracks");
      expect(Array.isArray(res.body.tracks)).toBe(true);
      expect(res.body.tracks.length).toBeGreaterThan(0);
    });
  });

  describe("POST /api/music/load-more", () => {
    it("returns next page of tracks respecting exclusions", async () => {
      const res = await request(app)
        .post("/api/music/load-more")
        .send({
          prompt: "calm study music",
          intent: {
            mood: "calm",
            activity: "studying",
            energy: "low",
            tempo: "slow",
            genre: ["ambient"],
            vocals: "vocals_preferred",
            time_context: "any",
          },
          page: 2,
          excludeTrackIds: ["mock-1", "mock-2"],
          cumulativeArtistCounts: { "brian eno": 2 },
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("page");
      expect(res.body.page).toBe(2);
      expect(res.body).toHaveProperty("tracks");
      expect(Array.isArray(res.body.tracks)).toBe(true);
      expect(res.body.tracks.some((t: any) => t.id === "mock-1" || t.id === "mock-2")).toBe(false);
    });
  });

  describe("POST /api/music/refine-vibe", () => {
    it("refines vibe locking foundational mood/genre and altering acoustic profile", async () => {
      const res = await request(app)
        .post("/api/music/refine-vibe")
        .send({
          prompt: "sovietwave synth",
          intent: {
            mood: "nostalgic",
            activity: "coding",
            energy: "medium",
            tempo: "moderate",
            genre: ["sovietwave", "synthwave"],
            vocals: "instrumental",
            time_context: "1980s",
            language: "Russian",
          },
          refinement: {
            type: "acoustic",
            label: "More Acoustic",
            delta: { acousticness: 0.35, energy: -0.15 },
          },
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("intent");
      // Preserved core mood and genre
      expect(res.body.intent.mood).toBe("nostalgic");
      expect(res.body.intent.genre).toContain("sovietwave");
      expect(res.body).toHaveProperty("tracks");
      expect(Array.isArray(res.body.tracks)).toBe(true);
      expect(res.body.tracks.length).toBeGreaterThan(0);
    });
  });

  describe("GET /api/status", () => {
    it("returns operational status and missing credential steps", async () => {
      const res = await request(app).get("/api/status");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("mode");
      expect(res.body).toHaveProperty("gemini");
      expect(res.body).toHaveProperty("spotify");
      expect(res.body).toHaveProperty("missing");
    });
  });

  describe("GET /api/spotify/auth", () => {
    it("fails with helpful error if Spotify is not configured", async () => {
      const res = await request(app).get("/api/spotify/auth");
      expect(res.status).toBe(502);
      expect(res.body.error.code).toBe("SPOTIFY_AUTH_FAILED");
    });
  });
});

