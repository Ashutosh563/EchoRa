import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <motion.section
          role="dialog"
          aria-modal="true"
          aria-labelledby="song-detail-title"
          initial={{ opacity: 0, scale: 0.93, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ type: 'spring', damping: 26, stiffness: 340 }}
          className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-white/20 p-6 sm:p-8 shadow-2xl shadow-black/60 bg-[#0d0f18]/85 backdrop-blur-2xl"
        >
          {/* Ambient colorful backlight behind dialog */}
          <div
            className="absolute -inset-10 rounded-full blur-3xl opacity-35 -z-10 pointer-events-none transition-all duration-700"
            style={{
              background: track.albumArtUrl
                ? `radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--mood-primary, #8B5CF6) 40%, transparent), transparent 70%)`
                : 'radial-gradient(circle at 50% 30%, #8B5CF6, #22D3EE, transparent)',
            }}
          />

          {/* Close button with liquid glass styling */}
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close song details"
            className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/[0.08] text-text-dim backdrop-blur-xl transition-all hover:bg-white/20 hover:text-white hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan cursor-pointer shadow-md"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Album Cover with Glass Depth */}
          <div className="relative mx-auto mb-6 aspect-square w-full max-w-[280px] sm:max-w-[300px] overflow-hidden rounded-[24px] border border-white/20 shadow-2xl shadow-black/60 bg-gradient-to-br from-violet/30 to-cyan/20 group">
            {track.albumArtUrl ? (
              <img
                src={track.albumArtUrl}
                alt={`${track.album} album cover`}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="grid h-full w-full place-items-center">
                <Music className="h-16 w-16 text-text-dim" />
              </div>
            )}
            {/* Glossy sheen overlay on artwork */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.06] to-white/[0.18]" />
          </div>

          {/* Song Info */}
          <div className="text-center">
            <span className="inline-block mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan drop-shadow-sm">
              Song Spotlight
            </span>
            <h2
              id="song-detail-title"
              className="font-display text-2xl font-bold leading-tight text-white sm:text-3xl line-clamp-2"
            >
              {track.name}
            </h2>
            <p className="mt-2 text-base font-medium text-text-dim">
              {track.artists?.join(', ') || 'Unknown Artist'}
            </p>

            {/* Badges */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-text-dim">
              {track.album && (
                <span className="rounded-full border border-white/12 bg-white/[0.06] px-3.5 py-1.5 backdrop-blur-md">
                  {track.album}
                </span>
              )}
              {formatDuration(track.durationMs) && (
                <span className="rounded-full border border-white/12 bg-white/[0.06] px-3.5 py-1.5 font-mono backdrop-blur-md">
                  {formatDuration(track.durationMs)}
                </span>
              )}
            </div>

            {/* Saturated Spotify CTA Button */}
            <a
              href={track.spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full border border-spotify/50 bg-spotify text-black font-display font-bold px-7 py-3 text-sm transition-all duration-200 hover:scale-105 hover:brightness-110 hover:shadow-[0_0_28px_rgba(29,185,84,0.65)] active:scale-95 shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-spotify"
            >
              <SpotifyIcon className="h-4 w-4 fill-black text-black" />
              <span>Listen on Spotify</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-80" />
            </a>
          </div>
        </motion.section>
      </motion.div>
    </AnimatePresence>
  );
}
