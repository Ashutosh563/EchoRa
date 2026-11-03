import { Router } from "express";
import type { createStatusController } from "../controllers/status.controller.js";

export function createStatusRouter(controller: ReturnType<typeof createStatusController>): Router {
  const router = Router();

  router.get("/status", (req, res, next) => {
    controller.getStatus(req, res, next);
  });

  return router;
}

