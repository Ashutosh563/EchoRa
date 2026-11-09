import { describe, it, expect, vi } from "vitest";
import {
  createStageIntentGenerator,
} from "../../src/services/transition/stageIntentGenerator.js";
import type { GeminiClient } from "../../src/services/gemini/geminiClient.js";
import type { MoodStage } from "../../src/types/transition.js";

describe("StageIntentGenerator", () => {
  const sampleStages: MoodStage[] = [
    { stage: 1, mood: "Sad", description: "Melancholic feelings", musicalCharacteristics: ["acoustic guitar", "felt piano"], energy: 0.2, valence: 0.15 },
    { stage: 2, mood: "Reflective", description: "Quiet introspection", musicalCharacteristics: ["mellow strings", "soft drums"], energy: 0.35, valence: 0.3 },
    { stage: 3, mood: "Hopeful", description: "Subtle optimism", musicalCharacteristics: ["warm synth", "bright piano"], energy: 0.6, valence: 0.6 },
    { stage: 4, mood: "Energetic", description: "Dynamic vitality", musicalCharacteristics: ["driving bass", "rhythmic beats"], energy: 0.85, valence: 0.8 },
  ];

  it("generates 3 query facets and sonicProfile for all 4 stages via Gemini", async () => {
    const mockGemini: GeminiClient = {
      generateJson: vi.fn().mockResolvedValue(
        JSON.stringify({
          searchIntents: [
            {
              stage: 1,
              moodQuery: "sad acoustic guitar",
              genreQuery: "indie folk slowcore",
              curatorQuery: "rainy day quiet",
              sonicProfile: {
                instruments: ["acoustic guitar", "felt piano"],
                production: "warm organic",
                tempo: "slow 65bpm",
                harmonicMode: "minor",
                vocalStyle: "intimate gentle vocals",
                bridgeAura: "soft strings hinting at reflection",
              },
            },
            {
              stage: 2,
              moodQuery: "reflective mellow strings",
              genreQuery: "chamber pop ambient",
              curatorQuery: "midnight contemplation",
              sonicProfile: {
                instruments: ["cello", "soft piano"],
                production: "lush reverberant",
                tempo: "walking 75bpm",
                harmonicMode: "minor",
                bridgeAura: "gradual acoustic lift",
              },
            },
            {
              stage: 3,
              moodQuery: "hopeful warm synth",
              genreQuery: "dream pop uplifting",
              curatorQuery: "morning sunrise warmth",
              sonicProfile: {
                instruments: ["warm synth", "bright keys"],
                production: "glowing atmospheric",
                tempo: "moderate 95bpm",
                harmonicMode: "major",
                bridgeAura: "driving percussion build",
              },
            },
            {
              stage: 4,
              moodQuery: "energetic driving bass",
              genreQuery: "indie dance electronic",
              curatorQuery: "pure vitality workout",
              sonicProfile: {
                instruments: ["synth bass", "punchy drums"],
                production: "crisp dynamic punch",
                tempo: "fast 122bpm",
                harmonicMode: "major",
                bridgeAura: "full resolution",
              },
            },
          ],
        }),
      ),
    };

    const generator = createStageIntentGenerator(mockGemini);
    const intents = await generator.generate(sampleStages);

    expect(intents).toHaveLength(4);
    for (let i = 0; i < 4; i++) {
      const intent = intents[i];
      expect(intent.stage).toBe(i + 1);
      expect(intent.moodQuery).toBeTruthy();
      expect(intent.genreQuery).toBeTruthy();
      expect(intent.curatorQuery).toBeTruthy();
      expect(intent.sonicProfile).toBeDefined();
      expect(intent.sonicProfile?.instruments.length).toBeGreaterThan(0);
    }
  });

  it("uses getMockStageIntents when geminiClient is null", async () => {
    const generator = createStageIntentGenerator(null);
    const intents = await generator.generate(sampleStages);

    expect(intents).toHaveLength(4);
    expect(intents[0].stage).toBe(1);
    expect(intents[0].moodQuery).toContain("sad");
    expect(intents[0].sonicProfile).toBeDefined();
  });
});
