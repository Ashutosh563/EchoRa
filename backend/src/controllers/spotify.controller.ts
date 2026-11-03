import type { Request, Response, NextFunction } from "express";
import type { SpotifyAuth } from "../services/spotify/spotifyAuth.js";
import type { AppConfig } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

export function createSpotifyController(config: AppConfig, spotifyAuth: SpotifyAuth | null) {
  return {
    auth(_req: Request, res: Response, next: NextFunction) {
      try {
        if (!spotifyAuth) {
          throw new AppError("SPOTIFY_AUTH_FAILED", {
            message: "Spotify credentials are not configured yet. Run `npm run setup` first.",
          });
        }
        const url = spotifyAuth.createAuthorizeUrl();
        res.redirect(url);
      } catch (err) {
        next(err);
      }
    },

    async callback(req: Request, res: Response, next: NextFunction) {
      try {
        const { code, state, error } = req.query;
        if (error) {
          return res.redirect(`${config.frontendUrl}?spotify=error&reason=${encodeURIComponent(String(error))}`);
        }
        if (!spotifyAuth) {
          return res.redirect(`${config.frontendUrl}?spotify=error&reason=not_configured`);
        }
        if (typeof code !== "string" || typeof state !== "string") {
          return res.redirect(`${config.frontendUrl}?spotify=error&reason=invalid_callback`);
        }

        await spotifyAuth.handleCallback(code, state);
        res.redirect(`${config.frontendUrl}?spotify=connected`);
      } catch (err) {
        next(err);
      }
    },
  };
}

