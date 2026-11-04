import { motion, useReducedMotion } from 'framer-motion';
import type { MoodTheme } from '../lib/moodTheme';

interface AuroraBackgroundProps {
  theme: MoodTheme;
}

export function AuroraBackground({ theme }: AuroraBackgroundProps) {
  const shouldReduceMotion = useReducedMotion();
  const duration = shouldReduceMotion ? 0 : theme.animationDuration;

  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-ink" aria-hidden="true">
      {/* Blob 1: Top Left / Center */}
      <motion.div
        className="absolute rounded-full filter blur-[120px]"
        style={{
          width: '650px',
          height: '650px',
          top: '-15%',
          left: '10%',
          backgroundColor: theme.blobs[0],
        }}
        initial={{ opacity: theme.opacity }}
        animate={
          shouldReduceMotion
            ? { backgroundColor: theme.blobs[0], opacity: theme.opacity }
            : {
                x: [0, 90, -70, 0],
                y: [0, 80, 20, 0],
                scale: [1, 1.15, 0.9, 1],
                backgroundColor: theme.blobs[0],
                opacity: theme.opacity,
              }
        }
        transition={{
          backgroundColor: { duration: 1.2, ease: 'easeInOut' },
          opacity: { duration: 1.2, ease: 'easeInOut' },
          x: { duration: duration * 0.9, repeat: Infinity, ease: 'easeInOut' },
          y: { duration: duration * 1.1, repeat: Infinity, ease: 'easeInOut' },
          scale: { duration: duration * 1.2, repeat: Infinity, ease: 'easeInOut' },
        }}
      />

      {/* Blob 2: Top Right */}
      <motion.div
        className="absolute rounded-full filter blur-[130px]"
        style={{
          width: '700px',
          height: '700px',
          top: '-10%',
          right: '5%',
          backgroundColor: theme.blobs[1],
        }}
        initial={{ opacity: theme.opacity * 0.9 }}
        animate={
          shouldReduceMotion
            ? { backgroundColor: theme.blobs[1], opacity: theme.opacity * 0.9 }
            : {
                x: [0, -110, 50, 0],
                y: [0, 120, -60, 0],
                scale: [1, 0.88, 1.2, 1],
                backgroundColor: theme.blobs[1],
                opacity: theme.opacity * 0.9,
              }
        }
        transition={{
          backgroundColor: { duration: 1.2, ease: 'easeInOut' },
          opacity: { duration: 1.2, ease: 'easeInOut' },
          x: { duration: duration * 1.2, repeat: Infinity, ease: 'easeInOut' },
          y: { duration: duration * 0.85, repeat: Infinity, ease: 'easeInOut' },
          scale: { duration: duration, repeat: Infinity, ease: 'easeInOut' },
        }}
      />

      {/* Blob 3: Center / Bottom Left */}
      <motion.div
        className="absolute rounded-full filter blur-[140px]"
        style={{
          width: '600px',
          height: '600px',
          bottom: '10%',
          left: '-5%',
          backgroundColor: theme.blobs[2],
        }}
        initial={{ opacity: theme.opacity * 0.8 }}
        animate={
          shouldReduceMotion
            ? { backgroundColor: theme.blobs[2], opacity: theme.opacity * 0.8 }
            : {
                x: [0, 130, -80, 0],
                y: [0, -90, 70, 0],
                scale: [1, 1.1, 0.95, 1],
                backgroundColor: theme.blobs[2],
                opacity: theme.opacity * 0.8,
              }
        }
        transition={{
          backgroundColor: { duration: 1.2, ease: 'easeInOut' },
          opacity: { duration: 1.2, ease: 'easeInOut' },
          x: { duration: duration * 1.05, repeat: Infinity, ease: 'easeInOut' },
          y: { duration: duration * 0.95, repeat: Infinity, ease: 'easeInOut' },
          scale: { duration: duration * 1.15, repeat: Infinity, ease: 'easeInOut' },
        }}
      />

      {/* Blob 4: Bottom Right */}
      <motion.div
        className="absolute rounded-full filter blur-[130px]"
        style={{
          width: '650px',
          height: '650px',
          bottom: '-15%',
          right: '15%',
          backgroundColor: theme.blobs[3],
        }}
        initial={{ opacity: theme.opacity * 0.85 }}
        animate={
          shouldReduceMotion
            ? { backgroundColor: theme.blobs[3], opacity: theme.opacity * 0.85 }
            : {
                x: [0, -90, 100, 0],
                y: [0, -110, -30, 0],
                scale: [1, 1.22, 0.85, 1],
                backgroundColor: theme.blobs[3],
                opacity: theme.opacity * 0.85,
              }
        }
        transition={{
          backgroundColor: { duration: 1.2, ease: 'easeInOut' },
          opacity: { duration: 1.2, ease: 'easeInOut' },
          x: { duration: duration * 0.8, repeat: Infinity, ease: 'easeInOut' },
          y: { duration: duration * 1.15, repeat: Infinity, ease: 'easeInOut' },
          scale: { duration: duration * 0.9, repeat: Infinity, ease: 'easeInOut' },
        }}
      />

      {/* Subtle SVG Film-Grain Noise Overlay */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.038] mix-blend-overlay">
        <filter id="aurora-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#aurora-noise)" />
      </svg>

      {/* Faint Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 40%, transparent 45%, rgba(7, 7, 13, 0.75) 100%)',
        }}
      />
    </div>
  );
}

