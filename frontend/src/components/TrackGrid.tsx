import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Music } from 'lucide-react';
import type { Track } from '../types';
import { TrackCard } from './TrackCard';
import { SpotifyIcon } from './ConnectSpotifyButton';
import { SongDetailsDialog } from './SongDetailsDialog';

interface TrackGridProps {
  tracks: Track[];
}

export function TrackGrid({ tracks }: TrackGridProps) {
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Manage single audio preview instance
  const handleTogglePreview = (track: Track) => {
    if (!track.previewUrl) return;

    if (activePreviewId === track.id) {
      // Pause
      if (audioRef.current) {
        audioRef.current.pause();
      }
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
    setActivePreviewId(track.id);

    audio.ontimeupdate = () => {
      if (audio.duration) {
        setPreviewProgress(audio.currentTime / audio.duration);
      }
    };

    audio.onended = () => {
      setActivePreviewId(null);
      setPreviewProgress(0);
      audioRef.current = null;
    };

    audio.onerror = () => {
      setActivePreviewId(null);
      setPreviewProgress(0);
      audioRef.current = null;
    };

    void audio.play();
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
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
            transition: { staggerChildren: 0.05 },
          },
        }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        {tracks.map((track, index) => (
          <TrackCard
            key={track.id || index}
            track={track}
            index={index}
            activePreviewId={activePreviewId}
            previewProgress={previewProgress}
            onTogglePreview={handleTogglePreview}
            onSelectTrack={setSelectedTrack}
          />
        ))}
      </motion.div>

      {/* Attribution Footer */}
      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-text-faint">
        <SpotifyIcon className="w-3.5 h-3.5 text-text-faint" />
        <span>Track data and artwork provided by Spotify.</span>
      </div>
      {selectedTrack && (
        <SongDetailsDialog track={selectedTrack} onClose={() => setSelectedTrack(null)} />
      )}
    </section>
  );
}

