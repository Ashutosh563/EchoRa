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

    // Subtle 4 degrees tilt for premium liquid glass feel
    const rX = ((y - centerY) / centerY) * -4;
    const rY = ((x - centerX) / centerX) * 4;

    setRotateX(rX);
    setRotateY(rY);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
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
      {/* Blurred Ambient Glow Behind Card matching album art or mood */}
      <div
        className="absolute -inset-1 rounded-[24px] -z-10 blur-xl opacity-20 group-hover:opacity-45 transition-all duration-500 pointer-events-none"
        style={{
          backgroundImage: track.albumArtUrl
            ? `url(${track.albumArtUrl})`
            : 'radial-gradient(circle, var(--mood-primary, #8B5CF6) 0%, transparent 70%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Main Apple Liquid Glass Card */}
      <article
        onClick={() => onSelectTrack(track)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectTrack(track);
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={`View details for ${track.name} by ${artistText}`}
        className="apple-glass-card p-3.5 flex items-center gap-3.5 relative overflow-hidden cursor-pointer select-none group-hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan"
      >
        {/* Top-edge specular glossy highlight overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

        {/* Album Art (88x88) with Specular Rim */}
        <div className="relative w-[88px] h-[88px] rounded-[16px] overflow-hidden shrink-0 bg-white/[0.04] border border-white/15 flex items-center justify-center shadow-md">
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

          {/* Centered Audio Preview Play/Pause button */}
          {track.previewUrl && (
            <PreviewButton
              isPlaying={isPreviewPlaying}
              progress={isPreviewPlaying ? previewProgress : 0}
              onToggle={() => onTogglePreview(track)}
            />
          )}
        </div>

        {/* Track Details */}
        <div className="flex-1 min-w-0 flex flex-col justify-between h-[88px] py-0.5 z-10">
          <div>
            {/* Track Name */}
            <h3
              className="font-display font-semibold text-sm sm:text-base text-text truncate group-hover:text-white transition-colors"
              title={track.name}
            >
              {track.name}
            </h3>

            {/* Artists */}
            <p className="text-xs text-text-dim truncate mt-0.5 group-hover:text-text transition-colors" title={artistText}>
              {artistText}
            </p>

            {/* Album Name */}
            <p className="text-[11px] text-text-faint truncate mt-0.5" title={track.album}>
              {track.album}
            </p>
          </div>

          {/* Bottom Actions: Duration badge & Open in Spotify link */}
          <div className="flex items-center justify-between gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
            {durationText ? (
              <span className="font-mono text-[10px] text-text-faint bg-white/[0.05] border border-white/10 px-2 py-0.5 rounded-full">
                {durationText}
              </span>
            ) : <span />}

            <a
              href={track.spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open "${track.name}" on Spotify`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-spotify/15 hover:bg-spotify/25 text-spotify text-[11px] font-semibold transition-all border border-spotify/30 hover:border-spotify/50 hover:scale-[1.03] active:scale-[0.98] shadow-sm"
            >
              <SpotifyIcon className="w-3 h-3 text-spotify" />
              <span>Spotify</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
            </a>
          </div>
        </div>
      </article>
    </motion.div>
  );
}
