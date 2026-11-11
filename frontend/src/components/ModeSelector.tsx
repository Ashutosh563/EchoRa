import { motion } from 'framer-motion';
import { Heart, Compass, Shuffle } from 'lucide-react';
import type { DiscoveryMode } from '../types/discovery';

interface ModeSelectorProps {
  currentMode: DiscoveryMode;
  onChange: (mode: DiscoveryMode) => void;
  disabled?: boolean;
}

interface ModeOption {
  id: DiscoveryMode;
  label: string;
  tagline: string;
  icon: typeof Heart;
}

const MODES: ModeOption[] = [
  {
    id: 'FAMILIAR',
    label: 'Familiar',
    tagline: 'You know what I like',
    icon: Heart,
  },
  {
    id: 'BALANCED',
    label: 'Balanced',
    tagline: 'Give me what I like, plus new finds',
    icon: Compass,
  },
  {
    id: 'EXPLORE',
    label: 'Explore',
    tagline: 'Surprise me with new styles',
    icon: Shuffle,
  },
];

export function ModeSelector({ currentMode, onChange, disabled }: ModeSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Discovery Mode Selector"
      className="glass-pill inline-flex items-center gap-1.5 p-1.5 shadow-glass"
    >
      {MODES.map((mode) => {
        const isSelected = currentMode === mode.id;
        const Icon = mode.icon;

        return (
          <button
            key={mode.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`${mode.label} mode: ${mode.tagline}`}
            disabled={disabled}
            onClick={() => onChange(mode.id)}
            className={`relative px-3 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1.5 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isSelected
                ? 'text-white'
                : 'text-text-dim hover:text-text hover:bg-white/[0.04]'
            }`}
          >
            {isSelected && (
              <motion.div
                layoutId="active-discovery-mode-indicator"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                className="absolute inset-0 rounded-full mood-surface border border-white/20 shadow-sm -z-10"
              />
            )}
            <Icon
              className={`w-3.5 h-3.5 ${
                isSelected ? 'text-white fill-white/20' : 'text-text-dim'
              }`}
            />
            <span className="font-semibold">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}

