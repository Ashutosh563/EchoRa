import type { MusicIntent, PriorityLevel } from "../../types/intent.js";
import type { SearchQueries } from "../../types/api.js";
import type { ProcessedDiscoveryResult } from "./discoveryProcessor.js";

/**
 * Maximum terms in a Spotify search query.
 * Spotify search degrades when queries exceed 3-5 terms because terms are matched conjunctively.
 */
export const MAX_QUERY_TERMS = 4;

const ACTIVITY_KEYWORDS: Record<string, string> = {
  studying: "study",
  study: "study",
  homework: "study",
  reading: "reading",
  working: "focus",
  work: "focus",
  coding: "focus",
  focus: "focus",
  workout: "workout",
  gym: "workout",
  exercise: "workout",
  running: "running",
  meditation: "meditation",
  meditating: "meditation",
  yoga: "yoga",
  sleeping: "sleep",
  sleep: "sleep",
  driving: "driving",
  "road trip": "road trip",
  relaxing: "chill",
  party: "party",
  dancing: "dance",
  cooking: "cooking",
};

interface PrioritizedTerm {
  text: string;
  weight: number;
  priority: PriorityLevel;
  source: string;
}

/** Assigns a numeric sorting weight to priorities */
const PRIORITY_WEIGHTS: Record<PriorityLevel, number> = {
  high: 100,
  medium_high: 80,
  medium: 60,
  low: 40,
  none: 0,
};

/**
 * Generates EXACTLY ONE intelligent, prioritized Spotify search query.
 * Does not generate multiple queries or alternative variations.
 *
 * Rules:
 * 1. Prioritize explicit user preferences over inferred or optional ones.
 * 2. Never include unspecified attributes.
 * 3. Keep query concise (3-4 high-impact terms max).
 * 4. Resolve conflicts cleanly (e.g. "relaxing but not too slow" -> prioritizes "relaxing", excludes "slow").
 */
export function generateQueries(
  intent: MusicIntent,
  discovery?: ProcessedDiscoveryResult,
): SearchQueries {
  const activeIntent = discovery?.adjustedIntent ?? intent;
  const terms: PrioritizedTerm[] = [];
  const breakdown = activeIntent.breakdown;

  // Injected discovery terms
  if (discovery?.injectedArtist) {
    terms.push({
      text: discovery.injectedArtist,
      weight: PRIORITY_WEIGHTS.medium_high,
      priority: "medium_high",
      source: "discovery_artist",
    });
  }
  if (discovery?.injectedGenre) {
    terms.push({
      text: discovery.injectedGenre,
      weight: PRIORITY_WEIGHTS.medium_high - 2,
      priority: "medium_high",
      source: "discovery_genre",
    });
  }

  // 1. Mood
  const moodBreakdown = breakdown?.mood;
  const moodVal = moodBreakdown?.value ?? (activeIntent.mood !== "any" ? activeIntent.mood : null);
  if (moodVal && moodVal !== "any") {
    const isExplicit = moodBreakdown?.source === "explicit";
    terms.push({
      text: moodVal,
      weight: isExplicit ? PRIORITY_WEIGHTS.high : PRIORITY_WEIGHTS.medium,
      priority: moodBreakdown?.priority ?? (isExplicit ? "high" : "medium"),
      source: "mood",
    });
  }

  // 2. Activity / Setting
  const actBreakdown = breakdown?.activity;
  const actVal = actBreakdown?.value ?? activeIntent.activity;
  if (actVal) {
    const isExplicit = actBreakdown?.source === "explicit";
    const mapped = ACTIVITY_KEYWORDS[actVal] ?? actVal;
    terms.push({
      text: mapped,
      weight: isExplicit ? PRIORITY_WEIGHTS.high - 5 : PRIORITY_WEIGHTS.medium - 5,
      priority: actBreakdown?.priority ?? (isExplicit ? "high" : "medium"),
      source: "activity",
    });
  }

  // 3. Vocals (e.g. "without lyrics", "instrumental")
  const vocalsBreakdown = breakdown?.vocals;
  const vocalsVal = vocalsBreakdown?.value ?? activeIntent.vocals;
  if (vocalsVal === "instrumental_preferred") {
    const isExplicit = vocalsBreakdown?.source === "explicit";
    terms.push({
      text: "instrumental",
      weight: isExplicit ? PRIORITY_WEIGHTS.medium_high : PRIORITY_WEIGHTS.low,
      priority: vocalsBreakdown?.priority ?? (isExplicit ? "medium_high" : "low"),
      source: "vocals",
    });
  }

  // 4. Genres (Explicit genres high priority; optional genres lower priority)
  const genreBreakdown = breakdown?.genre;
  const genres = genreBreakdown?.value ?? activeIntent.genre ?? [];
  const isExplicitGenre = genreBreakdown?.source === "explicit";

  if (genres.length > 0) {
    // Take at most 1-2 most relevant genres to prevent query pollution
    const topGenre = genres[0];
    if (topGenre) {
      terms.push({
        text: topGenre,
        weight: isExplicitGenre ? PRIORITY_WEIGHTS.medium_high - 5 : PRIORITY_WEIGHTS.low - 5,
        priority: isExplicitGenre ? "medium_high" : "low",
        source: "genre",
      });
    }
  }

  // 5. Energy / Tempo - only include if explicitly requested or needed when no mood/genre exists
  const energyBreakdown = breakdown?.energy;
  const tempoBreakdown = breakdown?.tempo;

  if (energyBreakdown?.source === "explicit" && energyBreakdown.value === "high" && !terms.some((t) => t.text.includes("energetic"))) {
    terms.push({
      text: "high energy",
      weight: PRIORITY_WEIGHTS.medium_high,
      priority: "medium_high",
      source: "energy",
    });
  }

  if (tempoBreakdown?.source === "explicit" && tempoBreakdown.value && tempoBreakdown.value !== "any") {
    terms.push({
      text: tempoBreakdown.value,
      weight: PRIORITY_WEIGHTS.medium,
      priority: "medium",
      source: "tempo",
    });
  }

  // Fallback for completely ambiguous/vague prompts (e.g. "Something good to listen to")
  if (terms.length === 0) {
    if (activeIntent.mood && activeIntent.mood !== "any") {
      terms.push({ text: activeIntent.mood, weight: 50, priority: "medium", source: "mood" });
    } else {
      terms.push({ text: "good music", weight: 10, priority: "low", source: "fallback" });
    }
  }

  // Sort terms by weight descending
  terms.sort((a, b) => b.weight - a.weight);

  // Build the clean single query with deduplication, excluded terms check, and word limit
  const seenWords = new Set<string>();
  const finalWords: string[] = [];

  for (const term of terms) {
    const words = term.text.split(/\s+/).filter(Boolean);
    for (const w of words) {
      const lower = w.toLowerCase();
      if (discovery?.excludedTerms.has(lower)) {
        continue;
      }
      if (!seenWords.has(lower) && finalWords.length < MAX_QUERY_TERMS) {
        seenWords.add(lower);
        finalWords.push(lower);
      }
    }
    if (finalWords.length >= MAX_QUERY_TERMS) break;
  }

  const primary = finalWords.join(" ") || "music";

  // STRICT REQUIREMENT: Exactly ONE query. alternatives array is kept empty for API contract compatibility.
  return {
    primary,
    alternatives: [],
  };
}
