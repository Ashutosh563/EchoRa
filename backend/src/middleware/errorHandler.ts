import type { NextFunction, Request, Response } from "express";
import { AppError, isAppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";
import { ERROR_CATALOG } from "../types/errors.js";
import type { ErrorResponse } from "../types/api.js";

/** 404 for unknown routes. */
export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError("NOT_FOUND"));
}

function isBodyParseError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { type?: string }).type === "entity.parse.failed";
}

function isBodyTooLarge(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { type?: string }).type === "entity.too.large";
}

/**
 * Central error handler: converts every error into { error: { code, message } }
 * with a user-friendly message. Technical details are logged (redacted), never returned.
 */
export function errorHandler(err: unknown, req: Request, res: Response<ErrorResponse>, _next: NextFunction): void {
  let appError: AppError;

  if (isAppError(err)) {
    appError = err;
  } else if (isBodyParseError(err)) {
    appError = new AppError("INVALID_JSON");
  } else if (isBodyTooLarge(err)) {
    appError = new AppError("VALIDATION_ERROR", { message: "That request is too long." });
  } else {
    appError = new AppError("INTERNAL_ERROR", { cause: err });
  }

  const logLine = `${req.method} ${req.originalUrl} -> ${appError.status} ${appError.code}`;
  if (appError.status >= 500 || appError.code === "INTERNAL_ERROR") {
    logger.error(logLine, appError.detail ?? "", err instanceof Error && !isAppError(err) ? err : "");
  } else {
    logger.warn(logLine, appError.detail ?? "");
  }

  res.status(appError.status).json({
    error: { code: appError.code, message: appError.userMessage || ERROR_CATALOG.INTERNAL_ERROR.message },
  });
}

