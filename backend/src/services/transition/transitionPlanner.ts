import type { GeminiClient } from "../gemini/geminiClient.js";
import type { MoodStage, TransitionPlanResponse } from "../../types/transition.js";
import { AppError } from "../../utils/AppError.js";

const TRANSITION_PLANNER_SYSTEM = `You are SONORA's Emotional Transition Planner.
Given a starting mood and a destination mood, produce a coherent, gradual 4-stage emotional and musical transition.

RULES:
1. Stage 1 MUST be the exact starting mood provided.
2. Stage 4 MUST be the exact destination mood provided.
3. Stages 2 and 3 MUST be two distinct intermediate moods that bridge Stage 1 to Stage 4 smoothly and logically.
4. Exactly four stages must be returned.
5. Provide a concise, user-facing description for each stage.
6. Provide 2-4 musical characteristics (genres, acoustic properties, instrumentation) for each stage.
7. Provide estimated energy (0.0 to 1.0) and valence (0.0 to 1.0) for each stage.
8. Output strict JSON matching the requested schema.`;

const TRANSITION_SCHEMA = {
  type: "object",
  properties: {
    stages: {
      type: "array",
      items: {
        type: "object",
        properties: {
          stage: { type: "integer" },
          mood: { type: "string" },
          description: { type: "string" },
          musicalCharacteristics: {
            type: "array",
            items: { type: "string" },
          },
          energy: { type: "number" },
          valence: { type: "number" },
        },
        required: ["stage", "mood", "description", "musicalCharacteristics"],
      },
    },
  },
  required: ["stages"],
};

export function getMockTransitionPlan(
  startingMood: string,
  destinationMood: string,
): TransitionPlanResponse {
  const startCap = startingMood.charAt(0).toUpperCase() + startingMood.slice(1).toLowerCase();
  const destCap = destinationMood.charAt(0).toUpperCase() + destinationMood.slice(1).toLowerCase();

  const mockIntermediates: Record<string, [string, string]> = {
    "Sad->Happy": ["Reflective", "Hopeful"],
    "Anxious->Calm": ["Grounding", "Peaceful"],
    "Angry->Peaceful": ["Cathartic", "Mellow"],
    "Lonely->Connected": ["Introspective", "Warm"],
    "Tired->Energetic": ["Awakening", "Uplifting"],
  };

  const key = `${startCap}->${destCap}`;
  const [inter1, inter2] = mockIntermediates[key] || ["Reflective", "Uplifting"];

  return {
    stages: [
      {
        stage: 1,
        mood: startCap,
        description: `Embracing and acknowledging ${startCap.toLowerCase()} feelings`,
        musicalCharacteristics: ["melancholic", "introspective", "acoustic"],
        energy: 0.25,
        valence: 0.2,
      },
      {
        stage: 2,
        mood: inter1,
        description: `Gentle transition into ${inter1.toLowerCase()} contemplation`,
        musicalCharacteristics: ["mellow", "thoughtful", "soft alternative"],
        energy: 0.45,
        valence: 0.4,
      },
      {
        stage: 3,
        mood: inter2,
        description: `Shifting toward ${inter2.toLowerCase()} optimism and forward momentum`,
        musicalCharacteristics: ["warm", "melodic", "building rhythm"],
        energy: 0.65,
        valence: 0.65,
      },
      {
        stage: 4,
        mood: destCap,
        description: `Arriving fully in ${destCap.toLowerCase()} resonance and presence`,
        musicalCharacteristics: ["upbeat", "vibrant", "feel-good"],
        energy: 0.85,
        valence: 0.85,
      },
    ],
  };
}

export function validateStageList(
  stages: MoodStage[],
  startingMood: string,
  destinationMood: string,
): MoodStage[] {
  if (!Array.isArray(stages) || stages.length !== 4) {
    throw new AppError("GEMINI_INVALID_RESPONSE", {
      message: "The transition planner must produce exactly four emotional stages.",
    });
  }

  const startCap = startingMood.trim().toLowerCase();
  const destCap = destinationMood.trim().toLowerCase();

  // Enforce Stage 1 is starting mood and Stage 4 is destination mood
  return stages.map((s, index) => {
    const stageNum = index + 1;
    let mood = (s.mood || "").trim();
    if (stageNum === 1) {
      mood = startingMood.trim();
    } else if (stageNum === 4) {
      mood = destinationMood.trim();
    }

    if (!mood) {
      mood = stageNum === 1 ? startCap : stageNum === 4 ? destCap : `Transition ${stageNum}`;
    }

    return {
      stage: stageNum,
      mood: mood.charAt(0).toUpperCase() + mood.slice(1),
      description: s.description?.trim() || `Emotional stage ${stageNum}`,
      musicalCharacteristics:
        Array.isArray(s.musicalCharacteristics) && s.musicalCharacteristics.length > 0
          ? s.musicalCharacteristics.map((c) => String(c).trim()).filter(Boolean)
          : ["melodic", "ambient"],
      energy: typeof s.energy === "number" ? Math.min(Math.max(s.energy, 0), 1) : 0.5,
      valence: typeof s.valence === "number" ? Math.min(Math.max(s.valence, 0), 1) : 0.5,
    };
  });
}

export interface TransitionPlanner {
  plan(
    startingMood: string,
    destinationMood: string,
    signal?: AbortSignal,
  ): Promise<TransitionPlanResponse>;
}

export function createTransitionPlanner(geminiClient: GeminiClient | null): TransitionPlanner {
  return {
    async plan(
      startingMood: string,
      destinationMood: string,
      signal?: AbortSignal,
    ): Promise<TransitionPlanResponse> {
      const cleanStart = startingMood.trim();
      const cleanDest = destinationMood.trim();

      if (!cleanStart || !cleanDest) {
        throw new AppError("VALIDATION_ERROR", {
          message: "Please select both a starting mood and a destination mood.",
        });
      }

      if (cleanStart.toLowerCase() === cleanDest.toLowerCase()) {
        throw new AppError("VALIDATION_ERROR", {
          message: "Starting and destination moods must be different to create an emotional journey.",
        });
      }

      if (!geminiClient) {
        return getMockTransitionPlan(cleanStart, cleanDest);
      }

      const userText = JSON.stringify({
        startingMood: cleanStart,
        destinationMood: cleanDest,
        stageCount: 4,
      });

      try {
        const rawJson = await geminiClient.generateJson({
          userText,
          systemInstruction: TRANSITION_PLANNER_SYSTEM,
          jsonSchema: TRANSITION_SCHEMA,
          signal,
        });

        const parsed = JSON.parse(rawJson);
        const validStages = validateStageList(parsed.stages, cleanStart, cleanDest);
        return { stages: validStages };
      } catch (err) {
        if (err instanceof AppError) throw err;
        // Fallback to mock plan on parse error rather than crashing
        return getMockTransitionPlan(cleanStart, cleanDest);
      }
    },
  };
}

