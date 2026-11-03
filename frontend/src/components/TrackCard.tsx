import type { Track } from "../types/api";
import { formatDuration } from "../utils/format";

interface TrackCardProps {
  track: Track;
}

/** One result: artwork, title, artist, album, duration (if known) and Spotify link. */
export function TrackCard({ track }: TrackCardProps) {
  const duration = formatDuration(track.durationMs);
  const artists = track.artists.length ? track.artists.join(", ") : "Unknown artist";

  return (
    <li className="track-card">
      <a href={track.spotifyUrl} target="_blank" rel="noopener noreferrer" className="track-art-link">
        {track.albumArtUrl ? (
          <img src={track.albumArtUrl} alt={`Album artwork for ${track.album}`} className="track-art" loading="lazy" />
        ) : (
          <div className="track-art track-art--placeholder" aria-label="No artwork available">
            ♪
          </div>
        )}
      </a>
      <div className="track-info">
        <h3 className="track-title">{track.name}</h3>
        <p className="track-artist">{artists}</p>
        <p className="track-album">{track.album}</p>
        {duration && <p className="track-duration">{duration}</p>}
        <a href={track.spotifyUrl} target="_blank" rel="noopener noreferrer" className="track-link">
          Open in Spotify
        </a>
      </div>
    </li>
  );
}

