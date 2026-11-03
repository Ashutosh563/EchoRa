import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { buildConfig } from "../../src/config/env.js";
import {
  MOCK_VISION_HIGH_CONFIDENCE,
  MOCK_VISION_MEDIUM_CONFIDENCE,
  MOCK_VISION_LOW_CONFIDENCE,
} from "../fixtures/cameraVisionFixtures.js";
import type { GeminiVisionService } from "../../src/services/gemini/geminiVision.js";

describe("POST /api/music/analyze-image (Integration)", () => {
  const dummyBase64 = "data:image/jpeg;base64," + Buffer.from("fake-jpeg-pixels-12345678").toString("base64");

  it("returns HIGH confidence analysis using mocked vision service", async () => {
    const mockVision: GeminiVisionService = {
      analyzeExpression: async () => MOCK_VISION_HIGH_CONFIDENCE,
    };
    const app = createApp({
      config: buildConfig({ GEMINI_API_KEY: "test-key" }),
      visionService: mockVision,
    });

    const res = await request(app)
      .post("/api/music/analyze-image")
      .send({ image: dummyBase64, mimeType: "image/jpeg" });

    expect(res.status).toBe(200);
    expect(res.body.confidence).toBe("HIGH");
    expect(res.body.expression).toBe("happy-looking");
    expect(res.body.music_direction).toBe("upbeat and cheerful acoustic pop music");
    expect(res.body.visual_observations.length).toBeGreaterThan(0);
  });

  it("returns MEDIUM confidence analysis requiring mood selection", async () => {
    const mockVision: GeminiVisionService = {
      analyzeExpression: async () => MOCK_VISION_MEDIUM_CONFIDENCE,
    };
    const app = createApp({
      config: buildConfig({ GEMINI_API_KEY: "test-key" }),
      visionService: mockVision,
    });

    const res = await request(app)
      .post("/api/music/analyze-image")
      .send({ image: dummyBase64 });

    expect(res.status).toBe(200);
    expect(res.body.confidence).toBe("MEDIUM");
    expect(res.body.music_direction).toBe("relaxed and balanced music");
  });

  it("returns LOW confidence with null music_direction when frame is poor", async () => {
    const mockVision: GeminiVisionService = {
      analyzeExpression: async () => MOCK_VISION_LOW_CONFIDENCE,
    };
    const app = createApp({
      config: buildConfig({ GEMINI_API_KEY: "test-key" }),
      visionService: mockVision,
    });

    const res = await request(app)
      .post("/api/music/analyze-image")
      .send({ image: dummyBase64 });

    expect(res.status).toBe(200);
    expect(res.body.confidence).toBe("LOW");
    expect(res.body.music_direction).toBeNull();
  });

  it("rejects invalid MIME types and empty payloads", async () => {
    const app = createApp({
      config: buildConfig({ GEMINI_API_KEY: "test-key" }),
      visionService: { analyzeExpression: async () => MOCK_VISION_HIGH_CONFIDENCE },
    });

    const res1 = await request(app)
      .post("/api/music/analyze-image")
      .send({ image: "short" });
    expect(res1.status).toBe(400);

    const res2 = await request(app)
      .post("/api/music/analyze-image")
      .send({ image: dummyBase64, mimeType: "application/pdf" });
    expect(res2.status).toBe(400);
  });
});
