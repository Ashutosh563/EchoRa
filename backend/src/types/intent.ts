/**
 * Structured intent extracted from the user's natural-language request.
 * Produced by the Gemini service from the user's prompt ONLY.
 */
export const ENERGY_LEVELS = ["low", "medium", "high"] as const;
export const TEMPO_PREFERENCES = ["slow", "medium", "fast", "any"] as const;
export const VOCAL_PREFERENCES = ["instrumental_preferred", "vocals_preferred", "any"] as const;
export const TIME_CONTEXTS = ["morning", "afternoon", "evening", "late_night", "any"] as const;

export type Energy = (typeof ENERGY_LEVELS)[number];
export type Tempo = (typeof TEMPO_PREFERENCES)[number];
export type VocalPreference = (typeof VOCAL_PREFERENCES)[number];
export type TimeContext = (typeof TIME_CONTEXTS)[number];

export interface MusicIntent {
  /** Primary mood, e.g. "calm". "any" when the request gives no mood cue. */
  mood: string;
  /** Activity/context, e.g. "studying". null when not mentioned. */
  activity: string | null;
  energy: Energy;
  tempo: Tempo;
  /** 0-3 lowercase genre keywords, e.g. ["ambient", "lofi"]. */
  genre: string[];
  vocals: VocalPreference;
  time_context: TimeContext;
}

