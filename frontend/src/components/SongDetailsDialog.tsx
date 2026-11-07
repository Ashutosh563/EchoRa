import { useEffect, useRef } from 'react';
import { ExternalLink, Music, X } from 'lucide-react';
import type { Track } from '../types';
import { formatDuration } from '../lib/format';
import { SpotifyIcon } from './ConnectSpotifyButton';

interface SongDetailsDialogProps {
  track: Track;
  onClose: () => void;
}

export function SongDetailsDialog({ track, onClose }: SongDetailsDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 backdrop-blur-md p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="song-detail-title"
        className="glass-panel relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/15 p-5 sm:p-7 shadow-2xl shadow-black/40"
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close song details"
          className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/30 text-text-dim backdrop-blur-xl transition hover:bg-white/10 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto mb-6 aspect-square w-full max-w-[320px] overflow-hidden rounded-[22px] border border-white/15 bg-gradient-to-br from-violet/30 to-cyan/20 shadow-2xl shadow-black/40">
          {track.albumArtUrl ? (
            <img
              src={track.albumArtUrl}
              alt={`${track.album} album cover`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center">
              <Music className="h-16 w-16 text-text-dim" />
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-faint">
            Song details
          </p>
          <h2 id="song-detail-title" className="font-display text-2xl font-bold leading-tight text-text sm:text-3xl">
            {track.name}
          </h2>
          <p className="mt-2 text-base font-medium text-text-dim">
            {track.artists?.join(', ') || 'Unknown Artist'}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm text-text-faint">
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">{track.album || 'Unknown album'}</span>
            {formatDuration(track.durationMs) && (
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">
                {formatDuration(track.durationMs)}
              </span>
            )}
          </div>
          <a
            href={track.spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-spotify/30 bg-spotify/15 px-5 py-2.5 text-sm font-semibold text-spotify transition hover:bg-spotify/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-spotify"
          >
            <SpotifyIcon className="h-4 w-4" />
            Listen on Spotify
            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </a>
        </div>
      </section>
    </div>
  );
}
