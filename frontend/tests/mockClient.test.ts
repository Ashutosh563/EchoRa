import { createMockClient, simulateInterpretation } from "../src/api/mockClient";
import { MusicApiError } from "../src/api/musicApi";

describe("simulateInterpretation", () => {
  it("interprets a late-night study prompt", () => {
    const intent = simulateInterpretation("Something calm for a 3 AM study session");
    expect(intent).toMatchObject({
      mood: "calm",
      activity: "studying",
      energy: "low",
      vocals: "instrumental_preferred",
      time_context: "late_night",
    });
  });

  it("interprets a workout prompt as high energy", () => {
    expect(simulateInterpretation("Energetic music for a workout.")).toMatchObject({
      mood: "energetic",
      energy: "high",
      tempo: "fast",
    });
  });

  it("interprets a rainy evening prompt", () => {
    expect(simulateInterpretation("Melancholic songs for a rainy evening.")).toMatchObject({
      mood: "melancholic",
      time_context: "evening",
    });
  });

  it("falls back to a default intent for ambiguous prompts", () => {
    const intent = simulateInterpretation("surprise me");
    expect(intent.mood).toBeTruthy();
    expect(intent.genre.length).toBeGreaterThan(0);
  });
});

describe("createMockClient", () => {
  it("returns mock mode, intent and 6-8 tracks", async () => {
    const res = await createMockClient(0).search("calm study");
    expect(res.mode).toBe("mock");
    expect(res.tracks.length).toBeGreaterThanOrEqual(6);
    expect(res.tracks.length).toBeLessThanOrEqual(8);
    expect(res.queries.primary).toContain("calm");
  });

  it("supports the simulated empty and error states", async () => {
    const client = createMockClient(0);
    expect((await client.search("simulate empty")).tracks).toEqual([]);
    await expect(client.search("simulate error")).rejects.toBeInstanceOf(MusicApiError);
  });

  it("can be aborted", async () => {
    const controller = new AbortController();
    const pending = createMockClient(1000).search("calm", controller.signal);
    controller.abort();
    await expect(pending).rejects.toThrow(/abort/i);
  });
});

