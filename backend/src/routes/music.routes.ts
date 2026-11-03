import { Router } from "express";
import { validateBody } from "../middleware/validateBody.js";
import { musicPromptSchema } from "../middleware/validateMusicPrompt.js";
import type { createMusicController } from "../controllers/music.controller.js";

export function createMusicRouter(controller: ReturnType<typeof createMusicController>): Router {
  const router = Router();

  router.post("/interpret", validateBody(musicPromptSchema), (req, res, next) => {
    controller.interpret(req, res, next);
  });

  router.post("/search", validateBody(musicPromptSchema), (req, res, next) => {
    controller.search(req, res, next);
  });

  return router;
}

