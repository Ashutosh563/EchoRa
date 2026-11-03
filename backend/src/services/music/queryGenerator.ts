import type { MusicIntent } from "../../types/intent.js";
import type { SearchQueries } from "../../types/api.js";

/** Keep queries short: Spotify matches better on a few strong keywords. */
export const MAX_PRIMARY_TERMS = 6;
export const MAX_ALTERNATIVES = 2;

/** Maps common activities to search-friendly keywords. */
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
  dinner: "dinner",
};

/** Fallback keyword when the mood is unknown, derived from energy. */
const ENERGY_KEYWORDS: Record<MusicIntent["energy"], string> = {
  low: "chill",
  medium: "feel good",
  high: "energetic",
};

const TIME_KEYWORDS: Partial<Record<MusicIntent["time_context"], string>> = {
  morning: "morning",
  evening: "evening",
  late_night: "late night",
};

function activityKeyword(activity: string | null): string | null {
  if (!activity) return null;
  return ACTIVITY_KEYWORDS[activity] ?? activity;
}

/** Joins terms, removing empty values and repeated words (case-insensitive). */
function buildQuery(terms: Array<string | null | undefined>, maxTerms = Number.POSITIVE_INFINITY): string {
  const seen = new Set<string>();
  const words: string[] = [];
  for (const term of terms) {
    if (!term) continue;
    const termWords = term.split(/\s+/).filter((w) => w && !seen.has(w.toLowerCase()));
    if (termWords.length === 0) continue;
    if (words.length + termWords.length > maxTerms) break;
    for (const w of termWords) {
      seen.add(w.toLowerCase());
      words.push(w);
    }
  }
  return words.join(" ");
}

/**
 * Converts structured intent into Spotify search queries.
 * Pure function: no API calls, works with incomplete or ambiguous intent.
 *
 * Example: calm / studying / ambient,lofi / instrumental -> "calm ambient lofi instrumental study"
 */
export function generateQueries(intent: MusicIntent): SearchQueries {
  const mood = intent.mood && intent.mood !== "any" ? intent.mood : null;
  const descriptor = mood ?? ENERGY_KEYWORDS[intent.energy];
  const [genre1, genre2] = intent.genre;
  const activity = activityKeyword(intent.activity);
  const vocals = intent.vocals === "instrumental_preferred" ? "instrumental" : null;
  const time = TIME_KEYWORDS[intent.time_context] ?? null;

  const primary =
    buildQuery([descriptor, genre1, genre2, vocals, activity], MAX_PRIMARY_TERMS) || ENERGY_KEYWORDS.medium;

  // Shorter, differently-combined alternatives improve recall when the primary is too narrow.
  const candidates = [
    buildQuery([descriptor, genre1 ?? activity ?? vocals]),
    buildQuery([activity ?? time ?? descriptor, genre2 ?? genre1 ?? "music"]),
    buildQuery([time, genre1 ?? descriptor]),
    buildQuery([descriptor, "music"]),
  ];

  const alternatives: string[] = [];
  for (const candidate of candidates) {
    if (candidate && candidate !== primary && !alternatives.includes(candidate) && candidate.includes(" ")) {
      alternatives.push(candidate);
    }
    if (alternatives.length === MAX_ALTERNATIVES) break;
  }

  return { primary, alternatives };
}

