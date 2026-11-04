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

export interface DiscoveryContext {
  discoveryMode: DiscoveryMode;
  preferences: UserPreferences;
  historySignals?: HistorySignal[];
  rawPrompt: string;
}

