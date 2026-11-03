export type VisionConfidence = "HIGH" | "MEDIUM" | "LOW";
export type VisionImageQuality = "GOOD" | "FAIR" | "POOR";

export interface CameraAnalysisResponse {
  expression: string;
  confidence: VisionConfidence;
  image_quality: VisionImageQuality;
  visual_observations: string[];
  music_direction: string | null;
}

export type CameraModalState =
  | "idle"
  | "requesting_permission"
  | "camera_active"
  | "capturing"
  | "analyzing"
  | "medium_selection"
  | "low_confidence"
  | "error";

export const MEDIUM_CONFIDENCE_MOOD_OPTIONS = [
  { label: "Happy / Cheerful", direction: "upbeat happy and cheerful music" },
  { label: "Sad / Comforting", direction: "gentle and comforting melancholic acoustic music" },
  { label: "Calm / Peaceful", direction: "peaceful and calm ambient music" },
  { label: "Energetic / Exciting", direction: "energetic and exciting dance workout music" },
  { label: "Neutral / Balanced", direction: "relaxed and balanced chill music" },
] as const;
