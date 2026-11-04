import { Wordmark } from './Wordmark';
import { SlidersHorizontal } from 'lucide-react';
import type { StatusResponse } from '../types';

interface TopBarProps {
  status?: StatusResponse | null;
  onOpenPreferences?: () => void;
  activeTab?: 'discover' | 'transition';
  onTabChange?: (tab: 'discover' | 'transition') => void;
}

export function TopBar({
  status: _status,
  onOpenPreferences,
  activeTab = 'discover',
  onTabChange,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 w-full h-16 border-b border-white/[0.08] bg-ink/70 backdrop-blur-xl transition-colors">
      <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
        {/* Left: Brand */}
        <Wordmark />

        {/* Center: Navigation Tabs */}
        {onTabChange && (
          <nav
            role="tablist"
            aria-label="Navigation"
            className="flex items-center gap-1 p-1 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'discover'}
              onClick={() => onTabChange('discover')}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'discover'
                  ? 'bg-gradient-to-r from-violet/90 to-magenta/80 text-white shadow-sm'
                  : 'text-text-dim hover:text-text hover:bg-white/5'
              }`}
            >
              Discover
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'transition'}
              onClick={() => onTabChange('transition')}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'transition'
                  ? 'bg-gradient-to-r from-violet/90 to-cyan/80 text-white shadow-sm'
                  : 'text-text-dim hover:text-text hover:bg-white/5'
              }`}
            >
              Mood Transition
            </button>
          </nav>
        )}

        {/* Right: Preferences */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {onOpenPreferences && (
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
          )}
        </div>
      </div>
    </header>
  );
}
