import { motion } from 'framer-motion';

export interface ExamplePromptOption {
  label: string;
  prompt: string;
}

export const EXAMPLE_CHIPS: ExamplePromptOption[] = [
  {
    label: '🌧 Rainy day focus',
    prompt: 'Mellow acoustic songs and calm beats for a rainy focus session',
  },
  {
    label: '🏋 Gym power-up',
    prompt: 'Aggressive, high-energy phonk and electronic for an intense workout',
  },
  {
    label: '🌙 Late-night calm',
    prompt: 'Peaceful instrumental music for studying at 3 AM',
  },
  {
    label: '☀️ Sunny road trip',
    prompt: 'Upbeat feel-good indie pop for a warm sunny highway drive',
  },
  {
    label: '💔 Heartbreak hours',
    prompt: 'Melancholic acoustic ballads for late-night emotional reflection',
  },
];

interface ExampleChipsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export function ExampleChips({ onSelect, disabled = false }: ExampleChipsProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 pt-3">
      {EXAMPLE_CHIPS.map((chip, index) => (
        <motion.button
          key={chip.label}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(chip.prompt)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: index * 0.08, ease: 'easeOut' }}
          className="glass-pill px-3.5 py-1.5 text-xs text-text-dim hover:text-text hover:bg-white/[0.08] hover:border-white/20 active:scale-95 transition-all cursor-pointer border border-white/5"
          aria-label={`Prompt example: ${chip.label}`}
        >
          {chip.label}
        </motion.button>
      ))}
    </div>
  );
}

