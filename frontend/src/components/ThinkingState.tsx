import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STAGES = [
  'Reading your mood…',
  'Building the perfect query…',
  'Searching Spotify…',
];

export function ThinkingState() {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStageIndex((prev) => (prev + 1) % STAGES.length);
    }, 1400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 flex flex-col items-center">
      {/* Centered Morphing Orb */}
      <div className="relative mb-6 flex items-center justify-center">
        {/* Glow halo */}
        <div className="absolute w-28 h-28 rounded-full bg-gradient-to-r from-violet via-magenta to-cyan blur-2xl opacity-60 animate-pulse" />

        {/* Morphing Blob */}
        <motion.div
          className="relative w-16 h-16 bg-gradient-to-tr from-violet via-magenta to-cyan shadow-lg shadow-violet/50"
          animate={{
            borderRadius: [
              '60% 40% 30% 70% / 60% 30% 70% 40%',
              '30% 60% 70% 40% / 50% 60% 30% 60%',
              '60% 40% 30% 70% / 60% 30% 70% 40%',
            ],
            rotate: [0, 180, 360],
            scale: [1, 1.08, 1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Sequential Cross-fading Stage Text */}
      <div className="h-8 flex items-center justify-center relative overflow-hidden mb-3">
        <AnimatePresence mode="wait">
          <motion.p
            key={stageIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="font-display font-medium text-text text-base sm:text-lg"
          >
            {STAGES[stageIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* 3-Dot Progress Indicator */}
      <div className="flex items-center gap-2 mb-10">
        {STAGES.map((_, idx) => (
          <span
            key={idx}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              idx === stageIndex ? 'bg-cyan w-6 scale-110 shadow-sm shadow-cyan/50' : 'bg-white/20'
            }`}
          />
        ))}
      </div>

      {/* 6 Skeleton Track Cards with Shimmer */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="glass-panel p-3.5 flex items-center gap-3.5 relative overflow-hidden rounded-card border border-white/5"
          >
            {/* Shimmer sweep effect */}
            <div
              className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent pointer-events-none"
              style={{
                animationDelay: `${idx * 150}ms`,
              }}
            />

            {/* Album art skeleton */}
            <div className="w-[88px] h-[88px] rounded-[14px] bg-white/[0.06] shrink-0" />

            {/* Details skeleton */}
            <div className="flex-1 space-y-2.5">
              <div className="h-4 bg-white/[0.08] rounded-md w-3/4" />
              <div className="h-3 bg-white/[0.05] rounded-md w-1/2" />
              <div className="h-2.5 bg-white/[0.04] rounded-md w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

