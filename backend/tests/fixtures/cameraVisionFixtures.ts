import type { CameraAnalysisResponse } from "../../src/types/camera.js";

export const MOCK_VISION_HIGH_CONFIDENCE: CameraAnalysisResponse = {
  expression: "happy-looking",
  confidence: "HIGH",
  image_quality: "GOOD",
  visual_observations: ["visible broad smile", "raised cheeks", "crinkled eyes"],
  music_direction: "upbeat and cheerful acoustic pop music",
};

export const MOCK_VISION_MEDIUM_CONFIDENCE: CameraAnalysisResponse = {
  expression: "partially smiling / neutral",
  confidence: "MEDIUM",
  image_quality: "FAIR",
  visual_observations: ["slight upturn at mouth corners", "relaxed forehead"],
  music_direction: "relaxed and balanced music",
};

export const MOCK_VISION_LOW_CONFIDENCE: CameraAnalysisResponse = {
  expression: "uncertain",
  confidence: "LOW",
  image_quality: "POOR",
  visual_observations: ["underexposed frame", "facial features not clearly distinguishable"],
  music_direction: null,
};
