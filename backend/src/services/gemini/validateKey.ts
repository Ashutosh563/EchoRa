import { ApiError, GoogleGenAI } from "@google/genai";
import type { CredentialCheck } from "../../types/credentials.js";

/**
 * Validates a Gemini API key (and model) with a metadata lookup - no content
 * is generated and no user or Spotify data is sent.
 */
export async function validateGeminiKey(apiKey: string, model: string): Promise<CredentialCheck> {
  try {
    const ai = new GoogleGenAI({ apiKey });
    await ai.models.get({ model, config: { abortSignal: AbortSignal.timeout(10_000) } });
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 400 || err.status === 401 || err.status === 403) {
        return { ok: false, reason: "invalid", message: "The Gemini API key was rejected." };
      }
      if (err.status === 404) {
        return { ok: false, reason: "invalid", message: `The Gemini model "${model}" was not found for this key.` };
      }
      return { ok: false, reason: "unreachable", message: `Gemini returned HTTP ${err.status}.` };
    }
    return { ok: false, reason: "unreachable", message: "Could not reach the Gemini API (network problem)." };
  }
}
