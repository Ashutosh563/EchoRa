import { Router } from "express";
import { validateBody } from "../middleware/validateBody.js";
import { musicPromptSchema } from "../middleware/validateMusicPrompt.js";
import { validateImagePayload } from "../middleware/validateImagePayload.js";
import type { createMusicController } from "../controllers/music.controller.js";
import type { createCameraController } from "../controllers/camera.controller.js";
import { resolveYouTubeVideoId } from "../services/music/youtubeResolver.js";

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

  router.post("/load-more", (req, res, next) => {
    musicController.loadMore(req, res, next);
  });

  router.post("/refine-vibe", (req, res, next) => {
    musicController.refineVibe(req, res, next);
  });

  router.get("/youtube-stream", async (req, res, next) => {
    try {
      const track = typeof req.query.track === "string" ? req.query.track : "";
      const artist = typeof req.query.artist === "string" ? req.query.artist : "";
      const videoId = await resolveYouTubeVideoId(track, artist);
      res.json({ videoId });
    } catch (err) {
      next(err);
    }
  });

  router.post("/youtube-stream", async (req, res, next) => {
    try {
      const { track, artist } = req.body || {};
      const videoId = await resolveYouTubeVideoId(String(track || ""), artist ? String(artist) : undefined);
      res.json({ videoId });
    } catch (err) {
      next(err);
    }
  });

  if (cameraController) {
    router.post("/analyze-image", validateImagePayload, (req, res, next) => {
      void cameraController.analyze(req, res, next);
    });
  }

  return router;
}

