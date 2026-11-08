import { memo } from 'react';
import { History } from 'lucide-react';

interface RecentChipsProps {
  history: string[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export const RecentChips = memo(function RecentChips({ history, onSelect, disabled = false }: RecentChipsProps) {
  if (!history || history.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 mt-4 pt-4 border-t border-white/[0.06] w-full max-w-4xl mx-auto">
      <div className="flex items-center gap-1.5 text-xs text-text-faint mr-1 font-medium">
        <History className="w-3.5 h-3.5" />
        <span>Recent:</span>
      </div>

      {history.map((item, idx) => (
        <button
          key={`${item}-${idx}`}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(item)}
          className="glass-pill px-3 py-1 text-xs text-text-dim hover:text-text hover:bg-white/[0.08] transition-all truncate max-w-[200px] border border-white/5 cursor-pointer"
          title={item}
          aria-label={`Search again: ${item}`}
        >
          {item}
        </button>
      ))}
    </div>
  );
});

