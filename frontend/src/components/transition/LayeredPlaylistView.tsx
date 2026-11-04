import {
  Play,
  RotateCcw,
  ExternalLink,
  Music,
} from "lucide-react";
import { motion } from "framer-motion";
import type { TransitionJourneyResponse } from "../../types/transition";
import { formatDuration } from "../../lib/format";

interface LayeredPlaylistViewProps {
  journey: TransitionJourneyResponse;
  onReset: () => void;
}

export function LayeredPlaylistView({ journey, onReset }: LayeredPlaylistViewProps) {
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
    <div className="w-full max-w-4xl mx-auto space-y-10 py-6 pb-16">
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

          return (
            <motion.section
              key={`stage-playlist-${stage.stage}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: stage.stage * 0.1 }}
              className={`rounded-2xl border ${styling.border} ${styling.bg} p-6 sm:p-7 relative transition-all shadow-glass`}
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

              {/* Stage Track Cards */}
              <div className="pt-4 divide-y divide-white/5">
                {stage.tracks.length === 0 ? (
                  <div className="py-6 text-center text-xs text-text-faint italic">
                    No tracks found for this stage.
                  </div>
                ) : (
                  stage.tracks.map((track) => {
                    return (
                      <div
                        key={track.id}
                        className="py-3 px-2 sm:px-3 rounded-xl flex items-center justify-between gap-3 transition-colors hover:bg-white/[0.04] group"
                      >
                        {/* Left: Play button (redirects to Spotify) & Track Metadata */}
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <a
                            href={track.spotifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Play ${track.name} on Spotify`}
                            title="Play on Spotify"
                            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 group-hover:bg-emerald-500/20 text-text-dim group-hover:text-emerald-400 border border-white/10 group-hover:border-emerald-500/30 transition-all cursor-pointer shrink-0"
                          >
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5 transition-transform group-hover:scale-110" />
                          </a>

                          {/* Album Art */}
                          {track.albumArtUrl ? (
                            <img
                              src={track.albumArtUrl}
                              alt={track.album}
                              className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0 hidden sm:block"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 hidden sm:block text-text-faint">
                              <Music className="w-4 h-4" />
                            </div>
                          )}

                          {/* Title and Artist */}
                          <div className="min-w-0">
                            <a
                              href={track.spotifyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs sm:text-sm font-semibold truncate block text-text hover:text-emerald-400 transition-colors"
                            >
                              {track.name}
                            </a>
                            <p className="text-[11px] sm:text-xs text-text-dim truncate">
                              {track.artists?.join(", ") || "Unknown Artist"} • {track.album}
                            </p>
                          </div>
                        </div>

                        {/* Right: Duration & Spotify External Link */}
                        <div className="flex items-center gap-3 shrink-0">
                          {track.durationMs && (
                            <span className="text-xs font-mono text-text-faint hidden sm:inline">
                              {formatDuration(track.durationMs)}
                            </span>
                          )}

                          <a
                            href={track.spotifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Open ${track.name} on Spotify`}
                            title="Open in Spotify"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs text-text-faint hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 transition-all cursor-pointer"
                          >
                            <span className="hidden md:inline text-[11px] font-medium">Spotify</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.section>
          );
        })}
      </div>
    </div>
  );
}
