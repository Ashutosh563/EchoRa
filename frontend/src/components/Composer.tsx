import React, { useEffect, useRef, useState } from 'react';
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

export function Composer({
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

  // Auto-grow textarea height
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
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
      {/* Rotating Conic Gradient Glow while focused */}
      {isFocused && (
        <div className="absolute -inset-[2px] rounded-[22px] overflow-hidden -z-10 pointer-events-none opacity-80 transition-opacity">
          <div className="w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 animate-conic bg-[conic-gradient(from_0deg,#8B5CF6,#EC4899,#22D3EE,#8B5CF6)] blur-[6px]" />
        </div>
      )}

      {/* Main Glass Card */}
      <div
        className={`glass-panel p-4 sm:p-5 transition-all duration-300 relative ${
          isFocused
            ? 'border-white/25 bg-surface-strong shadow-glass-elevated'
            : 'border-white/10 hover:border-white/15'
        }`}
      >
        {/* Listening indicator label */}
        {isListening && (
          <div className="flex items-center gap-2 mb-2 text-xs font-medium text-magenta animate-pulse">
            <span className="w-2 h-2 rounded-full bg-magenta" />
            <span>Listening... Speak your mood or vibe</span>
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

        {/* Bottom Toolbar Row */}
        <div className="flex items-center justify-between pt-3 mt-1 border-t border-white/[0.06]">
          {/* Left: Character Counter */}
          <div className="text-xs font-mono text-white/60 tracking-wider">
            <span className={isOverLimit ? 'text-error-status font-bold' : 'text-white/80'}>
              {value.length}
            </span>
            <span className="opacity-60">/300</span>
          </div>

          {/* Right: Camera Button + Mic Button + Discover Button */}
          <div className="flex items-center gap-3">
            {onOpenCamera && (
              <button
                type="button"
                onClick={onOpenCamera}
                disabled={isLoading}
                title="Analyze mood with camera"
                aria-label="Analyze mood with camera"
                className="w-10 h-10 rounded-full flex items-center justify-center glass-pill text-text-dim hover:text-cyan hover:border-cyan/40 hover:shadow-[0_0_14px_rgba(6,182,212,0.35)] active:scale-95 transition-all border border-white/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera className="w-4 h-4" />
              </button>
            )}

            <MicButton
              isSupported={isMicSupported}
              isListening={isListening}
              onToggle={onToggleMic}
              disabled={isLoading}
            />

            {/* Discover Button: Dim & low-saturation at rest, balanced saturation on hover */}
            <div className="relative group/btn">
              {/* 1. Wide ambient neon aura */}
              <div
                className="absolute -inset-2.5 rounded-full bg-gradient-to-r from-[#7C3AED] via-[#EC4899] to-[#06B6D4] blur-xl transition-all duration-300 pointer-events-none opacity-10 saturate-[0.75] group-hover/btn:opacity-60 group-hover/btn:scale-110 group-hover/btn:blur-xl group-hover/btn:saturate-[1.2]"
              />

              {/* 2. Core halo */}
              <div
                className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#7C3AED] via-[#EC4899] to-[#06B6D4] blur-md transition-all duration-200 pointer-events-none opacity-10 saturate-[0.75] group-hover/btn:opacity-65 group-hover/btn:blur-md group-hover/btn:saturate-[1.15]"
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
                className={`relative z-10 px-6 py-2.5 rounded-full font-display font-bold text-sm tracking-wide flex items-center gap-2 transition-all duration-300 select-none bg-gradient-to-r from-violet-950/45 via-fuchsia-950/35 to-cyan-950/45 text-white/70 border border-white/15 shadow-none saturate-[0.8] group-hover/btn:from-[#7C3AED]/90 group-hover/btn:via-[#EC4899]/85 group-hover/btn:to-[#06B6D4]/90 group-hover/btn:text-white group-hover/btn:border-white/35 group-hover/btn:shadow-[0_0_22px_rgba(236,72,153,0.4),0_0_14px_rgba(124,58,237,0.4)] group-hover/btn:saturate-[1.15] ${
                  canSubmit ? 'cursor-pointer' : 'cursor-not-allowed'
                }`}
                aria-label="Discover music"
              >
                <motion.div
                  className="flex items-center justify-center"
                  whileHover={!isLoading ? { rotate: 20, scale: 1.2 } : undefined}
                  transition={{ type: 'spring', stiffness: 500, damping: 12 }}
                >
                  <Sparkles className="w-4 h-4 text-white/75 group-hover/btn:text-white group-hover/btn:drop-shadow-[0_0_6px_rgba(255,255,255,0.7)] transition-all" />
                </motion.div>
                <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">Discover</span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
