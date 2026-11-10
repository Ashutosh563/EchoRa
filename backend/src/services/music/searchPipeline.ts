import type { MusicIntent } from "../../types/intent.js";
import type { Track } from "../../types/track.js";
import type { SearchResponse } from "../../types/api.js";
import type { DiscoveryContext } from "../../types/discovery.js";
import type { IntentExtractor } from "../gemini/intentExtractor.js";
import type { SpotifySearch } from "../spotify/spotifySearch.js";
import { generateQueries } from "./queryGenerator.js";
import { defaultDiscoveryProcessor } from "./discoveryProcessor.js";
import { BACKEND_MOCK_TRACKS, getMockIntent } from "./mockMusic.js";
import { fuseTrackLists, getSongSignature } from "./fusion.js";
import { createSemanticReranker, type SemanticReranker } from "../gemini/reranker.js";
import { logger } from "../../utils/logger.js";

export interface SearchPipelineOptions {
  intentExtractor: IntentExtractor | null;
  spotifySearch: SpotifySearch | null;
  reranker?: SemanticReranker | null;
}

export function cleanSpotifyQuery(q: string, lang?: string | null): string {
  let cleaned = q.replace(/\bNOT\s+("[^"]*"|[^\s]+)/gi, "").trim();
  cleaned = cleaned.replace(/genre:"bollywood"/gi, "bollywood");
  cleaned = cleaned.replace(/genre:bollywood/gi, "bollywood");
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  if (!lang) return cleaned;
  const normalizedLang = lang.toLowerCase().trim();

  if (normalizedLang === "spanish" || normalizedLang === "latin") {
    // Translate English search words to Spanish so Spotify finds authentic Spanish tracks
    cleaned = cleaned
      .replace(/\bheartbreak\b/gi, "desamor")
      .replace(/\bbreakup\b/gi, "desamor")
      .replace(/\bsad\b/gi, "triste")
      .replace(/\bacoustic\b/gi, "acustico")
      .replace(/\s+/g, " ")
      .trim();

    if (
      !cleaned.toLowerCase().includes("spanish") &&
      !cleaned.toLowerCase().includes("espanol") &&
      !cleaned.toLowerCase().includes("español") &&
      !cleaned.toLowerCase().includes("latin")
    ) {
      cleaned = `spanish ${cleaned}`;
    }
  } else if (normalizedLang === "hindi" || normalizedLang === "bollywood") {
    cleaned = cleaned
      .replace(/\bbreakup\b/gi, "heartbreak")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleaned.toLowerCase().includes("hindi") && !cleaned.toLowerCase().includes("bollywood")) {
      cleaned = `bollywood ${cleaned}`;
    }
  } else if (normalizedLang === "russian") {
    if (!cleaned.toLowerCase().includes("russian") && !cleaned.toLowerCase().includes("русский")) {
      cleaned = `russian ${cleaned}`;
    }
  } else if (normalizedLang === "punjabi") {
    if (!cleaned.toLowerCase().includes("punjabi")) {
      cleaned = `punjabi ${cleaned}`;
    }
  } else if (normalizedLang === "japanese") {
    if (
      !cleaned.toLowerCase().includes("japanese") &&
      !cleaned.toLowerCase().includes("j-pop") &&
      !cleaned.toLowerCase().includes("japan")
    ) {
      cleaned = `japanese ${cleaned}`;
    }
  } else if (normalizedLang === "korean") {
    if (
      !cleaned.toLowerCase().includes("korean") &&
      !cleaned.toLowerCase().includes("k-pop") &&
      !cleaned.toLowerCase().includes("kpop")
    ) {
      cleaned = `korean ${cleaned}`;
    }
  } else if (normalizedLang === "french") {
    if (
      !cleaned.toLowerCase().includes("french") &&
      !cleaned.toLowerCase().includes("francais") &&
      !cleaned.toLowerCase().includes("français")
    ) {
      cleaned = `french ${cleaned}`;
    }
  } else if (normalizedLang === "tamil") {
    if (!cleaned.toLowerCase().includes("tamil")) {
      cleaned = `tamil ${cleaned}`;
    }
  } else if (normalizedLang === "telugu") {
    if (!cleaned.toLowerCase().includes("telugu")) {
      cleaned = `telugu ${cleaned}`;
    }
  } else if (normalizedLang === "german") {
    if (!cleaned.toLowerCase().includes("german") && !cleaned.toLowerCase().includes("deutsch")) {
      cleaned = `german ${cleaned}`;
    }
  } else if (normalizedLang === "italian") {
    if (!cleaned.toLowerCase().includes("italian") && !cleaned.toLowerCase().includes("italiano")) {
      cleaned = `italian ${cleaned}`;
    }
  } else if (normalizedLang === "portuguese") {
    if (
      !cleaned.toLowerCase().includes("portuguese") &&
      !cleaned.toLowerCase().includes("brasil") &&
      !cleaned.toLowerCase().includes("brazil")
    ) {
      cleaned = `portuguese ${cleaned}`;
    }
  } else if (normalizedLang !== "english" && !cleaned.toLowerCase().includes(normalizedLang)) {
    cleaned = `${normalizedLang} ${cleaned}`;
  }
  return cleaned;
}

