import type { MusicIntent } from "../../types/intent.js";
import type { Track } from "../../types/track.js";
import type { SearchResponse } from "../../types/api.js";
import type { DiscoveryContext } from "../../types/discovery.js";
import type { IntentExtractor } from "../gemini/intentExtractor.js";
import type { SpotifySearch } from "../spotify/spotifySearch.js";
import type { YouTubeMusicSearch } from "../youtubeMusic/ytmusicSearch.js";
import { generateQueries } from "./queryGenerator.js";
import { defaultDiscoveryProcessor } from "./discoveryProcessor.js";
import { BACKEND_MOCK_TRACKS, getMockIntent } from "./mockMusic.js";
import { fuseTrackLists, getSongSignature, normalizeSongTitle } from "./fusion.js";
import { balanceTracks, createSemanticReranker, getPrimaryArtistKey, parseTargetArtists, userWantsInstrumental, type PreferenceProfile, type SemanticReranker } from "../gemini/reranker.js";
import { logger } from "../../utils/logger.js";
import { enrichTracksWithPreviews } from "../spotify/previewEnricher.js";
import { contextualSearchQuery, enrichListeningContext } from "./browserContextEnricher.js";

export interface SearchPipelineOptions {
  intentExtractor: IntentExtractor | null;
  spotifySearch: SpotifySearch | null;
  youtubeMusicSearch?: YouTubeMusicSearch | null;
  reranker?: SemanticReranker | null;
}

function resolveDiscoveryContext(prompt: string, context?: DiscoveryContext): DiscoveryContext {
  return {
    discoveryMode: context?.discoveryMode ?? "FAMILIAR",
    preferences: {
      favoriteGenres: context?.preferences?.favoriteGenres ?? [],
      favoriteArtists: context?.preferences?.favoriteArtists ?? [],
      dislikedGenres: context?.preferences?.dislikedGenres ?? [],
      dislikedArtists: context?.preferences?.dislikedArtists ?? [],
    },
    historySignals: context?.historySignals,
    browserContext: context?.browserContext,
    rawPrompt: context?.rawPrompt ?? prompt,
  };
}

function discoveryQueries(
  intent: MusicIntent,
  result: ReturnType<typeof defaultDiscoveryProcessor.process>,
  context: DiscoveryContext,
  contextualQuery?: string,
): string[] {
  const preferredTerm = result.injectedArtist || result.injectedGenre;
  const contextTerms = [
    intent.mood && intent.mood !== "any" ? intent.mood : null,
    intent.activity,
  ].filter((term): term is string => Boolean(term));
  const queries: string[] = [];

  if (preferredTerm) {
    queries.push(result.injectedArtist
      ? [`artist:"${result.injectedArtist}"`, ...contextTerms].join(" ")
      : [...contextTerms, result.injectedGenre!].join(" "));
  }
  if (contextualQuery) queries.push([...contextTerms, contextualQuery].filter(Boolean).join(" "));

  const prompt = (context.rawPrompt || "").toLowerCase();
  const hasExplicitGenre = intent.breakdown?.genre?.source === "explicit" ||
    intent.genre.some((genre) => Boolean(genre.trim()) && prompt.includes(genre.toLowerCase()));
  const favoriteGenre = context.preferences?.favoriteGenres?.[0];
  if (result.mode === "BALANCED" && favoriteGenre && !hasExplicitGenre && favoriteGenre.toLowerCase() !== result.injectedGenre?.toLowerCase()) {
    queries.push([...contextTerms, favoriteGenre].join(" "));
  }

  const favoriteArtist = context.preferences?.favoriteArtists?.[0];
  if ((result.mode === "FAMILIAR" || result.mode === "BALANCED") && favoriteArtist && !intent.artist && !intent.trackTitle) {
    queries.push([`artist:"${favoriteArtist}"`, ...contextTerms].join(" "));
  }

  return [...new Set(queries.map((query) => query.trim()).filter(Boolean))];
}

function rerankerPreferences(
  context: DiscoveryContext,
  result: ReturnType<typeof defaultDiscoveryProcessor.process>,
): PreferenceProfile {
  return {
    favoriteGenres: context.preferences?.favoriteGenres ?? [],
    favoriteArtists: context.preferences?.favoriteArtists ?? [],
    dislikedGenres: result.excludedGenres,
    dislikedArtists: result.excludedArtists,
  };
}

