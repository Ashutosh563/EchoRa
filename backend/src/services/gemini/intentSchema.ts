import { z } from "zod";
import {
  ENERGY_LEVELS,
  TEMPO_PREFERENCES,
  TIME_CONTEXTS,
  VOCAL_PREFERENCES,
  type MusicIntent,
} from "../../types/intent.js";

const MAX_GENRES = 3;

/** Lowercases, collapses whitespace and limits length of a free-text field. */
const normalizedText = (maxLength: number) =>
  z
    .string()
    .transform((value) => value.toLowerCase().replace(/\s+/g, " ").trim().slice(0, maxLength));

/** Normalises an enum value: case/spacing tolerant, falls back to a default when unknown. */
function lenientEnum<const T extends readonly [string, ...string[]]>(values: T, fallback: T[number]) {
  return z
    .unknown()
    .optional()
    .transform((value): T[number] => {
      if (typeof value !== "string") return fallback;
      const normalized = value.toLowerCase().trim().replace(/[\s-]+/g, "_");
      return (values as readonly string[]).includes(normalized) ? (normalized as T[number]) : fallback;
    });
}

/**
 * Validation schema for Gemini's JSON output.
 * Lenient by design: missing or out-of-range values are normalised to safe
 * defaults instead of failing the whole request. Only a non-object response
 * is treated as malformed.
 */
export const musicIntentSchema = z.object({
  mood: normalizedText(40)
    .optional()
    .catch("any")
    .transform((v) => v || "any"),
  activity: z
    .union([normalizedText(40), z.null(), z.undefined()])
    .catch(null)
    .transform((v) => (v && v !== "none" && v !== "null" && v !== "any" ? v : null)),
  energy: lenientEnum(ENERGY_LEVELS, "medium"),
  tempo: lenientEnum(TEMPO_PREFERENCES, "any"),
  genre: z
    .array(z.unknown())
    .optional()
    .catch([])
    .transform((items) => {
      if (!Array.isArray(items)) return [];
      const genres = items
        .filter((g): g is string => typeof g === "string")
        .map((g) => g.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 30))
        .filter(Boolean);
      return [...new Set(genres)].slice(0, MAX_GENRES);
    }),
  vocals: lenientEnum(VOCAL_PREFERENCES, "any"),
  time_context: lenientEnum(TIME_CONTEXTS, "any"),
}) satisfies z.ZodType<MusicIntent, unknown>;

/**
 * JSON Schema sent to Gemini (structured output) so it returns exactly this shape.
 * Kept explicit for readability; a unit test keeps its enums in sync with the types.
 */
export const MUSIC_INTENT_JSON_SCHEMA = {
  type: "object",
  properties: {
    mood: { type: "string", description: "Single primary mood word, lowercase, e.g. calm, energetic, melancholic." },
    activity: {
      type: ["string", "null"],
      description: "Activity or setting in one or two words (e.g. studying, workout, driving), or null if none.",
    },
    energy: { type: "string", enum: [...ENERGY_LEVELS] },
    tempo: { type: "string", enum: [...TEMPO_PREFERENCES] },
    genre: {
      type: "array",
      items: { type: "string" },
      maxItems: MAX_GENRES,
      description: "Up to 3 lowercase genre keywords that best fit the request.",
    },
    vocals: { type: "string", enum: [...VOCAL_PREFERENCES] },
    time_context: { type: "string", enum: [...TIME_CONTEXTS] },
  },
  required: ["mood", "activity", "energy", "tempo", "genre", "vocals", "time_context"],
  additionalProperties: false,
} as const;

