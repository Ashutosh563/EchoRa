import { Info } from 'lucide-react';
import { SPOTIFY_AUTH_URL } from '../api/client';
import { SpotifyIcon } from './ConnectSpotifyButton';

interface NoticeBannerProps {
  notice?: string | null;
}

export function NoticeBanner({ notice }: NoticeBannerProps) {
  if (!notice) return null;

  const mentionsSpotifyAuth =
    /spotify.*(?:authoriz|connect|permission)/i.test(notice);

  return (
    <aside
      aria-label="Notice"
      className="glass-panel px-4 py-3 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber/30 bg-amber/[0.06] text-amber text-xs sm:text-sm"
    >
      <div className="flex items-center gap-2.5">
        <Info className="w-4 h-4 shrink-0 text-amber" />
        <span className="text-text leading-snug">{notice}</span>
      </div>

      {mentionsSpotifyAuth && (
        <button
          type="button"
          onClick={() => {
            window.location.href = SPOTIFY_AUTH_URL;
          }}
          className="px-3 py-1.5 rounded-full bg-spotify hover:bg-[#1ed760] text-black font-semibold text-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-md shadow-spotify/20 self-start sm:self-auto"
        >
          <SpotifyIcon className="w-3.5 h-3.5 text-black" />
          <span>Connect Spotify</span>
        </button>
      )}
    </aside>
  );
}

