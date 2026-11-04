import { motion, useReducedMotion } from 'framer-motion';

export function Wordmark() {
  const shouldReduceMotion = useReducedMotion();

  // 4 equalizer bars with different heights, delays, and animation cycles
  const barConfigs = [
    { height: 16, minScale: 0.25, maxScale: 1.0, duration: 0.7, delay: 0 },
    { height: 20, minScale: 0.35, maxScale: 0.95, duration: 0.55, delay: 0.15 },
    { height: 18, minScale: 0.3, maxScale: 1.0, duration: 0.85, delay: 0.05 },
    { height: 14, minScale: 0.2, maxScale: 0.85, duration: 0.65, delay: 0.25 },
  ];

  return (
    <div className="flex items-center gap-2.5 select-none" aria-label="ECHORA logo">
      {/* 4-bar Equalizer Glyph */}
      <div className="flex items-end gap-[3px] h-5 w-5 justify-center pb-0.5">
        {barConfigs.map((bar, idx) => (
          <motion.div
            key={idx}
            className="w-[3px] rounded-full bg-gradient-to-t from-violet to-cyan"
            style={{ height: `${bar.height}px`, transformOrigin: 'bottom' }}
            animate={
              shouldReduceMotion
                ? { scaleY: 0.7 }
                : { scaleY: [bar.minScale, bar.maxScale, bar.minScale] }
            }
            transition={{
              duration: bar.duration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: bar.delay,
            }}
          />
        ))}
      </div>

      {/* Brand Text */}
      <span className="font-display font-extrabold text-xl tracking-[-0.02em] text-text bg-gradient-to-r from-text via-text to-text-dim bg-clip-text">
        ECHORA
      </span>
    </div>
  );
}
