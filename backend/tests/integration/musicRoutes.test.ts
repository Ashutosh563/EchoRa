import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";

describe("Music Endpoints (Integration)", () => {
  const app = createApp();

  describe("POST /api/music/interpret", () => {
    it("returns structured intent (defaults to mock mode if unconfigured)", async () => {
      const res = await request(app)
        .post("/api/music/interpret")
        .send({ prompt: "peaceful music for studying" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("mode");
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

