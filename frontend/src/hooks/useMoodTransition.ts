import { useState, useCallback, useEffect, useRef } from "react";
import type { MoodStage, TransitionJourneyResponse } from "../types/transition";
import { planTransition, generateTransitionMusic, interpretTransition } from "../api/transitionApi";

export type TransitionStatus =
  | "select"
  | "planning"
  | "interpreting"
  | "review"
  | "generating"
  | "playlist"
  | "error";

export function useMoodTransition() {
  const [status, setStatus] = useState<TransitionStatus>("select");
  const [startingMood, setStartingMood] = useState<string>("");
  const [destinationMood, setDestinationMood] = useState<string>("");
  const [stages, setStages] = useState<MoodStage[]>([]);
  const [journey, setJourney] = useState<TransitionJourneyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [interpretation, setInterpretation] = useState("");
  const [needsClarification, setNeedsClarification] = useState(false);
  const interpretationAbortRef = useRef<AbortController | null>(null);

  useEffect(() => () => interpretationAbortRef.current?.abort(), []);

  const interpretPrompt = useCallback(async (prompt: string) => {
    interpretationAbortRef.current?.abort();
    const controller = new AbortController();
    interpretationAbortRef.current = controller;
    setStatus("interpreting");
    setError(null);
    setInterpretation("");
    setNeedsClarification(false);
    try {
      const response = await interpretTransition(prompt, controller.signal);
      setStartingMood(response.startingMood ?? "");
      setDestinationMood(response.destinationMood ?? "");
      setInterpretation(response.interpretation);
      setNeedsClarification(response.status === "clarification_needed");
      setStatus("select");
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : "Could not interpret that mood transition.";
      setError(msg);
      setStatus("select");
    } finally {
      if (interpretationAbortRef.current === controller) interpretationAbortRef.current = null;
    }
  }, []);

  const clearInterpretation = useCallback(() => {
    setStartingMood("");
    setDestinationMood("");
    setInterpretation("");
    setNeedsClarification(false);
    setError(null);
  }, []);

  const selectStartingMood = useCallback((mood: string) => {
    setStartingMood(mood);
    setError(null);
    setNeedsClarification(false);
  }, []);

  const selectDestinationMood = useCallback((mood: string) => {
    setDestinationMood(mood);
    setError(null);
    setNeedsClarification(false);
  }, []);

  const generatePlan = useCallback(async () => {
    const cleanStart = startingMood.trim();
    const cleanDest = destinationMood.trim();

    if (!cleanStart || !cleanDest) {
      setError("Please select both a starting mood and a destination mood.");
      return;
    }

    if (cleanStart.toLowerCase() === cleanDest.toLowerCase()) {
      setError("Starting and destination moods must be different to create an emotional journey.");
      return;
    }

    setStatus("planning");
    setError(null);

    try {
      const response = await planTransition(cleanStart, cleanDest);
      setStages(response.stages);
      setStatus("review");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate transition plan.";
      setError(msg);
      setStatus("error");
    }
  }, [startingMood, destinationMood]);

  const updateIntermediateMood = useCallback(
    (stageNumber: 2 | 3, newMood: string) => {
      const trimmed = newMood.trim();
      if (!trimmed) return;

      setStages((prev) =>
        prev.map((s) => {
          if (s.stage === stageNumber) {
            return {
              ...s,
              mood: trimmed.charAt(0).toUpperCase() + trimmed.slice(1),
              description: `A customized transition through ${trimmed.toLowerCase()} reflections`,
            };
          }
          return s;
        }),
      );
    },
    [],
  );

  const regenerateIntermediateMoods = useCallback(async () => {
    setStatus("planning");
    setError(null);

    try {
      const response = await planTransition(startingMood, destinationMood);
      setStages(response.stages);
      setStatus("review");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to regenerate intermediate moods.";
      setError(msg);
      setStatus("review");
    }
  }, [startingMood, destinationMood]);

  const approveAndGenerateMusic = useCallback(async () => {
    if (stages.length !== 4) {
      setError("Exactly four stages are required to generate your musical journey.");
      return;
    }

    setStatus("generating");
    setError(null);

    try {
      const response = await generateTransitionMusic(startingMood, destinationMood, stages);
      setJourney(response);
      setStatus("playlist");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate music for journey.";
      setError(msg);
      setStatus("error");
    }
  }, [startingMood, destinationMood, stages]);

  const reset = useCallback(() => {
    setStatus("select");
    setStartingMood("");
    setDestinationMood("");
    setStages([]);
    setJourney(null);
    setError(null);
    setInterpretation("");
    setNeedsClarification(false);
  }, []);

  return {
    status,
    startingMood,
    destinationMood,
    stages,
    journey,
    error,
    interpretation,
    needsClarification,
    interpretPrompt,
    clearInterpretation,
    selectStartingMood,
    selectDestinationMood,
    generatePlan,
    updateIntermediateMood,
    regenerateIntermediateMoods,
    approveAndGenerateMusic,
    reset,
  };
}

