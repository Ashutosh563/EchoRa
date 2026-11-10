import { describe, expect, it, vi } from "vitest";
import { AppError } from "../../src/utils/AppError.js";
import { createTransitionIntentExtractor, parseTransitionIntent } from "../../src/services/transition/transitionIntentExtractor.js";
import type { GeminiClient } from "../../src/services/gemini/geminiClient.js";

describe("transition intent extraction", () => {
  it("returns two distinct moods and a concise interpretation", () => {
    expect(parseTransitionIntent(JSON.stringify({
      status: "ready",
      startingMood: "  overwhelmed   and tense ",
      destinationMood: "calm and focused",
      interpretation: "A shift from tension toward clear calm.",
    }))).toEqual({
      status: "ready",
      startingMood: "overwhelmed and tense",
      destinationMood: "calm and focused",
      interpretation: "A shift from tension toward clear calm.",
    });
  });

  it("forces clarification when an endpoint is missing or both endpoints match", () => {
    expect(parseTransitionIntent(JSON.stringify({ status: "ready", startingMood: null, destinationMood: "Calm", interpretation: "What are you feeling now?" })).status).toBe("clarification_needed");
    expect(parseTransitionIntent(JSON.stringify({ status: "ready", startingMood: "Calm", destinationMood: "calm", interpretation: "" }))).toMatchObject({ status: "clarification_needed", destinationMood: null });
  });

  it("uses the configured fallback when the primary provider fails", async () => {
    const primary: GeminiClient = { generateJson: vi.fn().mockRejectedValue(new Error("provider down")) };
    const fallback: GeminiClient = { generateJson: vi.fn().mockResolvedValue(JSON.stringify({ status: "ready", startingMood: "Anxious", destinationMood: "Grounded", interpretation: "Toward steadiness." })) };
    const result = await createTransitionIntentExtractor(primary, fallback).interpret("I feel anxious and want to be grounded");
    expect(result.startingMood).toBe("Anxious");
    expect(fallback.generateJson).toHaveBeenCalledOnce();
  });

  it("rejects missing AI configuration and overlong prompts", async () => {
    await expect(createTransitionIntentExtractor(null).interpret("I feel sad and want to feel hopeful")).rejects.toBeInstanceOf(AppError);
    const client: GeminiClient = { generateJson: vi.fn() };
    await expect(createTransitionIntentExtractor(client).interpret("x".repeat(501))).rejects.toThrow(/1–500 characters/i);
    expect(client.generateJson).not.toHaveBeenCalled();
  });
});
