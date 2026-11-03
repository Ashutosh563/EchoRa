import type { AppMode, Track } from "../types/api";
import { TrackCard } from "./TrackCard";

interface TrackListProps {
  tracks: Track[];
  mode: AppMode;
}

/** Result list with empty-state message and Spotify attribution. */
export function TrackList({ tracks, mode }: TrackListProps) {
  return (
    <section className="results" aria-labelledby="results-heading">
      <h2 id="results-heading">Results</h2>
      {tracks.length === 0 ? (
        <p className="empty">No songs matched that request. Try describing it differently.</p>
      ) : (
        <ul className="track-list">
          {tracks.map((track) => (
            <TrackCard key={track.id} track={track} />
          ))}
        </ul>
      )}
      <p className="attribution">
        {mode === "live"
          ? "Music metadata and artwork provided by Spotify."
          : "Mock results for testing. Links open a Spotify search."}
      </p>
    </section>
  );
}

