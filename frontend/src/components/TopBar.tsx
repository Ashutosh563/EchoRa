import { memo, useState, useRef, useEffect } from 'react';
import { Wordmark } from './Wordmark';
import { SlidersHorizontal, LogOut, LogIn, UserRound, ChevronDown } from 'lucide-react';
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
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsMenuOpen(false);
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen]);

  return (
    <header className="site-topbar sticky top-0 z-40 w-full h-16 border-b transition-colors">
      <div className="site-topbar-content max-w-6xl mx-auto h-full px-4 sm:px-6 grid grid-cols-[1fr_auto_1fr] items-center">
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
              aria-label="Mood Transition"
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
              <span className="relative z-10"><span className="sm:hidden">Transition</span><span className="hidden sm:inline">Mood Transition</span></span>
            </button>
          </nav>
        )}

        {/* Right: Account menu */}
        <div className="justify-self-end">
          {user || isGuest ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                aria-label="Open account menu"
                aria-haspopup="true"
                aria-expanded={isMenuOpen}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full bg-white/[0.07] hover:bg-white/[0.12] border border-white/15 hover:border-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_4px_16px_rgba(0,0,0,0.14)] backdrop-blur-xl transition-all cursor-pointer"
                title={profile?.display_name || user?.email || 'Account'}
              >
                {user && profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name || 'User Avatar'}
                    className="w-6 h-6 rounded-full object-cover border border-white/20"
                  />
                ) : user ? (
                  <div className="w-6 h-6 rounded-full bg-violet/30 border border-violet/40 flex items-center justify-center text-[10px] font-bold text-violet">
                    {(profile?.display_name || user.email || 'U')[0].toUpperCase()}
                  </div>
                ) : (
                  <UserRound className="w-4 h-4 text-text-dim" />
                )}
                <span className="hidden sm:inline text-xs font-medium text-text max-w-[90px] truncate">
                  {user ? profile?.display_name || user.email?.split('@')[0] : 'Account'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-text-dim transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Account Dropdown Menu */}
              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 6 }}
                    transition={{ duration: 0.15 }}
                    className="liquid-account-menu absolute right-0 mt-3 w-[min(18rem,calc(100vw-2rem))] rounded-[24px] p-2.5 z-50 origin-top-right"
                  >
                    <div className="liquid-account-menu-content relative z-10">
                      <div className="px-3 py-2.5 border-b border-white/[0.12] mb-1.5">
                        <p className="text-xs font-semibold text-text truncate">
                          {user ? profile?.display_name || 'EchoRa Listener' : 'Guest session'}
                        </p>
                        <p className="text-[11px] text-text-dim truncate mt-0.5">
                          {user ? profile?.email || user.email || 'No email shared' : 'Your preferences are saved on this device'}
                        </p>
                        {user && <span className="inline-block mt-2 px-2 py-1 rounded-full text-[9px] uppercase font-bold tracking-wider bg-white/[0.08] border border-white/[0.1] text-text-muted">
                          via {profile?.auth_provider || 'OAuth'}
                        </span>}
                      </div>

                      {onOpenPreferences && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            onOpenPreferences();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-text hover:bg-white/[0.1] transition-colors cursor-pointer text-left"
                        >
                          <SlidersHorizontal className="w-4 h-4 text-violet-200" />
                          <span className="font-medium">Taste Preferences</span>
                        </button>
                      )}

                      {user ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            signOut();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-rose-300 hover:bg-rose-400/10 hover:text-rose-200 transition-colors cursor-pointer text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          <span className="font-medium">Sign Out</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            onOpenSignIn?.();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-cyan-100 hover:bg-cyan-300/10 hover:text-white transition-colors cursor-pointer text-left"
                        >
                          <LogIn className="w-4 h-4" />
                          <span className="font-medium">Sign In</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
});
