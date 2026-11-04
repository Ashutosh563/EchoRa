import { useCallback, useRef, useState } from 'react';
import { AppApiError, searchMusic } from '../api/client';
import type { SearchResponse } from '../types';

export type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseSearchReturn {
  status: SearchStatus;
  data: SearchResponse | null;
  error: AppApiError | Error | null;
  lastPrompt: string;
  search: (prompt: string) => Promise<SearchResponse | null>;
  reset: () => void;
}

export function useSearch(): UseSearchReturn {
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [data, setData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<AppApiError | Error | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string>('');

  const abortControllerRef = useRef<AbortController | null>(null);

  const search = useCallback(async (rawPrompt: string): Promise<SearchResponse | null> => {
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

    try {
      const response = await searchMusic(trimmed, controller.signal);
      setData(response);
      setStatus('success');

      // Update page title to "SONORA — {mood}"
      if (response.intent?.mood) {
        const moodCap = response.intent.mood.charAt(0).toUpperCase() + response.intent.mood.slice(1);
        document.title = `SONORA — ${moodCap}`;
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
  }, []);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus('idle');
    setData(null);
    setError(null);
    setLastPrompt('');
    document.title = 'SONORA';
  }, []);

  return { status, data, error, lastPrompt, search, reset };
}

