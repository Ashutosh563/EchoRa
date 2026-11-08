import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
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
import {
  getStoredProfile,
  setDiscoveryMode,
  subscribeToProfile,
} from './services/preferenceStorage';
import type { ToastInfo, Track } from './types';
import type { CameraAnalysisResponse } from './types/camera';
import type { DiscoveryMode, StoredProfile } from './types/discovery';

interface AppProps {
  api?: {
    search: (prompt: string, signal?: AbortSignal) => Promise<any>;
  };
}

function AppContent({ api }: AppProps = {}) {
  const { status } = useStatus();
  const { status: searchStatus, data, error, lastPrompt, search } = useSearch(
    api ? { searchFn: (p, s) => api.search(p, s) } : undefined
  );
  const [profile, setProfile] = useState<StoredProfile>(getStoredProfile);
  const { closePlayer, appendQueue } = useAudioPlayer();
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
      setHasMorePages(true);
    }
  }, [data]);

  const resultsRef = useRef<HTMLDivElement>(null);

  // Subscribe to storage changes
  useEffect(() => {
    return subscribeToProfile((updated) => setProfile(updated));
  }, []);

  // Stop native player if user navigates to Mood Transition tab
  useEffect(() => {
    if (activeTab === 'transition') {
      closePlayer();
    }
  }, [activeTab, closePlayer]);

  // Aurora mood theme retints smoothly based on intent
  const theme = useMoodTheme(data?.intent, activeTab === 'transition' ? transitionMood : undefined);
  const moodStyle = {
    '--mood-primary': theme.primary,
    '--mood-secondary': theme.secondary,
    '--mood-accent': theme.accent1,
    '--mood-accent-2': theme.accent2,
  } as CSSProperties;

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

  const handleSearchSubmit = async (searchPrompt: string) => {
    const trimmed = searchPrompt.trim();
    if (!trimmed) return;

    setPrompt(trimmed);

    // Add to search history (keep last 6)
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
      return [trimmed, ...filtered].slice(0, 6);
    });

    await search(trimmed);
  };

  const handleLoadMore = async () => {
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
      });

      if (res && res.tracks && res.tracks.length > 0) {
        let totalCount = cumulativeTracks.length;
        setCumulativeTracks((prev) => {
          const existingIds = new Set(prev.map((t) => t.id));
          const fresh = res.tracks.filter((t) => !existingIds.has(t.id));
          const updated = [...prev, ...fresh];
          totalCount = updated.length;
          return updated;
        });
        appendQueue(res.tracks);
        setCurrentPage(nextPage);

        // Continue allowing Load More until at least 25 tracks are assembled
        const hasReachedLimit = totalCount >= 25;
        setHasMorePages(!hasReachedLimit && res.tracks.length > 0);
      } else {
        setHasMorePages(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not load more tracks';
      addToast(msg, 'error');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleRefineVibe = async (type: string, label: string, delta: string) => {
    if (!data?.intent || isRefiningVibe || isLoadingMore) return;
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
  };

  const handleModeChange = (newMode: DiscoveryMode) => {
    const updated = setDiscoveryMode(newMode);
    setProfile(updated);
    const modeName = newMode.charAt(0) + newMode.slice(1).toLowerCase();
    // Clear any previous mode switch toasts and dismiss quickly (1.5s)
    setToasts((prev) => prev.filter((t) => !t.message.startsWith('Discovery mode set to')));
    addToast(`Discovery mode set to ${modeName}.`, 'info', 1500);
  };

  // Smooth scroll into results when search finishes
  useEffect(() => {
    if (searchStatus === 'success' && resultsRef.current) {
      if (typeof resultsRef.current.scrollIntoView === 'function') {
        resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [searchStatus]);

  const hasSearched = searchStatus === 'success' || searchStatus === 'loading' || Boolean(data);

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
        onOpenPreferences={activeTab === 'discover' ? () => setIsPreferencesOpen(true) : undefined}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Content Area with Fluid Tab Switching Animation */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 flex flex-col pb-16">
        {activeTab === 'transition' ? (
          <motion.div
            key="transition-view"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex-1 flex flex-col"
          >
            <MoodTransitionPage onMoodChange={setTransitionMood} />
          </motion.div>
        ) : (
          <motion.div
            key="discover-view"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
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
              onOpenCamera={() => setIsCameraOpen(true)}
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
                    onCopyNotice={() => addToast('Search query copied to clipboard!', 'success')}
                  />

                  {/* Vibe Refinement Bar (Interactive on Page 1, Locked on continuous expansion) */}
                  <VibeRefinementBar
                    page={currentPage}
                    totalTracks={cumulativeTracks.length}
                    activeMood={data.intent.mood}
                    onRefine={handleRefineVibe}
                    disabled={isLoadingMore || isRefiningVibe}
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
                    onSelect={(selectedPrompt) => {
                      setPrompt(selectedPrompt);
                      void handleSearchSubmit(selectedPrompt);
                    }}
                  />
                </>
              )}
            </div>
          </motion.div>
        )}
      </main>

      {/* Camera Modal */}
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

      {/* Preferences Management Modal */}
      <PreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        onProfileUpdated={(updated) => setProfile(updated)}
        onNotify={(msg, type) => addToast(msg, type)}
      />

      {/* Floating Toast Stack */}
      <Toasts toasts={toasts} onDismiss={dismissToast} />

      {/* Native In-App Audio Player: Discover Mode Only */}
      {activeTab === 'discover' && <BottomPlayerBar />}
    </div>
  );
}

export default function App(props: AppProps = {}) {
  return (
    <AudioPlayerProvider>
      <AppContent {...props} />
    </AudioPlayerProvider>
  );
}
