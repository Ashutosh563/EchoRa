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
      {/* Main Glass Card */}
      <div
        className={`glass-panel p-4 sm:p-5 transition-all duration-300 relative ${
          isFocused
            ? 'border-white/20 shadow-glass-elevated'
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

            {/* Discover Button with Deeply Saturated Neon Gradient & Kinetic Pop-Out */}
            <div className="relative group/btn">
              {/* 1. Ultra-saturated wide ambient neon aura */}
              <div
                className={`absolute -inset-3 rounded-full bg-gradient-to-r from-[#7928CA] via-[#FF0080] to-[#00DFD8] blur-xl transition-all duration-300 pointer-events-none saturate-[2.4] ${
                  canSubmit
                    ? 'opacity-85 group-hover/btn:opacity-100 group-hover/btn:scale-125 group-hover/btn:blur-2xl'
                    : 'opacity-25 group-hover/btn:opacity-50 group-hover/btn:scale-105'
                }`}
              />

              {/* 2. Concentrated high-chroma core halo */}
              <div
                className={`absolute -inset-1 rounded-full bg-gradient-to-r from-[#8A00E6] via-[#FF007F] to-[#00F0FF] blur-md transition-all duration-200 pointer-events-none saturate-[2] ${
                  canSubmit
                    ? 'opacity-90 group-hover/btn:opacity-100 group-hover/btn:blur-lg'
                    : 'opacity-20 group-hover/btn:opacity-40'
                }`}
              />

              <motion.button
                type="button"
                onClick={() => onSubmit(value)}
                disabled={!canSubmit}
                whileTap={canSubmit ? { scale: 0.92, y: 1 } : undefined}
                whileHover={
                  canSubmit
                    ? {
                        scale: 1.12,
                        y: -4,
                        transition: { type: 'spring', stiffness: 500, damping: 14 },
                      }
                    : { scale: 1.04, y: -1 }
                }
                className={`relative z-10 px-6 py-2.5 rounded-full font-display font-extrabold text-sm tracking-wide flex items-center gap-2 cursor-pointer transition-all duration-200 select-none saturate-[1.8] contrast-[1.1] ${
                  canSubmit
                    ? 'bg-gradient-to-r from-[#7C3AED] via-[#FF007F] to-[#00DFD8] text-white border-2 border-fuchsia-300/80 hover:border-cyan-300 shadow-[0_0_26px_rgba(255,0,128,0.7),0_0_16px_rgba(124,58,237,0.7)] hover:shadow-[0_0_42px_#FF007F,0_0_28px_#7C3AED,0_0_24px_#00DFD8] hover:brightness-110'
                    : 'bg-gradient-to-r from-violet-900/40 via-fuchsia-900/35 to-cyan-900/40 text-white/75 border border-fuchsia-500/30 hover:border-fuchsia-400/60 hover:shadow-[0_0_18px_rgba(236,72,153,0.5)] cursor-not-allowed opacity-75'
                }`}
                aria-label="Discover music"
              >
                <motion.div
                  className="flex items-center justify-center"
                  whileHover={canSubmit ? { rotate: 25, scale: 1.3 } : undefined}
                  transition={{ type: 'spring', stiffness: 500, damping: 12 }}
                >
                  <Sparkles className="w-4 h-4 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
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
