import { Router } from "express";
import { validateBody } from "../middleware/validateBody.js";
import { musicPromptSchema } from "../middleware/validateMusicPrompt.js";
import { validateImagePayload } from "../middleware/validateImagePayload.js";
import type { createMusicController } from "../controllers/music.controller.js";
import type { createCameraController } from "../controllers/camera.controller.js";

export function createMusicRouter(
  musicController: ReturnType<typeof createMusicController>,
  cameraController?: ReturnType<typeof createCameraController>,
): Router {
  const router = Router();

  router.post("/interpret", validateBody(musicPromptSchema), (req, res, next) => {
    musicController.interpret(req, res, next);
  });

  router.post("/search", validateBody(musicPromptSchema), (req, res, next) => {
    musicController.search(req, res, next);
  });

  if (cameraController) {
    router.post("/analyze-image", validateImagePayload, (req, res, next) => {
      void cameraController.analyze(req, res, next);
    });
  }

  return router;
}

