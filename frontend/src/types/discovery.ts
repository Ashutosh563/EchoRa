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

export interface StoredProfile {
  version: 1;
  discoveryMode: DiscoveryMode;
  preferences: UserPreferences;
  interactionHistory: InteractionRecord[];
  updatedAt: string | null;
}

