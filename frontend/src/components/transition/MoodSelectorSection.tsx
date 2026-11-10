import { useEffect, useState, type CSSProperties } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, ChevronLeft, MessageSquareText, Sparkles } from "lucide-react";
import { getMoodTheme } from "../../lib/moodTheme";
import { useTypewriter } from "../../hooks/useTypewriter";

const MOOD_TRANSITION_EXAMPLES = [
  "I feel tense and want to feel grounded…",
  "Help me move from lonely to connected…",
  "I’m low after a long day and want a little hope…",
  "I feel restless and want to settle into calm…",
];

export const PRESET_MOODS = [
  "Sad", "Happy", "Anxious", "Lonely", "Relaxed", "Energetic",
  "Nostalgic", "Neutral", "Hopeful", "Confident", "Peaceful", "Melancholic",
];

export type MoodInputMode = "manual" | "describe";

interface MoodSelectorSectionProps {
  startingMood: string;
  mode: MoodInputMode;
  onModeChange: (mode: MoodInputMode) => void;
  destinationMood?: string;
  onSelectStarting: (mood: string) => void;
  onSelectDestination: (mood: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
  error: string | null;
  onInterpretPrompt: (prompt: string) => void;
  onClearInterpretation: () => void;
  interpretation: string;
  needsClarification: boolean;
}

/**
 * Shared spring config for the layoutId card morph AND sibling layout shifts.
 * Slightly softer stiffness than before so the height expansion reads as a
 * fluid stretch rather than a sudden snap.
 */
const CARD_SPRING = { type: "spring" as const, stiffness: 200, damping: 26, mass: 1 };

/** Opacity cross‑fade for the inner content swap (no y‑shift). */
const CONTENT_FADE = { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] as const };

const NO_MOTION = { duration: 0 };

