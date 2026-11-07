import { Play } from 'lucide-react';

interface PreviewButtonProps {
  isPlaying: boolean;
  onToggle: () => void;
  progress?: number; // 0 to 1
}

export function PreviewButton({ isPlaying, onToggle, progress = 0 }: PreviewButtonProps) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      aria-label={isPlaying ? 'Pause preview audio' : 'Play 30-second preview audio'}
      className="absolute inset-0 m-auto w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md flex items-center justify-center text-white transition-all transform hover:scale-105 active:scale-95 z-20 cursor-pointer shadow-lg"
    >
      {/* Circular Progress Ring */}
      <svg className="absolute -inset-1 w-13 h-13 -rotate-90 pointer-events-none" viewBox="0 0 44 44">
        <circle
          cx="22"
          cy="22"
          r={radius}
          className="stroke-white/20"
          strokeWidth="2.5"
          fill="transparent"
        />
        {isPlaying && (
          <circle
            cx="22"
            cy="22"
            r={radius}
            className="stroke-spotify transition-all duration-150"
            strokeWidth="2.5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        )}
      </svg>

      {isPlaying ? (
        <div className="flex items-end justify-center gap-[2.5px] h-4 w-4">
          <span className="w-[2.5px] bg-spotify rounded-full eq-bar-1" />
          <span className="w-[2.5px] bg-spotify rounded-full eq-bar-2" />
          <span className="w-[2.5px] bg-spotify rounded-full eq-bar-3" />
        </div>
      ) : (
        <Play className="w-4 h-4 fill-white text-white ml-0.5" />
      )}
    </button>
  );
}

