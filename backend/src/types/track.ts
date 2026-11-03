/** A music result returned to the frontend (mapped from Spotify search results). */
export interface Track {
  id: string;
  name: string;
  artists: string[];
  album: string;
  albumArtUrl: string | null;
  durationMs: number | null;
  /** Link back to the track on Spotify (required for attribution). */
  spotifyUrl: string;
  /** 30s preview; usually null since Spotify phased previews out. */
  previewUrl: string | null;
}

