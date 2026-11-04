import type { SearchResponse, StatusResponse } from '../types';
import type { CameraAnalysisResponse } from '../types/camera';

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
    throw new AppApiError('NETWORK_ERROR', "Can't reach the SONORA server (127.0.0.1:4000)");
  }
}

export async function searchMusic(prompt: string, signal?: AbortSignal): Promise<SearchResponse> {
  try {
    const res = await fetch('/api/music/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
      signal,
    });
    return await handleResponse<SearchResponse>(res);
  } catch (err: unknown) {
    if (err instanceof AppApiError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new AppApiError('NETWORK_ERROR', "Can't reach the SONORA server (127.0.0.1:4000)");
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
    throw new AppApiError('NETWORK_ERROR', "Can't reach the SONORA server (127.0.0.1:4000)");
  }
}
