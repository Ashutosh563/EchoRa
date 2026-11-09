import type { Track } from "../../types/track.js";
import type {
  MoodStage,
  StagePlaylist,
  StageSearchIntent,
  TransitionJourneyResponse,
} from "../../types/transition.js";
import type { SpotifySearch } from "../spotify/spotifySearch.js";
import {
  type TransitionReranker,
  balanceTransitionTracks,
} from "./transitionReranker.js";
import { getSongSignature } from "../music/fusion.js";

const MAX_TRACKS_PER_STAGE = 5;

export interface PlaylistAssembler {
  assemble(
    startingMood: string,
    destinationMood: string,
    stages: MoodStage[],
    intents: StageSearchIntent[],
    signal?: AbortSignal,
  ): Promise<TransitionJourneyResponse>;
}

export function createPlaylistAssembler(
  spotifySearch: SpotifySearch | null,
  transitionReranker?: TransitionReranker | null,
): PlaylistAssembler {
  return {
    async assemble(
      startingMood: string,
      destinationMood: string,
      stages: MoodStage[],
      intents: StageSearchIntent[],
      signal?: AbortSignal,
    ): Promise<TransitionJourneyResponse> {
      const seenSignatures = new Set<string>();
      const cumulativeArtistCounts: Record<string, number> = {};
      const stagePlaylists: StagePlaylist[] = [];

      for (let i = 0; i < 4; i++) {
        const stage = stages[i];
        const intent = intents.find((it) => it.stage === stage.stage) || intents[i];

        // Gather query facets: hindiQuery, englishQuery, curatorQuery
        const candidateQueries = [
          intent?.hindiQuery,
          intent?.englishQuery,
          intent?.curatorQuery,
          intent?.moodQuery,
          intent?.genreQuery,
          intent?.query,
        ].filter((q): q is string => Boolean(q && q.trim()));

        const queriesToRun =
          candidateQueries.length > 0
            ? Array.from(new Set(candidateQueries)).slice(0, 3)
            : [`hindi ${stage.mood} music`, `${stage.mood} indie music`];

        let stageCandidates: Track[] = [];

        if (spotifySearch) {
          try {
            // Mine candidates across all query facets in parallel
            const searchPromises = queriesToRun.map((q) =>
              spotifySearch.searchTracks(q, 8, signal).catch(() => [] as Track[]),
            );
            const queryResults = await Promise.all(searchPromises);

            const candidateMap = new Map<string, Track>();
            for (const batch of queryResults) {
              for (const track of batch) {
                const sig = getSongSignature(track);
                if (!seenSignatures.has(sig) && !candidateMap.has(track.id)) {
                  candidateMap.set(track.id, track);
                }
              }
            }
            stageCandidates = Array.from(candidateMap.values());
          } catch {
            stageCandidates = [];
          }
        } else {
          // Mock mode: guarantee 2 Hindi vocal songs, 2 English vocal songs, 1 Choice song
          const hindiMocks: Track[] = [
            {
              id: `mock-hindi-${stage.stage}-1`,
              name: `Tum Hi Ho (Stage ${stage.stage})`,
              artists: [`Arijit Singh ${stage.stage}`],
              album: "Aashiqui 2",
              albumArtUrl: null,
              durationMs: 180000,
              spotifyUrl: "https://spotify.com/hindi1",
              previewUrl: null,
            },
            {
              id: `mock-hindi-${stage.stage}-2`,
              name: `Kesariya (Stage ${stage.stage})`,
              artists: [`Pritam ${stage.stage}`],
              album: "Brahmastra",
              albumArtUrl: null,
              durationMs: 180000,
              spotifyUrl: "https://spotify.com/hindi2",
              previewUrl: null,
            },
          ];

          const englishMocks: Track[] = [
            {
              id: `mock-eng-${stage.stage}-1`,
              name: `Fix You (Stage ${stage.stage})`,
              artists: [`Coldplay ${stage.stage}`],
              album: "X&Y",
              albumArtUrl: null,
              durationMs: 180000,
              spotifyUrl: "https://spotify.com/eng1",
              previewUrl: null,
            },
            {
              id: `mock-eng-${stage.stage}-2`,
              name: `Yellow (Stage ${stage.stage})`,
              artists: [`Parachutes Band ${stage.stage}`],
              album: "Parachutes",
              albumArtUrl: null,
              durationMs: 180000,
              spotifyUrl: "https://spotify.com/eng2",
              previewUrl: null,
            },
          ];

          const choiceMock: Track = {
            id: `mock-choice-${stage.stage}`,
            name: `${stage.mood} Melodic Journey`,
            artists: [`Echo Ensemble ${stage.stage}`],
            album: "Transition Journey",
            albumArtUrl: null,
            durationMs: 180000,
            spotifyUrl: "https://spotify.com/choice",
            previewUrl: null,
          };

          stageCandidates = [...hindiMocks, ...englishMocks, choiceMock];
        }

        const allowInstrumental = Boolean(intent?.sonicProfile?.allowInstrumental);

        // Apply dedicated TransitionReranker (Call 2)
        let selectedTracks: Track[] = [];
        if (transitionReranker) {
          selectedTracks = await transitionReranker.rerankStage(
            stageCandidates,
            {
              stage: stage.stage,
              mood: stage.mood,
              description: stage.description,
              musicalCharacteristics: stage.musicalCharacteristics,
              energy: stage.energy,
              valence: stage.valence,
              sonicProfile: intent?.sonicProfile,
              cumulativeArtistCounts,
              excludeSignatures: seenSignatures,
              maxPerArtist: 1,
              maxCumulativePerArtist: 2,
              allowInstrumental,
            },
            signal,
          );
        } else {
          selectedTracks = balanceTransitionTracks(stageCandidates, MAX_TRACKS_PER_STAGE, {
            cumulativeArtistCounts,
            excludeSignatures: seenSignatures,
            maxPerArtist: 1,
            maxCumulativePerArtist: 2,
            allowInstrumental,
          });
        }

        // Ensure exactly up to 5 tracks
        const finalStageTracks = selectedTracks.slice(0, MAX_TRACKS_PER_STAGE);

        // Update cross-stage tracking sets
        for (const track of finalStageTracks) {
          const sig = getSongSignature(track);
          seenSignatures.add(sig);
          const primaryArtist = (track.artists[0] || "").toLowerCase().trim();
          cumulativeArtistCounts[primaryArtist] =
            (cumulativeArtistCounts[primaryArtist] || 0) + 1;
        }

        stagePlaylists.push({
          stage: stage.stage,
          mood: stage.mood,
          description: stage.description,
          musicalCharacteristics: stage.musicalCharacteristics,
          energy: stage.energy,
          valence: stage.valence,
          tracks: finalStageTracks,
        });
      }

      const totalTracks = stagePlaylists.reduce((acc, s) => acc + s.tracks.length, 0);

      return {
        startingMood,
        destinationMood,
        stages: stagePlaylists,
        totalTracks,
      };
    },
  };
}
