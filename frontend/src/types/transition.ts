import type { Track } from "./api";

export interface MoodStage {
  stage: number;
  mood: string;
  description: string;
  musicalCharacteristics: string[];
  energy?: number;
  valence?: number;
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

