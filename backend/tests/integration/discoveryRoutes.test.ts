import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { buildConfig } from "../../src/config/env.js";

describe("Discovery Modes Endpoints (Integration)", () => {
  const mockConfig = buildConfig({});
  const app = createApp({ config: mockConfig, spotifyAuth: null });

  it("defaults to FAMILIAR mode when discoveryMode is not supplied", async () => {
    const res = await request(app)
      .post("/api/music/search")
      .send({ prompt: "calm acoustic music" });

    expect(res.status).toBe(200);
    expect(res.body.discoveryMode).toBe("FAMILIAR");
    expect(res.body.queries.primary).toBeDefined();
    // Exactly ONE Spotify query
    expect(res.body.queries.alternatives).toHaveLength(0);
  });

  it("defaults to FAMILIAR mode when discoveryMode is invalid", async () => {
    const res = await request(app)
      .post("/api/music/search")
      .send({
        prompt: "calm acoustic music",
        discoveryMode: "NON_EXISTENT_MODE",
      });

    expect(res.status).toBe(200);
    expect(res.body.discoveryMode).toBe("FAMILIAR");
  });

  it("accepts BALANCED discovery mode and returns valid single query", async () => {
    const res = await request(app)
      .post("/api/music/search")
      .send({
        prompt: "calm study music",
        discoveryMode: "BALANCED",
        preferences: {
          favoriteGenres: ["jazz"],
          favoriteArtists: [],
          dislikedGenres: [],
          dislikedArtists: [],
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.discoveryMode).toBe("BALANCED");
    expect(res.body.queries.primary).toBeDefined();
    expect(res.body.queries.alternatives).toHaveLength(0);
  });

  it("accepts EXPLORE discovery mode and returns valid single query", async () => {
    const res = await request(app)
      .post("/api/music/search")
      .send({
        prompt: "workout beats",
        discoveryMode: "EXPLORE",
      });

    expect(res.status).toBe(200);
    expect(res.body.discoveryMode).toBe("EXPLORE");
    expect(res.body.queries.primary).toBeDefined();
    expect(res.body.queries.alternatives).toHaveLength(0);
  });

  it("handles empty preferences gracefully without crashing", async () => {
    const res = await request(app)
      .post("/api/music/search")
      .send({
        prompt: "ambient sounds",
        discoveryMode: "FAMILIAR",
        preferences: {},
      });

    expect(res.status).toBe(200);
    expect(res.body.discoveryMode).toBe("FAMILIAR");
    expect(res.body.tracks.length).toBeGreaterThan(0);
  });
});

