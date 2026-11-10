import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { buildConfig } from "../../src/config/env.js";

describe("Transition Endpoints (Integration)", () => {
  const mockConfig = buildConfig({});
  const app = createApp({ config: mockConfig, spotifyAuth: null });

  describe("POST /api/transition/plan", () => {
    it("returns 200 and a 4-stage emotional progression", async () => {
      const res = await request(app)
        .post("/api/transition/plan")
        .send({ startingMood: "Sad", destinationMood: "Happy" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("stages");
      expect(res.body.stages).toHaveLength(4);
      expect(res.body.stages[0].stage).toBe(1);
      expect(res.body.stages[0].mood).toBe("Sad");
      expect(res.body.stages[3].stage).toBe(4);
      expect(res.body.stages[3].mood).toBe("Happy");
    });

    it("returns 400 validation error if starting and destination moods are identical", async () => {
      const res = await request(app)
        .post("/api/transition/plan")
        .send({ startingMood: "Sad", destinationMood: "sad" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 validation error if mood is missing", async () => {
      const res = await request(app)
        .post("/api/transition/plan")
        .send({ startingMood: "", destinationMood: "Happy" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /api/transition/interpret", () => {
    it("validates that the prompt is present and bounded", async () => {
      const empty = await request(app).post("/api/transition/interpret").send({ prompt: " " });
      expect(empty.status).toBe(400);
      expect(empty.body.error.code).toBe("VALIDATION_ERROR");

      const tooLong = await request(app).post("/api/transition/interpret").send({ prompt: "x".repeat(501) });
      expect(tooLong.status).toBe(400);
      expect(tooLong.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /api/transition/generate-music", () => {
    it("returns 200 with 4 stage playlists and up to 20 tracks total", async () => {
      const planRes = await request(app)
        .post("/api/transition/plan")
        .send({ startingMood: "Sad", destinationMood: "Happy" });

      const stages = planRes.body.stages;

      const musicRes = await request(app)
        .post("/api/transition/generate-music")
        .send({
          startingMood: "Sad",
          destinationMood: "Happy",
          stages,
        });

      expect(musicRes.status).toBe(200);
      expect(musicRes.body.startingMood).toBe("Sad");
      expect(musicRes.body.destinationMood).toBe("Happy");
      expect(musicRes.body.stages).toHaveLength(4);

      for (const stage of musicRes.body.stages) {
        expect(stage.tracks.length).toBeLessThanOrEqual(5);
      }
      expect(musicRes.body.totalTracks).toBeLessThanOrEqual(20);
    });

    it("returns 400 if stages count is not exactly 4", async () => {
      const musicRes = await request(app)
        .post("/api/transition/generate-music")
        .send({
          startingMood: "Sad",
          destinationMood: "Happy",
          stages: [
            { stage: 1, mood: "Sad", description: "desc", musicalCharacteristics: ["c"] },
          ],
        });

      expect(musicRes.status).toBe(400);
      expect(musicRes.body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});

