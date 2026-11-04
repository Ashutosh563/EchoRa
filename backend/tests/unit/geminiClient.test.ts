import { describe, it, expect } from "vitest";
import { ApiError } from "@google/genai";
import {
  getCandidateModels,
  isNonRecoverableGeminiError,
  mapGeminiError,
} from "../../src/services/gemini/geminiClient.js";

describe("geminiClient - Fallback Cascade", () => {
  describe("getCandidateModels", () => {
    it("places primary model first and appends fallbacks without duplicates", () => {
      const candidates = getCandidateModels("gemini-3-flash-preview");
      expect(candidates[0]).toBe("gemini-3-flash-preview");
      expect(candidates).toContain("gemini-3.5-flash-lite");
      expect(candidates).toContain("gemini-3.1-flash-lite");
      expect(candidates).toContain("gemini-3.8-flash");

      // No duplicates
      const unique = new Set(candidates);
      expect(unique.size).toBe(candidates.length);
    });

    it("deduplicates if primary model is already in fallback list", () => {
      const candidates = getCandidateModels("gemini-3.5-flash-lite");
      expect(candidates[0]).toBe("gemini-3.5-flash-lite");
      const occurrences = candidates.filter((m) => m === "gemini-3.5-flash-lite");
      expect(occurrences.length).toBe(1);
    });
  });

  describe("isNonRecoverableGeminiError", () => {
    it("treats 429 quota exhaustion / rate limit as recoverable (returns false to allow fallback)", () => {
      const quotaErr = new ApiError({ status: 429, message: "Resource has been exhausted (e.g. check quota)" });
      expect(isNonRecoverableGeminiError(quotaErr)).toBe(false);
    });

    it("treats 503 model overloaded as recoverable (returns false to allow fallback)", () => {
      const overloadedErr = new ApiError({ status: 503, message: "The model is overloaded. Please try again later." });
      expect(isNonRecoverableGeminiError(overloadedErr)).toBe(false);
    });

    it("treats 404 model not found as recoverable (returns false to allow fallback)", () => {
      const notFoundErr = new ApiError({ status: 404, message: "models/gemini-3-flash-preview is not found" });
      expect(isNonRecoverableGeminiError(notFoundErr)).toBe(false);
    });

    it("treats 401 invalid API key as non-recoverable (returns true)", () => {
      const authErr = new ApiError({ status: 401, message: "API_KEY_INVALID: API key not valid" });
      expect(isNonRecoverableGeminiError(authErr)).toBe(true);
    });

    it("treats aborted signal as non-recoverable (returns true)", () => {
      const controller = new AbortController();
      controller.abort();
      expect(isNonRecoverableGeminiError(new Error("aborted"), controller.signal)).toBe(true);
    });
  });

  describe("mapGeminiError", () => {
    it("maps 429 to GEMINI_RATE_LIMITED", () => {
      const err = new ApiError({ status: 429, message: "rate limited" });
      const mapped = mapGeminiError(err);
      expect(mapped.code).toBe("GEMINI_RATE_LIMITED");
    });

    it("maps 401 to GEMINI_AUTH_FAILED", () => {
      const err = new ApiError({ status: 401, message: "unauthorized" });
      const mapped = mapGeminiError(err);
      expect(mapped.code).toBe("GEMINI_AUTH_FAILED");
    });
  });
});
