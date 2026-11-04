import { motion } from 'framer-motion';
import { Mic } from 'lucide-react';

interface MicButtonProps {
  isSupported: boolean;
  isListening: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function MicButton({
  isSupported,
  isListening,
  onToggle,
  disabled = false,
}: MicButtonProps) {
  if (!isSupported) {
    return (
      <button
        type="button"
        disabled
        title="Voice input isn't supported in this browser"
        aria-label="Voice input not supported"
        className="w-10 h-10 rounded-full flex items-center justify-center text-text-faint bg-white/[0.02] border border-white/5 cursor-not-allowed opacity-50"
      >
        <Mic className="w-4 h-4" />
      </button>
    );
  }

  // 5 animated waveform bars when listening
  const waveformBars = [
    { duration: 0.45, delay: 0 },
    { duration: 0.65, delay: 0.12 },
    { duration: 0.5, delay: 0.05 },
    { duration: 0.7, delay: 0.18 },
    { duration: 0.4, delay: 0.08 },
  ];

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* 3 Expanding Concentric Pulse Rings when listening */}
      {isListening && (
        <>
          <span className="absolute -inset-1 rounded-full bg-magenta/40 animate-ping opacity-60" />
          <span className="absolute -inset-2.5 rounded-full bg-magenta/20 animate-pulse opacity-40" />
          <span className="absolute -inset-4 rounded-full bg-magenta/10 animate-pulse opacity-20" />
        </>
      )}

      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-label={isListening ? 'Stop voice listening' : 'Start voice input'}
        className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
          isListening
            ? 'bg-magenta text-white shadow-lg shadow-magenta/50 scale-105 border border-magenta'
            : 'glass-pill text-text-dim hover:text-text hover:bg-white/[0.09] active:scale-95 border border-white/10'
        }`}
      >
        {isListening ? (
          /* Live 5-bar Waveform */
          <div className="flex items-center gap-[2px] h-4 justify-center">
            {waveformBars.map((bar, idx) => (
              <motion.div
                key={idx}
                className="w-[2px] rounded-full bg-white"
                style={{ height: '14px', transformOrigin: 'center' }}
                animate={{ scaleY: [0.3, 1, 0.3] }}
                transition={{
                  duration: bar.duration,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: bar.delay,
                }}
              />
            ))}
          </div>
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}