function matchesSuggestedTrack(track: Track, recommendation: { title: string; artist: string }): boolean {
  const expectedTitle = normalizeSongTitle(recommendation.title);
  const titleMatches = normalizeSongTitle(track.name) === expectedTitle;
  const expectedArtist = recommendation.artist.toLowerCase().replace(/[^a-z0-9]/g, "");
  const artistMatches = track.artists.some((artist) => {
    const actualArtist = artist.toLowerCase().replace(/[^a-z0-9]/g, "");
    return actualArtist === expectedArtist || actualArtist.includes(expectedArtist) || expectedArtist.includes(actualArtist);
  });
  return Boolean(expectedTitle && expectedArtist && titleMatches && artistMatches);
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

export function relatedSongRequest(prompt: string): { requested: boolean; relatedCount: number } {
  const lower = prompt.toLowerCase();
  const countToken = "(?:\\d+|one|two|three|four|five|six|seven|eight|nine|ten)";
  const requested =
    /\b(?:related|similar)\s+(?:songs|tracks|music)\b/.test(lower) ||
    /\b(?:songs|tracks|music)\s+(?:that\s+are\s+)?(?:related|similar)\s+to\b/.test(lower) ||
    /\b(?:songs|tracks|music)\s+on\s+the\s+same\s+mood\s+as\b/.test(lower) ||
    /\b(?:same\s+mood\s+as|more\s+like)\s+(?:this|that|it|the\s+(?:song|track))\b/.test(lower) ||
    /\b(?:songs|tracks)\s+relate\s+to\b/.test(lower) ||
    new RegExp(`\\b${countToken}\\s+more\\s+(?:tracks?|songs?)\\s+(?:(?:related|similar)\\s+to|relate\\s+to)\\b`).test(lower);

  const quantityMatch = lower.match(new RegExp(`\\b(${countToken})\\s+more\\s+(?:related\\s+)?(?:tracks?|songs?)\\b`))
    ?? lower.match(new RegExp(`\\b(${countToken})\\s+(?:related\\s+)?(?:tracks?|songs?)\\b`));
  const parsedCount = quantityMatch ? Number(quantityMatch[1]) || NUMBER_WORDS[quantityMatch[1]!] : undefined;
  return { requested, relatedCount: Math.max(1, Math.min(24, parsedCount ?? 10)) };
}

export function getEraYearFilter(era?: string | null): string | null {
  if (!era) return null;
  const e = era.toLowerCase().trim();
  if (e.includes("90") || e.includes("1990")) return "year:1989-2001";
  if (e.includes("80") || e.includes("1980")) return "year:1979-1991";
  if (e.includes("70") || e.includes("1970")) return "year:1969-1981";
  if (e.includes("2000") || e.includes("00s")) return "year:1999-2011";
  return null;
}

export function cleanYouTubeQuery(q: string, lang?: string | null, era?: string | null): string {
  let cleaned = q
    .replace(/\bNOT\s+("[^"]*"|[^\s]+)/gi, "")
    .replace(/\b(?:artist|track|album|genre|year):("[^"]*"|[^\s]+)/gi, (_, val: string) =>
      val.replace(/^"|"$/g, ""),
    )
    .replace(/\bOR\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const base = cleanSpotifyQuery(cleaned, lang, null);
  if (era && !/\b(19)?[789]0s?\b|\b2000s?\b/i.test(base)) {
    return `${base} ${era}`.trim();
  }
  return base;
}

export function cleanSpotifyQuery(q: string, lang?: string | null, era?: string | null): string {
  let cleaned = q.replace(/\bNOT\s+("[^"]*"|[^\s]+)/gi, "").trim();
  cleaned = cleaned.replace(/genre:"bollywood"/gi, "bollywood");
  cleaned = cleaned.replace(/genre:bollywood/gi, "bollywood");
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // Never prepend language or era filters if query is already an explicit Spotify fielded filter (artist: or track:)
  if (/^(?:artist:|track:)/i.test(cleaned)) {
    return cleaned;
  }

  if (lang) {
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
  }

  const eraFilter = getEraYearFilter(era);
  if (eraFilter && !cleaned.includes("year:")) {
    cleaned = `${cleaned} ${eraFilter}`.trim();
  }
  return cleaned;
}

export function createSearchPipeline({
  intentExtractor,
  spotifySearch,
  youtubeMusicSearch = null,
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
      const fallbackContext: DiscoveryContext = resolveDiscoveryContext(prompt, discoveryContext);

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
      const fallbackContext: DiscoveryContext = resolveDiscoveryContext(prompt, discoveryContext);

      if (mode === "mock" || !intentExtractor || (!spotifySearch && !youtubeMusicSearch)) {
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
      const contextualSignals = enrichListeningContext(activeIntent, fallbackContext.browserContext);
      const relatedRequest = relatedSongRequest(prompt);
      const relatedSongsRequested = relatedRequest.requested;
      const requestedResultLimit = relatedSongsRequested ? relatedRequest.relatedCount + 1 : 10;

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

      // Keep Gemini's request facets, and add the selected Preferences-tab signal
      // as its own retrieval facet so the active discovery mode affects live search.
      const preferenceQueries = discoveryQueries(activeIntent, discoveryResult, fallbackContext, contextualSearchQuery(contextualSignals));
      for (const preferenceQuery of preferenceQueries) {
        if (!queryList.some((q) => q.toLowerCase() === preferenceQuery.toLowerCase())) queryList.push(preferenceQuery);
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

      // If user specifically requested artist(s), ensure dedicated artist queries are prioritized
      const targetArtists = relatedSongsRequested ? [] : parseTargetArtists(activeIntent.artist);
      const isExclusiveArtist = Boolean(targetArtists.length > 0 && /\b(only|just|pure|exclusively|all)\b/i.test(prompt));
      if (targetArtists.length > 1) {
        for (const art of targetArtists) {
          const artQuery = `artist:"${art}"`;
          if (!queryList.includes(artQuery)) {
            queryList.unshift(artQuery);
          }
        }
        const jointQuery = targetArtists.map((a) => `"${a}"`).join(" ");
        if (!queryList.includes(jointQuery)) {
          queryList.unshift(jointQuery);
        }
      } else if (targetArtists.length === 1) {
        const artistSongsQuery = `${targetArtists[0]} songs`;
        if (isExclusiveArtist && !queryList.includes(artistSongsQuery)) {
          queryList.unshift(artistSongsQuery);
        }
        const artistQuery = `artist:"${targetArtists[0]}"`;
        if (!queryList.includes(artistQuery)) {
          queryList.unshift(artistQuery);
        }
      }

      const finalizedQueries = queryList.map((q) => cleanSpotifyQuery(q, activeIntent.language, activeIntent.era));
      const masterQueryStr = cleanSpotifyQuery(
        activeIntent.multiQueries?.masterQuery || baseQueries.primary,
        activeIntent.language,
        activeIntent.era,
      );

      // 4. Parallel Spotify Retrieval across query facets (25 tracks per facet = up to 75 candidates)
      const searchErrors: unknown[] = [];
      const searchPromises = (spotifySearch ? finalizedQueries : []).map(async (q) => {
        try {
          const tracks = await spotifySearch!.searchTracks(q, 25, signal);
          logger.info(`[SpotifySearch] Query "${q}" returned ${tracks.length} tracks. Top: ${tracks.slice(0, 3).map(t => t.name).join(", ")}`);
          return tracks;
        } catch (err) {
          searchErrors.push(err);
          logger.warn(`Spotify search for "${q}" failed:`, err);
          return [] as Track[];
        }
      });
      const rawTrackLists = await Promise.all(searchPromises);

      if (searchPromises.length > 0 && searchErrors.length === searchPromises.length && !youtubeMusicSearch) {
        throw searchErrors[0];
      }

      // 5. In-Memory Reciprocal Rank Fusion (< 2ms)
      let fusedCandidates = fuseTrackLists(rawTrackLists, { maxCandidates: 50 });

      // Safety fallback: if fused candidates are sparse (< 20), search master / core query
      if (fusedCandidates.length < 20 && spotifySearch && !isExclusiveArtist) {
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
          if (fusedCandidates.length < 20 && (activeIntent.language || activeIntent.era)) {
            const coreFallback = cleanSpotifyQuery(
              `${activeIntent.language || ""} ${(activeIntent.genre && activeIntent.genre[0]) || activeIntent.mood || "songs"}`.trim(),
              activeIntent.language,
              activeIntent.era,
            );
            if (coreFallback && coreFallback !== masterQueryStr) {
              const coreTracks = await spotifySearch.searchTracks(coreFallback, 25, signal);
              for (const t of coreTracks) {
                if (!seenIds.has(t.id)) {
                  fusedCandidates.push(t);
                  seenIds.add(t.id);
                }
              }
            }
          }
        } catch (err) {
          logger.warn(`[SpotifySearch] Master fallback search for "${masterQueryStr}" failed:`, err);
        }
      }

      let usedYouTubeMusicFallback = false;
      let youtubeMusicFallbackFailed = false;
      if (youtubeMusicSearch && (fusedCandidates.length < 10 || searchErrors.length > 0)) {
        const fallbackQueries = finalizedQueries
          .slice(0, 5)
          .map((q) => cleanYouTubeQuery(q, activeIntent.language, activeIntent.era))
          .filter((q, idx, arr) => Boolean(q) && arr.indexOf(q) === idx);
        const fallbackResults = await Promise.all(
          fallbackQueries.map(async (query) => {
            try {
              return await youtubeMusicSearch.searchTracks(query, 25, signal);
            } catch (err) {
              youtubeMusicFallbackFailed = true;
              logger.warn(`[YTMusicFallback] Search for "${query}" failed:`, err);
              return [] as Track[];
            }
          }),
        );
        const fallbackCandidates = fuseTrackLists(fallbackResults, { maxCandidates: 50 });
        if (fallbackCandidates.length > 0) {
          usedYouTubeMusicFallback = true;
          fusedCandidates = fuseTrackLists([fusedCandidates, fallbackCandidates], { maxCandidates: 50 });
          logger.info(`[YTMusicFallback] Added ${fallbackCandidates.length} YouTube Music candidates after Spotify returned a degraded catalog.`);
        } else if (searchErrors.length === searchPromises.length && searchErrors.length > 0) {
          throw searchErrors[0];
        }
      }

      // Related-song prompts name a seed, not an artist/title filter. Fetch the
      // exact seed explicitly so it can always be shown alongside ten related tracks.
      let referenceTrack: Track | undefined;
      if (relatedSongsRequested && activeIntent.trackTitle) {
        const seedQuery = activeIntent.artist
          ? `track:"${activeIntent.trackTitle}" artist:"${activeIntent.artist}"`
          : `track:"${activeIntent.trackTitle}"`;
        const existingSeed = fusedCandidates.find((track) => matchesSuggestedTrack(track, {
          title: activeIntent.trackTitle!,
          artist: activeIntent.artist ?? track.artists[0] ?? "",
        }));
        const seedLookups: Track[][] = existingSeed ? [] : await Promise.all([
          spotifySearch
            ? spotifySearch.searchTracks(seedQuery, 5, signal).catch((err) => {
            logger.warn(`[RelatedSongs] Spotify seed lookup failed for "${activeIntent.trackTitle}":`, err);
            return [] as Track[];
          })
            : Promise.resolve([] as Track[]),
          youtubeMusicSearch
            ? youtubeMusicSearch.searchTracks(`${activeIntent.trackTitle} ${activeIntent.artist ?? ""}`, 5, signal).catch((err) => {
            logger.warn(`[RelatedSongs] YouTube Music seed lookup failed for "${activeIntent.trackTitle}":`, err);
            return [] as Track[];
          })
            : Promise.resolve([] as Track[]),
        ]);
        const exactSeed = existingSeed ?? fuseTrackLists(seedLookups, { maxCandidates: 10 })
          .find((track) => matchesSuggestedTrack(track, {
            title: activeIntent.trackTitle!,
            artist: activeIntent.artist ?? track.artists[0] ?? "",
          }));
        if (exactSeed) {
          referenceTrack = exactSeed;
          if (exactSeed.catalogSource === "youtube_music") usedYouTubeMusicFallback = true;
          fusedCandidates = fuseTrackLists([[exactSeed], fusedCandidates], { maxCandidates: 60 });
        }
      }

      let candidatesToUse = fusedCandidates;

      // 6. Gemini Semantic Reranker (with safety timeout and mode awareness)
      let rerankedTracks = candidatesToUse.length > 0 ? await activeReranker.rerank(
        prompt,
        activeIntent,
        candidatesToUse,
        discoveryResult.mode,
        signal,
        rerankerPreferences(fallbackContext, discoveryResult),
        { relatedSongsRequested, maxResults: requestedResultLimit, isExclusive: isExclusiveArtist, page: 1 },
        contextualSignals,
      ) : [];

      const averageScore = (tracks: Track[]) => {
        const scored = tracks.filter((track): track is Track & { matchScore: number } => typeof track.matchScore === "number");
        return scored.length ? scored.reduce((sum, track) => sum + track.matchScore, 0) / scored.length : null;
      };
      const firstPassScore = averageScore(rerankedTracks);
      let refinementQueriesUsed: string[] = [];
      const lowestScore = rerankedTracks.reduce<number | null>((lowest, track) => {
        if (typeof track.matchScore !== "number") return lowest;
        return lowest === null ? track.matchScore : Math.min(lowest, track.matchScore);
      }, null);
      if (
        firstPassScore !== null &&
        (firstPassScore < 75 || (lowestScore !== null && lowestScore < 55)) &&
        activeReranker.suggestRefinementQueries
      ) {
        try {
          const lowScoringTracks = rerankedTracks
            .filter((track) => typeof track.matchScore === "number" && track.matchScore < 75)
            .sort((a, b) => (a.matchScore ?? 0) - (b.matchScore ?? 0));
          refinementQueriesUsed = await activeReranker.suggestRefinementQueries(prompt, activeIntent, lowScoringTracks, signal);
          if (refinementQueriesUsed.length > 0) {
            const refinementResults: Track[][] = await Promise.all(
              refinementQueriesUsed.map(async (query) => {
                const cleanQuery = cleanSpotifyQuery(query, activeIntent.language, activeIntent.era);
                if (spotifySearch) {
                  try {
                    return await spotifySearch.searchTracks(cleanQuery, 25, signal);
                  } catch (err) {
                    logger.warn(`[SemanticRefine] Spotify search for "${cleanQuery}" failed:`, err);
                  }
                }
                if (youtubeMusicSearch) {
                  try {
                    usedYouTubeMusicFallback = true;
                    const ytQuery = cleanYouTubeQuery(query, activeIntent.language, activeIntent.era);
                    return await youtubeMusicSearch.searchTracks(ytQuery, 25, signal);
                  } catch (err) {
                    logger.warn(`[SemanticRefine] YouTube Music search for "${cleanQuery}" failed:`, err);
                  }
                }
                return [];
              }),
            );
            const refinedCandidates = fuseTrackLists([candidatesToUse, ...refinementResults], { maxCandidates: 60 });
            if (refinedCandidates.length > candidatesToUse.length) {
              const refinedRanking = await activeReranker.rerank(
                prompt,
                activeIntent,
                refinedCandidates,
                discoveryResult.mode,
                signal,
                rerankerPreferences(fallbackContext, discoveryResult),
                { relatedSongsRequested, maxResults: requestedResultLimit, isExclusive: isExclusiveArtist, page: 1 },
                contextualSignals,
              );
              const refinedScore = averageScore(refinedRanking);
              if (refinedScore !== null && refinedScore > (firstPassScore ?? 0)) {
                candidatesToUse = refinedCandidates;
                rerankedTracks = refinedRanking;
                logger.info(`[SemanticRefine] Match score improved from ${Math.round(firstPassScore!)} to ${Math.round(refinedScore)} after one refined retrieval pass.`);
              }
            }
          }
        } catch (err) {
          logger.warn("[SemanticRefine] Skipped query refinement after a Gemini/catalog error:", err);
        }
      }

      // Keep the first page useful if the semantic model returns a short list.
      // Fill from the already-fused retrieval pool, applying the same language,
      // era, explicit request, negative constraint, and artist-balance rules.
      // Confidence ranks tracks and informs the set score; it does not remove otherwise valid songs.
      const hasGeminiScores = rerankedTracks.some((track) => typeof track.matchScore === "number");
      const confidenceCheckedTracks = rerankedTracks;

      const initialResultLimit = requestedResultLimit;
      const pageArtistLimit = activeIntent.artist && !relatedSongsRequested ? 10 : 2;
      const locallyVerifiedTracks = balanceTracks(
        confidenceCheckedTracks,
        prompt.toLowerCase().includes("mashup") || prompt.toLowerCase().includes("mix") ? 10 : 2,
        activeIntent.era,
        activeIntent.language,
        userWantsInstrumental(prompt, activeIntent),
        pageArtistLimit,
        activeIntent,
        {
          maxPerArtist: pageArtistLimit,
          maxCumulativePerArtist: isExclusiveArtist ? 25 : pageArtistLimit,
          isExclusive: isExclusiveArtist,
          page: 1,
          relatedSongsRequested,
          maxResults: initialResultLimit,
        },
      );
      const rankedIds = new Set(locallyVerifiedTracks.map((track) => track.id));
      const rankedSignatures = new Set(locallyVerifiedTracks.map(getSongSignature));
      const rankedArtistCounts: Record<string, number> = {};
      for (const track of rerankedTracks) {
        const artistKey = getPrimaryArtistKey(track);
        rankedArtistCounts[artistKey] = (rankedArtistCounts[artistKey] ?? 0) + 1;
      }
      const topUpCandidates = hasGeminiScores ? [] : candidatesToUse.filter(
        (track) => !rankedIds.has(track.id) && !rankedSignatures.has(getSongSignature(track)),
      );
      const balancedTopUp = balanceTracks(
        topUpCandidates,
        prompt.toLowerCase().includes("mashup") || prompt.toLowerCase().includes("mix") ? 10 : 2,
        activeIntent.era,
        activeIntent.language,
        userWantsInstrumental(prompt, activeIntent),
        pageArtistLimit,
        activeIntent,
        {
          maxPerArtist: pageArtistLimit,
          maxCumulativePerArtist: isExclusiveArtist ? 25 : pageArtistLimit,
          cumulativeArtistCounts: rankedArtistCounts,
          isExclusive: isExclusiveArtist,
          page: 1,
          relatedSongsRequested,
          maxResults: initialResultLimit,
        },
      );
      let finalTracks = [...locallyVerifiedTracks, ...balancedTopUp].slice(0, initialResultLimit);
      const initialResultScore = averageScore(finalTracks);
      let resultConfidence = initialResultScore === null ? null : Math.round(initialResultScore);
      let aiRecommendationsAdded = 0;
      if (
        activeReranker.suggestTrackRecommendations &&
        (relatedSongsRequested || finalTracks.length < initialResultLimit || (resultConfidence !== null && resultConfidence < 75))
      ) {
        try {
          const suggestions = await activeReranker.suggestTrackRecommendations(
            prompt,
            activeIntent,
            candidatesToUse,
            resultConfidence,
            relatedSongsRequested,
            signal,
            relatedRequest.relatedCount,
          );
          const currentSignatures = new Set(candidatesToUse.map(getSongSignature));
          const recommendationResults = await Promise.all(suggestions.slice(0, 10).map(async (recommendation) => {
            const spotifyQuery = `track:"${recommendation.title}" artist:"${recommendation.artist}"`;
            if (spotifySearch) {
              try {
                const tracks = await spotifySearch.searchTracks(spotifyQuery, 5, signal);
                const verified = tracks.filter((track) => matchesSuggestedTrack(track, recommendation));
                if (verified.length > 0) return verified;
              } catch (err) {
                logger.warn(`[GeminiRecommendations] Spotify lookup failed for "${recommendation.title}" by "${recommendation.artist}":`, err);
              }
            }
            if (youtubeMusicSearch) {
              try {
                const tracks = await youtubeMusicSearch.searchTracks(`${recommendation.title} ${recommendation.artist}`, 5, signal);
                return tracks.filter((track) => matchesSuggestedTrack(track, recommendation));
              } catch (err) {
                logger.warn(`[GeminiRecommendations] YouTube Music lookup failed for "${recommendation.title}" by "${recommendation.artist}":`, err);
              }
            }
            return [] as Track[];
          }));
          const verifiedRecommendations = fuseTrackLists(recommendationResults, { maxCandidates: 20 })
            .filter((track) => !currentSignatures.has(getSongSignature(track)))
            .map((track) => ({ ...track, aiRecommended: true }));

          if (verifiedRecommendations.length > 0) {
            // Preserve the parsed intent and let the reranker treat the title/artist
            // as a reference seed instead of hard filters for related candidates.
            const recommendationIntent = activeIntent;
            const recIds = new Set(verifiedRecommendations.map((t) => t.id));
            const combinedCatalog = relatedSongsRequested
              ? [
                  ...(referenceTrack ? [referenceTrack] : []),
                  ...verifiedRecommendations,
                  ...candidatesToUse.filter((t) => t.id !== referenceTrack?.id && !recIds.has(t.id)).slice(0, 30),
                ].slice(0, 40)
              : fuseTrackLists([candidatesToUse.slice(0, 30), verifiedRecommendations], { maxCandidates: 40 });
            const recommendationRanking = await activeReranker.rerank(
              prompt,
              recommendationIntent,
              combinedCatalog,
              discoveryResult.mode,
              signal,
              rerankerPreferences(fallbackContext, discoveryResult),
              {
                maxPerArtist: relatedSongsRequested ? 2 : pageArtistLimit,
                maxCumulativePerArtist: relatedSongsRequested ? 6 : pageArtistLimit,
                relatedSongsRequested,
                maxResults: requestedResultLimit,
              },
              contextualSignals,
            );
            // Keep low-confidence but catalog-verified recommendations when the result is short.
            const verifiedRanking = recommendationRanking;
            let recommendationTracks = balanceTracks(
              verifiedRanking,
              prompt.toLowerCase().includes("mashup") || prompt.toLowerCase().includes("mix") ? 10 : 2,
              activeIntent.era,
              activeIntent.language,
              userWantsInstrumental(prompt, recommendationIntent),
              relatedSongsRequested ? 2 : pageArtistLimit,
              recommendationIntent,
              {
                maxPerArtist: relatedSongsRequested ? 2 : pageArtistLimit,
                maxCumulativePerArtist: relatedSongsRequested ? 6 : pageArtistLimit,
                relatedSongsRequested,
                maxResults: requestedResultLimit,
              },
            );
            if (relatedSongsRequested) {
              const seed = referenceTrack
                ? verifiedRanking.find((track) => getSongSignature(track) === getSongSignature(referenceTrack!)) ?? referenceTrack
                : undefined;
              const relatedTracks = recommendationTracks.filter((track) => !seed || getSongSignature(track) !== getSongSignature(seed));
              recommendationTracks = [...(seed ? [seed] : []), ...relatedTracks.slice(0, relatedRequest.relatedCount)].slice(0, seed ? requestedResultLimit : relatedRequest.relatedCount);
            } else {
              recommendationTracks = recommendationTracks.slice(0, 10);
            }
            const recommendationScore = averageScore(recommendationTracks);
            const recommendationConfidence = recommendationScore === null ? null : Math.round(recommendationScore);
            const fillsShortResult = finalTracks.length < initialResultLimit && recommendationTracks.length > finalTracks.length;
            const improvesResult = recommendationConfidence !== null && (
              (resultConfidence !== null && recommendationConfidence > resultConfidence) ||
              (recommendationTracks.length > finalTracks.length && recommendationConfidence >= (resultConfidence ?? 0) - 5)
            );
            if (relatedSongsRequested || fillsShortResult || improvesResult) {
              finalTracks = recommendationTracks;
              resultConfidence = recommendationConfidence;
              aiRecommendationsAdded = finalTracks.filter((track) => track.aiRecommended).length;
              logger.info(`[GeminiRecommendations] Added ${aiRecommendationsAdded} catalog-verified AI recommendations; result confidence is ${resultConfidence === null ? "unavailable" : `${resultConfidence}%`}.`);
            }
          }
        } catch (err) {
          logger.warn("[GeminiRecommendations] Supplement skipped after a Gemini/catalog error:", err);
        }
      }

      const enrichedTracks = await enrichTracksWithPreviews(finalTracks);

      // Related requests include the named reference song plus ten more tracks.
      const PAGE_SIZE = requestedResultLimit;
      const pageTracks = enrichedTracks.slice(0, PAGE_SIZE);
      // A short first page is not evidence that the catalog is exhausted. Keep
      // discovery available while there is at least one live result; load-more
      // will set hasMore=false when Spotify returns no fresh tracks.
      const hasMoreInitial = enrichedTracks.length > 0 && enrichedTracks.length < 25;

      return {
        mode: "live",
        discoveryMode: discoveryResult.mode,
        intent: activeIntent,
        queries: {
          primary: masterQueryStr,
          alternatives: [...finalizedQueries, ...refinementQueriesUsed],
        },
        tracks: pageTracks,
        resultConfidence,
        aiRecommendationsAdded,
        hasMore: hasMoreInitial,
        ...(usedYouTubeMusicFallback
          ? { notice: "Spotify results were unavailable or incomplete. Showing YouTube Music catalog results." }
          : youtubeMusicFallbackFailed && fusedCandidates.length === 0
            ? { notice: "Spotify results were unavailable and YouTube Music could not be reached. Please try again." }
            : {}),
        ...(finalTracks.length === 0
          ? { notice: "No catalog tracks matched this request and its filters with enough confidence. Try broadening the prompt or adjusting your Preferences." }
          : {}),
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

      const activeContext: DiscoveryContext = resolveDiscoveryContext(prompt, discoveryContext);
      const discoveryResult = defaultDiscoveryProcessor.process(activeContext, intent);
      const activeIntent = discoveryResult.adjustedIntent;
      const contextualSignals = enrichListeningContext(activeIntent, activeContext.browserContext);
      const relatedRequest = relatedSongRequest(prompt);
      const relatedSongsRequested = relatedRequest.requested;

      if (mode === "mock" || (!spotifySearch && !youtubeMusicSearch)) {
        const available = BACKEND_MOCK_TRACKS.filter((t) => !excludeIdSet.has(t.id));
        const PAGE_SIZE = 10;
        const remainingSlots = Math.max(0, PAGE_SIZE - excludeTrackIds.length);
        const batchSize = Math.min(PAGE_SIZE, remainingSlots);
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
      const targetArtists = relatedSongsRequested ? [] : parseTargetArtists(intent.artist);
      const isExclusiveArtist = Boolean(targetArtists.length > 0 && /\b(only|just|pure|exclusively|all)\b/i.test(prompt));
      const safeOffset = Math.min(10, Math.max(0, (page - 1) * 5));

      // Continue an explicitly requested artist catalog on later pages even
      // when the prompt also asks for mood/context matches.
      if (!isExclusiveArtist && targetArtists.length > 0) {
        for (const art of targetArtists) {
          queryList.push({ query: `artist:"${art}"`, offset: safeOffset });
          if (page >= 3) {
            queryList.push({ query: `${art} songs`, offset: 0 });
          }
        }
      }

      if (isExclusiveArtist && targetArtists.length > 0) {
        for (const art of targetArtists) {
          queryList.push({ query: `artist:"${art}"`, offset: safeOffset });
          queryList.push({ query: `${art} songs`, offset: safeOffset });
          queryList.push({ query: `${art} album`, offset: 0 });
          if (activeIntent.genre?.[0]) {
            queryList.push({ query: `${art} ${activeIntent.genre[0]}`, offset: 0 });
          }
        }
      } else if (page === 2) {
        // Tier 2: Mood context, curator nuance, and genre offset
        if (activeIntent.multiQueries?.contextQuery) {
          queryList.push({ query: activeIntent.multiQueries.contextQuery, offset: 0 });
        }
        if (activeIntent.multiQueries?.curatorQuery) {
          queryList.push({ query: activeIntent.multiQueries.curatorQuery, offset: 0 });
        }
        if (activeIntent.multiQueries?.genreQuery) {
          queryList.push({ query: activeIntent.multiQueries.genreQuery, offset: safeOffset });
        }
        if (activeIntent.multiQueries?.moodQuery) {
          queryList.push({ query: activeIntent.multiQueries.moodQuery, offset: safeOffset });
        }
      } else if (page === 3) {
        // Tier 3: Subgenres or deep decade boundaries
        if (activeIntent.subgenres && activeIntent.subgenres.length > 0) {
          for (const sg of activeIntent.subgenres.slice(0, 3)) {
            queryList.push({ query: `${sg} ${activeIntent.language || ""}`.trim(), offset: 0 });
          }
        }
        if (activeIntent.multiQueries?.genreQuery) {
          queryList.push({ query: activeIntent.multiQueries.genreQuery, offset: safeOffset });
        }
        if (activeIntent.multiQueries?.contextQuery) {
          queryList.push({ query: activeIntent.multiQueries.contextQuery, offset: safeOffset });
        }
        if (activeIntent.multiQueries?.masterQuery) {
          queryList.push({ query: activeIntent.multiQueries.masterQuery, offset: safeOffset });
        }
      } else {
        // Tier 4+: Seed artists graph queries
        if (activeIntent.seedArtists && activeIntent.seedArtists.length >= 2) {
          const pair1 = `artist:"${activeIntent.seedArtists[0]}" OR artist:"${activeIntent.seedArtists[1]}"`;
          queryList.push({ query: pair1, offset: 0 });
          if (activeIntent.seedArtists.length >= 4) {
            const pair2 = `artist:"${activeIntent.seedArtists[2]}" OR artist:"${activeIntent.seedArtists[3]}"`;
            queryList.push({ query: pair2, offset: 0 });
          }
        }
        if (activeIntent.multiQueries?.masterQuery) {
          queryList.push({ query: activeIntent.multiQueries.masterQuery, offset: safeOffset });
        }
        if (activeIntent.multiQueries?.moodQuery) {
          queryList.push({ query: activeIntent.multiQueries.moodQuery, offset: safeOffset });
        }
      }

      const preferenceQueries = discoveryQueries(activeIntent, discoveryResult, activeContext, contextualSearchQuery(contextualSignals));
      for (const preferenceQuery of preferenceQueries) {
        if (!queryList.some((item) => item.query.toLowerCase() === preferenceQuery.toLowerCase())) {
          queryList.push({ query: preferenceQuery, offset: 0 });
        }
      }

      if (queryList.length === 0) {
        queryList.push({ query: activeIntent.multiQueries?.masterQuery || prompt, offset: safeOffset });
      }

      const finalizedQueries = queryList.map((item) => ({
        query: cleanSpotifyQuery(item.query, activeIntent.language, activeIntent.era),
        offset: item.offset,
      }));

      // Parallel fetch from Spotify (25 tracks per query facet to ensure wide candidate pool)
      const searchErrors: unknown[] = [];
      const searchPromises = (spotifySearch ? finalizedQueries : []).map(async ({ query, offset }) => {
        try {
          return await spotifySearch!.searchTracks(query, 25, signal, offset);
        } catch (err) {
          searchErrors.push(err);
          logger.warn(`[LoadMore] Spotify search for "${query}" failed:`, err);
          return [] as Track[];
        }
      });

      const trackLists = await Promise.all(searchPromises);
      if (searchPromises.length > 0 && searchErrors.length === searchPromises.length && !youtubeMusicSearch) {
        throw searchErrors[0];
      }
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

      if (filteredCount < 30 && spotifySearch && !isExclusiveArtist) {
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

          // Fallback to core / master query if still low (safe low offset)
          if (spotifySearch && rawCandidates.filter((t) => !excludeIdSet.has(t.id) && !excludeSigSet.has(getSongSignature(t))).length < 25) {
            const langPart = activeIntent.language || "";
            const genrePart = (activeIntent.genre && activeIntent.genre[0]) || "";
            const moodPart = activeIntent.mood && activeIntent.mood !== "any" ? activeIntent.mood : "songs";
            const fallbackQuery = cleanSpotifyQuery(
              intent.multiQueries?.masterQuery || intent.multiQueries?.moodQuery || `${langPart} ${genrePart || moodPart}`.trim() || prompt,
              activeIntent.language,
              activeIntent.era,
            );
            logger.info(`[LoadMore] Pool low (${filteredCount} tracks). Triggering cascade fallback: "${fallbackQuery}" (offset ${safeOffset})`);
            const cascadeTracks = await spotifySearch.searchTracks(fallbackQuery, 25, signal, safeOffset);
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

      const remainingUniqueCount = () => rawCandidates.filter(
        (track) => !excludeIdSet.has(track.id) && !excludeSigSet.has(getSongSignature(track)),
      ).length;
      if (youtubeMusicSearch && (remainingUniqueCount() < 5 || (searchPromises.length > 0 && searchErrors.length > 0))) {
        const variantTerms = page % 3 === 2
          ? ["album version", "official audio", "acoustic"]
          : page % 3 === 0
            ? ["live", "album version", "official audio"]
            : ["official audio", "acoustic", "live"];
        const youtubeQueries = finalizedQueries
          .slice(0, 3)
          .map(({ query }) => cleanYouTubeQuery(query, activeIntent.language, activeIntent.era))
          .flatMap((query) => [query, ...variantTerms.map((term) => `${query} ${term}`)])
          .filter((query, index, all) => Boolean(query) && all.indexOf(query) === index)
          .slice(0, 8);
        const fallbackResults = await Promise.all(
          youtubeQueries.map(async (query) => {
            try {
              return await youtubeMusicSearch.searchTracks(query, 25, signal);
            } catch (err) {
              logger.warn(`[LoadMore][YTMusicFallback] Search for "${query}" failed:`, err);
              return [] as Track[];
            }
          }),
        );
        for (const track of fuseTrackLists(fallbackResults, { maxCandidates: 50 })) {
          if (!seenRawIds.has(track.id)) {
            seenRawIds.add(track.id);
            rawCandidates.push(track);
          }
        }
      }

      // Deduplicate against history and active session
      const candidatesToRerank = rawCandidates.filter(
        (t) => !excludeIdSet.has(t.id) && !excludeSigSet.has(getSongSignature(t)),
      );

      // Edge Case C: If exclusive artist catalog is exhausted, exit gracefully immediately
      if (isExclusiveArtist && candidatesToRerank.length === 0) {
        logger.info(`[LoadMore] Exclusive catalog for "${intent.artist}" exhausted at page ${page}. Returning empty batch with hasMore: false.`);
        return {
          page,
          tracks: [],
          hasMore: false,
          queriesUsed: finalizedQueries.map((q) => q.query),
        };
      }

      // Re-evaluate artist density on deduplicated candidates
      const rerankUniqueArtists = new Set<string>();
      for (const t of candidatesToRerank) {
        if (t.artists?.[0]) rerankUniqueArtists.add(t.artists[0].toLowerCase().trim());
      }
      // For tight niche micro-scenes on deep pages (Page 3/4), gracefully adapt maxPerArtist from 2 to 3
      // For popular/dense scenes (rerankUniqueArtists >= 12), artist cap stays strictly at 2 (100% untouched)
      const dynamicMaxPerArtist = (rerankUniqueArtists.size > 0 && rerankUniqueArtists.size < 12 && page >= 3) ? 3 : 2;

      // Enforce clean 5-track batch size and hard session ceiling of 25 tracks
      const remainingSlots = Math.max(0, 25 - excludeTrackIds.length);
      const batchSize = Math.min(5, remainingSlots);

      // Gemini Call 2 Reranker with dynamic artist limits
      const rerankedTracks = await activeReranker.rerank(
        prompt,
        activeIntent,
        candidatesToRerank,
        activeContext.discoveryMode,
        signal,
        rerankerPreferences(activeContext, discoveryResult),
        {
          cumulativeArtistCounts,
          maxCumulativePerArtist: isExclusiveArtist ? 25 : 6,
          maxPerArtist: dynamicMaxPerArtist,
          excludeTrackIds: excludeIdSet,
          excludeSignatures: excludeSigSet,
          relatedSongsRequested,
          maxResults: batchSize,
          isExclusive: isExclusiveArtist,
          page,
        },
        contextualSignals,
      );

      // Low confidence affects ordering and the displayed score, not eligibility.
      const confidenceCheckedTracks = rerankedTracks;
      const locallyVerifiedTracks = balanceTracks(
        confidenceCheckedTracks,
        2,
        activeIntent.era,
        activeIntent.language,
        userWantsInstrumental(prompt, activeIntent),
        activeIntent.artist && !relatedSongsRequested ? 10 : dynamicMaxPerArtist,
        activeIntent,
        {
          cumulativeArtistCounts,
          maxCumulativePerArtist: isExclusiveArtist ? 25 : 6,
          maxPerArtist: activeIntent.artist ? 10 : dynamicMaxPerArtist,
          excludeTrackIds: excludeIdSet,
          excludeSignatures: excludeSigSet,
          relatedSongsRequested,
          maxResults: batchSize,
          isExclusive: isExclusiveArtist,
          page,
        },
      );
      const finalTracks = locallyVerifiedTracks.slice(0, batchSize);
      const enrichedTracks = await enrichTracksWithPreviews(finalTracks);
      const totalAfter = excludeTrackIds.length + enrichedTracks.length;
      const hasMore = totalAfter < 25 && enrichedTracks.length > 0;

      return {
        page,
        tracks: enrichedTracks,
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
      let refinedIntent: MusicIntent = JSON.parse(JSON.stringify(intent));
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

      const activeContext: DiscoveryContext = resolveDiscoveryContext(prompt, discoveryContext);
      const discoveryResult = defaultDiscoveryProcessor.process(activeContext, refinedIntent);
      refinedIntent = discoveryResult.adjustedIntent;
      const contextualSignals = enrichListeningContext(refinedIntent, activeContext.browserContext);

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
      const preferenceQueries = discoveryQueries(refinedIntent, discoveryResult, activeContext, contextualSearchQuery(contextualSignals));
      for (const preferenceQuery of preferenceQueries) {
        if (!queryList.some((q) => q.toLowerCase() === preferenceQuery.toLowerCase())) queryList.push(preferenceQuery);
      }
      if (queryList.length === 0) {
        queryList.push(`${prompt} ${deltaText}`.trim());
      }

      const finalizedQueries = queryList.map((q) => cleanSpotifyQuery(q, refinedIntent.language));

      const searchErrors: unknown[] = [];
      const searchPromises = finalizedQueries.map(async (q) => {
        try {
          return await spotifySearch.searchTracks(q, 25, signal);
        } catch (err) {
          searchErrors.push(err);
          logger.warn(`[RefineVibe] Spotify search for "${q}" failed:`, err);
          return [] as Track[];
        }
      });

      const trackLists = await Promise.all(searchPromises);
      if (searchErrors.length === searchPromises.length && searchErrors.length > 0) {
        throw searchErrors[0];
      }
      const fusedCandidates = fuseTrackLists(trackLists, { maxCandidates: 35 });
      const candidatesToUse = fusedCandidates;

      // 4. Gemini Call 2 Reranker scores candidate tracks against the refined sonic coordinates
      const finalTracks = candidatesToUse.length > 0 ? await activeReranker.rerank(
        prompt,
        refinedIntent,
        candidatesToUse,
        activeContext.discoveryMode,
        signal,
        rerankerPreferences(activeContext, discoveryResult),
        {
          maxPerArtist: 2,
        },
        contextualSignals,
      ) : [];

      const enrichedTracks = await enrichTracksWithPreviews(finalTracks);

      return {
        intent: refinedIntent,
        tracks: enrichedTracks,
      };
    },
  };
}
