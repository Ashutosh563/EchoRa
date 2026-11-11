export type DiscoveryMode = "FAMILIAR" | "BALANCED" | "EXPLORE";

export interface UserPreferences {
  favoriteGenres: string[];
  favoriteArtists: string[];
  dislikedGenres: string[];
  dislikedArtists: string[];
}

export interface HistorySignal {
  term: string;
  frequency: number;
}

export type BrowserDayPeriod = "morning" | "afternoon" | "evening" | "late_night";

export interface BrowserContext {
  localTime?: string;
  hour?: number;
  dayOfWeek?: string;
  dayPeriod?: BrowserDayPeriod;
  languages?: string[];
  timeZone?: string;
  online?: boolean;
}

export interface ContextualListeningSignals {
  dayPeriod?: BrowserDayPeriod;
  preferredLanguage?: string;
}

export interface DiscoveryContext {
  discoveryMode: DiscoveryMode;
  preferences: UserPreferences;
  historySignals?: HistorySignal[];
  rawPrompt: string;
  browserContext?: BrowserContext;
}

