import { memo, useState, useRef, useEffect } from 'react';
import { Wordmark } from './Wordmark';
import { SlidersHorizontal, LogOut, LogIn, UserRound, ChevronDown, FlaskConical } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import type { StatusResponse } from '../types';

interface TopBarProps {
  status?: StatusResponse | null;
  onOpenPreferences?: () => void;
  activeTab?: 'discover' | 'transition';
  onTabChange?: (tab: 'discover' | 'transition') => void;
  onOpenSignIn?: () => void;
  isMockMode: boolean;
  onToggleMockMode: () => void;
}

export const TopBar = memo(function TopBar({
  status: _status,
  onOpenPreferences,
  activeTab = 'discover',
  onTabChange,
  onOpenSignIn,
  isMockMode,
  onToggleMockMode,
}: TopBarProps) {
  const { user, profile, isGuest, signOut } = useAuth();
  const reduceMotion = useReducedMotion();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDocked, setIsDocked] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateDockState = () => {
      const scrollY = window.scrollY;
      setIsDocked((currentlyDocked) => {
        if (!currentlyDocked && scrollY > 28) return true;
        if (currentlyDocked && scrollY < 12) return false;
        return currentlyDocked;
      });
    };

    updateDockState();
    window.addEventListener('scroll', updateDockState, { passive: true });
    return () => window.removeEventListener('scroll', updateDockState);
  }, []);

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
    <header className={`site-topbar sticky top-0 z-40 w-full h-16 border-b transition-colors${isDocked ? ' is-docked' : ''}`}>
      <div className="site-topbar-content max-w-6xl mx-auto h-full px-4 sm:px-6 grid grid-cols-[1fr_auto_1fr] items-center">
        {/* Left: Brand */}
        <motion.div
          className="site-topbar-brand"
          initial={reduceMotion ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.38, delay: reduceMotion ? 0 : 0.02, ease: [0.22, 1, 0.36, 1] }}
        >
          <Wordmark />
        </motion.div>

        {/* Center: Navigation Tabs with Fluid Pill Animation */}
        {onTabChange && (
          <motion.nav
            role="tablist"
            aria-label="Navigation"
            className="glass-pill site-topbar-control flex items-center gap-1 p-1 relative"
            initial={reduceMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.38, delay: reduceMotion ? 0 : 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'discover'}
              onClick={() => onTabChange('discover')}
              className={`site-topbar-button px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-colors duration-200 cursor-pointer relative ${
                activeTab === 'discover' ? 'text-white' : 'text-text-dim hover:text-text'
              }`}
            >
              {activeTab === 'discover' && (
                <motion.span
                  layoutId="activeTabBadge"
                  className="site-topbar-active-tab absolute inset-0 rounded-full mood-gradient"
                  transition={reduceMotion ? { duration: 0 } : { type: 'spring', bounce: 0.14, duration: 0.4 }}
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
              className={`site-topbar-button px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-colors duration-200 cursor-pointer relative ${
                activeTab === 'transition' ? 'text-white' : 'text-text-dim hover:text-text'
              }`}
            >
              {activeTab === 'transition' && (
                <motion.span
                  layoutId="activeTabBadge"
                  className="site-topbar-active-tab absolute inset-0 rounded-full mood-gradient"
                  transition={reduceMotion ? { duration: 0 } : { type: 'spring', bounce: 0.14, duration: 0.4 }}
                />
              )}
              <span className="relative z-10"><span className="sm:hidden">Transition</span><span className="hidden sm:inline">Mood Transition</span></span>
            </button>
          </motion.nav>
        )}

        {/* Right: Account menu */}
        <motion.div
          className="justify-self-end"
          initial={reduceMotion ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.38, delay: reduceMotion ? 0 : 0.14, ease: [0.22, 1, 0.36, 1] }}
        >
          {user || isGuest ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                aria-label="Open account menu"
                aria-haspopup="true"
                aria-expanded={isMenuOpen}
                className="glass-pill site-topbar-control site-topbar-button flex items-center gap-2 p-1 pl-1.5 pr-2 transition-all cursor-pointer hover:border-white/35 hover:brightness-110"
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
                    className="liquid-glass-prominent liquid-account-menu absolute right-0 mt-3 w-[min(18rem,calc(100vw-2rem))] rounded-[24px] p-2.5 z-50 origin-top-right"
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

                      <button
                        type="button"
                        role="switch"
                        aria-checked={isMockMode}
                        onClick={() => {
                          onToggleMockMode();
                          setIsMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-text hover:bg-white/[0.1] transition-colors cursor-pointer text-left"
                      >
                        <FlaskConical className={`w-4 h-4 ${isMockMode ? 'text-mock-status' : 'text-text-dim'}`} />
                        <span className="flex-1 min-w-0">
                          <span className="block font-medium">Use mock data</span>
                          <span className="block text-[10px] text-text-faint mt-0.5">Only affects searches in this browser</span>
                        </span>
                        <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-1 rounded-full border ${
                          isMockMode
                            ? 'text-mock-status bg-mock-status/10 border-mock-status/25'
                            : 'text-text-faint bg-white/[0.04] border-white/[0.08]'
                        }`}>
                          {isMockMode ? 'On' : 'Off'}
                        </span>
                      </button>

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
        </motion.div>
      </div>
    </header>
  );
});
