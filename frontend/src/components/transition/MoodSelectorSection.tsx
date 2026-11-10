import { Sparkles, ArrowRight, WandSparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useState, type CSSProperties } from "react";
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
  onInterpretPrompt: (prompt: string) => void;
  interpretation: string;
  needsClarification: boolean;
}

export function MoodSelectorSection({
  startingMood,
  destinationMood = "",
  onSelectStarting,
  onSelectDestination,
  onGenerate,
  isLoading,
  error,
  onInterpretPrompt,
  interpretation,
  needsClarification,
}: MoodSelectorSectionProps) {
  const [prompt, setPrompt] = useState("");
  const [isPromptFocused, setIsPromptFocused] = useState(false);
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

      {/* Natural language composer styled to match Discover's glass composer */}
      <section className="w-full max-w-[760px] mx-auto" aria-label="Describe your mood transition">
        <div className="text-center mb-4">
          <h2 className="font-display font-bold text-lg text-text">Or describe the shift you want</h2>
          <p className="text-xs sm:text-sm text-text-dim mt-1">Tell us how you feel now and how you’d like to feel.</p>
        </div>
        <div className={`relative rounded-[22px] ${isPromptFocused ? "conic-active" : ""}`}>
          {isPromptFocused && <div className="absolute -inset-[2px] rounded-[22px] overflow-hidden -z-10 pointer-events-none opacity-70"><div className="w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 animate-conic mood-conic-aurora blur-[6px]" /></div>}
          <div className={`glass-panel p-4 sm:p-5 transition-colors duration-300 relative ${isPromptFocused ? "border-white/25 bg-surface-strong shadow-glass-elevated" : "border-white/10 hover:border-white/15"}`}>
            <label htmlFor="transition-prompt" className="sr-only">Describe how you feel now and how you want to feel</label>
            <textarea
              id="transition-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value.slice(0, 500))}
              onFocus={() => setIsPromptFocused(true)}
              onBlur={() => setIsPromptFocused(false)}
              onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (prompt.trim()) onInterpretPrompt(prompt); } }}
              placeholder="e.g. I feel overwhelmed after work and want to feel calm, clear, and focused…"
              rows={2}
              className="w-full min-h-[60px] bg-transparent resize-y border-0 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 text-white placeholder:text-white/60 text-base leading-relaxed font-medium"
              aria-describedby="transition-prompt-hint"
              maxLength={500}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-1 border-t border-white/[0.08]">
              <p id="transition-prompt-hint" className="text-xs text-text-dim">Press Enter to interpret · Shift+Enter for a new line</p>
              <div className="flex items-center gap-3 ml-auto">
                <span className="text-xs font-mono text-white/60" aria-live="polite">{prompt.length}<span className="opacity-60">/500</span></span>
                <div className="relative group/btn">
                  <div className="absolute -inset-2 rounded-full mood-gradient blur-lg opacity-20 group-hover/btn:opacity-45 transition-opacity pointer-events-none" />
                  <motion.button
                    type="button"
                    onClick={() => onInterpretPrompt(prompt)}
                    disabled={!prompt.trim()}
                    whileTap={prompt.trim() ? { scale: 0.96 } : undefined}
                    className={`relative z-10 px-5 py-2.5 rounded-full font-display font-bold text-sm tracking-wide flex items-center gap-2 mood-discover-btn text-white/90 border ${prompt.trim() ? "cursor-pointer" : "opacity-45 cursor-not-allowed"}`}
                    aria-label="Interpret mood transition"
                  >
                    <WandSparkles className="w-4 h-4" />
                    <span>Find my moods</span>
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </div>
        {interpretation && (
          <div className="glass-panel mt-3 p-4 rounded-2xl border border-white/10 shadow-glass" role="status" aria-live="polite">
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 shrink-0 rounded-xl bg-violet/15 border border-violet/25 flex items-center justify-center text-violet"><Sparkles className="w-4 h-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-text">{needsClarification ? "A little more detail will help" : "Here’s the transition I heard"}</p>
                <p className="text-xs sm:text-sm text-text-dim mt-1">{interpretation}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <label className="text-[11px] font-semibold text-violet">
                    Starting mood
                    <input value={startingMood} onChange={(event) => onSelectStarting(event.target.value.slice(0, 50))} maxLength={50} placeholder="How you feel now" className="mt-1 w-full px-3 py-2 rounded-xl bg-white/[0.045] border border-white/10 text-sm font-medium text-text placeholder:text-text-faint focus:border-violet/50" />
                  </label>
                  <label className="text-[11px] font-semibold text-cyan">
                    Destination mood
                    <input value={destinationMood} onChange={(event) => onSelectDestination(event.target.value.slice(0, 50))} maxLength={50} placeholder="How you want to feel" className="mt-1 w-full px-3 py-2 rounded-xl bg-white/[0.045] border border-white/10 text-sm font-medium text-text placeholder:text-text-faint focus:border-cyan/50" />
                  </label>
                </div>
                <p className="text-[11px] text-text-faint mt-2">You can also choose a preset below before building your journey.</p>
              </div>
            </div>
          </div>
        )}
      </section>

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

