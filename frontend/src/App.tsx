import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AuroraBackground } from './components/AuroraBackground';
import { TopBar } from './components/TopBar';
import { Hero } from './components/Hero';
import { ThinkingState } from './components/ThinkingState';
import { IntentPanel } from './components/IntentPanel';
import { NoticeBanner } from './components/NoticeBanner';
import { TrackGrid } from './components/TrackGrid';
import { VibeRefinementBar } from './components/VibeRefinementBar';
import { ErrorCard } from './components/ErrorCard';
import { RecentChips } from './components/RecentChips';
import { Toasts } from './components/Toasts';
import { CameraModal } from './components/CameraModal';
import { PreferencesModal } from './components/PreferencesModal';
import { MoodTransitionPage } from './components/transition/MoodTransitionPage';
import { AudioPlayerProvider, useAudioPlayer } from './context/AudioPlayerContext';
import { BottomPlayerBar } from './components/BottomPlayerBar';
import { useStatus } from './hooks/useStatus';
import { useSearch } from './hooks/useSearch';
import { useMoodTheme } from './hooks/useMoodTheme';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { loadMoreMusic, refineVibeMusic } from './api/client';
import { createMockClient } from './api/mockClient';
import {
  getStoredProfile,
  setDiscoveryMode,
  subscribeToProfile,
} from './services/preferenceStorage';
import { initPerfMetrics } from './utils/perfMetrics';
import { collectBrowserContext } from './utils/browserContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthLandingView } from './components/auth/AuthLandingView';
import { Wordmark } from './components/Wordmark';
import type { ToastInfo, Track } from './types';
import type { CameraAnalysisResponse } from './types/camera';
import type { DiscoveryMode, StoredProfile } from './types/discovery';

interface AppProps {
  api?: {
    search: (prompt: string, signal?: AbortSignal) => Promise<any>;
  };
}

