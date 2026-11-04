import type { MusicIntent } from "../../types/intent.js";
import type { DiscoveryContext, DiscoveryMode, UserPreferences } from "../../types/discovery.js";

export interface ProcessedDiscoveryResult {
  mode: DiscoveryMode;
  injectedGenre?: string;
  injectedArtist?: string;
  excludedTerms: Set<string>;
  adjustedIntent: MusicIntent;
}

/**
 * Related genre mappings to explore complementary or adventurous styles
 * while adhering to the user's mood and request.
 */
const RELATED_GENRES: Record<string, string[]> = {
  pop: ["indie pop", "dream pop", "synth pop", "art pop"],
  rock: ["indie rock", "post-rock", "shoegaze", "psychedelic rock"],
  jazz: ["neo-soul", "bossa nova", "lo-fi jazz", "nu jazz"],
  hiphop: ["jazz rap", "lo-fi hip hop", "boom bap", "underground hip hop"],
  rap: ["jazz rap", "lo-fi hip hop", "conscious hip hop"],
  electronic: ["downtempo", "ambient techno", "idm", "synthwave"],
  ambient: ["drone", "neo-classical", "soundscape", "space ambient"],
  classical: ["neo-classical", "contemporary classical", "cinematic"],
  folk: ["indie folk", "chamber folk", "americana"],
  indie: ["indie folk", "dream pop", "bedroom pop", "shoegaze"],
  lofi: ["chillhop", "jazzhop", "lo-fi beats"],
};

/**
 * Mood-aligned exploratory genres when Explore mode is active.
 */
const MOOD_EXPLORE_GENRES: Record<string, string[]> = {
  chill: ["ambient downtempo", "bossa nova", "trip hop", "lo-fi indie"],
  calm: ["neo-classical", "drone ambient", "acoustic folk"],
  relaxing: ["downtempo", "ambient soundscape", "chillhop"],
  energetic: ["synthwave", "breakbeat", "garage rock", "electro funk"],
  happy: ["indie pop", "funk groove", "bossa nova"],
  melancholic: ["shoegaze", "post-rock", "slowcore", "dark ambient"],
  sad: ["chamber folk", "ambient piano", "post-rock"],
  focus: ["ambient techno", "deep focus", "minimal techno"],
  study: ["lo-fi beat", "chillhop", "ambient guitar"],
  workout: ["drum and bass", "electro house", "post-punk"],
};

