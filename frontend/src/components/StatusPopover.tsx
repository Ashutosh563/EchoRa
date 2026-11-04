import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Sparkles, Music2, BrainCircuit } from 'lucide-react';
import type { StatusResponse } from '../types';

interface StatusPopoverProps {
  status: StatusResponse | null;
  isOpen: boolean;
  onClose: () => void;
}

export function StatusPopover({ status, isOpen, onClose }: StatusPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !status) return null;

  const isGeminiOk = status.gemini.configured && status.gemini.valid !== false;
  const isSpotifyOk = status.spotify.configured && status.spotify.authorized;

  return (
    <AnimatePresence>
      <motion.div
        ref={popoverRef}
        initial={{ opacity: 0, y: -8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.96 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="absolute right-0 top-full mt-2 w-80 glass-panel-strong p-4 rounded-card z-50 text-sm shadow-glass-elevated border border-white/10"
        role="dialog"
        aria-label="System Status Details"
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
          <span className="font-display font-semibold text-text flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet" /> System Status
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              status.mode === 'live'
                ? 'bg-live-status/15 text-live-status border border-live-status/30'
                : 'bg-mock-status/15 text-mock-status border border-mock-status/30'
            }`}
          >
            {status.mode === 'live' ? 'Live Pipeline' : 'Mock Mode'}
          </span>
        </div>

        {/* Rows */}
        <div className="space-y-2.5">
          {/* Gemini */}
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-text-dim">
              <BrainCircuit className="w-4 h-4 text-cyan" /> Google Gemini AI
            </span>
            <div className="flex items-center gap-1.5">
              {isGeminiOk ? (
                <span className="text-live-status flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                </span>
              ) : (
                <span className="text-mock-status flex items-center gap-1 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" /> Simulation
                </span>
              )}
            </div>
          </div>

          {/* Spotify */}
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-text-dim">
              <Music2 className="w-4 h-4 text-spotify" /> Spotify API
            </span>
            <div className="flex items-center gap-1.5">
              {isSpotifyOk ? (
                <span className="text-live-status flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Authorized
                </span>
              ) : (
                <span className="text-mock-status flex items-center gap-1 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" /> Not Connected
                </span>
              )}
            </div>
          </div>

          {/* Interpret Mode */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
            <span className="text-text-faint">Intent Interpretation:</span>
            <span className="text-text-dim uppercase font-mono text-[11px]">
              {status.interpretMode}
            </span>
          </div>
        </div>

        {/* Missing Requirements List */}
        {status.missing && status.missing.length > 0 && (
          <div className="mt-3.5 pt-3 border-t border-white/10 bg-white/[0.02] p-2 rounded-xl">
            <p className="text-[11px] font-semibold text-mock-status mb-1.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Requirements for Live Mode:
            </p>
            <ul className="text-[11px] text-text-dim space-y-1 pl-4 list-disc marker:text-mock-status/60">
              {status.missing.map((item, idx) => (
                <li key={idx} className="leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