function AppContent({ api }: AppProps = {}) {
  const reduceMotion = useReducedMotion();
  const { user, isGuest, isLoading: isAuthLoading } = useAuth();
  const [forceShowAuth, setForceShowAuth] = useState(false);
  const { status, refetch: refreshStatus } = useStatus();
  const [isMockMode, setIsMockMode] = useState(false);
  const mockClient = useMemo(() => createMockClient(), []);
  const searchOptions = useMemo(
    () =>
      isMockMode
        ? { searchFn: (p: string, s?: AbortSignal) => mockClient.search(p, undefined, s) }
        : api
        ? { searchFn: (p: string, s?: AbortSignal) => api.search(p, s) }
        : undefined,
    [api, isMockMode, mockClient]
  );
  const { status: searchStatus, data, error, lastPrompt, search, reset: resetSearch } = useSearch(searchOptions);
  const [profile, setProfile] = useState<StoredProfile>(getStoredProfile);
  const { appendQueue } = useAudioPlayer();
  const [prompt, setPrompt] = useState('');
  const [toasts, setToasts] = useState<ToastInfo[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'discover' | 'transition'>('discover');
  const [transitionMood, setTransitionMood] = useState<string | undefined>();

  // Continuous discovery pagination state
  const [cumulativeTracks, setCumulativeTracks] = useState<Track[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefiningVibe, setIsRefiningVibe] = useState(false);

  // Sync cumulative tracks whenever a fresh search succeeds
  useEffect(() => {
    if (data?.tracks) {
      setCumulativeTracks(data.tracks);
      setCurrentPage(1);
      setHasMorePages(data.hasMore !== undefined ? data.hasMore : data.mode !== 'mock' && data.tracks.length >= 10);
    }
  }, [data]);

  useEffect(() => {
    if (data) void refreshStatus();
  }, [data, refreshStatus]);

  const resultsRef = useRef<HTMLDivElement>(null);

  // Initialize non-intrusive performance metrics observer
  useEffect(() => {
    return initPerfMetrics();
  }, []);

  // Subscribe to storage changes
  useEffect(() => {
    return subscribeToProfile((updated) => setProfile(updated));
  }, []);

  // Aurora mood theme retints smoothly based on intent
  const theme = useMoodTheme(data?.intent, activeTab === 'transition' ? transitionMood : undefined);
  const moodStyle = useMemo(
    () =>
      ({
        '--mood-primary': theme.primary,
        '--mood-secondary': theme.secondary,
        '--mood-accent': theme.accent1,
        '--mood-accent-2': theme.accent2,
      }) as CSSProperties,
    [theme.primary, theme.secondary, theme.accent1, theme.accent2]
  );

  // Toast management with auto-dismiss duration
  const addToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info', durationMs = 3000) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, durationMs);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleToggleMockMode = useCallback(() => {
    const nextMode = !isMockMode;
    setIsMockMode(nextMode);
    resetSearch();
    setCumulativeTracks([]);
    setCurrentPage(1);
    setHasMorePages(false);
    addToast(
      nextMode
        ? 'Mock sample data enabled for searches in this browser.'
        : 'Using the server-selected search mode.',
      'info'
    );
  }, [isMockMode, resetSearch, addToast]);

  // Voice speech-to-text integration
  const speech = useSpeechRecognition({
    onInterim: (interimText) => {
      setPrompt(interimText);
    },
    onFinal: (finalText) => {
      setPrompt(finalText);
    },
    onError: (errorMessage) => {
      addToast(errorMessage, 'error');
    },
  });

  const handleSearchSubmit = useCallback(
    async (searchPrompt: string) => {
      const trimmed = searchPrompt.trim();
      if (!trimmed) return;

      setPrompt(trimmed);

      // Add to search history (keep last 6)
      setRecentSearches((prev) => {
        const filtered = prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
        return [trimmed, ...filtered].slice(0, 6);
      });

      await search(trimmed);
    },
    [search]
  );

  const handleModeChange = useCallback(
    (newMode: DiscoveryMode) => {
      const updated = setDiscoveryMode(newMode);
      setProfile(updated);
      const modeName = newMode.charAt(0) + newMode.slice(1).toLowerCase();
      // Clear any previous mode switch toasts and dismiss quickly (1.5s)
      setToasts((prev) => prev.filter((t) => !t.message.startsWith('Discovery mode set to')));
      addToast(`Discovery mode set to ${modeName}.`, 'info', 1500);
    },
    [addToast]
  );

  const handleOpenPreferences = useCallback(() => {
    setIsPreferencesOpen(true);
  }, []);

  const handleOpenCamera = useCallback(() => {
    setIsCameraOpen(true);
  }, []);

  const handleBrandClick = useCallback(() => {
    resetSearch();
    setPrompt('');
    setRecentSearches([]);
    setCumulativeTracks([]);
    setCurrentPage(1);
    setHasMorePages(false);
    setActiveTab('discover');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [resetSearch]);

  const handleCopyNotice = useCallback(() => {
    addToast('Search query copied to clipboard!', 'success');
  }, [addToast]);

  const handleRecentSelect = useCallback(
    (selectedPrompt: string) => {
      setPrompt(selectedPrompt);
      void handleSearchSubmit(selectedPrompt);
    },
    [handleSearchSubmit]
  );

  const handleLoadMore = useCallback(async () => {
    if (!data?.intent || isLoadingMore || cumulativeTracks.length >= 25) return;
    setIsLoadingMore(true);

    try {
      const counts: Record<string, number> = {};
      for (const t of cumulativeTracks) {
        const primary = (t.artists[0] || '').toLowerCase().trim();
        counts[primary] = (counts[primary] || 0) + 1;
      }

      const nextPage = currentPage + 1;
      const res = await loadMoreMusic({
        prompt: lastPrompt || prompt,
        intent: data.intent,
        page: nextPage,
        excludeTrackIds: cumulativeTracks.map((t) => t.id),
        cumulativeArtistCounts: counts,
        discoveryMode: profile.discoveryMode,
        browserContext: collectBrowserContext(),
      });

      if (res && res.tracks && res.tracks.length > 0) {
        let totalCount = cumulativeTracks.length;
        setCumulativeTracks((prev) => {
          const existingIds = new Set(prev.map((t) => t.id));
          const fresh = res.tracks.filter((t) => !existingIds.has(t.id));
          const remainingSlots = Math.max(0, 25 - prev.length);
          const tracksToAdd = fresh.slice(0, remainingSlots);
          const updated = [...prev, ...tracksToAdd];
          totalCount = updated.length;
          return updated;
        });
        appendQueue(res.tracks);
        setCurrentPage(nextPage);

        // Stop Load More once 25 tracks are assembled
        const hasReachedLimit = totalCount >= 25;
        setHasMorePages(!hasReachedLimit && res.hasMore);
      } else {
        setHasMorePages(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not load more tracks';
      addToast(msg, 'error');
    } finally {
      setIsLoadingMore(false);
    }
  }, [data, isLoadingMore, cumulativeTracks, currentPage, lastPrompt, prompt, profile.discoveryMode, appendQueue, addToast]);

  const handleRefineVibe = useCallback(async (type: string, label: string, delta: string) => {
    if (!data?.intent || data.mode === 'mock' || isMockMode || isRefiningVibe || isLoadingMore) return;
    setIsRefiningVibe(true);

    try {
      const res = await refineVibeMusic({
        prompt: lastPrompt || prompt,
        intent: data.intent,
        refinement: {
          type,
          label,
          delta,
        },
        discoveryMode: profile.discoveryMode,
        browserContext: collectBrowserContext(),
      });

      if (res && res.tracks && res.tracks.length > 0) {
        setCumulativeTracks(res.tracks);
        appendQueue(res.tracks);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not refine vibe';
      addToast(msg, 'error');
    } finally {
      setIsRefiningVibe(false);
    }
  }, [data, isMockMode, isRefiningVibe, isLoadingMore, lastPrompt, prompt, profile.discoveryMode, appendQueue, addToast]);

  // Smooth scroll into results when search finishes
  useEffect(() => {
    if (searchStatus === 'success' && resultsRef.current) {
      if (typeof resultsRef.current.scrollIntoView === 'function') {
        resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [searchStatus]);

  const hasSearched = searchStatus === 'success' || searchStatus === 'loading' || Boolean(data);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-ink">
        <div className="flex flex-col items-center gap-4">
          <Wordmark />
          <div className="text-xs text-text-dim animate-pulse">Connecting to Echora...</div>
        </div>
      </div>
    );
  }

  if ((!user && !isGuest) || forceShowAuth) {
    return <AuthLandingView />;
  }

  return (
    <div
      className="mood-shell relative min-h-screen flex flex-col font-sans selection:bg-magenta/30 selection:text-text"
      style={moodStyle}
      data-mood={data?.intent?.mood || 'neutral'}
    >
      {/* Background Aurora */}
      <AuroraBackground theme={theme} />

      {/* Sticky Glass Top Bar */}
      <TopBar
        status={status}
        isMockMode={isMockMode}
        onToggleMockMode={handleToggleMockMode}
        onOpenPreferences={handleOpenPreferences}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onBrandClick={handleBrandClick}
        onOpenAccountMenu={() => { void refreshStatus(); }}
        onOpenSignIn={() => setForceShowAuth(true)}
      />

      {/* Main content hands off smoothly between the two feature modules. */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 flex flex-col pb-16">
        <AnimatePresence mode="wait" initial={false}>
          {activeTab === 'transition' ? (
            <motion.div
              key="transition-view"
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
              className="w-full flex-1 flex flex-col"
            >
              <MoodTransitionPage onMoodChange={setTransitionMood} />
            </motion.div>
          ) : (
            <motion.div
              key="discover-view"
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
              className="w-full flex-1 flex flex-col"
            >
            {/* Hero Section & Composer */}
            <Hero
              hasSearched={hasSearched}
              prompt={prompt}
              onPromptChange={setPrompt}
              onSubmit={handleSearchSubmit}
              isLoading={searchStatus === 'loading'}
              isListening={speech.isListening}
              isMicSupported={speech.isSupported}
              onToggleMic={speech.toggleListening}
              onOpenCamera={handleOpenCamera}
              discoveryMode={profile.discoveryMode}
              onDiscoveryModeChange={handleModeChange}
            />

            {/* Results / Feedback Region */}
            <div ref={resultsRef} aria-live="polite" className="w-full">
              {/* 1. Loading State */}
              {searchStatus === 'loading' && <ThinkingState />}

              {/* 2. Error State */}
              {searchStatus === 'error' && error && (
                <ErrorCard
                  error={error}
                  onRetry={() => {
                    if (lastPrompt) {
                      void handleSearchSubmit(lastPrompt);
                    }
                  }}
                />
              )}

              {/* 3. Successful Search Results */}
              {searchStatus === 'success' && data && (
                <>
                  {/* Notice Banner (if any) */}
                  <NoticeBanner notice={data.notice} />

                  {/* Intent Breakdown Panel */}
                  <IntentPanel
                    data={data}
                    userPrompt={lastPrompt.replace(/\s*[\(\[].*?[\)\]]/gi, '').replace(/\s*,\s*(acoustic|melancholic|driving|calm|vintage).*$/gi, '').trim()}
                    onCopyNotice={handleCopyNotice}
                  />

                  {/* Vibe Refinement Bar (Interactive on Page 1, Locked on continuous expansion) */}
                  <VibeRefinementBar
                    page={currentPage}
                    totalTracks={cumulativeTracks.length}
                    activeMood={data.intent.mood}
                    onRefine={handleRefineVibe}
                    disabled={data.mode === 'mock' || isMockMode || isLoadingMore || isRefiningVibe}
                  />

                  {/* Tracks Grid with Continuous Discovery */}
                  <TrackGrid
                    tracks={cumulativeTracks}
                    page={currentPage}
                    hasMore={hasMorePages}
                    isLoadingMore={isLoadingMore}
                    onLoadMore={handleLoadMore}
                  />

                  {/* Search History Chips */}
                  <RecentChips
                    history={recentSearches}
                    onSelect={handleRecentSelect}
                  />
                </>
              )}
            </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Camera Modal - mounted only when open to avoid idle hook overhead */}
      {isCameraOpen && (
        <CameraModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onSelectMusicDirection={(direction, result?: CameraAnalysisResponse) => {
            setPrompt(direction);
            if (result?.expression) {
              addToast(`Expression detected: ${result.expression}`, 'success');
            }
            void handleSearchSubmit(direction);
          }}
        />
      )}

      {/* Preferences Management Modal - mounted only when open */}
      {isPreferencesOpen && (
        <PreferencesModal
          isOpen={isPreferencesOpen}
          onClose={() => setIsPreferencesOpen(false)}
          onProfileUpdated={(updated) => setProfile(updated)}
          onNotify={(msg, type) => addToast(msg, type)}
        />
      )}

      {/* Floating Toast Stack */}
      <Toasts toasts={toasts} onDismiss={dismissToast} />

      {/* Native In-App Audio Player */}
      <BottomPlayerBar />
    </div>
  );
}

export default function App(props: AppProps = {}) {
  return (
    <AuthProvider>
      <AudioPlayerProvider>
        <AppContent {...props} />
      </AudioPlayerProvider>
    </AuthProvider>
  );
}
