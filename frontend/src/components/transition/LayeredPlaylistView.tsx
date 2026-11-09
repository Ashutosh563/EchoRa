import { memo, type CSSProperties } from "react";
import {
  Play,
  Pause,
  Loader2,
  RotateCcw,
  ExternalLink,
  Music,
} from "lucide-react";
import { motion } from "framer-motion";
import type { TransitionJourneyResponse } from "../../types/transition";
import { formatDuration } from "../../lib/format";
import { getMoodTheme } from "../../lib/moodTheme";
import { SpotifyIcon } from "../ConnectSpotifyButton";
import { useAudioPlayer } from "../../context/AudioPlayerContext";

interface LayeredPlaylistViewProps {
  journey: TransitionJourneyResponse;
  onReset: () => void;
}

export const LayeredPlaylistView = memo(function LayeredPlaylistView({ journey, onReset }: LayeredPlaylistViewProps) {
  let player: ReturnType<typeof useAudioPlayer> | null = null;
  try {
    player = useAudioPlayer();
  } catch {
    player = null;
  }

  const allJourneyTracks = journey.stages.flatMap((s) => s.tracks);
  const stageTitles: Record<number, string> = {
    1: "Starting Mood",
    2: "First Transition",
    3: "Second Transition",
    4: "Destination Mood",
  };

  const stageColors: Record<number, { border: string; bg: string; text: string; dot: string; pill: string }> = {
    1: {
      border: "border-violet/30",
      bg: "bg-violet/5",
      text: "text-violet",
      dot: "bg-violet",
      pill: "bg-violet/10 text-violet border-violet/20",
    },
    2: {
      border: "border-indigo-500/30",
      bg: "bg-indigo-500/5",
      text: "text-indigo-400",
      dot: "bg-indigo-400",
      pill: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    },
    3: {
      border: "border-cyan/30",
      bg: "bg-cyan/5",
      text: "text-cyan",
      dot: "bg-cyan",
      pill: "bg-cyan/10 text-cyan border-cyan/20",
    },
    4: {
      border: "border-magenta/30",
      bg: "bg-magenta/5",
      text: "text-magenta",
      dot: "bg-magenta",
      pill: "bg-magenta/10 text-magenta border-magenta/20",
    },
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-10 py-6 pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="text-[11px] font-mono tracking-wider uppercase text-cyan font-semibold">
            Emotional Music Journey
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-text tracking-tight pt-1">
            <span className="text-violet">{journey.startingMood}</span> →{" "}
            <span className="text-cyan">{journey.destinationMood}</span>
          </h1>
          <p className="text-xs sm:text-sm text-text-dim pt-1">
            {journey.totalTracks} unique tracks curated across four progressive emotional stages. Click play on any track to listen on Spotify.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onReset}
            className="px-4 py-2 rounded-full glass-pill text-xs font-semibold text-text-dim hover:text-text hover:bg-white/10 border border-white/10 flex items-center gap-2 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Journey</span>
          </button>
        </div>
      </div>

      {/* 4 Layered Stages */}
      <div className="space-y-8">
        {journey.stages.map((stage) => {
          const styling = stageColors[stage.stage] || stageColors[1];
          const moodTheme = getMoodTheme(null, stage.mood);

          return (
            <motion.section
              key={`stage-playlist-${stage.stage}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: stage.stage * 0.1 }}
              style={
                {
                  "--tile-mood": moodTheme.primary,
                  "--tile-secondary": moodTheme.secondary,
                  "--tile-accent": moodTheme.accent1,
                  "--tile-accent-2": moodTheme.accent2,
                } as CSSProperties
              }
              className={`mood-stage-card rounded-2xl border ${styling.border} ${styling.bg} p-6 sm:p-7 relative transition-all shadow-glass`}
            >
              {/* Stage Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-dim">
                      0{stage.stage} — {stageTitles[stage.stage]}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${styling.pill}`}>
                      {stage.tracks.length} {stage.tracks.length === 1 ? "track" : "tracks"}
                    </span>
                  </div>
                  <h2 className="font-display font-extrabold text-2xl text-text">
                    <span className="mr-2" aria-hidden="true">{moodEmoji(stage.mood)}</span>
                    {stage.mood}
                  </h2>
                  <p className="text-xs sm:text-sm text-text-dim max-w-xl">
                    {stage.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {stage.musicalCharacteristics.map((char) => (
                      <span
                        key={char}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-text-dim border border-white/5"
                      >
                        {char}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stage Track Cards - Arranged Side by Side (Horizontal Grid) */}
              {stage.tracks.length === 0 ? (
                <div className="py-6 text-center text-xs text-text-faint italic">
                  No tracks found for this stage.
                </div>
              ) : (
                <div className="pt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stage.tracks.map((track) => (
                    <div
                      key={track.id}
                      className="relative overflow-hidden p-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 hover:border-white/25 transition-all duration-200 flex flex-col justify-between gap-3 group/track hover:-translate-y-1 hover:shadow-lg shadow-black/20"
                    >
                      {/* Soft Moving Mood-Responsive Aurora Animation in Card Background on Hover */}
                      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl opacity-0 group-hover/track:opacity-25 transition-opacity duration-500">
                        <div className="w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 animate-conic stage-conic-aurora blur-[16px]" />
                      </div>

                      {/* Top: Album Art + Track Info */}
                      <div className="relative z-10 flex items-start gap-3 min-w-0">
                        {track.albumArtUrl ? (
                          <img
                            src={track.albumArtUrl}
                            alt={track.album}
                            loading="lazy"
                            decoding="async"
                            className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0 shadow-md group-hover/track:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-text-faint">
                            <Music className="w-5 h-5" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <a
                            href={track.spotifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs sm:text-sm font-semibold truncate block text-text hover:text-emerald-400 transition-colors"
                            title={track.name}
                          >
                            {track.name}
                          </a>
                          <p className="text-[11px] sm:text-xs text-text-dim truncate mt-0.5" title={track.artists?.join(", ")}>
                            {track.artists?.join(", ") || "Unknown Artist"}
                          </p>
                          <p className="text-[10px] sm:text-[11px] text-text-faint truncate mt-0.5" title={track.album}>
                            {track.album}
                          </p>
                        </div>
                      </div>

                      {/* Bottom Row: Duration & Player + Spotify Buttons */}
                      <div className="relative z-10 flex items-center justify-between pt-2.5 border-t border-white/[0.06] mt-auto">
                        {track.durationMs ? (
                          <span className="text-[11px] font-mono text-text-faint">
                            {formatDuration(track.durationMs)}
                          </span>
                        ) : (
                          <span />
                        )}

                        <div className="flex items-center gap-2">
                          {/* In-App Player Button (Just Left of Open on Spotify) */}
                          <button
                            type="button"
                            onClick={() => {
                              if (!player) return;
                              if (player.currentTrack?.id === track.id) {
                                player.togglePlayPause();
                              } else {
                                void player.playTrack(track, allJourneyTracks, { loopAtEnd: false });
                              }
                            }}
                            aria-label={
                              player?.currentTrack?.id === track.id && player?.isPlaying
                                ? `Pause ${track.name}`
                                : `Play ${track.name}`
                            }
                            title={
                              player?.currentTrack?.id === track.id && player?.isPlaying
                                ? "Pause"
                                : "Play"
                            }
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                              player?.currentTrack?.id === track.id && player?.isPlaying
                                ? "bg-cyan/25 text-cyan border border-cyan/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                                : "bg-white/[0.06] hover:bg-white/[0.12] text-text border border-white/10 hover:border-white/20"
                            }`}
                          >
                            {player?.currentTrack?.id === track.id && player?.isBuffering ? (
                              <Loader2 className="w-3 h-3 text-cyan animate-spin" />
                            ) : player?.currentTrack?.id === track.id && player?.isPlaying ? (
                              <Pause className="w-3 h-3 fill-current" />
                            ) : (
                              <Play className="w-3 h-3 fill-current ml-0.5" />
                            )}
                            <span>
                              {player?.currentTrack?.id === track.id && player?.isBuffering
                                ? "Loading"
                                : player?.currentTrack?.id === track.id && player?.isPlaying
                                ? "Pause"
                                : "Play"}
                            </span>
                          </button>

                          {/* Spotify External Link */}
                          <a
                            href={track.spotifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Play ${track.name} on Spotify`}
                            title="Play on Spotify"
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/20 hover:border-emerald-500/40 transition-all cursor-pointer group-hover/track:scale-105"
                          >
                            <SpotifyIcon className="w-3 h-3" />
                            <span>Spotify</span>
                            <ExternalLink className="w-3 h-3 opacity-70" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.section>
          );
        })}
      </div>
    </div>
  );
});

function moodEmoji(mood: string): string {
  const key = mood.toLowerCase();
  if (/sad|melanchol|lonely|grief/.test(key)) return "🌧️";
  if (/happy|hopeful|joy|confident/.test(key)) return "☀️";
  if (/anxious|tense/.test(key)) return "🌫️";
  if (/relax|peace|calm/.test(key)) return "🌿";
  if (/energetic|excited|power/.test(key)) return "⚡";
  if (/nostalg/.test(key)) return "📼";
  if (/dream|romantic|love/.test(key)) return "✨";
  return "🌙";
}
