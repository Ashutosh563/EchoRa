import type { GeminiClient } from "../gemini/geminiClient.js";
import type { MoodStage, StageSearchIntent } from "../../types/transition.js";
import { AppError } from "../../utils/AppError.js";

const STAGE_INTENTS_SYSTEM = `You are SONORA's Stage Music Intent Generator.
Given four approved stages of a musical mood transition journey, generate exactly four targeted, concise Spotify search queries (one query per stage).

RULES:
1. Exactly four queries must be generated, mapped to stage 1, 2, 3, 4.
2. Each query must be concise (2-4 terms max) combining the stage mood and key musical/genre characteristics.
3. No boolean operators (AND/OR/NOT), no quotes, no commas.
4. Output strict JSON matching the schema.`;

const STAGE_INTENTS_SCHEMA = {
  type: "object",
  properties: {
    searchIntents: {
      type: "array",
      items: {
        type: "object",
        properties: {
          stage: { type: "integer" },
          query: { type: "string" },
        },
        required: ["stage", "query"],
      },
    },
  },
  required: ["searchIntents"],
};

export function getMockStageIntents(stages: MoodStage[]): StageSearchIntent[] {
  return stages.map((s, idx) => {
    const stageNum = idx + 1;
    const moodWord = s.mood.toLowerCase();
    const charWord = s.musicalCharacteristics[0]?.toLowerCase() || "music";
    return {
      stage: stageNum,
      query: `${moodWord} ${charWord}`,
    };
  });
}

export interface StageIntentGenerator {
  generate(stages: MoodStage[], signal?: AbortSignal): Promise<StageSearchIntent[]>;
}

export function createStageIntentGenerator(
  geminiClient: GeminiClient | null,
): StageIntentGenerator {
  return {
    async generate(stages: MoodStage[], signal?: AbortSignal): Promise<StageSearchIntent[]> {
      if (!Array.isArray(stages) || stages.length !== 4) {
        throw new AppError("VALIDATION_ERROR", {
          message: "Exactly four approved stages are required to generate music intents.",
        });
      }

      if (!geminiClient) {
        return getMockStageIntents(stages);
      }

      const userText = JSON.stringify({
        stages: stages.map((s) => ({
          stage: s.stage,
          mood: s.mood,
          description: s.description,
          musicalCharacteristics: s.musicalCharacteristics,
          energy: s.energy,
          valence: s.valence,
        })),
      });

      try {
        const rawJson = await geminiClient.generateJson({
          userText,
          systemInstruction: STAGE_INTENTS_SYSTEM,
          jsonSchema: STAGE_INTENTS_SCHEMA,
          signal,
        });

        const parsed = JSON.parse(rawJson);
        const rawIntents = Array.isArray(parsed.searchIntents) ? parsed.searchIntents : [];

        // Ensure all 4 stages are mapped
        const intents: StageSearchIntent[] = [];
        for (let i = 1; i <= 4; i++) {
          const match = rawIntents.find((item: any) => item.stage === i);
          if (match && typeof match.query === "string" && match.query.trim()) {
            intents.push({ stage: i, query: match.query.trim().slice(0, 80) });
          } else {
            // Fallback for this stage
            const stageData = stages[i - 1];
            const fallbackQuery = `${stageData?.mood || "ambient"} ${stageData?.musicalCharacteristics?.[0] || "music"}`.trim();
            intents.push({ stage: i, query: fallbackQuery });
          }
        }

        return intents;
      } catch (err) {
        if (err instanceof AppError) throw err;
        return getMockStageIntents(stages);
      }
    },
  };
}

