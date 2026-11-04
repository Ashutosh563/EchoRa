import type { Track } from "./track.js";

export interface MoodStage {
  stage: number;
  mood: string;
  description: string;
  musicalCharacteristics: string[];
  energy?: number;
  valence?: number;
}

export interface TransitionPlanRequest {
  startingMood: string;
  destinationMood: string;
}

export interface TransitionPlanResponse {
  stages: MoodStage[];
}

export interface StageSearchIntent {
  stage: number;
  query: string;
}

export interface GenerateTransitionMusicRequest {
  startingMood: string;
  destinationMood: string;
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

