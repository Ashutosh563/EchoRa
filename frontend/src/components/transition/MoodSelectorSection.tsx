import { Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import { getMoodTheme } from "../../lib/moodTheme";

export const PRESET_MOODS = [
  "Sad",
  "Happy",
  "Anxious",
  "Lonely",
  "Relaxed",
  "Energetic",
  "Nostalgic",
  "Neutral",
  "Hopeful",
  "Confident",
  "Peaceful",
  "Melancholic",
];

interface MoodSelectorSectionProps {
  startingMood: string;
  destinationMood?: string;
  onSelectStarting: (mood: string) => void;
  onSelectDestination: (mood: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
  error: string | null;
}

export function MoodSelectorSection({
  startingMood,
  destinationMood = "",
  onSelectStarting,
  onSelectDestination,
  onGenerate,
  isLoading,
  error,
}: MoodSelectorSectionProps) {
  const isSame =
    Boolean(startingMood) &&
    Boolean(destinationMood) &&
    startingMood.toLowerCase() === destinationMood.toLowerCase();

  const canProceed = Boolean(startingMood) && Boolean(destinationMood) && !isSame && !isLoading;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-10 py-6">
      {/* Intro Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-pill text-xs font-semibold text-violet uppercase tracking-wider border border-white/10">
          <Sparkles className="w-3.5 h-3.5" />
          <span>4-Stage Emotional Bridge</span>
        </div>
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-text tracking-tight">
          Shape your <span className="aurora-text">emotional journey</span>.
        </h1>
        <p className="text-sm sm:text-base text-text-dim max-w-lg mx-auto">
          Choose where your heart is right now and where you want the music to guide you.
        </p>
      </div>

      {/* Grid of Two Questions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Question 1: Starting Mood */}
        <div className="glass-panel p-5 sm:p-6 rounded-[26px] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono tracking-wider uppercase text-violet font-semibold">
              Step 01
            </span>
            {startingMood && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet/20 border border-violet/30 text-white font-medium">
                {startingMood}
              </span>
            )}
          </div>
          <h2 className="font-display font-bold text-lg text-text">
            How are you feeling right now?
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
            {PRESET_MOODS.map((mood) => {
              const isSelected = startingMood.toLowerCase() === mood.toLowerCase();
              const theme = getMoodTheme(null, mood);
              const emoji = moodEmoji(mood);
              return (
                <motion.button
                  key={`start-${mood}`}
                  type="button"
                  onClick={() => onSelectStarting(mood)}
                  whileTap={{ scale: 0.97 }}
                  style={{ "--tile-mood": theme.primary, "--tile-secondary": theme.secondary } as CSSProperties}
                  className={`mood-choice group relative overflow-hidden flex items-center gap-2.5 text-left px-3 py-3 rounded-2xl border transition-all cursor-pointer ${isSelected ? "mood-choice-selected" : "border-white/[0.09] bg-white/[0.035] hover:bg-white/[0.07] hover:border-white/20"}`}
                  aria-pressed={isSelected}
                  aria-label={mood}
                >
                  <span className="relative z-10 w-9 h-9 rounded-xl flex items-center justify-center text-lg bg-white/[0.06] border border-white/10">{emoji}</span>
                  <span className="relative z-10 text-xs sm:text-sm font-semibold text-text">{mood}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Question 2: Destination Mood */}
        <div className="glass-panel p-5 sm:p-6 rounded-[26px] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono tracking-wider uppercase text-cyan font-semibold">
              Step 02
            </span>
            {destinationMood && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan/20 border border-cyan/30 text-white font-medium">
                {destinationMood}
              </span>
            )}
          </div>
          <h2 className="font-display font-bold text-lg text-text">
            How would you like to feel?
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
            {PRESET_MOODS.map((mood) => {
              const isSelected = destinationMood.toLowerCase() === mood.toLowerCase();
              const theme = getMoodTheme(null, mood);
              const emoji = moodEmoji(mood);
              return (
                <motion.button
                  key={`dest-${mood}`}
                  type="button"
                  onClick={() => onSelectDestination(mood)}
                  whileTap={{ scale: 0.97 }}
                  style={{ "--tile-mood": theme.primary, "--tile-secondary": theme.secondary } as CSSProperties}
                  className={`mood-choice group relative overflow-hidden flex items-center gap-2.5 text-left px-3 py-3 rounded-2xl border transition-all cursor-pointer ${isSelected ? "mood-choice-selected" : "border-white/[0.09] bg-white/[0.035] hover:bg-white/[0.07] hover:border-white/20"}`}
                  aria-pressed={isSelected}
                  aria-label={mood}
                >
                  <span className="relative z-10 w-9 h-9 rounded-xl flex items-center justify-center text-lg bg-white/[0.06] border border-white/10">{emoji}</span>
                  <span className="relative z-10 text-xs sm:text-sm font-semibold text-text">{mood}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Validation Warning when same mood */}
      {isSame && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs text-center max-w-md mx-auto">
          Starting and destination moods are the same. Please choose a different destination mood to map a transition.
        </div>
      )}

      {/* General Error Card */}
      {error && !isSame && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs text-center max-w-md mx-auto">
          {error}
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-center pt-2">
        <motion.button
          type="button"
          onClick={onGenerate}
          disabled={!canProceed}
          whileTap={canProceed ? { scale: 0.98 } : undefined}
          className={`px-8 py-3.5 rounded-full font-display font-bold text-sm flex items-center gap-2.5 transition-all shadow-lg ${
            canProceed
              ? "mood-cta text-white hover:brightness-110 cursor-pointer"
              : "bg-white/5 text-text-faint border border-white/5 cursor-not-allowed opacity-40"
          }`}
        >
          <span>{isLoading ? "Designing emotional stages..." : "Generate Journey"}</span>
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  );
}

function moodEmoji(mood: string): string {
  const key = mood.toLowerCase();
  if (/sad|melanchol|lonely/.test(key)) return "🌧️";
  if (/happy|hopeful|confident/.test(key)) return "☀️";
  if (/anxious/.test(key)) return "🌫️";
  if (/relaxed|peaceful/.test(key)) return "🌿";
  if (/energetic/.test(key)) return "⚡";
  if (/nostalgic/.test(key)) return "📼";
  return "🌙";
}

