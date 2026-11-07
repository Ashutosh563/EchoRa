import { useCallback, useRef, useState } from 'react';
import { AppApiError, searchMusic } from '../api/client';
import type { SearchResponse } from '../types';
import type { SearchOptions } from '../api/musicApi';
import {
  getStoredProfile,
  recordInteraction,
  getHistorySignals,
} from '../services/preferenceStorage';

export type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseSearchReturn {
  status: SearchStatus;
  data: SearchResponse | null;
  error: AppApiError | Error | null;
  lastPrompt: string;
  search: (prompt: string, searchOptions?: SearchOptions) => Promise<SearchResponse | null>;
  reset: () => void;
}

export interface UseSearchOptions {
  searchFn?: (prompt: string, signal?: AbortSignal) => Promise<SearchResponse>;
}

export function useSearch(options?: UseSearchOptions): UseSearchReturn {
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [data, setData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<AppApiError | Error | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string>('');

  const abortControllerRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async (rawPrompt: string, searchOptions?: SearchOptions): Promise<SearchResponse | null> => {
      const trimmed = rawPrompt.trim().slice(0, 300);
      if (!trimmed) {
        return null;
      }

      // Cancel in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setStatus('loading');
      setError(null);
      setLastPrompt(trimmed);

      // Resolve discovery mode & preferences
      const profile = getStoredProfile();
      const activeMode = searchOptions?.discoveryMode || profile.discoveryMode || 'FAMILIAR';
      const activePreferences = searchOptions?.preferences || profile.preferences;
      const historySignals =
        searchOptions?.historySignals || getHistorySignals(profile.interactionHistory);

      const combinedOptions: SearchOptions = {
        discoveryMode: activeMode,
        preferences: activePreferences,
        historySignals,
      };

      try {
        const response = options?.searchFn
          ? await options.searchFn(trimmed, controller.signal)
          : await searchMusic(trimmed, combinedOptions, controller.signal);
        setData(response);
        setStatus('success');

        // Record interaction for learning
        try {
          recordInteraction({
            prompt: trimmed,
            discoveryMode: activeMode,
            mood: response.intent?.mood,
            genre: response.intent?.genre,
          });
        } catch {
          // Non-blocking
        }

        // Update page title to "ECHORA — {mood}"
        if (response.intent?.mood) {
          const moodCap =
            response.intent.mood.charAt(0).toUpperCase() + response.intent.mood.slice(1);
          document.title = `ECHORA — ${moodCap}`;
        }

        return response;
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // Ignored; aborted by user
          return null;
        }
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        setStatus('error');
        return null;
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [options]
  );

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus('idle');
    setData(null);
    setError(null);
    setLastPrompt('');
  }, []);

  return {
    status,
    data,
    error,
    lastPrompt,
    search,
    reset,
  };
}
