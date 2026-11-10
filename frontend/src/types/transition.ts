import type { Track } from "./api";

export interface MoodStage {
  stage: number;
  mood: string;
  description: string;
  musicalCharacteristics: string[];
  energy?: number;
  valence?: number;
}

export interface TransitionIntentResponse {
  status: "ready" | "clarification_needed";
  startingMood: string | null;
  destinationMood: string | null;
  interpretation: string;
}

export interface TransitionPlanResponse {
  stages: MoodStage[];
}

export interface StagePlaylist {
  stage: number;
  mood: string;
  description: string;
  musicalCharacteristics: string[];
  energy?: number;
  valence?: number;
  tracks: Track[];
}

export interface TransitionJourneyResponse {
  startingMood: string;
  destinationMood: string;
  stages: StagePlaylist[];
  totalTracks: number;
}

