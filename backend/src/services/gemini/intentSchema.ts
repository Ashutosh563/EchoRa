import { z } from "zod";
import {
  ENERGY_LEVELS,
  TEMPO_PREFERENCES,
  TIME_CONTEXTS,
  VOCAL_PREFERENCES,
  type Energy,
  type MusicIntent,
  type Tempo,
  type TimeContext,
  type VocalPreference,
} from "../../types/intent.js";

const MAX_GENRES = 3;

const cleanText = (val: unknown, maxLen = 40): string | null => {
  if (typeof val !== "string") return null;
  const s = val.toLowerCase().replace(/\s+/g, " ").trim().slice(0, maxLen);
  if (!s || s === "null" || s === "none" || s === "unspecified" || s === "any") return null;
  return s;
};

const cleanEnum = <T extends readonly string[]>(val: unknown, allowed: T): T[number] | null => {
  if (typeof val !== "string") return null;
  const s = val.toLowerCase().trim().replace(/[\s-]+/g, "_");
  return (allowed as readonly string[]).includes(s) ? (s as T[number]) : null;
};

const cleanGenreArray = (val: unknown): string[] => {
  if (!Array.isArray(val)) return [];
  const items = val
    .filter((g): g is string => typeof g === "string")
    .map((g) => g.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 30))
    .filter((g) => g && g !== "none" && g !== "null" && g !== "unspecified");
  return [...new Set(items)].slice(0, MAX_GENRES);
};

/**
 * Raw response structure returned by Gemini.
 * Supports both the new categorized schema ({ explicit, inferred, optional })
 * and fallback parsing for flat schemas.
 */
export const geminiRawResponseSchema = z.object({
  explicit: z
    .object({
      mood: z.unknown().optional(),
      activity: z.unknown().optional(),
      energy: z.unknown().optional(),
      tempo: z.unknown().optional(),
      genre: z.unknown().optional(),
      vocals: z.unknown().optional(),
      time_context: z.unknown().optional(),
    })
    .optional(),
  inferred: z
    .object({
      mood: z.unknown().optional(),
      activity: z.unknown().optional(),
      energy: z.unknown().optional(),
      tempo: z.unknown().optional(),
      vocals: z.unknown().optional(),
      time_context: z.unknown().optional(),
    })
    .optional(),
  optional: z
    .object({
      genre: z.unknown().optional(),
    })
    .optional(),
  // Flat legacy fields fallback
  mood: z.unknown().optional(),
  activity: z.unknown().optional(),
  energy: z.unknown().optional(),
  tempo: z.unknown().optional(),
  genre: z.unknown().optional(),
  vocals: z.unknown().optional(),
  time_context: z.unknown().optional(),
});

/**
 * Transforms categorized preferences into the consolidated MusicIntent with prioritized breakdown.
 */
