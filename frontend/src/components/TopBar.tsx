import { memo, useState, useRef, useEffect } from 'react';
import { Wordmark } from './Wordmark';
import { SlidersHorizontal, LogOut, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import type { StatusResponse } from '../types';

interface TopBarProps {
  status?: StatusResponse | null;
  onOpenPreferences?: () => void;
  activeTab?: 'discover' | 'transition';
  onTabChange?: (tab: 'discover' | 'transition') => void;
  onOpenSignIn?: () => void;
}

export const TopBar = memo(function TopBar({
  status: _status,
  onOpenPreferences,
  activeTab = 'discover',
  onTabChange,
  onOpenSignIn,
}: TopBarProps) {
  const { user, profile, isGuest, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

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
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-colors duration-200 cursor-pointer relative ${
                activeTab === 'discover' ? 'text-white' : 'text-text-dim hover:text-text'
              }`}
            >
              {activeTab === 'discover' && (
                <motion.span
                  layoutId="activeTabBadge"
                  className="absolute inset-0 rounded-full mood-gradient shadow-md shadow-violet/20"
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
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-colors duration-200 cursor-pointer relative ${
                activeTab === 'transition' ? 'text-white' : 'text-text-dim hover:text-text'
              }`}
            >
              {activeTab === 'transition' && (
                <motion.span
                  layoutId="activeTabBadge"
                  className="absolute inset-0 rounded-full mood-gradient shadow-md shadow-cyan/20"
                  transition={{ type: 'spring', bounce: 0.18, duration: 0.45 }}
                />
              )}
              <span className="relative z-10">Mood Transition</span>
            </button>
          </nav>
        )}

        {/* Right: Preferences & User Identity */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-[32px] sm:min-w-[140px] justify-end">
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

          {/* User Account State */}
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 transition-colors cursor-pointer"
                title={profile?.display_name || user.email || 'Account'}
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name || 'User Avatar'}
                    className="w-6 h-6 rounded-full object-cover border border-white/20"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-violet/30 border border-violet/40 flex items-center justify-center text-[10px] font-bold text-violet">
                    {(profile?.display_name || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="hidden md:inline text-xs font-medium text-text max-w-[90px] truncate">
                  {profile?.display_name || user.email?.split('@')[0]}
                </span>
              </button>

              {/* Account Dropdown Menu */}
              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-56 rounded-2xl bg-ink/95 border border-white/15 p-2 backdrop-blur-2xl shadow-2xl z-50"
                  >
                    <div className="px-3 py-2 border-b border-white/[0.08] mb-1">
                      <p className="text-xs font-semibold text-text truncate">
                        {profile?.display_name || 'EchoRa Listener'}
                      </p>
                      <p className="text-[11px] text-text-dim truncate">
                        {profile?.email || user.email || 'No email shared'}
                      </p>
                      <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-white/[0.06] text-text-muted">
                        via {profile?.auth_provider || 'OAuth'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : isGuest ? (
            <button
              type="button"
              onClick={onOpenSignIn}
              className="glass-pill px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium text-cyan hover:text-white bg-cyan/10 hover:bg-cyan/20 border border-cyan/30 transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
});
