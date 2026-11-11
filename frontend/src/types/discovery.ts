export type DiscoveryMode = "FAMILIAR" | "BALANCED" | "EXPLORE";

export interface UserPreferences {
  favoriteGenres: string[];
  favoriteArtists: string[];
  dislikedGenres: string[];
  dislikedArtists: string[];
}

export interface InteractionRecord {
  id: string;
  timestamp: number;
  prompt: string;
  discoveryMode: DiscoveryMode;
  mood?: string;
  genre?: string[];
}

export interface HistorySignal {
  term: string;
  frequency: number;
}

export type BrowserDayPeriod = 'morning' | 'afternoon' | 'evening' | 'late_night';

/** Minimal, permission-free browser context sent with a search request. */
export interface BrowserContext {
  localTime?: string;
  hour?: number;
  dayOfWeek?: string;
  dayPeriod?: BrowserDayPeriod;
  languages?: string[];
  timeZone?: string;
  online?: boolean;
}

export interface StoredProfile {
  version: 1;
  discoveryMode: DiscoveryMode;
  preferences: UserPreferences;
  interactionHistory: InteractionRecord[];
  updatedAt: string | null;
}

