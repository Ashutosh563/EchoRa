import { memo } from 'react';
import { motion } from 'framer-motion';
import { Composer } from './Composer';
import { ExampleChips } from './ExampleChips';
import { ModeSelector } from './ModeSelector';
import type { DiscoveryMode } from '../types/discovery';

interface HeroProps {
  hasSearched: boolean;
  prompt: string;
  onPromptChange: (val: string) => void;
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
  isListening: boolean;
  isMicSupported: boolean;
  onToggleMic: () => void;
  onOpenCamera?: () => void;
  discoveryMode?: DiscoveryMode;
  onDiscoveryModeChange?: (mode: DiscoveryMode) => void;
}

export const Hero = memo(function Hero({
  hasSearched,
  prompt,
  onPromptChange,
  onSubmit,
  isLoading,
  isListening,
  isMicSupported,
  onToggleMic,
  onOpenCamera,
  discoveryMode = 'FAMILIAR',
  onDiscoveryModeChange,
}: HeroProps) {
  return (
    <section
      className={`w-full flex flex-col items-center text-center transition-[padding,min-height] duration-300 ease-out ${
        hasSearched ? 'pt-4 pb-6' : 'min-h-[70vh] justify-center py-12'
      }`}
    >
      {/* Headline & Subline */}
      <div className="max-w-2xl px-4 mb-6">
        <h1
          className={`font-display font-bold tracking-tight text-text leading-[1.15] transition-[font-size,margin] duration-300 ${
            hasSearched
              ? 'text-2xl sm:text-3xl mb-1.5'
              : 'text-4xl sm:text-5xl md:text-6xl mb-3'
          }`}
        >
          Tell me <span className="aurora-text">how you feel</span>.
        </h1>
        {!hasSearched && (
          <p className="text-text-dim text-base sm:text-lg max-w-lg mx-auto font-normal">
            Describe your mood, moment, or setting. I'll find the music.
          </p>
        )}
      </div>

      {/* Composer Card */}
      <div className="w-full px-4">
        <Composer
          value={prompt}
          onChange={onPromptChange}
          onSubmit={onSubmit}
          isLoading={isLoading}
          isListening={isListening}
          isMicSupported={isMicSupported}
          onToggleMic={onToggleMic}
          onOpenCamera={onOpenCamera}
        />
      </div>

      {/* Discovery Mode Selector */}
      {onDiscoveryModeChange && (
        <div className="mt-4 flex justify-center">
          <ModeSelector
            currentMode={discoveryMode}
            onChange={onDiscoveryModeChange}
            disabled={isLoading}
          />
        </div>
      )}

      {/* Example Prompt Chips (Empty state only) */}
      {!hasSearched && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="mt-6 max-w-3xl px-4"
        >
          <ExampleChips onSelect={onSubmit} disabled={isLoading} />
        </motion.div>
      )}
    </section>
  );
});
