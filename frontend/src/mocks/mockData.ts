import type { MusicIntent, Track } from "../types/api";

/**
 * Mock data used while the frontend runs without a backend.
 * Kept separate from UI components so it can be swapped for real API data.
 */

/** Generates a simple coloured SVG as placeholder album artwork (no network needed). */
function artwork(hue: number, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="hsl(${hue},60%,45%)"/><stop offset="1" stop-color="hsl(${(hue + 60) % 360},60%,25%)"/>
</linearGradient></defs><rect width="300" height="300" fill="url(#g)"/>
<text x="150" y="165" font-family="sans-serif" font-size="42" fill="white" text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Mock links point to a Spotify search page so they are always valid. */
function spotifySearchUrl(name: string, artist: string): string {
  return `https://open.spotify.com/search/${encodeURIComponent(`${name} ${artist}`)}`;
}

function track(
  id: string,
  name: string,
  artists: string[],
  album: string,
  durationMs: number | null,
  hue: number | null,
): Track {
  return {
    id,
    name,
    artists,
    album,
    albumArtUrl: hue === null ? null : artwork(hue, name.charAt(0)),
    durationMs,
    spotifyUrl: spotifySearchUrl(name, artists[0] ?? ""),
    previewUrl: null,
  };
}

export const MOCK_TRACKS: Track[] = [
  track("mock-1", "Midnight Library", ["Luna Fields"], "Quiet Hours", 214000, 230),
  track("mock-2", "Soft Static", ["Nocturne Collective"], "Late Light", 187000, 260),
  track("mock-3", "Paper Lanterns", ["Kei Aoyama"], "Drift", 241000, 200),
  track("mock-4", "Rain on Glass", ["The Slow Tides", "Mira Vale"], "Window Seat", 198000, 210),
  track("mock-5", "Low Orbit", ["Satellite Hearts"], "Low Orbit", 263000, 280),
  // Intentionally missing metadata to exercise fallbacks in the UI.
  track("mock-6", "Untitled Sketch No. 4", ["Unknown Artist"], "Unknown Album", null, null),
  track("mock-7", "Warm Coffee", ["Ellis Park"], "Sunday Mornings", 176000, 30),
  track("mock-8", "Northern Lights", ["Aurora Drift"], "Polar", 305000, 160),
];

export const DEFAULT_MOCK_INTENT: MusicIntent = {
  mood: "calm",
  activity: "studying",
  energy: "low",
  tempo: "slow",
  genre: ["ambient", "lofi"],
  vocals: "instrumental_preferred",
  time_context: "late_night",
};

/**
 * Keyword rules used to *simulate* AI interpretation in mock mode.
 * Real interpretation is done by Gemini on the backend.
 */
export const MOCK_INTENT_RULES: Array<{ keywords: string[]; intent: Partial<MusicIntent> }> = [
  {
    keywords: ["workout", "gym", "energetic", "run", "running", "pump"],
    intent: { mood: "energetic", activity: "workout", energy: "high", tempo: "fast", genre: ["edm", "hip hop"], vocals: "any" },
  },
  {
    keywords: ["melancholic", "sad", "rainy", "rain", "heartbreak"],
    intent: { mood: "melancholic", activity: "relaxing", energy: "low", tempo: "slow", genre: ["indie", "acoustic"], vocals: "vocals_preferred" },
  },
  {
    keywords: ["happy", "upbeat", "cheerful", "sunny"],
    intent: { mood: "happy", activity: null, energy: "medium", tempo: "medium", genre: ["acoustic", "pop"], vocals: "any" },
  },
  {
    keywords: ["meditation", "meditate", "peaceful", "yoga"],
    intent: { mood: "peaceful", activity: "meditation", energy: "low", tempo: "slow", genre: ["ambient", "new age"], vocals: "instrumental_preferred" },
  },
  {
    keywords: ["drive", "driving", "dreamy", "road"],
    intent: { mood: "dreamy", activity: "driving", energy: "medium", tempo: "medium", genre: ["synthwave", "dream pop"], vocals: "any" },
  },
  {
    keywords: ["study", "studying", "focus", "calm", "work"],
    intent: { mood: "calm", activity: "studying", energy: "low", tempo: "slow", genre: ["ambient", "lofi"], vocals: "instrumental_preferred" },
  },
];

export const MOCK_TIME_RULES: Array<{ keywords: string[]; time_context: MusicIntent["time_context"] }> = [
  { keywords: ["3 am", "3am", "late night", "late-night", "midnight", "night"], time_context: "late_night" },
  { keywords: ["morning", "sunrise"], time_context: "morning" },
  { keywords: ["afternoon"], time_context: "afternoon" },
  { keywords: ["evening", "sunset"], time_context: "evening" },
];

