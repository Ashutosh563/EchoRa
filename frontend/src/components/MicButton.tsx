import { memo } from 'react';
import { motion } from 'framer-motion';
import { Mic } from 'lucide-react';

interface MicButtonProps {
  isSupported: boolean;
  isListening: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export const MicButton = memo(function MicButton({
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
        className="h-9 px-3.5 rounded-full flex items-center gap-2 text-xs font-semibold text-text-faint bg-white/[0.02] border border-white/5 cursor-not-allowed opacity-50"
      >
        <Mic className="w-3.5 h-3.5" />
        <span>Dictate</span>
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
      {/* Expanding Pulse Rings when listening */}
      {isListening && (
        <>
          <span className="absolute -inset-1 rounded-full bg-magenta/35 animate-ping opacity-50 pointer-events-none" />
          <span className="absolute -inset-2 rounded-full bg-magenta/20 animate-pulse opacity-40 pointer-events-none" />
        </>
      )}

      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        title={isListening ? 'Stop voice dictation' : 'Dictate your mood with voice'}
        aria-label={isListening ? 'Stop voice listening' : 'Start voice input'}
        className={`relative z-10 h-9 px-3.5 rounded-full flex items-center gap-2 text-xs font-semibold transition-all cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ${
          isListening
            ? 'bg-gradient-to-r from-magenta to-violet text-white shadow-[0_0_20px_rgba(236,72,153,0.55)] scale-[1.03] border border-white/30'
            : 'bg-violet/15 hover:bg-violet/25 text-white/90 hover:text-white border border-violet/40 hover:border-magenta/60 shadow-[0_0_16px_rgba(139,92,246,0.2)] hover:shadow-[0_0_20px_rgba(236,72,153,0.35)] active:scale-95'
        }`}
      >
        {isListening ? (
          <>
            {/* Live 5-bar Waveform */}
            <div className="flex items-center gap-[2px] h-3.5 justify-center">
              {waveformBars.map((bar, idx) => (
                <motion.div
                  key={idx}
                  className="w-[2px] rounded-full bg-white"
                  style={{ height: '12px', transformOrigin: 'center' }}
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
            <span className="tracking-wide">Listening…</span>
          </>
        ) : (
          <>
            <span className="w-5 h-5 rounded-full bg-magenta/25 border border-magenta/40 flex items-center justify-center text-magenta shrink-0">
              <Mic className="w-3 h-3" />
            </span>
            <span className="tracking-wide">Dictate</span>
          </>
        )}
      </button>
    </div>
  );
});
