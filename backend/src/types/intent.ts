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

/** Priority levels for extracted preferences */
export const PRIORITY_LEVELS = ["high", "medium_high", "medium", "low", "none"] as const;
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

export interface CategorizedPreference<T> {
  value: T;
  source: "explicit" | "inferred" | "optional" | "unspecified";
  priority: PriorityLevel;
}

/**
 * Enhanced intent representation distinguishing explicit, inferred, and optional preferences
 * while maintaining backward compatibility with the frontend MusicIntent contract.
 */
export interface MusicIntent {
  /** Primary mood, e.g. "calm", "peaceful", or "any" if not stated */
  mood: string;
  /** Activity/context, e.g. "studying", null when not mentioned */
  activity: string | null;
  energy: Energy;
  tempo: Tempo;
  /** 0-3 lowercase genre keywords */
  genre: string[];
  vocals: VocalPreference;
  time_context: TimeContext;

  /** Detailed classification & prioritization breakdown (internal & intelligence engine) */
  breakdown?: {
    mood: CategorizedPreference<string | null>;
    activity: CategorizedPreference<string | null>;
    energy: CategorizedPreference<Energy | null>;
    tempo: CategorizedPreference<Tempo | null>;
    genre: CategorizedPreference<string[]>;
    vocals: CategorizedPreference<VocalPreference | null>;
    time_context: CategorizedPreference<TimeContext | null>;
  };
}
