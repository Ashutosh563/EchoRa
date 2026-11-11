import { describe, it, expect, vi } from "vitest";
import { createSemanticReranker, isLanguageMatch } from "../../src/services/gemini/reranker.js";
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
  it("returns catalog-searchable Gemini song recommendations", async () => {
    const fakeClient: GeminiClient = {
      generateJson: vi.fn().mockResolvedValue(JSON.stringify({
        recommendations: [
          { title: "Falling Slowly", artist: "Glen Hansard" },
          { title: "Cherry Wine", artist: "Hozier" },
        ],
      })),
    };
    const reranker = createSemanticReranker(fakeClient);

    const recommendations = await reranker.suggestTrackRecommendations?.(
      "sad acoustic songs",
      mockIntent,
      [],
      62,
      false,
    );

    expect(recommendations).toEqual([
      { title: "Falling Slowly", artist: "Glen Hansard" },
      { title: "Cherry Wine", artist: "Hozier" },
    ]);
    expect(fakeClient.generateJson).toHaveBeenCalledWith(expect.objectContaining({
      jsonSchema: expect.objectContaining({ properties: expect.objectContaining({ recommendations: expect.any(Object) }) }),
    }));
  });

  it("returns Gemini match scores with the ordered tracks", async () => {
    const candidates = [makeTrack("t1", "Fast Rap"), makeTrack("t2", "Slow Ambient Piano")];
    const fakeClient: GeminiClient = {
      generateJson: vi.fn().mockResolvedValue(JSON.stringify({
        rankedTracks: [
          { id: "t2", matchReason: "Slow texture suits the request.", matchScore: 93 },
          { id: "t1", matchReason: "The mood and tempo are a weaker fit.", matchScore: 42 },
        ],
      })),
    };

    const result = await createSemanticReranker(fakeClient).rerank("slow calm piano", mockIntent, candidates);

    expect(result[0]).toMatchObject({ id: "t2", matchScore: 93 });
    expect(result[1]).toMatchObject({ id: "t1", matchScore: 42 });
  });

  it("suggests a bounded query refinement from low-scoring catalog results", async () => {
    const generateJson = vi.fn().mockResolvedValue(JSON.stringify({
      searchQueries: ['artist:"Arijit Singh" sad slow Hindi songs'],
    }));
    const fakeClient: GeminiClient = { generateJson };
    const reranker = createSemanticReranker(fakeClient);
    const intent = { ...mockIntent, artist: "Arijit Singh", language: "hindi" };

    const queries = await reranker.suggestRefinementQueries!(
      "Arijit Singh sad slow songs",
      intent,
      [{ ...makeTrack("t1", "Wrong Song"), matchScore: 32 }],
    );

    expect(queries).toEqual(['artist:"Arijit Singh" sad slow Hindi songs']);
    expect(generateJson.mock.calls[0]?.[0].userText).toContain('"originalUserPrompt":"Arijit Singh sad slow songs"');
    expect(generateJson.mock.calls[0]?.[0].systemInstruction).toContain("Never invent a replacement artist");
  });

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

  describe("Explicit Artist & 'Dil Raaz' Curation Rules", () => {
    it("allocates top 5 to requested artist (Dil Raaz) and remaining 5 to vibe companions", async () => {
      const candidates: Track[] = [
        // 6 tracks by Dil Raaz
        { ...makeTrack("dr1", "Dil Deewane"), artists: ["Dil Raaz"] },
        { ...makeTrack("dr2", "Tanhai Ke Lamhe"), artists: ["Dil Raaz"] },
        { ...makeTrack("dr3", "Khushboo Teri"), artists: ["Dil Raaz"] },
        { ...makeTrack("dr4", "Raste Juda"), artists: ["Dil Raaz"] },
        { ...makeTrack("dr5", "Yaad Aayi"), artists: ["Dil Raaz"] },
        { ...makeTrack("dr6", "Ek Ehsaas"), artists: ["Dil Raaz"] },
        // Companion tracks in same vibe (Sachin-Jigar, Papon, Mohit Chauhan)
        { ...makeTrack("c1", "Jeena Jeena"), artists: ["Sachin-Jigar"] },
        { ...makeTrack("c2", "Moh Moh Ke Dhaage"), artists: ["Papon"] },
        { ...makeTrack("c3", "Tum Ho"), artists: ["Mohit Chauhan"] },
        { ...makeTrack("c4", "Saibo"), artists: ["Sachin-Jigar"] },
        { ...makeTrack("c5", "Phir Se Ud Chala"), artists: ["Mohit Chauhan"] },
      ];

      const fakeClient: GeminiClient = {
        generateJson: vi.fn().mockResolvedValue(
          JSON.stringify({
            rankedTracks: candidates.map((t) => ({ id: t.id, matchReason: "Matches emotional vibe." })),
          }),
        ),
      };

      const reranker = createSemanticReranker(fakeClient);
      const intent: MusicIntent = {
        ...mockIntent,
        mood: "romantic",
        language: "hindi",
        artist: "Dil Raaz",
      };

      const result = await reranker.rerank("songs by Dil Raaz", intent, candidates);

      expect(result.length).toBe(10);
      // Top 5 tracks must belong to Dil Raaz
      const top5Artists = result.slice(0, 5).map((t) => t.artists[0]);
      expect(top5Artists.every((a) => a === "Dil Raaz")).toBe(true);

      // Remaining tracks must be companion tracks from vibe peers
      const bottom5Artists = result.slice(5, 10).map((t) => t.artists[0]);
      expect(bottom5Artists).toContain("Sachin-Jigar");
      expect(bottom5Artists).toContain("Papon");
      expect(bottom5Artists).toContain("Mohit Chauhan");
    });

    it("ensures 'only Dil Raaz' prompt fills 100% of the playlist with Dil Raaz", async () => {
      const candidates: Track[] = [
        { ...makeTrack("dr1", "Song 1"), artists: ["Dil Raaz"] },
        { ...makeTrack("dr2", "Song 2"), artists: ["Dil Raaz"] },
        { ...makeTrack("dr3", "Song 3"), artists: ["Dil Raaz"] },
        { ...makeTrack("dr4", "Song 4"), artists: ["Dil Raaz"] },
        { ...makeTrack("dr5", "Song 5"), artists: ["Dil Raaz"] },
        { ...makeTrack("dr6", "Song 6"), artists: ["Dil Raaz"] },
        { ...makeTrack("dr7", "Song 7"), artists: ["Dil Raaz"] },
        { ...makeTrack("dr8", "Song 8"), artists: ["Dil Raaz"] },
        { ...makeTrack("dr9", "Song 9"), artists: ["Dil Raaz"] },
        { ...makeTrack("dr10", "Song 10"), artists: ["Dil Raaz"] },
        { ...makeTrack("c1", "Peer Track"), artists: ["Papon"] },
      ];

      const fakeClient: GeminiClient = {
        generateJson: vi.fn().mockResolvedValue(
          JSON.stringify({
            rankedTracks: candidates.map((t) => ({ id: t.id, matchReason: "Catalog match." })),
          }),
        ),
      };

      const reranker = createSemanticReranker(fakeClient);
      const intent: MusicIntent = {
        ...mockIntent,
        mood: "romantic",
        language: "hindi",
        artist: "Dil Raaz",
      };

      const result = await reranker.rerank("only songs by Dil Raaz", intent, candidates);

      expect(result.length).toBe(10);
      expect(result.every((t) => t.artists.includes("Dil Raaz"))).toBe(true);
      expect(result.some((t) => t.artists.includes("Papon"))).toBe(false);
    });

    it("puts specific song title at Rank #1 when requested with artist", async () => {
      const candidates: Track[] = [
        { ...makeTrack("dr1", "Normal Dil Raaz Track"), artists: ["Dil Raaz"] },
        { ...makeTrack("dr2", "Mulaqat (Special Acoustic)"), artists: ["Dil Raaz"] },
        { ...makeTrack("dr3", "Another Track"), artists: ["Dil Raaz"] },
        { ...makeTrack("c1", "Companion Song"), artists: ["Papon"] },
      ];

      const fakeClient: GeminiClient = {
        generateJson: vi.fn().mockResolvedValue(
          JSON.stringify({
            rankedTracks: candidates.map((t) => ({ id: t.id, matchReason: "Fit" })),
          }),
        ),
      };

      const reranker = createSemanticReranker(fakeClient);
      const intent: MusicIntent = {
        ...mockIntent,
        trackTitle: "Mulaqat",
        artist: "Dil Raaz",
      };

      const result = await reranker.rerank("Mulaqat by Dil Raaz", intent, candidates);

      expect(result[0]?.name).toBe("Mulaqat (Special Acoustic)");
      expect(result[0]?.artists[0]).toBe("Dil Raaz");
    });

    it("allocates tracks between multiple requested artists and prioritizes mutual duets (Edge Case A)", async () => {
      const candidates: Track[] = [
        { ...makeTrack("collab1", "Challa (Collab)"), artists: ["Diljit Dosanjh", "Karan Aujla"] },
        { ...makeTrack("d1", "G.O.A.T."), artists: ["Diljit Dosanjh"] },
        { ...makeTrack("d2", "Lover"), artists: ["Diljit Dosanjh"] },
        { ...makeTrack("d3", "Born to Shine"), artists: ["Diljit Dosanjh"] },
        { ...makeTrack("k1", "Softly"), artists: ["Karan Aujla"] },
        { ...makeTrack("k2", "White Brown Black"), artists: ["Karan Aujla"] },
        { ...makeTrack("k3", "Admirin' You"), artists: ["Karan Aujla"] },
        { ...makeTrack("c1", "Companion 1"), artists: ["Sidhu Moose Wala"] },
        { ...makeTrack("c2", "Companion 2"), artists: ["AP Dhillon"] },
        { ...makeTrack("c3", "Companion 3"), artists: ["Shubh"] },
        { ...makeTrack("c4", "Companion 4"), artists: ["Gurinder Gill"] },
      ];

      const fakeClient: GeminiClient = {
        generateJson: vi.fn().mockResolvedValue(
          JSON.stringify({
            rankedTracks: candidates.map((t) => ({ id: t.id, matchReason: "Fit" })),
          }),
        ),
      };

      const reranker = createSemanticReranker(fakeClient);
      const intent: MusicIntent = {
        ...mockIntent,
        artist: "Diljit Dosanjh and Karan Aujla",
        language: "punjabi",
      };

      const result = await reranker.rerank("songs by Diljit Dosanjh and Karan Aujla", intent, candidates);

      expect(result.length).toBe(10);
      // Joint collaboration should be ranked first
      expect(result[0].id).toBe("collab1");

      const diljitTracks = result.filter((t) => t.artists.includes("Diljit Dosanjh"));
      const karanTracks = result.filter((t) => t.artists.includes("Karan Aujla"));
      expect(diljitTracks.length).toBeGreaterThanOrEqual(3);
      expect(karanTracks.length).toBeGreaterThanOrEqual(3);

      // Remaining tracks come from companion peers
      const companionTracks = result.filter(
        (t) => !t.artists.includes("Diljit Dosanjh") && !t.artists.includes("Karan Aujla"),
      );
      expect(companionTracks.length).toBeGreaterThanOrEqual(3);
    });

    it("rejects foreign homonym tracks sharing the same artist name on regional queries (Edge Case B)", async () => {
      const candidates: Track[] = [
        { ...makeTrack("in1", "1 Se 23"), artists: ["Karma"] },
        { ...makeTrack("in2", "Fateh"), artists: ["Karma", "Raftaar"] },
        { ...makeTrack("fi1", "Hyvää Päivää"), artists: ["Karma"], album: "Finnish Rock Classics" },
        { ...makeTrack("fi2", "Helsinki Nights"), artists: ["Karma"], album: "Suomi Pop Hits" },
        { ...makeTrack("c1", "Aathma Raama"), artists: ["Brodha V"] },
        { ...makeTrack("c2", "Kohinoor"), artists: ["DIVINE"] },
      ];

      const fakeClient: GeminiClient = {
        generateJson: vi.fn().mockResolvedValue(
          JSON.stringify({
            rankedTracks: candidates.map((t) => ({ id: t.id, matchReason: "Hip hop match" })),
          }),
        ),
      };

      const reranker = createSemanticReranker(fakeClient);
      const intent: MusicIntent = {
        ...mockIntent,
        artist: "Karma",
        language: "hindi",
        genre: ["hip hop"],
      };

      const result = await reranker.rerank("hindi hip hop songs by Karma", intent, candidates);
      const resultIds = result.map((t) => t.id);

      // Indian Karma tracks accepted
      expect(resultIds).toContain("in1");
      expect(resultIds).toContain("in2");

      // Finnish Karma tracks rejected by disambiguation guard
      expect(resultIds).not.toContain("fi1");
      expect(resultIds).not.toContain("fi2");
    });

    it("strictly returns small discography without pulling unwanted artists on 'only' prompt (Edge Case C)", async () => {
      const candidates: Track[] = [
        { ...makeTrack("indie1", "First Song"), artists: ["Underground Indie Artist"] },
        { ...makeTrack("indie2", "Second Song"), artists: ["Underground Indie Artist"] },
        { ...makeTrack("indie3", "Third Song"), artists: ["Underground Indie Artist"] },
        { ...makeTrack("other1", "Popular Song 1"), artists: ["Arijit Singh"] },
        { ...makeTrack("other2", "Popular Song 2"), artists: ["Pritam"] },
      ];

      const fakeClient: GeminiClient = {
        generateJson: vi.fn().mockResolvedValue(
          JSON.stringify({
            rankedTracks: candidates.map((t) => ({ id: t.id, matchReason: "Fit" })),
          }),
        ),
      };

      const reranker = createSemanticReranker(fakeClient);
      const intent: MusicIntent = {
        ...mockIntent,
        artist: "Underground Indie Artist",
      };

      const result = await reranker.rerank("only Underground Indie Artist", intent, candidates);

      // Should return strictly the 3 songs that exist, never pulling Arijit Singh or Pritam
      expect(result.length).toBe(3);
      expect(result.every((t) => t.artists.includes("Underground Indie Artist"))).toBe(true);
      expect(result[0].matchReason).toContain("complete discography");
    });

    it("matches lowercase and punctuation-variant indie artists (e.g. 'dilraaz' -> 'Dil Raaz', 'krsna' -> 'KR$NA')", async () => {
      const candidates: Track[] = [
        { ...makeTrack("dr1", "Dil Ki Baat"), artists: ["Dil Raaz"] },
        { ...makeTrack("dr2", "Tanhai"), artists: ["Dil Raaz"] },
        { ...makeTrack("kr1", "Vyanjan"), artists: ["KR$NA"] },
        { ...makeTrack("c1", "Peer Track"), artists: ["Papon"] },
      ];

      const fakeClient: GeminiClient = {
        generateJson: vi.fn().mockResolvedValue(
          JSON.stringify({
            rankedTracks: candidates.map((t) => ({ id: t.id, matchReason: "Fit" })),
          }),
        ),
      };

      const reranker = createSemanticReranker(fakeClient);

      // Test 1: "dilraaz" lowercase without space matches "Dil Raaz"
      const resultDilraaz = await reranker.rerank(
        "songs by dilraaz",
        { ...mockIntent, artist: "dilraaz" },
        candidates,
      );
      expect(resultDilraaz[0].artists[0]).toBe("Dil Raaz");

      // Test 2: "krsna" without dollar symbol matches "KR$NA"
      const resultKrsna = await reranker.rerank(
        "songs by krsna",
        { ...mockIntent, artist: "krsna" },
        candidates,
      );
      expect(resultKrsna[0].artists[0]).toBe("KR$NA");
    });

    it("preserves strict general mood diversity when no artist is searched (e.g. 'chill songs by the ocean')", async () => {
      // 5 tracks from one artist, 4 from others
      const candidates: Track[] = [
        { ...makeTrack("a1", "Ocean Breeze 1"), artists: ["The Waves"] },
        { ...makeTrack("a2", "Ocean Breeze 2"), artists: ["The Waves"] },
        { ...makeTrack("a3", "Ocean Breeze 3"), artists: ["The Waves"] },
        { ...makeTrack("a4", "Ocean Breeze 4"), artists: ["The Waves"] },
        { ...makeTrack("b1", "Tide Song"), artists: ["Sea Spray"] },
        { ...makeTrack("b2", "Coastline"), artists: ["Sea Spray"] },
        { ...makeTrack("c1", "Seaside"), artists: ["Coastal Acoustic"] },
        { ...makeTrack("c2", "Dunes"), artists: ["Coastal Acoustic"] },
        { ...makeTrack("d1", "Shore"), artists: ["Pacific Calm"] },
      ];

      const fakeClient: GeminiClient = {
        generateJson: vi.fn().mockResolvedValue(
          JSON.stringify({
            rankedTracks: candidates.map((t) => ({ id: t.id, matchReason: "Ocean chill vibe" })),
          }),
        ),
      };

      const reranker = createSemanticReranker(fakeClient);
      const generalIntent: MusicIntent = {
        ...mockIntent,
        mood: "calm",
        artist: undefined, // No artist! General mood search
      };

      const result = await reranker.rerank("chill songs by the ocean", generalIntent, candidates);

      // Must strictly cap "The Waves" to maximum 2 tracks (preserving general mood multi-artist diversity)
      const wavesTracks = result.filter((t) => t.artists.includes("The Waves"));
      expect(wavesTracks.length).toBeLessThanOrEqual(2);
      expect(result.length).toBeGreaterThanOrEqual(7);
    });

    it("Edge Case E: preserves regional indie tracks with English titles under Hindi context (code-switching)", () => {
      // 1. Regional indie artists with English or alphanumeric titles must PASS under Hindi context
      const krsnaTrack: Track = {
        ...makeTrack("k1", "Say My Name"),
        artists: ["KR$NA"],
      };
      const tabaTrack: Track = {
        ...makeTrack("t1", "Walk With Me"),
        artists: ["Taba Chake"],
      };
      const dilRaazTrack: Track = {
        ...makeTrack("d1", "Still In Love"),
        artists: ["Dil Raaz", "Skyd 6ix"],
      };
      const seedheMautTrack: Track = {
        ...makeTrack("s1", "101"),
        artists: ["Seedhe Maut"],
      };

      expect(isLanguageMatch(krsnaTrack, "hindi")).toBe(true);
      expect(isLanguageMatch(tabaTrack, "hindi")).toBe(true);
      expect(isLanguageMatch(dilRaazTrack, "hindi")).toBe(true);
      expect(isLanguageMatch(seedheMautTrack, "hindi")).toBe(true);

      // 2. Pure Western artists must still be blocked under Hindi context
      const drakeTrack: Track = {
        ...makeTrack("w1", "God's Plan"),
        artists: ["Drake"],
      };
      expect(isLanguageMatch(drakeTrack, "hindi")).toBe(false);

      // 3. Regional indie artists must NOT leak into foreign language queries (e.g. Spanish)
      expect(isLanguageMatch(krsnaTrack, "spanish")).toBe(false);

      // 4. English queries accept English indie tracks freely
      const clairoTrack: Track = {
        ...makeTrack("c1", "Sofia"),
        artists: ["Clairo"],
      };
      expect(isLanguageMatch(clairoTrack, "english")).toBe(true);
    });
  });
});

