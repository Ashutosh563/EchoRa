import { useCallback, useEffect, useState } from 'react';
import { getStatus } from '../api/client';
import type { StatusResponse } from '../types';

export interface UseStatusReturn {
  status: StatusResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useStatus(): UseStatusReturn {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getStatus();
      setStatus(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check for Spotify OAuth callback query param
    const searchParams = new URLSearchParams(window.location.search);
    const spotifyParam = searchParams.get('spotify');

    if (spotifyParam) {
      // Remove query param cleanly without reloading
      searchParams.delete('spotify');
      searchParams.delete('reason');
      const newQuery = searchParams.toString();
      const newPath = window.location.pathname + (newQuery ? `?${newQuery}` : '');
      window.history.replaceState({}, document.title, newPath);
    }

    void fetchStatus();

    // Refetch when window regains focus
    const handleFocus = () => {
      void fetchStatus();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchStatus]);

  return { status, isLoading, error, refetch: fetchStatus };
}

