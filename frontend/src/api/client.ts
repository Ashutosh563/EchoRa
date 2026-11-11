import type { SearchResponse, StatusResponse, Track } from '../types';
import type { CameraAnalysisResponse } from '../types/camera';
import type { UserPreferences } from '../types/discovery';
import type { SearchOptions } from './musicApi';

export const SPOTIFY_AUTH_URL = 'http://127.0.0.1:4000/api/spotify/auth';

export class AppApiError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'AppApiError';
    this.code = code;
  }
}

interface ErrorResponseBody {
  error?: {
    code?: string;
    message?: string;
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let code = 'UNKNOWN_ERROR';
    let message = 'An unexpected error occurred.';

    try {
      const data = (await res.json()) as ErrorResponseBody;
      if (data?.error?.code) code = data.error.code;
      if (data?.error?.message) message = data.error.message;
    } catch {
      message = `HTTP error ${res.status}: ${res.statusText}`;
    }

    throw new AppApiError(code, message);
  }

  return (await res.json()) as T;
}

export async function getStatus(signal?: AbortSignal): Promise<StatusResponse> {
  try {
    const res = await fetch('/api/status', {
      headers: { credentials: 'omit' },
      signal,
    });
    return await handleResponse<StatusResponse>(res);
  } catch (err: unknown) {
    if (err instanceof AppApiError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new AppApiError('NETWORK_ERROR', "Can't reach the ECHORA server (127.0.0.1:4000)");
  }
}

export async function searchMusic(
  prompt: string,
  options?: SearchOptions,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  try {
    const res = await fetch('/api/music/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        discoveryMode: options?.discoveryMode,
        preferences: options?.preferences,
        historySignals: options?.historySignals,
      }),
      signal,
    });
    return await handleResponse<SearchResponse>(res);
  } catch (err: unknown) {
    if (err instanceof AppApiError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new AppApiError('NETWORK_ERROR', "Can't reach the ECHORA server (127.0.0.1:4000)");
  }
}

export interface LoadMoreRequestParams {
  prompt: string;
  intent: any;
  page: number;
  excludeTrackIds: string[];
  excludeSongSignatures?: string[];
  cumulativeArtistCounts?: Record<string, number>;
  discoveryMode?: string;
  preferences?: UserPreferences;
}

export interface LoadMoreResult {
  page: number;
  tracks: Track[];
  hasMore: boolean;
  queriesUsed: string[];
}

export async function loadMoreMusic(
  params: LoadMoreRequestParams,
  signal?: AbortSignal,
): Promise<LoadMoreResult> {
  try {
    const res = await fetch('/api/music/load-more', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
      signal,
    });
    return await handleResponse<LoadMoreResult>(res);
  } catch (err: unknown) {
    if (err instanceof AppApiError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new AppApiError('NETWORK_ERROR', "Can't reach the ECHORA server (127.0.0.1:4000)");
  }
}

export interface RefineVibeRequestParams {
  prompt: string;
  intent: any;
  refinement: {
    type: string;
    label: string;
    delta?: string;
  };
  discoveryMode?: string;
}

export interface RefineVibeResult {
  intent: any;
  tracks: Track[];
}

export async function refineVibeMusic(
  params: RefineVibeRequestParams,
  signal?: AbortSignal,
): Promise<RefineVibeResult> {
  try {
    const res = await fetch('/api/music/refine-vibe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
      signal,
    });
    return await handleResponse<RefineVibeResult>(res);
  } catch (err: unknown) {
    if (err instanceof AppApiError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new AppApiError('NETWORK_ERROR', "Can't reach the ECHORA server (127.0.0.1:4000)");
  }
}

export async function analyzeCameraImage(
  base64Image: string,
  mimeType: string = 'image/jpeg',
  signal?: AbortSignal
): Promise<CameraAnalysisResponse> {
  try {
    const res = await fetch('/api/music/analyze-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: base64Image, mimeType }),
      signal,
    });
    return await handleResponse<CameraAnalysisResponse>(res);
  } catch (err: unknown) {
    if (err instanceof AppApiError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new AppApiError('NETWORK_ERROR', "Can't reach the ECHORA server (127.0.0.1:4000)");
  }
}
