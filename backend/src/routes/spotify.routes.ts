import { Router } from "express";
import type { createSpotifyController } from "../controllers/spotify.controller.js";

export function createSpotifyRouter(controller: ReturnType<typeof createSpotifyController>): Router {
  const router = Router();

  router.get("/auth", (req, res, next) => {
    controller.auth(req, res, next);
  });

  router.get("/callback", (req, res, next) => {
    void controller.callback(req, res, next);
  });

  return router;
}
