import { z } from "zod";

export const musicPromptSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1, "Please describe what you'd like to listen to.")
    .max(300, "Prompt must be 300 characters or less."),
});

export type MusicPromptBody = z.infer<typeof musicPromptSchema>;
