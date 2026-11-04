import { describe, it, expect, vi } from "vitest";
import {
  createTransitionPlanner,
  validateStageList,
} from "../../src/services/transition/transitionPlanner.js";
import type { GeminiClient } from "../../src/services/gemini/geminiClient.js";

describe("TransitionPlanner", () => {
  it("enforces starting mood in stage 1 and destination mood in stage 4", async () => {
    const planner = createTransitionPlanner(null); // mock mode
    const res = await planner.plan("Sad", "Happy");

    expect(res.stages).toHaveLength(4);
    expect(res.stages[0].stage).toBe(1);
    expect(res.stages[0].mood).toBe("Sad");

    expect(res.stages[3].stage).toBe(4);
    expect(res.stages[3].mood).toBe("Happy");

    // Exactly two intermediate moods
    expect(res.stages[1].stage).toBe(2);
    expect(res.stages[2].stage).toBe(3);
    expect(res.stages[1].mood).toBeDefined();
    expect(res.stages[2].mood).toBeDefined();
  });

  it("throws validation error when starting and destination moods are identical", async () => {
    const planner = createTransitionPlanner(null);
    await expect(planner.plan("Sad", "sad")).rejects.toThrow(
      /must be different to create an emotional journey/i,
    );
  });

  it("throws validation error on empty moods", async () => {
    const planner = createTransitionPlanner(null);
    await expect(planner.plan("  ", "Happy")).rejects.toThrow(
      /select both a starting mood and a destination mood/i,
    );
  });

  it("calls Gemini with structured schema and validates output", async () => {
    const mockGemini: GeminiClient = {
      generateJson: vi.fn().mockResolvedValue(
        JSON.stringify({
          stages: [
            {
              stage: 1,
              mood: "Anxious",
              description: "Tense energy",
              musicalCharacteristics: ["fast tempo", "minor chords"],
              energy: 0.8,
              valence: 0.2,
            },
            {
              stage: 2,
              mood: "Grounding",
              description: "Slowing down",
              musicalCharacteristics: ["lo-fi", "warm bass"],
              energy: 0.5,
              valence: 0.4,
            },
            {
              stage: 3,
              mood: "Peaceful",
              description: "Open breathing",
              musicalCharacteristics: ["acoustic guitar", "soft pads"],
              energy: 0.3,
              valence: 0.6,
            },
            {
              stage: 4,
              mood: "Calm",
              description: "Complete tranquility",
              musicalCharacteristics: ["ambient", "piano"],
              energy: 0.2,
              valence: 0.8,
            },
          ],
        }),
      ),
    };

    const planner = createTransitionPlanner(mockGemini);
    const result = await planner.plan("Anxious", "Calm");

    expect(mockGemini.generateJson).toHaveBeenCalled();
    expect(result.stages).toHaveLength(4);
    expect(result.stages[0].mood).toBe("Anxious");
    expect(result.stages[1].mood).toBe("Grounding");
    expect(result.stages[2].mood).toBe("Peaceful");
    expect(result.stages[3].mood).toBe("Calm");
  });

  it("validateStageList enforces stage order 1 to 4 and overrides endpoints if mismatched", () => {
    const rawStages: any = [
      { stage: 99, mood: "Wrong", description: "d", musicalCharacteristics: ["c"] },
      { stage: 2, mood: "Mid 1", description: "d", musicalCharacteristics: ["c"] },
      { stage: 3, mood: "Mid 2", description: "d", musicalCharacteristics: ["c"] },
      { stage: 1, mood: "Also Wrong", description: "d", musicalCharacteristics: ["c"] },
    ];

    const validated = validateStageList(rawStages, "Sad", "Happy");
    expect(validated[0].stage).toBe(1);
    expect(validated[0].mood).toBe("Sad");
    expect(validated[3].stage).toBe(4);
    expect(validated[3].mood).toBe("Happy");
  });
});

