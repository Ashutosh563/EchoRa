import { CheckCircle2 } from 'lucide-react';
import { SPOTIFY_AUTH_URL } from '../api/client';
import type { StatusResponse } from '../types';

interface ConnectSpotifyButtonProps {
  status: StatusResponse | null;
}

export function SpotifyIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.495 17.303c-.217.355-.678.47-1.033.253-2.83-1.728-6.393-2.119-10.59-1.16-.407.094-.813-.162-.907-.568-.094-.407.162-.813.568-.907 4.606-1.053 8.563-.604 11.71 1.348.355.216.47.677.252 1.034zm1.464-3.255c-.273.444-.855.587-1.3.313-3.24-1.993-8.178-2.569-12.01-1.405-.499.151-1.026-.134-1.177-.633-.151-.498.134-1.025.633-1.176 4.394-1.334 9.83-.695 13.541 1.589.445.274.588.856.313 1.312zm.126-3.39c-3.886-2.308-10.292-2.52-14.004-1.393-.598.181-1.23-.165-1.411-.762-.181-.597.165-1.23.762-1.411 4.275-1.298 11.346-1.05 15.82 1.606.537.319.712 1.016.393 1.553-.319.537-1.016.712-1.56.407z" />
    </svg>
  );
}

export function ConnectSpotifyButton({ status }: ConnectSpotifyButtonProps) {
  if (!status) return null;

  const isAuthorized = status.spotify.authorized;

  if (isAuthorized) {
    return (
      <div
        className="glass-pill px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium text-spotify border border-spotify/30 bg-spotify/10"
        title="Spotify account linked and authorized"
      >
        <SpotifyIcon className="w-3.5 h-3.5 text-spotify" />
        <span className="hidden sm:inline">Spotify</span>
        <CheckCircle2 className="w-3.5 h-3.5 text-spotify" />
      </div>
    );
  }

  const handleConnect = () => {
    window.location.href = SPOTIFY_AUTH_URL;
  };

  return (
    <button
      type="button"
      onClick={handleConnect}
      className="px-3.5 py-1.5 rounded-full bg-spotify hover:bg-[#1ed760] text-black font-semibold text-xs flex items-center gap-2 shadow-lg shadow-spotify/20 hover:shadow-spotify/35 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
      aria-label="Connect your Spotify account"
    >
      <SpotifyIcon className="w-3.5 h-3.5 text-black" />
      <span>Connect Spotify</span>
    </button>
  );
}

