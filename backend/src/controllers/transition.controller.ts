import type { Request, Response, NextFunction } from "express";
import type { TransitionPlanner } from "../services/transition/transitionPlanner.js";
import type { StageIntentGenerator } from "../services/transition/stageIntentGenerator.js";
import type { PlaylistAssembler } from "../services/transition/playlistAssembler.js";
import type { TransitionIntentExtractor } from "../services/transition/transitionIntentExtractor.js";
import type {
  GenerateTransitionMusicRequest,
  TransitionPlanRequest,
} from "../types/transition.js";

export function createTransitionController(
  transitionPlanner: TransitionPlanner,
  stageIntentGenerator: StageIntentGenerator,
  playlistAssembler: PlaylistAssembler,
  intentExtractor: TransitionIntentExtractor,
) {
  return {
    async interpret(req: Request<unknown, unknown, { prompt: string }>, res: Response, next: NextFunction) {
      try {
        const result = await intentExtractor.interpret(req.body.prompt, req.signal);
        res.json(result);
      } catch (err) {
        next(err);
      }
    },
    async plan(
      req: Request<unknown, unknown, TransitionPlanRequest>,
      res: Response,
      next: NextFunction,
    ) {
      try {
        const { startingMood, destinationMood } = req.body;
        const plan = await transitionPlanner.plan(startingMood, destinationMood);
        res.json(plan);
      } catch (err) {
        next(err);
      }
    },

    async generateMusic(
      req: Request<unknown, unknown, GenerateTransitionMusicRequest>,
      res: Response,
      next: NextFunction,
    ) {
      try {
        const { startingMood, destinationMood, stages } = req.body;
        const intents = await stageIntentGenerator.generate(stages);
        const journey = await playlistAssembler.assemble(
          startingMood,
          destinationMood,
          stages,
          intents,
        );
        res.json(journey);
      } catch (err) {
        next(err);
      }
    },
  };
}

