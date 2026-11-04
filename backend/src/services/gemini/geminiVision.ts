import { GoogleGenAI } from "@google/genai";
import {
  getCandidateModels,
  isNonRecoverableGeminiError,
  mapGeminiError,
} from "./geminiClient.js";
import { logger } from "../../utils/logger.js";
import type { CameraAnalysisResponse, VisionConfidence, VisionImageQuality } from "../../types/camera.js";

export const VISION_SYSTEM_INSTRUCTION = `You are the vision analysis component of SONORA, an AI music discovery application.

Your task:
Analyze a single camera frame to interpret the VISIBLE FACIAL EXPRESSION of the person in the frame and suggest an appropriate music direction.

Strict Guidelines:
1. Visible Expression vs Internal Emotion:
   - Identify observable facial expressions (e.g. "happy-looking", "calm-looking", "neutral-looking", "surprised-looking", "sad-looking").
   - Do NOT claim to diagnose actual internal emotional or psychological states. Only report visible features.
2. Confidence Evaluation:
   - "HIGH": Face is visually clear, lighting is good, multiple distinct features support the interpretation.
   - "MEDIUM": Face is visible but expression is partially ambiguous, subtle, or multiple interpretations are plausible.
   - "LOW": Face is blurry, poorly lit, obstructed, no face detected, or multiple faces are visible.
3. Music Direction Mapping:
   - If HIGH: Provide a concise, descriptive music direction (e.g. "upbeat and cheerful music", "peaceful and ambient music", "energetic and exciting music").
   - If MEDIUM: Provide a tentative music direction (e.g. "relaxed and balanced music").
   - If LOW: Set music_direction to null.
4. Output valid JSON matching the exact schema provided. Do not add conversational text or markdown code fences.`;

export const VISION_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    expression: { type: "string", description: "Observed facial expression, e.g. happy-looking, calm-looking, neutral-looking, uncertain" },
    confidence: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
    image_quality: { type: "string", enum: ["GOOD", "FAIR", "POOR"] },
    visual_observations: {
      type: "array",
      items: { type: "string" },
      description: "List of observable facial features (e.g. visible smile, relaxed brow, furrowed brow)"
    },
    music_direction: { type: ["string", "null"], description: "Suggested music direction, or null if confidence is LOW" }
  },
  required: ["expression", "confidence", "image_quality", "visual_observations", "music_direction"],
  additionalProperties: false
} as const;

export interface GeminiVisionService {
  analyzeExpression(base64Image: string, mimeType?: string, signal?: AbortSignal): Promise<CameraAnalysisResponse>;
}

/** Extracts raw base64 string from data URL if needed */
export function cleanBase64(input: string): string {
  const match = input.match(/^data:image\/\w+;base64,(.+)$/);
  return match ? match[1]! : input;
}

export const GEMINI_VISION_FALLBACK_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.8-flash",
] as const;

export function createGeminiVisionService(apiKey: string, model: string): GeminiVisionService {
  const ai = new GoogleGenAI({ apiKey });

  return {
    async analyzeExpression(imageInput: string, mimeType = "image/jpeg", signal?: AbortSignal): Promise<CameraAnalysisResponse> {
      const data = cleanBase64(imageInput);
      const candidateModels = getCandidateModels(model, GEMINI_VISION_FALLBACK_MODELS);
      const timeout = AbortSignal.timeout(20_000);
      const abortSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;

      let lastError: unknown;

      for (let i = 0; i < candidateModels.length; i++) {
        const currentModel = candidateModels[i]!;
        try {
          const response = await ai.models.generateContent({
            model: currentModel,
            contents: [
              {
                inlineData: {
                  data,
                  mimeType,
                },
              },
              "Analyze the visible facial expression in this camera frame according to the system instructions.",
            ],
            config: {
              systemInstruction: VISION_SYSTEM_INSTRUCTION,
              responseMimeType: "application/json",
              responseJsonSchema: VISION_ANALYSIS_SCHEMA,
              temperature: 0.2,
              abortSignal,
            },
          });

          const rawText = response.text || "";
          const parsed = JSON.parse(rawText.replace(/^```json\s*|\s*```$/gi, "").trim()) as CameraAnalysisResponse;

          // Normalise fields defensively
          const confidence: VisionConfidence = ["HIGH", "MEDIUM", "LOW"].includes(parsed.confidence)
            ? parsed.confidence
            : "LOW";
          const quality: VisionImageQuality = ["GOOD", "FAIR", "POOR"].includes(parsed.image_quality)
            ? parsed.image_quality
            : "FAIR";

          return {
            expression: parsed.expression || "uncertain",
            confidence,
            image_quality: quality,
            visual_observations: Array.isArray(parsed.visual_observations) ? parsed.visual_observations : [],
            music_direction: confidence === "LOW" ? null : parsed.music_direction,
          };
        } catch (err) {
          lastError = err;

          if (isNonRecoverableGeminiError(err, signal)) {
            throw mapGeminiError(err);
          }

          if (i < candidateModels.length - 1) {
            const nextModel = candidateModels[i + 1]!;
            const reason = err instanceof Error ? err.message : String(err);
            logger.warn(
              `Gemini vision model "${currentModel}" failed (${reason}). Falling back to lower engine "${nextModel}".`,
            );
            continue;
          }
        }
      }

      throw mapGeminiError(lastError);
    },
  };
}
