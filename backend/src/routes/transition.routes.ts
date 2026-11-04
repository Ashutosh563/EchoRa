import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validateBody.js";
import type { createTransitionController } from "../controllers/transition.controller.js";

const planTransitionSchema = z.object({
  startingMood: z
    .string()
    .trim()
    .min(1, "Please select a starting mood.")
    .max(50, "Mood must be 50 characters or less."),
  destinationMood: z
    .string()
    .trim()
    .min(1, "Please select a destination mood.")
    .max(50, "Mood must be 50 characters or less."),
});

const moodStageSchema = z.object({
  stage: z.number().int().min(1).max(4),
  mood: z.string().trim().min(1).max(50),
  description: z.string().trim().max(250).default(""),
  musicalCharacteristics: z.array(z.string().trim().max(50)).default([]),
  energy: z.number().min(0).max(1).optional(),
  valence: z.number().min(0).max(1).optional(),
});

const generateMusicSchema = z.object({
  startingMood: z.string().trim().min(1).max(50),
  destinationMood: z.string().trim().min(1).max(50),
  stages: z
    .array(moodStageSchema)
    .length(4, "Exactly four stages are required for music generation."),
});

export function createTransitionRouter(
  controller: ReturnType<typeof createTransitionController>,
): Router {
  const router = Router();

  router.post("/plan", validateBody(planTransitionSchema), (req, res, next) => {
    void controller.plan(req, res, next);
  });

  router.post("/generate-music", validateBody(generateMusicSchema), (req, res, next) => {
    void controller.generateMusic(req, res, next);
  });

  return router;
}

