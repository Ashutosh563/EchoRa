import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  ExternalLink,
  Music,
} from "lucide-react";
import { motion } from "framer-motion";
import type { TransitionJourneyResponse } from "../../types/transition";
import { useTransitionPlayback } from "../../hooks/useTransitionPlayback";
import { formatDuration } from "../../lib/format";

interface LayeredPlaylistViewProps {
  journey: TransitionJourneyResponse;
  onReset: () => void;
}

export function LayeredPlaylistView({ journey, onReset }: LayeredPlaylistViewProps) {
  const {
    currentItem,
    activeTrackId,
    activeStageNumber,
    isPlaying,
    progress,
    playEntireJourney,
    playStage,
    playTrackInQueue,
    togglePlay,
    skipNext,
    skipPrev,
  } = useTransitionPlayback();

  const stageTitles: Record<number, string> = {
    1: "Starting Mood",
    2: "First Transition",
    3: "Second Transition",
    4: "Destination Mood",
  };

  const stageColors: Record<number, { border: string; bg: string; text: string; dot: string }> = {
    1: {
      border: "border-violet/30",
      bg: "bg-violet/5",
      text: "text-violet",
      dot: "bg-violet",
    },
    2: {
      border: "border-indigo-500/30",
      bg: "bg-indigo-500/5",
      text: "text-indigo-400",
      dot: "bg-indigo-400",
    },
    3: {
      border: "border-cyan/30",
      bg: "bg-cyan/5",
      text: "text-cyan",
      dot: "bg-cyan",
    },
    4: {
      border: "border-magenta/30",
      bg: "bg-magenta/5",
      text: "text-magenta",
      dot: "bg-magenta",
    },
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-10 py-6 pb-28">
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
            {journey.totalTracks} unique tracks woven across four progressive emotional stages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => playEntireJourney(journey.stages)}
            className="px-5 py-2.5 rounded-full font-display font-semibold text-xs bg-gradient-to-r from-violet to-cyan text-white shadow-lg shadow-violet/25 hover:brightness-110 flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Play Entire Journey</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            className="px-3.5 py-2 rounded-full glass-pill text-xs font-medium text-text-dim hover:text-text border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
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
          const isCurrentActiveStage = activeStageNumber === stage.stage;

          return (
            <motion.section
              key={`stage-playlist-${stage.stage}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: stage.stage * 0.12 }}
              className={`rounded-2xl border ${styling.border} ${styling.bg} p-6 sm:p-7 relative transition-all ${
                isCurrentActiveStage ? "ring-1 ring-white/20 shadow-glass-elevated" : ""
              }`}
            >
              {/* Stage Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-dim">
                      0{stage.stage} — {stageTitles[stage.stage]}
                    </span>
                    {isCurrentActiveStage && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        Now Playing
                      </span>
                    )}
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

                <button
                  type="button"
                  onClick={() => playStage(stage)}
                  className="px-4 py-2 rounded-full glass-pill border border-white/10 text-xs font-semibold text-text hover:text-white hover:bg-white/10 flex items-center gap-1.5 self-start sm:self-center transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play Stage 0{stage.stage}</span>
                </button>
              </div>

              {/* Stage Track Cards */}
              <div className="pt-4 divide-y divide-white/5">
                {stage.tracks.length === 0 ? (
                  <div className="py-6 text-center text-xs text-text-faint italic">
                    No preview tracks found for this stage.
                  </div>
                ) : (
                  stage.tracks.map((track) => {
                    const isTrackPlaying = activeTrackId === track.id && isPlaying;
                    const isTrackActive = activeTrackId === track.id;

                    return (
                      <div
                        key={track.id}
                        className={`py-3 px-2 sm:px-3 rounded-xl flex items-center justify-between gap-3 transition-colors ${
                          isTrackActive
                            ? "bg-white/10 border border-white/10"
                            : "hover:bg-white/[0.04]"
                        }`}
                      >
                        {/* Left: Index / Play Icon & Track Metadata */}
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <button
                            type="button"
                            onClick={() =>
                              playTrackInQueue(track, stage.stage, stage.mood, journey.stages)
                            }
                            aria-label={`${isTrackPlaying ? "Pause" : "Play"} ${track.name}`}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                              isTrackActive
                                ? "bg-violet text-white shadow-md shadow-violet/30"
                                : "bg-white/5 hover:bg-white/15 text-text-dim hover:text-text border border-white/10"
                            }`}
                          >
                            {isTrackPlaying ? (
                              <Pause className="w-3.5 h-3.5 fill-current" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            )}
                          </button>

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
                            <h4
                              className={`text-xs sm:text-sm font-semibold truncate ${
                                isTrackActive ? "text-violet-light font-bold" : "text-text"
                              }`}
                            >
                              {track.name}
                            </h4>
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
                            className="p-1.5 rounded-full text-text-faint hover:text-emerald-400 hover:bg-white/5 transition-colors cursor-pointer"
                          >
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

      {/* Floating Sticky Continuous Playback Bar */}
      {currentItem && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-4 left-4 right-4 max-w-3xl mx-auto glass-panel bg-ink/90 border border-white/20 p-3 sm:p-4 rounded-2xl shadow-glass-elevated z-40 flex flex-col gap-2"
        >
          {/* Progress bar */}
          <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-violet via-fuchsia-500 to-cyan h-full transition-all duration-200"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            {/* Active Track & Stage Info */}
            <div className="flex items-center gap-3 min-w-0">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-violet/20 text-violet shrink-0 border border-violet/30">
                Stage 0{currentItem.stageNumber}: {currentItem.stageMood}
              </span>
              <div className="min-w-0">
                <h5 className="text-xs font-bold text-text truncate">
                  {currentItem.track.name}
                </h5>
                <p className="text-[10px] text-text-dim truncate">
                  {currentItem.track.artists?.join(", ")}
                </p>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={skipPrev}
                aria-label="Previous track"
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-dim hover:text-text hover:bg-white/5 cursor-pointer"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="w-9 h-9 rounded-full bg-gradient-to-r from-violet to-cyan text-white flex items-center justify-center shadow-md shadow-violet/30 cursor-pointer"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-white" />
                ) : (
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={skipNext}
                aria-label="Next track"
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-dim hover:text-text hover:bg-white/5 cursor-pointer"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