export function createSearchPipeline({
  intentExtractor,
  spotifySearch,
  reranker,
}: SearchPipelineOptions) {
  const activeReranker = reranker ?? createSemanticReranker(null);

  return {
    async interpret(
      prompt: string,
      mode: "mock" | "live",
      discoveryContext?: DiscoveryContext,
      signal?: AbortSignal,
    ): Promise<{ mode: "mock" | "live"; intent: MusicIntent; notice?: string }> {
      const fallbackContext: DiscoveryContext = discoveryContext ?? {
        discoveryMode: "FAMILIAR",
        preferences: { favoriteGenres: [], favoriteArtists: [], dislikedGenres: [], dislikedArtists: [] },
        rawPrompt: prompt,
      };

      if (mode === "mock" || !intentExtractor) {
        const rawIntent = getMockIntent(prompt);
        const discoveryResult = defaultDiscoveryProcessor.process(fallbackContext, rawIntent);
        return {
          mode: "mock",
          intent: discoveryResult.adjustedIntent,
          notice: "Interpreted using mock simulation (Gemini not configured or unavailable).",
        };
      }
      const rawIntent = await intentExtractor(prompt, signal, fallbackContext);
      const discoveryResult = defaultDiscoveryProcessor.process(fallbackContext, rawIntent);
      return {
        mode: "live",
        intent: discoveryResult.adjustedIntent,
      };
    },

    async search(
      prompt: string,
      mode: "mock" | "live",
      missingReasons: string[],
      discoveryContext?: DiscoveryContext,
      signal?: AbortSignal,
    ): Promise<SearchResponse> {
      const fallbackContext: DiscoveryContext = discoveryContext ?? {
        discoveryMode: "FAMILIAR",
        preferences: { favoriteGenres: [], favoriteArtists: [], dislikedGenres: [], dislikedArtists: [] },
        rawPrompt: prompt,
      };

      if (mode === "mock" || !intentExtractor || !spotifySearch) {
        const rawIntent = getMockIntent(prompt);
        const discoveryResult = defaultDiscoveryProcessor.process(fallbackContext, rawIntent);
        const queries = generateQueries(discoveryResult.adjustedIntent, discoveryResult);
        const notice = missingReasons.length > 0 
          ? `Operating in Mock Mode: ${missingReasons.join(" ")}`
          : "Operating in Mock Mode with sample tracks.";
        return {
          mode: "mock",
          discoveryMode: discoveryResult.mode,
          intent: discoveryResult.adjustedIntent,
          queries,
          tracks: BACKEND_MOCK_TRACKS,
          notice,
        };
      }

      // Live mode
      // 1. Gemini extracts intent and 3 specialized Spotify queries with mode awareness
      const rawIntent = await intentExtractor(prompt, signal, fallbackContext);

      // 2. Discovery Preference Processor processes preferences & mode
      const discoveryResult = defaultDiscoveryProcessor.process(fallbackContext, rawIntent);
      const activeIntent = discoveryResult.adjustedIntent;

      // 3. Synthesize queries: use Gemini's multiQueries if present; fallback to queryGenerator
      const baseQueries = generateQueries(activeIntent, discoveryResult);
      const queryList: string[] = [];

      if (activeIntent.multiQueries) {
        if (activeIntent.multiQueries.moodQuery) queryList.push(activeIntent.multiQueries.moodQuery);
        if (activeIntent.multiQueries.genreQuery) queryList.push(activeIntent.multiQueries.genreQuery);
        if (activeIntent.multiQueries.contextQuery) queryList.push(activeIntent.multiQueries.contextQuery);
      }
      if (queryList.length === 0) {
        queryList.push(baseQueries.primary);
      }

      // If user specifically requested a song title, ensure exact song search query is prioritized
      if (activeIntent.trackTitle) {
        const titleQuery = activeIntent.artist
          ? `${activeIntent.trackTitle} ${activeIntent.artist}`
          : activeIntent.trackTitle;
        if (!queryList.some((q) => q.toLowerCase().includes(activeIntent.trackTitle!.toLowerCase()))) {
          queryList.unshift(titleQuery);
        }
      }



      const finalizedQueries = queryList.map((q) => cleanSpotifyQuery(q, activeIntent.language));
      const masterQueryStr = cleanSpotifyQuery(
        activeIntent.multiQueries?.masterQuery || baseQueries.primary,
        activeIntent.language,
      );

      // 4. Parallel Spotify Retrieval across query facets (25 tracks per facet = up to 75 candidates)
      const searchPromises = finalizedQueries.map(async (q) => {
        try {
          const tracks = await spotifySearch.searchTracks(q, 25, signal);
          logger.info(`[SpotifySearch] Query "${q}" returned ${tracks.length} tracks. Top: ${tracks.slice(0, 3).map(t => t.name).join(", ")}`);
          return tracks;
        } catch (err) {
          logger.warn(`Spotify search for "${q}" failed:`, err);
          return [] as Track[];
        }
      });
      const rawTrackLists = await Promise.all(searchPromises);

      // 5. In-Memory Reciprocal Rank Fusion (< 2ms)
      let fusedCandidates = fuseTrackLists(rawTrackLists, { maxCandidates: 50 });

      // Safety fallback: if fused candidates are sparse (< 15), search master query
      if (fusedCandidates.length < 15) {
        try {
          logger.info(`[SpotifySearch] Candidate pool sparse (${fusedCandidates.length}). Executing master fallback: "${masterQueryStr}"`);
          const fallbackTracks = await spotifySearch.searchTracks(masterQueryStr, 25, signal);
          const seenIds = new Set(fusedCandidates.map((t) => t.id));
          for (const t of fallbackTracks) {
            if (!seenIds.has(t.id)) {
              fusedCandidates.push(t);
              seenIds.add(t.id);
            }
          }
        } catch (err) {
          logger.warn(`[SpotifySearch] Master fallback search for "${masterQueryStr}" failed:`, err);
        }
      }

      const candidatesToUse = fusedCandidates.length > 0 ? fusedCandidates : BACKEND_MOCK_TRACKS.slice(0, 10);

      // 6. Gemini Semantic Reranker (with safety timeout and mode awareness)
      const finalTracks = await activeReranker.rerank(
        prompt,
        activeIntent,
        candidatesToUse,
        discoveryResult.mode,
        signal,
      );

      return {
        mode: "live",
        discoveryMode: discoveryResult.mode,
        intent: activeIntent,
        queries: {
          primary: masterQueryStr,
          alternatives: finalizedQueries,
        },
        tracks: finalTracks,
      };
    },

    async loadMore(params: {
      prompt: string;
      intent: MusicIntent;
      page: number;
      excludeTrackIds: string[];
      excludeSongSignatures?: string[];
      cumulativeArtistCounts?: Record<string, number>;
      mode: "mock" | "live";
      discoveryContext?: DiscoveryContext;
      signal?: AbortSignal;
    }): Promise<{
      page: number;
      tracks: Track[];
      hasMore: boolean;
      queriesUsed: string[];
    }> {
      const {
        prompt,
        intent,
        page,
        excludeTrackIds = [],
        excludeSongSignatures = [],
        cumulativeArtistCounts = {},
        mode,
        discoveryContext,
        signal,
      } = params;

      const excludeIdSet = new Set(excludeTrackIds);
      const excludeSigSet = new Set(excludeSongSignatures);

      if (mode === "mock" || !spotifySearch) {
        const available = BACKEND_MOCK_TRACKS.filter((t) => !excludeIdSet.has(t.id));
        const remainingSlots = Math.max(0, 25 - excludeTrackIds.length);
        const batchSize = Math.min(5, remainingSlots);
        const nextBatch = available.slice(0, batchSize);
        const totalAfter = excludeTrackIds.length + nextBatch.length;
        return {
          page,
          tracks: nextBatch,
          hasMore: totalAfter < 25 && available.length > batchSize,
          queriesUsed: ["mock-load-more"],
        };
      }

      // Live mode: 4-Tier Page Candidate Mining
      const queryList: { query: string; offset: number }[] = [];

      if (page === 2) {
        // Tier 2: Mood context, curator nuance, and genre offset
        if (intent.multiQueries?.contextQuery) {
          queryList.push({ query: intent.multiQueries.contextQuery, offset: 0 });
        }
        if (intent.multiQueries?.curatorQuery) {
          queryList.push({ query: intent.multiQueries.curatorQuery, offset: 0 });
        }
        if (intent.multiQueries?.genreQuery) {
          queryList.push({ query: intent.multiQueries.genreQuery, offset: 10 });
        }
        if (intent.multiQueries?.moodQuery) {
          queryList.push({ query: intent.multiQueries.moodQuery, offset: 10 });
        }
      } else if (page === 3) {
        // Tier 3: Subgenres or deep decade boundaries
        if (intent.subgenres && intent.subgenres.length > 0) {
          for (const sg of intent.subgenres.slice(0, 3)) {
            queryList.push({ query: `${sg} ${intent.language || ""}`.trim(), offset: 0 });
          }
        }
        if (intent.multiQueries?.genreQuery) {
          queryList.push({ query: intent.multiQueries.genreQuery, offset: 20 });
        }
        if (intent.multiQueries?.contextQuery) {
          queryList.push({ query: intent.multiQueries.contextQuery, offset: 10 });
        }
        if (intent.multiQueries?.masterQuery) {
          queryList.push({ query: intent.multiQueries.masterQuery, offset: 10 });
        }
      } else {
        // Tier 4+: Seed artists graph queries
        if (intent.seedArtists && intent.seedArtists.length >= 2) {
          const pair1 = `artist:"${intent.seedArtists[0]}" OR artist:"${intent.seedArtists[1]}"`;
          queryList.push({ query: pair1, offset: 0 });
          if (intent.seedArtists.length >= 4) {
            const pair2 = `artist:"${intent.seedArtists[2]}" OR artist:"${intent.seedArtists[3]}"`;
            queryList.push({ query: pair2, offset: 0 });
          }
        }
        if (intent.multiQueries?.masterQuery) {
          queryList.push({ query: intent.multiQueries.masterQuery, offset: (page - 1) * 10 });
        }
        if (intent.multiQueries?.moodQuery) {
          queryList.push({ query: intent.multiQueries.moodQuery, offset: 20 });
        }
      }

      if (queryList.length === 0) {
        queryList.push({ query: intent.multiQueries?.masterQuery || prompt, offset: (page - 1) * 10 });
      }

      const finalizedQueries = queryList.map((item) => ({
        query: cleanSpotifyQuery(item.query, intent.language),
        offset: item.offset,
      }));

      // Parallel fetch from Spotify (25 tracks per query facet to ensure wide candidate pool)
      const searchPromises = finalizedQueries.map(async ({ query, offset }) => {
        try {
          return await spotifySearch.searchTracks(query, 25, signal, offset);
        } catch (err) {
          logger.warn(`[LoadMore] Spotify search for "${query}" failed:`, err);
          return [] as Track[];
        }
      });

      const trackLists = await Promise.all(searchPromises);
      let rawCandidates: Track[] = [];
      const seenRawIds = new Set<string>();

      for (const list of trackLists) {
        for (const t of list) {
          if (!seenRawIds.has(t.id)) {
            seenRawIds.add(t.id);
            rawCandidates.push(t);
          }
        }
      }

      // Cascade Fallback Buffer: If candidate pool has < 30 tracks after exclusion filtering, widen retrieval
      const filteredCount = rawCandidates.filter(
        (t) => !excludeIdSet.has(t.id) && !excludeSigSet.has(getSongSignature(t)),
      ).length;

      // Detect if the candidate pool belongs to a tight niche micro-scene (< 12 unique artists)
      const rawUniqueArtists = new Set<string>();
      for (const t of rawCandidates) {
        if (t.artists?.[0]) rawUniqueArtists.add(t.artists[0].toLowerCase().trim());
      }
      const isNicheScene = rawUniqueArtists.size > 0 && rawUniqueArtists.size < 12;

      if (filteredCount < 30) {
        try {
          // If niche micro-scene has seed artists, query authentic scene artists first
          if (isNicheScene && intent.seedArtists && intent.seedArtists.length >= 2) {
            const seedQuery = intent.seedArtists.length >= 4 && page % 2 === 0
              ? `artist:"${intent.seedArtists[2]}" OR artist:"${intent.seedArtists[3]}"`
              : `artist:"${intent.seedArtists[0]}" OR artist:"${intent.seedArtists[1]}"`;
            logger.info(`[LoadMore] Niche micro-scene sparse (${filteredCount} tracks, ${rawUniqueArtists.size} artists). Querying seed artist network: "${seedQuery}"`);
            const seedTracks = await spotifySearch.searchTracks(seedQuery, 25, signal, 0);
            for (const t of seedTracks) {
              if (!seenRawIds.has(t.id)) {
                seenRawIds.add(t.id);
                rawCandidates.push(t);
              }
            }
          }

          // Fallback to master query if still low
          if (rawCandidates.filter((t) => !excludeIdSet.has(t.id) && !excludeSigSet.has(getSongSignature(t))).length < 25) {
            const fallbackQuery = cleanSpotifyQuery(
              intent.multiQueries?.masterQuery || intent.multiQueries?.moodQuery || prompt,
              intent.language,
            );
            logger.info(`[LoadMore] Pool low (${filteredCount} tracks). Triggering cascade fallback: "${fallbackQuery}"`);
            const cascadeTracks = await spotifySearch.searchTracks(fallbackQuery, 25, signal, page * 10);
            for (const t of cascadeTracks) {
              if (!seenRawIds.has(t.id)) {
                seenRawIds.add(t.id);
                rawCandidates.push(t);
              }
            }
          }
        } catch (err) {
          logger.warn("[LoadMore] Cascade fallback failed:", err);
        }
      }

      // Deduplicate against history and active session
      const candidatesToRerank = rawCandidates.filter(
        (t) => !excludeIdSet.has(t.id) && !excludeSigSet.has(getSongSignature(t)),
      );

      // Re-evaluate artist density on deduplicated candidates
      const rerankUniqueArtists = new Set<string>();
      for (const t of candidatesToRerank) {
        if (t.artists?.[0]) rerankUniqueArtists.add(t.artists[0].toLowerCase().trim());
      }
      // For tight niche micro-scenes on deep pages (Page 3/4), gracefully adapt maxPerArtist from 2 to 3
      // For popular/dense scenes (rerankUniqueArtists >= 12), artist cap stays strictly at 2 (100% untouched)
      const dynamicMaxPerArtist = (rerankUniqueArtists.size > 0 && rerankUniqueArtists.size < 12 && page >= 3) ? 3 : 2;

      // Gemini Call 2 Reranker with dynamic artist limits
      const rerankedTracks = await activeReranker.rerank(
        prompt,
        intent,
        candidatesToRerank,
        discoveryContext?.discoveryMode ?? "FAMILIAR",
        signal,
        undefined,
        {
          cumulativeArtistCounts,
          maxCumulativePerArtist: 6,
          maxPerArtist: dynamicMaxPerArtist,
          excludeTrackIds: excludeIdSet,
          excludeSignatures: excludeSigSet,
        },
      );

      // Enforce clean 5-track batch size and hard session ceiling of 25 tracks
      const remainingSlots = Math.max(0, 25 - excludeTrackIds.length);
      const batchSize = Math.min(5, remainingSlots);
      const finalTracks = rerankedTracks.slice(0, batchSize);
      const totalAfter = excludeTrackIds.length + finalTracks.length;
      const hasMore = totalAfter < 25 && finalTracks.length > 0;

      return {
        page,
        tracks: finalTracks,
        hasMore,
        queriesUsed: finalizedQueries.map((q) => q.query),
      };
    },

    async refineVibe(params: {
      prompt: string;
      intent: MusicIntent;
      refinement: {
        type: string;
        label: string;
        delta?: string;
      };
      mode: "mock" | "live";
      discoveryContext?: DiscoveryContext;
      signal?: AbortSignal;
    }): Promise<{
      intent: MusicIntent;
      tracks: Track[];
    }> {
      const { prompt, intent, refinement, mode, discoveryContext, signal } = params;

      // 1. Clone intent: Base mood, language, era, artists, and primary genre stay locked
      const refinedIntent: MusicIntent = JSON.parse(JSON.stringify(intent));
      const type = (refinement.type || "").toLowerCase();
      const deltaText = refinement.delta || "";

      // 2. Apply subtle sonic delta nudge without hijacking the foundational mood or genre
      if (type === "acoustic") {
        refinedIntent.sonicProfile = {
          ...refinedIntent.sonicProfile,
          production: "warm organic acoustic unplugged",
          instruments: [...(refinedIntent.sonicProfile?.instruments || []), "acoustic guitar", "unplugged"],
        };
        if (refinedIntent.multiQueries) {
          refinedIntent.multiQueries.moodQuery = `${refinedIntent.multiQueries.moodQuery} acoustic unplugged`.trim();
          refinedIntent.multiQueries.masterQuery = `${refinedIntent.multiQueries.masterQuery || ""} acoustic`.trim();
        }
      } else if (type === "darker") {
        refinedIntent.sonicProfile = {
          ...refinedIntent.sonicProfile,
          harmonicMode: "minor",
          emotionalSubtext: "deep melancholy, gloom, dark haunting textures",
        };
        if (refinedIntent.multiQueries) {
          refinedIntent.multiQueries.contextQuery = `${refinedIntent.multiQueries.contextQuery} dark minor`.trim();
        }
      } else if (type === "energetic") {
        refinedIntent.energy = "high";
        refinedIntent.sonicProfile = {
          ...refinedIntent.sonicProfile,
          tempoDescription: "fast driving energetic rhythmic cadence",
        };
        if (refinedIntent.multiQueries) {
          refinedIntent.multiQueries.moodQuery = `${refinedIntent.multiQueries.moodQuery} fast uptempo driving`.trim();
        }
      } else if (type === "calmer") {
        refinedIntent.energy = "low";
        refinedIntent.tempo = "slow";
        refinedIntent.sonicProfile = {
          ...refinedIntent.sonicProfile,
          tempoDescription: "slow gentle soothing ambient downtempo cadence",
        };
        if (refinedIntent.multiQueries) {
          refinedIntent.multiQueries.moodQuery = `${refinedIntent.multiQueries.moodQuery} slow calm ambient`.trim();
        }
      } else if (type === "vintage") {
        refinedIntent.sonicProfile = {
          ...refinedIntent.sonicProfile,
          production: "retro vintage analog tape warmth nostalgia",
        };
        if (refinedIntent.multiQueries) {
          refinedIntent.multiQueries.genreQuery = `${refinedIntent.multiQueries.genreQuery} retro vintage`.trim();
        }
      } else {
        refinedIntent.sonicProfile = {
          ...refinedIntent.sonicProfile,
          production: `${refinedIntent.sonicProfile?.production || ""} ${deltaText}`.trim(),
        };
        if (refinedIntent.multiQueries) {
          refinedIntent.multiQueries.contextQuery = `${refinedIntent.multiQueries.contextQuery} ${deltaText}`.trim();
        }
      }

      if (mode === "mock" || !spotifySearch) {
        return {
          intent: refinedIntent,
          tracks: BACKEND_MOCK_TRACKS.slice(0, 10),
        };
      }

      // 3. Query Spotify using the refined sonic queries while preserving language and culture
      const queryList: string[] = [];
      if (refinedIntent.multiQueries?.moodQuery) queryList.push(refinedIntent.multiQueries.moodQuery);
      if (refinedIntent.multiQueries?.genreQuery) queryList.push(refinedIntent.multiQueries.genreQuery);
      if (refinedIntent.multiQueries?.contextQuery) queryList.push(refinedIntent.multiQueries.contextQuery);
      if (queryList.length === 0) {
        queryList.push(`${prompt} ${deltaText}`.trim());
      }

      const finalizedQueries = queryList.map((q) => cleanSpotifyQuery(q, refinedIntent.language));

      const searchPromises = finalizedQueries.map(async (q) => {
        try {
          return await spotifySearch.searchTracks(q, 25, signal);
        } catch (err) {
          logger.warn(`[RefineVibe] Spotify search for "${q}" failed:`, err);
          return [] as Track[];
        }
      });

      const trackLists = await Promise.all(searchPromises);
      const fusedCandidates = fuseTrackLists(trackLists, { maxCandidates: 50 });
      const candidatesToUse = fusedCandidates.length > 0 ? fusedCandidates : BACKEND_MOCK_TRACKS.slice(0, 10);

      // 4. Gemini Call 2 Reranker scores candidate tracks against the refined sonic coordinates
      const finalTracks = await activeReranker.rerank(
        prompt,
        refinedIntent,
        candidatesToUse,
        discoveryContext?.discoveryMode ?? "FAMILIAR",
        signal,
        undefined,
        {
          maxPerArtist: 2,
        },
      );

      return {
        intent: refinedIntent,
        tracks: finalTracks,
      };
    },
  };
}
