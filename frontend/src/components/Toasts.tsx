import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import type { ToastInfo } from '../types';

interface ToastsProps {
  toasts: ToastInfo[];
  onDismiss: (id: string) => void;
}

export function Toasts({ toasts, onDismiss }: ToastsProps) {
  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 max-w-md w-full px-4 pointer-events-none"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.94 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="pointer-events-auto glass-panel-strong px-4 py-2.5 rounded-full flex items-center gap-3 border border-white/15 shadow-glass-elevated text-xs sm:text-sm font-medium text-text"
          >
            {toast.type === 'error' && (
              <AlertCircle className="w-4 h-4 text-error-status shrink-0" />
            )}
            {toast.type === 'success' && (
              <CheckCircle2 className="w-4 h-4 text-live-status shrink-0" />
            )}
            {(!toast.type || toast.type === 'info') && (
              <Info className="w-4 h-4 text-cyan shrink-0" />
            )}

            <span className="truncate max-w-[280px] sm:max-w-xs">{toast.message}</span>

            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="text-text-faint hover:text-text transition-colors p-0.5 rounded-full hover:bg-white/10 ml-1 cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

