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

            {/* Discover Button: Dim & desaturated at rest, full neon saturation on hover */}
            <div className="relative group/btn">
              {/* 1. Wide ambient neon aura (dim at rest, full saturation on hover) */}
              <div
                className="absolute -inset-3 rounded-full bg-gradient-to-r from-[#7928CA] via-[#FF0080] to-[#00DFD8] blur-xl transition-all duration-300 pointer-events-none opacity-15 saturate-100 group-hover/btn:opacity-100 group-hover/btn:scale-125 group-hover/btn:blur-2xl group-hover/btn:saturate-[2.4]"
              />

              {/* 2. Concentrated high-chroma core halo (dim at rest, full saturation on hover) */}
              <div
                className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#8A00E6] via-[#FF007F] to-[#00F0FF] blur-md transition-all duration-200 pointer-events-none opacity-15 saturate-100 group-hover/btn:opacity-100 group-hover/btn:blur-lg group-hover/btn:saturate-[2]"
              />

              <motion.button
                type="button"
                onClick={() => onSubmit(value)}
                disabled={!canSubmit}
                whileTap={canSubmit ? { scale: 0.92, y: 1 } : undefined}
                whileHover={
                  !isLoading
                    ? {
                        scale: 1.1,
                        y: -3,
                        transition: { type: 'spring', stiffness: 500, damping: 14 },
                      }
                    : undefined
                }
                className={`relative z-10 px-6 py-2.5 rounded-full font-display font-extrabold text-sm tracking-wide flex items-center gap-2 transition-all duration-300 select-none bg-gradient-to-r from-violet-900/45 via-fuchsia-900/40 to-cyan-900/45 text-white/75 border border-fuchsia-400/30 shadow-none saturate-100 contrast-100 group-hover/btn:from-[#7C3AED] group-hover/btn:via-[#FF007F] group-hover/btn:to-[#00DFD8] group-hover/btn:text-white group-hover/btn:border-cyan-300 group-hover/btn:shadow-[0_0_42px_#FF007F,0_0_28px_#7C3AED,0_0_24px_#00DFD8] group-hover/btn:saturate-[1.8] group-hover/btn:contrast-[1.1] group-hover/btn:brightness-110 ${
                  canSubmit ? 'cursor-pointer' : 'cursor-not-allowed'
                }`}
                aria-label="Discover music"
              >
                <motion.div
                  className="flex items-center justify-center"
                  whileHover={!isLoading ? { rotate: 25, scale: 1.3 } : undefined}
                  transition={{ type: 'spring', stiffness: 500, damping: 12 }}
                >
                  <Sparkles className="w-4 h-4 text-white/80 group-hover/btn:text-white group-hover/btn:drop-shadow-[0_0_8px_rgba(255,255,255,0.9)] transition-all" />
                </motion.div>
                <span className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">Discover</span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
