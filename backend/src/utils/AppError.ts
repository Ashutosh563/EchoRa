import { ERROR_CATALOG, type ErrorCode } from "../types/errors.js";

export interface AppErrorOptions {
  /** Override the default user-facing message. */
  message?: string;
  /** Technical detail for logs only; never sent to the client. */
  detail?: string;
  cause?: unknown;
}

/** An expected, user-presentable error with an HTTP status and stable code. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly userMessage: string;
  readonly detail?: string;

  constructor(code: ErrorCode, options: AppErrorOptions = {}) {
    const entry = ERROR_CATALOG[code];
    super(options.detail ?? options.message ?? entry.message, { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.status = entry.status;
    this.userMessage = options.message ?? entry.message;
    this.detail = options.detail;
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