export function MoodSelectorSection({
  startingMood,
  mode,
  onModeChange,
  destinationMood = "",
  onSelectStarting,
  onSelectDestination,
  onGenerate,
  isLoading,
  error,
  onInterpretPrompt,
  onClearInterpretation,
  interpretation,
  needsClarification,
}: MoodSelectorSectionProps) {
  const [manualStep, setManualStep] = useState<1 | 2>(1);
  const [prompt, setPrompt] = useState("");
  const [isPromptFocused, setIsPromptFocused] = useState(false);
  const reduceMotion = useReducedMotion();
  const typewriterText = useTypewriter(MOOD_TRANSITION_EXAMPLES, isPromptFocused || isLoading || prompt.length > 0);

  const cardTransition = reduceMotion ? NO_MOTION : CARD_SPRING;
  const fadeTransition = reduceMotion ? NO_MOTION : CONTENT_FADE;

  const isSame = Boolean(startingMood && destinationMood) && startingMood.trim().toLowerCase() === destinationMood.trim().toLowerCase();
  const canProceed = Boolean(startingMood.trim() && destinationMood.trim()) && !isSame && !isLoading;

  useEffect(() => {
    if (interpretation) setManualStep(2);
  }, [interpretation]);

  const startNewDescription = () => {
    setPrompt("");
    onClearInterpretation();
  };

  const changeMode = (nextMode: MoodInputMode) => {
    if (nextMode === "manual" && !startingMood) setManualStep(1);
    onModeChange(nextMode);
  };

  /* ──────────────────────────────────────────────────────────────────
   *  Architecture of the morph animation
   *
   *  LayoutGroup ← coordinates all layout animations together
   *  ├─ motion.header  layout="position"   ← slides up/down smoothly
   *  ├─ motion.div     layout="position"   ← mode toggle bar follows
   *  └─ motion.div     layoutId="mood-transition-input-card"
   *      │              ← single glass card that MORPHS its height/width
   *      └─ AnimatePresence mode="wait"
   *          └─ motion.div  opacity 0→1→0  ← inner content cross‑fades
   *
   *  Key insight: the card border never unmounts, so there's no flicker
   *  or duplicate‑panel flash.  The inner content is purely an opacity
   *  swap, and the card's height change is handled by framer‑motion's
   *  layout animation.
   * ────────────────────────────────────────────────────────────────── */

  return (
    <LayoutGroup id="mood-transition-input">
    <div className="w-full max-w-3xl mx-auto flex-1 flex flex-col justify-center gap-5 py-4 sm:py-7" aria-label="Mood transition setup">
      {/* Header — layout‑animated so it glides up when the card expands */}
      <motion.header layout="position" transition={cardTransition} className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-pill text-[10px] font-semibold text-violet uppercase tracking-wider border border-white/10">
          <Sparkles className="w-3 h-3" />
          <span>4-stage mood journey</span>
        </div>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-text tracking-tight">
          Where do you want your mood to go?
        </h1>
        <p className="text-xs sm:text-sm text-text-dim">Choose your moods or describe the shift in your own words.</p>
      </motion.header>

      {/* Mode toggle bar — also layout‑animated */}
      <motion.div layout="position" transition={cardTransition} className="mx-auto w-full max-w-xl">
        <div className="inline-flex w-full p-1 rounded-full bg-white/[0.035] border border-white/10 backdrop-blur-md" role="group" aria-label="Choose how to set your moods">
          <button
            type="button"
            onClick={() => changeMode("describe")}
            aria-pressed={mode === "describe"}
            className={`relative flex-1 min-h-11 px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-500 ${mode === "describe" ? "text-white" : "text-text-dim hover:text-text"}`}
          >
            {mode === "describe" && <motion.span layoutId="transitionInputMode" className="absolute inset-0 rounded-full mood-gradient shadow-md shadow-cyan/20" transition={reduceMotion ? NO_MOTION : { type: "spring", bounce: 0.14, duration: 0.48 }} />}
            <span className="relative z-10 inline-flex items-center gap-2"><MessageSquareText className="w-4 h-4" /> Describe transition</span>
          </button>
          <button
            type="button"
            onClick={() => changeMode("manual")}
            aria-pressed={mode === "manual"}
            className={`relative flex-1 min-h-11 px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-500 ${mode === "manual" ? "text-white" : "text-text-dim hover:text-text"}`}
          >
            {mode === "manual" && <motion.span layoutId="transitionInputMode" className="absolute inset-0 rounded-full mood-gradient shadow-md shadow-violet/20" transition={reduceMotion ? NO_MOTION : { type: "spring", bounce: 0.14, duration: 0.48 }} />}
            <span className="relative z-10 inline-flex items-center gap-2"><Check className="w-4 h-4" /> Choose moods</span>
          </button>
        </div>
      </motion.div>

      {/* ── The morphing glass card ───────────────────────────────────
       *  ONE persistent card that stretches / shrinks via layoutId.
       *  Inner content is swapped with a simple opacity cross‑fade.
       */}
      <div className="w-full max-w-2xl mx-auto">
        {/* Conic‑glow wrapper (visible only when the describe textarea is focused) */}
        <div className={`relative rounded-[24px] ${mode === "describe" && !interpretation && isPromptFocused ? "conic-active" : ""}`}>
          {mode === "describe" && !interpretation && isPromptFocused && (
            <div className="absolute -inset-[2px] rounded-[22px] overflow-hidden -z-10 pointer-events-none opacity-70">
              <div className="w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 animate-conic mood-conic-aurora blur-[6px]" />
            </div>
          )}

          <motion.div
            layoutId="mood-transition-input-card"
            layout
            transition={cardTransition}
            className={`glass-panel w-full p-4 sm:p-5 rounded-[24px] border shadow-glass overflow-hidden ${
              mode === "describe" && !interpretation && isPromptFocused
                ? "border-white/25 bg-surface-strong shadow-glass-elevated"
                : "border-white/10"
            }`}
            style={{ willChange: "transform" }}
          >
            {/* Inner content cross‑fade — opacity only, never y‑shift,
                so the glass border stays perfectly stationary while the
                card body stretches to accommodate the new content size. */}
            <AnimatePresence mode="wait" initial={false}>
              {mode === "manual" ? (
                <motion.div
                  key="manual-content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={fadeTransition}
                  aria-label="Choose moods manually"
                >
                  <div className="flex items-center justify-between gap-4 mb-5">
                    <div className="min-w-0">
                      <p className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${manualStep === 1 ? "text-violet" : "text-cyan"}`}>Step {manualStep} of 2</p>
                      <h2 className="font-display font-bold text-lg text-text mt-1">
                        {manualStep === 1 ? "How do you feel right now?" : "How would you like to feel?"}
                      </h2>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0" aria-label={`Step ${manualStep} of 2`}>
                      <span className={`h-1.5 w-8 rounded-full transition-colors duration-700 ${manualStep >= 1 ? "bg-violet" : "bg-white/15"}`} />
                      <span className={`h-1.5 w-8 rounded-full transition-colors duration-700 ${manualStep >= 2 ? "bg-cyan" : "bg-white/15"}`} />
                    </div>
                  </div>

                  {manualStep === 2 && (
                    <div className="flex items-center justify-between gap-3 px-3 py-2 mb-4 rounded-xl bg-white/[0.035] border border-white/[0.08]">
                      <span className="text-[11px] text-text-dim">Starting from <strong className="text-white font-semibold">{startingMood || "your current mood"}</strong></span>
                      <button type="button" onClick={() => setManualStep(1)} className="text-[11px] text-violet hover:text-white transition-colors cursor-pointer">Change</button>
                    </div>
                  )}

                  <div key={manualStep} className="mood-step-panel">
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {PRESET_MOODS.map((mood) => (
                        <MoodChoice
                          key={`${manualStep}-${mood}`}
                          mood={mood}
                          selected={manualStep === 1 ? startingMood : destinationMood}
                          onSelect={manualStep === 1 ? onSelectStarting : onSelectDestination}
                        />
                      ))}
                    </div>
                    {isSame && manualStep === 2 && (
                      <p role="alert" className="text-[11px] text-amber-300 mt-3">Starting and destination moods are the same. Choose a different destination.</p>
                    )}

                    <div className="flex justify-between items-center gap-3 mt-5">
                      {manualStep === 1 ? (
                        <span className="text-[11px] text-text-faint">Pick one to continue.</span>
                      ) : (
                        <button type="button" onClick={() => setManualStep(1)} className="px-2 py-2 text-xs text-text-dim hover:text-text inline-flex items-center gap-1 transition-colors">
                          <ChevronLeft className="w-3.5 h-3.5" /> Back
                        </button>
                      )}
                      {manualStep === 1 ? (
                        <button type="button" onClick={() => setManualStep(2)} disabled={!startingMood} className="mood-cta px-5 py-2.5 rounded-full text-sm font-semibold text-white inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-500">
                          Continue <ArrowRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <motion.button
                          type="button"
                          onClick={onGenerate}
                          disabled={!canProceed}
                          whileTap={canProceed ? { scale: 0.98 } : undefined}
                          className={`px-5 py-2.5 rounded-full font-display font-bold text-sm flex items-center gap-2 shadow-lg transition-all duration-500 ${canProceed ? "mood-cta text-white hover:brightness-110 cursor-pointer" : "bg-white/5 text-text-faint border border-white/5 cursor-not-allowed opacity-40"}`}
                        >
                          Generate journey <ArrowRight className="w-4 h-4" />
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : interpretation ? (
                <motion.div
                  key="describe-interpreted"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={fadeTransition}
                  aria-label="Interpreted mood transition"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <span className="w-8 h-8 shrink-0 rounded-xl bg-violet/15 border border-violet/25 flex items-center justify-center text-violet"><Sparkles className="w-4 h-4" /></span>
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-text">{needsClarification ? "Let's fill in the missing mood" : "Your mood transition"}</h2>
                      <p className="text-xs text-text-dim mt-1">{interpretation}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                    <MoodInput label="From" value={startingMood} placeholder="How you feel now" accent="violet" onChange={onSelectStarting} />
                    <ArrowRight className="w-4 h-4 text-text-faint mb-3" aria-hidden="true" />
                    <MoodInput label="To" value={destinationMood} placeholder="How you want to feel" accent="cyan" onChange={onSelectDestination} />
                  </div>
                  {isSame && <p className="text-[11px] text-amber-300 mt-3">Choose two different moods to make a journey.</p>}
                  <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-white/[0.08]">
                    <button type="button" onClick={() => changeMode("manual")} className="text-xs text-text-dim hover:text-text transition-colors">Edit with mood choices</button>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={startNewDescription} className="px-3 py-2 rounded-full text-xs text-text-dim hover:text-text hover:bg-white/[0.05] transition-colors">Try another</button>
                      <button type="button" onClick={onGenerate} disabled={!canProceed} className="mood-cta px-4 py-2.5 rounded-full text-xs font-bold text-white inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                        Build journey <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="describe-composer"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={fadeTransition}
                  aria-label="Describe your mood transition"
                >
                  <label htmlFor="transition-prompt" className="sr-only">Describe how you feel now and how you want to feel</label>
                  <textarea
                    id="transition-prompt"
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value.slice(0, 500))}
                    onFocus={() => setIsPromptFocused(true)}
                    onBlur={() => setIsPromptFocused(false)}
                    onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (prompt.trim()) onInterpretPrompt(prompt); } }}
                    placeholder={isPromptFocused ? "e.g. I feel overwhelmed after work and want to feel calm and focused…" : reduceMotion ? MOOD_TRANSITION_EXAMPLES[0] : typewriterText}
                    rows={2}
                    maxLength={500}
                    className="w-full min-h-[64px] bg-transparent resize-y border-0 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 text-white placeholder:text-white/60 text-base leading-relaxed font-medium"
                    aria-describedby="transition-prompt-hint"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-1 border-t border-white/[0.08]">
                    <p id="transition-prompt-hint" className="text-[11px] text-text-dim">Enter to interpret · Shift+Enter for a new line</p>
                    <div className="flex items-center gap-3 ml-auto">
                      <span className="text-[11px] font-mono text-white/60" aria-live="polite">{prompt.length}/500</span>
                      <div className="relative group/btn">
                        <div className="absolute -inset-2.5 rounded-full mood-gradient blur-xl transition-opacity duration-300 pointer-events-none opacity-10 saturate-[0.75] group-hover/btn:opacity-55 group-hover/btn:scale-110 group-hover/btn:saturate-[1.15]" />
                        <div className="absolute -inset-1 rounded-full mood-gradient blur-md transition-opacity duration-200 pointer-events-none opacity-10 saturate-[0.75] group-hover/btn:opacity-60 group-hover/btn:saturate-[1.1]" />
                        <motion.button
                          type="button"
                          onClick={() => onInterpretPrompt(prompt)}
                          disabled={!prompt.trim()}
                          whileTap={prompt.trim() ? { scale: 0.94, y: 1 } : undefined}
                          whileHover={!reduceMotion && !isLoading ? { scale: 1.06, y: -2, transition: { type: "spring", stiffness: 500, damping: 16 } } : undefined}
                          aria-label="Interpret mood transition"
                          className={`relative z-10 px-6 py-2.5 rounded-full font-display font-bold text-sm tracking-wide inline-flex items-center gap-2 select-none mood-discover-btn text-white/75 border saturate-[0.8] group-hover/btn:text-white group-hover/btn:saturate-[1.1] ${prompt.trim() ? "cursor-pointer" : "cursor-not-allowed"}`}
                        >
                          <motion.span className="inline-flex items-center justify-center" whileHover={!reduceMotion && !isLoading ? { rotate: 20, scale: 1.2 } : undefined} transition={{ type: "spring", stiffness: 500, damping: 12 }}>
                            <Sparkles className="w-4 h-4 text-white/75 group-hover/btn:text-white group-hover/btn:drop-shadow-[0_0_6px_rgba(255,255,255,0.7)] transition-colors" />
                          </motion.span>
                          <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] transition-colors duration-200 group-hover/btn:text-white">Find my moods</span>
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {error && <div className="glass-panel w-full max-w-xl mx-auto p-3 rounded-xl border border-red-400/20 bg-red-500/[0.05] text-red-300 text-xs text-center" role="alert">{error}</div>}
    </div>
    </LayoutGroup>
  );
}

function MoodChoice({ mood, selected, onSelect }: { mood: string; selected: string; onSelect: (mood: string) => void }) {
  const isSelected = selected.toLowerCase() === mood.toLowerCase();
  const theme = getMoodTheme(null, mood);
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(mood)}
      whileTap={{ scale: 0.97 }}
      style={{ "--tile-mood": theme.primary, "--tile-secondary": theme.secondary } as CSSProperties}
      className={`mood-choice group relative overflow-hidden flex flex-col sm:flex-row items-center sm:items-center justify-center sm:justify-start gap-1.5 sm:gap-2 text-center sm:text-left min-h-14 sm:min-h-16 px-2 py-2 rounded-2xl border transition-all duration-500 cursor-pointer ${isSelected ? "mood-choice-selected" : "border-white/[0.09] bg-white/[0.035] hover:bg-white/[0.07] hover:border-white/20"}`}
      aria-pressed={isSelected}
      aria-label={mood}
    >
      <span className="relative z-10 w-8 h-8 rounded-xl flex items-center justify-center text-base bg-white/[0.06] border border-white/10">{moodEmoji(mood)}</span>
      <span className="relative z-10 text-[11px] sm:text-xs font-semibold text-text">{mood}</span>
    </motion.button>
  );
}

function MoodInput({ label, value, placeholder, accent, onChange }: { label: string; value: string; placeholder: string; accent: "violet" | "cyan"; onChange: (value: string) => void }) {
  return (
    <label className={`min-w-0 text-[10px] font-semibold ${accent === "violet" ? "text-violet" : "text-cyan"}`}>
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, 50))}
        maxLength={50}
        placeholder={placeholder}
        className="mt-1 w-full px-3 py-2.5 rounded-xl bg-white/[0.045] border border-white/10 text-xs sm:text-sm font-medium text-text placeholder:text-text-faint focus:border-white/30"
      />
    </label>
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
