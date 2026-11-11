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

const browserContextSchema = z.object({
  localTime: z.string().max(5).optional(),
  hour: z.number().int().min(0).max(23).optional(),
  dayOfWeek: z.enum(["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]).optional(),
  dayPeriod: z.enum(["morning", "afternoon", "evening", "late_night"]).optional(),
  languages: z.array(z.string().trim().min(1).max(35)).max(5).optional(),
  timeZone: z.string().max(100).optional(),
  online: z.boolean().optional(),
}).optional().catch(undefined);

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
  browserContext: browserContextSchema,
});

export type MusicPromptBody = z.infer<typeof musicPromptSchema>;
