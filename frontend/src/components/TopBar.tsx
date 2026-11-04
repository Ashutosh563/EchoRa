import { Wordmark } from './Wordmark';
import { ModePill } from './ModePill';
import { ConnectSpotifyButton } from './ConnectSpotifyButton';
import type { StatusResponse } from '../types';

interface TopBarProps {
  status: StatusResponse | null;
}

export function TopBar({ status }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 w-full h-16 border-b border-white/[0.08] bg-ink/70 backdrop-blur-xl transition-colors">
      <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
        {/* Left: Brand */}
        <Wordmark />

        {/* Right: Status Pill & Connect Action */}
        <div className="flex items-center gap-3">
          <ModePill status={status} />
          <ConnectSpotifyButton status={status} />
        </div>
      </div>
    </header>
  );
}

