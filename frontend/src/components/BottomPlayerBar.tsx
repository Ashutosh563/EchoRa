import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
  Music,
  Loader2,
} from 'lucide-react';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { formatDuration } from '../lib/format';

export function BottomPlayerBar() {
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    volume,
    isMuted,
    queue,
    queueIndex,
    togglePlayPause,
    seekTo,
    setVolume,
    toggleMute,
    playNext,
    playPrevious,
    closePlayer,
  } = useAudioPlayer();

  if (!currentTrack) return null;

  const currentFormatted = formatDuration(currentTime * 1000) || '0:00';
  const durationFormatted = formatDuration(duration * 1000) || '0:00';
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const artistText = currentTrack.artists?.join(', ') || 'Unknown Artist';

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    seekTo(val);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
  };

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-40 px-3 sm:px-6 pb-3 pt-1 pointer-events-none"
        aria-label="Native Music Player"
      >
        <div className="max-w-5xl mx-auto glass-panel bg-surface/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-3 sm:px-5 sm:py-3 shadow-2xl shadow-black/60 pointer-events-auto flex flex-col gap-2">
          {/* Main Controls Row */}
          <div className="flex items-center justify-between gap-3 sm:gap-6">
            {/* Left: Track Information */}
            <div className="flex items-center gap-3 min-w-0 max-w-[32%] sm:max-w-[28%]">
              <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 bg-white/5 border border-white/15 shadow-md flex items-center justify-center">
                {currentTrack.albumArtUrl ? (
                  <img
                    src={currentTrack.albumArtUrl}
                    alt={currentTrack.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Music className="w-5 h-5 text-text-dim" />
                )}

                {/* Animated Equalizer bars overlay when playing */}
                {isPlaying && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-0.5">
                    <span className="w-0.5 h-3 bg-cyan animate-pulse rounded-full" />
                    <span className="w-0.5 h-4 bg-cyan animate-bounce rounded-full" style={{ animationDelay: '150ms' }} />
                    <span className="w-0.5 h-2 bg-cyan animate-pulse rounded-full" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4
                    className="font-display font-semibold text-xs sm:text-sm text-text truncate hover:text-cyan transition-colors"
                    title={currentTrack.name}
                  >
                    {currentTrack.name}
                  </h4>
                  {queue.length > 0 && queueIndex !== -1 && (
                    <span className="font-mono text-[9px] text-cyan/90 bg-cyan/10 border border-cyan/25 px-1.5 py-0.5 rounded-full shrink-0" title={`Track ${queueIndex + 1} of ${queue.length} in playlist`}>
                      {queueIndex + 1}/{queue.length}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-text-dim truncate mt-0.5" title={artistText}>
                  {artistText}
                </p>
              </div>
            </div>

            {/* Center: Playback Controls */}
            <div className="flex-1 max-w-md flex flex-col items-center gap-1">
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Previous Button */}
                <button
                  type="button"
                  onClick={playPrevious}
                  className="p-1.5 sm:p-2 rounded-full text-text-dim hover:text-text hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                  aria-label={queue.length > 0 && queueIndex === 0 ? "Previous track (loops to end)" : "Previous track"}
                  title={queue.length > 0 && queueIndex === 0 ? "Previous track (loops to end)" : "Previous track"}
                >
                  <SkipBack className="w-4 h-4 fill-current" />
                </button>

                {/* Play / Pause Toggle with glow */}
                <button
                  type="button"
                  onClick={togglePlayPause}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-cyan text-ink flex items-center justify-center hover:scale-105 active:scale-95 shadow-md shadow-cyan/30 transition-all cursor-pointer"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isBuffering ? (
                    <Loader2 className="w-4 h-4 animate-spin text-ink" />
                  ) : isPlaying ? (
                    <Pause className="w-4 h-4 fill-current text-ink" />
                  ) : (
                    <Play className="w-4 h-4 fill-current text-ink ml-0.5" />
                  )}
                </button>

                {/* Next Button */}
                <button
                  type="button"
                  onClick={playNext}
                  className="p-1.5 sm:p-2 rounded-full text-text-dim hover:text-text hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                  aria-label={queue.length > 0 && queueIndex === queue.length - 1 ? "Next track (loops to start)" : "Next track"}
                  title={queue.length > 0 && queueIndex === queue.length - 1 ? "Next track (loops to start)" : "Next track"}
                >
                  <SkipForward className="w-4 h-4 fill-current" />
                </button>
              </div>

              {/* Progress & Scrub Bar */}
              <div className="w-full flex items-center gap-2 text-[10px] sm:text-xs font-mono text-text-faint">
                <span className="w-8 text-right select-none">{currentFormatted}</span>
                <div className="relative flex-1 flex items-center h-4 group cursor-pointer">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    value={currentTime}
                    onChange={handleSeekChange}
                    className="w-full h-1 bg-white/15 rounded-lg appearance-none cursor-pointer accent-cyan focus:outline-none"
                    style={{
                      background: `linear-gradient(to right, rgb(0, 240, 255) 0%, rgb(0, 240, 255) ${progressPercent}%, rgba(255, 255, 255, 0.15) ${progressPercent}%, rgba(255, 255, 255, 0.15) 100%)`,
                    }}
                    aria-label="Seek track position"
                  />
                </div>
                <span className="w-8 text-left select-none">{durationFormatted}</span>
              </div>
            </div>

            {/* Right: Volume & Dismiss */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Volume Controller (Desktop/Tablet) */}
              <div className="hidden sm:flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-1.5 rounded-full text-text-dim hover:text-text hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-text-dim" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-text-dim" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan"
                  aria-label="Volume slider"
                />
              </div>

              {/* Dismiss Player Button */}
              <button
                type="button"
                onClick={closePlayer}
                className="p-1.5 rounded-full text-text-dim hover:text-text hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close music player"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}

