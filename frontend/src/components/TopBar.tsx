import { Wordmark } from './Wordmark';
import { SlidersHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
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

        {/* Center: Navigation Tabs with Fluid Pill Animation */}
        {onTabChange && (
          <nav
            role="tablist"
            aria-label="Navigation"
            className="flex items-center gap-1 p-1 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md relative"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'discover'}
              onClick={() => onTabChange('discover')}
              className={`group/tab px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer relative ${
                activeTab === 'discover' ? 'text-white/85 hover:text-white' : 'text-text-dim hover:text-text'
              }`}
            >
              {activeTab === 'discover' && (
                <motion.span
                  layoutId="activeTabBadge"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-900/45 via-fuchsia-900/40 to-cyan-900/45 border border-fuchsia-400/25 transition-all duration-300 group-hover/tab:from-[#7C3AED] group-hover/tab:via-[#FF007F] group-hover/tab:to-[#00DFD8] group-hover/tab:border-cyan-300/70 group-hover/tab:saturate-[1.6] group-hover/tab:shadow-[0_0_20px_rgba(236,72,153,0.5)]"
                  transition={{ type: 'spring', bounce: 0.18, duration: 0.45 }}
                />
              )}
              <span className="relative z-10">Discover</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'transition'}
              onClick={() => onTabChange('transition')}
              className={`group/tab px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer relative ${
                activeTab === 'transition' ? 'text-white/85 hover:text-white' : 'text-text-dim hover:text-text'
              }`}
            >
              {activeTab === 'transition' && (
                <motion.span
                  layoutId="activeTabBadge"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-900/45 via-fuchsia-900/40 to-cyan-900/45 border border-fuchsia-400/25 transition-all duration-300 group-hover/tab:from-[#7C3AED] group-hover/tab:via-[#FF007F] group-hover/tab:to-[#00DFD8] group-hover/tab:border-cyan-300/70 group-hover/tab:saturate-[1.6] group-hover/tab:shadow-[0_0_20px_rgba(236,72,153,0.5)]"
                  transition={{ type: 'spring', bounce: 0.18, duration: 0.45 }}
                />
              )}
              <span className="relative z-10">Mood Transition</span>
            </button>
          </nav>
        )}

        {/* Right: Preferences (Discover mode only) */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-[32px] sm:min-w-[110px] justify-end">
          {activeTab === 'discover' && onOpenPreferences && (
            <button
              type="button"
              onClick={onOpenPreferences}
              aria-label="Open taste preferences"
              title="Taste Preferences"
              className="glass-pill p-2 sm:px-3 sm:py-1.5 flex items-center gap-1.5 text-xs font-medium text-text-dim hover:text-text hover:bg-white/[0.08] transition-all cursor-pointer border border-white/10"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 mood-accent-text" />
              <span className="hidden sm:inline font-medium">Preferences</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
