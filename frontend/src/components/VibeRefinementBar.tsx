import { useState, type FormEvent } from 'react';
import { SlidersHorizontal, ArrowRight, X } from 'lucide-react';

interface VibeModifier {
  id: string;
  label: string;
  icon: string;
  modifierText: string;
}

const VIBE_MODIFIERS: VibeModifier[] = [
  { id: 'acoustic', label: 'More Acoustic', icon: '🌿', modifierText: 'acoustic unplugged organic sound' },
  { id: 'darker', label: 'Darker Tone', icon: '🌑', modifierText: 'melancholic moody minor key' },
  { id: 'energetic', label: 'Higher Energy', icon: '⚡', modifierText: 'driving high octane rhythmic pulse' },
  { id: 'calmer', label: 'Calmer', icon: '🌊', modifierText: 'calm soothing ambient downtempo' },
  { id: 'vintage', label: 'Vintage / Lo-Fi', icon: '📼', modifierText: 'vintage retro analog tape warmth' },
];

interface VibeRefinementBarProps {
  page: number;
  totalTracks: number;
  activeMood?: string;
  onRefine: (type: string, label: string, delta: string) => void;
  disabled?: boolean;
}

export function VibeRefinementBar({
  page,
  totalTracks,
  onRefine,
  disabled = false,
}: VibeRefinementBarProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customText, setCustomText] = useState('');
  const [selectedModifier, setSelectedModifier] = useState<string | null>(null);

  const isLocked = page > 1;

  const handleModifierClick = (mod: VibeModifier) => {
    if (disabled || isLocked) return;
    setSelectedModifier(mod.id);
    onRefine(mod.id, mod.label, mod.modifierText);
  };

  const handleCustomSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (disabled || isLocked || !customText.trim()) return;
    const trimmed = customText.trim();
    setSelectedModifier('custom');
    onRefine('custom', trimmed, trimmed);
    setIsCustomOpen(false);
  };

  // Once vibe is set or user expands beyond Page 1, remove the bar completely for a clean UI
  if (isLocked || totalTracks > 10) {
    return null;
  }

  return (
    <div className="glass-panel w-full flex flex-col gap-2.5 px-4 py-3 rounded-2xl mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-text uppercase tracking-wider font-mono">
          <SlidersHorizontal className="w-3.5 h-3.5 text-cyan" />
          <span>Refine Vibe</span>
        </div>

        <span className="text-[11px] text-text-faint hidden sm:inline">
          Dial in your mood before expanding
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {VIBE_MODIFIERS.map((mod) => {
          const isSelected = selectedModifier === mod.id;
          return (
            <button
              key={mod.id}
              type="button"
              disabled={disabled}
              onClick={() => handleModifierClick(mod)}
              className={`glass-pill px-3 py-1.5 text-xs font-medium rounded-full transition-all border flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                isSelected
                  ? 'bg-cyan/20 border-cyan text-cyan shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : 'bg-white/[0.03] border-white/10 text-text-dim hover:text-text hover:border-cyan/40 hover:bg-white/[0.08]'
              }`}
            >
              <span>{mod.icon}</span>
              <span>{mod.label}</span>
            </button>
          );
        })}

        {/* Custom text tweak toggle */}
        {!isCustomOpen ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsCustomOpen(true)}
            className="glass-pill px-3 py-1.5 text-xs font-medium rounded-full transition-all border border-dashed border-white/20 bg-white/[0.02] text-text-faint hover:text-text hover:border-cyan/40 hover:bg-white/[0.06] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span>✏️</span>
            <span>Custom tweak...</span>
          </button>
        ) : (
          <form onSubmit={handleCustomSubmit} className="flex items-center gap-1.5 flex-1 min-w-[200px]">
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="e.g. more acoustic guitar, less drums"
              autoFocus
              className="flex-1 bg-black/40 border border-cyan/40 rounded-full px-3 py-1 text-xs text-text placeholder-text-faint focus:outline-none focus:ring-1 focus:ring-cyan"
            />
            <button
              type="submit"
              disabled={!customText.trim()}
              className="p-1 rounded-full bg-cyan/20 text-cyan hover:bg-cyan/30 disabled:opacity-40 cursor-pointer"
              title="Apply refinement"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCustomOpen(false);
                setCustomText('');
              }}
              className="p-1 rounded-full text-text-faint hover:text-text cursor-pointer"
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

