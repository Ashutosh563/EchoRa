import { ApiError, GoogleGenAI } from "@google/genai";
import { AppError } from "../../utils/AppError.js";

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

const REQUEST_TIMEOUT_MS = 20_000;

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

/** Real Gemini client using the official Google GenAI SDK. */
export function createGeminiClient(apiKey: string, model: string): GeminiClient {
  const ai = new GoogleGenAI({ apiKey });

  return {
    async generateJson({ userText, systemInstruction, jsonSchema, signal }) {
      const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
      const abortSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
      try {
        const response = await ai.models.generateContent({
          model,
          contents: userText,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseJsonSchema: jsonSchema,
            temperature: 0.2,
            abortSignal,
          },
        });
        return response.text ?? "";
      } catch (err) {
        throw mapGeminiError(err);
      }
    },
  };
}

