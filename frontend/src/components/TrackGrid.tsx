import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, Music, Loader2 } from 'lucide-react';
import type { Track } from '../types';
import { TrackCard } from './TrackCard';
import { SpotifyIcon } from './ConnectSpotifyButton';
import { SongDetailsDialog } from './SongDetailsDialog';

interface TrackGridProps {
  tracks: Track[];
  page?: number;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

export const TrackGrid = memo(function TrackGrid({
  tracks,
  hasMore = true,
  isLoadingMore = false,
  onLoadMore,
}: TrackGridProps) {
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activePreviewIdRef = useRef<string | null>(null);

  // Manage single audio preview instance with stable callback reference
  const handleTogglePreview = useCallback((track: Track) => {
    if (!track.previewUrl) return;

    if (activePreviewIdRef.current === track.id) {
      // Pause
      if (audioRef.current) {
        audioRef.current.pause();
      }
      activePreviewIdRef.current = null;
      setActivePreviewId(null);
      setPreviewProgress(0);
      return;
    }

    // Stop current audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(track.previewUrl);
    audioRef.current = audio;
    activePreviewIdRef.current = track.id;
    setActivePreviewId(track.id);
    setPreviewProgress(0);

    audio.ontimeupdate = () => {
      if (audio.duration) {
        setPreviewProgress(audio.currentTime / audio.duration);
      }
    };

    audio.onended = () => {
      activePreviewIdRef.current = null;
      setActivePreviewId(null);
      setPreviewProgress(0);
      audioRef.current = null;
    };

    audio.onerror = () => {
      activePreviewIdRef.current = null;
      setActivePreviewId(null);
      setPreviewProgress(0);
      audioRef.current = null;
    };

    void audio.play();
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      activePreviewIdRef.current = null;
    };
  }, []);

  if (!tracks || tracks.length === 0) {
    return (
      <div className="glass-panel p-8 text-center rounded-card border border-white/10 my-6">
        <Music className="w-8 h-8 text-text-faint mx-auto mb-3" />
        <h3 className="font-display font-semibold text-text text-base mb-1">
          No tracks matched
        </h3>
        <p className="text-text-dim text-sm max-w-sm mx-auto">
          Try describing your vibe differently or broadening the mood keywords.
        </p>
      </div>
    );
  }

  return (
    <section className="w-full my-6">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan" />
          <h2 className="font-display font-semibold text-lg text-text">
            Tracks for this moment
          </h2>
        </div>
        <span className="glass-pill px-2.5 py-0.5 text-xs font-mono text-text-dim border border-white/10">
          {tracks.length} tracks
        </span>
      </div>

      {/* Grid of Track Cards: 1 col mobile, 2 col tablet, 3 col desktop */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.04 },
          },
        }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        {tracks.map((track, index) => {
          const isPlaying = activePreviewId === track.id;
          return (
            <TrackCard
              key={track.id || index}
              track={track}
              playlist={tracks}
              isPreviewPlaying={isPlaying}
              activePreviewId={activePreviewId}
              previewProgress={isPlaying ? previewProgress : 0}
              onTogglePreview={handleTogglePreview}
              onSelectTrack={setSelectedTrack}
            />
          );
        })}
      </motion.div>

      {/* Continuous Discovery "Load More" Action: completely removed once 25+ tracks are assembled */}
      {onLoadMore && hasMore && tracks.length < 25 && (
        <div className="mt-8 flex flex-col items-center justify-center">
          <button
            type="button"
            disabled={isLoadingMore}
            onClick={onLoadMore}
            className="group relative inline-flex items-center justify-center gap-2.5 px-7 py-3 rounded-2xl font-medium text-sm text-text bg-gradient-to-r from-cyan/20 via-magenta/15 to-purple-500/20 hover:from-cyan/30 hover:via-magenta/25 hover:to-purple-500/30 border border-cyan/40 hover:border-cyan shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-4 h-4 text-cyan animate-spin" />
                <span className="font-mono text-cyan">Mining next tracks...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-cyan group-hover:rotate-12 transition-transform duration-300" />
                <span>Load More Tracks</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Attribution Footer */}
      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-text-faint">
        <SpotifyIcon className="w-3.5 h-3.5 text-text-faint" />
        <span>Track data and artwork provided by the source catalog.</span>
      </div>
      <AnimatePresence>
        {selectedTrack && (
          <SongDetailsDialog
            track={selectedTrack}
            onClose={() => setSelectedTrack(null)}
            isPreviewPlaying={activePreviewId === selectedTrack.id}
            previewProgress={activePreviewId === selectedTrack.id ? previewProgress : 0}
            onTogglePreview={handleTogglePreview}
          />
        )}
      </AnimatePresence>
    </section>
  );
});
