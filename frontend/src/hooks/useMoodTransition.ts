import { useState, useCallback } from "react";
import type { MoodStage, TransitionJourneyResponse } from "../types/transition";
import { planTransition, generateTransitionMusic } from "../api/transitionApi";

export type TransitionStatus =
  | "select"
  | "planning"
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

  const selectStartingMood = useCallback((mood: string) => {
    setStartingMood(mood);
    setError(null);
  }, []);

  const selectDestinationMood = useCallback((mood: string) => {
    setDestinationMood(mood);
    setError(null);
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
  }, []);

  return {
    status,
    startingMood,
    destinationMood,
    stages,
    journey,
    error,
    selectStartingMood,
    selectDestinationMood,
    generatePlan,
    updateIntermediateMood,
    regenerateIntermediateMoods,
    approveAndGenerateMusic,
    reset,
  };
}

