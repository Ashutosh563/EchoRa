import { AppError } from "../../utils/AppError.js";
import type { GeminiClient, GenerateJsonRequest } from "../gemini/geminiClient.js";
import { logger } from "../../utils/logger.js";

const OPENROUTER_CHAT_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 20_000;

/** OpenRouter's OpenAI-compatible API, adapted to ECHORA's structured JSON client. */
export function createOpenRouterClient(apiKey: string, model: string): GeminiClient {
  return {
    async generateJson({ userText, systemInstruction, jsonSchema, signal }: GenerateJsonRequest) {
      const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
      const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
      let response: Response;
      try {
        response = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://127.0.0.1:5173",
            "X-Title": "ECHORA",
          },
          body: JSON.stringify({
            model,
            temperature: 0.2,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: `${systemInstruction}\nReturn only a JSON object matching this schema: ${JSON.stringify(jsonSchema)}` },
              { role: "user", content: userText },
            ],
          }),
          signal: requestSignal,
        });
      } catch (error) {
        if (signal?.aborted) throw error;
        throw new AppError("GEMINI_UNAVAILABLE", { detail: "OpenRouter request failed or timed out", cause: error });
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: { message?: string } };
        if (response.status === 401 || response.status === 403) {
          throw new AppError("GEMINI_AUTH_FAILED", { message: "The OpenRouter API key was rejected." });
        }
        if (response.status === 429) {
          throw new AppError("GEMINI_RATE_LIMITED", { detail: `OpenRouter returned HTTP ${response.status}: ${body.error?.message ?? "rate limited"}` });
        }
        throw new AppError("GEMINI_UNAVAILABLE", { detail: `OpenRouter returned HTTP ${response.status}: ${body.error?.message ?? "request failed"}` });
      }

      const body = await response.json() as { choices?: Array<{ message?: { content?: string | null } }> };
      const content = body.choices?.[0]?.message?.content;
      if (!content) throw new AppError("GEMINI_INVALID_RESPONSE", { detail: "OpenRouter returned an empty response" });
      return content;
    },
  };
}

export interface FallbackClientHooks {
  onGeminiSuccess?: () => void;
  onGeminiAuthFailure?: () => void;
  onOpenRouterSuccess?: () => void;
  onOpenRouterAuthFailure?: () => void;
}

/** Uses OpenRouter after Gemini fails; an explicit caller cancellation is never retried. */
export function createGeminiFallbackClient(
  gemini: GeminiClient | null,
  openRouter: GeminiClient | null,
  hooks: FallbackClientHooks = {},
): GeminiClient | null {
  if (!gemini && !openRouter) return null;

  return {
    async generateJson(request) {
      let geminiError: unknown;
      if (gemini) {
        try {
          const result = await gemini.generateJson(request);
          hooks.onGeminiSuccess?.();
          return result;
        } catch (error) {
          if (request.signal?.aborted) throw error;
          geminiError = error;
          if (error instanceof AppError && error.code === "GEMINI_AUTH_FAILED") hooks.onGeminiAuthFailure?.();
          if (!openRouter) throw error;
          logger.warn("Gemini request failed; retrying this structured request through OpenRouter.");
        }
      }

      if (!openRouter) throw geminiError;
      try {
        const result = await openRouter.generateJson(request);
        hooks.onOpenRouterSuccess?.();
        return result;
      } catch (error) {
        if (error instanceof AppError && error.code === "GEMINI_AUTH_FAILED") hooks.onOpenRouterAuthFailure?.();
        throw error;
      }
    },
  };
}
