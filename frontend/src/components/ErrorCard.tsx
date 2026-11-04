import { AlertOctagon, RotateCw } from 'lucide-react';
import { SPOTIFY_AUTH_URL } from '../api/client';
import { SpotifyIcon } from './ConnectSpotifyButton';

interface ErrorCardProps {
  error: Error | { code?: string; message: string };
  onRetry?: () => void;
}

export function ErrorCard({ error, onRetry }: ErrorCardProps) {
  const code = 'code' in error ? error.code : 'UNKNOWN';
  const message = error.message || 'An unexpected error occurred.';

  // Friendlier titles mapped from error codes
  let title = 'Something went wrong';
  if (code === 'VALIDATION_ERROR') {
    title = "Hmm, that didn't look right";
  } else if (code === 'GEMINI_UNAVAILABLE') {
    title = 'The AI is taking a breather';
  } else if (code === 'GEMINI_AUTH_FAILED') {
    title = 'AI key problem';
  } else if (code === 'SPOTIFY_AUTH_REQUIRED') {
    title = 'Spotify needs your permission';
  } else if (code === 'NETWORK_ERROR') {
    title = "Can't reach the ECHORA server (127.0.0.1:4000)";
  }

  const isSpotifyAuthRequired = code === 'SPOTIFY_AUTH_REQUIRED';

  return (
    <div
      role="alert"
      className="glass-panel p-6 max-w-xl mx-auto my-8 rounded-card border border-error-status/30 bg-error-status/[0.05] shadow-glass"
    >
      <div className="flex items-start gap-3.5">
        <div className="p-2 rounded-xl bg-error-status/15 text-error-status shrink-0 mt-0.5">
          <AlertOctagon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-text text-base mb-1">
            {title}
          </h3>
          <p className="text-text-dim text-sm leading-relaxed mb-4">
            {message}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="px-4 py-2 rounded-full glass-pill text-xs font-semibold text-text hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-2 cursor-pointer border border-white/10"
              >
                <RotateCw className="w-3.5 h-3.5 text-cyan" />
                <span>Try again</span>
              </button>
            )}

            {isSpotifyAuthRequired && (
              <button
                type="button"
                onClick={() => {
                  window.location.href = SPOTIFY_AUTH_URL;
                }}
                className="px-4 py-2 rounded-full bg-spotify hover:bg-[#1ed760] text-black text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-spotify/20"
              >
                <SpotifyIcon className="w-3.5 h-3.5 text-black" />
                <span>Connect Spotify</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

