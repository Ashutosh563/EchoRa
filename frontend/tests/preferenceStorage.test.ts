import { describe, it, expect, beforeEach } from "vitest";
import {
  getStoredProfile,
  setDiscoveryMode,
  addPreference,
  removePreference,
  recordInteraction,
  clearPreferencesAndHistory,
  sanitizeDiscoveryMode,
} from "../src/services/preferenceStorage";

describe("preferenceStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to FAMILIAR and empty preferences when localStorage is empty", () => {
    const profile = getStoredProfile();
    expect(profile.discoveryMode).toBe("FAMILIAR");
    expect(profile.preferences.favoriteGenres).toEqual([]);
    expect(profile.preferences.favoriteArtists).toEqual([]);
    expect(profile.preferences.dislikedGenres).toEqual([]);
    expect(profile.preferences.dislikedArtists).toEqual([]);
    expect(profile.interactionHistory).toEqual([]);
  });

  it("sanitizes invalid discovery modes to FAMILIAR", () => {
    expect(sanitizeDiscoveryMode("INVALID" as any)).toBe("FAMILIAR");
    expect(sanitizeDiscoveryMode(null)).toBe("FAMILIAR");
    expect(sanitizeDiscoveryMode(undefined)).toBe("FAMILIAR");
    expect(sanitizeDiscoveryMode("BALANCED")).toBe("BALANCED");
    expect(sanitizeDiscoveryMode("EXPLORE")).toBe("EXPLORE");
    expect(sanitizeDiscoveryMode("FAMILIAR")).toBe("FAMILIAR");
  });

  it("gracefully recovers from malformed localStorage JSON", () => {
    localStorage.setItem("echora_discovery_profile_v1", "INVALID_JSON{{[");
    const profile = getStoredProfile();
    expect(profile.discoveryMode).toBe("FAMILIAR");
    expect(profile.preferences.favoriteGenres).toEqual([]);
  });

  it("persists discovery mode changes", () => {
    setDiscoveryMode("BALANCED");
    expect(getStoredProfile().discoveryMode).toBe("BALANCED");

    setDiscoveryMode("EXPLORE");
    expect(getStoredProfile().discoveryMode).toBe("EXPLORE");

    setDiscoveryMode("FAMILIAR");
    expect(getStoredProfile().discoveryMode).toBe("FAMILIAR");
  });

  it("adds and deduplicates preferences case-insensitively", () => {
    addPreference("favoriteGenres", "Jazz");
    addPreference("favoriteGenres", "jazz");
    addPreference("favoriteGenres", "JAZZ");
    addPreference("favoriteGenres", "Indie");

    const profile = getStoredProfile();
    expect(profile.preferences.favoriteGenres).toEqual(["Jazz", "Indie"]);
  });

  it("removes preferences correctly", () => {
    addPreference("favoriteArtists", "Radiohead");
    addPreference("favoriteArtists", "Bon Iver");
    removePreference("favoriteArtists", "radiohead");

    const profile = getStoredProfile();
    expect(profile.preferences.favoriteArtists).toEqual(["Bon Iver"]);
  });

  it("caps interaction history at 100 items (FIFO)", () => {
    for (let i = 0; i < 110; i++) {
      recordInteraction({
        prompt: `Search ${i}`,
        discoveryMode: "FAMILIAR",
        genre: ["Pop"],
      });
    }

    const profile = getStoredProfile();
    expect(profile.interactionHistory.length).toBe(100);
    expect(profile.interactionHistory[0].prompt).toBe("Search 10");
    expect(profile.interactionHistory[99].prompt).toBe("Search 109");
  });

  it("clearPreferencesAndHistory resets all preferences and discovery mode to FAMILIAR", () => {
    setDiscoveryMode("EXPLORE");
    addPreference("favoriteGenres", "Ambient");
    recordInteraction({
      prompt: "chill morning",
      discoveryMode: "EXPLORE",
    });

    const reset = clearPreferencesAndHistory();
    expect(reset.discoveryMode).toBe("FAMILIAR");
    expect(reset.preferences.favoriteGenres).toEqual([]);
    expect(reset.interactionHistory).toEqual([]);

    const retrieved = getStoredProfile();
    expect(retrieved.discoveryMode).toBe("FAMILIAR");
  });
});
