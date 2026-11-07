import type {
  DiscoveryMode,
  HistorySignal,
  InteractionRecord,
  StoredProfile,
  UserPreferences,
} from "../types/discovery";

const STORAGE_KEY = "echora_discovery_profile_v1";
const MAX_HISTORY_LENGTH = 100;

export const DEFAULT_PREFERENCES: UserPreferences = {
  favoriteGenres: [],
  favoriteArtists: [],
  dislikedGenres: [],
  dislikedArtists: [],
};

export const DEFAULT_PROFILE: StoredProfile = {
  version: 1,
  discoveryMode: "FAMILIAR",
  preferences: DEFAULT_PREFERENCES,
  interactionHistory: [],
  updatedAt: null,
};

type ProfileChangeListener = (profile: StoredProfile) => void;
const listeners = new Set<ProfileChangeListener>();

function notifyListeners(profile: StoredProfile) {
  listeners.forEach((listener) => {
    try {
      listener(profile);
    } catch {
      // Ignore listener errors
    }
  });
}

/**
 * Validates and normalizes discovery mode.
 * Defaults strictly to FAMILIAR for any invalid or missing value.
 */
export function sanitizeDiscoveryMode(mode: unknown): DiscoveryMode {
  if (mode === "BALANCED" || mode === "EXPLORE") {
    return mode;
  }
  return "FAMILIAR";
}

/**
 * Sanitizes and deduplicates a list of preference strings (case-insensitive).
 */
export function sanitizeStringList(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of list) {
    if (typeof item === "string") {
      const trimmed = item.trim();
      const lower = trimmed.toLowerCase();
      if (trimmed && !seen.has(lower)) {
        seen.add(lower);
        result.push(trimmed);
      }
    }
  }
  return result;
}

/**
 * Validates and normalizes an entire profile, ensuring graceful recovery from corrupted data.
 */
export function normalizeProfile(raw: unknown): StoredProfile {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_PROFILE };
  }

  const obj = raw as Partial<StoredProfile>;
  const discoveryMode = sanitizeDiscoveryMode(obj.discoveryMode);

  const rawPrefs = (obj.preferences && typeof obj.preferences === "object"
    ? obj.preferences
    : {}) as Record<string, unknown>;
  const preferences: UserPreferences = {
    favoriteGenres: sanitizeStringList(rawPrefs.favoriteGenres),
    favoriteArtists: sanitizeStringList(rawPrefs.favoriteArtists),
    dislikedGenres: sanitizeStringList(rawPrefs.dislikedGenres),
    dislikedArtists: sanitizeStringList(rawPrefs.dislikedArtists),
  };

  const rawHistory = Array.isArray(obj.interactionHistory) ? obj.interactionHistory : [];
  const interactionHistory: InteractionRecord[] = rawHistory
    .filter(
      (item): item is InteractionRecord =>
        Boolean(item && typeof item === "object" && typeof item.prompt === "string" && typeof item.timestamp === "number"),
    )
    .slice(-MAX_HISTORY_LENGTH);

  return {
    version: 1,
    discoveryMode,
    preferences,
    interactionHistory,
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : null,
  };
}

/**
 * Retrieves the stored profile, initializing with defaults if missing or corrupted.
 */
export function getStoredProfile(): StoredProfile {
  if (typeof window === "undefined" || !window.localStorage) {
    return { ...DEFAULT_PROFILE };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_PROFILE };
    }
    const parsed = JSON.parse(raw);
    return normalizeProfile(parsed);
  } catch {
    // Malformed JSON fallback
    return { ...DEFAULT_PROFILE };
  }
}

/**
 * Saves profile to localStorage and notifies subscribers.
 */
export function saveProfile(profile: StoredProfile): void {
  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    const normalized = normalizeProfile(profile);
    normalized.updatedAt = new Date().toISOString();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    notifyListeners(normalized);
  } catch {
    // Gracefully ignore storage quota errors
  }
}

/**
 * Updates the discovery mode.
 */
export function setDiscoveryMode(mode: DiscoveryMode): StoredProfile {
  const current = getStoredProfile();
  const updated: StoredProfile = {
    ...current,
    discoveryMode: sanitizeDiscoveryMode(mode),
  };
  saveProfile(updated);
  return updated;
}

/**
 * Adds an item to a preference array (case-insensitive deduplication).
 */
export function addPreference(
  category: keyof UserPreferences,
  item: string,
): StoredProfile {
  const trimmed = item.trim();
  if (!trimmed) return getStoredProfile();

  const current = getStoredProfile();
  const existing = current.preferences[category] || [];
  const lower = trimmed.toLowerCase();

  if (existing.some((x) => x.toLowerCase() === lower)) {
    return current;
  }

  const updated: StoredProfile = {
    ...current,
    preferences: {
      ...current.preferences,
      [category]: [...existing, trimmed],
    },
  };
  saveProfile(updated);
  return updated;
}

/**
 * Removes an item from a preference array.
 */
export function removePreference(
  category: keyof UserPreferences,
  item: string,
): StoredProfile {
  const current = getStoredProfile();
  const existing = current.preferences[category] || [];
  const lower = item.trim().toLowerCase();

  const updated: StoredProfile = {
    ...current,
    preferences: {
      ...current.preferences,
      [category]: existing.filter((x) => x.toLowerCase() !== lower),
    },
  };
  saveProfile(updated);
  return updated;
}

/**
 * Records an interaction into the history, maintaining a 100-item FIFO cap.
 */
export function recordInteraction(interaction: Omit<InteractionRecord, "id" | "timestamp">): StoredProfile {
  const current = getStoredProfile();
  const record: InteractionRecord = {
    ...interaction,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
  };

  const newHistory = [...current.interactionHistory, record].slice(-MAX_HISTORY_LENGTH);
  const updated: StoredProfile = {
    ...current,
    interactionHistory: newHistory,
  };
  saveProfile(updated);
  return updated;
}

/**
 * Derives top repeated signals from interaction history.
 */
export function getHistorySignals(history: InteractionRecord[], limit = 5): HistorySignal[] {
  const counts = new Map<string, number>();

  for (const item of history) {
    if (item.genre && Array.isArray(item.genre)) {
      for (const g of item.genre) {
        const clean = g.trim().toLowerCase();
        if (clean) counts.set(clean, (counts.get(clean) || 0) + 1);
      }
    }
  }

  return Array.from(counts.entries())
    .map(([term, frequency]) => ({ term, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, limit);
}

/**
 * Completely clears all preferences and interaction history, resetting discovery mode to FAMILIAR.
 */
export function clearPreferencesAndHistory(): StoredProfile {
  const resetProfile: StoredProfile = {
    version: 1,
    discoveryMode: "FAMILIAR",
    preferences: {
      favoriteGenres: [],
      favoriteArtists: [],
      dislikedGenres: [],
      dislikedArtists: [],
    },
    interactionHistory: [],
    updatedAt: new Date().toISOString(),
  };
  saveProfile(resetProfile);
  return resetProfile;
}

/**
 * Subscribes to profile changes (reactive updates).
 */
export function subscribeToProfile(listener: ProfileChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
