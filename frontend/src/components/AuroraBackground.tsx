import { memo } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { MoodTheme } from '../lib/moodTheme';

interface AuroraBackgroundProps {
  theme: MoodTheme;
}

export const AuroraBackground = memo(function AuroraBackground({ theme }: AuroraBackgroundProps) {
  const shouldReduceMotion = useReducedMotion();
  const duration = theme.animationDuration;

  const getOrbGradient = (color: string) =>
    `radial-gradient(circle, ${color} 0%, color-mix(in srgb, ${color} 46%, transparent) 38%, transparent 70%)`;

  return (
    <div
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-ink"
      style={{ contain: 'strict' }}
      aria-hidden="true"
    >
      {/* Blob 1: Top Left / Center */}
      <div
        className="absolute rounded-full"
        style={{
          width: '920px',
          height: '920px',
          top: '-24%',
          left: '2%',
          background: getOrbGradient(theme.blobs[0]),
          opacity: theme.opacity,
          willChange: shouldReduceMotion ? 'auto' : 'transform',
          transition: 'opacity 2s ease-in-out, background 2.2s ease-in-out',
          animation: shouldReduceMotion
            ? 'none'
            : `aurora-drift-1 ${(duration * 0.95).toFixed(1)}s ease-in-out infinite`,
        }}
      />

      {/* Blob 2: Top Right */}
      <div
        className="absolute rounded-full"
        style={{
          width: '960px',
          height: '960px',
          top: '-18%',
          right: '-3%',
          background: getOrbGradient(theme.blobs[1]),
          opacity: theme.opacity * 0.9,
          willChange: shouldReduceMotion ? 'auto' : 'transform',
          transition: 'opacity 2s ease-in-out, background 2.2s ease-in-out',
          animation: shouldReduceMotion
            ? 'none'
            : `aurora-drift-2 ${(duration * 1.1).toFixed(1)}s ease-in-out infinite`,
        }}
      />

      {/* Blob 3: Center / Bottom Left */}
      <div
        className="absolute rounded-full"
        style={{
          width: '860px',
          height: '860px',
          bottom: '2%',
          left: '-12%',
          background: getOrbGradient(theme.blobs[2]),
          opacity: theme.opacity * 0.8,
          willChange: shouldReduceMotion ? 'auto' : 'transform',
          transition: 'opacity 2s ease-in-out, background 2.2s ease-in-out',
          animation: shouldReduceMotion
            ? 'none'
            : `aurora-drift-3 ${(duration * 1.05).toFixed(1)}s ease-in-out infinite`,
        }}
      />

      {/* Blob 4: Bottom Right */}
      <div
        className="absolute rounded-full"
        style={{
          width: '900px',
          height: '900px',
          bottom: '-22%',
          right: '6%',
          background: getOrbGradient(theme.blobs[3]),
          opacity: theme.opacity * 0.85,
          willChange: shouldReduceMotion ? 'auto' : 'transform',
          transition: 'opacity 2s ease-in-out, background 2.2s ease-in-out',
          animation: shouldReduceMotion
            ? 'none'
            : `aurora-drift-4 ${(duration * 0.9).toFixed(1)}s ease-in-out infinite`,
        }}
      />

      {/* Faint Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 40%, transparent 45%, rgba(7, 7, 13, 0.75) 100%)',
        }}
      />
    </div>
  );
});