export function buildPrioritizedIntent(raw: z.infer<typeof geminiRawResponseSchema>): MusicIntent {
  const exp = raw.explicit ?? {};
  const inf = raw.inferred ?? {};
  const opt = raw.optional ?? {};

  // 1. Mood
  const expMood = cleanText(exp.mood ?? raw.mood);
  const infMood = cleanText(inf.mood);
  const finalMood = expMood ?? infMood ?? "any";
  const moodBreakdown = expMood
    ? { value: expMood, source: "explicit" as const, priority: "high" as const }
    : infMood
      ? { value: infMood, source: "inferred" as const, priority: "medium" as const }
      : { value: null, source: "unspecified" as const, priority: "none" as const };

  // 2. Activity
  const expActivity = cleanText(exp.activity ?? raw.activity);
  const infActivity = cleanText(inf.activity);
  const finalActivity = expActivity ?? infActivity ?? null;
  const activityBreakdown = expActivity
    ? { value: expActivity, source: "explicit" as const, priority: "high" as const }
    : infActivity
      ? { value: infActivity, source: "inferred" as const, priority: "medium" as const }
      : { value: null, source: "unspecified" as const, priority: "none" as const };

  // 3. Vocals
  const expVocals = cleanEnum(exp.vocals ?? raw.vocals, VOCAL_PREFERENCES);
  const infVocals = cleanEnum(inf.vocals, VOCAL_PREFERENCES);
  const finalVocals = (expVocals ?? infVocals ?? "any") as VocalPreference;
  const vocalsBreakdown = expVocals && expVocals !== "any"
    ? { value: expVocals, source: "explicit" as const, priority: "medium_high" as const }
    : infVocals && infVocals !== "any"
      ? { value: infVocals, source: "inferred" as const, priority: "medium" as const }
      : { value: null, source: "unspecified" as const, priority: "none" as const };

  // 4. Energy
  const expEnergy = cleanEnum(exp.energy ?? raw.energy, ENERGY_LEVELS);
  const infEnergy = cleanEnum(inf.energy, ENERGY_LEVELS);
  const finalEnergy = (expEnergy ?? infEnergy ?? "medium") as Energy;
  const energyBreakdown = expEnergy
    ? { value: expEnergy, source: "explicit" as const, priority: "medium_high" as const }
    : infEnergy
      ? { value: infEnergy, source: "inferred" as const, priority: "low" as const }
      : { value: null, source: "unspecified" as const, priority: "none" as const };

  // 5. Tempo
  const expTempo = cleanEnum(exp.tempo ?? raw.tempo, TEMPO_PREFERENCES);
  const infTempo = cleanEnum(inf.tempo, TEMPO_PREFERENCES);
  const finalTempo = (expTempo ?? infTempo ?? "any") as Tempo;
  const tempoBreakdown = expTempo && expTempo !== "any"
    ? { value: expTempo, source: "explicit" as const, priority: "medium_high" as const }
    : infTempo && infTempo !== "any"
      ? { value: infTempo, source: "inferred" as const, priority: "low" as const }
      : { value: null, source: "unspecified" as const, priority: "none" as const };

  // 6. Genre
  const expGenres = cleanGenreArray(exp.genre ?? (raw.genre && !exp.genre ? raw.genre : undefined));
  const optGenres = cleanGenreArray(opt.genre);
  const mergedGenres = expGenres.length > 0 ? expGenres : optGenres;
  const genreBreakdown = expGenres.length > 0
    ? { value: expGenres, source: "explicit" as const, priority: "medium_high" as const }
    : optGenres.length > 0
      ? { value: optGenres, source: "optional" as const, priority: "low" as const }
      : { value: [] as string[], source: "unspecified" as const, priority: "none" as const };

  // 7. Time Context
  const expTime = cleanEnum(exp.time_context ?? raw.time_context, TIME_CONTEXTS);
  const infTime = cleanEnum(inf.time_context, TIME_CONTEXTS);
  const finalTime = (expTime ?? infTime ?? "any") as TimeContext;
  const timeBreakdown = expTime && expTime !== "any"
    ? { value: expTime, source: "explicit" as const, priority: "medium" as const }
    : infTime && infTime !== "any"
      ? { value: infTime, source: "inferred" as const, priority: "low" as const }
      : { value: null, source: "unspecified" as const, priority: "none" as const };

  return {
    mood: finalMood,
    activity: finalActivity,
    energy: finalEnergy,
    tempo: finalTempo,
    genre: mergedGenres,
    vocals: finalVocals,
    time_context: finalTime,
    breakdown: {
      mood: moodBreakdown,
      activity: activityBreakdown,
      energy: energyBreakdown,
      tempo: tempoBreakdown,
      genre: genreBreakdown,
      vocals: vocalsBreakdown,
      time_context: timeBreakdown,
    },
  };
}

export const musicIntentSchema = geminiRawResponseSchema.transform(buildPrioritizedIntent);

/**
 * JSON Schema sent to Gemini (structured output).
 */
export const MUSIC_INTENT_JSON_SCHEMA = {
  type: "object",
  properties: {
    explicit: {
      type: "object",
      properties: {
        mood: { type: ["string", "null"], description: "Mood words directly stated by the user, or null" },
        activity: { type: ["string", "null"], description: "Activity/setting directly stated by user, or null" },
        energy: { type: ["string", "null"], enum: [...ENERGY_LEVELS, null] },
        tempo: { type: ["string", "null"], enum: [...TEMPO_PREFERENCES, null] },
        genre: { type: "array", items: { type: "string" }, description: "Only genres explicitly named by user" },
        vocals: { type: ["string", "null"], enum: ["instrumental_preferred", "vocals_preferred", null] },
        time_context: { type: ["string", "null"], enum: [...TIME_CONTEXTS, null] },
      },
      required: ["mood", "activity", "energy", "tempo", "genre", "vocals", "time_context"],
    },
    inferred: {
      type: "object",
      properties: {
        mood: { type: ["string", "null"], description: "Mood reasonably inferred from context, or null" },
        activity: { type: ["string", "null"], description: "Activity reasonably inferred, or null" },
        energy: { type: ["string", "null"], enum: [...ENERGY_LEVELS, null] },
        tempo: { type: ["string", "null"], enum: [...TEMPO_PREFERENCES, null] },
        vocals: { type: ["string", "null"], enum: ["instrumental_preferred", "vocals_preferred", null] },
        time_context: { type: ["string", "null"], enum: [...TIME_CONTEXTS, null] },
      },
      required: ["mood", "activity", "energy", "tempo", "vocals", "time_context"],
    },
    optional: {
      type: "object",
      properties: {
        genre: {
          type: "array",
          items: { type: "string" },
          maxItems: MAX_GENRES,
          description: "Optional suggested genres fitting the vibe, not requested by user",
        },
      },
      required: ["genre"],
    },
  },
  required: ["explicit", "inferred", "optional"],
  additionalProperties: false,
} as const;
