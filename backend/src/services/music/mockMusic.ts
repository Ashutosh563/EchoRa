import type { MusicIntent } from "../../types/intent.js";
import type { Track } from "../../types/track.js";

/** Predefined mock tracks returned when the backend runs in mock mode. */
export const BACKEND_MOCK_TRACKS: Track[] = [
  {
    id: "mock-1",
    name: "Midnight Library",
    artists: ["Luna Fields"],
    album: "Quiet Hours",
    albumArtUrl: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=300&auto=format&fit=crop&q=80",
    durationMs: 214000,
    spotifyUrl: "https://open.spotify.com/search/Midnight%20Library%20Luna%20Fields",
    previewUrl: null,
  },
  {
    id: "mock-2",
    name: "Soft Static",
    artists: ["Nocturne Collective"],
    album: "Late Light",
    albumArtUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80",
    durationMs: 187000,
    spotifyUrl: "https://open.spotify.com/search/Soft%20Static%20Nocturne%20Collective",
    previewUrl: null,
  },
  {
    id: "mock-3",
    name: "Paper Lanterns",
    artists: ["Kei Aoyama"],
    album: "Drift",
    albumArtUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80",
    durationMs: 241000,
    spotifyUrl: "https://open.spotify.com/search/Paper%20Lanterns%20Kei%20Aoyama",
    previewUrl: null,
  },
  {
    id: "mock-4",
    name: "Rain on Glass",
    artists: ["The Slow Tides", "Mira Vale"],
    album: "Window Seat",
    albumArtUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=300&auto=format&fit=crop&q=80",
    durationMs: 198000,
    spotifyUrl: "https://open.spotify.com/search/Rain%20on%20Glass%20The%20Slow%20Tides",
    previewUrl: null,
  },
  {
    id: "mock-5",
    name: "Low Orbit",
    artists: ["Satellite Hearts"],
    album: "Low Orbit",
    albumArtUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300&auto=format&fit=crop&q=80",
    durationMs: 263000,
    spotifyUrl: "https://open.spotify.com/search/Low%20Orbit%20Satellite%20Hearts",
    previewUrl: null,
  },
  {
    id: "mock-6",
    name: "Warm Coffee",
    artists: ["Ellis Park"],
    album: "Sunday Mornings",
    albumArtUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=300&auto=format&fit=crop&q=80",
    durationMs: 176000,
    spotifyUrl: "https://open.spotify.com/search/Warm%20Coffee%20Ellis%20Park",
    previewUrl: null,
  },
  {
    id: "mock-7",
    name: "Northern Lights",
    artists: ["Aurora Drift"],
    album: "Polar",
    albumArtUrl: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=300&auto=format&fit=crop&q=80",
    durationMs: 305000,
    spotifyUrl: "https://open.spotify.com/search/Northern%20Lights%20Aurora%20Drift",
    previewUrl: null,
  },
];

export function getMockIntent(prompt: string): MusicIntent {
  const p = prompt.toLowerCase();
  if (p.includes("workout") || p.includes("gym") || p.includes("energy")) {
    return {
      mood: "energetic",
      activity: "workout",
      energy: "high",
      tempo: "fast",
      genre: ["edm", "hip hop"],
      vocals: "any",
      time_context: "any",
    };
  }
  if (p.includes("rain") || p.includes("sad") || p.includes("melanchol")) {
    return {
      mood: "melancholic",
      activity: "relaxing",
      energy: "low",
      tempo: "slow",
      genre: ["acoustic", "indie"],
      vocals: "vocals_preferred",
      time_context: "evening",
    };
  }
  if (p.includes("happy") || p.includes("acoustic")) {
    return {
      mood: "happy",
      activity: null,
      energy: "medium",
      tempo: "medium",
      genre: ["acoustic", "folk"],
      vocals: "any",
      time_context: "morning",
    };
  }
  return {
    mood: "calm",
    activity: "studying",
    energy: "low",
    tempo: "slow",
    genre: ["ambient", "lofi"],
    vocals: "instrumental_preferred",
    time_context: "late_night",
  };
}

