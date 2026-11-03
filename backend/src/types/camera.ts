export type VisionConfidence = "HIGH" | "MEDIUM" | "LOW";
export type VisionImageQuality = "GOOD" | "FAIR" | "POOR";

export interface CameraAnalysisRequest {
  /** Base64-encoded image data or data URL (e.g., data:image/jpeg;base64,...) */
  image: string;
  mimeType?: string;
}

export interface CameraAnalysisResponse {
  expression: string;
  confidence: VisionConfidence;
  image_quality: VisionImageQuality;
  visual_observations: string[];
  music_direction: string | null;
}
