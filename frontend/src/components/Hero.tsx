import { motion } from 'framer-motion';
import { Composer } from './Composer';
import { ExampleChips } from './ExampleChips';

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
}

export function Hero({
  hasSearched,
  prompt,
  onPromptChange,
  onSubmit,
  isLoading,
  isListening,
  isMicSupported,
  onToggleMic,
  onOpenCamera,
}: HeroProps) {
  return (
    <motion.section
      layout
      transition={{ type: 'spring', stiffness: 180, damping: 25 }}
      className={`w-full flex flex-col items-center text-center transition-all ${
        hasSearched ? 'pt-4 pb-6' : 'min-h-[70vh] justify-center py-12'
      }`}
    >
      {/* Headline & Subline */}
      <motion.div layout className="max-w-2xl px-4 mb-6">
        <h1
          className={`font-display font-bold tracking-tight text-text leading-[1.15] ${
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
      </motion.div>

      {/* Composer Card */}
      <motion.div layout className="w-full px-4">
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
      </motion.div>

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
    </motion.section>
  );
}

