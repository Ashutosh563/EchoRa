import type { Track } from "../../types/track.js";
import type {
  MoodStage,
  StagePlaylist,
  StageSearchIntent,
  TransitionJourneyResponse,
} from "../../types/transition.js";
import type { SpotifySearch } from "../spotify/spotifySearch.js";
import { BACKEND_MOCK_TRACKS } from "../music/mockMusic.js";

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
): PlaylistAssembler {
  return {
    async assemble(
      startingMood: string,
      destinationMood: string,
      stages: MoodStage[],
      intents: StageSearchIntent[],
      signal?: AbortSignal,
    ): Promise<TransitionJourneyResponse> {
      const seenTrackIds = new Set<string>();
      const stagePlaylists: StagePlaylist[] = [];

      // Exactly four Spotify search queries (one per stage)
      for (let i = 0; i < 4; i++) {
        const stage = stages[i];
        const intent = intents.find((it) => it.stage === stage.stage) || intents[i];
        const query = intent?.query || `${stage.mood} music`;

        let rawTracks: Track[] = [];

        if (spotifySearch) {
          try {
            // Search Spotify using exactly 1 call per stage (requesting 10 tracks to allow deduplication)
            rawTracks = await spotifySearch.searchTracks(query, 10, signal);
          } catch {
            // Gracefully handle partial Spotify search errors
            rawTracks = [];
          }
        } else {
          // Mock mode: allocate non-overlapping slices of mock tracks
          const startIdx = (i * 2) % BACKEND_MOCK_TRACKS.length;
          rawTracks = BACKEND_MOCK_TRACKS.slice(startIdx, startIdx + 3).map((t, idx) => ({
            ...t,
            id: `mock-stage-${stage.stage}-${idx}`,
            name: `${stage.mood} - ${t.name}`,
          }));
        }

        // Deduplicate across stages and select up to 5 tracks
        const stageTracks: Track[] = [];
        for (const track of rawTracks) {
          if (!seenTrackIds.has(track.id) && stageTracks.length < MAX_TRACKS_PER_STAGE) {
            seenTrackIds.add(track.id);
            stageTracks.push(track);
          }
        }

        stagePlaylists.push({
          stage: stage.stage,
          mood: stage.mood,
          description: stage.description,
          musicalCharacteristics: stage.musicalCharacteristics,
          energy: stage.energy,
          valence: stage.valence,
          tracks: stageTracks,
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

