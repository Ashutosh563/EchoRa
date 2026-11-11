import { ApiError, GoogleGenAI } from "@google/genai";
import { AppError } from "../../utils/AppError.js";
import { logger } from "../../utils/logger.js";

export interface GenerateJsonRequest {
  /** The user's own text. Never Spotify content. */
  userText: string;
  systemInstruction: string;
  jsonSchema: unknown;
  signal?: AbortSignal;
}

/**
 * Narrow interface over the Gemini SDK so the intent extractor can be
 * unit-tested with a fake and remains independent from SDK details.
 */
export interface GeminiClient {
  /** Returns the raw JSON text produced by the model. */
  generateJson(request: GenerateJsonRequest): Promise<string>;
}


/**
 * Cascade of lighter/fallback models to try in descending order of cost/tier
 * if the primary configured model exhausts token quotas, rate limits, or is overloaded.
 */
export const GEMINI_FALLBACK_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
] as const;

/**
 * Assembles candidate models in priority order, placing the primary model first
 * and appending distinct fallback models.
 */
export function getCandidateModels(
  primaryModel: string,
  fallbackModels: readonly string[] = GEMINI_FALLBACK_MODELS,
): string[] {
  const models = [primaryModel];
  for (const m of fallbackModels) {
    if (!models.includes(m)) {
      models.push(m);
    }
  }
  return models;
}

/**
 * Checks whether an error is non-recoverable (e.g. invalid API key, client abort)
 * where falling back to another model will not help.
 */
export function isNonRecoverableGeminiError(err: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted) return true;
  if (err instanceof Error && (err.name === "AbortError" || err.message.includes("aborted"))) {
    return true;
  }
  if (err instanceof ApiError) {
    const msg = err.message ?? "";
    if (err.status === 401 || /API[_ ]KEY[_ ]INVALID|API key not valid/i.test(msg)) {
      return true;
    }
  }
  return false;
}

/** Maps SDK / network errors to application errors with user-friendly messages. */
export function mapGeminiError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  if (err instanceof ApiError) {
    const detail = `Gemini API error ${err.status}: ${err.message}`;
    const message = err.message ?? "";
    if (err.status === 401 || err.status === 403 || /API[_ ]KEY[_ ]INVALID|API key not valid/i.test(message)) {
      return new AppError("GEMINI_AUTH_FAILED", { detail, cause: err });
    }
    if (err.status === 429) return new AppError("GEMINI_RATE_LIMITED", { detail, cause: err });
    if (err.status === 404) {
      return new AppError("GEMINI_UNAVAILABLE", {
        message: "The configured Gemini model is not available. Check GEMINI_MODEL or remove it to use the default.",
        detail,
        cause: err,
      });
    }
    return new AppError("GEMINI_UNAVAILABLE", { detail, cause: err });
  }

  if (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError")) {
    return new AppError("GEMINI_UNAVAILABLE", { detail: "Gemini request timed out", cause: err });
  }

  // fetch() network failures surface as TypeError("fetch failed").
  return new AppError("NETWORK_ERROR", {
    detail: `Gemini request failed: ${err instanceof Error ? err.message : String(err)}`,
    cause: err,
  });
}

/** Real Gemini client using the official Google GenAI SDK with automatic fallback to lower engines. */
export function createGeminiClient(apiKey: string, model: string): GeminiClient {
  const ai = new GoogleGenAI({ apiKey });

  return {
    async generateJson({ userText, systemInstruction, jsonSchema, signal }) {
      const candidateModels = getCandidateModels(model);
      let lastError: unknown;

      for (let i = 0; i < candidateModels.length; i++) {
        if (signal?.aborted) {
          throw mapGeminiError(new DOMException("The operation was aborted", "AbortError"));
        }

        const currentModel = candidateModels[i]!;
        const attemptTimeout = AbortSignal.timeout(8000);
        const attemptSignal = signal ? AbortSignal.any([signal, attemptTimeout]) : attemptTimeout;

        try {
          const response = await ai.models.generateContent({
            model: currentModel,
            contents: userText,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseJsonSchema: jsonSchema,
              temperature: 0.2,
              abortSignal: attemptSignal,
            },
          });
          return response.text ?? "";
        } catch (err) {
          lastError = err;

          if (isNonRecoverableGeminiError(err, signal)) {
            throw mapGeminiError(err);
          }

          if (i < candidateModels.length - 1) {
            const nextModel = candidateModels[i + 1]!;
            const reason = err instanceof Error ? err.message : String(err);
            logger.warn(
              `Gemini model "${currentModel}" failed (${reason}). Falling back to lower engine "${nextModel}".`,
            );
            continue;
          }
        }
      }

      throw mapGeminiError(lastError);
    },
  };
}

