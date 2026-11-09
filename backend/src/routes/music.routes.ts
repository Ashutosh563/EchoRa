import { Router } from "express";
import { Readable } from "node:stream";
import { validateBody } from "../middleware/validateBody.js";
import { musicPromptSchema } from "../middleware/validateMusicPrompt.js";
import { validateImagePayload } from "../middleware/validateImagePayload.js";
import type { createMusicController } from "../controllers/music.controller.js";
import type { createCameraController } from "../controllers/camera.controller.js";
import { resolveYouTubeVideoId } from "../services/music/youtubeResolver.js";
import { getDirectAudioStreamUrl } from "../services/music/audioStreamService.js";

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

  router.get("/stream", async (req, res, next) => {
    try {
      const track = typeof req.query.track === "string" ? req.query.track : "";
      const artist = typeof req.query.artist === "string" ? req.query.artist : "";
      const videoId = typeof req.query.videoId === "string" ? req.query.videoId : undefined;

      const directUrl = await getDirectAudioStreamUrl(track, artist, videoId);
      if (!directUrl) {
        return res.status(404).json({ error: "Audio stream not found" });
      }

      // Forward client's Range header (crucial for scrubbing / seeking)
      const rangeHeader = req.headers.range;
      const upstreamHeaders: Record<string, string> = {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      };
      if (rangeHeader) {
        upstreamHeaders["Range"] = rangeHeader;
      }

      const upstreamRes = await fetch(directUrl, { headers: upstreamHeaders });

      res.status(upstreamRes.status);
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Type", upstreamRes.headers.get("content-type") || "audio/mp4");
      res.setHeader("Cache-Control", "public, max-age=3600");

      const contentRange = upstreamRes.headers.get("content-range");
      if (contentRange) {
        res.setHeader("Content-Range", contentRange);
      }

      const contentLength = upstreamRes.headers.get("content-length");
      if (contentLength) {
        res.setHeader("Content-Length", contentLength);
      }

      if (upstreamRes.body) {
        Readable.fromWeb(upstreamRes.body as any).pipe(res);
      } else {
        res.end();
      }
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

