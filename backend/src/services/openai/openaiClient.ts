import { AppError } from "../../utils/AppError.js";
import type { GeminiClient, GenerateJsonRequest } from "../gemini/geminiClient.js";
import { logger } from "../../utils/logger.js";

const FALLBACK_MODELS = ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"] as const;

/** OpenAI-compatible intent client; keeps the same interface and output contract as Gemini. */
export function createOpenAIClient(apiKey: string, preferredModel: string): GeminiClient {
  return {
    async generateJson({ userText, systemInstruction, jsonSchema, signal }: GenerateJsonRequest) {
      const models = [...new Set([preferredModel, ...FALLBACK_MODELS])];
      let lastError: unknown;

      for (const model of models) {
        try {
          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model,
              temperature: 0.2,
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: `${systemInstruction}\nReturn only a JSON object matching this schema: ${JSON.stringify(jsonSchema)}` },
                { role: "user", content: userText },
              ],
            }),
            signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000),
          });
          if (!response.ok) {
            const body = await response.json().catch(() => ({})) as { error?: { message?: string; code?: string } };
            const code = response.status === 401 || response.status === 403 ? "GEMINI_AUTH_FAILED" : "GEMINI_UNAVAILABLE";
            throw new AppError(code, { message: response.status === 401 || response.status === 403 ? "The OpenAI API key was rejected." : `OpenAI API returned HTTP ${response.status}.`, detail: body.error?.message });
          }
          const body = await response.json() as { choices?: Array<{ message?: { content?: string | null } }> };
          const content = body.choices?.[0]?.message?.content;
          if (!content) throw new AppError("GEMINI_INVALID_RESPONSE", { detail: "OpenAI returned an empty response" });
          return content;
        } catch (error) {
          lastError = error;
          if (error instanceof AppError && error.code === "GEMINI_AUTH_FAILED") throw error;
          logger.warn(`OpenAI model ${model} failed; trying the next configured lightweight model.`);
        }
      }
      throw lastError instanceof AppError ? lastError : new AppError("GEMINI_UNAVAILABLE", { cause: lastError });
    },
  };
}
