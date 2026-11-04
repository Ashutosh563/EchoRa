import { Wordmark } from './Wordmark';
import type { StatusResponse } from '../types';

interface TopBarProps {
  status?: StatusResponse | null;
}

export function TopBar({ status: _status }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 w-full h-16 border-b border-white/[0.08] bg-ink/70 backdrop-blur-xl transition-colors">
      <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
        {/* Left: Brand */}
        <Wordmark />
      </div>
    </header>
  );
}
