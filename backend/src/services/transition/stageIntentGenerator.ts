import type { GeminiClient } from "../gemini/geminiClient.js";
import type { MoodStage, StageSearchIntent, StageSonicProfile } from "../../types/transition.js";
import { AppError } from "../../utils/AppError.js";

const STAGE_INTENTS_SYSTEM = `You are ECHORA's Expert Stage Music Intent Generator.
Given four approved stages of a musical mood transition journey, generate targeted, high-precision Spotify search queries and deep sonic profiles for EACH of the four stages.

COMPOSITION GOAL FOR EVERY STAGE:
Each stage in the final transition playlist will feature:
- 2 Hindi/Bollywood vocal songs
- 2 English/Western vocal songs
- 1 Choice song (best remaining Hindi or English vocal song, or at most 1 instrumental piece if and only if strictly needed for ambient transition).

To support this composition, for each stage produce THREE specialized search queries and a sonic profile:
1. hindiQuery: 2-4 keywords combining the stage mood with an explicit Hindi or Bollywood cultural anchor (e.g. 'hindi acoustic melodious', 'bollywood sad slow', 'hindi indie soul', 'bollywood happy upbeat'). MUST contain the word 'hindi' or 'bollywood'.
2. englishQuery: 2-4 keywords capturing the stage mood and subgenre in English (e.g. 'indie folk acoustic', 'slowcore ambient dream', 'synthpop driving energy').
3. curatorQuery: 2-4 keywords representing curator phrasing or acoustic bridge texture (e.g. 'quiet midnight reflection', 'morning sunrise awakening').
4. sonicProfile:
   - instruments: 2-4 physical instruments that define this stage's acoustic palette.
   - production: Timbre description (e.g. 'warm intimate tape saturation', 'lush reverb ambient', 'clean driving rhythm').
   - tempo: Cadence feel (e.g. 'slow gentle 65bpm', 'steady walking 85bpm', 'upbeat driving 120bpm').
   - harmonicMode: 'minor' (sad, dark, introspective), 'major' (joyful, bright, uplifting), or 'modal' (dreamy, atmospheric, floating).
   - vocalStyle: Vocal delivery nuance (e.g. 'soft intimate melodic vocals', 'warm emotive singing').
   - bridgeAura: Acoustic texture and harmonic shift that naturally prepares the listener for the subsequent stage.
   - allowInstrumental: boolean. STRICT: set false unless an ambient/score piece is strictly required for this transition stage. Max 1 instrumental is ever allowed.

CRITICAL RULES:
1. Exactly four stage objects must be generated, mapped to stage 1, 2, 3, 4.
2. CONCISE QUERIES: Every query MUST be between 2 and 4 words maximum. NEVER string together long sentences, or Spotify will return 0 tracks!
3. No boolean operators (AND/OR/NOT), no quotes, no punctuation.
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
          hindiQuery: { type: "string" },
          englishQuery: { type: "string" },
          curatorQuery: { type: "string" },
          sonicProfile: {
            type: "object",
            properties: {
              instruments: {
                type: "array",
                items: { type: "string" },
              },
              production: { type: "string" },
              tempo: { type: "string" },
              harmonicMode: { type: "string", enum: ["minor", "major", "modal"] },
              vocalStyle: { type: "string" },
              bridgeAura: { type: "string" },
              allowInstrumental: { type: "boolean" },
            },
            required: ["instruments", "production", "tempo"],
          },
        },
        required: ["stage", "hindiQuery", "englishQuery", "curatorQuery", "sonicProfile"],
      },
    },
  },
  required: ["searchIntents"],
};

export function getMockStageIntents(stages: MoodStage[]): StageSearchIntent[] {
  return stages.map((s, idx) => {
    const stageNum = idx + 1;
    const moodWord = s.mood.toLowerCase();
    const charWord = s.musicalCharacteristics[0]?.toLowerCase() || "acoustic";
    const charWord2 = s.musicalCharacteristics[1]?.toLowerCase() || "indie";

    const mockProfile: StageSonicProfile = {
      instruments: [charWord, "piano", "guitar"],
      production: "warm organic acoustic warmth",
      tempo: s.energy && s.energy > 0.6 ? "moderate 105bpm" : "gentle 72bpm",
      harmonicMode: s.valence && s.valence > 0.5 ? "major" : "minor",
      vocalStyle: "expressive melodic vocals",
      bridgeAura: idx < 3 ? `transitional lift toward stage ${idx + 2}` : "resolution",
      allowInstrumental: false,
    };

    const hindiQuery = `hindi ${moodWord} ${charWord}`.trim().slice(0, 50);
    const englishQuery = `${charWord2} ${charWord}`.trim().slice(0, 50);
    const curatorQuery = `${moodWord} reflection`.trim().slice(0, 50);

    return {
      stage: stageNum,
      hindiQuery,
      englishQuery,
      curatorQuery,
      moodQuery: hindiQuery,
      genreQuery: englishQuery,
      sonicProfile: mockProfile,
      query: hindiQuery,
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

        // Ensure all 4 stages are mapped with clean queries and sonic profiles
        const intents: StageSearchIntent[] = [];
        for (let i = 1; i <= 4; i++) {
          const match = rawIntents.find((item: any) => item.stage === i);
          const stageData = stages[i - 1];
          const moodWord = stageData?.mood?.toLowerCase() || "ambient";
          const charWord = stageData?.musicalCharacteristics?.[0]?.toLowerCase() || "music";

          if (match && typeof match.hindiQuery === "string" && match.hindiQuery.trim()) {
            const hindiQ = match.hindiQuery.trim().slice(0, 60);
            const englishQ = (match.englishQuery || `${charWord} music`).trim().slice(0, 60);
            const curatorQ = (match.curatorQuery || `${moodWord} vibe`).trim().slice(0, 60);

            intents.push({
              stage: i,
              hindiQuery: hindiQ,
              englishQuery: englishQ,
              curatorQuery: curatorQ,
              moodQuery: hindiQ,
              genreQuery: englishQ,
              sonicProfile: match.sonicProfile || {
                instruments: stageData.musicalCharacteristics || ["guitar", "piano"],
                production: "warm organic",
                tempo: "moderate",
                allowInstrumental: false,
              },
              query: hindiQ,
            });
          } else {
            // Fallback for this stage
            const fallbackHindi = `hindi ${moodWord} ${charWord}`.trim();
            const fallbackEnglish = `${charWord} ${moodWord}`.trim();
            const fallbackCurator = `${moodWord} journey`.trim();

            intents.push({
              stage: i,
              hindiQuery: fallbackHindi,
              englishQuery: fallbackEnglish,
              curatorQuery: fallbackCurator,
              moodQuery: fallbackHindi,
              genreQuery: fallbackEnglish,
              sonicProfile: {
                instruments: stageData.musicalCharacteristics || ["guitar", "piano"],
                production: "warm organic",
                tempo: "moderate",
                allowInstrumental: false,
              },
              query: fallbackHindi,
            });
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
