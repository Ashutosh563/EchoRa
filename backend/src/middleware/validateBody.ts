import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { AppError } from "../utils/AppError.js";

/** Validates req.body against a Zod schema and replaces it with the parsed value. */
export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstIssue = result.error.issues[0]?.message;
      next(new AppError("VALIDATION_ERROR", { message: firstIssue, detail: result.error.message }));
      return;
    }
    req.body = result.data;
    next();
  };
}