export class DiscoveryPreferenceProcessor {
  /**
   * Processes Gemini intent, discovery mode, preferences, and prompt.
   * Produces a refined discovery context for query generation.
   */
  process(context: DiscoveryContext, baseIntent: MusicIntent): ProcessedDiscoveryResult {
    const rawMode = context.discoveryMode;
    // Guaranteed fallback to FAMILIAR if missing or unknown
    const mode: DiscoveryMode =
      rawMode === "BALANCED" || rawMode === "EXPLORE" ? rawMode : "FAMILIAR";

    const preferences: UserPreferences = context.preferences || {
      favoriteGenres: [],
      favoriteArtists: [],
      dislikedGenres: [],
      dislikedArtists: [],
    };

    const rawPromptLower = (context.rawPrompt || "").toLowerCase();
    const excludedTerms = new Set<string>();

    // 1. Process Disliked Preferences:
    // Respect disliked items UNLESS user explicitly named them in current prompt
    for (const disliked of [...preferences.dislikedGenres, ...preferences.dislikedArtists]) {
      const clean = disliked.trim().toLowerCase();
      if (!clean) continue;
      // If user typed it directly in prompt, current request takes precedence
      if (!rawPromptLower.includes(clean)) {
        excludedTerms.add(clean);
      }
    }

    // Clone intent so base is never mutated
    const adjustedIntent: MusicIntent = {
      ...baseIntent,
      genre: [...(baseIntent.genre || [])],
    };

    // Filter out disliked genres from intent's genre list
    adjustedIntent.genre = adjustedIntent.genre.filter(
      (g) => !excludedTerms.has(g.toLowerCase()),
    );

    let injectedGenre: string | undefined;
    let injectedArtist: string | undefined;

    // Detect if the prompt explicitly stated a genre
    const hasExplicitGenre =
      baseIntent.breakdown?.genre?.source === "explicit" ||
      (adjustedIntent.genre.length > 0 &&
        adjustedIntent.genre.some((g) => rawPromptLower.includes(g.toLowerCase())));

    if (mode === "FAMILIAR") {
      // FAMILIAR (DEFAULT)
      // Prioritise explicitly selected favourite genres & artists
      const eligibleGenres = preferences.favoriteGenres.filter(
        (g) => !excludedTerms.has(g.toLowerCase()),
      );
      const eligibleArtists = preferences.favoriteArtists.filter(
        (a) => !excludedTerms.has(a.toLowerCase()),
      );

      // If user didn't explicitly specify a genre in the prompt, inject a favorite genre
      if (!hasExplicitGenre && eligibleGenres.length > 0) {
        injectedGenre = eligibleGenres[0];
      }

      // If no explicit artist was mentioned, optionally favor a top favorite artist
      // only if it fits naturally
      if (eligibleArtists.length > 0 && !hasExplicitGenre && !injectedGenre) {
        injectedArtist = eligibleArtists[0];
      }

      // Check repeated interest signals from history if no explicit favorite was chosen
      if (!injectedGenre && context.historySignals && context.historySignals.length > 0) {
        const topSignal = context.historySignals.find(
          (s) => !excludedTerms.has(s.term.toLowerCase()) && s.frequency >= 2,
        );
        if (topSignal && !hasExplicitGenre) {
          injectedGenre = topSignal.term;
        }
      }
    } else if (mode === "BALANCED") {
      // BALANCED
      // Blends user's established preferences with complementary directions
      const eligibleGenres = preferences.favoriteGenres.filter(
        (g) => !excludedTerms.has(g.toLowerCase()),
      );

      // Look for complementary related genres
      const baseGenre = hasExplicitGenre
        ? adjustedIntent.genre[0]?.toLowerCase()
        : eligibleGenres[0]?.toLowerCase();

      if (baseGenre) {
        const related = RELATED_GENRES[baseGenre];
        if (related && related.length > 0) {
          // Choose a related genre not in disliked
          const candidate = related.find((r) => !excludedTerms.has(r.toLowerCase()));
          if (candidate) {
            injectedGenre = candidate;
          }
        }
      }

      // If no related genre found, fall back to mood-based blend
      if (!injectedGenre) {
        const moodKey = (adjustedIntent.mood || "").toLowerCase();
        const moodOptions = MOOD_EXPLORE_GENRES[moodKey];
        if (moodOptions && moodOptions.length > 0) {
          injectedGenre = moodOptions[0];
        }
      }
    } else if (mode === "EXPLORE") {
      // EXPLORE: "Surprise me"
      // Prioritise novel genres and styles aligned with the mood, minimising historical bias
      const moodKey = (adjustedIntent.mood || "").toLowerCase();
      const moodOptions = MOOD_EXPLORE_GENRES[moodKey] || [];

      // Find an adventurous genre matching the mood that is not disliked
      const novelGenre = moodOptions.find(
        (opt) =>
          !excludedTerms.has(opt.toLowerCase()) &&
          !preferences.favoriteGenres.some((fg) => fg.toLowerCase() === opt.toLowerCase()),
      );

      if (novelGenre) {
        injectedGenre = novelGenre;
      } else {
        // Look up related genres for the intent's genre, picking a less familiar variation
        const primaryGenre = adjustedIntent.genre[0]?.toLowerCase();
        if (primaryGenre && RELATED_GENRES[primaryGenre]) {
          const alt = RELATED_GENRES[primaryGenre].find(
            (r) =>
              !excludedTerms.has(r.toLowerCase()) &&
              !preferences.favoriteGenres.some((fg) => fg.toLowerCase() === r.toLowerCase()),
          );
          if (alt) injectedGenre = alt;
        }
      }
    }

    return {
      mode,
      injectedGenre,
      injectedArtist,
      excludedTerms,
      adjustedIntent,
    };
  }
}

export const defaultDiscoveryProcessor = new DiscoveryPreferenceProcessor();

