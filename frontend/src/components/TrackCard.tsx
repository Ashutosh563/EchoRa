import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Music, ExternalLink } from 'lucide-react';
import type { Track } from '../types';
import { formatDuration } from '../lib/format';
import { SpotifyIcon } from './ConnectSpotifyButton';
import { PreviewButton } from './PreviewButton';

interface TrackCardProps {
  track: Track;
  index: number;
  activePreviewId: string | null;
  previewProgress: number;
  onTogglePreview: (track: Track) => void;
  onSelectTrack: (track: Track) => void;
}

export function TrackCard({
  track,
  index,
  activePreviewId,
  previewProgress,
  onTogglePreview,
  onSelectTrack,
}: TrackCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const [artLoaded, setArtLoaded] = useState(false);
  const [artFailed, setArtFailed] = useState(false);

  // 3D tilt state
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const isPreviewPlaying = activePreviewId === track.id;
  const durationText = formatDuration(track.durationMs);
  const artistText = track.artists?.join(', ') || 'Unknown Artist';

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Max 6 degrees tilt
    const rX = ((y - centerY) / centerY) * -6;
    const rY = ((x - centerX) / centerX) * 6;

    setRotateX(rX);
    setRotateY(rY);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: 'easeOut' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: 'preserve-3d',
        transform: shouldReduceMotion
          ? undefined
          : `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
      }}
      className="relative group transition-transform duration-200"
    >
      {/* Blurred Album Art Glow Behind Card */}
      {track.albumArtUrl && (
        <div
          className="absolute -inset-1 rounded-[22px] -z-10 blur-xl opacity-25 group-hover:opacity-45 transition-opacity duration-300 pointer-events-none"
          style={{
            backgroundImage: `url(${track.albumArtUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      {/* Main Glass Card */}
      <article className="glass-panel p-3.5 rounded-card relative overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:border-white/20 group-hover:bg-white/[0.065] shadow-glass">
        <button
          type="button"
          onClick={() => onSelectTrack(track)}
          aria-label={`View details for ${track.name} by ${artistText}`}
          className="w-full text-left flex items-center gap-3.5 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan"
        >
          {/* Album Art (88x88) */}
          <div className="relative w-[88px] h-[88px] rounded-[14px] overflow-hidden shrink-0 bg-white/[0.04] border border-white/10 flex items-center justify-center">
          {track.albumArtUrl && !artFailed ? (
            <img
              src={track.albumArtUrl}
              alt={track.name}
              onLoad={() => setArtLoaded(true)}
              onError={() => setArtFailed(true)}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                artLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-violet/30 to-cyan/30 flex items-center justify-center">
              <Music className="w-6 h-6 text-text-dim" />
            </div>
          )}

          </div>

        {/* Track Details */}
          <div className="flex-1 min-w-0 flex flex-col justify-center h-[88px] py-0.5">
          <div>
            {/* Track Name */}
            <h3
              className="font-display font-semibold text-sm sm:text-base text-text truncate group-hover:text-white transition-colors"
              title={track.name}
            >
              {track.name}
            </h3>

            {/* Artists */}
            <p className="text-xs text-text-dim truncate mt-0.5" title={artistText}>
              {artistText}
            </p>

            {/* Album & Duration */}
            <div className="flex items-center gap-2 text-[11px] text-text-faint truncate mt-0.5">
              <span className="truncate" title={track.album}>
                {track.album}
              </span>
              {durationText && (
                <>
                  <span className="text-white/20">•</span>
                  <span className="shrink-0 font-mono">{durationText}</span>
                </>
              )}
            </div>
          </div>

          </div>
        </button>
        {track.previewUrl && (
          <div className="absolute left-[58px] top-[58px] z-10 -translate-x-1/2 -translate-y-1/2">
            <PreviewButton
              isPlaying={isPreviewPlaying}
              progress={isPreviewPlaying ? previewProgress : 0}
              onToggle={() => onTogglePreview(track)}
            />
          </div>
        )}
        <div className="pt-2 pl-[102px]">
          <a
            href={track.spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open "${track.name}" on Spotify`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-spotify/15 hover:bg-spotify/25 text-spotify text-[11px] font-semibold transition-all border border-spotify/30 hover:border-spotify/50 hover:scale-[1.02] active:scale-[0.98]"
          >
            <SpotifyIcon className="w-3 h-3 text-spotify" />
            <span>Open in Spotify</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
          </a>
        </div>
      </article>
    </motion.div>
  );
}
