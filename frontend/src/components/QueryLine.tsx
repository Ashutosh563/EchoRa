import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface QueryLineProps {
  primary: string;
  alternatives?: string[];
  onCopyNotice?: () => void;
}

export function QueryLine({ primary, alternatives = [], onCopyNotice }: QueryLineProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(primary);
      setCopied(true);
      onCopyNotice?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="pt-3 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
      {/* Primary Query with Caret & Blinking Cursor */}
      <div className="flex items-center gap-2 font-mono text-xs text-text-dim overflow-x-auto py-1">
        <span className="text-cyan font-bold select-none">&gt;</span>
        <span className="text-text font-medium select-all">{primary}</span>
        <span className="inline-block w-1.5 h-3.5 bg-cyan/80 animate-pulse ml-0.5" />
      </div>

      {/* Right: Alternatives & Copy Button */}
      <div className="flex items-center gap-2 shrink-0">
        {alternatives && alternatives.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-text-faint">
            <span className="hidden md:inline">also tried:</span>
            {alternatives.map((alt, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/5 font-mono text-text-dim truncate max-w-[120px]"
                title={alt}
              >
                {alt}
              </span>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={handleCopy}
          className="glass-pill px-2.5 py-1 text-xs text-text-dim hover:text-text hover:bg-white/[0.08] transition-all flex items-center gap-1.5 border border-white/10 cursor-pointer"
          aria-label="Copy search query"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-live-status" />
              <span className="text-live-status">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

