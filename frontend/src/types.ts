export type Energy = 'low' | 'medium' | 'high';
export type Tempo = 'slow' | 'medium' | 'fast' | 'any';
export type VocalPreference = 'instrumental_preferred' | 'vocals_preferred' | 'any';
export type TimeContext = 'morning' | 'afternoon' | 'evening' | 'late_night' | 'any';
export type PriorityLevel = 'high' | 'medium_high' | 'medium' | 'low' | 'none';

export interface CategorizedPreference<T> {
  value: T;
  source: 'explicit' | 'inferred' | 'optional' | 'unspecified';
  priority: PriorityLevel;
}

export interface MusicIntent {
  mood: string;
  activity: string | null;
  energy: Energy;
  tempo: Tempo;
  genre: string[];
  vocals: VocalPreference;
  time_context: TimeContext;
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

export interface Track {
  id: string;
  name: string;
  artists: string[];
  album: string;
  albumArtUrl: string | null;
  durationMs: number | null;
  spotifyUrl: string;
  previewUrl: string | null;
}

export interface SearchResponse {
  mode: 'live' | 'mock';
  intent: MusicIntent;
  queries: {
    primary: string;
    alternatives?: string[];
  };
  tracks: Track[];
  notice?: string;
}

export interface StatusResponse {
  mode: 'live' | 'mock';
  interpretMode: 'live' | 'mock';
  gemini: {
    configured: boolean;
    valid: boolean | null;
  };
  spotify: {
    configured: boolean;
    valid: boolean | null;
    authorized: boolean;
  };
  missing: string[];
}

export interface ApiError {
  code: string;
  message: string;
}

export interface ToastInfo {
  id: string;
  type?: 'info' | 'success' | 'error';
  message: string;
}

