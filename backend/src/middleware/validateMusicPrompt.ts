import { z } from "zod";

const discoveryModeSchema = z
  .preprocess((val) => (val === "BALANCED" || val === "EXPLORE" ? val : "FAMILIAR"), z.enum(["FAMILIAR", "BALANCED", "EXPLORE"]))
  .default("FAMILIAR");

const stringListSchema = z
  .preprocess((val) => (Array.isArray(val) ? val.filter((item): item is string => typeof item === "string") : []), z.array(z.string().trim().max(100)))
  .catch([]);

const userPreferencesSchema = z
  .object({
    favoriteGenres: stringListSchema,
    favoriteArtists: stringListSchema,
    dislikedGenres: stringListSchema,
    dislikedArtists: stringListSchema,
  })
  .catch({
    favoriteGenres: [],
    favoriteArtists: [],
    dislikedGenres: [],
    dislikedArtists: [],
  });

const historySignalSchema = z.object({
  term: z.string().trim().max(100),
  frequency: z.number().int().nonnegative(),
});

export const musicPromptSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1, "Please describe what you'd like to listen to.")
    .max(300, "Prompt must be 300 characters or less."),
  discoveryMode: discoveryModeSchema,
  preferences: userPreferencesSchema.default({
    favoriteGenres: [],
    favoriteArtists: [],
    dislikedGenres: [],
    dislikedArtists: [],
  }),
  historySignals: z.array(historySignalSchema).catch([]).default([]),
});

export type MusicPromptBody = z.infer<typeof musicPromptSchema>;
