import { describe, it, expect, vi } from "vitest";
import { createSemanticReranker } from "../../src/services/gemini/reranker.js";
import type { GeminiClient } from "../../src/services/gemini/geminiClient.js";
import type { MusicIntent } from "../../src/types/intent.js";
import type { Track } from "../../src/types/track.js";

const mockIntent: MusicIntent = {
  mood: "calm",
  activity: "studying",
  energy: "low",
  tempo: "slow",
  genre: ["ambient", "lofi"],
  vocals: "instrumental_preferred",
  time_context: "late_night",
};

const makeTrack = (id: string, name: string): Track => ({
  id,
  name,
  artists: ["Artist " + id],
  album: "Album " + id,
  albumArtUrl: null,
  durationMs: 180000,
  spotifyUrl: `https://open.spotify.com/track/${id}`,
  previewUrl: null,
});

describe("Semantic Reranker (reranker.ts)", () => {
  it("reorders candidates and assigns matchReason based on LLM output", async () => {
    const candidates = [makeTrack("t1", "Fast Rap"), makeTrack("t2", "Slow Ambient Piano"), makeTrack("t3", "Acoustic Guitar")];

    const fakeClient: GeminiClient = {
      generateJson: vi.fn().mockResolvedValue(
        JSON.stringify({
          rankedTracks: [
            { id: "t2", matchReason: "Slow ambient piano chords matching nocturnal study focus." },
            { id: "t3", matchReason: "Gentle acoustic guitar without lyrics." },
          ],
        }),
      ),
    };

    const reranker = createSemanticReranker(fakeClient);
    const result = await reranker.rerank("study calm music", mockIntent, candidates);

    expect(result.length).toBe(3); // t2, t3, then fallback t1
    expect(result[0]?.id).toBe("t2");
    expect(result[0]?.matchReason).toContain("Slow ambient piano");
    expect(result[1]?.id).toBe("t3");
  });

  it("passes discoveryMode into reranker payload", async () => {
    const candidates = [makeTrack("t1", "Song 1"), makeTrack("t2", "Song 2")];
    const generateJsonMock = vi.fn().mockResolvedValue(
      JSON.stringify({
        rankedTracks: [{ id: "t2", matchReason: "Fresh indie texture." }],
      }),
    );
    const fakeClient: GeminiClient = {
      generateJson: generateJsonMock,
    };

    const reranker = createSemanticReranker(fakeClient);
    await reranker.rerank("explore new sounds", mockIntent, candidates, "EXPLORE");

    expect(generateJsonMock).toHaveBeenCalledOnce();
    const callArgs = generateJsonMock.mock.calls[0][0];
    expect(callArgs.userText).toContain('"discoveryMode":"EXPLORE"');
    expect(callArgs.systemInstruction).toContain("EXPLORE");
  });

  it("gracefully falls back to candidate order if LLM throws error", async () => {
    const candidates = [makeTrack("t1", "Song 1"), makeTrack("t2", "Song 2")];

    const errorClient: GeminiClient = {
      generateJson: vi.fn().mockRejectedValue(new Error("API rate limit")),
    };

    const reranker = createSemanticReranker(errorClient);
    const result = await reranker.rerank("chill", mockIntent, candidates);

    expect(result.length).toBe(2);
    expect(result[0]?.id).toBe("t1");
    expect(result[1]?.id).toBe("t2");
    expect(result[0]?.matchReason).toBeDefined();
  });

  it("handles null GeminiClient cleanly", async () => {
    const candidates = [makeTrack("t1", "Song 1")];
    const reranker = createSemanticReranker(null);
    const result = await reranker.rerank("chill", mockIntent, candidates);

    expect(result.length).toBe(1);
    expect(result[0]?.id).toBe("t1");
  });

  it("includes sonicProfile in LLM payload and filters out mashup overload", async () => {
    const candidates = [
      { ...makeTrack("t1", "Original Song"), releaseYear: 1995 },
      { ...makeTrack("t2", "Chill Mashup Mix DJ"), releaseYear: 1996 },
      { ...makeTrack("t3", "Evergreen Classic"), releaseYear: 1994 },
      { ...makeTrack("t4", "Club Mix Remix Medley"), releaseYear: 1998 },
      { ...makeTrack("t5", "DJ VDJ Super Mix"), releaseYear: 1999 },
    ];

    const generateJsonMock = vi.fn().mockResolvedValue(
      JSON.stringify({
        rankedTracks: [
          { id: "t1", matchReason: "Warm acoustic guitar and intimate vocals." },
          { id: "t2", matchReason: "Subtle lofi mix." },
          { id: "t3", matchReason: "Nostalgic 90s strings." },
          { id: "t4", matchReason: "Second mix." },
          { id: "t5", matchReason: "Third mix rejected." },
        ],
      }),
    );

    const fakeClient: GeminiClient = {
      generateJson: generateJsonMock,
    };

    const reranker = createSemanticReranker(fakeClient);
    const intentWithSonic: MusicIntent = {
      ...mockIntent,
      language: "hindi",
      era: "90s",
      sonicProfile: {
        instruments: ["nylon guitar", "flute"],
        production: "warm 90s analog",
        tempoDescription: "unhurried 75bpm",
        emotionalSubtext: "pure monsoon romance",
      },
    };

    const result = await reranker.rerank("90s hindi acoustic romance", intentWithSonic, candidates);

    // Verify sonic profile is sent to LLM
    const callArgs = generateJsonMock.mock.calls[0][0];
    expect(callArgs.userText).toContain('"instruments":["nylon guitar","flute"]');
    expect(callArgs.userText).toContain('"emotionalSubtext":"pure monsoon romance"');

    // Verify mashup cap is enforced (max 2 mashups)
    const mashupCount = result.filter(t => t.name.toLowerCase().includes("mix") || t.name.toLowerCase().includes("mashup")).length;
    expect(mashupCount).toBeLessThanOrEqual(2);
  });

  it("strictly discards off-era tracks and regional leaks in reranker output and backfill", async () => {
    const candidates = [
      { ...makeTrack("t1", "90s Romantic Song"), releaseYear: 1996 },
      { ...makeTrack("t2", "70s Old Song"), releaseYear: 1972 },
      { ...makeTrack("t3", "Sreeraagamo Pavithram Malayalam"), releaseYear: 1994 },
      { ...makeTrack("t4", "2024 Modern Song"), releaseYear: 2024 },
      { ...makeTrack("t5", "Pure 90s Melody"), releaseYear: 1998 },
    ];

    const generateJsonMock = vi.fn().mockResolvedValue(
      JSON.stringify({
        rankedTracks: [
          { id: "t1", matchReason: "Classic 1996 acoustic melody." },
          { id: "t2", matchReason: "70s classic." }, // Should be discarded by code era filter!
          { id: "t3", matchReason: "Malayalam track." }, // Should be discarded by code language filter!
        ],
      }),
    );

    const fakeClient: GeminiClient = {
      generateJson: generateJsonMock,
    };

    const reranker = createSemanticReranker(fakeClient);
    const intent: MusicIntent = {
      ...mockIntent,
      language: "hindi",
      era: "90s",
      sonicProfile: {
        instruments: ["nylon guitar", "bansuri flute"],
        production: "warm analog tape",
        tempoDescription: "slow 70bpm",
        emotionalSubtext: "quiet romance",
        harmonicMode: "minor",
        vocalStyle: "soft intimate melodic",
        antiSonicAura: {
          forbiddenInstruments: ["trap 808s", "loud brass"],
          forbiddenVibes: ["party dance track"],
        },
      },
    };

    const result = await reranker.rerank("chill 90s hindi songs", intent, candidates);

    // Verify payload includes deep sonic profile
    const callArgs = generateJsonMock.mock.calls[0][0];
    expect(callArgs.userText).toContain('"harmonicMode":"minor"');
    expect(callArgs.userText).toContain('"vocalStyle":"soft intimate melodic"');
    expect(callArgs.userText).toContain('"forbiddenInstruments":["trap 808s","loud brass"]');

    // Only t1 and t5 should remain; t2 (1972), t3 (Malayalam), t4 (2024) must all be discarded!
    const resultIds = result.map(t => t.id);
    expect(resultIds).toContain("t1");
    expect(resultIds).toContain("t5");
    expect(resultIds).not.toContain("t2");
    expect(resultIds).not.toContain("t3");
    expect(resultIds).not.toContain("t4");
  });

  it("strictly eliminates instrumental, karaoke, BGM, and score tracks unless explicitly requested", async () => {
    const candidates = [
      makeTrack("t1", "Tum Hi Ho"),
      makeTrack("t2", "Tum Hi Ho (Instrumental)"),
      makeTrack("t3", "Aashiqui 2 - Flute Theme"),
      makeTrack("t4", "Tum Hi Ho - Karaoke Version"),
      makeTrack("t5", "Channa Mereya"),
    ];

    const generateJsonMock = vi.fn().mockResolvedValue(
      JSON.stringify({
        rankedTracks: [
          { id: "t1", matchReason: "Original vocal version." },
          { id: "t2", matchReason: "Instrumental rendition." },
          { id: "t5", matchReason: "Soulful vocal acoustic." },
        ],
      }),
    );

    const fakeClient: GeminiClient = {
      generateJson: generateJsonMock,
    };

    const reranker = createSemanticReranker(fakeClient);
    const intent: MusicIntent = {
      ...mockIntent,
      mood: "sad",
      vocals: "vocals_preferred",
    };

    // User asked for "chill hindi songs" - NOT instrumental!
    const result = await reranker.rerank("chill hindi songs", intent, candidates);
    const resultIds = result.map(t => t.id);

    expect(resultIds).toContain("t1");
    expect(resultIds).toContain("t5");
    expect(resultIds).not.toContain("t2"); // Instrumental disqualified
    expect(resultIds).not.toContain("t3"); // Theme disqualified
    expect(resultIds).not.toContain("t4"); // Karaoke disqualified
  });

  it("permits instrumental and score tracks when user explicitly asks for instrumental", async () => {
    const candidates = [
      makeTrack("t1", "Peaceful Piano Solo (Instrumental)"),
      makeTrack("t2", "Interstellar Main Theme - Original Score"),
      makeTrack("t3", "Upbeat Dance Vocal"),
    ];

    const generateJsonMock = vi.fn().mockResolvedValue(
      JSON.stringify({
        rankedTracks: [
          { id: "t1", matchReason: "Gentle acoustic piano resonance." },
          { id: "t2", matchReason: "Cinematic instrumental depth." },
        ],
      }),
    );

    const fakeClient: GeminiClient = {
      generateJson: generateJsonMock,
    };

    const reranker = createSemanticReranker(fakeClient);
    const intent: MusicIntent = {
      ...mockIntent,
      mood: "peaceful",
      vocals: "instrumental_preferred",
    };

    // User explicitly asked for instrumental music!
    const result = await reranker.rerank("peaceful piano instrumental", intent, candidates);
    const resultIds = result.map(t => t.id);

    expect(resultIds).toContain("t1");
    expect(resultIds).toContain("t2");
  });

  it("caps each artist to maximum 2 tracks when artist was not explicitly searched", async () => {
    const candidates = [
      { ...makeTrack("t1", "Song 1"), artists: ["Arijit Singh"] },
      { ...makeTrack("t2", "Song 2"), artists: ["Arijit Singh"] },
      { ...makeTrack("t3", "Song 3"), artists: ["Arijit Singh"] },
      { ...makeTrack("t4", "Song 4"), artists: ["Arijit Singh"] },
      { ...makeTrack("t5", "Song 5"), artists: ["Sonu Nigam"] },
      { ...makeTrack("t6", "Song 6"), artists: ["Mohit Chauhan"] },
    ];

    const generateJsonMock = vi.fn().mockResolvedValue(
      JSON.stringify({
        rankedTracks: [
          { id: "t1", matchReason: "First Arijit track." },
          { id: "t2", matchReason: "Second Arijit track." },
          { id: "t3", matchReason: "Third Arijit track (should be capped!)." },
          { id: "t4", matchReason: "Fourth Arijit track (should be capped!)." },
          { id: "t5", matchReason: "Sonu Nigam classic." },
          { id: "t6", matchReason: "Mohit Chauhan melody." },
        ],
      }),
    );

    const fakeClient: GeminiClient = { generateJson: generateJsonMock };
    const reranker = createSemanticReranker(fakeClient);
    const intent: MusicIntent = {
      ...mockIntent,
      mood: "romantic",
      artist: null, // No explicit artist specified
    };

    const result = await reranker.rerank("romantic songs", intent, candidates);
    const arijitTracks = result.filter(t => t.artists.includes("Arijit Singh"));

    // Maximum 2 tracks for Arijit Singh
    expect(arijitTracks.length).toBeLessThanOrEqual(2);
    expect(result.map(t => t.id)).toContain("t5");
    expect(result.map(t => t.id)).toContain("t6");
  });

  it("bypasses artist cap when user explicitly searches for that specific artist", async () => {
    const candidates = [
      { ...makeTrack("t1", "Song 1"), artists: ["Arijit Singh"] },
      { ...makeTrack("t2", "Song 2"), artists: ["Arijit Singh"] },
      { ...makeTrack("t3", "Song 3"), artists: ["Arijit Singh"] },
      { ...makeTrack("t4", "Song 4"), artists: ["Arijit Singh"] },
    ];

    const generateJsonMock = vi.fn().mockResolvedValue(
      JSON.stringify({
        rankedTracks: [
          { id: "t1", matchReason: "Arijit track 1." },
          { id: "t2", matchReason: "Arijit track 2." },
          { id: "t3", matchReason: "Arijit track 3." },
          { id: "t4", matchReason: "Arijit track 4." },
        ],
      }),
    );

    const fakeClient: GeminiClient = { generateJson: generateJsonMock };
    const reranker = createSemanticReranker(fakeClient);
    const intent: MusicIntent = {
      ...mockIntent,
      mood: "romantic",
      artist: "Arijit Singh", // Explicit artist requested
    };

    const result = await reranker.rerank("arijit singh romantic hits", intent, candidates);
    const arijitTracks = result.filter(t => t.artists.includes("Arijit Singh"));

    // All tracks should be kept because user explicitly searched for Arijit Singh
    expect(arijitTracks.length).toBe(4);
  });

  it("strictly eliminates tracks violating negative constraints (excluded artists & genres)", async () => {
    const candidates = [
      { ...makeTrack("t1", "Soulful Acoustic Ballad"), artists: ["Mohit Chauhan"] },
      { ...makeTrack("t2", "Tum Hi Ho"), artists: ["Arijit Singh"] },
      { ...makeTrack("t3", "Fast Rap Flow (Drill Mix)"), artists: ["MC Stan"] },
      { ...makeTrack("t4", "Gentle Guitar"), artists: ["Prateek Kuhad"] },
    ];

    const generateJsonMock = vi.fn().mockResolvedValue(
      JSON.stringify({
        rankedTracks: [
          { id: "t1", matchReason: "Soulful acoustic ballad." },
          { id: "t2", matchReason: "Arijit track (should be excluded!)." },
          { id: "t3", matchReason: "Rap track (should be excluded!)." },
          { id: "t4", matchReason: "Gentle acoustic guitar." },
        ],
      }),
    );

    const fakeClient: GeminiClient = { generateJson: generateJsonMock };
    const reranker = createSemanticReranker(fakeClient);
    const intent: MusicIntent = {
      ...mockIntent,
      mood: "calm",
      negativeConstraints: {
        excludedArtists: ["arijit singh"],
        excludedGenres: ["rap"],
      },
    };

    const result = await reranker.rerank("chill hindi songs except arijit singh no rap", intent, candidates);
    const resultIds = result.map(t => t.id);

    expect(resultIds).toContain("t1");
    expect(resultIds).toContain("t4");
    expect(resultIds).not.toContain("t2"); // Arijit Singh excluded
    expect(resultIds).not.toContain("t3"); // Rap excluded
  });

  it("strictly eliminates Spanish title traps and Western artists on Spanish queries", async () => {
    const candidates = [
      { ...makeTrack("t1", "Heartbreak in Spanish"), artists: ["Bill Beasley"] },
      { ...makeTrack("t2", "Spanish Romance"), artists: ["Simon Dinnigan"] },
      { ...makeTrack("t3", "Sad Spanish Automotivo"), artists: ["Hayasa G"] },
      { ...makeTrack("t4", "Si No Estás"), artists: ["Iñigo Quintero"] },
      { ...makeTrack("t5", "La Bachata"), artists: ["Manuel Turizo"] },
      { ...makeTrack("t6", "Spanish Eyes"), artists: ["Elvis Presley"] },
    ];

    const generateJsonMock = vi.fn().mockResolvedValue(
      JSON.stringify({
        rankedTracks: [
          { id: "t1", matchReason: "Bill Beasley track (title trap)." },
          { id: "t4", matchReason: "Authentic acoustic Spanish ballad." },
          { id: "t5", matchReason: "Authentic Latin track." },
        ],
      }),
    );

    const fakeClient: GeminiClient = { generateJson: generateJsonMock };
    const reranker = createSemanticReranker(fakeClient);
    const intent: MusicIntent = {
      ...mockIntent,
      mood: "sad",
      language: "spanish",
    };

    const result = await reranker.rerank("spanish breakup songs", intent, candidates);
    const resultIds = result.map((t) => t.id);

    expect(resultIds).toContain("t4"); // Si No Estás
    expect(resultIds).toContain("t5"); // La Bachata
    expect(resultIds).not.toContain("t1"); // Bill Beasley / "Heartbreak in Spanish"
    expect(resultIds).not.toContain("t2"); // Simon Dinnigan / "Spanish Romance"
    expect(resultIds).not.toContain("t3"); // Hayasa G / "Sad Spanish Automotivo"
    expect(resultIds).not.toContain("t6"); // Elvis Presley / "Spanish Eyes"
  });

  it("strictly eliminates K-pop and Western pop/rap leaks on Hindi queries", async () => {
    const candidates = [
      { ...makeTrack("t1", "Fxxxboy"), artists: ["BLACKPINK"] },
      { ...makeTrack("t2", "God's Plan"), artists: ["Drake"] },
      { ...makeTrack("t3", "Channa Mereya"), artists: ["Pritam", "Arijit Singh"] },
      { ...makeTrack("t4", "Tum Se Hi"), artists: ["Pritam", "Mohit Chauhan"] },
      { ...makeTrack("t5", "Cardigan"), artists: ["Taylor Swift"] },
    ];

    const generateJsonMock = vi.fn().mockResolvedValue(
      JSON.stringify({
        rankedTracks: [
          { id: "t1", matchReason: "K-pop leak." },
          { id: "t3", matchReason: "Soulful Hindi ballad." },
          { id: "t4", matchReason: "Romantic Bollywood classic." },
        ],
      }),
    );

    const fakeClient: GeminiClient = { generateJson: generateJsonMock };
    const reranker = createSemanticReranker(fakeClient);
    const intent: MusicIntent = {
      ...mockIntent,
      mood: "sad",
      language: "hindi",
    };

    const result = await reranker.rerank("hindi sad songs", intent, candidates);
    const resultIds = result.map((t) => t.id);

    expect(resultIds).toContain("t3"); // Channa Mereya
    expect(resultIds).toContain("t4"); // Tum Se Hi
    expect(resultIds).not.toContain("t1"); // BLACKPINK leak
    expect(resultIds).not.toContain("t2"); // Drake leak
    expect(resultIds).not.toContain("t5"); // Taylor Swift leak
  });

  it("strictly eliminates Russian title traps and foreign artists on Russian queries", async () => {
    const candidates = [
      { ...makeTrack("t1", "Russian Roulette"), artists: ["Rihanna"] },
      { ...makeTrack("t2", "Russian Roulette"), artists: ["Red Velvet"] },
      { ...makeTrack("t3", "Sudno (Boris Ryzhy)"), artists: ["Molchat Doma"] },
      { ...makeTrack("t4", "Pachka Sigaret"), artists: ["Kino"] },
      { ...makeTrack("t5", "295"), artists: ["Sidhu Moose Wala"] },
    ];

    const generateJsonMock = vi.fn().mockResolvedValue(
      JSON.stringify({
        rankedTracks: [
          { id: "t1", matchReason: "Western pop title trap." },
          { id: "t2", matchReason: "K-pop title trap." },
          { id: "t3", matchReason: "Authentic Russian post-punk." },
          { id: "t4", matchReason: "Classic Russian rock." },
        ],
      }),
    );

    const fakeClient: GeminiClient = { generateJson: generateJsonMock };
    const reranker = createSemanticReranker(fakeClient);
    const intent: MusicIntent = {
      ...mockIntent,
      mood: "sad",
      language: "russian",
    };

    const result = await reranker.rerank("russian sad songs", intent, candidates);
    const resultIds = result.map((t) => t.id);

    expect(resultIds).toContain("t3"); // Molchat Doma
    expect(resultIds).toContain("t4"); // Kino
    expect(resultIds).not.toContain("t1"); // Rihanna Russian Roulette
    expect(resultIds).not.toContain("t2"); // Red Velvet Russian Roulette
    expect(resultIds).not.toContain("t5"); // Sidhu Moose Wala
  });
});

