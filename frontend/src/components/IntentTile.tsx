import React from 'react';
import { motion } from 'framer-motion';
import type { PriorityLevel } from '../types';

interface IntentTileProps {
  icon: React.ReactNode;
  label: string;
  source?: 'explicit' | 'inferred' | 'optional' | 'unspecified';
  priority?: PriorityLevel;
  children: React.ReactNode;
  index?: number;
}

export function IntentTile({
  icon,
  label,
  source,
  priority,
  children,
  index = 0,
}: IntentTileProps) {
  // Source label mapping
  const sourceLabel =
    source === 'explicit'
      ? 'Said'
      : source === 'inferred'
      ? 'Inferred'
      : source === 'optional'
      ? 'Optional'
      : null;

  // Dot count mapping for priority
  let dotCount = 0;
  if (priority === 'high') dotCount = 3;
  else if (priority === 'medium_high' || priority === 'medium') dotCount = 2;
  else if (priority === 'low') dotCount = 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
      className="glass-panel p-3.5 flex flex-col justify-between rounded-2xl border border-white/[0.08] hover:border-white/[0.14] transition-colors relative group"
    >
      {/* Top row: Icon, Label, and Source / Priority badge */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <div className="flex items-center gap-1.5 text-text-dim text-xs font-medium">
          <span className="text-violet">{icon}</span>
          <span>{label}</span>
        </div>

        {/* Source & Priority Pill with Tooltip */}
        {sourceLabel && (
          <div
            className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] text-text-faint cursor-help"
            title="Said = you mentioned it. Inferred = I picked it up from context."
          >
            <span>{sourceLabel}</span>
            {dotCount > 0 && (
              <span className="flex items-center gap-0.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <span
                    key={i}
                    className={`w-1 h-1 rounded-full ${
                      i < dotCount ? 'bg-cyan' : 'bg-white/10'
                    }`}
                  />
                ))}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Content Value */}
      <div className="min-h-[28px] flex items-center">{children}</div>
    </motion.div>
  );
}

