import { Wordmark } from './Wordmark';
import { SlidersHorizontal } from 'lucide-react';
import type { StatusResponse } from '../types';

interface TopBarProps {
  status?: StatusResponse | null;
  onOpenPreferences?: () => void;
}

export function TopBar({ status: _status, onOpenPreferences }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 w-full h-16 border-b border-white/[0.08] bg-ink/70 backdrop-blur-xl transition-colors">
      <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
        {/* Left: Brand */}
        <Wordmark />

        {/* Right: Preferences */}
        {onOpenPreferences && (
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onOpenPreferences}
              aria-label="Open taste preferences"
              title="Taste Preferences"
              className="glass-pill p-2 sm:px-3 sm:py-1.5 flex items-center gap-1.5 text-xs font-medium text-text-dim hover:text-text hover:bg-white/[0.08] transition-all cursor-pointer border border-white/10"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-violet" />
              <span className="hidden sm:inline font-medium">Preferences</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
