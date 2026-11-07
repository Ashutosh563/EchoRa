import React, { memo, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Camera } from 'lucide-react';
import { useTypewriter } from '../hooks/useTypewriter';
import { MicButton } from './MicButton';

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
  isListening: boolean;
  isMicSupported: boolean;
  onToggleMic: () => void;
  onOpenCamera?: () => void;
}

export const Composer = memo(function Composer({
  value,
  onChange,
  onSubmit,
  isLoading,
  isListening,
  isMicSupported,
  onToggleMic,
  onOpenCamera,
}: ComposerProps) {
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Typewriter placeholder stops when focused or has text
  const typewriterText = useTypewriter(undefined, isFocused || value.length > 0);

  // Auto-grow textarea height only when value changes (skip layout read when empty)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    if (!value) {
      el.style.height = '60px';
      return;
    }
    el.style.height = 'auto';
    const newHeight = Math.min(Math.max(el.scrollHeight, 60), 160);
    el.style.height = `${newHeight}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) {
        onSubmit(value);
      }
    }
  };

  const isOverLimit = value.length > 300;
  const canSubmit = Boolean(value.trim()) && !isLoading && !isOverLimit;

  return (
    <div className="relative w-full max-w-[760px] mx-auto group">
      {/* Rotating Conic Gradient Glow while focused or dictating (mood-responsive) */}
      {(isFocused || isListening) && (
        <div className="conic-active absolute -inset-[2px] rounded-[22px] overflow-hidden -z-10 pointer-events-none opacity-80 transition-opacity">
          <div className="w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 animate-conic mood-conic-aurora blur-[6px]" />
        </div>
      )}

      {/* Main Glass Card */}
      <div
        className={`glass-panel p-4 sm:p-5 transition-colors duration-300 relative ${
          isListening
            ? 'border-magenta/45 bg-surface-strong shadow-[0_0_32px_rgba(236,72,153,0.2)]'
            : isFocused
            ? 'border-white/25 bg-surface-strong shadow-glass-elevated'
            : 'border-white/10 hover:border-white/15'
        }`}
      >
        {/* Prominent Active Voice Dictation Studio Banner */}
        {isListening && (
          <div className="flex items-center justify-between gap-3 mb-3 px-3.5 py-2 rounded-xl bg-gradient-to-r from-magenta/20 via-violet/15 to-cyan/10 border border-magenta/35">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-magenta opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-magenta" />
              </span>
              <div className="flex items-end gap-[2px] h-3.5 shrink-0" aria-hidden="true">
                <span className="w-[2px] bg-magenta rounded-full eq-bar-1" />
                <span className="w-[2px] bg-violet rounded-full eq-bar-2" />
                <span className="w-[2px] bg-cyan rounded-full eq-bar-3" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-white truncate">
                Listening… Speak your mood, activity, or vibe out loud
              </span>
            </div>

            <button
              type="button"
              onClick={onToggleMic}
              aria-label="Finish voice dictation"
              className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-[11px] font-semibold text-white border border-white/20 transition-colors cursor-pointer shrink-0"
            >
              Done
            </button>
          </div>
        )}

        {/* Textarea with enhanced whitish font and bright visible placeholder */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, 300))}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={isFocused ? 'e.g. Peaceful instrumental music for studying at 3 AM...' : typewriterText}
          disabled={isLoading}
          rows={2}
          className="w-full bg-transparent resize-none border-0 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 text-white placeholder:text-white/80 text-base sm:text-lg leading-relaxed font-medium"
          aria-label="Describe what you want to listen to"
        />

        {/* Bottom Toolbar Row: Prominent Multimodal Pills (Left) + Counter & Discover CTA (Right) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-1 border-t border-white/[0.08]">
          {/* Left: Prominent Multimodal AI Actions (Scan Mood + Dictate) */}
          <div className="flex items-center gap-2.5">
            {onOpenCamera && (
              <button
                type="button"
                onClick={onOpenCamera}
                disabled={isLoading}
                title="Analyze mood with camera"
                aria-label="Analyze mood with camera"
                className="h-9 px-3.5 rounded-full flex items-center gap-2 text-xs font-semibold bg-cyan/12 hover:bg-cyan/22 text-white/90 hover:text-white border border-cyan/35 hover:border-cyan/65 shadow-[0_0_16px_rgba(34,211,238,0.18)] hover:shadow-[0_0_22px_rgba(34,211,238,0.38)] active:scale-95 transition-all cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="w-5 h-5 rounded-full bg-cyan/25 border border-cyan/40 flex items-center justify-center text-cyan shrink-0">
                  <Camera className="w-3 h-3" />
                </span>
                <span className="tracking-wide">Scan Mood</span>
              </button>
            )}

            <MicButton
              isSupported={isMicSupported}
              isListening={isListening}
              onToggle={onToggleMic}
              disabled={isLoading}
            />
          </div>

          {/* Right: Character Counter + Primary Discover CTA */}
          <div className="flex items-center gap-3 ml-auto">
            <div className="text-xs font-mono text-white/60 tracking-wider">
              <span className={isOverLimit ? 'text-error-status font-bold' : 'text-white/80'}>
                {value.length}
              </span>
              <span className="opacity-60">/300</span>
            </div>

            {/* Discover Button: Mood-responsive gradient, dim at rest, balanced saturation on hover */}
            <div className="relative group/btn">
              {/* 1. Wide ambient mood aura */}
              <div
                className="absolute -inset-2.5 rounded-full mood-gradient blur-xl transition-opacity duration-300 pointer-events-none opacity-10 saturate-[0.75] group-hover/btn:opacity-55 group-hover/btn:scale-110 group-hover/btn:saturate-[1.15]"
              />

              {/* 2. Core mood halo */}
              <div
                className="absolute -inset-1 rounded-full mood-gradient blur-md transition-opacity duration-200 pointer-events-none opacity-10 saturate-[0.75] group-hover/btn:opacity-60 group-hover/btn:saturate-[1.1]"
              />

              <motion.button
                type="button"
                onClick={() => onSubmit(value)}
                disabled={!canSubmit}
                whileTap={canSubmit ? { scale: 0.94, y: 1 } : undefined}
                whileHover={
                  !isLoading
                    ? {
                        scale: 1.06,
                        y: -2,
                        transition: { type: 'spring', stiffness: 500, damping: 16 },
                      }
                    : undefined
                }
                className={`relative z-10 px-6 py-2.5 rounded-full font-display font-bold text-sm tracking-wide flex items-center gap-2 select-none mood-discover-btn text-white/75 border saturate-[0.8] group-hover/btn:text-white group-hover/btn:saturate-[1.1] ${
                  canSubmit ? 'cursor-pointer' : 'cursor-not-allowed'
                }`}
                aria-label="Discover music"
              >
                <motion.div
                  className="flex items-center justify-center"
                  whileHover={!isLoading ? { rotate: 20, scale: 1.2 } : undefined}
                  transition={{ type: 'spring', stiffness: 500, damping: 12 }}
                >
                  <Sparkles className="w-4 h-4 text-white/75 group-hover/btn:text-white group-hover/btn:drop-shadow-[0_0_6px_rgba(255,255,255,0.7)] transition-colors" />
                </motion.div>
                <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">Discover</span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
